"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { Client } from "@/lib/db/schema";
import type { PMAnalysis, SuggestedTask } from "@/lib/validations/pm";
import { PRIORITY_OPTIONS } from "@/lib/validations/pm";

// ─── Types ──────────────────────────────────────────────────────────────────

type AnalyzeResponse = {
  analysis: PMAnalysis;
  usage: { inputTokens: number; outputTokens: number };
};

type FormState = {
  clientId: string;
  brief: string;
  deadline: string;
  priority: "normal" | "urgent" | "asap";
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function getDefaultDeadline(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

const AGENT_LABELS: Record<string, string> = {
  translator: "Translator",
  creative: "Creative Strategist",
  designer: "Designer IA",
  legal: "Legal IA",
  social: "Social IA",
  seo: "SEO IA",
};

const PRIORITY_LABELS: Record<string, string> = {
  normal: "Normal",
  urgent: "Urgent",
  asap: "ASAP",
};

const STATUS_ICONS: Record<string, { icon: string; color: string }> = {
  ok: { icon: "\u2713", color: "text-green-600" },
  warning: { icon: "!", color: "text-amber-600" },
  missing: { icon: "\u2717", color: "text-red-600" },
};

// ─── Page Component ─────────────────────────────────────────────────────────

export default function PMAgentPage() {
  // Clients data
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);

  // Form state
  const [form, setForm] = useState<FormState>({
    clientId: "",
    brief: "",
    deadline: getDefaultDeadline(),
    priority: "normal",
  });

  // Analysis state
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<PMAnalysis | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  // Dispatch state
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());
  const [dispatching, setDispatching] = useState(false);
  const [dispatchResult, setDispatchResult] = useState<{
    dispatched: number;
  } | null>(null);
  const [dispatchError, setDispatchError] = useState<string | null>(null);

  // ── Fetch clients ───────────────────────────────────────────────────────

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/clients?status=active");
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch (err) {
      console.error("Failed to fetch clients:", err);
    } finally {
      setLoadingClients(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // ── Analyze brief ─────────────────────────────────────────────────────

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    setAnalyzeError(null);
    setAnalysis(null);
    setDispatchResult(null);
    setDispatchError(null);
    setSelectedTasks(new Set());

    if (!form.clientId) {
      setAnalyzeError("Please select a client.");
      return;
    }
    if (form.brief.length < 20) {
      setAnalyzeError("Brief must be at least 20 characters.");
      return;
    }

    setAnalyzing(true);

    try {
      const res = await fetch("/api/admin/agents/pm/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: form.clientId,
          brief: form.brief,
          deadline: form.deadline || undefined,
          priority: form.priority,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Analysis failed");
      }

      const data: AnalyzeResponse = await res.json();
      setAnalysis(data.analysis);

      // Auto-select all tasks
      const allIndices = new Set(
        data.analysis.tasks.map((_: SuggestedTask, i: number) => i)
      );
      setSelectedTasks(allIndices);
    } catch (err) {
      setAnalyzeError(
        err instanceof Error ? err.message : "Failed to analyze brief"
      );
    } finally {
      setAnalyzing(false);
    }
  }

  // ── Dispatch tasks ────────────────────────────────────────────────────

  async function handleDispatch() {
    if (!analysis || selectedTasks.size === 0) return;

    setDispatching(true);
    setDispatchError(null);

    const tasksToDispatch = analysis.tasks
      .filter((_: SuggestedTask, i: number) => selectedTasks.has(i))
      .map((t: SuggestedTask) => ({
        title: t.title,
        agent: t.agent,
        description: t.description,
        complexity: t.complexity,
      }));

    try {
      const res = await fetch("/api/admin/agents/pm/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: form.clientId,
          briefSummary: analysis.briefSummary,
          deadline: form.deadline || undefined,
          priority: form.priority,
          tasks: tasksToDispatch,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Dispatch failed");
      }

      const data = await res.json();
      setDispatchResult({ dispatched: data.dispatched });
    } catch (err) {
      setDispatchError(
        err instanceof Error ? err.message : "Failed to dispatch tasks"
      );
    } finally {
      setDispatching(false);
    }
  }

  // ── Toggle task selection ─────────────────────────────────────────────

  function toggleTask(index: number) {
    setSelectedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-black">
            Project Manager IA
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            Analyze briefs, decompose into tasks, dispatch to agents
          </p>
        </div>
        <Link
          href="/admin/agents/pm/projects"
          className="px-4 py-2 bg-white border border-neutral-300 text-sm font-semibold rounded-lg hover:bg-neutral-100 transition-colors text-brand-black"
        >
          View Projects
        </Link>
      </div>

      {/* Brief Form */}
      <form
        onSubmit={handleAnalyze}
        className="bg-white rounded-xl border border-neutral-300 p-6 space-y-5"
      >
        <h2 className="text-lg font-semibold text-brand-black">New Brief</h2>

        {/* Client select */}
        <div>
          <label
            htmlFor="client"
            className="block text-sm font-medium text-neutral-700 mb-1.5"
          >
            Client
          </label>
          {loadingClients ? (
            <div className="text-sm text-neutral-400">Loading clients...</div>
          ) : (
            <div className="flex gap-2">
              <select
                id="client"
                value={form.clientId}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, clientId: e.target.value }))
                }
                className="flex-1 px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
              >
                <option value="">Select a client...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.industry})
                  </option>
                ))}
              </select>
              <Link
                href="/admin/clients/new"
                className="px-3 py-2.5 text-sm font-medium text-brand-cerulean border border-neutral-300 rounded-lg hover:bg-neutral-100 transition-colors whitespace-nowrap"
              >
                + New client
              </Link>
            </div>
          )}
        </div>

        {/* Brief textarea */}
        <div>
          <label
            htmlFor="brief"
            className="block text-sm font-medium text-neutral-700 mb-1.5"
          >
            Brief
          </label>
          <textarea
            id="brief"
            value={form.brief}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, brief: e.target.value }))
            }
            placeholder="Paste an email, describe the project, or write the brief..."
            rows={6}
            className="w-full px-4 py-3 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent resize-y"
          />
          <p className="text-xs text-neutral-400 mt-1">
            {form.brief.length} / 20 min characters
          </p>
        </div>

        {/* Deadline + Priority */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="deadline"
              className="block text-sm font-medium text-neutral-700 mb-1.5"
            >
              Deadline
            </label>
            <input
              id="deadline"
              type="date"
              value={form.deadline}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, deadline: e.target.value }))
              }
              className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
            />
          </div>
          <div>
            <label
              htmlFor="priority"
              className="block text-sm font-medium text-neutral-700 mb-1.5"
            >
              Priority
            </label>
            <select
              id="priority"
              value={form.priority}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  priority: e.target.value as FormState["priority"],
                }))
              }
              className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
            >
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Error */}
        {analyzeError && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {analyzeError}
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={analyzing}
            className="px-6 py-2.5 bg-brand-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {analyzing ? "Analyzing..." : "Analyze Brief"}
          </button>
        </div>
      </form>

      {/* Analysis Results */}
      {analysis && (
        <AnalysisResults
          analysis={analysis}
          selectedTasks={selectedTasks}
          onToggleTask={toggleTask}
          onDispatch={handleDispatch}
          dispatching={dispatching}
          dispatchResult={dispatchResult}
          dispatchError={dispatchError}
        />
      )}
    </div>
  );
}

// ─── Analysis Results Component ───────────────────────────────────────────

function AnalysisResults({
  analysis,
  selectedTasks,
  onToggleTask,
  onDispatch,
  dispatching,
  dispatchResult,
  dispatchError,
}: {
  analysis: PMAnalysis;
  selectedTasks: Set<number>;
  onToggleTask: (index: number) => void;
  onDispatch: () => void;
  dispatching: boolean;
  dispatchResult: { dispatched: number } | null;
  dispatchError: string | null;
}) {
  return (
    <div className="bg-white rounded-xl border border-neutral-300 p-6 space-y-5">
      <h2 className="text-lg font-semibold text-brand-black">
        Brief Analysis
      </h2>

      {/* Summary */}
      <div className="bg-neutral-100 rounded-lg px-4 py-3">
        <p className="text-sm font-medium text-neutral-700">
          {analysis.briefSummary}
        </p>
        <p className="text-xs text-neutral-500 mt-1">
          Detected language: {analysis.detectedLanguage}
        </p>
      </div>

      {/* Client Checks */}
      {analysis.clientChecks.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-neutral-700">
            Client Checks
          </h3>
          {analysis.clientChecks.map((check, i) => {
            const statusStyle = STATUS_ICONS[check.status] || STATUS_ICONS.ok;
            return (
              <div
                key={i}
                className="flex items-start gap-2 text-sm"
              >
                <span className={`font-bold ${statusStyle.color} w-5 text-center shrink-0`}>
                  {statusStyle.icon}
                </span>
                <div>
                  <span className="text-neutral-800">{check.label}</span>
                  {check.detail && (
                    <span className="text-neutral-500 ml-1">
                      -- {check.detail}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Missing Info */}
      {analysis.missingInfo.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-amber-700">
            Missing Information
          </h3>
          {analysis.missingInfo.map((info, i) => (
            <div
              key={i}
              className="flex items-start gap-2 text-sm bg-amber-50 border border-amber-200 rounded-lg px-3 py-2"
            >
              <span className="text-amber-600 font-bold shrink-0">!</span>
              <div>
                <span className="font-medium text-amber-800">
                  {info.field}
                </span>
                {info.blocking && (
                  <span className="ml-1.5 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">
                    blocking
                  </span>
                )}
                <p className="text-amber-700 mt-0.5">{info.suggestion}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tasks */}
      {analysis.tasks.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-neutral-700">
            Suggested Tasks ({analysis.tasks.length})
          </h3>
          {analysis.tasks.map((task, i) => (
            <label
              key={i}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedTasks.has(i)
                  ? "border-brand-cerulean bg-blue-50/50"
                  : "border-neutral-200 hover:border-neutral-300"
              }`}
            >
              <input
                type="checkbox"
                checked={selectedTasks.has(i)}
                onChange={() => onToggleTask(i)}
                className="mt-1 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium bg-neutral-200 text-neutral-700 px-2 py-0.5 rounded">
                    {AGENT_LABELS[task.agent] || task.agent}
                  </span>
                  <span className="text-sm font-medium text-brand-black">
                    {task.title}
                  </span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${
                      task.complexity === "high"
                        ? "bg-red-100 text-red-700"
                        : task.complexity === "medium"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-green-100 text-green-700"
                    }`}
                  >
                    {task.complexity}
                  </span>
                </div>
                <p className="text-sm text-neutral-600 mt-1">
                  {task.description}
                </p>
                <p className="text-xs text-neutral-400 mt-1">
                  ~{task.estimatedMinutes} min
                </p>
              </div>
            </label>
          ))}
        </div>
      )}

      {/* Dispatch */}
      {!dispatchResult && (
        <div className="flex items-center justify-between pt-2 border-t border-neutral-200">
          <p className="text-sm text-neutral-500">
            {selectedTasks.size} task{selectedTasks.size !== 1 ? "s" : ""}{" "}
            selected
          </p>
          <button
            onClick={onDispatch}
            disabled={dispatching || selectedTasks.size === 0}
            className="px-6 py-2.5 bg-brand-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {dispatching ? "Dispatching..." : "Dispatch Selected"}
          </button>
        </div>
      )}

      {/* Dispatch Error */}
      {dispatchError && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {dispatchError}
        </div>
      )}

      {/* Dispatch Success */}
      {dispatchResult && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-green-800">
            {dispatchResult.dispatched} task
            {dispatchResult.dispatched !== 1 ? "s" : ""} dispatched
            successfully.
          </p>
          <Link
            href="/admin/agents/pm/projects"
            className="text-sm font-medium text-green-700 hover:text-green-900 underline"
          >
            View in Project Tracker
          </Link>
        </div>
      )}
    </div>
  );
}
