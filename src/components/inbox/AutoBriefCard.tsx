"use client";

// ─── Auto Brief Card ────────────────────────────────────────────────────────
// Inline form for reviewing and executing auto-extracted briefs.
// Displayed in the inbox when an item has type "auto_brief_ready".

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AutoBriefPayload {
  sourceInboxItemId: string;
  projectName: string;
  clientName: string;
  contactEmail: string;
  startDate: string;
  briefBody: string;
  projectType: "generic" | "design" | "video" | "translation";
  clientResolved: boolean;
  clickupSpaceId?: string;
  excelTrackerFilename?: string;
  sharepointCustomerFolder?: string;
  extractionError?: boolean;
}

interface ClientOption {
  spaceName: string;
  spaceId: string;
}

interface AutoBriefCardProps {
  itemId: string;
  payload: AutoBriefPayload;
  clients: ClientOption[];
  createdAt: string;
  onCreated: () => void;
  onDismissed: () => void;
  showToast: (message: string, type: "success" | "error") => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function AutoBriefCard({
  itemId,
  payload,
  clients,
  createdAt,
  onCreated,
  onDismissed,
  showToast,
}: AutoBriefCardProps) {
  const [projectName, setProjectName] = useState(payload.projectName);
  const [selectedSpaceId, setSelectedSpaceId] = useState(payload.clickupSpaceId ?? "");
  const [brief, setBrief] = useState(payload.briefBody);
  const [contactEmail, setContactEmail] = useState(payload.contactEmail);
  const [startDate, setStartDate] = useState(
    payload.startDate || new Date().toISOString().slice(0, 10)
  );
  const [creating, setCreating] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  const clientResolved = payload.clientResolved && !!selectedSpaceId;
  const canCreate = projectName.trim().length > 0 && selectedSpaceId.length > 0;

  const handleCreate = useCallback(async () => {
    if (!canCreate) return;
    setCreating(true);

    try {
      const res = await fetch("/api/auto-brief/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inboxItemId: itemId,
          projectName: projectName.trim(),
          clientName:
            clients.find((c) => c.spaceId === selectedSpaceId)?.spaceName ?? payload.clientName,
          brief,
          contactEmail,
          startDate,
          clickupSpaceId: selectedSpaceId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const warningCount = (data.warnings as string[] | undefined)?.length ?? 0;
        if (warningCount > 0) {
          showToast(
            `Project created with ${warningCount} warning${warningCount > 1 ? "s" : ""} — check console`,
            "success"
          );
          console.warn("[Auto-Brief] Warnings:", data.warnings);
        } else {
          showToast("Project created successfully", "success");
        }
        onCreated();
      } else {
        const errData = await res.json().catch(() => ({ error: "Unknown error" }));
        const errMsg = (errData as Record<string, unknown>).error ?? "Unknown error";
        showToast(`Failed: ${errMsg}`, "error");
      }
    } catch (err) {
      console.error("[AutoBriefCard] create error:", err);
      showToast("Network error — please retry", "error");
    } finally {
      setCreating(false);
    }
  }, [
    canCreate, itemId, projectName, selectedSpaceId, brief,
    contactEmail, startDate, clients, payload.clientName,
    onCreated, showToast,
  ]);

  const handleDismiss = useCallback(async () => {
    setDismissing(true);
    try {
      const res = await fetch("/api/admin/inbox", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: itemId, status: "dismissed" }),
      });
      if (res.ok) {
        showToast("Brief dismissed", "success");
        onDismissed();
      } else {
        showToast("Failed to dismiss — please retry", "error");
      }
    } catch {
      showToast("Network error — please retry", "error");
    } finally {
      setDismissing(false);
    }
  }, [itemId, onDismissed, showToast]);

  const timeAgo = formatRelativeTime(createdAt);

  return (
    <div className="bg-white rounded-xl border border-brand-cerulean/30 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-cerulean/10 text-brand-cerulean">
            Auto Brief
          </span>
          {payload.extractionError && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-flame/20 text-brand-flame">
              Extraction failed — fill manually
            </span>
          )}
          {!payload.clientResolved && !payload.extractionError && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-lemon/30 text-yellow-700">
              Unknown client
            </span>
          )}
        </div>
        <span className="text-xs text-neutral-400">{timeAgo}</span>
      </div>

      {/* Form fields */}
      <div className="space-y-3">
        {/* Project Name */}
        <div>
          <label
            htmlFor={`abf-name-${itemId}`}
            className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1"
          >
            Project Name
          </label>
          <input
            id={`abf-name-${itemId}`}
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean/40 focus:border-brand-cerulean"
          />
        </div>

        {/* Client + Contact row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor={`abf-client-${itemId}`}
              className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1"
            >
              Client
            </label>
            <select
              id={`abf-client-${itemId}`}
              value={selectedSpaceId}
              onChange={(e) => setSelectedSpaceId(e.target.value)}
              className={cn(
                "w-full rounded-lg border bg-neutral-50 px-3 py-2 text-sm text-brand-black",
                "focus:outline-none focus:ring-2 focus:ring-brand-cerulean/40 focus:border-brand-cerulean",
                !clientResolved && "border-yellow-400"
              )}
            >
              <option value="">Select a client...</option>
              {clients.map((c) => (
                <option key={c.spaceId} value={c.spaceId}>
                  {c.spaceName}
                </option>
              ))}
            </select>
            {!clientResolved && (
              <p className="text-xs text-yellow-600 mt-1">
                Unknown client — select manually
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor={`abf-contact-${itemId}`}
              className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1"
            >
              Contact
            </label>
            <input
              id={`abf-contact-${itemId}`}
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean/40 focus:border-brand-cerulean"
            />
          </div>
        </div>

        {/* Start Date */}
        <div className="max-w-[200px]">
          <label
            htmlFor={`abf-date-${itemId}`}
            className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1"
          >
            Start Date
          </label>
          <input
            id={`abf-date-${itemId}`}
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean/40 focus:border-brand-cerulean"
          />
        </div>

        {/* Brief textarea */}
        <div>
          <label
            htmlFor={`abf-brief-${itemId}`}
            className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1"
          >
            Brief (editable)
          </label>
          <textarea
            id={`abf-brief-${itemId}`}
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            rows={12}
            className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm font-mono text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean/40 focus:border-brand-cerulean resize-y"
            aria-label="Brief content with emoji section headers"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200">
        <button
          onClick={handleDismiss}
          disabled={dismissing || creating}
          className="px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-medium bg-neutral-200 text-neutral-600 hover:bg-neutral-300 transition-colors disabled:opacity-50"
          aria-label="Dismiss this auto-brief"
        >
          {dismissing ? "Dismissing..." : "Dismiss"}
        </button>
        <button
          onClick={handleCreate}
          disabled={!canCreate || creating || dismissing}
          className={cn(
            "px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50",
            canCreate
              ? "bg-success hover:bg-green-700"
              : "bg-neutral-300 cursor-not-allowed"
          )}
          aria-label="Create project from this brief"
        >
          {creating ? "Creating..." : "Create Project"}
        </button>
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / 3_600_000;
  const diffDays = diffMs / 86_400_000;

  if (diffHours < 1) {
    const mins = Math.floor(diffMs / 60_000);
    return mins < 1 ? "Just now" : `${mins}m ago`;
  }
  if (diffHours < 24) {
    return `${Math.floor(diffHours)}h ago`;
  }
  if (diffDays < 7) {
    return `${Math.floor(diffDays)}d ago`;
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
