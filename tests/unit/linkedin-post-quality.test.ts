// @vitest-environment node
/**
 * LinkedIn post quality tests — verifies prompt structure, gates, and data flow.
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const PROMPT_PATH = path.resolve(__dirname, "../../src/lib/case-studies/pipeline-prompts.ts");
const ROUTE_PATH = path.resolve(__dirname, "../../src/app/api/admin/case-studies/candidates/[id]/generate/route.ts");
const prompt = fs.readFileSync(PROMPT_PATH, "utf-8");
const route = fs.readFileSync(ROUTE_PATH, "utf-8");

// ─── Prompt contains Thomas's real examples ─────────────────────────────────

describe("LinkedIn prompt — real examples present", () => {
  it("contains Aristocrat post", () => {
    expect(prompt).toContain("One show. One presence.");
    expect(prompt).toContain("Big space. One collective brand.");
  });

  it("contains Times Square post", () => {
    expect(prompt).toContain("Times Square leaves no room for hesitation");
  });

  it("contains i-Run adidas post", () => {
    expect(prompt).toContain("Built to perform. Designed to stand out.");
    expect(prompt).toContain("This was fun!");
  });

  it("contains TikTok Mel Robbins post", () => {
    expect(prompt).toContain("Mel Robbins");
    expect(prompt).toContain("done!");
  });

  it("contains Air Corsica post", () => {
    expect(prompt).toContain("New routes. New cities. Same standard.");
  });

  it("explains WHAT MAKES each post work", () => {
    expect(prompt).toMatch(/WHAT MAKES IT WORK/);
  });
});

// ─── Prompt bans bad patterns ───────────────────────────────────────────────

describe("LinkedIn prompt — banned patterns", () => {
  it("bans bullet points", () => {
    expect(prompt).toMatch(/bullet point/i);
  });

  it("bans agency comparisons", () => {
    expect(prompt).toMatch(/competitive comparison|compar/i);
  });

  it("bans pipe format", () => {
    expect(prompt).toMatch(/pipe format/i);
  });

  it("bans 'brought to life' and 'speaks for itself'", () => {
    expect(prompt).toContain("brought to life");
    expect(prompt).toContain("speaks for itself");
  });

  it("bans hashtags and emojis", () => {
    expect(prompt).toMatch(/hashtag/i);
    expect(prompt).toMatch(/emoji/i);
  });

  it("bans price mentions", () => {
    expect(prompt).toMatch(/price|speed claim/i);
  });

  it("bans LinkedIn bro openings", () => {
    expect(prompt).toMatch(/Thrilled|Proud|Excited/);
  });

  it("bans vague metaphors", () => {
    expect(prompt).toMatch(/vague metaphor/i);
  });

  it("bans craft philosophy", () => {
    expect(prompt).toMatch(/craft philosophy|philosophy/i);
  });
});

// ─── Prompt teaches hook quality ────────────────────────────────────────────

describe("LinkedIn prompt — hook guidance", () => {
  it("has hook patterns section", () => {
    expect(prompt).toMatch(/HOOK PATTERNS/i);
  });

  it("shows contrast, place, rhythm patterns", () => {
    expect(prompt).toMatch(/Contrast/i);
    expect(prompt).toMatch(/place speaks|place IS/i);
    expect(prompt).toMatch(/Rhythm/i);
  });

  it("no pipe format examples in hooks", () => {
    const hookSection = prompt.split("HOOK PATTERNS")[1]?.split("═══")[0] ?? "";
    expect(hookSection).not.toContain("|");
  });
});

// ─── Prompt has structure guidance ──────────────────────────────────────────

describe("LinkedIn prompt — structure", () => {
  it("defines HOOK, CONTEXT, CRAFT, WARMTH pattern", () => {
    expect(prompt).toMatch(/HOOK/);
    expect(prompt).toMatch(/CONTEXT/);
    expect(prompt).toMatch(/CRAFT/);
    expect(prompt).toMatch(/WARMTH/);
  });

  it("has closing styles section", () => {
    expect(prompt).toMatch(/CLOSING STYLES/i);
  });
});

// ─── Prompt handles sparse data ─────────────────────────────────────────────

describe("LinkedIn prompt — sparse data handling", () => {
  it("instructs to write short when data is thin", () => {
    expect(prompt).toMatch(/Post 4|one sentence|sparse/i);
  });

  it("warns against compensating with style", () => {
    expect(prompt).toContain("Sound has a season");
  });
});

// ─── Prompt tone ────────────────────────────────────────────────────────────

describe("LinkedIn prompt — tone", () => {
  it("goal is to ENTERTAIN not impress", () => {
    expect(prompt).toMatch(/NOT to impress.*ENTERTAIN|ENTERTAIN/i);
  });

  it("encourages wit — one clever moment", () => {
    expect(prompt).toMatch(/ONE.*clever moment|one clever/i);
  });
});

// ─── buildSocialInput — correct data ────────────────────────────────────────

describe("LinkedIn buildSocialInput — data structure", () => {
  it("does NOT include amount/price", () => {
    expect(prompt).toMatch(/amount.*intentionally excluded|don't mention pricing/i);
  });

  it("includes case study output", () => {
    expect(prompt).toContain("CASE STUDY:");
  });

  it("includes creative strategy", () => {
    expect(prompt).toContain("CREATIVE STRATEGY:");
  });
});

// ─── Server-side gates ──────────────────────────────────────────────────────

describe("LinkedIn server gates — coverage", () => {
  it("checks for bullet points", () => {
    expect(route).toContain('includes("•")');
    expect(route).toContain('includes("→")');
  });

  it("checks for agency comparisons", () => {
    expect(route).toMatch(/traditional.*agenc/);
  });

  it("checks for invented scores", () => {
    expect(route).toContain("100\\/100");
  });

  it("checks for selling points", () => {
    expect(route).toMatch(/unlimited revision/);
    expect(route).toMatch(/fixed price/);
  });

  it("checks for hashtags", () => {
    expect(route).toContain("#");
  });

  it("checks for price amounts", () => {
    expect(route).toMatch(/€/);
  });

  it("checks for pipe format in hook", () => {
    expect(route).toMatch(/pipe format|\\|.*\\|/);
  });

  it("auto-cleans violations", () => {
    expect(route).toMatch(/replace.*[•→]/);
  });
});

// ─── ClickUp brief integration ──────────────────────────────────────────────

describe("LinkedIn pipeline — ClickUp brief", () => {
  it("fetches ClickUp task description", () => {
    expect(route).toContain("getTask(candidate.clickupTaskId)");
  });

  it("passes clickupBrief to builders", () => {
    expect(route).toContain("clickupBrief");
  });

  it("strips HTML tags", () => {
    expect(route).toContain("replace(/<[^>]+>/g");
  });
});

// ─── Output format ──────────────────────────────────────────────────────────

describe("LinkedIn output format", () => {
  it("requires empty proofPoints", () => {
    expect(prompt).toMatch(/proofPoints.*empty|proofPoints.*""/i);
  });

  it("requires empty hashtags", () => {
    expect(prompt).toMatch(/hashtags.*empty|hashtags.*""/i);
  });

  it("requires uppercase visualTitle", () => {
    expect(prompt).toMatch(/UPPERCASE WORDS/i);
  });
});
