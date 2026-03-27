"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  CLIENT_MAPPINGS,
  getMappingBySpaceName,
} from "@/lib/integrations/config";
import type { BriefCheckResponse } from "@/app/api/admin/brief-check/route";

// ─── Email Import Types ─────────────────────────────────────────────────────

interface EmailPreview {
  id: string;
  subject: string;
  from: {
    emailAddress: {
      name: string;
      address: string;
    };
  };
  receivedDateTime: string;
  bodyPreview: string;
  hasAttachments: boolean;
}

interface EmailImportResult {
  email: {
    id: string;
    subject: string;
    from: string;
    fromEmail: string;
    receivedDateTime: string;
  };
  clientMatch: {
    id: string;
    name: string;
  } | null;
  brief: {
    project_name: string;
    project_type: "design" | "video" | "translation" | "other";
    brief_markdown: string;
    deadline: string | null;
    missing_info: string[];
  };
  attachments: {
    id: string;
    name: string;
    contentType: string;
    size: number;
  }[];
  clientReply: {
    subject: string;
    body: string;
  } | null;
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface ClientRecord {
  id: string;
  name: string;
}

interface ClickUpList {
  id: string;
  name: string;
}

interface ClickUpSpace {
  id: string;
  name: string;
  lists: ClickUpList[];
}

interface StepResult {
  success: boolean;
  error?: string;
  taskId?: string;
  url?: string;
  row?: number;
  folderUrl?: string;
}

interface CreateProjectResponse {
  clickup: StepResult;
  excel: StepResult;
  sharepoint: StepResult;
}

// ─── Brief Templates ─────────────────────────────────────────────────────────

import { PROJECT_TYPES, BRIEF_TEMPLATES } from "@/lib/brief-templates";

// ─── Page Component ─────────────────────────────────────────────────────────

export default function ProjectBriefPage() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [spaces, setSpaces] = useState<ClickUpSpace[]>([]);
  const [divisions, setDivisions] = useState<ClickUpList[]>([]);
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<CreateProjectResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [clientName, setClientName] = useState("");
  const [isNewClient, setIsNewClient] = useState(false);
  const [customClientName, setCustomClientName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [division, setDivision] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [projectType, setProjectType] = useState("generic");
  const [brief, setBrief] = useState(BRIEF_TEMPLATES.generic);
  const [briefTouched, setBriefTouched] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);

  // AI Check state
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<BriefCheckResponse | null>(null);
  const [checkOpen, setCheckOpen] = useState(true);

  // Email import state
  const [emailSectionOpen, setEmailSectionOpen] = useState(false);
  const [emailConfigured, setEmailConfigured] = useState<boolean | null>(null);
  const [emails, setEmails] = useState<EmailPreview[]>([]);
  const [emailsLoading, setEmailsLoading] = useState(false);
  const [emailsError, setEmailsError] = useState<string | null>(null);
  const [importingEmailId, setImportingEmailId] = useState<string | null>(null);
  const [importedAttachments, setImportedAttachments] = useState<EmailImportResult["attachments"]>([]);
  const [importMissingInfo, setImportMissingInfo] = useState<string[]>([]);
  const [importedFromSubject, setImportedFromSubject] = useState<string | null>(null);
  const [clientReply, setClientReply] = useState<{ subject: string; body: string } | null>(null);
  const [replyCopied, setReplyCopied] = useState(false);
  const emailFetchedRef = useRef(false);

  // Fetch clients + spaces
  useEffect(() => {
    fetch("/api/admin/clients")
      .then((r) => r.ok ? r.json() : [])
      .then(setClients)
      .catch(() => {});
    fetch("/api/admin/integrations/clickup")
      .then((r) => r.ok ? r.json() : { data: [] })
      .then((data) => {
        const spaceData: ClickUpSpace[] = (data.data ?? data.spaces ?? []).map(
          (s: { id: string; name: string; lists?: { id: string; name: string }[] }) => ({
            id: s.id, name: s.name,
            lists: (s.lists ?? []).map((l: { id: string; name: string }) => ({ id: l.id, name: l.name })),
          })
        );
        setSpaces(spaceData);
      })
      .catch(() => {});
  }, []);

  // Auto-populate divisions when client changes
  useEffect(() => {
    if (!clientName) { setDivisions([]); setDivision(""); return; }
    const matched = spaces.find((s) => s.name.toLowerCase() === clientName.toLowerCase());
    if (matched && matched.lists.length > 0) {
      setDivisions(matched.lists);
      setDivision(matched.lists.length === 1 ? matched.lists[0].name : "");
    } else {
      setDivisions([]); setDivision("");
    }
  }, [clientName, spaces]);

  // ─── Email Import ──────────────────────────────────────────────────────
  const fetchEmails = useCallback(async () => {
    if (emailFetchedRef.current) return;
    setEmailsLoading(true);
    setEmailsError(null);
    try {
      const res = await fetch("/api/admin/emails");
      if (res.status === 503) {
        setEmailConfigured(false);
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch emails");
      setEmailConfigured(true);
      const data = await res.json();
      setEmails(data.emails ?? []);
      emailFetchedRef.current = true;
    } catch {
      setEmailsError("Could not load emails. Check Microsoft Graph configuration.");
      setEmailConfigured(false);
    } finally {
      setEmailsLoading(false);
    }
  }, []);

  const handleEmailImport = useCallback(async (emailId: string) => {
    setImportingEmailId(emailId);
    try {
      const res = await fetch(`/api/admin/emails/${encodeURIComponent(emailId)}/import`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ?? `Import failed (${res.status})`);
      }
      const data: EmailImportResult = await res.json();

      // Pre-fill form fields
      if (data.clientMatch) {
        setClientName(data.clientMatch.name);
      }
      setProjectName(data.brief.project_name);

      // Map project_type to form values
      const typeMap: Record<string, string> = {
        design: "design",
        video: "video",
        translation: "translation",
        other: "generic",
      };
      const mappedType = typeMap[data.brief.project_type] ?? "generic";
      setProjectType(mappedType);

      setBrief(data.brief.brief_markdown);
      setBriefTouched(true);
      setCheckResult(null);

      // Store attachments, missing info, and client reply
      setImportedAttachments(data.attachments);
      setImportMissingInfo(data.brief.missing_info ?? []);
      setImportedFromSubject(data.email.subject);
      setClientReply(data.clientReply ?? null);
      setReplyCopied(false);

      // Collapse email section after successful import
      setEmailSectionOpen(false);

      // Remove imported email from the list
      setEmails((prev) => prev.filter((e) => e.id !== emailId));
    } catch (err) {
      setEmailsError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImportingEmailId(null);
    }
  }, []);

  // ─── AI Brief Check ─────────────────────────────────────────────────────
  const handleAICheck = useCallback(async () => {
    if (brief.length < 20) return;
    setChecking(true);
    setCheckResult(null);
    setCheckOpen(true);
    try {
      const res = await fetch("/api/admin/brief-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief, projectType, clientName }),
      });
      if (res.ok) {
        const data: BriefCheckResponse = await res.json();
        setCheckResult(data);
      }
    } catch {
      // Non-critical — ignore
    } finally {
      setChecking(false);
    }
  }, [brief, projectType, clientName]);

  // ─── Create Project ─────────────────────────────────────────────────────
  const handleCreate = async () => {
    setError(null);
    setResult(null);
    const effectiveClientName = isNewClient ? customClientName.trim() : clientName;
    if (!effectiveClientName || !projectName) {
      setError("Client and Project Name are required.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/integrations/create-project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: effectiveClientName,
          projectName,
          division: division || undefined,
          estimatedValue: estimatedValue ? parseFloat(estimatedValue) : undefined,
          projectType,
          brief: brief || undefined,
        }),
      });
      if (!res.ok && res.status !== 207) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error ?? `Failed (${res.status})`);
      }
      const data: CreateProjectResponse = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setCreating(false);
    }
  };

  const allSuccess = result && result.clickup.success && result.excel.success && result.sharepoint.success;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-brand-black">Project Brief</h1>
        <p className="text-neutral-500 text-sm mt-1">
          Create a project across ClickUp, SharePoint & Excel with a structured brief.
        </p>
      </div>

      {/* Email Import Section — always visible, shows config message inside if not configured */}
      <div className="bg-white rounded-xl border border-neutral-300 overflow-hidden">
          <button
            type="button"
            onClick={() => {
              const next = !emailSectionOpen;
              setEmailSectionOpen(next);
              if (next) fetchEmails();
            }}
            className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-neutral-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-brand-cerulean" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              <span className="text-sm font-semibold text-brand-black">Import from email</span>
            </div>
            <svg className={`w-4 h-4 text-neutral-400 transition-transform ${emailSectionOpen ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
          </button>

          {emailSectionOpen && (
            <div className="px-6 pb-5 border-t border-neutral-200 pt-4">
              {emailsLoading && (
                <div className="flex items-center gap-2 text-sm text-neutral-500 py-4">
                  <span className="w-4 h-4 border-2 border-brand-cerulean border-t-transparent rounded-full animate-spin" />
                  Loading emails...
                </div>
              )}

              {emailsError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                  {emailsError}
                </div>
              )}

              {!emailsLoading && !emailsError && emails.length === 0 && emailConfigured && (
                <p className="text-sm text-neutral-500 py-3">No unread emails found.</p>
              )}

              {!emailsLoading && emails.length > 0 && (
                <ul className="divide-y divide-neutral-100 max-h-72 overflow-y-auto -mx-1">
                  {emails.map((email) => {
                    const isImporting = importingEmailId === email.id;
                    const receivedDate = new Date(email.receivedDateTime);
                    const now = new Date();
                    const diffMs = now.getTime() - receivedDate.getTime();
                    const diffMins = Math.floor(diffMs / 60000);
                    const diffHours = Math.floor(diffMs / 3600000);
                    const diffDays = Math.floor(diffMs / 86400000);
                    const timeAgo =
                      diffMins < 60
                        ? `${diffMins}m ago`
                        : diffHours < 24
                          ? `${diffHours}h ago`
                          : `${diffDays}d ago`;

                    return (
                      <li key={email.id}>
                        <button
                          type="button"
                          onClick={() => handleEmailImport(email.id)}
                          disabled={!!importingEmailId}
                          className="w-full text-left px-3 py-3 hover:bg-neutral-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-brand-black truncate">
                                {email.subject || "(No subject)"}
                              </p>
                              <p className="text-xs text-neutral-500 mt-0.5 truncate">
                                {email.from.emailAddress.name} &lt;{email.from.emailAddress.address}&gt;
                              </p>
                              <p className="text-xs text-neutral-400 mt-0.5 line-clamp-1">
                                {email.bodyPreview}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {email.hasAttachments && (
                                <svg className="w-3.5 h-3.5 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                                </svg>
                              )}
                              <span className="text-xs text-neutral-400 whitespace-nowrap">{timeAgo}</span>
                              {isImporting && (
                                <span className="w-4 h-4 border-2 border-brand-cerulean border-t-transparent rounded-full animate-spin" />
                              )}
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {/* Email not configured message */}
          {emailSectionOpen && emailConfigured === false && (
            <div className="px-6 pb-5 border-t border-neutral-200 pt-4">
              <p className="text-sm text-neutral-500">
                Email integration not configured. Add <code className="bg-neutral-100 px-1 rounded text-xs">Mail.Read</code> permission to your Azure AD app and set <code className="bg-neutral-100 px-1 rounded text-xs">MICROSOFT_EMAIL_ADDRESS</code> env var.
              </p>
            </div>
          )}
        </div>

      {/* Imported email banner */}
      {importedFromSubject && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <div className="min-w-0">
            <p className="text-sm font-medium text-blue-900">
              Imported from: {importedFromSubject}
            </p>
            <p className="text-xs text-blue-700 mt-0.5">
              Fields pre-filled from email. Review and adjust before submitting.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setImportedFromSubject(null)}
            className="text-blue-400 hover:text-blue-600 ml-auto shrink-0"
            aria-label="Dismiss"
          >&times;</button>
        </div>
      )}

      {/* Reply to client — auto-generated, editable, copy-pasteable */}
      {clientReply && (
        <ReplyToClient
          reply={clientReply}
          onRegenerate={async () => {
            // Re-import the same email to regenerate the reply
            // For now, just clear and let the user re-import
            setClientReply(null);
          }}
        />
      )}

      {/* Form */}
      <div className="bg-white rounded-xl border border-neutral-300 p-6 space-y-5">
        {/* Row 1: Client + Division + Project Name */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-brand-black mb-1.5">
              Client <span className="text-red-500">*</span>
            </label>
            <select
              value={isNewClient ? "__new__" : clientName}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "__new__") {
                  setIsNewClient(true);
                  setClientName("");
                  setCustomClientName("");
                } else {
                  setIsNewClient(false);
                  setClientName(val);
                  setCustomClientName("");
                }
              }}
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
            >
              <option value="">Select a client...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
              <option value="__new__">Other / New client</option>
            </select>
            {isNewClient && (
              <input
                type="text"
                value={customClientName}
                onChange={(e) => setCustomClientName(e.target.value)}
                placeholder="Enter new client name..."
                className="w-full mt-2 px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
              />
            )}
            {clientName && (() => {
              const m = getMappingBySpaceName(clientName);
              const fallback = !m;
              const effective = m ?? CLIENT_MAPPINGS.find((x) => x.clickupSpaceName === "Other customers");
              if (!effective) return null;
              return (
                <p className={`text-xs mt-1 ${fallback ? "text-amber-600" : "text-neutral-400"}`}>
                  {fallback ? "No direct mapping — " : ""}
                  ClickUp: {effective.clickupSpaceName} · Excel: {effective.excelTrackerFilename}
                </p>
              );
            })()}
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-black mb-1.5">
              Division
              {divisions.length > 0 && <span className="text-red-500 ml-0.5">*</span>}
              {divisions.length === 0 && <span className="text-neutral-400 font-normal ml-1">(auto-detected)</span>}
            </label>
            {divisions.length > 0 ? (
              <select
                value={division}
                onChange={(e) => setDivision(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
              >
                <option value="">Select a division...</option>
                {divisions.map((d) => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={clientName ? "No divisions found" : "Select a client first"}
                disabled
                className="w-full px-3 py-2.5 rounded-lg border border-neutral-200 bg-neutral-100 text-sm text-neutral-400 cursor-not-allowed"
              />
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-black mb-1.5">
              Project Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g. Black Friday Banners 2026"
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
            />
          </div>
        </div>

        {/* Row 2: Project Type + Estimated Value */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-brand-black mb-1.5">
              Project Type
            </label>
            <select
              value={projectType}
              onChange={(e) => {
                const newType = e.target.value;
                setProjectType(newType);
                if (!briefTouched || brief === BRIEF_TEMPLATES[projectType]) {
                  setBrief(BRIEF_TEMPLATES[newType] || BRIEF_TEMPLATES.generic);
                  setBriefTouched(false);
                }
              }}
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
            >
              {PROJECT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-black mb-1.5">
              Estimated Value <span className="text-neutral-400 font-normal">(optional)</span>
            </label>
            <input
              type="number"
              value={estimatedValue}
              onChange={(e) => setEstimatedValue(e.target.value)}
              placeholder="e.g. 5000"
              min={0}
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
            />
          </div>
        </div>

        {/* Brief textarea */}
        <div>
          <label className="block text-sm font-medium text-brand-black mb-1.5">
            Brief
          </label>
          <textarea
            value={brief}
            onChange={(e) => { setBrief(e.target.value); setBriefTouched(true); setCheckResult(null); }}
            rows={10}
            className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black font-mono placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent resize-y"
          />
          <p className="text-xs text-neutral-400 mt-1">
            Markdown template — fill in the brackets. Included in the ClickUp task description.
          </p>
        </div>

        {/* Attachments */}
        <div>
          <label className="block text-sm font-medium text-brand-black mb-1.5">
            Attachments <span className="text-neutral-400 font-normal">(uploaded to SharePoint brief folder)</span>
          </label>
          <div
            className="border-2 border-dashed border-neutral-300 rounded-lg p-4 text-center hover:border-brand-cerulean transition-colors cursor-pointer"
            onClick={() => document.getElementById("brief-file-input")?.click()}
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-brand-cerulean"); }}
            onDragLeave={(e) => { e.currentTarget.classList.remove("border-brand-cerulean"); }}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove("border-brand-cerulean");
              const files = Array.from(e.dataTransfer.files).filter(f => f.size <= 100 * 1024 * 1024);
              setAttachments(prev => [...prev, ...files].slice(0, 10));
            }}
          >
            <input
              id="brief-file-input"
              type="file"
              multiple
              className="hidden"
              accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.mp4,.mov,.docx,.xlsx,.pptx,.zip"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                setAttachments(prev => [...prev, ...files].slice(0, 10));
                e.target.value = "";
              }}
            />
            <p className="text-sm text-neutral-500">
              Drag & drop files or <span className="text-brand-cerulean font-medium">browse</span>
            </p>
            <p className="text-xs text-neutral-400 mt-1">Max 100MB per file, 10 files.</p>
          </div>
          {attachments.length > 0 && (
            <ul className="mt-2 space-y-1">
              {attachments.map((f, i) => (
                <li key={`${f.name}-${i}`} className="flex items-center justify-between text-sm bg-neutral-50 rounded-lg px-3 py-2">
                  <span className="truncate text-brand-black">{f.name} <span className="text-neutral-400">({(f.size / 1024 / 1024).toFixed(1)} MB)</span></span>
                  <button
                    type="button"
                    onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}
                    className="text-neutral-400 hover:text-red-500 ml-2 shrink-0"
                    aria-label={`Remove ${f.name}`}
                  >&times;</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* AI Brief Check — optional */}
        <div className="border-t border-neutral-200 pt-4">
          <button
            type="button"
            onClick={handleAICheck}
            disabled={checking || brief.length < 20}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-brand-cerulean border border-brand-cerulean rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {checking ? (
              <>
                <span className="w-4 h-4 border-2 border-brand-cerulean border-t-transparent rounded-full animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a10 10 0 1 0 10 10" /><path d="M12 6v6l4 2" />
                </svg>
                Check with AI
              </>
            )}
          </button>
          <span className="text-xs text-neutral-400 ml-3">Optional — the PM AI will flag missing info before you submit.</span>
        </div>

        {/* AI Check Results */}
        {checkResult && (
          <div className={`rounded-lg border px-4 py-3 ${
            checkResult.status === "ok"
              ? "bg-green-50 border-green-200"
              : checkResult.status === "warning"
                ? "bg-amber-50 border-amber-200"
                : "bg-red-50 border-red-200"
          }`}>
            <button
              type="button"
              onClick={() => setCheckOpen(!checkOpen)}
              className="flex items-center justify-between w-full text-left"
            >
              <span className={`text-sm font-medium ${
                checkResult.status === "ok" ? "text-green-800" : checkResult.status === "warning" ? "text-amber-800" : "text-red-800"
              }`}>
                {checkResult.status === "ok" ? "All good — no issues found" : checkResult.summary}
              </span>
              <svg className={`w-4 h-4 transition-transform ${checkOpen ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
            </button>
            {checkOpen && checkResult.checks.length > 0 && (
              <ul className="mt-3 space-y-2">
                {checkResult.checks.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className={`shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white ${c.level === "error" ? "bg-red-500" : "bg-amber-500"}`}>
                      {c.level === "error" ? "!" : "?"}
                    </span>
                    <div>
                      <span className="font-medium text-neutral-800">{c.label}</span>
                      <p className="text-neutral-600">{c.message}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Missing Info from Email Import */}
        {importMissingInfo.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <p className="text-sm font-medium text-amber-800 mb-2">Missing information detected in the email:</p>
            <ul className="space-y-1">
              {importMissingInfo.map((info, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-amber-700">
                  <span className="shrink-0 mt-0.5">&#x26A0;</span>
                  <span>{info}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Imported Email Attachments */}
        {importedAttachments.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-brand-black mb-1.5">
              Email Attachments <span className="text-neutral-400 font-normal">(from imported email)</span>
            </label>
            <ul className="space-y-1">
              {importedAttachments.map((att) => (
                <li key={att.id} className="flex items-center justify-between text-sm bg-blue-50 rounded-lg px-3 py-2">
                  <span className="truncate text-brand-black">
                    {att.name}{" "}
                    <span className="text-neutral-400">
                      ({(att.size / 1024 / 1024).toFixed(1)} MB)
                    </span>
                  </span>
                  <span className="text-xs text-neutral-400 shrink-0 ml-2">
                    {att.contentType.split("/").pop()}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating || !clientName || !projectName}
            className="px-6 py-3 bg-brand-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? "Creating project..." : "Create Project"}
          </button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="bg-white rounded-xl border border-neutral-300 p-6 space-y-4">
          <h2 className="text-lg font-bold text-brand-black">
            {allSuccess ? "Project Created Successfully" : "Project Created (Partial)"}
          </h2>
          <div className="space-y-3">
            <StepRow label="ClickUp Task" result={result.clickup} link={result.clickup.url} linkLabel="Open in ClickUp" />
            <StepRow label="SharePoint Folder" result={result.sharepoint} link={result.sharepoint.folderUrl} linkLabel="Open folder" />
            <StepRow label="Excel Tracker" result={result.excel} extra={result.excel.row ? `Row ${result.excel.row}` : undefined} />
          </div>
          {allSuccess && (
            <div className="pt-2 flex items-center gap-3">
              <Link href="/admin/tracker" className="px-4 py-2 bg-brand-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors">
                View in Tracker
              </Link>
              <button
                type="button"
                onClick={() => {
                  setClientName(""); setProjectName(""); setDivision(""); setEstimatedValue("");
                  setProjectType("generic"); setBrief(BRIEF_TEMPLATES.generic); setBriefTouched(false);
                  setAttachments([]); setResult(null); setError(null); setCheckResult(null);
                  setImportedAttachments([]); setImportMissingInfo([]); setImportedFromSubject(null);
                }}
                className="px-4 py-2 bg-brand-cerulean text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-colors"
              >
                Create another
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Reply to Client Component ───────────────────────────────────────────────

function ReplyToClient({
  reply,
  onRegenerate,
}: {
  reply: { subject: string; body: string };
  onRegenerate: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editedBody, setEditedBody] = useState(reply.body);
  const [copied, setCopied] = useState(false);

  const currentBody = editing ? editedBody : reply.body;
  const hasPlaceholders = /\[[A-Z_]+\]/.test(currentBody);

  function handleCopy() {
    if (hasPlaceholders) return;
    navigator.clipboard.writeText(currentBody);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-white rounded-xl border border-neutral-300 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-brand-black">Reply to client</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRegenerate}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-neutral-500 hover:text-brand-black transition-colors"
            title="Regenerate reply"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
          </button>
          <button
            type="button"
            onClick={() => { setEditing(!editing); if (!editing) setEditedBody(reply.body); }}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              editing ? "bg-amber-50 text-amber-700 border-amber-300" : "bg-neutral-100 text-neutral-700 border-neutral-300 hover:bg-neutral-200"
            }`}
          >
            {editing ? "Editing" : "Edit"}
          </button>
          <button
            type="button"
            onClick={handleCopy}
            disabled={hasPlaceholders}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              copied
                ? "bg-green-100 text-green-700 border border-green-300"
                : hasPlaceholders
                  ? "bg-red-50 text-red-400 border border-red-200 cursor-not-allowed"
                  : "bg-neutral-100 text-neutral-700 border border-neutral-300 hover:bg-neutral-200"
            }`}
            title={hasPlaceholders ? "Resolve placeholders before copying" : undefined}
          >
            {copied ? (
              <><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>Copied</>
            ) : (
              <><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>Copy</>
            )}
          </button>
        </div>
      </div>
      <p className="text-xs text-neutral-400">Subject: {reply.subject}</p>
      {editing ? (
        <textarea
          value={editedBody}
          onChange={(e) => setEditedBody(e.target.value)}
          rows={8}
          className="w-full px-4 py-3 rounded-lg border border-amber-300 bg-amber-50/30 text-sm text-brand-black font-normal leading-relaxed focus:outline-none focus:ring-2 focus:ring-amber-400 resize-y"
        />
      ) : (
        <div className="bg-neutral-50 rounded-lg px-4 py-3 text-sm text-brand-black whitespace-pre-wrap font-normal leading-relaxed">
          {reply.body}
        </div>
      )}
      {hasPlaceholders && (
        <p className="text-xs text-red-500 font-medium">
          Resolve placeholders (text in [BRACKETS]) before copying.
        </p>
      )}
      <p className="text-xs text-neutral-400">
        Auto-generated in the client&apos;s language and tone. Review before sending.
      </p>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StepRow({ label, result, link, linkLabel, extra }: {
  label: string; result: StepResult; link?: string; linkLabel?: string; extra?: string;
}) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <span className="mt-0.5 shrink-0">
        {result.success ? (
          <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
        ) : (
          <svg className="w-5 h-5 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
        )}
      </span>
      <div>
        <p className="font-medium text-brand-black">{label}</p>
        {result.success && link && (
          <a href={link} target="_blank" rel="noopener noreferrer" className="text-brand-cerulean hover:underline text-xs">{linkLabel ?? "Open"}</a>
        )}
        {result.success && extra && <p className="text-neutral-500 text-xs">{extra}</p>}
        {!result.success && result.error && <p className="text-red-600 text-xs mt-0.5">{result.error}</p>}
      </div>
    </div>
  );
}
