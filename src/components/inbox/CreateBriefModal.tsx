"use client";

// ─── Create Brief Modal ─────────────────────────────────────────────────────
// Inline modal for reviewing email data and creating a project brief.
// Renders over the inbox with full email context + editable brief fields.

import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { EmailPayload } from "./EmailCard";
import { CLICKUP_TEAM_MEMBERS } from "@/lib/integrations/config";

type Assignee = { name: string; clickupUserId: number };

// ─── Types ──────────────────────────────────────────────────────────────────

interface ClientOption {
  spaceName: string;
  spaceId: string;
  excelTrackerFilename?: string;
  sharepointCustomerFolder?: string;
}

interface CreateBriefModalProps {
  itemId: string;
  sourceId: string | null;
  payload: EmailPayload;
  clients: ClientOption[];
  onClose: () => void;
  onCreated: () => void;
  showToast: (message: string, type: "success" | "error") => void;
}

type ProjectType = "design" | "video" | "translation" | "social" | "other";

const PROJECT_TYPES: { value: ProjectType; label: string }[] = [
  { value: "design", label: "Design" },
  { value: "video", label: "Video" },
  { value: "translation", label: "Translation" },
  { value: "social", label: "Social Media" },
  { value: "other", label: "Other" },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function extractClientFromEmail(from: string, clients: ClientOption[]): ClientOption | null {
  const lower = from.toLowerCase();
  // Try to match sender domain or name against known clients
  for (const client of clients) {
    const cl = client.spaceName.toLowerCase();
    if (cl === "other customers") continue;
    if (lower.includes(cl) || cl.split(/\s+/).some((word) => lower.includes(word) && word.length > 2)) {
      return client;
    }
  }
  return null;
}

function buildDefaultBrief(payload: EmailPayload): string {
  return `🌟 Introduction / Goal:
${payload.subject}

✈️ Brief:
${payload.bodyPreview || "(To be confirmed)"}

🚚 Deliverables:
To be confirmed

📍 Source Files:
To be provided by client

💬 Branding / Inspirations:
See brand guidelines on SharePoint

➡️ Others:
N/A`;
}

function extractSenderName(email: string): string {
  const localPart = email.split("@")[0] ?? email;
  return localPart
    .replace(/[._-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Component ──────────────────────────────────────────────────────────────

export function CreateBriefModal({
  itemId,
  sourceId,
  payload,
  clients,
  onClose,
  onCreated,
  showToast,
}: CreateBriefModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFocusRef = useRef<HTMLInputElement>(null);

  // Form state
  const senderName = extractSenderName(payload.from);
  const matchedClient = extractClientFromEmail(payload.from, clients);

  const [projectName, setProjectName] = useState(
    `${matchedClient?.spaceName ?? senderName} - ${payload.subject}`
  );
  const [selectedSpaceId, setSelectedSpaceId] = useState(matchedClient?.spaceId ?? "");
  const [entity, setEntity] = useState("");
  const [brief, setBrief] = useState(buildDefaultBrief(payload));
  const [contactEmail, setContactEmail] = useState(payload.from);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [projectType, setProjectType] = useState<ProjectType>("other");
  const [addToTracker, setAddToTracker] = useState(!!matchedClient);
  const [createSharepointFolder, setCreateSharepointFolder] = useState(!!matchedClient);
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExtractingBrief, setIsExtractingBrief] = useState(true);
  const [entityOptions, setEntityOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoadingEntities, setIsLoadingEntities] = useState(false);

  // Fetch entities (folders + lists) when client changes
  useEffect(() => {
    if (!selectedSpaceId) {
      setEntityOptions([]);
      return;
    }
    let cancelled = false;
    setIsLoadingEntities(true);
    fetch(`/api/admin/clickup/entities?spaceId=${encodeURIComponent(selectedSpaceId)}`)
      .then((res) => res.ok ? res.json() : { entities: [] })
      .then((data) => {
        if (!cancelled) {
          setEntityOptions(data.entities ?? []);
        }
      })
      .catch(() => { /* fallback: keep text input */ })
      .finally(() => { if (!cancelled) setIsLoadingEntities(false); });
    return () => { cancelled = true; };
  }, [selectedSpaceId]);

  // LLM brief extraction on mount — Arya reformulates the email into a professional brief
  useEffect(() => {
    let cancelled = false;
    async function extractBrief() {
      try {
        const res = await fetch("/api/admin/brief/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            emailSubject: payload.subject,
            emailBody: payload.bodyPreview ?? "",
            senderEmail: payload.from,
          }),
        });
        if (res.ok && !cancelled) {
          const data = await res.json();
          // Update all fields with LLM extraction
          if (data.brief_body) setBrief(data.brief_body);
          if (data.entity) setEntity(data.entity);
          if (data.project_type && data.project_type !== "generic") {
            setProjectType(data.project_type as ProjectType);
          }
          if (data.client_name) {
            // Try to match client from extraction
            const extracted = clients.find(
              (c) => c.spaceName.toLowerCase().includes(data.client_name.toLowerCase()) ||
                data.client_name.toLowerCase().includes(c.spaceName.toLowerCase())
            );
            if (extracted) {
              setSelectedSpaceId(extracted.spaceId);
              setAddToTracker(true);
              setCreateSharepointFolder(true);
            }
          }
          if (data.project_title) {
            const clientName = data.client_name || matchedClient?.spaceName || senderName;
            setProjectName(`${clientName} - ${data.project_title}`);
          }
        }
      } catch {
        // Fallback: keep the default brief (buildDefaultBrief)
      } finally {
        if (!cancelled) setIsExtractingBrief(false);
      }
    }
    extractBrief();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [dbAssignees, setDbAssignees] = useState<Assignee[]>([]);

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

  // Compute final assignee list: DB users if available, else hardcoded fallback
  const assigneeOptions: Array<{ name: string; id: number }> = dbAssignees.length > 0
    ? dbAssignees.map((a) => ({ name: a.name, id: a.clickupUserId }))
    : CLICKUP_TEAM_MEMBERS.map((m) => ({ name: m.name, id: m.id }));

  // Focus trap + Escape
  useEffect(() => {
    firstFocusRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      // Focus trap
      if (e.key === "Tab" && dialogRef.current) {
        const focusableEls = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableEls.length === 0) return;
        const first = focusableEls[0];
        const last = focusableEls[focusableEls.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    // Prevent body scroll
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === overlayRef.current) {
        onClose();
      }
    },
    [onClose]
  );

  const handleSubmit = async () => {
    if (!selectedSpaceId) {
      showToast("Please select a client", "error");
      return;
    }
    if (!projectName.trim()) {
      showToast("Project name is required", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auto-brief/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inboxItemId: itemId,
          projectName: projectName.trim(),
          clientName:
            clients.find((c) => c.spaceId === selectedSpaceId)?.spaceName ?? "",
          entity: entity.trim() || undefined,
          brief,
          contactEmail,
          startDate,
          clickupSpaceId: selectedSpaceId,
          addToTracker,
          createSharepointFolder,
          assigneeId: assigneeId ? Number(assigneeId) : undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const warnings = data.warnings as string[] | undefined;
        if (warnings && warnings.length > 0) {
          showToast(`Project created with warnings: ${warnings[0]}`, "success");
        } else {
          showToast("Project created successfully", "success");
        }
        onCreated();
        onClose();
      } else {
        const errData = await res.json().catch(() => ({}));
        const errMsg =
          (errData as Record<string, unknown>).error ?? `Failed (${res.status})`;
        showToast(String(errMsg), "error");
      }
    } catch (err) {
      console.error("[CreateBriefModal] submit error:", err);
      showToast("Network error -- please retry", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 sm:p-6"
      onClick={handleOverlayClick}
      aria-hidden="false"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-brief-title"
        className={cn(
          "bg-white rounded-xl shadow-xl w-full max-w-2xl",
          "max-h-[90vh] flex flex-col",
          "sm:max-h-[85vh]",
          // Mobile: full-screen
          "max-sm:rounded-none max-sm:max-w-none max-sm:max-h-none max-sm:h-full max-sm:m-0"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 shrink-0">
          <h2
            id="create-brief-title"
            className="text-lg font-bold text-brand-black"
          >
            Create Project Brief
          </h2>
          <button
            onClick={onClose}
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
            aria-label="Close modal"
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Email context (readonly) */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
              Original Email
            </h3>
            <div className="bg-neutral-50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-neutral-500 w-14 shrink-0">
                  From
                </span>
                <span className="text-sm text-brand-black font-medium">
                  {senderName}
                </span>
                <span className="text-xs text-neutral-400">{payload.from}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-neutral-500 w-14 shrink-0">
                  Subject
                </span>
                <span className="text-sm text-brand-black font-medium">
                  {payload.subject}
                </span>
              </div>
              {payload.bodyPreview && (
                <div>
                  <span className="text-xs font-semibold text-neutral-500">
                    Body
                  </span>
                  <p className="text-sm text-neutral-600 leading-relaxed mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap">
                    {payload.bodyPreview}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Arya extraction separator */}
          {payload.classification.reasoning && (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="h-px bg-neutral-200 flex-1" />
                <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wide whitespace-nowrap">
                  Arya's Extraction
                </span>
                <div className="h-px bg-neutral-200 flex-1" />
              </div>
              <p className="text-sm text-neutral-500 italic leading-relaxed">
                {payload.classification.reasoning}
              </p>
            </div>
          )}

          {/* Editable fields */}
          <div className="space-y-4">
            {/* Project Name */}
            <div>
              <label
                htmlFor="brief-project-name"
                className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1.5"
              >
                Project Name
              </label>
              <input
                ref={firstFocusRef}
                id="brief-project-name"
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 min-h-[44px] text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean/40 focus:border-brand-cerulean"
                placeholder="Client - Project Subject"
              />
            </div>

            {/* Client dropdown */}
            <div>
              <label
                htmlFor="brief-client"
                className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1.5"
              >
                Client
              </label>
              <select
                id="brief-client"
                value={selectedSpaceId}
                onChange={(e) => setSelectedSpaceId(e.target.value)}
                className={cn(
                  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 min-h-[44px] text-sm focus:outline-none focus:ring-2 focus:ring-brand-cerulean/40 focus:border-brand-cerulean",
                  !selectedSpaceId && "text-neutral-400"
                )}
              >
                <option value="">Select a client...</option>
                {clients.map((c) => (
                  <option key={c.spaceId} value={c.spaceId}>
                    {c.spaceName}
                  </option>
                ))}
              </select>
              {matchedClient && (
                <p className="text-xs text-success mt-1">
                  Auto-matched from sender email
                </p>
              )}
            </div>

            {/* Entity / Subsidiary — dropdown from ClickUp folders+lists, with custom option */}
            <div>
              <label
                htmlFor="brief-entity"
                className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1.5"
              >
                Entity / Subsidiary {isLoadingEntities && <span className="text-brand-cerulean font-normal normal-case">(loading...)</span>}
              </label>
              {entityOptions.length > 0 ? (
                <select
                  id="brief-entity"
                  value={entity}
                  onChange={(e) => setEntity(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 min-h-[44px] text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean/40 focus:border-brand-cerulean"
                >
                  <option value="">— Select entity —</option>
                  {entityOptions.map((opt) => (
                    <option key={opt.id} value={opt.name}>
                      {opt.name}
                    </option>
                  ))}
                  <option value="__custom__">Other (type manually)...</option>
                </select>
              ) : (
                <input
                  id="brief-entity"
                  type="text"
                  value={entity}
                  onChange={(e) => setEntity(e.target.value)}
                  placeholder={selectedSpaceId ? "e.g. Sony France, TikTok EMEA" : "Select client first"}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 min-h-[44px] text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean/40 focus:border-brand-cerulean"
                />
              )}
              {entity === "__custom__" && (
                <input
                  type="text"
                  value=""
                  onChange={(e) => setEntity(e.target.value)}
                  placeholder="Type entity name..."
                  className="w-full mt-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-2.5 min-h-[44px] text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean/40 focus:border-brand-cerulean"
                  autoFocus
                />
              )}
            </div>

            {/* Tracker + SharePoint checkboxes with resolved paths */}
            {(() => {
              const selectedClient = clients.find((c) => c.spaceId === selectedSpaceId);
              const trackerFile = selectedClient?.excelTrackerFilename;
              const spFolder = selectedClient?.sharepointCustomerFolder;
              return (
                <div className="space-y-2">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={addToTracker}
                      onChange={(e) => setAddToTracker(e.target.checked)}
                      className="rounded border-neutral-300 text-brand-cerulean focus:ring-brand-cerulean/40 mt-0.5"
                    />
                    <div>
                      <span className="text-sm text-brand-black">Add row to Excel tracker</span>
                      {trackerFile ? (
                        <span className="block text-xs text-neutral-400">{trackerFile}</span>
                      ) : (
                        <span className="block text-xs text-neutral-400">(select client first)</span>
                      )}
                    </div>
                  </label>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createSharepointFolder}
                      onChange={(e) => setCreateSharepointFolder(e.target.checked)}
                      className="rounded border-neutral-300 text-brand-cerulean focus:ring-brand-cerulean/40 mt-0.5"
                    />
                    <div>
                      <span className="text-sm text-brand-black">Create SharePoint folder</span>
                      {spFolder ? (
                        <span className="block text-xs text-neutral-400">{spFolder}/</span>
                      ) : (
                        <span className="block text-xs text-neutral-400">(select client first)</span>
                      )}
                    </div>
                  </label>
                </div>
              );
            })()}

            {/* Brief textarea */}
            <div>
              <label
                htmlFor="brief-body"
                className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1.5"
              >
                Brief {isExtractingBrief && <span className="text-brand-cerulean font-normal normal-case">(Arya is preparing the brief...)</span>}
              </label>
              <textarea
                id="brief-body"
                value={isExtractingBrief ? "Arya is analyzing the email and preparing a professional brief for the ops team..." : brief}
                onChange={(e) => setBrief(e.target.value)}
                disabled={isExtractingBrief}
                rows={10}
                className={cn(
                  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean/40 focus:border-brand-cerulean resize-y leading-relaxed",
                  isExtractingBrief && "opacity-60 italic"
                )}
                placeholder="Project brief details..."
              />
            </div>

            {/* Row: Contact + Start Date + Project Type */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="brief-contact"
                  className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1.5"
                >
                  Contact Email
                </label>
                <input
                  id="brief-contact"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 min-h-[44px] text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean/40 focus:border-brand-cerulean"
                />
              </div>
              <div>
                <label
                  htmlFor="brief-start-date"
                  className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1.5"
                >
                  Start Date
                </label>
                <input
                  id="brief-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 min-h-[44px] text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean/40 focus:border-brand-cerulean"
                />
              </div>
              <div>
                <label
                  htmlFor="brief-project-type"
                  className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1.5"
                >
                  Project Type
                </label>
                <select
                  id="brief-project-type"
                  value={projectType}
                  onChange={(e) => setProjectType(e.target.value as ProjectType)}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 min-h-[44px] text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean/40 focus:border-brand-cerulean"
                >
                  {PROJECT_TYPES.map((pt) => (
                    <option key={pt.value} value={pt.value}>
                      {pt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Assign to */}
            <div>
              <label
                htmlFor="brief-assignee"
                className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1.5"
              >
                Assign to
              </label>
              <select
                id="brief-assignee"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 min-h-[44px] text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean/40 focus:border-brand-cerulean"
              >
                <option value="">— Unassigned —</option>
                {assigneeOptions.map((m) => (
                  <option key={m.id} value={String(m.id)}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-neutral-200 shrink-0">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-medium bg-neutral-200 text-neutral-600 hover:bg-neutral-300 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedSpaceId || !projectName.trim()}
            className="px-5 py-2.5 min-h-[44px] rounded-lg text-sm font-semibold bg-brand-cerulean text-white hover:bg-brand-cerulean-dark transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Creating Project..." : "Create Project"}
          </button>
        </div>
      </div>
    </div>
  );
}
