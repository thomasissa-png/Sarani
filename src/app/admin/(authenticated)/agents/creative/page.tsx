"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import type { Client } from "@/lib/db/schema";
import {
  TARGET_MARKETS,
  type CreativeRecommendation,
  type TargetMarket,
} from "@/lib/validations/creative";
import {
  ClientSelector,
  FormField,
  GuidanceMessage,
  RecommendedBadge,
  StepIndicator,
  PreSubmitSummary,
  TextareaWithCount,
} from "@/components/admin/guided-form";

// ─── Types ──────────────────────────────────────────────────────────────────

type RecommendResponse = {
  recommendation: CreativeRecommendation;
  outputId: string;
  usage: { inputTokens: number; outputTokens: number };
};

type OutputType = "strategic-recommendation" | "creative-brief" | "campaign-concept";

const OUTPUT_TYPES: { value: OutputType; label: string }[] = [
  { value: "strategic-recommendation", label: "Strategic recommendation" },
  { value: "creative-brief", label: "Creative brief" },
  { value: "campaign-concept", label: "Campaign concept" },
];

const BUDGET_RANGES = [
  { value: "", label: "-- Select budget range --" },
  { value: "under-50k", label: "Under 50K EUR" },
  { value: "50k-200k", label: "50K-200K EUR" },
  { value: "200k-1m", label: "200K-1M EUR" },
  { value: "1m-plus", label: "1M EUR+" },
] as const;

const TERRITORY_COUNTS = [
  { value: 2, label: "2 territories" },
  { value: 3, label: "3 territories (default)" },
  { value: 5, label: "5 territories" },
] as const;

type FormState = {
  clientId: string;
  campaignObjective: string;
  targetAudience: string;
  outputType: OutputType;
  targetMarkets: TargetMarket[];
  budgetRange: string;
  timeline: string;
  constraints: string;
  competitorsToBenchmark: string;
  inspirationReferences: string;
  numberOfTerritories: number;
};

const INITIAL_FORM: FormState = {
  clientId: "",
  campaignObjective: "",
  targetAudience: "",
  outputType: "strategic-recommendation",
  targetMarkets: [],
  budgetRange: "",
  timeline: "",
  constraints: "",
  competitorsToBenchmark: "",
  inspirationReferences: "",
  numberOfTerritories: 3,
};

const STEPS = ["Select Client", "Configure", "Review & Generate"];

// ─── Page Component ─────────────────────────────────────────────────────────

export default function CreativeStrategistPage() {
  // Step state
  const [step, setStep] = useState(0);

  // Selected client object
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Advanced options toggle
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [form, setForm] = useState<FormState>(INITIAL_FORM);

  const [generating, setGenerating] = useState(false);
  const [recommendation, setRecommendation] =
    useState<CreativeRecommendation | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Step validation ─────────────────────────────────────────────────────

  function isStep0Valid(): boolean {
    return !!form.clientId;
  }

  function isStep1Valid(): boolean {
    return (
      form.campaignObjective.length >= 30 &&
      form.targetAudience.length >= 10 &&
      !!form.outputType
    );
  }

  // ── Client loaded callback ────────────────────────────────────────────

  const handleClientLoaded = useCallback((client: Client | null) => {
    setSelectedClient(client);
  }, []);

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

  async function handleSubmit() {
    setError(null);
    setRecommendation(null);

    setGenerating(true);

    try {
      const payload: Record<string, unknown> = {
        clientId: form.clientId,
        campaignObjective: form.campaignObjective,
        targetAudience: form.targetAudience,
        outputType: form.outputType,
        targetMarkets: form.targetMarkets,
        timeline: form.timeline || undefined,
        numberOfTerritories: form.numberOfTerritories,
      };

      if (form.budgetRange) {
        payload.budgetRange = form.budgetRange;
      }

      if (form.constraints.trim()) {
        payload.constraints = form.constraints;
      }

      if (form.competitorsToBenchmark.trim()) {
        payload.competitorsToBenchmark = form.competitorsToBenchmark;
      }

      if (form.inspirationReferences.trim()) {
        payload.inspirationReferences = form.inspirationReferences;
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

  // ── Build summary items ───────────────────────────────────────────────

  function getSummaryItems(): { label: string; value: string }[] {
    const items: { label: string; value: string }[] = [
      { label: "Client", value: selectedClient?.name || "---" },
      {
        label: "Objective",
        value:
          form.campaignObjective.length > 100
            ? form.campaignObjective.slice(0, 100) + "..."
            : form.campaignObjective,
      },
      {
        label: "Target Audience",
        value:
          form.targetAudience.length > 100
            ? form.targetAudience.slice(0, 100) + "..."
            : form.targetAudience,
      },
      {
        label: "Output Type",
        value: OUTPUT_TYPES.find((t) => t.value === form.outputType)?.label || form.outputType,
      },
      { label: "Timeline", value: form.timeline || "Not set" },
    ];

    if (form.budgetRange) {
      items.push({
        label: "Budget Range",
        value: BUDGET_RANGES.find((b) => b.value === form.budgetRange)?.label || form.budgetRange,
      });
    }

    if (form.constraints.trim()) {
      items.push({
        label: "Constraints",
        value:
          form.constraints.length > 80
            ? form.constraints.slice(0, 80) + "..."
            : form.constraints,
      });
    }

    if (form.competitorsToBenchmark.trim()) {
      items.push({
        label: "Competitors",
        value: form.competitorsToBenchmark,
      });
    }

    return items;
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-4xl">
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
      <div className="bg-white rounded-xl border border-neutral-300 p-6 space-y-5">
        <h2 className="text-lg font-semibold text-brand-black">
          Campaign Brief
        </h2>

        {/* Guidance message */}
        <GuidanceMessage>
          Think of this as briefing a senior strategist before a client presentation. The more specific you are about what the client wants to achieve and who they&apos;re targeting, the more useful the recommendation will be. Vague objectives produce vague strategies — give me a real brief and I&apos;ll give you something worth presenting.
        </GuidanceMessage>

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
              helperText="Select the client this campaign is for. Their brand tone, industry, and guidelines will shape the strategic recommendation."
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
            {/* Required: Campaign objective */}
            <FormField
              label="Campaign Objective"
              required
              helperText="This is the north star of any strategy. Must be specific enough to be measurable."
            >
              <TextareaWithCount
                value={form.campaignObjective}
                onChange={(campaignObjective) =>
                  setForm((prev) => ({ ...prev, campaignObjective }))
                }
                placeholder="Drive awareness of TikTok for Business among CMOs in EMEA. Target: 200 qualified leads at the TechSummit event in June 2026."
                minLength={30}
                rows={4}
              />
            </FormField>

            {/* Required: Target audience */}
            <FormField
              label="Target Audience"
              required
              helperText="Creative strategy is audience-driven. Without knowing who we're talking to, the messaging, tone, and creative territories are guesswork."
            >
              <TextareaWithCount
                value={form.targetAudience}
                onChange={(targetAudience) =>
                  setForm((prev) => ({ ...prev, targetAudience }))
                }
                placeholder="CMOs and Heads of Digital Marketing at EMEA enterprise companies (500M+ revenue). Age 35-50. Skeptical of social media ROI for B2B."
                minLength={10}
                rows={3}
              />
            </FormField>

            {/* Required: Output type */}
            <FormField
              label="Output Type"
              required
              helperText="Determines the structure and depth of the output. A strategic recommendation and a creative brief require completely different outputs."
            >
              <div className="flex gap-2">
                {OUTPUT_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({ ...prev, outputType: type.value }))
                    }
                    className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                      form.outputType === type.value
                        ? "bg-brand-black text-white border-brand-black"
                        : "bg-white text-neutral-700 border-neutral-300 hover:border-neutral-400"
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </FormField>

            {/* Recommended fields */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label={
                  <>
                    Budget Range
                    <RecommendedBadge />
                  </>
                }
                helperText="Budget fundamentally shapes creative ambition. A 50K budget should not receive a recommendation requiring 3 TVC shoots."
              >
                <select
                  value={form.budgetRange}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, budgetRange: e.target.value }))
                  }
                  className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                >
                  {BUDGET_RANGES.map((b) => (
                    <option key={b.value} value={b.value}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField
                label={
                  <>
                    Timeline
                    <RecommendedBadge />
                  </>
                }
                helperText="Determines what's executable. A 2-week timeline eliminates any production that takes 4 weeks."
              >
                <input
                  type="text"
                  value={form.timeline}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, timeline: e.target.value }))
                  }
                  placeholder="Campaign launch: June 15, 2026"
                  className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                />
              </FormField>
            </div>

            <FormField
              label={
                <>
                  Constraints & Context
                  <RecommendedBadge />
                </>
              }
              helperText="Mandatory elements, legal disclaimers, competitive restrictions, or recent context. Prevents recommending something the client already tried."
            >
              <TextareaWithCount
                value={form.constraints}
                onChange={(constraints) =>
                  setForm((prev) => ({ ...prev, constraints }))
                }
                placeholder="Must avoid direct competitor comparisons. Previous campaign (Q4 2025) used 'For You' messaging — don't repeat. Must include accessibility standards."
                rows={3}
              />
            </FormField>

            <FormField
              label={
                <>
                  Competitors to Benchmark
                  <RecommendedBadge />
                </>
              }
              helperText="Without knowing the competitive landscape, the strategy may recommend something already done better by a competitor."
            >
              <input
                type="text"
                value={form.competitorsToBenchmark}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    competitorsToBenchmark: e.target.value,
                  }))
                }
                placeholder="Meta for Business, Google Ads, Snapchat for Business"
                className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
              />
            </FormField>

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
                    label="Target Markets"
                    helperText="Select markets this campaign will run in. Shapes media mix, cultural references, and localization needs."
                  >
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
                  </FormField>

                  <FormField
                    label="Inspiration References"
                    helperText="Campaigns or brands the client admires (or wants to differentiate from). Orients the creative territories."
                  >
                    <TextareaWithCount
                      value={form.inspirationReferences}
                      onChange={(inspirationReferences) =>
                        setForm((prev) => ({ ...prev, inspirationReferences }))
                      }
                      placeholder="e.g. Apple 'Shot on iPhone' campaign, Spotify Wrapped, Dove Real Beauty"
                      rows={2}
                    />
                  </FormField>

                  <FormField
                    label="Number of Territories"
                    helperText="How many creative directions to explore. Default 3."
                  >
                    <div className="flex gap-2">
                      {TERRITORY_COUNTS.map((t) => (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              numberOfTerritories: t.value,
                            }))
                          }
                          className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                            form.numberOfTerritories === t.value
                              ? "bg-brand-black text-white border-brand-black"
                              : "bg-white text-neutral-700 border-neutral-300 hover:border-neutral-400"
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
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

        {/* Step 2: Review & Generate */}
        {step === 2 && (
          <div className="space-y-4">
            <PreSubmitSummary
              items={getSummaryItems()}
              onBack={() => setStep(1)}
              onConfirm={handleSubmit}
              loading={generating}
              buttonLabel="Get Recommendation"
            />

            {/* Error */}
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                {error}
              </div>
            )}
          </div>
        )}
      </div>

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
