"use client";

// SSR: false — Client Component for interactive inbox with filters and actions.
// This replaces the old SSR dashboard. The inbox is the PM's primary workspace.

import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { AutoBriefCard, type AutoBriefPayload } from "@/components/inbox/AutoBriefCard";
import { AutoQuoteCard, type AutoQuotePayload } from "@/components/inbox/AutoQuoteCard";
import { EmailCard, parseEmailPayload } from "@/components/inbox/EmailCard";
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

type FilterTab = "all" | "urgent" | "email_classified" | "ai_team_complete" | "qa_gates_pass" | "followup_alert";

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "urgent", label: "Urgent" },
  { key: "email_classified", label: "Emails" },
  { key: "ai_team_complete", label: "AI Deliverables" },
  { key: "qa_gates_pass", label: "QA" },
  { key: "followup_alert", label: "Follow-ups" },
];

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

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      // Fetch all non-noise items, then filter client-side to actionable statuses
      const res = await fetch("/api/admin/inbox?limit=100");
      if (res.ok) {
        const data = await res.json();
        const allItems = (data.items ?? []) as InboxItem[];
        const actionable = allItems.filter(
          (i) => i.status === "pending" || i.status === "pending_review"
        );
        setItems(actionable);
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
    setEditContent(
      item.arya_payload
        ? JSON.stringify(item.arya_payload, null, 2)
        : item.summary ?? ""
    );
  };

  const handleSaveAndApprove = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch("/api/admin/inbox", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "done", pm_action: editContent }),
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

  // Filter items
  const filteredItems = items.filter((item) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "urgent") {
      const diffMs = Date.now() - new Date(item.createdAt).getTime();
      return diffMs > 24 * 3_600_000;
    }
    return item.type === activeFilter;
  });

  const urgentCount = items.filter((item) => {
    const diffMs = Date.now() - new Date(item.createdAt).getTime();
    return diffMs > 24 * 3_600_000;
  }).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-brand-black">Inbox</h1>
        <p className="text-neutral-500 text-sm mt-1">
          {loading
            ? "Loading..."
            : items.length === 0
              ? "No items waiting"
              : `${items.length} item${items.length !== 1 ? "s" : ""} waiting`}
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

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {FILTER_TABS.map((tab) => {
          const isActive = activeFilter === tab.key;
          const count =
            tab.key === "all"
              ? items.length
              : tab.key === "urgent"
                ? urgentCount
                : items.filter((i) => i.type === tab.key).length;

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
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => {
            // Render AutoBriefCard for auto_brief_ready items
            if (item.type === "auto_brief_ready" && item.summary) {
              let payload: AutoBriefPayload | null = null;
              try {
                payload = JSON.parse(item.summary) as AutoBriefPayload;
              } catch {
                // Malformed summary — fall through to standard card
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
            }

            // Render AutoQuoteCard for auto_quote_ready items
            if (item.type === "auto_quote_ready" && item.summary) {
              let quotePayload: AutoQuotePayload | null = null;
              try {
                quotePayload = JSON.parse(item.summary) as AutoQuotePayload;
              } catch {
                // Malformed summary — fall through to standard card
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
                    onMarkNoise={() => handleAction(item.id, "dismissed")}
                    showToast={showToast}
                  />
                );
              }
            }

            return (
              <InboxCard
                key={item.id}
                item={item}
                isActioning={actionLoading === item.id}
                isEditing={editingId === item.id}
                editContent={editingId === item.id ? editContent : ""}
                onApprove={() => handleAction(item.id, "done")}
                onDismiss={() => handleAction(item.id, "dismissed")}
                onEdit={() => handleEdit(item)}
                onEditContentChange={setEditContent}
                onSaveAndApprove={() => handleSaveAndApprove(item.id)}
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
          Other
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
    <div className="bg-white rounded-xl border border-neutral-300 p-5 hover:shadow-sm transition-shadow">
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
            {item.priority === "high" && (
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

          {/* Protocol / source */}
          <div className="flex items-center gap-3 text-xs text-neutral-400">
            {item.protocol && <span>Protocol: {item.protocol}</span>}
            {item.sourceType && <span>Source: {item.sourceType}</span>}
          </div>
        </div>

        {/* Right: actions */}
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
      </div>

      {/* Next step hint */}
      <p className="text-xs text-neutral-500 mt-2 pl-1">
        {actionLabels.nextStep}
      </p>

      {/* Inline editor */}
      {isEditing && (
        <div className="mt-4 pt-4 border-t border-neutral-200 space-y-3">
          <label htmlFor={`edit-${item.id}`} className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
            Payload / Content
          </label>
          <textarea
            ref={textareaRef}
            id={`edit-${item.id}`}
            value={editContent}
            onChange={(e) => onEditContentChange(e.target.value)}
            rows={8}
            className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm font-mono text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean/40 focus:border-brand-cerulean resize-y"
            aria-label="Edit payload content"
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

function EmptyState() {
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
        No items waiting
      </h3>
      <p className="text-sm text-neutral-500">
        Arya is handling everything. Check back later.
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
