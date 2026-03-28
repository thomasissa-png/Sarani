import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { caseStudyOutputs, caseStudyCandidates } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { callClaudeJSON } from "@/lib/ai/claude";

/**
 * POST /api/admin/case-studies/outputs/:id/regenerate
 * Regenerate a single output (case_study, linkedin_post, or nurturing_email)
 * with optional user instruction.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const instruction: string = body.instruction ?? "";

    if (!instruction.trim()) {
      return NextResponse.json(
        { error: "instruction field is required. What would you like to change?" },
        { status: 400 }
      );
    }

    // 1. Fetch output + candidate
    const [output] = await db
      .select()
      .from(caseStudyOutputs)
      .where(eq(caseStudyOutputs.id, id))
      .limit(1);

    if (!output) {
      return NextResponse.json({ error: "Output not found" }, { status: 404 });
    }

    const [candidate] = await db
      .select()
      .from(caseStudyCandidates)
      .where(eq(caseStudyCandidates.id, output.candidateId))
      .limit(1);

    if (!candidate) {
      return NextResponse.json(
        { error: "Candidate not found" },
        { status: 404 }
      );
    }

    // 2. Build regeneration prompt
    const typeLabel =
      output.outputType === "case_study"
        ? "case study"
        : output.outputType === "linkedin_post"
          ? "LinkedIn post"
          : "nurturing email";

    const systemPrompt = `You are Sarani's content regeneration engine. Sarani is an international creative agency (35 experts, 5 continents, 18 languages).

Brand voice: Assured, Direct, Warm, Evidence-first.

You are regenerating a ${typeLabel}. The user wants specific changes. Keep the same structure but apply the requested modifications.

IMPORTANT: Output ONLY valid JSON matching the exact same structure as the current version. No markdown, no explanation.`;

    const userMessage = `Current ${typeLabel}:
${JSON.stringify(output.content, null, 2)}

Project context:
- Client: ${candidate.clientName}
- Project: ${candidate.projectName ?? "Untitled"}
- Type: ${candidate.projectType ?? "Unknown"}

User instruction: "${instruction}"

Regenerate the ${typeLabel} applying the user's instruction. Output only the JSON object (same structure as above).`;

    // 3. Call Claude
    const result = await callClaudeJSON({
      systemPrompt,
      userMessage,
      maxTokens: 2048,
      timeout: 30_000,
    });

    // 4. Version history
    const versions = Array.isArray(output.versions) ? [...output.versions] : [];
    if (versions.length >= 5) {
      versions.shift(); // Keep max 5 versions
    }
    const newVersion = output.currentVersion + 1;
    versions.push({
      version: newVersion,
      content: result.data,
      generatedAt: new Date().toISOString(),
      generatedBy: "ai",
      instruction,
    });

    // 5. Update DB
    const [updated] = await db
      .update(caseStudyOutputs)
      .set({
        content: result.data,
        currentVersion: newVersion,
        versions,
        updatedAt: new Date(),
      })
      .where(eq(caseStudyOutputs.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      output: updated,
    });
  } catch (error) {
    console.error("Error regenerating output:", error);
    return NextResponse.json(
      {
        error: `Regeneration failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 }
    );
  }
}
