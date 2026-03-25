"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { Client } from "@/lib/db/schema";
import {
  CONTENT_TYPES,
  CONTENT_TYPE_LABELS,
  PROOFREADER_LANGUAGES,
  PROOFREADER_LANGUAGE_LABELS,
  type ContentType,
  type ProofreaderLanguage,
  type ProofreadResponse,
  type ProofreadIssue,
} from "@/lib/validations/proofreader";

// ─── Types ──────────────────────────────────────────────────────────────────

type ReviewApiResponse = {
  review: ProofreadResponse;
  outputId: string | null;
  usage: { inputTokens: number; outputTokens: number };
};

type FormState = {
  clientId: string;
  contentToReview: string;
  contentType: ContentType;
  sourceLanguage: ProofreaderLanguage;
  checkBrand: boolean;
  checkGlossary: boolean;
};

type ActiveTab = "issues" | "improved" | "brand" | "glossary";

// ─── Helpers ────────────────────────────────────────────────────────────────

function getScoreColor(score: number): string {
  if (score >= 8) return "text-green-600";
  if (score >= 5) return "text-yellow-600";
  return "text-red-600";
}

function getScoreBg(score: number): string {
  if (score >= 8) return "bg-green-50 border-green-200";
  if (score >= 5) return "bg-yellow-50 border-yellow-200";
  return "bg-red-50 border-red-200";
}

function getScoreBarColor(score: number): string {
  if (score >= 8) return "bg-green-500";
  if (score >= 5) return "bg-yellow-500";
  return "bg-red-500";
}

function getSeverityBadge(severity: ProofreadIssue["severity"]): string {
  switch (severity) {
    case "error":
      return "bg-red-100 text-red-700 border-red-200";
    case "warning":
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    case "suggestion":
      return "bg-blue-100 text-blue-700 border-blue-200";
  }
}

function getTypeBadge(type: ProofreadIssue["type"]): string {
  switch (type) {
    case "spelling":
    case "grammar":
    case "punctuation":
      return "bg-neutral-100 text-neutral-700";
    case "style":
    case "tone":
      return "bg-purple-100 text-purple-700";
    case "terminology":
    case "brand":
      return "bg-orange-100 text-orange-700";
    case "consistency":
    case "formatting":
      return "bg-neutral-100 text-neutral-600";
    case "factual":
      return "bg-red-100 text-red-700";
  }
}

// ─── Page Component ─────────────────────────────────────────────────────────

export default function ProofreaderPage() {
  // Clients data
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);

  // Form state
  const [form, setForm] = useState<FormState>({
    clientId: "",
    contentToReview: "",
    contentType: "translation",
    sourceLanguage: "EN",
    checkBrand: false,
    checkGlossary: false,
  });

  // Review state
  const [reviewing, setReviewing] = useState(false);
  const [result, setResult] = useState<ProofreadResponse | null>(null);
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

  // Enable/disable brand and glossary checks based on client selection
  useEffect(() => {
    if (!form.clientId) {
      setForm((prev) => ({
        ...prev,
        checkBrand: false,
        checkGlossary: false,
      }));
    }
  }, [form.clientId]);

  // ── Handle review ─────────────────────────────────────────────────────

  async function handleReview(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!form.contentToReview.trim()) {
      setError("Please enter content to review.");
      return;
    }

    setReviewing(true);

    try {
      const res = await fetch("/api/admin/agents/proofreader/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: form.clientId || undefined,
          contentToReview: form.contentToReview,
          contentType: form.contentType,
          sourceLanguage: form.sourceLanguage,
          checkBrand: form.checkBrand,
          checkGlossary: form.checkGlossary,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Review failed");
      }

      const data: ReviewApiResponse = await res.json();
      setResult(data.review);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to review content"
      );
    } finally {
      setReviewing(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-black">
            QA / Proofreader
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            Review content for spelling, grammar, style, brand consistency, and
            glossary compliance
          </p>
        </div>
        <Link
          href="/admin/agents/proofreader/history"
          className="px-4 py-2 bg-white border border-neutral-300 text-sm font-semibold rounded-lg hover:bg-neutral-100 transition-colors text-brand-black"
        >
          History
        </Link>
      </div>

      {/* Review Form */}
      <form
        onSubmit={handleReview}
        className="bg-white rounded-xl border border-neutral-300 p-6 space-y-5"
      >
        <h2 className="text-lg font-semibold text-brand-black">New Review</h2>

        {/* Client select (optional) */}
        <div>
          <label
            htmlFor="client"
            className="block text-sm font-medium text-neutral-700 mb-1.5"
          >
            Client{" "}
            <span className="text-neutral-400 font-normal">
              (optional -- enables brand & glossary checks)
            </span>
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
              <option value="">No client (language check only)</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.industry})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Content type + Language */}
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
          </div>
          <div>
            <label
              htmlFor="sourceLanguage"
              className="block text-sm font-medium text-neutral-700 mb-1.5"
            >
              Language
            </label>
            <select
              id="sourceLanguage"
              value={form.sourceLanguage}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  sourceLanguage: e.target.value as ProofreaderLanguage,
                }))
              }
              className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
            >
              {PROOFREADER_LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {PROOFREADER_LANGUAGE_LABELS[lang]} ({lang})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content to review */}
        <div>
          <label
            htmlFor="contentToReview"
            className="block text-sm font-medium text-neutral-700 mb-1.5"
          >
            Content to review
          </label>
          <textarea
            id="contentToReview"
            value={form.contentToReview}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                contentToReview: e.target.value,
              }))
            }
            placeholder="Paste the content you want to review..."
            rows={10}
            className="w-full px-4 py-3 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent resize-y"
          />
          <p className="text-xs text-neutral-400 mt-1">
            {form.contentToReview.length.toLocaleString()} characters
          </p>
        </div>

        {/* Options */}
        <div className="flex items-center gap-6">
          <label
            className={`flex items-center gap-2 text-sm cursor-pointer ${
              form.clientId
                ? "text-neutral-700"
                : "text-neutral-400 cursor-not-allowed"
            }`}
          >
            <input
              type="checkbox"
              checked={form.checkBrand}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  checkBrand: e.target.checked,
                }))
              }
              disabled={!form.clientId}
              className="rounded border-neutral-300"
            />
            Check brand consistency
          </label>
          <label
            className={`flex items-center gap-2 text-sm cursor-pointer ${
              form.clientId
                ? "text-neutral-700"
                : "text-neutral-400 cursor-not-allowed"
            }`}
          >
            <input
              type="checkbox"
              checked={form.checkGlossary}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  checkGlossary: e.target.checked,
                }))
              }
              disabled={!form.clientId}
              className="rounded border-neutral-300"
            />
            Check glossary compliance
          </label>
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
            disabled={reviewing}
            className="px-6 py-2.5 bg-brand-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {reviewing ? "Reviewing..." : "Review Content"}
          </button>
        </div>
      </form>

      {/* Review Result */}
      {result && <ReviewOutput result={result} />}
    </div>
  );
}

// ─── Review Output Component ────────────────────────────────────────────────

function ReviewOutput({ result }: { result: ProofreadResponse }) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("issues");
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(result.improvedVersion);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const errorCount = result.issues.filter((i) => i.severity === "error").length;
  const warningCount = result.issues.filter(
    (i) => i.severity === "warning"
  ).length;
  const suggestionCount = result.issues.filter(
    (i) => i.severity === "suggestion"
  ).length;

  const tabs: { key: ActiveTab; label: string }[] = [
    {
      key: "issues",
      label: `Issues (${result.issues.length})`,
    },
    { key: "improved", label: "Improved Version" },
    { key: "brand", label: "Brand" },
    { key: "glossary", label: "Glossary" },
  ];

  return (
    <div className="bg-white rounded-xl border border-neutral-300 p-6 space-y-5">
      {/* Score header */}
      <div className="flex items-start justify-between">
        <h2 className="text-lg font-semibold text-brand-black">
          Review Results
        </h2>
        <div
          className={`flex items-center gap-3 px-4 py-2 rounded-lg border ${getScoreBg(result.overallScore)}`}
        >
          <span className="text-sm font-medium text-neutral-600">
            Overall Score
          </span>
          <span
            className={`text-2xl font-bold ${getScoreColor(result.overallScore)}`}
          >
            {result.overallScore}
          </span>
          <span className="text-sm text-neutral-400">/10</span>
        </div>
      </div>

      {/* Score bar */}
      <div className="w-full bg-neutral-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${getScoreBarColor(result.overallScore)}`}
          style={{ width: `${result.overallScore * 10}%` }}
        />
      </div>

      {/* Summary */}
      <p className="text-sm text-neutral-600 bg-neutral-50 rounded-lg p-3">
        {result.summary}
      </p>

      {/* Issue counts */}
      <div className="flex items-center gap-4">
        {errorCount > 0 && (
          <span className="text-xs font-medium bg-red-100 text-red-700 px-2.5 py-1 rounded-full">
            {errorCount} error{errorCount > 1 ? "s" : ""}
          </span>
        )}
        {warningCount > 0 && (
          <span className="text-xs font-medium bg-yellow-100 text-yellow-700 px-2.5 py-1 rounded-full">
            {warningCount} warning{warningCount > 1 ? "s" : ""}
          </span>
        )}
        {suggestionCount > 0 && (
          <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">
            {suggestionCount} suggestion{suggestionCount > 1 ? "s" : ""}
          </span>
        )}
        {result.issues.length === 0 && (
          <span className="text-xs font-medium bg-green-100 text-green-700 px-2.5 py-1 rounded-full">
            No issues found
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-neutral-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-brand-black text-brand-black"
                : "border-transparent text-neutral-500 hover:text-neutral-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "issues" && <IssuesList issues={result.issues} />}
      {activeTab === "improved" && (
        <ImprovedVersion
          text={result.improvedVersion}
          onCopy={handleCopy}
          copied={copied}
        />
      )}
      {activeTab === "brand" && (
        <BrandConsistencyPanel data={result.brandConsistency} />
      )}
      {activeTab === "glossary" && (
        <GlossaryCompliancePanel data={result.glossaryCompliance} />
      )}
    </div>
  );
}

// ─── Issues List ────────────────────────────────────────────────────────────

function IssuesList({ issues }: { issues: ProofreadIssue[] }) {
  if (issues.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-neutral-500">
        No issues found. The content looks great!
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {issues.map((issue, i) => (
        <div
          key={i}
          className="border border-neutral-200 rounded-lg p-4 space-y-2"
        >
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded border ${getSeverityBadge(issue.severity)}`}
            >
              {issue.severity}
            </span>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded ${getTypeBadge(issue.type)}`}
            >
              {issue.type}
            </span>
          </div>
          <div className="flex items-start gap-3 text-sm">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-red-600 line-through bg-red-50 px-1.5 py-0.5 rounded text-xs">
                  {issue.original}
                </span>
                <span className="text-neutral-400">-&gt;</span>
                <span className="text-green-700 bg-green-50 px-1.5 py-0.5 rounded text-xs">
                  {issue.suggestion}
                </span>
              </div>
              <p className="text-neutral-600 text-xs">{issue.explanation}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Improved Version ───────────────────────────────────────────────────────

function ImprovedVersion({
  text,
  onCopy,
  copied,
}: {
  text: string;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="bg-neutral-50 rounded-lg p-4">
        <pre className="text-sm text-brand-black whitespace-pre-wrap font-sans leading-relaxed">
          {text}
        </pre>
      </div>
      <div className="flex justify-end">
        <button
          onClick={onCopy}
          className="px-4 py-2 text-sm font-semibold rounded-lg border border-neutral-300 text-brand-black hover:bg-neutral-100 transition-colors"
        >
          {copied ? "Copied!" : "Copy Improved Version"}
        </button>
      </div>
    </div>
  );
}

// ─── Brand Consistency Panel ────────────────────────────────────────────────

function BrandConsistencyPanel({
  data,
}: {
  data: ProofreadResponse["brandConsistency"];
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-neutral-600">
          Brand Consistency Score
        </span>
        <span className={`text-xl font-bold ${getScoreColor(data.score)}`}>
          {data.score}
        </span>
        <span className="text-sm text-neutral-400">/10</span>
      </div>
      <div className="w-full bg-neutral-200 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full transition-all ${getScoreBarColor(data.score)}`}
          style={{ width: `${data.score * 10}%` }}
        />
      </div>
      {data.notes.length > 0 && (
        <ul className="space-y-1">
          {data.notes.map((note, i) => (
            <li
              key={i}
              className="text-sm text-neutral-600 flex items-start gap-2"
            >
              <span className="text-neutral-400 shrink-0">--</span>
              {note}
            </li>
          ))}
        </ul>
      )}
      {data.notes.length === 0 && (
        <p className="text-sm text-neutral-500">No brand notes.</p>
      )}
    </div>
  );
}

// ─── Glossary Compliance Panel ──────────────────────────────────────────────

function GlossaryCompliancePanel({
  data,
}: {
  data: ProofreadResponse["glossaryCompliance"];
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-neutral-600">
          Glossary Compliance Score
        </span>
        <span className={`text-xl font-bold ${getScoreColor(data.score)}`}>
          {data.score}
        </span>
        <span className="text-sm text-neutral-400">/10</span>
      </div>
      <div className="w-full bg-neutral-200 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full transition-all ${getScoreBarColor(data.score)}`}
          style={{ width: `${data.score * 10}%` }}
        />
      </div>
      {data.violations.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-neutral-500 uppercase">
            Violations ({data.violations.length})
          </h4>
          {data.violations.map((v, i) => (
            <div
              key={i}
              className="border border-orange-200 bg-orange-50 rounded-lg p-3 text-sm space-y-1"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-orange-800">
                  {v.term}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                  Found: {v.found}
                </span>
                <span className="text-neutral-400">-&gt;</span>
                <span className="text-green-700 bg-green-50 px-1.5 py-0.5 rounded">
                  Expected: {v.expected}
                </span>
              </div>
              <p className="text-xs text-neutral-500">
                Location: {v.location}
              </p>
            </div>
          ))}
        </div>
      )}
      {data.violations.length === 0 && (
        <p className="text-sm text-neutral-500">No glossary violations.</p>
      )}
    </div>
  );
}
