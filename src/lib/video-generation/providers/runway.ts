// ─── Runway Gen-4 Turbo Provider ─────────────────────────────────────────────
// Secondary provider — fast internal iterations.
// Uses Runway API for Gen-4 Turbo video generation.
// Env var: RUNWAY_API_KEY
// See docs/ia/video-prompt-library.md Section 2.2 for prompting rules.
// Key rules: image-first prompting, motion-only prompts, NO negative prompts.

import type {
  VideoProviderAdapter,
  VideoGenerationRequest,
  VideoGenerationResult,
} from "../types";
import { buildVideoPrompt } from "../prompt-builder";

const RUNWAY_API_BASE = "https://api.dev.runwayml.com/v1";
const SUBMIT_TIMEOUT_MS = 30_000;
const POLL_TIMEOUT_MS = 120_000; // Runway can take longer
const POLL_INTERVAL_MS = 5_000;

// Cost: ~$0.25 per 5s clip (Turbo is half the credits of Standard)
const COST_PER_SECOND_CENTS = 5;

interface RunwayTaskResponse {
  id: string;
  status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED";
  output?: string[]; // array of video URLs
  failure?: string;
  failureCode?: string;
}

function getApiKey(): string {
  const key = process.env.RUNWAY_API_KEY;
  if (!key || key === "..." || key === "your-api-key-here") {
    throw new Error("RUNWAY_API_KEY environment variable is not set or is a placeholder");
  }
  return key;
}

export const runwayProvider: VideoProviderAdapter = {
  async generate(request: VideoGenerationRequest): Promise<VideoGenerationResult> {
    const apiKey = getApiKey();
    const assembled = buildVideoPrompt(
      {
        description: request.sceneDescription,
        referenceImageUrl: request.referenceImageUrl,
        duration: request.duration,
        aspectRatio: request.aspectRatio,
      },
      "runway"
    );

    // Runway Gen-4 Turbo request body
    const body: Record<string, unknown> = {
      promptText: assembled.prompt,
      model: "gen4_turbo",
      duration: request.duration <= 5 ? 5 : 10, // Runway supports 5s or 10s
      ratio: mapAspectRatio(request.aspectRatio || "16:9"),
    };

    // Image-to-video: upload the storyboard frame as input image
    if (assembled.referenceImageUrl) {
      body.promptImage = assembled.referenceImageUrl;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SUBMIT_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(`${RUNWAY_API_BASE}/image_to_video`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "X-Runway-Version": "2024-11-06",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(
        `Runway API submission failed (${response.status}): ${errText.slice(0, 300)}`
      );
    }

    const data = (await response.json()) as RunwayTaskResponse;
    const taskId = data.id;

    if (!taskId) {
      throw new Error("Runway API did not return a task ID");
    }

    // Poll for completion
    const pollStart = Date.now();
    while (Date.now() - pollStart < POLL_TIMEOUT_MS) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

      const status = await this.checkStatus(taskId);
      if (status.status === "completed" && status.videoUrl) {
        return {
          videoUrl: status.videoUrl,
          provider: "runway",
          durationSeconds: request.duration,
          costCents: this.estimateCost(request.duration),
          metadata: { taskId, model: "gen4_turbo" },
        };
      }
      if (status.status === "failed") {
        throw new Error(`Runway generation failed: ${status.error || "unknown"}`);
      }
    }

    throw new Error("Runway generation timed out after 120 seconds");
  },

  async checkStatus(jobId: string) {
    const apiKey = getApiKey();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
      const response = await fetch(
        `${RUNWAY_API_BASE}/tasks/${jobId}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "X-Runway-Version": "2024-11-06",
          },
          signal: controller.signal,
        }
      );
      clearTimeout(timeout);

      if (!response.ok) {
        return { status: "failed" as const, error: `Poll failed (${response.status})` };
      }

      const data = (await response.json()) as RunwayTaskResponse;

      switch (data.status) {
        case "SUCCEEDED":
          return {
            status: "completed" as const,
            videoUrl: data.output?.[0],
          };
        case "FAILED":
        case "CANCELLED":
          return {
            status: "failed" as const,
            error: data.failure || data.failureCode || "Generation failed",
          };
        case "RUNNING":
          return { status: "processing" as const };
        case "PENDING":
        default:
          return { status: "pending" as const };
      }
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof Error && err.name === "AbortError") {
        return { status: "pending" as const };
      }
      return {
        status: "failed" as const,
        error: err instanceof Error ? err.message : "unknown",
      };
    }
  },

  estimateCost(durationSeconds: number): number {
    return Math.ceil(durationSeconds * COST_PER_SECOND_CENTS);
  },
};

/**
 * Map standard aspect ratios to Runway's expected format.
 */
function mapAspectRatio(ratio: "16:9" | "9:16" | "1:1"): string {
  switch (ratio) {
    case "16:9":
      return "1280:768";
    case "9:16":
      return "768:1280";
    case "1:1":
      return "1024:1024";
    default:
      return "1280:768";
  }
}
