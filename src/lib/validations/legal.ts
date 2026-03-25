import { z } from "zod";

// ─── Contract types ────────────────────────────────────────────────────────

export const CONTRACT_TYPES = ["SOW", "NDA", "UGC", "Freelance"] as const;

export type ContractType = (typeof CONTRACT_TYPES)[number];

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  SOW: "Statement of Work",
  NDA: "Non-Disclosure Agreement",
  UGC: "UGC Creator Agreement",
  Freelance: "Freelance / Independent Contractor",
};

// ─── Currency ──────────────────────────────────────────────────────────────

export const CURRENCIES = ["EUR", "USD", "GBP"] as const;

export type Currency = (typeof CURRENCIES)[number];

// ─── Generate contract request ─────────────────────────────────────────────

export const generateContractSchema = z.object({
  clientId: z.string().uuid("Invalid client ID"),
  contractType: z.enum(CONTRACT_TYPES),
  projectDescription: z
    .string()
    .min(10, "Project description must be at least 10 characters"),
  amount: z.number().positive("Amount must be positive"),
  currency: z.enum(CURRENCIES).default("EUR"),
  deliverables: z
    .string()
    .min(5, "Deliverables must be at least 5 characters"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  specialClauses: z.string().optional(),
  language: z.enum(["en", "fr"]).default("en"),
});

export type GenerateContractInput = z.infer<typeof generateContractSchema>;

// ─── Generate contract response ────────────────────────────────────────────

export type GenerateContractResponse = {
  contractText: string;
  contractType: ContractType;
  clientName: string;
  usage: { inputTokens: number; outputTokens: number };
  outputId: string;
};
