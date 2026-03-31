// ─── Veo 3.1 Provider (Google Gemini API / Vertex AI) ────────────────────────
// Primary provider — client-facing quality.
// Uses the Google Gemini API with Veo 3.1 model for video generation.
// Env var: VEO_API_KEY
// Timeout: 60s for submission, polling for completion.
// See docs/ia/video-prompt-library.md Section 2.1 for prompting rules.

import type {
  VideoProviderAdapter,
  VideoGenerationRequest,
  VideoGenerationResult,
} from "../types";
import { buildVideoPrompt } from "../prompt-builder";

const VEO_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const VEO_MODEL = "veo-3.0-generate-preview"; // Veo 3.1 via Gemini API
const SUBMIT_TIMEOUT_MS = 30_000;
const POLL_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 5_000;

// Cost estimate: ~$0.50 per 5s clip (based on Vertex AI pricing)
const COST_PER_SECOND_CENTS = 10;

interface VeoGenerateResponse {
  name: string; // operation name for polling
  done?: boolean;
  response?: {
    generatedSamples?: Array<{
      video?: {
        uri: string;
      };
    }>;
  };
  error?: {
    message: string;
    code: number;
  };
}

function getApiKey(): string {
  const key = process.env.VEO_API_KEY;
  if (!key || key === "..." || key === "your-api-key-here") {
    throw new Error("VEO_API_KEY environment variable is not set or is a placeholder");
  }
  return key;
}

export const veoProvider: VideoProviderAdapter = {
  async generate(request: VideoGenerationRequest): Promise<VideoGenerationResult> {
    const apiKey = getApiKey();
    const assembled = buildVideoPrompt(
      {
        description: request.sceneDescription,
        referenceImageUrl: request.referenceImageUrl,
        duration: request.duration,
        aspectRatio: request.aspectRatio,
      },
      "veo"
    );

    const body: Record<string, unknown> = {
      instances: [
        {
          prompt: assembled.prompt,
        },
      ],
      parameters: {
        aspectRatio: request.aspectRatio || "16:9",
        durationSeconds: request.duration,
        negativePrompt: assembled.negativePrompt || undefined,
      },
    };

    // If reference image is provided, include it
    if (assembled.referenceImageUrl) {
      (body.instances as Array<Record<string, unknown>>)[0].image = {
        uri: assembled.referenceImageUrl,
      };
    }

    // Submit generation request
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SUBMIT_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(
        `${VEO_API_BASE}/models/${VEO_MODEL}:predictLongRunning?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        }
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(
        `Veo API submission failed (${response.status}): ${errText.slice(0, 300)}`
      );
    }

    const data = (await response.json()) as VeoGenerateResponse;

    if (data.error) {
      throw new Error(`Veo API error: ${data.error.message}`);
    }

    // If immediately done (unlikely but handle it)
    if (data.done && data.response?.generatedSamples?.[0]?.video?.uri) {
      return {
        videoUrl: data.response.generatedSamples[0].video.uri,
        provider: "veo",
        durationSeconds: request.duration,
        costCents: this.estimateCost(request.duration),
        metadata: { operationName: data.name, model: VEO_MODEL },
      };
    }

    // Poll for completion
    const operationName = data.name;
    if (!operationName) {
      throw new Error("Veo API did not return an operation name for polling");
    }

    const pollStart = Date.now();
    while (Date.now() - pollStart < POLL_TIMEOUT_MS) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

      const status = await this.checkStatus(operationName);
      if (status.status === "completed" && status.videoUrl) {
        return {
          videoUrl: status.videoUrl,
          provider: "veo",
          durationSeconds: request.duration,
          costCents: this.estimateCost(request.duration),
          metadata: { operationName, model: VEO_MODEL },
        };
      }
      if (status.status === "failed") {
        throw new Error(`Veo generation failed: ${status.error || "unknown"}`);
      }
    }

    throw new Error("Veo generation timed out after 60 seconds");
  },

  async checkStatus(jobId: string) {
    const apiKey = getApiKey();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
      const response = await fetch(
        `${VEO_API_BASE}/${jobId}?key=${apiKey}`,
        { signal: controller.signal }
      );
      clearTimeout(timeout);

      if (!response.ok) {
        return { status: "failed" as const, error: `Poll failed (${response.status})` };
      }

      const data = (await response.json()) as VeoGenerateResponse;

      if (data.error) {
        return { status: "failed" as const, error: data.error.message };
      }

      if (data.done) {
        const videoUri = data.response?.generatedSamples?.[0]?.video?.uri;
        if (videoUri) {
          return { status: "completed" as const, videoUrl: videoUri };
        }
        return { status: "failed" as const, error: "No video in response" };
      }

      return { status: "processing" as const };
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
