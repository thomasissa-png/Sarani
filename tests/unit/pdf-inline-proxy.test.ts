// @vitest-environment node
/**
 * Tests for PDF inline proxy feature.
 *
 * WHY THIS FILE EXISTS:
 * PDFs on share pages now open in-browser (inline) instead of downloading.
 * The proxy route handles ?inline=1 by fetching the PDF from SharePoint and
 * serving it with Content-Disposition: inline. This test verifies:
 * 1. PDFs with ?inline=1 are streamed (not redirected)
 * 2. Content-Disposition is set to inline
 * 3. Content-Type is application/pdf
 * 4. PDFs without ?inline=1 still get 302 redirect
 *
 * REGRESSION: PDF inline viewing — new feature 2026-04-04
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

describe("PDF proxy — inline mode (?inline=1)", () => {
  it("streams PDF with Content-Disposition: inline when ?inline=1", async () => {
    mockGraphFetch.mockResolvedValueOnce(graphPdfItem("document.pdf"));

    const pdfContent = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // %PDF magic bytes
    fetchSpy.mockResolvedValueOnce(
      new Response(pdfContent, {
        status: 200,
        headers: { "Content-Length": "4", "Content-Type": "application/pdf" },
      })
    );

    const { request, params } = makeRequest("pdfItem", { inline: true });
    const response = await GET(request, { params });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Content-Disposition")).toContain("inline");
    expect(response.headers.get("Content-Disposition")).toContain("document.pdf");
  });

  it("forwards Content-Length from upstream for PDF inline", async () => {
    mockGraphFetch.mockResolvedValueOnce(graphPdfItem());
    fetchSpy.mockResolvedValueOnce(
      new Response("fake-pdf", {
        status: 200,
        headers: { "Content-Length": "524288" },
      })
    );

    const { request, params } = makeRequest("pdfLenItem", { inline: true });
    const response = await GET(request, { params });

    expect(response.headers.get("Content-Length")).toBe("524288");
  });

  it("sets cache headers on inline PDF response", async () => {
    mockGraphFetch.mockResolvedValueOnce(graphPdfItem());
    fetchSpy.mockResolvedValueOnce(
      new Response("fake-pdf", { status: 200, headers: { "Content-Length": "100" } })
    );

    const { request, params } = makeRequest("pdfCacheItem", { inline: true });
    const response = await GET(request, { params });

    expect(response.headers.get("Cache-Control")).toContain("public");
    expect(response.headers.get("Cache-Control")).toContain("max-age=300");
  });

  it("returns 502 when upstream PDF fetch fails", async () => {
    mockGraphFetch.mockResolvedValueOnce(graphPdfItem());
    fetchSpy.mockResolvedValueOnce(new Response("Forbidden", { status: 403 }));

    const { request, params } = makeRequest("pdfFailItem", { inline: true });
    const response = await GET(request, { params });

    expect(response.status).toBe(502);
  });
});

describe("PDF proxy — without inline flag (regular behavior)", () => {
  it("redirects PDF with 302 when no ?inline=1", async () => {
    mockGraphFetch.mockResolvedValueOnce(graphPdfItem());

    const { request, params } = makeRequest("pdfRedirectItem");
    const response = await GET(request, { params });

    expect(response.status).toBe(302);
  });
});

describe("PDF proxy — extension-based detection", () => {
  it("detects PDF by extension when mimeType is application/octet-stream", async () => {
    mockGraphFetch.mockResolvedValueOnce({
      "@microsoft.graph.downloadUrl": "https://sharepoint.com/download/file",
      file: { mimeType: "application/octet-stream" },
      name: "report.pdf",
      size: 1024,
    });

    // Without inline=1, PDF gets 302 redirect regardless
    const { request, params } = makeRequest("pdfOctetItem");
    const response = await GET(request, { params });

    // application/octet-stream + .pdf extension → still not a video → 302 redirect
    expect(response.status).toBe(302);
  });

  it("streams octet-stream PDF with ?inline=1 using extension detection", async () => {
    mockGraphFetch.mockResolvedValueOnce({
      "@microsoft.graph.downloadUrl": "https://sharepoint.com/download/file",
      file: { mimeType: "application/octet-stream" },
      name: "report.pdf",
      size: 1024,
    });
    fetchSpy.mockResolvedValueOnce(
      new Response("fake-pdf", { status: 200, headers: { "Content-Length": "1024" } })
    );

    const { request, params } = makeRequest("pdfOctetInlineItem", { inline: true });
    const response = await GET(request, { params });

    // The route checks: isPdf = mimeType === "application/pdf" || name.endsWith(".pdf")
    // For octet-stream + .pdf name + inline=1, isPdf is true via extension check
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Content-Disposition")).toContain("inline");
  });
});
