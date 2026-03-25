import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clients, agentOutputs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { callClaudeJSON } from "@/lib/ai/claude";
import { PM_SYSTEM_PROMPT } from "@/lib/ai/prompts/pm";
import {
  analyzeBriefSchema,
  pmAnalysisSchema,
  type PMAnalysis,
} from "@/lib/validations/pm";
import type { Client } from "@/lib/db/schema";

/**
 * Build the user message for Claude with full client context.
 */
function buildUserMessage(
  client: Client,
  brief: string,
  deadline: string | undefined,
  priority: string
): string {
  const parts: string[] = [];

  parts.push(`CLIENT CONTEXT:`);
  parts.push(`- Name: ${client.name}`);
  parts.push(`- Industry: ${client.industry}`);
  parts.push(`- Primary language: ${client.primaryLanguage}`);

  if (client.secondaryLanguages && Array.isArray(client.secondaryLanguages) && client.secondaryLanguages.length > 0) {
    parts.push(`- Secondary languages: ${client.secondaryLanguages.join(", ")}`);
  }

  if (client.brandTone) {
    parts.push(`- Brand tone: ${client.brandTone}`);
  }

  if (client.primaryColor) {
    parts.push(`- Primary brand color: ${client.primaryColor}`);
  }

  if (client.fontName) {
    parts.push(`- Brand font: ${client.fontName}`);
  }

  if (client.brandGuidelinesNotes) {
    parts.push(`- Brand guidelines: ${client.brandGuidelinesNotes}`);
  }

  if (client.translationMemory) {
    parts.push(`- Translation memory available: yes`);
  }

  if (client.prohibitedTerms) {
    parts.push(`- Prohibited terms: ${client.prohibitedTerms}`);
  }

  if (client.legalEntityName) {
    parts.push(`- Legal entity: ${client.legalEntityName}`);
  }

  if (client.preferredContractTemplate) {
    parts.push(`- Preferred contract template: ${client.preferredContractTemplate}`);
  }

  parts.push(``);
  parts.push(`BRIEF:`);
  parts.push(brief);
  parts.push(``);
  parts.push(`DEADLINE: ${deadline || "Not specified (Sarani default: D+1)"}`);
  parts.push(`PRIORITY: ${priority}`);

  return parts.join("\n");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = analyzeBriefSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { clientId, brief, deadline, priority } = parsed.data;

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

    // Call Claude PM agent
    const userMessage = buildUserMessage(client, brief, deadline, priority);

    const { data, usage } = await callClaudeJSON<PMAnalysis>({
      systemPrompt: PM_SYSTEM_PROMPT,
      userMessage,
      maxTokens: 4096,
    });

    // Validate Claude's response against our schema
    const validatedAnalysis = pmAnalysisSchema.safeParse(data);

    if (!validatedAnalysis.success) {
      console.error("Claude PM response failed validation:", validatedAnalysis.error);
      return NextResponse.json(
        { error: "AI analysis produced invalid output. Please try again." },
        { status: 502 }
      );
    }

    // Save to agent_outputs (like all other agents)
    const [savedOutput] = await db
      .insert(agentOutputs)
      .values({
        clientId,
        agentType: "pm",
        inputPayload: {
          brief,
          deadline,
          priority,
        },
        outputContent: JSON.stringify(validatedAnalysis.data),
        status: "done",
      })
      .returning({ id: agentOutputs.id });

    return NextResponse.json({
      analysis: validatedAnalysis.data,
      outputId: savedOutput.id,
      usage,
    });
  } catch (error: unknown) {
    console.error("PM analyze error:", error);

    const message =
      error instanceof Error ? error.message : "Failed to analyze brief";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
