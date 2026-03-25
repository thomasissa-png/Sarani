"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  PRESENTATION_TYPE_LABELS,
  type PresentationOutput,
  type PresentationType,
} from "@/lib/validations/presentation";

// ─── Types ──────────────────────────────────────────────────────────────────

type HistoryEntry = {
  id: string;
  clientId: string;
  clientName: string;
  clientIndustry: string;
  inputPayload: {
    presentationType: PresentationType;
    topic: string;
    audienceDescription: string;
    slideCount: number;
    language: string;
    keyMessages: string | null;
    includeData: boolean;
  };
  outputContent: string;
  status: string;
  createdAt: string;
};

// ─── Page Component ─────────────────────────────────────────────────────────

export default function PresentationHistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/agents/presentation/history");
      if (!res.ok) {
        throw new Error("Failed to fetch history");
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
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function parseOutput(content: string): PresentationOutput | null {
    try {
      return JSON.parse(content) as PresentationOutput;
    } catch {
      return null;
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-black">
            Presentation Generator — History
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            Past generated presentations
          </p>
        </div>
        <Link
          href="/admin/agents/presentation"
          className="px-4 py-2 bg-brand-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors"
        >
          New Presentation
        </Link>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-sm text-neutral-400 py-8 text-center">
          Loading history...
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && entries.length === 0 && (
        <div className="bg-white rounded-xl border border-neutral-300 p-8 text-center">
          <p className="text-neutral-500 text-sm">
            No presentations yet. Create your first one.
          </p>
          <Link
            href="/admin/agents/presentation"
            className="inline-block mt-3 text-sm font-medium text-brand-cerulean hover:underline"
          >
            Go to Presentation Generator
          </Link>
        </div>
      )}

      {/* Entries */}
      {entries.map((entry) => {
        const isExpanded = expandedId === entry.id;
        const pres = isExpanded ? parseOutput(entry.outputContent) : null;

        return (
          <div
            key={entry.id}
            className="bg-white rounded-xl border border-neutral-300 overflow-hidden"
          >
            {/* Summary row */}
            <button
              onClick={() => toggleExpand(entry.id)}
              className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-neutral-50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-brand-black">
                    {entry.clientName}
                  </span>
                  <span className="text-xs bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded">
                    {entry.clientIndustry}
                  </span>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                    {PRESENTATION_TYPE_LABELS[entry.inputPayload.presentationType] ??
                      entry.inputPayload.presentationType}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      entry.status === "done"
                        ? "bg-green-100 text-green-700"
                        : entry.status === "error"
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {entry.status}
                  </span>
                </div>
                <p className="text-sm text-neutral-600 mt-1 truncate">
                  {entry.inputPayload.topic}
                </p>
                <div className="flex items-center gap-3 mt-1 text-xs text-neutral-400">
                  <span>{formatDate(entry.createdAt)}</span>
                  <span>{entry.inputPayload.slideCount} slides</span>
                  <span>{entry.inputPayload.language}</span>
                  <span>Audience: {entry.inputPayload.audienceDescription}</span>
                </div>
              </div>
              <span className="text-neutral-400 ml-4 shrink-0">
                {isExpanded ? "\u25B2" : "\u25BC"}
              </span>
            </button>

            {/* Expanded content */}
            {isExpanded && pres && (
              <div className="border-t border-neutral-200 px-6 py-4 space-y-4">
                {/* Title */}
                <div className="bg-neutral-50 rounded-lg px-4 py-3">
                  <p className="text-xs font-semibold text-neutral-500 mb-0.5">
                    Presentation Title
                  </p>
                  <p className="text-sm font-medium text-brand-black">
                    {pres.title}
                  </p>
                  <p className="text-sm text-neutral-500">{pres.subtitle}</p>
                </div>

                {/* Summary */}
                <div>
                  <p className="text-xs font-semibold text-neutral-500 mb-0.5">
                    Summary
                  </p>
                  <p className="text-sm text-brand-black">{pres.summary}</p>
                </div>

                {/* Slides overview */}
                <div>
                  <p className="text-xs font-semibold text-neutral-500 mb-1">
                    Slides ({pres.totalSlides})
                  </p>
                  <div className="space-y-2">
                    {pres.slides.map((slide) => (
                      <div
                        key={slide.slideNumber}
                        className="border border-neutral-200 rounded-lg px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold bg-brand-black text-white w-5 h-5 rounded-full flex items-center justify-center">
                            {slide.slideNumber}
                          </span>
                          <span className="text-sm font-medium text-brand-black">
                            {slide.title}
                          </span>
                        </div>
                        <ul className="mt-1 space-y-0.5 pl-7">
                          {slide.bullets.map((b, j) => (
                            <li
                              key={j}
                              className="text-xs text-neutral-600"
                            >
                              - {b}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {isExpanded && !pres && (
              <div className="border-t border-neutral-200 px-6 py-4">
                <p className="text-sm text-neutral-500">
                  Unable to parse presentation output.
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
