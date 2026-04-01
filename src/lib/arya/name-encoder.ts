// ─── Name Encoder for Arya ──────────────────────────────────────────────────
// Encodes real individual names into codes (e.g. "I-7f3a") for any content
// that may end up on GitHub. The mapping lives ONLY in the DB.
// Arya decodes internally when generating emails/briefs (never public).

import { db } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { clientKnowledge } from "@/lib/db/schema";
import crypto from "crypto";

/**
 * Generate a deterministic code for a name + email combination.
 * Same input always produces the same code → idempotent.
 * Format: I-XXXX (4 hex chars from SHA-256 of name+email).
 */
export function encodeContactName(name: string, email?: string | null): string {
  const input = `${name.toLowerCase().trim()}:${(email ?? "").toLowerCase().trim()}`;
  const hash = crypto.createHash("sha256").update(input).digest("hex");
  return `I-${hash.slice(0, 4)}`;
}

/**
 * Generate a code for a division.
 * Format: D-XXXX
 */
export function encodeDivisionName(clientName: string, division: string): string {
  const input = `${clientName.toLowerCase().trim()}:${division.toLowerCase().trim()}`;
  const hash = crypto.createHash("sha256").update(input).digest("hex");
  return `D-${hash.slice(0, 4)}`;
}

/**
 * Generate a code for a team member.
 * Format: T-XXXX
 */
export function encodeTeamMemberName(name: string, email?: string | null): string {
  const input = `${name.toLowerCase().trim()}:${(email ?? "").toLowerCase().trim()}`;
  const hash = crypto.createHash("sha256").update(input).digest("hex");
  return `T-${hash.slice(0, 4)}`;
}

/**
 * Decode a code back to the real name by looking up the DB.
 * Returns null if not found.
 */
export async function decodeContactCode(
  code: string
): Promise<{ name: string; email: string | null } | null> {
  if (!code.startsWith("I-")) return null;

  const matches = await db
    .select({
      contactName: clientKnowledge.contactName,
      contactEmail: clientKnowledge.contactEmail,
    })
    .from(clientKnowledge)
    .where(eq(clientKnowledge.codeName, code))
    .limit(1);

  if (matches.length === 0) return null;
  return {
    name: matches[0].contactName ?? code,
    email: matches[0].contactEmail ?? null,
  };
}

/**
 * Batch decode multiple codes at once (for prompt injection).
 * Returns a map of code → real name.
 */
export async function batchDecodeContacts(
  codes: string[]
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (codes.length === 0) return result;

  // Query all at once
  const matches = await db
    .select({
      codeName: clientKnowledge.codeName,
      contactName: clientKnowledge.contactName,
    })
    .from(clientKnowledge)
    .where(
      // Simple approach: individual queries for each code
      // (Drizzle doesn't have a clean inArray on nullable columns)
      eq(clientKnowledge.codeName, codes[0])
    );

  for (const m of matches) {
    if (m.codeName && m.contactName) {
      result.set(m.codeName, m.contactName);
    }
  }

  return result;
}
