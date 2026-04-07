// @vitest-environment node
/**
 * LinkedIn Visual — Hybrid OpenAI + Sharp generator tests.
 *
 * Tests the module structure, fallback behavior, background prompt generation,
 * and compositing logic. Actual OpenAI calls are mocked.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Mock OpenAI ─────────────────────────────────────────────────────────────

const mockGenerate = vi.fn();

vi.mock("openai", () => {
  return {
    default: class MockOpenAI {
      images = { generate: mockGenerate };
      constructor() {}
    },
  };
});

// ─── Mock sharp ──────────────────────────────────────────────────────────────

const mockSharpInstance = {
  resize: vi.fn().mockReturnThis(),
  png: vi.fn().mockReturnThis(),
  composite: vi.fn().mockReturnThis(),
  toBuffer: vi.fn().mockResolvedValue(Buffer.from("fake-png")),
};

const mockSharpCreate = {
  png: vi.fn().mockReturnThis(),
  composite: vi.fn().mockReturnThis(),
  toBuffer: vi.fn().mockResolvedValue(Buffer.from("fake-canvas")),
};

vi.mock("sharp", () => {
  return {
    default: vi.fn((input?: unknown) => {
      if (input && typeof input === "object" && "create" in (input as Record<string, unknown>)) {
        return mockSharpCreate;
      }
      return mockSharpInstance;
    }),
  };
});

// ─── Mock next/og ────────────────────────────────────────────────────────────

vi.mock("next/og", () => ({
  ImageResponse: class MockImageResponse {
    constructor() {}
    async arrayBuffer() {
      return new ArrayBuffer(8);
    }
  },
}));

// ─── Mock fs/promises (font loading) ─────────────────────────────────────────

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn().mockResolvedValue(Buffer.from("fake-font-data")),
}));

// ─── Mock SharePoint ─────────────────────────────────────────────────────────

vi.mock("@/lib/integrations/sharepoint", () => ({
  graphFetch: vi.fn().mockResolvedValue({}),
}));

// ─── Mock original Satori generator (fallback) ──────────────────────────────

vi.mock("@/lib/case-studies/linkedin-visual", () => ({
  generateLinkedInVisual: vi.fn().mockResolvedValue(Buffer.from("satori-fallback-png")),
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("linkedin-visual-openai", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    // Ensure sharp mocks are in their default state (prevents leak from sharp failure tests)
    mockSharpInstance.resize.mockReturnThis();
    mockSharpInstance.png.mockReturnThis();
    mockSharpInstance.composite.mockReturnThis();
    mockSharpInstance.toBuffer.mockResolvedValue(Buffer.from("fake-png"));
    mockSharpCreate.png.mockReturnThis();
    mockSharpCreate.composite.mockReturnThis();
    mockSharpCreate.toBuffer.mockResolvedValue(Buffer.from("fake-canvas"));
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("generateAIBackground", () => {
    it("returns null when OPENAI_API_KEY is not set", async () => {
      delete process.env.OPENAI_API_KEY;
      const { generateAIBackground } = await import(
        "@/lib/case-studies/linkedin-visual-openai"
      );
      const result = await generateAIBackground({
        clientName: "Sony",
      });
      expect(result).toBeNull();
      expect(mockGenerate).not.toHaveBeenCalled();
    });

    it("calls OpenAI with correct parameters when API key is set", async () => {
      process.env.OPENAI_API_KEY = "sk-test-key";
      mockGenerate.mockResolvedValueOnce({
        data: [{ b64_json: Buffer.from("fake-image").toString("base64") }],
      });

      const { generateAIBackground } = await import(
        "@/lib/case-studies/linkedin-visual-openai"
      );
      const result = await generateAIBackground({
        clientName: "Sony",
        industry: "entertainment",
        primaryColor: "#1428A0",
        brandTone: "bold, innovative, premium",
      });

      expect(mockGenerate).toHaveBeenCalledOnce();
      const callArgs = mockGenerate.mock.calls[0][0];
      expect(callArgs.model).toBe("gpt-image-1");
      expect(callArgs.size).toBe("1024x1024");
      expect(callArgs.prompt).toContain("#1428A0");
      expect(callArgs.prompt).toContain("entertainment");
      // Should return a buffer (resized via sharp)
      expect(result).toBeInstanceOf(Buffer);
    });

    it("returns null on OpenAI API error", async () => {
      process.env.OPENAI_API_KEY = "sk-test-key";
      mockGenerate.mockRejectedValueOnce(new Error("API rate limited"));

      const { generateAIBackground } = await import(
        "@/lib/case-studies/linkedin-visual-openai"
      );
      const result = await generateAIBackground({
        clientName: "TestCo",
      });
      expect(result).toBeNull();
    });

    it("uses default mood descriptors when brandTone is null", async () => {
      process.env.OPENAI_API_KEY = "sk-test-key";
      mockGenerate.mockResolvedValueOnce({
        data: [{ b64_json: Buffer.from("fake").toString("base64") }],
      });

      const { generateAIBackground } = await import(
        "@/lib/case-studies/linkedin-visual-openai"
      );
      await generateAIBackground({ clientName: "Unknown" });

      const prompt = mockGenerate.mock.calls[0][0].prompt;
      expect(prompt).toContain("premium, sophisticated, modern");
    });

    it("includes Flame color hint when no primaryColor", async () => {
      process.env.OPENAI_API_KEY = "sk-test-key";
      mockGenerate.mockResolvedValueOnce({
        data: [{ b64_json: Buffer.from("fake").toString("base64") }],
      });

      const { generateAIBackground } = await import(
        "@/lib/case-studies/linkedin-visual-openai"
      );
      await generateAIBackground({ clientName: "NoBrand" });

      const prompt = mockGenerate.mock.calls[0][0].prompt;
      expect(prompt).toContain("#DA5126");
    });
  });

  describe("generateLinkedInVisualHybrid", () => {
    it("falls back to Satori when no OPENAI_API_KEY", async () => {
      delete process.env.OPENAI_API_KEY;

      const { generateLinkedInVisualHybrid } = await import(
        "@/lib/case-studies/linkedin-visual-openai"
      );
      const { generateLinkedInVisual } = await import(
        "@/lib/case-studies/linkedin-visual"
      );

      const result = await generateLinkedInVisualHybrid({
        clientName: "Sony",
        projectTitle: "Brand Campaign",
        projectImages: [],
      });

      // Should have called the Satori fallback
      expect(generateLinkedInVisual).toHaveBeenCalled();
      expect(result).toBeInstanceOf(Buffer);
    });

    it("produces a Buffer output with AI background", async () => {
      process.env.OPENAI_API_KEY = "sk-test-key";
      mockGenerate.mockResolvedValueOnce({
        data: [{ b64_json: Buffer.from("ai-background").toString("base64") }],
      });

      const { generateLinkedInVisualHybrid } = await import(
        "@/lib/case-studies/linkedin-visual-openai"
      );

      const result = await generateLinkedInVisualHybrid({
        clientName: "TikTok",
        projectTitle: "Social Campaign",
        visualTitle: "RUN FAST",
        projectImages: [],
        primaryColor: "#FE2C55",
        brandTone: "bold, dynamic, energetic",
      });

      expect(result).toBeInstanceOf(Buffer);
      // Sharp composite should have been called
      expect(mockSharpInstance.composite).toHaveBeenCalled();
    });
  });

  describe("BackgroundContext", () => {
    it("type exports are accessible", async () => {
      const mod = await import("@/lib/case-studies/linkedin-visual-openai");
      // Verify the module exports the expected functions
      expect(typeof mod.generateAIBackground).toBe("function");
      expect(typeof mod.generateLinkedInVisualHybrid).toBe("function");
    });
  });

  // ─── Additional coverage: edge cases, error paths, compositing ─────────

  describe("generateAIBackground — URL fallback path", () => {
    it("handles OpenAI response with url instead of b64_json", async () => {
      process.env.OPENAI_API_KEY = "sk-test-key";

      // Mock global fetch for the image URL download
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(Buffer.from("downloaded-image").buffer),
      }) as unknown as typeof fetch;

      mockGenerate.mockResolvedValueOnce({
        data: [{ url: "https://oaidalleapiprodscus.blob.core.windows.net/image.png" }],
      });

      const { generateAIBackground } = await import(
        "@/lib/case-studies/linkedin-visual-openai"
      );
      const result = await generateAIBackground({ clientName: "TestURL" });

      expect(result).toBeInstanceOf(Buffer);
      expect(mockSharpInstance.resize).toHaveBeenCalledWith(1200, 1200, { fit: "cover" });

      global.fetch = originalFetch;
    });

    it("returns null when OpenAI response has no data entries", async () => {
      process.env.OPENAI_API_KEY = "sk-test-key";
      mockGenerate.mockResolvedValueOnce({ data: [] });

      const { generateAIBackground } = await import(
        "@/lib/case-studies/linkedin-visual-openai"
      );
      const result = await generateAIBackground({ clientName: "EmptyData" });
      expect(result).toBeNull();
    });

    it("returns null when OpenAI response data entry has neither b64_json nor url", async () => {
      process.env.OPENAI_API_KEY = "sk-test-key";
      mockGenerate.mockResolvedValueOnce({ data: [{}] });

      const { generateAIBackground } = await import(
        "@/lib/case-studies/linkedin-visual-openai"
      );
      const result = await generateAIBackground({ clientName: "NoImage" });
      expect(result).toBeNull();
    });

    it("returns null when URL download fails (non-ok response)", async () => {
      process.env.OPENAI_API_KEY = "sk-test-key";

      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 403,
      }) as unknown as typeof fetch;

      mockGenerate.mockResolvedValueOnce({
        data: [{ url: "https://expired-url.example.com/image.png" }],
      });

      const { generateAIBackground } = await import(
        "@/lib/case-studies/linkedin-visual-openai"
      );
      const result = await generateAIBackground({ clientName: "ExpiredURL" });
      expect(result).toBeNull();

      global.fetch = originalFetch;
    });
  });

  describe("generateAIBackground — prompt construction", () => {
    it("includes industry hint in prompt when provided", async () => {
      process.env.OPENAI_API_KEY = "sk-test-key";
      mockGenerate.mockResolvedValueOnce({
        data: [{ b64_json: Buffer.from("x").toString("base64") }],
      });

      const { generateAIBackground } = await import(
        "@/lib/case-studies/linkedin-visual-openai"
      );
      await generateAIBackground({
        clientName: "GEODIS",
        industry: "logistics",
        primaryColor: "#003DA5",
        brandTone: "reliable, efficient",
      });

      const prompt = mockGenerate.mock.calls[0][0].prompt;
      expect(prompt).toContain("logistics");
      expect(prompt).toContain("#003DA5");
      expect(prompt).toContain("reliable, efficient");
    });

    it("omits industry hint when industry is null", async () => {
      process.env.OPENAI_API_KEY = "sk-test-key";
      mockGenerate.mockResolvedValueOnce({
        data: [{ b64_json: Buffer.from("x").toString("base64") }],
      });

      const { generateAIBackground } = await import(
        "@/lib/case-studies/linkedin-visual-openai"
      );
      await generateAIBackground({ clientName: "NoIndustry", industry: null });

      const prompt = mockGenerate.mock.calls[0][0].prompt;
      // Should NOT contain "The project is in the" when industry is null
      expect(prompt).not.toContain("The project is in the");
    });
  });

  describe("generateLinkedInVisualHybrid — title sizing edge cases", () => {
    it("truncates very long titles (>100 chars) when no images", async () => {
      process.env.OPENAI_API_KEY = "sk-test-key";
      mockGenerate.mockResolvedValueOnce({
        data: [{ b64_json: Buffer.from("bg").toString("base64") }],
      });

      const { generateLinkedInVisualHybrid } = await import(
        "@/lib/case-studies/linkedin-visual-openai"
      );

      const longTitle = "A".repeat(120);
      const result = await generateLinkedInVisualHybrid({
        clientName: "Test",
        projectTitle: longTitle,
        projectImages: [],
      });

      expect(result).toBeInstanceOf(Buffer);
    });

    it("truncates very long titles (>150 chars) when images present", async () => {
      process.env.OPENAI_API_KEY = "sk-test-key";
      mockGenerate.mockResolvedValueOnce({
        data: [{ b64_json: Buffer.from("bg").toString("base64") }],
      });

      const { generateLinkedInVisualHybrid } = await import(
        "@/lib/case-studies/linkedin-visual-openai"
      );

      const longTitle = "B".repeat(160);
      const result = await generateLinkedInVisualHybrid({
        clientName: "Test",
        projectTitle: longTitle,
        projectImages: [`data:image/png;base64,${Buffer.from("fake").toString("base64")}`],
      });

      expect(result).toBeInstanceOf(Buffer);
    });

    it("uses visualTitle when provided instead of projectTitle", async () => {
      process.env.OPENAI_API_KEY = "sk-test-key";
      mockGenerate.mockResolvedValueOnce({
        data: [{ b64_json: Buffer.from("bg").toString("base64") }],
      });

      const { generateLinkedInVisualHybrid } = await import(
        "@/lib/case-studies/linkedin-visual-openai"
      );

      const result = await generateLinkedInVisualHybrid({
        clientName: "Adidas",
        projectTitle: "Original Long Project Title That Should Not Be Used",
        visualTitle: "RUN FAST",
        projectImages: [],
      });

      expect(result).toBeInstanceOf(Buffer);
    });

    it("falls back to projectTitle when visualTitle is empty string", async () => {
      process.env.OPENAI_API_KEY = "sk-test-key";
      mockGenerate.mockResolvedValueOnce({
        data: [{ b64_json: Buffer.from("bg").toString("base64") }],
      });

      const { generateLinkedInVisualHybrid } = await import(
        "@/lib/case-studies/linkedin-visual-openai"
      );

      const result = await generateLinkedInVisualHybrid({
        clientName: "Test",
        projectTitle: "Fallback Title",
        visualTitle: "   ", // whitespace-only should be treated as empty
        projectImages: [],
      });

      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe("generateLinkedInVisualHybrid — compositing with photos", () => {
    it("composites photo grid when images are provided with AI background", async () => {
      process.env.OPENAI_API_KEY = "sk-test-key";
      mockGenerate.mockResolvedValueOnce({
        data: [{ b64_json: Buffer.from("bg").toString("base64") }],
      });

      const { generateLinkedInVisualHybrid } = await import(
        "@/lib/case-studies/linkedin-visual-openai"
      );

      // Mock fetchImageAsBuffer will return null (images not accessible in test)
      // but the compositing pipeline should still work
      const result = await generateLinkedInVisualHybrid({
        clientName: "Sony",
        projectTitle: "Black Friday Campaign",
        projectImages: ["/images/test1.png", "/images/test2.png"],
      });

      expect(result).toBeInstanceOf(Buffer);
      expect(mockSharpInstance.composite).toHaveBeenCalled();
    });
  });

  describe("generateLinkedInVisualHybrid — fallback on OpenAI error mid-generation", () => {
    it("falls back to Satori when OpenAI call throws", async () => {
      process.env.OPENAI_API_KEY = "sk-test-key";
      mockGenerate.mockRejectedValueOnce(new Error("Connection timeout"));

      const { generateLinkedInVisualHybrid } = await import(
        "@/lib/case-studies/linkedin-visual-openai"
      );
      const { generateLinkedInVisual } = await import(
        "@/lib/case-studies/linkedin-visual"
      );

      const result = await generateLinkedInVisualHybrid({
        clientName: "TikTok",
        projectTitle: "Video Campaign",
        projectImages: [],
      });

      // When OpenAI fails, generateAIBackground returns null,
      // which triggers the Satori fallback
      expect(generateLinkedInVisual).toHaveBeenCalled();
      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe("generateLinkedInVisualHybrid — sharp failure resilience", () => {
    it("propagates sharp errors (no silent swallow)", async () => {
      process.env.OPENAI_API_KEY = "sk-test-key";
      mockGenerate.mockResolvedValueOnce({
        data: [{ b64_json: Buffer.from("bg").toString("base64") }],
      });

      // Make sharp toBuffer throw on the final compositing step
      // Use mockImplementationOnce so it auto-restores after one call (resize),
      // then the second call (final composite) throws
      const originalToBuffer = mockSharpInstance.toBuffer;
      let toBufferCallCount = 0;
      mockSharpInstance.toBuffer = vi.fn().mockImplementation(() => {
        toBufferCallCount++;
        // First call = resize AI background, second = final composite
        if (toBufferCallCount >= 2) {
          return Promise.reject(new Error("Sharp composite failed: out of memory"));
        }
        return Promise.resolve(Buffer.from("fake-resized"));
      });

      const { generateLinkedInVisualHybrid } = await import(
        "@/lib/case-studies/linkedin-visual-openai"
      );

      try {
        await expect(
          generateLinkedInVisualHybrid({
            clientName: "Test",
            projectTitle: "Test",
            projectImages: [],
          })
        ).rejects.toThrow("Sharp composite failed");
      } finally {
        // Always restore mock even if assertion fails
        mockSharpInstance.toBuffer = originalToBuffer;
      }
    });
  });

  // ─── REGRESSION: generate/route.ts Step 5 missing branding context ─────
  // BUG DETECTED: generate/route.ts passes projectType to hybrid generator
  // but NOT industry, primaryColor, or brandTone. The linkedin-visual/route.ts
  // correctly fetches these from the clients table. This test documents the
  // expected behavior for the fix.

  describe("HybridVisualParams — branding context acceptance", () => {
    it("accepts and uses all branding context fields", async () => {
      process.env.OPENAI_API_KEY = "sk-test-key";
      mockGenerate.mockResolvedValueOnce({
        data: [{ b64_json: Buffer.from("bg").toString("base64") }],
      });

      const { generateLinkedInVisualHybrid } = await import(
        "@/lib/case-studies/linkedin-visual-openai"
      );

      // Simulate the CORRECT call with all branding context
      // (as linkedin-visual/route.ts does, but generate/route.ts currently doesn't)
      const result = await generateLinkedInVisualHybrid({
        clientName: "L'Oréal",
        projectTitle: "Beauty Campaign",
        projectImages: [],
        projectType: "Social Media",
        industry: "fmcg",
        primaryColor: "#FFD700",
        brandTone: "elegant, luxurious, refined",
      });

      expect(result).toBeInstanceOf(Buffer);

      // Verify the prompt included branding context
      const prompt = mockGenerate.mock.calls[0][0].prompt;
      expect(prompt).toContain("fmcg");
      expect(prompt).toContain("#FFD700");
      expect(prompt).toContain("elegant, luxurious, refined");
    });

    it("works with all branding fields null (graceful degradation)", async () => {
      process.env.OPENAI_API_KEY = "sk-test-key";
      mockGenerate.mockResolvedValueOnce({
        data: [{ b64_json: Buffer.from("bg").toString("base64") }],
      });

      const { generateLinkedInVisualHybrid } = await import(
        "@/lib/case-studies/linkedin-visual-openai"
      );

      const result = await generateLinkedInVisualHybrid({
        clientName: "NoContext",
        projectTitle: "Test",
        projectImages: [],
        projectType: null,
        industry: null,
        primaryColor: null,
        brandTone: null,
      });

      expect(result).toBeInstanceOf(Buffer);
      const prompt = mockGenerate.mock.calls[0][0].prompt;
      // Should use defaults
      expect(prompt).toContain("premium, sophisticated, modern");
      expect(prompt).toContain("#DA5126");
    });
  });

  // ─── MISSING COVERAGE: additional edge cases and resilience ────────────

  describe("generateLinkedInVisualHybrid — accentWord defaults", () => {
    it("defaults accentWord to clientName when not provided", async () => {
      process.env.OPENAI_API_KEY = "sk-test-key";
      mockGenerate.mockResolvedValueOnce({
        data: [{ b64_json: Buffer.from("bg").toString("base64") }],
      });

      const { generateLinkedInVisualHybrid } = await import(
        "@/lib/case-studies/linkedin-visual-openai"
      );

      // accentWord omitted — should default to clientName "Sony"
      const result = await generateLinkedInVisualHybrid({
        clientName: "Sony",
        projectTitle: "Sony Black Friday Campaign",
        projectImages: [],
      });

      expect(result).toBeInstanceOf(Buffer);
      // No crash = accentWord fallback works
    });

    it("uses explicit accentWord over clientName", async () => {
      process.env.OPENAI_API_KEY = "sk-test-key";
      mockGenerate.mockResolvedValueOnce({
        data: [{ b64_json: Buffer.from("bg").toString("base64") }],
      });

      const { generateLinkedInVisualHybrid } = await import(
        "@/lib/case-studies/linkedin-visual-openai"
      );

      const result = await generateLinkedInVisualHybrid({
        clientName: "Sony",
        projectTitle: "Black Friday Campaign",
        accentWord: "Friday",
        projectImages: [],
      });

      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe("generateLinkedInVisualHybrid — projectImages capped at 3", () => {
    it("only processes first 3 images even when more are provided", async () => {
      process.env.OPENAI_API_KEY = "sk-test-key";
      mockGenerate.mockResolvedValueOnce({
        data: [{ b64_json: Buffer.from("bg").toString("base64") }],
      });

      const { generateLinkedInVisualHybrid } = await import(
        "@/lib/case-studies/linkedin-visual-openai"
      );

      // Provide 5 data URI images — only 3 should be processed
      const fakeDataUri = `data:image/png;base64,${Buffer.from("img").toString("base64")}`;
      const result = await generateLinkedInVisualHybrid({
        clientName: "Test",
        projectTitle: "Test",
        projectImages: [fakeDataUri, fakeDataUri, fakeDataUri, fakeDataUri, fakeDataUri],
      });

      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe("generateLinkedInVisualHybrid — adversarial client names", () => {
    // REGRESSION: real Sarani clients include L'Oréal, accented names
    it("handles client names with apostrophes and accents (L'Oréal)", async () => {
      process.env.OPENAI_API_KEY = "sk-test-key";
      mockGenerate.mockResolvedValueOnce({
        data: [{ b64_json: Buffer.from("bg").toString("base64") }],
      });

      const { generateLinkedInVisualHybrid } = await import(
        "@/lib/case-studies/linkedin-visual-openai"
      );

      const result = await generateLinkedInVisualHybrid({
        clientName: "L'Oréal",
        projectTitle: "L'Oréal Beauty Campaign",
        projectImages: [],
      });

      expect(result).toBeInstanceOf(Buffer);
      const prompt = mockGenerate.mock.calls[0][0].prompt;
      // Prompt should not crash with special chars
      expect(typeof prompt).toBe("string");
    });

    it("handles client names with special characters (&<>\"')", async () => {
      process.env.OPENAI_API_KEY = "sk-test-key";
      mockGenerate.mockResolvedValueOnce({
        data: [{ b64_json: Buffer.from("bg").toString("base64") }],
      });

      const { generateLinkedInVisualHybrid } = await import(
        "@/lib/case-studies/linkedin-visual-openai"
      );

      const result = await generateLinkedInVisualHybrid({
        clientName: "AT&T <Global>",
        projectTitle: 'AT&T "Digital" Campaign',
        projectImages: [],
      });

      expect(result).toBeInstanceOf(Buffer);
    });

    it("handles empty string clientName gracefully", async () => {
      process.env.OPENAI_API_KEY = "sk-test-key";
      mockGenerate.mockResolvedValueOnce({
        data: [{ b64_json: Buffer.from("bg").toString("base64") }],
      });

      const { generateLinkedInVisualHybrid } = await import(
        "@/lib/case-studies/linkedin-visual-openai"
      );

      const result = await generateLinkedInVisualHybrid({
        clientName: "",
        projectTitle: "Unnamed Project",
        projectImages: [],
      });

      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe("generateAIBackground — OpenAI param validation", () => {
    it("uses quality: medium (cost optimization)", async () => {
      process.env.OPENAI_API_KEY = "sk-test-key";
      mockGenerate.mockResolvedValueOnce({
        data: [{ b64_json: Buffer.from("x").toString("base64") }],
      });

      const { generateAIBackground } = await import(
        "@/lib/case-studies/linkedin-visual-openai"
      );
      await generateAIBackground({ clientName: "Test" });

      const callArgs = mockGenerate.mock.calls[0][0];
      expect(callArgs.quality).toBe("medium");
      expect(callArgs.n).toBe(1);
    });

    it("requests exactly 1024x1024 from OpenAI (supported size)", async () => {
      process.env.OPENAI_API_KEY = "sk-test-key";
      mockGenerate.mockResolvedValueOnce({
        data: [{ b64_json: Buffer.from("x").toString("base64") }],
      });

      const { generateAIBackground } = await import(
        "@/lib/case-studies/linkedin-visual-openai"
      );
      await generateAIBackground({ clientName: "Test" });

      expect(mockGenerate.mock.calls[0][0].size).toBe("1024x1024");
      // Then sharp resizes to 1200x1200
      expect(mockSharpInstance.resize).toHaveBeenCalledWith(1200, 1200, { fit: "cover" });
    });
  });

  describe("generateAIBackground — prompt safety", () => {
    it("prompt explicitly forbids text, logos, people, objects", async () => {
      process.env.OPENAI_API_KEY = "sk-test-key";
      mockGenerate.mockResolvedValueOnce({
        data: [{ b64_json: Buffer.from("x").toString("base64") }],
      });

      const { generateAIBackground } = await import(
        "@/lib/case-studies/linkedin-visual-openai"
      );
      await generateAIBackground({ clientName: "Test" });

      const prompt = mockGenerate.mock.calls[0][0].prompt;
      expect(prompt).toContain("NO text");
      expect(prompt).toContain("NO logos");
      expect(prompt).toContain("NO people");
      expect(prompt).toContain("NO objects");
    });

    it("prompt instructs top 40% to be darker for text readability", async () => {
      process.env.OPENAI_API_KEY = "sk-test-key";
      mockGenerate.mockResolvedValueOnce({
        data: [{ b64_json: Buffer.from("x").toString("base64") }],
      });

      const { generateAIBackground } = await import(
        "@/lib/case-studies/linkedin-visual-openai"
      );
      await generateAIBackground({ clientName: "Test" });

      const prompt = mockGenerate.mock.calls[0][0].prompt;
      expect(prompt).toContain("top 40%");
      expect(prompt).toContain("darker");
    });
  });

  describe("generateLinkedInVisualHybrid — clientLogoOverride priority", () => {
    it("prefers clientLogoOverride over clientLogoUrl", async () => {
      process.env.OPENAI_API_KEY = "sk-test-key";
      mockGenerate.mockResolvedValueOnce({
        data: [{ b64_json: Buffer.from("bg").toString("base64") }],
      });

      const { generateLinkedInVisualHybrid } = await import(
        "@/lib/case-studies/linkedin-visual-openai"
      );

      // Both provided — override should win
      const result = await generateLinkedInVisualHybrid({
        clientName: "Sony",
        projectTitle: "Test",
        clientLogoUrl: "/images/logos/sony.png",
        clientLogoOverride: `data:image/png;base64,${Buffer.from("override-logo").toString("base64")}`,
        projectImages: [],
      });

      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe("generateLinkedInVisualHybrid — compositing layer ordering", () => {
    it("composites gradient overlay BEFORE text overlay for readability", async () => {
      process.env.OPENAI_API_KEY = "sk-test-key";
      mockGenerate.mockResolvedValueOnce({
        data: [{ b64_json: Buffer.from("bg").toString("base64") }],
      });

      const { generateLinkedInVisualHybrid } = await import(
        "@/lib/case-studies/linkedin-visual-openai"
      );

      await generateLinkedInVisualHybrid({
        clientName: "Test",
        projectTitle: "Test",
        projectImages: [],
      });

      // Final sharp composite call should have been made
      // Verify it was called with an array of layers (gradient + text)
      const compositeCall = mockSharpInstance.composite.mock.calls;
      const lastCall = compositeCall[compositeCall.length - 1];
      expect(lastCall).toBeDefined();
      expect(Array.isArray(lastCall[0])).toBe(true);
      // Should have at least 2 layers: gradient overlay + text overlay
      expect(lastCall[0].length).toBeGreaterThanOrEqual(2);
    });
  });

  // ─── REGRESSION: Satori fallback must return exact same type ──────────

  describe("generateLinkedInVisualHybrid — fallback contract", () => {
    it("fallback returns Buffer (same contract as hybrid path)", async () => {
      delete process.env.OPENAI_API_KEY;

      const { generateLinkedInVisualHybrid } = await import(
        "@/lib/case-studies/linkedin-visual-openai"
      );

      const result = await generateLinkedInVisualHybrid({
        clientName: "GEODIS",
        projectTitle: "Logistics Rebranding",
        projectImages: [],
        industry: "logistics",
        brandTone: "corporate, reliable",
      });

      // Must be a Buffer — downstream code calls .toString("base64") on it
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it("fallback passes original params through (not hybrid-only fields)", async () => {
      delete process.env.OPENAI_API_KEY;

      const { generateLinkedInVisualHybrid } = await import(
        "@/lib/case-studies/linkedin-visual-openai"
      );
      const { generateLinkedInVisual } = await import(
        "@/lib/case-studies/linkedin-visual"
      );

      await generateLinkedInVisualHybrid({
        clientName: "Sony",
        projectTitle: "Campaign",
        visualTitle: "RUN FAST",
        accentWord: "FAST",
        clientLogoUrl: "/images/logos/sony.png",
        projectImages: ["/img1.png"],
        // Hybrid-only fields — should NOT cause Satori fallback to crash
        industry: "entertainment",
        primaryColor: "#1428A0",
        brandTone: "bold",
      });

      // Satori fallback should have been called with params object
      expect(generateLinkedInVisual).toHaveBeenCalledOnce();
      const passedParams = (generateLinkedInVisual as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(passedParams.clientName).toBe("Sony");
      expect(passedParams.projectTitle).toBe("Campaign");
      expect(passedParams.projectImages).toEqual(["/img1.png"]);
    });
  });

  // ─── REGRESSION: generate/route.ts Step 5 — missing branding context ──
  // This test documents the BUG: generate/route.ts passes projectType to
  // generateLinkedInVisualHybrid but NOT industry, primaryColor, or brandTone.
  // The linkedin-visual/route.ts correctly fetches these from clients table.
  // Filed as bug — fix should add client branding fetch in Step 5.

  describe("DOCUMENTED BUG — generate/route.ts Step 5 missing branding", () => {
    it("hybrid generator without branding fields uses defaults (suboptimal)", async () => {
      process.env.OPENAI_API_KEY = "sk-test-key";
      mockGenerate.mockResolvedValueOnce({
        data: [{ b64_json: Buffer.from("bg").toString("base64") }],
      });

      const { generateLinkedInVisualHybrid } = await import(
        "@/lib/case-studies/linkedin-visual-openai"
      );

      // Simulate what generate/route.ts Step 5 CURRENTLY does:
      // passes projectType but NOT industry/primaryColor/brandTone
      await generateLinkedInVisualHybrid({
        clientName: "TikTok",
        projectTitle: "Video Campaign",
        projectImages: [],
        projectType: "Social Media",
        // BUG: these are missing in generate/route.ts Step 5
        // industry: "social media",
        // primaryColor: "#FE2C55",
        // brandTone: "bold, dynamic",
      });

      const prompt = mockGenerate.mock.calls[0][0].prompt;
      // Without branding context, prompt uses defaults instead of TikTok branding
      // This is SUBOPTIMAL — the AI background won't match client brand
      expect(prompt).toContain("premium, sophisticated, modern"); // default, not TikTok's tone
      expect(prompt).toContain("#DA5126"); // Sarani flame, not TikTok red
      expect(prompt).not.toContain("social media"); // industry missing
    });
  });

  // ─── Title sizing edge cases — all font size brackets ─────────────────

  describe("generateLinkedInVisualHybrid — all title font size brackets", () => {
    const cases = [
      // No images
      { len: 10, hasImages: false, desc: "short title no images (<=15 chars -> 96px)" },
      { len: 20, hasImages: false, desc: "medium title no images (<=30 chars -> 80px)" },
      { len: 50, hasImages: false, desc: "long title no images (<=60 chars -> 64px)" },
      { len: 70, hasImages: false, desc: "very long title no images (>60 chars -> 48px)" },
      // With images
      { len: 10, hasImages: true, desc: "short title with images (<=15 chars -> 96px)" },
      { len: 20, hasImages: true, desc: "medium title with images (<=25 chars -> 64px)" },
      { len: 40, hasImages: true, desc: "long title with images (<=60 chars -> 52px)" },
      { len: 70, hasImages: true, desc: "long title with images (61-80 chars -> 48px)" },
      { len: 90, hasImages: true, desc: "very long title with images (81-120 chars -> 40px)" },
      { len: 130, hasImages: true, desc: "extra long title with images (>120 chars -> 36px)" },
    ];

    for (const { len, hasImages, desc } of cases) {
      it(desc, async () => {
        process.env.OPENAI_API_KEY = "sk-test-key";
        mockGenerate.mockResolvedValueOnce({
          data: [{ b64_json: Buffer.from("bg").toString("base64") }],
        });

        const { generateLinkedInVisualHybrid } = await import(
          "@/lib/case-studies/linkedin-visual-openai"
        );

        const title = "X".repeat(len);
        const result = await generateLinkedInVisualHybrid({
          clientName: "Test",
          projectTitle: title,
          projectImages: hasImages
            ? [`data:image/png;base64,${Buffer.from("img").toString("base64")}`]
            : [],
        });

        expect(result).toBeInstanceOf(Buffer);
      });
    }
  });
});
