import { NextRequest, NextResponse } from "next/server";
import { graphFetch } from "@/lib/integrations/sharepoint";
import { SHAREPOINT_ASSETS_DRIVE_ID } from "@/lib/integrations/config";

/** MIME types that require streaming proxy (302 redirect breaks range requests). */
const STREAM_MIMETYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-msvideo",
  "video/x-ms-wmv",
  "video/x-matroska",
  "video/mpeg",
  "video/3gpp",
]);

/**
 * Map of video file extensions to their proper MIME types.
 * Used as fallback when SharePoint returns "application/octet-stream"
 * or an empty mimeType — which is common for uploaded video files.
 * Without this, videos get 302-redirected instead of streamed,
 * breaking HTML5 video playback (cross-origin redirect with no CORS).
 */
const VIDEO_EXT_TO_MIME: Record<string, string> = {
  ".mp4": "video/mp4",
  ".m4v": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".avi": "video/x-msvideo",
  ".wmv": "video/x-ms-wmv",
  ".mkv": "video/x-matroska",
  ".mpeg": "video/mpeg",
  ".mpg": "video/mpeg",
  ".3gp": "video/3gpp",
};

/**
 * GET /api/project-assets/[itemId]?driveId=xxx
 * Public proxy for SharePoint assets.
 *
 * The @microsoft.graph.downloadUrl token expires after ~1 hour.
 * This endpoint re-fetches it on demand so presentation pages
 * always serve fresh image/video URLs.
 *
 * - Images/PDFs: 302 redirect to the download URL (fast, cacheable).
 * - Videos: streaming proxy that forwards the response body + supports
 *   Range requests (required by HTML5 video players for seek/play).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const { itemId } = await params;
  const driveId = request.nextUrl.searchParams.get("driveId") || SHAREPOINT_ASSETS_DRIVE_ID;

  // Validate inputs to prevent path injection into Graph API
  const SAFE_ID = /^[a-zA-Z0-9!_-]+$/;
  if (!SAFE_ID.test(itemId) || !SAFE_ID.test(driveId)) {
    return NextResponse.json({ error: "Invalid item or drive ID" }, { status: 400 });
  }

  try {
    const item = await graphFetch<{
      "@microsoft.graph.downloadUrl"?: string;
      name?: string;
      file?: { mimeType: string };
      size?: number;
      webUrl?: string;
    }>(`/drives/${driveId}/items/${itemId}`);

    const downloadUrl = item["@microsoft.graph.downloadUrl"];
    if (!downloadUrl) {
      return NextResponse.json({ error: "No download URL available" }, { status: 404 });
    }

    let mimeType = item.file?.mimeType ?? "";
    let isVideo = STREAM_MIMETYPES.has(mimeType);

    // REGRESSION FIX: SharePoint often returns "application/octet-stream" for
    // video files (especially when uploaded via sync/API). Without this fallback,
    // videos get 302-redirected instead of streamed, which breaks HTML5 <video>
    // because the redirect target is cross-origin SharePoint with no CORS headers.
    // This bug persisted through 4 fix iterations targeting symptoms (CSP, CORS,
    // crossOrigin attr) while the real cause was mimeType-based filtering.
    if (!isVideo && item.name) {
      const ext = item.name.substring(item.name.lastIndexOf(".")).toLowerCase();
      const fallbackMime = VIDEO_EXT_TO_MIME[ext];
      if (fallbackMime) {
        mimeType = fallbackMime;
        isVideo = true;
      }
    }

    // For non-video assets, 302 redirect is fine (images, PDFs)
    if (!isVideo) {
      return NextResponse.redirect(downloadUrl, {
        status: 302,
        headers: {
          "Cache-Control": "public, max-age=300, s-maxage=300",
        },
      });
    }

    // For video: stream through the proxy to support Range requests.
    // Forward the Range header from the client to SharePoint.
    const fetchHeaders: Record<string, string> = {};
    const rangeHeader = request.headers.get("Range");
    if (rangeHeader) {
      fetchHeaders["Range"] = rangeHeader;
    }

    const upstream = await fetch(downloadUrl, {
      headers: fetchHeaders,
      signal: AbortSignal.timeout(30_000),
    });

    if (!upstream.ok && upstream.status !== 206) {
      return NextResponse.json({ error: "Upstream fetch failed" }, { status: 502 });
    }

    // Build response headers
    const responseHeaders = new Headers();
    responseHeaders.set("Content-Type", mimeType);
    responseHeaders.set("Accept-Ranges", "bytes");
    responseHeaders.set("Cache-Control", "public, max-age=300, s-maxage=300");
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Cross-Origin-Resource-Policy", "cross-origin");

    // Forward content-length and content-range from upstream
    const contentLength = upstream.headers.get("Content-Length");
    if (contentLength) {
      responseHeaders.set("Content-Length", contentLength);
    }
    const contentRange = upstream.headers.get("Content-Range");
    if (contentRange) {
      responseHeaders.set("Content-Range", contentRange);
    }

    return new NextResponse(upstream.body, {
      status: upstream.status, // 200 or 206
      headers: responseHeaders,
    });
  } catch (error) {
    console.error(`[Asset Proxy] Error fetching item ${itemId}:`, error);
    return NextResponse.json({ error: "Failed to load asset" }, { status: 502 });
  }
}
