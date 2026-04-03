// @vitest-environment node
/**
 * Unit tests for the video proxy CORS headers and CSP media-src configuration.
 *
 * WHY: HTML5 video players require CORS headers to play proxied videos.
 * Without Access-Control-Allow-Origin on the proxy response, browsers block
 * video playback with an opaque response error. The CSP must also include
 * `media-src 'self' blob:` to allow blob URLs created by the video player.
 *
 * REGRESSION: Video playback broken without CORS headers — fixed 2026-04-03
 *
 * The route handler depends on graphFetch (SharePoint API), so we test the
 * response construction logic by mocking the external dependency.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

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

/* ========================================================================== */
/*  Helpers                                                                    */
/* ========================================================================== */

function makeRequest(itemId: string, options?: { range?: string; driveId?: string }): {
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

/* ========================================================================== */
/*  1. Video proxy CORS headers                                                */
/* ========================================================================== */

describe("Video proxy — CORS headers for video streaming", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns Access-Control-Allow-Origin: * for video responses", async () => {
    // Mock: video item with download URL
    mockGraphFetch.mockResolvedValueOnce({
      "@microsoft.graph.downloadUrl": "https://sharepoint.com/download/video.mp4",
      file: { mimeType: "video/mp4" },
      size: 1024000,
    });

    // Mock: fetch the actual video (global fetch)
    const mockBody = new ReadableStream();
    const mockUpstream = new Response(mockBody, {
      status: 200,
      headers: {
        "Content-Length": "1024000",
        "Content-Type": "video/mp4",
      },
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockUpstream);

    const { request, params } = makeRequest("validItemId123");
    const response = await GET(request, { params });

    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("returns Cross-Origin-Resource-Policy: cross-origin for video responses", async () => {
    mockGraphFetch.mockResolvedValueOnce({
      "@microsoft.graph.downloadUrl": "https://sharepoint.com/download/video.mp4",
      file: { mimeType: "video/mp4" },
      size: 2048000,
    });

    const mockUpstream = new Response(new ReadableStream(), {
      status: 200,
      headers: { "Content-Length": "2048000" },
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockUpstream);

    const { request, params } = makeRequest("validItemId456");
    const response = await GET(request, { params });

    expect(response.headers.get("Cross-Origin-Resource-Policy")).toBe("cross-origin");
  });

  it("returns Accept-Ranges: bytes for video responses", async () => {
    mockGraphFetch.mockResolvedValueOnce({
      "@microsoft.graph.downloadUrl": "https://sharepoint.com/download/video.mp4",
      file: { mimeType: "video/mp4" },
      size: 512000,
    });

    const mockUpstream = new Response(new ReadableStream(), {
      status: 200,
      headers: { "Content-Length": "512000" },
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockUpstream);

    const { request, params } = makeRequest("validItemId789");
    const response = await GET(request, { params });

    expect(response.headers.get("Accept-Ranges")).toBe("bytes");
  });

  it("forwards Range header and returns 206 with Content-Range", async () => {
    mockGraphFetch.mockResolvedValueOnce({
      "@microsoft.graph.downloadUrl": "https://sharepoint.com/download/video.mp4",
      file: { mimeType: "video/mp4" },
      size: 5000000,
    });

    const mockUpstream = new Response(new ReadableStream(), {
      status: 206,
      headers: {
        "Content-Length": "1000000",
        "Content-Range": "bytes 0-999999/5000000",
      },
    });
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockUpstream);

    const { request, params } = makeRequest("rangeTestItem", { range: "bytes=0-999999" });
    const response = await GET(request, { params });

    // Verify Range was forwarded to upstream
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Range: "bytes=0-999999" }),
      })
    );
    expect(response.status).toBe(206);
    expect(response.headers.get("Content-Range")).toBe("bytes 0-999999/5000000");
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("non-video assets get 302 redirect (no CORS headers needed)", async () => {
    mockGraphFetch.mockResolvedValueOnce({
      "@microsoft.graph.downloadUrl": "https://sharepoint.com/download/image.png",
      file: { mimeType: "image/png" },
      size: 50000,
    });

    const { request, params } = makeRequest("imageItemId");
    const response = await GET(request, { params });

    expect(response.status).toBe(302);
    // Redirect responses don't have CORS headers (browser follows redirect)
  });
});

/* ========================================================================== */
/*  2. Input validation                                                        */
/* ========================================================================== */

describe("Video proxy — input validation", () => {
  it("rejects item ID with path injection characters", async () => {
    const { request, params } = makeRequest("../../etc/passwd");
    const response = await GET(request, { params });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid item or drive ID");
  });

  it("rejects drive ID with special characters", async () => {
    const { request, params } = makeRequest("validItem", { driveId: "drive/../hack" });
    const response = await GET(request, { params });

    expect(response.status).toBe(400);
  });

  it("accepts valid alphanumeric item IDs with hyphens and underscores", async () => {
    mockGraphFetch.mockResolvedValueOnce({
      "@microsoft.graph.downloadUrl": "https://sharepoint.com/download/file.pdf",
      file: { mimeType: "application/pdf" },
    });

    const { request, params } = makeRequest("01J8K_abc-XYZ!");
    const response = await GET(request, { params });

    // Should not be 400 — the ID passes validation
    expect(response.status).not.toBe(400);
  });
});

/* ========================================================================== */
/*  3. CSP media-src configuration                                             */
/* ========================================================================== */

describe("CSP configuration — media-src includes blob:", () => {
  it("next.config.ts CSP includes media-src 'self' blob:", async () => {
    // We read the config file as text and verify the CSP directive is present.
    // This is a static analysis test — not a runtime test.
    const fs = await import("fs");
    const configContent = fs.readFileSync(
      "/home/user/Sarani/next.config.ts",
      "utf-8"
    );

    expect(configContent).toContain("media-src 'self' blob:");
  });
});
