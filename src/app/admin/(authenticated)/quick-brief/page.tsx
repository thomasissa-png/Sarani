"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  CLIENT_MAPPINGS,
  getMappingBySpaceName,
} from "@/lib/integrations/config";
import type { BriefCheckResponse } from "@/app/api/admin/brief-check/route";

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

const PROJECT_TYPES = [
  { value: "generic", label: "Other / General" },
  { value: "design", label: "Graphic Design" },
  { value: "video", label: "Video Editing" },
  { value: "translation", label: "Translation" },
] as const;

const BRIEF_TEMPLATES: Record<string, string> = {
  generic: `## Deliverables
[What needs to be delivered — formats, sizes, quantity]

## Message & Direction
[Key message, CTA, creative direction]

## References & Constraints
[Brand guidelines, formats, mandatory elements, things to avoid]`,

  design: `## Deliverables
| Format | Dimensions | Quantity |
|---|---|---|
| [e.g. Web banner] | [px] | [n] |

## Brand Constraints
- Colors: [hex codes or "use existing brand guidelines"]
- Fonts: [font names or "see attached brand guide"]

## Message / Copy
[Key message to convey — or "copy provided separately"]

## References
[URL or "see attached moodboard"]`,

  video: `## Deliverables
| Format | Duration | Aspect Ratio | Quantity |
|---|---|---|---|
| [e.g. Social reel] | [15s / 30s] | [9:16 / 16:9] | [n] |

## Raw Footage
[ ] Footage provided  [ ] Footage to be sourced by Sarani

## Editing Instructions
[Cuts, pacing, music, captions, subtitles, end card]

## Delivery Format
[MP4 H.264 / ProRes] — [resolution]`,

  translation: `## Languages
Source: [e.g. EN] → Target: [e.g. FR, DE, ES]

## Volume
[Word count or "see attached file(s)"] — [n files]

## Tone & Constraints
[Formal / casual / technical] — [glossary / terms to avoid]

## Delivery Format
[Same as source / DOCX / CSV / InDesign package]`,
};

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

      {/* Form */}
      <div className="bg-white rounded-xl border border-neutral-300 p-6 space-y-5">
        {/* Row 1: Client + Project Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-brand-black mb-1.5">
              Client <span className="text-red-500">*</span>
            </label>
            <select
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
            >
              <option value="">Select a client...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
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

        {/* Row 2: Project Type + Division */}
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
