import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromSession } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { callClaudeJSON } from "@/lib/ai/claude";
import {
  BRIEF_EXTRACTOR_SYSTEM_PROMPT,
  BriefExtractionResultSchema,
  buildBriefExtractionUserMessage,
  type BriefExtractionResult,
} from "@/lib/ai/prompts/brief-extractor";
import { buildClientProfileBlock } from "@/lib/arya/client-profile-builder";

const RequestSchema = z.object({
  emailSubject: z.string(),
  emailBody: z.string(),
  senderEmail: z.string(),
});

export async function POST(request: NextRequest) {
  const session = await getUserFromSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!checkRateLimit("brief-extract", 20, 60_000)) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  let body: z.infer<typeof RequestSchema>;
  try {
    const rawBody = await request.json();
    body = RequestSchema.parse(rawBody);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    // Load client profile (non-blocking — empty string if unavailable)
    const clientProfile = await buildClientProfileBlock({
      senderEmail: body.senderEmail,
    });

    const llmResult = await callClaudeJSON<BriefExtractionResult>({
      systemPrompt: BRIEF_EXTRACTOR_SYSTEM_PROMPT,
      userMessage: buildBriefExtractionUserMessage({
        emailSubject: body.emailSubject,
        emailBody: body.emailBody,
        senderEmail: body.senderEmail,
      }) + clientProfile,
      model: "claude-haiku-4-5-20251001",
      maxTokens: 1024,
      timeout: 20_000,
    });

    const parsed = BriefExtractionResultSchema.safeParse(llmResult.data);
    if (!parsed.success) {
      console.error("[Brief Extract] LLM returned invalid data:", parsed.error.flatten());
      return NextResponse.json({ error: "Extraction failed" }, { status: 500 });
    }

    return NextResponse.json(parsed.data);
  } catch (error) {
    console.error("[Brief Extract] Error:", error);
    return NextResponse.json({ error: "Extraction failed" }, { status: 500 });
  }
}
