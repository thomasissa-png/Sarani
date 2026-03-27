import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { landingPages, landingPageVersions } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";
import type { LandingPageSections } from "@/lib/db/schema";

/**
 * POST /api/admin/landing-pages/[id]/generate
 * Mock generation: sets status to "ready" and creates a version record
 * with placeholder sections. Real LLM integration comes later.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch the landing page
    const [page] = await db
      .select()
      .from(landingPages)
      .where(eq(landingPages.id, id));

    if (!page) {
      return NextResponse.json(
        { error: "Landing page not found" },
        { status: 404 }
      );
    }

    if (page.status !== "draft" && page.status !== "ready") {
      return NextResponse.json(
        { error: "Can only generate from draft or ready status" },
        { status: 400 }
      );
    }

    // Count existing versions to determine next version number
    const [versionCount] = await db
      .select({ count: count() })
      .from(landingPageVersions)
      .where(eq(landingPageVersions.landingPageId, id));

    const nextVersion = (versionCount?.count ?? 0) + 1;

    // Mock sections — placeholder content based on the brief
    const mockSections: LandingPageSections = {
      hero: {
        headline: `${page.title}`,
        subheadline: `Generated from brief: ${page.brief.slice(0, 100)}...`,
        ctaText: "Get Started",
        ctaUrl: "#contact",
        backgroundType: "color",
      },
      features: [
        {
          iconName: "zap",
          title: "Fast Delivery",
          description: "We deliver results quickly and efficiently.",
        },
        {
          iconName: "shield",
          title: "Quality Assured",
          description: "Every project meets our high quality standards.",
        },
        {
          iconName: "globe",
          title: "Global Reach",
          description: "Working with clients across the world.",
        },
      ],
      cta: {
        headline: "Ready to get started?",
        subtext: "Contact us today to discuss your project.",
        buttonText: "Contact Us",
        buttonUrl: "#contact",
      },
      footer: {
        tagline: "Powered by Sarani Studio",
      },
      meta: {
        title: page.title,
        description: page.brief.slice(0, 160),
      },
    };

    // Create version record
    const [version] = await db
      .insert(landingPageVersions)
      .values({
        landingPageId: id,
        version: nextVersion,
        sections: mockSections,
        createdBy: "admin",
      })
      .returning();

    // Update landing page status and sections
    const [updated] = await db
      .update(landingPages)
      .set({
        status: "ready",
        sections: mockSections,
        updatedAt: new Date(),
      })
      .where(eq(landingPages.id, id))
      .returning();

    return NextResponse.json({
      landingPage: updated,
      version,
      message: "Mock generation complete. LLM integration pending.",
    });
  } catch (error) {
    console.error("Error generating landing page:", error);
    return NextResponse.json(
      { error: "Failed to generate landing page" },
      { status: 500 }
    );
  }
}
