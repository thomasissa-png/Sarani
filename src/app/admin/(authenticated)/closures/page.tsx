"use client";

import { useEffect, useState, useCallback } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface StarDetails {
  clientTier: number;
  measurableImpact: number;
  creativeAmbition: number;
  storytelling: number;
  portfolioGap: number;
}

interface PipelineItem {
  id: string;
  outputType: string;
  status: string;
  reviewedAt: string | null;
}

interface ClosureRecord {
  id: string;
  clickupTaskId: string;
  clientId: string | null;
  projectName: string;
  status: string;
  closureReason: string;
  starScore: number | null;
  starDetails: StarDetails | null;
  starStatus: string | null;
  closedAt: string | null;
  closedBy: string | null;
  createdAt: string;
  clientNameResolved: string | null;
  pipelineItems: PipelineItem[];
}

type ClosureFormData = {
  clickupTaskId: string;
  projectName: string;
  closureReason: "client_approved" | "timeout_14d" | "manual";
  clientName: string;
  metrics: string;
  projectType: string;
  existingCaseStudiesInSector: string;
  caseStudyScore: string;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(date: string | null | undefined): string {
  if (!date) return "--";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "--";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getStarStatusBadge(starStatus: string | null): {
  label: string;
  classes: string;
} {
  switch (starStatus) {
    case "STAR":
      return { label: "STAR", classes: "bg-yellow-100 text-yellow-800" };
    case "STRONG_STORY_WEAK_ASSETS":
      return {
        label: "Strong Story",
        classes: "bg-blue-100 text-blue-700",
      };
    case "NOTEWORTHY":
      return {
        label: "Noteworthy",
        classes: "bg-purple-100 text-purple-700",
      };
    case "STANDARD":
      return { label: "Standard", classes: "bg-neutral-200 text-neutral-600" };
    default:
      return { label: "--", classes: "bg-neutral-100 text-neutral-500" };
  }
}

function getClosureReasonLabel(reason: string): string {
  switch (reason) {
    case "client_approved":
      return "Client Approved";
    case "timeout_14d":
      return "14-Day Timeout";
    case "manual":
      return "Manual";
    case "starred":
      return "Starred from Tracker";
    default:
      return reason;
  }
}

function getPipelineOutputLabel(outputType: string): string {
  switch (outputType) {
    case "case_study":
      return "Case Study";
    case "linkedin_post":
      return "LinkedIn Post";
    case "presentation_slide":
      return "Slide";
    case "seo_signal":
      return "SEO Signal";
    default:
      return outputType;
  }
}

function getPipelineStatusBadge(status: string): {
  label: string;
  classes: string;
} {
  switch (status) {
    case "pending":
      return { label: "Pending", classes: "bg-neutral-200 text-neutral-600" };
    case "generating":
      return {
        label: "Generating...",
        classes: "bg-yellow-100 text-yellow-700",
      };
    case "review":
      return { label: "In Review", classes: "bg-blue-100 text-blue-700" };
    case "published":
      return { label: "Published", classes: "bg-green-100 text-green-700" };
    case "skipped":
      return { label: "Skipped", classes: "bg-neutral-200 text-neutral-500" };
    default:
      return { label: status, classes: "bg-neutral-100 text-neutral-500" };
  }
}

function getScoreColor(score: number): string {
  if (score >= 75) return "text-green-700";
  if (score >= 50) return "text-yellow-700";
  return "text-neutral-600";
}

// ─── Star Score Bar Component ──────────────────────────────────────────────

function StarScoreBar({
  label,
  score,
  max,
}: {
  label: string;
  score: number;
  max: number;
}) {
  const pct = Math.round((score / max) * 100);
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-36 text-neutral-600 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-neutral-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-yellow-500 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-12 text-right font-mono text-neutral-700">
        {score}/{max}
      </span>
    </div>
  );
}

// ─── Close Project Modal ──────────────────────────────────────────────────

function CloseProjectModal({
  onClose,
  onSubmit,
  submitting,
}: {
  onClose: () => void;
  onSubmit: (data: ClosureFormData) => void;
  submitting: boolean;
}) {
  const [form, setForm] = useState<ClosureFormData>({
    clickupTaskId: "",
    projectName: "",
    closureReason: "manual",
    clientName: "",
    metrics: "",
    projectType: "",
    existingCaseStudiesInSector: "3",
    caseStudyScore: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-label="Close Project"
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
        <h2 className="text-lg font-semibold text-neutral-900 mb-4">
          Close Project
        </h2>
        <div className="space-y-3">
          <div>
            <label
              htmlFor="clickupTaskId"
              className="block text-sm font-medium text-neutral-700 mb-1"
            >
              ClickUp Task ID *
            </label>
            <input
              id="clickupTaskId"
              name="clickupTaskId"
              type="text"
              value={form.clickupTaskId}
              onChange={handleChange}
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
              placeholder="e.g. abc123xyz"
              required
            />
          </div>
          <div>
            <label
              htmlFor="projectName"
              className="block text-sm font-medium text-neutral-700 mb-1"
            >
              Project Name *
            </label>
            <input
              id="projectName"
              name="projectName"
              type="text"
              value={form.projectName}
              onChange={handleChange}
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
              placeholder="e.g. TikTok #GimmeTheMic"
              required
            />
          </div>
          <div>
            <label
              htmlFor="closureReason"
              className="block text-sm font-medium text-neutral-700 mb-1"
            >
              Closure Reason *
            </label>
            <select
              id="closureReason"
              name="closureReason"
              value={form.closureReason}
              onChange={handleChange}
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
            >
              <option value="client_approved">Client Approved</option>
              <option value="timeout_14d">14-Day Timeout</option>
              <option value="manual">Manual</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="clientName"
              className="block text-sm font-medium text-neutral-700 mb-1"
            >
              Client Name (for star scoring)
            </label>
            <input
              id="clientName"
              name="clientName"
              type="text"
              value={form.clientName}
              onChange={handleChange}
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
              placeholder="e.g. TikTok"
            />
          </div>
          <div>
            <label
              htmlFor="metrics"
              className="block text-sm font-medium text-neutral-700 mb-1"
            >
              Metrics (comma-separated)
            </label>
            <input
              id="metrics"
              name="metrics"
              type="text"
              value={form.metrics}
              onChange={handleChange}
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
              placeholder="e.g. 94M views, 3800 budget"
            />
          </div>
          <div>
            <label
              htmlFor="projectType"
              className="block text-sm font-medium text-neutral-700 mb-1"
            >
              Project Type
            </label>
            <input
              id="projectType"
              name="projectType"
              type="text"
              value={form.projectType}
              onChange={handleChange}
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
              placeholder="e.g. Video campaign"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="existingCaseStudiesInSector"
                className="block text-sm font-medium text-neutral-700 mb-1"
              >
                Existing Case Studies
              </label>
              <input
                id="existingCaseStudiesInSector"
                name="existingCaseStudiesInSector"
                type="number"
                min="0"
                value={form.existingCaseStudiesInSector}
                onChange={handleChange}
                className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
              />
            </div>
            <div>
              <label
                htmlFor="caseStudyScore"
                className="block text-sm font-medium text-neutral-700 mb-1"
              >
                Case Study Score (0-100)
              </label>
              <input
                id="caseStudyScore"
                name="caseStudyScore"
                type="number"
                min="0"
                max="100"
                value={form.caseStudyScore}
                onChange={handleChange}
                className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
                placeholder="Optional"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-neutral-700 border border-neutral-300 rounded-lg hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-400"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSubmit(form)}
            className="px-4 py-2 text-sm text-white bg-neutral-900 rounded-lg hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-400 disabled:opacity-50"
            disabled={
              submitting ||
              !form.clickupTaskId.trim() ||
              !form.projectName.trim()
            }
          >
            {submitting ? "Closing..." : "Close Project"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page Component ─────────────────────────────────────────────────────────

export default function ClosuresPage() {
  const [closures, setClosures] = useState<ClosureRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<Set<string>>(new Set());

  // ─── Fetch closures ──────────────────────────────────────────────────────

  const fetchClosures = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/admin/closures");
      if (!res.ok) {
        throw new Error(`Failed to fetch closures (${res.status})`);
      }
      const data: ClosureRecord[] = await res.json();
      setClosures(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClosures();
  }, [fetchClosures]);

  // ─── Submit closure ──────────────────────────────────────────────────────

  const handleSubmitClosure = useCallback(
    async (form: ClosureFormData) => {
      setSubmitting(true);
      try {
        const metricsArray = form.metrics
          .split(",")
          .map((m) => m.trim())
          .filter(Boolean);

        const payload = {
          clickupTaskId: form.clickupTaskId.trim(),
          projectName: form.projectName.trim(),
          closureReason: form.closureReason,
          clientName: form.clientName.trim() || undefined,
          metrics: metricsArray.length > 0 ? metricsArray : undefined,
          projectType: form.projectType.trim() || undefined,
          existingCaseStudiesInSector: parseInt(
            form.existingCaseStudiesInSector,
            10
          ),
          caseStudyScore: form.caseStudyScore
            ? parseInt(form.caseStudyScore, 10)
            : undefined,
        };

        const res = await fetch("/api/admin/closures", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(
            errData?.error ?? `Failed to create closure (${res.status})`
          );
        }

        setShowModal(false);
        await fetchClosures();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setSubmitting(false);
      }
    },
    [fetchClosures]
  );

  // ─── Pipeline item action ───────────────────────────────────────────────

  const handlePipelineAction = useCallback(
    async (
      closureId: string,
      itemId: string,
      newStatus: "published" | "skipped"
    ) => {
      setActionLoading((prev) => new Set(prev).add(itemId));
      try {
        const res = await fetch(
          `/api/admin/closures/${closureId}/star-pipeline`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ itemId, status: newStatus }),
          }
        );
        if (!res.ok) {
          throw new Error(`Failed to update pipeline item (${res.status})`);
        }
        await fetchClosures();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setActionLoading((prev) => {
          const next = new Set(prev);
          next.delete(itemId);
          return next;
        });
      }
    },
    [fetchClosures]
  );

  // ─── Star actions (confirm/reject/generate) ────────────────────────────────

  const handleStarOverride = useCallback(
    async (closureId: string, action: "confirm_star" | "reject_star" | "nominate_star", source?: string) => {
      const loadingKey = `override-${closureId}`;
      setActionLoading((prev) => new Set(prev).add(loadingKey));
      try {
        // For candidates: "Create Case Study" triggers generation pipeline
        if (source === "candidate" && (action === "confirm_star" || action === "nominate_star")) {
          // 1. Update status via PATCH
          const patchRes = await fetch("/api/admin/closures", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ closureId, action }),
          });
          if (!patchRes.ok) {
            throw new Error(`Failed to update status (${patchRes.status})`);
          }
          // 2. Trigger content generation pipeline
          const genRes = await fetch(`/api/admin/case-studies/candidates/${closureId}/generate`, {
            method: "POST",
          });
          if (!genRes.ok) {
            const errData = await genRes.json().catch(() => ({}));
            console.error("[Generate] Error:", errData);
            // Don't throw — status was already updated, generation can be retried
          }
          await fetchClosures();
          return;
        }

        const res = await fetch("/api/admin/closures", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ closureId, action }),
        });
        if (!res.ok) {
          throw new Error(`Failed to update status (${res.status})`);
        }
        await fetchClosures();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setActionLoading((prev) => {
          const next = new Set(prev);
          next.delete(loadingKey);
          return next;
        });
      }
    },
    [fetchClosures]
  );

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            Case Studies
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Starred projects with scoring and content pipeline
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-neutral-900 rounded-lg hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-400"
        >
          Close Project
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div
          className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"
          role="alert"
        >
          {error}
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-2 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-6 w-6 border-2 border-neutral-300 border-t-neutral-900 rounded-full" />
          <span className="ml-3 text-sm text-neutral-500">
            Loading closures...
          </span>
        </div>
      )}

      {/* Empty state */}
      {!loading && closures.length === 0 && (
        <div className="text-center py-12">
          <p className="text-neutral-500 text-sm">
            No case studies yet. Star a project from the Tracker or close a project to get started.
          </p>
        </div>
      )}

      {/* Closures list */}
      {!loading && closures.length > 0 && (
        <div className="space-y-4">
          {closures.map((closure) => {
            const starBadge = getStarStatusBadge(closure.starStatus);
            const isExpanded = expandedId === closure.id;
            const hasPipeline = closure.pipelineItems.length > 0;

            return (
              <div
                key={closure.id}
                className="border border-neutral-200 rounded-xl bg-white overflow-hidden"
              >
                {/* Row header */}
                <button
                  type="button"
                  onClick={() =>
                    setExpandedId(isExpanded ? null : closure.id)
                  }
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-neutral-50 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-neutral-400"
                  aria-expanded={isExpanded}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    {/* Star badge */}
                    {closure.starStatus === "STAR" && (
                      <span
                        className="text-xl shrink-0"
                        aria-label="Star project"
                      >
                        ★
                      </span>
                    )}
                    <div className="min-w-0">
                      <span className="font-semibold text-neutral-900 block truncate">
                        {closure.projectName}
                      </span>
                      <span className="text-xs text-neutral-500">
                        {closure.clientNameResolved ?? "No client linked"} —{" "}
                        {getClosureReasonLabel(closure.closureReason)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    {closure.starScore !== null && (
                      <span
                        className={`font-mono text-sm font-semibold ${getScoreColor(closure.starScore)}`}
                      >
                        {closure.starScore}/100
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${starBadge.classes}`}
                    >
                      {starBadge.label}
                    </span>
                    <span className="text-xs text-neutral-400">
                      {formatDate(closure.closedAt)}
                    </span>
                    <svg
                      className={`w-4 h-4 text-neutral-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-neutral-100 pt-4">
                    {/* Star score breakdown */}
                    {closure.starDetails && (
                      <div className="mb-4">
                        <h3 className="text-sm font-medium text-neutral-700 mb-2">
                          Star Score Breakdown
                        </h3>
                        <div className="space-y-1.5 max-w-md">
                          <StarScoreBar
                            label="Client Tier"
                            score={closure.starDetails.clientTier}
                            max={25}
                          />
                          <StarScoreBar
                            label="Measurable Impact"
                            score={closure.starDetails.measurableImpact}
                            max={25}
                          />
                          <StarScoreBar
                            label="Creative Ambition"
                            score={closure.starDetails.creativeAmbition}
                            max={20}
                          />
                          <StarScoreBar
                            label="Storytelling"
                            score={closure.starDetails.storytelling}
                            max={15}
                          />
                          <StarScoreBar
                            label="Portfolio Gap"
                            score={closure.starDetails.portfolioGap}
                            max={15}
                          />
                        </div>
                      </div>
                    )}

                    {/* Pipeline items */}
                    {hasPipeline && (
                      <div>
                        <h3 className="text-sm font-medium text-neutral-700 mb-2">
                          Content Pipeline
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {closure.pipelineItems.map((item) => {
                            const badge = getPipelineStatusBadge(item.status);
                            const isItemLoading = actionLoading.has(item.id);
                            const canAct =
                              item.status === "pending" ||
                              item.status === "review";

                            return (
                              <div
                                key={item.id}
                                className="flex items-center justify-between border border-neutral-200 rounded-lg px-3 py-2"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-neutral-800">
                                    {getPipelineOutputLabel(item.outputType)}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.classes}`}
                                  >
                                    {badge.label}
                                  </span>
                                </div>
                                {canAct && (
                                  <div className="flex gap-1">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handlePipelineAction(
                                          closure.id,
                                          item.id,
                                          "published"
                                        )
                                      }
                                      disabled={isItemLoading}
                                      className="px-2 py-1 text-xs text-green-700 border border-green-200 rounded hover:bg-green-50 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-green-400"
                                      aria-label={`Publish ${getPipelineOutputLabel(item.outputType)}`}
                                    >
                                      Publish
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handlePipelineAction(
                                          closure.id,
                                          item.id,
                                          "skipped"
                                        )
                                      }
                                      disabled={isItemLoading}
                                      className="px-2 py-1 text-xs text-neutral-500 border border-neutral-200 rounded hover:bg-neutral-50 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-neutral-400"
                                      aria-label={`Skip ${getPipelineOutputLabel(item.outputType)}`}
                                    >
                                      Skip
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* No pipeline */}
                    {!hasPipeline && (
                      <p className="text-xs text-neutral-500">
                        No content pipeline for this project (score below star
                        threshold or pipeline was skipped).
                      </p>
                    )}

                    {/* Actions */}
                    <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center gap-2">
                      {closure.starStatus !== "STAR" && (
                        <button
                          type="button"
                          onClick={() => handleStarOverride(closure.id, "nominate_star")}
                          disabled={actionLoading.has(`override-${closure.id}`)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-400"
                        >
                          ★ Nominate as Star
                        </button>
                      )}
                      {closure.starStatus === "STAR" && !closure.closedBy?.startsWith("pm_confirmed") && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleStarOverride(closure.id, "confirm_star")}
                            disabled={actionLoading.has(`override-${closure.id}`)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-neutral-900 rounded-lg hover:bg-neutral-800 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-400"
                          >
                            Create Case Study
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStarOverride(closure.id, "reject_star")}
                            disabled={actionLoading.has(`override-${closure.id}`)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-neutral-500 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-300"
                          >
                            Remove
                          </button>
                        </>
                      )}
                      {closure.closedBy?.startsWith("pm_confirmed") && (
                        <span className="text-xs text-success font-medium">Case study in progress ✓</span>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="mt-3 text-xs text-neutral-400">
                      ClickUp: {closure.clickupTaskId} — Closed by:{" "}
                      {closure.closedBy ?? "--"}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Close Project Modal */}
      {showModal && (
        <CloseProjectModal
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmitClosure}
          submitting={submitting}
        />
      )}
    </div>
  );
}
