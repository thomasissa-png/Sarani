// ─── Video Generation Provider Abstraction Layer ────────────────────────────
// Types shared across all video generation providers (Veo 3.1, Runway Gen-4, Kling 3.0).

export type VideoProvider = "veo" | "runway" | "kling";

export interface VideoGenerationRequest {
  /** Full scene description to convert into a provider-specific prompt */
  sceneDescription: string;
  /** Target video duration in seconds */
  duration: number;
  /** Optional reference/first-frame image URL for image-to-video generation */
  referenceImageUrl?: string;
  /** Output aspect ratio */
  aspectRatio?: "16:9" | "9:16" | "1:1";
  /** Which provider to use */
  provider: VideoProvider;
}

export interface VideoGenerationResult {
  /** URL of the generated video */
  videoUrl: string;
  /** Provider that generated the video */
  provider: VideoProvider;
  /** Actual duration of the generated video */
  durationSeconds: number;
  /** Cost of this generation in cents (USD) */
  costCents: number;
  /** Provider-specific metadata (job ID, model version, etc.) */
  metadata?: Record<string, unknown>;
}

export interface VideoProviderAdapter {
  /** Submit a video generation request. Returns result with video URL. */
  generate(request: VideoGenerationRequest): Promise<VideoGenerationResult>;
  /** Check the status of an async generation job */
  checkStatus(jobId: string): Promise<{
    status: "pending" | "processing" | "completed" | "failed";
    videoUrl?: string;
    error?: string;
  }>;
  /** Estimate cost in cents for a given duration */
  estimateCost(durationSeconds: number): number;
}

/** Structured scene data from the storyboard, before prompt assembly */
export interface SceneData {
  /** Raw scene description */
  description: string;
  /** Camera movement/direction instructions */
  cameraDirection?: string;
  /** Mood/atmosphere keywords */
  mood?: string;
  /** Reference image URL from storyboard (Flux.1 Pro generated) */
  referenceImageUrl?: string;
  /** Target duration in seconds */
  duration: number;
  /** Aspect ratio */
  aspectRatio?: "16:9" | "9:16" | "1:1";
}

/** Provider-specific prompt assembly output */
export interface AssembledPrompt {
  /** The text prompt to send to the provider */
  prompt: string;
  /** Negative prompt (Veo/Kling only, null for Runway) */
  negativePrompt: string | null;
  /** Reference image URL to upload (if image-to-video) */
  referenceImageUrl?: string;
  /** Word count of the prompt */
  wordCount: number;
}
