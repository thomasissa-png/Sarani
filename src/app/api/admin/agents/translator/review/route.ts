import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clients, clientGlossaryEntries, agentOutputs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { callClaudeJSON } from "@/lib/ai/claude";
import { TRANSLATOR_REVIEW_PROMPT } from "@/lib/ai/prompts/translator";
import {
  reviewRequestSchema,
  reviewResponseSchema,
  type ReviewResponse,
  LANGUAGE_LABELS,
  type SupportedLanguage,
} from "@/lib/validations/translator";
import type { Client, ClientGlossaryEntry } from "@/lib/db/schema";

/**
 * Build the user message for Claude review with client context and text to review.
 */
function buildReviewUserMessage(
  client: Client | null,
  glossaryEntries: ClientGlossaryEntry[],
  textToReview: string,
  textLanguage: SupportedLanguage,
  contextNote?: string
): string {
  const parts: string[] = [];

  const languageName = LANGUAGE_LABELS[textLanguage];
  parts.push(`REVIEW REQUEST:`);
  parts.push(`- Text language: ${languageName} (${textLanguage})`);

  if (contextNote) {
    parts.push(`- Context: ${contextNote}`);
  }

  // Client context
  if (client) {
    parts.push(``);
    parts.push(`CLIENT CONTEXT:`);
    parts.push(`- Name: ${client.name}`);
    parts.push(`- Industry: ${client.industry}`);

    if (client.brandTone) {
      parts.push(`- Brand tone: ${client.brandTone}`);
    }

    if (client.prohibitedTerms) {
      parts.push(``);
      parts.push(`PROHIBITED TERMS (flag if any of these appear in the text):`);
      parts.push(client.prohibitedTerms);
    }
  }

  // Glossary — check against all entries for this language
  if (glossaryEntries.length > 0) {
    parts.push(``);
    parts.push(
      `CLIENT GLOSSARY (check if the text uses these mandated terms correctly):`
    );
    for (const entry of glossaryEntries) {
      parts.push(
        `- "${entry.sourceTerm}" should be "${entry.targetTerm}" [${entry.languagePair}]`
      );
    }
  } else if (client) {
    parts.push(``);
    parts.push(
      `NOTE: No glossary entries found for this client and language. Skip glossary compliance checks.`
    );
  }

  // Text to review
  parts.push(``);
  parts.push(`TEXT TO REVIEW:`);
  parts.push(`---`);
  parts.push(textToReview);
  parts.push(`---`);

  return parts.join("\n");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = reviewRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { clientId, textToReview, textLanguage, contextNote } = parsed.data;

    // Fetch client if provided
    let client: Client | null = null;
    let glossaryEntries: ClientGlossaryEntry[] = [];

    if (clientId) {
      const [foundClient] = await db
        .select()
        .from(clients)
        .where(eq(clients.id, clientId))
        .limit(1);

      if (!foundClient) {
        return NextResponse.json(
          { error: "Client not found" },
          { status: 404 }
        );
      }

      client = foundClient;

      // Fetch all glossary entries for this client that involve the text language
      const allGlossary = await db
        .select()
        .from(clientGlossaryEntries)
        .where(eq(clientGlossaryEntries.clientId, clientId));

      // Filter entries where the target language matches the text language
      const langLower = textLanguage.toLowerCase();
      glossaryEntries = allGlossary.filter((entry) => {
        const pair = entry.languagePair.toLowerCase();
        return pair.endsWith(`>${langLower}`) || pair.startsWith(`${langLower}>`);
      });
    }

    // Build prompt and call Claude
    const userMessage = buildReviewUserMessage(
      client,
      glossaryEntries,
      textToReview,
      textLanguage,
      contextNote
    );

    const { data, usage } = await callClaudeJSON<ReviewResponse>({
      systemPrompt: TRANSLATOR_REVIEW_PROMPT,
      userMessage,
      model: "claude-sonnet-4-5-20241022",
      maxTokens: 8192,
    });

    // Validate Claude's response
    const validatedResponse = reviewResponseSchema.safeParse(data);

    if (!validatedResponse.success) {
      console.error(
        "Claude Review response failed validation:",
        validatedResponse.error
      );
      return NextResponse.json(
        { error: "AI review produced invalid output. Please try again." },
        { status: 502 }
      );
    }

    // Save to agent_outputs (only if client is selected)
    let outputId: string | null = null;

    if (clientId) {
      const [savedOutput] = await db
        .insert(agentOutputs)
        .values({
          clientId,
          agentType: "translator-review",
          inputPayload: {
            textToReview,
            textLanguage,
            contextNote: contextNote ?? null,
          },
          outputContent: JSON.stringify(validatedResponse.data),
          status: "done",
        })
        .returning({ id: agentOutputs.id });

      outputId = savedOutput.id;
    }

    return NextResponse.json({
      review: validatedResponse.data,
      outputId,
      usage,
    });
  } catch (error: unknown) {
    console.error("Translator review error:", error);

    const message =
      error instanceof Error ? error.message : "Failed to review text";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
