import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { videoPreviews } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { UUID_REGEX } from "@/lib/rate-limit";
import { getUserFromSession } from "@/lib/auth";

// ─── GET /api/admin/video-preview/[id] ───────────────────────────────────────
// Full details of a video preview.

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Auth guard
    const session = await getUserFromSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: "Invalid ID format" },
        { status: 400 }
      );
    }

    const [preview] = await db
      .select()
      .from(videoPreviews)
      .where(eq(videoPreviews.id, id));

    if (!preview) {
      return NextResponse.json(
        { error: "Video preview not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(preview);
  } catch (error) {
    console.error("[video-preview/detail] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch video preview" },
      { status: 500 }
    );
  }
}

// ─── PATCH /api/admin/video-preview/[id] ─────────────────────────────────────
// Update status, share token, etc.

const patchSchema = z.object({
  status: z
    .enum(["pending", "generating", "ready", "failed", "assembled"])
    .optional(),
  shareToken: z.string().uuid().optional(),
  shareExpiresAt: z.string().datetime().optional(),
  assembledUrl: z.string().url().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Auth guard
    const patchSession = await getUserFromSession();
    if (!patchSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: "Invalid ID format" },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Verify exists
    const [existing] = await db
      .select({ id: videoPreviews.id })
      .from(videoPreviews)
      .where(eq(videoPreviews.id, id));

    if (!existing) {
      return NextResponse.json(
        { error: "Video preview not found" },
        { status: 404 }
      );
    }

    // Build update payload
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (parsed.data.status) updates.status = parsed.data.status;
    if (parsed.data.shareToken) updates.shareToken = parsed.data.shareToken;
    if (parsed.data.shareExpiresAt)
      updates.shareExpiresAt = new Date(parsed.data.shareExpiresAt);
    if (parsed.data.assembledUrl) updates.assembledUrl = parsed.data.assembledUrl;

    const [updated] = await db
      .update(videoPreviews)
      .set(updates)
      .where(eq(videoPreviews.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[video-preview/patch] Error:", error);
    return NextResponse.json(
      { error: "Failed to update video preview" },
      { status: 500 }
    );
  }
}
