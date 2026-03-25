import { z } from "zod";

// ─── Asset types ────────────────────────────────────────────────────────────

export const ASSET_TYPES = [
  "banner",
  "social-post",
  "presentation",
  "poster",
  "logo-variation",
  "moodboard",
] as const;

export type AssetType = (typeof ASSET_TYPES)[number];

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  banner: "Banner",
  "social-post": "Social Post",
  presentation: "Presentation",
  poster: "Poster",
  "logo-variation": "Logo Variation",
  moodboard: "Moodboard",
};

// ─── Styles ─────────────────────────────────────────────────────────────────

export const STYLES = [
  "modern",
  "classic",
  "minimalist",
  "bold",
  "playful",
] as const;

export type DesignStyle = (typeof STYLES)[number];

export const STYLE_LABELS: Record<DesignStyle, string> = {
  modern: "Modern",
  classic: "Classic",
  minimalist: "Minimalist",
  bold: "Bold",
  playful: "Playful",
};

// ─── Platforms ──────────────────────────────────────────────────────────────

export const PLATFORMS = ["web", "print", "social"] as const;

export type DesignPlatform = (typeof PLATFORMS)[number];

export const PLATFORM_LABELS: Record<DesignPlatform, string> = {
  web: "Web",
  print: "Print",
  social: "Social Media",
};

// ─── Dimension presets ──────────────────────────────────────────────────────

export const DIMENSION_PRESETS = [
  { label: "Web Banner (1920x1080)", value: "1920x1080" },
  { label: "Social Square (1080x1080)", value: "1080x1080" },
  { label: "LinkedIn Post (1200x627)", value: "1200x627" },
  { label: "Story / Reel (1080x1920)", value: "1080x1920" },
  { label: "A4 Print (2480x3508)", value: "2480x3508" },
  { label: "Custom", value: "custom" },
] as const;

// ─── Generate request ───────────────────────────────────────────────────────

export const designerGenerateRequestSchema = z.object({
  clientId: z.string().uuid("Invalid client ID"),
  assetType: z.enum(ASSET_TYPES, {
    message: "Invalid asset type",
  }),
  dimensions: z
    .string()
    .min(1, "Dimensions are required")
    .regex(
      /^\d{2,5}x\d{2,5}$/,
      "Dimensions must be in WxH format (e.g. 1920x1080)"
    ),
  quantity: z.coerce
    .number()
    .int()
    .min(1, "At least 1 variation required")
    .max(6, "Maximum 6 variations"),
  briefDescription: z
    .string()
    .min(10, "Brief must be at least 10 characters")
    .max(5000, "Brief is too long (max 5,000 characters)"),
  style: z.enum(STYLES, {
    message: "Invalid style",
  }),
  platform: z.enum(PLATFORMS, {
    message: "Invalid platform",
  }),
});

export type DesignerGenerateRequestInput = z.infer<
  typeof designerGenerateRequestSchema
>;

// ─── Claude designer response ───────────────────────────────────────────────

const technicalSpecsSchema = z.object({
  dimensions: z.string(),
  format: z.string(),
  resolution: z.string(),
  colorSpace: z.string(),
  safeZone: z.string(),
});

const brandElementsSchema = z.object({
  primaryColor: z.string(),
  secondaryColors: z.string(),
  font: z.string(),
  logoPlacement: z.string(),
});

const creativeBriefSchema = z.object({
  projectTitle: z.string(),
  objective: z.string(),
  targetAudience: z.string(),
  keyMessage: z.string(),
  toneAndMood: z.string(),
  technicalSpecs: technicalSpecsSchema,
  brandElements: brandElementsSchema,
  compositionNotes: z.string(),
  references: z.array(z.string()),
});

const imagePromptSchema = z.object({
  promptIndex: z.number(),
  title: z.string(),
  prompt: z.string(),
  negativePrompt: z.string(),
  platform: z.string(),
  aspectRatio: z.string(),
});

const colorEntrySchema = z.object({
  hex: z.string(),
  name: z.string(),
  usage: z.string(),
});

const colorPaletteSchema = z.object({
  primary: colorEntrySchema,
  secondary: z.array(colorEntrySchema),
  accent: colorEntrySchema,
  background: colorEntrySchema,
  text: colorEntrySchema,
});

const typographyHierarchySchema = z.object({
  level: z.string(),
  weight: z.string(),
  sizeRange: z.string(),
});

const typographyRecommendationsSchema = z.object({
  primaryFont: z.string(),
  secondaryFont: z.string(),
  hierarchy: z.array(typographyHierarchySchema),
});

export const designerResponseSchema = z.object({
  creativeBrief: creativeBriefSchema,
  imagePrompts: z.array(imagePromptSchema),
  colorPalette: colorPaletteSchema,
  typographyRecommendations: typographyRecommendationsSchema,
  notes: z.array(z.string()),
});

export type DesignerResponse = z.infer<typeof designerResponseSchema>;
export type CreativeBrief = z.infer<typeof creativeBriefSchema>;
export type ImagePrompt = z.infer<typeof imagePromptSchema>;
export type ColorPalette = z.infer<typeof colorPaletteSchema>;
export type ColorEntry = z.infer<typeof colorEntrySchema>;
export type TypographyRecommendations = z.infer<
  typeof typographyRecommendationsSchema
>;

// ─── History request ────────────────────────────────────────────────────────

export const designerHistorySchema = z.object({
  clientId: z.string().uuid("Invalid client ID").optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type DesignerHistoryInput = z.infer<typeof designerHistorySchema>;
