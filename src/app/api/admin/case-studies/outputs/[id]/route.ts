import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { caseStudyOutputs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * PATCH /api/admin/case-studies/outputs/:id
 * Save edited content (draft) — inline editing from the preview screen.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!body.content) {
      return NextResponse.json(
        { error: "content field is required" },
        { status: 400 }
      );
    }

    const [existing] = await db
      .select()
      .from(caseStudyOutputs)
      .where(eq(caseStudyOutputs.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Output not found" }, { status: 404 });
    }

    // Append to version history
    const versions = Array.isArray(existing.versions) ? [...existing.versions] : [];
    const newVersion = existing.currentVersion + 1;
    versions.push({
      version: newVersion,
      content: body.content,
      generatedAt: new Date().toISOString(),
      generatedBy: body.editedBy ?? "user",
    });

    const [updated] = await db
      .update(caseStudyOutputs)
      .set({
        content: body.content,
        currentVersion: newVersion,
        versions,
        updatedAt: new Date(),
      })
      .where(eq(caseStudyOutputs.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating output:", error);
    return NextResponse.json(
      { error: "Failed to update output" },
      { status: 500 }
    );
  }
}
