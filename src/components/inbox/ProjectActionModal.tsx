"use client";

// ─── Project Action Modal ───────────────────────────────────────────────────
// Modal for "Open Project" (client_followup) and "Prepare Pitch" (new_client_prospect).
// Shows email context + Arya's suggestion + contextual action buttons.

import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { EmailPayload } from "./EmailCard";

// ─── Types ──────────────────────────────────────────────────────────────────

type ModalVariant = "open_project" | "prepare_pitch";

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

  const config = VARIANT_CONFIG[variant];

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

  // Extract ClickUp URL from summary if available (for open_project)
  const tryOpenClickUp = () => {
    // Try to find a ClickUp URL in the parsed summary
    const clickupUrl = emailData?.clickupUrl as string | undefined;
    const taskId = emailData?.taskId as string | undefined;

    if (clickupUrl) {
      window.open(clickupUrl, "_blank", "noopener,noreferrer");
      showToast("Opened project in ClickUp", "success");
      handleMarkDone();
    } else if (taskId) {
      window.open(`https://app.clickup.com/t/${taskId}`, "_blank", "noopener,noreferrer");
      showToast("Opened project in ClickUp", "success");
      handleMarkDone();
    } else {
      // No URL found — open ClickUp search as fallback
      window.open("https://app.clickup.com", "_blank", "noopener,noreferrer");
      showToast("No project link found — opened ClickUp for manual search", "success");
      handleMarkDone();
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
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-neutral-200 shrink-0 space-y-3">
          {variant === "open_project" && (
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={tryOpenClickUp}
                className="flex-1 px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-semibold bg-brand-cerulean text-white hover:bg-brand-cerulean-dark transition-colors"
              >
                Open in ClickUp
              </button>
              <button
                onClick={handleDraftReply}
                className="flex-1 px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-semibold bg-success text-white hover:bg-green-700 transition-colors"
              >
                Draft Reply
              </button>
            </div>
          )}

          {variant === "prepare_pitch" && (
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleDraftReply}
                className="flex-1 px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-semibold bg-brand-flame text-white hover:bg-brand-flame/90 transition-colors"
              >
                Draft Welcome Reply
              </button>
              <button
                onClick={() => {
                  handleMarkDone();
                  window.open("/admin/clients/new", "_blank", "noopener,noreferrer");
                }}
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
              className="px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-medium bg-neutral-200 text-neutral-600 hover:bg-neutral-300 transition-colors disabled:opacity-50"
            >
              {isArchiving ? "Archiving..." : "Archive"}
            </button>
            <button
              onClick={onClose}
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
