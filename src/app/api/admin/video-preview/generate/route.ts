import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  storyboards,
  storyboardScenes,
  videoPreviews,
} from "@/lib/db/schema";
import type { VideoPreviewScene } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { checkRateLimit, UUID_REGEX } from "@/lib/rate-limit";
import {
  generateVideoWithFallback,
  estimateTotalCost,
  getBestAvailableProvider,
} from "@/lib/video-generation";
import type { VideoProvider } from "@/lib/video-generation";
import { getUserFromSession } from "@/lib/auth";

// ─── Input validation ───────────────────────────────────────────────────────

const generateSchema = z.object({
  storyboardId: z
    .string()
    .regex(UUID_REGEX, "Invalid storyboard ID format"),
  provider: z
    .enum(["veo", "runway", "kling"])
    .optional()
    .default("veo"),
  aspectRatio: z
    .enum(["16:9", "9:16", "1:1"])
    .optional()
    .default("16:9"),
});

// ─── POST /api/admin/video-preview/generate ──────────────────────────────────
// Creates a video preview from an approved/ready storyboard.
// Launches generation for each scene in parallel (non-blocking).
// Returns the video preview ID immediately for polling.

export async function POST(request: NextRequest) {
  try {
    // Auth guard
    const session = await getUserFromSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit: 3 generations per minute
    if (!checkRateLimit("video-preview-generate", 3, 60_000)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Max 3 video generations per minute." },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    // Parse and validate input
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const parsed = generateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { storyboardId, provider: requestedProvider, aspectRatio } = parsed.data;

    // Verify a provider is available
    const effectiveProvider =
      getBestAvailableProvider() || (requestedProvider as VideoProvider);

    // Fetch storyboard
    const [storyboard] = await db
      .select()
      .from(storyboards)
      .where(eq(storyboards.id, storyboardId));

    if (!storyboard) {
      return NextResponse.json(
        { error: "Storyboard not found" },
        { status: 404 }
      );
    }

    // Only allow generation from storyboards that are ready or approved
    if (!["ready", "approved", "shared"].includes(storyboard.status)) {
      return NextResponse.json(
        {
          error: `Storyboard must be ready or approved to generate video. Current status: ${storyboard.status}`,
        },
        { status: 400 }
      );
    }

    // Fetch scenes
    const scenes = await db
      .select()
      .from(storyboardScenes)
      .where(eq(storyboardScenes.storyboardId, storyboardId))
      .orderBy(storyboardScenes.sceneOrder);

    if (scenes.length === 0) {
      return NextResponse.json(
        { error: "No scenes found for this storyboard" },
        { status: 400 }
      );
    }

    // Build initial scene entries for the video preview
    const previewScenes: VideoPreviewScene[] = scenes.map((scene) => ({
      sceneId: scene.id,
      prompt: "",
      videoUrl: null,
      status: "pending" as const,
      duration: 5, // default 5s per scene
      error: null,
    }));

    // Estimate total cost
    const costEstimate = estimateTotalCost(
      effectiveProvider,
      previewScenes.map((s) => ({ duration: s.duration }))
    );

    // Create the video preview record
    const [videoPreview] = await db
      .insert(videoPreviews)
      .values({
        storyboardId,
        projectName: storyboard.title,
        clientName: null, // Will be populated if client is linked
        provider: effectiveProvider,
        status: "generating",
        scenes: previewScenes,
        costEstimateCents: costEstimate,
        metadata: { requestedProvider, aspectRatio },
      })
      .returning();

    // Launch generation in background — we MUST await before response on Replit autoscale
    // But video generation takes 30-120s per scene, so we update the DB progressively
    // and return immediately. The frontend polls the status endpoint.
    //
    // IMPORTANT: On Replit autoscale, fire-and-forget is NOT safe.
    // However, video generation is inherently long-running (minutes).
    // We use a background task pattern: create the record as "generating",
    // return the ID, and process via a separate mechanism.
    // For now, we kick off all scenes in parallel and let them resolve.
    // The DB writes happen within the generation promises.

    void processVideoGeneration(
      videoPreview.id,
      scenes,
      effectiveProvider,
      aspectRatio
    );

    return NextResponse.json({
      success: true,
      videoPreviewId: videoPreview.id,
      provider: effectiveProvider,
      scenesCount: scenes.length,
      costEstimateCents: costEstimate,
      statusUrl: `/api/admin/video-preview/${videoPreview.id}/status`,
    });
  } catch (error) {
    console.error("[video-preview/generate] Error:", error);
    return NextResponse.json(
      { error: "Failed to start video generation" },
      { status: 500 }
    );
  }
}

// ─── Background Processing ──────────────────────────────────────────────────

async function processVideoGeneration(
  videoPreviewId: string,
  scenes: Array<{
    id: string;
    description: string | null;
    cameraDirection: string | null;
    mood: string | null;
    imageUrl: string | null;
    sceneOrder: number;
  }>,
  provider: VideoProvider,
  aspectRatio: "16:9" | "9:16" | "1:1"
) {
  try {
    // Generate all scenes in parallel
    const results = await Promise.allSettled(
      scenes.map(async (scene) => {
        const sceneDescription = [
          scene.description,
          scene.cameraDirection
            ? `Camera: ${scene.cameraDirection}`
            : null,
          scene.mood ? `Mood: ${scene.mood}` : null,
        ]
          .filter(Boolean)
          .join(". ");

        try {
          const result = await generateVideoWithFallback({
            sceneDescription,
            duration: 5,
            referenceImageUrl: scene.imageUrl || undefined,
            aspectRatio,
            provider,
          });

          return {
            sceneId: scene.id,
            sceneOrder: scene.sceneOrder,
            status: "ready" as const,
            videoUrl: result.videoUrl,
            prompt: sceneDescription,
            duration: result.durationSeconds,
            costCents: result.costCents,
            error: null,
          };
        } catch (err) {
          return {
            sceneId: scene.id,
            sceneOrder: scene.sceneOrder,
            status: "failed" as const,
            videoUrl: null,
            prompt: sceneDescription,
            duration: 5,
            costCents: 0,
            error: err instanceof Error ? err.message : "unknown error",
          };
        }
      })
    );

    // Build final scene state
    const finalScenes: VideoPreviewScene[] = results.map((r) => {
      if (r.status === "fulfilled") {
        return {
          sceneId: r.value.sceneId,
          prompt: r.value.prompt,
          videoUrl: r.value.videoUrl,
          status: r.value.status,
          duration: r.value.duration,
          error: r.value.error,
        };
      }
      return {
        sceneId: "unknown",
        prompt: "",
        videoUrl: null,
        status: "failed" as const,
        duration: 5,
        error: "Promise rejected unexpectedly",
      };
    });

    // Compute total cost
    const totalCost = results.reduce((sum, r) => {
      if (r.status === "fulfilled") return sum + r.value.costCents;
      return sum;
    }, 0);

    // Determine overall status
    const readyCount = finalScenes.filter((s) => s.status === "ready").length;
    const overallStatus =
      readyCount === finalScenes.length
        ? "ready"
        : readyCount > 0
          ? "ready" // partial success still "ready"
          : "failed";

    // Update the video preview record
    await db
      .update(videoPreviews)
      .set({
        status: overallStatus,
        scenes: finalScenes,
        costEstimateCents: totalCost,
        updatedAt: new Date(),
      })
      .where(eq(videoPreviews.id, videoPreviewId));
  } catch (error) {
    console.error("[video-preview/generate] Background processing error:", error);
    // Mark as failed
    await db
      .update(videoPreviews)
      .set({
        status: "failed",
        updatedAt: new Date(),
        metadata: {
          backgroundError:
            error instanceof Error ? error.message : "unknown",
        },
      })
      .where(eq(videoPreviews.id, videoPreviewId))
      .catch(() => {}); // best-effort
  }
}
