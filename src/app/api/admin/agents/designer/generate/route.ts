import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clients, agentOutputs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { callClaudeJSON } from "@/lib/ai/claude";
import { DESIGNER_SYSTEM_PROMPT } from "@/lib/ai/prompts/designer";
import {
  designerGenerateRequestSchema,
  designerResponseSchema,
  type DesignerResponse,
  ASSET_TYPE_LABELS,
  STYLE_LABELS,
  PLATFORM_LABELS,
  type AssetType,
  type DesignStyle,
  type DesignPlatform,
} from "@/lib/validations/designer";
import type { Client } from "@/lib/db/schema";

/**
 * Build the user message for Claude with full brand context.
 */
function buildUserMessage(
  client: Client,
  assetType: AssetType,
  dimensions: string,
  quantity: number,
  briefDescription: string,
  style: DesignStyle,
  platform: DesignPlatform
): string {
  const parts: string[] = [];

  // Design request
  parts.push(`DESIGN REQUEST:`);
  parts.push(`- Asset type: ${ASSET_TYPE_LABELS[assetType]}`);
  parts.push(`- Dimensions: ${dimensions}`);
  parts.push(`- Number of variations: ${quantity}`);
  parts.push(`- Visual style: ${STYLE_LABELS[style]}`);
  parts.push(`- Target platform: ${PLATFORM_LABELS[platform]}`);

  // Client context
  parts.push(``);
  parts.push(`CLIENT CONTEXT:`);
  parts.push(`- Name: ${client.name}`);
  parts.push(`- Industry: ${client.industry}`);

  // Brand assets — this is critical for the designer agent
  parts.push(``);
  parts.push(`BRAND ASSETS:`);

  if (client.primaryColor) {
    parts.push(`- Primary color: ${client.primaryColor}`);
  } else {
    parts.push(
      `- Primary color: NOT DEFINED — flag this in notes, use a professional default`
    );
  }

  if (client.secondaryColors) {
    parts.push(`- Secondary colors: ${client.secondaryColors}`);
  } else {
    parts.push(`- Secondary colors: NOT DEFINED`);
  }

  if (client.fontName) {
    parts.push(`- Brand font: ${client.fontName}`);
  } else {
    parts.push(
      `- Brand font: NOT DEFINED — flag this in notes, recommend a professional alternative`
    );
  }

  if (client.brandTone) {
    parts.push(`- Brand tone: ${client.brandTone}`);
  } else {
    parts.push(`- Brand tone: NOT DEFINED`);
  }

  if (client.brandGuidelinesNotes) {
    parts.push(``);
    parts.push(`BRAND GUIDELINES NOTES:`);
    parts.push(client.brandGuidelinesNotes);
  }

  // Brief description
  parts.push(``);
  parts.push(`CREATIVE BRIEF FROM CLIENT:`);
  parts.push(`---`);
  parts.push(briefDescription);
  parts.push(`---`);

  // Platform-specific instructions
  parts.push(``);
  if (platform === "web") {
    parts.push(`PLATFORM NOTES: This is for web/digital use. Use RGB color space, 72dpi, optimize for screen display. Consider responsive breakpoints.`);
  } else if (platform === "print") {
    parts.push(`PLATFORM NOTES: This is for print. Use CMYK color space, 300dpi minimum. Include bleed area (3mm). Consider paper stock and finish.`);
  } else if (platform === "social") {
    parts.push(`PLATFORM NOTES: This is for social media. Design must be scroll-stopping, text-overlay friendly. Respect platform safe zones for profile pictures, UI overlays, and text cutoffs.`);
  }

  return parts.join("\n");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = designerGenerateRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const {
      clientId,
      assetType,
      dimensions,
      quantity,
      briefDescription,
      style,
      platform,
    } = parsed.data;

    // Optional: link to a tracker project (not part of agent-specific validation)
    const clickupTaskId =
      typeof body.clickupTaskId === "string" ? body.clickupTaskId : null;

    // Fetch client (required for designer)
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
      assetType,
      dimensions,
      quantity,
      briefDescription,
      style,
      platform
    );

    const { data, usage } = await callClaudeJSON<DesignerResponse>({
      systemPrompt: DESIGNER_SYSTEM_PROMPT,
      userMessage,
      model: "claude-sonnet-4-5-20241022",
      maxTokens: 8192,
    });

    // Validate Claude's response
    const validatedResponse = designerResponseSchema.safeParse(data);

    if (!validatedResponse.success) {
      console.error(
        "Claude Designer response failed validation:",
        validatedResponse.error
      );
      return NextResponse.json(
        {
          error:
            "AI designer produced invalid output. Please try again.",
        },
        { status: 502 }
      );
    }

    // Save to agent_outputs
    const [savedOutput] = await db
      .insert(agentOutputs)
      .values({
        clientId,
        agentType: "designer",
        inputPayload: {
          assetType,
          dimensions,
          quantity,
          briefDescription,
          style,
          platform,
        },
        outputContent: JSON.stringify(validatedResponse.data),
        status: "done",
        clickupTaskId,
      })
      .returning({ id: agentOutputs.id });

    return NextResponse.json({
      design: validatedResponse.data,
      outputId: savedOutput.id,
      usage,
    });
  } catch (error: unknown) {
    console.error("Designer error:", error);

    const message =
      error instanceof Error ? error.message : "Failed to generate design brief";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
