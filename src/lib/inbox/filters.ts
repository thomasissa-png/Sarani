// ─── Inbox filter logic ────────────────────────────────────────────────────
// Extracted from page.tsx for testability.
// Single source of truth for inbox tab filtering.

// ─── Types ─────────────────────────────────────────────────────────────────

export type InboxItemType =
  | "email_classified"
  | "ai_team_complete"
  | "qa_gates_pass"
  | "followup_alert"
  | "noise"
  | "auto_brief_ready"
  | "auto_quote_ready"
  | "lark_message"
  | "review_human"
  | "review_ai_ready"
  | "review_escalated"
  | "daily_digest"
  | "deadline_alert";

export type InboxItemStatus = "pending" | "pending_review" | "in_progress" | "done" | "dismissed";

export type FilterTab =
  | "all"
  | "new_project"
  | "project_feedback"
  | "enquiry"
  | "project_reviews"
  | "other"
  | "done";

export interface InboxItemFilterable {
  id: string;
  type: InboxItemType;
  status: InboxItemStatus;
  protocol: string | null;
  processedAt: string | null;
  createdAt: string;
  summary: string | null;
  sourceId: string | null;
  sourceType: string | null;
  title: string | null;
  priority: string | null;
  pmId: string | null;
  projectId: string | null;
  updatedAt: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────

export const FILTER_PROTOCOL_MAP: Record<string, string> = {
  new_project: "PROTO-EMAIL-INTAKE",
  project_feedback: "PROTO-CLIENT-RETURN",
  enquiry: "PROTO-ENQUIRY",
  other: "archive",
};

/** Legacy protocol mappings so old items show in correct tabs */
export const LEGACY_PROTOCOL_TO_FILTER: Record<string, string> = {
  "PROTO-PITCH": "PROTO-ENQUIRY",
  "PROTO-CLIENT-REPLY": "PROTO-ENQUIRY",
  "PROTO-LARK-TRIAGE": "PROTO-ENQUIRY",
};

// ─── Filter function ───────────────────────────────────────────────────────

export function filterItems(items: InboxItemFilterable[], filter: FilterTab): InboxItemFilterable[] {
  if (filter === "all") {
    return items.filter((i) =>
      i.status !== "done" &&
      i.status !== "dismissed" &&
      // Asset Review items are hidden (feature removed from sidebar/tabs)
      !["review_human", "review_ai_ready", "review_escalated"].includes(i.type)
    );
  }
  if (filter === "done") {
    return items.filter((i) => i.status === "done" || i.status === "dismissed");
  }
  if (filter === "project_reviews") {
    return items.filter(
      (i) =>
        ["review_human", "review_ai_ready", "review_escalated"].includes(i.type) &&
        i.status !== "done" &&
        i.status !== "dismissed"
    );
  }
  const targetProtocol = FILTER_PROTOCOL_MAP[filter];
  if (!targetProtocol) return items;
  return items.filter((i) => {
    if (i.status === "done" || i.status === "dismissed") return false;
    // "Others" tab: items with null protocol that are not noise/followup_alert/review types
    if (filter === "other") {
      if (i.protocol === null || i.protocol === "archive") {
        return !["noise", "followup_alert", "review_human", "review_ai_ready", "review_escalated"].includes(i.type);
      }
      return false;
    }
    // Direct match
    if (i.protocol === targetProtocol) return true;
    // Legacy protocol match
    const mapped = i.protocol ? LEGACY_PROTOCOL_TO_FILTER[i.protocol] : null;
    return mapped === targetProtocol;
  });
}
