"use client";

import { useEffect, useState, useCallback } from "react";
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

// ─── Page Component ─────────────────────────────────────────────────────────

export default function CopywriterPage() {
  // Clients data
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);

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
      setError("Please enter a topic or brief.");
      return;
    }

    if (!form.targetAudience.trim()) {
      setError("Please describe the target audience.");
      return;
    }

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
      <form
        onSubmit={handleGenerate}
        className="bg-white rounded-xl border border-neutral-300 p-6 space-y-5"
      >
        <h2 className="text-lg font-semibold text-brand-black">
          New Content
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
              <option value="">Select a client...</option>
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
              Content Type <span className="text-red-500">*</span>
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
              htmlFor="language"
              className="block text-sm font-medium text-neutral-700 mb-1.5"
            >
              Language <span className="text-red-500">*</span>
            </label>
            <select
              id="language"
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
          </div>
        </div>

        {/* Topic textarea */}
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
            placeholder="Describe what the content should be about..."
            rows={4}
            className="w-full px-4 py-3 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent resize-y"
          />
        </div>

        {/* Target audience */}
        <div>
          <label
            htmlFor="targetAudience"
            className="block text-sm font-medium text-neutral-700 mb-1.5"
          >
            Target Audience <span className="text-red-500">*</span>
          </label>
          <input
            id="targetAudience"
            type="text"
            value={form.targetAudience}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, targetAudience: e.target.value }))
            }
            placeholder="e.g., CMOs at mid-size SaaS companies, luxury retail consumers aged 25-40..."
            className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
          />
        </div>

        {/* Key messages */}
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
            placeholder="List the key points or messages to include..."
            rows={3}
            className="w-full px-4 py-3 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent resize-y"
          />
        </div>

        {/* Tone override + Variant count */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="tone"
              className="block text-sm font-medium text-neutral-700 mb-1.5"
            >
              Tone Override{" "}
              <span className="text-neutral-400 font-normal">(optional)</span>
            </label>
            <input
              id="tone"
              type="text"
              value={form.tone}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, tone: e.target.value }))
              }
              placeholder="e.g., Urgent and bold, Warm and conversational..."
              className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
            />
          </div>
          <div>
            <label
              htmlFor="variantCount"
              className="block text-sm font-medium text-neutral-700 mb-1.5"
            >
              Variants (1-5)
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
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n === 1 ? "1 (primary only)" : `${n} (primary + ${n - 1} variants)`}
                </option>
              ))}
            </select>
          </div>
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
