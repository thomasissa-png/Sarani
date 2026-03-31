import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { videoPreviews } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { UUID_REGEX } from "@/lib/rate-limit";

// ─── GET /api/admin/video-preview/[id]/status ────────────────────────────────
// Polling endpoint for frontend to check video generation progress.
// Returns per-scene status + overall status.

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: "Invalid ID format" },
        { status: 400 }
      );
    }

    const [preview] = await db
      .select({
        id: videoPreviews.id,
        status: videoPreviews.status,
        provider: videoPreviews.provider,
        scenes: videoPreviews.scenes,
        costEstimateCents: videoPreviews.costEstimateCents,
        assembledUrl: videoPreviews.assembledUrl,
        updatedAt: videoPreviews.updatedAt,
      })
      .from(videoPreviews)
      .where(eq(videoPreviews.id, id));

    if (!preview) {
      return NextResponse.json(
        { error: "Video preview not found" },
        { status: 404 }
      );
    }

    const scenes = preview.scenes ?? [];
    const readyCount = scenes.filter((s) => s.status === "ready").length;
    const failedCount = scenes.filter((s) => s.status === "failed").length;
    const pendingCount = scenes.filter(
      (s) => s.status === "pending" || s.status === "generating"
    ).length;

    return NextResponse.json({
      id: preview.id,
      status: preview.status,
      provider: preview.provider,
      scenes,
      summary: {
        total: scenes.length,
        ready: readyCount,
        failed: failedCount,
        pending: pendingCount,
      },
      costEstimateCents: preview.costEstimateCents,
      assembledUrl: preview.assembledUrl,
      updatedAt: preview.updatedAt,
    });
  } catch (error) {
    console.error("[video-preview/status] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch video preview status" },
      { status: 500 }
    );
  }
}
