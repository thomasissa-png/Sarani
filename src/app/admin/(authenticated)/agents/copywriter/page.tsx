"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import type { Client } from "@/lib/db/schema";
import {
  SUPPORTED_LANGUAGES,
  LANGUAGE_LABELS,
  CONTENT_TYPES,
  CONTENT_TYPE_LABELS,
  type SupportedLanguage,
  type ContentType,
  type CopywriterResponse,
} from "@/lib/validations/copywriter";
import {
  ClientSelector,
  FormField,
  GuidanceMessage,
  RecommendedBadge,
  StepIndicator,
  PreSubmitSummary,
  TextareaWithCount,
} from "@/components/admin/guided-form";

// ─── Types ──────────────────────────────────────────────────────────────────

type GenerateApiResponse = {
  content: CopywriterResponse;
  outputId: string;
  usage: { inputTokens: number; outputTokens: number };
};

const PLACEMENT_OPTIONS = [
  { value: "", label: "-- Select placement --" },
  { value: "website-hero", label: "Website hero" },
  { value: "banner", label: "Banner" },
  { value: "email", label: "Email" },
  { value: "social-post", label: "Social post" },
  { value: "ooh", label: "OOH" },
  { value: "print", label: "Print" },
  { value: "video-script", label: "Video script" },
  { value: "packaging", label: "Packaging" },
] as const;

const TONE_DIRECTION_OPTIONS = [
  { value: "", label: "-- Use brand default --" },
  { value: "inspiring", label: "Inspiring" },
  { value: "urgent", label: "Urgent" },
  { value: "informational", label: "Informational" },
  { value: "playful", label: "Playful" },
  { value: "premium", label: "Premium" },
  { value: "technical", label: "Technical" },
] as const;

type FormState = {
  clientId: string;
  contentType: ContentType;
  keyMessage: string;
  targetAudience: string;
  placement: string;
  toneDirection: string;
  language: SupportedLanguage;
  variantCount: number;
  competitiveContext: string;
  existingCopyToImprove: string;
  approvedReferences: string;
  hardConstraints: string;
  characterLimit: string;
};

const STEPS = ["Select Client", "Configure", "Review & Generate"];

// ─── Page Component ─────────────────────────────────────────────────────────

export default function CopywriterPage() {
  // Step state
  const [step, setStep] = useState(0);

  // Selected client object
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Advanced options toggle
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Form state
  const [form, setForm] = useState<FormState>({
    clientId: "",
    contentType: "email",
    keyMessage: "",
    targetAudience: "",
    placement: "",
    toneDirection: "",
    language: "EN",
    variantCount: 3,
    competitiveContext: "",
    existingCopyToImprove: "",
    approvedReferences: "",
    hardConstraints: "",
    characterLimit: "",
  });

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<CopywriterResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Step validation ─────────────────────────────────────────────────────

  function isStep0Valid(): boolean {
    return !!form.clientId;
  }

  function isStep1Valid(): boolean {
    return (
      form.keyMessage.length >= 20 && !!form.targetAudience.trim()
    );
  }

  // ── Client loaded callback — auto-fill language ───────────────────────

  const handleClientLoaded = useCallback(
    (client: Client | null) => {
      setSelectedClient(client);
      if (client?.primaryLanguage) {
        const lang = client.primaryLanguage as SupportedLanguage;
        if (SUPPORTED_LANGUAGES.includes(lang)) {
          setForm((prev) => ({ ...prev, language: lang }));
        }
      }
    },
    []
  );

  // ── Handle generate ─────────────────────────────────────────────────────

  async function handleGenerate() {
    setError(null);
    setResult(null);

    setGenerating(true);

    try {
      const res = await fetch("/api/admin/agents/copywriter/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: form.clientId,
          contentType: form.contentType,
          topic: form.keyMessage,
          targetAudience: form.targetAudience,
          tone: form.toneDirection || undefined,
          language: form.language,
          keyMessages: form.keyMessage || undefined,
          variantCount: form.variantCount,
          placement: form.placement || undefined,
          competitiveContext: form.competitiveContext || undefined,
          existingCopyToImprove: form.existingCopyToImprove || undefined,
          hardConstraints: form.hardConstraints || undefined,
          characterLimit: form.characterLimit ? parseInt(form.characterLimit) : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Generation failed");
      }

      const data: GenerateApiResponse = await res.json();
      setResult(data.content);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate content"
      );
    } finally {
      setGenerating(false);
    }
  }

  // ── Build summary items ───────────────────────────────────────────────

  function getSummaryItems(): { label: string; value: string }[] {
    const items: { label: string; value: string }[] = [
      { label: "Client", value: selectedClient?.name || "---" },
      {
        label: "Copy Type",
        value: CONTENT_TYPE_LABELS[form.contentType],
      },
      {
        label: "Key Message",
        value:
          form.keyMessage.length > 100
            ? form.keyMessage.slice(0, 100) + "..."
            : form.keyMessage,
      },
      { label: "Target Audience", value: form.targetAudience },
      {
        label: "Language",
        value: `${LANGUAGE_LABELS[form.language]} (${form.language})`,
      },
      {
        label: "Variants",
        value:
          form.variantCount === 1
            ? "1 (primary only)"
            : `${form.variantCount} (primary + ${form.variantCount - 1} variants)`,
      },
    ];

    if (form.placement) {
      items.push({
        label: "Placement",
        value: PLACEMENT_OPTIONS.find((p) => p.value === form.placement)?.label || form.placement,
      });
    }

    if (form.toneDirection) {
      items.push({
        label: "Tone Direction",
        value: TONE_DIRECTION_OPTIONS.find((t) => t.value === form.toneDirection)?.label || form.toneDirection,
      });
    }

    if (form.characterLimit) {
      items.push({
        label: "Character Limit",
        value: `${form.characterLimit} characters`,
      });
    }

    if (form.competitiveContext.trim()) {
      items.push({
        label: "Competitive Context",
        value:
          form.competitiveContext.length > 80
            ? form.competitiveContext.slice(0, 80) + "..."
            : form.competitiveContext,
      });
    }

    return items;
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-black">Copywriter</h1>
          <p className="text-neutral-500 text-sm mt-1">
            Generate copy for emails, taglines, ads, press releases, and more
          </p>
        </div>
        <Link
          href="/admin/agents/copywriter/history"
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
          Good copy is specific. Tell me the one thing you want the reader to feel or do, who they are, and where this will appear. A tagline for a Sony product launch and a CTA for a GEODIS procurement email require completely different tones. The more specific your brief, the sharper the copy.
        </GuidanceMessage>

        <StepIndicator steps={STEPS} currentStep={step} />

        {/* Step 0: Select Client */}
        {step === 0 && (
          <div className="space-y-4">
            <ClientSelector
              value={form.clientId}
              onChange={(clientId) =>
                setForm((prev) => ({ ...prev, clientId }))
              }
              onClientLoaded={handleClientLoaded}
              helperText="Select the client. Their brand tone, voice guidelines, and primary language will be applied to the generated copy."
            />

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={!isStep0Valid()}
                className="px-6 py-2.5 bg-brand-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Step 1: Configure */}
        {step === 1 && (
          <div className="space-y-5">
            {/* Required: Copy type */}
            <FormField
              label="Copy Type"
              required
              helperText="Different copy types have entirely different constraints: a tagline is 3-6 words, body copy can be 200 words."
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
                {CONTENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {CONTENT_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </FormField>

            {/* Required: Key message */}
            <FormField
              label="Key Message"
              required
              helperText="The single idea the copy must communicate. Not the features list — the one thing. If the copywriter doesn't know this, they write copy that says everything, which means nothing."
            >
              <TextareaWithCount
                value={form.keyMessage}
                onChange={(keyMessage) =>
                  setForm((prev) => ({ ...prev, keyMessage }))
                }
                placeholder="Adidas Ultraboost 26 makes you 15% faster over long distances — proven by independent biomechanics research."
                minLength={20}
                rows={4}
              />
            </FormField>

            {/* Required: Target audience */}
            <FormField
              label="Target Audience"
              required
              helperText="Copy changes fundamentally depending on who's reading. A 24-year-old runner and a 45-year-old procurement director are not the same person."
            >
              <input
                type="text"
                value={form.targetAudience}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    targetAudience: e.target.value,
                  }))
                }
                placeholder="Elite amateur runners, 28-45, train 5x/week, read performance reviews before buying"
                className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
              />
            </FormField>

            {/* Recommended fields */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label={
                  <>
                    Placement
                    <RecommendedBadge />
                  </>
                }
                helperText="Copy tone and length are dictated by where it appears. An OOH billboard is read in 3 seconds; an email can be 150 words."
              >
                <select
                  value={form.placement}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, placement: e.target.value }))
                  }
                  className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                >
                  {PLACEMENT_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField
                label={
                  <>
                    Tone Direction
                    <RecommendedBadge />
                  </>
                }
                helperText="Even within a brand's tone of voice, specific campaigns call for specific emotional registers."
              >
                <select
                  value={form.toneDirection}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      toneDirection: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                >
                  {TONE_DIRECTION_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                label={
                  <>
                    Number of Variants
                    <RecommendedBadge />
                  </>
                }
                helperText="Copy should always be explored in multiple directions. 3 variants minimum for any client-facing piece."
              >
                <div className="flex gap-2">
                  {[1, 3, 5, 10].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({ ...prev, variantCount: n }))
                      }
                      className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                        form.variantCount === n
                          ? "bg-brand-black text-white border-brand-black"
                          : "bg-white text-neutral-700 border-neutral-300 hover:border-neutral-400"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </FormField>

              <FormField
                label={
                  <>
                    Competitive Context
                    <RecommendedBadge />
                  </>
                }
                helperText="What are competitors saying? The copy should differentiate."
              >
                <input
                  type="text"
                  value={form.competitiveContext}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      competitiveContext: e.target.value,
                    }))
                  }
                  placeholder="Nike is owning 'Just Do It' / performance. We must own the science angle."
                  className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                />
              </FormField>
            </div>

            {/* Advanced options (optional) */}
            <div className="border border-neutral-200 rounded-lg">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors rounded-lg"
              >
                <span>Advanced options</span>
                <span className="text-neutral-400">{showAdvanced ? "−" : "+"}</span>
              </button>
              {showAdvanced && (
                <div className="px-4 pb-4 space-y-4 border-t border-neutral-200 pt-4">
                  <FormField
                    label="Existing Copy to Improve"
                    helperText="Paste the current copy to rewrite or refine rather than generate from scratch."
                  >
                    <TextareaWithCount
                      value={form.existingCopyToImprove}
                      onChange={(existingCopyToImprove) =>
                        setForm((prev) => ({ ...prev, existingCopyToImprove }))
                      }
                      placeholder="Paste the current copy here if you want a rewrite"
                      rows={3}
                    />
                  </FormField>

                  <FormField
                    label="Approved References"
                    helperText="Examples of copy the client has approved in the past. Anchors the tone to something already validated."
                  >
                    <TextareaWithCount
                      value={form.approvedReferences}
                      onChange={(approvedReferences) =>
                        setForm((prev) => ({ ...prev, approvedReferences }))
                      }
                      placeholder="e.g. 'Impossible is Nothing' was approved for last campaign"
                      rows={2}
                    />
                  </FormField>

                  <FormField
                    label="Hard Constraints"
                    helperText="Character limits, words to avoid, mandatory inclusions."
                  >
                    <input
                      type="text"
                      value={form.hardConstraints}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          hardConstraints: e.target.value,
                        }))
                      }
                      placeholder="e.g. Max 60 characters for this banner, must include trademark symbol"
                      className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                    />
                  </FormField>

                  <FormField
                    label="Character Limit"
                    helperText="(optional — for banners, social posts, subject lines)"
                  >
                    <input
                      type="number"
                      value={form.characterLimit}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          characterLimit: e.target.value,
                        }))
                      }
                      placeholder="e.g. 280 for Twitter, 125 for meta description"
                      className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                    />
                  </FormField>

                  <FormField
                    label="Language"
                    helperText="Default is English. Auto-filled from client profile. Specify if copy needs a different language."
                  >
                    <select
                      value={form.language}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          language: e.target.value as SupportedLanguage,
                        }))
                      }
                      className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                    >
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <option key={lang} value={lang}>
                          {LANGUAGE_LABELS[lang]} ({lang})
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setStep(0)}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-neutral-300 text-neutral-600 hover:bg-neutral-100 transition-colors"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!isStep1Valid()}
                className="px-6 py-2.5 bg-brand-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Review & Generate */}
        {step === 2 && (
          <div className="space-y-4">
            <PreSubmitSummary
              items={getSummaryItems()}
              onBack={() => setStep(1)}
              onConfirm={handleGenerate}
              loading={generating}
              buttonLabel="Generate"
            />

            {/* Error */}
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                {error}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Output */}
      {result && <CopywriterOutput result={result} />}
    </div>
  );
}

// ─── Output Component ───────────────────────────────────────────────────────

function CopywriterOutput({ result }: { result: CopywriterResponse }) {
  const [activeTab, setActiveTab] = useState<"primary" | number>("primary");
  const [copied, setCopied] = useState(false);

  const currentHeadline =
    activeTab === "primary"
      ? result.headline
      : result.variants[activeTab]?.headline ?? "";
  const currentBody =
    activeTab === "primary"
      ? result.body
      : result.variants[activeTab]?.body ?? "";

  async function handleCopy() {
    const text = `${currentHeadline}\n\n${currentBody}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    const text = `${currentHeadline}\n\n${currentBody}${result.callToAction ? `\n\nCTA: ${result.callToAction}` : ""}`;
    const blob = new Blob([text], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `copywriter-${result.contentType}-${activeTab === "primary" ? "primary" : `variant-${activeTab + 1}`}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="bg-white rounded-xl border border-neutral-300 p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-brand-black">Output</h2>
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <span>{result.wordCount} words</span>
          <span className="text-neutral-300">|</span>
          <span>{result.contentType}</span>
          <span className="text-neutral-300">|</span>
          <span>{result.toneUsed}</span>
        </div>
      </div>

      {/* Variant tabs */}
      {result.variants.length > 0 && (
        <div className="flex gap-1 border-b border-neutral-200 pb-0">
          <button
            type="button"
            onClick={() => setActiveTab("primary")}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === "primary"
                ? "bg-neutral-100 text-brand-black border border-neutral-300 border-b-white -mb-px"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            Primary
          </button>
          {result.variants.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveTab(i)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === i
                  ? "bg-neutral-100 text-brand-black border border-neutral-300 border-b-white -mb-px"
                  : "text-neutral-500 hover:text-neutral-700"
              }`}
            >
              Variant {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* Headline */}
      <div>
        <h3 className="text-xs font-semibold text-neutral-500 uppercase mb-2">
          Headline
        </h3>
        <p className="text-xl font-bold text-brand-black leading-tight">
          {currentHeadline}
        </p>
      </div>

      {/* Body */}
      <div>
        <h3 className="text-xs font-semibold text-neutral-500 uppercase mb-2">
          Body
        </h3>
        <div className="text-sm text-neutral-700 whitespace-pre-wrap bg-neutral-50 rounded-lg p-4 leading-relaxed max-h-96 overflow-y-auto">
          {currentBody}
        </div>
      </div>

      {/* CTA */}
      {result.callToAction && (
        <div>
          <h3 className="text-xs font-semibold text-neutral-500 uppercase mb-2">
            Call to Action
          </h3>
          <p className="text-sm font-semibold text-brand-cerulean">
            {result.callToAction}
          </p>
        </div>
      )}

      {/* Notes */}
      {result.notes.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-neutral-700">
            Copywriter Notes
          </h3>
          <ul className="text-sm text-neutral-600 space-y-1">
            {result.notes.map((note, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-neutral-400 shrink-0">--</span>
                {note}
              </li>
            ))}
          </ul>
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
        <button
          onClick={handleDownload}
          className="px-4 py-2 text-sm font-semibold rounded-lg border border-neutral-300 text-brand-black hover:bg-neutral-100 transition-colors"
        >
          Download .md
        </button>
      </div>
    </div>
  );
}
