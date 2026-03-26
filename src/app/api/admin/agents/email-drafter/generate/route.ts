import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clients, agentOutputs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { callClaudeJSON } from "@/lib/ai/claude";
import { EMAIL_DRAFTER_SYSTEM_PROMPT } from "@/lib/ai/prompts/email-drafter";
import {
  emailDrafterRequestSchema,
  emailDrafterResponseSchema,
  LANGUAGE_LABELS,
  EMAIL_TYPE_LABELS,
  EMAIL_TONE_LABELS,
  type EmailDrafterResponse,
  type SupportedLanguage,
  type EmailType,
  type EmailTone,
} from "@/lib/validations/email-drafter";
import type { Client } from "@/lib/db/schema";

/**
 * Build the user message for Claude with client context and email request.
 */
function buildUserMessage(
  client: Client,
  emailType: EmailType,
  context: string,
  recipientName: string | undefined,
  recipientRole: string | undefined,
  language: SupportedLanguage,
  tone: EmailTone,
  includeAttachmentMention: boolean,
  variantCount: number
): string {
  const parts: string[] = [];

  // Email request
  parts.push(`EMAIL DRAFT REQUEST:`);
  parts.push(`- Email type: ${EMAIL_TYPE_LABELS[emailType]} (${emailType})`);
  parts.push(`- Language: ${LANGUAGE_LABELS[language]} (${language})`);
  parts.push(`- Tone: ${EMAIL_TONE_LABELS[tone]}`);
  parts.push(`- Include attachment mention: ${includeAttachmentMention ? "Yes" : "No"}`);
  parts.push(`- Number of variants requested: ${variantCount}`);

  // Recipient info
  if (recipientName || recipientRole) {
    parts.push(``);
    parts.push(`RECIPIENT:`);
    if (recipientName) parts.push(`- Name: ${recipientName}`);
    if (recipientRole) parts.push(`- Role: ${recipientRole}`);
  }

  // Client context
  parts.push(``);
  parts.push(`CLIENT CONTEXT:`);
  parts.push(`- Company: ${client.name}`);
  parts.push(`- Industry: ${client.industry}`);
  parts.push(`- Primary language: ${client.primaryLanguage}`);

  if (client.primaryContactName) {
    parts.push(`- Primary contact: ${client.primaryContactName}`);
  }
  if (client.brandTone) {
    parts.push(`- Brand tone: ${client.brandTone}`);
  }

  // Situation context
  parts.push(``);
  parts.push(`SITUATION / CONTEXT:`);
  parts.push(`---`);
  parts.push(context);
  parts.push(`---`);

  return parts.join("\n");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = emailDrafterRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const {
      clientId,
      emailType,
      context,
      recipientName,
      recipientRole,
      language,
      tone,
      includeAttachmentMention,
      variantCount,
    } = parsed.data;

    // Fetch client (required)
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1);

    if (!client) {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      );
    }

    // Build prompt and call Claude
    const userMessage = buildUserMessage(
      client,
      emailType,
      context,
      recipientName,
      recipientRole,
      language,
      tone,
      includeAttachmentMention,
      variantCount
    );

    const { data, usage } = await callClaudeJSON<EmailDrafterResponse>({
      systemPrompt: EMAIL_DRAFTER_SYSTEM_PROMPT,
      userMessage,
      model: "claude-sonnet-4-5-20241022",
      maxTokens: 8192,
    });

    // Validate Claude's response
    const validatedResponse = emailDrafterResponseSchema.safeParse(data);

    if (!validatedResponse.success) {
      console.error(
        "Claude Email Drafter response failed validation:",
        validatedResponse.error
      );
      return NextResponse.json(
        { error: "AI email draft produced invalid output. Please try again." },
        { status: 502 }
      );
    }

    // Save to agent_outputs
    const [savedOutput] = await db
      .insert(agentOutputs)
      .values({
        clientId,
        agentType: "email-drafter",
        inputPayload: {
          emailType,
          context,
          recipientName,
          recipientRole,
          language,
          tone,
          includeAttachmentMention,
          variantCount,
        },
        outputContent: JSON.stringify(validatedResponse.data),
        status: "done",
      })
      .returning({ id: agentOutputs.id });

    return NextResponse.json({
      email: validatedResponse.data,
      outputId: savedOutput.id,
      usage,
    });
  } catch (error: unknown) {
    console.error("Email Drafter error:", error);

    const message =
      error instanceof Error ? error.message : "Failed to draft email";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
