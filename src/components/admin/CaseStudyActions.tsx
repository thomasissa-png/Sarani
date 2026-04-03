"use client";

import { useState, useCallback } from "react";

// ─── RegenerateButton ──────────────────────────────────────────────────────

interface RegenerateButtonProps {
  outputId: string;
  outputType: "case_study" | "linkedin_post" | "nurturing_email";
  onRegenerated: () => void;
}

/**
 * Inline regeneration form: textarea for instructions + generate button.
 * Calls POST /api/admin/case-studies/outputs/:id/regenerate
 */
export function RegenerateButton({
  outputId,
  outputType,
  onRegenerated,
}: RegenerateButtonProps) {
  const [open, setOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const typeLabel =
    outputType === "case_study"
      ? "case study"
      : outputType === "linkedin_post"
        ? "LinkedIn post"
        : "nurturing email";

  const handleGenerate = useCallback(async () => {
    if (!instruction.trim()) {
      setError("Please provide instructions for the regeneration.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/admin/case-studies/outputs/${outputId}/regenerate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ instruction: instruction.trim() }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.error || `Regeneration failed (${res.status})`
        );
      }

      setInstruction("");
      setOpen(false);
      onRegenerated();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Regeneration failed"
      );
    } finally {
      setLoading(false);
    }
  }, [outputId, instruction, onRegenerated]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 hover:border-neutral-400"
      >
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.992 0 3.181-3.183a8.25 8.25 0 0 1 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182"
          />
        </svg>
        Regenerate
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
      <label
        htmlFor={`regen-${outputId}`}
        className="mb-1.5 block text-xs font-medium text-neutral-600"
      >
        What should change in this {typeLabel}?
      </label>
      <textarea
        id={`regen-${outputId}`}
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        placeholder="e.g. Make the tone more conversational, emphasize the 60% cost savings..."
        maxLength={500}
        rows={3}
        disabled={loading}
        className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-cerulean focus:outline-none focus:ring-1 focus:ring-brand-cerulean disabled:opacity-50"
      />
      <div className="mt-1.5 flex items-center justify-between">
        <span className="text-xs text-neutral-400">
          {instruction.length} / 500
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setInstruction("");
              setError(null);
            }}
            disabled={loading}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-neutral-500 transition-colors hover:text-neutral-700 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading || !instruction.trim()}
            className="inline-flex items-center gap-1.5 rounded-md bg-brand-cerulean px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-cerulean/90 disabled:opacity-50"
          >
            {loading ? (
              <>
                <svg
                  className="h-3.5 w-3.5 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Generating...
              </>
            ) : (
              "Generate"
            )}
          </button>
        </div>
      </div>
      {error && (
        <p className="mt-2 text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}

// ─── LinkedInCharCounter ───────────────────────────────────────────────────

interface LinkedInCharCounterProps {
  text: string;
}

const LINKEDIN_CHAR_LIMIT = 1300;
const LINKEDIN_WARN_THRESHOLD = 1000;

/**
 * Displays character count for LinkedIn posts with color coding:
 * - Green: under 1000
 * - Yellow: 1000-1300
 * - Red: over 1300
 */
export function LinkedInCharCounter({ text }: LinkedInCharCounterProps) {
  const count = text.length;

  const colorClass =
    count > LINKEDIN_CHAR_LIMIT
      ? "text-red-600"
      : count >= LINKEDIN_WARN_THRESHOLD
        ? "text-yellow-600"
        : "text-green-600";

  const bgClass =
    count > LINKEDIN_CHAR_LIMIT
      ? "bg-red-50"
      : count >= LINKEDIN_WARN_THRESHOLD
        ? "bg-yellow-50"
        : "bg-green-50";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${colorClass} ${bgClass}`}
    >
      <svg
        className="h-3 w-3"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
        />
      </svg>
      {count.toLocaleString("en-US")} / {LINKEDIN_CHAR_LIMIT.toLocaleString("en-US")} characters
    </span>
  );
}

// ─── OutputStatusBadge ─────────────────────────────────────────────────────

interface OutputStatusBadgeProps {
  outputId: string;
  outputType: "linkedin_post" | "nurturing_email";
  initialStatus?: string;
  onStatusChange?: () => void;
}

const STATUS_STORAGE_KEY = "sarani_output_status";

function getStoredStatus(outputId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(STATUS_STORAGE_KEY);
    if (!stored) return null;
    const map: Record<string, string> = JSON.parse(stored);
    return map[outputId] ?? null;
  } catch {
    return null;
  }
}

function setStoredStatus(outputId: string, status: string): void {
  if (typeof window === "undefined") return;
  try {
    const stored = localStorage.getItem(STATUS_STORAGE_KEY);
    const map: Record<string, string> = stored ? JSON.parse(stored) : {};
    map[outputId] = status;
    localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // localStorage unavailable, fail silently
  }
}

/**
 * Status tracking badge for LinkedIn posts and nurturing emails.
 * LinkedIn: "Mark as Posted"
 * Email: "Mark as Used"
 *
 * Status is persisted in localStorage (no DB column for this P2 feature).
 */
export function OutputStatusBadge({
  outputId,
  outputType,
  initialStatus,
  onStatusChange,
}: OutputStatusBadgeProps) {
  const storedStatus = getStoredStatus(outputId);
  const resolvedInitial = initialStatus ?? storedStatus ?? "pending";

  const [status, setStatus] = useState<string>(resolvedInitial);
  const [loading, setLoading] = useState(false);

  const isLinkedIn = outputType === "linkedin_post";
  const actionLabel = isLinkedIn ? "Mark as Posted" : "Mark as Used";
  const doneLabel = isLinkedIn ? "Posted" : "Used";
  const targetStatus = isLinkedIn ? "posted" : "used";

  const isDone = status === targetStatus;

  const handleMarkDone = useCallback(async () => {
    setLoading(true);
    try {
      // Persist to localStorage
      setStoredStatus(outputId, targetStatus);
      setStatus(targetStatus);
      onStatusChange?.();
    } finally {
      setLoading(false);
    }
  }, [outputId, targetStatus, onStatusChange]);

  const handleUndo = useCallback(() => {
    setStoredStatus(outputId, "pending");
    setStatus("pending");
    onStatusChange?.();
  }, [outputId, onStatusChange]);

  if (isDone) {
    return (
      <div className="inline-flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
          {doneLabel}
        </span>
        <button
          type="button"
          onClick={handleUndo}
          className="text-xs text-neutral-400 underline transition-colors hover:text-neutral-600"
        >
          Undo
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleMarkDone}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-50 hover:border-neutral-400 disabled:opacity-50"
    >
      {isLinkedIn ? (
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
          />
        </svg>
      ) : (
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
          />
        </svg>
      )}
      {actionLabel}
    </button>
  );
}
