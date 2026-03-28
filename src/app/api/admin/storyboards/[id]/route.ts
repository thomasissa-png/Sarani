import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  storyboards,
  storyboardScenes,
  storyboardSceneVersions,
  clients,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// GET /api/admin/storyboards/[id] — detail with scenes and versions
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [storyboard] = await db
      .select({
        id: storyboards.id,
        clientId: storyboards.clientId,
        clientName: clients.name,
        title: storyboards.title,
        scriptText: storyboards.scriptText,
        status: storyboards.status,
        shareToken: storyboards.shareToken,
        shareExpiresAt: storyboards.shareExpiresAt,
        createdBy: storyboards.createdBy,
        createdAt: storyboards.createdAt,
        updatedAt: storyboards.updatedAt,
      })
      .from(storyboards)
      .leftJoin(clients, eq(storyboards.clientId, clients.id))
      .where(eq(storyboards.id, id));

    if (!storyboard) {
      return NextResponse.json(
        { error: "Storyboard not found" },
        { status: 404 }
      );
    }

    // Fetch scenes
    const scenes = await db
      .select()
      .from(storyboardScenes)
      .where(eq(storyboardScenes.storyboardId, id))
      .orderBy(storyboardScenes.sceneOrder);

    // Fetch all versions for these scenes
    const sceneIds = scenes.map((s) => s.id);
    let versions: (typeof storyboardSceneVersions.$inferSelect)[] = [];
    if (sceneIds.length > 0) {
      versions = await db
        .select()
        .from(storyboardSceneVersions)
        .where(
          // Use inArray equivalent — fetch all and filter since small dataset
          eq(storyboardSceneVersions.sceneId, sceneIds[0])
        );

      // For multiple scenes, fetch all versions
      if (sceneIds.length > 1) {
        const allVersions = [];
        for (const sceneId of sceneIds) {
          const sv = await db
            .select()
            .from(storyboardSceneVersions)
            .where(eq(storyboardSceneVersions.sceneId, sceneId));
          allVersions.push(...sv);
        }
        versions = allVersions;
      }
    }

    // Group versions by scene
    const versionsByScene = new Map<
      string,
      (typeof storyboardSceneVersions.$inferSelect)[]
    >();
    for (const v of versions) {
      const arr = versionsByScene.get(v.sceneId) || [];
      arr.push(v);
      versionsByScene.set(v.sceneId, arr);
    }

    const scenesWithVersions = scenes.map((scene) => ({
      ...scene,
      versions: versionsByScene.get(scene.id) || [],
    }));

    return NextResponse.json({
      ...storyboard,
      scenes: scenesWithVersions,
    });
  } catch (error) {
    console.error("Error fetching storyboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch storyboard" },
      { status: 500 }
    );
  }
}
