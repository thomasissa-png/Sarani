"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { CreativeRecommendation } from "@/lib/validations/creative";

// ─── Types ──────────────────────────────────────────────────────────────────

type HistoryEntry = {
  id: string;
  clientId: string;
  clientName: string;
  clientIndustry: string;
  inputPayload: {
    campaignObjective: string;
    targetMarkets: string[];
    budget: { amount: number; currency: string } | null;
    timeline: string;
    constraints: string | null;
  };
  outputContent: string;
  status: string;
  createdAt: string;
};

// ─── Page Component ─────────────────────────────────────────────────────────

export default function CreativeHistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/agents/creative/history");
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

  function parseOutput(content: string): CreativeRecommendation | null {
    try {
      return JSON.parse(content) as CreativeRecommendation;
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
            Creative Strategist — History
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            Past strategy recommendations
          </p>
        </div>
        <Link
          href="/admin/agents/creative"
          className="px-4 py-2 bg-brand-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors"
        >
          New Recommendation
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
            No recommendations yet. Create your first one.
          </p>
          <Link
            href="/admin/agents/creative"
            className="inline-block mt-3 text-sm font-medium text-brand-cerulean hover:underline"
          >
            Go to Creative Strategist
          </Link>
        </div>
      )}

      {/* Entries */}
      {entries.map((entry) => {
        const isExpanded = expandedId === entry.id;
        const rec = isExpanded ? parseOutput(entry.outputContent) : null;

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
                  {entry.inputPayload.campaignObjective}
                </p>
                <div className="flex items-center gap-3 mt-1 text-xs text-neutral-400">
                  <span>{formatDate(entry.createdAt)}</span>
                  <span>
                    Markets: {entry.inputPayload.targetMarkets.join(", ")}
                  </span>
                  {entry.inputPayload.budget && (
                    <span>
                      Budget:{" "}
                      {entry.inputPayload.budget.amount.toLocaleString()}{" "}
                      {entry.inputPayload.budget.currency}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-neutral-400 ml-4 shrink-0">
                {isExpanded ? "\u25B2" : "\u25BC"}
              </span>
            </button>

            {/* Expanded content */}
            {isExpanded && rec && (
              <div className="border-t border-neutral-200 px-6 py-4 space-y-4">
                {/* Executive Summary */}
                <div className="bg-neutral-50 rounded-lg px-4 py-3">
                  <p className="text-xs font-semibold text-neutral-500 mb-0.5">
                    Executive Summary
                  </p>
                  <p className="text-sm text-brand-black">
                    {rec.executiveSummary}
                  </p>
                </div>

                {/* Problem Statement */}
                <div>
                  <p className="text-xs font-semibold text-neutral-500 mb-0.5">
                    Problem Statement
                  </p>
                  <p className="text-sm text-brand-black">
                    {rec.problemStatement}
                  </p>
                </div>

                {/* Creative Angles summary */}
                <div>
                  <p className="text-xs font-semibold text-neutral-500 mb-1">
                    Creative Angles ({rec.creativeAngles.length})
                  </p>
                  <div className="space-y-2">
                    {rec.creativeAngles.map((angle, i) => (
                      <div
                        key={i}
                        className="border border-neutral-200 rounded-lg px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold bg-brand-black text-white w-5 h-5 rounded-full flex items-center justify-center">
                            {i + 1}
                          </span>
                          <span className="text-sm font-medium text-brand-black">
                            {angle.name}
                          </span>
                        </div>
                        <p className="text-sm text-neutral-600 mt-1">
                          {angle.concept}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Key Messages */}
                <div>
                  <p className="text-xs font-semibold text-neutral-500 mb-1">
                    Key Messages
                  </p>
                  {rec.keyMessages.map((msg, i) => (
                    <div key={i} className="text-sm text-brand-black mb-1">
                      <span
                        className={`text-xs font-medium px-1.5 py-0.5 rounded mr-1.5 ${
                          msg.type === "primary"
                            ? "bg-brand-black text-white"
                            : msg.type === "secondary"
                              ? "bg-neutral-200 text-neutral-700"
                              : "bg-green-100 text-green-700"
                        }`}
                      >
                        {msg.type === "proofPoint" ? "proof" : msg.type}
                      </span>
                      {msg.message}
                    </div>
                  ))}
                </div>

                {/* Hypotheses */}
                {rec.hypotheses.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
                    <p className="text-xs font-semibold text-amber-700 mb-0.5">
                      Hypotheses
                    </p>
                    <ul className="text-sm text-amber-800 space-y-0.5">
                      {rec.hypotheses.map((h, i) => (
                        <li key={i}>- {h}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {isExpanded && !rec && (
              <div className="border-t border-neutral-200 px-6 py-4">
                <p className="text-sm text-neutral-500">
                  Unable to parse recommendation output.
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
