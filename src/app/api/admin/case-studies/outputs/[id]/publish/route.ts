import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { caseStudyOutputs, caseStudyCandidates } from "@/lib/db/schema";
import { eq, and, isNotNull } from "drizzle-orm";

/**
 * POST /api/admin/case-studies/outputs/:id/publish
 * Publish a case study to the website by appending to case-studies.ts.
 * Admin role only.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Fetch output
    const [output] = await db
      .select()
      .from(caseStudyOutputs)
      .where(eq(caseStudyOutputs.id, id))
      .limit(1);

    if (!output) {
      return NextResponse.json({ error: "Output not found" }, { status: 404 });
    }

    if (output.outputType !== "case_study") {
      return NextResponse.json(
        { error: "Only case_study outputs can be published to the website" },
        { status: 400 }
      );
    }

    // 2. Validate slug
    const caseStudy = output.content as Record<string, unknown>;
    const slug = caseStudy.slug as string;

    if (!slug || typeof slug !== "string") {
      return NextResponse.json(
        { error: "Case study has no valid slug" },
        { status: 400 }
      );
    }

    // 3. Check slug uniqueness in DB
    const existing = await db
      .select({ id: caseStudyOutputs.id })
      .from(caseStudyOutputs)
      .where(and(
        eq(caseStudyOutputs.caseStudySlug, slug),
        isNotNull(caseStudyOutputs.publishedAt)
      ))
      .limit(1);

    if (existing.length > 0 && existing[0].id !== id) {
      const altSlug = `${slug}-v2`;
      caseStudy.slug = altSlug;
    }

    // 4. Update DB (source of truth — public pages fetch from DB directly)
    await db
      .update(caseStudyOutputs)
      .set({
        publishedAt: new Date(),
        publishedBy: "admin",
        caseStudySlug: caseStudy.slug as string,
        updatedAt: new Date(),
      })
      .where(eq(caseStudyOutputs.id, id));

    await db
      .update(caseStudyCandidates)
      .set({ status: "published", updatedAt: new Date() })
      .where(eq(caseStudyCandidates.id, output.candidateId));

    // Revalidate public pages immediately (don't wait for ISR cycle)
    revalidatePath("/case-studies");
    revalidatePath(`/case-studies/${caseStudy.slug}`);

    return NextResponse.json({
      success: true,
      slug: caseStudy.slug,
      message: `Case study published at /case-studies/${caseStudy.slug}`,
    });
  } catch (error) {
    console.error("Error publishing case study:", error);
    return NextResponse.json(
      { error: "Publish failed" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/case-studies/outputs/:id/publish
 * Unpublish a case study — remove from case-studies.ts.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [output] = await db
      .select()
      .from(caseStudyOutputs)
      .where(eq(caseStudyOutputs.id, id))
      .limit(1);

    if (!output || !output.publishedAt) {
      return NextResponse.json(
        { error: "Output not found or not published" },
        { status: 404 }
      );
    }

    // Update DB (source of truth — public pages fetch from DB directly)
    await db
      .update(caseStudyOutputs)
      .set({
        publishedAt: null,
        publishedBy: null,
        caseStudySlug: null,
        updatedAt: new Date(),
      })
      .where(eq(caseStudyOutputs.id, id));

    await db
      .update(caseStudyCandidates)
      .set({ status: "reviewed", updatedAt: new Date() })
      .where(eq(caseStudyCandidates.id, output.candidateId));

    // Revalidate public pages immediately
    if (output.caseStudySlug) {
      revalidatePath(`/case-studies/${output.caseStudySlug}`);
    }
    revalidatePath("/case-studies");

    return NextResponse.json({
      success: true,
      message: "Case study unpublished",
    });
  } catch (error) {
    console.error("Error unpublishing case study:", error);
    return NextResponse.json(
      { error: "Unpublish failed" },
      { status: 500 }
    );
  }
}
