"use client";

// SSR: false — Client Component for interactive inbox with filters and actions.
// This replaces the old SSR dashboard. The inbox is the PM's primary workspace.

import { useState, useEffect, useCallback, useRef } from "react";
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
  arya_payload?: Record<string, unknown> | null;
}

interface ToastState {
  message: string;
  type: "success" | "error";
}

// ─── Constants ──────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  InboxItemType,
  { label: string; color: string; bgColor: string }
> = {
  email_classified: {
    label: "Email",
    color: "text-brand-cerulean",
    bgColor: "bg-brand-cerulean/10",
  },
  ai_team_complete: {
    label: "AI Deliverable",
    color: "text-brand-flame",
    bgColor: "bg-brand-flame/10",
  },
  qa_gates_pass: {
    label: "QA Pass",
    color: "text-success",
    bgColor: "bg-success/10",
  },
  followup_alert: {
    label: "Follow-up",
    color: "text-brand-flame",
    bgColor: "bg-brand-flame/20",
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

// ─── Toast Component ───────────────────────────────────────────────────────

function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 text-white text-sm font-medium transition-opacity",
        toast.type === "success" ? "bg-success" : "bg-brand-flame"
      )}
      role="status"
      aria-live="polite"
    >
      {toast.message}
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function InboxPage() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
  }, []);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams();
      params.set("status", "pending");

      const res = await fetch(`/api/admin/inbox?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items ?? []);
      } else {
        const errMsg = `Failed to load inbox (${res.status})`;
        console.error("[Inbox] fetch error:", res.status, res.statusText);
        setFetchError(errMsg);
      }
    } catch (error) {
      console.error("[Inbox] fetch error:", error);
      setFetchError("Unable to reach server — check your connection");
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
        setItems((prev) => prev.filter((item) => item.id !== id));
        showToast(
          status === "done" ? "Item approved — chain triggered" : "Item dismissed",
          "success"
        );
        if (editingId === id) setEditingId(null);
      } else {
        console.error("[Inbox] action error:", res.status, res.statusText);
        showToast("Action failed — please retry", "error");
      }
    } catch (error) {
      console.error("[Inbox] action error:", error);
      showToast("Action failed — please retry", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleEdit = (item: InboxItem) => {
    if (editingId === item.id) {
      setEditingId(null);
      return;
    }
    setEditingId(item.id);
    setEditContent(
      item.arya_payload
        ? JSON.stringify(item.arya_payload, null, 2)
        : item.summary ?? ""
    );
  };

  const handleSaveAndApprove = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch("/api/admin/inbox", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "done", pm_action: editContent }),
      });
      if (res.ok) {
        setItems((prev) => prev.filter((item) => item.id !== id));
        setEditingId(null);
        showToast("Saved & approved — chain triggered", "success");
      } else {
        console.error("[Inbox] save error:", res.status, res.statusText);
        showToast("Save failed — please retry", "error");
      }
    } catch (error) {
      console.error("[Inbox] save error:", error);
      showToast("Save failed — please retry", "error");
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

      {/* Fetch error banner */}
      {fetchError && (
        <div className="bg-brand-flame/10 border border-brand-flame/30 rounded-lg px-4 py-3 text-sm text-brand-flame" role="alert">
          {fetchError}
          <button
            onClick={fetchItems}
            className="ml-3 underline font-medium hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

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
                "px-3 py-2.5 min-h-[44px] rounded-lg text-sm font-medium transition-colors",
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
              isEditing={editingId === item.id}
              editContent={editingId === item.id ? editContent : ""}
              onApprove={() => handleAction(item.id, "done")}
              onDismiss={() => handleAction(item.id, "dismissed")}
              onEdit={() => handleEdit(item)}
              onEditContentChange={setEditContent}
              onSaveAndApprove={() => handleSaveAndApprove(item.id)}
            />
          ))}
        </div>
      )}

      {/* Toast */}
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}

// ─── Inbox Card ─────────────────────────────────────────────────────────────

function InboxCard({
  item,
  isActioning,
  isEditing,
  editContent,
  onApprove,
  onDismiss,
  onEdit,
  onEditContentChange,
  onSaveAndApprove,
}: {
  item: InboxItem;
  isActioning: boolean;
  isEditing: boolean;
  editContent: string;
  onApprove: () => void;
  onDismiss: () => void;
  onEdit: () => void;
  onEditContentChange: (value: string) => void;
  onSaveAndApprove: () => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typeConfig = TYPE_CONFIG[item.type] ?? {
    label: item.type,
    color: "text-neutral-700",
    bgColor: "bg-neutral-100",
  };

  const { text: timeText, isUrgent } = formatRelativeTime(item.createdAt);

  // Extract email count from summary payload (set by webhook thread aggregation)
  const emailCount = (() => {
    if (!item.summary) return 1;
    try {
      const parsed = JSON.parse(item.summary) as Record<string, unknown>;
      const count = parsed.emailCount;
      return typeof count === "number" && count > 0 ? count : 1;
    } catch {
      return 1;
    }
  })();

  // Auto-focus textarea when editing opens
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  return (
    <div className="bg-white rounded-xl border border-neutral-300 p-5 hover:shadow-sm transition-shadow">
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        {/* Left: content */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Top row: badge + time + email count */}
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
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-flame/20 text-brand-flame">
                High
              </span>
            )}
            {emailCount > 1 && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-cerulean/15 text-brand-cerulean">
                {emailCount} emails
              </span>
            )}
            <span
              className={cn(
                "text-xs",
                isUrgent ? "text-brand-flame font-semibold" : "text-neutral-400"
              )}
            >
              {isUrgent ? `Urgent — ${timeText}` : timeText}
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
            className="px-3 py-2.5 min-h-[44px] rounded-lg text-sm font-medium bg-success text-white hover:bg-green-700 transition-colors disabled:opacity-50"
            aria-label={`Approve: ${item.title ?? "item"}`}
          >
            Approve
          </button>
          <button
            onClick={onEdit}
            disabled={isActioning}
            className={cn(
              "px-3 py-2.5 min-h-[44px] rounded-lg text-sm font-medium transition-colors disabled:opacity-50",
              isEditing
                ? "bg-brand-cerulean-dark text-white"
                : "bg-brand-cerulean text-white hover:bg-brand-cerulean-dark"
            )}
            aria-label={`Edit: ${item.title ?? "item"}`}
            aria-expanded={isEditing}
          >
            Edit
          </button>
          <button
            onClick={onDismiss}
            disabled={isActioning}
            className="px-3 py-2.5 min-h-[44px] rounded-lg text-sm font-medium bg-neutral-200 text-neutral-600 hover:bg-neutral-300 transition-colors disabled:opacity-50"
            aria-label={`Dismiss: ${item.title ?? "item"}`}
          >
            Dismiss
          </button>
        </div>
      </div>

      {/* Inline editor */}
      {isEditing && (
        <div className="mt-4 pt-4 border-t border-neutral-200 space-y-3">
          <label htmlFor={`edit-${item.id}`} className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
            Payload / Content
          </label>
          <textarea
            ref={textareaRef}
            id={`edit-${item.id}`}
            value={editContent}
            onChange={(e) => onEditContentChange(e.target.value)}
            rows={8}
            className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm font-mono text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean/40 focus:border-brand-cerulean resize-y"
            aria-label="Edit payload content"
          />
          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={onEdit}
              className="px-3 py-2.5 min-h-[44px] rounded-lg text-sm font-medium bg-neutral-200 text-neutral-600 hover:bg-neutral-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onSaveAndApprove}
              disabled={isActioning}
              className="px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-medium bg-success text-white hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {isActioning ? "Saving..." : "Save & Approve"}
            </button>
          </div>
        </div>
      )}
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
