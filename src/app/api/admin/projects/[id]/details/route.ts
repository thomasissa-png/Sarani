import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  agentOutputs,
  caseStudyCandidates,
  landingPages,
  storyboards,
  storyboardScenes,
  projectPreviews,
  clients,
  quotes,
} from "@/lib/db/schema";
import { eq, and, like, desc } from "drizzle-orm";
import { getTask } from "@/lib/integrations/clickup";

// SSR — Server rendering, data aggregation endpoint for one project.
// Projects don't have a DB table; they come from the tracker (ClickUp/Excel merge).
// We accept `client` + `project` query params to look up related data across tables.

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    const { searchParams } = new URL(request.url);

    // The composite ID from the tracker is "clientName::projectName"
    // Accept either the route param (URL-encoded) or explicit query params
    let clientName = searchParams.get("client");
    let projectName = searchParams.get("project");

    if (!clientName || !projectName) {
      const decoded = decodeURIComponent(rawId);
      const parts = decoded.split("::");
      if (parts.length >= 2) {
        clientName = parts[0];
        projectName = parts.slice(1).join("::");
      }
    }

    if (!clientName) {
      return NextResponse.json(
        { error: "VALIDATION", message: "client name is required (via query param or composite ID)." },
        { status: 400 }
      );
    }

    console.log(`[project-details] Querying for client="${clientName}", project="${projectName ?? "(none)"}"`);

    // 1. Find the client record (if any) — fuzzy match with wildcards
    let client: typeof clients.$inferSelect | null = null;
    let clientId: string | null = null;
    try {
      const clientRecords = await db
        .select()
        .from(clients)
        .where(like(clients.name, `%${clientName}%`));

      client = clientRecords[0] ?? null;
      clientId = client?.id ?? null;
      console.log(`[project-details] Client lookup: found=${!!client}, clientId=${clientId}, matchedName="${client?.name ?? ""}"`);
    } catch (err) {
      console.error("[project-details] Failed to query clients table:", err);
    }

    // 2. Agent outputs for this client
    let outputs: Array<{
      id: string;
      agentType: string;
      status: string;
      inputPayload: unknown;
      outputContent: string | null;
      createdAt: Date;
      createdBy: string | null;
    }> = [];
    try {
      outputs = clientId
        ? await db
            .select({
              id: agentOutputs.id,
              agentType: agentOutputs.agentType,
              status: agentOutputs.status,
              inputPayload: agentOutputs.inputPayload,
              outputContent: agentOutputs.outputContent,
              createdAt: agentOutputs.createdAt,
              createdBy: agentOutputs.createdBy,
            })
            .from(agentOutputs)
            .where(eq(agentOutputs.clientId, clientId))
            .orderBy(desc(agentOutputs.createdAt))
            .limit(100)
        : [];
    } catch (err) {
      console.error("[project-details] Failed to query agent_outputs:", err);
    }

    // 3. Case study candidates for this client — fuzzy match
    let caseStudies: Array<typeof caseStudyCandidates.$inferSelect> = [];
    try {
      caseStudies = await db
        .select()
        .from(caseStudyCandidates)
        .where(like(caseStudyCandidates.clientName, `%${clientName}%`))
        .orderBy(desc(caseStudyCandidates.createdAt))
        .limit(20);
    } catch (err) {
      console.error("[project-details] Failed to query case_study_candidates:", err);
    }

    // 4. Landing pages for this client
    let pages: Array<{
      id: string;
      title: string;
      slug: string;
      status: string;
      language: string;
      createdAt: Date;
    }> = [];
    try {
      pages = clientId
        ? await db
            .select({
              id: landingPages.id,
              title: landingPages.title,
              slug: landingPages.slug,
              status: landingPages.status,
              language: landingPages.language,
              createdAt: landingPages.createdAt,
            })
            .from(landingPages)
            .where(eq(landingPages.clientId, clientId))
            .orderBy(desc(landingPages.createdAt))
            .limit(20)
        : [];
    } catch (err) {
      console.error("[project-details] Failed to query landing_pages:", err);
    }

    // 5. Storyboards for this client
    let boards: Array<{
      id: string;
      title: string;
      status: string;
      shareToken: string | null;
      createdAt: Date;
    }> = [];
    try {
      boards = clientId
        ? await db
            .select({
              id: storyboards.id,
              title: storyboards.title,
              status: storyboards.status,
              shareToken: storyboards.shareToken,
              createdAt: storyboards.createdAt,
            })
            .from(storyboards)
            .where(eq(storyboards.clientId, clientId))
            .orderBy(desc(storyboards.createdAt))
            .limit(20)
        : [];
    } catch (err) {
      console.error("[project-details] Failed to query storyboards:", err);
    }

    // 6. Storyboard scene counts (avoid N+1)
    const boardIds = boards.map((b) => b.id);
    const sceneCounts: Record<string, number> = {};
    if (boardIds.length > 0) {
      for (const bid of boardIds) {
        try {
          const scenes = await db
            .select({ id: storyboardScenes.id })
            .from(storyboardScenes)
            .where(eq(storyboardScenes.storyboardId, bid));
          sceneCounts[bid] = scenes.length;
        } catch (err) {
          console.error(`[project-details] Failed to query scenes for storyboard ${bid}:`, err);
          sceneCounts[bid] = 0;
        }
      }
    }

    // 7. Project previews — match by exact projectId (composite "client::project")
    let allPreviews: Array<typeof projectPreviews.$inferSelect> = [];
    try {
      const projectId = `${clientName}::${projectName ?? ""}`;
      allPreviews = await db
        .select()
        .from(projectPreviews)
        .where(eq(projectPreviews.projectId, projectId))
        .orderBy(desc(projectPreviews.version));
    } catch (err) {
      console.error("[project-details] Failed to query project_previews:", err);
    }

    // 8. Quotes for this client + project — fuzzy match
    let projectQuotes: Array<typeof quotes.$inferSelect> = [];
    try {
      projectQuotes = await db
        .select()
        .from(quotes)
        .where(
          projectName
            ? and(
                like(quotes.clientName, `%${clientName}%`),
                like(quotes.projectName, `%${projectName}%`)
              )
            : like(quotes.clientName, `%${clientName}%`)
        )
        .orderBy(desc(quotes.createdAt))
        .limit(10);
    } catch (err) {
      console.error("[project-details] Failed to query quotes:", err);
    }

    // 9. Fetch ClickUp task description (brief) if clickupTaskUrl is provided
    let brief: string | null = null;
    const clickupUrl = searchParams.get("clickup");
    if (clickupUrl) {
      const taskIdMatch = clickupUrl.match(/\/t\/([a-zA-Z0-9]+)/);
      const taskId = taskIdMatch?.[1];
      if (taskId) {
        try {
          const task = await getTask(taskId);
          brief = task.description || null;
        } catch (err) {
          console.error("[project-details] Failed to fetch ClickUp task description:", err);
        }
      }
    }

    return NextResponse.json({
      client: client
        ? {
            id: client.id,
            name: client.name,
            industry: client.industry,
            status: client.status,
            primaryColor: client.primaryColor,
            primaryContactName: client.primaryContactName,
            primaryContactEmail: client.primaryContactEmail,
          }
        : null,
      projectName: projectName ?? null,
      brief,
      agentOutputs: outputs,
      caseStudyCandidates: caseStudies,
      landingPages: pages,
      storyboards: boards.map((b) => ({
        ...b,
        sceneCount: sceneCounts[b.id] ?? 0,
      })),
      projectPreviews: allPreviews,
      quotes: projectQuotes,
    });
  } catch (error) {
    console.error("Error fetching project details:", error);
    return NextResponse.json(
      { error: "INTERNAL", message: "Failed to fetch project details." },
      { status: 500 }
    );
  }
}
