"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";

import type {
  TrackerProject,
  TrackerResponse,
} from "@/types/integrations";

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

const PROJECT_STATUSES = ["All", "Open", "in progress", "review", "Closed"] as const;
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
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [invoiceFilter, setInvoiceFilter] = useState("All");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
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
    return data.projects.filter((p) => {
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
      if (
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
  }, [data, search, clientFilter, statusFilter, invoiceFilter]);

  // Stats
  const stats = useMemo(() => {
    if (!data) return { total: 0, totalValue: 0, open: 0, overdue: 0 };
    const projects = data.projects;
    return {
      total: projects.length,
      totalValue: projects.reduce((sum, p) => sum + (p.totalValue ?? 0), 0),
      open: projects.filter(
        (p) => p.status.toLowerCase() === "open" || p.status.toLowerCase() === "in progress"
      ).length,
      overdue: projects.filter(
        (p) => p.invoiceStatus.toLowerCase() === "overdue"
      ).length,
    };
  }, [data]);

  // Active filter count (for mobile badge)
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (clientFilter !== "All") count++;
    if (statusFilter !== "All") count++;
    if (invoiceFilter !== "All") count++;
    return count;
  }, [clientFilter, statusFilter, invoiceFilter]);

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
            onClick={fetchData}
            disabled={loading}
            className="px-4 py-2 bg-brand-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Syncing..." : "Sync now"}
          </button>
        </div>
      </div>

      {/* Status Bar */}
      {apiStatus && (
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
      )}

      {/* Stats Summary */}
      {!loading && data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total Projects" value={String(stats.total)} />
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
        {/* Dropdown filters -- always visible on sm+, toggle on mobile */}
        <div className={`${mobileFiltersOpen ? "flex" : "hidden"} sm:flex flex-col sm:flex-row gap-3`}>
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
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
            className="px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
          >
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === "All" ? "All Statuses" : s}
              </option>
            ))}
          </select>
          <select
            value={invoiceFilter}
            onChange={(e) => setInvoiceFilter(e.target.value)}
            className="px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
          >
            {INVOICE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === "All" ? "All Invoices" : s}
              </option>
            ))}
          </select>
        </div>
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
        <div className="bg-white rounded-xl border border-neutral-300 py-16 text-center">
          <p className="text-neutral-400 text-sm">
            {data && data.projects.length > 0
              ? "No projects match your filters."
              : "No projects found. Sync your integrations to get started."}
          </p>
        </div>
      )}

      {/* Desktop Table */}
      {!loading && !error && filteredProjects.length > 0 && (
        <div className="hidden md:block bg-white rounded-xl border border-neutral-300 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200 text-left">
                  <Th>Client</Th>
                  <Th>Project</Th>
                  <Th>Contact</Th>
                  <Th>Status</Th>
                  <Th>Category</Th>
                  <Th>Value</Th>
                  <Th>PO</Th>
                  <Th>Invoice</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map((p, i) => (
                  <tr
                    key={`${p.client}-${p.project}-${i}`}
                    className="border-b border-neutral-100 hover:bg-neutral-200/50 transition-colors"
                  >
                    <td className="px-5 py-3.5 text-sm font-medium text-brand-black whitespace-nowrap">
                      {p.client}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-brand-black max-w-[280px] truncate">
                      {p.project}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-neutral-600 whitespace-nowrap">
                      {p.contact || "--"}
                    </td>
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
                    <td className="px-5 py-3.5 text-sm text-neutral-600 whitespace-nowrap">
                      {p.category || "--"}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-brand-black whitespace-nowrap font-medium">
                      {formatCurrency(p.totalValue)}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-neutral-600 whitespace-nowrap">
                      {p.poNumber || "--"}
                    </td>
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
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        {p.sharepointLink && (
                          <a
                            href={p.sharepointLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-neutral-400 hover:text-brand-cerulean transition-colors"
                            title="Open in SharePoint"
                          >
                            <SharePointIcon />
                          </a>
                        )}
                        {p.clickupTaskUrl && (
                          <a
                            href={p.clickupTaskUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-neutral-400 hover:text-brand-cerulean transition-colors"
                            title="Open in ClickUp"
                          >
                            <ExternalLinkIcon />
                          </a>
                        )}
                        {!p.sharepointLink && !p.clickupTaskUrl && (
                          <span className="text-neutral-300 text-xs">--</span>
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

      {/* Mobile Cards */}
      {!loading && !error && filteredProjects.length > 0 && (
        <div className="md:hidden space-y-3">
          {filteredProjects.map((p, i) => (
            <div
              key={`mobile-${p.client}-${p.project}-${i}`}
              className="bg-white rounded-xl border border-neutral-300 p-4 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-neutral-400 font-medium">
                    {p.client}
                  </p>
                  <p className="text-sm font-medium text-brand-black mt-0.5">
                    {p.project}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {p.sharepointLink && (
                    <a
                      href={p.sharepointLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neutral-400 hover:text-brand-cerulean"
                      title="SharePoint"
                    >
                      <SharePointIcon />
                    </a>
                  )}
                  {p.clickupTaskUrl && (
                    <a
                      href={p.clickupTaskUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neutral-400 hover:text-brand-cerulean"
                      title="ClickUp"
                    >
                      <ExternalLinkIcon />
                    </a>
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
                  <span className="text-neutral-400">PO:</span>{" "}
                  {p.poNumber || "--"}
                </div>
                <div>
                  <span className="text-neutral-400">Category:</span>{" "}
                  {p.category || "--"}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

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
  variant = "default",
}: {
  label: string;
  value: string;
  variant?: "default" | "danger";
}) {
  return (
    <div className="bg-white rounded-xl border border-neutral-300 px-4 py-3">
      <p className="text-xs text-neutral-400 font-medium">{label}</p>
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
