import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projectPreviews } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { checkRateLimit } from "@/lib/rate-limit";
import { UUID_REGEX } from "@/lib/rate-limit";

/**
 * PATCH /api/admin/project-previews/[id]
 * Update is_active field on a project preview record.
 * Accepts either a UUID (preview record id) or a projectId string.
 * Auth: protected by middleware (admin session cookie).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Rate limit: 20 req/min per session
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(`preview-patch:${ip}`, 20, 60_000)) {
    return NextResponse.json(
      { error: "RATE_LIMITED", message: "Too many requests. Try again later." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  let body: { is_active?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "INVALID_JSON", message: "Invalid request body." },
      { status: 400 }
    );
  }

  if (typeof body.is_active !== "boolean") {
    return NextResponse.json(
      { error: "VALIDATION", message: "is_active (boolean) is required." },
      { status: 400 }
    );
  }

  // Find the preview record — lookup by UUID or by projectId
  const decodedId = decodeURIComponent(id);
  const isUuid = UUID_REGEX.test(decodedId);

  const [existing] = await db
    .select()
    .from(projectPreviews)
    .where(
      isUuid
        ? eq(projectPreviews.id, decodedId)
        : eq(projectPreviews.projectId, decodedId)
    );

  if (!existing) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  // Update
  await db
    .update(projectPreviews)
    .set({ isActive: body.is_active, updatedAt: new Date() })
    .where(eq(projectPreviews.id, existing.id));

  return NextResponse.json(
    { updated: true, is_active: body.is_active },
    { status: 200 }
  );
}
