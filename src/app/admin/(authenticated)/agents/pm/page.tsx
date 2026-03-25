"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import type { Client } from "@/lib/db/schema";
import type { PMAnalysis, SuggestedTask } from "@/lib/validations/pm";
import { PRIORITY_OPTIONS } from "@/lib/validations/pm";
import {
  ClientSelector,
  FormField,
  StepIndicator,
  PreSubmitSummary,
  TextareaWithCount,
} from "@/components/admin/guided-form";

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
  internalNote: string;
  clickupProjectIdOverride: string;
  preferredAgents: string[];
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function getDefaultDeadline(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

const AVAILABLE_AGENTS = [
  { value: "translator", label: "Translator" },
  { value: "creative", label: "Creative Strategist" },
  { value: "designer", label: "Designer IA" },
  { value: "legal", label: "Legal IA" },
  { value: "social", label: "Social IA" },
  { value: "seo", label: "SEO IA" },
  { value: "copywriter", label: "Copywriter IA" },
] as const;

const AGENT_LABELS: Record<string, string> = Object.fromEntries(
  AVAILABLE_AGENTS.map((a) => [a.value, a.label])
);

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

const STEPS = ["Select Client", "Configure", "Review & Analyze"];

// ─── Page Component ─────────────────────────────────────────────────────────

export default function PMAgentPage() {
  // Step state
  const [step, setStep] = useState(0);

  // Selected client object
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Advanced options toggle
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Form state
  const [form, setForm] = useState<FormState>({
    clientId: "",
    brief: "",
    deadline: getDefaultDeadline(),
    priority: "normal",
    internalNote: "",
    clickupProjectIdOverride: "",
    preferredAgents: [],
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

  // ── Step validation ─────────────────────────────────────────────────────

  function isStep0Valid(): boolean {
    return !!form.clientId;
  }

  function isStep1Valid(): boolean {
    return form.brief.length >= 20;
  }

  // ── Client loaded callback ────────────────────────────────────────────

  const handleClientLoaded = useCallback((client: Client | null) => {
    setSelectedClient(client);
  }, []);

  // ── Analyze brief ─────────────────────────────────────────────────────

  async function handleAnalyze() {
    setAnalyzeError(null);
    setAnalysis(null);
    setDispatchResult(null);
    setDispatchError(null);
    setSelectedTasks(new Set());

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

  // ── Build summary items for PreSubmitSummary ──────────────────────────

  function getSummaryItems(): { label: string; value: string }[] {
    const items = [
      { label: "Client", value: selectedClient?.name || "---" },
      {
        label: "Brief",
        value:
          form.brief.length > 120
            ? form.brief.slice(0, 120) + "..."
            : form.brief,
      },
      { label: "Deadline", value: form.deadline || "D+1 (default)" },
      { label: "Priority", value: PRIORITY_LABELS[form.priority] },
    ];

    if (form.internalNote.trim()) {
      items.push({
        label: "Internal Note",
        value:
          form.internalNote.length > 80
            ? form.internalNote.slice(0, 80) + "..."
            : form.internalNote,
      });
    }

    if (form.preferredAgents.length > 0) {
      items.push({
        label: "Preferred Agents",
        value: form.preferredAgents
          .map((a) => AGENT_LABELS[a] || a)
          .join(", "),
      });
    }

    return items;
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
      <div className="bg-white rounded-xl border border-neutral-300 p-6 space-y-5">
        <h2 className="text-lg font-semibold text-brand-black">New Brief</h2>

        {/* Guidance message */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
          <p className="text-sm text-blue-800">
            Paste the client&apos;s email or describe the project in plain language — I&apos;ll handle the structure. The more context you give me (client, deadline, language, format), the more precise the task breakdown will be. If something is missing, I&apos;ll flag it before dispatching.
          </p>
        </div>

        <StepIndicator steps={STEPS} currentStep={step} />

        {/* Step 0: Select Client */}
        {step === 0 && (
          <div className="space-y-4">
            <ClientSelector
              value={form.clientId}
              onChange={(clientId) =>
                setForm((prev) => ({ ...prev, clientId }))
              }
              onClientLoaded={handleClientLoaded}
              helperText="Select the client this brief is for. Their brand context and active projects will inform the analysis."
            />

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={!isStep0Valid()}
                className="px-6 py-2.5 bg-brand-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Step 1: Configure */}
        {step === 1 && (
          <div className="space-y-5">
            {/* Required */}
            <FormField
              label="Brief"
              required
              helperText="Paste an email, describe the project, or write the brief. The more detail you provide, the better the task decomposition."
            >
              <TextareaWithCount
                value={form.brief}
                onChange={(brief) => setForm((prev) => ({ ...prev, brief }))}
                placeholder="Sony needs 50 Black Friday banners by Friday — 728x90, 300x250, 160x600. EN and FR versions."
                minLength={20}
                rows={6}
              />
            </FormField>

            {/* Recommended */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label={
                  <>
                    Deadline
                    <span className="ml-2 text-xs font-medium bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">Recommended</span>
                  </>
                }
                helperText="Without a deadline, the PM IA defaults to D+1. If the actual deadline is different, the priority and dispatch order will be wrong."
              >
                <input
                  type="date"
                  value={form.deadline}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, deadline: e.target.value }))
                  }
                  className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                />
              </FormField>

              <FormField
                label={
                  <>
                    Priority
                    <span className="ml-2 text-xs font-medium bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">Recommended</span>
                  </>
                }
                helperText="Changes the dispatch strategy: ASAP triggers immediate parallel dispatch; Normal allows sequential."
              >
                <select
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
              </FormField>
            </div>

            {/* Advanced options (optional) */}
            <div className="border border-neutral-200 rounded-lg">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors rounded-lg"
              >
                <span>Advanced options</span>
                <span className="text-neutral-400">{showAdvanced ? "−" : "+"}</span>
              </button>
              {showAdvanced && (
                <div className="px-4 pb-4 space-y-4 border-t border-neutral-200 pt-4">
                  <FormField
                    label="Internal Note"
                    helperText="Context visible only to the team — what was said on the call, sensitivities, client mood. Not sent to sub-agents."
                  >
                    <TextareaWithCount
                      value={form.internalNote}
                      onChange={(internalNote) =>
                        setForm((prev) => ({ ...prev, internalNote }))
                      }
                      placeholder="e.g. Client sounded frustrated on the call — be extra careful with timelines"
                      rows={3}
                    />
                  </FormField>

                  <FormField
                    label="ClickUp Project ID Override"
                    helperText="If this brief belongs to a specific ClickUp project that differs from the client's default project ID."
                  >
                    <input
                      type="text"
                      value={form.clickupProjectIdOverride}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          clickupProjectIdOverride: e.target.value,
                        }))
                      }
                      placeholder="e.g. 90120384756"
                      className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                    />
                  </FormField>

                  <FormField
                    label="Preferred Agents"
                    helperText="Pre-select which agents should be activated, bypassing the PM IA's automatic detection."
                  >
                    <div className="flex flex-wrap gap-2">
                      {AVAILABLE_AGENTS.map((agent) => {
                        const selected = form.preferredAgents.includes(agent.value);
                        return (
                          <button
                            key={agent.value}
                            type="button"
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                preferredAgents: selected
                                  ? prev.preferredAgents.filter((a) => a !== agent.value)
                                  : [...prev.preferredAgents, agent.value],
                              }))
                            }
                            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                              selected
                                ? "bg-brand-black text-white border-brand-black"
                                : "bg-white text-neutral-700 border-neutral-300 hover:border-neutral-400"
                            }`}
                          >
                            {agent.label}
                          </button>
                        );
                      })}
                    </div>
                  </FormField>
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setStep(0)}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-neutral-300 text-neutral-600 hover:bg-neutral-100 transition-colors"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!isStep1Valid()}
                className="px-6 py-2.5 bg-brand-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Review & Analyze */}
        {step === 2 && (
          <div className="space-y-4">
            <PreSubmitSummary
              items={getSummaryItems()}
              onBack={() => setStep(1)}
              onConfirm={handleAnalyze}
              loading={analyzing}
              buttonLabel="Analyze Brief"
            />

            {/* Error */}
            {analyzeError && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                {analyzeError}
              </div>
            )}
          </div>
        )}
      </div>

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
