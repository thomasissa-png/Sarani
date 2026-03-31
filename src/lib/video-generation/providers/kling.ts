// ─── Kling 3.0 Provider (via fal.ai) ─────────────────────────────────────────
// Fallback/volume provider.
// Uses fal.ai SDK (already configured for Flux.1 Pro storyboard generation).
// Env var: FAL_KEY (shared with storyboard image generation).
// See docs/ia/video-prompt-library.md Section 2.3 for prompting rules.
// Key rules: 5-layer structure, 80-150 words, motion intensity 0.5, negative via parameter.

import type {
  VideoProviderAdapter,
  VideoGenerationRequest,
  VideoGenerationResult,
} from "../types";
import { buildVideoPrompt } from "../prompt-builder";

const FAL_KLING_ENDPOINT = "https://fal.run/fal-ai/kling-video/v3/standard/text-to-video";
const FAL_KLING_I2V_ENDPOINT = "https://fal.run/fal-ai/kling-video/v3/standard/image-to-video";
const SUBMIT_TIMEOUT_MS = 30_000;
const POLL_TIMEOUT_MS = 120_000;
const POLL_INTERVAL_MS = 5_000;

// Cost: ~$0.10 per 5s clip (Kling via fal.ai is the cheapest)
const COST_PER_SECOND_CENTS = 2;

interface FalVideoResponse {
  video?: {
    url: string;
    file_name?: string;
    file_size?: number;
  };
  request_id?: string;
}

interface FalQueueResponse {
  request_id: string;
  status: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  response_url?: string;
}

function getApiKey(): string {
  const key = process.env.FAL_KEY;
  if (!key || key === "..." || key === "your-api-key-here") {
    throw new Error("FAL_KEY environment variable is not set or is a placeholder");
  }
  return key;
}

export const klingProvider: VideoProviderAdapter = {
  async generate(request: VideoGenerationRequest): Promise<VideoGenerationResult> {
    const apiKey = getApiKey();
    const assembled = buildVideoPrompt(
      {
        description: request.sceneDescription,
        referenceImageUrl: request.referenceImageUrl,
        duration: request.duration,
        aspectRatio: request.aspectRatio,
      },
      "kling"
    );

    const isImageToVideo = !!assembled.referenceImageUrl;
    const endpoint = isImageToVideo ? FAL_KLING_I2V_ENDPOINT : FAL_KLING_ENDPOINT;

    const body: Record<string, unknown> = {
      prompt: assembled.prompt,
      duration: mapDuration(request.duration),
      aspect_ratio: request.aspectRatio || "16:9",
      negative_prompt: assembled.negativePrompt || undefined,
      cfg_scale: 0.5, // motion_intensity equivalent — start moderate per prompt library
    };

    // Image-to-video: first_frame control
    if (isImageToVideo && assembled.referenceImageUrl) {
      body.image_url = assembled.referenceImageUrl;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SUBMIT_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Key ${apiKey}`,
          "Content-Type": "application/json",
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
        `Kling/fal.ai API submission failed (${response.status}): ${errText.slice(0, 300)}`
      );
    }

    const data = (await response.json()) as FalVideoResponse & FalQueueResponse;

    // Synchronous response (video ready immediately)
    if (data.video?.url) {
      return {
        videoUrl: data.video.url,
        provider: "kling",
        durationSeconds: request.duration,
        costCents: this.estimateCost(request.duration),
        metadata: { requestId: data.request_id, model: "kling-3.0" },
      };
    }

    // Async — poll for completion
    const requestId = data.request_id;
    if (!requestId) {
      throw new Error("Kling/fal.ai did not return a request ID or video");
    }

    const pollStart = Date.now();
    while (Date.now() - pollStart < POLL_TIMEOUT_MS) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

      const status = await this.checkStatus(requestId);
      if (status.status === "completed" && status.videoUrl) {
        return {
          videoUrl: status.videoUrl,
          provider: "kling",
          durationSeconds: request.duration,
          costCents: this.estimateCost(request.duration),
          metadata: { requestId, model: "kling-3.0" },
        };
      }
      if (status.status === "failed") {
        throw new Error(`Kling generation failed: ${status.error || "unknown"}`);
      }
    }

    throw new Error("Kling generation timed out after 120 seconds");
  },

  async checkStatus(jobId: string) {
    const apiKey = getApiKey();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
      const response = await fetch(
        `https://fal.run/fal-ai/kling-video/requests/${jobId}/status`,
        {
          headers: { Authorization: `Key ${apiKey}` },
          signal: controller.signal,
        }
      );
      clearTimeout(timeout);

      if (!response.ok) {
        return { status: "failed" as const, error: `Poll failed (${response.status})` };
      }

      const data = (await response.json()) as FalQueueResponse & FalVideoResponse;

      switch (data.status) {
        case "COMPLETED": {
          // Fetch the actual result
          if (data.response_url) {
            const resultRes = await fetch(data.response_url, {
              headers: { Authorization: `Key ${apiKey}` },
            });
            if (resultRes.ok) {
              const result = (await resultRes.json()) as FalVideoResponse;
              return {
                status: "completed" as const,
                videoUrl: result.video?.url,
              };
            }
          }
          return {
            status: "completed" as const,
            videoUrl: data.video?.url,
          };
        }
        case "FAILED":
          return { status: "failed" as const, error: "Kling generation failed" };
        case "IN_PROGRESS":
          return { status: "processing" as const };
        case "IN_QUEUE":
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
 * Map requested duration to Kling-supported durations.
 * Kling supports up to 15s natively. Snap to closest supported value.
 */
function mapDuration(seconds: number): number {
  if (seconds <= 5) return 5;
  if (seconds <= 10) return 10;
  return 15; // max Kling duration
}
