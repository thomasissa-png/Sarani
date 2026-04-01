"use client";

// ─── Auto Brief Card ────────────────────────────────────────────────────────
// Inline form for reviewing and executing auto-extracted briefs.
// Displayed in the inbox when an item has type "auto_brief_ready".

import { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { CLICKUP_TEAM_MEMBERS } from "@/lib/integrations/config";

type Assignee = { name: string; clickupUserId: number };

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AutoBriefPayload {
  sourceInboxItemId: string;
  projectName: string;
  clientName: string;
  entity?: string;
  contactEmail: string;
  startDate: string;
  briefBody: string;
  projectType: "generic" | "design" | "video" | "translation" | "social" | "other";
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
  const [entity, setEntity] = useState(payload.entity || payload.clientName || "");
  const [brief, setBrief] = useState(payload.briefBody);
  const [contactEmail, setContactEmail] = useState(payload.contactEmail);
  const [startDate, setStartDate] = useState(
    payload.startDate || new Date().toISOString().slice(0, 10)
  );
  const [projectType, setProjectType] = useState<string>(payload.projectType ?? "generic");
  const [addToTracker, setAddToTracker] = useState(payload.clientResolved && !!payload.excelTrackerFilename);
  const [createSharepointFolder, setCreateSharepointFolder] = useState(payload.clientResolved && !!payload.sharepointCustomerFolder);
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [dbAssignees, setDbAssignees] = useState<Assignee[]>([]);
  const [creating, setCreating] = useState(false);

  // Fetch assignees from DB (users with ClickUp mapping), fallback to hardcoded
  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/users/assignees")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.assignees?.length > 0) {
          setDbAssignees(data.assignees);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const assigneeOptions: Array<{ name: string; id: number }> = dbAssignees.length > 0
    ? dbAssignees.map((a) => ({ name: a.name, id: a.clickupUserId }))
    : CLICKUP_TEAM_MEMBERS.map((m) => ({ name: m.name, id: m.id }));
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
          entity: entity.trim() || undefined,
          brief,
          contactEmail,
          startDate,
          projectType,
          clickupSpaceId: selectedSpaceId,
          addToTracker,
          createSharepointFolder,
          assigneeId: assigneeId ? Number(assigneeId) : undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const warningCount = (data.warnings as string[] | undefined)?.length ?? 0;
        const clickupUrl = (data.clickupUrl as string) ?? "";
        const createdName = projectName.trim();
        if (warningCount > 0) {
          showToast(
            `Project created: ${createdName}${warningCount > 0 ? ` (${warningCount} warning${warningCount > 1 ? "s" : ""})` : ""}`,
            "success"
          );
          console.warn("[Auto-Brief] Warnings:", data.warnings);
        } else {
          showToast(
            `Project created: ${createdName}`,
            "success"
          );
        }
        // Open ClickUp task if URL returned
        if (clickupUrl) {
          window.open(clickupUrl, "_blank", "noopener,noreferrer");
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
    canCreate, itemId, projectName, selectedSpaceId, entity, brief,
    contactEmail, startDate, projectType, clients, payload.clientName,
    addToTracker, createSharepointFolder, assigneeId,
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
    <div className="bg-white rounded-xl border border-brand-cerulean/50 p-5 space-y-4">
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
        <div className="flex items-center gap-2">
          {payload.sourceInboxItemId && (
            <a
              href={`/admin?scrollTo=inbox-${payload.sourceInboxItemId}`}
              className="text-xs text-brand-cerulean hover:underline font-medium"
              aria-label="View original email in inbox"
            >
              View original email
            </a>
          )}
          <span className="text-xs text-neutral-400">{timeAgo}</span>
        </div>
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

        {/* Entity */}
        <div>
          <label
            htmlFor={`abf-entity-${itemId}`}
            className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1"
          >
            Entity / Subsidiary
          </label>
          <input
            id={`abf-entity-${itemId}`}
            type="text"
            value={entity}
            onChange={(e) => setEntity(e.target.value)}
            placeholder="e.g. Sony France, TikTok EMEA"
            className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean/40 focus:border-brand-cerulean"
          />
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

        {/* Project Type */}
        <div className="max-w-[200px]">
          <label
            htmlFor={`abf-type-${itemId}`}
            className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1"
          >
            Project Type
          </label>
          <select
            id={`abf-type-${itemId}`}
            value={projectType}
            onChange={(e) => setProjectType(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean/40 focus:border-brand-cerulean"
          >
            <option value="generic">Generic</option>
            <option value="design">Design</option>
            <option value="video">Video</option>
            <option value="translation">Translation</option>
            <option value="social">Social</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Tracker + SharePoint checkboxes */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={addToTracker}
              onChange={(e) => setAddToTracker(e.target.checked)}
              className="rounded border-neutral-300 text-brand-cerulean focus:ring-brand-cerulean/40"
            />
            <span className="text-sm text-brand-black">
              Add row to Excel tracker
            </span>
            <span className="text-xs text-neutral-400">
              {payload.excelTrackerFilename
                ? `(${payload.excelTrackerFilename})`
                : "(client not resolved — select client first)"}
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={createSharepointFolder}
              onChange={(e) => setCreateSharepointFolder(e.target.checked)}
              className="rounded border-neutral-300 text-brand-cerulean focus:ring-brand-cerulean/40"
            />
            <span className="text-sm text-brand-black">
              Create SharePoint folder
            </span>
            <span className="text-xs text-neutral-400">
              {payload.sharepointCustomerFolder
                ? `(${payload.sharepointCustomerFolder})`
                : "(client not resolved — select client first)"}
            </span>
          </label>
        </div>

        {/* Assign to */}
        <div>
          <label
            htmlFor={`abf-assignee-${itemId}`}
            className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1"
          >
            Assign to
          </label>
          <select
            id={`abf-assignee-${itemId}`}
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 min-h-[44px] text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean/40 focus:border-brand-cerulean"
          >
            <option value="">— Unassigned —</option>
            {assigneeOptions.map((m) => (
              <option key={m.id} value={String(m.id)}>
                {m.name}
              </option>
            ))}
          </select>
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
            className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm font-sans text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean/40 focus:border-brand-cerulean resize-y"
            aria-label="Brief content with emoji section headers"
          />
        </div>
      </div>

      {/* Next step hint */}
      <p className="text-xs text-neutral-500 pl-1">
        Next: Review pre-filled brief, then create project
      </p>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-neutral-200">
        <button
          onClick={handleDismiss}
          disabled={dismissing || creating}
          className="px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-medium bg-neutral-200 text-neutral-600 hover:bg-neutral-300 transition-colors disabled:opacity-50"
          aria-label="Archive this auto-brief"
        >
          {dismissing ? "Archiving..." : "Archive"}
        </button>
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={handleCreate}
            disabled={!canCreate || creating || dismissing}
            className={cn(
              "px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50",
              canCreate
                ? "bg-success hover:bg-green-700"
                : "bg-neutral-300 cursor-not-allowed"
            )}
            aria-label="Create project: ClickUp task, SharePoint folder, and Tracker row"
          >
            {creating ? "Creating..." : "Create Project"}
          </button>
          <span className="text-[11px] text-neutral-400 leading-tight">
            Creates ClickUp task + SharePoint folder + Tracker row
          </span>
        </div>
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
