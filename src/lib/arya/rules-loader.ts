// ─── Arya Rules Loader ──────────────────────────────────────────────────────
// Fetches active rules from DB and builds a prompt block for injection
// into Arya's system prompts. Called before every content generation.

import { db } from "@/lib/db";
import { aryaRules, type AryaRule } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Fetch all active Arya rules from the database.
 * Returns an empty array if no rules exist or if DB is unreachable.
 */
export async function getActiveAryaRules(): Promise<AryaRule[]> {
  try {
    const rules = await db
      .select()
      .from(aryaRules)
      .where(eq(aryaRules.active, true));
    return rules;
  } catch (error) {
    console.error("[Arya Rules Loader] Failed to fetch rules:", error);
    return [];
  }
}

/**
 * Build a text block with all active Arya rules, formatted for injection
 * into the system prompt of any Arya protocol.
 *
 * Returns an empty string if no rules exist — safe to concatenate directly.
 *
 * Format:
 * ```
 * ARYA LEARNED RULES (from PM corrections):
 * - [tone] Always use "Hi" not "Hello" for Sony contacts
 * - [pricing] GEODIS has a 10% volume discount on batches > 50 assets
 * ```
 */
export async function buildAryaRulesPrompt(): Promise<string> {
  const rules = await getActiveAryaRules();

  if (rules.length === 0) return "";

  const lines = rules.map(
    (rule) => `- [${rule.category}] ${rule.ruleText}`
  );

  return [
    "",
    "ARYA LEARNED RULES (from PM corrections):",
    ...lines,
    "",
  ].join("\n");
}
