/**
 * LinkedIn post quality gates — server-side enforcement.
 *
 * Each gate validates one style rule from Thomas's approved LinkedIn format:
 * tagline (2-6 words, creative) + body factual + closer chaleureux.
 *
 * Gates return failures + auto-clean what can be cleaned without rewriting.
 */

import type { z } from "zod";
import type { LinkedInPostSchema } from "./schemas";

type LinkedInPost = z.infer<typeof LinkedInPostSchema>;

export type GateResult = {
  gate: string;
  passed: boolean;
  detail?: string;
};

export type GatesReport = {
  passed: boolean;
  failures: GateResult[];
  all: GateResult[];
  cleaned: boolean;
};

// ─── Individual gate checks ──────────────────────────────────────────────

/** G-BULLETS: Zero bullet points (•, →, -, *, tirets en début de ligne) */
export function checkBullets(fullPost: string): GateResult {
  // Match •, →, or lines starting with - or * (as bullet markers)
  const hasBullets =
    fullPost.includes("•") ||
    fullPost.includes("→") ||
    /(?:^|\n)\s*[-*]\s+\S/m.test(fullPost);
  return {
    gate: "G-BULLETS",
    passed: !hasBullets,
    detail: hasBullets ? "Bullet points detected (•, →, -, or * at line start)" : undefined,
  };
}

/** G-HASHTAGS: Zero hashtags (#anything) */
export function checkHashtags(fullPost: string): GateResult {
  const hasHashtags = /(?:^|\s)#\w+/.test(fullPost);
  return {
    gate: "G-HASHTAGS",
    passed: !hasHashtags,
    detail: hasHashtags ? "Hashtags detected in post text" : undefined,
  };
}

/** G-EMOJIS: Zero emojis (Unicode emoji ranges) */
export function checkEmojis(fullPost: string): GateResult {
  // Comprehensive emoji detection: emoticons, dingbats, symbols, supplemental, flags, etc.
  const emojiRegex =
    /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/u;
  const hasEmojis = emojiRegex.test(fullPost);
  return {
    gate: "G-EMOJIS",
    passed: !hasEmojis,
    detail: hasEmojis ? "Emojis detected in post" : undefined,
  };
}

/** G-PIPE: Zero pipe format in hook (X | Y | Z) — SAUF si c'est un event/show */
export function checkPipeFormat(hook: string, body: string): GateResult {
  const hasPipe = /\w+\s*\|\s*\w+\s*\|\s*\w+/.test(hook);
  // Exception: if body mentions event/show/conference/expo, pipe is allowed
  const isEvent = /event|show|conference|expo|summit|forum/i.test(body);
  const failed = hasPipe && !isEvent;
  return {
    gate: "G-PIPE",
    passed: !failed,
    detail: failed ? "Pipe format (X | Y | Z) in hook — not an event context" : undefined,
  };
}

/** G-SCORES: Zero invented scores (100/100, quality score, X/X score) */
export function checkScores(fullPost: string): GateResult {
  const hasScores =
    /100\/100|quality score|\d+\/\d+\s*score|enterprise[.-]grade|world[.-]class|best[.-]in[.-]class/i.test(
      fullPost
    );
  return {
    gate: "G-SCORES",
    passed: !hasScores,
    detail: hasScores ? "Invented score or superlative grade detected" : undefined,
  };
}

/** G-SELLING: Zero selling points */
export function checkSelling(fullPost: string): GateResult {
  const hasSelling =
    /unlimited revision|fixed price|zero overrun|no invoice surprise|no extra cost|no hidden fee|zero surcharge|cost[.-]effective|flat rate|all[.-]inclusive|satisfaction guarantee/i.test(
      fullPost
    );
  return {
    gate: "G-SELLING",
    passed: !hasSelling,
    detail: hasSelling ? "Selling point / commercial claim detected" : undefined,
  };
}

/** G-COMPARE: Zero agency comparisons */
export function checkCompare(fullPost: string): GateResult {
  const hasCompare =
    /traditional\s+agenc|other\s+agenc|compared\s+to|typical\s+agenc|unlike most|while others|most agencies/i.test(
      fullPost
    );
  return {
    gate: "G-COMPARE",
    passed: !hasCompare,
    detail: hasCompare ? "Agency comparison detected" : undefined,
  };
}

/** G-BRO: Zero LinkedIn bro openings */
export function checkBro(hook: string): GateResult {
  const hasBro = /^(thrilled|proud|excited|i'm\s|we're\s|so proud)/i.test(hook.trim());
  return {
    gate: "G-BRO",
    passed: !hasBro,
    detail: hasBro ? "LinkedIn bro opening (Thrilled/Proud/Excited/I'm/We're/So proud)" : undefined,
  };
}

/** G-PRICE: Zero monetary amounts (€X, $X) */
export function checkPrice(fullPost: string): GateResult {
  const hasPrice = /[€$][\d,.]+|\d+\s*€|\d+\s*\$/.test(fullPost);
  return {
    gate: "G-PRICE",
    passed: !hasPrice,
    detail: hasPrice ? "Price/monetary amount detected" : undefined,
  };
}

/** G-CLICHE: Zero agency clichés */
export function checkCliche(fullPost: string): GateResult {
  const hasCliche =
    /brought\b.*?\bto life|speaks for itself|game[.-]changer|seamless|innovative|enterprise[.-]grade|world[.-]class|best[.-]in[.-]class/i.test(
      fullPost
    );
  return {
    gate: "G-CLICHE",
    passed: !hasCliche,
    detail: hasCliche ? "Agency cliché detected" : undefined,
  };
}

/** G-LENGTH: < 1500 chars total */
export function checkLength(fullPost: string): GateResult {
  const passed = fullPost.length < 1500;
  return {
    gate: "G-LENGTH",
    passed,
    detail: !passed ? `Post is ${fullPost.length} chars (limit: 1500)` : undefined,
  };
}

/** G-EMPTY-PROOF: proofPoints must be "" */
export function checkEmptyProof(proofPoints: string): GateResult {
  const passed = proofPoints === "";
  return {
    gate: "G-EMPTY-PROOF",
    passed,
    detail: !passed ? `proofPoints is not empty: "${proofPoints.slice(0, 50)}"` : undefined,
  };
}

/** G-EMPTY-HASH: hashtags must be "" */
export function checkEmptyHash(hashtags: string): GateResult {
  const passed = hashtags === "";
  return {
    gate: "G-EMPTY-HASH",
    passed,
    detail: !passed ? `hashtags is not empty: "${hashtags.slice(0, 50)}"` : undefined,
  };
}

// ─── Run all gates ───────────────────────────────────────────────────────

export function runAllGates(post: LinkedInPost): GatesReport {
  const fullPost = [post.hook, post.body, post.proofPoints].filter(Boolean).join("\n");

  const all: GateResult[] = [
    checkBullets(fullPost),
    checkHashtags(fullPost),
    checkEmojis(fullPost),
    checkPipeFormat(post.hook, post.body),
    checkScores(fullPost),
    checkSelling(fullPost),
    checkCompare(fullPost),
    checkBro(post.hook),
    checkPrice(fullPost),
    checkCliche(fullPost),
    checkLength(fullPost),
    checkEmptyProof(post.proofPoints ?? ""),
    checkEmptyHash(post.hashtags ?? ""),
  ];

  const failures = all.filter((g) => !g.passed);

  return {
    passed: failures.length === 0,
    failures,
    all,
    cleaned: false,
  };
}

// ─── Auto-clean ──────────────────────────────────────────────────────────

/**
 * Auto-clean what can be cleaned without rewriting.
 * Returns a new post object (does not mutate the original).
 * Gates that require rewriting (G-COMPARE, G-BRO, G-CLICHE, G-SCORES, G-SELLING)
 * are logged but not auto-cleaned.
 */
export function autoClean(post: LinkedInPost): { post: LinkedInPost; logWarnings: string[] } {
  const warnings: string[] = [];
  let hook = post.hook;
  let body = post.body;

  // G-BULLETS: remove bullet markers, transform to paragraph
  body = body
    .replace(/[•→]\s*/g, "")
    .replace(/(?:^|\n)\s*[-*]\s+/gm, "\n");
  hook = hook.replace(/[•→]\s*/g, "");

  // G-HASHTAGS: remove hashtags
  body = body.replace(/(?:^|\s)#\w+/g, "");
  hook = hook.replace(/(?:^|\s)#\w+/g, "");

  // G-EMOJIS: strip emoji characters
  const emojiRegex =
    /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu;
  body = body.replace(emojiRegex, "");
  hook = hook.replace(emojiRegex, "");

  // G-PRICE: replace amounts with [amount]
  body = body.replace(/[€$][\d,.]+|\d+\s*[€$]/g, "[amount]");
  hook = hook.replace(/[€$][\d,.]+|\d+\s*[€$]/g, "[amount]");

  // G-EMPTY-PROOF: force empty
  const proofPoints = "";

  // G-EMPTY-HASH: force empty
  const hashtags = "";

  // Clean up extra whitespace from removals
  body = body.replace(/\n{3,}/g, "\n\n").trim();
  hook = hook.trim();

  // Gates that cannot be auto-cleaned — log for manual review
  const fullPost = [hook, body].join("\n");
  if (/traditional\s+agenc|other\s+agenc|compared\s+to|typical\s+agenc|unlike most|while others|most agencies/i.test(fullPost)) {
    warnings.push("G-COMPARE: agency comparison found — requires manual rewrite");
  }
  if (/^(thrilled|proud|excited|i'm\s|we're\s|so proud)/i.test(hook.trim())) {
    warnings.push("G-BRO: LinkedIn bro opening — requires manual rewrite");
  }
  if (/brought\b.*?\bto life|speaks for itself|game[.-]changer|seamless|innovative|enterprise[.-]grade|world[.-]class|best[.-]in[.-]class/i.test(fullPost)) {
    warnings.push("G-CLICHE: agency cliché found — requires manual rewrite");
  }
  if (/100\/100|quality score|\d+\/\d+\s*score/i.test(fullPost)) {
    warnings.push("G-SCORES: invented score found — requires manual rewrite");
  }
  if (/unlimited revision|fixed price|zero overrun|no invoice surprise|no extra cost|no hidden fee|zero surcharge|cost[.-]effective|flat rate|all[.-]inclusive|satisfaction guarantee/i.test(fullPost)) {
    warnings.push("G-SELLING: selling point found — requires manual rewrite");
  }

  // Recalculate charCount
  const charCount = hook.length + body.length;

  return {
    post: {
      hook,
      body,
      proofPoints,
      hashtags,
      charCount,
      visualTitle: post.visualTitle ?? "",
    },
    logWarnings: warnings,
  };
}

/**
 * Run gates + auto-clean if needed. Returns the final post + report.
 */
export function enforceGates(post: LinkedInPost): {
  post: LinkedInPost;
  report: GatesReport;
  warnings: string[];
} {
  const initialReport = runAllGates(post);

  if (initialReport.passed) {
    return { post, report: initialReport, warnings: [] };
  }

  // Auto-clean
  const { post: cleaned, logWarnings } = autoClean(post);

  // Re-check after cleaning
  const finalReport = runAllGates(cleaned);
  finalReport.cleaned = true;

  return { post: cleaned, report: finalReport, warnings: logWarnings };
}
