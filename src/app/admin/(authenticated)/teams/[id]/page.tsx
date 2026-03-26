"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AGENT_TYPE_LABELS, type AgentType } from "@/lib/teams/templates";

// ─── Types ──────────────────────────────────────────────────────────────────

type StepStatus = "pending" | "running" | "completed" | "failed";

type TeamStep = {
  id: string;
  teamId: string;
  stepOrder: number;
  agentType: string;
  label: string;
  status: StepStatus;
  input: Record<string, unknown> | null;
  output: string | null;
  tokenCost: number | null;
  startedAt: string | null;
  completedAt: string | null;
};

type TeamDetail = {
  id: string;
  name: string;
  clientId: string;
  clientName: string;
  templateType: string | null;
  brief: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  steps: TeamStep[];
};

// ─── Constants ──────────────────────────────────────────────────────────────

const STATUS_BADGE_CLASSES: Record<StepStatus, string> = {
  pending: "bg-neutral-100 text-neutral-400",
  running: "bg-sky-50 text-brand-cerulean",
  completed: "bg-green-50 text-green-600",
  failed: "bg-red-50 text-brand-flame",
};

const STATUS_LABELS: Record<StepStatus, string> = {
  pending: "Pending",
  running: "Running",
  completed: "Completed",
  failed: "Failed",
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

export default function TeamDetailPage() {
  const params = useParams();
  const teamId = params.id as string;

  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [briefExpanded, setBriefExpanded] = useState(false);
  const [executingStepId, setExecutingStepId] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // Rerun modal state
  const [rerunStepId, setRerunStepId] = useState<string | null>(null);
  const [rerunComment, setRerunComment] = useState("");
  const [rerunning, setRerunning] = useState(false);

  const fetchTeam = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/teams/${teamId}`);
      if (!res.ok) {
        throw new Error("Failed to load team");
      }
      const data: TeamDetail = await res.json();
      setTeam(data);

      // Auto-select the first completed step or the step that should run next
      if (!selectedStepId) {
        const nextStep = data.steps.find(
          (s) => s.status === "running" || s.status === "pending"
        );
        const lastCompleted = [...data.steps]
          .reverse()
          .find((s) => s.status === "completed");
        setSelectedStepId(
          nextStep?.id ?? lastCompleted?.id ?? data.steps[0]?.id ?? null
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [teamId, selectedStepId]);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  // Poll while a step is running
  useEffect(() => {
    if (!executingStepId) return;
    const interval = setInterval(fetchTeam, 3000);
    return () => clearInterval(interval);
  }, [executingStepId, fetchTeam]);

  // Clear executing flag when step completes
  useEffect(() => {
    if (!executingStepId || !team) return;
    const step = team.steps.find((s) => s.id === executingStepId);
    if (step && step.status !== "running") {
      setExecutingStepId(null);
    }
  }, [team, executingStepId]);

  async function handleExecuteStep(stepId: string) {
    setExecutingStepId(stepId);
    setSelectedStepId(stepId);
    setError(null);

    try {
      const res = await fetch(
        `/api/admin/teams/${teamId}/steps/${stepId}/execute`,
        { method: "POST" }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to execute step");
      }

      await fetchTeam();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Execution failed");
      setExecutingStepId(null);
    }
  }

  async function handleRerun(stepId: string) {
    setRerunning(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/admin/teams/${teamId}/steps/${stepId}/execute`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rerunComment: rerunComment.trim() || undefined }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to re-run step");
      }

      setRerunStepId(null);
      setRerunComment("");
      setExecutingStepId(stepId);
      setSelectedStepId(stepId);
      await fetchTeam();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Re-run failed");
    } finally {
      setRerunning(false);
    }
  }

  function handleCopyOutput(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-neutral-300 border-t-brand-cerulean rounded-full animate-spin" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/teams"
          className="text-sm text-brand-cerulean hover:underline"
        >
          Back to teams
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600 font-medium">
            {error ?? "Team not found"}
          </p>
        </div>
      </div>
    );
  }

  const selectedStep = team.steps.find((s) => s.id === selectedStepId) ?? null;

  // Determine which step is the "next" executable one
  const nextExecutableStep = team.steps.find((s, i) => {
    if (s.status !== "pending" && s.status !== "failed") return false;
    if (i === 0) return true;
    const prev = team.steps[i - 1];
    return prev?.status === "completed";
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link
          href="/admin/teams"
          className="mt-1 p-2 rounded-lg text-neutral-400 hover:text-brand-black hover:bg-neutral-100 transition-colors shrink-0"
          aria-label="Back to teams"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-brand-black">
              {team.name}
            </h1>
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                STATUS_BADGE_CLASSES[team.status as StepStatus] ??
                "bg-neutral-100 text-neutral-500"
              }`}
            >
              {STATUS_LABELS[team.status as StepStatus] ?? team.status}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-neutral-500 mt-1">
            <span>{team.clientName}</span>
            {team.templateType && (
              <>
                <span className="text-neutral-300">|</span>
                <span className="px-1.5 py-0.5 bg-neutral-100 rounded text-xs text-neutral-500">
                  {TEMPLATE_LABELS[team.templateType] ?? team.templateType}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 underline hover:no-underline"
          >
            dismiss
          </button>
        </div>
      )}

      {/* Main layout: timeline (left) + content (right) */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Timeline */}
        <div className="lg:w-80 shrink-0 space-y-2">
          {/* Brief (collapsible) */}
          <button
            onClick={() => setBriefExpanded(!briefExpanded)}
            className="w-full bg-white border border-neutral-300 rounded-xl p-4 text-left hover:border-neutral-400 transition-colors"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-brand-black">
                Master Brief
              </h3>
              <svg
                className={`w-4 h-4 text-neutral-400 transition-transform ${
                  briefExpanded ? "rotate-180" : ""
                }`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
            {briefExpanded && (
              <p className="text-sm text-neutral-600 mt-3 whitespace-pre-wrap">
                {team.brief}
              </p>
            )}
          </button>

          {/* Steps */}
          <div className="bg-white border border-neutral-300 rounded-xl p-4 space-y-1">
            <h3 className="text-sm font-semibold text-brand-black mb-3">
              Steps
            </h3>
            {team.steps.map((step, i) => {
              const isSelected = step.id === selectedStepId;
              const isNext = step.id === nextExecutableStep?.id;
              const isClickable =
                step.status === "completed" ||
                step.status === "failed" ||
                isNext ||
                step.status === "running";

              return (
                <div key={step.id} className="relative">
                  {/* Connector line */}
                  {i < team.steps.length - 1 && (
                    <div className="absolute left-4 top-10 w-0.5 h-4 bg-neutral-200" />
                  )}
                  <button
                    onClick={() => isClickable && setSelectedStepId(step.id)}
                    disabled={!isClickable}
                    className={`w-full flex items-start gap-3 p-2.5 rounded-lg text-left transition-colors ${
                      isSelected
                        ? "bg-sky-50 border border-sky-200"
                        : isClickable
                        ? "hover:bg-neutral-50"
                        : "opacity-50 cursor-not-allowed"
                    }`}
                  >
                    {/* Step number circle */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        step.status === "completed"
                          ? "bg-green-100 text-green-600"
                          : step.status === "running"
                          ? "bg-sky-100 text-brand-cerulean"
                          : step.status === "failed"
                          ? "bg-red-100 text-brand-flame"
                          : "bg-neutral-100 text-neutral-400"
                      }`}
                    >
                      {step.status === "completed" ? (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : step.status === "running" ? (
                        <div className="w-3.5 h-3.5 border-2 border-brand-cerulean/30 border-t-brand-cerulean rounded-full animate-spin" />
                      ) : (
                        step.stepOrder
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium ${
                          step.status === "pending"
                            ? "text-neutral-400"
                            : "text-brand-black"
                        }`}
                      >
                        {step.label}
                      </p>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        {AGENT_TYPE_LABELS[step.agentType as AgentType] ??
                          step.agentType}
                      </p>
                    </div>

                    {/* Status badge */}
                    <span
                      className={`shrink-0 px-1.5 py-0.5 text-[10px] font-medium rounded-full ${
                        STATUS_BADGE_CLASSES[step.status]
                      }`}
                    >
                      {STATUS_LABELS[step.status]}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Content Panel */}
        <div className="flex-1 min-w-0">
          {selectedStep ? (
            <div className="bg-white border border-neutral-300 rounded-xl">
              {/* Step header */}
              <div className="p-5 border-b border-neutral-200">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-brand-black">
                      Step {selectedStep.stepOrder}: {selectedStep.label}
                    </h2>
                    <p className="text-sm text-neutral-500 mt-0.5">
                      {AGENT_TYPE_LABELS[
                        selectedStep.agentType as AgentType
                      ] ?? selectedStep.agentType}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      STATUS_BADGE_CLASSES[selectedStep.status]
                    }`}
                  >
                    {STATUS_LABELS[selectedStep.status]}
                  </span>
                </div>
              </div>

              {/* Step body */}
              <div className="p-5 space-y-4">
                {/* Execute button */}
                {selectedStep.id === nextExecutableStep?.id &&
                  selectedStep.status !== "running" && (
                    <button
                      onClick={() => handleExecuteStep(selectedStep.id)}
                      disabled={!!executingStepId}
                      className="w-full py-3 bg-brand-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {executingStepId === selectedStep.id ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Running...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="5 3 19 12 5 21 5 3" />
                          </svg>
                          Execute Step {selectedStep.stepOrder}
                        </>
                      )}
                    </button>
                  )}

                {/* Running state */}
                {selectedStep.status === "running" && (
                  <div className="flex items-center justify-center gap-3 py-8 text-brand-cerulean">
                    <div className="w-5 h-5 border-2 border-brand-cerulean/30 border-t-brand-cerulean rounded-full animate-spin" />
                    <span className="text-sm font-medium">
                      Agent is processing...
                    </span>
                  </div>
                )}

                {/* Pending state (not next) */}
                {selectedStep.status === "pending" &&
                  selectedStep.id !== nextExecutableStep?.id && (
                    <div className="py-8 text-center text-neutral-400 text-sm">
                      This step will be available after the previous step
                      completes.
                    </div>
                  )}

                {/* Output */}
                {selectedStep.output && (
                  <div className="space-y-3">
                    <div className="prose prose-sm max-w-none text-brand-black">
                      <MarkdownRenderer content={selectedStep.output} />
                    </div>

                    {/* Token cost */}
                    {selectedStep.tokenCost != null && (
                      <p className="text-xs text-neutral-400">
                        Token cost: ~{selectedStep.tokenCost.toLocaleString()}
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2 border-t border-neutral-100">
                      <button
                        onClick={() =>
                          handleCopyOutput(selectedStep.output ?? "")
                        }
                        className="px-3 py-1.5 text-xs font-medium text-neutral-500 hover:text-brand-black border border-neutral-300 rounded-lg hover:border-neutral-400 transition-colors flex items-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                        {copySuccess ? "Copied!" : "Copy"}
                      </button>

                      <button
                        onClick={() => {
                          setRerunStepId(selectedStep.id);
                          setRerunComment("");
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-neutral-500 hover:text-brand-black border border-neutral-300 rounded-lg hover:border-neutral-400 transition-colors flex items-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                        </svg>
                        Re-run
                      </button>
                    </div>
                  </div>
                )}

                {/* Failed state */}
                {selectedStep.status === "failed" && !selectedStep.output && (
                  <div className="py-6 text-center space-y-3">
                    <p className="text-sm text-brand-flame font-medium">
                      This step failed to execute.
                    </p>
                    <button
                      onClick={() => handleExecuteStep(selectedStep.id)}
                      disabled={!!executingStepId}
                      className="px-4 py-2 bg-brand-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50"
                    >
                      Retry
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-neutral-300 rounded-xl p-12 text-center text-neutral-400 text-sm">
              Select a step from the timeline to view details.
            </div>
          )}
        </div>
      </div>

      {/* Rerun Modal */}
      {rerunStepId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !rerunning && setRerunStepId(null)}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-semibold text-brand-black">
              Re-run step
            </h3>
            <p className="text-sm text-neutral-500">
              The agent will re-execute this step. Add an optional comment to
              guide the output (e.g. &quot;Too formal, make it more casual&quot;).
            </p>
            <textarea
              value={rerunComment}
              onChange={(e) => setRerunComment(e.target.value)}
              placeholder="Optional feedback for the agent..."
              rows={3}
              className="w-full px-4 py-3 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent resize-y"
            />
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setRerunStepId(null)}
                disabled={rerunning}
                className="px-4 py-2 text-sm font-medium text-neutral-500 hover:text-brand-black transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRerun(rerunStepId)}
                disabled={rerunning}
                className="px-5 py-2 bg-brand-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {rerunning && (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                {rerunning ? "Re-running..." : "Re-run"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Simple Markdown Renderer ───────────────────────────────────────────────

function MarkdownRenderer({ content }: { content: string }) {
  // Basic markdown to HTML conversion — handles headers, bold, italic, lists, code blocks
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeContent: string[] = [];
  let codeKey = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code blocks
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        elements.push(
          <pre
            key={`code-${codeKey++}`}
            className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 text-xs font-mono overflow-x-auto"
          >
            <code>{codeContent.join("\n")}</code>
          </pre>
        );
        codeContent = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeContent.push(line);
      continue;
    }

    // Headers
    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={i} className="text-base font-semibold text-brand-black mt-4 mb-2">
          {line.slice(4)}
        </h3>
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <h2 key={i} className="text-lg font-semibold text-brand-black mt-5 mb-2">
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith("# ")) {
      elements.push(
        <h1 key={i} className="text-xl font-bold text-brand-black mt-6 mb-3">
          {line.slice(2)}
        </h1>
      );
    }
    // List items
    else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <li key={i} className="ml-4 text-sm text-neutral-700 list-disc">
          <InlineMarkdown text={line.slice(2)} />
        </li>
      );
    }
    // Numbered list
    else if (/^\d+\.\s/.test(line)) {
      const text = line.replace(/^\d+\.\s/, "");
      elements.push(
        <li key={i} className="ml-4 text-sm text-neutral-700 list-decimal">
          <InlineMarkdown text={text} />
        </li>
      );
    }
    // Horizontal rule
    else if (line.match(/^---+$/)) {
      elements.push(
        <hr key={i} className="border-neutral-200 my-4" />
      );
    }
    // Empty line
    else if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
    }
    // Regular paragraph
    else {
      elements.push(
        <p key={i} className="text-sm text-neutral-700">
          <InlineMarkdown text={line} />
        </p>
      );
    }
  }

  return <div className="space-y-1">{elements}</div>;
}

function InlineMarkdown({ text }: { text: string }) {
  // Handle **bold**, *italic*, `code`
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    // Inline code
    const codeMatch = remaining.match(/`(.+?)`/);
    // Italic
    const italicMatch = remaining.match(/\*(.+?)\*/);

    // Find earliest match
    type MatchType = { match: RegExpMatchArray; type: "bold" | "code" | "italic" };
    const candidates: MatchType[] = [];
    if (boldMatch?.index !== undefined)
      candidates.push({ match: boldMatch, type: "bold" });
    if (codeMatch?.index !== undefined)
      candidates.push({ match: codeMatch, type: "code" });
    if (italicMatch?.index !== undefined)
      candidates.push({ match: italicMatch, type: "italic" });

    if (candidates.length === 0) {
      parts.push(remaining);
      break;
    }

    candidates.sort((a, b) => (a.match.index ?? 0) - (b.match.index ?? 0));
    const earliest = candidates[0];
    const idx = earliest.match.index ?? 0;

    if (idx > 0) {
      parts.push(remaining.slice(0, idx));
    }

    if (earliest.type === "bold") {
      parts.push(
        <strong key={key++} className="font-semibold">
          {earliest.match[1]}
        </strong>
      );
    } else if (earliest.type === "code") {
      parts.push(
        <code
          key={key++}
          className="px-1.5 py-0.5 bg-neutral-100 rounded text-xs font-mono"
        >
          {earliest.match[1]}
        </code>
      );
    } else {
      parts.push(
        <em key={key++}>{earliest.match[1]}</em>
      );
    }

    remaining = remaining.slice(idx + earliest.match[0].length);
  }

  return <>{parts}</>;
}
