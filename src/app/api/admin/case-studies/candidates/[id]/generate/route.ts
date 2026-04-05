import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { caseStudyCandidates, caseStudyOutputs } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { callClaudeJSON } from "@/lib/ai/claude";
import { checkRateLimit, UUID_REGEX } from "@/lib/rate-limit";
import {
  StrategyOutputSchema,
  CopyOutputSchema,
  SocialOutputSchema,
  CREATIVE_STRATEGY_PROMPT,
  COPYWRITER_PROMPT,
  SOCIAL_PROMPT,
  buildStrategyInput,
  buildCopyInput,
  buildSocialInput,
  type StrategyOutput,
  type CopyOutput,
  type SocialOutput,
} from "@/lib/case-studies/pipeline-prompts";
import {
  autoSelectVisuals,
  type AutoSelectedVisuals,
} from "@/lib/case-studies/auto-select-visuals";
import { generateLinkedInVisual } from "@/lib/case-studies/linkedin-visual";
import { getClientLogoUrl } from "@/lib/case-studies/client-logos";
import {
  getMappingBySpaceName,
  SHAREPOINT_ASSETS_DRIVE_ID,
  ASSETS_CUSTOMERS_BASE_PATH,
} from "@/lib/integrations/config";
import { listDriveItems } from "@/lib/integrations/sharepoint";

// ─── Pipeline helpers ─────────────────────────────────────────────────────

type PipelineStep = {
  step: number;
  agent: string;
  output: unknown;
  completedAt: string;
};

async function updatePipelineStatus(
  id: string,
  pipelineStatus: string
): Promise<void> {
  await db
    .update(caseStudyCandidates)
    .set({ pipelineStatus, updatedAt: new Date() })
    .where(eq(caseStudyCandidates.id, id));
}

async function savePipelineStep(
  id: string,
  step: number,
  agent: string,
  output: unknown
): Promise<void> {
  // Atomic append — no read-modify-write race condition
  const newStep = JSON.stringify({
    step,
    agent,
    output,
    completedAt: new Date().toISOString(),
  });
  await db.execute(sql`
    UPDATE case_study_candidates
    SET pipeline_steps = COALESCE(pipeline_steps, '[]'::jsonb) || ${newStep}::jsonb,
        updated_at = NOW()
    WHERE id = ${id}
  `);
}

// ─── POST handler — Multi-agent pipeline ──────────────────────────────────

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
      return NextResponse.json(
        { error: "Candidate not found" },
        { status: 404 }
      );
    }

    // 2. Check eligibility
    if (candidate.status === "generating") {
      // Auto-recovery: if stuck in "generating" for >10 min, the worker likely crashed.
      // Allow re-generation instead of blocking forever.
      const stuckThreshold = 10 * 60 * 1000; // 10 minutes
      const updatedAt = candidate.updatedAt ? new Date(candidate.updatedAt).getTime() : 0;
      if (Date.now() - updatedAt < stuckThreshold) {
        return NextResponse.json(
          { error: "Pipeline already in progress for this candidate. If stuck, retry in a few minutes." },
          { status: 409 }
        );
      }
      console.warn(`[pipeline] Candidate ${id} stuck in "generating" for >${Math.round((Date.now() - updatedAt) / 60000)}min. Auto-recovering.`);
    }
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

    // 3. Set status to "generating" and reset pipeline
    await db
      .update(caseStudyCandidates)
      .set({
        status: "generating",
        pipelineStatus: "idle",
        pipelineSteps: [],
        updatedAt: new Date(),
      })
      .where(eq(caseStudyCandidates.id, id));

    // ─── Step 1: Creative Strategy ──────────────────────────────────────

    let strategyData: StrategyOutput;
    try {
      await updatePipelineStatus(id, "step_1_creative");

      const strategyResult = await callClaudeJSON<StrategyOutput>({
        systemPrompt: CREATIVE_STRATEGY_PROMPT,
        userMessage: buildStrategyInput(candidate),
        maxTokens: 2048,
        timeout: 60_000,
      });

      const parsed = StrategyOutputSchema.safeParse(strategyResult.data);
      if (!parsed.success) {
        // Retry once with validation feedback
        console.warn(
          "Strategy step failed validation, retrying:",
          parsed.error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join(", ")
        );
        const retryResult = await callClaudeJSON<StrategyOutput>({
          systemPrompt: CREATIVE_STRATEGY_PROMPT,
          userMessage:
            buildStrategyInput(candidate) +
            "\n\nIMPORTANT: Your previous response had validation errors. Ensure ALL required fields are present and valid: angle (min 5 chars), keyMessages (2-5 items), visualDirection (min 5 chars), emotionalHook (min 5 chars), targetAudience (min 5 chars), differentiators (1-5 items).",
          maxTokens: 2048,
          timeout: 60_000,
        });
        const retryParsed = StrategyOutputSchema.safeParse(retryResult.data);
        if (!retryParsed.success) {
          throw new Error(
            `Strategy validation failed after retry: ${retryParsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`
          );
        }
        strategyData = retryParsed.data;
      } else {
        strategyData = parsed.data;
      }
      await savePipelineStep(id, 1, "creative-strategy", strategyData);
    } catch (err) {
      await db
        .update(caseStudyCandidates)
        .set({
          status: "suggested",
          pipelineStatus: "failed",
          updatedAt: new Date(),
        })
        .where(eq(caseStudyCandidates.id, id));

      return NextResponse.json(
        {
          error: `Pipeline failed at step 1 (Creative Strategy): ${err instanceof Error ? err.message : "Unknown error"}`,
          failedStep: 1,
        },
        { status: 500 }
      );
    }

    // ─── Step 2: Copywriter ─────────────────────────────────────────────

    let copyData: CopyOutput;
    try {
      await updatePipelineStatus(id, "step_2_copywriter");

      const copyResult = await callClaudeJSON<CopyOutput>({
        systemPrompt: COPYWRITER_PROMPT,
        userMessage: buildCopyInput(candidate, strategyData),
        maxTokens: 4096,
        timeout: 60_000,
      });

      const parsed = CopyOutputSchema.safeParse(copyResult.data);
      if (!parsed.success) {
        // Retry once with validation feedback
        console.warn(
          "Copywriter step failed validation, retrying:",
          parsed.error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join(", ")
        );
        const errorDetails = parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("\n");
        const retryResult = await callClaudeJSON<CopyOutput>({
          systemPrompt: COPYWRITER_PROMPT,
          userMessage:
            buildCopyInput(candidate, strategyData) +
            `\n\nIMPORTANT: Your previous response had these validation errors:\n${errorDetails}\n\nFix these EXACT issues. Key constraints:\n- metaDescription: MUST be 50-160 chars (count carefully!)\n- headline: max 100 chars\n- result: max 150 chars\n- brief: max 300 chars\n- keyMetric: max 20 chars\n- outcome: max 60 chars\n- stats value: max 15 chars, label: max 30 chars\n- slug: lowercase alphanumeric with hyphens only\n- category: exactly one of 'Video & Social', 'Graphic Design', 'Event', 'Multilingual', 'Out-of-Home'\n- stats: exactly 3 items`,
          maxTokens: 4096,
          timeout: 60_000,
        });
        // Auto-truncate fields that are too long (safety valve)
        const retryData = retryResult.data as Record<string, unknown>;
        const cs = retryData?.caseStudy as Record<string, unknown> | undefined;
        if (cs) {
          if (typeof cs.metaDescription === "string" && cs.metaDescription.length > 160) {
            cs.metaDescription = cs.metaDescription.slice(0, 157) + "...";
          }
          if (typeof cs.headline === "string" && cs.headline.length > 100) {
            cs.headline = cs.headline.slice(0, 97) + "...";
          }
          if (typeof cs.result === "string" && cs.result.length > 150) {
            cs.result = cs.result.slice(0, 147) + "...";
          }
          if (typeof cs.brief === "string" && cs.brief.length > 300) {
            cs.brief = cs.brief.slice(0, 297) + "...";
          }
          if (typeof cs.keyMetric === "string" && cs.keyMetric.length > 20) {
            cs.keyMetric = cs.keyMetric.slice(0, 20);
          }
          if (typeof cs.outcome === "string" && cs.outcome.length > 60) {
            cs.outcome = cs.outcome.slice(0, 57) + "...";
          }
        }
        const retryParsed = CopyOutputSchema.safeParse(retryData);
        if (!retryParsed.success) {
          throw new Error(
            `Copywriter validation failed after retry: ${retryParsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`
          );
        }
        copyData = retryParsed.data;
      } else {
        copyData = parsed.data;
      }
      await savePipelineStep(id, 2, "copywriter", copyData);
    } catch (err) {
      await db
        .update(caseStudyCandidates)
        .set({
          status: "suggested",
          pipelineStatus: "failed",
          updatedAt: new Date(),
        })
        .where(eq(caseStudyCandidates.id, id));

      return NextResponse.json(
        {
          error: `Pipeline failed at step 2 (Copywriter): ${err instanceof Error ? err.message : "Unknown error"}`,
          failedStep: 2,
        },
        { status: 500 }
      );
    }

    // ─── Step 3: Social Media ───────────────────────────────────────────

    let socialData: SocialOutput;
    try {
      await updatePipelineStatus(id, "step_3_social");

      const socialResult = await callClaudeJSON<SocialOutput>({
        systemPrompt: SOCIAL_PROMPT,
        userMessage: buildSocialInput(candidate, strategyData, copyData),
        maxTokens: 2048,
        timeout: 60_000,
      });

      const parsed = SocialOutputSchema.safeParse(socialResult.data);
      if (!parsed.success) {
        // Retry once with validation feedback
        console.warn(
          "Social step failed validation, retrying:",
          parsed.error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join(", ")
        );
        const retryResult = await callClaudeJSON<SocialOutput>({
          systemPrompt: SOCIAL_PROMPT,
          userMessage:
            buildSocialInput(candidate, strategyData, copyData) +
            "\n\nIMPORTANT: Your previous response had validation errors. Ensure the linkedInPost object has ALL required fields: hook (min 1 char), body (min 10 chars), proofPoints (min 1 char), hashtags (empty string — Sarani does not use hashtags), charCount (number). Total must be < 1,300 characters.",
          maxTokens: 2048,
          timeout: 60_000,
        });
        const retryParsed = SocialOutputSchema.safeParse(retryResult.data);
        if (!retryParsed.success) {
          throw new Error(
            `Social validation failed after retry: ${retryParsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`
          );
        }
        socialData = retryParsed.data;
      } else {
        socialData = parsed.data;
      }
      await savePipelineStep(id, 3, "social", socialData);
    } catch (err) {
      await db
        .update(caseStudyCandidates)
        .set({
          status: "suggested",
          pipelineStatus: "failed",
          updatedAt: new Date(),
        })
        .where(eq(caseStudyCandidates.id, id));

      return NextResponse.json(
        {
          error: `Pipeline failed at step 3 (Social): ${err instanceof Error ? err.message : "Unknown error"}`,
          failedStep: 3,
        },
        { status: 500 }
      );
    }

    // ─── Step 4: Auto-select visuals from SharePoint (NON-BLOCKING) ────

    let selectedVisuals: AutoSelectedVisuals | null = null;
    // Resolve folder URL at generation time if missing from scan
    let spFolderUrl = candidate.sharePointFolderUrl;
    if (!spFolderUrl) {
      try {
        const mapping = getMappingBySpaceName(candidate.clientName);
        if (mapping) {
          const parentPath = `${ASSETS_CUSTOMERS_BASE_PATH}/${mapping.sharepointCustomerFolder}`;
          const items = await listDriveItems(SHAREPOINT_ASSETS_DRIVE_ID, parentPath);
          const projectLower = (candidate.projectName ?? "").toLowerCase().trim();
          // Quick fuzzy match in client root
          const match = items.find((item) => {
            if (!item.folder) return false;
            const folderLower = item.name.toLowerCase();
            return folderLower.includes(projectLower) || projectLower.includes(folderLower);
          });
          if (match?.webUrl) {
            spFolderUrl = match.webUrl;
            // Save for future runs
            await db.update(caseStudyCandidates)
              .set({ sharePointFolderUrl: spFolderUrl, updatedAt: new Date() })
              .where(eq(caseStudyCandidates.id, id));
          }
        }
      } catch {
        // Non-blocking — continue without visuals
      }
    }
    if (spFolderUrl) {
      try {
        await updatePipelineStatus(id, "step_4_visuals");
        // 15s max — step 4 is non-blocking, don't let it stall the pipeline
        const visualsPromise = autoSelectVisuals(spFolderUrl, candidate.clientName);
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 15_000));
        const result = await Promise.race([visualsPromise, timeoutPromise]);
        if (result) {
          selectedVisuals = result;
        } else {
          console.warn("[pipeline] Step 4 timed out after 15s — continuing without visuals");
          await savePipelineStep(id, 4, "visual-selector", { skipped: true, reason: "timeout" });
        }
        if (selectedVisuals) {
          await savePipelineStep(id, 4, "visual-selector", {
            heroImage: selectedVisuals.heroImage?.url ?? null,
            linkedInImage: selectedVisuals.linkedInImage?.url ?? null,
            emailHeader: selectedVisuals.emailHeader?.url ?? null,
            totalImagesFound: selectedVisuals.allImages.length,
          });

        // Update visualSuggestions on candidate
        if (selectedVisuals.allImages.length > 0) {
          await db
            .update(caseStudyCandidates)
            .set({
              visualSuggestions: selectedVisuals.allImages.map((img) => ({
                url: img.url,
                name: img.name,
                thumbnailUrl: img.thumbnailUrl,
                selected: [
                  selectedVisuals?.heroImage?.url,
                  selectedVisuals?.linkedInImage?.url,
                  selectedVisuals?.emailHeader?.url,
                ].includes(img.url),
              })),
              updatedAt: new Date(),
            })
            .where(eq(caseStudyCandidates.id, id));
        }
        } // close if (selectedVisuals)
      } catch (err) {
        // Non-blocking: pipeline continues without visuals
        console.warn(
          "[pipeline] Step 4 (visual selection) failed — continuing without visuals:",
          err instanceof Error ? err.message : err
        );
        await savePipelineStep(id, 4, "visual-selector", {
          error: err instanceof Error ? err.message : "Unknown error",
          skipped: true,
        });
      }
    } else {
      console.warn(
        "[pipeline] Step 4 skipped — no sharePointFolderUrl on candidate"
      );
    }

    // ─── Save outputs (backward-compatible with existing frontend) ──────

    // Enrich case study content with auto-selected visual URLs
    const caseStudyContent = {
      ...copyData.caseStudy,
      ...(selectedVisuals?.heroImage && {
        heroImage: selectedVisuals.heroImage.url,
      }),
      ...(selectedVisuals?.linkedInImage && {
        linkedInImage: selectedVisuals.linkedInImage.url,
      }),
      ...(selectedVisuals?.emailHeader && {
        emailHeader: selectedVisuals.emailHeader.url,
      }),
    };

    // ─── Step 5: Generate LinkedIn Visual (NON-BLOCKING) ───────────────

    let linkedInVisualBase64: string | null = null;
    try {
      await updatePipelineStatus(id, "step_5_linkedin_visual");

      // Collect project image URLs for the visual
      const visualImageUrls: string[] = [];
      if (caseStudyContent.heroImage) visualImageUrls.push(caseStudyContent.heroImage);
      if (caseStudyContent.linkedInImage) visualImageUrls.push(caseStudyContent.linkedInImage);
      if (caseStudyContent.emailHeader) visualImageUrls.push(caseStudyContent.emailHeader);

      const pngBuffer = await generateLinkedInVisual({
        clientName: candidate.clientName,
        projectTitle:
          copyData.caseStudy.headline ?? candidate.projectName ?? `${candidate.clientName} Project`,
        accentWord: candidate.clientName,
        clientLogoUrl: getClientLogoUrl(candidate.clientName),
        projectImages: visualImageUrls,
      });

      linkedInVisualBase64 = pngBuffer.toString("base64");
      await savePipelineStep(id, 5, "linkedin-visual", {
        generated: true,
        sizeBytes: pngBuffer.length,
      });
    } catch (err) {
      // Non-blocking: pipeline continues without the visual
      console.warn(
        "[pipeline] Step 5 (LinkedIn visual) failed — continuing:",
        err instanceof Error ? err.message : err
      );
      await savePipelineStep(id, 5, "linkedin-visual", {
        error: err instanceof Error ? err.message : "Unknown error",
        skipped: true,
      });
    }

    const now = new Date();
    const outputRecords: Array<{
      candidateId: string;
      outputType: string;
      content: unknown;
      currentVersion: number;
      versions: Array<{
        version: number;
        content: unknown;
        generatedAt: string;
        generatedBy: string;
      }>;
      generatedAt: Date;
      updatedAt: Date;
    }> = [
      {
        candidateId: id,
        outputType: "case_study",
        content: caseStudyContent,
        currentVersion: 1,
        versions: [
          {
            version: 1,
            content: caseStudyContent,
            generatedAt: now.toISOString(),
            generatedBy: "pipeline-v2",
          },
        ],
        generatedAt: now,
        updatedAt: now,
      },
      {
        candidateId: id,
        outputType: "linkedin_post" as const,
        content: socialData.linkedInPost,
        currentVersion: 1,
        versions: [
          {
            version: 1,
            content: socialData.linkedInPost,
            generatedAt: now.toISOString(),
            generatedBy: "pipeline-v2",
          },
        ],
        generatedAt: now,
        updatedAt: now,
      },
      {
        candidateId: id,
        outputType: "nurturing_email" as const,
        content: copyData.nurturingEmail,
        currentVersion: 1,
        versions: [
          {
            version: 1,
            content: copyData.nurturingEmail,
            generatedAt: now.toISOString(),
            generatedBy: "pipeline-v2",
          },
        ],
        generatedAt: now,
        updatedAt: now,
      },
    ];

    // Add linkedin_visual output if generated successfully
    if (linkedInVisualBase64) {
      outputRecords.push({
        candidateId: id,
        outputType: "linkedin_visual",
        content: {
          base64Png: linkedInVisualBase64,
          width: 1200,
          height: 1200,
          mimeType: "image/png",
        },
        currentVersion: 1,
        versions: [
          {
            version: 1,
            content: {
              base64Png: linkedInVisualBase64,
              width: 1200,
              height: 1200,
              mimeType: "image/png",
            },
            generatedAt: now.toISOString(),
            generatedBy: "pipeline-v2",
          },
        ],
        generatedAt: now,
        updatedAt: now,
      });
    }

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
        .set({
          status: "generated",
          pipelineStatus: "complete",
          updatedAt: new Date(),
        })
        .where(eq(caseStudyCandidates.id, id));
    });

    return NextResponse.json({
      success: true,
      candidateId: id,
      pipeline: {
        stepsCompleted: 5,
        strategy: strategyData,
        visualSelection: selectedVisuals
          ? {
              heroImage: selectedVisuals.heroImage?.url ?? null,
              linkedInImage: selectedVisuals.linkedInImage?.url ?? null,
              emailHeader: selectedVisuals.emailHeader?.url ?? null,
              totalImagesFound: selectedVisuals.allImages.length,
            }
          : null,
      },
      outputs: {
        caseStudy: caseStudyContent,
        linkedInPost: socialData.linkedInPost,
        nurturingEmail: copyData.nurturingEmail,
        linkedInVisual: linkedInVisualBase64 ? { generated: true } : null,
      },
    });
  } catch (error) {
    console.error("Error in case study pipeline:", error);
    return NextResponse.json(
      { error: "Pipeline failed unexpectedly" },
      { status: 500 }
    );
  }
}
