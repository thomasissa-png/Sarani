"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { Client } from "@/lib/db/schema";
import {
  SEO_CONTENT_TYPE_LABELS,
  SEO_LANGUAGE_LABELS,
  type SeoContentType,
  type SeoLanguage,
} from "@/lib/validations/seo";

// ─── Types ──────────────────────────────────────────────────────────────────

type SeoHistoryEntry = {
  id: string;
  clientId: string;
  clientName: string;
  inputPayload: {
    contentType: SeoContentType;
    targetKeyword: string;
    secondaryKeywords: string;
    language: SeoLanguage;
    wordCount: number;
    topic: string;
  };
  outputContent: string;
  status: string;
  createdAt: string;
};

// ─── Page Component ─────────────────────────────────────────────────────────

export default function SeoHistoryPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [entries, setEntries] = useState<SeoHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  // ── Fetch history ─────────────────────────────────────────────────────

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (selectedClientId) {
        params.set("clientId", selectedClientId);
      }
      params.set("limit", "50");

      const res = await fetch(
        `/api/admin/agents/seo/history?${params.toString()}`
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch history");
      }

      const data = await res.json();
      setEntries(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch history"
      );
    } finally {
      setLoading(false);
    }
  }, [selectedClientId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // ── Format date ───────────────────────────────────────────────────────

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // ── Truncate text ─────────────────────────────────────────────────────

  function truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + "...";
  }

  // ── Parse output ──────────────────────────────────────────────────────

  function parseOutput(outputContent: string): Record<string, unknown> | null {
    try {
      return JSON.parse(outputContent);
    } catch {
      return null;
    }
  }

  // ── Get output preview ────────────────────────────────────────────────

  function getOutputPreview(
    entry: SeoHistoryEntry
  ): string {
    const output = parseOutput(entry.outputContent);
    if (!output) return "Unable to parse output";

    const contentType = entry.inputPayload.contentType;

    switch (contentType) {
      case "article": {
        const title = (output as { title?: string }).title;
        return title || "Article generated";
      }
      case "meta-description": {
        const variants = (output as { variants?: { text: string }[] }).variants;
        return variants?.[0]?.text || "Meta descriptions generated";
      }
      case "keyword-research": {
        const count = (
          output as { longTailKeywords?: unknown[] }
        ).longTailKeywords?.length;
        return `${count || 0} keywords identified`;
      }
      case "blog-outline": {
        const title = (output as { title?: string }).title;
        return title || "Blog outline generated";
      }
      default:
        return "Content generated";
    }
  }

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-black">
            SEO History
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            Browse past SEO content generations by client
          </p>
        </div>
        <Link
          href="/admin/agents/seo"
          className="px-4 py-2 bg-brand-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors"
        >
          New SEO Content
        </Link>
      </div>

      {/* Client filter */}
      <div className="bg-white rounded-xl border border-neutral-300 p-4">
        <label
          htmlFor="filterClient"
          className="block text-sm font-medium text-neutral-700 mb-1.5"
        >
          Filter by client
        </label>
        {loadingClients ? (
          <div className="text-sm text-neutral-400">Loading clients...</div>
        ) : (
          <select
            id="filterClient"
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="w-full max-w-sm px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
          >
            <option value="">All clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.industry})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-sm text-neutral-500 py-8 text-center">
          Loading SEO history...
        </div>
      )}

      {/* Empty state */}
      {!loading && entries.length === 0 && (
        <div className="bg-white rounded-xl border border-neutral-300 p-8 text-center">
          <p className="text-sm text-neutral-500">
            No SEO content found.{" "}
            <Link
              href="/admin/agents/seo"
              className="text-brand-cerulean hover:underline font-medium"
            >
              Generate your first SEO content
            </Link>
          </p>
        </div>
      )}

      {/* Entries list */}
      {!loading && entries.length > 0 && (
        <div className="space-y-3">
          {entries.map((entry) => {
            const isExpanded = expandedId === entry.id;
            const contentTypeLabel =
              SEO_CONTENT_TYPE_LABELS[entry.inputPayload.contentType] ||
              entry.inputPayload.contentType;
            const languageLabel =
              SEO_LANGUAGE_LABELS[entry.inputPayload.language] ||
              entry.inputPayload.language;

            return (
              <div
                key={entry.id}
                className="bg-white rounded-xl border border-neutral-300 overflow-hidden"
              >
                {/* Header row (clickable) */}
                <button
                  type="button"
                  onClick={() =>
                    setExpandedId(isExpanded ? null : entry.id)
                  }
                  className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-neutral-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-medium bg-neutral-200 text-neutral-700 px-2 py-0.5 rounded whitespace-nowrap">
                      {contentTypeLabel}
                    </span>
                    <span className="text-sm text-brand-black truncate">
                      {entry.inputPayload.targetKeyword}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <span className="text-xs text-neutral-500">
                      {entry.clientName}
                    </span>
                    <span className="text-xs text-neutral-400">
                      {languageLabel}
                    </span>
                    <span className="text-xs text-neutral-400">
                      {formatDate(entry.createdAt)}
                    </span>
                    <span
                      className={`text-xs transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    >
                      v
                    </span>
                  </div>
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-5 pb-4 border-t border-neutral-200 space-y-4 pt-4">
                    {/* Input summary */}
                    <div>
                      <h4 className="text-xs font-semibold text-neutral-500 uppercase mb-1">
                        Input
                      </h4>
                      <div className="text-sm text-neutral-700 bg-neutral-50 rounded-lg p-3 space-y-1">
                        <p>
                          <span className="font-medium">Keyword:</span>{" "}
                          {entry.inputPayload.targetKeyword}
                        </p>
                        {entry.inputPayload.secondaryKeywords && (
                          <p>
                            <span className="font-medium">Secondary:</span>{" "}
                            {entry.inputPayload.secondaryKeywords}
                          </p>
                        )}
                        <p>
                          <span className="font-medium">Topic:</span>{" "}
                          {truncate(entry.inputPayload.topic, 200)}
                        </p>
                        {entry.inputPayload.contentType === "article" && (
                          <p>
                            <span className="font-medium">Word count:</span>{" "}
                            {entry.inputPayload.wordCount}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Output preview */}
                    <div>
                      <h4 className="text-xs font-semibold text-neutral-500 uppercase mb-1">
                        Output
                      </h4>
                      <p className="text-sm text-neutral-700 bg-neutral-50 rounded-lg p-3 max-h-48 overflow-y-auto whitespace-pre-wrap">
                        {getOutputPreview(entry)}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-neutral-500">
                      <span>Status: {entry.status}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
