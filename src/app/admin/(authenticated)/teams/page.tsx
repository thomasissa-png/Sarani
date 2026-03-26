"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { Client } from "@/lib/db/schema";

// ─── Types ──────────────────────────────────────────────────────────────────

type TeamStatus = "draft" | "in_progress" | "completed" | "archived";

type TeamListItem = {
  id: string;
  name: string;
  clientId: string;
  clientName: string;
  templateType: string | null;
  brief: string;
  status: TeamStatus;
  stepsCompleted: number;
  stepsTotal: number;
  createdAt: string;
  updatedAt: string;
};

// ─── Constants ──────────────────────────────────────────────────────────────

const STATUS_FILTERS = ["all", "draft", "in_progress", "completed", "archived"] as const;

const STATUS_LABELS: Record<string, string> = {
  all: "All",
  draft: "Draft",
  in_progress: "Active",
  completed: "Completed",
  archived: "Archived",
};

const STATUS_BADGE_CLASSES: Record<TeamStatus, string> = {
  draft: "bg-neutral-100 text-neutral-500",
  in_progress: "bg-sky-50 text-brand-cerulean",
  completed: "bg-green-50 text-green-600",
  archived: "bg-neutral-100 text-neutral-400",
};

const TEMPLATE_LABELS: Record<string, string> = {
  social_media: "Social Media",
  seo_content: "SEO Content",
  brand_identity: "Brand Identity",
  video: "Video Production",
  translation: "Translation",
  ad_campaign: "Ad Campaign",
  custom: "Custom",
};

// ─── Page Component ─────────────────────────────────────────────────────────

export default function TeamsListPage() {
  const [teams, setTeams] = useState<TeamListItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");

  const fetchTeams = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (clientFilter !== "all") params.set("clientId", clientFilter);

      const res = await fetch(`/api/admin/teams?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTeams(data);
      }
    } catch (err) {
      console.error("Failed to fetch teams:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, clientFilter]);

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/clients");
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch (err) {
      console.error("Failed to fetch clients:", err);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-black">
            AI Project Teams
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            Coordinate multiple AI agents on client projects
          </p>
        </div>
        <Link
          href="/admin/teams/new"
          className="px-4 py-2 bg-brand-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors"
        >
          + New Team
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1 bg-white border border-neutral-300 rounded-lg p-1">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                statusFilter === s
                  ? "bg-brand-black text-white"
                  : "text-neutral-500 hover:text-brand-black"
              }`}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
        <select
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          className="px-4 py-2 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
        >
          <option value="all">All clients</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-neutral-300 border-t-brand-cerulean rounded-full animate-spin" />
        </div>
      ) : teams.length === 0 ? (
        <div className="bg-white border border-neutral-300 rounded-xl p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-6 h-6 text-neutral-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="19" cy="7" r="2.5" />
              <path d="M22 17.5a3 3 0 0 0-3-3h-.5" />
              <circle cx="5" cy="7" r="2.5" />
              <path d="M2 17.5a3 3 0 0 1 3-3h.5" />
            </svg>
          </div>
          <p className="text-neutral-600 font-medium">No teams yet.</p>
          <p className="text-neutral-400 text-sm mt-1">
            Create your first AI team to get started.
          </p>
          <Link
            href="/admin/teams/new"
            className="inline-block mt-4 px-4 py-2 bg-brand-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors"
          >
            + New Team
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {teams.map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Team Card ──────────────────────────────────────────────────────────────

function TeamCard({ team }: { team: TeamListItem }) {
  const progressPercent =
    team.stepsTotal > 0
      ? Math.round((team.stepsCompleted / team.stepsTotal) * 100)
      : 0;

  return (
    <Link
      href={`/admin/teams/${team.id}`}
      className="bg-white border border-neutral-300 rounded-xl p-5 hover:border-neutral-400 hover:shadow-sm transition-all group"
    >
      {/* Top row: name + status */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-semibold text-brand-black group-hover:text-brand-cerulean transition-colors line-clamp-1">
          {team.name}
        </h3>
        <span
          className={`shrink-0 px-2 py-0.5 text-xs font-medium rounded-full ${
            STATUS_BADGE_CLASSES[team.status]
          }`}
        >
          {STATUS_LABELS[team.status] ?? team.status}
        </span>
      </div>

      {/* Client + template */}
      <div className="flex items-center gap-2 text-xs text-neutral-500 mb-4">
        <span>{team.clientName}</span>
        {team.templateType && (
          <>
            <span className="text-neutral-300">|</span>
            <span className="px-1.5 py-0.5 bg-neutral-100 rounded text-neutral-500">
              {TEMPLATE_LABELS[team.templateType] ?? team.templateType}
            </span>
          </>
        )}
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-neutral-500">
          <span>Progress</span>
          <span>
            {team.stepsCompleted}/{team.stepsTotal} steps
          </span>
        </div>
        <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-cerulean rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </Link>
  );
}
