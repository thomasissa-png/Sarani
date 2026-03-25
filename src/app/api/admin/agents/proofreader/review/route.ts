import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clients, clientGlossaryEntries, agentOutputs } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { callClaudeJSON } from "@/lib/ai/claude";
import { PROOFREADER_SYSTEM_PROMPT } from "@/lib/ai/prompts/proofreader";
import {
  proofreadRequestSchema,
  proofreadResponseSchema,
  CONTENT_TYPE_LABELS,
  PROOFREADER_LANGUAGE_LABELS,
  type ProofreadResponse,
  type ContentType,
  type ProofreaderLanguage,
} from "@/lib/validations/proofreader";
import type { Client, ClientGlossaryEntry } from "@/lib/db/schema";

/**
 * Build the user message for Claude with client context, glossary, and content to review.
 */
function buildUserMessage(
  client: Client | null,
  glossaryEntries: ClientGlossaryEntry[],
  contentToReview: string,
  contentType: ContentType,
  sourceLanguage: ProofreaderLanguage,
  checkBrand: boolean,
  checkGlossary: boolean
): string {
  const parts: string[] = [];

  // Review context
  const languageName = PROOFREADER_LANGUAGE_LABELS[sourceLanguage];
  const contentTypeName = CONTENT_TYPE_LABELS[contentType];
  parts.push(`REVIEW REQUEST:`);
  parts.push(`- Content type: ${contentTypeName}`);
  parts.push(`- Language: ${languageName} (${sourceLanguage})`);
  parts.push(`- Check brand consistency: ${checkBrand ? "YES" : "NO"}`);
  parts.push(`- Check glossary compliance: ${checkGlossary ? "YES" : "NO"}`);

  // Client context
  if (client) {
    parts.push(``);
    parts.push(`CLIENT CONTEXT:`);
    parts.push(`- Name: ${client.name}`);
    parts.push(`- Industry: ${client.industry}`);

    if (checkBrand && client.brandTone) {
      parts.push(``);
      parts.push(`BRAND TONE (the content must match this voice):`);
      parts.push(client.brandTone);
    }

    if (checkBrand && client.prohibitedTerms) {
      parts.push(``);
      parts.push(`PROHIBITED TERMS (flag any occurrence as a brand error):`);
      parts.push(client.prohibitedTerms);
    }

    if (checkBrand && client.brandGuidelinesNotes) {
      parts.push(``);
      parts.push(`BRAND GUIDELINES NOTES:`);
      parts.push(client.brandGuidelinesNotes);
    }
  }

  // Glossary
  if (checkGlossary && glossaryEntries.length > 0) {
    parts.push(``);
    parts.push(
      `CLIENT GLOSSARY (verify these terms are used correctly in the content):`
    );
    for (const entry of glossaryEntries) {
      parts.push(
        `- "${entry.sourceTerm}" -> "${entry.targetTerm}" [${entry.languagePair}]`
      );
    }
  } else if (checkGlossary && client) {
    parts.push(``);
    parts.push(
      `NOTE: No glossary entries found for this client and language. Score glossary compliance as 10.`
    );
  }

  if (!checkBrand) {
    parts.push(``);
    parts.push(
      `NOTE: Brand consistency check is disabled. Score brandConsistency as 10 with a note that it was not checked.`
    );
  }

  if (!checkGlossary) {
    parts.push(``);
    parts.push(
      `NOTE: Glossary compliance check is disabled. Score glossaryCompliance as 10 with a note that it was not checked.`
    );
  }

  // Content to review
  parts.push(``);
  parts.push(`CONTENT TO REVIEW:`);
  parts.push(`---`);
  parts.push(contentToReview);
  parts.push(`---`);

  return parts.join("\n");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = proofreadRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const {
      clientId,
      contentToReview,
      contentType,
      sourceLanguage,
      checkBrand,
      checkGlossary,
    } = parsed.data;

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

      // Fetch glossary entries for this client involving the source language
      if (checkGlossary) {
        const langLower = sourceLanguage.toLowerCase();

        // Fetch all glossary entries for this client, then filter for relevant language
        const allEntries = await db
          .select()
          .from(clientGlossaryEntries)
          .where(eq(clientGlossaryEntries.clientId, clientId));

        glossaryEntries = allEntries.filter((entry) => {
          const pair = entry.languagePair.toLowerCase();
          return pair.includes(langLower);
        });
      }
    }

    // Build prompt and call Claude
    const userMessage = buildUserMessage(
      client,
      glossaryEntries,
      contentToReview,
      contentType,
      sourceLanguage,
      checkBrand,
      checkGlossary
    );

    const { data, usage } = await callClaudeJSON<ProofreadResponse>({
      systemPrompt: PROOFREADER_SYSTEM_PROMPT,
      userMessage,
      model: "claude-sonnet-4-5-20250514",
      maxTokens: 8192,
    });

    // Validate Claude's response
    const validatedResponse = proofreadResponseSchema.safeParse(data);

    if (!validatedResponse.success) {
      console.error(
        "Claude Proofreader response failed validation:",
        validatedResponse.error
      );
      return NextResponse.json(
        { error: "AI review produced invalid output. Please try again." },
        { status: 502 }
      );
    }

    // Save to agent_outputs
    let outputId: string | null = null;

    if (clientId) {
      const [savedOutput] = await db
        .insert(agentOutputs)
        .values({
          clientId,
          agentType: "proofreader",
          inputPayload: {
            contentToReview,
            contentType,
            sourceLanguage,
            checkBrand,
            checkGlossary,
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
    console.error("Proofreader error:", error);

    const message =
      error instanceof Error ? error.message : "Failed to review content";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
