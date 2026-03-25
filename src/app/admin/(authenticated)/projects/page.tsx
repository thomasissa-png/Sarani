"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

// ─── Types ──────────────────────────────────────────────────────────────────

type Project = {
  clientId: string | null;
  clientName: string;
  briefSummary: string;
  outputCount: number;
  agents: string[];
  statuses: {
    pending: number;
    processing: number;
    done: number;
    error: number;
  };
  overallStatus: "pending" | "processing" | "done" | "error";
  createdAt: string;
};

type ClientOption = {
  id: string;
  name: string;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

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
};

const STATUS_FILTERS = ["all", "pending", "processing", "done", "error"] as const;

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ─── Page Component ─────────────────────────────────────────────────────────

export default function ProjectsBoardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clientOptions, setClientOptions] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [agentFilter, setAgentFilter] = useState<string>("all");

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (clientFilter !== "all") params.set("clientId", clientFilter);
      if (agentFilter !== "all") params.set("agent", agentFilter);

      const res = await fetch(`/api/admin/projects?${params}`);
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects);
        setClientOptions(data.clients);
      }
    } catch (err) {
      console.error("Failed to fetch projects:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, clientFilter, agentFilter]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Collect unique agents across all projects for the agent filter
  const allAgents = [...new Set(projects.flatMap((p) => p.agents))].sort();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-black">Projects</h1>
          <p className="text-neutral-500 text-sm mt-1">
            All projects across clients and agents
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/quick-brief"
            className="px-4 py-2 bg-brand-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors"
          >
            + Quick Brief
          </Link>
          <Link
            href="/admin/agents/pm"
            className="px-4 py-2 bg-white border border-neutral-300 text-sm font-semibold rounded-lg hover:bg-neutral-100 transition-colors text-brand-black"
          >
            + Full Brief
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status filter */}
        <div className="flex gap-1 bg-white border border-neutral-300 rounded-lg p-1">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
                statusFilter === s
                  ? "bg-brand-black text-white"
                  : "text-neutral-500 hover:text-brand-black"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Client filter */}
        <select
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          className="px-3 py-2 text-xs font-medium rounded-lg border border-neutral-300 bg-white text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
        >
          <option value="all">All Clients</option>
          {clientOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Agent filter */}
        <select
          value={agentFilter}
          onChange={(e) => setAgentFilter(e.target.value)}
          className="px-3 py-2 text-xs font-medium rounded-lg border border-neutral-300 bg-white text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
        >
          <option value="all">All Agents</option>
          {allAgents.map((a) => (
            <option key={a} value={a}>
              {AGENT_LABELS[a] || a}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-neutral-300 overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-neutral-400 text-sm">
            Loading...
          </div>
        ) : projects.length === 0 ? (
          <div className="py-12 text-center text-neutral-400 text-sm">
            No projects found.{" "}
            <Link
              href="/admin/quick-brief"
              className="text-brand-cerulean hover:underline"
            >
              Create your first brief
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200 text-left">
                <th className="px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Brief
                </th>
                <th className="px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Agents
                </th>
                <th className="px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project, i) => (
                <tr
                  key={`${project.clientId}::${project.briefSummary}::${i}`}
                  className="border-b border-neutral-100 hover:bg-neutral-200/50 transition-colors"
                >
                  <td className="px-5 py-3.5">
                    <span className="text-sm font-medium text-brand-black">
                      {project.clientName}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-sm text-neutral-700 line-clamp-1">
                      {project.briefSummary}
                    </span>
                    <span className="text-xs text-neutral-400 ml-1">
                      ({project.outputCount} output
                      {project.outputCount !== 1 ? "s" : ""})
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-1 flex-wrap">
                      {project.agents.map((agent) => (
                        <span
                          key={agent}
                          className="text-xs font-medium bg-neutral-200 text-neutral-700 px-2 py-0.5 rounded"
                        >
                          {AGENT_LABELS[agent] || agent}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${
                        STATUS_STYLES[project.overallStatus] ||
                        STATUS_STYLES.pending
                      }`}
                    >
                      {project.overallStatus}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-neutral-500">
                    {formatDate(project.createdAt)}
                  </td>
                  <td className="px-5 py-3.5">
                    {project.clientId && (
                      <Link
                        href={`/admin/clients/${project.clientId}/outputs`}
                        className="text-xs font-medium text-brand-cerulean hover:underline"
                      >
                        View outputs
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
