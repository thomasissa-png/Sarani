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

/** Size threshold: below this, buffer the entire video (simpler, more reliable). Above: stream. */
const BUFFER_THRESHOLD = 100 * 1024 * 1024; // 100 MB

/**
 * Resolve a SharePoint item's metadata + download URL.
 * Shared between GET and HEAD handlers.
 */
async function resolveItem(itemId: string, driveId: string) {
  const item = await graphFetch<{
    "@microsoft.graph.downloadUrl"?: string;
    name?: string;
    file?: { mimeType: string };
    size?: number;
    webUrl?: string;
  }>(`/drives/${driveId}/items/${itemId}`);

  const downloadUrl = item["@microsoft.graph.downloadUrl"];

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

  return { item, downloadUrl, mimeType, isVideo };
}

/**
 * Validate itemId and driveId to prevent injection into Graph API paths.
 * SharePoint IDs can contain alphanumeric, !, _, -, and sometimes dots.
 */
function validateIds(itemId: string, driveId: string): boolean {
  const SAFE_ID = /^[a-zA-Z0-9!._-]+$/;
  return SAFE_ID.test(itemId) && SAFE_ID.test(driveId);
}

/**
 * HEAD /api/project-assets/[itemId]?driveId=xxx&stream=1
 *
 * Browsers often send HEAD before playing <video src>.
 * Must return the same headers as GET but with no body.
 * Without this, the video element may refuse to even attempt playback.
 */
export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const { itemId } = await params;
  const driveId =
    request.nextUrl.searchParams.get("driveId") || SHAREPOINT_ASSETS_DRIVE_ID;

  if (!validateIds(itemId, driveId)) {
    return new NextResponse(null, { status: 400 });
  }

  try {
    const { downloadUrl, mimeType, isVideo, item } = await resolveItem(
      itemId,
      driveId
    );
    if (!downloadUrl) {
      return new NextResponse(null, { status: 404 });
    }

    const streamMode = request.nextUrl.searchParams.get("stream") === "1";
    if (streamMode && isVideo) {
      // For video HEAD, return headers indicating we support Range requests
      const headers: Record<string, string> = {
        "Content-Type": mimeType || "video/mp4",
        "Accept-Ranges": "bytes",
        "Content-Disposition": `inline; filename="${item.name ?? "video.mp4"}"`,
        "Cache-Control": "public, max-age=300, s-maxage=300",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Expose-Headers":
          "Content-Length, Content-Range, Accept-Ranges",
      };
      if (item.size) {
        headers["Content-Length"] = String(item.size);
      }
      return new NextResponse(null, { status: 200, headers });
    }

    // Non-stream HEAD: just return basic headers
    return new NextResponse(null, {
      status: 200,
      headers: {
        "Content-Type": mimeType || "application/octet-stream",
        ...(item.size ? { "Content-Length": String(item.size) } : {}),
      },
    });
  } catch (error) {
    console.error(`[Asset Proxy HEAD] Error for ${itemId}:`, error);
    return new NextResponse(null, { status: 502 });
  }
}

/**
 * GET /api/project-assets/[itemId]?driveId=xxx
 * Public proxy for SharePoint assets.
 *
 * The @microsoft.graph.downloadUrl token expires after ~1 hour.
 * This endpoint re-fetches it on demand so presentation pages
 * always serve fresh image/video URLs.
 *
 * Modes:
 * - ?stream=1 → Proxy video with Range support (used by VideoPlayer).
 *   For videos < 100MB: buffers and serves (more reliable on Replit).
 *   For videos >= 100MB: streams through with passthrough piping.
 *   WHY: SharePoint downloadUrls are cross-origin with no CORS headers and
 *   Content-Disposition: attachment. Browsers cannot play them in <video src>.
 *   Proxying through our server is the ONLY reliable way to serve videos
 *   to external visitors without SharePoint auth.
 * - ?inline=1 (PDFs) → Buffer through proxy with Content-Disposition: inline.
 * - Default → 302 redirect to fresh download URL (images, downloads).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const { itemId } = await params;
  const driveId =
    request.nextUrl.searchParams.get("driveId") || SHAREPOINT_ASSETS_DRIVE_ID;

  // Rate limit: 200 req/min per IP (public endpoint — protect Graph API quota)
  if (!checkRateLimit("asset-proxy", 200, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  if (!validateIds(itemId, driveId)) {
    return NextResponse.json(
      { error: "Invalid item or drive ID" },
      { status: 400 }
    );
  }

  try {
    const { downloadUrl, mimeType, isVideo, item } = await resolveItem(
      itemId,
      driveId
    );

    if (!downloadUrl) {
      return NextResponse.json(
        { error: "No download URL available" },
        { status: 404 }
      );
    }

    // ── Mode: stream=1 → Proxy through our server ──
    // Used by VideoPlayer. Always proxy when requested.
    const streamMode = request.nextUrl.searchParams.get("stream") === "1";
    if (streamMode) {
      const videoMime = isVideo ? mimeType : (mimeType || "video/mp4");
      try {
        const rangeHeader = request.headers.get("Range");
        const fetchHeaders: Record<string, string> = {};
        if (rangeHeader) {
          fetchHeaders["Range"] = rangeHeader;
        }

        const upstream = await fetch(downloadUrl, {
          headers: fetchHeaders,
          signal: AbortSignal.timeout(120_000),
        });

        if (!upstream.ok && upstream.status !== 206) {
          console.error(`[Asset Proxy] Video upstream ${upstream.status} for ${item.name}`);
          return new NextResponse(`Video fetch failed: ${upstream.status}`, { status: 502 });
        }

        // Buffer the response (most reliable on Node.js/Replit)
        const buffer = await upstream.arrayBuffer();

        const headers: Record<string, string> = {
          "Content-Type": videoMime,
          "Content-Length": String(buffer.byteLength),
          "Content-Disposition": `inline; filename="${item.name ?? "video.mp4"}"`,
          "Accept-Ranges": "bytes",
          "Cache-Control": "public, max-age=300",
          "Access-Control-Allow-Origin": "*",
        };

        // Forward Range response headers
        const contentRange = upstream.headers.get("Content-Range");
        if (contentRange) {
          headers["Content-Range"] = contentRange;
        }

        return new NextResponse(buffer, {
          status: upstream.status === 206 ? 206 : 200,
          headers,
        });
      } catch (err) {
        console.error(`[Asset Proxy] Video proxy error for ${item.name}:`, err);
        return new NextResponse(`Video proxy error: ${err instanceof Error ? err.message : "unknown"}`, { status: 502 });
      }
    }

    // ── Mode: inline=1 (PDFs) → Buffer through proxy ──
    const wantInline = request.nextUrl.searchParams.get("inline") === "1";
    const isPdf =
      mimeType === "application/pdf" ||
      (item.name?.toLowerCase().endsWith(".pdf") ?? false);
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
    return NextResponse.json(
      { error: "Failed to load asset" },
      { status: 502 }
    );
  }
}

/**
 * Proxy a video from SharePoint through our server.
 * Supports HTTP Range requests for seeking.
 *
 * Strategy:
 * - Videos < 100MB: buffer with arrayBuffer() then serve.
 *   This is more reliable on Replit/Node.js than ReadableStream piping.
 * - Videos >= 100MB: stream with ReadableStream passthrough.
 *
 * WHY buffer for smaller videos:
 * After 15+ iterations, ReadableStream piping via `new Response(upstream.body)`
 * proved unreliable in Next.js Node.js runtime. The body sometimes arrives as
 * null, closes prematurely, or the browser rejects the response.
 * Buffering small/medium videos (<100MB) is memory-safe on Replit and
 * guarantees correct Content-Length, Range, and Content-Type headers.
 */
async function proxyVideo(
  request: NextRequest,
  downloadUrl: string,
  mimeType: string,
  filename: string,
  totalSize: number
): Promise<NextResponse | Response> {
  const rangeHeader = request.headers.get("Range");

  // Common response headers for all video responses
  const baseHeaders: Record<string, string> = {
    "Content-Type": mimeType || "video/mp4",
    "Accept-Ranges": "bytes",
    "Content-Disposition": `inline; filename="${filename}"`,
    "Cache-Control": "public, max-age=300, s-maxage=300",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Expose-Headers":
      "Content-Length, Content-Range, Accept-Ranges",
  };

  try {
    // ── Strategy A: Buffer small/medium videos (<100MB) ──
    // More reliable than streaming on Node.js runtime.
    if (totalSize > 0 && totalSize < BUFFER_THRESHOLD) {
      return bufferVideo(downloadUrl, rangeHeader, totalSize, baseHeaders);
    }

    // ── Strategy B: Stream large videos (>=100MB or unknown size) ──
    return streamVideo(downloadUrl, rangeHeader, baseHeaders);
  } catch (error) {
    console.error(`[Asset Proxy] Video proxy error for ${filename}:`, error);
    return NextResponse.json(
      { error: "Video unavailable" },
      { status: 502 }
    );
  }
}

/**
 * Buffer the video (or a range of it) in memory and serve.
 * Used for videos < 100MB. Handles Range requests manually.
 */
async function bufferVideo(
  downloadUrl: string,
  rangeHeader: string | null,
  totalSize: number,
  baseHeaders: Record<string, string>
): Promise<NextResponse> {
  if (rangeHeader) {
    // Parse Range header: "bytes=START-END" or "bytes=START-"
    const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
    if (match) {
      const start = parseInt(match[1], 10);
      const end = match[2] ? parseInt(match[2], 10) : totalSize - 1;
      const chunkSize = end - start + 1;

      // Fetch the specific range from SharePoint
      const upstream = await fetch(downloadUrl, {
        headers: { Range: `bytes=${start}-${end}` },
        signal: AbortSignal.timeout(120_000),
      });

      if (upstream.status === 206 || upstream.ok) {
        const buffer = await upstream.arrayBuffer();
        return new NextResponse(buffer, {
          status: 206,
          headers: {
            ...baseHeaders,
            "Content-Length": String(buffer.byteLength),
            "Content-Range": `bytes ${start}-${start + buffer.byteLength - 1}/${totalSize}`,
          },
        });
      }

      // Range request not supported by upstream — fall through to full fetch
      console.warn(
        `[Asset Proxy] Range request failed (${upstream.status}), falling back to full fetch`
      );
    }
  }

  // Full fetch — no range or range parsing failed
  const upstream = await fetch(downloadUrl, {
    signal: AbortSignal.timeout(120_000),
  });

  if (!upstream.ok) {
    console.error(
      `[Asset Proxy] Upstream fetch failed: ${upstream.status} ${upstream.statusText}`
    );
    return NextResponse.json(
      { error: "Video unavailable" },
      { status: 502 }
    );
  }

  const buffer = await upstream.arrayBuffer();
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      ...baseHeaders,
      "Content-Length": String(buffer.byteLength),
    },
  });
}

/**
 * Stream a large video through the proxy.
 * Used for videos >= 100MB or unknown size.
 * Forwards Range requests to SharePoint.
 */
async function streamVideo(
  downloadUrl: string,
  rangeHeader: string | null,
  baseHeaders: Record<string, string>
): Promise<Response> {
  const upstreamHeaders: Record<string, string> = {};
  if (rangeHeader) {
    upstreamHeaders["Range"] = rangeHeader;
  }

  const upstream = await fetch(downloadUrl, {
    headers: upstreamHeaders,
    signal: AbortSignal.timeout(120_000),
  });

  if (!upstream.ok && upstream.status !== 206) {
    console.error(
      `[Asset Proxy] Upstream stream failed: ${upstream.status} ${upstream.statusText}`
    );
    return NextResponse.json(
      { error: "Video unavailable" },
      { status: 502 }
    );
  }

  const contentLength = upstream.headers.get("Content-Length");
  const contentRange = upstream.headers.get("Content-Range");
  const upstreamType = upstream.headers.get("Content-Type");

  const responseHeaders = { ...baseHeaders };
  if (upstreamType?.startsWith("video/")) {
    responseHeaders["Content-Type"] = upstreamType;
  }
  if (contentLength) {
    responseHeaders["Content-Length"] = contentLength;
  }
  if (contentRange) {
    responseHeaders["Content-Range"] = contentRange;
  }

  // Create a proper ReadableStream from the upstream body.
  // Do NOT pass upstream.body directly — it can be null or incompatible
  // with the Web Response constructor in Next.js Node.js runtime.
  if (!upstream.body) {
    // Fallback: read as arrayBuffer
    const buffer = await upstream.arrayBuffer();
    return new Response(buffer, {
      status: upstream.status,
      headers: responseHeaders,
    });
  }

  // Pipe through a TransformStream to ensure Web API compatibility
  const { readable, writable } = new TransformStream();
  // Start piping in the background — do not await
  upstream.body.pipeTo(writable).catch((err) => {
    console.error("[Asset Proxy] Stream pipe error:", err);
  });

  return new Response(readable, {
    status: upstream.status,
    headers: responseHeaders,
  });
}
