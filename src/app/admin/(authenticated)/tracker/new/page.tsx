"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ClientRecord {
  id: string;
  name: string;
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

// ─── Page Component ─────────────────────────────────────────────────────────

export default function NewProjectPage() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<CreateProjectResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [clientName, setClientName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [contactName, setContactName] = useState("");
  const [category, setCategory] = useState("");
  const [division, setDivision] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");

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

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

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
    // Re-submit the same form — the API handles each step independently
    await handleCreate();
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
          className="text-neutral-400 hover:text-brand-black transition-colors"
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
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-black mb-1.5">
              Project Name <span className="text-red-500">*</span>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-brand-black mb-1.5">
              Division
              <span className="text-neutral-400 font-normal ml-1">(optional)</span>
            </label>
            <input
              type="text"
              value={division}
              onChange={(e) => setDivision(e.target.value)}
              placeholder="e.g. Sony Music, Sony Pictures"
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
            />
          </div>
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
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
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
          <svg className="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        ) : (
          <svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
          <p className="text-red-600 text-xs mt-0.5">{result.error}</p>
        )}
      </div>
    </div>
  );
}
