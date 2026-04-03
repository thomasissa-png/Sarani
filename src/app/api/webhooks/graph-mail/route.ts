import { NextRequest, NextResponse } from "next/server";
import { getEmailById, stripHtml, isEmailConfigured } from "@/lib/integrations/email";
import { callClaudeJSON } from "@/lib/ai/claude";
import { db } from "@/lib/db";
import { inboxItems, processedEmails } from "@/lib/db/schema";
import { eq, and, gte, desc, sql } from "drizzle-orm";
import { isSaraniEmail } from "@/lib/inbox/sarani-filter";

// ─── Types ─────────────────────────────────────────────────────────────────

interface GraphNotificationPayload {
  value: Array<{
    subscriptionId: string;
    clientState: string;
    changeType: string;
    resource: string;
    resourceData: {
      id: string;
      "@odata.type": string;
      "@odata.id": string;
      "@odata.etag": string;
    };
  }>;
}

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

// ─── Classification prompt (shared with classify/route.ts) ────────────────

const CLASSIFICATION_SYSTEM_PROMPT = `You are Sarani's email classifier. Sarani is an international creative agency (45 experts, 5 continents, 18 languages). Classify the following email into exactly ONE category AND detect its language.

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

// ─── Noise detection ──────────────────────────────────────────────────────

const NOISE_SENDERS = [
  "noreply", "no-reply", "no_reply", "newsletter", "notification",
  "mailer-daemon", "postmaster", "donotreply", "do-not-reply", "do_not_reply",
];

function isNoiseByEmail(from: string): boolean {
  const lower = from.toLowerCase();
  return NOISE_SENDERS.some((pattern) => lower.includes(pattern));
}

// ─── Priority mapping ─────────────────────────────────────────────────────

function priorityFromCategory(category: EmailCategory): "high" | "medium" | "low" {
  switch (category) {
    case "client_brief": return "high";
    case "new_client_potential": return "high";
    case "new_client_prospect": return "high";
    case "client_followup": return "medium";
    case "noise": return "low";
  }
}

// ─── Protocol mapping ─────────────────────────────────────────────────────

function protocolFromCategory(category: EmailCategory): string | null {
  switch (category) {
    case "client_brief": return "PROTO-EMAIL-INTAKE";
    case "client_followup": return "PROTO-CLIENT-RETURN";
    case "new_client_potential": return "PROTO-CLIENT-REPLY";
    case "new_client_prospect": return "PROTO-PITCH";
    case "noise": return null;
  }
}

// ─── Thread aggregation helpers ──────────────────────────────────────────

interface SummaryPayload {
  from: string;
  subject: string;
  classification: ClassificationResult;
  bodyPreview: string;
  conversationId?: string;
  emailChain?: Array<{
    messageId: string;
    subject: string;
    bodyPreview: string;
    receivedAt: string;
  }>;
  emailCount?: number;
}

/**
 * Find an existing PENDING inbox_item that belongs to the same email thread.
 * Match by conversationId first, then fall back to same sender within 30 minutes.
 */
async function findExistingThreadItem(
  conversationId: string | undefined,
  senderEmail: string
): Promise<{ id: string; summary: string | null; sourceId: string | null } | null> {
  // Strategy 1: match by conversationId stored in summary JSON
  if (conversationId) {
    const candidates = await db
      .select({
        id: inboxItems.id,
        summary: inboxItems.summary,
        sourceId: inboxItems.sourceId,
      })
      .from(inboxItems)
      .where(
        and(
          eq(inboxItems.status, "pending"),
          eq(inboxItems.type, "email_classified"),
          sql`${inboxItems.summary}::text LIKE ${`%"conversationId":"${conversationId}"%`}`
        )
      )
      .orderBy(desc(inboxItems.createdAt))
      .limit(1);

    if (candidates.length > 0) {
      return candidates[0];
    }
  }

  // Strategy 2: same sender within the last 30 minutes
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
  const candidates = await db
    .select({
      id: inboxItems.id,
      summary: inboxItems.summary,
      sourceId: inboxItems.sourceId,
    })
    .from(inboxItems)
    .where(
      and(
        eq(inboxItems.status, "pending"),
        eq(inboxItems.type, "email_classified"),
        gte(inboxItems.createdAt, thirtyMinutesAgo),
        sql`${inboxItems.summary}::text LIKE ${`%"from":"${senderEmail}"%`}`
      )
    )
    .orderBy(desc(inboxItems.createdAt))
    .limit(1);

  return candidates.length > 0 ? candidates[0] : null;
}

// ─── Background processing ────────────────────────────────────────────────

async function processEmailNotification(messageId: string): Promise<void> {
  try {
    // Check if already processed (deduplication)
    const existing = await db
      .select()
      .from(processedEmails)
      .where(eq(processedEmails.messageId, messageId))
      .limit(1);

    if (existing.length > 0) {
      console.log(`[Graph Webhook] Email ${messageId} already processed, skipping`);
      return;
    }

    // Fetch full email from Graph API
    const email = await getEmailById(messageId);
    const from = email.from.emailAddress.address;
    const subject = email.subject;
    const bodyPreview = stripHtml(email.body.content).slice(0, 2000);
    const conversationId = email.conversationId;

    // Skip emails sent BY Sarani — these are our own outgoing replies
    if (isSaraniEmail(from)) {
      await db.insert(processedEmails).values({
        messageId,
        resultCategory: "internal_skip",
        inboxItemId: null,
      });
      console.log(`[Graph Webhook] Skipping Sarani outgoing email ${messageId} from ${from}`);
      return;
    }

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
      classification = llmResult.data;
    }

    // Create or update inbox_item (skip for noise unless low confidence)
    let inboxItemId: string | null = null;
    if (classification.category !== "noise" || classification.confidence < 0.8) {
      // Check for existing pending item in the same thread
      const existingItem = await findExistingThreadItem(conversationId, from);

      if (existingItem) {
        // Aggregate into existing inbox_item
        let existingPayload: SummaryPayload;
        try {
          existingPayload = JSON.parse(existingItem.summary ?? "{}") as SummaryPayload;
        } catch {
          existingPayload = {} as SummaryPayload;
        }

        // Build email chain — append current email
        const existingChain = existingPayload.emailChain ?? [];
        // If this is the first aggregation, add the original email to the chain
        if (existingChain.length === 0 && existingItem.sourceId) {
          existingChain.push({
            messageId: existingItem.sourceId,
            subject: existingPayload.subject ?? "",
            bodyPreview: existingPayload.bodyPreview ?? "",
            receivedAt: new Date().toISOString(),
          });
        }
        existingChain.push({
          messageId,
          subject,
          bodyPreview: bodyPreview.slice(0, 500),
          receivedAt: new Date().toISOString(),
        });

        const emailCount = (existingPayload.emailCount ?? 1) + 1;

        const updatedPayload: SummaryPayload = {
          ...existingPayload,
          // Keep most recent email as the primary
          subject,
          bodyPreview: bodyPreview.slice(0, 500),
          classification,
          conversationId,
          emailChain: existingChain,
          emailCount,
        };

        await db
          .update(inboxItems)
          .set({
            title: `[${classification.category}] Email chain (${emailCount} messages) from ${from}`,
            summary: JSON.stringify(updatedPayload),
            sourceId: messageId, // point to the latest email
            updatedAt: new Date(),
            // Escalate priority if needed
            priority: priorityFromCategory(classification.category),
          })
          .where(eq(inboxItems.id, existingItem.id));

        inboxItemId = existingItem.id;

        console.log(
          `[Graph Webhook] Aggregated email ${messageId} into existing inbox_item ${inboxItemId} (${emailCount} emails in chain)`
        );
      } else {
        // Create new inbox_item
        const protocol = protocolFromCategory(classification.category);
        const summaryPayload: SummaryPayload = {
          from,
          subject,
          classification,
          bodyPreview: bodyPreview.slice(0, 500),
          conversationId,
          emailCount: 1,
        };

        const [inserted] = await db
          .insert(inboxItems)
          .values({
            type: "email_classified",
            status: "pending",
            title: `[${classification.category}] ${subject}`,
            summary: JSON.stringify(summaryPayload),
            sourceId: messageId,
            sourceType: "email",
            protocol,
            priority: priorityFromCategory(classification.category),
          })
          .returning({ id: inboxItems.id });

        inboxItemId = inserted.id;
      }
    }

    // Record as processed
    await db.insert(processedEmails).values({
      messageId,
      resultCategory: classification.category,
      inboxItemId,
    });

    console.log(
      `[Graph Webhook] Processed email ${messageId}: category=${classification.category}, inbox_item=${inboxItemId ?? "skipped (noise)"}`
    );
  } catch (error) {
    console.error(`[Graph Webhook] Error processing email ${messageId}:`, error);
  }
}

// ─── POST handler ─────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Step 1: Handle Graph validation request
  // Graph sends a validationToken as a query parameter during subscription creation.
  const validationToken = request.nextUrl.searchParams.get("validationToken");
  if (validationToken) {
    // Must return the token as text/plain — Graph requires this exact format.
    return new NextResponse(validationToken, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  // Step 2: Handle notification payload
  const webhookSecret = process.env.GRAPH_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[Graph Webhook] GRAPH_WEBHOOK_SECRET not configured");
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 500 }
    );
  }

  if (!isEmailConfigured()) {
    console.error("[Graph Webhook] Email integration not configured");
    return NextResponse.json(
      { error: "Email integration not configured" },
      { status: 503 }
    );
  }

  let payload: GraphNotificationPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!payload.value || !Array.isArray(payload.value)) {
    return NextResponse.json({ error: "Invalid notification format" }, { status: 400 });
  }

  // Validate clientState for each notification
  const validNotifications = payload.value.filter((notification) => {
    if (notification.clientState !== webhookSecret) {
      console.warn(
        `[Graph Webhook] Invalid clientState for subscription ${notification.subscriptionId}`
      );
      return false;
    }
    return notification.changeType === "created";
  });

  if (validNotifications.length === 0 && payload.value.length > 0) {
    // All notifications had invalid clientState
    return NextResponse.json({ error: "Invalid client state" }, { status: 403 });
  }

  // Process each notification.
  // Graph requires response < 3s, so we process in the background.
  // IMPORTANT: On Replit autoscale, fire-and-forget is killed after response.
  // We must await processing before responding.
  for (const notification of validNotifications) {
    // Extract messageId from the resource path
    // resource format: "Users/{userId}/Messages/{messageId}"
    const resourceParts = notification.resource.split("/");
    const messageId = resourceParts[resourceParts.length - 1] || notification.resourceData?.id;

    if (messageId) {
      await processEmailNotification(messageId);
    }
  }

  // Return 202 Accepted
  return NextResponse.json(
    { processed: validNotifications.length },
    { status: 202 }
  );
}
