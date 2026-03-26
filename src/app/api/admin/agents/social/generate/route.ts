import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clients, agentOutputs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { callClaudeJSON } from "@/lib/ai/claude";
import { SOCIAL_SYSTEM_PROMPT } from "@/lib/ai/prompts/social";
import {
  socialGenerateRequestSchema,
  socialResponseSchema,
  PLATFORM_LABELS,
  CONTENT_TYPE_LABELS,
  SOCIAL_LANGUAGE_LABELS,
  type SocialResponse,
  type SocialGenerateRequestInput,
} from "@/lib/validations/social";
import type { Client } from "@/lib/db/schema";

/**
 * Build the user message for Claude with client context and content request.
 */
function buildUserMessage(
  client: Client,
  input: SocialGenerateRequestInput
): string {
  const parts: string[] = [];

  // Content request
  parts.push(`CONTENT REQUEST:`);
  parts.push(`- Platform: ${PLATFORM_LABELS[input.platform]}`);
  parts.push(`- Content type: ${CONTENT_TYPE_LABELS[input.contentType]}`);
  parts.push(`- Language: ${SOCIAL_LANGUAGE_LABELS[input.language]}`);
  parts.push(`- Number of variants requested: ${input.variantCount}`);

  // Client context
  parts.push(``);
  parts.push(`CLIENT CONTEXT:`);
  parts.push(`- Name: ${client.name}`);
  parts.push(`- Industry: ${client.industry}`);

  if (client.brandTone) {
    parts.push(`- Brand tone: ${client.brandTone}`);
  }

  if (input.tone) {
    parts.push(`- Tone override for this post: ${input.tone}`);
  }

  if (client.brandGuidelinesNotes) {
    parts.push(``);
    parts.push(`BRAND GUIDELINES:`);
    parts.push(client.brandGuidelinesNotes);
  }

  // Topic
  parts.push(``);
  parts.push(`TOPIC:`);
  parts.push(input.topic);

  // Key messages
  if (input.keyMessages) {
    parts.push(``);
    parts.push(`KEY MESSAGES TO INCORPORATE:`);
    parts.push(input.keyMessages);
  }

  return parts.join("\n");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = socialGenerateRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const input = parsed.data;

    // Fetch client (required for social agent)
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, input.clientId))
      .limit(1);

    if (!client) {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      );
    }

    // Build prompt and call Claude
    const userMessage = buildUserMessage(client, input);

    const { data, usage } = await callClaudeJSON<SocialResponse>({
      systemPrompt: SOCIAL_SYSTEM_PROMPT,
      userMessage,
      model: "claude-sonnet-4-5-20241022",
      maxTokens: 8192,
    });

    // Validate Claude's response
    const validatedResponse = socialResponseSchema.safeParse(data);

    if (!validatedResponse.success) {
      console.error(
        "Claude Social response failed validation:",
        validatedResponse.error
      );
      return NextResponse.json(
        { error: "AI content generation produced invalid output. Please try again." },
        { status: 502 }
      );
    }

    // Save to agent_outputs
    const [savedOutput] = await db
      .insert(agentOutputs)
      .values({
        clientId: input.clientId,
        agentType: "social",
        inputPayload: {
          platform: input.platform,
          contentType: input.contentType,
          topic: input.topic,
          keyMessages: input.keyMessages,
          tone: input.tone,
          language: input.language,
          variantCount: input.variantCount,
        },
        outputContent: JSON.stringify(validatedResponse.data),
        status: "done",
      })
      .returning({ id: agentOutputs.id });

    return NextResponse.json({
      social: validatedResponse.data,
      outputId: savedOutput.id,
      usage,
    });
  } catch (error: unknown) {
    console.error("Social generate error:", error);

    const message =
      error instanceof Error ? error.message : "Failed to generate social content";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
