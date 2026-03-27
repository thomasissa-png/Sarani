"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  CLIENT_MAPPINGS,
  getMappingBySpaceName,
} from "@/lib/integrations/config";

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

import { PROJECT_TYPES, BRIEF_TEMPLATES } from "@/lib/brief-templates";

// ─── Page Component ─────────────────────────────────────────────────────────

export default function NewProjectPage() {
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
  const [contactName, setContactName] = useState("");
  const [category, setCategory] = useState("");
  const [division, setDivision] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [projectType, setProjectType] = useState("generic");
  const [brief, setBrief] = useState(BRIEF_TEMPLATES.generic);
  const [briefTouched, setBriefTouched] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);

  // AI Brief Check
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<{ status: string; checks: { level: string; label: string; message: string }[]; summary: string } | null>(null);

  // Fetch clients from DB
  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/clients");
      if (res.ok) {
        const data: ClientRecord[] = await res.json();
        setClients(data);
      }
    } catch {
      // Non-critical
    }
  }, []);

  // Fetch ClickUp spaces + lists (for division dropdown)
  const fetchSpaces = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/integrations/clickup");
      if (res.ok) {
        const data = await res.json();
        const spaceData: ClickUpSpace[] = (data.data ?? data.spaces ?? []).map(
          (s: { id: string; name: string; lists?: { id: string; name: string }[] }) => ({
            id: s.id,
            name: s.name,
            lists: (s.lists ?? []).map((l: { id: string; name: string }) => ({ id: l.id, name: l.name })),
          })
        );
        setSpaces(spaceData);
      }
    } catch {
      // Non-critical — division dropdown will be empty
    }
  }, []);

  useEffect(() => {
    fetchClients();
    fetchSpaces();
  }, [fetchClients, fetchSpaces]);

  // When client changes, update available divisions from ClickUp lists
  useEffect(() => {
    if (!clientName) {
      setDivisions([]);
      setDivision("");
      return;
    }
    const matchedSpace = spaces.find(
      (s) => s.name.toLowerCase() === clientName.toLowerCase()
    );
    if (matchedSpace && matchedSpace.lists.length > 0) {
      setDivisions(matchedSpace.lists);
      // Auto-select if only one division
      if (matchedSpace.lists.length === 1) {
        setDivision(matchedSpace.lists[0].name);
      } else {
        setDivision("");
      }
    } else {
      setDivisions([]);
      setDivision("");
    }
  }, [clientName, spaces]);

  const handleCreate = async () => {
    setError(null);
    setResult(null);

    if (!clientName || !projectName) {
      setError("Client and Project Name are required.");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/admin/integrations/create-project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName,
          projectName,
          contactName: contactName || undefined,
          category: category || undefined,
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

  const handleRetryFailed = async () => {
    // E-09: Pass successful step results so the API can skip them
    if (!result) return;

    setError(null);
    setCreating(true);
    try {
      const res = await fetch("/api/admin/integrations/create-project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName,
          projectName,
          contactName: contactName || undefined,
          category: category || undefined,
          division: division || undefined,
          estimatedValue: estimatedValue ? parseFloat(estimatedValue) : undefined,
          // Pass previous successful results so API can skip completed steps
          previousResults: {
            clickup: result.clickup.success
              ? { taskId: result.clickup.taskId, url: result.clickup.url }
              : undefined,
            sharepoint: result.sharepoint.success
              ? { folderUrl: result.sharepoint.folderUrl }
              : undefined,
            excel: result.excel.success
              ? { row: result.excel.row }
              : undefined,
          },
        }),
      });

      if (!res.ok && res.status !== 207) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error ?? `Failed (${res.status})`);
      }

      const data: CreateProjectResponse = await res.json();
      // Merge: keep previously successful steps, update retried ones
      setResult({
        clickup: result.clickup.success ? result.clickup : data.clickup,
        excel: result.excel.success ? result.excel : data.excel,
        sharepoint: result.sharepoint.success ? result.sharepoint : data.sharepoint,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to retry");
    } finally {
      setCreating(false);
    }
  };

  const hasPartialFailure =
    result && (!result.clickup.success || !result.excel.success || !result.sharepoint.success);
  const allSuccess =
    result && result.clickup.success && result.excel.success && result.sharepoint.success;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/tracker"
          className="p-2 -ml-2 text-neutral-400 hover:text-brand-black transition-colors"
          aria-label="Back to tracker"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-brand-black">New Project</h1>
          <p className="text-neutral-500 text-sm mt-1">
            Create a project across ClickUp, SharePoint and Excel tracker
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl border border-neutral-300 p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-brand-black mb-1.5">
              Client <span className="text-error">*</span>
            </label>
            <select
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
            >
              <option value="">Select a client...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
            {clientName && (() => {
              const m = getMappingBySpaceName(clientName);
              const fallback = !m;
              const effective = m ?? CLIENT_MAPPINGS.find((x) => x.clickupSpaceName === "Other customers");
              if (!effective) return null;
              return (
                <p className={`text-xs mt-1 ${fallback ? "text-warning-text" : "text-neutral-400"}`}>
                  {fallback ? "No direct mapping — " : ""}
                  ClickUp: {effective.clickupSpaceName} · Excel: {effective.excelTrackerFilename} · SP: {effective.sharepointCustomerFolder}
                </p>
              );
            })()}
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-black mb-1.5">
              Division
              {divisions.length > 0 && <span className="text-error ml-0.5">*</span>}
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
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
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
              Project Name <span className="text-error">*</span>
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g. Holiday Campaign 2026"
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-brand-black mb-1.5">
              Contact Name
            </label>
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="e.g. Sophie Martin"
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-black mb-1.5">
              Category
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Video Production"
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
            />
          </div>
        </div>

        {/* Project Type + Brief */}
        <div>
          <label className="block text-sm font-medium text-brand-black mb-1.5">
            Project Type
          </label>
          <select
            value={projectType}
            onChange={(e) => {
              const newType = e.target.value;
              setProjectType(newType);
              // Replace template only if brief hasn't been modified
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
            Brief
          </label>
          <textarea
            value={brief}
            onChange={(e) => { setBrief(e.target.value); setBriefTouched(true); setCheckResult(null); }}
            rows={12}
            className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black font-mono placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent resize-y"
          />
          {/* AI Brief Check */}
          <div className="flex items-center gap-3 mt-2">
            <button
              type="button"
              onClick={async () => {
                if (brief.length < 20) return;
                setChecking(true); setCheckResult(null);
                try {
                  const res = await fetch("/api/admin/brief-check", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ brief, projectType, clientName }),
                  });
                  if (res.ok) setCheckResult(await res.json());
                } catch { /* ignore */ } finally { setChecking(false); }
              }}
              disabled={checking || brief.length < 20}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-brand-cerulean border border-brand-cerulean rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {checking ? "Checking..." : "Check with AI"}
            </button>
            <span className="text-xs text-neutral-400">Optional — flags missing info before you submit.</span>
          </div>

          {/* AI Check Results */}
          {checkResult && (
            <div className={`mt-2 rounded-lg border px-3 py-2.5 text-sm ${
              checkResult.status === "ok" ? "bg-green-50 border-green-200 text-green-800"
                : checkResult.status === "warning" ? "bg-amber-50 border-amber-200 text-amber-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}>
              <p className="font-medium">{checkResult.status === "ok" ? "Brief looks good" : checkResult.summary}</p>
              {checkResult.checks.length > 0 && (
                <ul className="mt-1.5 space-y-1">
                  {checkResult.checks.map((c: { level: string; label: string; message: string }, i: number) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs">
                      <span className={`shrink-0 font-bold ${c.level === "error" ? "text-red-600" : "text-amber-600"}`}>{c.level === "error" ? "!" : "?"}</span>
                      <span><strong>{c.label}</strong> — {c.message}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <p className="text-xs text-neutral-400 mt-1">
            Markdown template — fill in the brackets. The brief will be included in the ClickUp task description.
          </p>
        </div>

        {/* Attachments */}
        <div>
          <label className="block text-sm font-medium text-brand-black mb-1.5">
            Attachments
            <span className="text-neutral-400 font-normal ml-1">(uploaded to SharePoint brief folder)</span>
          </label>
          <div
            className="border-2 border-dashed border-neutral-300 rounded-lg p-4 text-center hover:border-brand-cerulean transition-colors cursor-pointer"
            onClick={() => document.getElementById("file-input")?.click()}
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-brand-cerulean", "bg-blue-50"); }}
            onDragLeave={(e) => { e.currentTarget.classList.remove("border-brand-cerulean", "bg-blue-50"); }}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove("border-brand-cerulean", "bg-blue-50");
              const files = Array.from(e.dataTransfer.files).filter(f => f.size <= 100 * 1024 * 1024);
              setAttachments(prev => [...prev, ...files].slice(0, 10));
            }}
          >
            <input
              id="file-input"
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
              Drag & drop files here or <span className="text-brand-cerulean font-medium">browse</span>
            </p>
            <p className="text-xs text-neutral-400 mt-1">Max 100MB per file, 10 files. PDF, images, videos, Office docs.</p>
          </div>
          {attachments.length > 0 && (
            <ul className="mt-2 space-y-1">
              {attachments.map((f, i) => (
                <li key={`${f.name}-${i}`} className="flex items-center justify-between text-sm bg-neutral-50 rounded-lg px-3 py-2">
                  <span className="truncate text-brand-black">{f.name} <span className="text-neutral-400">({(f.size / 1024 / 1024).toFixed(1)} MB)</span></span>
                  <button
                    type="button"
                    onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}
                    className="text-neutral-400 hover:text-error ml-2 shrink-0"
                    aria-label={`Remove ${f.name}`}
                  >
                    &times;
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-brand-black mb-1.5">
              Estimated Value
              <span className="text-neutral-400 font-normal ml-1">(optional)</span>
            </label>
            <input
              type="number"
              value={estimatedValue}
              onChange={(e) => setEstimatedValue(e.target.value)}
              placeholder="e.g. 5000"
              min={0}
              step={0.01}
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-error-light border border-error rounded-lg px-4 py-3 text-sm text-error">
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating}
            className="px-6 py-2.5 bg-brand-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? "Creating..." : "Create Project"}
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
            <StepResultRow
              label="ClickUp Task"
              result={result.clickup}
              link={result.clickup.url}
              linkLabel="Open in ClickUp"
            />
            <StepResultRow
              label="SharePoint Folder"
              result={result.sharepoint}
              link={result.sharepoint.folderUrl}
              linkLabel="Open folder"
            />
            <StepResultRow
              label="Excel Tracker"
              result={result.excel}
              extra={result.excel.row ? `Row ${result.excel.row}` : undefined}
            />
          </div>

          {hasPartialFailure && (
            <div className="pt-2">
              <button
                type="button"
                onClick={handleRetryFailed}
                disabled={creating}
                className="px-4 py-2 bg-neutral-800 text-white text-sm font-semibold rounded-lg hover:bg-neutral-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? "Retrying..." : "Retry Failed Steps"}
              </button>
            </div>
          )}

          {allSuccess && (
            <div className="pt-2 flex items-center gap-3">
              <Link
                href="/admin/tracker"
                className="px-4 py-2 bg-brand-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors"
              >
                View in Tracker
              </Link>
              <button
                type="button"
                onClick={() => {
                  setClientName("");
                  setProjectName("");
                  setContactName("");
                  setCategory("");
                  setDivision("");
                  setEstimatedValue("");
                  setResult(null);
                  setError(null);
                }}
                className="px-4 py-2 bg-brand-cerulean text-white text-sm font-semibold rounded-lg hover:bg-brand-cerulean-dark transition-colors"
              >
                Create another project
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function StepResultRow({
  label,
  result,
  link,
  linkLabel,
  extra,
}: {
  label: string;
  result: StepResult;
  link?: string;
  linkLabel?: string;
  extra?: string;
}) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <span className="mt-0.5 shrink-0">
        {result.success ? (
          <svg className="w-5 h-5 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        ) : (
          <svg className="w-5 h-5 text-error" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        )}
      </span>
      <div>
        <p className="font-medium text-brand-black">{label}</p>
        {result.success && link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-cerulean hover:underline text-xs"
          >
            {linkLabel ?? "Open"}
          </a>
        )}
        {result.success && extra && (
          <p className="text-neutral-500 text-xs">{extra}</p>
        )}
        {!result.success && result.error && (
          <p className="text-error text-xs mt-0.5">{result.error}</p>
        )}
      </div>
    </div>
  );
}
