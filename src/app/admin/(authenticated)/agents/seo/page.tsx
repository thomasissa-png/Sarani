"use client";

import { useEffect, useState, useCallback } from "react";
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

// ─── Page Component ─────────────────────────────────────────────────────────

export default function SeoPage() {
  // Clients data
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);

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
    setResultType(null);
    setCopied(false);

    if (!form.clientId) {
      setError("Please select a client.");
      return;
    }

    if (!form.targetKeyword.trim()) {
      setError("Please enter a target keyword.");
      return;
    }

    if (!form.topic.trim()) {
      setError("Please enter a topic or brief.");
      return;
    }

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
      <form
        onSubmit={handleGenerate}
        className="bg-white rounded-xl border border-neutral-300 p-6 space-y-5"
      >
        <h2 className="text-lg font-semibold text-brand-black">
          New SEO Content
        </h2>

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

        {/* Content type and language */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="contentType"
              className="block text-sm font-medium text-neutral-700 mb-1.5"
            >
              Content Type
            </label>
            <select
              id="contentType"
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
          </div>
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
          </div>
        </div>

        {/* Target keyword */}
        <div>
          <label
            htmlFor="targetKeyword"
            className="block text-sm font-medium text-neutral-700 mb-1.5"
          >
            Target Keyword <span className="text-red-500">*</span>
          </label>
          <input
            id="targetKeyword"
            type="text"
            value={form.targetKeyword}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, targetKeyword: e.target.value }))
            }
            placeholder="e.g. best project management tools"
            className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
          />
        </div>

        {/* Secondary keywords */}
        <div>
          <label
            htmlFor="secondaryKeywords"
            className="block text-sm font-medium text-neutral-700 mb-1.5"
          >
            Secondary Keywords{" "}
            <span className="text-neutral-400 font-normal">
              (comma-separated)
            </span>
          </label>
          <input
            id="secondaryKeywords"
            type="text"
            value={form.secondaryKeywords}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                secondaryKeywords: e.target.value,
              }))
            }
            placeholder="e.g. task management, team collaboration, productivity software"
            className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
          />
        </div>

        {/* Word count (only for articles) */}
        {form.contentType === "article" && (
          <div>
            <label
              htmlFor="wordCount"
              className="block text-sm font-medium text-neutral-700 mb-1.5"
            >
              Target Word Count
            </label>
            <select
              id="wordCount"
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
          </div>
        )}

        {/* Topic / brief */}
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
            placeholder="Describe the topic, target audience, key points to cover, and any specific requirements..."
            rows={5}
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
            {generating ? "Generating..." : "Generate"}
          </button>
        </div>
      </form>

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
