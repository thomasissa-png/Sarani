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

type FormState = {
  clientId: string;
  contentType: SeoContentType;
  targetKeyword: string;
  secondaryKeywords: string;
  language: SeoLanguage;
  wordCount: number;
  topic: string;
};

const STEPS = ["Select Client", "Configure", "Review & Generate"];

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
    targetKeyword: "",
    secondaryKeywords: "",
    language: "EN",
    wordCount: 1000,
    topic: "",
  });

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
      !!form.targetKeyword.trim() &&
      form.topic.length >= 30
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
          targetKeyword: form.targetKeyword,
          secondaryKeywords: form.secondaryKeywords,
          language: form.language,
          wordCount: form.wordCount,
          topic: form.topic,
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
      { label: "Target Keyword", value: form.targetKeyword || "---" },
      ...(form.secondaryKeywords
        ? [{ label: "Secondary Keywords", value: form.secondaryKeywords }]
        : []),
      { label: "Language", value: SEO_LANGUAGE_LABELS[form.language] },
      ...(form.contentType === "article"
        ? [{ label: "Word Count", value: `${form.wordCount.toLocaleString()} words` }]
        : []),
      {
        label: "Topic",
        value:
          form.topic.length > 80
            ? form.topic.slice(0, 80) + "..."
            : form.topic,
      },
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

            {/* Target keyword */}
            <FormField
              label="Target Keyword"
              required
              helperText="The primary keyword you want to rank for. Use 2-4 words for best results."
            >
              <input
                type="text"
                value={form.targetKeyword}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    targetKeyword: e.target.value,
                  }))
                }
                placeholder="e.g. creative agency international"
                className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
              />
            </FormField>

            {/* Secondary keywords */}
            <FormField
              label="Secondary Keywords"
              helperText="Comma-separated list of supporting keywords to include naturally in the content."
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
                placeholder="e.g. global creative production, multilingual design, cross-market campaigns"
                className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
              />
            </FormField>

            {/* Word count (only for articles) */}
            {form.contentType === "article" && (
              <FormField
                label="Target Word Count"
                helperText="Longer articles (1500+) tend to rank better for competitive keywords."
              >
                <select
                  value={form.wordCount}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      wordCount: Number(e.target.value),
                    }))
                  }
                  className="w-full max-w-xs px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                >
                  {WORD_COUNT_OPTIONS.map((wc) => (
                    <option key={wc} value={wc}>
                      {wc.toLocaleString()} words
                    </option>
                  ))}
                </select>
              </FormField>
            )}

            {/* Topic / brief */}
            <FormField
              label="Topic / Brief"
              required
              helperText="Describe the angle, target audience, and key points. The more context you provide, the better the output."
            >
              <TextareaWithCount
                value={form.topic}
                onChange={(val) =>
                  setForm((prev) => ({ ...prev, topic: val }))
                }
                placeholder="e.g. Why international brands need a 24/7 creative agency — speed, quality, and cost advantages"
                minLength={30}
                rows={5}
              />
            </FormField>

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
