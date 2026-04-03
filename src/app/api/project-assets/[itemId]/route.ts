import { NextRequest, NextResponse } from "next/server";
import { graphFetch } from "@/lib/integrations/sharepoint";
import { SHAREPOINT_ASSETS_DRIVE_ID } from "@/lib/integrations/config";

/** MIME types that require streaming proxy (302 redirect breaks range requests). */
const STREAM_MIMETYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-msvideo",
]);

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
      file?: { mimeType: string };
      size?: number;
      webUrl?: string;
    }>(`/drives/${driveId}/items/${itemId}`);

    const downloadUrl = item["@microsoft.graph.downloadUrl"];
    if (!downloadUrl) {
      return NextResponse.json({ error: "No download URL available" }, { status: 404 });
    }

    const mimeType = item.file?.mimeType ?? "";
    const isVideo = STREAM_MIMETYPES.has(mimeType);

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
