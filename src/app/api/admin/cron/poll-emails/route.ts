import { NextRequest, NextResponse } from "next/server";
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
import {
  CLASSIFICATION_SYSTEM_PROMPT,
  ClassificationResultSchema,
  isNoiseByEmail,
  priorityFromCategory,
  protocolFromCategory,
  type ClassificationResult,
  type EmailCategory,
} from "@/lib/ai/prompts/classifier";
import { getMappingBySpaceName } from "@/lib/integrations/config";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Filter out internal Sarani emails — they should not appear in the inbox */
function isSaraniEmail(from: string): boolean {
  return from.toLowerCase().endsWith("@sarani.studio");
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

        // Skip internal Sarani emails — they should not appear in the inbox
        // Check both the from field AND the body content for Sarani outgoing replies
        // (email threads where a Sarani team member replied — the from is the client but
        //  the body preview starts with the Sarani reply text before "De :" / "From:")
        const bodyStart = bodyPreview.slice(0, 400).toLowerCase();
        const hasSaraniInBody = bodyStart.includes("@sarani.studio");
        const hasThreadMarker = bodyStart.includes("de :") || bodyStart.includes("from:") || bodyStart.includes("envoyé :");
        const isSaraniOutgoingReply = hasSaraniInBody && hasThreadMarker;

        if (isSaraniEmail(from) || isSaraniOutgoingReply) {
          // Record as processed to avoid re-checking
          await db.insert(processedEmails).values({
            messageId: email.id,
            resultCategory: "internal_skip",
            inboxItemId: null,
          });
          skipped++;
          continue;
        }

        let classification: ClassificationResult;

        // Pre-LLM noise filter
        if (isNoiseByEmail(from)) {
          classification = {
            category: "other",
            confidence: 0.95,
            reasoning: `Sender address "${from}" matches automated/notification pattern.`,
            suggestedAction: "Archive or ignore — automated sender detected.",
            draftReply: "",
            clickupProjectHint: null,
            language: "en",
            routeTo: "archive",
          };
        } else {
          // Classify with Claude Haiku
          const llmResult = await callClaudeJSON<ClassificationResult>({
            systemPrompt: CLASSIFICATION_SYSTEM_PROMPT,
            userMessage: `Subject: ${subject}\nFrom: ${from}\nBody preview: ${bodyPreview}`,
            model: "claude-haiku-4-5-20251001",
            maxTokens: 512,
            timeout: 15_000,
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

        // ClickUp search for project_feedback — resolve project hint to task URL
        let clickupMatch: { taskId: string; taskUrl: string; taskName: string } | null = null;
        if (
          classification.category === "project_feedback" &&
          classification.clickupProjectHint
        ) {
          try {
            const { searchTaskByName } = await import("@/lib/integrations/clickup");
            clickupMatch = await searchTaskByName(classification.clickupProjectHint);
          } catch {
            // Graceful degradation — classification still works without ClickUp link
          }
        }

        // Create inbox_item — "other" with high confidence gets type "noise" + status "dismissed"
        let inboxItemId: string | null = null;
        const isHighConfidenceNoise =
          classification.category === "other" && classification.confidence >= 0.8;
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
              classification: {
                ...classification,
                ...(clickupMatch ? { taskId: clickupMatch.taskId, taskUrl: clickupMatch.taskUrl, taskName: clickupMatch.taskName } : {}),
              },
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
        if (classification.category === "new_project" && inboxItemId) {
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
                entity: "",
                project_title: subject || "Untitled",
                contact_email: from,
                project_type: "other",
                brief_introduction: "",
                brief_body: "",
                deadline: "To be confirmed",
                dimensions: "To be confirmed",
                quantity: "To be confirmed",
                output_languages: "To be confirmed",
                reference_links: "None provided",
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
              entity: briefData.entity || briefData.client_name,
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
