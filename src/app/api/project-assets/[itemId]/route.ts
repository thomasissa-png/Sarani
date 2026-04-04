import { NextRequest, NextResponse } from "next/server";
import { graphFetch } from "@/lib/integrations/sharepoint";
import { SHAREPOINT_ASSETS_DRIVE_ID } from "@/lib/integrations/config";
import { checkRateLimit } from "@/lib/rate-limit";

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

  // Rate limit: 200 req/min per IP (public endpoint — protect Graph API quota)
  if (!checkRateLimit("asset-proxy", 200, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

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

    // Mode: resolve=1 → return download URL as JSON (used by VideoPlayer client component)
    const resolveMode = request.nextUrl.searchParams.get("resolve") === "1";
    if (resolveMode) {
      return NextResponse.json(
        { downloadUrl, mimeType, name: item.name, size: item.size },
        { headers: { "Cache-Control": "public, max-age=60, s-maxage=60" } }
      );
    }

    // PDFs with ?inline=1: fetch and serve with Content-Disposition: inline
    // so the browser opens its PDF viewer instead of downloading.
    // PDFs are small enough (<20MB) to stream reliably on Replit.
    const wantInline = request.nextUrl.searchParams.get("inline") === "1";
    const isPdf = mimeType === "application/pdf" || (item.name?.toLowerCase().endsWith(".pdf") ?? false);
    if (isPdf && wantInline) {
      try {
        const upstream = await fetch(downloadUrl, {
          signal: AbortSignal.timeout(60_000),
        });
        if (!upstream.ok) {
          return NextResponse.redirect(downloadUrl, { status: 302 });
        }
        const pdfBuffer = await upstream.arrayBuffer();
        return new NextResponse(pdfBuffer, {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename="${item.name ?? "document.pdf"}"`,
            "Content-Length": String(pdfBuffer.byteLength),
            "Cache-Control": "public, max-age=300, s-maxage=300",
          },
        });
      } catch {
        // Fallback to redirect if streaming fails
        return NextResponse.redirect(downloadUrl, { status: 302 });
      }
    }

    // Default: 302 redirect to fresh SharePoint download URL.
    // Browsers follow 302 for images natively.
    return NextResponse.redirect(downloadUrl, {
      status: 302,
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    });
  } catch (error) {
    console.error(`[Asset Proxy] Error fetching item ${itemId}:`, error);
    return NextResponse.json({ error: "Failed to load asset" }, { status: 502 });
  }
}
