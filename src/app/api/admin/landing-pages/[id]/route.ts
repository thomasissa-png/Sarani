import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { landingPages, landingPageVersions, clients } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

const VALID_STATUSES = [
  "draft",
  "generating",
  "ready",
  "published",
  "archived",
] as const;

type LandingPageStatus = (typeof VALID_STATUSES)[number];

/**
 * GET /api/admin/landing-pages/[id]
 * Get a single landing page with its versions.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [page] = await db
      .select({
        id: landingPages.id,
        clientId: landingPages.clientId,
        clientName: clients.name,
        title: landingPages.title,
        slug: landingPages.slug,
        status: landingPages.status,
        brief: landingPages.brief,
        language: landingPages.language,
        sections: landingPages.sections,
        manualOverrides: landingPages.manualOverrides,
        logoUrl: landingPages.logoUrl,
        visualAssets: landingPages.visualAssets,
        paletteOverride: landingPages.paletteOverride,
        sectionsEnabled: landingPages.sectionsEnabled,
        noIndex: landingPages.noIndex,
        totalTokenCost: landingPages.totalTokenCost,
        clickupTaskId: landingPages.clickupTaskId,
        shareToken: landingPages.shareToken,
        publishedAt: landingPages.publishedAt,
        createdBy: landingPages.createdBy,
        createdAt: landingPages.createdAt,
        updatedAt: landingPages.updatedAt,
      })
      .from(landingPages)
      .leftJoin(clients, eq(landingPages.clientId, clients.id))
      .where(eq(landingPages.id, id));

    if (!page) {
      return NextResponse.json(
        { error: "Landing page not found" },
        { status: 404 }
      );
    }

    // Fetch versions
    const versions = await db
      .select()
      .from(landingPageVersions)
      .where(eq(landingPageVersions.landingPageId, id))
      .orderBy(desc(landingPageVersions.version));

    return NextResponse.json({ ...page, versions });
  } catch (error) {
    console.error("Error fetching landing page:", error);
    return NextResponse.json(
      { error: "Failed to fetch landing page" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/landing-pages/[id]
 * Update status, sections, meta_tags, etc.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    // Status change
    if (body.status) {
      if (!VALID_STATUSES.includes(body.status as LandingPageStatus)) {
        return NextResponse.json(
          {
            error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
          },
          { status: 400 }
        );
      }
      updateData.status = body.status;

      if (body.status === "published") {
        updateData.publishedAt = new Date();
      }
    }

    // Optional field updates
    if (body.title !== undefined) updateData.title = body.title;
    if (body.sections !== undefined) updateData.sections = body.sections;
    if (body.manualOverrides !== undefined)
      updateData.manualOverrides = body.manualOverrides;
    if (body.paletteOverride !== undefined)
      updateData.paletteOverride = body.paletteOverride;
    if (body.sectionsEnabled !== undefined)
      updateData.sectionsEnabled = body.sectionsEnabled;
    if (body.noIndex !== undefined) updateData.noIndex = body.noIndex;
    if (body.clickupTaskId !== undefined)
      updateData.clickupTaskId = body.clickupTaskId;
    if (body.slug !== undefined) {
      const sanitizedSlug = String(body.slug).toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 100);
      if (!sanitizedSlug) {
        return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
      }
      updateData.slug = sanitizedSlug;
    }

    const [updated] = await db
      .update(landingPages)
      .set(updateData)
      .where(eq(landingPages.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Landing page not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating landing page:", error);
    return NextResponse.json(
      { error: "Failed to update landing page" },
      { status: 500 }
    );
  }
}
