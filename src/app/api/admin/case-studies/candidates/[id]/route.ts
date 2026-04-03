import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { caseStudyCandidates, caseStudyOutputs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const VALID_STATUSES = [
  "ignored",
  "suggested",
  "generating",
  "generated",
  "reviewed",
  "published",
  "excluded",
] as const;

type CandidateStatus = (typeof VALID_STATUSES)[number];

/**
 * GET /api/admin/case-studies/candidates/:id
 * Fetch single candidate with all its generated outputs.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    const outputs = await db
      .select()
      .from(caseStudyOutputs)
      .where(eq(caseStudyOutputs.candidateId, id));

    // For linkedin_visual, strip base64 from the listing to avoid huge payloads.
    // The full image is available via the /linkedin-visual endpoint.
    const linkedInVisualOutput = outputs.find(
      (o) => o.outputType === "linkedin_visual"
    );
    const linkedInVisualMeta = linkedInVisualOutput
      ? {
          id: linkedInVisualOutput.id,
          outputType: linkedInVisualOutput.outputType,
          generatedAt: linkedInVisualOutput.generatedAt,
          hasVisual: true,
        }
      : null;

    return NextResponse.json({
      ...candidate,
      outputs: {
        caseStudy: outputs.find((o) => o.outputType === "case_study") ?? null,
        linkedInPost:
          outputs.find((o) => o.outputType === "linkedin_post") ?? null,
        nurturingEmail:
          outputs.find((o) => o.outputType === "nurturing_email") ?? null,
        linkedInVisual: linkedInVisualMeta,
      },
    });
  } catch (error) {
    console.error("Error fetching candidate:", error);
    return NextResponse.json(
      { error: "Failed to fetch candidate" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    // Status change
    if (body.status) {
      if (!VALID_STATUSES.includes(body.status as CandidateStatus)) {
        return NextResponse.json(
          {
            error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
          },
          { status: 400 }
        );
      }
      updateData.status = body.status;

      // If excluding, require a reason
      if (body.status === "excluded") {
        if (!body.excludedReason) {
          return NextResponse.json(
            { error: "excludedReason is required when excluding a candidate" },
            { status: 400 }
          );
        }
        updateData.excludedReason = body.excludedReason;
        updateData.excludedBy = body.excludedBy ?? "admin";
      }
    }

    // Score override
    if (body.scoreOverride !== undefined) {
      updateData.scoreOverride = body.scoreOverride;
      updateData.scoreOverrideReason = body.scoreOverrideReason ?? null;
    }

    const [updated] = await db
      .update(caseStudyCandidates)
      .set(updateData)
      .where(eq(caseStudyCandidates.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Candidate not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating case study candidate:", error);
    return NextResponse.json(
      { error: "Failed to update candidate" },
      { status: 500 }
    );
  }
}
