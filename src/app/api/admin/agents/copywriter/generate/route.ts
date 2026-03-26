import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clients, agentOutputs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { callClaudeJSON } from "@/lib/ai/claude";
import { COPYWRITER_SYSTEM_PROMPT } from "@/lib/ai/prompts/copywriter";
import {
  copywriterRequestSchema,
  copywriterResponseSchema,
  CONTENT_TYPE_LABELS,
  LANGUAGE_LABELS,
  type CopywriterResponse,
  type ContentType,
} from "@/lib/validations/copywriter";
import type { Client } from "@/lib/db/schema";
import type { SupportedLanguage } from "@/lib/validations/translator";

/**
 * Build the user message for Claude with client context and content brief.
 */
function buildUserMessage(
  client: Client,
  contentType: ContentType,
  topic: string,
  targetAudience: string,
  language: SupportedLanguage,
  variantCount: number,
  tone?: string,
  keyMessages?: string
): string {
  const parts: string[] = [];

  // Content brief
  const contentLabel = CONTENT_TYPE_LABELS[contentType];
  const languageName = LANGUAGE_LABELS[language];
  parts.push(`CONTENT REQUEST:`);
  parts.push(`- Content type: ${contentLabel} (${contentType})`);
  parts.push(`- Language: ${languageName} (${language})`);
  parts.push(`- Target audience: ${targetAudience}`);
  parts.push(`- Number of variants requested: ${variantCount}`);

  // Client context
  parts.push(``);
  parts.push(`CLIENT CONTEXT:`);
  parts.push(`- Name: ${client.name}`);
  parts.push(`- Industry: ${client.industry}`);

  if (client.brandTone) {
    parts.push(`- Brand tone: ${client.brandTone}`);
  }

  if (client.brandGuidelinesNotes) {
    parts.push(`- Brand guidelines: ${client.brandGuidelinesNotes}`);
  }

  // Tone override
  if (tone) {
    parts.push(``);
    parts.push(`TONE OVERRIDE (use this instead of default brand tone):`);
    parts.push(tone);
  }

  // Key messages
  if (keyMessages) {
    parts.push(``);
    parts.push(`KEY MESSAGES TO INCLUDE:`);
    parts.push(keyMessages);
  }

  // Topic / brief
  parts.push(``);
  parts.push(`TOPIC / BRIEF:`);
  parts.push(`---`);
  parts.push(topic);
  parts.push(`---`);

  // Variant instructions
  if (variantCount > 1) {
    parts.push(``);
    parts.push(
      `Generate exactly ${variantCount - 1} variant(s) in the "variants" array (in addition to the primary version in "headline" and "body"). Each variant must take a different creative angle.`
    );
  } else {
    parts.push(``);
    parts.push(`Generate only the primary version. The "variants" array should be empty.`);
  }

  return parts.join("\n");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = copywriterRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const {
      clientId,
      contentType,
      topic,
      targetAudience,
      tone,
      language,
      keyMessages,
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
      contentType,
      topic,
      targetAudience,
      language,
      variantCount,
      tone,
      keyMessages
    );

    const { data, usage } = await callClaudeJSON<CopywriterResponse>({
      systemPrompt: COPYWRITER_SYSTEM_PROMPT,
      userMessage,
      model: "claude-sonnet-4-5-20241022",
      maxTokens: 8192,
    });

    // Validate Claude's response
    const validatedResponse = copywriterResponseSchema.safeParse(data);

    if (!validatedResponse.success) {
      console.error(
        "Claude Copywriter response failed validation:",
        validatedResponse.error
      );
      return NextResponse.json(
        { error: "AI copywriter produced invalid output. Please try again." },
        { status: 502 }
      );
    }

    // Save to agent_outputs
    const [savedOutput] = await db
      .insert(agentOutputs)
      .values({
        clientId,
        agentType: "copywriter",
        inputPayload: {
          contentType,
          topic,
          targetAudience,
          tone,
          language,
          keyMessages,
          variantCount,
        },
        outputContent: JSON.stringify(validatedResponse.data),
        status: "done",
      })
      .returning({ id: agentOutputs.id });

    return NextResponse.json({
      content: validatedResponse.data,
      outputId: savedOutput.id,
      usage,
    });
  } catch (error: unknown) {
    console.error("Copywriter error:", error);

    const message =
      error instanceof Error ? error.message : "Failed to generate content";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
