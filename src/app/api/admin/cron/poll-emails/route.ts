import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { processedEmails, inboxItems } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  getRecentEmails,
  getEmailById,
  stripHtml,
  isEmailConfigured,
} from "@/lib/integrations/email";
import { callClaudeJSON } from "@/lib/ai/claude";
import {
  BRIEF_EXTRACTOR_SYSTEM_PROMPT,
  BriefExtractionResultSchema,
  buildBriefExtractionUserMessage,
  type BriefExtractionResult,
} from "@/lib/ai/prompts/brief-extractor";
import { getMappingBySpaceName } from "@/lib/integrations/config";

// ─── Types ──────────────────────────────────────────────────────────────────

type EmailCategory =
  | "client_brief"
  | "client_followup"
  | "noise"
  | "new_client_potential"
  | "new_client_prospect";

type RouteTo =
  | "PROTO-EMAIL-INTAKE"
  | "PROTO-CLIENT-RETURN"
  | "PROTO-PITCH"
  | "PROTO-CLIENT-REPLY"
  | "archive";

interface ClassificationResult {
  category: EmailCategory;
  confidence: number;
  reasoning: string;
  suggestedAction: string;
  language: string;
  routeTo: RouteTo;
}

// ─── Validation ─────────────────────────────────────────────────────────────

const ClassificationResultSchema = z.object({
  category: z.enum([
    "client_brief",
    "client_followup",
    "noise",
    "new_client_potential",
    "new_client_prospect",
  ]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  suggestedAction: z.string(),
  language: z.string().min(2).max(5),
  routeTo: z.enum([
    "PROTO-EMAIL-INTAKE",
    "PROTO-CLIENT-RETURN",
    "PROTO-PITCH",
    "PROTO-CLIENT-REPLY",
    "archive",
  ]),
});

// ─── Classification prompt (same as graph-mail webhook) ─────────────────────

const CLASSIFICATION_SYSTEM_PROMPT = `You are Sarani's email classifier. Sarani is an international creative agency (35 experts, 5 continents, 18 languages). Classify the following email into exactly ONE category AND detect its language.

Categories:
- "client_brief": email containing a project brief, request for work, or new deliverable request from an EXISTING or KNOWN client. The sender has worked with Sarani before, the brief is clear and specific (deliverables, timeline, brand mentioned).
- "client_followup": follow-up, question, feedback, revision request, or status update about an ONGOING project.
- "noise": newsletters, automated notifications, marketing emails, system alerts, subscription confirmations, out-of-office replies.
- "new_client_potential": first contact from someone who could become a client — casual inquiry, introduction, "just reaching out". No specific project request yet.
- "new_client_prospect": first contact from a prospect who WANTS something specific — requests a quote, a pitch, a proposal, asks for pricing, describes a project they need help with. They are ready to buy, not just browsing.

Key distinction — client_brief vs new_client_prospect:
- client_brief = KNOWN client + CLEAR brief (specific deliverables, deadline, brand context).
- new_client_prospect = UNKNOWN sender + WANTS a quote/pitch/proposal.
- If unsure: does the sender reference past Sarani projects or use internal vocabulary (SharePoint links, ClickUp refs)? → client_brief. Otherwise → new_client_prospect.

Routing rules:
- client_brief → "PROTO-EMAIL-INTAKE"
- client_followup → "PROTO-CLIENT-RETURN"
- noise → "archive"
- new_client_potential → "PROTO-CLIENT-REPLY"
- new_client_prospect → "PROTO-PITCH"

Return JSON:
{
  "category": "<one of the 5 categories>",
  "confidence": 0.0 to 1.0,
  "reasoning": "one sentence explaining why this category",
  "suggestedAction": "one sentence — what should the PM do next",
  "language": "<ISO 639-1 code of the email's language>",
  "routeTo": "<protocol name from routing rules>"
}

Rules:
- Return valid JSON only, no markdown.
- If unsure between two categories, pick the one that requires human attention (prefer false positive over missed client email).
- Confidence below 0.6 means you are uncertain — flag it in reasoning.
- Language detection: identify the PRIMARY language of the email body. If mixed, use the dominant language. Default to "en" only if truly ambiguous.`;

// ─── Noise detection ────────────────────────────────────────────────────────

const NOISE_SENDERS = [
  "noreply", "no-reply", "no_reply", "newsletter", "notification",
  "mailer-daemon", "postmaster", "donotreply", "do-not-reply", "do_not_reply",
];

function isNoiseByEmail(from: string): boolean {
  const lower = from.toLowerCase();
  return NOISE_SENDERS.some((pattern) => lower.includes(pattern));
}

// ─── Priority mapping ───────────────────────────────────────────────────────

function priorityFromCategory(category: EmailCategory): "high" | "medium" | "low" {
  switch (category) {
    case "client_brief": return "high";
    case "new_client_potential": return "high";
    case "new_client_prospect": return "high";
    case "client_followup": return "medium";
    case "noise": return "low";
  }
}

// ─── Protocol mapping ───────────────────────────────────────────────────────

function protocolFromCategory(category: EmailCategory): string | null {
  switch (category) {
    case "client_brief": return "PROTO-EMAIL-INTAKE";
    case "client_followup": return "PROTO-CLIENT-RETURN";
    case "new_client_potential": return "PROTO-CLIENT-REPLY";
    case "new_client_prospect": return "PROTO-PITCH";
    case "noise": return null;
  }
}

// ─── Auth helper ────────────────────────────────────────────────────────────

function verifyCronSecret(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("x-cron-secret");
  return header === secret;
}

// ─── GET /api/admin/cron/poll-emails ────────────────────────────────────────
// Cron fallback: fetch unread emails, classify new ones, create inbox_items.

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

  let processed = 0;
  let skipped = 0;
  let errors = 0;

  try {
    const emails = await getRecentEmails(50);

    for (const email of emails) {
      try {
        // Check if already processed (deduplication)
        const existing = await db
          .select({ id: processedEmails.id })
          .from(processedEmails)
          .where(eq(processedEmails.messageId, email.id))
          .limit(1);

        if (existing.length > 0) {
          skipped++;
          continue;
        }

        // Fetch full email body
        const fullEmail = await getEmailById(email.id);
        const from = fullEmail.from.emailAddress.address;
        const subject = fullEmail.subject;
        const bodyPreview = stripHtml(fullEmail.body.content).slice(0, 2000);

        let classification: ClassificationResult;

        // Pre-LLM noise filter
        if (isNoiseByEmail(from)) {
          classification = {
            category: "noise",
            confidence: 0.95,
            reasoning: `Sender address "${from}" matches automated/notification pattern.`,
            suggestedAction: "Archive or ignore — automated sender detected.",
            language: "en",
            routeTo: "archive",
          };
        } else {
          // Classify with Claude Haiku
          const llmResult = await callClaudeJSON<ClassificationResult>({
            systemPrompt: CLASSIFICATION_SYSTEM_PROMPT,
            userMessage: `Subject: ${subject}\nFrom: ${from}\nBody preview: ${bodyPreview}`,
            model: "claude-haiku-4-5-20251001",
            maxTokens: 256,
            timeout: 10_000,
          });

          // Validate LLM output
          const parsed = ClassificationResultSchema.safeParse(llmResult.data);
          if (!parsed.success) {
            console.error(
              `[Cron Poll-Emails] LLM returned invalid classification for ${email.id}:`,
              parsed.error.flatten()
            );
            errors++;
            continue;
          }
          classification = parsed.data;
        }

        // Create inbox_item — noise with high confidence gets type "noise" + status "dismissed"
        let inboxItemId: string | null = null;
        const isHighConfidenceNoise =
          classification.category === "noise" && classification.confidence >= 0.8;
        const protocol = protocolFromCategory(classification.category);

        const [inserted] = await db
          .insert(inboxItems)
          .values({
            type: isHighConfidenceNoise ? "noise" : "email_classified",
            status: isHighConfidenceNoise ? "dismissed" : "pending",
            title: `[${classification.category}] ${subject}`,
            summary: JSON.stringify({
              from,
              subject,
              classification,
              bodyPreview: bodyPreview.slice(0, 500),
            }),
            sourceId: email.id,
            sourceType: "email",
            protocol,
            priority: isHighConfidenceNoise
              ? "low"
              : priorityFromCategory(classification.category),
          })
          .returning({ id: inboxItems.id });

        inboxItemId = inserted.id;

        // Record as processed
        await db.insert(processedEmails).values({
          messageId: email.id,
          resultCategory: classification.category,
          inboxItemId,
        });

        // ─── Auto-Brief Pipeline (Step 1) ─────────────────────────────
        // When email is classified as client_brief, extract structured brief
        // via LLM and create an auto_brief_ready inbox item for PM review.
        if (classification.category === "client_brief" && inboxItemId) {
          try {
            const llmBrief = await callClaudeJSON<BriefExtractionResult>({
              systemPrompt: BRIEF_EXTRACTOR_SYSTEM_PROMPT,
              userMessage: buildBriefExtractionUserMessage({
                emailSubject: subject,
                emailBody: bodyPreview,
                senderEmail: from,
              }),
              model: "claude-haiku-4-5-20251001",
              maxTokens: 1024,
              timeout: 15_000,
            });

            const briefParsed = BriefExtractionResultSchema.safeParse(llmBrief.data);

            let extractionError = false;
            let briefData: BriefExtractionResult;

            if (!briefParsed.success) {
              console.error(
                `[Auto-Brief] LLM returned invalid extraction for email ${email.id}:`,
                briefParsed.error.flatten()
              );
              extractionError = true;
              // Fallback: create item with empty brief so PM can fill manually
              briefData = {
                client_name: "",
                project_title: subject || "Untitled",
                contact_email: from,
                project_type: "generic",
                brief_introduction: "",
                brief_body: "",
              };
            } else {
              briefData = briefParsed.data;
            }

            // Resolve client against CLIENT_MAPPINGS
            const clientMapping = getMappingBySpaceName(briefData.client_name);
            const clientResolved = !!clientMapping;

            // Generate project name: "[Client] - [Title]" (max 100 chars)
            const rawProjectName = `${briefData.client_name} - ${briefData.project_title}`;
            const projectName = rawProjectName.length > 100
              ? rawProjectName.slice(0, 100).trim()
              : rawProjectName;

            const autoBriefPayload = {
              sourceInboxItemId: inboxItemId,
              projectName,
              clientName: briefData.client_name,
              contactEmail: briefData.contact_email || from,
              startDate: new Date().toISOString().slice(0, 10),
              briefBody: briefData.brief_body,
              projectType: briefData.project_type,
              clientResolved,
              clickupSpaceId: clientMapping?.clickupSpaceId,
              excelTrackerFilename: clientMapping?.excelTrackerFilename,
              sharepointCustomerFolder: clientMapping?.sharepointCustomerFolder,
              extractionError,
            };

            await db.insert(inboxItems).values({
              type: "auto_brief_ready",
              status: "pending_review",
              title: `[Auto Brief] ${projectName}`,
              summary: JSON.stringify(autoBriefPayload),
              sourceId: email.id,
              sourceType: "email",
              protocol: "PROTO-EMAIL-INTAKE",
              priority: "high",
            });

            console.log(
              `[Auto-Brief] Created auto_brief_ready item for email ${email.id}` +
              (clientResolved ? ` (client: ${clientMapping.clickupSpaceName})` : " (client unresolved)")
            );
          } catch (briefError) {
            console.error(
              `[Auto-Brief] Failed to extract brief from email ${email.id}:`,
              briefError
            );
            // Non-blocking: the original email_classified item still exists
            // PM can still process it manually via the standard flow
          }
        }

        processed++;
      } catch (emailError) {
        console.error(
          `[Cron Poll-Emails] Error processing email ${email.id}:`,
          emailError
        );
        errors++;
      }
    }

    return NextResponse.json({ processed, skipped, errors });
  } catch (error) {
    console.error("[Cron Poll-Emails] Fatal error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to poll emails";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
