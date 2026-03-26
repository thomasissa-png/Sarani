"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";

import type {
  TrackerProject,
  TrackerResponse,
} from "@/types/integrations";
import { CLICKUP_STATUS_MAPPINGS } from "@/lib/integrations/config";

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

function getInvoiceBadgeClasses(status: string): string {
  const lower = status.toLowerCase();
  if (lower === "paid") return "bg-success-light text-success";
  if (lower === "invoiced") return "bg-info-light text-info";
  if (lower === "overdue") return "bg-error-light text-error";
  if (lower === "open po") return "bg-neutral-200 text-neutral-600";
  return "bg-neutral-200 text-neutral-600";
}

function getConnectionDot(status: string): string {
  if (status === "connected") return "bg-green-500";
  if (status === "not_configured") return "bg-yellow-500";
  return "bg-red-500";
}

// ─── Page Component ─────────────────────────────────────────────────────────

export default function TrackerPage() {
  const [data, setData] = useState<TrackerResponse | null>(null);
  const [apiStatus, setApiStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters — default to Open + In progress only
  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("Active");
  const [invoiceFilter, setInvoiceFilter] = useState("All");
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
    return null;
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

  // Fast initial load — show cached data immediately
  const fetchData = useCallback(async () => {
    if (!data) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const [trackerRes, statusRes] = await Promise.all([
        fetch("/api/admin/integrations/tracker"),
        fetch("/api/admin/integrations/status"),
      ]);

      if (!trackerRes.ok) {
        throw new Error(`Failed to fetch tracker data (${trackerRes.status})`);
      }

      const trackerData: TrackerResponse = await trackerRes.json();
      setData(trackerData);

      if (statusRes.ok) {
        const statusData: StatusResponse = await statusRes.json();
        setApiStatus(statusData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [data]);

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

      // 2. Fetch fresh tracker data (force-refresh invalidates cache) + status
      const [trackerRes, statusRes] = await Promise.all([
        fetch("/api/admin/integrations/tracker", {
          headers: { "x-force-refresh": "true" },
        }),
        fetch("/api/admin/integrations/status"),
      ]);

      if (!trackerRes.ok) {
        throw new Error(`Failed to fetch tracker data (${trackerRes.status})`);
      }

      const trackerData: TrackerResponse = await trackerRes.json();
      setData(trackerData);

      if (statusRes.ok) {
        const statusData: StatusResponse = await statusRes.json();
        setApiStatus(statusData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Derived data
  const clients = useMemo(() => {
    if (!data) return [];
    const set = new Set(data.projects.map((p) => p.client));
    return ["All", ...Array.from(set).sort()];
  }, [data]);

  const filteredProjects = useMemo(() => {
    if (!data) return [];
    const filtered = data.projects.filter((p) => {
      if (
        search &&
        !p.project.toLowerCase().includes(search.toLowerCase()) &&
        !p.client.toLowerCase().includes(search.toLowerCase()) &&
        !p.contact.toLowerCase().includes(search.toLowerCase()) &&
        !p.poNumber.toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }
      if (clientFilter !== "All" && p.client !== clientFilter) return false;
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
      return true;
    });

    // Apply sorting
    if (sort) {
      filtered.sort((a, b) => {
        let cmp = 0;
        switch (sort.column) {
          case "client":
            cmp = a.client.localeCompare(b.client);
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
            cmp = (a.date || "").localeCompare(b.date || "");
            break;
        }
        return sort.direction === "asc" ? cmp : -cmp;
      });
    }

    return filtered;
  }, [data, search, clientFilter, statusFilter, invoiceFilter, sort]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
    setPageInputValue("1");
  }, [search, clientFilter, statusFilter, invoiceFilter]);

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
  const hasActiveFilters = search !== "" || clientFilter !== "All" || statusFilter !== "Active" || invoiceFilter !== "All";
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
  }, []);

  // Actions overflow menu per row (Fix #6)
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);

  // Active filter count (for mobile badge)
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (clientFilter !== "All") count++;
    if (statusFilter !== "All") count++;
    if (invoiceFilter !== "All") count++;
    return count;
  }, [clientFilter, statusFilter, invoiceFilter]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenActionMenu(null);
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
                  <SortableTh column="client" sort={sort} onToggle={toggleSort}>Client</SortableTh>
                  <SortableTh column="project" sort={sort} onToggle={toggleSort}>Project</SortableTh>
                  {!hiddenColumns.has("contact") && <Th>Contact</Th>}
                  <SortableTh column="status" sort={sort} onToggle={toggleSort}>Status</SortableTh>
                  {!hiddenColumns.has("category") && <Th>Category</Th>}
                  <SortableTh column="totalValue" sort={sort} onToggle={toggleSort}>Value</SortableTh>
                  {!hiddenColumns.has("po") && <Th>PO</Th>}
                  <Th>Invoice</Th>
                  <SortableTh column="date" sort={sort} onToggle={toggleSort}>Date</SortableTh>
                  <Th>Actions</Th>
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
                        {p.client}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-brand-black max-w-[280px] truncate">
                        {p.project}
                      </td>
                      {!hiddenColumns.has("contact") && (
                        <td className="px-5 py-3.5 text-sm text-neutral-600 whitespace-nowrap">
                          {p.contact || "--"}
                        </td>
                      )}
                      <td className="px-5 py-3.5">
                        {p.status ? (
                          <span
                            className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusBadgeClasses(p.status)}`}
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
                            className={`text-xs font-medium px-2 py-1 rounded-full ${getInvoiceBadgeClasses(p.invoiceStatus)}`}
                          >
                            {p.invoiceStatus}
                          </span>
                        ) : (
                          <span className="text-neutral-400 text-xs">--</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-neutral-600 whitespace-nowrap">
                        {p.date || "--"}
                      </td>
                      {/* Fix #6 — Overflow menu for actions */}
                      <td className="px-5 py-3.5">
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setOpenActionMenu(openActionMenu === rowKey ? null : rowKey); }}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-brand-black transition-colors"
                            aria-label="Project actions"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                              <circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" />
                            </svg>
                          </button>
                          {openActionMenu === rowKey && (
                            <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-neutral-200 rounded-lg shadow-lg z-30 py-1">
                              <Link
                                href={`/admin/quotes?client=${encodeURIComponent(p.client)}&project=${encodeURIComponent(p.project)}&contact=${encodeURIComponent(p.contact)}&amount=${p.totalValue ?? ""}&category=${encodeURIComponent(p.category)}`}
                                className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                                onClick={() => setOpenActionMenu(null)}
                              >
                                <QuoteIcon />
                                Generate Quote
                              </Link>
                              {p.sharepointLink && (
                                <a
                                  href={p.sharepointLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                                  onClick={() => setOpenActionMenu(null)}
                                >
                                  <SharePointIcon />
                                  Open in SharePoint
                                </a>
                              )}
                              {p.clickupTaskUrl && (
                                <a
                                  href={p.clickupTaskUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                                  onClick={() => setOpenActionMenu(null)}
                                >
                                  <ExternalLinkIcon />
                                  Open in ClickUp
                                </a>
                              )}
                            </div>
                          )}
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
              {/* Fix #6 — Overflow menu on mobile cards */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-neutral-400 font-medium">
                    {p.client}
                  </p>
                  <p className="text-sm font-medium text-brand-black mt-0.5">
                    {p.project}
                  </p>
                </div>
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const key = `mobile-${p.client}-${p.project}-${i}`;
                      setOpenActionMenu(openActionMenu === key ? null : key);
                    }}
                    className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-brand-black transition-colors"
                    aria-label="Project actions"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" />
                    </svg>
                  </button>
                  {openActionMenu === `mobile-${p.client}-${p.project}-${i}` && (
                    <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-neutral-200 rounded-lg shadow-lg z-30 py-1">
                      <Link
                        href={`/admin/quotes?client=${encodeURIComponent(p.client)}&project=${encodeURIComponent(p.project)}&contact=${encodeURIComponent(p.contact)}&amount=${p.totalValue ?? ""}&category=${encodeURIComponent(p.category)}`}
                        className="flex items-center gap-2.5 min-h-[44px] px-3 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                        onClick={() => setOpenActionMenu(null)}
                      >
                        <QuoteIcon />
                        Generate Quote
                      </Link>
                      {p.sharepointLink && (
                        <a
                          href={p.sharepointLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2.5 min-h-[44px] px-3 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                          onClick={() => setOpenActionMenu(null)}
                        >
                          <SharePointIcon />
                          Open in SharePoint
                        </a>
                      )}
                      {p.clickupTaskUrl && (
                        <a
                          href={p.clickupTaskUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2.5 min-h-[44px] px-3 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                          onClick={() => setOpenActionMenu(null)}
                        >
                          <ExternalLinkIcon />
                          Open in ClickUp
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {p.status && (
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusBadgeClasses(p.status)}`}
                  >
                    {p.status}
                  </span>
                )}
                {p.invoiceStatus && (
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${getInvoiceBadgeClasses(p.invoiceStatus)}`}
                  >
                    {p.invoiceStatus}
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
                  {p.date || "--"}
                </div>
                <div>
                  <span className="text-neutral-400">PO:</span>{" "}
                  {p.poNumber || "--"}
                </div>
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
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function SortableTh({
  children,
  column,
  sort,
  onToggle,
}: {
  children: React.ReactNode;
  column: SortableColumn;
  sort: SortConfig | null;
  onToggle: (column: SortableColumn) => void;
}) {
  const isActive = sort?.column === column;
  return (
    <th className="px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider whitespace-nowrap">
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

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider whitespace-nowrap">
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

function QuoteIcon() {
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
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z" />
      <line x1="8" y1="7" x2="16" y2="7" />
      <line x1="8" y1="11" x2="16" y2="11" />
      <line x1="8" y1="15" x2="12" y2="15" />
    </svg>
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
