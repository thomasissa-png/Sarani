// @vitest-environment node
/**
 * Comprehensive tests for the video playback chain.
 *
 * WHY THIS FILE EXISTS:
 * Video playback on share link pages was broken for 4 consecutive iterations.
 * Previous fix attempts addressed symptoms (CSP, CORS, crossOrigin attribute)
 * while the ROOT CAUSE was: SharePoint returns "application/octet-stream" for
 * uploaded video files, causing:
 *   1. The share page ALLOWED_MIMETYPES filter to exclude the video entirely
 *   2. The proxy to 302-redirect instead of streaming, breaking HTML5 <video>
 *      because SharePoint download URLs are cross-origin with no CORS headers
 *
 * The fix: extension-based fallback (VIDEO_EXT_TO_MIME) in BOTH the share page
 * filter and the proxy route handler.
 *
 * REGRESSION: Video playback broken 4 iterations — fixed 2026-04-03
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import fs from "fs";

// ─── Mock SharePoint graphFetch ─────────────────────────────────────────────

const mockGraphFetch = vi.fn();

vi.mock("@/lib/integrations/sharepoint", () => ({
  graphFetch: (...args: unknown[]) => mockGraphFetch(...args),
}));

vi.mock("@/lib/integrations/config", () => ({
  SHAREPOINT_ASSETS_DRIVE_ID: "test-drive-id",
}));

// ─── Import the route handler after mocks ───────────────────────────────────

const { GET } = await import("@/app/api/project-assets/[itemId]/route");

// ─── Global mock management ────────────────────────────────────────────────
// We mock globalThis.fetch at file level with a safe default that returns 200.
// Tests that need specific upstream responses use fetchSpy.mockResolvedValueOnce().
// This prevents any real network calls during tests.

let fetchSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  mockGraphFetch.mockReset();
  // Ensure fetch is always mocked — no real network calls
  fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(new ReadableStream(), { status: 200 })
  );
});

afterEach(() => {
  fetchSpy.mockRestore();
});

/* ========================================================================== */
/*  Helpers                                                                    */
/* ========================================================================== */

function makeRequest(
  itemId: string,
  options?: { range?: string; driveId?: string }
): {
  request: NextRequest;
  params: Promise<{ itemId: string }>;
} {
  const url = new URL(`http://localhost/api/project-assets/${itemId}`);
  if (options?.driveId) url.searchParams.set("driveId", options.driveId);

  const headers = new Headers();
  if (options?.range) headers.set("Range", options.range);

  return {
    request: new NextRequest(url, { headers }),
    params: Promise.resolve({ itemId }),
  };
}

/** Creates a mock upstream response for video streaming */
function mockUpstreamVideo(options?: {
  status?: number;
  contentLength?: string;
  contentRange?: string;
}): Response {
  return new Response(new ReadableStream(), {
    status: options?.status ?? 200,
    headers: {
      ...(options?.contentLength && { "Content-Length": options.contentLength }),
      ...(options?.contentRange && { "Content-Range": options.contentRange }),
    },
  });
}

/** Helper: build a Graph API item response */
function graphItem(overrides: {
  downloadUrl?: string;
  mimeType?: string;
  name?: string;
  size?: number;
}) {
  return {
    "@microsoft.graph.downloadUrl":
      overrides.downloadUrl ?? "https://sharepoint.com/download/file",
    file: overrides.mimeType ? { mimeType: overrides.mimeType } : undefined,
    name: overrides.name,
    size: overrides.size ?? 1024000,
  };
}

/* ========================================================================== */
/*  1. REGRESSION: mimeType detection — application/octet-stream fallback      */
/*     This is THE critical test section. These tests would have caught the     */
/*     root cause that persisted through 4 fix iterations.                     */
/* ========================================================================== */

describe("Video proxy — REGRESSION: application/octet-stream fallback", () => {
  it("streams .mp4 file with application/octet-stream mimeType (root cause of 4-iteration bug)", async () => {
    // SharePoint returned application/octet-stream for the GEODIS video.
    // Without extension fallback, proxy returned 302 redirect → broken playback.
    mockGraphFetch.mockResolvedValueOnce(
      graphItem({
        mimeType: "application/octet-stream",
        name: "geodis-video-sante-securite.mp4",
      })
    );
    fetchSpy.mockResolvedValueOnce(mockUpstreamVideo({ contentLength: "52428800" }));

    const { request, params } = makeRequest("geodisVideoItem");
    const response = await GET(request, { params });

    // CRITICAL: Must NOT be 302 redirect — must be 200 streaming
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("video/mp4");
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("streams .mov file with empty mimeType", async () => {
    mockGraphFetch.mockResolvedValueOnce({
      "@microsoft.graph.downloadUrl": "https://sharepoint.com/download/clip.mov",
      file: { mimeType: "" },
      name: "behind-the-scenes.mov",
      size: 30000000,
    });
    fetchSpy.mockResolvedValueOnce(mockUpstreamVideo({ contentLength: "30000000" }));

    const { request, params } = makeRequest("movFileItem");
    const response = await GET(request, { params });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("video/quicktime");
  });

  it("streams .webm file with application/octet-stream", async () => {
    mockGraphFetch.mockResolvedValueOnce(
      graphItem({ mimeType: "application/octet-stream", name: "animation.webm" })
    );
    fetchSpy.mockResolvedValueOnce(mockUpstreamVideo({ contentLength: "5000000" }));

    const { request, params } = makeRequest("webmItem");
    const response = await GET(request, { params });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("video/webm");
  });

  it("streams .avi file with application/octet-stream", async () => {
    mockGraphFetch.mockResolvedValueOnce(
      graphItem({ mimeType: "application/octet-stream", name: "legacy-footage.avi" })
    );
    fetchSpy.mockResolvedValueOnce(mockUpstreamVideo({ contentLength: "8000000" }));

    const { request, params } = makeRequest("aviItem");
    const response = await GET(request, { params });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("video/x-msvideo");
  });

  it("streams .wmv file with application/octet-stream", async () => {
    mockGraphFetch.mockResolvedValueOnce(
      graphItem({ mimeType: "application/octet-stream", name: "corporate-video.wmv" })
    );
    fetchSpy.mockResolvedValueOnce(mockUpstreamVideo({ contentLength: "15000000" }));

    const { request, params } = makeRequest("wmvItem");
    const response = await GET(request, { params });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("video/x-ms-wmv");
  });

  it("streams .mkv file with application/octet-stream", async () => {
    mockGraphFetch.mockResolvedValueOnce(
      graphItem({ mimeType: "application/octet-stream", name: "raw-edit.mkv" })
    );
    fetchSpy.mockResolvedValueOnce(mockUpstreamVideo({ contentLength: "100000000" }));

    const { request, params } = makeRequest("mkvItem");
    const response = await GET(request, { params });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("video/x-matroska");
  });

  it("streams .m4v file with application/octet-stream", async () => {
    mockGraphFetch.mockResolvedValueOnce(
      graphItem({ mimeType: "application/octet-stream", name: "iphone-clip.m4v" })
    );
    fetchSpy.mockResolvedValueOnce(mockUpstreamVideo({ contentLength: "12000000" }));

    const { request, params } = makeRequest("m4vItem");
    const response = await GET(request, { params });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("video/mp4");
  });

  it("redirects unknown extension + application/octet-stream (not a video)", async () => {
    mockGraphFetch.mockResolvedValueOnce(
      graphItem({ mimeType: "application/octet-stream", name: "archive.zip" })
    );

    const { request, params } = makeRequest("zipItem");
    const response = await GET(request, { params });

    expect(response.status).toBe(302);
  });

  it("redirects file with no extension and application/octet-stream", async () => {
    mockGraphFetch.mockResolvedValueOnce(
      graphItem({ mimeType: "application/octet-stream", name: "mystery-file" })
    );

    const { request, params } = makeRequest("noExtItem");
    const response = await GET(request, { params });

    expect(response.status).toBe(302);
  });

  it("handles case-insensitive extensions (.MP4 uppercase)", async () => {
    mockGraphFetch.mockResolvedValueOnce(
      graphItem({ mimeType: "application/octet-stream", name: "CORPORATE_VIDEO.MP4" })
    );
    fetchSpy.mockResolvedValueOnce(mockUpstreamVideo({ contentLength: "25000000" }));

    const { request, params } = makeRequest("uppercaseItem");
    const response = await GET(request, { params });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("video/mp4");
  });

  it("handles file with no name field gracefully (does not crash)", async () => {
    mockGraphFetch.mockResolvedValueOnce({
      "@microsoft.graph.downloadUrl": "https://sharepoint.com/download/file",
      file: { mimeType: "application/octet-stream" },
      // no name field — extension fallback cannot run
      size: 5000000,
    });

    const { request, params } = makeRequest("noNameItem");
    const response = await GET(request, { params });

    // Should not crash — should 302 redirect since we cannot detect video type
    expect(response.status).toBe(302);
  });
});

/* ========================================================================== */
/*  2. Known video mimeTypes — direct streaming                                */
/* ========================================================================== */

describe("Video proxy — known video mimeTypes stream correctly", () => {
  const videoTypes = [
    { mime: "video/mp4", ext: "mp4" },
    { mime: "video/quicktime", ext: "mov" },
    { mime: "video/webm", ext: "webm" },
    { mime: "video/x-msvideo", ext: "avi" },
    { mime: "video/x-ms-wmv", ext: "wmv" },
    { mime: "video/x-matroska", ext: "mkv" },
    { mime: "video/mpeg", ext: "mpeg" },
    { mime: "video/3gpp", ext: "3gp" },
  ];

  for (const { mime, ext } of videoTypes) {
    it(`streams ${mime} (.${ext}) with correct Content-Type and headers`, async () => {
      mockGraphFetch.mockResolvedValueOnce(
        graphItem({ mimeType: mime, name: `test.${ext}` })
      );
      fetchSpy.mockResolvedValueOnce(mockUpstreamVideo({ contentLength: "1000000" }));

      const { request, params } = makeRequest(`item-${ext}`);
      const response = await GET(request, { params });

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe(mime);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
      expect(response.headers.get("Cross-Origin-Resource-Policy")).toBe("cross-origin");
      expect(response.headers.get("Accept-Ranges")).toBe("bytes");
    });
  }
});

/* ========================================================================== */
/*  3. Non-video files get 302 redirect                                        */
/* ========================================================================== */

describe("Video proxy — non-video files get 302 redirect", () => {
  const nonVideoTypes = [
    { mime: "image/png", name: "logo.png", id: "pngItem" },
    { mime: "image/jpeg", name: "photo.jpg", id: "jpgItem" },
    { mime: "image/gif", name: "animation.gif", id: "gifItem" },
    { mime: "image/webp", name: "hero.webp", id: "webpItem" },
    { mime: "application/pdf", name: "proposal.pdf", id: "pdfItem" },
    { mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation", name: "deck.pptx", id: "pptxItem" },
  ];

  for (const { mime, name, id } of nonVideoTypes) {
    it(`redirects ${mime} (${name}) with 302`, async () => {
      mockGraphFetch.mockResolvedValueOnce(graphItem({ mimeType: mime, name }));

      // Use clean alphanumeric IDs — dots in URL path fail the SAFE_ID regex
      const { request, params } = makeRequest(id);
      const response = await GET(request, { params });

      expect(response.status).toBe(302);
    });
  }
});

/* ========================================================================== */
/*  4. Range request forwarding                                                */
/* ========================================================================== */

describe("Video proxy — Range request forwarding", () => {
  it("forwards Range header to upstream and returns 206 with Content-Range", async () => {
    mockGraphFetch.mockResolvedValueOnce(
      graphItem({ mimeType: "video/mp4", name: "big-video.mp4", size: 50000000 })
    );
    fetchSpy.mockResolvedValueOnce(
      mockUpstreamVideo({
        status: 206,
        contentLength: "1000000",
        contentRange: "bytes 0-999999/50000000",
      })
    );

    const { request, params } = makeRequest("rangeItem", { range: "bytes=0-999999" });
    const response = await GET(request, { params });

    // Verify Range was forwarded to upstream
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Range: "bytes=0-999999" }),
      })
    );
    expect(response.status).toBe(206);
    expect(response.headers.get("Content-Range")).toBe("bytes 0-999999/50000000");
    expect(response.headers.get("Content-Length")).toBe("1000000");
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("forwards mid-file Range request correctly (seek behavior)", async () => {
    mockGraphFetch.mockResolvedValueOnce(
      graphItem({ mimeType: "video/mp4", name: "seekable.mp4", size: 10000000 })
    );
    fetchSpy.mockResolvedValueOnce(
      mockUpstreamVideo({
        status: 206,
        contentLength: "500000",
        contentRange: "bytes 5000000-5499999/10000000",
      })
    );

    const { request, params } = makeRequest("midRangeItem", {
      range: "bytes=5000000-5499999",
    });
    const response = await GET(request, { params });

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Range: "bytes=5000000-5499999" }),
      })
    );
    expect(response.status).toBe(206);
    expect(response.headers.get("Content-Range")).toBe("bytes 5000000-5499999/10000000");
  });

  it("does not send Range header when client does not request it", async () => {
    mockGraphFetch.mockResolvedValueOnce(
      graphItem({ mimeType: "video/mp4", name: "full.mp4" })
    );
    fetchSpy.mockResolvedValueOnce(mockUpstreamVideo({ contentLength: "2000000" }));

    const { request, params } = makeRequest("noRangeItem");
    const response = await GET(request, { params });

    const upstreamHeaders = fetchSpy.mock.calls[0][1]?.headers as Record<string, string>;
    expect(upstreamHeaders).not.toHaveProperty("Range");
    expect(response.status).toBe(200);
  });

  it("returns CORS headers on Range requests for octet-stream video (regression combo)", async () => {
    // Combines two bug vectors: octet-stream mimeType + Range request
    mockGraphFetch.mockResolvedValueOnce(
      graphItem({
        mimeType: "application/octet-stream",
        name: "geodis-video.mp4",
        size: 80000000,
      })
    );
    fetchSpy.mockResolvedValueOnce(
      mockUpstreamVideo({
        status: 206,
        contentLength: "2000000",
        contentRange: "bytes 0-1999999/80000000",
      })
    );

    const { request, params } = makeRequest("octetRangeItem", { range: "bytes=0-1999999" });
    const response = await GET(request, { params });

    expect(response.status).toBe(206);
    expect(response.headers.get("Content-Type")).toBe("video/mp4");
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

/* ========================================================================== */
/*  5. Error handling and timeouts                                             */
/* ========================================================================== */

describe("Video proxy — error handling", () => {
  it("returns 502 when upstream fetch times out (AbortError)", async () => {
    mockGraphFetch.mockResolvedValueOnce(
      graphItem({ mimeType: "video/mp4", name: "huge-video.mp4", size: 500000000 })
    );
    fetchSpy.mockRejectedValueOnce(
      new DOMException("The operation was aborted", "AbortError")
    );

    const { request, params } = makeRequest("timeoutItem");
    const response = await GET(request, { params });

    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.error).toBe("Failed to load asset");
  });

  it("returns 502 when Graph API call fails", async () => {
    mockGraphFetch.mockRejectedValueOnce(new Error("Graph API unavailable"));

    const { request, params } = makeRequest("graphFailItem");
    const response = await GET(request, { params });

    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.error).toBe("Failed to load asset");
  });

  it("returns 502 when upstream returns non-OK, non-206 status", async () => {
    mockGraphFetch.mockResolvedValueOnce(
      graphItem({ mimeType: "video/mp4", name: "forbidden.mp4" })
    );
    fetchSpy.mockResolvedValueOnce(new Response("Forbidden", { status: 403 }));

    const { request, params } = makeRequest("forbiddenItem");
    const response = await GET(request, { params });

    expect(response.status).toBe(502);
  });

  it("returns 404 when no download URL is available", async () => {
    mockGraphFetch.mockResolvedValueOnce({
      file: { mimeType: "video/mp4" },
      name: "no-url.mp4",
      // no @microsoft.graph.downloadUrl — Graph didn't return one
    });

    const { request, params } = makeRequest("noUrlItem");
    const response = await GET(request, { params });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("No download URL available");
  });
});

/* ========================================================================== */
/*  6. CORS headers present on ALL video response types                        */
/* ========================================================================== */

describe("Video proxy — CORS headers on all video response types", () => {
  it("has CORS headers on 200 response (full video)", async () => {
    mockGraphFetch.mockResolvedValueOnce(
      graphItem({ mimeType: "video/mp4", name: "full.mp4" })
    );
    fetchSpy.mockResolvedValueOnce(mockUpstreamVideo({ contentLength: "5000000" }));

    const { request, params } = makeRequest("cors200");
    const response = await GET(request, { params });

    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(response.headers.get("Cross-Origin-Resource-Policy")).toBe("cross-origin");
  });

  it("has CORS headers on 206 response (partial content)", async () => {
    mockGraphFetch.mockResolvedValueOnce(
      graphItem({ mimeType: "video/mp4", name: "partial.mp4" })
    );
    fetchSpy.mockResolvedValueOnce(
      mockUpstreamVideo({
        status: 206,
        contentLength: "1000000",
        contentRange: "bytes 0-999999/5000000",
      })
    );

    const { request, params } = makeRequest("cors206", { range: "bytes=0-999999" });
    const response = await GET(request, { params });

    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(response.headers.get("Cross-Origin-Resource-Policy")).toBe("cross-origin");
  });

  it("has CORS headers on octet-stream fallback video", async () => {
    mockGraphFetch.mockResolvedValueOnce(
      graphItem({ mimeType: "application/octet-stream", name: "client-upload.mp4" })
    );
    fetchSpy.mockResolvedValueOnce(mockUpstreamVideo({ contentLength: "10000000" }));

    const { request, params } = makeRequest("corsOctet");
    const response = await GET(request, { params });

    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(response.headers.get("Cross-Origin-Resource-Policy")).toBe("cross-origin");
  });
});

/* ========================================================================== */
/*  7. Content-Type correctness                                                */
/* ========================================================================== */

describe("Video proxy — Content-Type is correct", () => {
  it("uses Graph API mimeType when it is a known video type", async () => {
    mockGraphFetch.mockResolvedValueOnce(
      graphItem({ mimeType: "video/quicktime", name: "clip.mov" })
    );
    fetchSpy.mockResolvedValueOnce(mockUpstreamVideo({ contentLength: "3000000" }));

    const { request, params } = makeRequest("ctKnown");
    const response = await GET(request, { params });

    expect(response.headers.get("Content-Type")).toBe("video/quicktime");
  });

  it("uses extension-derived mimeType when Graph returns octet-stream", async () => {
    mockGraphFetch.mockResolvedValueOnce(
      graphItem({ mimeType: "application/octet-stream", name: "presentation.webm" })
    );
    fetchSpy.mockResolvedValueOnce(mockUpstreamVideo({ contentLength: "7000000" }));

    const { request, params } = makeRequest("ctFallback");
    const response = await GET(request, { params });

    expect(response.headers.get("Content-Type")).toBe("video/webm");
    expect(response.headers.get("Content-Type")).not.toBe("application/octet-stream");
  });

  it("does NOT set wrong Content-Type for non-video octet-stream", async () => {
    mockGraphFetch.mockResolvedValueOnce(
      graphItem({ mimeType: "application/octet-stream", name: "data.bin" })
    );

    const { request, params } = makeRequest("ctNonVideo");
    const response = await GET(request, { params });

    // .bin is not in VIDEO_EXT_TO_MIME, so it falls through to 302 redirect
    expect(response.status).toBe(302);
  });
});

/* ========================================================================== */
/*  8. Input validation                                                        */
/* ========================================================================== */

describe("Video proxy — input validation", () => {
  it("rejects path traversal in itemId", async () => {
    const { request, params } = makeRequest("../../../etc/passwd");
    const response = await GET(request, { params });
    expect(response.status).toBe(400);
  });

  it("rejects path traversal in driveId", async () => {
    const { request, params } = makeRequest("validItem", {
      driveId: "drive/../../hack",
    });
    const response = await GET(request, { params });
    expect(response.status).toBe(400);
  });

  it("rejects itemId with spaces", async () => {
    const { request, params } = makeRequest("item with spaces");
    const response = await GET(request, { params });
    expect(response.status).toBe(400);
  });

  it("accepts valid IDs with hyphens, underscores, exclamation marks", async () => {
    mockGraphFetch.mockResolvedValueOnce(
      graphItem({ mimeType: "image/png", name: "test.png" })
    );

    const { request, params } = makeRequest("01J8K_abc-XYZ!");
    const response = await GET(request, { params });

    // Should not be 400 — the ID passes validation (302 redirect for image)
    expect(response.status).not.toBe(400);
  });
});

/* ========================================================================== */
/*  9. CSP media-src configuration (static analysis)                           */
/* ========================================================================== */

describe("CSP configuration — media-src", () => {
  it("next.config.ts CSP includes media-src 'self' blob:", () => {
    const configContent = fs.readFileSync(
      "/home/user/Sarani/next.config.ts",
      "utf-8"
    );
    expect(configContent).toContain("media-src 'self' blob:");
  });

  it("CSP does not restrict media-src to only 'self' (blob: is required for some players)", () => {
    const configContent = fs.readFileSync(
      "/home/user/Sarani/next.config.ts",
      "utf-8"
    );
    const mediaSrcMatch = configContent.match(/media-src[^"]+/);
    expect(mediaSrcMatch).toBeTruthy();
    expect(mediaSrcMatch![0]).toContain("blob:");
  });
});

/* ========================================================================== */
/*  10. Share page: extension fallback in ALLOWED_MIMETYPES filter             */
/*      Static verification that the share page has the same fix as proxy      */
/* ========================================================================== */

describe("Share page — isAllowedFile extension fallback (static verification)", () => {
  const pageSource = fs.readFileSync(
    "/home/user/Sarani/src/app/project/[clientSlug]/[projectSlug]/page.tsx",
    "utf-8"
  );

  it("share page has VIDEO_EXT_TO_MIME fallback map", () => {
    expect(pageSource).toContain("VIDEO_EXT_TO_MIME");
  });

  it("share page isAllowedFile checks extension when MIME is not in ALLOWED_MIMETYPES", () => {
    expect(pageSource).toContain("VIDEO_EXT_TO_MIME[ext]");
  });

  it("share page VIDEO_EXT_TO_MIME includes all critical video extensions", () => {
    const criticalExtensions = [
      '".mp4"', '".mov"', '".webm"', '".avi"', '".wmv"', '".mkv"', '".m4v"',
    ];
    for (const ext of criticalExtensions) {
      expect(pageSource).toContain(ext);
    }
  });

  it("share page assigns corrected mimeType from isAllowedFile to BatchItem", () => {
    // The corrected mimeType (from extension fallback) must be used when building
    // the BatchItem, so that batchVideos.filter(startsWith('video/')) includes it.
    expect(pageSource).toContain("mimeType: check.mimeType");
  });

  it("share page video filter uses mimeType.startsWith('video/')", () => {
    expect(pageSource).toContain('i.mimeType.startsWith("video/")');
  });

  it("proxy route.ts and share page have identical VIDEO_EXT_TO_MIME entries", () => {
    const proxySource = fs.readFileSync(
      "/home/user/Sarani/src/app/api/project-assets/[itemId]/route.ts",
      "utf-8"
    );

    const criticalExts = [
      '".mp4"', '".m4v"', '".mov"', '".webm"', '".avi"',
      '".wmv"', '".mkv"', '".mpeg"', '".mpg"', '".3gp"',
    ];

    for (const ext of criticalExts) {
      expect(pageSource).toContain(ext);
      expect(proxySource).toContain(ext);
    }
  });
});

/* ========================================================================== */
/*  11. Share page: video keys use itemId (not just filename)                   */
/* ========================================================================== */

describe("Share page — video element keys use itemId", () => {
  const pageSource = fs.readFileSync(
    "/home/user/Sarani/src/app/project/[clientSlug]/[projectSlug]/page.tsx",
    "utf-8"
  );

  it("video div uses item.itemId as key (prevents React reconciliation issues)", () => {
    expect(pageSource).toContain("key={item.itemId}");
  });
});

/* ========================================================================== */
/*  12. Proxy route — timeout configuration                                    */
/* ========================================================================== */

describe("Video proxy — timeout configuration (static verification)", () => {
  const proxySource = fs.readFileSync(
    "/home/user/Sarani/src/app/api/project-assets/[itemId]/route.ts",
    "utf-8"
  );

  it("uses AbortSignal.timeout for upstream fetch", () => {
    expect(proxySource).toContain("AbortSignal.timeout");
  });

  it("timeout is at least 30 seconds (large video files need time)", () => {
    // Match AbortSignal.timeout(30_000) — JS numeric separators use underscores
    const match = proxySource.match(/AbortSignal\.timeout\(([0-9_]+)\)/);
    expect(match).toBeTruthy();
    const timeoutMs = parseInt(match![1].replace(/_/g, ""), 10);
    expect(timeoutMs).toBeGreaterThanOrEqual(30000);
  });
});

/* ========================================================================== */
/*  13. Cache headers                                                          */
/* ========================================================================== */

describe("Video proxy — cache headers", () => {
  it("sets Cache-Control on video streaming responses", async () => {
    mockGraphFetch.mockResolvedValueOnce(
      graphItem({ mimeType: "video/mp4", name: "cached.mp4" })
    );
    fetchSpy.mockResolvedValueOnce(mockUpstreamVideo({ contentLength: "1000000" }));

    const { request, params } = makeRequest("cacheItem");
    const response = await GET(request, { params });

    expect(response.headers.get("Cache-Control")).toContain("public");
    expect(response.headers.get("Cache-Control")).toContain("max-age=300");
  });
});
