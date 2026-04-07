// @vitest-environment node
/**
 * LinkedIn post quality tests — minimal prompt, example-driven.
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const PROMPT_PATH = path.resolve(__dirname, "../../src/lib/case-studies/pipeline-prompts.ts");
const ROUTE_PATH = path.resolve(__dirname, "../../src/app/api/admin/case-studies/candidates/[id]/generate/route.ts");
const prompt = fs.readFileSync(PROMPT_PATH, "utf-8");
const route = fs.readFileSync(ROUTE_PATH, "utf-8");

describe("LinkedIn prompt — examples present", () => {
  it("contains all 6 real posts", () => {
    expect(prompt).toContain("One show. One presence.");
    expect(prompt).toContain("Times Square leaves no room for hesitation");
    expect(prompt).toContain("Built to perform. Designed to stand out.");
    expect(prompt).toContain("Mel Robbins");
    expect(prompt).toContain("Air Corsica");
    expect(prompt).toContain("Above the ordinary. Beyond expectation.");
  });
});

describe("LinkedIn prompt — the pattern", () => {
  it("describes the tagline + factual body pattern", () => {
    expect(prompt).toMatch(/tagline/i);
    expect(prompt).toMatch(/factual/i);
  });

  it("has 3 rules, not 30", () => {
    expect(prompt).toMatch(/3 RULES/i);
  });
});

describe("LinkedIn prompt — bans", () => {
  it("bans bullet points, hashtags, emojis", () => {
    expect(prompt).toMatch(/bullet point/i);
    expect(prompt).toMatch(/hashtag/i);
    expect(prompt).toMatch(/emoji/i);
  });

  it("bans scores and price mentions", () => {
    expect(prompt).toMatch(/score/i);
    expect(prompt).toMatch(/price/i);
  });

  it("bans Thrilled/Proud/Excited", () => {
    expect(prompt).toMatch(/Thrilled|Proud|Excited/);
  });
});

describe("LinkedIn prompt — output format", () => {
  it("requires JSON with hook, body, proofPoints, hashtags, charCount, visualTitle", () => {
    expect(prompt).toContain("hook");
    expect(prompt).toContain("body");
    expect(prompt).toContain("proofPoints");
    expect(prompt).toContain("charCount");
    expect(prompt).toContain("visualTitle");
  });

  it("requires empty proofPoints and hashtags", () => {
    expect(prompt).toMatch(/proofPoints.*""/);
    expect(prompt).toMatch(/hashtags.*""/);
  });
});

describe("LinkedIn server gates — enforceGates module", () => {
  it("uses enforceGates from linkedin-gates.ts", () => {
    expect(route).toContain("enforceGates");
    expect(route).toContain("linkedin-gates");
  });

  it("applies cleaned post back to socialData", () => {
    expect(route).toContain("cleanedPost.hook");
    expect(route).toContain("cleanedPost.body");
  });

  it("logs gate failures", () => {
    expect(route).toContain("gateReport");
    expect(route).toContain("gateWarnings");
  });
});

describe("LinkedIn pipeline — ClickUp brief", () => {
  it("fetches ClickUp task description", () => {
    expect(route).toContain("getTask(candidate.clickupTaskId)");
  });

  it("passes clickupBrief to builders", () => {
    expect(route).toContain("clickupBrief");
  });
});
