import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { starPipelineItems, projectClosures } from "@/lib/db/schema";
import { isAuthenticatedFromCookie } from "@/lib/auth";

// ─── Auth helper ──────────────────────────────────────────────────────────────

async function requireAdmin(
  request: NextRequest
): Promise<
  | { authorized: true; userId: string }
  | { authorized: false; response: NextResponse }
> {
  const cookieHeader = request.headers.get("cookie");
  const auth = await isAuthenticatedFromCookie(cookieHeader);
  if (!auth.authenticated || auth.role !== "admin") {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { authorized: true, userId: auth.userId ?? "unknown" };
}

// ─── Rate limiter (in-memory, 20/min) ─────────────────────────────────────────

const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) ?? [];
  const recent = timestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);

  if (recent.length >= RATE_LIMIT_MAX) {
    rateLimitMap.set(ip, recent);
    return true;
  }

  recent.push(now);
  rateLimitMap.set(ip, recent);
  return false;
}

function getIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
  );
}

// ─── Validation schema ───────────────────────────────────────────────────────

const updatePipelineSchema = z.object({
  itemId: z.string().uuid("Pipeline item ID must be a valid UUID"),
  status: z.enum(["review", "published", "skipped"]),
  content: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ─── GET /api/admin/closures/[id]/star-pipeline ───────────────────────────────
// List all pipeline items for a specific closure.

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authCheck = await requireAdmin(request);
    if (!authCheck.authorized) return authCheck.response;

    if (isRateLimited(getIp(request))) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    const { id: closureId } = await params;

    // Verify closure exists
    const [closure] = await db
      .select()
      .from(projectClosures)
      .where(eq(projectClosures.id, closureId))
      .limit(1);

    if (!closure) {
      return NextResponse.json(
        { error: "Closure not found" },
        { status: 404 }
      );
    }

    const items = await db
      .select()
      .from(starPipelineItems)
      .where(eq(starPipelineItems.closureId, closureId));

    return NextResponse.json({
      closureId: closure.id,
      projectName: closure.projectName,
      starScore: closure.starScore,
      starStatus: closure.starStatus,
      items,
    });
  } catch (error) {
    console.error("Error fetching pipeline items:", error);
    return NextResponse.json(
      { error: "Failed to fetch pipeline items" },
      { status: 500 }
    );
  }
}

// ─── PATCH /api/admin/closures/[id]/star-pipeline ─────────────────────────────
// Update the status of a star pipeline item (review -> published/skipped).

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authCheck = await requireAdmin(request);
    if (!authCheck.authorized) return authCheck.response;

    if (isRateLimited(getIp(request))) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    const { id: closureId } = await params;

    const body = await request.json();
    const parsed = updatePipelineSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { itemId, status, content, metadata } = parsed.data;

    // Verify closure exists
    const [closure] = await db
      .select()
      .from(projectClosures)
      .where(eq(projectClosures.id, closureId))
      .limit(1);

    if (!closure) {
      return NextResponse.json(
        { error: "Closure not found" },
        { status: 404 }
      );
    }

    // Verify pipeline item exists and belongs to this closure
    const [item] = await db
      .select()
      .from(starPipelineItems)
      .where(
        and(
          eq(starPipelineItems.id, itemId),
          eq(starPipelineItems.closureId, closureId)
        )
      )
      .limit(1);

    if (!item) {
      return NextResponse.json(
        { error: "Pipeline item not found for this closure" },
        { status: 404 }
      );
    }

    // Build update values
    const updateValues: Record<string, unknown> = {
      status,
      reviewedAt: new Date(),
      reviewedBy: authCheck.userId,
    };

    if (content !== undefined) {
      updateValues.content = content;
    }
    if (metadata !== undefined) {
      updateValues.metadata = metadata;
    }

    const [updated] = await db
      .update(starPipelineItems)
      .set(updateValues)
      .where(eq(starPipelineItems.id, itemId))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating pipeline item:", error);
    return NextResponse.json(
      { error: "Failed to update pipeline item" },
      { status: 500 }
    );
  }
}
