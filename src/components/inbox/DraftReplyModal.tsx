"use client";

// ─── Draft Reply Modal ──────────────────────────────────────────────────────
// Modal for reviewing email context and creating an Outlook draft reply.
// Shows original email (readonly) + editable reply fields.

import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { EmailPayload } from "./EmailCard";

// ─── Types ──────────────────────────────────────────────────────────────────

interface DraftReplyModalProps {
  itemId: string;
  sourceId: string | null;
  payload: EmailPayload;
  onClose: () => void;
  onDrafted: () => void;
  showToast: (message: string, type: "success" | "error") => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function DraftReplyModal({
  itemId,
  sourceId,
  payload,
  onClose,
  onDrafted,
  showToast,
}: DraftReplyModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const replyRef = useRef<HTMLTextAreaElement>(null);

  const draftReply = payload.classification.draftReply || "";
  const suggestedAction = payload.classification.suggestedAction || "";

  const [replyBody, setReplyBody] = useState(draftReply);
  const [subject, setSubject] = useState(
    payload.subject.startsWith("Re:") ? payload.subject : `Re: ${payload.subject}`
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Focus trap + Escape
  useEffect(() => {
    replyRef.current?.focus();

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

  const handleSubmit = async () => {
    if (!replyBody.trim()) {
      showToast("Reply body cannot be empty", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/emails/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: payload.from,
          subject,
          body: replyBody,
          replyToMessageId: sourceId ?? undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const webLink = data.webLink as string | undefined;
        showToast(
          webLink
            ? "Draft created in Outlook -- open to review and send"
            : "Draft created in Outlook",
          "success"
        );
        if (webLink) {
          window.open(webLink, "_blank", "noopener,noreferrer");
        }

        // Mark inbox item as done
        try {
          await fetch("/api/admin/inbox", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: itemId, status: "done" }),
          });
        } catch {
          // Non-critical: draft was created successfully
        }

        onDrafted();
        onClose();
      } else {
        const errData = await res.json().catch(() => ({}));
        const errMsg =
          (errData as Record<string, unknown>).error ?? `Failed (${res.status})`;
        showToast(String(errMsg), "error");
      }
    } catch (err) {
      console.error("[DraftReplyModal] submit error:", err);
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
        aria-labelledby="draft-reply-title"
        className={cn(
          "bg-white rounded-xl shadow-xl w-full max-w-2xl",
          "max-h-[90vh] flex flex-col",
          "sm:max-h-[85vh]",
          "max-sm:rounded-none max-sm:max-w-none max-sm:max-h-none max-sm:h-full max-sm:m-0"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 shrink-0">
          <h2
            id="draft-reply-title"
            className="text-lg font-bold text-brand-black"
          >
            Draft Reply
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
          {/* Original email (readonly) */}
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

          {/* Arya's analysis (readonly context for PM) */}
          {suggestedAction && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                Arya&apos;s Analysis
              </h3>
              <div className="bg-neutral-50 rounded-lg px-4 py-3">
                <p className="text-sm text-neutral-600 leading-relaxed italic">
                  {suggestedAction}
                </p>
              </div>
            </div>
          )}

          {/* Reply fields */}
          <div className="space-y-4">
            {/* To (readonly) */}
            <div>
              <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1.5">
                To
              </label>
              <div className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 min-h-[44px] text-sm text-neutral-600 flex items-center">
                {payload.from}
              </div>
            </div>

            {/* Subject (editable) */}
            <div>
              <label
                htmlFor="draft-subject"
                className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1.5"
              >
                Subject
              </label>
              <input
                id="draft-subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 min-h-[44px] text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean/40 focus:border-brand-cerulean"
              />
            </div>

            {/* Reply body */}
            <div>
              <label
                htmlFor="draft-reply-body"
                className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1.5"
              >
                Reply
              </label>
              <textarea
                ref={replyRef}
                id="draft-reply-body"
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                rows={10}
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean/40 focus:border-brand-cerulean resize-y leading-relaxed"
                placeholder="Write your reply here..."
              />
              {draftReply && (
                <p className="text-xs text-neutral-400 mt-1 italic">
                  Pre-filled with Arya&apos;s suggested reply
                </p>
              )}
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
            disabled={isSubmitting || !replyBody.trim()}
            className="px-5 py-2.5 min-h-[44px] rounded-lg text-sm font-semibold bg-success text-white hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Creating Draft..." : "Create Draft in Outlook"}
          </button>
        </div>
      </div>
    </div>
  );
}
