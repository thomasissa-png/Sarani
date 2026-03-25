"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import type { Client } from "@/lib/db/schema";
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
import {
  ClientSelector,
  FormField,
  GuidanceMessage,
  RecommendedBadge,
  StepIndicator,
  PreSubmitSummary,
  TextareaWithCount,
} from "@/components/admin/guided-form";
import { generateProposalHTML } from "@/lib/export/proposal-html";

// ─── Types ──────────────────────────────────────────────────────────────────

type GenerateResponse = {
  proposal: ProposalResponse;
  outputId: string;
  usage: { inputTokens: number; outputTokens: number };
};

type ProposalFormat = "" | "pdf" | "slide-deck" | "email-body";

const PROPOSAL_FORMAT_OPTIONS: { value: ProposalFormat; label: string }[] = [
  { value: "", label: "-- Select format --" },
  { value: "pdf", label: "PDF document" },
  { value: "slide-deck", label: "Slide deck" },
  { value: "email-body", label: "Email body" },
];

type FormState = {
  // Required
  prospectName: string;
  clientPainPoint: string;
  proposedSolution: string;
  proposedInvestment: string;
  // Recommended
  proofCaseReference: string;
  decisionMaker: string;
  proposalFormat: ProposalFormat;
  timelineForDecision: string;
  competitorInPitch: string;
  // Optional
  additionalProofPoints: string;
  specialConditions: string;
  // Kept from original
  prospectIndustry: ProspectIndustry | "";
  prospectNeeds: string;
  servicesRequested: ServiceType[];
  estimatedBudget: string;
  timeline: string;
  competitorMentioned: string;
  language: ProposalLanguage;
  existingClientId: string;
};

const INITIAL_FORM: FormState = {
  prospectName: "",
  clientPainPoint: "",
  proposedSolution: "",
  proposedInvestment: "",
  proofCaseReference: "",
  decisionMaker: "",
  proposalFormat: "",
  timelineForDecision: "",
  competitorInPitch: "",
  additionalProofPoints: "",
  specialConditions: "",
  prospectIndustry: "",
  prospectNeeds: "",
  servicesRequested: [],
  estimatedBudget: "",
  timeline: "",
  competitorMentioned: "",
  language: "EN",
  existingClientId: "",
};

const STEPS = ["Prospect Info", "Configure", "Review & Generate"];

// ─── Page Component ─────────────────────────────────────────────────────────

export default function ProposalAgentPage() {
  // Step state
  const [step, setStep] = useState(0);

  // Form state
  const [form, setForm] = useState<FormState>(INITIAL_FORM);

  // Existing client reference (optional)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const handleClientLoaded = useCallback((client: Client | null) => {
    setSelectedClient(client);
  }, []);

  // Advanced options toggle
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Generation state
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

  // ── Step validation ─────────────────────────────────────────────────────

  function canProceedStep0(): boolean {
    return form.prospectName.trim().length >= 2;
  }

  function canProceedStep1(): boolean {
    return (
      form.clientPainPoint.length >= 20 &&
      form.proposedSolution.length >= 20 &&
      !!form.proposedInvestment.trim()
    );
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleGenerate() {
    setError(null);
    setProposal(null);
    setGenerating(true);

    try {
      const payload: Record<string, unknown> = {
        prospectName: form.prospectName.trim(),
        servicesRequested: form.servicesRequested,
        language: form.language,
        clientPainPoint: form.clientPainPoint.trim(),
        proposedSolution: form.proposedSolution.trim(),
        proposedInvestment: form.proposedInvestment.trim(),
      };

      if (form.existingClientId) {
        payload.existingClientId = form.existingClientId;
      }
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
      if (form.competitorMentioned.trim() || form.competitorInPitch.trim()) {
        payload.competitorMentioned = (form.competitorMentioned || form.competitorInPitch).trim();
      }
      if (form.proofCaseReference.trim()) {
        payload.proofCaseReference = form.proofCaseReference.trim();
      }
      if (form.decisionMaker.trim()) {
        payload.decisionMaker = form.decisionMaker.trim();
      }
      if (form.proposalFormat) {
        payload.proposalFormat = form.proposalFormat;
      }
      if (form.timelineForDecision.trim()) {
        payload.timelineForDecision = form.timelineForDecision.trim();
      }
      if (form.additionalProofPoints.trim()) {
        payload.additionalProofPoints = form.additionalProofPoints.trim();
      }
      if (form.specialConditions.trim()) {
        payload.specialConditions = form.specialConditions.trim();
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

  // ── HTML export ────────────────────────────────────────────────────────

  function handlePreviewHTML() {
    if (!proposal) return;
    const html = generateProposalHTML({
      proposal,
      prospectName: form.prospectName,
      industry: form.prospectIndustry || undefined,
    });
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  }

  function handleDownloadPDF() {
    if (!proposal) return;
    const html = generateProposalHTML({
      proposal,
      prospectName: form.prospectName,
      industry: form.prospectIndustry || undefined,
    });
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      win.onload = () => {
        setTimeout(() => win.print(), 500);
      };
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

  // ── Build summary items ────────────────────────────────────────────────

  function getSummaryItems() {
    return [
      { label: "Prospect", value: form.prospectName },
      {
        label: "Industry",
        value: form.prospectIndustry
          ? PROSPECT_INDUSTRY_LABELS[form.prospectIndustry]
          : "Not specified",
      },
      {
        label: "Client Pain Point",
        value:
          form.clientPainPoint.length > 80
            ? form.clientPainPoint.slice(0, 80) + "..."
            : form.clientPainPoint,
      },
      {
        label: "Proposed Solution",
        value:
          form.proposedSolution.length > 80
            ? form.proposedSolution.slice(0, 80) + "..."
            : form.proposedSolution,
      },
      { label: "Investment", value: form.proposedInvestment ? `${form.proposedInvestment} EUR` : "---" },
      ...(form.servicesRequested.length > 0
        ? [{
            label: "Services",
            value: form.servicesRequested
              .map((s) => SERVICE_LABELS[s])
              .join(", "),
          }]
        : []),
      { label: "Language", value: form.language === "EN" ? "English" : "French" },
      ...(form.decisionMaker
        ? [{ label: "Decision Maker", value: form.decisionMaker }]
        : []),
      ...(form.competitorInPitch
        ? [{ label: "Competitor in Pitch", value: form.competitorInPitch }]
        : []),
      ...(form.proposalFormat
        ? [{ label: "Format", value: PROPOSAL_FORMAT_OPTIONS.find((o) => o.value === form.proposalFormat)?.label || form.proposalFormat }]
        : []),
    ];
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-4xl">
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
      <div className="bg-white rounded-xl border border-neutral-300 p-6 space-y-5">
        <h2 className="text-lg font-semibold text-brand-black">
          Prospect Brief
        </h2>

        {/* Guidance message */}
        <GuidanceMessage>
          A winning proposal is a targeted argument, not a capabilities brochure.
          Tell me what the client&apos;s actual pain is (not &quot;they need
          design&quot; — &quot;they&apos;re losing 3 weeks on every campaign
          revision cycle&quot;), what we&apos;ve done for a similar brand, and
          what we&apos;re proposing to do. I&apos;ll handle the structure, the
          value framing, and the pricing narrative.
        </GuidanceMessage>

        <StepIndicator steps={STEPS} currentStep={step} />

        {/* ── Step 0: Prospect Info ─────────────────────────────────────── */}
        {step === 0 && (
          <div className="space-y-5">
            {/* Prospect name */}
            <FormField
              label="Prospect Name"
              required
              helperText="The company or brand name this proposal is for."
            >
              <input
                type="text"
                value={form.prospectName}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    prospectName: e.target.value,
                  }))
                }
                placeholder="e.g. Danone, BMW, L'Oreal"
                className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
              />
            </FormField>

            {/* Industry */}
            <FormField
              label="Industry"
              helperText="Select the prospect's industry so relevant case studies and terminology are included."
            >
              <select
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
            </FormField>

            {/* Language */}
            <FormField
              label="Proposal Language"
              helperText="The language the proposal will be written in."
            >
              <select
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
            </FormField>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                disabled={!canProceedStep0()}
                onClick={() => setStep(1)}
                className="px-6 py-2.5 bg-brand-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next: Configure
              </button>
            </div>
          </div>
        )}

        {/* ── Step 1: Configure ─────────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-5">
            {/* Existing client reference — optional */}
            <ClientSelector
              value={form.existingClientId}
              onChange={(clientId) =>
                setForm((prev) => ({ ...prev, existingClientId: clientId }))
              }
              required={false}
              onClientLoaded={handleClientLoaded}
              helperText="If this prospect is already a client, select them to load their context. Otherwise leave empty."
            />

            {/* Client pain point — required, most critical */}
            <FormField
              label="Client Pain Point"
              required
              helperText="This is the opening argument of the proposal. Without a specific pain, the proposal starts with Sarani's capabilities — the wrong starting point. The pain must be the client's pain, not a generic industry pain."
            >
              <TextareaWithCount
                value={form.clientPainPoint}
                onChange={(val) =>
                  setForm((prev) => ({ ...prev, clientPainPoint: val }))
                }
                placeholder="L'Oreal's internal studio is 4 weeks behind on regional campaign adaptation. Their agency takes 3 days for each revision, causing delays that cost them media placements."
                minLength={20}
                rows={4}
              />
            </FormField>

            {/* Proposed solution — required */}
            <FormField
              label="Proposed Solution"
              required
              helperText="What specifically Sarani is proposing to do. Not the full service menu — the specific answer to the specific pain described above."
            >
              <TextareaWithCount
                value={form.proposedSolution}
                onChange={(val) =>
                  setForm((prev) => ({ ...prev, proposedSolution: val }))
                }
                placeholder="Sarani takes over the adaptation workflow for 5 EMEA markets. D+1 delivery, unlimited revisions, dedicated point of contact in Paris timezone."
                minLength={20}
                rows={4}
              />
            </FormField>

            {/* Proposed investment — required */}
            <FormField
              label="Proposed Investment (EUR)"
              required
              helperText="The commercial anchor. Without it, the proposal has no closing argument."
            >
              <input
                type="text"
                value={form.proposedInvestment}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    proposedInvestment: e.target.value,
                  }))
                }
                placeholder="8500 (monthly retainer)"
                className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
              />
            </FormField>

            {/* Services requested */}
            <FormField
              label="Services Requested"
              helperText="Select relevant services. Case studies matching these services will be automatically included."
            >
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
            </FormField>

            {/* ── Recommended fields ──────────────────────────────────────── */}
            <div className="border-t border-neutral-200 pt-5 space-y-5">
              {/* Decision maker — recommended */}
              <FormField
                label={
                  <>
                    Decision Maker
                    <RecommendedBadge />
                  </>
                }
                helperText="Personalizes the proposal. Auto-filled from client record but overridable for a specific contact at a large company."
              >
                <input
                  type="text"
                  value={form.decisionMaker}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      decisionMaker: e.target.value,
                    }))
                  }
                  placeholder="Sophie Martin, Head of Marketing EMEA"
                  className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                />
              </FormField>

              {/* Competitor in pitch — recommended */}
              <FormField
                label={
                  <>
                    Competitor in Pitch
                    <RecommendedBadge />
                  </>
                }
                helperText="If Sarani knows it's competing against specific agencies, the proposal can address comparison points proactively."
              >
                <input
                  type="text"
                  value={form.competitorInPitch}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      competitorInPitch: e.target.value,
                    }))
                  }
                  placeholder="e.g. WPP, Publicis, local agency name"
                  className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                />
              </FormField>

              {/* Proof case reference — recommended */}
              <FormField
                label={
                  <>
                    Proof Case Reference
                    <RecommendedBadge />
                  </>
                }
                helperText="The single most persuasive element of any proposal. 'We did this for GEODIS (same industry, same pain) and here's the result' is worth more than 10 pages of capabilities."
              >
                <input
                  type="text"
                  value={form.proofCaseReference}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      proofCaseReference: e.target.value,
                    }))
                  }
                  placeholder="GEODIS — 5,700 slides in 3 weeks"
                  className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                />
              </FormField>

              {/* Proposal format — recommended */}
              <FormField
                label={
                  <>
                    Proposal Format
                    <RecommendedBadge />
                  </>
                }
                helperText="A slide deck for L'Oreal and a 3-paragraph email proposal for a mid-size brand are different instruments."
              >
                <select
                  value={form.proposalFormat}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      proposalFormat: e.target.value as ProposalFormat,
                    }))
                  }
                  className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                >
                  {PROPOSAL_FORMAT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </FormField>

              {/* Timeline for decision — recommended */}
              <FormField
                label={
                  <>
                    Timeline for Decision
                    <RecommendedBadge />
                  </>
                }
                helperText="If there's a known deadline for the client to decide, this urgency can be woven into the closing argument."
              >
                <input
                  type="text"
                  value={form.timelineForDecision}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      timelineForDecision: e.target.value,
                    }))
                  }
                  placeholder="Decision expected: April 15, 2026"
                  className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                />
              </FormField>
            </div>

            {/* ── Advanced options (collapsible) ─────────────────────────── */}
            <div className="border-t border-neutral-200 pt-4">
              <button
                type="button"
                onClick={() => setAdvancedOpen(!advancedOpen)}
                className="flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-brand-black transition-colors"
              >
                <span
                  className="transition-transform"
                  style={{
                    display: "inline-block",
                    transform: advancedOpen ? "rotate(90deg)" : "rotate(0deg)",
                  }}
                >
                  &#9654;
                </span>
                Advanced options
              </button>
              {advancedOpen && (
                <div className="mt-4 space-y-5">
                  <FormField
                    label="Additional Proof Points"
                    helperText="Specific metrics or outcomes not yet in the case study library: response time, client satisfaction scores, volume handled."
                  >
                    <TextareaWithCount
                      value={form.additionalProofPoints}
                      onChange={(val) =>
                        setForm((prev) => ({
                          ...prev,
                          additionalProofPoints: val,
                        }))
                      }
                      placeholder="e.g. 98% on-time delivery rate, 4.8/5 client satisfaction, 1,500+ assets per month capacity"
                      rows={3}
                    />
                  </FormField>

                  <FormField
                    label="Special Conditions"
                    helperText="First project satisfaction guarantee, onboarding timeline, dedicated team structure — any specific commitments."
                  >
                    <TextareaWithCount
                      value={form.specialConditions}
                      onChange={(val) =>
                        setForm((prev) => ({
                          ...prev,
                          specialConditions: val,
                        }))
                      }
                      placeholder="e.g. 30-day satisfaction guarantee, dedicated team of 3, 2-week onboarding"
                      rows={3}
                    />
                  </FormField>

                  {/* Budget + Timeline (moved to advanced) */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      label="Estimated Budget Range"
                      helperText="If known, helps calibrate the scope and pricing approach."
                    >
                      <input
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
                    </FormField>
                    <FormField
                      label="Delivery Timeline"
                      helperText="When does the prospect need this delivered?"
                    >
                      <input
                        type="text"
                        value={form.timeline}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            timeline: e.target.value,
                          }))
                        }
                        placeholder="e.g. Q2 2026, 3 months"
                        className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                      />
                    </FormField>
                  </div>
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(0)}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-neutral-300 text-neutral-600 hover:bg-neutral-100 transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                disabled={!canProceedStep1()}
                onClick={() => {
                  setError(null);
                  setStep(2);
                }}
                className="px-6 py-2.5 bg-brand-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next: Review
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Review & Generate ─────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-4">
            {/* Helper banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800">
              Case studies matching the prospect&apos;s industry will be
              automatically included in the proposal.
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <PreSubmitSummary
              items={getSummaryItems()}
              onConfirm={handleGenerate}
              onBack={() => setStep(1)}
              loading={generating}
              buttonLabel="Generate Proposal"
            />
          </div>
        )}
      </div>

      {/* Output */}
      {proposal && (
        <ProposalOutput
          proposal={proposal}
          prospectName={form.prospectName}
          onCopyAll={handleCopyAll}
          onDownload={handleDownload}
          onPreviewHTML={handlePreviewHTML}
          onDownloadPDF={handleDownloadPDF}
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
  onPreviewHTML,
  onDownloadPDF,
  copied,
}: {
  proposal: ProposalResponse;
  prospectName: string;
  onCopyAll: () => void;
  onDownload: () => void;
  onPreviewHTML: () => void;
  onDownloadPDF: () => void;
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
          <button
            onClick={onPreviewHTML}
            className="px-3 py-1.5 text-sm font-medium border border-brand-cerulean text-brand-cerulean rounded-lg hover:bg-blue-50 transition-colors"
          >
            Preview HTML
          </button>
          <button
            onClick={onDownloadPDF}
            className="px-3 py-1.5 text-sm font-medium bg-brand-black text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            Download PDF
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
          {p.nextSteps.map((s, i) => (
            <li
              key={i}
              className="text-sm text-brand-black flex items-start gap-2"
            >
              <span className="text-neutral-400 font-medium shrink-0">
                {i + 1}.
              </span>
              {s}
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
