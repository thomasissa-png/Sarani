import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  storyboards,
  storyboardScenes,
  storyboardSceneVersions,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// POST /api/admin/storyboards/[id]/generate — mock generation
// Changes status to "generating" then "ready", creates scene versions with placeholder URLs
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify storyboard exists
    const [storyboard] = await db
      .select()
      .from(storyboards)
      .where(eq(storyboards.id, id));

    if (!storyboard) {
      return NextResponse.json(
        { error: "Storyboard not found" },
        { status: 404 }
      );
    }

    // Update storyboard status to generating
    await db
      .update(storyboards)
      .set({ status: "generating", updatedAt: new Date() })
      .where(eq(storyboards.id, id));

    // Fetch scenes
    const scenes = await db
      .select()
      .from(storyboardScenes)
      .where(eq(storyboardScenes.storyboardId, id))
      .orderBy(storyboardScenes.sceneOrder);

    if (scenes.length === 0) {
      return NextResponse.json(
        { error: "No scenes found for this storyboard" },
        { status: 400 }
      );
    }

    // Mock: update each scene to "ready" and create a version with placeholder image
    for (const scene of scenes) {
      const placeholderUrl = `https://placehold.co/1920x1080/1a1a1a/ffffff?text=Scene+${scene.sceneOrder}`;
      const mockPrompt = `${scene.description || "Scene description"}. ${scene.cameraDirection || ""}. Cinematic 16:9 frame, photorealistic.`.trim();

      // Update scene status and image_url
      await db
        .update(storyboardScenes)
        .set({
          status: "ready",
          imageUrl: placeholderUrl,
          updatedAt: new Date(),
        })
        .where(eq(storyboardScenes.id, scene.id));

      // Create a version record
      await db.insert(storyboardSceneVersions).values({
        sceneId: scene.id,
        version: 1,
        imageUrl: placeholderUrl,
        promptUsed: mockPrompt,
      });
    }

    // Update storyboard status to ready
    await db
      .update(storyboards)
      .set({ status: "ready", updatedAt: new Date() })
      .where(eq(storyboards.id, id));

    return NextResponse.json({
      success: true,
      message: `Mock generation complete: ${scenes.length} scenes generated`,
      scenesGenerated: scenes.length,
    });
  } catch (error) {
    console.error("Error generating storyboard:", error);
    return NextResponse.json(
      { error: "Failed to generate storyboard" },
      { status: 500 }
    );
  }
}
