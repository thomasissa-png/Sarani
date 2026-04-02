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
  draftReply?: string;
  clickupProjectHint?: string | null;
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
  onCreateBrief?: () => void;
  onOpenProject?: () => void;
  onDraftReply?: () => void;
  onPreparePitch?: () => void;
  showToast: (message: string, type: "success" | "error") => void;
  // Fix 6: Managed view — read-only with action badge + restore
  isManagedView?: boolean;
  actionBadge?: string;
  processedAt?: string | null;
  onRestore?: () => void;
}

// ─── Category Config ────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  // ─── New 4 categories ──────────────────────────────────────────────
  enquiry: {
    label: "Enquiry",
    color: "text-brand-flame",
    bgColor: "bg-brand-flame/10",
  },
  new_project: {
    label: "New Project",
    color: "text-brand-cerulean",
    bgColor: "bg-brand-cerulean/10",
  },
  project_feedback: {
    label: "Project Feedback",
    color: "text-success",
    bgColor: "bg-success/10",
  },
  other: {
    label: "Other",
    color: "text-neutral-400",
    bgColor: "bg-neutral-100",
  },
  // ─── Legacy categories (backward compat for existing DB items) ────
  client_brief: {
    label: "New Project",
    color: "text-brand-cerulean",
    bgColor: "bg-brand-cerulean/10",
  },
  client_followup: {
    label: "Project Feedback",
    color: "text-success",
    bgColor: "bg-success/10",
  },
  new_client: {
    label: "Enquiry",
    color: "text-brand-flame",
    bgColor: "bg-brand-flame/10",
  },
  new_client_prospect: {
    label: "Enquiry",
    color: "text-brand-flame",
    bgColor: "bg-brand-flame/10",
  },
  noise: {
    label: "Other",
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

// ─── Next Step Hints ─────────────────────────────────────────────────────────

function getNextStepHint(category: string, routeTo: string): string {
  if (routeTo === "PROTO-EMAIL-INTAKE" || category === "new_project" || category === "client_brief") {
    return "Next: Review and create project brief";
  }
  if (routeTo === "PROTO-CLIENT-RETURN" || category === "project_feedback" || category === "client_followup") {
    return "Next: Check project status and reply to client";
  }
  if (routeTo === "PROTO-ENQUIRY" || category === "enquiry" || category === "new_client_prospect" || category === "new_client") {
    return "Next: Review draft reply and send to prospect";
  }
  // Legacy protocols
  if (routeTo === "PROTO-PITCH") {
    return "Next: Prepare pitch deck and proposal";
  }
  if (routeTo === "PROTO-CLIENT-REPLY") {
    return "Next: Review AI draft, edit if needed, then send";
  }
  return "Next: Read and decide on action";
}

// ─── Component ──────────────────────────────────────────────────────────────

export function EmailCard({
  itemId,
  sourceId,
  sourceType,
  payload,
  createdAt,
  isActioning,
  onApprove,
  onDismiss,
  onMarkNoise,
  onCreateBrief,
  onOpenProject,
  onDraftReply,
  onPreparePitch,
  isManagedView,
  actionBadge,
  processedAt,
  onRestore,
}: EmailCardProps) {
  const { from, subject, classification, bodyPreview } = payload;
  const senderName = extractSenderName(from);
  const catConfig = getCategoryConfig(classification.category);
  const { text: timeText, isUrgent } = formatRelativeTime(createdAt);
  const { routeTo, suggestedAction, confidence } = classification;

  const isLark = sourceType === "lark";

  // Determine which action buttons to show based on routeTo + category
  const isNewProject =
    routeTo === "PROTO-EMAIL-INTAKE" || classification.category === "new_project" || classification.category === "client_brief";
  const isProjectFeedback =
    routeTo === "PROTO-CLIENT-RETURN" || classification.category === "project_feedback" || classification.category === "client_followup";
  const isEnquiry =
    routeTo === "PROTO-ENQUIRY" || classification.category === "enquiry" || classification.category === "new_client_prospect" || classification.category === "new_client";
  // Legacy protocols
  const isNewProspect = routeTo === "PROTO-PITCH" && !isEnquiry;
  const isDraftReply = routeTo === "PROTO-CLIENT-REPLY" && !isEnquiry;

  const nextStepHint = getNextStepHint(classification.category, routeTo);

  const handleCreateBrief = () => {
    if (onCreateBrief) {
      onCreateBrief();
    } else if (sourceId) {
      window.location.href = `/admin/quick-brief?fromInbox=${encodeURIComponent(sourceId)}`;
    } else {
      onApprove();
    }
  };

  // Source icon: email or Lark
  const sourceIcon = isLark ? (
    <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
      <svg
        className="w-4.5 h-4.5 text-indigo-600"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    </div>
  ) : (
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
  );

  return (
    <div className="bg-white rounded-xl border border-neutral-300 p-5 hover:shadow-sm transition-shadow">
      {/* Header row: sender + time + confidence */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {sourceIcon}

          {/* Sender info */}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-brand-black truncate">
                {senderName}
              </p>
              {isLark && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-600 shrink-0">
                  Lark
                </span>
              )}
            </div>
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

      {/* Classification badge + managed badge + subject */}
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
        {isManagedView && actionBadge && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500">
            {actionBadge}
          </span>
        )}
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

      {/* Body preview — strip quoted thread below (De : / From: markers) */}
      {bodyPreview && (() => {
        // Cut at the first thread marker to show only the client's actual message
        const threadMarkers = ["\nDe :", "\nFrom:", "\nEnvoyé :", "\n-----Original", "\nOn ", "\nLe "];
        let cleanBody = bodyPreview;
        for (const marker of threadMarkers) {
          const idx = cleanBody.indexOf(marker);
          if (idx > 20) { // Keep at least 20 chars — don't cut if marker is at the very start
            cleanBody = cleanBody.slice(0, idx).trim();
            break;
          }
        }
        return (
          <p className="text-sm text-neutral-600 leading-relaxed line-clamp-4 mb-3">
            {cleanBody}
          </p>
        );
      })()}

      {/* Suggested action — hidden in managed view */}
      {!isManagedView && suggestedAction && (
        <div className="bg-neutral-50 rounded-lg px-3 py-2 mb-4">
          <p className="text-xs text-neutral-500 italic leading-relaxed">
            <span className="font-semibold not-italic text-neutral-600">Arya suggests:</span>{" "}
            {suggestedAction}
          </p>
        </div>
      )}

      {/* Managed view: read-only with date + restore */}
      {isManagedView && (
        <div className="flex items-center gap-3 pt-3 border-t border-neutral-200">
          <span className="text-xs text-neutral-400">
            {processedAt ? formatManagedDate(processedAt) : "Date unknown"}
          </span>
          {onRestore && (
            <button
              onClick={onRestore}
              disabled={isActioning}
              className="px-3 py-2 min-h-[44px] rounded-lg text-xs font-medium bg-neutral-200 text-neutral-600 hover:bg-neutral-300 transition-colors disabled:opacity-50"
              aria-label="Restore this item to inbox"
            >
              {isActioning ? "Restoring..." : "Restore"}
            </button>
          )}
        </div>
      )}

      {/* Actions — hidden in managed view */}
      {!isManagedView && (
      <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-neutral-200">
        {/* === Enquiry (PROTO-ENQUIRY): Draft Reply / Archive === */}
        {isEnquiry && (
          <button
            onClick={onDraftReply ?? onApprove}
            disabled={isActioning}
            className="px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-semibold bg-success text-white hover:bg-green-700 transition-colors disabled:opacity-50"
            aria-label="Draft a reply to this enquiry"
          >
            {isActioning ? "Creating draft..." : "Draft Reply"}
          </button>
        )}

        {/* === New Project (PROTO-EMAIL-INTAKE): Create Brief / Draft Reply / Archive === */}
        {isNewProject && (
          <>
            <button
              onClick={handleCreateBrief}
              disabled={isActioning}
              className="px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-semibold bg-brand-cerulean text-white hover:bg-brand-cerulean-dark transition-colors disabled:opacity-50"
              aria-label="Create project brief from this email"
            >
              {isActioning ? "Redirecting..." : "Create Brief \u2192"}
            </button>
            <button
              onClick={onDraftReply ?? onApprove}
              disabled={isActioning}
              className="px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-medium bg-success text-white hover:bg-green-700 transition-colors disabled:opacity-50"
              aria-label="Draft a reply to this client"
            >
              Draft Reply
            </button>
          </>
        )}

        {/* === Project Feedback (PROTO-CLIENT-RETURN): Create Feedback / Draft Reply / Archive === */}
        {isProjectFeedback && (
          <>
            <button
              onClick={onOpenProject ?? onApprove}
              disabled={isActioning}
              className="px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-semibold bg-brand-cerulean text-white hover:bg-brand-cerulean-dark transition-colors disabled:opacity-50"
              aria-label="Review and post feedback comment to ClickUp project"
            >
              {isActioning ? "Processing..." : "Create Feedback"}
            </button>
            <button
              onClick={onDraftReply ?? onApprove}
              disabled={isActioning}
              className="px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-medium bg-success text-white hover:bg-green-700 transition-colors disabled:opacity-50"
              aria-label="Draft a reply to this client"
            >
              Draft Reply
            </button>
          </>
        )}

        {/* === Legacy: New Prospect (PROTO-PITCH) === */}
        {isNewProspect && (
          <button
            onClick={onPreparePitch ?? onApprove}
            disabled={isActioning}
            className="px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-semibold bg-brand-flame text-white hover:bg-brand-flame/90 transition-colors disabled:opacity-50"
            aria-label="Prepare pitch for this prospect"
          >
            {isActioning ? "Processing..." : "Prepare Pitch"}
          </button>
        )}

        {/* === Legacy: Draft Reply (PROTO-CLIENT-REPLY) === */}
        {isDraftReply && (
          <button
            onClick={onDraftReply ?? onApprove}
            disabled={isActioning}
            className="px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-semibold bg-success text-white hover:bg-green-700 transition-colors disabled:opacity-50"
            aria-label="Send the AI-drafted reply to Outlook"
          >
            {isActioning ? "Creating draft..." : "Draft Reply"}
          </button>
        )}

        {/* === Default: no specific protocol matched (includes "other" / archive) === */}
        {!isEnquiry && !isNewProject && !isProjectFeedback && !isNewProspect && !isDraftReply && (
          <button
            onClick={onApprove}
            disabled={isActioning}
            className="px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-medium bg-neutral-700 text-white hover:bg-neutral-800 transition-colors disabled:opacity-50"
            aria-label={`Mark email as read: ${subject}`}
          >
            {isActioning ? "Processing..." : "Mark as Read"}
          </button>
        )}

        {/* Common actions: Archive + Not relevant */}
        <button
          onClick={onDismiss}
          disabled={isActioning}
          className="px-3 py-2.5 min-h-[44px] rounded-lg text-sm font-medium bg-neutral-200 text-neutral-600 hover:bg-neutral-300 transition-colors disabled:opacity-50"
          aria-label={`Archive email: ${subject}`}
        >
          Archive
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
      )}

      {/* Next step hint — hidden in managed view */}
      {!isManagedView && (
        <p className="text-xs text-neutral-500 mt-2 pl-1">
          {nextStepHint}
        </p>
      )}
    </div>
  );
}

// ─── Managed date formatter ────────────────────────────────────────────────

function formatManagedDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Safe parser ────────────────────────────────────────────────────────────

/**
 * Safely parse the summary JSON of an email_classified or lark_message inbox item.
 * Returns null if the summary is missing or malformed.
 * Handles both email format (from/subject/bodyPreview/classification) and
 * Lark format (senderId/content/classification).
 */
export function parseEmailPayload(summary: string | null): EmailPayload | null {
  if (!summary) return null;
  try {
    const data = JSON.parse(summary) as Record<string, unknown>;

    // Standard email format
    if (
      typeof data.from === "string" &&
      typeof data.subject === "string" &&
      typeof data.bodyPreview === "string" &&
      data.classification &&
      typeof data.classification === "object"
    ) {
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
          draftReply: (cls.draftReply as string) ?? "",
          clickupProjectHint: (cls.clickupProjectHint as string) ?? null,
          language: (cls.language as string) ?? "en",
          routeTo: (cls.routeTo as string) ?? "",
        },
      };
    }

    // Lark message format: adapt to EmailPayload shape
    if (
      typeof data.content === "string" &&
      data.classification &&
      typeof data.classification === "object"
    ) {
      const cls = data.classification as Record<string, unknown>;
      const senderId = (data.senderId as string) ?? "Unknown sender";
      const content = data.content as string;
      return {
        from: senderId,
        subject: content.slice(0, 120) || "Lark message",
        bodyPreview: content,
        classification: {
          category: (cls.category as string) ?? "unknown",
          confidence: typeof cls.confidence === "number" ? cls.confidence : 0,
          reasoning: (cls.reasoning as string) ?? "",
          suggestedAction: (cls.suggestedAction as string) ?? (cls.suggested_action as string) ?? "",
          draftReply: (cls.draftReply as string) ?? "",
          clickupProjectHint: (cls.clickupProjectHint as string) ?? null,
          language: (cls.language as string) ?? "en",
          routeTo: (cls.routeTo as string) ?? "",
        },
      };
    }

    return null;
  } catch {
    return null;
  }
}
