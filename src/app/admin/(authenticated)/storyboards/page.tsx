"use client";

import { useEffect, useState, useCallback } from "react";
import type { Client } from "@/lib/db/schema";

// ─── Types ──────────────────────────────────────────────────────────────────

type StoryboardRow = {
  id: string;
  clientId: string | null;
  clientName: string | null;
  title: string;
  status: string;
  shareToken: string | null;
  shareExpiresAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  scenesCount: number;
};

type SceneInput = {
  description: string;
  cameraDirection: string;
  mood: string;
};

const STATUSES = [
  "all",
  "draft",
  "generating",
  "ready",
  "shared",
  "approved",
  "rejected",
] as const;

type StatusFilter = (typeof STATUSES)[number];

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: "All",
  draft: "Draft",
  generating: "Generating",
  ready: "Ready",
  shared: "Shared",
  approved: "Approved",
  rejected: "Rejected",
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function getStatusBadgeClasses(status: string): string {
  switch (status) {
    case "draft":
      return "bg-neutral-200 text-neutral-600";
    case "generating":
      return "bg-yellow-100 text-yellow-700";
    case "ready":
      return "bg-emerald-100 text-emerald-700";
    case "shared":
      return "bg-blue-100 text-blue-700";
    case "approved":
      return "bg-green-100 text-green-800";
    case "rejected":
      return "bg-red-100 text-red-700";
    default:
      return "bg-neutral-200 text-neutral-600";
  }
}

function formatDate(date: string | null | undefined): string {
  if (!date) return "--";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "--";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ─── Page Component ─────────────────────────────────────────────────────────

export default function StoryboardsPage() {
  const [storyboards, setStoryboards] = useState<StoryboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create form state
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formClientId, setFormClientId] = useState("");
  const [formScenes, setFormScenes] = useState<SceneInput[]>([
    { description: "", cameraDirection: "", mood: "" },
  ]);
  const [creating, setCreating] = useState(false);

  // Clients for dropdown
  const [clientsList, setClientsList] = useState<
    Pick<Client, "id" | "name">[]
  >([]);

  // Filter
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Action loading (track which storyboard IDs are being updated)
  const [actionLoading, setActionLoading] = useState<Set<string>>(new Set());

  // ─── Fetch storyboards ─────────────────────────────────────────────────

  const fetchStoryboards = useCallback(async () => {
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(
        `/api/admin/storyboards?${params.toString()}`
      );
      if (!res.ok) throw new Error(`Failed to fetch storyboards (${res.status})`);
      const data: StoryboardRow[] = await res.json();
      setStoryboards(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/clients");
      if (res.ok) {
        const data = await res.json();
        setClientsList(
          data.map((c: Client) => ({ id: c.id, name: c.name }))
        );
      }
    } catch {
      // Non-blocking — clients list is for convenience
    }
  }, []);

  useEffect(() => {
    fetchStoryboards();
  }, [fetchStoryboards]);

  // Auto-poll when any storyboard is "generating"
  useEffect(() => {
    const hasGenerating = storyboards.some((s) => s.status === "generating");
    if (!hasGenerating) return;
    const interval = setInterval(fetchStoryboards, 5000);
    return () => clearInterval(interval);
  }, [storyboards, fetchStoryboards]);

  useEffect(() => {
    if (showForm && clientsList.length === 0) {
      fetchClients();
    }
  }, [showForm, clientsList.length, fetchClients]);

  // ─── Actions ──────────────────────────────────────────────────────────

  const handleCreate = useCallback(async () => {
    if (!formTitle.trim() || !formClientId) return;
    const validScenes = formScenes.filter((s) => s.description.trim());
    if (validScenes.length === 0) return;

    setCreating(true);
    try {
      const res = await fetch("/api/admin/storyboards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formTitle.trim(),
          clientId: formClientId,
          scenes: validScenes,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Create failed (${res.status})`);
      }
      // Reset form
      setFormTitle("");
      setFormClientId("");
      setFormScenes([{ description: "", cameraDirection: "", mood: "" }]);
      setShowForm(false);
      await fetchStoryboards();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setCreating(false);
    }
  }, [formTitle, formClientId, formScenes, fetchStoryboards]);

  const handleGenerate = useCallback(
    async (id: string) => {
      setActionLoading((prev) => new Set(prev).add(id));
      try {
        const res = await fetch(`/api/admin/storyboards/${id}/generate`, {
          method: "POST",
        });
        if (!res.ok) throw new Error(`Generate failed (${res.status})`);
        await fetchStoryboards();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Generate failed");
      } finally {
        setActionLoading((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [fetchStoryboards]
  );

  const handleShare = useCallback(
    async (id: string) => {
      setActionLoading((prev) => new Set(prev).add(id));
      try {
        const res = await fetch(`/api/admin/storyboards/${id}/share`, {
          method: "POST",
        });
        if (!res.ok) throw new Error(`Share failed (${res.status})`);
        const data = await res.json();
        // Copy share URL to clipboard
        const fullUrl = `${window.location.origin}${data.shareUrl}`;
        await navigator.clipboard.writeText(fullUrl).catch(() => {
          // Fallback: show in alert
          window.alert(`Share link: ${fullUrl}`);
        });
        await fetchStoryboards();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Share failed");
      } finally {
        setActionLoading((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [fetchStoryboards]
  );

  // ─── Scene form helpers ──────────────────────────────────────────────

  const addScene = () => {
    setFormScenes((prev) => [
      ...prev,
      { description: "", cameraDirection: "", mood: "" },
    ]);
  };

  const removeScene = (index: number) => {
    setFormScenes((prev) => prev.filter((_, i) => i !== index));
  };

  const updateScene = (
    index: number,
    field: keyof SceneInput,
    value: string
  ) => {
    setFormScenes((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-black">Storyboards</h1>
          <p className="text-neutral-500 text-sm mt-1">
            Create storyboards from video scripts and share with clients for
            approval
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors"
          >
            {showForm ? "Cancel" : "New Storyboard"}
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          <span>Error: {error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-600 hover:text-red-800"
            aria-label="Dismiss error"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-neutral-300 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-brand-black">
            New Storyboard
          </h2>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Title
            </label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="e.g. TikTok Campaign Q2 2026"
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm bg-white text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-black/20"
            />
          </div>

          {/* Client */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Client
            </label>
            <select
              value={formClientId}
              onChange={(e) => setFormClientId(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm bg-white text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-black/20"
            >
              <option value="">Select a client...</option>
              {clientsList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Scenes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-neutral-700">
                Scenes
              </label>
              <button
                onClick={addScene}
                className="text-xs text-brand-black font-medium hover:underline"
              >
                + Add scene
              </button>
            </div>
            <div className="space-y-3">
              {formScenes.map((scene, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-2 p-3 bg-neutral-50 rounded-lg border border-neutral-200"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-neutral-500">
                      Scene {i + 1}
                    </span>
                    {formScenes.length > 1 && (
                      <button
                        onClick={() => removeScene(i)}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={scene.description}
                    onChange={(e) =>
                      updateScene(i, "description", e.target.value)
                    }
                    placeholder="Scene description (required)"
                    className="w-full px-3 py-1.5 border border-neutral-300 rounded-md text-sm bg-white text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-black/20"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={scene.cameraDirection}
                      onChange={(e) =>
                        updateScene(i, "cameraDirection", e.target.value)
                      }
                      placeholder="Camera direction"
                      className="px-3 py-1.5 border border-neutral-300 rounded-md text-sm bg-white text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-black/20"
                    />
                    <input
                      type="text"
                      value={scene.mood}
                      onChange={(e) => updateScene(i, "mood", e.target.value)}
                      placeholder="Mood"
                      className="px-3 py-1.5 border border-neutral-300 rounded-md text-sm bg-white text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-black/20"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm font-medium text-neutral-600 hover:text-brand-black transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={
                creating ||
                !formTitle.trim() ||
                !formClientId ||
                formScenes.filter((s) => s.description.trim()).length === 0
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating && (
                <svg
                  className="w-4 h-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              )}
              {creating ? "Creating..." : "Create Storyboard"}
            </button>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="px-3 py-2 border border-neutral-300 rounded-lg text-sm bg-white text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-black/20"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-neutral-300 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <svg
              className="w-6 h-6 animate-spin text-neutral-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            <span className="ml-3 text-sm text-neutral-500">
              Loading storyboards...
            </span>
          </div>
        ) : storyboards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <svg
              className="w-10 h-10 text-neutral-300 mb-3"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" />
            </svg>
            <p className="text-sm text-neutral-500 mb-4">
              No storyboards yet. Create one to get started.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors"
            >
              New Storyboard
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <caption className="sr-only">Storyboards list</caption>
              <thead>
                <tr className="border-b border-neutral-200 text-left">
                  <th className="px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider whitespace-nowrap">
                    Client
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider whitespace-nowrap">
                    Title
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider whitespace-nowrap">
                    Scenes
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider whitespace-nowrap">
                    Status
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider whitespace-nowrap">
                    Date
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {storyboards.map((sb, i) => (
                  <tr
                    key={sb.id}
                    className={`border-b border-neutral-100 hover:bg-neutral-50 transition-colors ${
                      i % 2 === 0 ? "bg-white" : "bg-neutral-50/50"
                    }`}
                  >
                    {/* Client */}
                    <td className="px-5 py-3.5 text-sm font-medium text-brand-black whitespace-nowrap">
                      {sb.clientName || "--"}
                    </td>

                    {/* Title */}
                    <td className="px-5 py-3.5 text-sm text-brand-black max-w-[250px] truncate">
                      {sb.title}
                    </td>

                    {/* Scenes count */}
                    <td className="px-5 py-3.5 text-sm text-neutral-600 whitespace-nowrap">
                      {sb.scenesCount}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClasses(sb.status)}`}
                      >
                        {sb.status.charAt(0).toUpperCase() + sb.status.slice(1)}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-5 py-3.5 text-sm text-neutral-600 whitespace-nowrap">
                      {formatDate(sb.createdAt)}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        {/* Generate (mock) — for draft */}
                        {sb.status === "draft" && (
                          <button
                            onClick={() => handleGenerate(sb.id)}
                            disabled={actionLoading.has(sb.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-brand-black text-white text-xs font-medium rounded-md hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Generate storyboard images (mock)"
                          >
                            {actionLoading.has(sb.id) ? (
                              <svg
                                className="w-3 h-3 animate-spin"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                              </svg>
                            ) : (
                              <svg
                                className="w-3 h-3"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                              </svg>
                            )}
                            Generate
                          </button>
                        )}

                        {/* Share — for ready/shared */}
                        {(sb.status === "ready" || sb.status === "shared") && (
                          <button
                            onClick={() => handleShare(sb.id)}
                            disabled={actionLoading.has(sb.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 border border-blue-300 text-blue-700 text-xs font-medium rounded-md hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Generate share link (copies to clipboard)"
                          >
                            Share
                          </button>
                        )}

                        {/* View — always available */}
                        <a
                          href={`/api/admin/storyboards/${sb.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 border border-neutral-300 text-neutral-600 text-xs font-medium rounded-md hover:bg-neutral-100 transition-colors"
                          title="View storyboard JSON"
                        >
                          View
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Total count */}
      {!loading && storyboards.length > 0 && (
        <p className="text-xs text-neutral-400">
          Showing {storyboards.length} storyboard
          {storyboards.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
