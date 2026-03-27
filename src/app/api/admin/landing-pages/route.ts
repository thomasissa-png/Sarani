import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { landingPages, clients } from "@/lib/db/schema";
import { eq, and, desc, SQL } from "drizzle-orm";

/**
 * GET /api/admin/landing-pages
 * List all landing pages, filterable by status and clientId.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const clientId = searchParams.get("clientId");

    const conditions: SQL[] = [];

    if (status && status !== "all") {
      conditions.push(eq(landingPages.status, status));
    }
    if (clientId) {
      conditions.push(eq(landingPages.clientId, clientId));
    }

    const result = await db
      .select({
        id: landingPages.id,
        clientId: landingPages.clientId,
        clientName: clients.name,
        title: landingPages.title,
        slug: landingPages.slug,
        status: landingPages.status,
        brief: landingPages.brief,
        language: landingPages.language,
        noIndex: landingPages.noIndex,
        shareToken: landingPages.shareToken,
        publishedAt: landingPages.publishedAt,
        createdBy: landingPages.createdBy,
        createdAt: landingPages.createdAt,
        updatedAt: landingPages.updatedAt,
      })
      .from(landingPages)
      .leftJoin(clients, eq(landingPages.clientId, clients.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(landingPages.createdAt));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching landing pages:", error);
    return NextResponse.json(
      { error: "Failed to fetch landing pages" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/landing-pages
 * Create a new landing page (status: draft).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { clientId, title, brief, language } = body;

    if (!clientId || !title || !brief) {
      return NextResponse.json(
        { error: "clientId, title, and brief are required" },
        { status: 400 }
      );
    }

    // Generate slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80)
      + "-" + Date.now().toString(36);

    const [created] = await db
      .insert(landingPages)
      .values({
        clientId,
        title,
        slug,
        brief,
        language: language || "EN",
        status: "draft",
        createdBy: "admin",
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error creating landing page:", error);
    return NextResponse.json(
      { error: "Failed to create landing page" },
      { status: 500 }
    );
  }
}
