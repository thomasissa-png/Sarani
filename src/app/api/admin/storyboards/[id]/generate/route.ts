import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  storyboards,
  storyboardScenes,
  storyboardSceneVersions,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// ─── fal.ai Flux.1 Pro integration ────────────────────────────────────────

const FAL_ENDPOINT = "https://fal.run/fal-ai/flux-pro/v1.1";
const FAL_TIMEOUT_MS = 30_000;

interface FalResponse {
  images: Array<{
    url: string;
    width: number;
    height: number;
  }>;
}

async function generateImage(prompt: string): Promise<{
  url: string;
  prompt: string;
  error?: string;
}> {
  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    return {
      url: "",
      prompt,
      error: "FAL_KEY environment variable is not set",
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FAL_TIMEOUT_MS);

    const response = await fetch(FAL_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Key ${falKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        image_size: "landscape_16_9",
        num_inference_steps: 28,
        guidance_scale: 3.5,
        num_images: 1,
        output_format: "jpeg",
        output_quality: 90,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      return {
        url: "",
        prompt,
        error: `fal.ai API error (${response.status}): ${errText.slice(0, 200)}`,
      };
    }

    const data = (await response.json()) as FalResponse;
    if (!data.images || data.images.length === 0) {
      return { url: "", prompt, error: "No images returned by fal.ai" };
    }

    return { url: data.images[0].url, prompt };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { url: "", prompt, error: "Image generation timed out (30s)" };
    }
    return {
      url: "",
      prompt,
      error: `Image generation failed: ${err instanceof Error ? err.message : "unknown"}`,
    };
  }
}

/** Build prompt from scene data per specs §3 */
function buildImagePrompt(scene: {
  description: string | null;
  cameraDirection: string | null;
  mood: string | null;
}): string {
  const parts: string[] = [];
  if (scene.description) parts.push(scene.description);
  if (scene.cameraDirection) parts.push(scene.cameraDirection);
  if (scene.mood) parts.push(`Mood: ${scene.mood}`);
  parts.push("Cinematic 16:9 frame, photorealistic. No text overlay, no watermark.");
  return parts.join(". ");
}

// ─── POST /api/admin/storyboards/[id]/generate ─────────────────────────────

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Verify storyboard exists
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

    // 2. Update status to generating
    await db
      .update(storyboards)
      .set({ status: "generating", updatedAt: new Date() })
      .where(eq(storyboards.id, id));

    // 3. Fetch scenes
    const scenes = await db
      .select()
      .from(storyboardScenes)
      .where(eq(storyboardScenes.storyboardId, id))
      .orderBy(storyboardScenes.sceneOrder);

    if (scenes.length === 0) {
      await db
        .update(storyboards)
        .set({ status: "draft", updatedAt: new Date() })
        .where(eq(storyboards.id, id));
      return NextResponse.json(
        { error: "No scenes found for this storyboard" },
        { status: 400 }
      );
    }

    // 4. Mark all scenes as generating
    for (const scene of scenes) {
      await db
        .update(storyboardScenes)
        .set({ status: "generating", updatedAt: new Date() })
        .where(eq(storyboardScenes.id, scene.id));
    }

    // 5. Generate images in parallel
    const results = await Promise.allSettled(
      scenes.map(async (scene) => {
        const prompt = buildImagePrompt({
          description: scene.description,
          cameraDirection: scene.cameraDirection,
          mood: scene.mood,
        });

        const result = await generateImage(prompt);

        if (result.error || !result.url) {
          // Scene failed — use placeholder
          const placeholderUrl = `https://placehold.co/1920x1080/1a1a1a/ffffff?text=Scene+${scene.sceneOrder}`;
          await db
            .update(storyboardScenes)
            .set({
              status: "failed",
              imageUrl: placeholderUrl,
              updatedAt: new Date(),
            })
            .where(eq(storyboardScenes.id, scene.id));

          return {
            sceneId: scene.id,
            sceneOrder: scene.sceneOrder,
            status: "failed" as const,
            error: result.error,
          };
        }

        // Scene succeeded
        await db
          .update(storyboardScenes)
          .set({
            status: "ready",
            imageUrl: result.url,
            updatedAt: new Date(),
          })
          .where(eq(storyboardScenes.id, scene.id));

        // Create version record
        await db.insert(storyboardSceneVersions).values({
          sceneId: scene.id,
          version: 1,
          imageUrl: result.url,
          promptUsed: result.prompt,
        });

        return {
          sceneId: scene.id,
          sceneOrder: scene.sceneOrder,
          status: "ready" as const,
        };
      })
    );

    // 6. Count successes/failures
    const outcomes = results.map((r) =>
      r.status === "fulfilled" ? r.value : { status: "failed" as const, error: "Promise rejected" }
    );
    const readyCount = outcomes.filter((o) => o.status === "ready").length;
    const failedCount = outcomes.filter((o) => o.status === "failed").length;

    // 7. Update storyboard status
    const finalStatus = readyCount > 0 ? "ready" : "draft";
    await db
      .update(storyboards)
      .set({ status: finalStatus, updatedAt: new Date() })
      .where(eq(storyboards.id, id));

    return NextResponse.json({
      success: true,
      scenesGenerated: readyCount,
      scenesFailed: failedCount,
      totalScenes: scenes.length,
      results: outcomes,
    });
  } catch (error) {
    console.error("Error generating storyboard:", error);
    return NextResponse.json(
      { error: "Failed to generate storyboard" },
      { status: 500 }
    );
  }
}
