"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import type { Client, LandingPage } from "@/lib/db/schema";

// ─── Types ──────────────────────────────────────────────────────────────────

type LandingPageWithClient = {
  id: string;
  clientId: string;
  clientName: string | null;
  title: string;
  slug: string;
  status: string;
  brief: string;
  language: string;
  noIndex: boolean;
  shareToken: string | null;
  publishedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

const STATUSES = [
  "all",
  "draft",
  "generating",
  "ready",
  "published",
  "archived",
] as const;

type StatusFilter = (typeof STATUSES)[number];

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: "All",
  draft: "Draft",
  generating: "Generating",
  ready: "Ready",
  published: "Published",
  archived: "Archived",
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function getStatusBadgeClasses(status: string): string {
  switch (status) {
    case "draft":
      return "bg-neutral-200 text-neutral-600";
    case "generating":
      return "bg-yellow-100 text-yellow-700";
    case "ready":
      return "bg-blue-100 text-blue-700";
    case "published":
      return "bg-green-100 text-green-800";
    case "archived":
      return "bg-neutral-200 text-neutral-500";
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

export default function LandingPagesPage() {
  const [pages, setPages] = useState<LandingPageWithClient[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [clientFilter, setClientFilter] = useState("");

  // Create form state
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    clientId: "",
    title: "",
    brief: "",
  });
  const [creating, setCreating] = useState(false);

  // Action loading state
  const [actionLoading, setActionLoading] = useState<Set<string>>(new Set());

  // ─── Fetch landing pages ────────────────────────────────────────────────

  const fetchPages = useCallback(async () => {
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (clientFilter) params.set("clientId", clientFilter);

      const res = await fetch(
        `/api/admin/landing-pages?${params.toString()}`
      );
      if (!res.ok) {
        throw new Error(`Failed to fetch landing pages (${res.status})`);
      }
      const data: LandingPageWithClient[] = await res.json();
      setPages(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, clientFilter]);

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/clients");
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch {
      // Non-blocking — client list is for the form dropdown
    }
  }, []);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  // Auto-poll when any page is "generating"
  useEffect(() => {
    const hasGenerating = pages.some((p) => p.status === "generating");
    if (!hasGenerating) return;
    const interval = setInterval(fetchPages, 5000);
    return () => clearInterval(interval);
  }, [pages, fetchPages]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // ─── Create landing page ───────────────────────────────────────────────

  const handleCreate = useCallback(async () => {
    if (!formData.clientId || !formData.title || !formData.brief) return;

    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/landing-pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to create (${res.status})`);
      }
      setFormData({ clientId: "", title: "", brief: "" });
      setShowForm(false);
      await fetchPages();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setCreating(false);
    }
  }, [formData, fetchPages]);

  // ─── Actions ──────────────────────────────────────────────────────────

  const generatePage = useCallback(
    async (id: string) => {
      setActionLoading((prev) => new Set(prev).add(id));
      try {
        const res = await fetch(`/api/admin/landing-pages/${id}/generate`, {
          method: "POST",
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Generate failed (${res.status})`);
        }
        await fetchPages();
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
    [fetchPages]
  );

  const updateStatus = useCallback(
    async (id: string, status: string) => {
      setActionLoading((prev) => new Set(prev).add(id));
      try {
        const res = await fetch(`/api/admin/landing-pages/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Update failed (${res.status})`);
        }
        await fetchPages();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Update failed");
      } finally {
        setActionLoading((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [fetchPages]
  );

  // ─── Derived data ─────────────────────────────────────────────────────

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of pages) {
      counts[p.status] = (counts[p.status] || 0) + 1;
    }
    return counts;
  }, [pages]);

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-black">
            Landing Pages
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            Create and manage client landing pages with AI-generated content
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Landing Page
          </button>
        </div>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white border border-neutral-300 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-brand-black">
            Create Landing Page
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Client selector */}
            <div>
              <label
                htmlFor="lp-client"
                className="block text-sm font-medium text-neutral-700 mb-1"
              >
                Client
              </label>
              <select
                id="lp-client"
                value={formData.clientId}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    clientId: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm bg-white text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-black/20"
              >
                <option value="">Select a client...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div>
              <label
                htmlFor="lp-title"
                className="block text-sm font-medium text-neutral-700 mb-1"
              >
                Title
              </label>
              <input
                id="lp-title"
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }))
                }
                placeholder="e.g. Product Launch Q2 2026"
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm bg-white text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-black/20"
              />
            </div>
          </div>

          {/* Brief */}
          <div>
            <label
              htmlFor="lp-brief"
              className="block text-sm font-medium text-neutral-700 mb-1"
            >
              Brief
            </label>
            <textarea
              id="lp-brief"
              value={formData.brief}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  brief: e.target.value,
                }))
              }
              rows={3}
              placeholder="Describe the landing page purpose, target audience, key messages..."
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm bg-white text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-black/20 resize-none"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCreate}
              disabled={
                creating ||
                !formData.clientId ||
                !formData.title ||
                !formData.brief
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
              {creating ? "Creating..." : "Create"}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setFormData({ clientId: "", title: "", brief: "" });
              }}
              className="px-4 py-2 text-sm font-medium text-neutral-600 hover:text-brand-black transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

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

      {/* Status summary badges */}
      {!loading && pages.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {(["draft", "ready", "published", "archived"] as const).map((s) => (
            <span
              key={s}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeClasses(s)}`}
            >
              {STATUS_LABELS[s]}
              <span className="font-bold">{statusCounts[s] || 0}</span>
            </span>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Status filter */}
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

        {/* Client filter */}
        <select
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          className="px-3 py-2 border border-neutral-300 rounded-lg text-sm bg-white text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-black/20"
        >
          <option value="">All clients</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="bg-white rounded-xl border border-neutral-300 overflow-hidden">
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
              Loading landing pages...
            </span>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && pages.length === 0 && (
        <div className="bg-white rounded-xl border border-neutral-300 overflow-hidden">
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
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            <p className="text-sm text-neutral-500 mb-4">
              No landing pages yet. Create one to get started.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors"
            >
              New Landing Page
            </button>
          </div>
        </div>
      )}

      {/* Mobile cards */}
      {!loading && pages.length > 0 && (
        <div className="md:hidden space-y-3">
          {pages.map((p) => (
            <div
              key={p.id}
              className="rounded-xl border border-neutral-200 bg-white p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-brand-black truncate mr-2">
                  {p.title}
                </p>
                <span
                  className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 ${getStatusBadgeClasses(p.status)}`}
                >
                  {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-neutral-600">
                <span>{p.clientName || "--"}</span>
                <span className="text-neutral-300">&middot;</span>
                <span>{p.language}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {(p.status === "draft" || p.status === "ready") && (
                  <button
                    onClick={() => generatePage(p.id)}
                    disabled={actionLoading.has(p.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-brand-black text-white text-xs font-medium rounded-md hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading.has(p.id) ? (
                      <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                    ) : (
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                    )}
                    Generate
                  </button>
                )}
                {p.status === "ready" && (
                  <button
                    onClick={() => updateStatus(p.id, "published")}
                    disabled={actionLoading.has(p.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-700 text-white text-xs font-medium rounded-md hover:bg-green-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Publish
                  </button>
                )}
                {p.status === "published" && (
                  <a
                    href={`/lp/${p.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 border border-neutral-300 text-neutral-600 text-xs font-medium rounded-md hover:bg-neutral-100 transition-colors"
                  >
                    View
                  </a>
                )}
                {p.status !== "archived" && (
                  <button
                    onClick={() => updateStatus(p.id, "archived")}
                    disabled={actionLoading.has(p.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 border border-neutral-300 text-neutral-600 text-xs font-medium rounded-md hover:bg-neutral-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Archive
                  </button>
                )}
                {p.status === "archived" && (
                  <button
                    onClick={() => updateStatus(p.id, "draft")}
                    disabled={actionLoading.has(p.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 border border-neutral-300 text-neutral-600 text-xs font-medium rounded-md hover:bg-neutral-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Restore
                  </button>
                )}
              </div>
              <p className="text-xs text-neutral-400">{formatDate(p.createdAt)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Desktop table */}
      {!loading && pages.length > 0 && (
        <div className="hidden md:block bg-white rounded-xl border border-neutral-300 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <caption className="sr-only">Landing pages list</caption>
              <thead>
                <tr className="border-b border-neutral-200 text-left">
                  <th className="px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider whitespace-nowrap">
                    Client
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider whitespace-nowrap">
                    Title
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider whitespace-nowrap">
                    Status
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider whitespace-nowrap">
                    Created
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {pages.map((p, i) => (
                  <tr
                    key={p.id}
                    className={`border-b border-neutral-100 hover:bg-neutral-50 transition-colors ${
                      i % 2 === 0 ? "bg-white" : "bg-neutral-50/50"
                    }`}
                  >
                    <td className="px-5 py-3.5 text-sm font-medium text-brand-black whitespace-nowrap">
                      {p.clientName || "--"}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-brand-black max-w-[280px]">
                      <div className="truncate">{p.title}</div>
                      <div className="text-xs text-neutral-400 truncate">
                        /lp/{p.slug}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClasses(p.status)}`}
                      >
                        {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-neutral-600 whitespace-nowrap">
                      {formatDate(p.createdAt)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        {(p.status === "draft" || p.status === "ready") && (
                          <button
                            onClick={() => generatePage(p.id)}
                            disabled={actionLoading.has(p.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-brand-black text-white text-xs font-medium rounded-md hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Generate content (mock)"
                          >
                            {actionLoading.has(p.id) ? (
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
                        {p.status === "ready" && (
                          <button
                            onClick={() => updateStatus(p.id, "published")}
                            disabled={actionLoading.has(p.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-700 text-white text-xs font-medium rounded-md hover:bg-green-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Publish landing page"
                          >
                            Publish
                          </button>
                        )}
                        {p.status === "published" && (
                          <a
                            href={`/lp/${p.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 border border-neutral-300 text-neutral-600 text-xs font-medium rounded-md hover:bg-neutral-100 transition-colors"
                            title="View public page"
                          >
                            <svg
                              className="w-3 h-3"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                              <polyline points="15 3 21 3 21 9" />
                              <line x1="10" y1="14" x2="21" y2="3" />
                            </svg>
                            View
                          </a>
                        )}
                        {p.status !== "archived" && (
                          <button
                            onClick={() => updateStatus(p.id, "archived")}
                            disabled={actionLoading.has(p.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 border border-neutral-300 text-neutral-600 text-xs font-medium rounded-md hover:bg-neutral-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Archive"
                          >
                            Archive
                          </button>
                        )}
                        {p.status === "archived" && (
                          <button
                            onClick={() => updateStatus(p.id, "draft")}
                            disabled={actionLoading.has(p.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 border border-neutral-300 text-neutral-600 text-xs font-medium rounded-md hover:bg-neutral-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Restore to draft"
                          >
                            Restore
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Total count */}
      {!loading && pages.length > 0 && (
        <p className="text-xs text-neutral-400">
          Showing {pages.length} landing page
          {pages.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
