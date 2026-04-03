// @vitest-environment node
/**
 * Unit tests for SKIP_FOLDER_NAMES in the share link page.
 *
 * WHY: The share link page scans SharePoint folders to display project deliverables.
 * Certain folders (briefs, source files, archives) must be skipped so clients only
 * see final deliverables, not internal working files. If "source" is missing from
 * the skip list, clients see raw source files alongside finished assets — confusing
 * and unprofessional.
 *
 * REGRESSION: "source" added to SKIP_FOLDER_NAMES — fixed 2026-04-03
 *
 * The constants are defined inside a page.tsx server component,
 * so we extract and re-test the logic here to avoid importing the full page.
 *
 * NOTE: The actual page code uses `.toLowerCase().trim()` for skip matching
 * (not normalizeForMatch which is used for project folder name matching).
 */

import { describe, it, expect } from "vitest";

// ─── Extracted logic (mirrors page.tsx exactly) ─────────────────────────────

const SKIP_FOLDER_NAMES = new Set([
  "supporting files",
  "rework",
  "00. brief",
  "brief",
  "source files",
  "source",
  "sources",
  "assets source",
  "archive",
  "old",
  "template",
  "templates",
]);

/**
 * The actual skip check from page.tsx uses: SKIP_FOLDER_NAMES.has(item.name.toLowerCase().trim())
 */
function shouldSkipFolder(folderName: string): boolean {
  return SKIP_FOLDER_NAMES.has(folderName.toLowerCase().trim());
}

/* ========================================================================== */
/*  1. SKIP_FOLDER_NAMES contains expected entries                             */
/* ========================================================================== */

describe("SKIP_FOLDER_NAMES — required entries", () => {
  const requiredEntries = [
    "supporting files",
    "rework",
    "00. brief",
    "brief",
    "source files",
    "source",
    "sources",
    "assets source",
    "archive",
    "old",
    "template",
    "templates",
  ];

  for (const entry of requiredEntries) {
    it(`contains "${entry}"`, () => {
      expect(SKIP_FOLDER_NAMES.has(entry)).toBe(true);
    });
  }

  it("has exactly 12 entries", () => {
    expect(SKIP_FOLDER_NAMES.size).toBe(12);
  });
});

/* ========================================================================== */
/*  2. shouldSkipFolder — case-insensitive folder matching (toLowerCase+trim)  */
/* ========================================================================== */

describe("shouldSkipFolder — case-insensitive skip logic", () => {
  it('skips "Source" (capitalized)', () => {
    expect(shouldSkipFolder("Source")).toBe(true);
  });

  it('skips "SOURCE" (all caps)', () => {
    expect(shouldSkipFolder("SOURCE")).toBe(true);
  });

  it('skips "source" (lowercase)', () => {
    expect(shouldSkipFolder("source")).toBe(true);
  });

  it('skips "Source Files" (mixed case)', () => {
    expect(shouldSkipFolder("Source Files")).toBe(true);
  });

  it('skips "BRIEF" (uppercase)', () => {
    expect(shouldSkipFolder("BRIEF")).toBe(true);
  });

  it('skips "Archive" (capitalized)', () => {
    expect(shouldSkipFolder("Archive")).toBe(true);
  });

  it('skips "00. Brief" (with dot — lowercase preserves the dot)', () => {
    expect(shouldSkipFolder("00. Brief")).toBe(true);
  });

  it('does NOT skip "Deliverables"', () => {
    expect(shouldSkipFolder("Deliverables")).toBe(false);
  });

  it('does NOT skip "Final Output"', () => {
    expect(shouldSkipFolder("Final Output")).toBe(false);
  });

  it('does NOT skip "Batch 01"', () => {
    expect(shouldSkipFolder("Batch 01")).toBe(false);
  });

  it('does NOT skip empty string', () => {
    expect(shouldSkipFolder("")).toBe(false);
  });

  // Real SharePoint folder names encountered in production
  it('skips "Sources" (plural, real SP folder)', () => {
    expect(shouldSkipFolder("Sources")).toBe(true);
  });

  it('skips "Assets Source" (real SP folder)', () => {
    expect(shouldSkipFolder("Assets Source")).toBe(true);
  });

  it('skips "Rework" (real SP folder)', () => {
    expect(shouldSkipFolder("Rework")).toBe(true);
  });

  it('skips "Templates" (real SP folder)', () => {
    expect(shouldSkipFolder("Templates")).toBe(true);
  });

  it('skips folder with trailing whitespace "  source  "', () => {
    expect(shouldSkipFolder("  source  ")).toBe(true);
  });

  it('skips "Old" (capitalized)', () => {
    expect(shouldSkipFolder("Old")).toBe(true);
  });

  it('skips "Supporting Files" (title case)', () => {
    expect(shouldSkipFolder("Supporting Files")).toBe(true);
  });
});
