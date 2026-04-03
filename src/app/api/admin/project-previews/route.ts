import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projectPreviews } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { slugify } from "@/lib/slugify";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * GET /api/admin/project-previews
 * List all active project previews (for hydrating the Share button state on page load).
 */
export async function GET() {
  try {
    const rows = await db
      .select({
        projectId: projectPreviews.projectId,
        version: projectPreviews.version,
        clientSlug: projectPreviews.clientSlug,
        projectSlug: projectPreviews.projectSlug,
        isActive: projectPreviews.isActive,
        id: projectPreviews.id,
        createdAt: projectPreviews.createdAt,
      })
      .from(projectPreviews)
      .where(eq(projectPreviews.isActive, true))
      .orderBy(desc(projectPreviews.version));

    // Group by projectId — return the latest version per project for the tracker
    const previews: Record<string, { url: string; previewId: string; isActive: boolean; version: number }> = {};
    for (const row of rows) {
      // Only keep the latest version per projectId (first one due to DESC order)
      if (!previews[row.projectId]) {
        previews[row.projectId] = {
          url: `/project/${row.clientSlug}/${row.projectSlug}`,
          previewId: row.id,
          isActive: true,
          version: row.version,
        };
      }
    }

    return NextResponse.json({ previews });
  } catch (error) {
    console.error("[project-previews] GET error:", error);
    return NextResponse.json(
      { error: "INTERNAL", message: "Failed to list project previews." },
      { status: 500 }
    );
  }
}

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

  let body: { projectId?: string; clientName?: string; projectName?: string; brief?: string; sharepointLink?: string; spFolderId?: string; spDriveId?: string; selectedAssets?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "INVALID_JSON", message: "Invalid request body." },
      { status: 400 }
    );
  }

  const { projectId, clientName, projectName, brief, sharepointLink, spFolderId, spDriveId, selectedAssets } = body;

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
    // Generate slugs
    const clientSlug = slugify(clientName);
    const baseProjectSlug = slugify(projectName);

    if (!clientSlug || !baseProjectSlug) {
      return NextResponse.json(
        { error: "VALIDATION", message: "Could not generate valid slugs from client/project names." },
        { status: 400 }
      );
    }

    // Check if a preview already exists for this project.
    // The DB may have a legacy UNIQUE constraint on project_id alone
    // (project_previews_project_id_key), so we must handle the case where
    // only one row per project is allowed.
    const [existing] = await db
      .select({
        id: projectPreviews.id,
        version: projectPreviews.version,
      })
      .from(projectPreviews)
      .where(eq(projectPreviews.projectId, projectId))
      .orderBy(desc(projectPreviews.version))
      .limit(1);

    const briefValue = brief && typeof brief === "string" ? brief : null;
    const sharepointLinkValue = sharepointLink && typeof sharepointLink === "string" ? sharepointLink : null;
    const spFolderIdValue = spFolderId && typeof spFolderId === "string" ? spFolderId : null;
    const spDriveIdValue = spDriveId && typeof spDriveId === "string" ? spDriveId : null;
    const selectedAssetsValue = selectedAssets ?? null;

    let resultId: string;
    let resultVersion: number;

    if (existing) {
      // Create a NEW row for the new version so each version has its own previewId
      // (comments are tied to previewId — reusing the same row carries old comments over)
      const newVersion = existing.version + 1;
      if (newVersion > 20) {
        return NextResponse.json(
          { error: "VERSION_LIMIT", message: "Maximum 20 versions per project reached." },
          { status: 409 }
        );
      }

      const projectSlug = `${baseProjectSlug}-v${newVersion}`;

      // Deactivate previous versions (so the latest is the active one)
      await db
        .update(projectPreviews)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(projectPreviews.projectId, projectId));

      try {
        // Try inserting a new row (works if no legacy UNIQUE on project_id alone)
        const [inserted] = await db.insert(projectPreviews).values({
          projectId,
          version: newVersion,
          clientSlug,
          projectSlug,
          clientName,
          projectName,
          brief: briefValue,
          sharepointLink: sharepointLinkValue,
          spFolderId: spFolderIdValue,
          spDriveId: spDriveIdValue,
          selectedAssets: selectedAssetsValue,
          isActive: true,
        }).returning({ id: projectPreviews.id });

        resultId = inserted.id;
        resultVersion = newVersion;
      } catch (insertErr) {
        // Fallback: if legacy UNIQUE constraint on project_id alone prevents insert,
        // update the existing row (comments will carry over — legacy limitation)
        const pgErr = (insertErr as { cause?: { code?: string } })?.cause;
        if (pgErr?.code === "23505") {
          // Unique violation — update in place
          const [updated] = await db
            .update(projectPreviews)
            .set({
              version: newVersion,
              clientSlug,
              projectSlug,
              clientName,
              projectName,
              brief: briefValue,
              sharepointLink: sharepointLinkValue,
              spFolderId: spFolderIdValue,
              spDriveId: spDriveIdValue,
              selectedAssets: selectedAssetsValue,
              isActive: true,
              updatedAt: new Date(),
            })
            .where(eq(projectPreviews.id, existing.id))
            .returning({ id: projectPreviews.id });

          resultId = updated.id;
          resultVersion = newVersion;
        } else {
          throw insertErr;
        }
      }
    } else {
      // No existing preview — insert a new row (version 1)
      const projectSlug = baseProjectSlug;

      const [inserted] = await db.insert(projectPreviews).values({
        projectId,
        version: 1,
        clientSlug,
        projectSlug,
        clientName,
        projectName,
        brief: briefValue,
        sharepointLink: sharepointLinkValue,
        spFolderId: spFolderIdValue,
        spDriveId: spDriveIdValue,
        selectedAssets: selectedAssetsValue,
        isActive: true,
      }).returning({ id: projectPreviews.id });

      resultId = inserted.id;
      resultVersion = 1;
    }

    const finalSlug = resultVersion === 1 ? baseProjectSlug : `${baseProjectSlug}-v${resultVersion}`;
    const url = `/project/${clientSlug}/${finalSlug}`;
    return NextResponse.json({ url, created: true, id: resultId, version: resultVersion }, { status: 201 });
  } catch (error: unknown) {
    console.error("[project-previews] POST error:", error);
    // Extract the real PostgreSQL error from Drizzle wrapper
    const pgError = (error as { cause?: { message?: string; code?: string } })?.cause;
    const pgDetail = pgError?.message ?? "";
    const pgCode = pgError?.code ?? "";
    const detail = pgDetail || (error instanceof Error ? error.message : String(error));

    // Common DB errors with user-friendly messages
    if (detail.includes("relation") && detail.includes("does not exist")) {
      return NextResponse.json(
        { error: "DB_MIGRATION", message: "Database table missing. Run: npm run db:migrate" },
        { status: 500 }
      );
    }
    if (detail.includes("column") && detail.includes("does not exist")) {
      return NextResponse.json(
        { error: "DB_MIGRATION", message: `Database column missing (${detail.split('"')[1] ?? "unknown"}). Run: npm run db:migrate` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "INTERNAL", message: `Failed to create project preview: ${detail}${pgCode ? ` [PG:${pgCode}]` : ""}` },
      { status: 500 }
    );
  }
}
