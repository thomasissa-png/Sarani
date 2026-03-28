import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { caseStudyCandidates, caseStudyOutputs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { callClaudeJSON } from "@/lib/ai/claude";
import { checkRateLimit, UUID_REGEX } from "@/lib/rate-limit";
import { z } from "zod";

// ─── Zod schemas for LLM output validation ────────────────────────────────

const CaseStudyCategorySchema = z.enum([
  "Video & Social",
  "Graphic Design",
  "Event",
  "Multilingual",
  "Out-of-Home",
]);

const CaseStudyStatSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
});

const CaseStudyOutputSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  client: z.string().min(1),
  deliverable: z.string().min(1),
  volume: z.string().min(1),
  turnaround: z.string().min(1),
  outcome: z.string().min(1),
  brief: z.string().min(10),
  result: z.string().min(10),
  headline: z.string().min(5),
  keyMetric: z.string().min(1),
  stats: z.tuple([CaseStudyStatSchema, CaseStudyStatSchema, CaseStudyStatSchema]),
  metaDescription: z.string().min(50).max(160),
  category: CaseStudyCategorySchema,
  subtitle: z.string().optional(),
  challenge: z.string().optional(),
  solution: z.string().optional(),
  resultsDetail: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const LinkedInPostSchema = z.object({
  hook: z.string().min(1),
  body: z.string().min(10),
  proofPoints: z.string().min(1),
  hashtags: z.string().min(1),
  charCount: z.number(),
});

const NurturingEmailSchema = z.object({
  subject: z.string().min(1).max(60),
  body: z.string().min(50),
  ctaText: z.string().min(1),
  suggestedSegment: z.string().min(1),
});

const GenerationOutputSchema = z.object({
  caseStudy: CaseStudyOutputSchema,
  linkedInPost: LinkedInPostSchema,
  nurturingEmail: NurturingEmailSchema,
});

type GenerationOutput = z.infer<typeof GenerationOutputSchema>;

// ─── System prompt ─────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are Sarani's content generation engine. Sarani is an international creative agency (35 experts, 5 continents, 18 languages) that delivers enterprise-quality creative in 24 hours with unlimited revisions and fixed prices.

Brand voice: Assured, Direct, Warm, Evidence-first.
- Lead with proof, not promises
- Use specific numbers: "1,500+ videos/month" not "many videos"
- Tone: confident expert sharing results, not salesperson pitching
- CTA: "Start a project" (always)
- Never use: affordable, cheap, best value, budget-friendly, game-changer, revolutionary

You generate THREE outputs from project data:

1. **Case Study** (website): a CaseStudy JSON object matching the TypeScript interface. The headline MUST follow Formula 2: "Problem → Result" pattern. The slug format is: \`{client-lowercase}-{project-type-slug}\`.

2. **LinkedIn Post** (< 1,300 characters total): hook (1 attention-grabbing line) + body (3-4 lines of story) + proof points (key stats) + hashtags (3-5 relevant). Written from Sarani's perspective ("We delivered...").

3. **Nurturing Email** (< 150 words body): subject line (< 60 chars), body targeting a specific prospect segment similar to the case study's client sector, soft CTA.

IMPORTANT RULES:
- NEVER invent data. If a field is missing from the input, use qualitative language or mark it clearly.
- All numbers must come from the input data.
- The category MUST be one of: "Video & Social", "Graphic Design", "Event", "Multilingual", "Out-of-Home"
- Output valid JSON only. No markdown, no explanation.`;

// ─── POST handler ──────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }
    if (!checkRateLimit("llm-cs-generate", 10, 60_000)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Max 10 generations per minute." },
        { status: 429 }
      );
    }
    const body = await request.json().catch(() => ({}));
    const force = body.force === true;

    // 1. Fetch candidate
    const [candidate] = await db
      .select()
      .from(caseStudyCandidates)
      .where(eq(caseStudyCandidates.id, id))
      .limit(1);

    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    // 2. Check eligibility
    if (candidate.status === "excluded") {
      return NextResponse.json(
        { error: "Cannot generate for excluded candidate" },
        { status: 400 }
      );
    }
    if (candidate.status === "published") {
      return NextResponse.json(
        { error: "Candidate is already published" },
        { status: 400 }
      );
    }
    if (candidate.scoreTotal < 70 && !force) {
      return NextResponse.json(
        {
          error: `Score ${candidate.scoreTotal}/100 is below threshold (70). Use force: true to generate anyway.`,
        },
        { status: 400 }
      );
    }

    // 3. Set status to "generating"
    await db
      .update(caseStudyCandidates)
      .set({ status: "generating", updatedAt: new Date() })
      .where(eq(caseStudyCandidates.id, id));

    // 4. Build user prompt from project data
    const userPrompt = buildUserPrompt(candidate);

    // 5. Call Claude
    let generated: GenerationOutput;
    try {
      const result = await callClaudeJSON<GenerationOutput>({
        systemPrompt: SYSTEM_PROMPT,
        userMessage: userPrompt,
        maxTokens: 4096,
        timeout: 30_000,
      });

      // 6. Validate with Zod
      const parsed = GenerationOutputSchema.safeParse(result.data);
      if (!parsed.success) {
        // Retry once
        console.warn(
          "First generation failed Zod validation, retrying:",
          parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ")
        );
        const retryResult = await callClaudeJSON<GenerationOutput>({
          systemPrompt: SYSTEM_PROMPT,
          userMessage: userPrompt + "\n\nIMPORTANT: Your previous response had validation errors. Ensure ALL required fields are present and valid. The slug must be lowercase alphanumeric with hyphens only. The category must be exactly one of: 'Video & Social', 'Graphic Design', 'Event', 'Multilingual', 'Out-of-Home'. Stats must have exactly 3 items.",
          maxTokens: 4096,
          timeout: 30_000,
        });
        const retryParsed = GenerationOutputSchema.safeParse(retryResult.data);
        if (!retryParsed.success) {
          throw new Error(
            `Validation failed after retry: ${retryParsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`
          );
        }
        generated = retryParsed.data;
      } else {
        generated = parsed.data;
      }
    } catch (err) {
      // Revert status on failure
      await db
        .update(caseStudyCandidates)
        .set({ status: "suggested", updatedAt: new Date() })
        .where(eq(caseStudyCandidates.id, id));

      return NextResponse.json(
        {
          error: `Generation failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        },
        { status: 500 }
      );
    }

    // 7. Store outputs in DB
    const now = new Date();
    const outputRecords = [
      {
        candidateId: id,
        outputType: "case_study" as const,
        content: generated.caseStudy,
        currentVersion: 1,
        versions: [
          {
            version: 1,
            content: generated.caseStudy,
            generatedAt: now.toISOString(),
            generatedBy: "ai",
          },
        ],
        generatedAt: now,
        updatedAt: now,
      },
      {
        candidateId: id,
        outputType: "linkedin_post" as const,
        content: generated.linkedInPost,
        currentVersion: 1,
        versions: [
          {
            version: 1,
            content: generated.linkedInPost,
            generatedAt: now.toISOString(),
            generatedBy: "ai",
          },
        ],
        generatedAt: now,
        updatedAt: now,
      },
      {
        candidateId: id,
        outputType: "nurturing_email" as const,
        content: generated.nurturingEmail,
        currentVersion: 1,
        versions: [
          {
            version: 1,
            content: generated.nurturingEmail,
            generatedAt: now.toISOString(),
            generatedBy: "ai",
          },
        ],
        generatedAt: now,
        updatedAt: now,
      },
    ];

    // Delete existing outputs + insert new ones + update status atomically
    await db.transaction(async (tx) => {
      await tx
        .delete(caseStudyOutputs)
        .where(eq(caseStudyOutputs.candidateId, id));

      for (const record of outputRecords) {
        await tx.insert(caseStudyOutputs).values(record);
      }

      await tx
        .update(caseStudyCandidates)
        .set({ status: "generated", updatedAt: new Date() })
        .where(eq(caseStudyCandidates.id, id));
    });

    return NextResponse.json({
      success: true,
      candidateId: id,
      outputs: {
        caseStudy: generated.caseStudy,
        linkedInPost: generated.linkedInPost,
        nurturingEmail: generated.nurturingEmail,
      },
    });
  } catch (error) {
    console.error("Error generating case study:", error);
    return NextResponse.json(
      { error: "Generation failed" },
      { status: 500 }
    );
  }
}

// ─── Build user prompt from candidate data ─────────────────────────────────

function buildUserPrompt(candidate: {
  clientName: string;
  projectName: string | null;
  projectType: string | null;
  projectAmount: string | null;
  completedAt: Date | null;
  sharePointAssetCount: number | null;
  sharePointFolderUrl: string | null;
  scoreTotal: number;
  scoreBreakdown: unknown;
}): string {
  const data = {
    clientName: candidate.clientName,
    projectName: candidate.projectName ?? "Untitled project",
    projectType: candidate.projectType ?? "Unknown",
    amount: candidate.projectAmount
      ? `€${parseFloat(candidate.projectAmount).toLocaleString("en-US")}`
      : "Not specified",
    completedAt: candidate.completedAt
      ? candidate.completedAt.toISOString().split("T")[0]
      : "Unknown",
    assetCount: candidate.sharePointAssetCount ?? 0,
    scoreTotal: candidate.scoreTotal,
  };

  return `Generate a case study, LinkedIn post, and nurturing email for this project:

${JSON.stringify(data, null, 2)}

Output a single JSON object with keys: caseStudy, linkedInPost, nurturingEmail.
The caseStudy.slug format must be: "${data.clientName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${(data.projectType || "project").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}"
The category must map from project type: Campaign/Video Production → "Video & Social", Rebranding/Graphic Design/Presentation → "Graphic Design", Event → "Event", Translation → "Multilingual", Other → use your best judgment.`;
}
