import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { storyboards } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

// POST /api/admin/storyboards/[id]/share — generate share token + expiration 7 days
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify storyboard exists
    const [storyboard] = await db
      .select()
      .from(storyboards)
      .where(eq(storyboards.id, id));

    if (!storyboard) {
      return NextResponse.json(
        { error: "Storyboard not found" },
        { status: 404 }
      );
    }

    const shareToken = randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await db
      .update(storyboards)
      .set({
        shareToken,
        shareExpiresAt: expiresAt,
        status: storyboard.status === "ready" ? "shared" : storyboard.status,
        updatedAt: new Date(),
      })
      .where(eq(storyboards.id, id));

    const shareUrl = `/storyboard/share/${shareToken}`;

    return NextResponse.json({
      success: true,
      shareToken,
      shareUrl,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("Error sharing storyboard:", error);
    return NextResponse.json(
      { error: "Failed to share storyboard" },
      { status: 500 }
    );
  }
}
