// Cron — Scan email history in small batches (50 emails/run) to build Arya's knowledge base.
// Runs automatically. Each invocation processes the next 50 unprocessed emails.
// Uses processed_emails table to track which emails have been scanned for knowledge.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clients, clientKnowledge, teamKnowledge, processedEmails } from "@/lib/db/schema";
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
import {
  encodeContactName,
  encodeDivisionName,
  encodeTeamMemberName,
} from "@/lib/arya/name-encoder";

// ─── Constants ──────────────────────────────────────────────────────────────

const EMAIL_ADDRESS =
  process.env.MICROSOFT_EMAIL_ADDRESS || "team@sarani.studio";
const SARANI_DOMAINS = ["sarani.studio", "sarani.fr"];
const EMAILS_PER_RUN = 50;
const BATCH_SIZE = 10; // emails per LLM call (smaller for faster response)

// ─── Types ──────────────────────────────────────────────────────────────────

interface GraphEmailMessage {
  id: string;
  subject: string;
  from: {
    emailAddress: { name: string; address: string };
  };
  toRecipients: Array<{
    emailAddress: { name: string; address: string };
  }>;
  receivedDateTime: string;
  body: { contentType: string; content: string };
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

async function findClientByDomain(
  domain: string
): Promise<{ id: string; name: string } | null> {
  // Strategy 1: match by primaryContactEmail domain
  const escapedDomain = domain.replace(/%/g, "\\%").replace(/_/g, "\\_");
  const byEmail = await db
    .select({ id: clients.id, name: clients.name })
    .from(clients)
    .where(sql`${clients.primaryContactEmail} ILIKE ${"%" + "@" + escapedDomain}`)
    .limit(1);
  if (byEmail.length > 0) return byEmail[0];

  // Strategy 2: match domain against client name (e.g. tiktok.com → "TikTok")
  // Extract the company part from the domain (before the TLD)
  const domainParts = domain.split(".");
  const companyPart = domainParts[0]?.toLowerCase() ?? "";
  if (companyPart.length < 2) return null;

  const allClients = await db
    .select({ id: clients.id, name: clients.name })
    .from(clients);

  // Fuzzy match: domain company part matches client name
  for (const client of allClients) {
    const clientLower = client.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (
      clientLower.includes(companyPart) ||
      companyPart.includes(clientLower)
    ) {
      return client;
    }
  }

  return null;
}

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

async function isEmailAlreadyScanned(messageId: string): Promise<boolean> {
  const existing = await db
    .select({ id: processedEmails.id })
    .from(processedEmails)
    .where(eq(processedEmails.messageId, messageId))
    .limit(1);
  return existing.length > 0;
}

async function markEmailScanned(messageId: string): Promise<void> {
  try {
    await db.insert(processedEmails).values({
      messageId,
      processedAt: new Date(),
      resultCategory: "knowledge_scanned",
    }).onConflictDoNothing();
  } catch {
    // Ignore duplicate key errors
  }
}

// ─── Auth ────────────────────────────────────────────────────────────────────

function verifyCronSecret(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("x-cron-secret") === secret;
}

// ─── GET /api/admin/cron/scan-knowledge ─────────────────────────────────────

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isEmailConfigured()) {
    return NextResponse.json(
      { error: "Email integration not configured" },
      { status: 503 }
    );
  }

  let emailsScanned = 0;
  let clientsDetected = 0;
  let knowledgeEntriesCreated = 0;
  let llmErrors = 0;

  try {
    // Fetch recent emails (last 365 days, 1 page of 50)
    const selectFields =
      "id,subject,from,toRecipients,receivedDateTime,body,conversationId";
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 365);
    const filter = `receivedDateTime ge ${cutoffDate.toISOString()}`;

    const url = `/users/${encodeURIComponent(EMAIL_ADDRESS)}/messages?$filter=${filter}&$orderby=receivedDateTime desc&$top=${EMAILS_PER_RUN}&$select=${selectFields}`;

    const page: GraphEmailResponse = await graphFetch<GraphEmailResponse>(url);
    if (!page?.value || !Array.isArray(page.value)) {
      return NextResponse.json({
        emailsScanned: 0,
        message: "No emails returned from Graph API",
      });
    }

    // Filter out already-scanned emails
    const newEmails: GraphEmailMessage[] = [];
    for (const email of page.value) {
      const alreadyScanned = await isEmailAlreadyScanned(email.id);
      if (!alreadyScanned) {
        newEmails.push(email);
      }
    }

    if (newEmails.length === 0) {
      return NextResponse.json({
        emailsScanned: 0,
        message: "All recent emails already scanned",
      });
    }

    // Group by client domain
    const domainGroups = new Map<string, GraphEmailMessage[]>();
    for (const email of newEmails) {
      const fromDomain = getDomain(email.from.emailAddress.address);
      let clientDomain: string | null = null;

      if (isSaraniDomain(fromDomain)) {
        const externalRecipient = email.toRecipients?.find(
          (r) => !isSaraniDomain(getDomain(r.emailAddress.address))
        );
        if (externalRecipient) {
          clientDomain = getDomain(externalRecipient.emailAddress.address);
        }
      } else {
        clientDomain = fromDomain;
      }

      if (!clientDomain) continue;
      const existing = domainGroups.get(clientDomain) ?? [];
      existing.push(email);
      domainGroups.set(clientDomain, existing);
    }

    clientsDetected = domainGroups.size;

    // Process each domain in batches
    for (const [domain, domainEmails] of domainGroups) {
      const client = await findClientByDomain(domain);

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

          const validEntries = data.entries.filter(
            (e: KnowledgeEntry) =>
              e.confidence === "high" || e.confidence === "medium"
          );

          for (const entry of validEntries) {
            try {
              if (entry.scope === "team" && entry.teamMemberEmail) {
                const exists = await teamKnowledgeExists(
                  entry.teamMemberEmail,
                  entry.knowledgeText,
                  entry.category
                );
                if (!exists) {
                  await db.insert(teamKnowledge).values({
                    teamMemberEmail: entry.teamMemberEmail,
                    teamMemberName: entry.entityName,
                    codeName: encodeTeamMemberName(entry.entityName, entry.teamMemberEmail),
                    role: "unknown",
                    category: entry.category,
                    knowledgeText: entry.knowledgeText,
                    source: `email-scan:${domain}`,
                    confidence:
                      entry.confidence === "high" ? "observed" : "hypothesized",
                    isActive: true,
                  });
                  knowledgeEntriesCreated++;
                }
              } else if (client) {
                const exists = await knowledgeExists(
                  client.id,
                  entry.knowledgeText,
                  entry.category
                );
                if (!exists) {
                  const contactCode = entry.scope === "individual"
                    ? encodeContactName(entry.entityName, entry.contactEmail)
                    : entry.scope === "division" && entry.division
                      ? encodeDivisionName(client.name, entry.division)
                      : null;

                  await db.insert(clientKnowledge).values({
                    clientId: client.id,
                    division: entry.division ?? null,
                    contactName:
                      entry.scope === "individual" ? entry.entityName : null,
                    contactEmail: entry.contactEmail ?? null,
                    codeName: contactCode,
                    category: entry.category,
                    knowledgeText: entry.knowledgeText,
                    source: `email-scan:${domain}`,
                    confidence:
                      entry.confidence === "high" ? "observed" : "hypothesized",
                    isActive: true,
                  });
                  knowledgeEntriesCreated++;
                }
              }
            } catch (insertError) {
              console.error("[scan-knowledge] Insert error:", insertError);
            }
          }
        } catch (llmError) {
          console.error(`[scan-knowledge] LLM error for ${domain}:`, llmError);
          llmErrors++;
        }

        // Delay between LLM calls to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      // Mark all emails from this domain as scanned
      for (const email of domainEmails) {
        await markEmailScanned(email.id);
      }
    }

    emailsScanned = newEmails.length;

    return NextResponse.json({
      emailsScanned,
      clientsDetected,
      knowledgeEntriesCreated,
      llmErrors,
      message: emailsScanned > 0
        ? `Processed ${emailsScanned} emails from ${clientsDetected} clients`
        : "No new emails to process",
    });
  } catch (error) {
    console.error("[scan-knowledge] Fatal error:", error);
    return NextResponse.json(
      { error: "Scan failed. Check server logs." },
      { status: 500 }
    );
  }
}
