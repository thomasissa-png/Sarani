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

type FormState = {
  clientId: string;
  contentType: ContentType;
  topic: string;
  targetAudience: string;
  tone: string;
  language: SupportedLanguage;
  keyMessages: string;
  variantCount: number;
};

const STEPS = ["Select Client", "Configure", "Review & Generate"];

// ─── Topic placeholder examples per content type ────────────────────────────

const TOPIC_PLACEHOLDERS: Partial<Record<ContentType, string>> = {
  email:
    "e.g. Welcome email for new GEODIS logistics partnership — introduce key account manager, highlight SLA commitments, schedule kickoff call",
  tagline:
    "e.g. Sarani unlimited creativity positioning — convey scale, speed, and AI-powered creative production for global brands",
  "press-release":
    "e.g. Sarani announces partnership with Publicis Groupe — AI creative production at scale for their global client portfolio",
  "ad-copy":
    "e.g. Google Ads campaign for Black Friday electronics deals — urgency messaging, price anchoring, multiple headline variants",
  "brand-manifesto":
    "e.g. Sarani brand manifesto — our mission to democratize world-class creative production through AI, tone: bold and visionary",
  "product-description":
    "e.g. Sony ULT Wear headphones product page — highlight noise cancellation, 30h battery, bass boost, lifestyle positioning for Gen Z",
};

const DEFAULT_TOPIC_PLACEHOLDER =
  "e.g. Describe the content topic, context, and any specific angles or messages to include";

// ─── Page Component ─────────────────────────────────────────────────────────

export default function CopywriterPage() {
  // Step state
  const [step, setStep] = useState(0);

  // Selected client object
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Form state
  const [form, setForm] = useState<FormState>({
    clientId: "",
    contentType: "email",
    topic: "",
    targetAudience: "",
    tone: "",
    language: "EN",
    keyMessages: "",
    variantCount: 1,
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
      form.topic.length >= 20 && !!form.targetAudience.trim()
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
          topic: form.topic,
          targetAudience: form.targetAudience,
          tone: form.tone || undefined,
          language: form.language,
          keyMessages: form.keyMessages || undefined,
          variantCount: form.variantCount,
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
        label: "Content Type",
        value: CONTENT_TYPE_LABELS[form.contentType],
      },
      {
        label: "Topic",
        value:
          form.topic.length > 100
            ? form.topic.slice(0, 100) + "..."
            : form.topic,
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

    if (form.tone.trim()) {
      items.push({ label: "Tone Override", value: form.tone });
    }

    if (form.keyMessages.trim()) {
      items.push({
        label: "Key Messages",
        value:
          form.keyMessages.length > 80
            ? form.keyMessages.slice(0, 80) + "..."
            : form.keyMessages,
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
            {/* Content type + Language */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Content Type"
                required
                helperText="What kind of copy do you need? This shapes the structure, length, and format of the output."
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

              <FormField
                label="Language"
                required
                helperText="Auto-filled from client profile. Change if you need copy in a different language."
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

            {/* Topic textarea */}
            <FormField
              label="Topic / Brief"
              required
              helperText="Describe what the content should be about. Include context, goals, and any specific angles."
            >
              <TextareaWithCount
                value={form.topic}
                onChange={(topic) =>
                  setForm((prev) => ({ ...prev, topic }))
                }
                placeholder={
                  TOPIC_PLACEHOLDERS[form.contentType] ||
                  DEFAULT_TOPIC_PLACEHOLDER
                }
                minLength={20}
                rows={4}
              />
            </FormField>

            {/* Target audience */}
            <FormField
              label="Target Audience"
              required
              helperText="Who will read this content? The more specific, the better the tone and messaging."
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
                placeholder="e.g. CMOs at mid-size SaaS companies, luxury retail consumers aged 25-40, internal sales team..."
                className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
              />
            </FormField>

            {/* Key messages */}
            <FormField
              label="Key Messages"
              helperText="Optional. List the key points or messages the copy must include. One per line works best."
            >
              <TextareaWithCount
                value={form.keyMessages}
                onChange={(keyMessages) =>
                  setForm((prev) => ({ ...prev, keyMessages }))
                }
                placeholder="e.g. 1. We produce creative 10x faster than traditional agencies&#10;2. AI-powered but human-reviewed quality&#10;3. Works with your existing brand guidelines"
                rows={3}
              />
            </FormField>

            {/* Tone override + Variant count */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Tone Override"
                helperText="Optional. Overrides the client's default brand tone for this specific piece."
              >
                <input
                  type="text"
                  value={form.tone}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, tone: e.target.value }))
                  }
                  placeholder="e.g. Urgent and bold, Warm and conversational, Technical and precise..."
                  className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                />
              </FormField>

              <FormField
                label="Variants"
                helperText="Generate multiple versions to A/B test or pick the best one."
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
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n === 1
                        ? "1 (primary only)"
                        : `${n} (primary + ${n - 1} variants)`}
                    </option>
                  ))}
                </select>
              </FormField>
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
