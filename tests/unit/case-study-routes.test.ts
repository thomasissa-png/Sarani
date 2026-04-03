// @vitest-environment node
/**
 * P0 — Case study public route + draft quotes route tests
 * WHY: Public route is the trust signal for Sophie (CMO persona). If it leaks
 * unpublished data or serves wrong content → credibility loss with enterprise prospects.
 * Draft quotes route is the revenue pipeline. Broken validation → corrupt quotes in DB.
 *
 * Test type: STATIC (code review + unit tests). No live DB, no live server.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

// ═══════════════════════════════════════════════════════════════════════════
// PART 1: Public case study slug validation
// Tests the slug regex used in /api/case-studies/[slug]/route.ts
// ═══════════════════════════════════════════════════════════════════════════

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

describe("Public case study route — slug validation", () => {
  // Happy path — realistic Sarani slugs
  it.each([
    "tiktok-video-production",
    "sony-graphic-design",
    "geodis-presentation",
    "pernod-ricard-event",
    "loreal-multilingual",
    "air-corsica-out-of-home",
    "pico-rebranding",
    "adidas-campaign",
    "a",
    "a-b-c-d-e-f",
    "abc123",
    "tiktok-1500-videos",
  ])("accepts valid slug: %s", (slug) => {
    expect(SLUG_REGEX.test(slug)).toBe(true);
  });

  // Rejection — invalid slugs
  it.each([
    ["TikTok-Video", "uppercase"],
    ["-tiktok-video", "leading hyphen"],
    ["tiktok-video-", "trailing hyphen"],
    ["tiktok--video", "double hyphen"],
    ["tiktok video", "space"],
    ["tiktok_video", "underscore"],
    ["tiktok/video", "slash"],
    ["tiktok.video", "dot"],
    ["", "empty string"],
    ["tiktok-vidéo", "accent in slug"],
    ["<script>alert(1)</script>", "XSS payload"],
    ["../../../etc/passwd", "path traversal"],
    ["-", "single hyphen"],
  ])("rejects invalid slug: %s (%s)", (slug) => {
    expect(SLUG_REGEX.test(slug)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PART 2: Draft quotes — Zod validation schema
// Tests the saveDraftSchema used in /api/admin/quotes/draft/route.ts
// ═══════════════════════════════════════════════════════════════════════════

const lineItemSchema = z.object({
  description: z.string(),
  quantity: z.number().min(0),
  unitPrice: z.number().min(0),
  total: z.number().min(0),
});

const saveDraftSchema = z.object({
  draftId: z.string().uuid().optional(),
  clientName: z.string().min(1, "Client name is required"),
  contactName: z.string().optional().default(""),
  projectName: z.string().min(1, "Project name is required"),
  description: z.string().optional().default(""),
  scope: z.string().optional().default(""),
  items: z.array(lineItemSchema).default([]),
  currency: z.enum(["EUR", "USD", "GBP"]).default("EUR"),
  vatRate: z.number().min(0).max(100).nullable().default(null),
  validUntil: z.string().optional(),
  language: z.enum(["en", "fr"]).default("en"),
  paymentTermsDays: z.number().min(0).max(365).default(45),
});

describe("Draft quotes — saveDraftSchema validation", () => {
  // ─── Happy paths with real Sarani data ─────────────────────────────────

  it("accepts minimal valid draft (TikTok project)", () => {
    const result = saveDraftSchema.safeParse({
      clientName: "TikTok",
      projectName: "Social Video Campaign Q4 2025",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currency).toBe("EUR");
      expect(result.data.paymentTermsDays).toBe(45);
      expect(result.data.items).toEqual([]);
    }
  });

  it("accepts full draft with line items (GEODIS rebranding)", () => {
    const result = saveDraftSchema.safeParse({
      clientName: "GEODIS",
      contactName: "Marie Dupont",
      projectName: "Corporate Rebranding — 5700 slides",
      description: "Full rebranding of 5700 PowerPoint slides to new corporate identity",
      scope: "Slide redesign, template creation, brand guidelines compliance",
      items: [
        { description: "Slide redesign (per slide)", quantity: 5700, unitPrice: 1.49, total: 8493 },
        { description: "Template creation", quantity: 5, unitPrice: 150, total: 750 },
      ],
      currency: "EUR",
      vatRate: 20,
      validUntil: "2026-06-30",
      language: "fr",
      paymentTermsDays: 30,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items).toHaveLength(2);
      expect(result.data.language).toBe("fr");
    }
  });

  it("accepts USD currency (Sony — US market)", () => {
    const result = saveDraftSchema.safeParse({
      clientName: "Sony",
      projectName: "Black Friday Banners — US Market",
      currency: "USD",
    });
    expect(result.success).toBe(true);
  });

  it("accepts GBP currency (UK enterprise client)", () => {
    const result = saveDraftSchema.safeParse({
      clientName: "PICO UK",
      projectName: "Event Design — London Trade Show",
      currency: "GBP",
    });
    expect(result.success).toBe(true);
  });

  it("accepts draftId as valid UUID for update", () => {
    const result = saveDraftSchema.safeParse({
      draftId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      clientName: "Adidas",
      projectName: "Campaign Refresh Q1 2026",
    });
    expect(result.success).toBe(true);
  });

  // ─── Rejection paths ───────────────────────────────────────────────────

  it("rejects empty clientName", () => {
    const result = saveDraftSchema.safeParse({
      clientName: "",
      projectName: "Some Project",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issues = result.error.flatten().fieldErrors;
      expect(issues.clientName).toBeDefined();
    }
  });

  it("rejects missing clientName", () => {
    const result = saveDraftSchema.safeParse({
      projectName: "Some Project",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty projectName", () => {
    const result = saveDraftSchema.safeParse({
      clientName: "TikTok",
      projectName: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid currency (JPY not supported)", () => {
    const result = saveDraftSchema.safeParse({
      clientName: "TikTok",
      projectName: "JP Campaign",
      currency: "JPY",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid draftId (not UUID)", () => {
    const result = saveDraftSchema.safeParse({
      draftId: "not-a-uuid",
      clientName: "TikTok",
      projectName: "Campaign",
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative vatRate", () => {
    const result = saveDraftSchema.safeParse({
      clientName: "TikTok",
      projectName: "Campaign",
      vatRate: -5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects vatRate above 100", () => {
    const result = saveDraftSchema.safeParse({
      clientName: "TikTok",
      projectName: "Campaign",
      vatRate: 150,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative paymentTermsDays", () => {
    const result = saveDraftSchema.safeParse({
      clientName: "TikTok",
      projectName: "Campaign",
      paymentTermsDays: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects paymentTermsDays above 365", () => {
    const result = saveDraftSchema.safeParse({
      clientName: "TikTok",
      projectName: "Campaign",
      paymentTermsDays: 730,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid language (de not supported)", () => {
    const result = saveDraftSchema.safeParse({
      clientName: "TikTok",
      projectName: "Campaign",
      language: "de",
    });
    expect(result.success).toBe(false);
  });

  // ─── Line item validation ──────────────────────────────────────────────

  it("rejects line item with negative quantity", () => {
    const result = saveDraftSchema.safeParse({
      clientName: "GEODIS",
      projectName: "Rebranding",
      items: [
        { description: "Slide redesign", quantity: -10, unitPrice: 1.49, total: 0 },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects line item with negative unitPrice", () => {
    const result = saveDraftSchema.safeParse({
      clientName: "GEODIS",
      projectName: "Rebranding",
      items: [
        { description: "Slide redesign", quantity: 100, unitPrice: -5, total: 0 },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects line item with negative total", () => {
    const result = saveDraftSchema.safeParse({
      clientName: "GEODIS",
      projectName: "Rebranding",
      items: [
        { description: "Credit", quantity: 1, unitPrice: 100, total: -100 },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("accepts line item with zero quantity (placeholder row)", () => {
    const result = saveDraftSchema.safeParse({
      clientName: "TikTok",
      projectName: "Campaign",
      items: [
        { description: "To be defined", quantity: 0, unitPrice: 0, total: 0 },
      ],
    });
    expect(result.success).toBe(true);
  });

  // ─── Adversarial inputs ────────────────────────────────────────────────

  it("accepts client name with special characters (L'Oréal)", () => {
    const result = saveDraftSchema.safeParse({
      clientName: "L'Oréal Méditerranée",
      projectName: "Campagne été 2026",
    });
    expect(result.success).toBe(true);
  });

  it("accepts client name with ampersand (AT&T)", () => {
    const result = saveDraftSchema.safeParse({
      clientName: "AT&T",
      projectName: "Brand Refresh",
    });
    expect(result.success).toBe(true);
  });

  it("accepts very long description (10,000 chars)", () => {
    const result = saveDraftSchema.safeParse({
      clientName: "TikTok",
      projectName: "Campaign",
      description: "A".repeat(10000),
    });
    expect(result.success).toBe(true);
  });

  it("handles NaN amount in line item as rejection", () => {
    const result = saveDraftSchema.safeParse({
      clientName: "TikTok",
      projectName: "Campaign",
      items: [
        { description: "Item", quantity: NaN, unitPrice: 100, total: 0 },
      ],
    });
    // NaN fails min(0) check in Zod
    expect(result.success).toBe(false);
  });

  it("handles Infinity amount in line item as rejection", () => {
    const result = saveDraftSchema.safeParse({
      clientName: "TikTok",
      projectName: "Campaign",
      items: [
        { description: "Item", quantity: Infinity, unitPrice: 100, total: 0 },
      ],
    });
    // Infinity fails finite check in Zod number
    expect(result.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PART 3: Quote number generation logic
// Tests the SAR-YYYY-NNNN format
// ═══════════════════════════════════════════════════════════════════════════

describe("Quote number format", () => {
  const QUOTE_NUMBER_REGEX = /^SAR-\d{4}-\d{4}$/;

  it.each([
    "SAR-2026-0001",
    "SAR-2026-0042",
    "SAR-2026-9999",
    "SAR-2025-0001",
  ])("accepts valid quote number: %s", (num) => {
    expect(QUOTE_NUMBER_REGEX.test(num)).toBe(true);
  });

  it.each([
    ["SAR-2026-1", "too few digits"],
    ["SAR-2026-00001", "too many digits"],
    ["SAR-26-0001", "2-digit year"],
    ["SAR2026-0001", "missing first hyphen"],
    ["sar-2026-0001", "lowercase prefix"],
    ["SARANI-2026-0001", "wrong prefix"],
    ["", "empty"],
  ])("rejects invalid quote number: %s (%s)", (num) => {
    expect(QUOTE_NUMBER_REGEX.test(num)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PART 4: UUID validation (shared rate-limit module)
// ═══════════════════════════════════════════════════════════════════════════

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe("UUID validation (used in generate + visuals routes)", () => {
  it.each([
    "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "00000000-0000-0000-0000-000000000000",
    "FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF",
    "550e8400-e29b-41d4-a716-446655440000",
  ])("accepts valid UUID: %s", (uuid) => {
    expect(UUID_REGEX.test(uuid)).toBe(true);
  });

  it.each([
    ["not-a-uuid", "wrong format"],
    ["a1b2c3d4e5f67890abcdef1234567890", "no hyphens"],
    ["a1b2c3d4-e5f6-7890-abcd-ef123456789", "too short"],
    ["a1b2c3d4-e5f6-7890-abcd-ef12345678901", "too long"],
    ["g1b2c3d4-e5f6-7890-abcd-ef1234567890", "non-hex char g"],
    ["", "empty"],
    ["../../../etc/passwd", "path traversal"],
    ["a1b2c3d4-e5f6-7890-abcd-ef1234567890; DROP TABLE quotes;--", "SQL injection"],
  ])("rejects invalid UUID: %s (%s)", (uuid) => {
    expect(UUID_REGEX.test(uuid)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PART 5: Rate limiter unit tests
// ═══════════════════════════════════════════════════════════════════════════

// We test the rate limiter directly since it's a pure function
import { checkRateLimit } from "@/lib/rate-limit";

describe("checkRateLimit()", () => {
  // Use unique keys per test to avoid cross-test contamination
  it("allows first request", () => {
    expect(checkRateLimit("test-first", 5, 60_000)).toBe(true);
  });

  it("allows up to maxCalls requests", () => {
    const key = "test-max-" + Date.now();
    for (let i = 0; i < 10; i++) {
      expect(checkRateLimit(key, 10, 60_000)).toBe(true);
    }
  });

  it("blocks request exceeding maxCalls", () => {
    const key = "test-exceed-" + Date.now();
    for (let i = 0; i < 10; i++) {
      checkRateLimit(key, 10, 60_000);
    }
    expect(checkRateLimit(key, 10, 60_000)).toBe(false);
  });

  it("uses separate buckets for different keys", () => {
    const key1 = "test-bucket-a-" + Date.now();
    const key2 = "test-bucket-b-" + Date.now();
    // Fill up key1
    for (let i = 0; i < 3; i++) {
      checkRateLimit(key1, 3, 60_000);
    }
    expect(checkRateLimit(key1, 3, 60_000)).toBe(false);
    // key2 should still work
    expect(checkRateLimit(key2, 3, 60_000)).toBe(true);
  });

  it("resets after window expires", async () => {
    const key = "test-expire-" + Date.now();
    // Fill up with window of 50ms
    for (let i = 0; i < 2; i++) {
      checkRateLimit(key, 2, 50);
    }
    expect(checkRateLimit(key, 2, 50)).toBe(false);
    // Wait for window to expire
    await new Promise((r) => setTimeout(r, 60));
    expect(checkRateLimit(key, 2, 50)).toBe(true);
  });
});
