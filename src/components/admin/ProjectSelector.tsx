"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type { TrackerProject, TrackerResponse } from "@/types/integrations";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SelectedProject {
  /** The full ClickUp task URL (e.g. https://app.clickup.com/t/86xxx) */
  clickupTaskUrl: string;
  /** Just the task ID extracted from the URL (e.g. 86xxx) */
  clickupTaskId: string;
  /** Display label: "Client — Project Name" */
  label: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const TRACKER_CACHE_KEY = "tracker-cache";

/**
 * Extract the ClickUp task ID from a URL like https://app.clickup.com/t/86xxxx
 * or from a URL containing /t/ segment.
 */
function extractTaskId(url: string): string {
  if (!url) return "";
  // Try to match /t/{taskId} pattern
  const match = url.match(/\/t\/([a-zA-Z0-9]+)/);
  if (match) return match[1];
  // Fallback: use the last URL segment
  const segments = url.split("/").filter(Boolean);
  return segments[segments.length - 1] || "";
}

/**
 * Load tracker projects from localStorage cache (instant) and optionally
 * fetch fresh data in the background.
 */
function useTrackerProjects() {
  const [projects, setProjects] = useState<TrackerProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Try localStorage cache first (instant)
    try {
      const cached = localStorage.getItem(TRACKER_CACHE_KEY);
      if (cached) {
        const parsed: TrackerResponse = JSON.parse(cached);
        setProjects(parsed.projects);
        setLoading(false);
        return;
      }
    } catch {
      // ignore
    }

    // 2. No cache — fetch from API
    async function fetchProjects() {
      try {
        const res = await fetch("/api/admin/integrations/tracker");
        if (res.ok) {
          const data: TrackerResponse = await res.json();
          setProjects(data.projects);
          // Also cache for future use
          try {
            localStorage.setItem(TRACKER_CACHE_KEY, JSON.stringify(data));
          } catch {
            // quota exceeded — ignore
          }
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }

    fetchProjects();
  }, []);

  return { projects, loading };
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ProjectSelector({
  value,
  onChange,
  clientName,
}: {
  /** Currently selected clickupTaskUrl (empty string = none) */
  value: string;
  /** Called when user selects/deselects a project */
  onChange: (project: SelectedProject | null) => void;
  /** Optional: pre-filter projects to this client name */
  clientName?: string;
}) {
  const { projects, loading } = useTrackerProjects();
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Only show projects that have a ClickUp task URL (otherwise we can't link them)
  const eligibleProjects = useMemo(() => {
    return projects.filter((p) => p.clickupTaskUrl);
  }, [projects]);

  // Filter by search and optionally by client name
  const filtered = useMemo(() => {
    let result = eligibleProjects;

    // Pre-filter by client name if provided
    if (clientName) {
      const lower = clientName.toLowerCase();
      result = result.filter(
        (p) =>
          p.client.toLowerCase().includes(lower) ||
          (p.displayClient ?? "").toLowerCase().includes(lower)
      );
    }

    // Then filter by search query
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.project.toLowerCase().includes(q) ||
          p.client.toLowerCase().includes(q) ||
          (p.displayClient ?? "").toLowerCase().includes(q)
      );
    }

    return result.slice(0, 50); // Cap at 50 results for performance
  }, [eligibleProjects, clientName, search]);

  // Find currently selected project
  const selectedProject = useMemo(() => {
    if (!value) return null;
    return eligibleProjects.find((p) => p.clickupTaskUrl === value) ?? null;
  }, [eligibleProjects, value]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = useCallback(
    (project: TrackerProject) => {
      const taskId = extractTaskId(project.clickupTaskUrl);
      onChange({
        clickupTaskUrl: project.clickupTaskUrl,
        clickupTaskId: taskId,
        label: `${project.displayClient ?? project.client} — ${project.project}`,
      });
      setIsOpen(false);
      setSearch("");
    },
    [onChange]
  );

  const handleClear = useCallback(() => {
    onChange(null);
    setSearch("");
  }, [onChange]);

  if (loading) {
    return (
      <div className="text-sm text-neutral-400 py-2">
        Loading tracker projects...
      </div>
    );
  }

  if (eligibleProjects.length === 0) {
    return (
      <div className="text-sm text-neutral-400 py-2">
        No tracker projects available to link.
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Selected state */}
      {selectedProject && !isOpen ? (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-brand-cerulean bg-brand-cerulean/5">
          <svg
            className="w-4 h-4 text-brand-cerulean shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          <span className="text-sm text-brand-black flex-1 truncate">
            {selectedProject.displayClient ?? selectedProject.client} —{" "}
            {selectedProject.project}
          </span>
          <span className="text-xs text-neutral-400">
            {selectedProject.status}
          </span>
          <button
            type="button"
            onClick={handleClear}
            className="text-neutral-400 hover:text-neutral-600 transition-colors"
            aria-label="Remove project link"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      ) : (
        <>
          {/* Search input */}
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search tracker projects to link..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
            />
          </div>

          {/* Dropdown */}
          {isOpen && (
            <div className="absolute z-50 mt-1 w-full bg-white border border-neutral-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="px-4 py-3 text-sm text-neutral-400">
                  No matching projects found.
                </div>
              ) : (
                filtered.map((p, i) => {
                  const key = `${p.clickupTaskUrl}-${i}`;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleSelect(p)}
                      className="w-full text-left px-4 py-2.5 hover:bg-neutral-50 transition-colors border-b border-neutral-100 last:border-b-0"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-sm font-medium text-brand-black truncate block">
                            {p.displayClient ?? p.client}
                          </span>
                          <span className="text-xs text-neutral-500 truncate block">
                            {p.project}
                          </span>
                        </div>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${getStatusColor(p.status)}`}
                        >
                          {p.status}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function getStatusColor(status: string): string {
  const lower = status.toLowerCase();
  if (lower === "open") return "bg-neutral-200 text-neutral-600";
  if (lower === "in progress") return "bg-blue-100 text-blue-700";
  if (lower === "review") return "bg-amber-100 text-amber-700";
  if (lower === "closed" || lower === "delivered")
    return "bg-green-100 text-green-700";
  return "bg-neutral-200 text-neutral-600";
}
