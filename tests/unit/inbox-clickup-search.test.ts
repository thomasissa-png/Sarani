/**
 * Unit tests for ClickUp matchScore — clickup.ts
 * WHY: matchScore drives task linking. If it returns a false positive (score >= 0.6
 * on unrelated tasks), client feedback gets posted on the wrong ClickUp task.
 * If it misses a real match (score < 0.6 on related tasks), the PM has to
 * manually search and link — defeating the automation purpose.
 */

import { describe, it, expect } from "vitest";
import { matchScore } from "@/lib/integrations/clickup";

/* ---------- Exact / high-overlap matches (should be >= 0.6) ---------- */

describe("matchScore — high-overlap matches (>= 0.6)", () => {
  it("matches query contained in task name with prefix", () => {
    const score = matchScore(
      "MEDIA / Créa pour parution PHOX",
      "SFR - MEDIA / Créa pour parution PHOX"
    );
    expect(score).toBeGreaterThanOrEqual(0.6);
  });

  it("matches Black Friday banners across naming variations", () => {
    const score = matchScore(
      "Sony Black Friday banners",
      "Sony - Black Friday Campaign Banners 2026"
    );
    expect(score).toBeGreaterThanOrEqual(0.6);
  });

  it("returns 1.0 for identical strings (beyond 2-char filter)", () => {
    const score = matchScore("short", "short");
    expect(score).toBe(1.0);
  });

  it("matches when all query words appear in task name", () => {
    const score = matchScore(
      "TikTok Social Media Posts",
      "TikTok - Social Media Posts Q4 2026"
    );
    expect(score).toBeGreaterThanOrEqual(0.6);
  });

  it("matches with different separators (dash vs slash)", () => {
    const score = matchScore(
      "Adidas Running Campaign",
      "Adidas / Running Campaign / Spring 2026"
    );
    expect(score).toBeGreaterThanOrEqual(0.6);
  });
});

/* ---------- Low / no overlap (should be < 0.6) ---------- */

describe("matchScore — low overlap (< 0.6)", () => {
  it("rejects completely unrelated strings", () => {
    const score = matchScore(
      "totally different query",
      "SFR - MEDIA / Créa"
    );
    expect(score).toBeLessThan(0.6);
  });

  it("rejects single shared word among many unrelated", () => {
    const score = matchScore(
      "Apple iPhone Launch Event Marketing",
      "Sony Music France Playlist Covers"
    );
    expect(score).toBeLessThan(0.6);
  });
});

/* ---------- Edge cases ---------- */

describe("matchScore — edge cases", () => {
  it("returns 0 for empty query", () => {
    expect(matchScore("", "anything at all")).toBe(0);
  });

  it("returns 0 for query with only short words (<= 2 chars)", () => {
    // Words <= 2 chars are filtered out by the implementation
    expect(matchScore("a b c", "a b c d e")).toBe(0);
  });

  it("is case-insensitive", () => {
    const score = matchScore("SONY BLACK FRIDAY", "sony black friday banners");
    expect(score).toBeGreaterThanOrEqual(0.6);
  });

  it("handles accented characters", () => {
    const score = matchScore("Créa pour parution", "Créa pour parution PHOX");
    expect(score).toBeGreaterThanOrEqual(0.6);
  });

  it("handles partial word matching (qw includes nw)", () => {
    // "banners" includes "banner" and vice versa via the includes check
    const score = matchScore("campaign banners", "campaign banner design");
    expect(score).toBeGreaterThanOrEqual(0.6);
  });

  it("handles comma-separated words in task names", () => {
    const score = matchScore("Sony banners", "Sony, banners, social media");
    expect(score).toBeGreaterThanOrEqual(0.6);
  });
});
