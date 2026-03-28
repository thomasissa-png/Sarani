import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { storyboards, storyboardScenes, clients } from "@/lib/db/schema";
import { eq, desc, SQL, and, like } from "drizzle-orm";

// GET /api/admin/storyboards — list all storyboards
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const clientSearch = searchParams.get("client");

    const conditions: SQL[] = [];
    if (status && status !== "all") {
      conditions.push(eq(storyboards.status, status));
    }
    if (clientSearch) {
      conditions.push(like(clients.name, `%${clientSearch}%`));
    }

    const result = await db
      .select({
        id: storyboards.id,
        clientId: storyboards.clientId,
        clientName: clients.name,
        title: storyboards.title,
        status: storyboards.status,
        shareToken: storyboards.shareToken,
        shareExpiresAt: storyboards.shareExpiresAt,
        createdBy: storyboards.createdBy,
        createdAt: storyboards.createdAt,
        updatedAt: storyboards.updatedAt,
      })
      .from(storyboards)
      .leftJoin(clients, eq(storyboards.clientId, clients.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(storyboards.createdAt));

    // Fetch scene counts in a separate query to avoid N+1
    const sceneCounts = await db
      .select({
        storyboardId: storyboardScenes.storyboardId,
      })
      .from(storyboardScenes);

    const countMap = new Map<string, number>();
    for (const row of sceneCounts) {
      countMap.set(row.storyboardId, (countMap.get(row.storyboardId) || 0) + 1);
    }

    const enriched = result.map((sb) => ({
      ...sb,
      scenesCount: countMap.get(sb.id) || 0,
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("Error fetching storyboards:", error);
    return NextResponse.json(
      { error: "Failed to fetch storyboards" },
      { status: 500 }
    );
  }
}

// POST /api/admin/storyboards — create a new storyboard with scenes
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, clientId, scenes } = body as {
      title: string;
      clientId: string;
      scenes: Array<{
        description: string;
        cameraDirection?: string;
        mood?: string;
      }>;
    };

    if (!title || !clientId || !scenes || scenes.length === 0) {
      return NextResponse.json(
        { error: "title, clientId, and at least one scene are required" },
        { status: 400 }
      );
    }

    // Insert storyboard
    const [storyboard] = await db
      .insert(storyboards)
      .values({
        title,
        clientId,
        status: "draft",
      })
      .returning();

    // Insert scenes
    const sceneValues = scenes.map((scene, index) => ({
      storyboardId: storyboard.id,
      sceneOrder: index + 1,
      description: scene.description,
      cameraDirection: scene.cameraDirection || null,
      mood: scene.mood || null,
      status: "pending" as const,
    }));

    const insertedScenes = await db
      .insert(storyboardScenes)
      .values(sceneValues)
      .returning();

    return NextResponse.json(
      { ...storyboard, scenes: insertedScenes },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating storyboard:", error);
    return NextResponse.json(
      { error: "Failed to create storyboard" },
      { status: 500 }
    );
  }
}
