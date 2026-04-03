"use client";

import { useState, useCallback } from "react";

interface ReviewActionsProps {
  previewId: string;
  projectName: string;
}

type Step = "buttons" | "name" | "changes-note" | "approved" | "changes-submitted";

export function ReviewActions({ previewId, projectName }: ReviewActionsProps) {
  const [step, setStep] = useState<Step>("buttons");
  const [submitting, setSubmitting] = useState(false);
  const [authorName, setAuthorName] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("sarani-comment-name") ?? "";
    return "";
  });
  const [pendingAction, setPendingAction] = useState<"approved" | "changes">("approved");
  const [changesNote, setChangesNote] = useState("");

  const submitReview = useCallback(async (action: "approved" | "changes", note?: string) => {
    setSubmitting(true);
    try {
      if (authorName.trim()) {
        localStorage.setItem("sarani-comment-name", authorName.trim());
      }
      const content = action === "approved"
        ? `Approved — ${projectName}`
        : `Changes requested — ${note || "See comments on individual assets"}`;

      await fetch(`/api/project-comments/${previewId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorName: authorName.trim() || "Client",
          content,
        }),
      });
      setStep(action === "approved" ? "approved" : "changes-submitted");
    } catch {
      setStep("buttons");
    } finally {
      setSubmitting(false);
    }
  }, [previewId, projectName, authorName]);

  // Step 1: Ask for name (if not already known)
  const handleAction = (action: "approved" | "changes") => {
    setPendingAction(action);
    if (!authorName.trim()) {
      setStep("name");
    } else if (action === "changes") {
      setStep("changes-note");
    } else {
      submitReview(action);
    }
  };

  // After name is entered
  const handleNameSubmit = () => {
    if (!authorName.trim()) return;
    if (pendingAction === "changes") {
      setStep("changes-note");
    } else {
      submitReview("approved");
    }
  };

  // ─── Confirmed states ───────────────────────────────────────────────
  if (step === "approved") {
    return (
      <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-6 py-6 text-center">
        <p className="text-lg font-semibold text-green-400">Approved</p>
        <p className="text-sm text-green-400/60 mt-1">Thank you for your feedback. The team has been notified.</p>
      </div>
    );
  }
  if (step === "changes-submitted") {
    return (
      <div className="rounded-xl border border-brand-flame/30 bg-brand-flame/10 px-6 py-6 text-center">
        <p className="text-lg font-semibold text-brand-flame">Changes requested</p>
        <p className="text-sm text-brand-flame/60 mt-1">The team has been notified and will get back to you shortly.</p>
      </div>
    );
  }

  // ─── Step: enter name ───────────────────────────────────────────────
  if (step === "name") {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 px-6 py-6">
        <p className="text-sm text-white/50 text-center mb-4">What is your name?</p>
        <div className="max-w-sm mx-auto space-y-3">
          <input
            type="text"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleNameSubmit(); }}
            placeholder="Your name"
            className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-brand-cerulean/50"
            autoFocus
          />
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => setStep("buttons")} className="px-4 py-2 text-sm text-white/40 hover:text-white/60">
              Back
            </button>
            <button
              onClick={handleNameSubmit}
              disabled={!authorName.trim()}
              className="px-6 py-2.5 text-sm font-medium rounded-lg bg-white text-black hover:bg-white/90 transition-colors disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Step: changes note ─────────────────────────────────────────────
  if (step === "changes-note") {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 px-6 py-6">
        <p className="text-sm text-white/50 text-center mb-4">
          What changes would you like?
        </p>
        <div className="max-w-md mx-auto space-y-3">
          <textarea
            value={changesNote}
            onChange={(e) => setChangesNote(e.target.value)}
            placeholder="Describe the changes needed (optional — you can also comment directly on the images)"
            rows={3}
            className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-brand-cerulean/50 resize-none"
            autoFocus
          />
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => setStep("buttons")} className="px-4 py-2 text-sm text-white/40 hover:text-white/60">
              Back
            </button>
            <button
              onClick={() => submitReview("changes", changesNote)}
              disabled={submitting}
              className="px-6 py-2.5 text-sm font-medium rounded-lg bg-brand-flame text-white hover:bg-brand-flame/80 transition-colors disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit request"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Step: initial buttons ──────────────────────────────────────────
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-6 py-6">
      <p className="text-sm text-white/50 text-center mb-4">
        How would you like to proceed with these deliverables?
      </p>
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => handleAction("approved")}
          disabled={submitting}
          className="px-6 py-2.5 min-h-[44px] text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-500 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          Approve
        </button>
        <button
          onClick={() => handleAction("changes")}
          disabled={submitting}
          className="px-6 py-2.5 min-h-[44px] text-sm font-medium rounded-lg bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
          Request changes
        </button>
      </div>
    </div>
  );
}
