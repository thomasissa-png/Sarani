import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projectPreviews } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { slugify } from "@/lib/slugify";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * POST /api/admin/project-previews
 * Create or reactivate a project presentation link.
 * Auth: protected by middleware (admin session cookie).
 *
 * Projects come from ClickUp/Excel merge (not a DB table), so the frontend
 * passes clientName + projectName directly alongside projectId.
 */
export async function POST(request: NextRequest) {
  // Rate limit: 20 req/min per session
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(`preview-create:${ip}`, 20, 60_000)) {
    return NextResponse.json(
      { error: "RATE_LIMITED", message: "Too many requests. Try again later." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  let body: { projectId?: string; clientName?: string; projectName?: string; brief?: string; sharepointLink?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "INVALID_JSON", message: "Invalid request body." },
      { status: 400 }
    );
  }

  const { projectId, clientName, projectName, brief, sharepointLink } = body;

  if (!projectId || typeof projectId !== "string") {
    return NextResponse.json(
      { error: "VALIDATION", message: "projectId is required." },
      { status: 400 }
    );
  }
  if (!clientName || typeof clientName !== "string") {
    return NextResponse.json(
      { error: "VALIDATION", message: "clientName is required." },
      { status: 400 }
    );
  }
  if (!projectName || typeof projectName !== "string") {
    return NextResponse.json(
      { error: "VALIDATION", message: "projectName is required." },
      { status: 400 }
    );
  }

  try {
    // Check if a preview already exists for this projectId
    const [existing] = await db
      .select()
      .from(projectPreviews)
      .where(eq(projectPreviews.projectId, projectId));

    if (existing) {
      // Reactivate and ALWAYS update brief + sharepointLink (may have changed)
      const updates: Record<string, unknown> = { updatedAt: new Date(), isActive: true };
      if (brief && typeof brief === "string") updates.brief = brief;
      if (sharepointLink && typeof sharepointLink === "string") updates.sharepointLink = sharepointLink;

      if (Object.keys(updates).length > 1) {
        await db
          .update(projectPreviews)
          .set(updates)
          .where(eq(projectPreviews.id, existing.id));
      }
      const url = `/project/${existing.clientSlug}/${existing.projectSlug}`;
      return NextResponse.json({ url, created: false, id: existing.id }, { status: 200 });
    }

    // Generate slugs
    const clientSlug = slugify(clientName);
    let projectSlug = slugify(projectName);

    if (!clientSlug || !projectSlug) {
      return NextResponse.json(
        {
          error: "VALIDATION",
          message: "Could not generate valid slugs from client/project names.",
        },
        { status: 400 }
      );
    }

    // Handle slug collision: check if (clientSlug, projectSlug) already exists
    let finalSlug = projectSlug;
    let suffix = 1;
    const MAX_COLLISION_ATTEMPTS = 20;

    while (suffix <= MAX_COLLISION_ATTEMPTS) {
      const [collision] = await db
        .select({ id: projectPreviews.id })
        .from(projectPreviews)
        .where(
          and(
            eq(projectPreviews.clientSlug, clientSlug),
            eq(projectPreviews.projectSlug, finalSlug)
          )
        );

      if (!collision) break;

      suffix++;
      finalSlug = `${projectSlug}-${suffix}`;
    }

    if (suffix > MAX_COLLISION_ATTEMPTS) {
      return NextResponse.json(
        { error: "SLUG_COLLISION", message: "Too many projects with similar names." },
        { status: 409 }
      );
    }

    // Insert new preview
    const [inserted] = await db.insert(projectPreviews).values({
      projectId,
      clientSlug,
      projectSlug: finalSlug,
      clientName,
      projectName,
      brief: brief && typeof brief === "string" ? brief : null,
      sharepointLink: sharepointLink && typeof sharepointLink === "string" ? sharepointLink : null,
      isActive: true,
    }).returning({ id: projectPreviews.id });

    const url = `/project/${clientSlug}/${finalSlug}`;
    return NextResponse.json({ url, created: true, id: inserted.id }, { status: 201 });
  } catch (error) {
    console.error("[project-previews] POST error:", error);
    return NextResponse.json(
      { error: "INTERNAL", message: "Failed to create project preview." },
      { status: 500 }
    );
  }
}
