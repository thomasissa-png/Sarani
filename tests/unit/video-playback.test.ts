// @vitest-environment node
/**
 * Comprehensive tests for the video/asset proxy route.
 *
 * WHY THIS FILE EXISTS:
 * Video playback on share link pages was broken for 4 consecutive iterations.
 * Previous fix attempts addressed symptoms (CSP, CORS, crossOrigin attribute)
 * while the ROOT CAUSE was: SharePoint returns "application/octet-stream" for
 * uploaded video files, causing the share page ALLOWED_MIMETYPES filter to
 * exclude the video entirely.
 *
 * The current solution: ALL assets (images, videos, PDFs without inline) get a
 * 302 redirect to the fresh @microsoft.graph.downloadUrl. The browser follows
 * the redirect and handles Range requests on the final SharePoint URL.
 * Only PDFs with ?inline=1 are streamed through the proxy.
 *
 * REGRESSION: Video playback broken 4 iterations — fixed 2026-04-03
 * ARCHITECTURE CHANGE: Streaming removed, 302 redirect for all — 2026-04-04
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
  options?: { range?: string; driveId?: string; inline?: boolean }
): {
  request: NextRequest;
  params: Promise<{ itemId: string }>;
} {
  const url = new URL(`http://localhost/api/project-assets/${itemId}`);
  if (options?.driveId) url.searchParams.set("driveId", options.driveId);
  if (options?.inline) url.searchParams.set("inline", "1");

  const headers = new Headers();
  if (options?.range) headers.set("Range", options.range);

  return {
    request: new NextRequest(url, { headers }),
    params: Promise.resolve({ itemId }),
  };
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
/*     Now: all files get 302 redirect. The extension fallback still matters    */
/*     for the share page filter (isAllowedFile).                              */
/* ========================================================================== */

describe("Video proxy — REGRESSION: application/octet-stream fallback", () => {
  it("returns 302 redirect for .mp4 with application/octet-stream mimeType", async () => {
    mockGraphFetch.mockResolvedValueOnce(
      graphItem({
        mimeType: "application/octet-stream",
        name: "geodis-video-sante-securite.mp4",
      })
    );

    const { request, params } = makeRequest("geodisVideoItem");
    const response = await GET(request, { params });

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("https://sharepoint.com/download/file");
  });

  it("returns 302 redirect for .mov with empty mimeType", async () => {
    mockGraphFetch.mockResolvedValueOnce({
      "@microsoft.graph.downloadUrl": "https://sharepoint.com/download/clip.mov",
      file: { mimeType: "" },
      name: "behind-the-scenes.mov",
      size: 30000000,
    });

    const { request, params } = makeRequest("movFileItem");
    const response = await GET(request, { params });

    expect(response.status).toBe(302);
  });

  it("returns 302 redirect for .webm with application/octet-stream", async () => {
    mockGraphFetch.mockResolvedValueOnce(
      graphItem({ mimeType: "application/octet-stream", name: "animation.webm" })
    );

    const { request, params } = makeRequest("webmItem");
    const response = await GET(request, { params });

    expect(response.status).toBe(302);
  });

  it("returns 302 redirect for .avi with application/octet-stream", async () => {
    mockGraphFetch.mockResolvedValueOnce(
      graphItem({ mimeType: "application/octet-stream", name: "legacy-footage.avi" })
    );

    const { request, params } = makeRequest("aviItem");
    const response = await GET(request, { params });

    expect(response.status).toBe(302);
  });

  it("returns 302 redirect for .wmv with application/octet-stream", async () => {
    mockGraphFetch.mockResolvedValueOnce(
      graphItem({ mimeType: "application/octet-stream", name: "corporate-video.wmv" })
    );

    const { request, params } = makeRequest("wmvItem");
    const response = await GET(request, { params });

    expect(response.status).toBe(302);
  });

  it("returns 302 redirect for .mkv with application/octet-stream", async () => {
    mockGraphFetch.mockResolvedValueOnce(
      graphItem({ mimeType: "application/octet-stream", name: "raw-edit.mkv" })
    );

    const { request, params } = makeRequest("mkvItem");
    const response = await GET(request, { params });

    expect(response.status).toBe(302);
  });

  it("returns 302 redirect for .m4v with application/octet-stream", async () => {
    mockGraphFetch.mockResolvedValueOnce(
      graphItem({ mimeType: "application/octet-stream", name: "iphone-clip.m4v" })
    );

    const { request, params } = makeRequest("m4vItem");
    const response = await GET(request, { params });

    expect(response.status).toBe(302);
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

    const { request, params } = makeRequest("uppercaseItem");
    const response = await GET(request, { params });

    expect(response.status).toBe(302);
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

    // Should not crash — 302 redirect since it cannot detect video type
    expect(response.status).toBe(302);
  });
});

/* ========================================================================== */
/*  2. Known video mimeTypes — 302 redirect (no streaming)                     */
/* ========================================================================== */

describe("Video proxy — known video mimeTypes get 302 redirect", () => {
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
    it(`returns 302 redirect for ${mime} (.${ext})`, async () => {
      mockGraphFetch.mockResolvedValueOnce(
        graphItem({ mimeType: mime, name: `test.${ext}` })
      );

      const { request, params } = makeRequest(`item-${ext}`);
      const response = await GET(request, { params });

      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe("https://sharepoint.com/download/file");
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
/*  4. 302 redirect for all assets (replaces streaming)                        */
/*     Videos no longer stream — browser follows 302 and handles Range on      */
/*     the final SharePoint URL directly.                                      */
/* ========================================================================== */

describe("Video proxy — 302 redirect behavior", () => {
  it("returns 302 with Location header pointing to downloadUrl", async () => {
    const customUrl = "https://sharepoint.com/download/big-video-token-xyz";
    mockGraphFetch.mockResolvedValueOnce(
      graphItem({ mimeType: "video/mp4", name: "big-video.mp4", downloadUrl: customUrl })
    );

    const { request, params } = makeRequest("rangeItem");
    const response = await GET(request, { params });

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(customUrl);
  });

  it("does NOT fetch upstream for video files (no streaming)", async () => {
    mockGraphFetch.mockResolvedValueOnce(
      graphItem({ mimeType: "video/mp4", name: "no-stream.mp4" })
    );

    const { request, params } = makeRequest("noStreamItem");
    const response = await GET(request, { params });

    expect(response.status).toBe(302);
    // fetch should NOT be called for videos — only graphFetch is called
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("does NOT fetch upstream for images (no streaming)", async () => {
    mockGraphFetch.mockResolvedValueOnce(
      graphItem({ mimeType: "image/png", name: "photo.png" })
    );

    const { request, params } = makeRequest("noStreamImg");
    const response = await GET(request, { params });

    expect(response.status).toBe(302);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("302 redirect includes Cache-Control header", async () => {
    mockGraphFetch.mockResolvedValueOnce(
      graphItem({ mimeType: "video/mp4", name: "cached.mp4" })
    );

    const { request, params } = makeRequest("cacheRedirect");
    const response = await GET(request, { params });

    expect(response.status).toBe(302);
    expect(response.headers.get("Cache-Control")).toContain("public");
    expect(response.headers.get("Cache-Control")).toContain("max-age=300");
  });

  it("Range header from client is ignored (browser handles Range on redirected URL)", async () => {
    mockGraphFetch.mockResolvedValueOnce(
      graphItem({ mimeType: "video/mp4", name: "seekable.mp4" })
    );

    const { request, params } = makeRequest("rangeIgnored", { range: "bytes=5000000-5499999" });
    const response = await GET(request, { params });

    // Still 302 — Range is handled by the browser on the final SharePoint URL
    expect(response.status).toBe(302);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

/* ========================================================================== */
/*  5. PDF inline streaming (the one streaming case that remains)              */
/* ========================================================================== */

describe("Video proxy — PDF inline streaming", () => {
  it("streams PDF with ?inline=1 (status 200, Content-Disposition: inline)", async () => {
    mockGraphFetch.mockResolvedValueOnce(
      graphItem({ mimeType: "application/pdf", name: "proposal.pdf" })
    );
    fetchSpy.mockResolvedValueOnce(
      new Response("pdf-content", {
        status: 200,
        headers: { "Content-Length": "12345" },
      })
    );

    const { request, params } = makeRequest("pdfInline", { inline: true });
    const response = await GET(request, { params });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Content-Disposition")).toContain("inline");
  });

  it("returns 302 for PDF WITHOUT ?inline=1", async () => {
    mockGraphFetch.mockResolvedValueOnce(
      graphItem({ mimeType: "application/pdf", name: "download.pdf" })
    );

    const { request, params } = makeRequest("pdfRedirect");
    const response = await GET(request, { params });

    expect(response.status).toBe(302);
  });
});

/* ========================================================================== */
/*  6. Error handling                                                          */
/* ========================================================================== */

describe("Video proxy — error handling", () => {
  it("returns 502 when Graph API call fails", async () => {
    mockGraphFetch.mockRejectedValueOnce(new Error("Graph API unavailable"));

    const { request, params } = makeRequest("graphFailItem");
    const response = await GET(request, { params });

    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.error).toBe("Failed to load asset");
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

  it("returns 502 when PDF inline upstream fetch fails", async () => {
    mockGraphFetch.mockResolvedValueOnce(
      graphItem({ mimeType: "application/pdf", name: "broken.pdf" })
    );
    fetchSpy.mockResolvedValueOnce(new Response("Forbidden", { status: 403 }));

    const { request, params } = makeRequest("pdfFail", { inline: true });
    const response = await GET(request, { params });

    expect(response.status).toBe(502);
  });

  it("returns 502 when PDF inline upstream fetch times out (AbortError)", async () => {
    mockGraphFetch.mockResolvedValueOnce(
      graphItem({ mimeType: "application/pdf", name: "slow.pdf" })
    );
    fetchSpy.mockRejectedValueOnce(
      new DOMException("The operation was aborted", "AbortError")
    );

    const { request, params } = makeRequest("pdfTimeout", { inline: true });
    const response = await GET(request, { params });

    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.error).toBe("Failed to load asset");
  });
});

/* ========================================================================== */
/*  7. Input validation                                                        */
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
/*  8. CSP media-src configuration (static analysis)                           */
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
/*  9. Share page: extension fallback in ALLOWED_MIMETYPES filter              */
/*     Static verification that the share page has the same fix as proxy       */
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
/*  10. Share page: video keys use itemId (not just filename)                   */
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
/*  11. Proxy route — timeout configuration                                    */
/* ========================================================================== */

describe("Video proxy — timeout configuration (static verification)", () => {
  const proxySource = fs.readFileSync(
    "/home/user/Sarani/src/app/api/project-assets/[itemId]/route.ts",
    "utf-8"
  );

  it("uses AbortSignal.timeout for PDF inline fetch", () => {
    expect(proxySource).toContain("AbortSignal.timeout");
  });

  it("PDF inline timeout is 30 seconds", () => {
    expect(proxySource).toContain("30_000");
  });
});

/* ========================================================================== */
/*  12. Cache headers                                                          */
/* ========================================================================== */

describe("Video proxy — cache headers on 302 redirect", () => {
  it("sets Cache-Control on 302 redirect responses", async () => {
    mockGraphFetch.mockResolvedValueOnce(
      graphItem({ mimeType: "video/mp4", name: "cached.mp4" })
    );

    const { request, params } = makeRequest("cacheItem");
    const response = await GET(request, { params });

    expect(response.status).toBe(302);
    expect(response.headers.get("Cache-Control")).toContain("public");
    expect(response.headers.get("Cache-Control")).toContain("max-age=300");
  });
});
