import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromSession } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import { clients, clientKnowledge, teamKnowledge } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { graphFetch } from "@/lib/integrations/sharepoint";
import { stripHtml, isEmailConfigured } from "@/lib/integrations/email";
import { callClaudeJSON } from "@/lib/ai/claude";
import {
  KNOWLEDGE_EXTRACTOR_SYSTEM_PROMPT,
  buildExtractionUserMessage,
  type KnowledgeEntry,
  type KnowledgeExtractionResult,
} from "@/lib/ai/prompts/knowledge-extractor";

// ─── Validation ─────────────────────────────────────────────────────────────

const ScanParamsSchema = z.object({
  maxEmails: z.number().int().min(10).max(2000).default(500),
  olderThanDays: z.number().int().min(1).max(3650).default(365),
});

// ─── Constants ──────────────────────────────────────────────────────────────

const EMAIL_ADDRESS =
  process.env.MICROSOFT_EMAIL_ADDRESS || "team@sarani.studio";
const SARANI_DOMAINS = ["sarani.studio", "sarani.fr"];
const BATCH_SIZE = 20; // emails per LLM call
const PAGE_SIZE = 50; // emails per Graph API page

// ─── Types ──────────────────────────────────────────────────────────────────

interface GraphEmailMessage {
  id: string;
  subject: string;
  from: {
    emailAddress: {
      name: string;
      address: string;
    };
  };
  toRecipients: Array<{
    emailAddress: {
      name: string;
      address: string;
    };
  }>;
  receivedDateTime: string;
  body: {
    contentType: string;
    content: string;
  };
  conversationId: string;
}

interface GraphEmailResponse {
  value: GraphEmailMessage[];
  "@odata.nextLink"?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getDomain(email: string): string {
  return email.split("@")[1]?.toLowerCase() ?? "";
}

function isSaraniDomain(domain: string): boolean {
  return SARANI_DOMAINS.some(
    (d) => domain === d || domain.endsWith(`.${d}`)
  );
}

/**
 * Find a client in the DB by matching email domain against primaryContactEmail.
 * Returns null if no match found.
 */
async function findClientByDomain(
  domain: string
): Promise<{ id: string; name: string } | null> {
  const matches = await db
    .select({ id: clients.id, name: clients.name })
    .from(clients)
    .where(sql`${clients.primaryContactEmail} ILIKE ${"%" + "@" + domain}`)
    .limit(1);

  return matches[0] ?? null;
}

/**
 * Check if a knowledge entry already exists (deduplication by text similarity).
 */
async function knowledgeExists(
  clientId: string,
  text: string,
  category: string
): Promise<boolean> {
  const existing = await db
    .select({ id: clientKnowledge.id })
    .from(clientKnowledge)
    .where(
      and(
        eq(clientKnowledge.clientId, clientId),
        eq(clientKnowledge.category, category),
        eq(clientKnowledge.knowledgeText, text)
      )
    )
    .limit(1);

  return existing.length > 0;
}

/**
 * Check if a team knowledge entry already exists.
 */
async function teamKnowledgeExists(
  email: string,
  text: string,
  category: string
): Promise<boolean> {
  const existing = await db
    .select({ id: teamKnowledge.id })
    .from(teamKnowledge)
    .where(
      and(
        eq(teamKnowledge.teamMemberEmail, email),
        eq(teamKnowledge.category, category),
        eq(teamKnowledge.knowledgeText, text)
      )
    )
    .limit(1);

  return existing.length > 0;
}

// ─── POST /api/admin/arya/scan-email-history ────────────────────────────────

export async function POST(request: NextRequest) {
  // Auth check
  const user = await getUserFromSession();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 1 request per 5 minutes
  if (!checkRateLimit("scan-email-history", 1, 5 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Rate limited. Please wait 5 minutes between scans." },
      { status: 429, headers: { "Retry-After": "300" } }
    );
  }

  // Check email config
  if (!isEmailConfigured()) {
    return NextResponse.json(
      { error: "Microsoft Graph email integration not configured" },
      { status: 503 }
    );
  }

  // Parse params
  let params: z.infer<typeof ScanParamsSchema>;
  try {
    const body = await request.json();
    const parsed = ScanParamsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid parameters", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    params = parsed.data;
  } catch {
    // Default params if no body
    params = { maxEmails: 500, olderThanDays: 365 };
  }

  const { maxEmails, olderThanDays } = params;

  // Build date filter
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
  const cutoffIso = cutoffDate.toISOString();

  let emailsScanned = 0;
  let clientsDetected = 0;
  let knowledgeEntriesCreated = 0;
  let knowledgeEntriesUpdated = 0;
  let llmErrors = 0;

  try {
    // ── Step 1: Fetch emails from Graph API with pagination ──────────────

    const allEmails: GraphEmailMessage[] = [];

    const selectFields =
      "id,subject,from,toRecipients,receivedDateTime,body,conversationId";
    const filter = `receivedDateTime ge ${cutoffIso}`;
    const initialQuery = [
      `$filter=${filter}`,
      "$orderby=receivedDateTime desc",
      `$top=${PAGE_SIZE}`,
      `$select=${selectFields}`,
    ].join("&");

    let nextLink: string | null =
      `/users/${encodeURIComponent(EMAIL_ADDRESS)}/messages?${initialQuery}`;

    while (nextLink && allEmails.length < maxEmails) {
      try {
        const page: GraphEmailResponse = await graphFetch<GraphEmailResponse>(nextLink);
        if (!page?.value || !Array.isArray(page.value)) break;
        allEmails.push(...page.value);
        nextLink = page["@odata.nextLink"] ?? null;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Graph API error";
        // Token expired or rate limited — stop pagination gracefully
        if (
          message.includes("401") ||
          message.includes("403") ||
          message.includes("429")
        ) {
          console.error(
            "[Scan Email History] Graph API auth/rate error, stopping pagination:",
            message
          );
          break;
        }
        throw error;
      }
    }

    // Trim to maxEmails
    const emails = allEmails.slice(0, maxEmails);
    emailsScanned = emails.length;

    // ── Step 2: Group by external domain ─────────────────────────────────

    const domainGroups = new Map<string, GraphEmailMessage[]>();

    for (const email of emails) {
      const fromDomain = getDomain(email.from.emailAddress.address);

      // Determine the "client" domain: if from Sarani, look at toRecipients
      let clientDomain: string | null = null;

      if (isSaraniDomain(fromDomain)) {
        // Outbound email — find the external recipient
        const externalRecipient = email.toRecipients?.find(
          (r) => !isSaraniDomain(getDomain(r.emailAddress.address))
        );
        if (externalRecipient) {
          clientDomain = getDomain(externalRecipient.emailAddress.address);
        }
      } else {
        // Inbound email — sender is the client
        clientDomain = fromDomain;
      }

      if (!clientDomain) continue;

      const existing = domainGroups.get(clientDomain) ?? [];
      existing.push(email);
      domainGroups.set(clientDomain, existing);
    }

    clientsDetected = domainGroups.size;

    // ── Step 3: For each domain, extract knowledge in batches ────────────

    for (const [domain, domainEmails] of domainGroups) {
      // Find matching client in DB
      const client = await findClientByDomain(domain);

      // Process in batches of BATCH_SIZE
      for (
        let batchStart = 0;
        batchStart < domainEmails.length;
        batchStart += BATCH_SIZE
      ) {
        const batch = domainEmails.slice(batchStart, batchStart + BATCH_SIZE);

        const emailBatch = batch.map((e) => ({
          from: `${e.from.emailAddress.name} <${e.from.emailAddress.address}>`,
          to: (e.toRecipients ?? []).map(
            (r) => `${r.emailAddress.name} <${r.emailAddress.address}>`
          ),
          subject: e.subject ?? "(no subject)",
          date: e.receivedDateTime,
          body: stripHtml(e.body?.content ?? "").slice(0, 1500),
        }));

        const userMessage = buildExtractionUserMessage(domain, emailBatch);

        try {
          const { data } = await callClaudeJSON<KnowledgeExtractionResult>({
            systemPrompt: KNOWLEDGE_EXTRACTOR_SYSTEM_PROMPT,
            userMessage,
            model: "claude-haiku-4-5-20251001",
            maxTokens: 3000,
            timeout: 30_000,
          });

          if (!data.entries || !Array.isArray(data.entries)) continue;

          // Filter to high/medium confidence only
          const validEntries = data.entries.filter(
            (e: KnowledgeEntry) =>
              e.confidence === "high" || e.confidence === "medium"
          );

          // ── Step 4: Upsert knowledge entries ──────────────────────────

          for (const entry of validEntries) {
            try {
              if (entry.scope === "team" && entry.teamMemberEmail) {
                // Team knowledge
                const exists = await teamKnowledgeExists(
                  entry.teamMemberEmail,
                  entry.knowledgeText,
                  entry.category
                );

                if (!exists) {
                  await db.insert(teamKnowledge).values({
                    teamMemberEmail: entry.teamMemberEmail,
                    teamMemberName: entry.entityName,
                    role: "unknown", // Will be refined by subsequent scans
                    category: entry.category,
                    knowledgeText: entry.knowledgeText,
                    source: `email-scan:${domain}`,
                    confidence:
                      entry.confidence === "high" ? "observed" : "hypothesized",
                    isActive: true,
                  });
                  knowledgeEntriesCreated++;
                } else {
                  knowledgeEntriesUpdated++;
                }
              } else if (client) {
                // Client/division/individual knowledge — need a clientId
                const exists = await knowledgeExists(
                  client.id,
                  entry.knowledgeText,
                  entry.category
                );

                if (!exists) {
                  await db.insert(clientKnowledge).values({
                    clientId: client.id,
                    division: entry.division ?? null,
                    contactName:
                      entry.scope === "individual"
                        ? entry.entityName
                        : null,
                    contactEmail: entry.contactEmail ?? null,
                    category: entry.category,
                    knowledgeText: entry.knowledgeText,
                    source: `email-scan:${domain}`,
                    confidence:
                      entry.confidence === "high" ? "observed" : "hypothesized",
                    isActive: true,
                  });
                  knowledgeEntriesCreated++;
                } else {
                  knowledgeEntriesUpdated++;
                }
              }
              // If no client match and not team scope, skip — we cannot store
              // client knowledge without a clientId
            } catch (insertError) {
              console.error(
                "[Scan Email History] Failed to insert knowledge entry:",
                insertError
              );
            }
          }
        } catch (llmError) {
          console.error(
            `[Scan Email History] LLM extraction failed for domain ${domain}:`,
            llmError
          );
          llmErrors++;
        }
      }
    }

    return NextResponse.json({
      emailsScanned,
      clientsDetected,
      knowledgeEntriesCreated,
      knowledgeEntriesUpdated,
      llmErrors,
      domainsWithoutClient: Array.from(domainGroups.keys()).filter(
        (d) => !isSaraniDomain(d)
      ).length - clientsDetected,
    });
  } catch (error) {
    console.error("[Scan Email History] Fatal error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to scan email history";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
