import { db } from "@/lib/db";
import { clients, agentOutputs } from "@/lib/db/schema";
import { sql, eq, desc, gte } from "drizzle-orm";
import Link from "next/link";

export const dynamic = "force-dynamic";

// Agent type labels for display
const AGENT_TYPE_LABELS: Record<string, string> = {
  pm: "Project Manager",
  translator: "Translator",
  "email-drafter": "Email Drafter",
  "video-script": "Video Script",
  creative: "Creative",
  designer: "Designer",
  legal: "Legal",
  social: "Social",
  seo: "SEO",
  copywriter: "Copywriter",
  proposal: "Proposal",
  presentation: "Presentation",
  proofreader: "Proofreader",
};

function getAgentLabel(agentType: string): string {
  return AGENT_TYPE_LABELS[agentType] ?? agentType;
}

function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function AdminDashboardPage() {
  // Start of the current week (Monday)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - mondayOffset);
  weekStart.setHours(0, 0, 0, 0);

  // Run all queries in parallel
  const [
    totalClientsResult,
    activeClientsResult,
    totalOutputsResult,
    outputsThisWeekResult,
    recentOutputs,
  ] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(clients)
      .then((r) => Number(r[0]?.count ?? 0)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(clients)
      .where(eq(clients.status, "active"))
      .then((r) => Number(r[0]?.count ?? 0)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(agentOutputs)
      .then((r) => Number(r[0]?.count ?? 0)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(agentOutputs)
      .where(gte(agentOutputs.createdAt, weekStart))
      .then((r) => Number(r[0]?.count ?? 0)),
    db
      .select({
        id: agentOutputs.id,
        agentType: agentOutputs.agentType,
        status: agentOutputs.status,
        createdAt: agentOutputs.createdAt,
        clientName: clients.name,
        clientId: agentOutputs.clientId,
      })
      .from(agentOutputs)
      .leftJoin(clients, eq(agentOutputs.clientId, clients.id))
      .orderBy(desc(agentOutputs.createdAt))
      .limit(10),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-brand-black">Dashboard</h1>
        <p className="text-neutral-500 text-sm mt-1">
          Overview of your clients and agent activity
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Clients" value={totalClientsResult} />
        <StatCard label="Active Clients" value={activeClientsResult} />
        <StatCard label="Total Outputs" value={totalOutputsResult} />
        <StatCard label="Outputs This Week" value={outputsThisWeekResult} />
      </div>

      {/* Project Tracker CTA */}
      <Link
        href="/admin/tracker"
        className="block rounded-xl border border-neutral-300 bg-white p-5 hover:border-brand-cerulean hover:shadow-sm transition-all group"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-brand-black group-hover:text-brand-cerulean transition-colors">
              Project Tracker
            </h2>
            <p className="text-neutral-500 text-sm mt-0.5">
              Unified view across ClickUp, SharePoint &amp; Evoliz
            </p>
          </div>
          <svg className="w-5 h-5 text-neutral-400 group-hover:text-brand-cerulean transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </Link>

      {/* Quote Generator CTA */}
      <Link
        href="/admin/quotes"
        className="block rounded-xl border border-neutral-300 bg-white p-5 hover:border-brand-cerulean hover:shadow-sm transition-all group"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-brand-black group-hover:text-brand-cerulean transition-colors">
              Quote Generator
            </h2>
            <p className="text-neutral-500 text-sm mt-0.5">
              Create professional PDF quotes and upload to SharePoint
            </p>
          </div>
          <svg className="w-5 h-5 text-neutral-400 group-hover:text-brand-cerulean transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </Link>

      {/* Quick Actions — All agents */}
      <div>
        <h2 className="text-lg font-semibold text-brand-black mb-3">
          Agents
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <QuickActionCard
            label="Quick Brief"
            href="/admin/quick-brief"
            description="Paste & analyze"
          />
          <QuickActionCard
            label="Project Manager"
            href="/admin/agents/pm"
            description="Dispatch tasks"
          />
          <QuickActionCard
            label="Translator"
            href="/admin/agents/translator"
            description="Translate content"
          />
          <QuickActionCard
            label="Copywriter"
            href="/admin/agents/copywriter"
            description="Write copy"
          />
          <QuickActionCard
            label="Creative"
            href="/admin/agents/creative"
            description="Strategy & brief"
          />
          <QuickActionCard
            label="Designer"
            href="/admin/agents/designer"
            description="Generate visuals"
          />
          <QuickActionCard
            label="SEO"
            href="/admin/agents/seo"
            description="Optimize content"
          />
          <QuickActionCard
            label="Social"
            href="/admin/agents/social"
            description="Social posts"
          />
          <QuickActionCard
            label="Email Drafter"
            href="/admin/agents/email-drafter"
            description="Draft emails"
          />
          <QuickActionCard
            label="Video Script"
            href="/admin/agents/video-script"
            description="Generate scripts"
          />
          <QuickActionCard
            label="Proposal"
            href="/admin/agents/proposal"
            description="Write proposals"
          />
          <QuickActionCard
            label="Presentation"
            href="/admin/agents/presentation"
            description="Build decks"
          />
          <QuickActionCard
            label="Legal"
            href="/admin/agents/legal"
            description="Draft contracts"
          />
          <QuickActionCard
            label="Proofreader"
            href="/admin/agents/proofreader"
            description="Review & correct"
          />
        </div>
      </div>

      {/* Recent Outputs */}
      <div className="bg-white rounded-xl border border-neutral-300 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-brand-black">
            Recent Outputs
          </h2>
          <Link
            href="/admin/projects"
            className="text-sm text-brand-cerulean hover:underline"
          >
            View all outputs
          </Link>
        </div>

        {recentOutputs.length === 0 ? (
          <p className="text-neutral-400 text-sm py-8 text-center">
            No agent outputs yet. Create a client and run an agent to get
            started.
          </p>
        ) : (
          <div className="divide-y divide-neutral-200">
            {recentOutputs.map((output) => (
              <div
                key={output.id}
                className="flex items-center justify-between py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <AgentTypeBadge agentType={output.agentType} />
                  <div className="min-w-0">
                    {output.clientId ? (
                      <Link
                        href={`/admin/clients/${output.clientId}`}
                        className="text-sm font-medium text-brand-black hover:text-brand-cerulean transition-colors"
                      >
                        {output.clientName ?? "Unknown"}
                      </Link>
                    ) : (
                      <span className="text-sm font-medium text-neutral-400">
                        No client
                      </span>
                    )}
                    <p className="text-xs text-neutral-400">
                      {getAgentLabel(output.agentType)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-neutral-400">
                    {formatRelativeDate(output.createdAt)}
                  </span>
                  <StatusBadge status={output.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-xl border border-neutral-300 p-5">
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="text-3xl font-bold text-brand-black mt-1">{value}</p>
    </div>
  );
}

function QuickActionCard({
  label,
  href,
  description,
}: {
  label: string;
  href: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="bg-white rounded-xl border border-neutral-300 p-4 hover:border-brand-cerulean hover:shadow-sm transition-all group"
    >
      <p className="text-sm font-semibold text-brand-black group-hover:text-brand-cerulean transition-colors">
        {label}
      </p>
      <p className="text-xs text-neutral-400 mt-0.5">{description}</p>
    </Link>
  );
}

function AgentTypeBadge({ agentType }: { agentType: string }) {
  const colors: Record<string, string> = {
    pm: "bg-purple-100 text-purple-700",
    translator: "bg-blue-100 text-blue-700",
    "email-drafter": "bg-amber-100 text-amber-700",
    "video-script": "bg-pink-100 text-pink-700",
    creative: "bg-orange-100 text-orange-700",
    designer: "bg-indigo-100 text-indigo-700",
    legal: "bg-slate-100 text-slate-700",
    social: "bg-cyan-100 text-cyan-700",
    seo: "bg-green-100 text-green-700",
    copywriter: "bg-rose-100 text-rose-700",
    proposal: "bg-teal-100 text-teal-700",
    proofreader: "bg-lime-100 text-lime-700",
  };

  const colorClass = colors[agentType] ?? "bg-neutral-100 text-neutral-600";
  const initials = agentType
    .split("-")
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div
      className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${colorClass}`}
    >
      {initials}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    done: "bg-success-light text-success",
    processing: "bg-info-light text-info",
    pending: "bg-warning-light text-warning-text",
    error: "bg-error-light text-error",
  };

  return (
    <span
      className={`text-xs font-medium px-2 py-1 rounded-full ${styles[status] ?? "bg-neutral-200 text-neutral-600"}`}
    >
      {status}
    </span>
  );
}
