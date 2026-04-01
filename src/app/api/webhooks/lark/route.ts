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
- "internal_request": a team member requesting something — a task, a deliverable, a question needing action.
- "status_update": a team member sharing progress, completion, or a status update on ongoing work.
- "client_mention": a message mentioning a client, client feedback, or something that needs PM attention.
- "noise": casual chat, greetings, emoji-only, memes, or off-topic messages.

Return JSON:
{
  "category": "<one of the 4 categories>",
  "confidence": 0.0 to 1.0,
  "reasoning": "one sentence explaining why this category",
  "suggestedAction": "one sentence — what should the PM do next",
  "language": "<ISO 639-1 code>"
}

Rules:
- Return valid JSON only, no markdown.
- If unsure, pick the category that requires human attention.
- Confidence below 0.6 means you are uncertain.`;

// ─── Types ─────────────────────────────────────────────────────────────────

type LarkCategory = "internal_request" | "status_update" | "client_mention" | "noise";

interface LarkClassificationResult {
  category: LarkCategory;
  confidence: number;
  reasoning: string;
  suggestedAction: string;
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
    case "internal_request":
      return "high";
    case "client_mention":
      return "high";
    case "status_update":
      return "medium";
    case "noise":
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

async function processLarkMessage(event: LarkEvent): Promise<void> {
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

    // Skip noise with high confidence
    if (classification.category === "noise" && classification.confidence >= 0.8) {
      console.log(
        `[Lark Webhook] Skipping noise message ${message.message_id} (confidence: ${classification.confidence})`
      );
      return;
    }

    // Create inbox item
    const [inserted] = await db
      .insert(inboxItems)
      .values({
        type: "lark_message",
        status: "pending",
        title: `[lark_${classification.category}] ${textContent.slice(0, 100)}`,
        summary: JSON.stringify({
          messageId: message.message_id,
          chatId: message.chat_id,
          senderId: sender.sender_id.open_id ?? sender.sender_id.user_id,
          messageType: message.message_type,
          content: textContent.slice(0, 2000),
          classification,
        }),
        sourceId: message.message_id,
        sourceType: "lark",
        protocol: classification.category === "noise" ? null : "PROTO-LARK-TRIAGE",
        priority: priorityFromCategory(classification.category),
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

  // Step 6: Filter by allowed chat IDs
  const allowedChatIds: Set<string> = getAllowedChatIds();
  if (allowedChatIds.size > 0 && !allowedChatIds.has(event.event.message.chat_id)) {
    console.log(
      `[Lark Webhook] Chat ${event.event.message.chat_id} not in allowed list, skipping`
    );
    return NextResponse.json({ ignored: true, reason: "chat_not_allowed" });
  }

  // Step 7: Process (await before responding -- Replit autoscale constraint)
  await processLarkMessage(event);

  return NextResponse.json({
    processed: true,
    messageId: event.event.message.message_id,
  });
}
