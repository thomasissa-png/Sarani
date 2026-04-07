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
});
