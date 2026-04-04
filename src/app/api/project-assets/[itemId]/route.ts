import { NextRequest, NextResponse } from "next/server";
import { graphFetch } from "@/lib/integrations/sharepoint";
import { SHAREPOINT_ASSETS_DRIVE_ID } from "@/lib/integrations/config";

/** Video MIME types — used only for mimeType detection fallback (extension-based). */
const VIDEO_MIMETYPES = new Set([
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
 * - All assets (images, videos, PDFs): 302 redirect to the fresh download URL.
 *   Browsers follow the redirect and handle Range requests on the final URL.
 * - PDFs with ?inline=1: streamed through proxy with Content-Disposition: inline.
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
    let isVideo = VIDEO_MIMETYPES.has(mimeType);

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

    // For PDFs with ?inline=1: stream through proxy with Content-Disposition: inline
    // so the browser opens the PDF in a new tab instead of downloading it.
    const wantInline = request.nextUrl.searchParams.get("inline") === "1";
    const isPdf = mimeType === "application/pdf" || (item.name?.toLowerCase().endsWith(".pdf") ?? false);

    if (!(isPdf && wantInline)) {
      // For images, videos, and PDFs without inline flag: 302 redirect to fresh download URL.
      // The browser follows the redirect and handles Range requests on the final URL.
      // This avoids streaming through our server which is unreliable on Replit
      // (timeouts on large files, worker killed mid-stream, body size limits).
      return NextResponse.redirect(downloadUrl, {
        status: 302,
        headers: {
          "Cache-Control": "public, max-age=300, s-maxage=300",
        },
      });
    }

    // For PDFs with inline=1: fetch and serve with inline disposition
    if (isPdf && wantInline) {
      const upstream = await fetch(downloadUrl, {
        signal: AbortSignal.timeout(30_000),
      });
      if (!upstream.ok) {
        return NextResponse.json({ error: "Upstream fetch failed" }, { status: 502 });
      }
      const body = upstream.body ?? new ReadableStream({
        async start(controller) {
          const buffer = await upstream.arrayBuffer();
          controller.enqueue(new Uint8Array(buffer));
          controller.close();
        },
      });
      const pdfHeaders = new Headers();
      pdfHeaders.set("Content-Type", "application/pdf");
      pdfHeaders.set("Content-Disposition", `inline; filename="${item.name ?? "document.pdf"}"`);
      pdfHeaders.set("Cache-Control", "public, max-age=300, s-maxage=300");
      const pdfContentLength = upstream.headers.get("Content-Length");
      if (pdfContentLength) pdfHeaders.set("Content-Length", pdfContentLength);
      return new NextResponse(body, { status: 200, headers: pdfHeaders });
    }

    // Video streaming code removed — 302 redirect handles all cases now.
    // Streaming through Next.js API routes was unreliable on Replit:
    // timeouts on large files, worker killed mid-stream, body size limits.
    // The 302 redirect to SharePoint's pre-signed download URL works because:
    // 1. Modern browsers follow 302 for <video> and handle Range requests on final URL
    // 2. SharePoint download URLs support Range requests natively
    // 3. No streaming through our server = no Replit worker limits

    return NextResponse.json({ error: "Unexpected code path" }, { status: 500 });
  } catch (error) {
    console.error(`[Asset Proxy] Error fetching item ${itemId}:`, error);
    return NextResponse.json({ error: "Failed to load asset" }, { status: 502 });
  }
}
