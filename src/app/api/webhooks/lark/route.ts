import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { inboxItems } from "@/lib/db/schema";
import { callClaudeJSON } from "@/lib/ai/claude";

// ─── Zod schemas ───────────────────────────────────────────────────────────

const larkChallengeSchema = z.object({
  challenge: z.string(),
  token: z.string().optional(),
  type: z.literal("url_verification"),
});

const larkSenderSchema = z.object({
  sender_id: z.object({
    open_id: z.string().optional(),
    user_id: z.string().optional(),
    union_id: z.string().optional(),
  }),
  sender_type: z.string().optional(),
});

const larkMessageSchema = z.object({
  message_id: z.string(),
  chat_id: z.string(),
  chat_type: z.string().optional(),
  content: z.string(),
  message_type: z.string(),
  create_time: z.string().optional(),
});

const larkEventSchema = z.object({
  schema: z.string().optional(),
  header: z.object({
    event_id: z.string(),
    event_type: z.string(),
    token: z.string(),
    create_time: z.string().optional(),
  }),
  event: z.object({
    sender: larkSenderSchema,
    message: larkMessageSchema,
  }),
});

type LarkEvent = z.infer<typeof larkEventSchema>;

// ─── Classification prompt ─────────────────────────────────────────────────

const LARK_CLASSIFICATION_PROMPT = `You are Sarani's internal message classifier. Sarani is an international creative agency (35 experts, 5 continents, 18 languages). Classify the following Lark (Feishu) message into exactly ONE category.

Categories:
- "enquiry": Question about Sarani's services, request for quote/pricing, general question, first contact. No existing project involved. Can come from internal team relaying a client question.
- "new_project": A brief for a NEW project — contains deliverables, timeline, brand info, or a clear project request. Sender may be internal team relaying a client brief.
- "project_feedback": Feedback, revision request, follow-up, status question, or any message about an EXISTING ongoing project. References a specific past or ongoing project.
- "other": Casual chat, greetings, emoji-only, memes, off-topic messages, system notifications, status updates with no actionable content.

Return JSON:
{
  "category": "<one of the 4 categories>",
  "confidence": 0.0 to 1.0,
  "reasoning": "one sentence explaining why this category",
  "suggestedAction": "one sentence analysis — what this message is about and what the PM should consider",
  "draftReply": "Complete reply message ready to send back in the Lark chat. Format: greeting + 2-3 sentences addressing the content + closing. Match the sender's language.",
  "clickupProjectHint": "Client name or project name extracted from the message, as it would appear in ClickUp task titles. Null if not identifiable.",
  "language": "<ISO 639-1 code>"
}

Rules:
- Return valid JSON only, no markdown.
- If unsure, pick the category that requires human attention.
- Confidence below 0.6 means you are uncertain.
- draftReply must be a real reply, not an analysis. Write it as if the PM is responding directly.
- clickupProjectHint should be null for enquiry and other categories.`;

// ─── Types ─────────────────────────────────────────────────────────────────

type LarkCategory = "enquiry" | "new_project" | "project_feedback" | "other";

type LarkRouteTo = "PROTO-ENQUIRY" | "PROTO-EMAIL-INTAKE" | "PROTO-CLIENT-RETURN" | "archive";

const LARK_ROUTE_MAP: Record<LarkCategory, LarkRouteTo> = {
  enquiry: "PROTO-ENQUIRY",
  new_project: "PROTO-EMAIL-INTAKE",
  project_feedback: "PROTO-CLIENT-RETURN",
  other: "archive",
};

interface LarkClassificationResult {
  category: LarkCategory;
  confidence: number;
  reasoning: string;
  suggestedAction: string;
  draftReply: string;
  clickupProjectHint: string | null;
  language: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function getAllowedChatIds(): Set<string> {
  const raw: string = process.env.LARK_CHAT_IDS ?? "";
  return new Set(
    raw
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
  );
}

function priorityFromCategory(category: LarkCategory): "high" | "medium" | "low" {
  switch (category) {
    case "new_project":
      return "high";
    case "project_feedback":
      return "high";
    case "enquiry":
      return "medium";
    case "other":
      return "low";
  }
}

function extractTextContent(content: string, messageType: string): string {
  if (messageType !== "text") {
    return `[${messageType} message]`;
  }
  try {
    const parsed: { text?: string } = JSON.parse(content);
    return parsed.text ?? content;
  } catch {
    return content;
  }
}

// ─── Background processing ─────────────────────────────────────────────────

async function processLarkMessage(event: LarkEvent, isDM: boolean = false): Promise<void> {
  const message = event.event.message;
  const sender = event.event.sender;
  const textContent: string = extractTextContent(message.content, message.message_type);

  try {
    // Classify with Claude Haiku
    const llmResult = await callClaudeJSON<LarkClassificationResult>({
      systemPrompt: LARK_CLASSIFICATION_PROMPT,
      userMessage: `Chat ID: ${message.chat_id}\nSender: ${sender.sender_id.open_id ?? sender.sender_id.user_id ?? "unknown"}\nMessage type: ${message.message_type}\nContent: ${textContent}`,
      model: "claude-haiku-4-5-20251001",
      maxTokens: 256,
      timeout: 10_000,
    });

    const classification: LarkClassificationResult = llmResult.data;

    // "other" with high confidence gets stored as "noise" type + "dismissed" status
    const isHighConfidenceNoise: boolean =
      classification.category === "other" && classification.confidence >= 0.8;

    const routeTo: LarkRouteTo = LARK_ROUTE_MAP[classification.category];

    // Create inbox item
    const titlePrefix: string = isDM
      ? `[Forwarded] [lark_${classification.category}]`
      : `[lark_${classification.category}]`;

    const [inserted] = await db
      .insert(inboxItems)
      .values({
        type: isHighConfidenceNoise ? "noise" : "lark_message",
        status: isHighConfidenceNoise ? "dismissed" : "pending",
        title: `${titlePrefix} ${textContent.slice(0, 100)}`,
        summary: JSON.stringify({
          messageId: message.message_id,
          chatId: message.chat_id,
          senderId: sender.sender_id.open_id ?? sender.sender_id.user_id,
          messageType: message.message_type,
          content: textContent.slice(0, 2000),
          classification: {
            ...classification,
            routeTo: routeTo,
          },
        }),
        sourceId: message.message_id,
        sourceType: "lark",
        protocol: isHighConfidenceNoise ? null : (routeTo === "archive" ? null : routeTo),
        priority: isHighConfidenceNoise ? "low" : priorityFromCategory(classification.category),
      })
      .returning({ id: inboxItems.id });

    console.log(
      `[Lark Webhook] Created inbox item ${inserted.id}: category=${classification.category}, messageId=${message.message_id}`
    );
  } catch (error) {
    console.error(
      `[Lark Webhook] Error processing message ${message.message_id}:`,
      error
    );
  }
}

// ─── POST handler ──────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Step 1: Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Step 2: Handle Lark challenge verification (BEFORE any auth check)
  const challengeResult = larkChallengeSchema.safeParse(body);
  if (challengeResult.success) {
    console.log("[Lark Webhook] Responding to challenge verification");
    return NextResponse.json({ challenge: challengeResult.data.challenge });
  }

  // Step 3: Validate event structure
  const eventResult = larkEventSchema.safeParse(body);
  if (!eventResult.success) {
    console.warn("[Lark Webhook] Invalid event payload:", eventResult.error.issues);
    return NextResponse.json(
      { error: "Invalid event payload", details: eventResult.error.issues },
      { status: 400 }
    );
  }

  const event: LarkEvent = eventResult.data;

  // Step 4: Verify token
  const verificationToken: string | undefined = process.env.LARK_VERIFICATION_TOKEN;
  if (!verificationToken) {
    console.error("[Lark Webhook] LARK_VERIFICATION_TOKEN not configured");
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 500 }
    );
  }

  if (event.header.token !== verificationToken) {
    console.warn("[Lark Webhook] Invalid verification token");
    return NextResponse.json(
      { error: "Invalid verification token" },
      { status: 401 }
    );
  }

  // Step 5: Only process im.message.receive_v1 events
  if (event.header.event_type !== "im.message.receive_v1") {
    return NextResponse.json({
      ignored: true,
      eventType: event.header.event_type,
    });
  }

  // Step 6: Filter by allowed chat IDs (bypass for p2p DMs — forwarded messages to bot)
  const chatType: string = event.event.message.chat_type ?? "";
  const isDirectMessage: boolean = chatType === "p2p";

  if (!isDirectMessage) {
    const allowedChatIds: Set<string> = getAllowedChatIds();
    if (allowedChatIds.size > 0 && !allowedChatIds.has(event.event.message.chat_id)) {
      console.log(
        `[Lark Webhook] Chat ${event.event.message.chat_id} not in allowed list, skipping`
      );
      return NextResponse.json({ ignored: true, reason: "chat_not_allowed" });
    }
  }

  // Step 7: Process (await before responding -- Replit autoscale constraint)
  await processLarkMessage(event, isDirectMessage);

  return NextResponse.json({
    processed: true,
    messageId: event.event.message.message_id,
  });
}
