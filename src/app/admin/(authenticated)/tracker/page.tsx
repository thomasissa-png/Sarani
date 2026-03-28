"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";

import type {
  TrackerProject,
  TrackerResponse,
} from "@/types/integrations";
import { CLICKUP_STATUS_MAPPINGS } from "@/lib/integrations/config";

// ─── AI Outputs Types ──────────────────────────────────────────────────────

type OutputsByProject = Record<string, { count: number; agents: string[] }>;

function extractTaskId(url: string): string {
  if (!url) return "";
  const match = url.match(/\/t\/([a-zA-Z0-9]+)/);
  if (match) return match[1];
  const segments = url.split("/").filter(Boolean);
  return segments[segments.length - 1] || "";
}

// ─── Sorting Types ──────────────────────────────────────────────────────────

type SortableColumn = "client" | "project" | "status" | "totalValue" | "date";
type SortDirection = "asc" | "desc";

interface SortConfig {
  column: SortableColumn;
  direction: SortDirection;
}

const ITEMS_PER_PAGE = 50;

// ─── Types ──────────────────────────────────────────────────────────────────

interface IntegrationStatus {
  name: string;
  status: "connected" | "not_configured" | "error";
  error?: string;
}

interface StatusResponse {
  overall: string;
  integrations: IntegrationStatus[];
  checkedAt: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const PROJECT_STATUSES = [
  "All",
  "Active",
  ...CLICKUP_STATUS_MAPPINGS.map((m) => m.clickupStatus),
] as const;

const ACTIVE_STATUSES = new Set(["open", "in progress"]);
const INVOICE_STATUSES = ["All", "Open PO", "Invoiced", "Paid", "Overdue"] as const;

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "--";
  // Pure numeric strings are Excel serial dates that weren't converted — convert here
  const trimmed = dateStr.trim();
  if (/^\d{4,5}$/.test(trimmed)) {
    const n = parseInt(trimmed, 10);
    if (n > 30000 && n < 60000) {
      const epoch = new Date(Date.UTC(1899, 11, 30));
      const d = new Date(epoch.getTime() + n * 86400000);
      return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    }
    return "--"; // Not a valid date serial
  }
  // Try to parse YYYY-MM-DD or ISO date strings
  const d = new Date(dateStr);
  if (isNaN(d.getTime()) || d.getFullYear() > 2100 || d.getFullYear() < 1990) return dateStr;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatCurrency(value: number | null, currency = "EUR"): string {
  if (value === null) return "--";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function timeAgo(isoString: string | null): string {
  if (!isoString) return "never";
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes === 1) return "1 min ago";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours === 1) return "1 hour ago";
  return `${hours} hours ago`;
}

function getStatusBadgeClasses(status: string): string {
  const lower = status.toLowerCase();
  if (lower === "open") return "bg-neutral-200 text-neutral-600";
  if (lower === "in progress") return "bg-info-light text-info";
  if (lower === "review") return "bg-warning-light text-warning-text";
  if (lower === "closed" || lower === "delivered")
    return "bg-success-light text-success";
  return "bg-neutral-200 text-neutral-600";
}

function getInvoiceBadgeClasses(status: string, projectDate?: string): string {
  const lower = status.toLowerCase();
  if (lower === "paid") return "bg-success-light text-success";
  if (lower === "invoiced") return "bg-info-light text-info";
  if (lower === "overdue") return "bg-error-light text-error";
  if (lower === "open po") {
    // Flag stale POs: if project date is > 60 days ago, show warning
    if (projectDate) {
      const d = new Date(projectDate);
      if (!isNaN(d.getTime()) && Date.now() - d.getTime() > 60 * 86400000) {
        return "bg-warning-light text-warning-text";
      }
    }
    return "bg-neutral-200 text-neutral-600";
  }
  return "bg-neutral-200 text-neutral-600";
}

function getConnectionDot(status: string): string {
  if (status === "connected") return "bg-green-500";
  if (status === "not_configured") return "bg-yellow-500";
  return "bg-red-500";
}

function parseDateToTimestamp(dateStr: string | null | undefined): number {
  if (!dateStr) return 0;
  const trimmed = dateStr.trim();
  if (!trimmed) return 0;
  // Excel serial dates (5-digit numbers like "45000")
  if (/^\d{4,5}$/.test(trimmed)) {
    const n = parseInt(trimmed, 10);
    if (n > 30000 && n < 60000) {
      const epoch = new Date(Date.UTC(1899, 11, 30));
      return epoch.getTime() + n * 86400000;
    }
    return 0;
  }
  // ISO dates "2026-03-24" or other parseable formats
  const d = new Date(trimmed);
  if (!isNaN(d.getTime()) && d.getFullYear() >= 1990 && d.getFullYear() <= 2100) {
    return d.getTime();
  }
  // "DD Mon YYYY" e.g. "24 Mar 2026"
  const ddMonYyyy = trimmed.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (ddMonYyyy) {
    const parsed = new Date(`${ddMonYyyy[2]} ${ddMonYyyy[1]}, ${ddMonYyyy[3]}`);
    if (!isNaN(parsed.getTime())) return parsed.getTime();
  }
  return 0;
}

// ─── Page Component ─────────────────────────────────────────────────────────

export default function TrackerPage() {
  const [data, setData] = useState<TrackerResponse | null>(null);
  const [apiStatus, setApiStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI outputs linked to tracker projects
  const [outputsByProject, setOutputsByProject] =
    useState<OutputsByProject>({});

  // Project preview links (Share Preview feature)
  // Maps projectId -> { url, previewId, isActive }
  const [previewLinks, setPreviewLinks] = useState<
    Record<string, { url: string; previewId: string; isActive: boolean }>
  >({});
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);

  // Toast notification
  const [toast, setToast] = useState<{
    message: string;
    detail?: string;
    type: "success" | "error" | "warning";
  } | null>(null);

  // Filters — default to Open + In progress only
  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("Active");
  const [invoiceFilter, setInvoiceFilter] = useState("All");
  const [countryFilter, setCountryFilter] = useState("All");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Column visibility (Fix #1 — reduce to 7 visible columns by default)
  type HideableColumn = "contact" | "category" | "po";
  const [hiddenColumns, setHiddenColumns] = useState<Set<HideableColumn>>(
    () => new Set<HideableColumn>(["contact", "category", "po"])
  );
  const [columnsDropdownOpen, setColumnsDropdownOpen] = useState(false);

  const toggleColumn = useCallback((col: HideableColumn) => {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (next.has(col)) next.delete(col);
      else next.add(col);
      return next;
    });
  }, []);

  // Sorting (Fix #12 — persist in localStorage)
  const [sort, setSort] = useState<SortConfig | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem("tracker-sort");
      if (stored) return JSON.parse(stored) as SortConfig;
    } catch {
      // ignore parse errors
    }
    return { column: "date" as SortableColumn, direction: "desc" as SortDirection };
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInputValue, setPageInputValue] = useState("1");

  const toggleSort = useCallback((column: SortableColumn) => {
    setSort((prev) => {
      let next: SortConfig | null;
      if (prev?.column === column) {
        next = prev.direction === "asc"
          ? { column, direction: "desc" }
          : null;
      } else {
        next = { column, direction: "asc" };
      }
      // Fix #12 — persist sort preference
      if (next) {
        localStorage.setItem("tracker-sort", JSON.stringify(next));
      } else {
        localStorage.removeItem("tracker-sort");
      }
      return next;
    });
    setCurrentPage(1);
  }, []);

  // Stale-while-revalidate: show cached data from localStorage instantly,
  // then fetch fresh data in the background.
  const TRACKER_CACHE_KEY = "tracker-cache";

  const fetchData = useCallback(async () => {
    // 1. Hydrate from localStorage immediately (instant display)
    if (!data) {
      try {
        const cached = localStorage.getItem(TRACKER_CACHE_KEY);
        if (cached) {
          const parsed: TrackerResponse = JSON.parse(cached);
          setData(parsed);
          setLoading(false);
          // Mark as refreshing — fresh data is on the way
          setRefreshing(true);
        } else {
          setLoading(true);
        }
      } catch {
        setLoading(true);
      }
    } else {
      setRefreshing(true);
    }
    setError(null);
    try {
      // Fetch tracker data — status is non-blocking (fetched separately)
      const trackerRes = await fetch("/api/admin/integrations/tracker");

      if (!trackerRes.ok) {
        throw new Error(`Failed to fetch tracker data (${trackerRes.status})`);
      }

      const trackerData: TrackerResponse = await trackerRes.json();
      setData(trackerData);

      // Persist to localStorage for next instant load
      try {
        localStorage.setItem(TRACKER_CACHE_KEY, JSON.stringify(trackerData));
      } catch {
        // localStorage full or quota exceeded — ignore
      }

      // Fetch status and AI outputs separately (non-blocking)
      try {
        const [statusRes, outputsRes] = await Promise.all([
          fetch("/api/admin/integrations/status"),
          fetch("/api/admin/agents/outputs-by-project"),
        ]);
        if (statusRes.ok) {
          const statusData: StatusResponse = await statusRes.json();
          setApiStatus(statusData);
        }
        if (outputsRes.ok) {
          const outputsData: OutputsByProject = await outputsRes.json();
          setOutputsByProject(outputsData);
        }
      } catch {
        // Status and outputs are informational — ignore failures
      }
    } catch (err) {
      // Only show error if we have NO data at all (neither from API nor from cache)
      if (!data) {
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const syncAndFetch = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      // 1. Sync clients from ClickUp → DB
      const syncRes = await fetch("/api/admin/integrations/sync-clients", {
        method: "POST",
      });
      if (!syncRes.ok) {
        const syncErr = await syncRes.json().catch(() => ({}));
        throw new Error(syncErr.error || `Sync failed (${syncRes.status})`);
      }

      // 2. Fetch fresh tracker data (force-refresh invalidates cache) + status + AI outputs
      const [trackerRes, statusRes, outputsRes] = await Promise.all([
        fetch("/api/admin/integrations/tracker", {
          headers: { "x-force-refresh": "true" },
        }),
        fetch("/api/admin/integrations/status"),
        fetch("/api/admin/agents/outputs-by-project"),
      ]);

      if (!trackerRes.ok) {
        throw new Error(`Failed to fetch tracker data (${trackerRes.status})`);
      }

      const trackerData: TrackerResponse = await trackerRes.json();
      setData(trackerData);

      // Persist to localStorage for next instant load
      try {
        localStorage.setItem(TRACKER_CACHE_KEY, JSON.stringify(trackerData));
      } catch { /* ignore */ }

      if (statusRes.ok) {
        const statusData: StatusResponse = await statusRes.json();
        setApiStatus(statusData);
      }
      if (outputsRes.ok) {
        const outputsData: OutputsByProject = await outputsRes.json();
        setOutputsByProject(outputsData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setRefreshing(false);
    }
  }, [TRACKER_CACHE_KEY]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Derived data
  const clients = useMemo(() => {
    if (!data) return [];
    const set = new Set(data.projects.map((p) => p.displayClient ?? p.client));
    return ["All", ...Array.from(set).sort()];
  }, [data]);

  const countries = useMemo(() => {
    if (!data) return [];
    const set = new Set(data.projects.map((p) => p.country ?? "Other"));
    return ["All", ...Array.from(set).sort()];
  }, [data]);

  const filteredProjects = useMemo(() => {
    if (!data) return [];
    const filtered = data.projects.filter((p) => {
      if (
        search &&
        !p.project.toLowerCase().includes(search.toLowerCase()) &&
        !p.client.toLowerCase().includes(search.toLowerCase()) &&
        !(p.displayClient ?? "").toLowerCase().includes(search.toLowerCase()) &&
        !p.contact.toLowerCase().includes(search.toLowerCase()) &&
        !p.poNumber.toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }
      if (clientFilter !== "All" && (p.displayClient ?? p.client) !== clientFilter) return false;
      if (statusFilter === "Active") {
        if (!ACTIVE_STATUSES.has(p.status.toLowerCase())) return false;
      } else if (
        statusFilter !== "All" &&
        p.status.toLowerCase() !== statusFilter.toLowerCase()
      ) {
        return false;
      }
      if (invoiceFilter !== "All") {
        if (
          p.invoiceStatus.toLowerCase() !== invoiceFilter.toLowerCase()
        ) {
          return false;
        }
      }
      if (countryFilter !== "All" && (p.country ?? "Other") !== countryFilter) return false;
      return true;
    });

    // Apply sorting
    if (sort) {
      filtered.sort((a, b) => {
        let cmp = 0;
        switch (sort.column) {
          case "client":
            cmp = (a.displayClient ?? a.client).localeCompare(b.displayClient ?? b.client);
            break;
          case "project":
            cmp = a.project.localeCompare(b.project);
            break;
          case "status":
            cmp = a.status.localeCompare(b.status);
            break;
          case "totalValue":
            cmp = (a.totalValue ?? 0) - (b.totalValue ?? 0);
            break;
          case "date":
            cmp = parseDateToTimestamp(a.date) - parseDateToTimestamp(b.date);
            break;
        }
        return sort.direction === "asc" ? cmp : -cmp;
      });
    }

    return filtered;
  }, [data, search, clientFilter, statusFilter, invoiceFilter, countryFilter, sort]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
    setPageInputValue("1");
  }, [search, clientFilter, statusFilter, invoiceFilter, countryFilter]);

  // Sync page input with currentPage
  useEffect(() => {
    setPageInputValue(String(currentPage));
  }, [currentPage]);

  // Pagination derived data
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredProjects.length / ITEMS_PER_PAGE)),
    [filteredProjects.length]
  );

  // Page jump handler (Fix #4)
  const handlePageJump = useCallback((value: string) => {
    const page = parseInt(value, 10);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    } else {
      setPageInputValue(String(currentPage));
    }
  }, [totalPages, currentPage]);

  const paginatedProjects = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProjects.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProjects, currentPage]);

  const paginationLabel = useMemo(() => {
    if (filteredProjects.length === 0) return "";
    const start = (currentPage - 1) * ITEMS_PER_PAGE + 1;
    const end = Math.min(currentPage * ITEMS_PER_PAGE, filteredProjects.length);
    return `Showing ${start}-${end} of ${filteredProjects.length}`;
  }, [filteredProjects.length, currentPage]);

  // Stats (Fix #9 — scoped to filtered projects when filters active)
  const hasActiveFilters = search !== "" || clientFilter !== "All" || statusFilter !== "Active" || invoiceFilter !== "All" || countryFilter !== "All";
  const stats = useMemo(() => {
    if (!data) return { total: 0, totalValue: 0, open: 0, overdue: 0, globalTotal: 0 };
    const source = filteredProjects;
    return {
      total: source.length,
      totalValue: source.reduce((sum, p) => sum + (p.totalValue ?? 0), 0),
      open: source.filter(
        (p) => p.status.toLowerCase() === "open" || p.status.toLowerCase() === "in progress"
      ).length,
      overdue: source.filter(
        (p) => p.invoiceStatus.toLowerCase() === "overdue"
      ).length,
      globalTotal: data.projects.length,
    };
  }, [data, filteredProjects]);

  // Clear all filters (Fix #11)
  const clearAllFilters = useCallback(() => {
    setSearch("");
    setClientFilter("All");
    setStatusFilter("All");
    setInvoiceFilter("All");
    setCountryFilter("All");
  }, []);

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Build a stable project ID from tracker row (no DB project ID exists)
  const getProjectId = useCallback((p: TrackerProject) => {
    return `${p.client}::${p.project}`;
  }, []);

  // Share Preview: create or copy existing preview link
  const handleSharePreview = useCallback(async (p: TrackerProject) => {
    const projectId = getProjectId(p);

    // If already active, just copy the URL
    const existing = previewLinks[projectId];
    if (existing?.isActive) {
      try {
        await navigator.clipboard.writeText(`${window.location.origin}${existing.url}`);
        setToast({
          message: "Preview link copied — already exists",
          detail: existing.url,
          type: "success",
        });
      } catch {
        setToast({ message: "Could not copy to clipboard", type: "error" });
      }
      return;
    }

    setPreviewLoading(projectId);
    try {
      const res = await fetch("/api/admin/project-previews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          clientName: p.client,
          projectName: p.project,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Unknown error" }));
        setToast({
          message: err.message || "Could not generate preview link. Try again.",
          type: "error",
        });
        return;
      }

      const data: { url: string; created: boolean; id?: string } = await res.json();

      setPreviewLinks((prev) => ({
        ...prev,
        [projectId]: { url: data.url, previewId: data.id ?? "", isActive: true },
      }));

      try {
        await navigator.clipboard.writeText(`${window.location.origin}${data.url}`);
        setToast({
          message: "Preview link copied to clipboard",
          detail: data.url,
          type: "success",
        });
      } catch {
        setToast({
          message: "Preview link created (copy failed)",
          detail: data.url,
          type: "warning",
        });
      }
    } catch {
      setToast({
        message: "Could not generate preview link. Try again.",
        type: "error",
      });
    } finally {
      setPreviewLoading(null);
    }
  }, [getProjectId, previewLinks]);

  // Deactivate a preview link
  const handleDeactivatePreview = useCallback(async (p: TrackerProject) => {
    const projectId = getProjectId(p);
    const existing = previewLinks[projectId];
    if (!existing) return;

    setPreviewLoading(projectId);
    try {
      const patchRes = await fetch(`/api/admin/project-previews/${encodeURIComponent(projectId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: false }),
      });

      if (!patchRes.ok) {
        setToast({
          message: "Could not deactivate. Try again.",
          type: "error",
        });
        return;
      }

      setPreviewLinks((prev) => ({
        ...prev,
        [projectId]: { ...prev[projectId], isActive: false },
      }));
      setToast({
        message: "Preview link deactivated.",
        type: "warning",
      });
    } catch {
      setToast({
        message: "Could not deactivate. Try again.",
        type: "error",
      });
    } finally {
      setPreviewLoading(null);
    }
  }, [getProjectId, previewLinks]);

  // Active filter count (for mobile badge)
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (clientFilter !== "All") count++;
    if (statusFilter !== "All") count++;
    if (invoiceFilter !== "All") count++;
    if (countryFilter !== "All") count++;
    return count;
  }, [clientFilter, statusFilter, invoiceFilter, countryFilter]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = () => {
      setColumnsDropdownOpen(false);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // Oldest fetch timestamp for "cached X min ago"
  const oldestFetch = useMemo(() => {
    if (!data) return null;
    const times = [
      data.sources.clickup.fetchedAt,
      data.sources.sharepoint.fetchedAt,
      data.sources.evoliz.fetchedAt,
    ].filter((t): t is string => t !== null);
    if (times.length === 0) return null;
    return times.sort()[0];
  }, [data]);

  const isAnyCached = useMemo(() => {
    if (!data) return false;
    return Object.values(data.sources).some((s) => s.status === "stale");
  }, [data]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-black">
            Project Tracker
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            Unified view across ClickUp, SharePoint &amp; Evoliz
            {isAnyCached && oldestFetch && (
              <span className="text-neutral-400 ml-2">
                (cached {timeAgo(oldestFetch)})
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/admin/tracker/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Project
          </Link>
          <button
            onClick={syncAndFetch}
            disabled={loading || refreshing}
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-neutral-300 bg-white text-brand-black text-sm font-semibold rounded-lg hover:bg-neutral-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {(loading || refreshing) && (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            )}
            {loading || refreshing ? "Syncing..." : "Sync now"}
          </button>
        </div>
      </div>

      {/* Refresh indicator — shown when data exists but is being updated */}
      {refreshing && data && (
        <div className="flex items-center gap-2 px-4 py-2 bg-brand-cerulean/10 rounded-lg text-sm text-brand-cerulean-dark">
          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          Refreshing data from ClickUp, SharePoint &amp; Evoliz...
        </div>
      )}

      {/* Status Bar (Fix #10 — collapse when all connected) */}
      {apiStatus && (
        apiStatus.overall === "healthy" ? (
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            All integrations connected
          </div>
        ) : (
          <div className="flex flex-wrap gap-4 px-4 py-3 bg-white rounded-xl border border-neutral-300">
            {apiStatus.integrations.map((integration) => (
              <div key={integration.name} className="flex items-center gap-2 text-sm">
                <span
                  className={`w-2 h-2 rounded-full ${getConnectionDot(integration.status)}`}
                />
                <span className="text-neutral-600">{integration.name}</span>
                <span className="text-neutral-400 text-xs capitalize">
                  {integration.status === "not_configured"
                    ? "not configured"
                    : integration.status}
                </span>
              </div>
            ))}
          </div>
        )
      )}

      {/* Stats Summary (Fix #9 — scoped to filters) */}
      {!loading && data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label="Total Projects"
            value={hasActiveFilters ? `${stats.total} of ${stats.globalTotal}` : String(stats.total)}
            subtitle={hasActiveFilters ? "(filtered)" : undefined}
          />
          <StatCard label="Total Value" value={formatCurrency(stats.totalValue)} />
          <StatCard label="Open / In Progress" value={String(stats.open)} />
          <StatCard
            label="Overdue"
            value={String(stats.overdue)}
            variant={stats.overdue > 0 ? "danger" : "default"}
          />
        </div>
      )}

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Search projects, clients, contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
          />
          {/* Mobile filter toggle */}
          <button
            type="button"
            onClick={() => setMobileFiltersOpen((prev) => !prev)}
            className="sm:hidden inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm font-medium text-brand-black shrink-0"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /><line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
            </svg>
            Filters
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold bg-brand-black text-white rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
        {/* Desktop filters — always visible on sm+ */}
        <div className="hidden sm:flex flex-row gap-3">
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            aria-label="Filter by client"
            className="px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
          >
            {clients.map((c) => (
              <option key={c} value={c}>
                {c === "All" ? "All Clients" : c}
              </option>
            ))}
          </select>
          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            aria-label="Filter by country"
            className="px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
          >
            {countries.map((c) => (
              <option key={c} value={c}>
                {c === "All" ? "All Countries" : c}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by project status"
            className="px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
          >
            {/* Fix #5 — separate quick filters from ClickUp statuses */}
            <optgroup label="Quick filters">
              <option value="All">All Statuses</option>
              <option value="Active">Active (Open + In Progress)</option>
            </optgroup>
            <optgroup label="ClickUp statuses">
              {CLICKUP_STATUS_MAPPINGS.map((m) => (
                <option key={m.clickupStatus} value={m.clickupStatus}>
                  {m.clickupStatus}
                </option>
              ))}
            </optgroup>
          </select>
          <select
            value={invoiceFilter}
            onChange={(e) => setInvoiceFilter(e.target.value)}
            aria-label="Filter by invoice status"
            className="px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
          >
            {INVOICE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === "All" ? "All Invoices" : s}
              </option>
            ))}
          </select>
          {/* Fix #11 — Clear all filters link */}
          {(activeFilterCount > 0 || search !== "") && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-sm text-brand-cerulean hover:text-brand-cerulean-dark font-medium transition-colors whitespace-nowrap"
            >
              Clear filters
            </button>
          )}
        </div>
        {/* Fix #7 — Mobile filters as overlay/bottom sheet */}
        {mobileFiltersOpen && (
          <div className="sm:hidden fixed inset-0 z-40 flex flex-col justify-end">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setMobileFiltersOpen(false)}
              aria-hidden="true"
            />
            {/* Bottom sheet */}
            <div className="relative bg-white rounded-t-2xl p-5 space-y-4 pb-8">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-brand-black">Filters</h3>
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(false)}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-full text-neutral-500 hover:bg-neutral-100 transition-colors"
                  aria-label="Close filters"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>
              <div className="space-y-3">
                <select
                  value={clientFilter}
                  onChange={(e) => setClientFilter(e.target.value)}
                  aria-label="Filter by client"
                  className="w-full px-3 py-3 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                >
                  {clients.map((c) => (
                    <option key={c} value={c}>
                      {c === "All" ? "All Clients" : c}
                    </option>
                  ))}
                </select>
                <select
                  value={countryFilter}
                  onChange={(e) => setCountryFilter(e.target.value)}
                  aria-label="Filter by country"
                  className="w-full px-3 py-3 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                >
                  {countries.map((c) => (
                    <option key={c} value={c}>
                      {c === "All" ? "All Countries" : c}
                    </option>
                  ))}
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  aria-label="Filter by project status"
                  className="w-full px-3 py-3 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                >
                  <optgroup label="Quick filters">
                    <option value="All">All Statuses</option>
                    <option value="Active">Active (Open + In Progress)</option>
                  </optgroup>
                  <optgroup label="ClickUp statuses">
                    {CLICKUP_STATUS_MAPPINGS.map((m) => (
                      <option key={m.clickupStatus} value={m.clickupStatus}>
                        {m.clickupStatus}
                      </option>
                    ))}
                  </optgroup>
                </select>
                <select
                  value={invoiceFilter}
                  onChange={(e) => setInvoiceFilter(e.target.value)}
                  aria-label="Filter by invoice status"
                  className="w-full px-3 py-3 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                >
                  {INVOICE_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s === "All" ? "All Invoices" : s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(false)}
                  className="flex-1 min-h-[44px] px-4 py-3 text-sm font-semibold bg-brand-black text-white rounded-lg hover:bg-neutral-800 transition-colors"
                >
                  Apply
                </button>
                {(activeFilterCount > 0 || search !== "") && (
                  <button
                    type="button"
                    onClick={() => {
                      clearAllFilters();
                      setMobileFiltersOpen(false);
                    }}
                    className="min-h-[44px] px-4 py-3 text-sm font-medium text-neutral-600 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-error-light border border-error rounded-xl px-5 py-4 text-sm text-error">
          <p className="font-medium">Failed to load tracker data</p>
          <p className="mt-1 text-error">{error}</p>
          <button
            onClick={fetchData}
            className="mt-3 text-sm font-medium text-error underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && <TrackerSkeleton />}

      {/* Empty State */}
      {!loading && !error && filteredProjects.length === 0 && (
        <div className="bg-white rounded-xl border border-neutral-300 py-16 text-center space-y-3">
          <p className="text-neutral-500 text-sm font-medium">
            {data && data.projects.length > 0
              ? "No projects match your filters."
              : "No projects found."}
          </p>
          {/* Fix #11 — one-click reset in empty state */}
          {data && data.projects.length > 0 && (activeFilterCount > 0 || search !== "") && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-brand-cerulean border border-brand-cerulean rounded-lg hover:bg-brand-cerulean/5 transition-colors"
            >
              Clear all filters
            </button>
          )}
          {data && data.projects.length === 0 && data.debug && (
            <div className="text-xs text-neutral-400 space-y-1">
              <p>ClickUp tasks: {data.debug.clickupTaskCount} | Excel projects: {data.debug.excelProjectCount} | Evoliz invoices: {data.debug.evolizInvoiceCount}</p>
              {data.sources?.clickup?.status === "unavailable" && (
                <p className="text-red-400">ClickUp: {data.sources.clickup.error || "unavailable"}</p>
              )}
              {data.sources?.sharepoint?.status === "unavailable" && (
                <p className="text-red-400">SharePoint: {data.sources.sharepoint.error || "unavailable"}</p>
              )}
              {data.sources?.evoliz?.status === "unavailable" && (
                <p className="text-red-400">Evoliz: {data.sources.evoliz.error || "unavailable"}</p>
              )}
            </div>
          )}
          {data && data.projects.length === 0 && (
            <p className="text-neutral-400 text-xs">Click &quot;Sync now&quot; to fetch projects from ClickUp and SharePoint.</p>
          )}
        </div>
      )}

      {/* Desktop Table */}
      {!loading && !error && filteredProjects.length > 0 && (
        <div className="hidden md:block bg-white rounded-xl border border-neutral-300 overflow-hidden">
          {/* Fix #1 — Columns toggle dropdown */}
          <div className="flex items-center justify-end px-5 py-2 border-b border-neutral-100">
            <div className="relative">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setColumnsDropdownOpen((prev) => !prev); }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-600 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 transition-colors"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
                </svg>
                Columns
                {hiddenColumns.size < 3 && (
                  <span className="text-neutral-400">({3 - hiddenColumns.size} extra)</span>
                )}
              </button>
              {columnsDropdownOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-neutral-200 rounded-lg shadow-lg z-20 py-1">
                  {(["contact", "category", "po"] as const).map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleColumn(col); }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                    >
                      <span className={`w-4 h-4 rounded border flex items-center justify-center text-xs ${!hiddenColumns.has(col) ? "bg-brand-cerulean border-brand-cerulean text-white" : "border-neutral-300"}`}>
                        {!hiddenColumns.has(col) && (
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        )}
                      </span>
                      {col === "po" ? "PO" : col.charAt(0).toUpperCase() + col.slice(1)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <caption className="sr-only">Project tracker data</caption>
              <thead>
                <tr className="border-b border-neutral-200 text-left">
                  <SortableTh column="client" sort={sort} onToggle={toggleSort} className="w-[20%]">Client</SortableTh>
                  <Th className="w-[8%]">Country</Th>
                  <SortableTh column="project" sort={sort} onToggle={toggleSort} className="w-[25%]">Project</SortableTh>
                  {!hiddenColumns.has("contact") && <Th>Contact</Th>}
                  <SortableTh column="status" sort={sort} onToggle={toggleSort} className="w-[8%]">Status</SortableTh>
                  {!hiddenColumns.has("category") && <Th>Category</Th>}
                  <SortableTh column="totalValue" sort={sort} onToggle={toggleSort} className="w-[10%]">Value</SortableTh>
                  {!hiddenColumns.has("po") && <Th>PO</Th>}
                  <Th className="w-[8%]">Invoice</Th>
                  <SortableTh column="date" sort={sort} onToggle={toggleSort} className="w-[10%]">Date</SortableTh>
                  <Th className="w-[12%]">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {paginatedProjects.map((p, i) => {
                  const rowKey = `${p.client}-${p.project}-${i}`;
                  return (
                    <tr
                      key={rowKey}
                      className="border-b border-neutral-100 hover:bg-neutral-200/50 transition-colors"
                    >
                      <td className="px-5 py-3.5 text-sm font-medium text-brand-black whitespace-nowrap">
                        <div>
                          {p.displayClient ?? p.client}
                          {p.displayClient && p.displayClient !== p.client && (
                            <div className="text-xs text-neutral-400 font-normal">{p.client}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-neutral-500 whitespace-nowrap">
                        {p.country ?? "Other"}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-brand-black max-w-[280px] truncate">
                        <Link
                          href={`/admin/projects/${encodeURIComponent(getProjectId(p))}?client=${encodeURIComponent(p.client)}&project=${encodeURIComponent(p.project)}&status=${encodeURIComponent(p.status || "")}&value=${p.totalValue ?? ""}&date=${encodeURIComponent(p.date || "")}&invoice=${encodeURIComponent(p.invoiceStatus || "")}&po=${encodeURIComponent(p.poNumber || "")}&sharepoint=${encodeURIComponent(p.sharepointLink || "")}&clickup=${encodeURIComponent(p.clickupTaskUrl || "")}`}
                          className="hover:text-flame hover:underline transition-colors"
                        >
                          {p.project}
                        </Link>
                        {(() => {
                          const taskId = extractTaskId(p.clickupTaskUrl);
                          const outputs = taskId ? outputsByProject[taskId] : null;
                          if (!outputs) return null;
                          return (
                            <span
                              className="ml-1.5 text-[10px] font-medium text-purple-600"
                              title={`${outputs.count} AI output(s): ${outputs.agents.join(", ")}`}
                            >
                              ({outputs.count} AI)
                            </span>
                          );
                        })()}
                      </td>
                      {!hiddenColumns.has("contact") && (
                        <td className="px-5 py-3.5 text-sm text-neutral-600 whitespace-nowrap">
                          {p.contact || "--"}
                        </td>
                      )}
                      <td className="px-5 py-3.5">
                        {p.status ? (
                          <span
                            className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${getStatusBadgeClasses(p.status)}`}
                          >
                            {p.status}
                          </span>
                        ) : (
                          <span className="text-neutral-400 text-xs">--</span>
                        )}
                      </td>
                      {!hiddenColumns.has("category") && (
                        <td className="px-5 py-3.5 text-sm text-neutral-600 whitespace-nowrap">
                          {p.category || "--"}
                        </td>
                      )}
                      <td className="px-5 py-3.5 text-sm text-brand-black whitespace-nowrap font-medium">
                        {formatCurrency(p.totalValue)}
                      </td>
                      {!hiddenColumns.has("po") && (
                        <td className="px-5 py-3.5 text-sm text-neutral-600 whitespace-nowrap">
                          {p.poNumber || "--"}
                        </td>
                      )}
                      <td className="px-5 py-3.5">
                        {p.invoiceStatus ? (
                          <span
                            className={`text-xs font-medium px-2 py-1 rounded-full ${getInvoiceBadgeClasses(p.invoiceStatus, p.date)}`}
                          >
                            {p.invoiceStatus}{p.invoiceStatus?.toLowerCase() === "open po" && p.date && !isNaN(new Date(p.date).getTime()) && Date.now() - new Date(p.date).getTime() > 60 * 86400000 ? " (stale)" : ""}
                          </span>
                        ) : (
                          <span className="text-neutral-400 text-xs">--</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-neutral-600 whitespace-nowrap">
                        {formatDate(p.date)}
                      </td>
                      {/* Actions — primary: Quote, Share, Launch | secondary: ... dropdown */}
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-1">
                          <Link
                            href={`/admin/quotes?client=${encodeURIComponent(p.client)}&project=${encodeURIComponent(p.project)}&contact=${encodeURIComponent(p.contact)}&amount=${p.totalValue ?? ""}&category=${encodeURIComponent(p.category)}`}
                            className="px-1.5 py-1 text-xs font-medium rounded border border-neutral-300 text-neutral-600 hover:bg-neutral-100 hover:text-brand-black transition-colors whitespace-nowrap"
                            title="Create a new quote for this project"
                          >
                            Quote
                          </Link>
                          <SharePreviewButton
                            project={p}
                            preview={previewLinks[getProjectId(p)]}
                            isLoading={previewLoading === getProjectId(p)}
                            onShare={handleSharePreview}
                            onDeactivate={handleDeactivatePreview}
                          />
                          <LaunchAgentDropdown
                            clientName={p.client}
                            projectName={p.project}
                          />
                          <SecondaryActionsDropdown project={p} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-neutral-200 bg-neutral-50">
              <span className="text-sm text-neutral-500">{paginationLabel}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg border border-neutral-300 bg-white text-brand-black hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                {/* Fix #4 — Page jump input */}
                <span className="inline-flex items-center gap-1 text-sm text-neutral-600">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={pageInputValue}
                    onChange={(e) => setPageInputValue(e.target.value)}
                    onBlur={(e) => handlePageJump(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handlePageJump((e.target as HTMLInputElement).value);
                    }}
                    className="w-12 text-center px-1 py-1 text-sm font-medium border border-neutral-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                    aria-label="Go to page number"
                  />
                  <span>/ {totalPages}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg border border-neutral-300 bg-white text-brand-black hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mobile Cards */}
      {!loading && !error && filteredProjects.length > 0 && (
        <div className="md:hidden space-y-3">
          {paginatedProjects.map((p, i) => (
            <div
              key={`mobile-${p.client}-${p.project}-${i}`}
              className="bg-white rounded-xl border border-neutral-300 p-4 space-y-3"
            >
              <div>
                <p className="text-xs text-neutral-400 font-medium">
                  {p.displayClient ?? p.client}
                  {p.displayClient && p.displayClient !== p.client && (
                    <span className="ml-1 text-neutral-300">{p.client}</span>
                  )}
                  {p.country && p.country !== "Other" && (
                    <span className="ml-1.5 text-neutral-300">{p.country}</span>
                  )}
                </p>
                <span className="flex items-center gap-1 mt-0.5">
                  <Link
                    href={`/admin/projects/${encodeURIComponent(getProjectId(p))}?client=${encodeURIComponent(p.client)}&project=${encodeURIComponent(p.project)}&status=${encodeURIComponent(p.status || "")}&value=${p.totalValue ?? ""}&date=${encodeURIComponent(p.date || "")}&invoice=${encodeURIComponent(p.invoiceStatus || "")}&po=${encodeURIComponent(p.poNumber || "")}&sharepoint=${encodeURIComponent(p.sharepointLink || "")}&clickup=${encodeURIComponent(p.clickupTaskUrl || "")}`}
                    className="text-sm font-medium text-brand-black hover:text-flame hover:underline transition-colors"
                  >
                    {p.project}
                  </Link>
                  {(() => {
                    const taskId = extractTaskId(p.clickupTaskUrl);
                    const outputs = taskId ? outputsByProject[taskId] : null;
                    if (!outputs) return null;
                    return (
                      <span
                        className="text-[10px] font-medium text-purple-600"
                        title={`${outputs.count} AI output(s): ${outputs.agents.join(", ")}`}
                      >
                        ({outputs.count} AI)
                      </span>
                    );
                  })()}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {p.status && (
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${getStatusBadgeClasses(p.status)}`}
                  >
                    {p.status}
                  </span>
                )}
                {p.invoiceStatus && (
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${getInvoiceBadgeClasses(p.invoiceStatus, p.date)}`}
                  >
                    {p.invoiceStatus}{p.invoiceStatus?.toLowerCase() === "open po" && p.date && !isNaN(new Date(p.date).getTime()) && Date.now() - new Date(p.date).getTime() > 60 * 86400000 ? " (stale)" : ""}
                  </span>
                )}
              </div>
              {/* Fix #2 — Date added to mobile cards */}
              <div className="grid grid-cols-2 gap-2 text-xs text-neutral-500">
                <div>
                  <span className="text-neutral-400">Contact:</span>{" "}
                  {p.contact || "--"}
                </div>
                <div>
                  <span className="text-neutral-400">Value:</span>{" "}
                  {formatCurrency(p.totalValue)}
                </div>
                <div>
                  <span className="text-neutral-400">Date:</span>{" "}
                  {formatDate(p.date)}
                </div>
                <div>
                  <span className="text-neutral-400">PO:</span>{" "}
                  {p.poNumber || "--"}
                </div>
              </div>
              {/* Actions — compact text buttons */}
              <div className="flex items-center gap-1.5 pt-1">
                <Link
                  href={`/admin/quotes?client=${encodeURIComponent(p.client)}&project=${encodeURIComponent(p.project)}&contact=${encodeURIComponent(p.contact)}&amount=${p.totalValue ?? ""}&category=${encodeURIComponent(p.category)}`}
                  className="px-2 py-1 text-xs font-medium rounded border border-neutral-300 text-neutral-600 hover:bg-neutral-100 hover:text-brand-black transition-colors"
                >
                  Quote
                </Link>
                <SharePreviewButton
                  project={p}
                  preview={previewLinks[getProjectId(p)]}
                  isLoading={previewLoading === getProjectId(p)}
                  onShare={handleSharePreview}
                  onDeactivate={handleDeactivatePreview}
                />
                <LaunchAgentDropdown
                  clientName={p.client}
                  projectName={p.project}
                />
                <SecondaryActionsDropdown project={p} />
              </div>
            </div>
          ))}
          {/* Mobile Pagination — Fix #3 (44px touch targets) + Fix #4 (page jump) */}
          {totalPages > 1 && (
            <div className="space-y-2 px-1 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-500">{paginationLabel}</span>
                <span className="inline-flex items-center gap-1 text-sm text-neutral-600">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={pageInputValue}
                    onChange={(e) => setPageInputValue(e.target.value)}
                    onBlur={(e) => handlePageJump(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handlePageJump((e.target as HTMLInputElement).value);
                    }}
                    className="w-12 text-center px-1 py-1 text-sm font-medium border border-neutral-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                    aria-label="Go to page number"
                  />
                  <span>/ {totalPages}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex-1 flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-3 text-sm font-medium rounded-lg border border-neutral-300 bg-white text-brand-black hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex-1 flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-3 text-sm font-medium rounded-lg border border-neutral-300 bg-white text-brand-black hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div
            className={`flex items-start gap-3 px-5 py-4 rounded-xl shadow-lg border max-w-sm ${
              toast.type === "success"
                ? "bg-white border-green-200 text-green-800"
                : toast.type === "error"
                  ? "bg-white border-red-200 text-red-800"
                  : "bg-white border-yellow-200 text-yellow-800"
            }`}
          >
            <span className="text-sm shrink-0 mt-0.5">
              {toast.type === "success" ? (
                <svg className="w-4 h-4 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
              ) : toast.type === "error" ? (
                <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
              ) : (
                <svg className="w-4 h-4 text-yellow-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
              )}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{toast.message}</p>
              {toast.detail && (
                <p className="text-xs mt-1 opacity-70 truncate">{toast.detail}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="shrink-0 text-neutral-400 hover:text-neutral-600 transition-colors"
              aria-label="Dismiss notification"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function SortableTh({
  children,
  column,
  sort,
  onToggle,
  className,
}: {
  children: React.ReactNode;
  column: SortableColumn;
  sort: SortConfig | null;
  onToggle: (column: SortableColumn) => void;
  className?: string;
}) {
  const isActive = sort?.column === column;
  return (
    <th className={`px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider whitespace-nowrap ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => onToggle(column)}
        className="inline-flex items-center gap-1 hover:text-brand-black transition-colors"
      >
        {children}
        <SortIcon active={isActive} direction={isActive ? sort!.direction : null} />
      </button>
    </th>
  );
}

function SortIcon({ active, direction }: { active: boolean; direction: SortDirection | null }) {
  if (!active || !direction) {
    return (
      <svg className="w-3.5 h-3.5 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M7 15l5 5 5-5" /><path d="M7 9l5-5 5 5" />
      </svg>
    );
  }
  return (
    <svg className="w-3.5 h-3.5 text-brand-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {direction === "asc" ? <path d="M7 14l5-5 5 5" /> : <path d="M7 10l5 5 5-5" />}
    </svg>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider whitespace-nowrap ${className ?? ""}`}>
      {children}
    </th>
  );
}

function StatCard({
  label,
  value,
  subtitle,
  variant = "default",
}: {
  label: string;
  value: string;
  subtitle?: string;
  variant?: "default" | "danger";
}) {
  return (
    <div className="bg-white rounded-xl border border-neutral-300 px-4 py-3">
      <p className="text-xs text-neutral-400 font-medium">
        {label}
        {subtitle && <span className="ml-1 text-neutral-300">{subtitle}</span>}
      </p>
      <p
        className={`text-lg font-bold mt-0.5 ${
          variant === "danger" && value !== "0"
            ? "text-error"
            : "text-brand-black"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function TrackerSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-neutral-300 px-4 py-3 animate-pulse"
          >
            <div className="h-3 w-20 bg-neutral-200 rounded mb-2" />
            <div className="h-6 w-16 bg-neutral-200 rounded" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-neutral-300 overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-5 py-4 border-b border-neutral-100 animate-pulse"
          >
            <div className="h-4 w-20 bg-neutral-200 rounded" />
            <div className="h-4 w-40 bg-neutral-200 rounded" />
            <div className="h-4 w-24 bg-neutral-200 rounded" />
            <div className="h-5 w-16 bg-neutral-200 rounded-full" />
            <div className="h-4 w-16 bg-neutral-200 rounded" />
            <div className="h-4 w-12 bg-neutral-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SharePointIcon() {
  return (
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
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
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
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

// ─── Launch Agent Dropdown ─────────────────────────────────────────────────

const AGENT_LINKS = [
  { label: "Copywriter", href: "/admin/agents/copywriter" },
  { label: "Art Direction", href: "/admin/agents/creative" },
  { label: "Translator", href: "/admin/agents/translator" },
  { label: "Video Script", href: "/admin/agents/video-script" },
  { label: "Proposal", href: "/admin/agents/proposal" },
  { label: "Presentation", href: "/admin/agents/presentation" },
] as const;

function LaunchAgentDropdown({ clientName, projectName }: { clientName: string; projectName: string }) {
  const [open, setOpen] = useState(false);
  const params = new URLSearchParams({ client: clientName, project: projectName }).toString();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className="inline-flex items-center gap-1 px-1.5 py-1 text-xs font-medium rounded border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
        title="Launch AI Agent"
        aria-label="Launch AI Agent"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
        AI
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-neutral-200 rounded-lg shadow-lg z-40 py-1">
            {AGENT_LINKS.map((agent) => (
              <Link
                key={agent.href}
                href={`${agent.href}?${params}`}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                {agent.label}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Share Preview Button ──────────────────────────────────────────────────

function SharePreviewButton({
  project,
  preview,
  isLoading,
  onShare,
  onDeactivate,
}: {
  project: TrackerProject;
  preview?: { url: string; previewId: string; isActive: boolean };
  isLoading: boolean;
  onShare: (p: TrackerProject) => void;
  onDeactivate: (p: TrackerProject) => void;
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // If preview is active, show "Active" badge with dropdown
  if (preview?.isActive) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setDropdownOpen((prev) => !prev);
          }}
          disabled={isLoading}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
          Active
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        {dropdownOpen && (
          <>
            <div
              className="fixed inset-0 z-30"
              onClick={() => setDropdownOpen(false)}
              aria-hidden="true"
            />
            <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-neutral-200 rounded-lg shadow-lg z-40 py-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDropdownOpen(false);
                  onShare(project);
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                Copy link
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDropdownOpen(false);
                  onDeactivate(project);
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                Deactivate
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // Default state: show "Share" button
  return (
    <button
      type="button"
      onClick={() => onShare(project)}
      disabled={isLoading}
      className="inline-flex items-center gap-1 px-1.5 py-1 text-xs font-medium rounded border border-brand-cerulean/30 bg-brand-cerulean/5 text-brand-cerulean hover:bg-brand-cerulean/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      title="Generate and copy a public preview link"
    >
      {isLoading ? (
        <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      ) : (
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
      )}
      {isLoading ? "..." : "Share"}
    </button>
  );
}

// ─── Secondary Actions Dropdown (ClickUp, Folder, Tracker) ────────────────

function SecondaryActionsDropdown({ project }: { project: TrackerProject }) {
  const [open, setOpen] = useState(false);
  const [folderLoading, setFolderLoading] = useState(false);

  const hasClickUp = !!project.clickupTaskUrl;
  const hasSharepoint = !!project.sharepointLink;
  const hasTracker = !!project.excelTrackerUrl;

  // If no secondary links exist, don't render the dropdown
  if (!hasClickUp && !hasSharepoint && !hasTracker) return null;

  // Open folder with anonymous sharing link (converts on-demand)
  const handleFolderClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const url = project.sharepointLink;
    // If already a sharing link (contains /:f:/ or /:r:/), open directly
    if (url.includes("/:f:/") || url.includes("/:r:/") || url.includes("/s/") || url.includes("guestaccess")) {
      window.open(url, "_blank", "noopener,noreferrer");
      setOpen(false);
      return;
    }

    // Convert to anonymous sharing link via API
    setFolderLoading(true);
    try {
      const res = await fetch("/api/admin/integrations/sharepoint/share-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (res.ok) {
        const data = await res.json();
        window.open(data.sharingLink, "_blank", "noopener,noreferrer");
      } else {
        // Fallback: open the direct URL if conversion fails
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch {
      // Fallback: open the direct URL
      window.open(url, "_blank", "noopener,noreferrer");
    } finally {
      setFolderLoading(false);
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className="inline-flex items-center justify-center w-7 h-7 text-xs font-medium rounded border border-neutral-300 text-neutral-500 hover:bg-neutral-100 hover:text-brand-black transition-colors"
        title="More actions"
        aria-label="More actions"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" />
        </svg>
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-neutral-200 rounded-lg shadow-lg z-40 py-1">
            {hasClickUp && (
              <a
                href={project.clickupTaskUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                <ExternalLinkIcon />
                ClickUp
              </a>
            )}
            {hasSharepoint && (
              <button
                type="button"
                onClick={handleFolderClick}
                disabled={folderLoading}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-neutral-700 hover:bg-neutral-50 transition-colors disabled:opacity-50"
              >
                <FolderIcon />
                {folderLoading ? "Opening..." : "Folder"}
              </button>
            )}
            {hasTracker && (
              <a
                href={project.excelTrackerUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                <SharePointIcon />
                Tracker
              </a>
            )}
          </div>
        </>
      )}
    </div>
  );
}
