"use client";

// ─── Email Card ────────────────────────────────────────────────────────────
// Rich display for classified emails in the inbox.
// Replaces raw JSON summary with a proper email-like layout.

import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

interface EmailClassification {
  category: string;
  confidence: number;
  reasoning: string;
  suggestedAction: string;
  language: string;
  routeTo: string;
}

export interface EmailPayload {
  from: string;
  subject: string;
  classification: EmailClassification;
  bodyPreview: string;
}

interface EmailCardProps {
  itemId: string;
  sourceId: string | null;
  sourceType?: string | null;
  payload: EmailPayload;
  createdAt: string;
  isActioning: boolean;
  onApprove: () => void;
  onDismiss: () => void;
  onMarkNoise: () => void;
  showToast: (message: string, type: "success" | "error") => void;
}

// ─── Category Config ────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  client_brief: {
    label: "Client Brief",
    color: "text-brand-cerulean",
    bgColor: "bg-brand-cerulean/10",
  },
  client_followup: {
    label: "Follow-up",
    color: "text-success",
    bgColor: "bg-success/10",
  },
  new_client: {
    label: "New Client",
    color: "text-brand-flame",
    bgColor: "bg-brand-flame/10",
  },
  new_client_prospect: {
    label: "New Prospect",
    color: "text-brand-flame",
    bgColor: "bg-brand-flame/10",
  },
  internal: {
    label: "Internal",
    color: "text-neutral-600",
    bgColor: "bg-neutral-100",
  },
  vendor: {
    label: "Vendor",
    color: "text-neutral-600",
    bgColor: "bg-neutral-100",
  },
  newsletter: {
    label: "Newsletter",
    color: "text-neutral-400",
    bgColor: "bg-neutral-100",
  },
  noise: {
    label: "Noise",
    color: "text-neutral-400",
    bgColor: "bg-neutral-100",
  },
};

function getCategoryConfig(category: string) {
  return (
    CATEGORY_CONFIG[category] ?? {
      label: category.replace(/_/g, " "),
      color: "text-neutral-600",
      bgColor: "bg-neutral-100",
    }
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function extractSenderName(email: string): string {
  const localPart = email.split("@")[0] ?? email;
  // Replace dots and underscores with spaces, then title-case
  return localPart
    .replace(/[._-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatRelativeTime(dateStr: string): { text: string; isUrgent: boolean } {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / 3_600_000;
  const diffDays = diffMs / 86_400_000;

  const isUrgent = diffHours > 24;

  if (diffHours < 1) {
    const mins = Math.floor(diffMs / 60_000);
    return { text: mins < 1 ? "Just now" : `${mins}m ago`, isUrgent };
  }
  if (diffHours < 24) {
    return { text: `${Math.floor(diffHours)}h ago`, isUrgent };
  }
  if (diffDays < 7) {
    return { text: `${Math.floor(diffDays)}d ago`, isUrgent };
  }
  return {
    text: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    isUrgent,
  };
}

// ─── Confidence Dot ─────────────────────────────────────────────────────────

function ConfidenceDot({ confidence }: { confidence: number }) {
  const color =
    confidence > 0.8
      ? "bg-success"
      : confidence >= 0.6
        ? "bg-brand-lemon"
        : "bg-brand-flame";

  const label =
    confidence > 0.8
      ? "High confidence"
      : confidence >= 0.6
        ? "Medium confidence"
        : "Low confidence";

  return (
    <span
      className={cn("inline-block w-2 h-2 rounded-full shrink-0", color)}
      title={`${label} (${Math.round(confidence * 100)}%)`}
      aria-label={`${label}: ${Math.round(confidence * 100)}%`}
    />
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export function EmailCard({
  itemId,
  sourceId,
  payload,
  createdAt,
  isActioning,
  onApprove,
  onDismiss,
  onMarkNoise,
}: EmailCardProps) {
  const { from, subject, classification, bodyPreview } = payload;
  const senderName = extractSenderName(from);
  const catConfig = getCategoryConfig(classification.category);
  const { text: timeText, isUrgent } = formatRelativeTime(createdAt);
  const { routeTo, suggestedAction, confidence } = classification;

  // Determine which action buttons to show based on routeTo
  const showCreateBrief =
    routeTo === "PROTO-EMAIL-INTAKE" || classification.category === "client_brief";
  const showViewProject = routeTo === "PROTO-CLIENT-RETURN";
  const showDraftReply = routeTo === "PROTO-CLIENT-REPLY";

  const handleCreateBrief = () => {
    if (sourceId) {
      window.location.href = `/admin/quick-brief?fromInbox=${encodeURIComponent(sourceId)}`;
    } else {
      onApprove();
    }
  };

  return (
    <div className="bg-white rounded-xl border border-neutral-300 p-5 hover:shadow-sm transition-shadow">
      {/* Header row: sender + time + confidence */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Email icon */}
          <div className="w-9 h-9 rounded-full bg-brand-cerulean/10 flex items-center justify-center shrink-0">
            <svg
              className="w-4.5 h-4.5 text-brand-cerulean"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </div>

          {/* Sender info */}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-brand-black truncate">
              {senderName}
            </p>
            <p className="text-xs text-neutral-400 truncate">{from}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <ConfidenceDot confidence={confidence} />
          <span
            className={cn(
              "text-xs whitespace-nowrap",
              isUrgent ? "text-brand-flame font-semibold" : "text-neutral-400"
            )}
          >
            {isUrgent ? `Urgent \u2014 ${timeText}` : timeText}
          </span>
        </div>
      </div>

      {/* Classification badge + subject */}
      <div className="flex items-center gap-2 mb-2">
        <span
          className={cn(
            "text-xs font-semibold px-2 py-0.5 rounded-full shrink-0",
            catConfig.bgColor,
            catConfig.color
          )}
        >
          {catConfig.label}
        </span>
        {classification.language && classification.language !== "en" && (
          <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-500 uppercase">
            {classification.language}
          </span>
        )}
      </div>

      {/* Subject */}
      <h3 className="text-sm font-bold text-brand-black mb-2 leading-snug">
        {subject}
      </h3>

      {/* Body preview */}
      {bodyPreview && (
        <p className="text-sm text-neutral-600 leading-relaxed line-clamp-4 mb-3">
          {bodyPreview}
        </p>
      )}

      {/* Suggested action */}
      {suggestedAction && (
        <div className="bg-neutral-50 rounded-lg px-3 py-2 mb-4">
          <p className="text-xs text-neutral-500 italic leading-relaxed">
            <span className="font-semibold not-italic text-neutral-600">Arya suggests:</span>{" "}
            {suggestedAction}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-neutral-200">
        {/* Contextual primary actions */}
        {showCreateBrief && (
          <button
            onClick={handleCreateBrief}
            disabled={isActioning}
            className="px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-medium bg-brand-cerulean text-white hover:bg-brand-cerulean-dark transition-colors disabled:opacity-50"
            aria-label="Create brief from this email"
          >
            Create Brief
          </button>
        )}

        {showViewProject && (
          <>
            <button
              onClick={onApprove}
              disabled={isActioning}
              className="px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-medium bg-brand-cerulean text-white hover:bg-brand-cerulean-dark transition-colors disabled:opacity-50"
              aria-label="View related project"
            >
              View Project
            </button>
            <button
              onClick={onApprove}
              disabled={isActioning}
              className="px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-medium bg-success text-white hover:bg-green-700 transition-colors disabled:opacity-50"
              aria-label="Reply to this email"
            >
              Reply
            </button>
          </>
        )}

        {showDraftReply && (
          <button
            onClick={onApprove}
            disabled={isActioning}
            className="px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-medium bg-success text-white hover:bg-green-700 transition-colors disabled:opacity-50"
            aria-label="Draft a reply to this email"
          >
            Draft Reply
          </button>
        )}

        {/* If no contextual action matched, show a generic Approve */}
        {!showCreateBrief && !showViewProject && !showDraftReply && (
          <button
            onClick={onApprove}
            disabled={isActioning}
            className="px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-medium bg-success text-white hover:bg-green-700 transition-colors disabled:opacity-50"
            aria-label={`Approve email: ${subject}`}
          >
            Approve
          </button>
        )}

        {/* Common actions — always visible */}
        <button
          onClick={onDismiss}
          disabled={isActioning}
          className="px-3 py-2.5 min-h-[44px] rounded-lg text-sm font-medium bg-neutral-200 text-neutral-600 hover:bg-neutral-300 transition-colors disabled:opacity-50"
          aria-label={`Dismiss email: ${subject}`}
        >
          Dismiss
        </button>
        <button
          onClick={onMarkNoise}
          disabled={isActioning}
          className="px-3 py-2.5 min-h-[44px] rounded-lg text-sm font-medium text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors disabled:opacity-50"
          aria-label={`Mark as not relevant: ${subject}`}
        >
          Not relevant
        </button>
      </div>
    </div>
  );
}

// ─── Safe parser ────────────────────────────────────────────────────────────

/**
 * Safely parse the summary JSON of an email_classified inbox item.
 * Returns null if the summary is missing or malformed.
 */
export function parseEmailPayload(summary: string | null): EmailPayload | null {
  if (!summary) return null;
  try {
    const data = JSON.parse(summary) as Record<string, unknown>;
    // Validate required fields exist
    if (
      typeof data.from !== "string" ||
      typeof data.subject !== "string" ||
      typeof data.bodyPreview !== "string" ||
      !data.classification ||
      typeof data.classification !== "object"
    ) {
      return null;
    }
    const cls = data.classification as Record<string, unknown>;
    return {
      from: data.from as string,
      subject: data.subject as string,
      bodyPreview: data.bodyPreview as string,
      classification: {
        category: (cls.category as string) ?? "unknown",
        confidence: typeof cls.confidence === "number" ? cls.confidence : 0,
        reasoning: (cls.reasoning as string) ?? "",
        suggestedAction: (cls.suggestedAction as string) ?? "",
        language: (cls.language as string) ?? "en",
        routeTo: (cls.routeTo as string) ?? "",
      },
    };
  } catch {
    return null;
  }
}
