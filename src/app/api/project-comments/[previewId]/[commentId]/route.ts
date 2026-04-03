import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { presentationComments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * PATCH /api/project-comments/[previewId]/[commentId]
 * Public — edit a comment (author can modify their own).
 * Body: { content, authorName }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ previewId: string; commentId: string }> }
) {
  const { commentId } = await params;

  let body: { content?: string; authorName?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.content || body.content.trim().length === 0) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  if (body.content.length > 2000) {
    return NextResponse.json({ error: "Comment too long (max 2000 characters)" }, { status: 400 });
  }

  try {
    const [existing] = await db
      .select()
      .from(presentationComments)
      .where(eq(presentationComments.id, commentId));

    if (!existing) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // Only the original author can edit (matched by authorName)
    if (body.authorName && existing.authorName !== body.authorName) {
      return NextResponse.json({ error: "Only the author can edit this comment" }, { status: 403 });
    }

    await db
      .update(presentationComments)
      .set({
        content: body.content.trim(),
        updatedAt: new Date(),
      })
      .where(eq(presentationComments.id, commentId));

    return NextResponse.json({ updated: true });
  } catch (error) {
    console.error("[Comments] PATCH error:", error);
    return NextResponse.json({ error: "Failed to update comment" }, { status: 500 });
  }
}
