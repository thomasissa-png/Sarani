"use client";

// SSR: false — Client Component for interactive inbox with filters and actions.
// This replaces the old SSR dashboard. The inbox is the PM's primary workspace.

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

type InboxItemType =
  | "email_classified"
  | "ai_team_complete"
  | "qa_gates_pass"
  | "followup_alert";

type InboxItemStatus = "pending" | "in_progress" | "done" | "dismissed";

interface InboxItem {
  id: string;
  type: InboxItemType;
  status: InboxItemStatus;
  title: string | null;
  summary: string | null;
  sourceId: string | null;
  sourceType: string | null;
  protocol: string | null;
  projectId: string | null;
  priority: string | null;
  pmId: string | null;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  InboxItemType,
  { label: string; color: string; bgColor: string }
> = {
  email_classified: {
    label: "Email",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
  },
  ai_team_complete: {
    label: "AI Deliverable",
    color: "text-orange-700",
    bgColor: "bg-orange-100",
  },
  qa_gates_pass: {
    label: "QA Pass",
    color: "text-green-700",
    bgColor: "bg-green-100",
  },
  followup_alert: {
    label: "Follow-up",
    color: "text-red-700",
    bgColor: "bg-red-100",
  },
};

type FilterTab = "all" | "urgent" | "email_classified" | "ai_team_complete" | "qa_gates_pass" | "followup_alert";

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "urgent", label: "Urgent" },
  { key: "email_classified", label: "Emails" },
  { key: "ai_team_complete", label: "AI Deliverables" },
  { key: "qa_gates_pass", label: "QA" },
  { key: "followup_alert", label: "Follow-ups" },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatRelativeTime(dateStr: string): { text: string; isUrgent: boolean } {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / 3_600_000;
  const diffDays = diffMs / 86_400_000;

  const isUrgent = diffHours > 24;

  if (diffHours < 1) {
    const mins = Math.floor(diffMs / 60_000);
    return { text: mins < 1 ? "Just now" : `${mins}m ago`, isUrgent };
  }
  if (diffHours < 24) {
    return { text: `${Math.floor(diffHours)}h ago`, isUrgent };
  }
  if (diffDays < 7) {
    return { text: `${Math.floor(diffDays)}d ago`, isUrgent };
  }
  return {
    text: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    isUrgent,
  };
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function InboxPage() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("status", "pending");

      const res = await fetch(`/api/admin/inbox?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items ?? []);
      }
    } catch {
      // Silently fail — will show empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchItems, 30_000);
    return () => clearInterval(interval);
  }, [fetchItems]);

  const handleAction = async (id: string, status: "done" | "dismissed") => {
    setActionLoading(id);
    try {
      const res = await fetch("/api/admin/inbox", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        // Optimistic removal
        setItems((prev) => prev.filter((item) => item.id !== id));
      }
    } catch {
      // Silently fail
    } finally {
      setActionLoading(null);
    }
  };

  // Filter items
  const filteredItems = items.filter((item) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "urgent") {
      const diffMs = Date.now() - new Date(item.createdAt).getTime();
      return diffMs > 24 * 3_600_000;
    }
    return item.type === activeFilter;
  });

  const urgentCount = items.filter((item) => {
    const diffMs = Date.now() - new Date(item.createdAt).getTime();
    return diffMs > 24 * 3_600_000;
  }).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-brand-black">Inbox</h1>
        <p className="text-neutral-500 text-sm mt-1">
          {loading
            ? "Loading..."
            : items.length === 0
              ? "No items waiting"
              : `${items.length} item${items.length !== 1 ? "s" : ""} waiting`}
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {FILTER_TABS.map((tab) => {
          const isActive = activeFilter === tab.key;
          const count =
            tab.key === "all"
              ? items.length
              : tab.key === "urgent"
                ? urgentCount
                : items.filter((i) => i.type === tab.key).length;

          return (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-brand-black text-white"
                  : "bg-white text-neutral-600 hover:bg-neutral-300 border border-neutral-300"
              )}
            >
              {tab.label}
              {count > 0 && (
                <span
                  className={cn(
                    "ml-1.5 text-xs px-1.5 py-0.5 rounded-full",
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-neutral-200 text-neutral-500"
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <SkeletonList />
      ) : filteredItems.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <InboxCard
              key={item.id}
              item={item}
              isActioning={actionLoading === item.id}
              onApprove={() => handleAction(item.id, "done")}
              onDismiss={() => handleAction(item.id, "dismissed")}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Inbox Card ─────────────────────────────────────────────────────────────

function InboxCard({
  item,
  isActioning,
  onApprove,
  onDismiss,
}: {
  item: InboxItem;
  isActioning: boolean;
  onApprove: () => void;
  onDismiss: () => void;
}) {
  const typeConfig = TYPE_CONFIG[item.type] ?? {
    label: item.type,
    color: "text-neutral-700",
    bgColor: "bg-neutral-100",
  };

  const { text: timeText, isUrgent } = formatRelativeTime(item.createdAt);

  return (
    <div className="bg-white rounded-xl border border-neutral-300 p-5 hover:shadow-sm transition-shadow">
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        {/* Left: content */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Top row: badge + time */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                "text-xs font-semibold px-2 py-0.5 rounded-full",
                typeConfig.bgColor,
                typeConfig.color
              )}
            >
              {typeConfig.label}
            </span>
            {item.priority === "high" && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                High
              </span>
            )}
            <span
              className={cn(
                "text-xs",
                isUrgent ? "text-red-600 font-semibold" : "text-neutral-400"
              )}
            >
              {isUrgent ? `Urgent \u2014 ${timeText}` : timeText}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-sm font-semibold text-brand-black truncate">
            {item.title ?? "Untitled item"}
          </h3>

          {/* Summary */}
          {item.summary && (
            <p className="text-sm text-neutral-500 line-clamp-2">
              {item.summary}
            </p>
          )}

          {/* Protocol / source */}
          <div className="flex items-center gap-3 text-xs text-neutral-400">
            {item.protocol && <span>Protocol: {item.protocol}</span>}
            {item.sourceType && <span>Source: {item.sourceType}</span>}
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2 shrink-0 sm:pt-1">
          <button
            onClick={onApprove}
            disabled={isActioning}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-success text-white hover:bg-green-700 transition-colors disabled:opacity-50"
            aria-label={`Approve: ${item.title ?? "item"}`}
          >
            Approve
          </button>
          <button
            disabled={isActioning}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-brand-cerulean text-white hover:bg-brand-cerulean-dark transition-colors disabled:opacity-50"
            aria-label={`Edit: ${item.title ?? "item"}`}
          >
            Edit
          </button>
          <button
            onClick={onDismiss}
            disabled={isActioning}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-neutral-200 text-neutral-600 hover:bg-neutral-300 transition-colors disabled:opacity-50"
            aria-label={`Dismiss: ${item.title ?? "item"}`}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Empty State ────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="bg-white rounded-xl border border-neutral-300 p-12 text-center">
      <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-success-light flex items-center justify-center">
        <svg
          className="w-6 h-6 text-success"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      </div>
      <h3 className="text-sm font-semibold text-brand-black mb-1">
        No items waiting
      </h3>
      <p className="text-sm text-neutral-500">
        Arya is handling everything. Check back later.
      </p>
    </div>
  );
}

// ─── Skeleton Loading ───────────────────────────────────────────────────────

function SkeletonList() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="bg-white rounded-xl border border-neutral-300 p-5 animate-pulse"
        >
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-5 w-16 bg-neutral-200 rounded-full" />
                <div className="h-4 w-12 bg-neutral-200 rounded" />
              </div>
              <div className="h-4 w-3/4 bg-neutral-200 rounded" />
              <div className="h-4 w-1/2 bg-neutral-200 rounded" />
            </div>
            <div className="flex gap-2">
              <div className="h-8 w-20 bg-neutral-200 rounded-lg" />
              <div className="h-8 w-16 bg-neutral-200 rounded-lg" />
              <div className="h-8 w-20 bg-neutral-200 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
