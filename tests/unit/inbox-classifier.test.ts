/**
 * Unit tests for email classification helpers — classifier.ts
 * WHY: Classification drives the entire inbox routing. A misclassified email
 * sends a new project brief to the "other" tab where it rots unseen.
 * Wrong priority = client waits 48h for a reply on a 24h deadline.
 */

import { describe, it, expect } from "vitest";
import {
  isNoiseByEmail,
  priorityFromCategory,
  protocolFromCategory,
  ClassificationResultSchema,
  NOISE_SENDERS,
  type EmailCategory,
} from "@/lib/ai/prompts/classifier";

/* ---------- isNoiseByEmail ---------- */

describe("isNoiseByEmail — filters automated/noise senders", () => {
  it("detects noreply@ as noise", () => {
    expect(isNoiseByEmail("noreply@spotify.com")).toBe(true);
  });

  it("detects no-reply@ as noise", () => {
    expect(isNoiseByEmail("no-reply@slack.com")).toBe(true);
  });

  it("detects newsletter@ as noise", () => {
    expect(isNoiseByEmail("newsletter@medium.com")).toBe(true);
  });

  it("detects notification@ as noise", () => {
    expect(isNoiseByEmail("notification@github.com")).toBe(true);
  });

  it("detects mailer-daemon@ as noise", () => {
    expect(isNoiseByEmail("MAILER-DAEMON@google.com")).toBe(true);
  });

  it("detects do-not-reply@ as noise", () => {
    expect(isNoiseByEmail("do-not-reply@adobe.com")).toBe(true);
  });

  it("detects donotreply@ as noise", () => {
    expect(isNoiseByEmail("donotreply@microsoft.com")).toBe(true);
  });

  it("does NOT flag normal client emails", () => {
    expect(isNoiseByEmail("marc@sony.com")).toBe(false);
  });

  it("does NOT flag personal emails", () => {
    expect(isNoiseByEmail("sophie.martin@tiktok.com")).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(isNoiseByEmail("NOREPLY@COMPANY.COM")).toBe(true);
  });

  it("detects pattern anywhere in the address", () => {
    expect(isNoiseByEmail("team-noreply@figma.com")).toBe(true);
  });

  it("covers all patterns in NOISE_SENDERS", () => {
    for (const pattern of NOISE_SENDERS) {
      expect(isNoiseByEmail(`${pattern}@example.com`)).toBe(true);
    }
  });
});

/* ---------- priorityFromCategory ---------- */

describe("priorityFromCategory — maps category to triage priority", () => {
  const cases: Array<[EmailCategory, "high" | "medium" | "low"]> = [
    ["new_project", "high"],
    ["project_feedback", "high"],
    ["enquiry", "medium"],
    ["other", "low"],
  ];

  for (const [category, expected] of cases) {
    it(`"${category}" → "${expected}"`, () => {
      expect(priorityFromCategory(category)).toBe(expected);
    });
  }
});

/* ---------- protocolFromCategory ---------- */

describe("protocolFromCategory — maps category to routing protocol", () => {
  it('"new_project" → "PROTO-EMAIL-INTAKE"', () => {
    expect(protocolFromCategory("new_project")).toBe("PROTO-EMAIL-INTAKE");
  });

  it('"project_feedback" → "PROTO-CLIENT-RETURN"', () => {
    expect(protocolFromCategory("project_feedback")).toBe("PROTO-CLIENT-RETURN");
  });

  it('"enquiry" → "PROTO-ENQUIRY"', () => {
    expect(protocolFromCategory("enquiry")).toBe("PROTO-ENQUIRY");
  });

  it('"other" → null (no protocol, archivable)', () => {
    expect(protocolFromCategory("other")).toBeNull();
  });
});

/* ---------- ClassificationResultSchema — Zod validation ---------- */

function validClassification() {
  return {
    category: "new_project" as const,
    confidence: 0.92,
    reasoning: "Email contains a clear brief with deliverables and deadline.",
    suggestedAction: "Create auto-brief and assign to ops team.",
    draftReply: "Hi Sophie — Got it, we're reviewing your brief now. Back to you shortly.\n\n[PM_NAME]",
    clickupProjectHint: "Sony Music France",
    language: "en",
    routeTo: "PROTO-EMAIL-INTAKE" as const,
  };
}

describe("ClassificationResultSchema — valid payloads", () => {
  it("accepts a complete valid classification", () => {
    const result = ClassificationResultSchema.safeParse(validClassification());
    expect(result.success).toBe(true);
  });

  it("accepts clickupProjectHint as null", () => {
    const data = { ...validClassification(), clickupProjectHint: null };
    const result = ClassificationResultSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("accepts confidence at boundary 0", () => {
    const data = { ...validClassification(), confidence: 0 };
    const result = ClassificationResultSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("accepts confidence at boundary 1", () => {
    const data = { ...validClassification(), confidence: 1 };
    const result = ClassificationResultSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("accepts all valid categories", () => {
    const categories = ["enquiry", "new_project", "project_feedback", "other"] as const;
    for (const category of categories) {
      const data = { ...validClassification(), category };
      expect(ClassificationResultSchema.safeParse(data).success).toBe(true);
    }
  });

  it("accepts all valid routeTo values", () => {
    const routes = ["PROTO-ENQUIRY", "PROTO-EMAIL-INTAKE", "PROTO-CLIENT-RETURN", "archive"] as const;
    for (const routeTo of routes) {
      const data = { ...validClassification(), routeTo };
      expect(ClassificationResultSchema.safeParse(data).success).toBe(true);
    }
  });

  it("accepts 2-char language code", () => {
    const data = { ...validClassification(), language: "fr" };
    expect(ClassificationResultSchema.safeParse(data).success).toBe(true);
  });

  it("accepts 5-char language code (e.g. zh-CN)", () => {
    const data = { ...validClassification(), language: "zh-CN" };
    expect(ClassificationResultSchema.safeParse(data).success).toBe(true);
  });
});

describe("ClassificationResultSchema — invalid payloads", () => {
  it("rejects unknown category", () => {
    const data = { ...validClassification(), category: "spam" };
    expect(ClassificationResultSchema.safeParse(data).success).toBe(false);
  });

  it("rejects confidence > 1", () => {
    const data = { ...validClassification(), confidence: 1.5 };
    expect(ClassificationResultSchema.safeParse(data).success).toBe(false);
  });

  it("rejects confidence < 0", () => {
    const data = { ...validClassification(), confidence: -0.1 };
    expect(ClassificationResultSchema.safeParse(data).success).toBe(false);
  });

  it("rejects unknown routeTo", () => {
    const data = { ...validClassification(), routeTo: "PROTO-UNKNOWN" };
    expect(ClassificationResultSchema.safeParse(data).success).toBe(false);
  });

  it("rejects missing reasoning", () => {
    const { reasoning, ...data } = validClassification();
    expect(ClassificationResultSchema.safeParse(data).success).toBe(false);
  });

  it("rejects missing draftReply", () => {
    const { draftReply, ...data } = validClassification();
    expect(ClassificationResultSchema.safeParse(data).success).toBe(false);
  });

  it("rejects 1-char language code (too short)", () => {
    const data = { ...validClassification(), language: "e" };
    expect(ClassificationResultSchema.safeParse(data).success).toBe(false);
  });

  it("rejects 6-char language code (too long)", () => {
    const data = { ...validClassification(), language: "en-USA" };
    expect(ClassificationResultSchema.safeParse(data).success).toBe(false);
  });

  it("rejects confidence as string", () => {
    const data = { ...validClassification(), confidence: "high" };
    expect(ClassificationResultSchema.safeParse(data).success).toBe(false);
  });

  it("rejects entirely empty object", () => {
    expect(ClassificationResultSchema.safeParse({}).success).toBe(false);
  });
});
