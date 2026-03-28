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

    // 1. Find the client record (if any)
    const clientRecords = await db
      .select()
      .from(clients)
      .where(like(clients.name, clientName));

    const client = clientRecords[0] ?? null;
    const clientId = client?.id ?? null;

    // 2. Agent outputs for this client
    const outputs = clientId
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

    // 3. Case study candidates for this client
    const caseStudies = await db
      .select()
      .from(caseStudyCandidates)
      .where(like(caseStudyCandidates.clientName, clientName))
      .orderBy(desc(caseStudyCandidates.createdAt))
      .limit(20);

    // 4. Landing pages for this client
    const pages = clientId
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

    // 5. Storyboards for this client
    const boards = clientId
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

    // 6. Storyboard scene counts (avoid N+1)
    const boardIds = boards.map((b) => b.id);
    const sceneCounts: Record<string, number> = {};
    if (boardIds.length > 0) {
      for (const bid of boardIds) {
        const scenes = await db
          .select({ id: storyboardScenes.id })
          .from(storyboardScenes)
          .where(eq(storyboardScenes.storyboardId, bid));
        sceneCounts[bid] = scenes.length;
      }
    }

    // 7. Project previews — use the composite projectId pattern "client::project"
    const projectId = `${clientName}::${projectName ?? ""}`;
    const previews = await db
      .select()
      .from(projectPreviews)
      .where(eq(projectPreviews.projectId, projectId));

    // Also try matching by clientName if no exact projectId match
    const previewsByClient = previews.length === 0
      ? await db
          .select()
          .from(projectPreviews)
          .where(like(projectPreviews.clientName, clientName))
          .limit(10)
      : [];

    const allPreviews = previews.length > 0 ? previews : previewsByClient;

    // 8. Quotes for this client + project
    const projectQuotes = await db
      .select()
      .from(quotes)
      .where(
        projectName
          ? and(
              like(quotes.clientName, clientName),
              like(quotes.projectName, `%${projectName}%`)
            )
          : like(quotes.clientName, clientName)
      )
      .orderBy(desc(quotes.createdAt))
      .limit(10);

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
