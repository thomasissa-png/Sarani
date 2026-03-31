// ─── Video Prompt Builder ────────────────────────────────────────────────────
// Assembles provider-specific prompts from storyboard scene data.
// Based on docs/ia/video-prompt-library.md canonical format (Section 3).
//
// Provider assembly rules:
// - Veo 3.1: Full natural language, audio/dialogue inline, negative appended
// - Runway Gen-4: Motion-only (visuals from input image), no negatives, no audio
// - Kling 3.0: 5-layer structure, negative via separate parameter

import type { VideoProvider, SceneData, AssembledPrompt } from "./types";

// ─── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_NEGATIVE =
  "No text overlay, no watermark, no captions, no extra people, no jump cuts, no distorted hands, no floating objects";

const WORD_LIMITS: Record<VideoProvider, number> = {
  veo: 200,
  runway: 50,
  kling: 150,
};

// ─── Sanitization ───────────────────────────────────────────────────────────

/**
 * Sanitize input to prevent prompt injection.
 * Strips control tokens, system-level instructions, and excessive whitespace.
 */
function sanitize(input: string): string {
  return input
    .replace(/\[SYSTEM\].*?\[\/SYSTEM\]/gi, "")
    .replace(/\[INST\].*?\[\/INST\]/gi, "")
    .replace(/<\|.*?\|>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Truncate text to a word limit while preserving complete sentences.
 */
function truncateToWordLimit(text: string, limit: number): string {
  const words = text.split(/\s+/);
  if (words.length <= limit) return text;
  return words.slice(0, limit).join(" ");
}

// ─── Provider-Specific Assembly ─────────────────────────────────────────────

/**
 * Veo 3.1 assembly: All fields in natural language.
 * Audio inline. Negative appended as separate sentence.
 * See video-prompt-library.md Section 3 "Veo 3.1 assembly".
 */
function assembleVeoPrompt(scene: SceneData): AssembledPrompt {
  const parts: string[] = [];

  // Camera + Subject + Action + Environment
  if (scene.description) {
    parts.push(sanitize(scene.description));
  }
  if (scene.cameraDirection) {
    parts.push(`Camera: ${sanitize(scene.cameraDirection)}.`);
  }
  if (scene.mood) {
    parts.push(`${sanitize(scene.mood)} atmosphere.`);
  }

  // Style hint
  parts.push("Cinematic quality, photorealistic.");

  // Image-to-video bridge: reference image mode
  if (scene.referenceImageUrl) {
    parts.push(
      "Matching the visual style, color palette, and composition of the reference image."
    );
  }

  // Duration
  parts.push(`${scene.duration}s.`);

  const prompt = truncateToWordLimit(parts.join(" "), WORD_LIMITS.veo);

  return {
    prompt,
    negativePrompt: DEFAULT_NEGATIVE,
    referenceImageUrl: scene.referenceImageUrl,
    wordCount: prompt.split(/\s+/).length,
  };
}

/**
 * Runway Gen-4 assembly: Motion-focused only.
 * Visual details come from the input image. Audio and negatives stripped.
 * See video-prompt-library.md Section 3 "Runway Gen-4 assembly".
 */
function assembleRunwayPrompt(scene: SceneData): AssembledPrompt {
  const parts: string[] = [];

  // Camera movement
  if (scene.cameraDirection) {
    parts.push(`${sanitize(scene.cameraDirection)}.`);
  }

  // Motion description - extract action from description
  if (scene.description) {
    // For Runway, we focus on motion only since the image carries visuals
    if (scene.referenceImageUrl) {
      // With image: describe motion trajectory, not visuals
      parts.push(`The subject ${sanitize(scene.description)}.`);
    } else {
      // Without image: include more visual context
      parts.push(sanitize(scene.description));
    }
  }

  // Mood as energy descriptor
  if (scene.mood) {
    parts.push(`${sanitize(scene.mood)} energy.`);
  }

  // Duration
  parts.push(`${scene.duration}s.`);

  const prompt = truncateToWordLimit(parts.join(" "), WORD_LIMITS.runway);

  return {
    prompt,
    negativePrompt: null, // Runway does NOT support negative prompts
    referenceImageUrl: scene.referenceImageUrl,
    wordCount: prompt.split(/\s+/).length,
  };
}

/**
 * Kling 3.0 assembly: 5-layer structure.
 * Negative sent via dedicated API parameter, not inline.
 * See video-prompt-library.md Section 3 "Kling 3.0 assembly".
 */
function assembleKlingPrompt(scene: SceneData): AssembledPrompt {
  const layers: string[] = [];

  // [Scene] layer: environment + lighting
  if (scene.mood) {
    layers.push(`[Scene]: ${sanitize(scene.mood)} atmosphere.`);
  }

  // [Character] + [Action] layer
  if (scene.description) {
    layers.push(`[Action]: ${sanitize(scene.description)}.`);
  }

  // [Camera] layer
  if (scene.cameraDirection) {
    layers.push(`[Camera]: ${sanitize(scene.cameraDirection)}.`);
  }

  // [Style] layer
  layers.push("[Style]: Cinematic, photorealistic, film grain.");

  // Image-to-video bridge: first-frame control
  if (scene.referenceImageUrl) {
    layers.unshift(
      "Starting from this frame:"
    );
  }

  const prompt = truncateToWordLimit(layers.join(" "), WORD_LIMITS.kling);

  return {
    prompt,
    negativePrompt:
      "Smiling without reason, cartoonish, 3D render, smooth plastic skin, floating limbs, text overlay, watermark",
    referenceImageUrl: scene.referenceImageUrl,
    wordCount: prompt.split(/\s+/).length,
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Build a provider-specific prompt from scene data.
 * Applies the canonical template from video-prompt-library.md Section 3,
 * then assembles per-provider (Section 3 "Provider-Specific Assembly").
 */
export function buildVideoPrompt(
  scene: SceneData,
  provider: VideoProvider
): AssembledPrompt {
  switch (provider) {
    case "veo":
      return assembleVeoPrompt(scene);
    case "runway":
      return assembleRunwayPrompt(scene);
    case "kling":
      return assembleKlingPrompt(scene);
    default: {
      const _exhaustive: never = provider;
      throw new Error(`Unknown provider: ${_exhaustive}`);
    }
  }
}

/**
 * Get the word limit for a given provider.
 */
export function getWordLimit(provider: VideoProvider): number {
  return WORD_LIMITS[provider];
}
