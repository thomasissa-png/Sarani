"use client";

// Client Component — Arya supervision dashboard with live stats and learnings.

import { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

interface AryaLearning {
  id: string;
  pmName: string;
  itemType: string;
  category: string;
  diffSummary: string;
  promoted: boolean;
  createdAt: string;
}

interface InboxStats {
  pending: number;
  processedToday: number;
}

// ─── Agent list ─────────────────────────────────────────────────────────────

const AGENTS = [
  { label: "Agent Teams", href: "/admin/teams", description: "Orchestrate multi-agent workflows" },
  { label: "Storyboards", href: "/admin/storyboards", description: "Visual story planning" },
  { label: "Translator", href: "/admin/agents/translator", description: "Multi-language translation" },
  { label: "Art Direction", href: "/admin/agents/creative", description: "Creative strategy & briefs" },
  { label: "Copywriter", href: "/admin/agents/copywriter", description: "Write compelling copy" },
  { label: "Designer", href: "/admin/agents/designer", description: "Generate visual assets" },
  { label: "Legal", href: "/admin/agents/legal", description: "Draft contracts & NDAs" },
  { label: "Video Script", href: "/admin/agents/video-script", description: "Script generation" },
  { label: "Proposals & Decks", href: "/admin/agents/proposal", description: "Client proposals" },
  { label: "SEO", href: "/admin/agents/seo", description: "Search optimization" },
  { label: "Social", href: "/admin/agents/social", description: "Social media content" },
  { label: "Case Studies", href: "/admin/agents/case-studies", description: "Portfolio showcases" },
  { label: "Proofreader", href: "/admin/agents/proofreader", description: "Review & correct" },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  ton: "bg-purple-100 text-purple-700",
  contenu: "bg-blue-100 text-blue-700",
  structure: "bg-amber-100 text-amber-700",
  pricing: "bg-green-100 text-green-700",
  missing_info: "bg-red-100 text-red-700",
};

function formatRelativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function AryaSupervisionPage() {
  const [learnings, setLearnings] = useState<AryaLearning[]>([]);
  const [stats, setStats] = useState<InboxStats>({ pending: 0, processedToday: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      try {
        const [learningsRes, pendingRes, doneRes] = await Promise.all([
          fetch("/api/admin/arya/learnings?limit=5"),
          fetch("/api/admin/inbox?status=pending&limit=1"),
          fetch("/api/admin/inbox?status=done&limit=1"),
        ]);

        if (!mounted) return;

        if (learningsRes.ok) {
          const data = await learningsRes.json();
          setLearnings(data.learnings ?? []);
        }

        let pending = 0;
        let processed = 0;

        if (pendingRes.ok) {
          const data = await pendingRes.json();
          pending = data.count ?? 0;
        }
        if (doneRes.ok) {
          const data = await doneRes.json();
          processed = data.count ?? 0;
        }

        setStats({ pending, processedToday: processed });
      } catch {
        // Silently fail
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchData();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-brand-black">Arya Supervision</h1>
        <p className="text-neutral-500 text-sm mt-1">
          Monitor AI agent activity, learnings, and performance
        </p>
      </div>

      {/* Stats cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-neutral-300 p-5 animate-pulse">
              <div className="h-4 w-24 bg-neutral-200 rounded mb-2" />
              <div className="h-8 w-12 bg-neutral-200 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Inbox Pending" value={stats.pending} accent={stats.pending > 0} />
          <StatCard label="Processed (recent)" value={stats.processedToday} />
          <StatCard label="Total Learnings" value={learnings.length} />
        </div>
      )}

      {/* Recent Learnings */}
      <div className="bg-white rounded-xl border border-neutral-300 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-brand-black">
            Recent Learnings
          </h2>
          <Link
            href="/api/admin/arya/learnings"
            className="text-sm text-brand-cerulean hover:underline"
          >
            View all
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex gap-3 py-3 border-b border-neutral-100 last:border-0">
                <div className="h-5 w-16 bg-neutral-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-neutral-200 rounded" />
                  <div className="h-3 w-1/3 bg-neutral-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : learnings.length === 0 ? (
          <p className="text-neutral-400 text-sm py-8 text-center">
            No learnings recorded yet. Learnings are created when the PM edits Arya outputs.
          </p>
        ) : (
          <div className="divide-y divide-neutral-100">
            {learnings.map((learning) => (
              <div key={learning.id} className="py-3 space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-xs font-semibold px-2 py-0.5 rounded-full",
                      CATEGORY_COLORS[learning.category] ?? "bg-neutral-100 text-neutral-600"
                    )}
                  >
                    {learning.category}
                  </span>
                  <span className="text-xs text-neutral-400">
                    {learning.itemType}
                  </span>
                  <span className="text-xs text-neutral-400 ml-auto">
                    {formatRelativeTime(learning.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-neutral-600">{learning.diffSummary}</p>
                <p className="text-xs text-neutral-400">by {learning.pmName}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Agent Directory */}
      <div>
        <h2 className="text-lg font-semibold text-brand-black mb-3">
          AI Agents
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {AGENTS.map((agent) => (
            <Link
              key={agent.href}
              href={agent.href}
              className="bg-white rounded-xl border border-neutral-300 p-4 hover:border-brand-cerulean hover:shadow-sm transition-all group"
            >
              <p className="text-sm font-semibold text-brand-black group-hover:text-brand-cerulean transition-colors">
                {agent.label}
              </p>
              <p className="text-xs text-neutral-400 mt-0.5">
                {agent.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Stat Card ──────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-neutral-300 p-5">
      <p className="text-sm text-neutral-500">{label}</p>
      <p
        className={cn(
          "text-3xl font-bold mt-1",
          accent ? "text-brand-flame" : "text-brand-black"
        )}
      >
        {value}
      </p>
    </div>
  );
}
