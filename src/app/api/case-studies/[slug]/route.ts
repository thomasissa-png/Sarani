import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { caseStudyOutputs } from "@/lib/db/schema";
import { eq, isNotNull, and } from "drizzle-orm";

// SSR — Rendering strategy: public page, cached with stale-while-revalidate
// No auth required — this serves the public case study content

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Validate slug format (lowercase alphanumeric + hyphens)
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return NextResponse.json(
        { error: "Invalid slug format" },
        { status: 400 }
      );
    }

    // Fetch published case study by slug
    const [output] = await db
      .select({
        content: caseStudyOutputs.content,
        publishedAt: caseStudyOutputs.publishedAt,
        updatedAt: caseStudyOutputs.updatedAt,
      })
      .from(caseStudyOutputs)
      .where(
        and(
          eq(caseStudyOutputs.caseStudySlug, slug),
          eq(caseStudyOutputs.outputType, "case_study"),
          isNotNull(caseStudyOutputs.publishedAt)
        )
      )
      .limit(1);

    if (!output) {
      return NextResponse.json(
        { error: "Case study not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        caseStudy: output.content,
        publishedAt: output.publishedAt?.toISOString() ?? null,
      },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=3600, stale-while-revalidate=3600",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching case study:", error);
    return NextResponse.json(
      { error: "Failed to load case study" },
      { status: 500 }
    );
  }
}
