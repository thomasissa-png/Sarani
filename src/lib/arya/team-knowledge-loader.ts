// ─── Team Knowledge Loader ──────────────────────────────────────────────────
// Fetches structured knowledge about Sarani team members from DB and builds
// prompt blocks for injection into Arya's system prompts. Used for team
// assignment, workload balancing, and personalised instructions to each member.

import { db } from "@/lib/db";
import { teamKnowledge, type TeamKnowledge } from "@/lib/db/schema";
import { eq, and, SQL } from "drizzle-orm";

// ─── Category display mapping ────────────────────────────────────────────

const CATEGORY_SECTIONS: Record<string, { title: string; categories: string[] }> = {
  skills: {
    title: "Skills & Expertise",
    categories: ["skill", "tool", "language"],
  },
  workStyle: {
    title: "Work Style & Preferences",
    categories: ["preference", "style"],
  },
  speed: {
    title: "Speed & Availability",
    categories: ["speed", "availability"],
  },
  qualityNotes: {
    title: "Quality Notes",
    categories: ["quality_note"],
  },
};

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Fetch team knowledge entries, optionally filtered by member email.
 * Only returns active entries.
 */
export async function getTeamKnowledge(
  email?: string
): Promise<TeamKnowledge[]> {
  const conditions: SQL[] = [eq(teamKnowledge.isActive, true)];

  if (email) {
    conditions.push(eq(teamKnowledge.teamMemberEmail, email));
  }

  const rows = await db
    .select()
    .from(teamKnowledge)
    .where(and(...conditions));

  return rows;
}

/**
 * Build a text block about a specific team member, ready for prompt injection.
 * Groups knowledge by category section for readability.
 */
export async function buildTeamKnowledgePrompt(
  memberEmail: string
): Promise<string> {
  const entries = await getTeamKnowledge(memberEmail);

  if (entries.length === 0) {
    return `No team knowledge found for ${memberEmail}.`;
  }

  const memberName = entries[0].teamMemberName;
  const memberRole = entries[0].role;

  const lines: string[] = [
    `## Team Member: ${memberName}`,
    `Role: ${memberRole}`,
    `Email: ${memberEmail}`,
    "",
  ];

  // Group entries by category
  const entriesByCategory = new Map<string, TeamKnowledge[]>();
  for (const entry of entries) {
    const existing = entriesByCategory.get(entry.category) ?? [];
    existing.push(entry);
    entriesByCategory.set(entry.category, existing);
  }

  // Render each section
  for (const [, section] of Object.entries(CATEGORY_SECTIONS)) {
    const sectionEntries: TeamKnowledge[] = [];
    for (const cat of section.categories) {
      const catEntries = entriesByCategory.get(cat);
      if (catEntries) {
        sectionEntries.push(...catEntries);
        entriesByCategory.delete(cat);
      }
    }

    if (sectionEntries.length === 0) continue;

    lines.push(`### ${section.title}`);
    for (const entry of sectionEntries) {
      const confidence = entry.confidence !== "observed" ? ` [${entry.confidence}]` : "";
      lines.push(`- ${entry.knowledgeText}${confidence}`);
    }
    lines.push("");
  }

  // Render any uncategorised entries
  if (entriesByCategory.size > 0) {
    lines.push("### Other");
    for (const [, catEntries] of entriesByCategory) {
      for (const entry of catEntries) {
        const confidence = entry.confidence !== "observed" ? ` [${entry.confidence}]` : "";
        lines.push(`- ${entry.knowledgeText}${confidence}`);
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}
