// @vitest-environment node
/**
 * P0 — Case Study Multi-Agent Pipeline: prompts & schemas
 * WHY: The pipeline generates case studies for enterprise clients (TikTok, Sony, GEODIS).
 * Invalid inputs to LLM = wasted tokens + broken output.
 * Invalid schema validation = corrupt data saved to DB.
 * These tests use realistic Sarani project data, not generic mocks.
 *
 * Test type: STATIC (code review + unit tests). No live LLM calls, no DB.
 */

import { describe, it, expect } from "vitest";
import {
  StrategyOutputSchema,
  CopyOutputSchema,
  SocialOutputSchema,
  buildStrategyInput,
  buildCopyInput,
  buildSocialInput,
  type StrategyOutput,
  type CopyOutput,
} from "@/lib/case-studies/pipeline-prompts";

// ─── Realistic Sarani candidate fixtures ──────────────────────────────────

const TIKTOK_CANDIDATE = {
  clientName: "TikTok",
  projectName: "Social Video Campaign — 1500 edits/month",
  projectType: "Video Production",
  projectAmount: "30000",
  completedAt: new Date("2025-09-15"),
  sharePointAssetCount: 482,
  sharePointFolderUrl: "https://saranistudio.sharepoint.com/sites/Production/TikTok",
  scoreTotal: 92,
  scoreBreakdown: {
    clientPrestige: 25,
    projectScale: 22,
    visualRichness: 20,
    narrativePotential: 25,
  },
};

const SONY_CANDIDATE = {
  clientName: "Sony",
  projectName: "Black Friday Banners — 48h turnaround",
  projectType: "Graphic Design",
  projectAmount: "150",
  completedAt: new Date("2025-11-25"),
  sharePointAssetCount: 24,
  sharePointFolderUrl: null,
  scoreTotal: 78,
  scoreBreakdown: {
    clientPrestige: 22,
    projectScale: 8,
    visualRichness: 18,
    narrativePotential: 30,
  },
};

const GEODIS_CANDIDATE = {
  clientName: "GEODIS",
  projectName: "Corporate Rebranding — 5700 slides",
  projectType: "Presentation",
  projectAmount: "8500",
  completedAt: new Date("2025-06-01"),
  sharePointAssetCount: 5700,
  sharePointFolderUrl: "https://saranistudio.sharepoint.com/sites/Production/GEODIS",
  scoreTotal: 88,
  scoreBreakdown: {
    clientPrestige: 20,
    projectScale: 25,
    visualRichness: 18,
    narrativePotential: 25,
  },
};

/** Candidate with minimal/null fields — edge case */
const MINIMAL_CANDIDATE = {
  clientName: "Acme Corp",
  projectName: null,
  projectType: null,
  projectAmount: null,
  completedAt: null,
  sharePointAssetCount: null,
  sharePointFolderUrl: null,
  scoreTotal: 71,
  scoreBreakdown: null,
};

// ─── Realistic LLM output fixtures ───────────────────────────────────────

const VALID_STRATEGY_OUTPUT: StrategyOutput = {
  angle: "How TikTok scaled creative production to 1,500 videos/month without compromising quality",
  keyMessages: [
    "Sarani delivered 1,500+ video edits per month at $20/video — 10x cheaper than in-house production",
    "24/7 production across 5 continents meant TikTok's marketing team never waited for assets",
    "Zero quality drops across 18 languages and 12 regional markets",
  ],
  visualDirection: "Fast-paced montage of video thumbnails, behind-the-scenes editing workflow, volume metrics overlay",
  emotionalHook: "What if your creative team could produce 1,500 videos a month — and never miss a deadline?",
  targetAudience: "CMOs and Head of Social at global tech companies managing multi-market campaigns with 500K+ monthly content volume",
  differentiators: [
    "Scale: 1,500 videos/month sustained over 12 months",
    "Cost: $20/video vs. $200+ industry average",
    "Speed: D+1 turnaround on individual edits",
  ],
};

const VALID_COPY_OUTPUT: CopyOutput = {
  caseStudy: {
    slug: "tiktok-video-production",
    client: "TikTok",
    deliverable: "Video editing & social content production",
    volume: "1,500+ videos/month",
    turnaround: "D+1 per video",
    outcome: "60% cost reduction vs. in-house production",
    brief: "TikTok's marketing team needed to produce 1,500+ social video edits per month across 12 regional markets. Internal teams were overwhelmed, and traditional agencies quoted 2-week turnarounds per batch.",
    result: "18,000+ videos in 12 months at $20/video. 60% cost reduction, 300% output increase.",
    headline: "From overwhelmed to 1,500 videos/month: how TikTok scaled creative production globally",
    keyMetric: "1,500+ videos/month",
    stats: [
      { label: "Monthly videos", value: "1,500+" },
      { label: "Cost per video", value: "$20" },
      { label: "Cost reduction", value: "60%" },
    ],
    metaDescription: "How TikTok scaled to 1,500+ social video edits per month with Sarani, reducing creative production costs by 60% with D+1 turnaround across 12 markets.",
    category: "Video & Social",
    challenge: "TikTok needed 1,500+ social video edits per month. In-house teams were overwhelmed.",
    solution: "Sarani deployed a 24/7 editing team across 5 continents, delivering D+1 turnaround at $20/video.",
    resultsDetail: "18,000+ videos delivered over 12 months with zero missed deadlines. TikTok's cost per video dropped from $50 to $20.",
    tags: ["Video Production", "Social Media", "Scale"],
  },
  nurturingEmail: {
    subject: "How TikTok produces 1,500 videos/month",
    body: "What if your team could produce 1,500+ videos a month — without hiring a single editor?\n\nThat's exactly what TikTok achieved with Sarani. Their marketing team was drowning in content requests across 12 regional markets. Traditional agencies quoted 2-week turnarounds. In-house was maxed out.\n\nSarani's 24/7 production team — 45 experts across 5 continents — delivered every single video within 24 hours. At $20 per video. For 12 months straight.\n\nThe result: 60% cost reduction and 300% more content output.",
    ctaText: "See the full story",
    suggestedSegment: "CMOs at global tech companies managing multi-market social campaigns",
  },
};

const VALID_SOCIAL_OUTPUT = {
  linkedInPost: {
    hook: "1,500 videos. Every month. For 12 months straight.",
    body: "TikTok needed to produce 1,500+ social video edits per month across 12 regional markets.\n\nTraditional agencies? 2-week turnarounds.\nIn-house? Maxed out.\n\nSarani delivered. Every single video. Within 24 hours. At $20/video.",
    proofPoints: "18,000+ videos delivered | $20/video (vs. $200+ industry avg) | 60% cost reduction | Zero missed deadlines",
    hashtags: "#CreativeProduction #SocialMedia #ScaleCreativity #TikTok #Sarani",
    charCount: 487,
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// Schema validation tests
// ═══════════════════════════════════════════════════════════════════════════

describe("StrategyOutputSchema", () => {
  it("accepts valid strategy output (TikTok campaign)", () => {
    const result = StrategyOutputSchema.safeParse(VALID_STRATEGY_OUTPUT);
    expect(result.success).toBe(true);
  });

  it("rejects empty angle", () => {
    const result = StrategyOutputSchema.safeParse({
      ...VALID_STRATEGY_OUTPUT,
      angle: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects angle shorter than 5 characters", () => {
    const result = StrategyOutputSchema.safeParse({
      ...VALID_STRATEGY_OUTPUT,
      angle: "ok",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty keyMessages array", () => {
    const result = StrategyOutputSchema.safeParse({
      ...VALID_STRATEGY_OUTPUT,
      keyMessages: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects keyMessages with only 1 item (min 2)", () => {
    const result = StrategyOutputSchema.safeParse({
      ...VALID_STRATEGY_OUTPUT,
      keyMessages: ["Single message"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects keyMessages with 6 items (max 5)", () => {
    const result = StrategyOutputSchema.safeParse({
      ...VALID_STRATEGY_OUTPUT,
      keyMessages: ["a", "b", "c", "d", "e", "f"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects keyMessages containing empty strings", () => {
    const result = StrategyOutputSchema.safeParse({
      ...VALID_STRATEGY_OUTPUT,
      keyMessages: ["Valid message", ""],
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing required fields", () => {
    const result = StrategyOutputSchema.safeParse({
      angle: "Good angle for the case study",
      keyMessages: ["msg1", "msg2"],
      // missing: visualDirection, emotionalHook, targetAudience, differentiators
    });
    expect(result.success).toBe(false);
  });

  it("rejects differentiators with more than 5 items", () => {
    const result = StrategyOutputSchema.safeParse({
      ...VALID_STRATEGY_OUTPUT,
      differentiators: ["a", "b", "c", "d", "e", "f"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects extra properties silently (Zod strip mode)", () => {
    const result = StrategyOutputSchema.safeParse({
      ...VALID_STRATEGY_OUTPUT,
      hallucinated_field: "LLM added this",
    });
    // Zod default is strip — extra keys are removed, not rejected
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("hallucinated_field");
    }
  });
});

describe("CopyOutputSchema", () => {
  it("accepts valid copy output (TikTok campaign)", () => {
    const result = CopyOutputSchema.safeParse(VALID_COPY_OUTPUT);
    expect(result.success).toBe(true);
  });

  it("rejects when caseStudy is missing", () => {
    const result = CopyOutputSchema.safeParse({
      nurturingEmail: VALID_COPY_OUTPUT.nurturingEmail,
    });
    expect(result.success).toBe(false);
  });

  it("rejects when nurturingEmail is missing", () => {
    const result = CopyOutputSchema.safeParse({
      caseStudy: VALID_COPY_OUTPUT.caseStudy,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid slug format (uppercase)", () => {
    const result = CopyOutputSchema.safeParse({
      ...VALID_COPY_OUTPUT,
      caseStudy: {
        ...VALID_COPY_OUTPUT.caseStudy,
        slug: "TikTok-Video",
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid slug format (special chars)", () => {
    const result = CopyOutputSchema.safeParse({
      ...VALID_COPY_OUTPUT,
      caseStudy: {
        ...VALID_COPY_OUTPUT.caseStudy,
        slug: "tiktok_video!",
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid category value", () => {
    const result = CopyOutputSchema.safeParse({
      ...VALID_COPY_OUTPUT,
      caseStudy: {
        ...VALID_COPY_OUTPUT.caseStudy,
        category: "Branding",
      },
    });
    expect(result.success).toBe(false);
  });

  it("accepts all 5 valid categories", () => {
    const categories = ["Video & Social", "Graphic Design", "Event", "Multilingual", "Out-of-Home"];
    for (const category of categories) {
      const result = CopyOutputSchema.safeParse({
        ...VALID_COPY_OUTPUT,
        caseStudy: {
          ...VALID_COPY_OUTPUT.caseStudy,
          category,
        },
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects stats with 0 items", () => {
    const result = CopyOutputSchema.safeParse({
      ...VALID_COPY_OUTPUT,
      caseStudy: {
        ...VALID_COPY_OUTPUT.caseStudy,
        stats: [],
      },
    });
    expect(result.success).toBe(false);
  });

  it("accepts stats with 1-5 items (flexible array)", () => {
    const result2 = CopyOutputSchema.safeParse({
      ...VALID_COPY_OUTPUT,
      caseStudy: {
        ...VALID_COPY_OUTPUT.caseStudy,
        stats: [
          { label: "Videos", value: "1,500+" },
          { label: "Cost", value: "$20" },
        ],
      },
    });
    expect(result2.success).toBe(true);

    const result4 = CopyOutputSchema.safeParse({
      ...VALID_COPY_OUTPUT,
      caseStudy: {
        ...VALID_COPY_OUTPUT.caseStudy,
        stats: [
          { label: "A", value: "1" },
          { label: "B", value: "2" },
          { label: "C", value: "3" },
          { label: "D", value: "4" },
        ],
      },
    });
    expect(result4.success).toBe(true);
  });

  it("rejects metaDescription longer than 160 chars", () => {
    const result = CopyOutputSchema.safeParse({
      ...VALID_COPY_OUTPUT,
      caseStudy: {
        ...VALID_COPY_OUTPUT.caseStudy,
        metaDescription: "A".repeat(161),
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects metaDescription shorter than 50 chars", () => {
    const result = CopyOutputSchema.safeParse({
      ...VALID_COPY_OUTPUT,
      caseStudy: {
        ...VALID_COPY_OUTPUT.caseStudy,
        metaDescription: "Too short",
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects nurturing email subject longer than 60 chars", () => {
    const result = CopyOutputSchema.safeParse({
      ...VALID_COPY_OUTPUT,
      nurturingEmail: {
        ...VALID_COPY_OUTPUT.nurturingEmail,
        subject: "A".repeat(61),
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects nurturing email body shorter than 10 chars", () => {
    const result = CopyOutputSchema.safeParse({
      ...VALID_COPY_OUTPUT,
      nurturingEmail: {
        ...VALID_COPY_OUTPUT.nurturingEmail,
        body: "Short",
      },
    });
    expect(result.success).toBe(false);
  });
});

describe("SocialOutputSchema", () => {
  it("accepts valid social output", () => {
    const result = SocialOutputSchema.safeParse(VALID_SOCIAL_OUTPUT);
    expect(result.success).toBe(true);
  });

  it("rejects missing linkedInPost", () => {
    const result = SocialOutputSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects linkedInPost with empty hook", () => {
    const result = SocialOutputSchema.safeParse({
      linkedInPost: {
        ...VALID_SOCIAL_OUTPUT.linkedInPost,
        hook: "",
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects linkedInPost with body < 10 chars", () => {
    const result = SocialOutputSchema.safeParse({
      linkedInPost: {
        ...VALID_SOCIAL_OUTPUT.linkedInPost,
        body: "Short",
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-number charCount", () => {
    const result = SocialOutputSchema.safeParse({
      linkedInPost: {
        ...VALID_SOCIAL_OUTPUT.linkedInPost,
        charCount: "487",
      },
    });
    expect(result.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Builder function tests
// ═══════════════════════════════════════════════════════════════════════════

describe("buildStrategyInput()", () => {
  it("includes client name and project data for TikTok", () => {
    const input = buildStrategyInput(TIKTOK_CANDIDATE);
    expect(input).toContain("TikTok");
    expect(input).toContain("Social Video Campaign");
    expect(input).toContain("Video Production");
    expect(input).toContain("482"); // asset count
    expect(input).toContain("92"); // score
  });

  it("formats amount with euro sign for Sony", () => {
    const input = buildStrategyInput(SONY_CANDIDATE);
    expect(input).toContain("Sony");
    expect(input).toContain("150"); // amount
    // Check it contains the euro formatting
    expect(input).toMatch(/€\d/);
  });

  it("formats GEODIS amount correctly", () => {
    const input = buildStrategyInput(GEODIS_CANDIDATE);
    expect(input).toContain("GEODIS");
    expect(input).toContain("8,500"); // formatted with comma
    expect(input).toContain("5700"); // asset count (not formatted — it's a number)
  });

  it("handles null fields gracefully (minimal candidate)", () => {
    const input = buildStrategyInput(MINIMAL_CANDIDATE);
    expect(input).toContain("Acme Corp");
    expect(input).toContain("Untitled project"); // null projectName fallback
    expect(input).toContain("Unknown"); // null projectType fallback
    expect(input).toContain("Not specified"); // null amount fallback
    expect(input).toContain('"assetCount": 0'); // null → 0
  });

  it("formats date as YYYY-MM-DD", () => {
    const input = buildStrategyInput(TIKTOK_CANDIDATE);
    expect(input).toContain("2025-09-15");
  });

  it("shows 'Unknown' for null completedAt date", () => {
    const input = buildStrategyInput(MINIMAL_CANDIDATE);
    expect(input).toContain('"completedAt": "Unknown"');
  });

  it("includes score breakdown object", () => {
    const input = buildStrategyInput(TIKTOK_CANDIDATE);
    expect(input).toContain("clientPrestige");
    expect(input).toContain("narrativePotential");
  });

  it("returns valid JSON within the message", () => {
    const input = buildStrategyInput(TIKTOK_CANDIDATE);
    // Extract the JSON portion — it's between the prompt text and the closing instruction
    const jsonMatch = input.match(/\{[\s\S]*\}/);
    expect(jsonMatch).not.toBeNull();
    expect(() => JSON.parse(jsonMatch![0])).not.toThrow();
  });
});

describe("buildCopyInput()", () => {
  it("includes both project data and strategy", () => {
    const input = buildCopyInput(TIKTOK_CANDIDATE, VALID_STRATEGY_OUTPUT);
    expect(input).toContain("TikTok");
    expect(input).toContain("CREATIVE STRATEGY:");
    expect(input).toContain(VALID_STRATEGY_OUTPUT.angle);
  });

  it("suggests correct slug format for TikTok", () => {
    const input = buildCopyInput(TIKTOK_CANDIDATE, VALID_STRATEGY_OUTPUT);
    expect(input).toContain("tiktok-video-production");
  });

  it("suggests correct slug format for GEODIS (Presentation → presentation)", () => {
    const input = buildCopyInput(GEODIS_CANDIDATE, VALID_STRATEGY_OUTPUT);
    expect(input).toContain("geodis-presentation");
  });

  it("handles null projectType in slug (null → 'Unknown' → 'unknown')", () => {
    const input = buildCopyInput(MINIMAL_CANDIDATE, VALID_STRATEGY_OUTPUT);
    // The buildCopyInput uses (data.projectType || "project") but projectType null
    // is mapped to "Unknown" in data object, so || "project" never triggers.
    // Actual slug: "acme-corp-unknown"
    expect(input).toContain("acme-corp-unknown");
  });

  it("includes category mapping instructions", () => {
    const input = buildCopyInput(SONY_CANDIDATE, VALID_STRATEGY_OUTPUT);
    expect(input).toContain("Graphic Design");
    expect(input).toContain("Video & Social");
  });

  it("includes strategy emotional hook", () => {
    const input = buildCopyInput(TIKTOK_CANDIDATE, VALID_STRATEGY_OUTPUT);
    expect(input).toContain(VALID_STRATEGY_OUTPUT.emotionalHook);
  });
});

describe("buildSocialInput()", () => {
  it("includes project data, strategy, AND case study copy", () => {
    const input = buildSocialInput(TIKTOK_CANDIDATE, VALID_STRATEGY_OUTPUT, VALID_COPY_OUTPUT);
    expect(input).toContain("TikTok");
    expect(input).toContain("CREATIVE STRATEGY:");
    expect(input).toContain("CASE STUDY:");
    expect(input).toContain(VALID_COPY_OUTPUT.caseStudy.headline);
  });

  it("includes amount for cost comparison context", () => {
    const input = buildSocialInput(TIKTOK_CANDIDATE, VALID_STRATEGY_OUTPUT, VALID_COPY_OUTPUT);
    expect(input).toMatch(/€[\d,]+/);
  });

  it("includes asset count for volume proof", () => {
    const input = buildSocialInput(GEODIS_CANDIDATE, VALID_STRATEGY_OUTPUT, VALID_COPY_OUTPUT);
    expect(input).toContain("5700");
  });

  it("handles null amount (shows 'Not specified')", () => {
    const input = buildSocialInput(MINIMAL_CANDIDATE, VALID_STRATEGY_OUTPUT, VALID_COPY_OUTPUT);
    expect(input).toContain("Not specified");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Adversarial data tests
// ═══════════════════════════════════════════════════════════════════════════

describe("Adversarial inputs — schema robustness", () => {
  it("rejects XSS payload in client name (schema accepts but should be escaped at render)", () => {
    // The schema accepts any string — XSS protection is at the render layer (React escapes by default)
    // But the slug regex would catch special chars
    const result = CopyOutputSchema.safeParse({
      ...VALID_COPY_OUTPUT,
      caseStudy: {
        ...VALID_COPY_OUTPUT.caseStudy,
        slug: '<script>alert("xss")</script>',
      },
    });
    expect(result.success).toBe(false); // slug regex rejects
  });

  it("rejects slug with consecutive hyphens", () => {
    const result = CopyOutputSchema.safeParse({
      ...VALID_COPY_OUTPUT,
      caseStudy: {
        ...VALID_COPY_OUTPUT.caseStudy,
        slug: "tiktok--video",
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects slug starting with hyphen", () => {
    const result = CopyOutputSchema.safeParse({
      ...VALID_COPY_OUTPUT,
      caseStudy: {
        ...VALID_COPY_OUTPUT.caseStudy,
        slug: "-tiktok-video",
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects slug ending with hyphen", () => {
    const result = CopyOutputSchema.safeParse({
      ...VALID_COPY_OUTPUT,
      caseStudy: {
        ...VALID_COPY_OUTPUT.caseStudy,
        slug: "tiktok-video-",
      },
    });
    expect(result.success).toBe(false);
  });

  it("handles unicode client names in builder without crash", () => {
    const candidate = {
      ...TIKTOK_CANDIDATE,
      clientName: "L'Oréal Méditerranée",
      projectName: "Campagne été — bannières 4K",
    };
    const input = buildStrategyInput(candidate);
    expect(input).toContain("L'Oréal Méditerranée");
    expect(input).toContain("Campagne été");
  });

  it("handles emoji in project name", () => {
    const candidate = {
      ...TIKTOK_CANDIDATE,
      projectName: "Summer Campaign 🏖️ — 500 videos",
    };
    const input = buildStrategyInput(candidate);
    expect(input).toContain("Summer Campaign");
  });

  it("handles zero amount correctly", () => {
    const candidate = {
      ...TIKTOK_CANDIDATE,
      projectAmount: "0",
    };
    const input = buildStrategyInput(candidate);
    expect(input).toContain("€0");
  });

  it("handles very large amount", () => {
    const candidate = {
      ...TIKTOK_CANDIDATE,
      projectAmount: "999999.99",
    };
    const input = buildStrategyInput(candidate);
    expect(input).toContain("999,999.99");
  });
});
