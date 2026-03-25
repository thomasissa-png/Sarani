import { z } from "zod";

export const INDUSTRY_OPTIONS = [
  "tech",
  "luxe",
  "logistics",
  "entertainment",
  "fmcg",
  "aviation",
  "other",
] as const;

export const LANGUAGE_OPTIONS = ["FR", "EN", "IT", "ES", "DE"] as const;

export const STATUS_OPTIONS = ["active", "inactive", "prospect"] as const;

export const CONTRACT_TEMPLATE_OPTIONS = [
  "UGC",
  "SOW",
  "NDA",
  "other",
] as const;

export const clientFormSchema = z.object({
  // Bloc identité (required)
  name: z.string().min(1, "Client name is required").max(200),
  industry: z.enum(INDUSTRY_OPTIONS, { error: "Select an industry" }),
  status: z.enum(STATUS_OPTIONS).default("prospect"),
  primaryLanguage: z.enum(LANGUAGE_OPTIONS, {
    error: "Select a primary language",
  }),
  secondaryLanguages: z.array(z.enum(LANGUAGE_OPTIONS)).default([]),
  primaryContactName: z.string().max(200).optional().default(""),
  primaryContactEmail: z
    .string()
    .email("Invalid email")
    .optional()
    .or(z.literal("")),
  clickupProjectId: z.string().max(100).optional().default(""),

  // Bloc brand (optional)
  primaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color (e.g. #FF5500)")
    .optional()
    .or(z.literal("")),
  secondaryColors: z.string().max(500).optional().default(""),
  fontName: z.string().max(200).optional().default(""),
  brandTone: z.string().max(2000).optional().default(""),
  brandGuidelinesNotes: z.string().max(5000).optional().default(""),

  // Bloc traduction (optional)
  translationMemory: z.string().max(10000).optional().default(""),
  prohibitedTerms: z.string().max(5000).optional().default(""),

  // Bloc juridique (optional)
  legalEntityName: z.string().max(300).optional().default(""),
  legalCountry: z.string().max(100).optional().default(""),
  vatNumber: z.string().max(50).optional().default(""),
  signedFrameworkAgreement: z.boolean().default(false),
  preferredContractTemplate: z
    .enum(CONTRACT_TEMPLATE_OPTIONS)
    .optional()
    .or(z.literal("")),
});

export type ClientFormData = z.infer<typeof clientFormSchema>;
