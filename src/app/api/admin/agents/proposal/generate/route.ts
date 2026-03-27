import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentOutputs } from "@/lib/db/schema";
import { callClaudeJSON } from "@/lib/ai/claude";
import { PROPOSAL_SYSTEM_PROMPT } from "@/lib/ai/prompts/proposal";
import {
  proposalGenerateSchema,
  proposalResponseSchema,
  type ProposalResponse,
  type ProposalGenerateInput,
  SERVICE_LABELS,
} from "@/lib/validations/proposal";
import { caseStudies, type CaseStudy } from "@/data/case-studies";

const MODEL = "claude-opus-4-20250514";
const MAX_TOKENS = 8192;

/**
 * Map services to case study tags/deliverables for relevance filtering.
 */
const SERVICE_TO_KEYWORDS: Record<string, string[]> = {
  design: ["design", "banner", "graphic", "assets"],
  video: ["video", "editing", "edits"],
  branding: ["branding", "rebranding", "brand"],
  "social-media": ["social", "campaign", "content"],
  content: ["content", "campaign", "copy"],
  translation: ["translation", "languages", "language"],
  events: ["event", "venue", "tour"],
  presentations: ["presentation", "slides", "slide"],
};

/**
 * Filter case studies by industry and/or requested services.
 * Returns the most relevant ones (max 6 passed to Claude, which picks 2-4).
 */
function selectRelevantCaseStudies(
  input: ProposalGenerateInput
): CaseStudy[] {
  const scored = caseStudies.map((cs) => {
    let score = 0;

    // Industry match — check client name or tags for industry signals
    if (input.prospectIndustry) {
      const industry = input.prospectIndustry.toLowerCase();
      const clientLower = cs.client.toLowerCase();
      const deliverableLower = cs.deliverable.toLowerCase();
      const tagsLower = (cs.tags ?? []).map((t) => t.toLowerCase());

      // Direct industry matches
      const industryClientMap: Record<string, string[]> = {
        tech: ["tiktok", "sony"],
        luxury: ["adidas", "lego"],
        logistics: ["geodis"],
        entertainment: ["tiktok", "lego"],
        fmcg: ["ikea"],
        aviation: [],
        finance: [],
        healthcare: [],
        education: [],
        other: [],
      };

      const matchingClients = industryClientMap[industry] ?? [];
      if (matchingClients.some((mc) => clientLower.includes(mc))) {
        score += 3;
      }

      // Tag match
      if (tagsLower.includes(industry)) {
        score += 2;
      }

      // Deliverable text match
      if (deliverableLower.includes(industry)) {
        score += 1;
      }
    }

    // Service match
    if (input.servicesRequested && input.servicesRequested.length > 0) {
      for (const service of input.servicesRequested) {
        const keywords = SERVICE_TO_KEYWORDS[service] ?? [];
        const searchText =
          `${cs.deliverable} ${cs.brief} ${(cs.tags ?? []).join(" ")}`.toLowerCase();
        for (const kw of keywords) {
          if (searchText.includes(kw)) {
            score += 1;
            break; // one match per service is enough
          }
        }
      }
    }

    return { cs, score };
  });

  // Sort by score desc, take top 6
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 6).map((s) => s.cs);
}

/**
 * Build the user message with prospect context and case study data.
 */
function buildUserMessage(
  input: ProposalGenerateInput,
  relevantCases: CaseStudy[]
): string {
  const parts: string[] = [];

  parts.push(`PROSPECT CONTEXT:`);
  parts.push(`- Company: ${input.prospectName}`);

  if (input.prospectIndustry) {
    parts.push(`- Industry: ${input.prospectIndustry}`);
  }

  if (input.servicesRequested.length > 0) {
    const serviceNames = input.servicesRequested.map(
      (s) => SERVICE_LABELS[s] ?? s
    );
    parts.push(`- Services requested: ${serviceNames.join(", ")}`);
  }

  if (input.prospectNeeds) {
    parts.push(`- Specific needs / brief: ${input.prospectNeeds}`);
  }

  if (input.estimatedBudget) {
    parts.push(`- Estimated budget: ${input.estimatedBudget}`);
  }

  if (input.timeline) {
    parts.push(`- Timeline: ${input.timeline}`);
  }

  if (input.competitorMentioned) {
    parts.push(
      `- Competitor they are comparing us to: ${input.competitorMentioned}`
    );
  }

  parts.push(`- Proposal language: ${input.language}`);

  parts.push(``);
  parts.push(`SARANI CASE STUDIES (select the 2-4 most relevant for this proposal):`);
  parts.push(``);

  relevantCases.forEach((cs, i) => {
    parts.push(`--- Case Study ${i + 1} ---`);
    parts.push(`Client: ${cs.client}`);
    parts.push(`Deliverable: ${cs.deliverable}`);
    parts.push(`Volume: ${cs.volume}`);
    parts.push(`Turnaround: ${cs.turnaround}`);
    parts.push(`Outcome: ${cs.outcome}`);
    parts.push(`Brief: ${cs.brief}`);
    parts.push(`Result: ${cs.result}`);
    parts.push(`Key metric: ${cs.keyMetric}`);
    if (cs.tags && cs.tags.length > 0) {
      parts.push(`Tags: ${cs.tags.join(", ")}`);
    }
    parts.push(``);
  });

  parts.push(
    `Generate a complete, personalized proposal for ${input.prospectName}. Write in ${input.language === "FR" ? "French" : "English"}.`
  );

  return parts.join("\n");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = proposalGenerateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const input = parsed.data;

    // Optional: link to a tracker project (not part of agent-specific validation)
    const clickupTaskId =
      typeof body.clickupTaskId === "string" ? body.clickupTaskId : null;

    // Select relevant case studies
    const relevantCases = selectRelevantCaseStudies(input);

    // Build prompt and call Claude
    const userMessage = buildUserMessage(input, relevantCases);

    const { data, usage } = await callClaudeJSON<ProposalResponse>({
      systemPrompt: PROPOSAL_SYSTEM_PROMPT,
      userMessage,
      model: MODEL,
      maxTokens: MAX_TOKENS,
    });

    // Validate Claude's response
    const validated = proposalResponseSchema.safeParse(data);

    if (!validated.success) {
      console.error(
        "Claude Proposal response failed validation:",
        validated.error
      );
      return NextResponse.json(
        {
          error:
            "AI proposal produced invalid output. Please try again.",
        },
        { status: 502 }
      );
    }

    // Save to agent_outputs (no clientId — prospect, not a client)
    const [saved] = await db
      .insert(agentOutputs)
      .values({
        agentType: "proposal",
        inputPayload: {
          prospectName: input.prospectName,
          prospectIndustry: input.prospectIndustry ?? null,
          prospectNeeds: input.prospectNeeds ?? null,
          estimatedBudget: input.estimatedBudget ?? null,
          timeline: input.timeline ?? null,
          servicesRequested: input.servicesRequested,
          language: input.language,
          competitorMentioned: input.competitorMentioned ?? null,
        },
        outputContent: JSON.stringify(validated.data),
        status: "done",
        clickupTaskId,
      })
      .returning({ id: agentOutputs.id });

    return NextResponse.json({
      proposal: validated.data,
      outputId: saved.id,
      usage,
    });
  } catch (error: unknown) {
    console.error("Proposal generate error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Failed to generate proposal";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
