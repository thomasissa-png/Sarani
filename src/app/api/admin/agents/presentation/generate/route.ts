import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clients, agentOutputs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { callClaudeJSON } from "@/lib/ai/claude";
import { PRESENTATION_SYSTEM_PROMPT } from "@/lib/ai/prompts/presentation";
import {
  presentationGenerateSchema,
  presentationOutputSchema,
  type PresentationOutput,
} from "@/lib/validations/presentation";
import type { Client } from "@/lib/db/schema";

const MODEL = "claude-sonnet-4-5-20241022";
const MAX_TOKENS = 16384;

/**
 * Build the user message for Claude with full client context and presentation brief.
 */
function buildUserMessage(
  client: Client,
  presentationType: string,
  topic: string,
  audienceDescription: string,
  slideCount: number,
  language: string,
  keyMessages?: string,
  includeData?: boolean
): string {
  const parts: string[] = [];

  parts.push(`CLIENT CONTEXT:`);
  parts.push(`- Name: ${client.name}`);
  parts.push(`- Industry: ${client.industry}`);
  parts.push(`- Primary language: ${client.primaryLanguage}`);

  if (
    client.secondaryLanguages &&
    Array.isArray(client.secondaryLanguages) &&
    client.secondaryLanguages.length > 0
  ) {
    parts.push(
      `- Secondary languages: ${client.secondaryLanguages.join(", ")}`
    );
  }

  if (client.brandTone) {
    parts.push(`- Brand tone: ${client.brandTone}`);
  }

  if (client.primaryColor) {
    parts.push(`- Primary brand color: ${client.primaryColor}`);
  }

  if (client.secondaryColors) {
    parts.push(`- Secondary colors: ${client.secondaryColors}`);
  }

  if (client.fontName) {
    parts.push(`- Brand font: ${client.fontName}`);
  }

  if (client.brandGuidelinesNotes) {
    parts.push(`- Brand guidelines: ${client.brandGuidelinesNotes}`);
  }

  if (client.prohibitedTerms) {
    parts.push(`- Prohibited terms: ${client.prohibitedTerms}`);
  }

  parts.push(``);
  parts.push(`PRESENTATION BRIEF:`);
  parts.push(`- Type: ${presentationType}`);
  parts.push(`- Topic: ${topic}`);
  parts.push(`- Target audience: ${audienceDescription}`);
  parts.push(`- Number of slides: ${slideCount}`);
  parts.push(`- Language: ${language}`);
  parts.push(`- Include data/metrics slides: ${includeData ? "Yes" : "No"}`);

  if (keyMessages && keyMessages.trim()) {
    parts.push(``);
    parts.push(`KEY MESSAGES TO INCORPORATE:`);
    parts.push(keyMessages);
  }

  return parts.join("\n");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = presentationGenerateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const {
      clientId,
      presentationType,
      topic,
      audienceDescription,
      slideCount,
      language,
      keyMessages,
      includeData,
    } = parsed.data;

    // Optional: link to a tracker project (not part of agent-specific validation)
    const clickupTaskId =
      typeof body.clickupTaskId === "string" ? body.clickupTaskId : null;

    // Fetch client record
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

    // Call Claude Presentation agent
    const userMessage = buildUserMessage(
      client,
      presentationType,
      topic,
      audienceDescription,
      slideCount,
      language,
      keyMessages,
      includeData
    );

    const { data, usage } = await callClaudeJSON<PresentationOutput>({
      systemPrompt: PRESENTATION_SYSTEM_PROMPT,
      userMessage,
      model: MODEL,
      maxTokens: MAX_TOKENS,
    });

    // Validate Claude's response against our schema
    const validated = presentationOutputSchema.safeParse(data);

    if (!validated.success) {
      console.error(
        "Claude Presentation response failed validation:",
        validated.error
      );
      return NextResponse.json(
        {
          error:
            "AI presentation produced invalid output. Please try again.",
        },
        { status: 502 }
      );
    }

    // Save to agent_outputs
    const [saved] = await db
      .insert(agentOutputs)
      .values({
        clientId,
        agentType: "presentation",
        inputPayload: {
          presentationType,
          topic,
          audienceDescription,
          slideCount,
          language,
          keyMessages: keyMessages ?? null,
          includeData: includeData ?? false,
        },
        outputContent: JSON.stringify(validated.data),
        status: "done",
        clickupTaskId,
      })
      .returning({ id: agentOutputs.id });

    return NextResponse.json({
      presentation: validated.data,
      outputId: saved.id,
      usage,
    });
  } catch (error: unknown) {
    console.error("Presentation generate error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Failed to generate presentation";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
