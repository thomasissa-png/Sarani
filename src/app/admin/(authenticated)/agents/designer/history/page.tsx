"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { Client } from "@/lib/db/schema";
import {
  ASSET_TYPE_LABELS,
  STYLE_LABELS,
  PLATFORM_LABELS,
  type AssetType,
  type DesignStyle,
  type DesignPlatform,
  type DesignerResponse,
} from "@/lib/validations/designer";

// ─── Types ──────────────────────────────────────────────────────────────────

type DesignHistoryEntry = {
  id: string;
  clientId: string;
  clientName: string;
  inputPayload: {
    assetType: AssetType;
    dimensions: string;
    quantity: number;
    briefDescription: string;
    style: DesignStyle;
    platform: DesignPlatform;
  };
  outputContent: string;
  status: string;
  createdAt: string;
};

// ─── Page Component ─────────────────────────────────────────────────────────

export default function DesignerHistoryPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [entries, setEntries] = useState<DesignHistoryEntry[]>([]);
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
        `/api/admin/agents/designer/history?${params.toString()}`
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

  // ── Helpers ─────────────────────────────────────────────────────────────

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

  function truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + "...";
  }

  function parseOutput(
    outputContent: string
  ): DesignerResponse | null {
    try {
      return JSON.parse(outputContent);
    } catch {
      return null;
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-black">
            Design History
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            Browse past design briefs and image prompts
          </p>
        </div>
        <Link
          href="/admin/agents/designer"
          className="px-4 py-2 bg-brand-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors"
        >
          New Design Brief
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
          Loading design briefs...
        </div>
      )}

      {/* Empty state */}
      {!loading && entries.length === 0 && (
        <div className="bg-white rounded-xl border border-neutral-300 p-8 text-center">
          <p className="text-sm text-neutral-500">
            No design briefs found.{" "}
            <Link
              href="/admin/agents/designer"
              className="text-brand-cerulean hover:underline font-medium"
            >
              Create your first design brief
            </Link>
          </p>
        </div>
      )}

      {/* Entries list */}
      {!loading && entries.length > 0 && (
        <div className="space-y-3">
          {entries.map((entry) => {
            const isExpanded = expandedId === entry.id;
            const output = parseOutput(entry.outputContent);
            const assetLabel =
              ASSET_TYPE_LABELS[entry.inputPayload.assetType] ||
              entry.inputPayload.assetType;
            const styleLabel =
              STYLE_LABELS[entry.inputPayload.style] ||
              entry.inputPayload.style;
            const platformLabel =
              PLATFORM_LABELS[entry.inputPayload.platform] ||
              entry.inputPayload.platform;

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
                      {assetLabel}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {styleLabel} | {platformLabel} |{" "}
                      {entry.inputPayload.dimensions}
                    </span>
                    <span className="text-sm text-brand-black truncate">
                      {truncate(entry.inputPayload.briefDescription, 60)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <span className="text-xs text-neutral-500">
                      {entry.clientName}
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
                {isExpanded && output && (
                  <div className="px-5 pb-5 border-t border-neutral-200 space-y-4 pt-4">
                    {/* Brief summary */}
                    <div>
                      <h4 className="text-sm font-semibold text-brand-black mb-1">
                        {output.creativeBrief.projectTitle}
                      </h4>
                      <p className="text-sm text-neutral-600">
                        {output.creativeBrief.objective}
                      </p>
                    </div>

                    {/* Prompts */}
                    <div>
                      <h4 className="text-xs font-semibold text-neutral-500 uppercase mb-2">
                        Image Prompts ({output.imagePrompts.length})
                      </h4>
                      <div className="space-y-2">
                        {output.imagePrompts.map((prompt) => (
                          <div
                            key={prompt.promptIndex}
                            className="text-sm text-neutral-700 bg-neutral-50 rounded-lg p-3"
                          >
                            <span className="font-medium">
                              #{prompt.promptIndex} {prompt.title}
                            </span>
                            <p className="text-xs text-neutral-500 mt-1 line-clamp-2">
                              {prompt.prompt}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Color palette preview */}
                    <div>
                      <h4 className="text-xs font-semibold text-neutral-500 uppercase mb-2">
                        Palette
                      </h4>
                      <div className="flex items-center gap-1">
                        <div
                          className="w-8 h-8 rounded border border-neutral-200"
                          style={{
                            backgroundColor:
                              output.colorPalette.primary.hex,
                          }}
                          title={`Primary: ${output.colorPalette.primary.hex}`}
                        />
                        {output.colorPalette.secondary.map(
                          (entry, i) => (
                            <div
                              key={i}
                              className="w-8 h-8 rounded border border-neutral-200"
                              style={{
                                backgroundColor: entry.hex,
                              }}
                              title={`Secondary: ${entry.hex}`}
                            />
                          )
                        )}
                        <div
                          className="w-8 h-8 rounded border border-neutral-200"
                          style={{
                            backgroundColor:
                              output.colorPalette.accent.hex,
                          }}
                          title={`Accent: ${output.colorPalette.accent.hex}`}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-neutral-500">
                      <span>
                        Variations: {entry.inputPayload.quantity}
                      </span>
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
