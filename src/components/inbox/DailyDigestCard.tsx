"use client";

// ─── Daily Digest Card ──────────────────────────────────────────────────────
// Displays the daily summary of overdue, due-today, and inactive projects.
// Rendered in the inbox for items with type "daily_digest" or "deadline_alert".

import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

interface OverdueProject {
  name: string;
  spaceName: string;
  daysBehind: number;
  url: string;
}

interface DueTodayProject {
  name: string;
  spaceName: string;
  url: string;
}

interface InactiveProject {
  name: string;
  spaceName: string;
  daysSinceUpdate: number;
  url: string;
}

export interface DailyDigestPayload {
  text: string;
  overdue: number;
  dueToday: number;
  inactive: number;
  totalActive: number;
  data?: {
    overdue: OverdueProject[];
    dueToday: DueTodayProject[];
    inactive: InactiveProject[];
    teamLoad: Record<string, { active: number }>;
  };
}

export interface DeadlineAlertPayload {
  text: string;
  taskId: string;
  taskName: string;
  taskUrl: string;
  spaceName: string;
  status: string;
  dueDate: number;
  hoursUntilDue: number;
}

interface DailyDigestCardProps {
  itemId: string;
  type: "daily_digest" | "deadline_alert";
  title: string;
  payload: DailyDigestPayload | DeadlineAlertPayload;
  createdAt: string;
  onDismissed: () => void;
  showToast: (message: string, type: "success" | "error") => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function DailyDigestCard({
  itemId,
  type,
  title,
  payload,
  createdAt,
  onDismissed,
  showToast,
}: DailyDigestCardProps) {
  const handleDismiss = async () => {
    try {
      const res = await fetch(`/api/admin/inbox/${itemId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "done" }),
      });
      if (res.ok) {
        onDismissed();
      } else {
        showToast("Failed to dismiss", "error");
      }
    } catch {
      showToast("Network error", "error");
    }
  };

  // Deadline alert — compact format
  if (type === "deadline_alert") {
    const alertPayload = payload as DeadlineAlertPayload;
    const isUrgent = alertPayload.hoursUntilDue <= 6;
    return (
      <div
        className={cn(
          "rounded-xl border p-4 transition-all",
          isUrgent
            ? "border-brand-flame/30 bg-brand-flame/5"
            : "border-brand-lemon/30 bg-brand-lemon/5"
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full",
                  isUrgent
                    ? "bg-brand-flame/10 text-brand-flame"
                    : "bg-brand-lemon/20 text-amber-700"
                )}
              >
                {isUrgent ? "URGENT" : "DEADLINE"}
              </span>
              <span className="text-xs text-neutral-400">{formatRelativeTime(createdAt)}</span>
            </div>
            <p className="text-sm font-medium text-brand-black leading-snug">
              {alertPayload.taskName}
            </p>
            <p className="text-xs text-neutral-500 mt-0.5">
              {alertPayload.spaceName} — due in {alertPayload.hoursUntilDue}h — status: {alertPayload.status}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {alertPayload.taskUrl && (
              <a
                href={alertPayload.taskUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-brand-cerulean hover:underline"
              >
                Open in ClickUp
              </a>
            )}
            <button
              onClick={handleDismiss}
              className="p-1.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
              aria-label="Dismiss alert"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Daily digest — full format
  const digestPayload = payload as DailyDigestPayload;
  const data = digestPayload.data;

  return (
    <div className="rounded-xl border border-brand-cerulean/20 bg-brand-cerulean/5 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-cerulean/10 text-brand-cerulean">
              DAILY DIGEST
            </span>
            <span className="text-xs text-neutral-400">{formatRelativeTime(createdAt)}</span>
          </div>
          <p className="text-sm font-medium text-brand-black">{title}</p>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
          aria-label="Dismiss digest"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatBadge
          label="Overdue"
          value={digestPayload.overdue}
          variant={digestPayload.overdue > 0 ? "danger" : "neutral"}
        />
        <StatBadge
          label="Due today"
          value={digestPayload.dueToday}
          variant={digestPayload.dueToday > 0 ? "warning" : "neutral"}
        />
        <StatBadge
          label="Inactive 3d+"
          value={digestPayload.inactive}
          variant={digestPayload.inactive > 0 ? "warning" : "neutral"}
        />
        <StatBadge
          label="Active"
          value={digestPayload.totalActive}
          variant="neutral"
        />
      </div>

      {/* Overdue details */}
      {data && data.overdue.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
            Overdue Projects
          </h4>
          <div className="space-y-1">
            {data.overdue.slice(0, 5).map((p) => (
              <div key={p.url} className="flex items-center justify-between text-sm">
                <span className="text-brand-black truncate">
                  {p.name}{" "}
                  <span className="text-neutral-400">({p.spaceName})</span>
                </span>
                <span className="text-brand-flame text-xs font-medium shrink-0 ml-2">
                  {p.daysBehind}d overdue
                </span>
              </div>
            ))}
            {data.overdue.length > 5 && (
              <p className="text-xs text-neutral-400">
                +{data.overdue.length - 5} more
              </p>
            )}
          </div>
        </div>
      )}

      {/* Due today details */}
      {data && data.dueToday.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
            Due Today
          </h4>
          <div className="space-y-1">
            {data.dueToday.slice(0, 5).map((p) => (
              <div key={p.url} className="flex items-center text-sm">
                <span className="text-brand-black truncate">
                  {p.name}{" "}
                  <span className="text-neutral-400">({p.spaceName})</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team load */}
      {data && Object.keys(data.teamLoad).length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
            Active by Client
          </h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.teamLoad)
              .filter(([, v]) => v.active > 0)
              .sort(([, a], [, b]) => b.active - a.active)
              .slice(0, 8)
              .map(([client, load]) => (
                <span
                  key={client}
                  className="inline-flex items-center gap-1 text-xs bg-neutral-100 text-neutral-600 rounded-full px-2.5 py-1"
                >
                  {client}: <span className="font-semibold">{load.active}</span>
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── StatBadge sub-component ────────────────────────────────────────────────

function StatBadge({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant: "danger" | "warning" | "neutral";
}) {
  return (
    <div
      className={cn(
        "rounded-lg px-3 py-2 text-center",
        variant === "danger" && "bg-brand-flame/10",
        variant === "warning" && "bg-brand-lemon/15",
        variant === "neutral" && "bg-neutral-100"
      )}
    >
      <p
        className={cn(
          "text-xl font-bold",
          variant === "danger" && "text-brand-flame",
          variant === "warning" && "text-amber-600",
          variant === "neutral" && "text-neutral-600"
        )}
      >
        {value}
      </p>
      <p className="text-[10px] font-medium text-neutral-500 uppercase tracking-wide mt-0.5">
        {label}
      </p>
    </div>
  );
}
