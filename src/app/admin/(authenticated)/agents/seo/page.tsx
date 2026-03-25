"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import type { Client } from "@/lib/db/schema";
import {
  SEO_CONTENT_TYPES,
  SEO_CONTENT_TYPE_LABELS,
  SEO_LANGUAGES,
  SEO_LANGUAGE_LABELS,
  WORD_COUNT_OPTIONS,
  type SeoContentType,
  type SeoLanguage,
  type SeoArticleResponse,
  type SeoMetaDescriptionResponse,
  type SeoKeywordResearchResponse,
  type SeoBlogOutlineResponse,
  type SeoResponse,
} from "@/lib/validations/seo";
import {
  ClientSelector,
  FormField,
  StepIndicator,
  PreSubmitSummary,
  TextareaWithCount,
} from "@/components/admin/guided-form";

// ─── Types ──────────────────────────────────────────────────────────────────

type SeoApiResponse = {
  result: SeoResponse;
  contentType: SeoContentType;
  outputId: string;
  usage: { inputTokens: number; outputTokens: number };
};

type SearchIntent = "informational" | "navigational" | "commercial" | "transactional";

const SEARCH_INTENT_OPTIONS: { value: SearchIntent | ""; label: string }[] = [
  { value: "", label: "-- Select search intent --" },
  { value: "informational", label: "Informational" },
  { value: "navigational", label: "Navigational" },
  { value: "commercial", label: "Commercial" },
  { value: "transactional", label: "Transactional" },
];

type TargetCta = "" | "contact" | "pricing" | "case-studies" | "consultation";

const TARGET_CTA_OPTIONS: { value: TargetCta; label: string }[] = [
  { value: "", label: "-- Select target CTA --" },
  { value: "contact", label: "Contact form" },
  { value: "pricing", label: "Pricing page" },
  { value: "case-studies", label: "Case studies" },
  { value: "consultation", label: "Free consultation" },
];

type TargetLength = 1500 | 2000 | 2500;

const TARGET_LENGTH_OPTIONS: { value: TargetLength; label: string }[] = [
  { value: 1500, label: "1,500 words" },
  { value: 2000, label: "2,000 words" },
  { value: 2500, label: "2,500 words" },
];

type FormState = {
  clientId: string;
  contentType: SeoContentType;
  // Required
  articleTitleH1: string;
  primaryKeyword: string;
  // Recommended
  searchIntent: SearchIntent | "";
  secondaryKeywords: string;
  targetCta: TargetCta;
  targetLength: TargetLength;
  // Optional
  competitorArticles: string;
  internalLinks: string;
  proofPoints: string;
  articleOutline: string;
  // Kept
  language: SeoLanguage;
  wordCount: number;
  topic: string;
};

const STEPS = ["Select Client", "Configure", "Review & Generate"];

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

export default function SeoPage() {
  // Step state
  const [step, setStep] = useState(0);

  // Client data
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Form state
  const [form, setForm] = useState<FormState>({
    clientId: "",
    contentType: "article",
    articleTitleH1: "",
    primaryKeyword: "",
    searchIntent: "",
    secondaryKeywords: "",
    targetCta: "",
    targetLength: 2000,
    competitorArticles: "",
    internalLinks: "",
    proofPoints: "",
    articleOutline: "",
    language: "EN",
    wordCount: 2000,
    topic: "",
  });

  // Advanced options toggle
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<SeoResponse | null>(null);
  const [resultType, setResultType] = useState<SeoContentType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // ── Smart defaults when client is loaded ─────────────────────────────────

  const handleClientLoaded = useCallback((client: Client | null) => {
    setSelectedClient(client);
    if (client?.primaryLanguage) {
      const lang = client.primaryLanguage.toUpperCase();
      const validLangs: SeoLanguage[] = ["EN", "FR", "ES", "DE", "IT", "PT", "NL", "AR", "ZH", "JA"];
      if (validLangs.includes(lang as SeoLanguage)) {
        setForm((prev) => ({ ...prev, language: lang as SeoLanguage }));
      }
    }
  }, []);

  // ── Step validation ─────────────────────────────────────────────────────

  function canProceedStep0(): boolean {
    return !!form.clientId;
  }

  function canProceedStep1(): boolean {
    return (
      !!form.articleTitleH1.trim() &&
      !!form.primaryKeyword.trim() &&
      form.primaryKeyword.length <= 70
    );
  }

  // ── Handle generate ─────────────────────────────────────────────────────

  async function handleGenerate() {
    setError(null);
    setResult(null);
    setResultType(null);
    setCopied(false);
    setGenerating(true);

    try {
      const res = await fetch("/api/admin/agents/seo/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: form.clientId,
          contentType: form.contentType,
          targetKeyword: form.primaryKeyword,
          secondaryKeywords: form.secondaryKeywords,
          language: form.language,
          wordCount: form.targetLength || form.wordCount,
          topic: form.articleTitleH1,
          // Additional context
          articleTitleH1: form.articleTitleH1,
          primaryKeyword: form.primaryKeyword,
          searchIntent: form.searchIntent || undefined,
          targetCta: form.targetCta || undefined,
          competitorArticles: form.competitorArticles || undefined,
          internalLinks: form.internalLinks || undefined,
          proofPoints: form.proofPoints || undefined,
          articleOutline: form.articleOutline || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Generation failed");
      }

      const data: SeoApiResponse = await res.json();
      setResult(data.result);
      setResultType(data.contentType);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate SEO content"
      );
    } finally {
      setGenerating(false);
    }
  }

  // ── Copy to clipboard ──────────────────────────────────────────────────

  async function handleCopy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Download as file ───────────────────────────────────────────────────

  function handleDownload(text: string, filename: string) {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Build summary items ────────────────────────────────────────────────

  function getSummaryItems() {
    return [
      { label: "Client", value: selectedClient?.name || "---" },
      { label: "Content Type", value: SEO_CONTENT_TYPE_LABELS[form.contentType] },
      { label: "H1 Title", value: form.articleTitleH1 || "---" },
      { label: "Primary Keyword", value: form.primaryKeyword || "---" },
      ...(form.searchIntent
        ? [{ label: "Search Intent", value: SEARCH_INTENT_OPTIONS.find((o) => o.value === form.searchIntent)?.label || form.searchIntent }]
        : []),
      ...(form.secondaryKeywords
        ? [{ label: "Secondary Keywords", value: form.secondaryKeywords }]
        : []),
      { label: "Language", value: SEO_LANGUAGE_LABELS[form.language] },
      ...(form.contentType === "article"
        ? [{ label: "Target Length", value: `${form.targetLength.toLocaleString()} words` }]
        : []),
      ...(form.targetCta
        ? [{ label: "Target CTA", value: TARGET_CTA_OPTIONS.find((o) => o.value === form.targetCta)?.label || form.targetCta }]
        : []),
    ];
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-black">SEO IA</h1>
          <p className="text-neutral-500 text-sm mt-1">
            Generate SEO-optimized articles, meta descriptions, keyword research, and blog outlines
          </p>
        </div>
        <Link
          href="/admin/agents/seo/history"
          className="px-4 py-2 bg-white border border-neutral-300 text-sm font-semibold rounded-lg hover:bg-neutral-100 transition-colors text-brand-black"
        >
          History
        </Link>
      </div>

      {/* Generation Form */}
      <div className="bg-white rounded-xl border border-neutral-300 p-6 space-y-5">
        <h2 className="text-lg font-semibold text-brand-black">
          New SEO Content
        </h2>

        {/* Guidance message */}
        <GuidanceMessage>
          SEO writing is a precision exercise. Give me a specific keyword (not
          &quot;marketing agency&quot; — try &quot;creative agency for enterprise
          brands&quot;), confirm the search intent (is the reader looking to
          hire, to learn, or to compare?), and tell me where you want to convert
          them. I&apos;ll handle the structure, the optimization, and the Sarani
          voice.
        </GuidanceMessage>

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
              helperText="Select the client to align SEO content with their brand voice and industry context."
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
            {/* Content type and language */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Content Type"
                required
                helperText="Article generates full content. Meta-description creates SERP snippets. Keyword-research finds opportunities. Blog-outline creates a structured plan."
              >
                <select
                  value={form.contentType}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      contentType: e.target.value as SeoContentType,
                    }))
                  }
                  className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                >
                  {SEO_CONTENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {SEO_CONTENT_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField
                label="Language"
                helperText="Auto-filled from client profile."
              >
                <select
                  value={form.language}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      language: e.target.value as SeoLanguage,
                    }))
                  }
                  className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                >
                  {SEO_LANGUAGES.map((lang) => (
                    <option key={lang} value={lang}>
                      {SEO_LANGUAGE_LABELS[lang]} ({lang})
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            {/* Article title H1 — required */}
            <FormField
              label="Article Title (H1)"
              required
              helperText="The H1 title determines the primary keyword placement and sets the topic frame."
            >
              <input
                type="text"
                value={form.articleTitleH1}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    articleTitleH1: e.target.value,
                  }))
                }
                placeholder="How to Brief a Creative Agency for Same-Day Delivery"
                className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
              />
            </FormField>

            {/* Primary keyword — required, max 70 chars */}
            <FormField
              label="Primary Keyword"
              required
              helperText="The exact search query the article must rank for. Every structural and density decision is built around this keyword."
              error={
                form.primaryKeyword.length > 70
                  ? `Keyword must be 70 characters or less (currently ${form.primaryKeyword.length})`
                  : undefined
              }
            >
              <div>
                <input
                  type="text"
                  value={form.primaryKeyword}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      primaryKeyword: e.target.value,
                    }))
                  }
                  maxLength={70}
                  placeholder="brief creative agency"
                  className={`w-full px-4 py-2.5 rounded-lg border ${
                    form.primaryKeyword.length > 70
                      ? "border-red-400"
                      : "border-neutral-300"
                  } bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent`}
                />
                <div className="flex justify-end mt-1">
                  <span
                    className={`text-xs ${
                      form.primaryKeyword.length > 70
                        ? "text-red-500"
                        : "text-neutral-400"
                    }`}
                  >
                    {form.primaryKeyword.length}/70 chars
                  </span>
                </div>
              </div>
            </FormField>

            {/* ── Recommended fields ──────────────────────────────────────── */}
            <div className="border-t border-neutral-200 pt-5 space-y-5">
              {/* Search intent — recommended */}
              <FormField
                label={
                  <>
                    Search Intent
                    <RecommendedBadge />
                  </>
                }
                helperText="Determines the article structure and conclusion strategy. An informational article educates; a commercial one builds comparison and moves toward a decision."
              >
                <select
                  value={form.searchIntent}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      searchIntent: e.target.value as SearchIntent | "",
                    }))
                  }
                  className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                >
                  {SEARCH_INTENT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </FormField>

              {/* Secondary keywords — recommended */}
              <FormField
                label={
                  <>
                    Secondary Keywords
                    <RecommendedBadge />
                  </>
                }
                helperText="Semantic keywords increase topical authority and capture long-tail queries."
              >
                <input
                  type="text"
                  value={form.secondaryKeywords}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      secondaryKeywords: e.target.value,
                    }))
                  }
                  placeholder="agency briefing template, creative brief example, how to write a creative brief"
                  className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                />
              </FormField>

              {/* Target CTA — recommended */}
              <FormField
                label={
                  <>
                    Target CTA
                    <RecommendedBadge />
                  </>
                }
                helperText="Every SEO article should have a conversion path. Without a CTA target, the article ends with no action for the reader."
              >
                <select
                  value={form.targetCta}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      targetCta: e.target.value as TargetCta,
                    }))
                  }
                  className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                >
                  {TARGET_CTA_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </FormField>

              {/* Target length — recommended */}
              {form.contentType === "article" && (
                <FormField
                  label={
                    <>
                      Target Length
                      <RecommendedBadge />
                    </>
                  }
                  helperText="Length signals content depth to search engines. Competitive queries require longer articles."
                >
                  <div className="flex gap-2">
                    {TARGET_LENGTH_OPTIONS.map((opt) => (
                      <label
                        key={opt.value}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${
                          form.targetLength === opt.value
                            ? "border-brand-cerulean bg-blue-50/50"
                            : "border-neutral-200 hover:border-neutral-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="targetLength"
                          value={opt.value}
                          checked={form.targetLength === opt.value}
                          onChange={() =>
                            setForm((prev) => ({
                              ...prev,
                              targetLength: opt.value,
                              wordCount: opt.value,
                            }))
                          }
                          className="sr-only"
                        />
                        <span className="text-sm font-medium text-brand-black">
                          {opt.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </FormField>
              )}
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
                    label="Competitor Articles to Beat"
                    helperText="What is currently ranking #1-3 for this keyword? Knowing what to outcompete allows the agent to structure a more comprehensive article."
                  >
                    <TextareaWithCount
                      value={form.competitorArticles}
                      onChange={(val) =>
                        setForm((prev) => ({ ...prev, competitorArticles: val }))
                      }
                      placeholder="https://competitor.com/article-1, https://competitor.com/article-2"
                      rows={2}
                    />
                  </FormField>

                  <FormField
                    label="Internal Links to Include"
                    helperText="Specific pages to link to within the article (case studies, service pages). Builds internal link equity."
                  >
                    <input
                      type="text"
                      value={form.internalLinks}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          internalLinks: e.target.value,
                        }))
                      }
                      placeholder="e.g. /case-studies/geodis, /services/design"
                      className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                    />
                  </FormField>

                  <FormField
                    label="Proof Points to Include"
                    helperText="Specific Sarani data points to include (e.g., pricing, case study metrics). Without these, the agent will use placeholders."
                  >
                    <TextareaWithCount
                      value={form.proofPoints}
                      onChange={(val) =>
                        setForm((prev) => ({ ...prev, proofPoints: val }))
                      }
                      placeholder='e.g. "155 EUR Sony banners", "8,500 EUR GEODIS 5,700 slides"'
                      rows={2}
                    />
                  </FormField>

                  <FormField
                    label="Article Outline"
                    helperText="If you have a specific section structure in mind, providing it here overrides the auto-generated outline."
                  >
                    <TextareaWithCount
                      value={form.articleOutline}
                      onChange={(val) =>
                        setForm((prev) => ({ ...prev, articleOutline: val }))
                      }
                      placeholder="1. Introduction / hook&#10;2. The problem with traditional briefing&#10;3. Step-by-step briefing framework&#10;4. Case study: GEODIS&#10;5. Conclusion + CTA"
                      rows={4}
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
              buttonLabel="Generate"
            />
          </div>
        )}
      </div>

      {/* Result */}
      {result && resultType && (
        <SeoOutput
          result={result}
          contentType={resultType}
          onCopy={handleCopy}
          copied={copied}
          onDownload={handleDownload}
        />
      )}
    </div>
  );
}

// ─── SEO Output Component ────────────────────────────────────────────────────

function SeoOutput({
  result,
  contentType,
  onCopy,
  copied,
  onDownload,
}: {
  result: SeoResponse;
  contentType: SeoContentType;
  onCopy: (text: string) => void;
  copied: boolean;
  onDownload: (text: string, filename: string) => void;
}) {
  switch (contentType) {
    case "article":
      return (
        <ArticleOutput
          result={result as SeoArticleResponse}
          onCopy={onCopy}
          copied={copied}
          onDownload={onDownload}
        />
      );
    case "meta-description":
      return (
        <MetaDescriptionOutput
          result={result as SeoMetaDescriptionResponse}
          onCopy={onCopy}
          copied={copied}
        />
      );
    case "keyword-research":
      return (
        <KeywordResearchOutput
          result={result as SeoKeywordResearchResponse}
          onCopy={onCopy}
          copied={copied}
        />
      );
    case "blog-outline":
      return (
        <BlogOutlineOutput
          result={result as SeoBlogOutlineResponse}
          onCopy={onCopy}
          copied={copied}
          onDownload={onDownload}
        />
      );
  }
}

// ─── Article Output ──────────────────────────────────────────────────────────

function ArticleOutput({
  result,
  onCopy,
  copied,
  onDownload,
}: {
  result: SeoArticleResponse;
  onCopy: (text: string) => void;
  copied: boolean;
  onDownload: (text: string, filename: string) => void;
}) {
  const seoDetails = result.seoScore.details;
  const seoChecks = [
    { label: "Keyword in title", pass: seoDetails.keywordInTitle },
    { label: "Keyword in first paragraph", pass: seoDetails.keywordInFirstParagraph },
    { label: "Keyword in H2", pass: seoDetails.keywordInH2 },
    { label: "Meta description length", pass: seoDetails.metaDescriptionLength },
    { label: "Heading hierarchy", pass: seoDetails.headingHierarchy },
    { label: "Content length", pass: seoDetails.contentLength },
    { label: "Internal links", pass: seoDetails.internalLinks },
  ];

  const fullMarkdown = `# ${result.title}\n\n${result.content}`;

  return (
    <div className="bg-white rounded-xl border border-neutral-300 p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-brand-black">
          Generated Article
        </h2>
        <div className="flex items-center gap-3 text-xs text-neutral-500">
          <span>{result.wordCount} words</span>
          <span className="text-neutral-300">|</span>
          <span>Readability: {result.readabilityScore}</span>
          <span className="text-neutral-300">|</span>
          <span>SEO Score: {result.seoScore.overall}/100</span>
        </div>
      </div>

      {/* Meta preview */}
      <div className="bg-neutral-50 rounded-lg p-4 space-y-1">
        <h3 className="text-sm font-semibold text-neutral-700">
          Meta Preview
        </h3>
        <p className="text-blue-700 text-base font-medium leading-tight">
          {result.metaTitle}
        </p>
        <p className="text-xs text-green-700">
          https://example.com/blog/article-slug
        </p>
        <p className="text-sm text-neutral-600">{result.metaDescription}</p>
        <p className="text-xs text-neutral-400 mt-1">
          Meta title: {result.metaTitle.length} chars | Meta description:{" "}
          {result.metaDescription.length} chars
        </p>
      </div>

      {/* SEO Score checklist */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-neutral-700">
          SEO Checklist
        </h3>
        <div className="grid grid-cols-2 gap-1.5">
          {seoChecks.map((check) => (
            <div key={check.label} className="flex items-center gap-2 text-xs">
              <span
                className={
                  check.pass ? "text-green-600" : "text-red-500"
                }
              >
                {check.pass ? "PASS" : "FAIL"}
              </span>
              <span className="text-neutral-700">{check.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Keyword density */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-neutral-700">
          Keyword Density
        </h3>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs bg-blue-50 border border-blue-200 text-blue-800 px-2.5 py-1 rounded-full">
            <span className="font-medium">
              {result.keywordDensity.targetKeyword.percentage}
            </span>
            <span className="text-blue-400">
              ({result.keywordDensity.targetKeyword.count}x)
            </span>
          </span>
          {result.keywordDensity.secondaryKeywords.map((kw) => (
            <span
              key={kw.keyword}
              className="inline-flex items-center gap-1.5 text-xs bg-neutral-100 border border-neutral-200 text-neutral-700 px-2.5 py-1 rounded-full"
            >
              <span>{kw.keyword}</span>
              <span className="text-neutral-400">
                {kw.percentage} ({kw.count}x)
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Article content */}
      <div>
        <h3 className="text-sm font-semibold text-neutral-700 mb-2">
          Article Content
        </h3>
        <div className="w-full px-4 py-3 rounded-lg border border-neutral-300 bg-neutral-50 text-sm text-brand-black font-mono leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
          {fullMarkdown}
        </div>
      </div>

      {/* Internal linking suggestions */}
      {result.internalLinkingSuggestions.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-neutral-700">
            Internal Linking Suggestions
          </h3>
          <div className="space-y-1.5">
            {result.internalLinkingSuggestions.map((link, i) => (
              <div
                key={i}
                className="text-xs text-neutral-600 flex items-start gap-2"
              >
                <span className="text-neutral-400 shrink-0">--</span>
                <span>
                  <span className="font-medium text-brand-black">
                    &quot;{link.anchorText}&quot;
                  </span>{" "}
                  -&gt; {link.targetPage}{" "}
                  <span className="text-neutral-400">({link.context})</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {result.notes.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-neutral-700">Notes</h3>
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
          onClick={() => onCopy(fullMarkdown)}
          className="px-4 py-2 text-sm font-semibold rounded-lg border border-neutral-300 text-brand-black hover:bg-neutral-100 transition-colors"
        >
          {copied ? "Copied!" : "Copy Article"}
        </button>
        <button
          onClick={() => onCopy(result.metaDescription)}
          className="px-4 py-2 text-sm font-semibold rounded-lg border border-neutral-300 text-brand-black hover:bg-neutral-100 transition-colors"
        >
          Copy Meta
        </button>
        <button
          onClick={() =>
            onDownload(
              fullMarkdown,
              `seo-article-${result.title.slice(0, 30).replace(/\s+/g, "-").toLowerCase()}.md`
            )
          }
          className="px-4 py-2 text-sm font-semibold rounded-lg border border-neutral-300 text-brand-black hover:bg-neutral-100 transition-colors"
        >
          Download .md
        </button>
      </div>
    </div>
  );
}

// ─── Meta Description Output ─────────────────────────────────────────────────

function MetaDescriptionOutput({
  result,
  onCopy,
  copied,
}: {
  result: SeoMetaDescriptionResponse;
  onCopy: (text: string) => void;
  copied: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-neutral-300 p-6 space-y-5">
      <h2 className="text-lg font-semibold text-brand-black">
        Meta Description Variants
      </h2>

      <div className="space-y-4">
        {result.variants.map((variant, i) => (
          <div
            key={i}
            className="bg-neutral-50 rounded-lg p-4 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-500 uppercase">
                {variant.angle} angle
              </span>
              <span
                className={`text-xs ${
                  variant.charCount >= 150 && variant.charCount <= 160
                    ? "text-green-600"
                    : "text-amber-600"
                }`}
              >
                {variant.charCount} chars
              </span>
            </div>
            <p className="text-sm text-brand-black">{variant.text}</p>
            <button
              onClick={() => onCopy(variant.text)}
              className="text-xs text-brand-cerulean hover:underline font-medium"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        ))}
      </div>

      {/* Notes */}
      {result.notes.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-neutral-700">Notes</h3>
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
    </div>
  );
}

// ─── Keyword Research Output ─────────────────────────────────────────────────

function KeywordResearchOutput({
  result,
  onCopy,
  copied,
}: {
  result: SeoKeywordResearchResponse;
  onCopy: (text: string) => void;
  copied: boolean;
}) {
  const allKeywordsText = [
    `Target: ${result.targetKeyword}`,
    "",
    "Long-tail keywords:",
    ...result.longTailKeywords.map(
      (k) => `- ${k.keyword} [${k.searchIntent}] [${k.difficulty}]`
    ),
    "",
    "Semantic keywords:",
    ...result.semanticKeywords.map(
      (k) => `- ${k.keyword} [${k.relevance}]`
    ),
    "",
    "Question keywords:",
    ...result.questionKeywords.map((k) => `- ${k.keyword}`),
    "",
    "Topic clusters:",
    ...result.topicClusters.map(
      (c) => `- ${c.clusterName}: ${c.keywords.join(", ")}`
    ),
  ].join("\n");

  const difficultyColor = (d: string) => {
    switch (d) {
      case "low":
        return "bg-green-50 text-green-700 border-green-200";
      case "medium":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "high":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-neutral-100 text-neutral-700 border-neutral-200";
    }
  };

  return (
    <div className="bg-white rounded-xl border border-neutral-300 p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-brand-black">
          Keyword Research: &quot;{result.targetKeyword}&quot;
        </h2>
        <button
          onClick={() => onCopy(allKeywordsText)}
          className="px-4 py-2 text-sm font-semibold rounded-lg border border-neutral-300 text-brand-black hover:bg-neutral-100 transition-colors"
        >
          {copied ? "Copied!" : "Copy All"}
        </button>
      </div>

      {/* Long-tail keywords */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-neutral-700">
          Long-tail Keywords ({result.longTailKeywords.length})
        </h3>
        <div className="space-y-1.5">
          {result.longTailKeywords.map((kw, i) => (
            <div
              key={i}
              className="flex items-center justify-between text-sm py-1.5 px-3 rounded-lg bg-neutral-50"
            >
              <span className="text-brand-black">{kw.keyword}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-500">
                  {kw.searchIntent}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border ${difficultyColor(kw.difficulty)}`}
                >
                  {kw.difficulty}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Semantic keywords */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-neutral-700">
          Semantic / LSI Keywords ({result.semanticKeywords.length})
        </h3>
        <div className="flex flex-wrap gap-2">
          {result.semanticKeywords.map((kw, i) => (
            <span
              key={i}
              className={`text-xs px-2.5 py-1 rounded-full border ${
                kw.relevance === "high"
                  ? "bg-blue-50 border-blue-200 text-blue-800"
                  : "bg-neutral-100 border-neutral-200 text-neutral-700"
              }`}
            >
              {kw.keyword}
            </span>
          ))}
        </div>
      </div>

      {/* Question keywords */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-neutral-700">
          People Also Ask ({result.questionKeywords.length})
        </h3>
        <ul className="space-y-1">
          {result.questionKeywords.map((kw, i) => (
            <li
              key={i}
              className="text-sm text-neutral-700 flex items-start gap-2"
            >
              <span className="text-neutral-400 shrink-0">?</span>
              {kw.keyword}
            </li>
          ))}
        </ul>
      </div>

      {/* Topic clusters */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-neutral-700">
          Topic Clusters ({result.topicClusters.length})
        </h3>
        <div className="space-y-3">
          {result.topicClusters.map((cluster, i) => (
            <div key={i}>
              <p className="text-sm font-medium text-brand-black">
                {cluster.clusterName}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {cluster.keywords.map((kw, j) => (
                  <span
                    key={j}
                    className="text-xs bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      {result.notes.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-neutral-700">Notes</h3>
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
    </div>
  );
}

// ─── Blog Outline Output ─────────────────────────────────────────────────────

function BlogOutlineOutput({
  result,
  onCopy,
  copied,
  onDownload,
}: {
  result: SeoBlogOutlineResponse;
  onCopy: (text: string) => void;
  copied: boolean;
  onDownload: (text: string, filename: string) => void;
}) {
  const outlineText = [
    `# ${result.title}`,
    `Meta title: ${result.metaTitle}`,
    `Meta description: ${result.metaDescription}`,
    `Total suggested word count: ${result.totalSuggestedWordCount}`,
    "",
    ...result.sections.flatMap((s) => [
      `## ${s.heading}`,
      s.description,
      `Word count: ~${s.suggestedWordCount} | Keywords: ${s.keywordsToInclude.join(", ")}`,
      ...s.subsections.flatMap((sub) => [
        `### ${sub.heading}`,
        sub.description,
        `Word count: ~${sub.suggestedWordCount}`,
      ]),
      "",
    ]),
  ].join("\n");

  return (
    <div className="bg-white rounded-xl border border-neutral-300 p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-brand-black">
          Blog Outline
        </h2>
        <span className="text-xs text-neutral-500">
          ~{result.totalSuggestedWordCount} words total
        </span>
      </div>

      {/* Meta preview */}
      <div className="bg-neutral-50 rounded-lg p-4 space-y-1">
        <h3 className="text-sm font-semibold text-neutral-700">
          Meta Preview
        </h3>
        <p className="text-blue-700 text-base font-medium leading-tight">
          {result.metaTitle}
        </p>
        <p className="text-xs text-green-700">
          https://example.com/blog/article-slug
        </p>
        <p className="text-sm text-neutral-600">{result.metaDescription}</p>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-neutral-700">Structure</h3>
        {result.sections.map((section, i) => (
          <div
            key={i}
            className="border-l-2 border-neutral-200 pl-4 space-y-2"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-brand-black">
                H{section.level}: {section.heading}
              </p>
              <span className="text-xs text-neutral-400">
                ~{section.suggestedWordCount} words
              </span>
            </div>
            <p className="text-sm text-neutral-600">{section.description}</p>
            {section.keywordsToInclude.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {section.keywordsToInclude.map((kw, j) => (
                  <span
                    key={j}
                    className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            )}

            {/* Subsections */}
            {section.subsections.length > 0 && (
              <div className="ml-4 space-y-2 mt-2">
                {section.subsections.map((sub, j) => (
                  <div
                    key={j}
                    className="border-l border-neutral-200 pl-3"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-neutral-700">
                        H{sub.level}: {sub.heading}
                      </p>
                      <span className="text-xs text-neutral-400">
                        ~{sub.suggestedWordCount} words
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500">
                      {sub.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Internal linking suggestions */}
      {result.internalLinkingSuggestions.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-neutral-700">
            Internal Linking Suggestions
          </h3>
          <div className="space-y-1.5">
            {result.internalLinkingSuggestions.map((link, i) => (
              <div
                key={i}
                className="text-xs text-neutral-600 flex items-start gap-2"
              >
                <span className="text-neutral-400 shrink-0">--</span>
                <span>
                  <span className="font-medium text-brand-black">
                    &quot;{link.anchorText}&quot;
                  </span>{" "}
                  -&gt; {link.targetPage}{" "}
                  <span className="text-neutral-400">(in {link.section})</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {result.notes.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-neutral-700">Notes</h3>
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
          onClick={() => onCopy(outlineText)}
          className="px-4 py-2 text-sm font-semibold rounded-lg border border-neutral-300 text-brand-black hover:bg-neutral-100 transition-colors"
        >
          {copied ? "Copied!" : "Copy Outline"}
        </button>
        <button
          onClick={() =>
            onDownload(
              outlineText,
              `seo-outline-${result.title.slice(0, 30).replace(/\s+/g, "-").toLowerCase()}.md`
            )
          }
          className="px-4 py-2 text-sm font-semibold rounded-lg border border-neutral-300 text-brand-black hover:bg-neutral-100 transition-colors"
        >
          Download .md
        </button>
      </div>
    </div>
  );
}
