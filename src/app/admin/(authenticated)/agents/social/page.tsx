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

type PostFormat = "long" | "short" | "carousel";

const POST_FORMAT_OPTIONS: { value: PostFormat; label: string; description: string }[] = [
  { value: "long", label: "Long text", description: "1000-1500 chars" },
  { value: "short", label: "Short text", description: "Under 500 chars" },
  { value: "carousel", label: "Carousel script", description: "7-10 slides" },
];

type ToneEmphasis = "evidence-first" | "inspiring" | "behind-the-scenes" | "contrarian" | "educational";

const TONE_EMPHASIS_OPTIONS: { value: ToneEmphasis; label: string }[] = [
  { value: "evidence-first", label: "Evidence-first (default)" },
  { value: "inspiring", label: "Inspiring" },
  { value: "behind-the-scenes", label: "Behind-the-scenes" },
  { value: "contrarian", label: "Contrarian" },
  { value: "educational", label: "Educational" },
];

type FormState = {
  // Required
  topicOrAngle: string;
  postFormat: PostFormat;
  // Recommended
  proofPoints: string;
  clientReference: string;
  toneEmphasis: ToneEmphasis;
  scheduledDate: string;
  // Optional
  hookDirection: string;
  visualDescription: string;
  hashtagPreferences: string;
  ctaDirection: string;
  // Keep for API compatibility
  platform: SocialPlatform;
  contentType: ContentType;
  language: SocialLanguage;
  variantCount: number;
};

const STEPS = ["Content Brief", "Configure", "Review & Generate"];

// ─── Shared UI helpers ──────────────────────────────────────────────────────

function RecommendedBadge() {
  return (
    <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide bg-orange-100 text-orange-700 border border-orange-200 px-1.5 py-0.5 rounded">
      Recommended
    </span>
  );
}

function GuidanceMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800 leading-relaxed">
      {children}
    </div>
  );
}

// ─── Page Component ─────────────────────────────────────────────────────────

export default function SocialPage() {
  // Step state
  const [step, setStep] = useState(0);

  // Client data (for optional client reference)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Advanced options toggle
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Form state
  const [form, setForm] = useState<FormState>({
    // Required
    topicOrAngle: "",
    postFormat: "long",
    // Recommended
    proofPoints: "",
    clientReference: "",
    toneEmphasis: "evidence-first",
    scheduledDate: "",
    // Optional
    hookDirection: "",
    visualDescription: "",
    hashtagPreferences: "",
    ctaDirection: "",
    // API compatibility
    platform: "linkedin",
    contentType: "post",
    language: "EN",
    variantCount: 1,
  });

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<SocialResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Map post format to content type ─────────────────────────────────────

  useEffect(() => {
    if (form.postFormat === "carousel") {
      setForm((prev) => ({ ...prev, contentType: "carousel" }));
    } else {
      setForm((prev) => ({ ...prev, contentType: "post" }));
    }
  }, [form.postFormat]);

  // ── Available content types for selected platform ──────────────────────

  const availableContentTypes = PLATFORM_CONTENT_TYPES[form.platform];

  useEffect(() => {
    if (!availableContentTypes.includes(form.contentType)) {
      setForm((prev) => ({ ...prev, contentType: availableContentTypes[0] }));
    }
  }, [form.platform, form.contentType, availableContentTypes]);

  // ── Smart defaults when client is loaded (for reference) ──────────────

  const handleClientLoaded = useCallback((client: Client | null) => {
    setSelectedClient(client);
  }, []);

  // ── Step validation ─────────────────────────────────────────────────────

  function canProceedStep0(): boolean {
    return form.topicOrAngle.length >= 20;
  }

  function canProceedStep1(): boolean {
    return true; // All step 1 fields are recommended/optional
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
          clientId: form.clientReference || undefined,
          platform: form.platform,
          contentType: form.contentType,
          topic: form.topicOrAngle,
          keyMessages: form.proofPoints || undefined,
          tone: form.toneEmphasis !== "evidence-first" ? form.toneEmphasis : undefined,
          language: form.language,
          variantCount: form.variantCount,
          // Additional context for the API
          postFormat: form.postFormat,
          hookDirection: form.hookDirection || undefined,
          visualDescription: form.visualDescription || undefined,
          hashtagPreferences: form.hashtagPreferences || undefined,
          ctaDirection: form.ctaDirection || undefined,
          scheduledDate: form.scheduledDate || undefined,
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
      { label: "Platform", value: PLATFORM_LABELS[form.platform] + " (Sarani brand)" },
      {
        label: "Format",
        value: POST_FORMAT_OPTIONS.find((p) => p.value === form.postFormat)?.label || form.postFormat,
      },
      { label: "Tone", value: TONE_EMPHASIS_OPTIONS.find((t) => t.value === form.toneEmphasis)?.label || form.toneEmphasis },
      { label: "Language", value: SOCIAL_LANGUAGE_LABELS[form.language] },
      { label: "Variants", value: String(form.variantCount) },
      {
        label: "Topic",
        value:
          form.topicOrAngle.length > 80
            ? form.topicOrAngle.slice(0, 80) + "..."
            : form.topicOrAngle,
      },
      ...(form.proofPoints ? [{ label: "Proof Points", value: form.proofPoints.length > 60 ? form.proofPoints.slice(0, 60) + "..." : form.proofPoints }] : []),
      ...(form.scheduledDate ? [{ label: "Scheduled", value: form.scheduledDate }] : []),
      ...(selectedClient ? [{ label: "Client Reference", value: selectedClient.name }] : []),
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
            Generate LinkedIn content for the Sarani brand
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

        {/* Guidance message */}
        <GuidanceMessage>
          The best Sarani posts are built on real proof: numbers, client names
          (when authorized), specific outcomes. If you&apos;re writing about a
          case study, include the actual figures — don&apos;t let me invent
          them. If you&apos;re writing thought leadership, tell me the one
          controversial or surprising insight you want to share. Generic topics
          produce generic posts.
        </GuidanceMessage>

        <StepIndicator steps={STEPS} currentStep={step} />

        {/* ── Step 0: Content Brief (required fields) ───────────────────── */}
        {step === 0 && (
          <div className="space-y-5">
            {/* Sarani brand context panel */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-sm font-semibold text-blue-900">
                  Sarani brand context loaded
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="font-medium text-blue-700">Brand voice</span>
                  <p className="text-blue-900">Assured / Direct / Warm</p>
                </div>
                <div>
                  <span className="font-medium text-blue-700">Platform</span>
                  <p className="text-blue-900">LinkedIn-first</p>
                </div>
                <div>
                  <span className="font-medium text-blue-700">Default tone</span>
                  <p className="text-blue-900">Evidence-first</p>
                </div>
              </div>
            </div>

            {/* Topic or angle — required */}
            <FormField
              label="Topic or Angle"
              required
              helperText="The topic determines everything. Must be specific enough to be publishable. Include numbers, client names (if authorized), and specific outcomes."
            >
              <TextareaWithCount
                value={form.topicOrAngle}
                onChange={(val) =>
                  setForm((prev) => ({ ...prev, topicOrAngle: val }))
                }
                placeholder="How we helped TikTok edit 1,500+ videos per month without missing a single deadline — and what made it possible."
                minLength={20}
                rows={3}
              />
            </FormField>

            {/* Post format — required */}
            <FormField
              label="Post Format"
              required
              helperText="LinkedIn format impacts writing approach. A carousel requires narrative split across slides; long text needs a strong hook."
            >
              <div className="grid grid-cols-3 gap-2">
                {POST_FORMAT_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex flex-col items-center gap-1 p-3 rounded-lg border cursor-pointer transition-colors text-center ${
                      form.postFormat === opt.value
                        ? "border-brand-cerulean bg-blue-50/50"
                        : "border-neutral-200 hover:border-neutral-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="postFormat"
                      value={opt.value}
                      checked={form.postFormat === opt.value}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          postFormat: e.target.value as PostFormat,
                        }))
                      }
                      className="sr-only"
                    />
                    <span className="text-sm font-medium text-brand-black">
                      {opt.label}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {opt.description}
                    </span>
                  </label>
                ))}
              </div>
            </FormField>

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

        {/* ── Step 1: Configure (recommended + optional) ──────────────── */}
        {step === 1 && (
          <div className="space-y-5">
            {/* ── Recommended fields ──────────────────────────────────────── */}

            {/* Proof points — recommended */}
            <FormField
              label={
                <>
                  Proof Points
                  <RecommendedBadge />
                </>
              }
              helperText="Data, outcomes, or specific facts that make the post credible. Without proof, the agent writes claims; with proof, it writes evidence."
            >
              <TextareaWithCount
                value={form.proofPoints}
                onChange={(val) =>
                  setForm((prev) => ({ ...prev, proofPoints: val }))
                }
                placeholder="1,500+ videos/month. 0 missed deadlines over 8 months. Team of 6 editors across 3 time zones."
                rows={3}
              />
            </FormField>

            {/* Client reference — recommended */}
            <FormField
              label={
                <>
                  Client Reference
                  <RecommendedBadge />
                </>
              }
              helperText="If the post references a client project, select them to activate case study data. Requires confirmation that the client has authorized public mention."
            >
              <ClientSelector
                value={form.clientReference}
                onChange={(clientId) =>
                  setForm((prev) => ({ ...prev, clientReference: clientId }))
                }
                required={false}
                helperText=""
                onClientLoaded={handleClientLoaded}
              />
            </FormField>

            {/* Tone emphasis — recommended */}
            <FormField
              label={
                <>
                  Tone Emphasis
                  <RecommendedBadge />
                </>
              }
              helperText="Sarani's brand voice is Evidence-first by default. Override for behind-the-scenes or contrarian content."
            >
              <select
                value={form.toneEmphasis}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    toneEmphasis: e.target.value as ToneEmphasis,
                  }))
                }
                className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
              >
                {TONE_EMPHASIS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </FormField>

            {/* Scheduled date — recommended */}
            <FormField
              label={
                <>
                  Scheduled Date
                  <RecommendedBadge />
                </>
              }
              helperText="Without a scheduled date, the post has no place in the content queue."
            >
              <input
                type="date"
                value={form.scheduledDate}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, scheduledDate: e.target.value }))
                }
                className="w-full max-w-xs px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
              />
            </FormField>

            {/* Language + Variants */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Language"
                helperText="Content language for the post."
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

            {/* ── Advanced options (collapsible) ─────────────────────────── */}
            <div className="border-t border-neutral-200 pt-4">
              <button
                type="button"
                onClick={() => setAdvancedOpen(!advancedOpen)}
                className="flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-brand-black transition-colors"
              >
                <span
                  className="transition-transform"
                  style={{
                    display: "inline-block",
                    transform: advancedOpen ? "rotate(90deg)" : "rotate(0deg)",
                  }}
                >
                  &#9654;
                </span>
                Advanced options
              </button>
              {advancedOpen && (
                <div className="mt-4 space-y-5">
                  <FormField
                    label="Hook Direction"
                    helperText="A suggestion for the opening line. The hook is the most critical element of a LinkedIn post — if you have a specific angle in mind, give it."
                  >
                    <TextareaWithCount
                      value={form.hookDirection}
                      onChange={(val) =>
                        setForm((prev) => ({ ...prev, hookDirection: val }))
                      }
                      placeholder="e.g. Start with the surprising number, then reveal the context"
                      rows={2}
                    />
                  </FormField>

                  <FormField
                    label="Visual Description"
                    helperText="If a visual will accompany the post, describe it. The agent adapts the copy to reinforce the visual rather than repeat it."
                  >
                    <TextareaWithCount
                      value={form.visualDescription}
                      onChange={(val) =>
                        setForm((prev) => ({ ...prev, visualDescription: val }))
                      }
                      placeholder="e.g. Before/after timeline infographic showing production speed improvement"
                      rows={2}
                    />
                  </FormField>

                  <FormField
                    label="Hashtag Preferences"
                    helperText="Specific hashtags to include or avoid. Otherwise auto-generated."
                  >
                    <input
                      type="text"
                      value={form.hashtagPreferences}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          hashtagPreferences: e.target.value,
                        }))
                      }
                      placeholder="e.g. #CreativeAgency #ContentAtScale — avoid #Marketing"
                      className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                    />
                  </FormField>

                  <FormField
                    label="CTA Direction"
                    helperText="The specific action you want readers to take. Default: link in comments or DM to learn more."
                  >
                    <input
                      type="text"
                      value={form.ctaDirection}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          ctaDirection: e.target.value,
                        }))
                      }
                      placeholder="Tag a CMO who needs to hear this"
                      className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                    />
                  </FormField>
                </div>
              )}
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
