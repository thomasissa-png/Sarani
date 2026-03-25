"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { Client } from "@/lib/db/schema";
import {
  TARGET_MARKETS,
  type CreativeRecommendation,
  type TargetMarket,
} from "@/lib/validations/creative";

// ─── Types ──────────────────────────────────────────────────────────────────

type RecommendResponse = {
  recommendation: CreativeRecommendation;
  outputId: string;
  usage: { inputTokens: number; outputTokens: number };
};

type FormState = {
  clientId: string;
  campaignObjective: string;
  targetMarkets: TargetMarket[];
  budgetAmount: string;
  budgetCurrency: string;
  timeline: string;
  constraints: string;
};

const INITIAL_FORM: FormState = {
  clientId: "",
  campaignObjective: "",
  targetMarkets: [],
  budgetAmount: "",
  budgetCurrency: "USD",
  timeline: "",
  constraints: "",
};

const CURRENCY_OPTIONS = ["USD", "EUR", "GBP", "AED", "CHF"] as const;

// ─── Page Component ─────────────────────────────────────────────────────────

export default function CreativeStrategistPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);

  const [form, setForm] = useState<FormState>(INITIAL_FORM);

  const [generating, setGenerating] = useState(false);
  const [recommendation, setRecommendation] =
    useState<CreativeRecommendation | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  // ── Toggle market ───────────────────────────────────────────────────────

  function toggleMarket(market: TargetMarket) {
    setForm((prev) => {
      const markets = prev.targetMarkets.includes(market)
        ? prev.targetMarkets.filter((m) => m !== market)
        : [...prev.targetMarkets, market];
      return { ...prev, targetMarkets: markets };
    });
  }

  // ── Submit ──────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setRecommendation(null);

    if (!form.clientId) {
      setError("Please select a client.");
      return;
    }
    if (form.campaignObjective.length < 20) {
      setError("Campaign objective must be at least 20 characters.");
      return;
    }
    if (form.targetMarkets.length === 0) {
      setError("Select at least one target market.");
      return;
    }
    if (!form.timeline.trim()) {
      setError("Timeline is required.");
      return;
    }

    setGenerating(true);

    try {
      const payload: Record<string, unknown> = {
        clientId: form.clientId,
        campaignObjective: form.campaignObjective,
        targetMarkets: form.targetMarkets,
        timeline: form.timeline,
      };

      if (form.budgetAmount && Number(form.budgetAmount) > 0) {
        payload.budget = {
          amount: Number(form.budgetAmount),
          currency: form.budgetCurrency,
        };
      }

      if (form.constraints.trim()) {
        payload.constraints = form.constraints;
      }

      const res = await fetch("/api/admin/agents/creative/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Recommendation failed");
      }

      const data: RecommendResponse = await res.json();
      setRecommendation(data.recommendation);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate recommendation"
      );
    } finally {
      setGenerating(false);
    }
  }

  // ── Copy all as markdown ────────────────────────────────────────────────

  function buildMarkdown(rec: CreativeRecommendation): string {
    const lines: string[] = [];

    lines.push(`# Creative Strategy Recommendation`);
    lines.push(``);
    lines.push(`## Executive Summary`);
    lines.push(rec.executiveSummary);
    lines.push(``);
    lines.push(`## Problem Statement`);
    lines.push(rec.problemStatement);
    lines.push(``);
    lines.push(`## Target Audience`);
    lines.push(`**Primary:** ${rec.targetAudience.primary}`);
    if (rec.targetAudience.secondary) {
      lines.push(`**Secondary:** ${rec.targetAudience.secondary}`);
    }
    lines.push(`**Consumer Insight:** ${rec.targetAudience.consumerInsight}`);
    lines.push(``);
    lines.push(`## Key Messages`);
    rec.keyMessages.forEach((msg) => {
      lines.push(`- **[${msg.type}]** ${msg.message}`);
      lines.push(`  _Rationale: ${msg.rationale}_`);
    });
    lines.push(``);
    lines.push(`## Creative Angles`);
    rec.creativeAngles.forEach((angle, i) => {
      lines.push(`### ${i + 1}. ${angle.name}`);
      lines.push(`**Concept:** ${angle.concept}`);
      lines.push(`**Rationale:** ${angle.rationale}`);
      lines.push(`**Tone & Manner:** ${angle.toneAndManner}`);
      lines.push(`**Example Executions:**`);
      angle.exampleExecutions.forEach((ex) => lines.push(`- ${ex}`));
      lines.push(``);
    });
    lines.push(`## Activation Plan`);
    rec.activationPlan.phases.forEach((phase) => {
      lines.push(`### ${phase.name} (${phase.duration})`);
      lines.push(`- **Channels:** ${phase.channels.join(", ")}`);
      lines.push(`- **Budget:** ${phase.budgetAllocation}`);
      lines.push(`- **Key Actions:**`);
      phase.keyActions.forEach((a) => lines.push(`  - ${a}`));
      lines.push(``);
    });
    lines.push(`**KPI Suggestions:**`);
    rec.activationPlan.kpiSuggestions.forEach((k) => lines.push(`- ${k}`));
    lines.push(``);
    lines.push(`## Tone Guidance`);
    lines.push(`**Do:** ${rec.toneGuidance.doThis.join("; ")}`);
    lines.push(`**Avoid:** ${rec.toneGuidance.avoidThis.join("; ")}`);
    lines.push(`**Brand Alignment:** ${rec.toneGuidance.brandAlignment}`);
    lines.push(``);
    lines.push(`## Competitive Context`);
    lines.push(rec.competitiveContext);

    if (rec.hypotheses.length > 0) {
      lines.push(``);
      lines.push(`## Hypotheses`);
      rec.hypotheses.forEach((h) => lines.push(`- [HYPOTHESIS] ${h}`));
    }

    return lines.join("\n");
  }

  function handleCopyAll() {
    if (!recommendation) return;
    navigator.clipboard.writeText(buildMarkdown(recommendation));
  }

  function handleDownload() {
    if (!recommendation) return;
    const md = buildMarkdown(recommendation);
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "creative-strategy.md";
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-black">
            Creative Strategist
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            Generate strategic recommendations for client campaigns
          </p>
        </div>
        <Link
          href="/admin/agents/creative/history"
          className="px-4 py-2 bg-white border border-neutral-300 text-sm font-semibold rounded-lg hover:bg-neutral-100 transition-colors text-brand-black"
        >
          History
        </Link>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border border-neutral-300 p-6 space-y-5"
      >
        <h2 className="text-lg font-semibold text-brand-black">
          Campaign Brief
        </h2>

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

        {/* Campaign objective */}
        <div>
          <label
            htmlFor="objective"
            className="block text-sm font-medium text-neutral-700 mb-1.5"
          >
            Campaign Objective
          </label>
          <textarea
            id="objective"
            value={form.campaignObjective}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                campaignObjective: e.target.value,
              }))
            }
            placeholder="What does the client want to achieve with this campaign?"
            rows={4}
            className="w-full px-4 py-3 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent resize-y"
          />
          <p className="text-xs text-neutral-400 mt-1">
            {form.campaignObjective.length} / 20 min characters
          </p>
        </div>

        {/* Target markets */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Target Markets
          </label>
          <div className="flex flex-wrap gap-2">
            {TARGET_MARKETS.map((market) => {
              const selected = form.targetMarkets.includes(market);
              return (
                <button
                  key={market}
                  type="button"
                  onClick={() => toggleMarket(market)}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                    selected
                      ? "bg-brand-black text-white border-brand-black"
                      : "bg-white text-neutral-700 border-neutral-300 hover:border-neutral-400"
                  }`}
                >
                  {market}
                </button>
              );
            })}
          </div>
        </div>

        {/* Budget + Timeline */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="budget"
              className="block text-sm font-medium text-neutral-700 mb-1.5"
            >
              Budget (optional)
            </label>
            <div className="flex gap-2">
              <input
                id="budget"
                type="number"
                value={form.budgetAmount}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    budgetAmount: e.target.value,
                  }))
                }
                placeholder="Amount"
                className="flex-1 px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
              />
              <select
                value={form.budgetCurrency}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    budgetCurrency: e.target.value,
                  }))
                }
                className="w-20 px-2 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
              >
                {CURRENCY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label
              htmlFor="timeline"
              className="block text-sm font-medium text-neutral-700 mb-1.5"
            >
              Timeline
            </label>
            <input
              id="timeline"
              type="text"
              value={form.timeline}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, timeline: e.target.value }))
              }
              placeholder="e.g. Q2 2026, June-August 2026"
              className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
            />
          </div>
        </div>

        {/* Constraints */}
        <div>
          <label
            htmlFor="constraints"
            className="block text-sm font-medium text-neutral-700 mb-1.5"
          >
            Constraints / Additional Context (optional)
          </label>
          <textarea
            id="constraints"
            value={form.constraints}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, constraints: e.target.value }))
            }
            placeholder="Competitors, market context, mandatories, restrictions..."
            rows={3}
            className="w-full px-4 py-3 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent resize-y"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={generating}
            className="px-6 py-2.5 bg-brand-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? "Generating..." : "Get Recommendation"}
          </button>
        </div>
      </form>

      {/* Output */}
      {recommendation && (
        <RecommendationOutput
          recommendation={recommendation}
          onCopyAll={handleCopyAll}
          onDownload={handleDownload}
        />
      )}
    </div>
  );
}

// ─── Recommendation Output Component ────────────────────────────────────────

function RecommendationOutput({
  recommendation: rec,
  onCopyAll,
  onDownload,
}: {
  recommendation: CreativeRecommendation;
  onCopyAll: () => void;
  onDownload: () => void;
}) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    onCopyAll();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-white rounded-xl border border-neutral-300 p-6 space-y-6">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-brand-black">
          Strategic Recommendation
        </h2>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 text-sm font-medium border border-neutral-300 rounded-lg hover:bg-neutral-100 transition-colors text-brand-black"
          >
            {copied ? "Copied!" : "Copy All"}
          </button>
          <button
            onClick={onDownload}
            className="px-3 py-1.5 text-sm font-medium border border-neutral-300 rounded-lg hover:bg-neutral-100 transition-colors text-brand-black"
          >
            Download .md
          </button>
        </div>
      </div>

      {/* Executive Summary */}
      <section className="bg-neutral-50 rounded-lg px-4 py-3">
        <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-1">
          Executive Summary
        </h3>
        <p className="text-sm text-brand-black leading-relaxed">
          {rec.executiveSummary}
        </p>
      </section>

      {/* Problem Statement */}
      <section>
        <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-1">
          Problem Statement
        </h3>
        <p className="text-sm text-brand-black leading-relaxed">
          {rec.problemStatement}
        </p>
      </section>

      {/* Target Audience */}
      <section>
        <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-2">
          Target Audience
        </h3>
        <div className="space-y-2">
          <div className="bg-neutral-50 rounded-lg px-4 py-3">
            <p className="text-xs font-semibold text-neutral-500 mb-0.5">
              Primary
            </p>
            <p className="text-sm text-brand-black">
              {rec.targetAudience.primary}
            </p>
          </div>
          {rec.targetAudience.secondary && (
            <div className="bg-neutral-50 rounded-lg px-4 py-3">
              <p className="text-xs font-semibold text-neutral-500 mb-0.5">
                Secondary
              </p>
              <p className="text-sm text-brand-black">
                {rec.targetAudience.secondary}
              </p>
            </div>
          )}
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            <p className="text-xs font-semibold text-blue-600 mb-0.5">
              Consumer Insight
            </p>
            <p className="text-sm text-brand-black">
              {rec.targetAudience.consumerInsight}
            </p>
          </div>
        </div>
      </section>

      {/* Key Messages */}
      <section>
        <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-2">
          Key Messages
        </h3>
        <div className="space-y-2">
          {rec.keyMessages.map((msg, i) => (
            <div
              key={i}
              className="border border-neutral-200 rounded-lg px-4 py-3"
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded ${
                    msg.type === "primary"
                      ? "bg-brand-black text-white"
                      : msg.type === "secondary"
                        ? "bg-neutral-200 text-neutral-700"
                        : "bg-green-100 text-green-700"
                  }`}
                >
                  {msg.type === "proofPoint" ? "Proof Point" : msg.type}
                </span>
              </div>
              <p className="text-sm font-medium text-brand-black">
                {msg.message}
              </p>
              <p className="text-xs text-neutral-500 mt-1">{msg.rationale}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Creative Angles */}
      <section>
        <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-2">
          Creative Angles ({rec.creativeAngles.length})
        </h3>
        <div className="space-y-4">
          {rec.creativeAngles.map((angle, i) => (
            <div
              key={i}
              className="border border-neutral-200 rounded-lg p-4 space-y-3"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold bg-brand-black text-white w-6 h-6 rounded-full flex items-center justify-center">
                  {i + 1}
                </span>
                <h4 className="text-sm font-semibold text-brand-black">
                  {angle.name}
                </h4>
              </div>
              <div>
                <p className="text-xs font-semibold text-neutral-500 mb-0.5">
                  Concept
                </p>
                <p className="text-sm text-brand-black">{angle.concept}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-neutral-500 mb-0.5">
                  Rationale
                </p>
                <p className="text-sm text-neutral-700">{angle.rationale}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-neutral-500 mb-0.5">
                  Tone & Manner
                </p>
                <p className="text-sm text-neutral-700">
                  {angle.toneAndManner}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-neutral-500 mb-0.5">
                  Example Executions
                </p>
                <ul className="list-disc list-inside text-sm text-neutral-700 space-y-0.5">
                  {angle.exampleExecutions.map((ex, j) => (
                    <li key={j}>{ex}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Activation Plan */}
      <section>
        <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-2">
          Activation Plan
        </h3>
        <div className="space-y-3">
          {rec.activationPlan.phases.map((phase, i) => (
            <div
              key={i}
              className="border border-neutral-200 rounded-lg px-4 py-3"
            >
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-semibold text-brand-black">
                  {phase.name}
                </h4>
                <span className="text-xs text-neutral-500">
                  {phase.duration}
                </span>
              </div>
              <div className="flex flex-wrap gap-1 mb-2">
                {phase.channels.map((ch) => (
                  <span
                    key={ch}
                    className="text-xs bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded"
                  >
                    {ch}
                  </span>
                ))}
              </div>
              <ul className="text-sm text-neutral-700 space-y-0.5">
                {phase.keyActions.map((action, j) => (
                  <li key={j} className="flex items-start gap-1.5">
                    <span className="text-neutral-400 shrink-0">-</span>
                    {action}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-neutral-500 mt-2">
                Budget: {phase.budgetAllocation}
              </p>
            </div>
          ))}
        </div>
        {rec.activationPlan.kpiSuggestions.length > 0 && (
          <div className="mt-3 bg-neutral-50 rounded-lg px-4 py-3">
            <p className="text-xs font-semibold text-neutral-500 mb-1">
              Suggested KPIs
            </p>
            <ul className="text-sm text-brand-black space-y-0.5">
              {rec.activationPlan.kpiSuggestions.map((kpi, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-neutral-400 shrink-0">-</span>
                  {kpi}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Tone Guidance */}
      <section>
        <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-2">
          Tone Guidance
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
            <p className="text-xs font-semibold text-green-700 mb-1">Do</p>
            <ul className="text-sm text-green-900 space-y-0.5">
              {rec.toneGuidance.doThis.map((d, i) => (
                <li key={i}>- {d}</li>
              ))}
            </ul>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <p className="text-xs font-semibold text-red-700 mb-1">Avoid</p>
            <ul className="text-sm text-red-900 space-y-0.5">
              {rec.toneGuidance.avoidThis.map((a, i) => (
                <li key={i}>- {a}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-2 bg-neutral-50 rounded-lg px-4 py-3">
          <p className="text-xs font-semibold text-neutral-500 mb-0.5">
            Brand Alignment
          </p>
          <p className="text-sm text-brand-black">
            {rec.toneGuidance.brandAlignment}
          </p>
        </div>
      </section>

      {/* Competitive Context */}
      <section>
        <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-1">
          Competitive Context
        </h3>
        <p className="text-sm text-brand-black leading-relaxed">
          {rec.competitiveContext}
        </p>
      </section>

      {/* Hypotheses */}
      {rec.hypotheses.length > 0 && (
        <section className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <h3 className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">
            Hypotheses (to validate)
          </h3>
          <ul className="text-sm text-amber-800 space-y-0.5">
            {rec.hypotheses.map((h, i) => (
              <li key={i}>- {h}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
