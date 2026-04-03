"use client";

// SSR not used — client-side fetch for this aggregation page.
// The composite project ID (clientName::projectName) comes from the tracker.

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ShareFolderModal } from "@/components/admin/ShareFolderModal";

// ─── Back to Tracker (preserves filters via browser history) ───────────────

function BackToTrackerLink({ className }: { className?: string }) {
  const router = useRouter();

  const handleBack = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // If there is real navigation history, go back to preserve filter state.
    // window.history.length > 1 is true even for fresh tabs (the initial entry
    // counts), so we also check the referrer to detect direct navigation.
    if (window.history.length > 2 || document.referrer.includes("/admin/tracker")) {
      e.preventDefault();
      router.back();
    }
    // Otherwise the anchor href="/admin/tracker" fires normally as a fallback.
  };

  return (
    <a
      href="/admin/tracker"
      onClick={handleBack}
      className={className}
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
      Back to Tracker
    </a>
  );
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface ClientInfo {
  id: string;
  name: string;
  industry: string;
  status: string;
  primaryColor: string | null;
  primaryContactName: string | null;
  primaryContactEmail: string | null;
}

interface AgentOutput {
  id: string;
  agentType: string;
  status: string;
  inputPayload: Record<string, unknown> | null;
  outputContent: string | null;
  createdAt: string;
  createdBy: string | null;
}

interface CaseStudyCandidate {
  id: string;
  clientName: string;
  projectName: string | null;
  projectType: string | null;
  scoreTotal: number;
  status: string;
  createdAt: string;
}

interface LandingPageItem {
  id: string;
  title: string;
  slug: string;
  status: string;
  language: string;
  createdAt: string;
}

interface StoryboardItem {
  id: string;
  title: string;
  status: string;
  shareToken: string | null;
  createdAt: string;
  sceneCount: number;
}

interface ProjectPreviewItem {
  id: string;
  projectId: string;
  version: number;
  clientSlug: string;
  projectSlug: string;
  clientName: string;
  projectName: string;
  isActive: boolean;
  createdAt: string;
}

interface QuoteItem {
  id: string;
  quoteNumber: string;
  clientName: string;
  projectName: string;
  total: string;
  currency: string;
  pdfUrl: string | null;
  createdAt: string;
}

interface ProjectDetails {
  client: ClientInfo | null;
  projectName: string | null;
  agentOutputs: AgentOutput[];
  caseStudyCandidates: CaseStudyCandidate[];
  landingPages: LandingPageItem[];
  storyboards: StoryboardItem[];
  projectPreviews: ProjectPreviewItem[];
  quotes: QuoteItem[];
}

// Tracker row shape (passed via query params or decoded from ID)
interface TrackerInfo {
  client: string;
  project: string;
  status: string;
  totalValue: number | null;
  date: string;
  invoiceStatus: string;
  poNumber: string;
  sharepointLink: string;
  clickupTaskUrl: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const AGENT_LABELS: Record<string, string> = {
  pm: "PM",
  translator: "Translator",
  creative: "Creative",
  designer: "Designer",
  legal: "Legal",
  social: "Social",
  seo: "SEO",
  copywriter: "Copywriter",
  "email-drafter": "Email",
  presentation: "Presentation",
  proofreader: "Proofreader",
  proposal: "Proposal",
  "video-script": "Video Script",
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-neutral-200 text-neutral-600",
  processing: "bg-blue-100 text-blue-700",
  done: "bg-green-100 text-green-700",
  error: "bg-red-100 text-red-700",
  draft: "bg-neutral-200 text-neutral-600",
  generating: "bg-blue-100 text-blue-700",
  ready: "bg-green-100 text-green-700",
  published: "bg-green-100 text-green-700",
  shared: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  suggested: "bg-yellow-100 text-yellow-700",
  generated: "bg-green-100 text-green-700",
  reviewed: "bg-blue-100 text-blue-700",
  ignored: "bg-neutral-200 text-neutral-600",
  excluded: "bg-red-100 text-red-700",
};

const TRACKER_STATUS_STYLES: Record<string, string> = {
  open: "bg-neutral-200 text-neutral-600",
  "in progress": "bg-blue-100 text-blue-700",
  review: "bg-yellow-100 text-yellow-700",
  closed: "bg-green-100 text-green-700",
  delivered: "bg-green-100 text-green-700",
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "--";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(value: number | string | null, currency = "EUR"): string {
  if (value === null || value === undefined) return "--";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "--";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

function getOutputPreview(output: AgentOutput): string {
  const payload = output.inputPayload;
  if (!payload) return "No input data";
  const brief =
    (payload.briefSummary as string) ||
    (payload.brief as string)?.slice(0, 120) ||
    (payload.topic as string) ||
    (payload.title as string) ||
    "";
  return brief.length > 120 ? brief.slice(0, 120) + "..." : brief || "No preview available";
}

function extractClickUpId(url: string): string {
  if (!url) return "";
  const match = url.match(/\/t\/([a-zA-Z0-9]+)/);
  if (match) return match[1];
  const segments = url.split("/").filter(Boolean);
  return segments[segments.length - 1] || "";
}

// ─── Skeleton Components ────────────────────────────────────────────────────

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-neutral-200 rounded ${className ?? "h-4 w-full"}`} />
  );
}

function SectionSkeleton() {
  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-6 space-y-4">
      <SkeletonBlock className="h-5 w-40" />
      <SkeletonBlock className="h-4 w-full" />
      <SkeletonBlock className="h-4 w-3/4" />
      <SkeletonBlock className="h-4 w-1/2" />
    </div>
  );
}

// ─── Empty State ────────────────────────────────────────────────────────────

function EmptyState({ label }: { label: string }) {
  return (
    <div className="py-8 text-center text-sm text-neutral-400">
      No {label} found for this project.
    </div>
  );
}

// ─── Status Badge ───────────────────────────────────────────────────────────

function StatusBadge({
  status,
  styleMap,
}: {
  status: string;
  styleMap?: Record<string, string>;
}) {
  const map = styleMap ?? STATUS_STYLES;
  const lower = status.toLowerCase();
  const classes = map[lower] ?? "bg-neutral-200 text-neutral-600";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${classes}`}
    >
      {status}
    </span>
  );
}

// ─── Section: Overview ──────────────────────────────────────────────────────

function OverviewSection({
  trackerInfo,
  client,
  quotes,
}: {
  trackerInfo: TrackerInfo | null;
  client: ClientInfo | null;
  quotes: QuoteItem[];
}) {
  const totalQuoteValue = quotes.reduce((sum, q) => sum + parseFloat(q.total || "0"), 0);

  return (
    <section className="bg-white border border-neutral-200 rounded-lg p-6">
      <h2 className="text-base font-semibold text-brand-black mb-4">Overview</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Key Dates */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-neutral-500 uppercase tracking-wider">
            Key Dates
          </h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-neutral-500">Created</dt>
              <dd className="text-brand-black font-medium">
                {formatDate(trackerInfo?.date)}
              </dd>
            </div>
          </dl>
        </div>

        {/* Financial */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-neutral-500 uppercase tracking-wider">
            Financial
          </h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-neutral-500">Project Value</dt>
              <dd className="text-brand-black font-medium">
                {formatCurrency(trackerInfo?.totalValue ?? null)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-500">Invoice Status</dt>
              <dd>
                {trackerInfo?.invoiceStatus ? (
                  <StatusBadge status={trackerInfo.invoiceStatus} />
                ) : (
                  <span className="text-neutral-400">--</span>
                )}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-500">PO Number</dt>
              <dd className="text-brand-black font-medium">
                {trackerInfo?.poNumber || "--"}
              </dd>
            </div>
            {totalQuoteValue > 0 && (
              <div className="flex justify-between">
                <dt className="text-neutral-500">Quotes Total</dt>
                <dd className="text-brand-black font-medium">
                  {formatCurrency(totalQuoteValue)}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Client Info */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-neutral-500 uppercase tracking-wider">
            Client
          </h3>
          <dl className="space-y-2 text-sm">
            {client ? (
              <>
                <div className="flex justify-between">
                  <dt className="text-neutral-500">Industry</dt>
                  <dd className="text-brand-black font-medium capitalize">
                    {client.industry}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neutral-500">Contact</dt>
                  <dd className="text-brand-black font-medium">
                    {client.primaryContactName || "--"}
                  </dd>
                </div>
                {client.primaryContactEmail && (
                  <div className="flex justify-between">
                    <dt className="text-neutral-500">Email</dt>
                    <dd className="text-brand-black font-medium truncate max-w-[180px]">
                      {client.primaryContactEmail}
                    </dd>
                  </div>
                )}
              </>
            ) : (
              <p className="text-neutral-400 text-sm">
                No client record in database.
              </p>
            )}
          </dl>
        </div>
      </div>
    </section>
  );
}

// ─── Section: Agent Outputs ─────────────────────────────────────────────────

function AgentOutputsSection({ outputs }: { outputs: AgentOutput[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (outputs.length === 0) return <EmptyState label="AI outputs" />;

  // Group by agent type
  const grouped = outputs.reduce<Record<string, AgentOutput[]>>((acc, o) => {
    const key = o.agentType;
    if (!acc[key]) acc[key] = [];
    acc[key].push(o);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([agentType, items]) => (
        <div key={agentType}>
          <h3 className="text-sm font-semibold text-neutral-600 mb-2 flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded bg-brand-black text-white text-xs font-medium">
              {AGENT_LABELS[agentType] ?? agentType}
            </span>
            <span className="text-neutral-400 text-xs">{items.length} output{items.length > 1 ? "s" : ""}</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {items.map((output) => (
              <div
                key={output.id}
                className="border border-neutral-200 rounded-lg p-4 hover:border-neutral-300 transition-colors cursor-pointer"
                onClick={() =>
                  setExpandedId(expandedId === output.id ? null : output.id)
                }
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <StatusBadge status={output.status} />
                  <span className="text-xs text-neutral-400">
                    {formatDate(output.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-neutral-600 line-clamp-2">
                  {getOutputPreview(output)}
                </p>

                {expandedId === output.id && output.outputContent && (
                  <div className="mt-3 pt-3 border-t border-neutral-100">
                    <pre className="text-xs text-neutral-600 whitespace-pre-wrap max-h-60 overflow-y-auto bg-neutral-50 rounded p-3">
                      {output.outputContent.slice(0, 2000)}
                      {output.outputContent.length > 2000 && "\n\n... (truncated)"}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Section: Preview Links ─────────────────────────────────────────────────

function PreviewLinksSection({
  previews,
}: {
  previews: ProjectPreviewItem[];
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (previews.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-neutral-400">
        No link generated yet.{" "}
        <span className="text-neutral-500">
          Use &quot;Share Preview&quot; from the Tracker to create one.
        </span>
      </div>
    );
  }

  const handleCopy = async (preview: ProjectPreviewItem) => {
    const url = `${window.location.origin}/project/${preview.clientSlug}/${preview.projectSlug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(preview.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback — ignore
    }
  };

  return (
    <div className="space-y-3">
      {previews.map((preview, idx) => {
        const url = `/project/${preview.clientSlug}/${preview.projectSlug}`;
        const isLatest = idx === 0;
        const date = new Date(preview.createdAt).toLocaleDateString("en-GB", {
          day: "numeric", month: "short", year: "numeric",
        });
        return (
          <div
            key={preview.id}
            className="flex items-center justify-between gap-4 border border-neutral-200 rounded-lg p-4"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xs font-bold text-neutral-400 w-6 shrink-0">
                V{preview.version ?? 1}
              </span>
              <span
                className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${
                  preview.isActive ? "bg-green-500" : "bg-neutral-300"
                }`}
              />
              <div className="min-w-0">
                <code className="text-sm text-neutral-600 truncate block">{url}</code>
                <span className="text-xs text-neutral-400">{date}</span>
              </div>
              {isLatest && (
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-brand-cerulean/10 text-brand-cerulean shrink-0">
                  Latest
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => handleCopy(preview)}
                className="px-3 py-1.5 text-xs font-medium border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
              >
                {copiedId === preview.id ? "Copied!" : "Copy"}
              </button>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 text-xs font-medium bg-brand-black text-white rounded-lg hover:bg-neutral-800 transition-colors"
              >
                Open
              </a>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Section: Related Items ─────────────────────────────────────────────────

function RelatedSection({
  caseStudies,
  landingPages,
  storyboards,
  quotes,
}: {
  caseStudies: CaseStudyCandidate[];
  landingPages: LandingPageItem[];
  storyboards: StoryboardItem[];
  quotes: QuoteItem[];
}) {
  const hasAnything =
    caseStudies.length > 0 ||
    landingPages.length > 0 ||
    storyboards.length > 0 ||
    quotes.length > 0;

  if (!hasAnything) return <EmptyState label="related items" />;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Case Studies */}
      {caseStudies.length > 0 && (
        <div className="border border-neutral-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-neutral-600 mb-3 flex items-center gap-2">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
            Case Studies
            <span className="text-neutral-400 text-xs">({caseStudies.length})</span>
          </h3>
          <div className="space-y-2">
            {caseStudies.map((cs) => (
              <Link
                key={cs.id}
                href="/admin/agents/case-studies"
                className="flex items-center justify-between p-2 rounded hover:bg-neutral-50 transition-colors"
              >
                <span className="text-sm text-brand-black truncate">
                  {cs.projectName || cs.clientName}
                </span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <StatusBadge status={cs.status} />
                  <span className="text-xs text-neutral-400">
                    Score: {cs.scoreTotal}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Landing Pages */}
      {landingPages.length > 0 && (
        <div className="border border-neutral-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-neutral-600 mb-3 flex items-center gap-2">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            Landing Pages
            <span className="text-neutral-400 text-xs">({landingPages.length})</span>
          </h3>
          <div className="space-y-2">
            {landingPages.map((lp) => (
              <Link
                key={lp.id}
                href={`/admin/landing-pages`}
                className="flex items-center justify-between p-2 rounded hover:bg-neutral-50 transition-colors"
              >
                <span className="text-sm text-brand-black truncate">
                  {lp.title}
                </span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <StatusBadge status={lp.status} />
                  <span className="text-xs text-neutral-400 uppercase">
                    {lp.language}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Storyboards */}
      {storyboards.length > 0 && (
        <div className="border border-neutral-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-neutral-600 mb-3 flex items-center gap-2">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" /><line x1="7" y1="2" x2="7" y2="22" /><line x1="17" y1="2" x2="17" y2="22" /><line x1="2" y1="12" x2="22" y2="12" />
            </svg>
            Storyboards
            <span className="text-neutral-400 text-xs">({storyboards.length})</span>
          </h3>
          <div className="space-y-2">
            {storyboards.map((sb) => (
              <Link
                key={sb.id}
                href={`/admin/storyboards`}
                className="flex items-center justify-between p-2 rounded hover:bg-neutral-50 transition-colors"
              >
                <span className="text-sm text-brand-black truncate">
                  {sb.title}
                </span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <StatusBadge status={sb.status} />
                  <span className="text-xs text-neutral-400">
                    {sb.sceneCount} scene{sb.sceneCount !== 1 ? "s" : ""}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quotes */}
      {quotes.length > 0 && (
        <div className="border border-neutral-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-neutral-600 mb-3 flex items-center gap-2">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z" /><line x1="8" y1="7" x2="16" y2="7" /><line x1="8" y1="11" x2="16" y2="11" /><line x1="8" y1="15" x2="12" y2="15" />
            </svg>
            Quotes
            <span className="text-neutral-400 text-xs">({quotes.length})</span>
          </h3>
          <div className="space-y-2">
            {quotes.map((q) => (
              <Link
                key={q.id}
                href="/admin/quotes"
                className="flex items-center justify-between p-2 rounded hover:bg-neutral-50 transition-colors"
              >
                <span className="text-sm text-brand-black font-mono">
                  {q.quoteNumber}
                </span>
                <span className="text-sm text-neutral-600 font-medium">
                  {formatCurrency(q.total, q.currency)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function ProjectViewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const rawId = params.id as string;
  // Decode the composite ID (may be URL-encoded from the route param).
  // Use try/catch to handle values that are already decoded or have invalid encoding.
  let id: string;
  try {
    id = decodeURIComponent(rawId);
  } catch {
    id = rawId;
  }

  const [data, setData] = useState<ProjectDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // Tracker info is passed via query params (optional enrichment)
  const trackerInfo: TrackerInfo | null = (() => {
    const client = searchParams.get("client");
    const project = searchParams.get("project");
    if (!client) return null;
    return {
      client,
      project: project || "",
      status: searchParams.get("status") || "",
      totalValue: searchParams.get("value")
        ? parseFloat(searchParams.get("value")!)
        : null,
      date: searchParams.get("date") || "",
      invoiceStatus: searchParams.get("invoice") || "",
      poNumber: searchParams.get("po") || "",
      sharepointLink: searchParams.get("sharepoint") || "",
      clickupTaskUrl: searchParams.get("clickup") || "",
    };
  })();

  // Derive client and project names from either query params or composite ID
  // id is already decoded above via decodeURIComponent(rawId)
  const clientName = trackerInfo?.client || id.split("::")[0] || "";
  const projectName =
    trackerInfo?.project ||
    id.split("::").slice(1).join("::") ||
    "";

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = new URL(
        `/api/admin/projects/${encodeURIComponent(id)}/details`,
        window.location.origin
      );
      if (trackerInfo) {
        url.searchParams.set("client", trackerInfo.client);
        if (trackerInfo.project) {
          url.searchParams.set("project", trackerInfo.project);
        }
      }

      const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || `HTTP ${res.status}`);
      }
      const json: ProjectDetails = await res.json();
      setData(json);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load project details."
      );
    } finally {
      setLoading(false);
    }
  }, [id, trackerInfo?.client, trackerInfo?.project]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Loading State ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <SkeletonBlock className="h-4 w-24" />
        </div>
        <div className="space-y-2">
          <SkeletonBlock className="h-8 w-64" />
          <SkeletonBlock className="h-5 w-40" />
        </div>
        <SectionSkeleton />
        <SectionSkeleton />
        <SectionSkeleton />
      </div>
    );
  }

  // ─── Error State ────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <BackToTrackerLink className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-brand-black transition-colors mb-6" />
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-700 font-medium mb-2">
            Failed to load project details
          </p>
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 text-sm font-medium bg-brand-black text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  const displayClient = data?.client?.name || clientName;
  const displayProject = data?.projectName || projectName;

  const outputCount = data?.agentOutputs.length ?? 0;
  const relatedCount =
    (data?.caseStudyCandidates.length ?? 0) +
    (data?.landingPages.length ?? 0) +
    (data?.storyboards.length ?? 0) +
    (data?.quotes.length ?? 0);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div>
        <BackToTrackerLink className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-brand-black transition-colors mb-4" />

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-flame uppercase tracking-wider mb-1">
              {displayClient}
            </p>
            <h1 className="text-2xl font-bold text-brand-black">
              {displayProject || "Untitled Project"}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {trackerInfo?.status && (
                <StatusBadge
                  status={trackerInfo.status}
                  styleMap={TRACKER_STATUS_STYLES}
                />
              )}
              {trackerInfo?.totalValue !== null &&
                trackerInfo?.totalValue !== undefined && (
                  <span className="text-sm font-medium text-neutral-600">
                    {formatCurrency(trackerInfo.totalValue)}
                  </span>
                )}
              {trackerInfo?.date && (
                <span className="text-sm text-neutral-400">
                  {formatDate(trackerInfo.date)}
                </span>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {trackerInfo?.clickupTaskUrl && (
              <a
                href={trackerInfo.clickupTaskUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                Open in ClickUp
              </a>
            )}
            {trackerInfo?.sharepointLink && (
              <a
                href={trackerInfo.sharepointLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                Open SharePoint
              </a>
            )}
            <Link
              href={`/admin/quotes?client=${encodeURIComponent(clientName)}&project=${encodeURIComponent(projectName)}&amount=${trackerInfo?.totalValue ?? ""}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z" /><line x1="8" y1="7" x2="16" y2="7" /><line x1="8" y1="11" x2="16" y2="11" />
              </svg>
              Generate Quote
            </Link>
          </div>
        </div>
      </div>

      {/* ─── Section 1: Overview ─────────────────────────────────────────── */}
      <OverviewSection
        trackerInfo={trackerInfo}
        client={data?.client ?? null}
        quotes={data?.quotes ?? []}
      />

      {/* ─── Section 2: AI Outputs — hidden when empty ────────────────── */}
      {outputCount > 0 && (
        <section className="bg-white border border-neutral-200 rounded-lg p-6">
          <h2 className="text-base font-semibold text-brand-black mb-4 flex items-center gap-2">
            Deliverables / AI Outputs
            <span className="text-xs font-normal text-neutral-400">
              ({outputCount})
            </span>
          </h2>
          <AgentOutputsSection outputs={data?.agentOutputs ?? []} />
        </section>
      )}

      {/* ─── Section 3: Project Links ────────────────────────────────────── */}
      <section className="bg-white border border-neutral-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-brand-black">
            Project Link
          </h2>
          {trackerInfo?.client && (
            <button
              onClick={() => setShareModalOpen(true)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-brand-black text-white hover:bg-neutral-800 transition-colors inline-flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>
              Create Link
            </button>
          )}
        </div>
        <PreviewLinksSection previews={data?.projectPreviews ?? []} />
      </section>

      {/* ─── Section 4: Related ──────────────────────────────────────────── */}
      <section className="bg-white border border-neutral-200 rounded-lg p-6">
        <h2 className="text-base font-semibold text-brand-black mb-4 flex items-center gap-2">
          Related
          {relatedCount > 0 && (
            <span className="text-xs font-normal text-neutral-400">
              ({relatedCount})
            </span>
          )}
        </h2>
        <RelatedSection
          caseStudies={data?.caseStudyCandidates ?? []}
          landingPages={data?.landingPages ?? []}
          storyboards={data?.storyboards ?? []}
          quotes={data?.quotes ?? []}
        />
      </section>

      {/* Share folder modal for creating project links */}
      {trackerInfo?.client && (
        <ShareFolderModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          clientName={trackerInfo.client}
          projectName={trackerInfo.project}
          sharepointLink={trackerInfo.sharepointLink}
          clickupTaskUrl={trackerInfo.clickupTaskUrl}
        />
      )}
    </div>
  );
}
