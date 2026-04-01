/**
 * Unit tests for brief extraction schema and message builder — brief-extractor.ts
 * WHY: A malformed brief extraction breaks the auto-brief pipeline. If project_type
 * is wrong, the ops team gets assigned to the wrong designer/editor.
 * If the user message format changes silently, Haiku hallucinates fields.
 */

import { describe, it, expect } from "vitest";
import {
  BriefExtractionResultSchema,
  buildBriefExtractionUserMessage,
} from "@/lib/ai/prompts/brief-extractor";

/* ---------- Valid data factory ---------- */

function validBriefExtraction() {
  return {
    client_name: "Sony Music France",
    entity: "Sony Music Entertainment France",
    project_title: "Black Friday Campaign Banners 2026",
    contact_email: "marc.dupont@sonymusic.com",
    project_type: "design" as const,
    brief_introduction: "Sony needs 50 promotional banners for their Black Friday campaign across 3 markets.",
    brief_body: "🌟 Introduction / Goal:\nSony Music France — Black Friday 2026 — promotional banners for streaming platforms.\n\n✈️ Brief:\nDesign 50 banners in 3 sizes for Spotify, Apple Music, and Deezer placements.",
    deadline: "November 20, 2026 — 6pm CET",
    dimensions: "1200x628, 1080x1080, 1920x1080",
    quantity: "50 banners × 3 sizes × 2 languages = 300 files",
    output_languages: "EN, FR",
    reference_links: "https://sharepoint.sony.com/branding/bf2026",
  };
}

/* ---------- BriefExtractionResultSchema — valid payloads ---------- */

describe("BriefExtractionResultSchema — valid payloads", () => {
  it("accepts a complete valid extraction", () => {
    const result = BriefExtractionResultSchema.safeParse(validBriefExtraction());
    expect(result.success).toBe(true);
  });

  const projectTypes = ["design", "video", "translation", "social", "other", "generic"] as const;
  for (const projectType of projectTypes) {
    it(`accepts project_type "${projectType}"`, () => {
      const data = { ...validBriefExtraction(), project_type: projectType };
      expect(BriefExtractionResultSchema.safeParse(data).success).toBe(true);
    });
  }

  it("accepts TBC values for optional fields", () => {
    const data = {
      ...validBriefExtraction(),
      deadline: "To be confirmed",
      dimensions: "To be confirmed",
      quantity: "To be confirmed",
      output_languages: "To be confirmed",
      reference_links: "None provided",
    };
    expect(BriefExtractionResultSchema.safeParse(data).success).toBe(true);
  });
});

/* ---------- BriefExtractionResultSchema — invalid payloads ---------- */

describe("BriefExtractionResultSchema — invalid payloads", () => {
  it("rejects unknown project_type", () => {
    const data = { ...validBriefExtraction(), project_type: "consulting" };
    expect(BriefExtractionResultSchema.safeParse(data).success).toBe(false);
  });

  it("rejects missing client_name", () => {
    const { client_name, ...data } = validBriefExtraction();
    expect(BriefExtractionResultSchema.safeParse(data).success).toBe(false);
  });

  it("rejects missing brief_body", () => {
    const { brief_body, ...data } = validBriefExtraction();
    expect(BriefExtractionResultSchema.safeParse(data).success).toBe(false);
  });

  it("rejects missing contact_email", () => {
    const { contact_email, ...data } = validBriefExtraction();
    expect(BriefExtractionResultSchema.safeParse(data).success).toBe(false);
  });

  it("rejects entirely empty object", () => {
    expect(BriefExtractionResultSchema.safeParse({}).success).toBe(false);
  });

  it("rejects null project_type", () => {
    const data = { ...validBriefExtraction(), project_type: null };
    expect(BriefExtractionResultSchema.safeParse(data).success).toBe(false);
  });

  it("rejects numeric fields where strings expected", () => {
    const data = { ...validBriefExtraction(), quantity: 300 };
    expect(BriefExtractionResultSchema.safeParse(data).success).toBe(false);
  });
});

/* ---------- buildBriefExtractionUserMessage ---------- */

describe("buildBriefExtractionUserMessage — formats email for LLM", () => {
  it("includes EMAIL SUBJECT header", () => {
    const msg = buildBriefExtractionUserMessage({
      emailSubject: "Black Friday Banners",
      emailBody: "Please design 50 banners.",
      senderEmail: "marc@sony.com",
    });
    expect(msg).toContain("EMAIL SUBJECT: Black Friday Banners");
  });

  it("includes FROM header with sender email", () => {
    const msg = buildBriefExtractionUserMessage({
      emailSubject: "Test",
      emailBody: "Body",
      senderEmail: "sophie@tiktok.com",
    });
    expect(msg).toContain("FROM: sophie@tiktok.com");
  });

  it("includes EMAIL BODY section with full body text", () => {
    const body = "We need 50 banners in 3 languages for the campaign launch.";
    const msg = buildBriefExtractionUserMessage({
      emailSubject: "Test",
      emailBody: body,
      senderEmail: "test@test.com",
    });
    expect(msg).toContain("EMAIL BODY:");
    expect(msg).toContain(body);
  });

  it("preserves special characters in body (accents, emojis)", () => {
    const body = "Bonjour, nous avons besoin de créas pour la campagne été 🏖️";
    const msg = buildBriefExtractionUserMessage({
      emailSubject: "Créas été",
      emailBody: body,
      senderEmail: "client@agence.fr",
    });
    expect(msg).toContain("créas");
    expect(msg).toContain("été");
  });

  it("produces exactly 3 sections in correct order", () => {
    const msg = buildBriefExtractionUserMessage({
      emailSubject: "Sub",
      emailBody: "Body",
      senderEmail: "a@b.com",
    });
    const subjectIdx = msg.indexOf("EMAIL SUBJECT:");
    const fromIdx = msg.indexOf("FROM:");
    const bodyIdx = msg.indexOf("EMAIL BODY:");
    expect(subjectIdx).toBeLessThan(fromIdx);
    expect(fromIdx).toBeLessThan(bodyIdx);
  });
});
