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
import { getPublicSharingLink } from "@/lib/integrations/sharepoint";
import {
  recommendTeamMembers,
  buildEstimationPromptBlock,
  getRecommendedPM,
} from "@/lib/integrations/config";

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
    // Load client profile — with strict timeout to avoid blocking the LLM call
    let clientProfile = "";
    try {
      const profilePromise = buildClientProfileBlock({
        senderEmail: body.senderEmail,
      });
      clientProfile = await Promise.race([
        profilePromise,
        new Promise<string>((resolve) => setTimeout(() => resolve(""), 3_000)),
      ]);
    } catch {
      // Non-blocking — continue without profile
    }

    // Build estimation reference block (all benchmarks — LLM picks relevant ones)
    const estimationBlock = buildEstimationPromptBlock("all");

    // Build team recommendation block (all non-PM members for LLM to pick from)
    const teamRecs = (() => {
      const seen = new Set<number>();
      const recs: ReturnType<typeof recommendTeamMembers> = [];
      for (const type of ["design", "video", "translation", "social"]) {
        for (const r of recommendTeamMembers({ projectType: type, limit: 15 })) {
          if (!seen.has(r.member.id)) {
            seen.add(r.member.id);
            recs.push(r);
          }
        }
      }
      return recs;
    })();
    const teamBlock = teamRecs.length > 0
      ? "\n\nTEAM AVAILABLE FOR ASSIGNMENT:\n" +
        teamRecs.map((r) =>
          `- ${r.member.name}: ${r.member.skills.join(", ")}, ${r.member.languages.map((l) => l.toUpperCase()).join("/")}${r.member.clients.length > 0 ? `, worked with ${r.member.clients.join(", ")}` : ""}`
        ).join("\n") +
        "\nRecommend the best match based on project type, languages needed, and client familiarity."
      : "";

    const llmResult = await callClaudeJSON<BriefExtractionResult>({
      systemPrompt: BRIEF_EXTRACTOR_SYSTEM_PROMPT,
      userMessage: buildBriefExtractionUserMessage({
        emailSubject: body.emailSubject,
        emailBody: body.emailBody,
        senderEmail: body.senderEmail,
      }) + clientProfile + estimationBlock + teamBlock,
      model: "claude-haiku-4-5-20251001",
      maxTokens: 1024,
      timeout: 20_000,
    });

    const parsed = BriefExtractionResultSchema.safeParse(llmResult.data);
    if (!parsed.success) {
      console.error("[Brief Extract] LLM returned invalid data:", parsed.error.flatten());
      return NextResponse.json({ error: "Extraction failed" }, { status: 500 });
    }

    // Convert private SharePoint links to public sharing links in brief body
    if (parsed.data.brief_body) {
      const spLinkRegex = /https:\/\/saranistudio\.sharepoint\.com\/[^\s)]+/g;
      const spLinks = parsed.data.brief_body.match(spLinkRegex) ?? [];
      for (const link of spLinks) {
        try {
          const publicLink = await getPublicSharingLink(link);
          if (publicLink !== link) {
            parsed.data.brief_body = parsed.data.brief_body.replace(link, publicLink);
          }
        } catch { /* keep original */ }
      }
    }

    // Add recommended PM based on client + timezone
    const clientName = parsed.data.client_name;
    const recommendedPMs = clientName ? getRecommendedPM(clientName) : [];

    return NextResponse.json({
      ...parsed.data,
      recommended_pm: recommendedPMs.length > 0 ? recommendedPMs[0] : undefined,
      recommended_pms: recommendedPMs,
    });
  } catch (error) {
    console.error("[Brief Extract] Error:", error);
    return NextResponse.json({ error: "Extraction failed" }, { status: 500 });
  }
}
