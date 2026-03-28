"use client";

import { useState } from "react";

type FeedbackState = "idle" | "submitting" | "approved" | "feedback-form" | "feedback-sent";

export default function StoryboardFeedbackBar({
  storyboardId,
}: {
  storyboardId: string;
}) {
  const [state, setState] = useState<FeedbackState>("idle");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleApprove() {
    setState("submitting");
    setError(null);
    try {
      const res = await fetch(`/api/admin/storyboards/${storyboardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });
      if (!res.ok) {
        throw new Error(`Failed to approve (${res.status})`);
      }
      setState("approved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setState("idle");
    }
  }

  function handleRequestChanges() {
    setState("feedback-form");
  }

  function handleSubmitFeedback() {
    if (!feedback.trim()) return;
    // Log feedback for now — backend integration to follow
    console.log(`[StoryboardFeedback] id=${storyboardId} feedback="${feedback}"`);
    setState("feedback-sent");
  }

  if (state === "approved") {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-black/95 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 py-5 text-center">
          <p className="text-emerald-400 font-semibold">
            Storyboard approved — thank you!
          </p>
        </div>
      </div>
    );
  }

  if (state === "feedback-sent") {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-black/95 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 py-5 text-center">
          <p className="text-brand-flame font-semibold">
            Feedback sent — your account manager will follow up.
          </p>
        </div>
      </div>
    );
  }

  if (state === "feedback-form") {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-black/95 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 py-5 space-y-3">
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value.slice(0, 1000))}
            placeholder="Describe the changes you'd like..."
            maxLength={1000}
            rows={3}
            className="w-full rounded-lg bg-white/5 border border-white/10 text-white text-sm px-4 py-3 placeholder:text-white/30 focus:outline-none focus:border-brand-flame/50 resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/30">{feedback.length}/1000</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setState("idle")}
                className="text-sm text-white/50 hover:text-white/80 transition-colors px-4 py-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitFeedback}
                disabled={!feedback.trim()}
                className="text-sm font-semibold px-6 py-2 rounded-full border border-brand-flame text-brand-flame hover:bg-brand-flame/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Send feedback
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-black/95 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
        <p className="text-sm text-white/50 hidden sm:block">
          Review this storyboard
        </p>
        <div className="flex items-center gap-3 w-full sm:w-auto justify-center sm:justify-end">
          {error && (
            <p className="text-xs text-red-400 mr-2">{error}</p>
          )}
          <button
            type="button"
            onClick={handleRequestChanges}
            className="px-6 py-2.5 text-sm font-semibold rounded-full border border-brand-flame text-brand-flame hover:bg-brand-flame/10 transition-colors min-h-[44px]"
          >
            Request Changes
          </button>
          <button
            type="button"
            onClick={handleApprove}
            disabled={state === "submitting"}
            className="px-6 py-2.5 text-sm font-semibold rounded-full bg-emerald-600 text-white hover:bg-emerald-500 transition-colors disabled:opacity-60 min-h-[44px]"
          >
            {state === "submitting" ? "Approving..." : "Approve"}
          </button>
        </div>
      </div>
    </div>
  );
}
