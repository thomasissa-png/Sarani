/**
 * Unit tests for feedback extraction schema and message builder — feedback-extractor.ts
 * WHY: Feedback extraction drives ClickUp comment creation. A broken schema
 * means client revisions silently disappear — the ops team works on outdated files.
 */

import { describe, it, expect } from "vitest";
import {
  FeedbackExtractionResultSchema,
  buildFeedbackExtractionUserMessage,
} from "@/lib/ai/prompts/feedback-extractor";

/* ---------- FeedbackExtractionResultSchema — valid payloads ---------- */

describe("FeedbackExtractionResultSchema — valid payloads", () => {
  it("accepts a valid feedback comment", () => {
    const result = FeedbackExtractionResultSchema.safeParse({
      feedbackComment: "FEEDBACK CLIENT — Black Friday Campaign (Sony)\n\n1. Slide 3 — Replace logo with updated version\n   - Download from SharePoint > Sony > Logos\n\nFILES AFFECTED:\n- BF_Banner_1200x628_v2.psd\n\nDO NOT MODIFY:\n- Slide 1 (approved)",
    });
    expect(result.success).toBe(true);
  });

  it("accepts minimal feedback comment (single line)", () => {
    const result = FeedbackExtractionResultSchema.safeParse({
      feedbackComment: "Client approved all deliverables. No changes needed.",
    });
    expect(result.success).toBe(true);
  });

  it("accepts feedback with unicode content", () => {
    const result = FeedbackExtractionResultSchema.safeParse({
      feedbackComment: "⚠️ ARYA NOTES:\nClient demande des modifications urgentes sur les créas été 🏖️",
    });
    expect(result.success).toBe(true);
  });
});

/* ---------- FeedbackExtractionResultSchema — invalid payloads ---------- */

describe("FeedbackExtractionResultSchema — invalid payloads", () => {
  it("rejects missing feedbackComment", () => {
    expect(FeedbackExtractionResultSchema.safeParse({}).success).toBe(false);
  });

  it("rejects feedbackComment as number", () => {
    expect(FeedbackExtractionResultSchema.safeParse({ feedbackComment: 42 }).success).toBe(false);
  });

  it("rejects feedbackComment as null", () => {
    expect(FeedbackExtractionResultSchema.safeParse({ feedbackComment: null }).success).toBe(false);
  });

  it("rejects extra unknown root-level structure (strict mode check)", () => {
    // Zod .object() by default strips unknown keys — this verifies the schema
    // still parses successfully (it strips, not rejects). Documenting behavior.
    const result = FeedbackExtractionResultSchema.safeParse({
      feedbackComment: "Valid",
      unknownField: "should be stripped",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("unknownField");
    }
  });
});

/* ---------- buildFeedbackExtractionUserMessage ---------- */

describe("buildFeedbackExtractionUserMessage — formats email for LLM", () => {
  it("includes EMAIL SUBJECT header", () => {
    const msg = buildFeedbackExtractionUserMessage({
      emailSubject: "RE: Black Friday Banners — v2 feedback",
      emailBody: "Please adjust slide 3.",
      senderEmail: "marc@sony.com",
      clientName: "Sony Music France",
    });
    expect(msg).toContain("EMAIL SUBJECT: RE: Black Friday Banners — v2 feedback");
  });

  it("includes FROM header", () => {
    const msg = buildFeedbackExtractionUserMessage({
      emailSubject: "Test",
      emailBody: "Body",
      senderEmail: "sophie@tiktok.com",
      clientName: "TikTok",
    });
    expect(msg).toContain("FROM: sophie@tiktok.com");
  });

  it("includes CLIENT header (not present in brief extractor)", () => {
    const msg = buildFeedbackExtractionUserMessage({
      emailSubject: "Test",
      emailBody: "Body",
      senderEmail: "a@b.com",
      clientName: "Adidas EMEA",
    });
    expect(msg).toContain("CLIENT: Adidas EMEA");
  });

  it("includes EMAIL BODY section", () => {
    const body = "The colors on slide 5 are wrong — should be #FF0000.";
    const msg = buildFeedbackExtractionUserMessage({
      emailSubject: "Feedback",
      emailBody: body,
      senderEmail: "a@b.com",
      clientName: "Client",
    });
    expect(msg).toContain("EMAIL BODY:");
    expect(msg).toContain(body);
  });

  it("produces 4 sections in correct order", () => {
    const msg = buildFeedbackExtractionUserMessage({
      emailSubject: "Sub",
      emailBody: "Body",
      senderEmail: "a@b.com",
      clientName: "Client",
    });
    const subjectIdx = msg.indexOf("EMAIL SUBJECT:");
    const fromIdx = msg.indexOf("FROM:");
    const clientIdx = msg.indexOf("CLIENT:");
    const bodyIdx = msg.indexOf("EMAIL BODY:");
    expect(subjectIdx).toBeLessThan(fromIdx);
    expect(fromIdx).toBeLessThan(clientIdx);
    expect(clientIdx).toBeLessThan(bodyIdx);
  });

  it("preserves accented characters in client name", () => {
    const msg = buildFeedbackExtractionUserMessage({
      emailSubject: "Retour",
      emailBody: "Merci",
      senderEmail: "a@b.com",
      clientName: "Société Générale",
    });
    expect(msg).toContain("CLIENT: Société Générale");
  });
});
