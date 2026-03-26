import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clients, agentOutputs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { callClaudeJSON } from "@/lib/ai/claude";
import { VIDEO_SCRIPT_SYSTEM_PROMPT } from "@/lib/ai/prompts/video-script";
import {
  videoScriptGenerateRequestSchema,
  videoScriptResponseSchema,
  VIDEO_FORMAT_LABELS,
  VIDEO_PLATFORM_LABELS,
  VIDEO_TONE_LABELS,
  VIDEO_LANGUAGE_LABELS,
  type VideoScriptResponse,
  type VideoScriptGenerateRequestInput,
} from "@/lib/validations/video-script";
import type { Client } from "@/lib/db/schema";

/**
 * Build the user message for Claude with client context and video script request.
 */
function buildUserMessage(
  client: Client,
  input: VideoScriptGenerateRequestInput
): string {
  const parts: string[] = [];

  // Video request
  parts.push(`VIDEO SCRIPT REQUEST:`);
  parts.push(`- Format: ${VIDEO_FORMAT_LABELS[input.videoFormat]}`);
  parts.push(`- Platform: ${VIDEO_PLATFORM_LABELS[input.platform]}`);
  parts.push(`- Tone: ${VIDEO_TONE_LABELS[input.tone]}`);
  parts.push(`- Language: ${VIDEO_LANGUAGE_LABELS[input.language]}`);
  parts.push(`- Number of variants requested: ${input.variantCount}`);

  // Client context
  parts.push(``);
  parts.push(`CLIENT CONTEXT:`);
  parts.push(`- Name: ${client.name}`);
  parts.push(`- Industry: ${client.industry}`);

  if (client.brandTone) {
    parts.push(`- Brand tone: ${client.brandTone}`);
  }

  if (client.brandGuidelinesNotes) {
    parts.push(``);
    parts.push(`BRAND GUIDELINES:`);
    parts.push(client.brandGuidelinesNotes);
  }

  // Topic
  parts.push(``);
  parts.push(`TOPIC / BRIEF:`);
  parts.push(input.topic);

  // Target audience
  if (input.targetAudience) {
    parts.push(``);
    parts.push(`TARGET AUDIENCE:`);
    parts.push(input.targetAudience);
  }

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
    const parsed = videoScriptGenerateRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const input = parsed.data;

    // Fetch client (required for video script agent)
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

    const { data, usage } = await callClaudeJSON<VideoScriptResponse>({
      systemPrompt: VIDEO_SCRIPT_SYSTEM_PROMPT,
      userMessage,
      model: "claude-sonnet-4-5-20241022",
      maxTokens: 8192,
    });

    // Validate Claude's response
    const validatedResponse = videoScriptResponseSchema.safeParse(data);

    if (!validatedResponse.success) {
      console.error(
        "Claude Video Script response failed validation:",
        validatedResponse.error
      );
      return NextResponse.json(
        { error: "AI script generation produced invalid output. Please try again." },
        { status: 502 }
      );
    }

    // Save to agent_outputs
    const [savedOutput] = await db
      .insert(agentOutputs)
      .values({
        clientId: input.clientId,
        agentType: "video-script",
        inputPayload: {
          videoFormat: input.videoFormat,
          platform: input.platform,
          topic: input.topic,
          targetAudience: input.targetAudience,
          tone: input.tone,
          keyMessages: input.keyMessages,
          language: input.language,
          variantCount: input.variantCount,
        },
        outputContent: JSON.stringify(validatedResponse.data),
        status: "done",
      })
      .returning({ id: agentOutputs.id });

    return NextResponse.json({
      script: validatedResponse.data,
      outputId: savedOutput.id,
      usage,
    });
  } catch (error: unknown) {
    console.error("Video script generate error:", error);

    const message =
      error instanceof Error ? error.message : "Failed to generate video script";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
