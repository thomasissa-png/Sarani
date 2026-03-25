"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { Client } from "@/lib/db/schema";
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
  type VideoVariant,
} from "@/lib/validations/video-script";

// ─── Types ──────────────────────────────────────────────────────────────────

type GenerateApiResponse = {
  script: VideoScriptResponse;
  outputId: string;
  usage: { inputTokens: number; outputTokens: number };
};

type FormState = {
  clientId: string;
  videoFormat: VideoFormat;
  platform: VideoPlatform;
  topic: string;
  targetAudience: string;
  tone: VideoTone;
  keyMessages: string;
  language: VideoLanguage;
  variantCount: number;
};

// ─── Page Component ─────────────────────────────────────────────────────────

export default function VideoScriptPage() {
  // Clients data
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);

  // Form state
  const [form, setForm] = useState<FormState>({
    clientId: "",
    videoFormat: "tiktok-30s",
    platform: "tiktok",
    topic: "",
    targetAudience: "",
    tone: "entertaining",
    keyMessages: "",
    language: "EN",
    variantCount: 1,
  });

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<VideoScriptResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch clients ───────────────────────────────────────────────────────

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/clients?status=active");
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch (err) {
      console.error("Failed to fetch clients:", err);
    } finally {
      setLoadingClients(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // ── Handle generate ─────────────────────────────────────────────────────

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!form.clientId) {
      setError("Please select a client.");
      return;
    }

    if (!form.topic.trim()) {
      setError("Please enter a topic.");
      return;
    }

    setGenerating(true);

    try {
      const res = await fetch("/api/admin/agents/video-script/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: form.clientId,
          videoFormat: form.videoFormat,
          platform: form.platform,
          topic: form.topic,
          targetAudience: form.targetAudience || undefined,
          tone: form.tone,
          keyMessages: form.keyMessages || undefined,
          language: form.language,
          variantCount: form.variantCount,
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

      {/* Generation Form */}
      <form
        onSubmit={handleGenerate}
        className="bg-white rounded-xl border border-neutral-300 p-6 space-y-5"
      >
        <h2 className="text-lg font-semibold text-brand-black">New Script</h2>

        {/* Client select (required) */}
        <div>
          <label
            htmlFor="client"
            className="block text-sm font-medium text-neutral-700 mb-1.5"
          >
            Client <span className="text-red-500">*</span>
          </label>
          {loadingClients ? (
            <div className="text-sm text-neutral-400">Loading clients...</div>
          ) : (
            <select
              id="client"
              value={form.clientId}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, clientId: e.target.value }))
              }
              className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
            >
              <option value="">Select a client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.industry})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Video Format + Platform */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="videoFormat"
              className="block text-sm font-medium text-neutral-700 mb-1.5"
            >
              Video Format
            </label>
            <select
              id="videoFormat"
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
          </div>
          <div>
            <label
              htmlFor="platform"
              className="block text-sm font-medium text-neutral-700 mb-1.5"
            >
              Platform
            </label>
            <select
              id="platform"
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
          </div>
        </div>

        {/* Language + Variant Count */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="language"
              className="block text-sm font-medium text-neutral-700 mb-1.5"
            >
              Language
            </label>
            <select
              id="language"
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
          </div>
          <div>
            <label
              htmlFor="variantCount"
              className="block text-sm font-medium text-neutral-700 mb-1.5"
            >
              Variants
            </label>
            <select
              id="variantCount"
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
          </div>
        </div>

        {/* Tone */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Tone
          </label>
          <div className="flex gap-3">
            {VIDEO_TONES.map((t) => (
              <label
                key={t}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm cursor-pointer transition-colors ${
                  form.tone === t
                    ? "border-brand-cerulean bg-blue-50 text-brand-black font-medium"
                    : "border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                <input
                  type="radio"
                  name="tone"
                  value={t}
                  checked={form.tone === t}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      tone: e.target.value as VideoTone,
                    }))
                  }
                  className="sr-only"
                />
                {VIDEO_TONE_LABELS[t]}
              </label>
            ))}
          </div>
        </div>

        {/* Topic */}
        <div>
          <label
            htmlFor="topic"
            className="block text-sm font-medium text-neutral-700 mb-1.5"
          >
            Topic / Brief <span className="text-red-500">*</span>
          </label>
          <textarea
            id="topic"
            value={form.topic}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, topic: e.target.value }))
            }
            placeholder="Describe the video concept, product, or message..."
            rows={3}
            className="w-full px-4 py-3 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent resize-y"
          />
        </div>

        {/* Target Audience */}
        <div>
          <label
            htmlFor="targetAudience"
            className="block text-sm font-medium text-neutral-700 mb-1.5"
          >
            Target Audience{" "}
            <span className="text-neutral-400 font-normal">(optional)</span>
          </label>
          <input
            id="targetAudience"
            type="text"
            value={form.targetAudience}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                targetAudience: e.target.value,
              }))
            }
            placeholder="e.g. Gen Z women 18-24, B2B decision makers, fitness enthusiasts..."
            className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
          />
        </div>

        {/* Key Messages */}
        <div>
          <label
            htmlFor="keyMessages"
            className="block text-sm font-medium text-neutral-700 mb-1.5"
          >
            Key Messages{" "}
            <span className="text-neutral-400 font-normal">(optional)</span>
          </label>
          <textarea
            id="keyMessages"
            value={form.keyMessages}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, keyMessages: e.target.value }))
            }
            placeholder="Specific talking points, features, stats, or CTAs to include..."
            rows={3}
            className="w-full px-4 py-3 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent resize-y"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={generating}
            className="px-6 py-2.5 bg-brand-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? "Generating..." : "Generate Script"}
          </button>
        </div>
      </form>

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
