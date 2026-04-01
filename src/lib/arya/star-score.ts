// ─── Star Score Calculator ──────────────────────────────────────────────────
// Computes a 0-100 star score for closed projects based on 5 weighted criteria.
// See: docs/product/project-closure-star-pipeline-specs.md Section 2

// ─── Types ──────────────────────────────────────────────────────────────────

export interface StarCriteriaInput {
  /** Client name — matched against tier lists */
  clientName: string;
  /** Client annual revenue estimate in euros (optional, helps tier classification) */
  clientRevenueEstimate?: number;
  /** Array of measurable metrics from the project */
  metrics: string[];
  /** Whether the project involved innovation / new formats / exceptional scale */
  projectType: string;
  /** Number of markets or languages covered */
  marketsOrLanguages?: number;
  /** Description of the creative challenge or deliverable */
  creativeDescription?: string;
  /** Whether the project has a strong narrative arc */
  hasStrongNarrative?: boolean;
  /** Client verbatim / feedback quote */
  clientVerbatim?: string;
  /** Number of existing case studies in the same sector */
  existingCaseStudiesInSector: number;
  /** Whether this project demonstrates a new capability */
  demonstratesNewCapability?: boolean;
  /** Project sector */
  sector?: string;
}

export interface StarCriteriaScores {
  clientTier: number;       // 5-25
  measurableImpact: number; // 5-25
  creativeAmbition: number; // 5-20
  storytelling: number;     // 5-15
  portfolioGap: number;     // 5-15
}

export type StarStatus =
  | "STAR"
  | "STRONG_STORY_WEAK_ASSETS"
  | "NOTEWORTHY"
  | "STANDARD";

export interface StarScoreResult {
  scores: StarCriteriaScores;
  totalScore: number;
  starStatus: StarStatus;
  pipelineRecommendation: PipelineOutput[];
}

export type PipelineOutput =
  | "case_study"
  | "linkedin_post"
  | "presentation_slide"
  | "seo_signal";

// ─── Tier 1 Clients (Top-tier global brands) ───────────────────────────────

const TIER_1_CLIENTS = [
  "tiktok",
  "sony",
  "adidas",
  "l'oréal",
  "loreal",
  "l'oreal",
  "pernod ricard",
  "lego",
  "nike",
  "samsung",
  "apple",
  "google",
  "meta",
  "amazon",
  "microsoft",
  "coca-cola",
  "coca cola",
  "disney",
  "netflix",
];

// ─── Tier 2 Clients (Large enterprise) ─────────────────────────────────────

const TIER_2_CLIENTS = [
  "geodis",
  "air corsica",
  "pico",
  "france chimie",
  "bnp",
  "société générale",
  "societe generale",
  "axa",
  "total",
  "totalenergies",
  "sanofi",
  "renault",
  "peugeot",
  "carrefour",
  "danone",
  "lvmh",
  "kering",
  "hermès",
  "hermes",
  "chanel",
  "dior",
  "accor",
  "schneider",
  "alstom",
  "thales",
];

// ─── Score Computation ─────────────────────────────────────────────────────

/**
 * Score the Client Tier criterion (25% weight, 5-25 points).
 *
 * 25pts: Top-tier global brand (TikTok, Sony, Adidas, L'Oréal, etc.)
 * 20pts: Large enterprise (500M-5B revenue): GEODIS, Air Corsica, PICO, France Chimie
 * 15pts: Mid-market brand (100-500M revenue)
 * 10pts: Small brand (<100M revenue)
 * 5pts: Internal / unknown
 */
export function scoreClientTier(input: StarCriteriaInput): number {
  const normalised = input.clientName.toLowerCase().trim();

  if (TIER_1_CLIENTS.some((t) => normalised.includes(t))) {
    return 25;
  }

  if (TIER_2_CLIENTS.some((t) => normalised.includes(t))) {
    return 20;
  }

  if (input.clientRevenueEstimate !== undefined) {
    if (input.clientRevenueEstimate >= 500_000_000) return 20;
    if (input.clientRevenueEstimate >= 100_000_000) return 15;
    if (input.clientRevenueEstimate > 0) return 10;
  }

  // Default: small brand
  return 10;
}

/**
 * Score Measurable Impact (25% weight, 5-25 points).
 *
 * 25pts: 3+ metrics OR viral/exceptional result
 * 20pts: 2 metrics
 * 15pts: 1 metric available
 * 10pts: Qualitative only
 * 5pts: No metrics available
 */
export function scoreMeasurableImpact(input: StarCriteriaInput): number {
  const metricsCount = input.metrics.length;

  if (metricsCount >= 3) return 25;
  if (metricsCount === 2) return 20;
  if (metricsCount === 1) return 15;
  if (input.clientVerbatim && input.clientVerbatim.length > 0) return 10;
  return 5;
}

/**
 * Score Creative Ambition (20% weight, 5-20 points).
 *
 * 20pts: Exceptional scale, venue, or cultural moment
 * 15pts: Multi-market or multi-language campaign
 * 10pts: Multi-format campaign
 * 8pts: Standard deliverables (banners, social posts)
 * 5pts: Routine production (translations, resizes)
 */
export function scoreCreativeAmbition(input: StarCriteriaInput): number {
  const type = (input.projectType || "").toLowerCase();
  const desc = (input.creativeDescription || "").toLowerCase();
  const markets = input.marketsOrLanguages ?? 0;

  // Exceptional scale indicators
  const exceptionalKeywords = [
    "concert",
    "event",
    "cultural moment",
    "champs-élysées",
    "champs elysees",
    "stadium",
    "launch event",
    "global launch",
    "flagship",
  ];
  if (exceptionalKeywords.some((k) => type.includes(k) || desc.includes(k))) {
    return 20;
  }

  // Multi-market / multi-language
  if (markets >= 3) return 15;

  // Multi-format campaign
  const multiFormatKeywords = ["campaign", "multi-format", "multi format", "360"];
  if (multiFormatKeywords.some((k) => type.includes(k) || desc.includes(k))) {
    return 10;
  }

  // Standard deliverables
  const standardKeywords = ["banner", "social post", "social media", "post"];
  if (standardKeywords.some((k) => type.includes(k) || desc.includes(k))) {
    return 8;
  }

  // Routine production
  const routineKeywords = ["translation", "resize", "adaptation", "localisation", "localization"];
  if (routineKeywords.some((k) => type.includes(k) || desc.includes(k))) {
    return 5;
  }

  // Default to standard
  return 8;
}

/**
 * Score Storytelling Potential (15% weight, 5-15 points).
 *
 * 15pts: Jaw-dropping story (a fact that makes people stop scrolling)
 * 12pts: Strong narrative (unlimited revisions proof, same-day delivery)
 * 10pts: Two angles (speed + volume)
 * 8pts: Single angle (speed or price)
 * 5pts: No angle (pure production work)
 */
export function scoreStorytelling(input: StarCriteriaInput): number {
  const hasVerbatim = !!input.clientVerbatim && input.clientVerbatim.length > 20;
  const metricsCount = input.metrics.length;
  const hasNarrative = input.hasStrongNarrative === true;

  if (hasNarrative && metricsCount >= 2 && hasVerbatim) return 15;
  if (hasNarrative && (metricsCount >= 2 || hasVerbatim)) return 12;
  if (metricsCount >= 2 || (hasNarrative && metricsCount >= 1)) return 10;
  if (metricsCount >= 1 || hasVerbatim) return 8;
  return 5;
}

/**
 * Score Strategic Portfolio Gap (15% weight, 5-15 points).
 *
 * 15pts: Unique proof point with no equivalent in current portfolio
 * 12pts: New sector + new capability demonstrated
 * 10pts: Sector under-represented (0 existing case studies)
 * 8pts: Sector covered (1-2 existing)
 * 5pts: Sector already well-covered (3+ existing case studies)
 */
export function scorePortfolioGap(input: StarCriteriaInput): number {
  const existing = input.existingCaseStudiesInSector;
  const newCapability = input.demonstratesNewCapability === true;

  if (existing === 0 && newCapability) {
    return 15;
  }
  if (existing === 0) return 12;
  if (existing <= 2 && newCapability) return 10;
  if (existing <= 2) return 8;
  return 5;
}

// ─── Main Calculator ───────────────────────────────────────────────────────

/**
 * Compute the full Star Score for a project.
 *
 * @param input - Project data for scoring
 * @param caseStudyScore - Score from the case-study-generator (0-100), optional
 * @param overrides - Manual score overrides by admin
 * @returns StarScoreResult with breakdown, total, status, and pipeline recommendation
 */
export function calculateStarScore(
  input: StarCriteriaInput,
  caseStudyScore?: number,
  overrides?: Partial<StarCriteriaScores>
): StarScoreResult {
  // Compute individual scores
  const scores: StarCriteriaScores = {
    clientTier: overrides?.clientTier ?? scoreClientTier(input),
    measurableImpact: overrides?.measurableImpact ?? scoreMeasurableImpact(input),
    creativeAmbition: overrides?.creativeAmbition ?? scoreCreativeAmbition(input),
    storytelling: overrides?.storytelling ?? scoreStorytelling(input),
    portfolioGap: overrides?.portfolioGap ?? scorePortfolioGap(input),
  };

  // Clamp scores to valid ranges
  scores.clientTier = clamp(scores.clientTier, 5, 25);
  scores.measurableImpact = clamp(scores.measurableImpact, 5, 25);
  scores.creativeAmbition = clamp(scores.creativeAmbition, 5, 20);
  scores.storytelling = clamp(scores.storytelling, 5, 15);
  scores.portfolioGap = clamp(scores.portfolioGap, 5, 15);

  const totalScore =
    scores.clientTier +
    scores.measurableImpact +
    scores.creativeAmbition +
    scores.storytelling +
    scores.portfolioGap;

  // Determine star status
  const csScore = caseStudyScore ?? 0;
  let starStatus: StarStatus;
  let pipelineRecommendation: PipelineOutput[];

  if (totalScore >= 75 && csScore >= 70) {
    starStatus = "STAR";
    pipelineRecommendation = [
      "case_study",
      "linkedin_post",
      "presentation_slide",
      "seo_signal",
    ];
  } else if (totalScore >= 75 && csScore < 70) {
    starStatus = "STRONG_STORY_WEAK_ASSETS";
    pipelineRecommendation = ["linkedin_post"];
  } else if (totalScore >= 50) {
    starStatus = "NOTEWORTHY";
    pipelineRecommendation = [];
  } else {
    starStatus = "STANDARD";
    pipelineRecommendation = [];
  }

  return {
    scores,
    totalScore,
    starStatus,
    pipelineRecommendation,
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
