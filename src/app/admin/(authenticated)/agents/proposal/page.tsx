"use client";

import { useState } from "react";
import Link from "next/link";
import {
  PROSPECT_INDUSTRIES,
  PROSPECT_INDUSTRY_LABELS,
  SERVICES_AVAILABLE,
  SERVICE_LABELS,
  PROPOSAL_LANGUAGES,
  type ProspectIndustry,
  type ServiceType,
  type ProposalLanguage,
  type ProposalResponse,
} from "@/lib/validations/proposal";

// ─── Types ──────────────────────────────────────────────────────────────────

type GenerateResponse = {
  proposal: ProposalResponse;
  outputId: string;
  usage: { inputTokens: number; outputTokens: number };
};

type FormState = {
  prospectName: string;
  prospectIndustry: ProspectIndustry | "";
  prospectNeeds: string;
  servicesRequested: ServiceType[];
  estimatedBudget: string;
  timeline: string;
  competitorMentioned: string;
  language: ProposalLanguage;
};

const INITIAL_FORM: FormState = {
  prospectName: "",
  prospectIndustry: "",
  prospectNeeds: "",
  servicesRequested: [],
  estimatedBudget: "",
  timeline: "",
  competitorMentioned: "",
  language: "EN",
};

// ─── Page Component ─────────────────────────────────────────────────────────

export default function ProposalAgentPage() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [generating, setGenerating] = useState(false);
  const [proposal, setProposal] = useState<ProposalResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Toggle service ──────────────────────────────────────────────────────

  function toggleService(service: ServiceType) {
    setForm((prev) => {
      const services = prev.servicesRequested.includes(service)
        ? prev.servicesRequested.filter((s) => s !== service)
        : [...prev.servicesRequested, service];
      return { ...prev, servicesRequested: services };
    });
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setProposal(null);

    if (form.prospectName.trim().length < 2) {
      setError("Prospect name must be at least 2 characters.");
      return;
    }
    if (form.servicesRequested.length === 0) {
      setError("Select at least one service.");
      return;
    }

    setGenerating(true);

    try {
      const payload: Record<string, unknown> = {
        prospectName: form.prospectName.trim(),
        servicesRequested: form.servicesRequested,
        language: form.language,
      };

      if (form.prospectIndustry) {
        payload.prospectIndustry = form.prospectIndustry;
      }
      if (form.prospectNeeds.trim()) {
        payload.prospectNeeds = form.prospectNeeds.trim();
      }
      if (form.estimatedBudget.trim()) {
        payload.estimatedBudget = form.estimatedBudget.trim();
      }
      if (form.timeline.trim()) {
        payload.timeline = form.timeline.trim();
      }
      if (form.competitorMentioned.trim()) {
        payload.competitorMentioned = form.competitorMentioned.trim();
      }

      const res = await fetch("/api/admin/agents/proposal/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Proposal generation failed");
      }

      const data: GenerateResponse = await res.json();
      setProposal(data.proposal);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate proposal"
      );
    } finally {
      setGenerating(false);
    }
  }

  // ── Markdown builder ──────────────────────────────────────────────────────

  function buildMarkdown(p: ProposalResponse): string {
    const lines: string[] = [];

    lines.push(`# Proposal for ${form.prospectName}`);
    lines.push(``);
    lines.push(`## Executive Summary`);
    lines.push(p.executiveSummary);
    lines.push(``);
    lines.push(`## Client Understanding`);
    lines.push(p.clientUnderstanding);
    lines.push(``);
    lines.push(`## Proposed Approach`);
    lines.push(p.proposedApproach);
    lines.push(``);
    lines.push(`## Relevant Case Studies`);
    p.relevantCaseStudies.forEach((cs) => {
      lines.push(`### ${cs.client} — ${cs.deliverable}`);
      lines.push(`**Key Metric:** ${cs.keyMetric}`);
      lines.push(`**Why relevant:** ${cs.relevanceExplanation}`);
      lines.push(``);
    });
    lines.push(`## Scope of Work`);
    p.scopeOfWork.forEach((phase) => {
      lines.push(`### ${phase.phase} (${phase.duration})`);
      phase.deliverables.forEach((d) => lines.push(`- ${d}`));
      lines.push(``);
    });
    lines.push(`## Timeline`);
    lines.push(p.timeline);
    lines.push(``);
    lines.push(`## Pricing Approach`);
    lines.push(p.pricingApproach);
    lines.push(``);
    lines.push(`## Team Overview`);
    lines.push(p.teamOverview);
    lines.push(``);
    lines.push(`## Why Sarani`);
    p.whySarani.forEach((w) => lines.push(`- ${w}`));
    lines.push(``);
    lines.push(`## Next Steps`);
    p.nextSteps.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
    lines.push(``);
    if (p.appendix) {
      lines.push(`## Appendix`);
      lines.push(p.appendix);
      lines.push(``);
    }
    if (p.hypotheses.length > 0) {
      lines.push(`## Hypotheses`);
      p.hypotheses.forEach((h) => lines.push(`- [HYPOTHESIS] ${h}`));
    }

    return lines.join("\n");
  }

  // ── Copy / Download ───────────────────────────────────────────────────────

  const [copied, setCopied] = useState(false);

  function handleCopyAll() {
    if (!proposal) return;
    navigator.clipboard.writeText(buildMarkdown(proposal));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    if (!proposal) return;
    const md = buildMarkdown(proposal);
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `proposal-${form.prospectName.toLowerCase().replace(/\s+/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-black">
            Proposal Generator
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            Generate personalized commercial proposals for prospects
          </p>
        </div>
        <Link
          href="/admin/agents/proposal/history"
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
          Prospect Brief
        </h2>

        {/* Prospect name */}
        <div>
          <label
            htmlFor="prospectName"
            className="block text-sm font-medium text-neutral-700 mb-1.5"
          >
            Prospect Name <span className="text-red-500">*</span>
          </label>
          <input
            id="prospectName"
            type="text"
            value={form.prospectName}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, prospectName: e.target.value }))
            }
            placeholder="e.g. Danone, BMW, L'Oreal"
            className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
          />
        </div>

        {/* Industry + Language */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="industry"
              className="block text-sm font-medium text-neutral-700 mb-1.5"
            >
              Industry
            </label>
            <select
              id="industry"
              value={form.prospectIndustry}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  prospectIndustry: e.target.value as ProspectIndustry | "",
                }))
              }
              className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
            >
              <option value="">Select industry...</option>
              {PROSPECT_INDUSTRIES.map((ind) => (
                <option key={ind} value={ind}>
                  {PROSPECT_INDUSTRY_LABELS[ind]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="language"
              className="block text-sm font-medium text-neutral-700 mb-1.5"
            >
              Proposal Language
            </label>
            <select
              id="language"
              value={form.language}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  language: e.target.value as ProposalLanguage,
                }))
              }
              className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
            >
              {PROPOSAL_LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {lang === "EN" ? "English" : "French"}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Needs / brief */}
        <div>
          <label
            htmlFor="needs"
            className="block text-sm font-medium text-neutral-700 mb-1.5"
          >
            Needs / Brief
          </label>
          <textarea
            id="needs"
            value={form.prospectNeeds}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, prospectNeeds: e.target.value }))
            }
            placeholder="Describe what the prospect needs — context, challenges, goals..."
            rows={4}
            className="w-full px-4 py-3 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent resize-y"
          />
        </div>

        {/* Services requested */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Services Requested <span className="text-red-500">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {SERVICES_AVAILABLE.map((service) => {
              const selected = form.servicesRequested.includes(service);
              return (
                <button
                  key={service}
                  type="button"
                  onClick={() => toggleService(service)}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                    selected
                      ? "bg-brand-black text-white border-brand-black"
                      : "bg-white text-neutral-700 border-neutral-300 hover:border-neutral-400"
                  }`}
                >
                  {SERVICE_LABELS[service]}
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
              Estimated Budget (optional)
            </label>
            <input
              id="budget"
              type="text"
              value={form.estimatedBudget}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  estimatedBudget: e.target.value,
                }))
              }
              placeholder="e.g. 50,000 EUR"
              className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
            />
          </div>
          <div>
            <label
              htmlFor="timeline"
              className="block text-sm font-medium text-neutral-700 mb-1.5"
            >
              Timeline (optional)
            </label>
            <input
              id="timeline"
              type="text"
              value={form.timeline}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, timeline: e.target.value }))
              }
              placeholder="e.g. Q2 2026, 3 months"
              className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
            />
          </div>
        </div>

        {/* Competitor mentioned */}
        <div>
          <label
            htmlFor="competitor"
            className="block text-sm font-medium text-neutral-700 mb-1.5"
          >
            Competitor Mentioned (optional)
          </label>
          <input
            id="competitor"
            type="text"
            value={form.competitorMentioned}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                competitorMentioned: e.target.value,
              }))
            }
            placeholder="Who are they comparing us to?"
            className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
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
            {generating ? "Generating..." : "Generate Proposal"}
          </button>
        </div>
      </form>

      {/* Output */}
      {proposal && (
        <ProposalOutput
          proposal={proposal}
          prospectName={form.prospectName}
          onCopyAll={handleCopyAll}
          onDownload={handleDownload}
          copied={copied}
        />
      )}
    </div>
  );
}

// ─── Proposal Output Component ──────────────────────────────────────────────

function ProposalOutput({
  proposal: p,
  prospectName,
  onCopyAll,
  onDownload,
  copied,
}: {
  proposal: ProposalResponse;
  prospectName: string;
  onCopyAll: () => void;
  onDownload: () => void;
  copied: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-neutral-300 p-6 space-y-6">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-brand-black">
          Proposal for {prospectName}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={onCopyAll}
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
          {p.executiveSummary}
        </p>
      </section>

      {/* Client Understanding */}
      <section>
        <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-1">
          Client Understanding
        </h3>
        <p className="text-sm text-brand-black leading-relaxed">
          {p.clientUnderstanding}
        </p>
      </section>

      {/* Proposed Approach */}
      <section>
        <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-1">
          Proposed Approach
        </h3>
        <p className="text-sm text-brand-black leading-relaxed">
          {p.proposedApproach}
        </p>
      </section>

      {/* Case Studies */}
      <section>
        <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-2">
          Relevant Case Studies ({p.relevantCaseStudies.length})
        </h3>
        <div className="grid gap-3">
          {p.relevantCaseStudies.map((cs, i) => (
            <div
              key={i}
              className="border border-neutral-200 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-brand-black">
                  {cs.client} — {cs.deliverable}
                </h4>
                <span className="text-xs font-medium bg-brand-black text-white px-2 py-0.5 rounded">
                  {cs.keyMetric}
                </span>
              </div>
              <p className="text-sm text-neutral-600">
                {cs.relevanceExplanation}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Scope of Work */}
      <section>
        <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-2">
          Scope of Work
        </h3>
        <div className="space-y-3">
          {p.scopeOfWork.map((phase, i) => (
            <div
              key={i}
              className="border border-neutral-200 rounded-lg px-4 py-3"
            >
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-semibold text-brand-black">
                  {phase.phase}
                </h4>
                <span className="text-xs text-neutral-500">
                  {phase.duration}
                </span>
              </div>
              <ul className="text-sm text-neutral-700 space-y-0.5">
                {phase.deliverables.map((d, j) => (
                  <li key={j} className="flex items-start gap-1.5">
                    <span className="text-neutral-400 shrink-0">-</span>
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Timeline */}
      <section>
        <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-1">
          Timeline
        </h3>
        <p className="text-sm text-brand-black leading-relaxed">
          {p.timeline}
        </p>
      </section>

      {/* Pricing Approach */}
      <section className="bg-neutral-50 rounded-lg px-4 py-3">
        <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-1">
          Pricing Approach
        </h3>
        <p className="text-sm text-brand-black leading-relaxed">
          {p.pricingApproach}
        </p>
      </section>

      {/* Team Overview */}
      <section>
        <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-1">
          Team Overview
        </h3>
        <p className="text-sm text-brand-black leading-relaxed">
          {p.teamOverview}
        </p>
      </section>

      {/* Why Sarani */}
      <section>
        <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-2">
          Why Sarani
        </h3>
        <div className="space-y-2">
          {p.whySarani.map((reason, i) => (
            <div
              key={i}
              className="flex items-start gap-3 bg-neutral-50 rounded-lg px-4 py-3"
            >
              <span className="text-xs font-bold bg-brand-black text-white w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </span>
              <p className="text-sm text-brand-black">{reason}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Next Steps */}
      <section>
        <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-2">
          Next Steps
        </h3>
        <ol className="space-y-1.5">
          {p.nextSteps.map((step, i) => (
            <li
              key={i}
              className="text-sm text-brand-black flex items-start gap-2"
            >
              <span className="text-neutral-400 font-medium shrink-0">
                {i + 1}.
              </span>
              {step}
            </li>
          ))}
        </ol>
      </section>

      {/* Appendix */}
      {p.appendix && (
        <section className="bg-neutral-50 rounded-lg px-4 py-3">
          <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-1">
            Appendix
          </h3>
          <p className="text-sm text-brand-black leading-relaxed">
            {p.appendix}
          </p>
        </section>
      )}

      {/* Hypotheses */}
      {p.hypotheses.length > 0 && (
        <section className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <h3 className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">
            Hypotheses (to validate)
          </h3>
          <ul className="text-sm text-amber-800 space-y-0.5">
            {p.hypotheses.map((h, i) => (
              <li key={i}>- {h}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
