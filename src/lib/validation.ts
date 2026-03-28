import { z } from "zod";

/**
 * Contact form validation schema.
 * Shared between client (react-hook-form) and server (API route).
 * Field labels, options, and error messages sourced from:
 * - docs/product/functional-specs.md (US-103, BR-103-1)
 * - docs/copy/brand-voice.md (Section 4.3, 4.5)
 * - docs/copy/ux-writing-guide.md (Section 1)
 */

export const COMPANY_SIZE_OPTIONS = [
  "500M\u20AC+",
  "100\u2013500M\u20AC",
  "Under 100M\u20AC",
] as const;

export const ATTRIBUTION_OPTIONS = [
  "Referral",
  "LinkedIn",
  "Search",
  "Other",
] as const;

export const ACCEPTED_FILE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/jpeg",
  "image/png",
  "application/zip",
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const contactFormSchema = z.object({
  name: z
    .string()
    .min(1, "This field is required.")
    .max(100, "Maximum 100 characters."),
  company: z
    .string()
    .min(1, "This field is required.")
    .max(200, "Maximum 200 characters."),
  email: z
    .string()
    .min(1, "This field is required.")
    .email("Check that email address \u2014 it doesn\u2019t look right."),
  message: z
    .string()
    .min(1, "This field is required.")
    .min(10, "Tell us a bit more \u2014 at least 10 characters.")
    .max(5000, "Maximum 5,000 characters."),
  companySize: z.enum(COMPANY_SIZE_OPTIONS, {
    error: "This field is required.",
  }),
  attribution: z.enum(ATTRIBUTION_OPTIONS).optional(),
  honeypot: z.string().max(0).optional(),
});

/** Schema for server-side validation (no file — file handled separately) */
export const contactFormServerSchema = contactFormSchema;

export type ContactFormData = z.infer<typeof contactFormSchema>;
