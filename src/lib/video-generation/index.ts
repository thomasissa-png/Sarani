// ─── Video Generation Factory ────────────────────────────────────────────────
// Selects the appropriate provider and manages fallback chain: Veo -> Runway -> Kling.
// Validated provider strategy: docs/ia/video-prompt-library.md (Thomas decision 2026-03-27).

import type {
  VideoProvider,
  VideoProviderAdapter,
  VideoGenerationRequest,
  VideoGenerationResult,
} from "./types";
import { veoProvider } from "./providers/veo";
import { runwayProvider } from "./providers/runway";
import { klingProvider } from "./providers/kling";

export type { VideoProvider, VideoGenerationRequest, VideoGenerationResult };
export { buildVideoPrompt } from "./prompt-builder";

// ─── Provider Registry ──────────────────────────────────────────────────────

const PROVIDERS: Record<VideoProvider, VideoProviderAdapter> = {
  veo: veoProvider,
  runway: runwayProvider,
  kling: klingProvider,
};

/** Fallback order: Veo (quality) -> Runway (speed) -> Kling (volume/cost) */
const FALLBACK_CHAIN: VideoProvider[] = ["veo", "runway", "kling"];

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Get a specific provider adapter.
 */
export function getProvider(provider: VideoProvider): VideoProviderAdapter {
  return PROVIDERS[provider];
}

/**
 * Estimate cost for a single scene across a specific provider.
 */
export function estimateCost(
  provider: VideoProvider,
  durationSeconds: number
): number {
  return PROVIDERS[provider].estimateCost(durationSeconds);
}

/**
 * Estimate total cost for multiple scenes.
 */
export function estimateTotalCost(
  provider: VideoProvider,
  scenes: Array<{ duration: number }>
): number {
  return scenes.reduce(
    (total, scene) => total + PROVIDERS[provider].estimateCost(scene.duration),
    0
  );
}

/**
 * Generate a single video with fallback support.
 * Tries the requested provider first, then falls back through the chain.
 */
export async function generateVideoWithFallback(
  request: VideoGenerationRequest
): Promise<VideoGenerationResult & { fallbackUsed: boolean; originalProvider: VideoProvider }> {
  const startIndex = FALLBACK_CHAIN.indexOf(request.provider);
  const chain =
    startIndex >= 0
      ? FALLBACK_CHAIN.slice(startIndex)
      : [request.provider, ...FALLBACK_CHAIN];

  const errors: Array<{ provider: VideoProvider; error: string }> = [];

  for (const providerKey of chain) {
    try {
      const result = await PROVIDERS[providerKey].generate({
        ...request,
        provider: providerKey,
      });
      return {
        ...result,
        fallbackUsed: providerKey !== request.provider,
        originalProvider: request.provider,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown error";
      errors.push({ provider: providerKey, error: message });
      console.error(
        `[video-generation] Provider ${providerKey} failed: ${message}. Trying next...`
      );
    }
  }

  // All providers failed
  throw new Error(
    `All video providers failed. Errors: ${errors
      .map((e) => `${e.provider}: ${e.error}`)
      .join("; ")}`
  );
}

/**
 * Check if a provider's API key is configured (non-placeholder).
 */
export function isProviderConfigured(provider: VideoProvider): boolean {
  switch (provider) {
    case "veo": {
      const key = process.env.VEO_API_KEY;
      return !!key && key !== "..." && key !== "your-api-key-here";
    }
    case "runway": {
      const key = process.env.RUNWAY_API_KEY;
      return !!key && key !== "..." && key !== "your-api-key-here";
    }
    case "kling": {
      const key = process.env.FAL_KEY;
      return !!key && key !== "..." && key !== "your-api-key-here";
    }
    default:
      return false;
  }
}

/**
 * Get the best available provider (first configured in the fallback chain).
 */
export function getBestAvailableProvider(): VideoProvider | null {
  for (const provider of FALLBACK_CHAIN) {
    if (isProviderConfigured(provider)) return provider;
  }
  return null;
}
