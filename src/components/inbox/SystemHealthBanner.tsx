"use client";

// ─── System Health Banner ──────────────────────────────────────────────────
// Polls /api/admin/health every 60s. Shows a red alert banner when degraded/down.
// Hidden when everything is healthy.

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

interface HealthCheck {
  ok: boolean;
  lastRun: string | null;
}

interface HealthResponse {
  status: "healthy" | "degraded" | "down";
  schedulerRunning: boolean;
  checks: {
    cronPollEmails: HealthCheck;
    cronScanKnowledge: HealthCheck;
    clickupApi: { ok: boolean };
    emailApi: { ok: boolean };
  };
}

function formatTimeAgo(isoDate: string | null): string {
  if (!isoDate) return "never";
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins === 1) return "1 min ago";
  if (mins < 60) return `${mins}min ago`;
  const hours = Math.round(mins / 60);
  return `${hours}h ago`;
}

export function SystemHealthBanner() {
  const [health, setHealth] = useState<HealthResponse | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/health", {
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        const data = (await res.json()) as HealthResponse;
        setHealth(data);
      }
    } catch {
      // Silently fail — don't block inbox if health endpoint is down
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 60_000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  // Don't show anything if healthy or loading
  if (!health || health.status === "healthy") return null;

  // Build alert message from failing checks
  const issues: string[] = [];

  // If scheduler is not running at all, that's the root cause — don't spam individual cron alerts
  if (!health.schedulerRunning) {
    issues.push("Scheduler is starting up — crons will resume shortly");
  } else {
    if (!health.checks.cronPollEmails.ok) {
      const lastRun = formatTimeAgo(health.checks.cronPollEmails.lastRun);
      issues.push(`Email polling is not running (last run: ${lastRun})`);
    }
    if (!health.checks.cronScanKnowledge.ok) {
      issues.push("Knowledge scan cron may be stalled");
    }
  }
  if (!health.checks.emailApi.ok) {
    issues.push("Email API (Microsoft Graph) is unreachable");
  }
  if (!health.checks.clickupApi.ok) {
    issues.push("ClickUp API is unreachable");
  }

  if (issues.length === 0) return null;

  // If the only issue is scheduler starting up, show an info banner instead of error
  const isStartingUp = issues.length === 1 && !health.schedulerRunning;

  return (
    <div
      className={cn(
        "border rounded-lg px-4 py-3 text-sm",
        isStartingUp
          ? "bg-amber-50 border-amber-200 text-amber-700"
          : "bg-red-50 border-red-200 text-red-700",
      )}
      role="alert"
    >
      <p className="font-semibold flex items-center gap-1.5">
        <span aria-hidden="true">{isStartingUp ? "\u23F3" : "\u26A0\uFE0F"}</span>
        {isStartingUp ? "Starting up" : "System alert"}
      </p>
      <ul className="mt-1 space-y-0.5">
        {issues.map((issue) => (
          <li key={issue}>{issue}</li>
        ))}
      </ul>
    </div>
  );
}
