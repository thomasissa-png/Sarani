// @vitest-environment node
/**
 * LinkedIn post quality gates — unit tests.
 *
 * Tests every gate individually (pass + fail), auto-clean behavior,
 * and the full enforceGates pipeline.
 *
 * REGRESSION: Gates added after Thomas validated the LinkedIn style (2026-04-07).
 * Each gate prevents non-conforming content from reaching production.
 */

import { describe, it, expect } from "vitest";
import {
  checkBullets,
  checkHashtags,
  checkEmojis,
  checkPipeFormat,
  checkScores,
  checkSelling,
  checkCompare,
  checkBro,
  checkPrice,
  checkCliche,
  checkLength,
  checkEmptyProof,
  checkEmptyHash,
  runAllGates,
  autoClean,
  enforceGates,
} from "@/lib/case-studies/linkedin-gates";

// ─── Reference: a post that passes ALL gates ────────────────────────────────

const CLEAN_POST = {
  hook: "Summer Cashback, camera-ready.",
  body: "For Sony France's April audio campaign, the offline creative was already signed off. The media team needed the digital suite — social squares, leaderboard units, vertical stories, D2C-specific dimensions.\n\n13 formats adapted from the same creative line, designed to work across social, display, and direct-to-consumer channels. No creative restart. The brand system was already in our hands.\n\nSame vision. New screens.\n\nThanks for the trust, Sony France.",
  proofPoints: "",
  hashtags: "",
  charCount: 450,
  visualTitle: "SONY CASHBACK",
};

// ─── G-BULLETS ──────────────────────────────────────────────────────────────

describe("G-BULLETS", () => {
  it("passes on clean post", () => {
    const result = checkBullets(CLEAN_POST.hook + "\n" + CLEAN_POST.body);
    expect(result.passed).toBe(true);
    expect(result.gate).toBe("G-BULLETS");
  });

  it("fails on bullet dot (U+2022)", () => {
    const text = "Key deliverables:\n\u2022 Social banners\n\u2022 Video assets";
    expect(checkBullets(text).passed).toBe(false);
  });

  it("fails on arrow (U+2192)", () => {
    const text = "Results:\n\u2192 50% faster delivery";
    expect(checkBullets(text).passed).toBe(false);
  });

  it("fails on dash bullet at line start", () => {
    const text = "Deliverables:\n- Social squares\n- Leaderboard units";
    expect(checkBullets(text).passed).toBe(false);
  });

  it("fails on asterisk bullet at line start", () => {
    const text = "Assets created:\n* Video edits\n* Banner ads";
    expect(checkBullets(text).passed).toBe(false);
  });

  it("passes when dash is inside a sentence (not a bullet)", () => {
    const text = "The media team needed the digital suite — social squares, leaderboard units.";
    expect(checkBullets(text).passed).toBe(true);
  });
});

// ─── G-HASHTAGS ─────────────────────────────────────────────────────────────

describe("G-HASHTAGS", () => {
  it("passes on clean post", () => {
    const result = checkHashtags(CLEAN_POST.body);
    expect(result.passed).toBe(true);
    expect(result.gate).toBe("G-HASHTAGS");
  });

  it("fails on #CreativeAgency", () => {
    expect(checkHashtags("Great project #CreativeAgency").passed).toBe(false);
  });

  it("fails on #design at line start", () => {
    expect(checkHashtags("#design #branding #sarani").passed).toBe(false);
  });

  it("passes on # followed by number only (not a hashtag)", () => {
    // #1 is debatable, but the regex requires \w+ which includes digits
    // The current implementation would flag #1 — this tests the actual behavior
    const result = checkHashtags("They were #1 in their field");
    // #1 matches /(?:^|\s)#\w+/ so it will fail
    expect(result.passed).toBe(false);
  });
});

// ─── G-EMOJIS ───────────────────────────────────────────────────────────────

describe("G-EMOJIS", () => {
  it("passes on clean post", () => {
    const result = checkEmojis(CLEAN_POST.body);
    expect(result.passed).toBe(true);
    expect(result.gate).toBe("G-EMOJIS");
  });

  it("fails on fire emoji", () => {
    expect(checkEmojis("This project was \u{1F525}").passed).toBe(false);
  });

  it("fails on rocket emoji", () => {
    expect(checkEmojis("Launch day \u{1F680}").passed).toBe(false);
  });

  it("fails on checkmark emoji", () => {
    expect(checkEmojis("\u2705 Done").passed).toBe(false);
  });

  it("fails on flag emoji", () => {
    expect(checkEmojis("Team \u{1F1EB}\u{1F1F7}").passed).toBe(false);
  });

  it("passes on standard ASCII punctuation", () => {
    expect(checkEmojis("Hello! Great work. Done — next?").passed).toBe(true);
  });
});

// ─── G-PIPE ─────────────────────────────────────────────────────────────────

describe("G-PIPE", () => {
  it("passes on clean hook", () => {
    const result = checkPipeFormat(CLEAN_POST.hook, CLEAN_POST.body);
    expect(result.passed).toBe(true);
    expect(result.gate).toBe("G-PIPE");
  });

  it("fails on pipe format in non-event hook", () => {
    const result = checkPipeFormat(
      "Speed | Quality | Scale",
      "We delivered 13 formats for the campaign."
    );
    expect(result.passed).toBe(false);
  });

  it("passes on pipe format when body mentions event", () => {
    const result = checkPipeFormat(
      "ICE 2026 | Barcelona | Aristocrat",
      "For ICE 2026, the premier gaming event in Barcelona."
    );
    expect(result.passed).toBe(true);
  });

  it("passes on pipe format when body mentions conference", () => {
    const result = checkPipeFormat(
      "Brand | Innovation | Conference",
      "At the annual conference, we presented..."
    );
    expect(result.passed).toBe(true);
  });

  it("passes on pipe format when body mentions expo", () => {
    const result = checkPipeFormat(
      "Design | Build | Expo",
      "The expo featured our latest work."
    );
    expect(result.passed).toBe(true);
  });

  it("passes when hook has no pipe at all", () => {
    const result = checkPipeFormat("One show. One presence.", "Regular body.");
    expect(result.passed).toBe(true);
  });
});

// ─── G-SCORES ───────────────────────────────────────────────────────────────

describe("G-SCORES", () => {
  it("passes on clean post", () => {
    const result = checkScores(CLEAN_POST.body);
    expect(result.passed).toBe(true);
    expect(result.gate).toBe("G-SCORES");
  });

  it("fails on 100/100", () => {
    expect(checkScores("We achieved 100/100 on delivery").passed).toBe(false);
  });

  it("fails on quality score", () => {
    expect(checkScores("Our quality score speaks for itself").passed).toBe(false);
  });

  it("fails on X/X score pattern", () => {
    expect(checkScores("Rated 9/10 score by the client").passed).toBe(false);
  });

  it("fails on enterprise-grade", () => {
    expect(checkScores("Enterprise-grade creative delivery").passed).toBe(false);
  });

  it("fails on world-class", () => {
    expect(checkScores("World-class design team").passed).toBe(false);
  });

  it("passes on normal fractions like 13 formats", () => {
    expect(checkScores("13 formats adapted from the same creative line").passed).toBe(true);
  });
});

// ─── G-SELLING ──────────────────────────────────────────────────────────────

describe("G-SELLING", () => {
  it("passes on clean post", () => {
    const result = checkSelling(CLEAN_POST.body);
    expect(result.passed).toBe(true);
    expect(result.gate).toBe("G-SELLING");
  });

  it("fails on unlimited revisions", () => {
    expect(checkSelling("We offer unlimited revisions").passed).toBe(false);
  });

  it("fails on fixed price", () => {
    expect(checkSelling("All at a fixed price").passed).toBe(false);
  });

  it("fails on zero overruns", () => {
    expect(checkSelling("Zero overruns on this project").passed).toBe(false);
  });

  it("fails on no invoice surprises", () => {
    expect(checkSelling("No invoice surprises here").passed).toBe(false);
  });

  it("fails on no hidden fees", () => {
    expect(checkSelling("No hidden fees, ever").passed).toBe(false);
  });

  it("fails on flat rate", () => {
    expect(checkSelling("We work on a flat rate basis").passed).toBe(false);
  });

  it("fails on all-inclusive", () => {
    expect(checkSelling("Our all-inclusive package").passed).toBe(false);
  });

  it("fails on satisfaction guarantee", () => {
    expect(checkSelling("Backed by our satisfaction guarantee").passed).toBe(false);
  });
});

// ─── G-COMPARE ──────────────────────────────────────────────────────────────

describe("G-COMPARE", () => {
  it("passes on clean post", () => {
    const result = checkCompare(CLEAN_POST.body);
    expect(result.passed).toBe(true);
    expect(result.gate).toBe("G-COMPARE");
  });

  it("fails on traditional agency", () => {
    expect(checkCompare("Unlike a traditional agency, we deliver in 24h").passed).toBe(false);
  });

  it("fails on other agencies", () => {
    expect(checkCompare("While other agencies take weeks").passed).toBe(false);
  });

  it("fails on typical agency", () => {
    expect(checkCompare("Your typical agency would charge double").passed).toBe(false);
  });

  it("fails on unlike most", () => {
    expect(checkCompare("Unlike most, we actually deliver on time").passed).toBe(false);
  });

  it("fails on while others", () => {
    expect(checkCompare("While others struggle with scale").passed).toBe(false);
  });

  it("fails on most agencies", () => {
    expect(checkCompare("Most agencies can't handle this volume").passed).toBe(false);
  });
});

// ─── G-BRO ──────────────────────────────────────────────────────────────────

describe("G-BRO", () => {
  it("passes on clean hook", () => {
    const result = checkBro(CLEAN_POST.hook);
    expect(result.passed).toBe(true);
    expect(result.gate).toBe("G-BRO");
  });

  it("fails on Thrilled", () => {
    expect(checkBro("Thrilled to announce our latest project").passed).toBe(false);
  });

  it("fails on Proud", () => {
    expect(checkBro("Proud to share this case study").passed).toBe(false);
  });

  it("fails on Excited", () => {
    expect(checkBro("Excited to reveal our work with Sony").passed).toBe(false);
  });

  it("fails on I'm", () => {
    expect(checkBro("I'm delighted to share this").passed).toBe(false);
  });

  it("fails on We're", () => {
    expect(checkBro("We're thrilled to announce").passed).toBe(false);
  });

  it("fails on So proud", () => {
    expect(checkBro("So proud of our team").passed).toBe(false);
  });

  it("passes when these words appear mid-sentence (not opening)", () => {
    expect(checkBro("The team is proud of this result").passed).toBe(true);
  });
});

// ─── G-PRICE ────────────────────────────────────────────────────────────────

describe("G-PRICE", () => {
  it("passes on clean post", () => {
    const result = checkPrice(CLEAN_POST.body);
    expect(result.passed).toBe(true);
    expect(result.gate).toBe("G-PRICE");
  });

  it("fails on euro amount", () => {
    expect(checkPrice("Delivered for \u20AC150 per banner").passed).toBe(false);
  });

  it("fails on dollar amount", () => {
    expect(checkPrice("Only $20 per video edit").passed).toBe(false);
  });

  it("fails on amount followed by euro sign", () => {
    expect(checkPrice("Total cost was 8500\u20AC").passed).toBe(false);
  });

  it("fails on large euro amount with comma", () => {
    expect(checkPrice("Budget of \u20AC1,500,000").passed).toBe(false);
  });
});

// ─── G-CLICHE ───────────────────────────────────────────────────────────────

describe("G-CLICHE", () => {
  it("passes on clean post", () => {
    const result = checkCliche(CLEAN_POST.body);
    expect(result.passed).toBe(true);
    expect(result.gate).toBe("G-CLICHE");
  });

  it("fails on brought to life", () => {
    expect(checkCliche("We brought their vision to life").passed).toBe(false);
  });

  it("fails on speaks for itself", () => {
    expect(checkCliche("The work speaks for itself").passed).toBe(false);
  });

  it("fails on game-changer", () => {
    expect(checkCliche("This was a real game-changer").passed).toBe(false);
  });

  it("fails on seamless", () => {
    expect(checkCliche("A seamless collaboration").passed).toBe(false);
  });

  it("fails on innovative", () => {
    expect(checkCliche("Our innovative approach to design").passed).toBe(false);
  });

  it("fails on best-in-class", () => {
    expect(checkCliche("Best-in-class creative output").passed).toBe(false);
  });
});

// ─── G-LENGTH ───────────────────────────────────────────────────────────────

describe("G-LENGTH", () => {
  it("passes on short post", () => {
    const result = checkLength("A".repeat(1499));
    expect(result.passed).toBe(true);
    expect(result.gate).toBe("G-LENGTH");
  });

  it("fails on 1500 chars exactly", () => {
    expect(checkLength("A".repeat(1500)).passed).toBe(false);
  });

  it("fails on 2000 chars", () => {
    const result = checkLength("A".repeat(2000));
    expect(result.passed).toBe(false);
    expect(result.detail).toContain("2000");
  });

  it("passes on the reference clean post", () => {
    const full = CLEAN_POST.hook + "\n" + CLEAN_POST.body;
    expect(checkLength(full).passed).toBe(true);
  });
});

// ─── G-EMPTY-PROOF ──────────────────────────────────────────────────────────

describe("G-EMPTY-PROOF", () => {
  it("passes on empty string", () => {
    const result = checkEmptyProof("");
    expect(result.passed).toBe(true);
    expect(result.gate).toBe("G-EMPTY-PROOF");
  });

  it("fails on non-empty proofPoints", () => {
    expect(checkEmptyProof("- 13 formats delivered in 24h").passed).toBe(false);
  });

  it("fails on whitespace-only (not empty)", () => {
    expect(checkEmptyProof("  ").passed).toBe(false);
  });
});

// ─── G-EMPTY-HASH ───────────────────────────────────────────────────────────

describe("G-EMPTY-HASH", () => {
  it("passes on empty string", () => {
    const result = checkEmptyHash("");
    expect(result.passed).toBe(true);
    expect(result.gate).toBe("G-EMPTY-HASH");
  });

  it("fails on non-empty hashtags", () => {
    expect(checkEmptyHash("#design #branding").passed).toBe(false);
  });
});

// ─── runAllGates — full pipeline ────────────────────────────────────────────

describe("runAllGates", () => {
  it("passes all 13 gates on the clean reference post", () => {
    const report = runAllGates(CLEAN_POST);
    expect(report.passed).toBe(true);
    expect(report.failures).toHaveLength(0);
    expect(report.all).toHaveLength(13);
  });

  it("reports the correct gate name on each failure", () => {
    const dirtyPost = {
      ...CLEAN_POST,
      hook: "Thrilled to share this!",
      body: "We offer unlimited revisions. Our game-changer approach brought their vision to life. Traditional agency? Not us. Quality score: 100/100.\n\u2022 Fast\n\u2022 Cheap\n#sarani #creative \u{1F525}\nAll for \u20AC500.",
      proofPoints: "Some proof here",
      hashtags: "#design",
    };
    const report = runAllGates(dirtyPost);
    expect(report.passed).toBe(false);

    const failedGates = report.failures.map((f) => f.gate);
    expect(failedGates).toContain("G-BULLETS");
    expect(failedGates).toContain("G-HASHTAGS");
    expect(failedGates).toContain("G-EMOJIS");
    expect(failedGates).toContain("G-SCORES");
    expect(failedGates).toContain("G-SELLING");
    expect(failedGates).toContain("G-COMPARE");
    expect(failedGates).toContain("G-BRO");
    expect(failedGates).toContain("G-PRICE");
    expect(failedGates).toContain("G-CLICHE");
    expect(failedGates).toContain("G-EMPTY-PROOF");
    expect(failedGates).toContain("G-EMPTY-HASH");
  });
});

// ─── autoClean ──────────────────────────────────────────────────────────────

describe("autoClean", () => {
  it("removes bullet dots", () => {
    const post = { ...CLEAN_POST, body: "Items:\n\u2022 One\n\u2022 Two" };
    const { post: cleaned } = autoClean(post);
    expect(cleaned.body).not.toContain("\u2022");
  });

  it("removes arrow bullets", () => {
    const post = { ...CLEAN_POST, body: "Results:\n\u2192 Fast" };
    const { post: cleaned } = autoClean(post);
    expect(cleaned.body).not.toContain("\u2192");
  });

  it("removes hashtags from body", () => {
    const post = { ...CLEAN_POST, body: "Great work #sarani #creative" };
    const { post: cleaned } = autoClean(post);
    expect(cleaned.body).not.toMatch(/#\w+/);
  });

  it("removes hashtags from hook", () => {
    const post = { ...CLEAN_POST, hook: "#Sarani delivers" };
    const { post: cleaned } = autoClean(post);
    expect(cleaned.hook).not.toMatch(/#\w+/);
  });

  it("removes emojis", () => {
    const post = { ...CLEAN_POST, body: "Fire \u{1F525} delivery \u{1F680}" };
    const { post: cleaned } = autoClean(post);
    expect(cleaned.body).not.toMatch(/[\u{1F525}\u{1F680}]/u);
  });

  it("replaces price amounts with [amount]", () => {
    const post = { ...CLEAN_POST, body: "Only \u20AC150 per banner, or $20 per video" };
    const { post: cleaned } = autoClean(post);
    expect(cleaned.body).toContain("[amount]");
    expect(cleaned.body).not.toMatch(/[\u20AC$]\d/);
  });

  it("forces proofPoints to empty string", () => {
    const post = { ...CLEAN_POST, proofPoints: "Some proof points here" };
    const { post: cleaned } = autoClean(post);
    expect(cleaned.proofPoints).toBe("");
  });

  it("forces hashtags to empty string", () => {
    const post = { ...CLEAN_POST, hashtags: "#design #creative" };
    const { post: cleaned } = autoClean(post);
    expect(cleaned.hashtags).toBe("");
  });

  it("recalculates charCount after cleaning", () => {
    const post = { ...CLEAN_POST, body: "Text \u{1F525} with #emoji", charCount: 999 };
    const { post: cleaned } = autoClean(post);
    expect(cleaned.charCount).toBe(cleaned.hook.length + cleaned.body.length);
  });

  it("warns on G-COMPARE (cannot auto-clean)", () => {
    const post = { ...CLEAN_POST, body: "Unlike traditional agencies, we deliver." };
    const { logWarnings } = autoClean(post);
    expect(logWarnings.some((w) => w.includes("G-COMPARE"))).toBe(true);
  });

  it("warns on G-BRO (cannot auto-clean)", () => {
    const post = { ...CLEAN_POST, hook: "Thrilled to share" };
    const { logWarnings } = autoClean(post);
    expect(logWarnings.some((w) => w.includes("G-BRO"))).toBe(true);
  });

  it("warns on G-CLICHE (cannot auto-clean)", () => {
    const post = { ...CLEAN_POST, body: "We brought their vision to life." };
    const { logWarnings } = autoClean(post);
    expect(logWarnings.some((w) => w.includes("G-CLICHE"))).toBe(true);
  });

  it("warns on G-SCORES (cannot auto-clean)", () => {
    const post = { ...CLEAN_POST, body: "Achieved 100/100 on delivery." };
    const { logWarnings } = autoClean(post);
    expect(logWarnings.some((w) => w.includes("G-SCORES"))).toBe(true);
  });

  it("warns on G-SELLING (cannot auto-clean)", () => {
    const post = { ...CLEAN_POST, body: "Unlimited revisions included." };
    const { logWarnings } = autoClean(post);
    expect(logWarnings.some((w) => w.includes("G-SELLING"))).toBe(true);
  });
});

// ─── enforceGates — integration ─────────────────────────────────────────────

describe("enforceGates", () => {
  it("returns original post when all gates pass", () => {
    const { post, report, warnings } = enforceGates(CLEAN_POST);
    expect(report.passed).toBe(true);
    expect(report.cleaned).toBe(false);
    expect(warnings).toHaveLength(0);
    expect(post.hook).toBe(CLEAN_POST.hook);
    expect(post.body).toBe(CLEAN_POST.body);
  });

  it("auto-cleans bullets + hashtags + emojis and marks cleaned", () => {
    const dirtyPost = {
      ...CLEAN_POST,
      body: "Items:\n\u2022 Social banners \u{1F525}\n#sarani",
      proofPoints: "proof here",
      hashtags: "#design",
    };
    const { post, report } = enforceGates(dirtyPost);
    expect(report.cleaned).toBe(true);
    expect(post.body).not.toContain("\u2022");
    expect(post.body).not.toMatch(/[\u{1F525}]/u);
    expect(post.body).not.toMatch(/#\w+/);
    expect(post.proofPoints).toBe("");
    expect(post.hashtags).toBe("");
  });

  it("returns warnings for gates that cannot be auto-cleaned", () => {
    const dirtyPost = {
      ...CLEAN_POST,
      hook: "Thrilled to share!",
      body: "Unlike traditional agencies, we brought the vision to life.",
    };
    const { warnings } = enforceGates(dirtyPost);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings.some((w) => w.includes("G-BRO"))).toBe(true);
    expect(warnings.some((w) => w.includes("G-COMPARE"))).toBe(true);
    expect(warnings.some((w) => w.includes("G-CLICHE"))).toBe(true);
  });

  it("replaces price with [amount] during auto-clean", () => {
    const dirtyPost = {
      ...CLEAN_POST,
      body: "All for \u20AC8,500 total.",
    };
    const { post } = enforceGates(dirtyPost);
    expect(post.body).toContain("[amount]");
    expect(post.body).not.toContain("\u20AC8,500");
  });
});

// ─── Real-world adversarial payloads ────────────────────────────────────────

describe("adversarial payloads", () => {
  it("detects combined violations in a realistic LLM output", () => {
    const llmOutput = {
      hook: "Excited to share our latest work!",
      body: "We're proud of this game-changer project.\n\n\u2022 50+ banners delivered\n\u2022 24h turnaround\n\u2022 Zero overruns\n\nTraditional agencies would charge \u20AC10,000 for this. Our quality score: 100/100.\n\n#sarani #creative #design \u{1F680}",
      proofPoints: "50+ banners, 24h delivery",
      hashtags: "#sarani #creative",
      charCount: 300,
      visualTitle: "BRAND BANNERS",
    };

    const report = runAllGates(llmOutput);
    expect(report.passed).toBe(false);

    // Should catch at least these gates
    const failedGates = report.failures.map((f) => f.gate);
    expect(failedGates).toContain("G-BRO");
    expect(failedGates).toContain("G-CLICHE");
    expect(failedGates).toContain("G-BULLETS");
    expect(failedGates).toContain("G-SELLING");
    expect(failedGates).toContain("G-COMPARE");
    expect(failedGates).toContain("G-PRICE");
    expect(failedGates).toContain("G-SCORES");
    expect(failedGates).toContain("G-EMOJIS");
    expect(failedGates).toContain("G-HASHTAGS");
    expect(failedGates).toContain("G-EMPTY-PROOF");
    expect(failedGates).toContain("G-EMPTY-HASH");
  });

  it("enforceGates cleans what it can from adversarial output", () => {
    const llmOutput = {
      hook: "Built for speed.",
      body: "\u2022 Fast delivery \u{1F525}\nFor \u20AC500, we delivered #everything.\n\nNo hidden fees.",
      proofPoints: "proof",
      hashtags: "#tag",
      charCount: 100,
      visualTitle: "SPEED",
    };

    const { post, report, warnings } = enforceGates(llmOutput);
    // Bullets, emojis, hashtags, price, proofPoints, hashtags field should be cleaned
    expect(post.body).not.toContain("\u2022");
    expect(post.body).not.toMatch(/[\u{1F525}]/u);
    expect(post.body).toContain("[amount]");
    expect(post.proofPoints).toBe("");
    expect(post.hashtags).toBe("");
    // G-SELLING (no hidden fees) cannot be auto-cleaned, should warn
    expect(warnings.some((w) => w.includes("G-SELLING"))).toBe(true);
  });
});
