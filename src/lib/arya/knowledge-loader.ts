// ─── Client Knowledge Loader ────────────────────────────────────────────────
// Fetches structured client knowledge from DB and builds prompt blocks
// for injection into Arya's system prompts. Called before every client-facing
// content generation (briefs, emails, reviews, quotes).
//
// Hierarchy: client-level < division-level < contact-level
// The most specific knowledge wins in case of contradiction.

import { db } from "@/lib/db";
import {
  clientKnowledge,
  clients,
  type ClientKnowledge,
} from "@/lib/db/schema";
import { eq, and, isNull, sql, SQL, asc, desc } from "drizzle-orm";

// ─── Category display mapping ────────────────────────────────────────────

const CATEGORY_SECTIONS: Record<string, { title: string; categories: string[] }> = {
  toneAndComm: {
    title: "Tone & Communication",
    categories: ["tone"],
  },
  prefsAndGuidelines: {
    title: "Preferences & Guidelines",
    categories: ["preference", "guideline"],
  },
  positiveFeedback: {
    title: "What Works (Positive Feedback)",
    categories: ["positive_feedback"],
  },
  improvement: {
    title: "What to Improve",
    categories: ["improvement"],
  },
  workflow: {
    title: "Workflow",
    categories: ["workflow"],
  },
};

// ─── Data access functions ───────────────────────────────────────────────

/**
 * Fetch all active knowledge entries for a client by name.
 */
export async function getClientKnowledge(
  clientName: string
): Promise<ClientKnowledge[]> {
  try {
    const [client] = await db
      .select({ id: clients.id })
      .from(clients)
      .where(eq(clients.name, clientName))
      .limit(1);

    if (!client) return [];

    return db
      .select()
      .from(clientKnowledge)
      .where(
        and(
          eq(clientKnowledge.clientId, client.id),
          eq(clientKnowledge.isActive, true)
        )
      )
      .orderBy(asc(clientKnowledge.category), desc(clientKnowledge.createdAt));
  } catch (error) {
    console.error("[Knowledge Loader] getClientKnowledge failed:", error);
    return [];
  }
}

/**
 * Fetch all active knowledge entries by matching the email domain
 * against the client's primary contact email domain.
 */
export async function getClientKnowledgeByDomain(
  domain: string
): Promise<ClientKnowledge[]> {
  try {
    // Find client(s) whose primary_contact_email matches the domain
    const matchingClients = await db
      .select({ id: clients.id })
      .from(clients)
      .where(sql`${clients.primaryContactEmail} ILIKE ${"%" + "@" + domain}`);

    if (matchingClients.length === 0) return [];

    const clientIds = matchingClients.map((c) => c.id);

    return db
      .select()
      .from(clientKnowledge)
      .where(
        and(
          sql`${clientKnowledge.clientId} IN (${sql.join(
            clientIds.map((id) => sql`${id}`),
            sql`, `
          )})`,
          eq(clientKnowledge.isActive, true)
        )
      )
      .orderBy(asc(clientKnowledge.category), desc(clientKnowledge.createdAt));
  } catch (error) {
    console.error("[Knowledge Loader] getClientKnowledgeByDomain failed:", error);
    return [];
  }
}

/**
 * Fetch all active knowledge entries linked to a specific contact email.
 */
export async function getContactKnowledge(
  email: string
): Promise<ClientKnowledge[]> {
  try {
    return db
      .select()
      .from(clientKnowledge)
      .where(
        and(
          eq(clientKnowledge.contactEmail, email),
          eq(clientKnowledge.isActive, true)
        )
      )
      .orderBy(asc(clientKnowledge.category), desc(clientKnowledge.createdAt));
  } catch (error) {
    console.error("[Knowledge Loader] getContactKnowledge failed:", error);
    return [];
  }
}

// ─── Prompt builder ─────────────────────────────────────────────────────

interface BuildPromptOptions {
  division?: string;
  categories?: string[];
  clientId?: string; // If already resolved, skip name lookup
}

/**
 * Build a structured text block with all active client knowledge,
 * ready to inject into an Arya system prompt.
 *
 * Returns an empty string if no knowledge exists — safe to concatenate.
 *
 * Hierarchy: client-level < division-level < contact-level
 */
export async function buildClientKnowledgePrompt(
  clientName: string,
  contactEmail?: string,
  options: BuildPromptOptions = {}
): Promise<string> {
  try {
    // Resolve clientId
    let clientId = options.clientId;
    if (!clientId) {
      const [client] = await db
        .select({ id: clients.id })
        .from(clients)
        .where(eq(clients.name, clientName))
        .limit(1);

      if (!client) return "";
      clientId = client.id;
    }

    // Fetch all active knowledge for this client
    const conditions: SQL[] = [
      eq(clientKnowledge.clientId, clientId),
      eq(clientKnowledge.isActive, true),
    ];

    const allKnowledge = await db
      .select()
      .from(clientKnowledge)
      .where(and(...conditions))
      .orderBy(asc(clientKnowledge.category), desc(clientKnowledge.createdAt));

    if (allKnowledge.length === 0) return "";

    // Filter by categories if specified
    let filtered = allKnowledge;
    if (options.categories && options.categories.length > 0) {
      filtered = allKnowledge.filter((k) =>
        options.categories!.includes(k.category)
      );
    }

    if (filtered.length === 0) return "";

    // Split into levels
    const clientLevel = filtered.filter(
      (k) => !k.division && !k.contactEmail
    );
    const divisionLevel = filtered.filter(
      (k) =>
        k.division !== null &&
        !k.contactEmail &&
        (!options.division || k.division === options.division)
    );
    const contactLevel = contactEmail
      ? filtered.filter((k) => k.contactEmail === contactEmail)
      : [];

    // Build sections
    const lines: string[] = [
      `--- CLIENT KNOWLEDGE: ${clientName} ---`,
      "",
    ];

    for (const section of Object.values(CATEGORY_SECTIONS)) {
      const sectionEntries = [
        ...clientLevel.filter((k) => section.categories.includes(k.category)),
        ...divisionLevel.filter((k) => section.categories.includes(k.category)),
        ...contactLevel.filter((k) => section.categories.includes(k.category)),
      ];

      if (sectionEntries.length === 0) continue;

      lines.push(`## ${section.title}`);
      for (const entry of sectionEntries) {
        const levelTag = entry.contactEmail
          ? `CONTACT: ${entry.contactName ?? entry.contactEmail}`
          : entry.division
            ? `DIVISION: ${entry.division}`
            : "CLIENT-LEVEL";
        lines.push(`- [${levelTag}] ${entry.knowledgeText}`);
      }
      lines.push("");
    }

    // Add contact-specific summary if a contact was specified
    if (contactEmail && contactLevel.length > 0) {
      const contactName =
        contactLevel.find((k) => k.contactName)?.contactName ?? contactEmail;
      lines.push(`CONTACT — ${contactName} (${contactEmail}):`);
      for (const entry of contactLevel) {
        lines.push(`- [${entry.category}] ${entry.knowledgeText}`);
      }
      lines.push("");
    }

    lines.push(
      "PRIORITY RULE: Contact-level knowledge overrides division-level, which overrides client-level. If a contact prefers casual tone but the client default is formal, use casual for this contact."
    );
    lines.push("");
    lines.push("--- END CLIENT KNOWLEDGE ---");

    return lines.join("\n");
  } catch (error) {
    console.error("[Knowledge Loader] buildClientKnowledgePrompt failed:", error);
    return "";
  }
}
