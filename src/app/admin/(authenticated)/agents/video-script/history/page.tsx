"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { Client } from "@/lib/db/schema";
import {
  VIDEO_FORMAT_LABELS,
  VIDEO_PLATFORM_LABELS,
  VIDEO_TONE_LABELS,
  type VideoFormat,
  type VideoPlatform,
  type VideoTone,
  type VideoScriptResponse,
} from "@/lib/validations/video-script";

// ─── Types ──────────────────────────────────────────────────────────────────

type VideoScriptHistoryEntry = {
  id: string;
  clientId: string;
  clientName: string;
  inputPayload: {
    videoFormat: VideoFormat;
    platform: VideoPlatform;
    topic: string;
    targetAudience: string;
    tone: VideoTone;
    keyMessages: string;
    language: string;
    variantCount: number;
  };
  outputContent: string;
  status: string;
  createdAt: string;
};

// ─── Page Component ─────────────────────────────────────────────────────────

export default function VideoScriptHistoryPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [entries, setEntries] = useState<VideoScriptHistoryEntry[]>([]);
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
        `/api/admin/agents/video-script/history?${params.toString()}`
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

  function parseOutput(outputContent: string): VideoScriptResponse | null {
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
            Video Script History
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            Browse past video scripts and concepts by client
          </p>
        </div>
        <Link
          href="/admin/agents/video-script"
          className="px-4 py-2 bg-brand-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors"
        >
          New Script
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
          Loading script history...
        </div>
      )}

      {/* Empty state */}
      {!loading && entries.length === 0 && (
        <div className="bg-white rounded-xl border border-neutral-300 p-8 text-center">
          <p className="text-sm text-neutral-500">
            No video scripts found.{" "}
            <Link
              href="/admin/agents/video-script"
              className="text-brand-cerulean hover:underline font-medium"
            >
              Generate your first script
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
            const formatLabel =
              VIDEO_FORMAT_LABELS[entry.inputPayload.videoFormat] ||
              entry.inputPayload.videoFormat;
            const platformLabel =
              VIDEO_PLATFORM_LABELS[entry.inputPayload.platform] ||
              entry.inputPayload.platform;
            const toneLabel =
              VIDEO_TONE_LABELS[entry.inputPayload.tone] ||
              entry.inputPayload.tone;

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
                      {formatLabel}
                    </span>
                    <span className="text-xs font-medium bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded whitespace-nowrap">
                      {platformLabel}
                    </span>
                    <span className="text-sm text-brand-black truncate">
                      {truncate(entry.inputPayload.topic, 60)}
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
                  <div className="px-5 pb-4 border-t border-neutral-200 space-y-4 pt-4">
                    {/* Topic */}
                    <div>
                      <h4 className="text-xs font-semibold text-neutral-500 uppercase mb-1">
                        Topic
                      </h4>
                      <p className="text-sm text-neutral-700">
                        {entry.inputPayload.topic}
                      </p>
                    </div>

                    {/* Concept + Hook */}
                    <div className="bg-neutral-50 rounded-lg p-4 space-y-2">
                      <h4 className="text-xs font-semibold text-neutral-500 uppercase">
                        Concept
                      </h4>
                      <p className="text-sm text-neutral-700">
                        {output.concept}
                      </p>
                      <h4 className="text-xs font-semibold text-neutral-500 uppercase mt-2">
                        Hook
                      </h4>
                      <p className="text-sm text-brand-black font-medium">
                        {output.hook}
                      </p>
                    </div>

                    {/* Scenes preview */}
                    <div className="bg-neutral-50 rounded-lg p-4 space-y-2">
                      <h4 className="text-xs font-semibold text-neutral-500 uppercase">
                        Scenes ({output.scenes.length})
                      </h4>
                      {output.scenes.map((scene, i) => (
                        <div key={i} className="text-sm text-neutral-700">
                          <span className="font-medium">
                            Scene {scene.sceneNumber}
                          </span>{" "}
                          <span className="text-neutral-400 font-mono text-xs">
                            [{scene.duration}]
                          </span>{" "}
                          -- {scene.action}
                        </div>
                      ))}
                    </div>

                    {/* Hashtags */}
                    {output.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {output.hashtags.map((tag, j) => (
                          <span
                            key={j}
                            className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Meta */}
                    <div className="flex items-center gap-4 text-xs text-neutral-500">
                      <span>Tone: {toneLabel}</span>
                      <span>Language: {entry.inputPayload.language}</span>
                      <span>
                        Variants: {entry.inputPayload.variantCount}
                      </span>
                      <span>Duration: {output.totalDuration}</span>
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
