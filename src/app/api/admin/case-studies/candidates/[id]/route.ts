import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { caseStudyCandidates } from "@/lib/db/schema";
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
