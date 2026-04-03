import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { presentationComments, projectPreviews, inboxItems } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * GET /api/project-comments/[previewId]
 * Public — no auth required (accessible from presentation page).
 * Returns all comments for a presentation, ordered by creation date.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ previewId: string }> }
) {
  const { previewId } = await params;

  try {
    const comments = await db
      .select()
      .from(presentationComments)
      .where(eq(presentationComments.previewId, previewId))
      .orderBy(presentationComments.createdAt);

    return NextResponse.json({ comments });
  } catch (error) {
    console.error("[Comments] GET error:", error);
    return NextResponse.json({ error: "Failed to load comments" }, { status: 500 });
  }
}

/**
 * POST /api/project-comments/[previewId]
 * Public — no auth required. Creates a new comment or reply.
 * Body: { assetName?, positionX?, positionY?, authorName?, content, parentId? }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ previewId: string }> }
) {
  const { previewId } = await params;

  let body: {
    assetName?: string;
    positionX?: number;
    positionY?: number;
    authorName?: string;
    content?: string;
    parentId?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.content || typeof body.content !== "string" || body.content.trim().length === 0) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  if (body.content.length > 2000) {
    return NextResponse.json({ error: "Comment too long (max 2000 characters)" }, { status: 400 });
  }

  // Validate position if provided
  if (body.positionX !== undefined && (body.positionX < 0 || body.positionX > 1)) {
    return NextResponse.json({ error: "positionX must be between 0 and 1" }, { status: 400 });
  }
  if (body.positionY !== undefined && (body.positionY < 0 || body.positionY > 1)) {
    return NextResponse.json({ error: "positionY must be between 0 and 1" }, { status: 400 });
  }

  try {
    // Verify the preview exists
    const [preview] = await db
      .select({ id: projectPreviews.id, clientName: projectPreviews.clientName, projectName: projectPreviews.projectName })
      .from(projectPreviews)
      .where(eq(projectPreviews.id, previewId));

    if (!preview) {
      return NextResponse.json({ error: "Presentation not found" }, { status: 404 });
    }

    // Insert comment
    const [comment] = await db
      .insert(presentationComments)
      .values({
        previewId,
        assetName: body.assetName ?? null,
        positionX: body.positionX ?? null,
        positionY: body.positionY ?? null,
        authorName: body.authorName?.trim() || "Anonymous",
        content: body.content.trim(),
        parentId: body.parentId ?? null,
      })
      .returning();

    // Create inbox notification for Arya (non-blocking)
    try {
      const authorDisplay = comment.authorName === "Anonymous" ? "A client" : comment.authorName;
      const assetInfo = comment.assetName ? ` on "${comment.assetName}"` : "";
      await db.insert(inboxItems).values({
        type: "client_comment" as never,
        status: "pending",
        title: `${authorDisplay} commented${assetInfo} — ${preview.projectName}`,
        summary: JSON.stringify({
          previewId,
          commentId: comment.id,
          authorName: comment.authorName,
          content: comment.content.slice(0, 200),
          assetName: comment.assetName,
          clientName: preview.clientName,
          projectName: preview.projectName,
        }),
        sourceId: comment.id,
        sourceType: "presentation",
        priority: "medium",
      });
    } catch {
      // Non-critical — comment is saved even if notification fails
    }

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error("[Comments] POST error:", error);
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
  }
}
