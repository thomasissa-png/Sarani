// @vitest-environment node
/**
 * Tests for PDF proxy — 302 redirect behavior.
 *
 * PDFs (like all assets) are served via 302 redirect to the fresh
 * SharePoint download URL. The browser's built-in PDF viewer opens
 * them inline automatically when the Content-Type is application/pdf
 * (which SharePoint sets correctly on the redirect target).
 *
 * Previously, PDFs with ?inline=1 were streamed through the proxy,
 * but this caused HTTP 500 on Replit (worker killed mid-stream for
 * large PDFs). Now all assets use 302 redirect uniformly.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mock SharePoint graphFetch ─────────────────────────────────────────────

const mockGraphFetch = vi.fn();

vi.mock("@/lib/integrations/sharepoint", () => ({
  graphFetch: (...args: unknown[]) => mockGraphFetch(...args),
}));

vi.mock("@/lib/integrations/config", () => ({
  SHAREPOINT_ASSETS_DRIVE_ID: "test-drive-id",
}));

const { GET } = await import("@/app/api/project-assets/[itemId]/route");

let fetchSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  mockGraphFetch.mockReset();
  fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(new ReadableStream(), { status: 200 })
  );
});

afterEach(() => {
  fetchSpy.mockRestore();
});

function makeRequest(
  itemId: string,
  options?: { inline?: boolean; driveId?: string }
): {
  request: NextRequest;
  params: Promise<{ itemId: string }>;
} {
  const url = new URL(`http://localhost/api/project-assets/${itemId}`);
  if (options?.driveId) url.searchParams.set("driveId", options.driveId);
  if (options?.inline) url.searchParams.set("inline", "1");
  return {
    request: new NextRequest(url),
    params: Promise.resolve({ itemId }),
  };
}

function graphPdfItem(name = "proposal.pdf") {
  return {
    "@microsoft.graph.downloadUrl": "https://sharepoint.com/download/file.pdf",
    file: { mimeType: "application/pdf" },
    name,
    size: 524288,
  };
}

describe("PDF proxy — 302 redirect (all PDFs)", () => {
  it("redirects PDF with 302 to SharePoint download URL", async () => {
    mockGraphFetch.mockResolvedValueOnce(graphPdfItem("document.pdf"));

    const { request, params } = makeRequest("pdfItem");
    const response = await GET(request, { params });

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("https://sharepoint.com/download/file.pdf");
  });

  it("redirects PDF even with ?inline=1 (streaming removed)", async () => {
    mockGraphFetch.mockResolvedValueOnce(graphPdfItem("document.pdf"));

    const { request, params } = makeRequest("pdfInlineItem", { inline: true });
    const response = await GET(request, { params });

    // ?inline=1 is now ignored — all assets get 302 redirect
    expect(response.status).toBe(302);
  });

  it("sets cache headers on PDF redirect", async () => {
    mockGraphFetch.mockResolvedValueOnce(graphPdfItem());

    const { request, params } = makeRequest("pdfCacheItem");
    const response = await GET(request, { params });

    expect(response.status).toBe(302);
    expect(response.headers.get("Cache-Control")).toContain("max-age=300");
  });

  it("redirects octet-stream PDF by extension", async () => {
    mockGraphFetch.mockResolvedValueOnce({
      "@microsoft.graph.downloadUrl": "https://sharepoint.com/download/file",
      file: { mimeType: "application/octet-stream" },
      name: "report.pdf",
      size: 1024,
    });

    const { request, params } = makeRequest("pdfOctetItem");
    const response = await GET(request, { params });

    expect(response.status).toBe(302);
  });

  it("returns 502 when Graph API fails", async () => {
    mockGraphFetch.mockRejectedValueOnce(new Error("Graph API unavailable"));

    const { request, params } = makeRequest("pdfErrorItem");
    const response = await GET(request, { params });

    expect(response.status).toBe(502);
  });
});
