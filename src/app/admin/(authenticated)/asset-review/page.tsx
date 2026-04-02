"use client";

// Client Component — Asset Review page for comparing SharePoint files against briefs.
// Renders: project path input, brief summary, scan button, results grid with match/missing/unexpected/anomaly statuses.
// Supports URL params: ?projectPath=xxx&clickupTaskId=xxx for auto-loading from tracker.

import { useState, useCallback, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

interface FileMatch {
  file: string;
  expected: string;
  status: "match" | "format_mismatch";
  details?: string;
  thumbnailUrl?: string;
  mimeType?: string;
}

interface FileInfo {
  name: string;
  thumbnailUrl?: string;
  mimeType?: string;
}

interface AssetReviewReport {
  totalFiles: number;
  expectedFiles: number;
  matches: FileMatch[];
  missing: string[];
  unexpected: FileInfo[];
  anomalies: string[];
}

interface ReviewResult {
  report: AssetReviewReport;
  folderPath: string;
  folderWebUrl: string | null;
}

type ReviewStatus = "idle" | "scanning" | "done" | "error";

interface ExpectedDeliverable {
  name: string;
  format?: string;
  dimensions?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseDeliverablesFromBrief(brief: string): ExpectedDeliverable[] {
  // Simple heuristic: extract lines that look like file specs
  // e.g. "Banner 728x90 PNG" or "Logo.svg" or "Hero_image 1920x1080"
  const lines = brief.split("\n").filter((l) => l.trim().length > 0);
  const deliverables: ExpectedDeliverable[] = [];
  const formatPattern = /\b(PNG|JPG|JPEG|SVG|PDF|PSD|AI|EPS|GIF|WEBP|MP4|MOV|TIFF|TIF)\b/i;
  const dimPattern = /\b(\d{2,5}x\d{2,5})\b/;

  for (const line of lines) {
    const trimmed = line.trim().replace(/^[-*•]\s*/, "");
    if (trimmed.length < 3) continue;

    const formatMatch = trimmed.match(formatPattern);
    const dimMatch = trimmed.match(dimPattern);

    // Only add if the line seems like a deliverable spec (has format or dimensions)
    if (formatMatch || dimMatch) {
      const name = trimmed
        .replace(formatPattern, "")
        .replace(dimPattern, "")
        .replace(/\s{2,}/g, " ")
        .trim();

      deliverables.push({
        name: name || trimmed,
        format: formatMatch?.[1]?.toUpperCase(),
        dimensions: dimMatch?.[1],
      });
    }
  }

  return deliverables;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

// ─── Status Icons ───────────────────────────────────────────────────────────

function MatchIcon() {
  return (
    <svg className="w-5 h-5 text-success shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function MissingIcon() {
  return (
    <svg className="w-5 h-5 text-error shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}

function UnexpectedIcon() {
  return (
    <svg className="w-5 h-5 text-warning-text shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function AnomalyIcon() {
  return (
    <svg className="w-5 h-5 text-brand-flame shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function AssetReviewPage() {
  return (
    <Suspense fallback={null}>
      <AssetReviewContent />
    </Suspense>
  );
}

function AssetReviewContent() {
  const searchParams = useSearchParams();
  const [projectPath, setProjectPath] = useState("");
  const [briefSummary, setBriefSummary] = useState("");
  const [clickupTaskId, setClickupTaskId] = useState("");
  const [status, setStatus] = useState<ReviewStatus>("idle");
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [updatingClickUp, setUpdatingClickUp] = useState(false);
  const [clickUpUpdated, setClickUpUpdated] = useState(false);
  const [loadingBrief, setLoadingBrief] = useState(false);
  const [briefLoaded, setBriefLoaded] = useState(false);
  const [returningToDesigner, setReturningToDesigner] = useState(false);
  const [returnedToDesigner, setReturnedToDesigner] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const autoLoadedRef = useRef(false);

  const canScan = projectPath.trim().length > 0 && status !== "scanning";

  // ─── Load brief from ClickUp task ────────────────────────────────────────
  const loadBriefFromClickUp = useCallback(async (taskId: string) => {
    if (!taskId.trim()) return;
    setLoadingBrief(true);
    try {
      const res = await fetch(`/api/admin/assets/review/brief?taskId=${encodeURIComponent(taskId.trim())}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to load brief (${res.status})`);
      }
      const data = await res.json();
      if (data.brief) {
        setBriefSummary(data.brief);
        setBriefLoaded(true);
        setTimeout(() => setBriefLoaded(false), 3000);
      }
      // Auto-fill SharePoint project path from ClickUp custom field "Folder URL"
      if (data.folderUrl && !projectPath) {
        setProjectPath(data.folderUrl);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load brief from ClickUp";
      setErrorMessage(message);
    } finally {
      setLoadingBrief(false);
    }
  }, []);

  // ─── Auto-load from URL params ───────────────────────────────────────────
  const shouldAutoScanRef = useRef(false);

  useEffect(() => {
    if (autoLoadedRef.current) return;
    const paramPath = searchParams.get("projectPath");
    const paramTaskId = searchParams.get("clickupTaskId");

    if (!paramPath && !paramTaskId) return;
    autoLoadedRef.current = true;

    if (paramPath) {
      setProjectPath(paramPath);
      shouldAutoScanRef.current = true;
    }
    if (paramTaskId) {
      setClickupTaskId(paramTaskId);
      loadBriefFromClickUp(paramTaskId);
    }
  }, [searchParams, loadBriefFromClickUp]);

  const handleScan = useCallback(async () => {
    if (!canScan) return;

    setStatus("scanning");
    setResult(null);
    setErrorMessage(null);
    setClickUpUpdated(false);

    try {
      // Parse expected deliverables from brief (if provided)
      const expectedDeliverables = briefSummary.trim()
        ? parseDeliverablesFromBrief(briefSummary)
        : [];

      const res = await fetch("/api/admin/assets/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: projectPath.trim(),
          briefSummary: briefSummary.trim() || undefined,
          expectedDeliverables: expectedDeliverables.length > 0 ? expectedDeliverables : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      const data: ReviewResult = await res.json();
      setResult(data);
      setStatus("done");
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred";
      setErrorMessage(message);
      setStatus("error");
    }
  }, [canScan, projectPath, briefSummary]);

  // Auto-scan when path is populated from URL params
  useEffect(() => {
    if (shouldAutoScanRef.current && projectPath.trim().length > 0 && status === "idle") {
      shouldAutoScanRef.current = false;
      handleScan();
    }
  }, [projectPath, status, handleScan]);

  const handleApproveClickUp = useCallback(async () => {
    if (!result) return;
    setUpdatingClickUp(true);

    try {
      // POST to update ClickUp status: Internal Review → Client Review
      const res = await fetch("/api/admin/tracker/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: projectPath.trim(),
          newStatus: "client review",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update ClickUp status");
      }

      setClickUpUpdated(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update ClickUp";
      setErrorMessage(message);
    } finally {
      setUpdatingClickUp(false);
    }
  }, [result, projectPath]);

  const report = result?.report;
  const hasResults = status === "done" && report;
  const allMatched = hasResults && report.missing.length === 0 && report.anomalies.length === 0;
  const hasIssues = hasResults && (report.missing.length > 0 || report.anomalies.length > 0);

  const handleReturnToDesigner = useCallback(async () => {
    if (!result || !report) return;
    setReturningToDesigner(true);

    try {
      // Build comment from missing files + anomalies
      const lines: string[] = ["Asset Review — Returned to Designer\n"];
      if (report.missing.length > 0) {
        lines.push("Missing deliverables:");
        report.missing.forEach((name: string) => lines.push(`  - ${name}`));
      }
      if (report.anomalies.length > 0) {
        if (lines.length > 1) lines.push("");
        lines.push("Anomalies:");
        report.anomalies.forEach((desc: string) => lines.push(`  - ${desc}`));
      }
      const comment = lines.join("\n");

      const res = await fetch("/api/admin/tracker/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: projectPath.trim(),
          newStatus: "in progress",
          comment,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to return task to designer");
      }

      setReturnedToDesigner(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update ClickUp";
      setErrorMessage(message);
    } finally {
      setReturningToDesigner(false);
    }
  }, [result, report, projectPath]);

  // Wrap approve to show confirmation when missing deliverables
  const handleApproveClick = useCallback(() => {
    if (report && report.missing.length > 0) {
      setShowApproveConfirm(true);
    } else {
      handleApproveClickUp();
    }
  }, [report, handleApproveClickUp]);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-brand-black">Asset Review</h1>
        <p className="text-neutral-500 text-sm mt-1">
          Compare SharePoint deliverables against the project brief
        </p>
      </div>

      {/* Input section */}
      <div className="bg-white rounded-xl border border-neutral-300 p-6 space-y-4">
        <div>
          <label htmlFor="project-path" className="block text-sm font-medium text-brand-black mb-1.5">
            SharePoint Project Path
          </label>
          <input
            id="project-path"
            type="text"
            value={projectPath}
            onChange={(e) => setProjectPath(e.target.value)}
            placeholder='e.g. "02. Sony/Banners Q2" or a ClickUp space name'
            className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-brand-cerulean transition-colors"
          />
          <p className="text-xs text-neutral-500 mt-1">
            Path relative to the customers folder, or a ClickUp space name
          </p>
        </div>

        <div>
          <label htmlFor="brief-summary" className="block text-sm font-medium text-brand-black mb-1.5">
            Brief Summary
            <span className="text-neutral-400 font-normal ml-1">(optional)</span>
          </label>
          <div className="flex items-start gap-2">
            <textarea
              id="brief-summary"
              value={briefSummary}
              onChange={(e) => setBriefSummary(e.target.value)}
              placeholder={"List expected deliverables, one per line:\n- Banner 728x90 PNG\n- Hero_image 1920x1080 JPG\n- Logo SVG"}
              rows={5}
              className="flex-1 rounded-lg border border-neutral-300 px-3 py-2.5 text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-brand-cerulean transition-colors resize-y"
            />
            <div className="flex flex-col gap-2 shrink-0">
              <input
                type="text"
                value={clickupTaskId}
                onChange={(e) => setClickupTaskId(e.target.value)}
                placeholder="ClickUp Task ID"
                aria-label="ClickUp Task ID"
                className="w-40 rounded-lg border border-neutral-300 px-3 py-2 text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-brand-cerulean transition-colors"
              />
              <button
                type="button"
                onClick={() => loadBriefFromClickUp(clickupTaskId)}
                disabled={!clickupTaskId.trim() || loadingBrief}
                className={cn(
                  "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 min-h-[44px] text-xs font-semibold transition-colors",
                  clickupTaskId.trim() && !loadingBrief
                    ? "bg-brand-cerulean/10 text-brand-cerulean hover:bg-brand-cerulean/20"
                    : "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                )}
              >
                {loadingBrief ? (
                  <>
                    <svg className="w-3.5 h-3.5 motion-safe:animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Loading...
                  </>
                ) : (
                  "Load from ClickUp"
                )}
              </button>
              {briefLoaded && (
                <span className="inline-flex items-center gap-1 text-xs text-success font-medium">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                  Brief loaded
                </span>
              )}
            </div>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Include file names, formats, and dimensions to match against SharePoint files. Or load from a ClickUp task.
          </p>
        </div>

        <button
          onClick={handleScan}
          disabled={!canScan}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors",
            canScan
              ? "bg-brand-flame text-white hover:bg-brand-flame-dark"
              : "bg-neutral-200 text-neutral-400 cursor-not-allowed"
          )}
        >
          {status === "scanning" ? (
            <>
              <svg className="w-4 h-4 motion-safe:animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Scanning...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              Scan Assets
            </>
          )}
        </button>
      </div>

      {/* Error banner */}
      {errorMessage && (
        <div className="bg-error-light border border-error/30 rounded-xl px-4 py-3 text-sm text-error flex items-start gap-2" role="alert">
          <MissingIcon />
          <div>
            <p className="font-medium">Scan failed</p>
            <p className="mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {status === "scanning" && (
        <div className="bg-white rounded-xl border border-neutral-300 p-6 space-y-4">
          <div className="motion-safe:animate-pulse space-y-3">
            <div className="h-5 w-48 bg-neutral-200 rounded" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-neutral-200 rounded-xl" />
              ))}
            </div>
            <div className="space-y-2 mt-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 bg-neutral-200 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {hasResults && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <SummaryCard label="Total Files" value={report.totalFiles} />
            <SummaryCard
              label="Matched"
              value={report.matches.length}
              variant={report.matches.length > 0 ? "success" : "neutral"}
            />
            <SummaryCard
              label="Missing"
              value={report.missing.length}
              variant={report.missing.length > 0 ? "error" : "success"}
            />
            <SummaryCard
              label="Unexpected"
              value={report.unexpected.length}
              variant={report.unexpected.length > 0 ? "warning" : "neutral"}
            />
          </div>

          {/* Folder path + SharePoint link */}
          {result.folderPath && (
            <p className="text-xs text-neutral-500 flex items-center gap-2 flex-wrap">
              <span>
                Scanned: <code className="bg-neutral-200 px-1.5 py-0.5 rounded text-neutral-600">{result.folderPath}</code>
              </span>
              {result.folderWebUrl && (
                <a
                  href={result.folderWebUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-brand-cerulean hover:text-brand-cerulean-dark font-medium transition-colors"
                >
                  Open in SharePoint
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
              )}
            </p>
          )}

          {/* Matched files */}
          {report.matches.length > 0 && (
            <ResultSection title="Matched Files" count={report.matches.length} variant="success">
              <div className="space-y-2">
                {report.matches.map((match, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5 bg-success-light/50 rounded-lg">
                    <FileThumbnail thumbnailUrl={match.thumbnailUrl} mimeType={match.mimeType} name={match.file} />
                    <MatchIcon />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-brand-black truncate">{match.file}</p>
                      <p className="text-xs text-neutral-500">
                        Matches: {match.expected}
                        {match.status === "format_mismatch" && (
                          <span className="text-warning-text ml-2">{match.details}</span>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ResultSection>
          )}

          {/* Missing files */}
          {report.missing.length > 0 && (
            <ResultSection title="Missing Deliverables" count={report.missing.length} variant="error">
              <div className="space-y-2">
                {report.missing.map((name, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5 bg-error-light/50 rounded-lg">
                    <MissingIcon />
                    <p className="text-sm font-medium text-brand-black">{name}</p>
                  </div>
                ))}
              </div>
            </ResultSection>
          )}

          {/* Unexpected files */}
          {report.unexpected.length > 0 && (
            <ResultSection title="Unexpected Files" count={report.unexpected.length} variant="warning">
              <div className="space-y-2">
                {report.unexpected.map((file, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5 bg-warning-light/50 rounded-lg">
                    <FileThumbnail thumbnailUrl={file.thumbnailUrl} mimeType={file.mimeType} name={file.name} />
                    <UnexpectedIcon />
                    <p className="text-sm font-medium text-brand-black">{file.name}</p>
                  </div>
                ))}
              </div>
            </ResultSection>
          )}

          {/* Anomalies */}
          {report.anomalies.length > 0 && (
            <ResultSection title="Anomalies" count={report.anomalies.length} variant="error">
              <div className="space-y-2">
                {report.anomalies.map((desc, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5 bg-brand-flame/5 rounded-lg">
                    <AnomalyIcon />
                    <p className="text-sm font-medium text-brand-black">{desc}</p>
                  </div>
                ))}
              </div>
            </ResultSection>
          )}

          {/* Empty state — no expected deliverables provided */}
          {report.expectedFiles === 0 && report.totalFiles > 0 && (
            <div className="bg-info-light border border-info/20 rounded-xl px-4 py-3 text-sm text-info">
              No expected deliverables specified in the brief. All {report.totalFiles} files are listed as &ldquo;unexpected&rdquo; since there is nothing to compare against.
              Add file specs to the brief (e.g. &ldquo;Banner 728x90 PNG&rdquo;) for a proper comparison.
            </div>
          )}

          {/* Action buttons */}
          <div className="bg-white rounded-xl border border-neutral-300 p-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-brand-black">
                {allMatched ? "All deliverables match" : "Review complete"}
              </p>
              <p className="text-xs text-neutral-500 mt-0.5">
                {allMatched
                  ? "Ready to move this project to Client Review"
                  : "Some issues were found — review before approving"
                }
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {/* Return to Designer — visible only when issues exist */}
              {hasIssues && (
                <button
                  onClick={handleReturnToDesigner}
                  disabled={returningToDesigner || returnedToDesigner || clickUpUpdated}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors",
                    returnedToDesigner
                      ? "bg-error/10 text-error cursor-default"
                      : returningToDesigner
                        ? "bg-neutral-200 text-neutral-400 cursor-wait"
                        : clickUpUpdated
                          ? "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                          : "bg-error/10 text-error hover:bg-error/20"
                  )}
                >
                  {returnedToDesigner ? (
                    <>
                      <MissingIcon />
                      Returned to Designer
                    </>
                  ) : returningToDesigner ? (
                    <>
                      <svg className="w-4 h-4 motion-safe:animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Returning...
                    </>
                  ) : (
                    "Return to Designer"
                  )}
                </button>
              )}

              {/* Approve & Update ClickUp */}
              <button
                onClick={handleApproveClick}
                disabled={updatingClickUp || clickUpUpdated || returnedToDesigner}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors",
                  clickUpUpdated
                    ? "bg-success-light text-success cursor-default"
                    : updatingClickUp
                      ? "bg-neutral-200 text-neutral-400 cursor-wait"
                      : returnedToDesigner
                        ? "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                        : "bg-brand-cerulean text-white hover:bg-brand-cerulean-dark"
                )}
              >
                {clickUpUpdated ? (
                  <>
                    <MatchIcon />
                    ClickUp Updated
                  </>
                ) : updatingClickUp ? (
                  <>
                    <svg className="w-4 h-4 motion-safe:animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Updating...
                  </>
                ) : (
                  "Approve & Update ClickUp"
                )}
              </button>
            </div>
          </div>

          {/* Approve confirmation modal when assets are missing */}
          {showApproveConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-labelledby="approve-confirm-title">
              <div className="bg-white rounded-xl border border-neutral-300 p-6 max-w-md w-full mx-4 shadow-xl">
                <h3 id="approve-confirm-title" className="text-base font-semibold text-brand-black">
                  Approve with missing deliverables?
                </h3>
                <p className="text-sm text-neutral-600 mt-2">
                  {report.missing.length} deliverable{report.missing.length > 1 ? "s are" : " is"} still missing. Are you sure you want to approve and move this project to Client Review?
                </p>
                <ul className="mt-3 space-y-1 max-h-32 overflow-y-auto">
                  {report.missing.map((name: string, i: number) => (
                    <li key={i} className="text-xs text-error flex items-center gap-1.5">
                      <MissingIcon />
                      <span className="truncate">{name}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-end gap-3 mt-5">
                  <button
                    onClick={() => setShowApproveConfirm(false)}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setShowApproveConfirm(false);
                      handleApproveClickUp();
                    }}
                    className="rounded-lg px-4 py-2 text-sm font-semibold bg-brand-cerulean text-white hover:bg-brand-cerulean-dark transition-colors"
                  >
                    Approve Anyway
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty idle state */}
      {status === "idle" && (
        <div className="bg-white rounded-xl border border-neutral-300 p-12 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-neutral-200 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <p className="text-sm font-medium text-brand-black">No scan results yet</p>
          <p className="text-xs text-neutral-500 mt-1">
            Enter a SharePoint project path and click &ldquo;Scan Assets&rdquo; to compare files against the brief
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Thumbnail Component ───────────────────────────────────────────────────

const FILE_TYPE_ICONS: Record<string, string> = {
  image: "M21 12l-2.5-3-3.5 4.5-2.5-3L8 16h12z M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z",
  pdf: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6",
  video: "M23 7l-7 5 7 5V7z M16 3H5a2 2 0 00-2 2v14a2 2 0 002 2h11a2 2 0 002-2V5a2 2 0 00-2-2z",
  default: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8",
};

function getFileTypeCategory(mimeType?: string): string {
  if (!mimeType) return "default";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("video/")) return "video";
  return "default";
}

function FileThumbnail({ thumbnailUrl, mimeType, name }: { thumbnailUrl?: string; mimeType?: string; name: string }) {
  if (thumbnailUrl) {
    return (
      <div className="w-10 h-10 rounded-md overflow-hidden bg-neutral-100 shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumbnailUrl}
          alt={`Preview of ${name}`}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
    );
  }

  const category = getFileTypeCategory(mimeType);
  const iconPath = FILE_TYPE_ICONS[category] ?? FILE_TYPE_ICONS.default;

  return (
    <div className="w-10 h-10 rounded-md bg-neutral-100 flex items-center justify-center shrink-0">
      <svg className="w-5 h-5 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={iconPath} />
      </svg>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  variant = "neutral",
}: {
  label: string;
  value: number;
  variant?: "neutral" | "success" | "error" | "warning";
}) {
  const valueColors = {
    neutral: "text-brand-black",
    success: "text-success",
    error: "text-error",
    warning: "text-warning-text",
  };

  return (
    <div className="bg-white rounded-xl border border-neutral-300 p-4">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className={cn("text-2xl font-bold mt-1", valueColors[variant])}>{value}</p>
    </div>
  );
}

function ResultSection({
  title,
  count,
  variant,
  children,
}: {
  title: string;
  count: number;
  variant: "success" | "error" | "warning";
  children: React.ReactNode;
}) {
  const borderColors = {
    success: "border-success/20",
    error: "border-error/20",
    warning: "border-warning/20",
  };

  const badgeColors = {
    success: "bg-success-light text-success",
    error: "bg-error-light text-error",
    warning: "bg-warning-light text-warning-text",
  };

  return (
    <div className={cn("bg-white rounded-xl border p-6", borderColors[variant])}>
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-sm font-semibold text-brand-black">{title}</h3>
        <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", badgeColors[variant])}>
          {count}
        </span>
      </div>
      {children}
    </div>
  );
}
