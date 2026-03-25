"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import type { Client } from "@/lib/db/schema";
import type { PMAnalysis, SuggestedTask } from "@/lib/validations/pm";
import {
  ClientSelector,
  TextareaWithCount,
} from "@/components/admin/guided-form";

// ─── Types ──────────────────────────────────────────────────────────────────

type AnalyzeResponse = {
  analysis: PMAnalysis;
  outputId: string;
  usage: { inputTokens: number; outputTokens: number };
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

const STATUS_ICONS: Record<string, { icon: string; color: string }> = {
  ok: { icon: "\u2713", color: "text-green-600" },
  warning: { icon: "!", color: "text-amber-600" },
  missing: { icon: "\u2717", color: "text-red-600" },
};

// ─── Page Component ─────────────────────────────────────────────────────────

export default function QuickBriefPage() {
  const [clientId, setClientId] = useState("");
  const [brief, setBrief] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<PMAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Dispatch state
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());
  const [dispatching, setDispatching] = useState(false);
  const [dispatchResult, setDispatchResult] = useState<{
    dispatched: number;
  } | null>(null);
  const [dispatchError, setDispatchError] = useState<string | null>(null);

  const handleClientLoaded = useCallback((client: Client | null) => {
    setSelectedClient(client);
  }, []);

  const canSubmit = clientId && brief.length >= 20;

  async function handleAnalyze() {
    if (!canSubmit) return;

    setError(null);
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
          clientId,
          brief,
          priority: "normal",
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
      setError(err instanceof Error ? err.message : "Failed to analyze brief");
    } finally {
      setAnalyzing(false);
    }
  }

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
          clientId,
          briefSummary: analysis.briefSummary,
          priority: "normal",
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

  function handleReset() {
    setBrief("");
    setAnalysis(null);
    setError(null);
    setDispatchResult(null);
    setDispatchError(null);
    setSelectedTasks(new Set());
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-brand-black">Quick Brief</h1>
        <p className="text-neutral-500 text-sm mt-1">
          Paste an email, describe a project, or drop a brief — I'll handle the
          rest.
        </p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl border border-neutral-300 p-6 space-y-5">
        <ClientSelector
          value={clientId}
          onChange={setClientId}
          onClientLoaded={handleClientLoaded}
          helperText="Select the client this brief is for."
        />

        <div>
          <TextareaWithCount
            value={brief}
            onChange={setBrief}
            placeholder="Sony needs 50 Black Friday banners by Friday — 728x90, 300x250, 160x600. EN and FR versions. Use the new holiday campaign guidelines."
            minLength={20}
            rows={8}
          />
          <p className="text-xs text-neutral-400 mt-1.5">
            Paste an email, describe a project, or drop a brief — I'll handle
            the rest.
          </p>
        </div>

        <button
          type="button"
          onClick={handleAnalyze}
          disabled={!canSubmit || analyzing}
          className="w-full px-6 py-3 bg-brand-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {analyzing ? "Analyzing..." : "Analyze"}
        </button>

        {/* Error */}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {error}
          </div>
        )}
      </div>

      {/* Analysis Results — inline */}
      {analysis && (
        <div className="bg-white rounded-xl border border-neutral-300 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-brand-black">
              Analysis
            </h2>
            <button
              type="button"
              onClick={handleReset}
              className="text-xs font-medium text-neutral-500 hover:text-brand-black transition-colors"
            >
              New brief
            </button>
          </div>

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
                const statusStyle =
                  STATUS_ICONS[check.status] || STATUS_ICONS.ok;
                return (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span
                      className={`font-bold ${statusStyle.color} w-5 text-center shrink-0`}
                    >
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
                    onChange={() => toggleTask(i)}
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
          {!dispatchResult && analysis.tasks.length > 0 && (
            <div className="flex items-center justify-between pt-2 border-t border-neutral-200">
              <p className="text-sm text-neutral-500">
                {selectedTasks.size} task
                {selectedTasks.size !== 1 ? "s" : ""} selected
              </p>
              <button
                onClick={handleDispatch}
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
                href="/admin/projects"
                className="text-sm font-medium text-green-700 hover:text-green-900 underline"
              >
                View in Projects
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
