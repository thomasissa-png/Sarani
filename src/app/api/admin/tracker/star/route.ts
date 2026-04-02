import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { caseStudyCandidates } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * POST /api/admin/tracker/star
 * Toggle a project as a case study candidate (starred).
 * If already starred → unstar (set status to "excluded").
 * If not starred → create candidate with status "suggested" + score override.
 */
export async function POST(request: NextRequest) {
  const session = await getUserFromSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!checkRateLimit("tracker-star", 30, 60_000)) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  let body: {
    clickupTaskId?: string;
    clientName?: string;
    projectName?: string;
    projectAmount?: number | null;
    sharepointFolderUrl?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { clickupTaskId, clientName, projectName, projectAmount, sharepointFolderUrl } = body;

  if (!clickupTaskId || !clientName) {
    return NextResponse.json(
      { error: "clickupTaskId and clientName are required" },
      { status: 400 }
    );
  }

  try {
    // Check if already exists
    const [existing] = await db
      .select()
      .from(caseStudyCandidates)
      .where(eq(caseStudyCandidates.clickupTaskId, clickupTaskId));

    if (existing) {
      // Toggle: if currently active → exclude, if excluded → re-suggest
      const newStatus = existing.status === "excluded" ? "suggested" : "excluded";
      await db
        .update(caseStudyCandidates)
        .set({
          status: newStatus,
          scoreOverride: true,
          scoreOverrideReason: newStatus === "suggested"
            ? "Starred by PM from tracker"
            : "Unstarred by PM from tracker",
          updatedAt: new Date(),
        })
        .where(eq(caseStudyCandidates.id, existing.id));

      return NextResponse.json({
        starred: newStatus === "suggested",
        id: existing.id,
        status: newStatus,
      });
    }

    // Create new candidate with high score (PM-endorsed)
    const [inserted] = await db
      .insert(caseStudyCandidates)
      .values({
        clickupTaskId,
        clientName,
        projectName: projectName ?? null,
        projectAmount: projectAmount ? String(projectAmount) : null,
        sharePointFolderUrl: sharepointFolderUrl ?? null,
        scoreTotal: 100, // Max score — PM-endorsed
        scoreBreakdown: {
          clientName: 20,
          amount: 20,
          assets: 20,
          projectType: 20,
          recency: 10,
          diversity: 10,
        },
        scoreOverride: true,
        scoreOverrideReason: "Starred by PM from tracker",
        status: "suggested",
      })
      .returning({ id: caseStudyCandidates.id });

    return NextResponse.json({
      starred: true,
      id: inserted.id,
      status: "suggested",
      created: true,
    });
  } catch (error) {
    console.error("[Tracker Star] Error:", error);
    return NextResponse.json(
      { error: "Failed to toggle star" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/tracker/star?taskIds=id1,id2,id3
 * Check which tasks are starred (for hydrating the UI).
 */
export async function GET(request: NextRequest) {
  const session = await getUserFromSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all non-excluded candidates
    const candidates = await db
      .select({
        clickupTaskId: caseStudyCandidates.clickupTaskId,
        status: caseStudyCandidates.status,
      })
      .from(caseStudyCandidates)
      .where(eq(caseStudyCandidates.status, "suggested"));

    const starredIds = new Set(candidates.map((c) => c.clickupTaskId));
    return NextResponse.json({ starredIds: Array.from(starredIds) });
  } catch (error) {
    console.error("[Tracker Star] GET error:", error);
    return NextResponse.json({ error: "Failed to load stars" }, { status: 500 });
  }
}
