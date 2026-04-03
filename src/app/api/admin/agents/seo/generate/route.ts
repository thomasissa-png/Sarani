import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clients, agentOutputs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { callClaudeJSON } from "@/lib/ai/claude";
import { SEO_SYSTEM_PROMPT } from "@/lib/ai/prompts/seo";
import {
  seoGenerateRequestSchema,
  seoArticleResponseSchema,
  seoMetaDescriptionResponseSchema,
  seoKeywordResearchResponseSchema,
  seoBlogOutlineResponseSchema,
  SEO_LANGUAGE_LABELS,
  type SeoContentType,
  type SeoLanguage,
  type SeoResponse,
} from "@/lib/validations/seo";
import type { Client } from "@/lib/db/schema";

/**
 * Pick the right Zod schema to validate Claude's response based on content type.
 */
function getResponseSchema(contentType: SeoContentType) {
  switch (contentType) {
    case "article":
      return seoArticleResponseSchema;
    case "meta-description":
      return seoMetaDescriptionResponseSchema;
    case "keyword-research":
      return seoKeywordResearchResponseSchema;
    case "blog-outline":
      return seoBlogOutlineResponseSchema;
  }
}

/**
 * Build the user message for Claude with client context and SEO parameters.
 */
function buildUserMessage(
  client: Client,
  contentType: SeoContentType,
  targetKeyword: string,
  secondaryKeywords: string,
  language: SeoLanguage,
  wordCount: number,
  topic: string
): string {
  const parts: string[] = [];

  const languageName = SEO_LANGUAGE_LABELS[language];

  parts.push(`SEO CONTENT REQUEST:`);
  parts.push(`- Content type: ${contentType}`);
  parts.push(`- Target keyword: "${targetKeyword}"`);

  if (secondaryKeywords.trim()) {
    const keywords = secondaryKeywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
    parts.push(`- Secondary keywords: ${keywords.map((k) => `"${k}"`).join(", ")}`);
  }

  parts.push(`- Language: ${languageName} (${language})`);

  if (contentType === "article") {
    parts.push(`- Target word count: ${wordCount} words`);
  }

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

  // Topic / brief
  parts.push(``);
  parts.push(`TOPIC / BRIEF:`);
  parts.push(`---`);
  parts.push(topic);
  parts.push(`---`);

  return parts.join("\n");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = seoGenerateRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const {
      clientId,
      contentType,
      targetKeyword,
      secondaryKeywords,
      language,
      wordCount,
      topic,
    } = parsed.data;

    // Optional: link to a tracker project (not part of agent-specific validation)
    const clickupTaskId =
      typeof body.clickupTaskId === "string" ? body.clickupTaskId : null;

    // Fetch client
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
      targetKeyword,
      secondaryKeywords,
      language,
      wordCount,
      topic
    );

    // Articles need more tokens
    const maxTokens = contentType === "article" ? 16384 : 8192;

    const { data, usage } = await callClaudeJSON<SeoResponse>({
      systemPrompt: SEO_SYSTEM_PROMPT,
      userMessage,
      model: "claude-sonnet-4-5-20241022",
      maxTokens,
      timeout: maxTokens > 8192 ? 120_000 : 60_000,
    });

    // Validate Claude's response with the appropriate schema
    const responseSchema = getResponseSchema(contentType);
    const validatedResponse = responseSchema.safeParse(data);

    if (!validatedResponse.success) {
      console.error(
        "Claude SEO response failed validation:",
        validatedResponse.error
      );
      return NextResponse.json(
        { error: "AI produced invalid output. Please try again." },
        { status: 502 }
      );
    }

    // Save to agent_outputs
    const [savedOutput] = await db
      .insert(agentOutputs)
      .values({
        clientId,
        agentType: "seo",
        inputPayload: {
          contentType,
          targetKeyword,
          secondaryKeywords,
          language,
          wordCount,
          topic,
        },
        outputContent: JSON.stringify(validatedResponse.data),
        status: "done",
        clickupTaskId,
      })
      .returning({ id: agentOutputs.id });

    return NextResponse.json({
      result: validatedResponse.data,
      contentType,
      outputId: savedOutput.id,
      usage,
    });
  } catch (error: unknown) {
    console.error("SEO generate error:", error);

    const message =
      error instanceof Error ? error.message : "Failed to generate SEO content";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
