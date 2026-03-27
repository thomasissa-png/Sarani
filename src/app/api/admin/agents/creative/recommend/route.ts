import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clients, agentOutputs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { callClaudeJSON } from "@/lib/ai/claude";
import { CREATIVE_SYSTEM_PROMPT } from "@/lib/ai/prompts/creative";
import {
  creativeRecommendSchema,
  creativeRecommendationSchema,
  type CreativeRecommendation,
} from "@/lib/validations/creative";
import type { Client } from "@/lib/db/schema";

const MODEL = "claude-opus-4-20250514";
const MAX_TOKENS = 8192;

/**
 * Build the user message for Claude with full client context and campaign brief.
 */
function buildUserMessage(
  client: Client,
  campaignObjective: string,
  targetMarkets: string[],
  timeline: string,
  budget?: { amount: number; currency: string },
  constraints?: string
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
  parts.push(`CAMPAIGN BRIEF:`);
  parts.push(`- Objective: ${campaignObjective}`);
  parts.push(`- Target markets: ${targetMarkets.join(", ")}`);
  parts.push(`- Timeline: ${timeline}`);

  if (budget) {
    parts.push(`- Budget: ${budget.amount.toLocaleString()} ${budget.currency}`);
  } else {
    parts.push(`- Budget: Not specified`);
  }

  if (constraints) {
    parts.push(``);
    parts.push(`CONSTRAINTS / ADDITIONAL CONTEXT:`);
    parts.push(constraints);
  }

  return parts.join("\n");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = creativeRecommendSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const {
      clientId,
      campaignObjective,
      targetMarkets,
      budget,
      timeline,
      constraints,
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

    // Call Claude Creative Strategist agent
    const userMessage = buildUserMessage(
      client,
      campaignObjective,
      targetMarkets,
      timeline,
      budget,
      constraints
    );

    const { data, usage } = await callClaudeJSON<CreativeRecommendation>({
      systemPrompt: CREATIVE_SYSTEM_PROMPT,
      userMessage,
      model: MODEL,
      maxTokens: MAX_TOKENS,
    });

    // Validate Claude's response against our schema
    const validated = creativeRecommendationSchema.safeParse(data);

    if (!validated.success) {
      console.error(
        "Claude Creative response failed validation:",
        validated.error
      );
      return NextResponse.json(
        {
          error:
            "AI recommendation produced invalid output. Please try again.",
        },
        { status: 502 }
      );
    }

    // Save to agent_outputs
    const [saved] = await db
      .insert(agentOutputs)
      .values({
        clientId,
        agentType: "creative",
        inputPayload: {
          campaignObjective,
          targetMarkets,
          budget: budget ?? null,
          timeline,
          constraints: constraints ?? null,
        },
        outputContent: JSON.stringify(validated.data),
        status: "done",
        clickupTaskId,
      })
      .returning({ id: agentOutputs.id });

    return NextResponse.json({
      recommendation: validated.data,
      outputId: saved.id,
      usage,
    });
  } catch (error: unknown) {
    console.error("Creative recommend error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Failed to generate recommendation";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
