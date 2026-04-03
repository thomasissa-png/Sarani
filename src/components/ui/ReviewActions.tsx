"use client";

import { useState, useCallback } from "react";

interface ReviewActionsProps {
  previewId: string;
  projectName: string;
}

/**
 * Approve / Request Changes buttons for the client on the presentation page.
 * Posts a special comment to mark the review decision.
 */
export function ReviewActions({ previewId, projectName }: ReviewActionsProps) {
  const [status, setStatus] = useState<"idle" | "approved" | "changes" | "submitting">("idle");
  const [authorName, setAuthorName] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("sarani-comment-name") ?? "";
    return "";
  });
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [pendingAction, setPendingAction] = useState<"approved" | "changes" | null>(null);
  const [changesNote, setChangesNote] = useState("");

  const submitReview = useCallback(async (action: "approved" | "changes", note?: string) => {
    setStatus("submitting");
    try {
      if (authorName.trim()) {
        localStorage.setItem("sarani-comment-name", authorName.trim());
      }
      const content = action === "approved"
        ? `✅ Approved — ${projectName}`
        : `🔄 Changes requested — ${note || "See comments on individual assets"}`;

      await fetch(`/api/project-comments/${previewId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorName: authorName.trim() || "Client",
          content,
        }),
      });
      setStatus(action);
    } catch {
      setStatus("idle");
    }
  }, [previewId, projectName, authorName]);

  const handleAction = (action: "approved" | "changes") => {
    if (!authorName.trim()) {
      setPendingAction(action);
      setShowNamePrompt(true);
      return;
    }
    if (action === "changes") {
      setPendingAction("changes");
      setShowNamePrompt(true); // Reuse prompt for changes note
      return;
    }
    submitReview(action);
  };

  if (status === "approved") {
    return (
      <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-6 py-6 text-center">
        <p className="text-lg font-semibold text-green-400">Approved</p>
        <p className="text-sm text-green-400/60 mt-1">Thank you for your feedback. The team has been notified.</p>
      </div>
    );
  }

  if (status === "changes") {
    return (
      <div className="rounded-xl border border-brand-flame/30 bg-brand-flame/10 px-6 py-6 text-center">
        <p className="text-lg font-semibold text-brand-flame">Changes requested</p>
        <p className="text-sm text-brand-flame/60 mt-1">The team has been notified and will get back to you shortly.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-6 py-6">
      <p className="text-sm text-white/50 text-center mb-4">
        How would you like to proceed with these deliverables?
      </p>

      {showNamePrompt ? (
        <div className="max-w-md mx-auto space-y-3">
          {!authorName.trim() && (
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Your name"
              className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-brand-cerulean/50"
              autoFocus
            />
          )}
          {pendingAction === "changes" && (
            <textarea
              value={changesNote}
              onChange={(e) => setChangesNote(e.target.value)}
              placeholder="What changes would you like? (optional — you can also comment directly on the images)"
              rows={3}
              className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-brand-cerulean/50 resize-none"
            />
          )}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => { setShowNamePrompt(false); setPendingAction(null); }}
              className="px-4 py-2 text-sm text-white/40 hover:text-white/60"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (pendingAction) submitReview(pendingAction, changesNote);
              }}
              disabled={status === "submitting" || (!authorName.trim() && pendingAction !== "changes")}
              className="px-6 py-2.5 text-sm font-medium rounded-lg bg-white text-black hover:bg-white/90 transition-colors disabled:opacity-50"
            >
              {status === "submitting" ? "Submitting..." : pendingAction === "approved" ? "Confirm approval" : "Submit request"}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => handleAction("approved")}
            disabled={status === "submitting"}
            className="px-6 py-2.5 min-h-[44px] text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-500 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            Approve
          </button>
          <button
            onClick={() => handleAction("changes")}
            disabled={status === "submitting"}
            className="px-6 py-2.5 min-h-[44px] text-sm font-medium rounded-lg bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
            Request changes
          </button>
        </div>
      )}
    </div>
  );
}
