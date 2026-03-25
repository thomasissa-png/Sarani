"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { ProposalResponse } from "@/lib/validations/proposal";

// ─── Types ──────────────────────────────────────────────────────────────────

type HistoryEntry = {
  id: string;
  inputPayload: {
    prospectName: string;
    prospectIndustry: string | null;
    prospectNeeds: string | null;
    estimatedBudget: string | null;
    timeline: string | null;
    servicesRequested: string[];
    language: string;
    competitorMentioned: string | null;
  };
  outputContent: string;
  status: string;
  createdAt: string;
};

// ─── Page Component ─────────────────────────────────────────────────────────

export default function ProposalHistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/agents/proposal/history");
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

  function parseOutput(content: string): ProposalResponse | null {
    try {
      return JSON.parse(content) as ProposalResponse;
    } catch {
      return null;
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-black">
            Proposal Generator — History
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            Past proposals generated for prospects
          </p>
        </div>
        <Link
          href="/admin/agents/proposal"
          className="px-4 py-2 bg-brand-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors"
        >
          New Proposal
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
            No proposals generated yet. Create your first one.
          </p>
          <Link
            href="/admin/agents/proposal"
            className="inline-block mt-3 text-sm font-medium text-brand-cerulean hover:underline"
          >
            Go to Proposal Generator
          </Link>
        </div>
      )}

      {/* Entries */}
      {entries.map((entry) => {
        const isExpanded = expandedId === entry.id;
        const proposal = isExpanded ? parseOutput(entry.outputContent) : null;

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
                    {entry.inputPayload.prospectName}
                  </span>
                  {entry.inputPayload.prospectIndustry && (
                    <span className="text-xs bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded">
                      {entry.inputPayload.prospectIndustry}
                    </span>
                  )}
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                    {entry.inputPayload.language}
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
                {entry.inputPayload.prospectNeeds && (
                  <p className="text-sm text-neutral-600 mt-1 truncate">
                    {entry.inputPayload.prospectNeeds}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-1 text-xs text-neutral-400">
                  <span>{formatDate(entry.createdAt)}</span>
                  <span>
                    Services:{" "}
                    {entry.inputPayload.servicesRequested.join(", ")}
                  </span>
                  {entry.inputPayload.estimatedBudget && (
                    <span>
                      Budget: {entry.inputPayload.estimatedBudget}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-neutral-400 ml-4 shrink-0">
                {isExpanded ? "\u25B2" : "\u25BC"}
              </span>
            </button>

            {/* Expanded content */}
            {isExpanded && proposal && (
              <div className="border-t border-neutral-200 px-6 py-4 space-y-4">
                {/* Executive Summary */}
                <div className="bg-neutral-50 rounded-lg px-4 py-3">
                  <p className="text-xs font-semibold text-neutral-500 mb-0.5">
                    Executive Summary
                  </p>
                  <p className="text-sm text-brand-black">
                    {proposal.executiveSummary}
                  </p>
                </div>

                {/* Client Understanding */}
                <div>
                  <p className="text-xs font-semibold text-neutral-500 mb-0.5">
                    Client Understanding
                  </p>
                  <p className="text-sm text-brand-black">
                    {proposal.clientUnderstanding}
                  </p>
                </div>

                {/* Case Studies */}
                <div>
                  <p className="text-xs font-semibold text-neutral-500 mb-1">
                    Case Studies ({proposal.relevantCaseStudies.length})
                  </p>
                  <div className="space-y-2">
                    {proposal.relevantCaseStudies.map((cs, i) => (
                      <div
                        key={i}
                        className="border border-neutral-200 rounded-lg px-3 py-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-brand-black">
                            {cs.client} — {cs.deliverable}
                          </span>
                          <span className="text-xs font-medium bg-neutral-200 text-neutral-700 px-2 py-0.5 rounded">
                            {cs.keyMetric}
                          </span>
                        </div>
                        <p className="text-sm text-neutral-600 mt-1">
                          {cs.relevanceExplanation}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Why Sarani */}
                <div>
                  <p className="text-xs font-semibold text-neutral-500 mb-1">
                    Why Sarani
                  </p>
                  <ul className="text-sm text-brand-black space-y-0.5">
                    {proposal.whySarani.map((w, i) => (
                      <li key={i}>- {w}</li>
                    ))}
                  </ul>
                </div>

                {/* Hypotheses */}
                {proposal.hypotheses.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
                    <p className="text-xs font-semibold text-amber-700 mb-0.5">
                      Hypotheses
                    </p>
                    <ul className="text-sm text-amber-800 space-y-0.5">
                      {proposal.hypotheses.map((h, i) => (
                        <li key={i}>- {h}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {isExpanded && !proposal && (
              <div className="border-t border-neutral-200 px-6 py-4">
                <p className="text-sm text-neutral-500">
                  Unable to parse proposal output.
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
