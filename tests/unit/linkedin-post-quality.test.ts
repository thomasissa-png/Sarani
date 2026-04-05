// @vitest-environment node
/**
 * LinkedIn post quality tests.
 * Verifies the prompt, gates, and input structure produce posts
 * matching Thomas's real LinkedIn style.
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
  it("contains Aristocrat ICE 2026 post", () => {
    expect(prompt).toContain("One show. One presence.");
    expect(prompt).toContain("Big space. One collective brand.");
  });

  it("contains Times Square Crocs post", () => {
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
    expect(prompt).toContain("Air Corsica");
    expect(prompt).toContain("Thanks for the trust");
  });
});

// ─── Prompt bans bad patterns ───────────────────────────────────────────────

describe("LinkedIn prompt — banned patterns", () => {
  it("bans bullet points", () => {
    expect(prompt).toMatch(/never.*bullet/i);
  });

  it("bans agency comparisons", () => {
    expect(prompt).toMatch(/no comparison|never.*agenc|unlike traditional/i);
  });

  it("bans pipe format in hooks", () => {
    expect(prompt).toMatch(/never.*pipe format|never.*Client \| Project/i);
    // Verify no example hook uses pipe format
    const hookSection = prompt.split("THE HOOK IS EVERYTHING")[1]?.split("═══")[0] ?? "";
    expect(hookSection).not.toMatch(/"\w+ \| \w+ \| \w+"/);
  });

  it("bans scores and ratings", () => {
    expect(prompt).toMatch(/never.*100\/100|never.*score/i);
  });

  it("bans vague poetic hooks", () => {
    expect(prompt).toContain("Sound has a season");
  });

  it("bans 'brought to life' and 'speaks for itself'", () => {
    expect(prompt).toContain("brought the creative to life");
    expect(prompt).toContain("speaks for itself");
  });

  it("bans hashtags", () => {
    expect(prompt).toMatch(/never.*hashtag/i);
  });

  it("bans emojis", () => {
    expect(prompt).toMatch(/never.*emoji/i);
  });

  it("bans price mentions", () => {
    expect(prompt).toMatch(/never.*price|never.*amount|never.*invoice/i);
  });

  it("bans LinkedIn bro openings", () => {
    expect(prompt).toMatch(/never.*thrilled|never.*proud.*share|never.*excited/i);
  });
});

// ─── Prompt teaches hook quality ────────────────────────────────────────────

describe("LinkedIn prompt — hook guidance", () => {
  it("has a dedicated hook section", () => {
    expect(prompt).toMatch(/hook is everything/i);
  });

  it("explains what makes good hooks from real examples", () => {
    expect(prompt).toContain("The place IS the story");
  });

  it("instructs to play with project theme", () => {
    expect(prompt).toMatch(/play with.*project.*theme|summer.*warm|black friday.*urgent/i);
  });
});

// ─── Prompt instructs to mine data ──────────────────────────────────────────

describe("LinkedIn prompt — data mining", () => {
  it("instructs to use case study data", () => {
    expect(prompt).toMatch(/mine the data|case study.*contain.*deliverable/i);
  });

  it("instructs to write short when data is thin", () => {
    expect(prompt).toMatch(/write shorter|3-4 lines/i);
  });

  it("warns against compensating with metaphors", () => {
    expect(prompt).toContain("NEVER compensate");
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
  it("checks for bullet points (•, →, dash lists)", () => {
    expect(route).toContain('includes("•")');
    expect(route).toContain('includes("→")');
    expect(route).toMatch(/\\n- /);
  });

  it("checks for agency comparisons", () => {
    expect(route).toMatch(/traditional.*agenc/);
    expect(route).toMatch(/other.*agenc/);
  });

  it("checks for invented scores", () => {
    expect(route).toContain("100\\/100");
    expect(route).toContain("quality score");
  });

  it("checks for selling points", () => {
    expect(route).toMatch(/unlimited revision/);
    expect(route).toMatch(/fixed price/);
    expect(route).toMatch(/zero overrun/);
  });

  it("checks for hashtags", () => {
    expect(route).toContain("#");
    expect(route).toContain("hashtag");
  });

  it("checks for price amounts in post", () => {
    expect(route).toMatch(/€.*\\d/);
  });

  it("checks for LinkedIn bro openings", () => {
    expect(route).toMatch(/thrilled|proud|excited/);
  });

  it("checks closer for process metrics", () => {
    expect(route).toMatch(/on time.*on budget/i);
  });

  it("auto-cleans bullets and hashtags", () => {
    expect(route).toMatch(/replace.*[•→]/);
  });
});

// ─── ClickUp brief integration ──────────────────────────────────────────────

describe("LinkedIn pipeline — ClickUp brief", () => {
  it("fetches ClickUp task description before pipeline", () => {
    expect(route).toContain("getTask(candidate.clickupTaskId)");
  });

  it("passes clickupBrief to strategy builder", () => {
    expect(route).toContain("buildStrategyInput(candidate, clickupBrief)");
  });

  it("passes clickupBrief to copy builder", () => {
    expect(route).toContain("buildCopyInput(candidate, strategyData, clickupBrief)");
  });

  it("strips HTML tags from description", () => {
    expect(route).toContain("replace(/<[^>]+>/g");
  });

  it("limits brief to 2000 chars", () => {
    expect(route).toContain("2000");
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

  it("requires visualTitle in uppercase", () => {
    expect(prompt).toMatch(/UPPERCASE WORDS/i);
  });
});
