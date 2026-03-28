// ─── Case Study Scoring Engine ─────────────────────────────────────────────
// Implements the 6-criterion scoring matrix from case-study-generator-specs.md §2
// Each project receives a score from 0-100 based on case study potential.

export interface ScoreBreakdown {
  clientName: number;
  amount: number;
  assets: number;
  projectType: number;
  recency: number;
  diversity: number;
}

export interface ScoringWeights {
  clientName: number; // default 25
  amount: number; // default 20
  assets: number; // default 20
  projectType: number; // default 15
  recency: number; // default 10
  diversity: number; // default 10
}

export interface ScoringConfig {
  weights: ScoringWeights;
  tier1Clients: string[];
  tier2Clients: string[];
  projectTypeScores: Record<string, number>;
  autoGenerateThreshold: number;
}

// ─── Default config (used until admin configures via DB) ───────────────────

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  weights: {
    clientName: 25,
    amount: 20,
    assets: 20,
    projectType: 15,
    recency: 10,
    diversity: 10,
  },
  tier1Clients: [
    "TikTok",
    "Sony",
    "Adidas",
    "L'Oréal",
    "Pernod Ricard",
    "LEGO",
    "IKEA",
    "Bose",
  ],
  tier2Clients: [
    "GEODIS",
    "PICO",
    "Air Corsica",
    "France Chimie",
    "Aristocrat",
    "Ubi",
    "Aujan",
    "CMC Markets",
    "Lamarck",
    "Crocs",
  ],
  projectTypeScores: {
    Campaign: 15,
    Rebranding: 15,
    "Video Production": 15,
    "Graphic Design": 10,
    Event: 10,
    Translation: 4,
    Presentation: 4,
  },
  autoGenerateThreshold: 70,
};

// ─── Scoring input ─────────────────────────────────────────────────────────

export interface ScoringInput {
  clientName: string;
  projectAmount: number | null; // in euros
  assetCount: number;
  projectType: string | null;
  completedAt: Date | null;
  /** Sectors already well-represented in published case studies */
  coveredSectors: string[];
  /** Sector of this project (derived from client or project type) */
  sector: string | null;
}

// ─── Score calculation ─────────────────────────────────────────────────────

export function calculateScore(
  input: ScoringInput,
  config: ScoringConfig = DEFAULT_SCORING_CONFIG
): { total: number; breakdown: ScoreBreakdown } {
  const breakdown: ScoreBreakdown = {
    clientName: scoreClientName(input.clientName, config),
    amount: scoreAmount(input.projectAmount, config.weights.amount),
    assets: scoreAssets(input.assetCount, config.weights.assets),
    projectType: scoreProjectType(input.projectType, config),
    recency: scoreRecency(input.completedAt, config.weights.recency),
    diversity: scoreDiversity(input.sector, input.coveredSectors, config.weights.diversity),
  };

  const total = Object.values(breakdown).reduce((sum, v) => sum + v, 0);
  return { total: Math.min(100, Math.max(0, total)), breakdown };
}

// ─── Individual criterion scorers ──────────────────────────────────────────

function scoreClientName(clientName: string, config: ScoringConfig): number {
  const normalized = clientName.trim().toLowerCase();
  if (config.tier1Clients.some((c) => c.toLowerCase() === normalized)) {
    return config.weights.clientName; // full score
  }
  if (config.tier2Clients.some((c) => c.toLowerCase() === normalized)) {
    return Math.round(config.weights.clientName * 0.6); // 60% of weight
  }
  return 0;
}

function scoreAmount(amount: number | null, maxWeight: number): number {
  if (amount === null || amount <= 0) return 0;
  if (amount > 10_000) return maxWeight;
  if (amount >= 5_000) return Math.round(maxWeight * 0.6);
  if (amount >= 1_000) return Math.round(maxWeight * 0.3);
  return 0;
}

function scoreAssets(assetCount: number, maxWeight: number): number {
  if (assetCount >= 10) return maxWeight;
  if (assetCount >= 3) return Math.round(maxWeight * 0.6);
  if (assetCount >= 1) return Math.round(maxWeight * 0.3);
  return 0;
}

function scoreProjectType(
  projectType: string | null,
  config: ScoringConfig
): number {
  if (!projectType) return 0;
  const score = config.projectTypeScores[projectType];
  if (score !== undefined) return score;
  // Fuzzy match on key
  const lower = projectType.toLowerCase();
  for (const [key, val] of Object.entries(config.projectTypeScores)) {
    if (key.toLowerCase().includes(lower) || lower.includes(key.toLowerCase())) {
      return val;
    }
  }
  return 0;
}

function scoreRecency(completedAt: Date | null, maxWeight: number): number {
  if (!completedAt) return 0;
  const monthsAgo =
    (Date.now() - completedAt.getTime()) / (1000 * 60 * 60 * 24 * 30);
  if (monthsAgo <= 6) return maxWeight;
  if (monthsAgo <= 18) return Math.round(maxWeight * 0.6);
  return Math.round(maxWeight * 0.2);
}

function scoreDiversity(
  sector: string | null,
  coveredSectors: string[],
  maxWeight: number
): number {
  if (!sector) return 0;
  const isCovered = coveredSectors.some(
    (s) => s.toLowerCase() === sector.toLowerCase()
  );
  return isCovered ? 0 : maxWeight;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Derive sector from client name — simple mapping for V1 */
export function deriveSector(clientName: string): string {
  const sectors: Record<string, string> = {
    tiktok: "Tech",
    sony: "Entertainment",
    adidas: "Fashion & Sport",
    "l'oréal": "Beauty",
    "pernod ricard": "Luxury & Spirits",
    lego: "Toys & Entertainment",
    ikea: "Retail & Home",
    bose: "Consumer Electronics",
    geodis: "Logistics",
    pico: "Tech",
    "air corsica": "Travel & Transport",
    "france chimie": "Industry",
    aristocrat: "Gaming",
    ubi: "Gaming",
    aujan: "FMCG",
    "cmc markets": "Finance",
    lamarck: "Real Estate",
    crocs: "Fashion & Sport",
  };
  return sectors[clientName.toLowerCase().trim()] ?? "Other";
}

/** Get list of sectors from existing published case studies */
export function getPublishedSectors(
  publishedClientNames: string[]
): string[] {
  const sectors = new Set<string>();
  for (const name of publishedClientNames) {
    sectors.add(deriveSector(name));
  }
  return Array.from(sectors);
}
