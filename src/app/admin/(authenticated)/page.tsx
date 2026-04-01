"use client";

// SSR: false — Client Component for interactive inbox with filters and actions.
// This replaces the old SSR dashboard. The inbox is the PM's primary workspace.

import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { AutoBriefCard, type AutoBriefPayload } from "@/components/inbox/AutoBriefCard";
import { AutoQuoteCard, type AutoQuotePayload } from "@/components/inbox/AutoQuoteCard";
import { EmailCard, parseEmailPayload, type EmailPayload } from "@/components/inbox/EmailCard";
import { CreateBriefModal } from "@/components/inbox/CreateBriefModal";
import { DraftReplyModal } from "@/components/inbox/DraftReplyModal";
import { ProjectActionModal } from "@/components/inbox/ProjectActionModal";
import { CLIENT_MAPPINGS } from "@/lib/integrations/config";

// ─── Types ──────────────────────────────────────────────────────────────────

type InboxItemType =
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
  | "review_escalated";

type InboxItemStatus = "pending" | "pending_review" | "in_progress" | "done" | "dismissed";

interface InboxItem {
  id: string;
  type: InboxItemType;
  status: InboxItemStatus;
  title: string | null;
  summary: string | null;
  sourceId: string | null;
  sourceType: string | null;
  protocol: string | null;
  projectId: string | null;
  priority: string | null;
  pmId: string | null;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
  arya_payload?: Record<string, unknown> | null;
}

interface ToastState {
  message: string;
  type: "success" | "error";
}

// ─── Constants ──────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  InboxItemType,
  { label: string; color: string; bgColor: string }
> = {
  email_classified: {
    label: "Email",
    color: "text-brand-cerulean",
    bgColor: "bg-brand-cerulean/10",
  },
  ai_team_complete: {
    label: "AI Deliverable",
    color: "text-brand-flame",
    bgColor: "bg-brand-flame/10",
  },
  qa_gates_pass: {
    label: "QA Pass",
    color: "text-success",
    bgColor: "bg-success/10",
  },
  followup_alert: {
    label: "Follow-up",
    color: "text-brand-flame",
    bgColor: "bg-brand-flame/20",
  },
  noise: {
    label: "Noise",
    color: "text-neutral-400",
    bgColor: "bg-neutral-100",
  },
  auto_brief_ready: {
    label: "Auto Brief",
    color: "text-brand-cerulean",
    bgColor: "bg-brand-cerulean/10",
  },
  auto_quote_ready: {
    label: "Auto Quote",
    color: "text-brand-flame",
    bgColor: "bg-brand-flame/10",
  },
  lark_message: {
    label: "Lark",
    color: "text-indigo-600",
    bgColor: "bg-indigo-100",
  },
  review_human: {
    label: "Asset Review",
    color: "text-brand-cerulean",
    bgColor: "bg-brand-cerulean/10",
  },
  review_ai_ready: {
    label: "AI Review",
    color: "text-brand-flame",
    bgColor: "bg-brand-flame/10",
  },
  review_escalated: {
    label: "Escalated",
    color: "text-brand-flame",
    bgColor: "bg-brand-flame/20",
  },
};

const PROTOCOL_LABELS: Record<string, string> = {
  // New protocols
  "PROTO-ENQUIRY": "Enquiry",
  "PROTO-EMAIL-INTAKE": "New Project",
  "PROTO-CLIENT-RETURN": "Project Feedback",
  "archive": "Other",
  // Legacy protocols (backward compat)
  "PROTO-CLIENT-REPLY": "Enquiry",
  "PROTO-REVIEW-PIPELINE": "Review pipeline",
  "PROTO-PROJECT-FOLLOWUP": "Follow-up alert",
  "PROTO-PITCH": "Enquiry",
};

type FilterTab =
  | "all"
  | "new_project"
  | "project_feedback"
  | "enquiry"
  | "project_reviews"
  | "other"
  | "done";

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "new_project", label: "New Projects" },
  { key: "project_feedback", label: "Project Feedback" },
  { key: "enquiry", label: "Enquiries" },
  { key: "project_reviews", label: "Project Reviews" },
  { key: "other", label: "Others" },
  { key: "done", label: "Managed" },
];

// ─── Filter logic ──────────────────────────────────────────────────────────

const FILTER_PROTOCOL_MAP: Record<string, string> = {
  new_project: "PROTO-EMAIL-INTAKE",
  project_feedback: "PROTO-CLIENT-RETURN",
  enquiry: "PROTO-ENQUIRY",
  other: "archive",
};

// Legacy protocol mappings so old items show in correct tabs
const LEGACY_PROTOCOL_TO_FILTER: Record<string, string> = {
  "PROTO-PITCH": "PROTO-ENQUIRY",
  "PROTO-CLIENT-REPLY": "PROTO-ENQUIRY",
  "PROTO-LARK-TRIAGE": "PROTO-ENQUIRY", // Old Lark items → show in Enquiries
};

function filterItems(items: InboxItem[], filter: FilterTab): InboxItem[] {
  if (filter === "all") {
    return items.filter((i) => i.status !== "done" && i.status !== "dismissed");
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
      // Items with null/archive protocol that don't belong in other tabs
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

// ─── Action badge for Managed tab (Fix 6) ──────────────────────────────────

function getActionBadge(item: InboxItem): string {
  if (item.status === "dismissed") return "Archived";
  // status === "done"
  if (item.type === "review_human" || item.type === "review_ai_ready" || item.type === "review_escalated") {
    return "Review done";
  }
  switch (item.protocol) {
    case "PROTO-EMAIL-INTAKE":
      return "Brief created";
    case "PROTO-ENQUIRY":
    case "PROTO-CLIENT-REPLY":
    case "PROTO-PITCH":
      return "Replied";
    case "PROTO-CLIENT-RETURN":
      return "Feedback added";
    default:
      return "Done";
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

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

// ─── Toast Component ───────────────────────────────────────────────────────

function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 text-white text-sm font-medium transition-opacity",
        toast.type === "success" ? "bg-success" : "bg-brand-flame"
      )}
      role="status"
      aria-live="polite"
    >
      {toast.message}
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function InboxPage() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [toast, setToast] = useState<ToastState | null>(null);
  const [noiseItems, setNoiseItems] = useState<InboxItem[]>([]);
  const [noiseOpen, setNoiseOpen] = useState(false);
  const [noiseLoading, setNoiseLoading] = useState(false);

  // Modal state for email actions
  const [activeModal, setActiveModal] = useState<{
    type: "create_brief" | "open_project" | "draft_reply" | "prepare_pitch" | "create_feedback";
    item: InboxItem;
    payload: EmailPayload;
  } | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
  }, []);

  const fetchNoiseItems = useCallback(async () => {
    setNoiseLoading(true);
    try {
      const res = await fetch("/api/admin/inbox?type=noise&includeNoise=true");
      if (res.ok) {
        const data = await res.json();
        setNoiseItems(data.items ?? []);
      }
    } catch (error) {
      console.error("[Inbox] noise fetch error:", error);
    } finally {
      setNoiseLoading(false);
    }
  }, []);

  const isInitialLoad = useRef(true);

  const fetchItems = useCallback(async () => {
    // Only show loading skeleton on initial load, not on 30s polling refresh
    if (isInitialLoad.current) {
      setLoading(true);
    }
    setFetchError(null);
    try {
      // Fetch all non-noise items including done/dismissed for Managed tab
      const res = await fetch("/api/admin/inbox?limit=100");
      if (res.ok) {
        const data = await res.json();
        const allItems = (data.items ?? []) as InboxItem[];
        // Exclude followup_alert from display (Fix 5) — they stay in DB but are hidden
        const filtered = allItems.filter((i) => i.type !== "followup_alert");
        setItems(filtered);
      } else {
        const errMsg = `Failed to load inbox (${res.status})`;
        console.error("[Inbox] fetch error:", res.status, res.statusText);
        setFetchError(errMsg);
      }
    } catch (error) {
      console.error("[Inbox] fetch error:", error);
      setFetchError("Unable to reach server — check your connection");
    } finally {
      setLoading(false);
      isInitialLoad.current = false;
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchItems, 30_000);
    return () => clearInterval(interval);
  }, [fetchItems]);

  // ─── Due Today banner (Fix 5) ──────────────────────────────────────────
  const [dueTodayTasks, setDueTodayTasks] = useState<Array<{ id: string; name: string; url: string; client: string }>>([]);
  const [dueTodayExpanded, setDueTodayExpanded] = useState(false);

  const fetchDueToday = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/clickup/due-today");
      if (res.ok) {
        const data = await res.json() as { tasks: Array<{ id: string; name: string; url: string; client: string }> };
        setDueTodayTasks(data.tasks ?? []);
      }
    } catch {
      // Non-critical — banner simply stays hidden
    }
  }, []);

  // Fetch on mount + refresh every 30s alongside inbox items
  useEffect(() => {
    fetchDueToday();
    const interval = setInterval(fetchDueToday, 30_000);
    return () => clearInterval(interval);
  }, [fetchDueToday]);

  const handleNotNoise = useCallback(
    async (id: string) => {
      setActionLoading(id);
      try {
        const res = await fetch("/api/admin/inbox/not-noise", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        if (res.ok) {
          setNoiseItems((prev) => prev.filter((item) => item.id !== id));
          showToast("Moved to inbox — item is now pending", "success");
          fetchItems();
        } else {
          showToast("Action failed — please retry", "error");
        }
      } catch (error) {
        console.error("[Inbox] not-noise error:", error);
        showToast("Action failed — please retry", "error");
      } finally {
        setActionLoading(null);
      }
    },
    [showToast, fetchItems]
  );

  const handleMarkAsNoise = useCallback(
    async (id: string) => {
      setActionLoading(id);
      try {
        const res = await fetch("/api/admin/inbox/mark-noise", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        if (res.ok) {
          showToast("Marked as not relevant", "success");
          await fetchItems();
        } else {
          showToast("Failed to mark as noise", "error");
        }
      } catch {
        showToast("Action failed — please retry", "error");
      } finally {
        setActionLoading(null);
      }
    },
    [showToast, fetchItems]
  );

  const handleRestore = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch("/api/admin/inbox", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "pending" }),
      });
      if (res.ok) {
        showToast("Restored to inbox", "success");
        await fetchItems();
      } else {
        showToast("Restore failed — please retry", "error");
      }
    } catch {
      showToast("Restore failed — please retry", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleAction = async (id: string, status: "done" | "dismissed") => {
    setActionLoading(id);
    try {
      const res = await fetch("/api/admin/inbox", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        const data = await res.json();
        const updatedItem = data.item as InboxItem | undefined;
        setItems((prev) => prev.filter((item) => item.id !== id));
        if (editingId === id) setEditingId(null);

        // Protocol-specific redirects on approve
        if (status === "done" && updatedItem) {
          if (updatedItem.protocol === "PROTO-EMAIL-INTAKE" && updatedItem.sourceId) {
            // Redirect to Quick Brief with the email messageId for auto-import
            showToast("Approved — redirecting to Quick Brief...", "success");
            window.location.href = `/admin/quick-brief?fromInbox=${encodeURIComponent(updatedItem.sourceId)}`;
            return;
          }

          if (updatedItem.protocol === "PROTO-CLIENT-REPLY" && updatedItem.summary) {
            // Create Outlook draft from the approved reply content
            try {
              const summaryData = JSON.parse(updatedItem.summary) as Record<string, unknown>;
              const senderEmail = (summaryData.from as string) ?? "";
              const emailSubject = (summaryData.subject as string) ?? "";
              // The PM's edited content (pm_action) or the AI-suggested reply
              const replyBody = (updatedItem.arya_payload as Record<string, unknown>)?.suggestedReply as string
                ?? (summaryData.suggestedReply as string)
                ?? "";

              if (senderEmail && replyBody) {
                const draftRes = await fetch("/api/admin/emails/draft", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    to: senderEmail,
                    subject: emailSubject.startsWith("Re:") ? emailSubject : `Re: ${emailSubject}`,
                    body: replyBody,
                    replyToMessageId: updatedItem.sourceId ?? undefined,
                  }),
                });
                if (draftRes.ok) {
                  const draftData = await draftRes.json();
                  const webLink = draftData.webLink as string | undefined;
                  showToast(
                    webLink
                      ? "Draft created in Outlook — open to review and send"
                      : "Draft created in Outlook",
                    "success"
                  );
                  if (webLink) {
                    window.open(webLink, "_blank", "noopener,noreferrer");
                  }
                  return;
                }
                console.error("[Inbox] draft creation failed:", draftRes.status);
              }
            } catch (draftError) {
              console.error("[Inbox] draft creation error:", draftError);
            }
            // Fallback toast if draft creation failed
            showToast("Item approved — could not create draft automatically", "success");
            return;
          }

          if (updatedItem.protocol === "PROTO-CLIENT-RETURN" && updatedItem.summary) {
            try {
              const summaryData = JSON.parse(updatedItem.summary) as Record<string, unknown>;
              const taskUrl = summaryData.clickupUrl as string | undefined;
              if (taskUrl) {
                showToast("Opening project in ClickUp...", "success");
                window.open(taskUrl, "_blank", "noopener,noreferrer");
                return;
              }
            } catch { /* fallback below */ }
            showToast("Done — check ClickUp for project details", "success");
            return;
          }

          if (updatedItem.protocol === "PROTO-QUOTE") {
            // Redirect to Quotes page with inbox data for pre-fill
            // Extract client/project info from summary for query params
            let quoteParams = `fromInbox=${encodeURIComponent(updatedItem.id)}`;
            try {
              const summaryData = JSON.parse(updatedItem.summary ?? "{}") as Record<string, unknown>;
              const clientName = summaryData.clientName as string | undefined;
              const projectName = summaryData.projectName as string | undefined;
              if (clientName) quoteParams += `&client=${encodeURIComponent(clientName)}`;
              if (projectName) quoteParams += `&project=${encodeURIComponent(projectName)}`;
            } catch {
              // Non-critical — redirect without extra params
            }
            showToast("Approved — redirecting to Quotes...", "success");
            window.location.href = `/admin/quotes?${quoteParams}`;
            return;
          }

          if (updatedItem.protocol === "PROTO-REVIEW-INTAKE") {
            // Redirect to Asset Review page with clickup task ID for auto-loading brief
            try {
              const summaryData = JSON.parse(updatedItem.summary ?? "{}") as Record<string, unknown>;
              const clickupTaskId = (summaryData.clickupTaskId as string) ?? updatedItem.projectId ?? "";
              if (clickupTaskId) {
                showToast("Opening Asset Review...", "success");
                window.location.href = `/admin/asset-review?clickupTaskId=${encodeURIComponent(clickupTaskId)}`;
                return;
              }
            } catch { /* fallback below */ }
            showToast("Done — open Asset Review manually", "success");
            return;
          }
        }

        // Default toast for non-protocol actions
        showToast(
          status === "done" ? "Done — action completed" : "Archived",
          "success"
        );
      } else {
        console.error("[Inbox] action error:", res.status, res.statusText);
        showToast("Action failed — please retry", "error");
      }
    } catch (error) {
      console.error("[Inbox] action error:", error);
      showToast("Action failed — please retry", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleEdit = (item: InboxItem) => {
    if (editingId === item.id) {
      setEditingId(null);
      return;
    }
    setEditingId(item.id);
    setEditContent("");
  };

  const handleSaveAndApprove = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch("/api/admin/inbox", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "done", summary: editContent }),
      });
      if (res.ok) {
        const data = await res.json();
        const updatedItem = data.item as InboxItem | undefined;
        setItems((prev) => prev.filter((item) => item.id !== id));
        setEditingId(null);

        // Protocol-specific redirects (same logic as handleAction)
        if (updatedItem) {
          if (updatedItem.protocol === "PROTO-EMAIL-INTAKE" && updatedItem.sourceId) {
            showToast("Saved & approved — redirecting to Quick Brief...", "success");
            window.location.href = `/admin/quick-brief?fromInbox=${encodeURIComponent(updatedItem.sourceId)}`;
            return;
          }
          if (updatedItem.protocol === "PROTO-QUOTE") {
            let quoteParams = `fromInbox=${encodeURIComponent(updatedItem.id)}`;
            try {
              const summaryData = JSON.parse(updatedItem.summary ?? "{}") as Record<string, unknown>;
              const clientName = summaryData.clientName as string | undefined;
              const projectName = summaryData.projectName as string | undefined;
              if (clientName) quoteParams += `&client=${encodeURIComponent(clientName)}`;
              if (projectName) quoteParams += `&project=${encodeURIComponent(projectName)}`;
            } catch { /* non-critical */ }
            showToast("Saved & approved — redirecting to Quotes...", "success");
            window.location.href = `/admin/quotes?${quoteParams}`;
            return;
          }
          if (updatedItem.protocol === "PROTO-REVIEW-INTAKE") {
            try {
              const summaryData = JSON.parse(updatedItem.summary ?? "{}") as Record<string, unknown>;
              const clickupTaskId = (summaryData.clickupTaskId as string) ?? updatedItem.projectId ?? "";
              if (clickupTaskId) {
                showToast("Saved — opening Asset Review...", "success");
                window.location.href = `/admin/asset-review?clickupTaskId=${encodeURIComponent(clickupTaskId)}`;
                return;
              }
            } catch { /* non-critical */ }
          }
        }

        showToast("Saved & approved — chain triggered", "success");
      } else {
        console.error("[Inbox] save error:", res.status, res.statusText);
        showToast("Save failed — please retry", "error");
      }
    } catch (error) {
      console.error("[Inbox] save error:", error);
      showToast("Save failed — please retry", "error");
    } finally {
      setActionLoading(null);
    }
  };

  // Filter items using new filter logic
  const filteredItems = filterItems(items, activeFilter).sort((a, b) => {
    // Managed tab: sort by processedAt DESC
    if (activeFilter === "done") {
      const aDate = a.processedAt ? new Date(a.processedAt).getTime() : 0;
      const bDate = b.processedAt ? new Date(b.processedAt).getTime() : 0;
      return bDate - aDate;
    }
    // Default: createdAt DESC (already sorted by API, but ensure)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Counts for each tab
  const isManagedTab = activeFilter === "done";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-brand-black">Inbox</h1>
        <p className="text-neutral-500 text-sm mt-1">
          {loading
            ? "Loading..."
            : (() => {
                const pendingCount = items.filter(
                  (i) => i.status !== "done" && i.status !== "dismissed"
                ).length;
                return pendingCount === 0
                  ? "No items waiting"
                  : `${pendingCount} item${pendingCount !== 1 ? "s" : ""} waiting`;
              })()}
        </p>
      </div>

      {/* Fetch error banner */}
      {fetchError && (
        <div className="bg-brand-flame/10 border border-brand-flame/30 rounded-lg px-4 py-3 text-sm text-brand-flame" role="alert">
          {fetchError}
          <button
            onClick={fetchItems}
            className="ml-3 underline font-medium hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Due Today Banner — compact with expandable grouped view */}
      {dueTodayTasks.length > 0 && (
        <div className="bg-brand-lemon/10 border border-brand-lemon/30 rounded-lg text-sm text-brand-black">
          <button
            onClick={() => setDueTodayExpanded((prev) => !prev)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-brand-lemon/5 transition-colors rounded-lg"
            aria-expanded={dueTodayExpanded}
            aria-label={`${dueTodayTasks.length} projects due today — click to ${dueTodayExpanded ? "collapse" : "expand"}`}
          >
            <span>
              <span className="font-semibold">{dueTodayTasks.length} project{dueTodayTasks.length !== 1 ? "s" : ""} due today</span>
              {!dueTodayExpanded && dueTodayTasks.length <= 3 && (
                <span className="text-neutral-500">
                  {" — "}
                  {dueTodayTasks.map((t) => t.name).join(", ")}
                </span>
              )}
              {!dueTodayExpanded && dueTodayTasks.length > 3 && (
                <span className="text-neutral-500">
                  {" — "}
                  {dueTodayTasks.slice(0, 3).map((t) => t.name).join(", ")}
                  {` and ${dueTodayTasks.length - 3} more`}
                </span>
              )}
            </span>
            <svg
              className={cn(
                "w-4 h-4 text-neutral-400 shrink-0 transition-transform duration-200",
                dueTodayExpanded && "rotate-180"
              )}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {dueTodayExpanded && (
            <div className="px-4 pb-3 space-y-2 border-t border-brand-lemon/20 pt-2">
              {(() => {
                // Group tasks by client
                const grouped: Record<string, typeof dueTodayTasks> = {};
                for (const task of dueTodayTasks) {
                  const client = task.client || "Other";
                  if (!grouped[client]) grouped[client] = [];
                  grouped[client].push(task);
                }
                const sortedClients = Object.keys(grouped).sort((a, b) => {
                  if (a === "Other") return 1;
                  if (b === "Other") return -1;
                  return a.localeCompare(b);
                });
                return sortedClients.map((client) => (
                  <div key={client}>
                    <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">{client} ({grouped[client].length})</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      {grouped[client].map((task) => (
                        <a
                          key={task.id}
                          href={task.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand-cerulean hover:underline"
                        >
                          {task.name}
                        </a>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {FILTER_TABS.map((tab) => {
          const isActive = activeFilter === tab.key;
          const count = filterItems(items, tab.key).length;

          return (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={cn(
                "px-3 py-2.5 min-h-[44px] rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-brand-black text-white"
                  : "bg-white text-neutral-600 hover:bg-neutral-300 border border-neutral-300"
              )}
            >
              {tab.label}
              {count > 0 && (
                <span
                  className={cn(
                    "ml-1.5 text-xs px-1.5 py-0.5 rounded-full",
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-neutral-200 text-neutral-500"
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <SkeletonList />
      ) : filteredItems.length === 0 ? (
        <EmptyState filter={activeFilter} />
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => {
            // Render AutoBriefCard for auto_brief_ready items
            if (item.type === "auto_brief_ready" && item.summary) {
              let payload: AutoBriefPayload | null = null;
              try {
                payload = JSON.parse(item.summary) as AutoBriefPayload;
              } catch {
                // Malformed summary — show error fallback
              }
              if (payload) {
                return (
                  <AutoBriefCard
                    key={item.id}
                    itemId={item.id}
                    payload={payload}
                    clients={CLIENT_MAPPINGS.map((m) => ({
                      spaceName: m.clickupSpaceName,
                      spaceId: m.clickupSpaceId,
                    }))}
                    createdAt={item.createdAt}
                    onCreated={fetchItems}
                    onDismissed={fetchItems}
                    showToast={showToast}
                  />
                );
              }
              return (
                <div key={item.id} className="bg-white rounded-xl border border-error/30 p-5">
                  <p className="text-sm text-error font-medium">Auto Brief — could not load</p>
                  <p className="text-xs text-neutral-500 mt-1">Summary data is malformed. Try refreshing or archive this item.</p>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => fetchItems()}
                      className="px-3 py-2 min-h-[44px] rounded-lg text-sm font-medium bg-neutral-200 text-neutral-600 hover:bg-neutral-300 transition-colors"
                    >
                      Refresh
                    </button>
                    <button
                      onClick={() => handleAction(item.id, "dismissed")}
                      className="px-3 py-2 min-h-[44px] rounded-lg text-sm font-medium bg-neutral-200 text-neutral-600 hover:bg-neutral-300 transition-colors"
                    >
                      Archive
                    </button>
                  </div>
                </div>
              );
            }

            // Render AutoQuoteCard for auto_quote_ready items
            if (item.type === "auto_quote_ready" && item.summary) {
              let quotePayload: AutoQuotePayload | null = null;
              try {
                quotePayload = JSON.parse(item.summary) as AutoQuotePayload;
              } catch {
                // Malformed summary — show error fallback
              }
              if (quotePayload) {
                return (
                  <AutoQuoteCard
                    key={item.id}
                    itemId={item.id}
                    payload={quotePayload}
                    createdAt={item.createdAt}
                    onFinalized={fetchItems}
                    onDismissed={fetchItems}
                    showToast={showToast}
                  />
                );
              }
              return (
                <div key={item.id} className="bg-white rounded-xl border border-error/30 p-5">
                  <p className="text-sm text-error font-medium">Auto Quote — could not load</p>
                  <p className="text-xs text-neutral-500 mt-1">Summary data is malformed. Try refreshing or archive this item.</p>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => fetchItems()}
                      className="px-3 py-2 min-h-[44px] rounded-lg text-sm font-medium bg-neutral-200 text-neutral-600 hover:bg-neutral-300 transition-colors"
                    >
                      Refresh
                    </button>
                    <button
                      onClick={() => handleAction(item.id, "dismissed")}
                      className="px-3 py-2 min-h-[44px] rounded-lg text-sm font-medium bg-neutral-200 text-neutral-600 hover:bg-neutral-300 transition-colors"
                    >
                      Archive
                    </button>
                  </div>
                </div>
              );
            }

            // Render EmailCard for email_classified and lark_message items
            if ((item.type === "email_classified" || item.type === "lark_message") && item.summary) {
              const emailPayload = parseEmailPayload(item.summary);
              if (emailPayload) {
                return (
                  <EmailCard
                    key={item.id}
                    itemId={item.id}
                    sourceId={item.sourceId}
                    sourceType={item.sourceType}
                    payload={emailPayload}
                    createdAt={item.createdAt}
                    isActioning={actionLoading === item.id}
                    onApprove={() => handleAction(item.id, "done")}
                    onDismiss={() => handleAction(item.id, "dismissed")}
                    onMarkNoise={() => handleMarkAsNoise(item.id)}
                    onCreateBrief={() => setActiveModal({ type: "create_brief", item, payload: emailPayload })}
                    onOpenProject={() => {
                      const isFeedback = item.protocol === "PROTO-CLIENT-RETURN" ||
                        emailPayload.classification?.category === "project_feedback" ||
                        emailPayload.classification?.category === "client_followup";
                      setActiveModal({ type: isFeedback ? "create_feedback" : "open_project", item, payload: emailPayload });
                    }}
                    onDraftReply={() => setActiveModal({ type: "draft_reply", item, payload: emailPayload })}
                    onPreparePitch={() => setActiveModal({ type: "prepare_pitch", item, payload: emailPayload })}
                    showToast={showToast}
                    isManagedView={isManagedTab}
                    actionBadge={isManagedTab ? getActionBadge(item) : undefined}
                    processedAt={item.processedAt}
                    onRestore={isManagedTab ? () => handleRestore(item.id) : undefined}
                  />
                );
              }
              return (
                <div key={item.id} className="bg-white rounded-xl border border-error/30 p-5">
                  <p className="text-sm text-error font-medium">
                    {item.type === "lark_message" ? "Lark Message" : "Email"} — could not load
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">Summary data is malformed. Try refreshing or archive this item.</p>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => fetchItems()}
                      className="px-3 py-2 min-h-[44px] rounded-lg text-sm font-medium bg-neutral-200 text-neutral-600 hover:bg-neutral-300 transition-colors"
                    >
                      Refresh
                    </button>
                    <button
                      onClick={() => handleAction(item.id, "dismissed")}
                      className="px-3 py-2 min-h-[44px] rounded-lg text-sm font-medium bg-neutral-200 text-neutral-600 hover:bg-neutral-300 transition-colors"
                    >
                      Archive
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <InboxCard
                key={item.id}
                item={item}
                isActioning={actionLoading === item.id}
                isEditing={!isManagedTab && editingId === item.id}
                editContent={editingId === item.id ? editContent : ""}
                onApprove={() => handleAction(item.id, "done")}
                onDismiss={() => handleAction(item.id, "dismissed")}
                onEdit={() => handleEdit(item)}
                onEditContentChange={setEditContent}
                onSaveAndApprove={() => handleSaveAndApprove(item.id)}
                isManagedView={isManagedTab}
                actionBadge={isManagedTab ? getActionBadge(item) : undefined}
                onRestore={isManagedTab ? () => handleRestore(item.id) : undefined}
              />
            );
          })}
        </div>
      )}

      {/* Other (noise) section — collapsible */}
      <div className="mt-8 border-t border-neutral-200 pt-6">
        <button
          onClick={() => {
            const willOpen = !noiseOpen;
            setNoiseOpen(willOpen);
            if (willOpen && noiseItems.length === 0) {
              fetchNoiseItems();
            }
          }}
          className="flex items-center gap-2 text-sm font-medium text-neutral-400 hover:text-neutral-600 transition-colors min-h-[44px]"
          aria-expanded={noiseOpen}
          aria-controls="noise-section"
          title="Items classified as not relevant by Arya. Review here if something was misclassified."
        >
          <svg
            className={cn(
              "w-4 h-4 transition-transform",
              noiseOpen && "rotate-90"
            )}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
          Filtered out
          {noiseItems.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-neutral-100 text-neutral-400">
              {noiseItems.length}
            </span>
          )}
        </button>

        {noiseOpen && (
          <div id="noise-section" className="mt-4 space-y-3">
            {noiseLoading ? (
              <div className="text-sm text-neutral-400 py-4 text-center">
                Loading...
              </div>
            ) : noiseItems.length === 0 ? (
              <div className="text-sm text-neutral-400 py-4 text-center">
                No noise items
              </div>
            ) : (
              noiseItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-neutral-50 rounded-xl border border-neutral-200 p-4 opacity-70"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-400">
                          Noise
                        </span>
                        <span className="text-xs text-neutral-400">
                          {formatRelativeTime(item.createdAt).text}
                        </span>
                      </div>
                      <h3 className="text-sm font-medium text-neutral-500 truncate">
                        {item.title ?? "Untitled"}
                      </h3>
                      {item.summary && (
                        <p className="text-xs text-neutral-400 line-clamp-1">
                          {(() => {
                            try {
                              const p = JSON.parse(item.summary) as Record<string, unknown>;
                              return [p.from, p.subject, p.reason, p.taskName].filter(Boolean).join(" — ") || item.summary.slice(0, 100);
                            } catch { return item.summary.slice(0, 100); }
                          })()}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleNotNoise(item.id)}
                      disabled={actionLoading === item.id}
                      className="px-3 py-2 min-h-[44px] rounded-lg text-sm font-medium bg-white border border-neutral-300 text-neutral-600 hover:bg-neutral-100 transition-colors disabled:opacity-50 shrink-0"
                      aria-label={`Mark as not noise: ${item.title ?? "item"}`}
                    >
                      {actionLoading === item.id ? "Moving..." : "Not noise"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}

      {/* Action Modals */}
      {activeModal?.type === "create_brief" && (
        <CreateBriefModal
          itemId={activeModal.item.id}
          sourceId={activeModal.item.sourceId}
          payload={activeModal.payload}
          clients={CLIENT_MAPPINGS.map((m) => ({
            spaceName: m.clickupSpaceName,
            spaceId: m.clickupSpaceId,
          }))}
          onClose={() => setActiveModal(null)}
          onCreated={fetchItems}
          showToast={showToast}
        />
      )}

      {activeModal?.type === "draft_reply" && (
        <DraftReplyModal
          itemId={activeModal.item.id}
          sourceId={activeModal.item.sourceId}
          payload={activeModal.payload}
          onClose={() => setActiveModal(null)}
          onDrafted={fetchItems}
          showToast={showToast}
        />
      )}

      {(activeModal?.type === "open_project" || activeModal?.type === "prepare_pitch" || activeModal?.type === "create_feedback") && (
        <ProjectActionModal
          variant={activeModal.type}
          itemId={activeModal.item.id}
          sourceId={activeModal.item.sourceId}
          payload={activeModal.payload}
          onClose={() => setActiveModal(null)}
          onActionComplete={fetchItems}
          onOpenDraftReply={() => {
            const currentItem = activeModal.item;
            const currentPayload = activeModal.payload;
            setActiveModal({ type: "draft_reply", item: currentItem, payload: currentPayload });
          }}
          showToast={showToast}
        />
      )}
    </div>
  );
}

// ─── Inbox Card ─────────────────────────────────────────────────────────────

// ─── Contextual Action Labels ──────────────────────────────────────────────

function getContextualActionLabel(type: InboxItemType): { primary: string; primaryLoading: string; nextStep: string } {
  switch (type) {
    case "followup_alert":
      return {
        primary: "Mark Resolved",
        primaryLoading: "Resolving...",
        nextStep: "Next: Check project status in ClickUp",
      };
    case "ai_team_complete":
      return {
        primary: "Review Deliverables",
        primaryLoading: "Opening...",
        nextStep: "Next: Review AI output quality, then approve or request changes",
      };
    case "review_human":
      return {
        primary: "Start Asset Review \u2192",
        primaryLoading: "Opening...",
        nextStep: "Next: Review client assets and provide feedback",
      };
    case "review_ai_ready":
      return {
        primary: "Validate AI Work \u2192",
        primaryLoading: "Opening...",
        nextStep: "Next: Check AI-generated deliverables match the brief",
      };
    case "review_escalated":
      return {
        primary: "Review Escalation",
        primaryLoading: "Opening...",
        nextStep: "Next: Investigate the escalated issue and take action",
      };
    case "qa_gates_pass":
      return {
        primary: "Acknowledge",
        primaryLoading: "Processing...",
        nextStep: "Next: QA passed \u2014 project ready for delivery",
      };
    default:
      return {
        primary: "Mark as Read",
        primaryLoading: "Processing...",
        nextStep: "Next: Read and decide on action",
      };
  }
}

function InboxCard({
  item,
  isActioning,
  isEditing,
  editContent,
  onApprove,
  onDismiss,
  onEdit,
  onEditContentChange,
  onSaveAndApprove,
  isManagedView,
  actionBadge,
  onRestore,
}: {
  item: InboxItem;
  isActioning: boolean;
  isEditing: boolean;
  editContent: string;
  onApprove: () => void;
  onDismiss: () => void;
  onEdit: () => void;
  onEditContentChange: (value: string) => void;
  onSaveAndApprove: () => void;
  isManagedView?: boolean;
  actionBadge?: string;
  onRestore?: () => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typeConfig = TYPE_CONFIG[item.type] ?? {
    label: item.type,
    color: "text-neutral-700",
    bgColor: "bg-neutral-100",
  };

  const { text: timeText, isUrgent } = formatRelativeTime(item.createdAt);
  const actionLabels = getContextualActionLabel(item.type);

  // Extract email count from summary payload (set by webhook thread aggregation)
  const emailCount = (() => {
    if (!item.summary) return 1;
    try {
      const parsed = JSON.parse(item.summary) as Record<string, unknown>;
      const count = parsed.emailCount;
      return typeof count === "number" && count > 0 ? count : 1;
    } catch {
      return 1;
    }
  })();

  // Auto-focus textarea when editing opens
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  return (
    <div className={cn(
      "bg-white rounded-xl border border-neutral-300 p-5 hover:shadow-sm transition-shadow",
      item.type === "review_escalated" && "border-l-4 border-l-brand-flame"
    )}>
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        {/* Left: content */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Top row: badge + time + email count */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                "text-xs font-semibold px-2 py-0.5 rounded-full",
                typeConfig.bgColor,
                typeConfig.color
              )}
            >
              {typeConfig.label}
            </span>
            {isManagedView && actionBadge && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500">
                {actionBadge}
              </span>
            )}
            {!isManagedView && item.priority === "high" && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-flame/20 text-brand-flame">
                High
              </span>
            )}
            {emailCount > 1 && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-cerulean/15 text-brand-cerulean">
                {emailCount} emails
              </span>
            )}
            <span
              className={cn(
                "text-xs",
                isUrgent ? "text-brand-flame font-semibold" : "text-neutral-400"
              )}
            >
              {isUrgent ? `Urgent \u2014 ${timeText}` : timeText}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-sm font-semibold text-brand-black truncate">
            {item.title ?? "Untitled item"}
          </h3>

          {/* Summary — parse JSON for human-readable display */}
          {item.summary && (
            <p className="text-sm text-neutral-500 line-clamp-2">
              {(() => {
                try {
                  const parsed = JSON.parse(item.summary) as Record<string, unknown>;
                  // Extract human-readable fields from common summary shapes
                  const parts: string[] = [];
                  if (parsed.from) parts.push(`From: ${String(parsed.from)}`);
                  if (parsed.subject) parts.push(String(parsed.subject));
                  if (parsed.reason) parts.push(String(parsed.reason));
                  if (parsed.taskName) parts.push(String(parsed.taskName));
                  if (parsed.projectName) parts.push(String(parsed.projectName));
                  if (parsed.clientName) parts.push(String(parsed.clientName));
                  if (parsed.level) parts.push(`Priority: ${String(parsed.level)}`);
                  if (parsed.bodyPreview) parts.push(String(parsed.bodyPreview).slice(0, 120));
                  if (parts.length > 0) return parts.join(" — ");
                  // Fallback: show first meaningful string value
                  const firstValue = Object.values(parsed).find((v) => typeof v === "string" && v.length > 3);
                  if (firstValue) return String(firstValue).slice(0, 200);
                } catch {
                  // Not JSON — display as-is
                }
                return item.summary.slice(0, 200);
              })()}
            </p>
          )}

          {/* Protocol label */}
          {item.protocol && (
            <div className="flex items-center gap-3 text-xs text-neutral-400">
              <span>{PROTOCOL_LABELS[item.protocol] ?? item.protocol}</span>
            </div>
          )}
        </div>

        {/* Right: actions */}
        {isManagedView ? (
          <div className="flex items-center gap-2 shrink-0 sm:pt-1">
            <span className="text-xs text-neutral-400">
              {item.processedAt
                ? new Date(item.processedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                : "Date unknown"}
            </span>
            {onRestore && (
              <button
                onClick={onRestore}
                disabled={isActioning}
                className="px-3 py-2 min-h-[44px] rounded-lg text-xs font-medium bg-neutral-200 text-neutral-600 hover:bg-neutral-300 transition-colors disabled:opacity-50"
                aria-label={`Restore to inbox: ${item.title ?? "item"}`}
              >
                {isActioning ? "Restoring..." : "Restore"}
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 shrink-0 sm:pt-1">
            <button
              onClick={onApprove}
              disabled={isActioning}
              className="px-3 py-2.5 min-h-[44px] rounded-lg text-sm font-semibold bg-success text-white hover:bg-green-700 transition-colors disabled:opacity-50"
              aria-label={`${actionLabels.primary}: ${item.title ?? "item"}`}
            >
              {isActioning ? actionLabels.primaryLoading : actionLabels.primary}
            </button>
            <button
              onClick={onEdit}
              disabled={isActioning}
              className={cn(
                "px-3 py-2.5 min-h-[44px] rounded-lg text-sm font-medium transition-colors disabled:opacity-50",
                isEditing
                  ? "bg-brand-cerulean-dark text-white"
                  : "bg-brand-cerulean text-white hover:bg-brand-cerulean-dark"
              )}
              aria-label={`Edit: ${item.title ?? "item"}`}
              aria-expanded={isEditing}
            >
              Edit
            </button>
            <button
              onClick={onDismiss}
              disabled={isActioning}
              className="px-3 py-2.5 min-h-[44px] rounded-lg text-sm font-medium bg-neutral-200 text-neutral-600 hover:bg-neutral-300 transition-colors disabled:opacity-50"
              aria-label={`Archive: ${item.title ?? "item"}`}
            >
              Archive
            </button>
          </div>
        )}
      </div>

      {/* Next step hint — hidden in managed view */}
      {!isManagedView && (
        <p className="text-xs text-neutral-500 mt-2 pl-1">
          {actionLabels.nextStep}
        </p>
      )}

      {/* Inline editor */}
      {isEditing && (
        <div className="mt-4 pt-4 border-t border-neutral-200 space-y-3">
          <label htmlFor={`edit-${item.id}`} className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
            Notes / Feedback
          </label>
          <textarea
            ref={textareaRef}
            id={`edit-${item.id}`}
            value={editContent}
            onChange={(e) => onEditContentChange(e.target.value)}
            rows={8}
            placeholder="Add your notes or feedback here..."
            className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean/40 focus:border-brand-cerulean resize-y"
            aria-label="Notes and feedback"
          />
          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={onEdit}
              className="px-3 py-2.5 min-h-[44px] rounded-lg text-sm font-medium bg-neutral-200 text-neutral-600 hover:bg-neutral-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onSaveAndApprove}
              disabled={isActioning}
              className="px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-semibold bg-success text-white hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {isActioning ? "Saving..." : `Save & ${actionLabels.primary}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Empty State ────────────────────────────────────────────────────────────

function EmptyState({ filter }: { filter: FilterTab }) {
  const isManaged = filter === "done";
  const isAll = filter === "all";

  return (
    <div className="bg-white rounded-xl border border-neutral-300 p-12 text-center">
      <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-success-light flex items-center justify-center">
        <svg
          className="w-6 h-6 text-success"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      </div>
      <h3 className="text-sm font-semibold text-brand-black mb-1">
        {isAll ? "No items waiting" : isManaged ? "No managed items yet" : "No items in this category"}
      </h3>
      <p className="text-sm text-neutral-500">
        {isAll
          ? "Arya is handling everything. Check back later."
          : isManaged
            ? "Items you process will appear here."
            : "New items will appear when emails are classified."}
      </p>
    </div>
  );
}

// ─── Skeleton Loading ───────────────────────────────────────────────────────

function SkeletonList() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="bg-white rounded-xl border border-neutral-300 p-5 animate-pulse"
        >
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-5 w-16 bg-neutral-200 rounded-full" />
                <div className="h-4 w-12 bg-neutral-200 rounded" />
              </div>
              <div className="h-4 w-3/4 bg-neutral-200 rounded" />
              <div className="h-4 w-1/2 bg-neutral-200 rounded" />
            </div>
            <div className="flex gap-2">
              <div className="h-8 w-20 bg-neutral-200 rounded-lg" />
              <div className="h-8 w-16 bg-neutral-200 rounded-lg" />
              <div className="h-8 w-20 bg-neutral-200 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
