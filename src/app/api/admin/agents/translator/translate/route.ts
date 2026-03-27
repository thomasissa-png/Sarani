import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clients, clientGlossaryEntries, agentOutputs } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { callClaudeJSON } from "@/lib/ai/claude";
import { TRANSLATOR_SYSTEM_PROMPT } from "@/lib/ai/prompts/translator";
import {
  translateRequestSchema,
  translatorResponseSchema,
  type TranslatorResponse,
  LANGUAGE_LABELS,
  type SupportedLanguage,
} from "@/lib/validations/translator";
import type { Client, ClientGlossaryEntry } from "@/lib/db/schema";

/**
 * Build the user message for Claude with client context, glossary, and source text.
 */
function buildUserMessage(
  client: Client | null,
  glossaryEntries: ClientGlossaryEntry[],
  inputText: string,
  sourceLanguage: SupportedLanguage,
  targetLanguage: SupportedLanguage,
  formalRegister: boolean
): string {
  const parts: string[] = [];

  // Language pair
  const sourceName = LANGUAGE_LABELS[sourceLanguage];
  const targetName = LANGUAGE_LABELS[targetLanguage];
  parts.push(`TRANSLATION REQUEST:`);
  parts.push(`- Source language: ${sourceName} (${sourceLanguage})`);
  parts.push(`- Target language: ${targetName} (${targetLanguage})`);
  parts.push(
    `- Register: ${formalRegister ? "Formal (professional, polished)" : "Standard (natural, professional but conversational)"}`
  );

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
      parts.push(`PROHIBITED TERMS (never use these in the translation):`);
      parts.push(client.prohibitedTerms);
    }

    if (client.translationMemory) {
      parts.push(``);
      parts.push(
        `TRANSLATION MEMORY (maintain consistency with these validated translations):`
      );
      parts.push(client.translationMemory);
    }
  }

  // Glossary
  if (glossaryEntries.length > 0) {
    parts.push(``);
    parts.push(
      `CLIENT GLOSSARY (use these exact translations when the source term appears):`
    );
    for (const entry of glossaryEntries) {
      parts.push(
        `- "${entry.sourceTerm}" -> "${entry.targetTerm}" [${entry.languagePair}]`
      );
    }
  } else if (client) {
    parts.push(``);
    parts.push(
      `NOTE: No glossary entries found for this client and language pair. Translate naturally.`
    );
  }

  // Source text
  parts.push(``);
  parts.push(`SOURCE TEXT TO TRANSLATE:`);
  parts.push(`---`);
  parts.push(inputText);
  parts.push(`---`);

  return parts.join("\n");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = translateRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { clientId, sourceLanguage, targetLanguage, inputText, formalRegister } =
      parsed.data;

    // Optional: link to a tracker project (not part of agent-specific validation)
    const clickupTaskId =
      typeof body.clickupTaskId === "string" ? body.clickupTaskId : null;

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

      // Fetch glossary entries for this client and language pair (both directions)
      const langPairForward = `${sourceLanguage.toLowerCase()}>${targetLanguage.toLowerCase()}`;
      const langPairReverse = `${targetLanguage.toLowerCase()}>${sourceLanguage.toLowerCase()}`;

      glossaryEntries = await db
        .select()
        .from(clientGlossaryEntries)
        .where(
          and(
            eq(clientGlossaryEntries.clientId, clientId),
            eq(clientGlossaryEntries.languagePair, langPairForward)
          )
        );

      // Also fetch reverse entries (target->source becomes source->target)
      const reverseEntries = await db
        .select()
        .from(clientGlossaryEntries)
        .where(
          and(
            eq(clientGlossaryEntries.clientId, clientId),
            eq(clientGlossaryEntries.languagePair, langPairReverse)
          )
        );

      // Flip reverse entries so sourceTerm/targetTerm are in the right direction
      for (const entry of reverseEntries) {
        glossaryEntries.push({
          ...entry,
          sourceTerm: entry.targetTerm,
          targetTerm: entry.sourceTerm,
          languagePair: langPairForward,
        });
      }
    }

    // Build prompt and call Claude
    const userMessage = buildUserMessage(
      client,
      glossaryEntries,
      inputText,
      sourceLanguage,
      targetLanguage,
      formalRegister
    );

    const { data, usage } = await callClaudeJSON<TranslatorResponse>({
      systemPrompt: TRANSLATOR_SYSTEM_PROMPT,
      userMessage,
      model: "claude-sonnet-4-5-20241022",
      maxTokens: 8192,
    });

    // Validate Claude's response
    const validatedResponse = translatorResponseSchema.safeParse(data);

    if (!validatedResponse.success) {
      console.error(
        "Claude Translator response failed validation:",
        validatedResponse.error
      );
      return NextResponse.json(
        { error: "AI translation produced invalid output. Please try again." },
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
          agentType: "translator",
          inputPayload: {
            sourceLanguage,
            targetLanguage,
            inputText,
            formalRegister,
          },
          outputContent: JSON.stringify(validatedResponse.data),
          status: "done",
          clickupTaskId,
        })
        .returning({ id: agentOutputs.id });

      outputId = savedOutput.id;
    }

    return NextResponse.json({
      translation: validatedResponse.data,
      outputId,
      usage,
    });
  } catch (error: unknown) {
    console.error("Translator error:", error);

    const message =
      error instanceof Error ? error.message : "Failed to translate text";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
