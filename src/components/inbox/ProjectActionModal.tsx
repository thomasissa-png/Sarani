"use client";

// ─── Project Action Modal ───────────────────────────────────────────────────
// Modal for "Open Project" (client_followup) and "Prepare Pitch" (new_client_prospect).
// Shows email context + Arya's suggestion + contextual action buttons.

import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { EmailPayload } from "./EmailCard";
import { AryaRecommendsBanner } from "./AryaRecommendsBanner";

// ─── Types ──────────────────────────────────────────────────────────────────

type ModalVariant = "open_project" | "prepare_pitch" | "create_feedback";

interface ProjectActionModalProps {
  variant: ModalVariant;
  itemId: string;
  sourceId: string | null;
  payload: EmailPayload;
  onClose: () => void;
  onActionComplete: () => void;
  onOpenDraftReply: () => void;
  showToast: (message: string, type: "success" | "error") => void;
}

const VARIANT_CONFIG: Record<
  ModalVariant,
  { title: string; accentColor: string }
> = {
  open_project: {
    title: "Project Follow-up",
    accentColor: "bg-brand-cerulean",
  },
  prepare_pitch: {
    title: "New Prospect",
    accentColor: "bg-brand-flame",
  },
  create_feedback: {
    title: "Project Feedback",
    accentColor: "bg-brand-cerulean",
  },
};

// ─── Component ──────────────────────────────────────────────────────────────

export function ProjectActionModal({
  variant,
  itemId,
  sourceId,
  payload,
  onClose,
  onActionComplete,
  onOpenDraftReply,
  showToast,
}: ProjectActionModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isPostingFeedback, setIsPostingFeedback] = useState(false);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [isExtractingFeedback, setIsExtractingFeedback] = useState(false);

  // Manual ClickUp mapping
  const [showManualMap, setShowManualMap] = useState(false);
  const [manualSearchQuery, setManualSearchQuery] = useState(
    payload.classification?.clickupProjectHint ?? payload.subject ?? ""
  );
  const [manualSearchResults, setManualSearchResults] = useState<
    Array<{ taskId: string; taskUrl: string; taskName: string }>
  >([]);
  const [isManualSearching, setIsManualSearching] = useState(false);

  const handleManualSearch = async () => {
    if (!manualSearchQuery.trim()) return;
    setIsManualSearching(true);
    try {
      const res = await fetch("/api/admin/clickup/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: manualSearchQuery.trim() }),
      });
      if (res.ok) {
        const data = await res.json() as { taskId: string | null; taskUrl: string | null; taskName: string | null };
        if (data.taskId && data.taskUrl && data.taskName) {
          setManualSearchResults([{ taskId: data.taskId, taskUrl: data.taskUrl, taskName: data.taskName }]);
        } else {
          setManualSearchResults([]);
        }
      }
    } catch {
      showToast("Search failed — try again", "error");
    } finally {
      setIsManualSearching(false);
    }
  };

  const handleSelectManualResult = (result: { taskId: string; taskUrl: string; taskName: string }) => {
    setClickupSearchResult(result);
    setShowManualMap(false);
    showToast(`Mapped to: ${result.taskName}`, "success");
  };

  const config = VARIANT_CONFIG[variant];

  // ClickUp search: resolve clickupProjectHint into a real URL
  const [clickupSearchResult, setClickupSearchResult] = useState<{
    taskId: string | null;
    taskUrl: string | null;
    taskName: string | null;
  } | null>(null);
  const [isSearchingClickUp, setIsSearchingClickUp] = useState(false);

  useEffect(() => {
    if (variant !== "open_project" && variant !== "create_feedback") return;

    // Check if we already have a direct URL/taskId in the payload
    const directUrl = (payload as unknown as Record<string, unknown>)?.clickupUrl as string | undefined;
    const directTaskId = (payload as unknown as Record<string, unknown>)?.taskId as string | undefined;
    if (directUrl || directTaskId) {
      setClickupSearchResult({
        taskId: directTaskId ?? null,
        taskUrl: directUrl ?? (directTaskId ? `https://app.clickup.com/t/${directTaskId}` : null),
        taskName: null,
      });
      return;
    }

    // Otherwise, use clickupProjectHint to search
    const hint = payload.classification?.clickupProjectHint;
    if (!hint) return;

    setIsSearchingClickUp(true);
    fetch("/api/admin/clickup/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: hint }),
    })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.taskId) {
          setClickupSearchResult({
            taskId: data.taskId,
            taskUrl: data.taskUrl ?? `https://app.clickup.com/t/${data.taskId}`,
            taskName: data.taskName ?? null,
          });
        }
      })
      .catch(() => {
        // Graceful degradation — button stays disabled
      })
      .finally(() => setIsSearchingClickUp(false));
  }, [variant, payload]);

  // Feedback extraction: call LLM to transform email into ops feedback
  useEffect(() => {
    if (variant !== "create_feedback") return;

    setIsExtractingFeedback(true);
    setFeedbackComment("Arya is preparing the feedback...");

    const clientName =
      payload.classification.clickupProjectHint ||
      payload.from?.split("@")[0] ||
      "Unknown";

    fetch("/api/admin/feedback/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: payload.subject || "",
        body: payload.bodyPreview || "",
        from: payload.from || "",
        clientName,
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.feedbackComment) {
          setFeedbackComment(data.feedbackComment);
        } else {
          // Fallback: use raw email body so PM can edit manually
          setFeedbackComment(
            payload.bodyPreview || payload.classification.suggestedAction || ""
          );
        }
      })
      .catch(() => {
        // Fallback on error: use raw email body
        setFeedbackComment(
          payload.bodyPreview || payload.classification.suggestedAction || ""
        );
      })
      .finally(() => setIsExtractingFeedback(false));
  }, [variant, payload]);

  // Focus trap + Escape
  useEffect(() => {
    const firstButton = dialogRef.current?.querySelector<HTMLElement>(
      'button:not([aria-label="Close modal"])'
    );
    firstButton?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
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
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === overlayRef.current) onClose();
    },
    [onClose]
  );

  const handleArchive = async () => {
    setIsArchiving(true);
    try {
      const res = await fetch("/api/admin/inbox", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: itemId, status: "dismissed" }),
      });
      if (res.ok) {
        showToast("Archived", "success");
        onActionComplete();
        onClose();
      } else {
        showToast("Archive failed -- please retry", "error");
      }
    } catch {
      showToast("Network error -- please retry", "error");
    } finally {
      setIsArchiving(false);
    }
  };

  const handleDraftReply = () => {
    onClose();
    // Small delay so the first modal closes before the next opens
    setTimeout(() => onOpenDraftReply(), 50);
  };

  // ClickUp link: resolved from search or direct payload
  const resolvedClickupUrl = clickupSearchResult?.taskUrl ?? null;
  const hasClickUpLink = Boolean(resolvedClickupUrl);

  const tryOpenClickUp = () => {
    if (resolvedClickupUrl) {
      window.open(resolvedClickupUrl, "_blank", "noopener,noreferrer");
      showToast("Opened project in ClickUp", "success");
      handleMarkDone();
    } else {
      showToast("Project not found in ClickUp. Use manual search.", "error");
    }
  };

  const handleMarkDone = async () => {
    try {
      await fetch("/api/admin/inbox", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: itemId, status: "done" }),
      });
      onActionComplete();
      onClose();
    } catch {
      showToast("Failed to update item", "error");
    }
  };

  const handlePostFeedback = async () => {
    if (!feedbackComment.trim()) {
      showToast("Feedback comment cannot be empty", "error");
      return;
    }
    const taskId = clickupSearchResult?.taskId;
    if (!taskId) {
      showToast("No ClickUp project found — cannot post feedback", "error");
      return;
    }
    setIsPostingFeedback(true);
    try {
      // Post comment to ClickUp task
      const commentRes = await fetch("/api/admin/clickup/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, comment: feedbackComment }),
      });
      if (!commentRes.ok) {
        showToast("Failed to post comment to ClickUp", "error");
        return;
      }
      // Reopen the task (set status to "Open")
      const reopenRes = await fetch("/api/admin/clickup/reopen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      if (!reopenRes.ok) {
        showToast("Comment posted but failed to reopen task", "error");
      } else {
        showToast("Feedback posted and project reopened in ClickUp", "success");
      }
      handleMarkDone();
    } catch {
      showToast("Network error — please retry", "error");
    } finally {
      setIsPostingFeedback(false);
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
        aria-labelledby="project-action-title"
        className={cn(
          "bg-white rounded-xl shadow-xl w-full max-w-xl",
          "max-h-[90vh] flex flex-col",
          "sm:max-h-[85vh]",
          "max-sm:rounded-none max-sm:max-w-none max-sm:max-h-none max-sm:h-full max-sm:m-0"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 shrink-0">
          <h2
            id="project-action-title"
            className="text-lg font-bold text-brand-black"
          >
            {config.title}
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Arya Recommends banner */}
          <AryaRecommendsBanner
            lines={
              variant === "create_feedback"
                ? [
                    ...(payload.classification.clickupProjectHint
                      ? [{ label: "Project", value: payload.classification.clickupProjectHint }]
                      : []),
                    ...(clickupSearchResult?.taskName
                      ? [{ label: "ClickUp task", value: clickupSearchResult.taskName }]
                      : []),
                    { label: "Action", value: "Post feedback to ClickUp" },
                  ]
                : variant === "open_project"
                  ? [
                      ...(clickupSearchResult?.taskName
                        ? [{ label: "Project", value: clickupSearchResult.taskName }]
                        : payload.classification.clickupProjectHint
                          ? [{ label: "Project", value: payload.classification.clickupProjectHint }]
                          : []),
                      { label: "Action", value: "Open in ClickUp" },
                    ]
                  : [
                      { label: "Prospect", value: payload.from },
                      { label: "Action", value: "Draft welcome reply" },
                    ]
            }
          />

          {/* Email context */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
              Original Email
            </h3>
            <div className="bg-neutral-50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-neutral-500 w-14 shrink-0">
                  From
                </span>
                <span className="text-sm text-brand-black font-medium truncate">
                  {payload.from}
                </span>
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

          {/* Arya's suggestion */}
          {payload.classification.suggestedAction && (
            <div className="bg-neutral-50 rounded-lg px-4 py-3">
              <p className="text-xs text-neutral-500 italic leading-relaxed">
                <span className="font-semibold not-italic text-neutral-600">
                  Arya suggests:
                </span>{" "}
                {payload.classification.suggestedAction}
              </p>
            </div>
          )}

          {payload.classification.reasoning && (
            <div className="bg-neutral-50 rounded-lg px-4 py-3">
              <p className="text-xs text-neutral-500 italic leading-relaxed">
                <span className="font-semibold not-italic text-neutral-600">
                  Analysis:
                </span>{" "}
                {payload.classification.reasoning}
              </p>
            </div>
          )}

          {/* Feedback comment editor (create_feedback variant) */}
          {variant === "create_feedback" && (
            <div className="space-y-2">
              <label htmlFor="feedback-comment" className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                Feedback Comment for ClickUp
              </label>
              <textarea
                id="feedback-comment"
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                rows={10}
                disabled={isExtractingFeedback}
                className={cn(
                  "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-brand-black focus:border-brand-cerulean focus:ring-1 focus:ring-brand-cerulean outline-none resize-y",
                  isExtractingFeedback && "opacity-60 italic"
                )}
                placeholder="Write the feedback comment to post on the ClickUp task..."
              />
              {clickupSearchResult?.taskName && (
                <p className="text-xs text-neutral-400">
                  Will be posted to: <span className="font-medium text-brand-cerulean">{clickupSearchResult.taskName}</span>
                </p>
              )}
              {isSearchingClickUp && (
                <p className="text-xs text-neutral-400">Searching for project in ClickUp...</p>
              )}
              {!isSearchingClickUp && !clickupSearchResult?.taskId && !showManualMap && (
                <div className="flex items-center gap-2">
                  <p className="text-xs text-error">Project not found in ClickUp</p>
                  <button
                    onClick={() => setShowManualMap(true)}
                    className="text-xs text-brand-cerulean hover:underline font-medium"
                  >
                    Map manually
                  </button>
                </div>
              )}
              {showManualMap && (
                <div className="bg-neutral-50 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Search ClickUp project</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={manualSearchQuery}
                      onChange={(e) => setManualSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleManualSearch()}
                      placeholder="Type project or client name..."
                      className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-cerulean/40 focus:border-brand-cerulean"
                      aria-label="Search ClickUp project by name"
                    />
                    <button
                      onClick={handleManualSearch}
                      disabled={isManualSearching || !manualSearchQuery.trim()}
                      className="px-3 py-2 min-h-[44px] rounded-lg text-sm font-medium bg-brand-cerulean text-white hover:bg-brand-cerulean-dark transition-colors disabled:opacity-50"
                    >
                      {isManualSearching ? "..." : "Search"}
                    </button>
                  </div>
                  {manualSearchResults.length > 0 && (
                    <div className="space-y-1">
                      {manualSearchResults.map((r) => (
                        <button
                          key={r.taskId}
                          onClick={() => handleSelectManualResult(r)}
                          className="w-full text-left px-3 py-2 rounded-lg text-sm bg-white border border-neutral-200 hover:border-brand-cerulean hover:bg-brand-cerulean/5 transition-colors"
                        >
                          <span className="font-medium text-brand-black">{r.taskName}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {!isManualSearching && manualSearchResults.length === 0 && manualSearchQuery && (
                    <p className="text-xs text-neutral-400">No results — try a different query</p>
                  )}
                  <button
                    onClick={() => setShowManualMap(false)}
                    className="text-xs text-neutral-400 hover:text-neutral-600"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-neutral-200 shrink-0 space-y-3">
          {variant === "open_project" && (
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={tryOpenClickUp}
                  disabled={!hasClickUpLink || isSearchingClickUp}
                  className={cn(
                    "flex-1 px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-semibold transition-colors",
                    hasClickUpLink
                      ? "bg-brand-cerulean text-white hover:bg-brand-cerulean-dark"
                      : "bg-neutral-200 text-neutral-400 cursor-not-allowed"
                  )}
                  title={
                    isSearchingClickUp
                      ? "Searching for project in ClickUp..."
                      : hasClickUpLink
                        ? `Open ${clickupSearchResult?.taskName ?? "project"} in ClickUp`
                        : "Project not found in ClickUp"
                  }
                >
                  {isSearchingClickUp ? "Searching ClickUp..." : "Open in ClickUp"}
                </button>
                <button
                  onClick={handleDraftReply}
                  aria-label="Draft a reply to this email"
                  className="flex-1 px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-semibold bg-success text-white hover:bg-green-700 transition-colors"
                >
                  Draft Reply
                </button>
              </div>
              {!hasClickUpLink && !isSearchingClickUp && !showManualMap && (
                <div className="flex items-center gap-2">
                  <p className="text-xs text-neutral-400">Project not found in ClickUp</p>
                  <button
                    onClick={() => setShowManualMap(true)}
                    className="text-xs text-brand-cerulean hover:underline font-medium"
                  >
                    Map manually
                  </button>
                </div>
              )}
              {showManualMap && (
                <div className="bg-neutral-50 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Search ClickUp project</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={manualSearchQuery}
                      onChange={(e) => setManualSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleManualSearch()}
                      placeholder="Type project or client name..."
                      className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-cerulean/40 focus:border-brand-cerulean"
                      aria-label="Search ClickUp project by name"
                    />
                    <button
                      onClick={handleManualSearch}
                      disabled={isManualSearching || !manualSearchQuery.trim()}
                      className="px-3 py-2 min-h-[44px] rounded-lg text-sm font-medium bg-brand-cerulean text-white hover:bg-brand-cerulean-dark transition-colors disabled:opacity-50"
                    >
                      {isManualSearching ? "..." : "Search"}
                    </button>
                  </div>
                  {manualSearchResults.length > 0 && (
                    <div className="space-y-1">
                      {manualSearchResults.map((r) => (
                        <button
                          key={r.taskId}
                          onClick={() => handleSelectManualResult(r)}
                          className="w-full text-left px-3 py-2 rounded-lg text-sm bg-white border border-neutral-200 hover:border-brand-cerulean hover:bg-brand-cerulean/5 transition-colors"
                        >
                          <span className="font-medium text-brand-black">{r.taskName}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {!isManualSearching && manualSearchResults.length === 0 && manualSearchQuery && (
                    <p className="text-xs text-neutral-400">No results — try a different query</p>
                  )}
                  <button
                    onClick={() => setShowManualMap(false)}
                    className="text-xs text-neutral-400 hover:text-neutral-600"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}

          {variant === "create_feedback" && (
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={handlePostFeedback}
                  disabled={!hasClickUpLink || isSearchingClickUp || isPostingFeedback || !feedbackComment.trim()}
                  className={cn(
                    "flex-1 px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-semibold transition-colors",
                    hasClickUpLink && feedbackComment.trim()
                      ? "bg-brand-cerulean text-white hover:bg-brand-cerulean-dark"
                      : "bg-neutral-200 text-neutral-400 cursor-not-allowed"
                  )}
                  aria-label="Post feedback comment to ClickUp and reopen the task"
                >
                  {isPostingFeedback ? "Posting..." : isSearchingClickUp ? "Searching ClickUp..." : "Post Feedback to ClickUp"}
                </button>
                <button
                  onClick={handleDraftReply}
                  aria-label="Draft a reply to this client"
                  className="flex-1 px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-medium bg-success text-white hover:bg-green-700 transition-colors"
                >
                  Draft Reply
                </button>
              </div>
              {!hasClickUpLink && !isSearchingClickUp && !showManualMap && (
                <div className="flex items-center gap-2">
                  <p className="text-xs text-neutral-400">Project not found in ClickUp</p>
                  <button
                    onClick={() => setShowManualMap(true)}
                    className="text-xs text-brand-cerulean hover:underline font-medium"
                  >
                    Map manually
                  </button>
                </div>
              )}
            </div>
          )}

          {variant === "prepare_pitch" && (
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleDraftReply}
                aria-label="Draft a welcome reply to this prospect"
                className="flex-1 px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-semibold bg-brand-flame text-white hover:bg-brand-flame/90 transition-colors"
              >
                Draft Welcome Reply
              </button>
              <button
                onClick={() => {
                  handleMarkDone();
                  window.open("/admin/clients/new", "_blank", "noopener,noreferrer");
                }}
                aria-label="Create a new client profile"
                className="flex-1 px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-medium bg-brand-cerulean text-white hover:bg-brand-cerulean-dark transition-colors"
              >
                Create Client Profile
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={handleArchive}
              disabled={isArchiving}
              aria-label="Archive this item"
              className="px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-medium bg-neutral-200 text-neutral-600 hover:bg-neutral-300 transition-colors disabled:opacity-50"
            >
              {isArchiving ? "Archiving..." : "Archive"}
            </button>
            <button
              onClick={onClose}
              aria-label="Cancel and close modal"
              className="px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-medium text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
