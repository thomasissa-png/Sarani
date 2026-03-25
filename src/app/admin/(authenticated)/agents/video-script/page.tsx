"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import type { Client } from "@/lib/db/schema";
import {
  ClientSelector,
  ClientContextPanel,
  FormField,
  GuidanceMessage,
  RecommendedBadge,
  StepIndicator,
  PreSubmitSummary,
  TextareaWithCount,
} from "@/components/admin/guided-form";
import {
  VIDEO_FORMATS,
  VIDEO_FORMAT_LABELS,
  VIDEO_PLATFORMS,
  VIDEO_PLATFORM_LABELS,
  VIDEO_TONES,
  VIDEO_TONE_LABELS,
  VIDEO_LANGUAGES,
  VIDEO_LANGUAGE_LABELS,
  type VideoFormat,
  type VideoPlatform,
  type VideoTone,
  type VideoLanguage,
  type VideoScriptResponse,
  type VideoScene,
} from "@/lib/validations/video-script";

// ─── Types ──────────────────────────────────────────────────────────────────

type GenerateApiResponse = {
  script: VideoScriptResponse;
  outputId: string;
  usage: { inputTokens: number; outputTokens: number };
};

// Script format options from specs
const SCRIPT_FORMAT_OPTIONS = [
  "Voiceover",
  "On-camera presenter",
  "Text overlays only",
  "Dialogue",
  "Hybrid",
] as const;

// Caption style options from specs
const CAPTION_STYLE_OPTIONS = [
  "Auto-captions",
  "Styled text overlays",
  "None",
] as const;

type FormState = {
  clientId: string;
  // Required
  platform: VideoPlatform;
  videoFormat: VideoFormat;
  videoConcept: string;
  tone: VideoTone;
  // Recommended
  hookDirection: string;
  scriptFormat: string;
  cta: string;
  language: VideoLanguage;
  // Optional
  visualDirection: string;
  musicMood: string;
  captionStyle: string;
  seriesContext: string;
  existingReferenceScript: string;
  variantCount: number;
};

// ─── Constants ──────────────────────────────────────────────────────────────

const STEPS = ["Select Client", "Configure", "Review & Generate"];

const GUIDANCE_MESSAGE =
  "At Sarani, we produce 1,500+ videos per month. Every script must be production-ready: right duration, right format, strong hook in the first 3 seconds. Tell me the platform, the exact duration, what happens on screen, and what the video must make the viewer do or feel. I'll write a script the editor can follow without questions.";

// ─── Page Component ─────────────────────────────────────────────────────────

export default function VideoScriptPage() {
  // Step state
  const [step, setStep] = useState(0);

  // Client ref
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Advanced options toggle
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Form state
  const [form, setForm] = useState<FormState>({
    clientId: "",
    platform: "tiktok",
    videoFormat: "tiktok-30s",
    videoConcept: "",
    tone: "entertaining",
    hookDirection: "",
    scriptFormat: "",
    cta: "",
    language: "EN",
    visualDirection: "",
    musicMood: "",
    captionStyle: "",
    seriesContext: "",
    existingReferenceScript: "",
    variantCount: 1,
  });

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<VideoScriptResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Client loaded callback ──────────────────────────────────────────────

  const handleClientLoaded = useCallback(
    (client: Client | null) => {
      setSelectedClient(client);
      if (client?.primaryLanguage) {
        const lang = client.primaryLanguage as VideoLanguage;
        if (VIDEO_LANGUAGES.includes(lang)) {
          setForm((prev) => ({ ...prev, language: lang }));
        }
      }
    },
    []
  );

  // ── Step validation ─────────────────────────────────────────────────────

  function canAdvanceFromStep(s: number): boolean {
    if (s === 0) return !!form.clientId;
    if (s === 1)
      return (
        !!form.platform &&
        !!form.videoFormat &&
        form.videoConcept.trim().length >= 20
      );
    return true;
  }

  function getStepError(s: number): string | null {
    if (s === 0 && !form.clientId) return "Please select a client to continue.";
    if (s === 1) {
      if (!form.platform) return "Please select a platform.";
      if (!form.videoFormat) return "Please select a video duration.";
      if (form.videoConcept.trim().length < 20)
        return "Video concept must be at least 20 characters. Describe what happens on screen.";
    }
    return null;
  }

  // ── Handle generate ─────────────────────────────────────────────────────

  async function handleGenerate() {
    setError(null);
    setResult(null);
    setGenerating(true);

    try {
      const res = await fetch("/api/admin/agents/video-script/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: form.clientId,
          videoFormat: form.videoFormat,
          platform: form.platform,
          topic: form.videoConcept,
          tone: form.tone,
          language: form.language,
          variantCount: form.variantCount,
          // Extended fields
          hookDirection: form.hookDirection || undefined,
          scriptFormat: form.scriptFormat || undefined,
          cta: form.cta || undefined,
          visualDirection: form.visualDirection || undefined,
          musicMood: form.musicMood || undefined,
          captionStyle: form.captionStyle || undefined,
          seriesContext: form.seriesContext || undefined,
          existingReferenceScript: form.existingReferenceScript || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Script generation failed");
      }

      const data: GenerateApiResponse = await res.json();
      setResult(data.script);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate script"
      );
    } finally {
      setGenerating(false);
    }
  }

  // ── Build summary items ─────────────────────────────────────────────────

  function buildSummaryItems() {
    return [
      { label: "Client", value: selectedClient?.name || "---" },
      { label: "Platform", value: VIDEO_PLATFORM_LABELS[form.platform] },
      { label: "Duration", value: VIDEO_FORMAT_LABELS[form.videoFormat] },
      { label: "Tone", value: VIDEO_TONE_LABELS[form.tone] },
      {
        label: "Concept",
        value:
          form.videoConcept.length > 80
            ? form.videoConcept.slice(0, 80) + "..."
            : form.videoConcept,
      },
      {
        label: "Hook direction",
        value: form.hookDirection
          ? form.hookDirection.length > 60
            ? form.hookDirection.slice(0, 60) + "..."
            : form.hookDirection
          : "Not specified",
      },
      {
        label: "Script format",
        value: form.scriptFormat || "Not specified",
      },
      { label: "Language", value: VIDEO_LANGUAGE_LABELS[form.language] },
      { label: "Variants", value: `${form.variantCount}` },
    ];
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-black">
            Video Script IA
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            Generate video scripts, concepts, and UGC briefs for any platform
          </p>
        </div>
        <Link
          href="/admin/agents/video-script/history"
          className="px-4 py-2 bg-white border border-neutral-300 text-sm font-semibold rounded-lg hover:bg-neutral-100 transition-colors text-brand-black"
        >
          History
        </Link>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl border border-neutral-300 p-6 space-y-5">
        {/* Guidance message */}
        <GuidanceMessage text={GUIDANCE_MESSAGE} />

        <StepIndicator steps={STEPS} currentStep={step} />

        {/* ── Step 0: Select Client ──────────────────────────────────── */}
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-brand-black">
              Select Client
            </h2>
            <ClientSelector
              value={form.clientId}
              onChange={(id) => setForm((prev) => ({ ...prev, clientId: id }))}
              required
              helperText="Loads brand voice, tone, and visual identity constraints. A script for TikTok's own channel and a script for a GEODIS product video have different register and energy."
              onClientLoaded={handleClientLoaded}
            />
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  if (canAdvanceFromStep(0)) {
                    setError(null);
                    setStep(1);
                  } else {
                    setError(getStepError(0));
                  }
                }}
                className="px-6 py-2.5 bg-brand-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors"
              >
                Next: Configure
              </button>
            </div>
          </div>
        )}

        {/* ── Step 1: Configure ──────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-brand-black">
              Configure Script
            </h2>

            <ClientContextPanel client={selectedClient} />

            {/* ── Required Fields ── */}

            {/* Platform + Duration */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Platform"
                required
                helperText="Platform defines format rules, caption behavior, safe zones, and viewer attention patterns."
              >
                <select
                  value={form.platform}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      platform: e.target.value as VideoPlatform,
                    }))
                  }
                  className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                >
                  {VIDEO_PLATFORMS.map((p) => (
                    <option key={p} value={p}>
                      {VIDEO_PLATFORM_LABELS[p]}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField
                label="Video Duration"
                required
                helperText="Duration is the hard constraint around which everything else is built."
              >
                <select
                  value={form.videoFormat}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      videoFormat: e.target.value as VideoFormat,
                    }))
                  }
                  className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                >
                  {VIDEO_FORMATS.map((f) => (
                    <option key={f} value={f}>
                      {VIDEO_FORMAT_LABELS[f]}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            {/* Tone */}
            <FormField
              label="Tone"
              required
              helperText="Sets the overall energy and style of the script. A promotional script and an educational one have different rhythm."
            >
              <select
                value={form.tone}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    tone: e.target.value as VideoTone,
                  }))
                }
                className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
              >
                {VIDEO_TONES.map((t) => (
                  <option key={t} value={t}>
                    {VIDEO_TONE_LABELS[t]}
                  </option>
                ))}
              </select>
            </FormField>

            {/* Video Concept */}
            <FormField
              label="Video Concept"
              required
              helperText="What is this video about? What happens visually and verbally? Without the concept, the agent writes a script without a story."
            >
              <TextareaWithCount
                value={form.videoConcept}
                onChange={(val) =>
                  setForm((prev) => ({ ...prev, videoConcept: val }))
                }
                placeholder="TikTok creator shows how to use TikTok's creative toolkit to produce a brand campaign in 24 hours. POV: content creator at their desk. Fast cuts. Text overlays on each feature."
                minLength={20}
                rows={5}
              />
            </FormField>

            {/* ── Recommended Fields ── */}
            <div className="border-t border-neutral-200 pt-4 space-y-5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Recommended
                </span>
                <RecommendedBadge />
              </div>

              {/* Hook direction */}
              <FormField
                label="Hook Direction"
                helperText="What should the first 3 seconds look like? The first 3 seconds either stop the scroll or lose the viewer forever."
              >
                <TextareaWithCount
                  value={form.hookDirection}
                  onChange={(val) =>
                    setForm((prev) => ({ ...prev, hookDirection: val }))
                  }
                  placeholder="Start with a problem: 'Most brands spend 6 weeks on a campaign that should take 6 hours.'"
                  rows={2}
                />
              </FormField>

              {/* Script format + CTA */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="Script Format"
                  helperText="Determines how the script is written. A voiceover script and a text-overlay-only script have different rhythm."
                >
                  <select
                    value={form.scriptFormat}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        scriptFormat: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                  >
                    <option value="">Not specified</option>
                    {SCRIPT_FORMAT_OPTIONS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField
                  label="Language"
                  helperText={
                    selectedClient?.primaryLanguage
                      ? `Auto-filled from ${selectedClient.name}'s primary language.`
                      : "Script language."
                  }
                >
                  <select
                    value={form.language}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        language: e.target.value as VideoLanguage,
                      }))
                    }
                    className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                  >
                    {VIDEO_LANGUAGES.map((lang) => (
                      <option key={lang} value={lang}>
                        {VIDEO_LANGUAGE_LABELS[lang]} ({lang})
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>

              {/* CTA */}
              <FormField
                label="Call to Action"
                helperText="Every video must end with one action. Without a CTA, the video closes as entertainment, not communication."
              >
                <input
                  type="text"
                  value={form.cta}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, cta: e.target.value }))
                  }
                  placeholder="Follow for more — link in bio for your free consultation"
                  className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                />
              </FormField>
            </div>

            {/* ── Optional Fields (collapsible) ── */}
            <div className="border-t border-neutral-200 pt-4">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-brand-black transition-colors"
              >
                <span
                  className={`transition-transform ${showAdvanced ? "rotate-90" : ""}`}
                >
                  &#9654;
                </span>
                Advanced options
              </button>

              {showAdvanced && (
                <div className="mt-4 space-y-5">
                  {/* Visual direction */}
                  <FormField
                    label="Visual Direction"
                    helperText="Shot list suggestions, visual style references, transitions to use or avoid."
                  >
                    <TextareaWithCount
                      value={form.visualDirection}
                      onChange={(val) =>
                        setForm((prev) => ({
                          ...prev,
                          visualDirection: val,
                        }))
                      }
                      placeholder="Fast jump cuts, warm color grading, text appears with bounce animation"
                      rows={3}
                    />
                  </FormField>

                  {/* Music mood */}
                  <FormField
                    label="Music Mood"
                    helperText="Music tempo and energy affects script pacing."
                  >
                    <input
                      type="text"
                      value={form.musicMood}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          musicMood: e.target.value,
                        }))
                      }
                      placeholder="Upbeat lo-fi, 120bpm, energetic but not aggressive"
                      className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                    />
                  </FormField>

                  {/* Caption style */}
                  <FormField
                    label="Caption Style"
                    helperText="Affects how the copy elements of the script are formatted and timed."
                  >
                    <select
                      value={form.captionStyle}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          captionStyle: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                    >
                      <option value="">Not specified</option>
                      {CAPTION_STYLE_OPTIONS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  {/* Series context */}
                  <FormField
                    label="Series Context"
                    helperText="If this is episode N in a series, the script should reference continuity."
                  >
                    <TextareaWithCount
                      value={form.seriesContext}
                      onChange={(val) =>
                        setForm((prev) => ({
                          ...prev,
                          seriesContext: val,
                        }))
                      }
                      placeholder="This is episode 3 of the 'Behind the Brand' series. Last episode covered the design process."
                      rows={2}
                    />
                  </FormField>

                  {/* Existing reference script */}
                  <FormField
                    label="Reference Script"
                    helperText="A script from a previous video in the same series or style. Used to match established cadence."
                  >
                    <TextareaWithCount
                      value={form.existingReferenceScript}
                      onChange={(val) =>
                        setForm((prev) => ({
                          ...prev,
                          existingReferenceScript: val,
                        }))
                      }
                      placeholder="Paste a previous script to match the style..."
                      rows={4}
                    />
                  </FormField>

                  {/* Variants */}
                  <FormField
                    label="Variants"
                    helperText="Generate alternative script versions."
                  >
                    <select
                      value={form.variantCount}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          variantCount: Number(e.target.value),
                        }))
                      }
                      className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                    >
                      <option value={1}>1 variant</option>
                      <option value={2}>2 variants</option>
                      <option value={3}>3 variants</option>
                    </select>
                  </FormField>
                </div>
              )}
            </div>

            {/* Step navigation */}
            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(0)}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-neutral-300 text-neutral-600 hover:bg-neutral-100 transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => {
                  if (canAdvanceFromStep(1)) {
                    setError(null);
                    setStep(2);
                  } else {
                    setError(getStepError(1));
                  }
                }}
                className="px-6 py-2.5 bg-brand-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors"
              >
                Next: Review
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Review & Generate ──────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-brand-black">
              Review & Generate
            </h2>
            <PreSubmitSummary
              items={buildSummaryItems()}
              onConfirm={handleGenerate}
              onBack={() => setStep(1)}
              loading={generating}
              buttonLabel="Generate Script"
            />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {error}
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <VideoScriptOutput
          result={result}
          videoFormat={form.videoFormat}
          platform={form.platform}
        />
      )}
    </div>
  );
}

// ─── Video Script Output Component ──────────────────────────────────────────

function VideoScriptOutput({
  result,
  videoFormat,
  platform,
}: {
  result: VideoScriptResponse;
  videoFormat: VideoFormat;
  platform: VideoPlatform;
}) {
  const [activeTab, setActiveTab] = useState(0);

  // Combine primary + variants into a single list for tabs
  const allVariants = [
    {
      variantLabel: "Primary",
      concept: result.concept,
      hook: result.hook,
      scenes: result.scenes,
      callToAction: result.callToAction,
      totalDuration: result.totalDuration,
      notes: result.notes,
    },
    ...result.variants,
  ];

  const current = allVariants[activeTab];

  return (
    <div className="space-y-4">
      {/* Variant Tabs */}
      {allVariants.length > 1 && (
        <div className="flex gap-2">
          {allVariants.map((v, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveTab(i)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === i
                  ? "bg-brand-black text-white"
                  : "bg-white border border-neutral-300 text-neutral-600 hover:bg-neutral-50"
              }`}
            >
              {v.variantLabel}
            </button>
          ))}
        </div>
      )}

      {/* Concept Card */}
      <div className="bg-white rounded-xl border border-neutral-300 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-brand-black">Concept</h2>
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <span className="bg-neutral-200 text-neutral-700 px-2 py-0.5 rounded font-medium">
              {VIDEO_FORMAT_LABELS[videoFormat]}
            </span>
            <span className="bg-neutral-200 text-neutral-700 px-2 py-0.5 rounded font-medium">
              {VIDEO_PLATFORM_LABELS[platform]}
            </span>
            <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-medium">
              {current.totalDuration}
            </span>
          </div>
        </div>
        <p className="text-sm text-neutral-700">{current.concept}</p>

        {/* Hook */}
        <div>
          <h3 className="text-xs font-semibold text-neutral-500 uppercase mb-1">
            Hook (first 3 seconds)
          </h3>
          <p className="text-sm text-brand-black font-medium bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            {current.hook}
          </p>
        </div>
      </div>

      {/* Scene Timeline */}
      <div className="bg-white rounded-xl border border-neutral-300 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-brand-black">
          Scene Timeline
        </h2>
        <div className="relative space-y-0">
          {current.scenes.map((scene, i) => (
            <SceneCard
              key={i}
              scene={scene}
              isLast={i === current.scenes.length - 1}
            />
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-white rounded-xl border border-neutral-300 p-6">
        <h3 className="text-xs font-semibold text-neutral-500 uppercase mb-1">
          Call to Action
        </h3>
        <p className="text-sm text-brand-black font-medium">
          {current.callToAction}
        </p>
      </div>

      {/* Hashtags + Music */}
      <div className="grid grid-cols-2 gap-4">
        {/* Hashtags */}
        <div className="bg-white rounded-xl border border-neutral-300 p-6">
          <h3 className="text-xs font-semibold text-neutral-500 uppercase mb-2">
            Hashtags
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {result.hashtags.map((tag, i) => (
              <span
                key={i}
                className="text-xs bg-blue-50 border border-blue-200 text-blue-800 px-2.5 py-1 rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>

        {/* Music Suggestion */}
        <div className="bg-white rounded-xl border border-neutral-300 p-6">
          <h3 className="text-xs font-semibold text-neutral-500 uppercase mb-2">
            Music Suggestion
          </h3>
          <p className="text-sm text-neutral-700">{result.musicSuggestion}</p>
        </div>
      </div>

      {/* Notes */}
      {current.notes && (
        <div className="bg-white rounded-xl border border-neutral-300 p-6">
          <h3 className="text-xs font-semibold text-neutral-500 uppercase mb-1">
            Production Notes
          </h3>
          <p className="text-sm text-neutral-600">{current.notes}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <CopyScriptButton variant={current} hashtags={result.hashtags} />
        <DownloadScriptButton
          variant={current}
          hashtags={result.hashtags}
          musicSuggestion={result.musicSuggestion}
          videoFormat={videoFormat}
          platform={platform}
        />
      </div>
    </div>
  );
}

// ─── Scene Card Component ───────────────────────────────────────────────────

function SceneCard({
  scene,
  isLast,
}: {
  scene: VideoScene;
  isLast: boolean;
}) {
  return (
    <div className="flex gap-4">
      {/* Timeline line + dot */}
      <div className="flex flex-col items-center">
        <div className="w-3 h-3 rounded-full bg-brand-cerulean border-2 border-white ring-2 ring-brand-cerulean shrink-0 mt-1" />
        {!isLast && <div className="w-0.5 flex-1 bg-neutral-200 my-1" />}
      </div>

      {/* Scene content */}
      <div className="pb-5 flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xs font-semibold text-brand-black">
            Scene {scene.sceneNumber}
          </span>
          <span className="text-xs bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded font-mono">
            {scene.duration}
          </span>
        </div>

        <p className="text-sm text-neutral-700 mb-1">{scene.action}</p>

        {scene.dialogue && (
          <p className="text-sm text-brand-black font-medium italic mb-1">
            &ldquo;{scene.dialogue}&rdquo;
          </p>
        )}

        <p className="text-xs text-neutral-500 italic mb-0.5">
          {scene.visualDirection}
        </p>

        <p className="text-xs text-neutral-400">{scene.audio}</p>
      </div>
    </div>
  );
}

// ─── Copy Script Button ─────────────────────────────────────────────────────

type VariantLike = {
  concept: string;
  hook: string;
  scenes: VideoScene[];
  callToAction: string;
  totalDuration: string;
  notes?: string;
};

function CopyScriptButton({
  variant,
  hashtags,
}: {
  variant: VariantLike;
  hashtags: string[];
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const lines: string[] = [];
    lines.push(`CONCEPT: ${variant.concept}`);
    lines.push(`DURATION: ${variant.totalDuration}`);
    lines.push("");
    lines.push(`HOOK: ${variant.hook}`);
    lines.push("");

    variant.scenes.forEach((scene) => {
      lines.push(`--- SCENE ${scene.sceneNumber} [${scene.duration}] ---`);
      lines.push(`Action: ${scene.action}`);
      if (scene.dialogue) {
        lines.push(`Dialogue: "${scene.dialogue}"`);
      }
      lines.push(`Visual: ${scene.visualDirection}`);
      lines.push(`Audio: ${scene.audio}`);
      lines.push("");
    });

    lines.push(`CTA: ${variant.callToAction}`);

    if (hashtags.length > 0) {
      lines.push("");
      lines.push(hashtags.map((h) => `#${h}`).join(" "));
    }

    await navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="px-4 py-2 text-sm font-semibold rounded-lg border border-neutral-300 text-brand-black hover:bg-neutral-100 transition-colors"
    >
      {copied ? "Copied!" : "Copy Script"}
    </button>
  );
}

// ─── Download Script Button ─────────────────────────────────────────────────

function DownloadScriptButton({
  variant,
  hashtags,
  musicSuggestion,
  videoFormat,
  platform,
}: {
  variant: VariantLike;
  hashtags: string[];
  musicSuggestion: string;
  videoFormat: VideoFormat;
  platform: VideoPlatform;
}) {
  function handleDownload() {
    const lines: string[] = [];
    lines.push(`# Video Script`);
    lines.push("");
    lines.push(
      `**Format:** ${VIDEO_FORMAT_LABELS[videoFormat]} | **Platform:** ${VIDEO_PLATFORM_LABELS[platform]} | **Duration:** ${variant.totalDuration}`
    );
    lines.push("");
    lines.push(`## Concept`);
    lines.push(variant.concept);
    lines.push("");
    lines.push(`## Hook`);
    lines.push(`> ${variant.hook}`);
    lines.push("");
    lines.push(`## Scenes`);
    lines.push("");

    variant.scenes.forEach((scene) => {
      lines.push(
        `### Scene ${scene.sceneNumber} — ${scene.duration}`
      );
      lines.push(`**Action:** ${scene.action}`);
      if (scene.dialogue) {
        lines.push(`**Dialogue:** _"${scene.dialogue}"_`);
      }
      lines.push(`**Visual:** _${scene.visualDirection}_`);
      lines.push(`**Audio:** ${scene.audio}`);
      lines.push("");
    });

    lines.push(`## Call to Action`);
    lines.push(variant.callToAction);
    lines.push("");

    if (hashtags.length > 0) {
      lines.push(`## Hashtags`);
      lines.push(hashtags.map((h) => `#${h}`).join(" "));
      lines.push("");
    }

    lines.push(`## Music Suggestion`);
    lines.push(musicSuggestion);
    lines.push("");

    if (variant.notes) {
      lines.push(`## Production Notes`);
      lines.push(variant.notes);
      lines.push("");
    }

    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `video-script-${videoFormat}-${platform}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      className="px-4 py-2 text-sm font-semibold rounded-lg border border-neutral-300 text-brand-black hover:bg-neutral-100 transition-colors"
    >
      Download .md
    </button>
  );
}
