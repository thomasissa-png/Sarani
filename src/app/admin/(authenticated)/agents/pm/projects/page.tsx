"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

// ─── Types ──────────────────────────────────────────────────────────────────

type ProjectTask = {
  id: string;
  agentType: string;
  title: string;
  status: string;
  createdAt: string;
};

type Project = {
  clientId: string;
  clientName: string;
  briefSummary: string;
  taskCount: number;
  agents: string[];
  statuses: {
    pending: number;
    processing: number;
    done: number;
    error: number;
  };
  overallStatus: "pending" | "processing" | "done" | "error";
  createdAt: string;
  tasks: ProjectTask[];
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

export default function PMProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedProject, setExpandedProject] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/admin/agents/pm/projects?${params}`);
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (err) {
      console.error("Failed to fetch projects:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  function toggleExpand(key: string) {
    setExpandedProject((prev) => (prev === key ? null : key));
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-black">
            Active Projects
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            Track dispatched tasks across all agents
          </p>
        </div>
        <Link
          href="/admin/agents/pm"
          className="px-4 py-2 bg-brand-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors"
        >
          + New Brief
        </Link>
      </div>

      {/* Status Filters */}
      <div className="flex gap-1 bg-white border border-neutral-300 rounded-lg p-1 w-fit">
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
              href="/admin/agents/pm"
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
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => {
                const key = `${project.clientId}::${project.briefSummary}`;
                const isExpanded = expandedProject === key;

                return (
                  <ProjectRow
                    key={key}
                    project={project}
                    isExpanded={isExpanded}
                    onToggle={() => toggleExpand(key)}
                  />
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Project Row ────────────────────────────────────────────────────────────

function ProjectRow({
  project,
  isExpanded,
  onToggle,
}: {
  project: Project;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        onClick={onToggle}
        className="border-b border-neutral-100 hover:bg-neutral-200/50 transition-colors cursor-pointer"
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
            ({project.taskCount} task{project.taskCount !== 1 ? "s" : ""})
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
              STATUS_STYLES[project.overallStatus] || STATUS_STYLES.pending
            }`}
          >
            {project.overallStatus}
          </span>
        </td>
        <td className="px-5 py-3.5 text-sm text-neutral-500">
          {formatDate(project.createdAt)}
        </td>
      </tr>

      {/* Expanded: task details */}
      {isExpanded && (
        <tr>
          <td colSpan={5} className="px-5 py-3 bg-neutral-100/50">
            <div className="space-y-2">
              {project.tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 text-sm"
                >
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
                      STATUS_STYLES[task.status] || STATUS_STYLES.pending
                    }`}
                  >
                    {task.status}
                  </span>
                  <span className="text-xs font-medium bg-neutral-200 text-neutral-600 px-2 py-0.5 rounded">
                    {AGENT_LABELS[task.agentType] || task.agentType}
                  </span>
                  <span className="text-neutral-700">{task.title}</span>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
