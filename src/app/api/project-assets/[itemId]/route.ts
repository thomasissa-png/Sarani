import { NextRequest, NextResponse } from "next/server";
import { graphFetch } from "@/lib/integrations/sharepoint";
import { SHAREPOINT_ASSETS_DRIVE_ID } from "@/lib/integrations/config";
import { checkRateLimit } from "@/lib/rate-limit";

/** Video MIME types — used for mimeType detection fallback (extension-based). */
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
 * Modes:
 * - ?stream=1 → Stream video through proxy with Range support (used by VideoPlayer).
 *   WHY: SharePoint downloadUrls are cross-origin with no CORS headers and
 *   Content-Disposition: attachment. Browsers cannot play them in <video src>.
 *   Streaming through our proxy is the ONLY reliable way to serve videos
 *   to external visitors without SharePoint auth.
 * - ?inline=1 (PDFs) → Stream through proxy with Content-Disposition: inline.
 * - Default → 302 redirect to fresh download URL (images, downloads).
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

    // SharePoint often returns "application/octet-stream" for video files.
    // Fallback to extension-based detection.
    if (!isVideo && item.name) {
      const ext = item.name.substring(item.name.lastIndexOf(".")).toLowerCase();
      const fallbackMime = VIDEO_EXT_TO_MIME[ext];
      if (fallbackMime) {
        mimeType = fallbackMime;
        isVideo = true;
      }
    }

    // ── Mode: stream=1 → Stream video through proxy with Range support ──
    // This is the ONLY reliable way to serve SharePoint videos to external
    // visitors. The downloadUrl is a pre-signed URL that works server-side
    // but fails client-side due to CORS + Content-Disposition: attachment.
    const streamMode = request.nextUrl.searchParams.get("stream") === "1";
    if (streamMode && isVideo) {
      return streamVideo(request, downloadUrl, mimeType, item.name ?? "video.mp4", item.size ?? 0);
    }

    // ── Mode: inline=1 (PDFs) → Stream through proxy ──
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
        return NextResponse.redirect(downloadUrl, { status: 302 });
      }
    }

    // ── Default: 302 redirect (images, downloads) ──
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

/**
 * Stream a video from SharePoint through our proxy.
 * Supports HTTP Range requests for seeking.
 *
 * WHY passthrough streaming instead of arrayBuffer:
 * - arrayBuffer loads the ENTIRE video into memory → crashes on Replit for large files
 * - Passthrough pipes the ReadableStream directly → constant memory usage
 * - Range requests let the browser seek without downloading the whole file
 */
async function streamVideo(
  request: NextRequest,
  downloadUrl: string,
  mimeType: string,
  filename: string,
  totalSize: number
): Promise<NextResponse | Response> {
  const rangeHeader = request.headers.get("Range");

  // Build upstream fetch headers — forward Range if present
  const upstreamHeaders: Record<string, string> = {};
  if (rangeHeader) {
    upstreamHeaders["Range"] = rangeHeader;
  }

  try {
    const upstream = await fetch(downloadUrl, {
      headers: upstreamHeaders,
      signal: AbortSignal.timeout(120_000), // 120s for large videos
    });

    if (!upstream.ok && upstream.status !== 206) {
      console.error(`[Asset Proxy] Upstream fetch failed: ${upstream.status} for ${filename}`);
      return NextResponse.json({ error: "Video unavailable" }, { status: 502 });
    }

    // Get actual content info from upstream
    const contentLength = upstream.headers.get("Content-Length");
    const contentRange = upstream.headers.get("Content-Range");
    const upstreamType = upstream.headers.get("Content-Type");

    // Build response headers
    const responseHeaders: Record<string, string> = {
      "Content-Type": upstreamType?.startsWith("video/") ? upstreamType : mimeType,
      "Accept-Ranges": "bytes",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "public, max-age=300, s-maxage=300",
      // CORS headers — the video is served from our domain
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges",
    };

    if (contentLength) {
      responseHeaders["Content-Length"] = contentLength;
    }
    if (contentRange) {
      responseHeaders["Content-Range"] = contentRange;
    }

    // Passthrough the ReadableStream — no buffering in memory
    return new Response(upstream.body, {
      status: upstream.status, // 200 for full, 206 for partial
      headers: responseHeaders,
    });
  } catch (error) {
    console.error(`[Asset Proxy] Stream error for ${filename}:`, error);
    return NextResponse.json({ error: "Video streaming failed" }, { status: 502 });
  }
}
