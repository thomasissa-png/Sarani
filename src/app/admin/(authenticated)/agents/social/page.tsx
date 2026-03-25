"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { Client } from "@/lib/db/schema";
import {
  SOCIAL_PLATFORMS,
  PLATFORM_LABELS,
  CONTENT_TYPE_LABELS,
  PLATFORM_CONTENT_TYPES,
  SOCIAL_LANGUAGES,
  SOCIAL_LANGUAGE_LABELS,
  type SocialPlatform,
  type ContentType,
  type SocialLanguage,
  type SocialResponse,
  type SocialPost,
} from "@/lib/validations/social";
import {
  ClientSelector,
  ClientContextPanel,
  FormField,
  StepIndicator,
  PreSubmitSummary,
  TextareaWithCount,
} from "@/components/admin/guided-form";

// ─── Types ──────────────────────────────────────────────────────────────────

type GenerateApiResponse = {
  social: SocialResponse;
  outputId: string;
  usage: { inputTokens: number; outputTokens: number };
};

type FormState = {
  clientId: string;
  platform: SocialPlatform;
  contentType: ContentType;
  topic: string;
  keyMessages: string;
  tone: string;
  language: SocialLanguage;
  variantCount: number;
};

const STEPS = ["Select Client", "Configure", "Review & Generate"];

// ─── Page Component ─────────────────────────────────────────────────────────

export default function SocialPage() {
  // Step state
  const [step, setStep] = useState(0);

  // Client data
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Form state
  const [form, setForm] = useState<FormState>({
    clientId: "",
    platform: "linkedin",
    contentType: "post",
    topic: "",
    keyMessages: "",
    tone: "",
    language: "EN",
    variantCount: 1,
  });

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<SocialResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Smart defaults when client is loaded ─────────────────────────────────

  const handleClientLoaded = useCallback((client: Client | null) => {
    setSelectedClient(client);
    if (client?.primaryLanguage) {
      const lang = client.primaryLanguage.toUpperCase();
      const validLangs: SocialLanguage[] = ["EN", "FR", "ES", "DE", "IT", "PT", "NL", "AR", "ZH", "JA"];
      if (validLangs.includes(lang as SocialLanguage)) {
        setForm((prev) => ({ ...prev, language: lang as SocialLanguage }));
      }
    }
  }, []);

  // ── Available content types for selected platform ──────────────────────

  const availableContentTypes = PLATFORM_CONTENT_TYPES[form.platform];

  // Reset content type when platform changes if current type is not available
  useEffect(() => {
    if (!availableContentTypes.includes(form.contentType)) {
      setForm((prev) => ({ ...prev, contentType: availableContentTypes[0] }));
    }
  }, [form.platform, form.contentType, availableContentTypes]);

  // ── Step validation ─────────────────────────────────────────────────────

  function canProceedStep0(): boolean {
    return !!form.clientId;
  }

  function canProceedStep1(): boolean {
    return form.topic.length >= 20;
  }

  // ── Handle generate ─────────────────────────────────────────────────────

  async function handleGenerate() {
    setError(null);
    setResult(null);
    setGenerating(true);

    try {
      const res = await fetch("/api/admin/agents/social/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: form.clientId,
          platform: form.platform,
          contentType: form.contentType,
          topic: form.topic,
          keyMessages: form.keyMessages || undefined,
          tone: form.tone || undefined,
          language: form.language,
          variantCount: form.variantCount,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Content generation failed");
      }

      const data: GenerateApiResponse = await res.json();
      setResult(data.social);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate content"
      );
    } finally {
      setGenerating(false);
    }
  }

  // ── Build summary items ────────────────────────────────────────────────

  function getSummaryItems() {
    return [
      { label: "Client", value: selectedClient?.name || "---" },
      { label: "Platform", value: PLATFORM_LABELS[form.platform] },
      { label: "Content Type", value: CONTENT_TYPE_LABELS[form.contentType] },
      { label: "Language", value: SOCIAL_LANGUAGE_LABELS[form.language] },
      { label: "Variants", value: String(form.variantCount) },
      {
        label: "Topic",
        value:
          form.topic.length > 80
            ? form.topic.slice(0, 80) + "..."
            : form.topic,
      },
      ...(form.tone ? [{ label: "Tone Override", value: form.tone }] : []),
    ];
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-black">Social IA</h1>
          <p className="text-neutral-500 text-sm mt-1">
            Generate social media content tailored to each platform and client brand
          </p>
        </div>
        <Link
          href="/admin/agents/social/history"
          className="px-4 py-2 bg-white border border-neutral-300 text-sm font-semibold rounded-lg hover:bg-neutral-100 transition-colors text-brand-black"
        >
          History
        </Link>
      </div>

      {/* Generation Form */}
      <div className="bg-white rounded-xl border border-neutral-300 p-6 space-y-5">
        <h2 className="text-lg font-semibold text-brand-black">
          New Content
        </h2>

        <StepIndicator steps={STEPS} currentStep={step} />

        {/* ── Step 0: Select Client ─────────────────────────────────────── */}
        {step === 0 && (
          <div className="space-y-4">
            <ClientSelector
              value={form.clientId}
              onChange={(clientId) =>
                setForm((prev) => ({ ...prev, clientId }))
              }
              required
              helperText="Select the client to use their brand tone, guidelines, and language preferences."
              onClientLoaded={handleClientLoaded}
            />

            <div className="flex justify-end pt-2">
              <button
                type="button"
                disabled={!canProceedStep0()}
                onClick={() => setStep(1)}
                className="px-6 py-2.5 bg-brand-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next: Configure
              </button>
            </div>
          </div>
        )}

        {/* ── Step 1: Configure ─────────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-5">
            {/* Platform + Content Type */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Platform"
                required
                helperText="Content will be optimized for this platform's format and character limits."
              >
                <select
                  value={form.platform}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      platform: e.target.value as SocialPlatform,
                    }))
                  }
                  className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                >
                  {SOCIAL_PLATFORMS.map((p) => (
                    <option key={p} value={p}>
                      {PLATFORM_LABELS[p]}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField
                label="Content Type"
                required
                helperText="Available types are filtered by platform."
              >
                <select
                  value={form.contentType}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      contentType: e.target.value as ContentType,
                    }))
                  }
                  className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                >
                  {availableContentTypes.map((ct) => (
                    <option key={ct} value={ct}>
                      {CONTENT_TYPE_LABELS[ct]}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            {/* Topic */}
            <FormField
              label="Topic"
              required
              helperText="Be specific about what the post should communicate. Include key facts, numbers, and context."
            >
              <TextareaWithCount
                value={form.topic}
                onChange={(val) =>
                  setForm((prev) => ({ ...prev, topic: val }))
                }
                placeholder="e.g. Announce TikTok partnership renewal — 400M+ campaign views milestone"
                minLength={20}
                rows={3}
              />
            </FormField>

            {/* Key Messages */}
            <FormField
              label="Key Messages"
              helperText="Specific messages, stats, or points that must appear in the content."
            >
              <TextareaWithCount
                value={form.keyMessages}
                onChange={(val) =>
                  setForm((prev) => ({ ...prev, keyMessages: val }))
                }
                placeholder="e.g. 400M+ views, partnership since 2023, exclusive creator network"
                rows={3}
              />
            </FormField>

            {/* Tone override */}
            <FormField
              label="Tone Override"
              helperText="Leave empty to use the client's brand tone. Override only if this post needs a different tone."
            >
              <input
                type="text"
                value={form.tone}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, tone: e.target.value }))
                }
                placeholder="e.g. playful and bold, serious and authoritative..."
                className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
              />
            </FormField>

            {/* Language + Variants */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Language"
                helperText="Auto-filled from client profile."
              >
                <select
                  value={form.language}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      language: e.target.value as SocialLanguage,
                    }))
                  }
                  className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                >
                  {SOCIAL_LANGUAGES.map((lang) => (
                    <option key={lang} value={lang}>
                      {SOCIAL_LANGUAGE_LABELS[lang]} ({lang})
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField
                label="Variants"
                helperText="Number of content alternatives to generate."
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
                  <option value={5}>5 variants</option>
                </select>
              </FormField>
            </div>

            {/* Error */}
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            {/* Navigation */}
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
                disabled={!canProceedStep1()}
                onClick={() => {
                  setError(null);
                  setStep(2);
                }}
                className="px-6 py-2.5 bg-brand-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next: Review
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Review & Generate ─────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-4">
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <PreSubmitSummary
              items={getSummaryItems()}
              onConfirm={handleGenerate}
              onBack={() => setStep(1)}
              loading={generating}
              buttonLabel="Generate Content"
            />
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <SocialOutput
          result={result}
          platform={form.platform}
          contentType={form.contentType}
        />
      )}
    </div>
  );
}

// ─── Social Output Component ────────────────────────────────────────────────

function SocialOutput({
  result,
  platform,
  contentType,
}: {
  result: SocialResponse;
  platform: SocialPlatform;
  contentType: ContentType;
}) {
  return (
    <div className="space-y-4">
      {/* Strategy & Tips */}
      <div className="bg-white rounded-xl border border-neutral-300 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-brand-black">
          Content Strategy
        </h2>
        <p className="text-sm text-neutral-700">{result.contentStrategy}</p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-xs font-semibold text-neutral-500 uppercase mb-1">
              Suggested Posting Time
            </h3>
            <p className="text-sm text-neutral-700">
              {result.suggestedPostingTime}
            </p>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-neutral-500 uppercase mb-1">
              Platform Tips
            </h3>
            <ul className="text-sm text-neutral-700 space-y-1">
              {result.platformTips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-neutral-400 shrink-0">--</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Post Variants */}
      {result.posts.map((post, index) => (
        <PostCard
          key={index}
          post={post}
          index={index}
          total={result.posts.length}
          platform={platform}
          contentType={contentType}
        />
      ))}
    </div>
  );
}

// ─── Post Card Component ────────────────────────────────────────────────────

function PostCard({
  post,
  index,
  total,
  platform,
  contentType,
}: {
  post: SocialPost;
  index: number;
  total: number;
  platform: SocialPlatform;
  contentType: ContentType;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const textParts = [post.content];
    if (post.hashtags.length > 0) {
      textParts.push("");
      textParts.push(post.hashtags.map((h) => `#${h}`).join(" "));
    }
    await navigator.clipboard.writeText(textParts.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-white rounded-xl border border-neutral-300 p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-brand-black">
          {total > 1 ? `Variant ${index + 1}` : "Generated Content"}
        </h2>
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <span className="bg-neutral-200 text-neutral-700 px-2 py-0.5 rounded font-medium">
            {PLATFORM_LABELS[platform]}
          </span>
          <span className="bg-neutral-200 text-neutral-700 px-2 py-0.5 rounded font-medium">
            {CONTENT_TYPE_LABELS[contentType]}
          </span>
          <span>{post.characterCount} chars</span>
        </div>
      </div>

      {/* Hook line */}
      {post.hookLine && (
        <div>
          <h3 className="text-xs font-semibold text-neutral-500 uppercase mb-1">
            Hook
          </h3>
          <p className="text-sm text-brand-black font-medium bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            {post.hookLine}
          </p>
        </div>
      )}

      {/* Main content */}
      <div>
        <h3 className="text-xs font-semibold text-neutral-500 uppercase mb-1">
          Content
        </h3>
        <div className="bg-neutral-50 rounded-lg border border-neutral-200 px-4 py-3">
          <p className="text-sm text-brand-black whitespace-pre-wrap leading-relaxed">
            {post.content}
          </p>
        </div>
      </div>

      {/* Carousel slides */}
      {post.slides && post.slides.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-neutral-500 uppercase mb-2">
            Slides ({post.slides.length})
          </h3>
          <div className="grid gap-2">
            {post.slides.map((slide) => (
              <div
                key={slide.slideNumber}
                className="bg-neutral-50 rounded-lg border border-neutral-200 px-4 py-3"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-neutral-500">
                    Slide {slide.slideNumber}
                  </span>
                  {slide.title && (
                    <span className="text-sm font-medium text-brand-black">
                      -- {slide.title}
                    </span>
                  )}
                </div>
                <p className="text-sm text-neutral-700">{slide.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hashtags */}
      {post.hashtags.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-neutral-500 uppercase mb-1">
            Hashtags
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {post.hashtags.map((tag, i) => (
              <span
                key={i}
                className="text-xs bg-blue-50 border border-blue-200 text-blue-800 px-2.5 py-1 rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      {post.cta && (
        <div>
          <h3 className="text-xs font-semibold text-neutral-500 uppercase mb-1">
            Call to Action
          </h3>
          <p className="text-sm text-neutral-700 italic">{post.cta}</p>
        </div>
      )}

      {/* Notes */}
      {post.notes && (
        <div>
          <h3 className="text-xs font-semibold text-neutral-500 uppercase mb-1">
            Strategic Notes
          </h3>
          <p className="text-sm text-neutral-600">{post.notes}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2 border-t border-neutral-200">
        <button
          onClick={handleCopy}
          className="px-4 py-2 text-sm font-semibold rounded-lg border border-neutral-300 text-brand-black hover:bg-neutral-100 transition-colors"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}
