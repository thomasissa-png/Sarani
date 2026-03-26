"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Client } from "@/lib/db/schema";
import {
  TEAM_TEMPLATES,
  AGENT_TYPE_LABELS,
  type TemplateType,
  type TeamTemplate,
  type AgentType,
} from "@/lib/teams/templates";

// ─── Template Icons ─────────────────────────────────────────────────────────

// ─── Custom Step Type ────────────────────────────────────────────────────────

interface CustomStep {
  id: string;
  agentType: AgentType;
  label: string;
}

const AVAILABLE_AGENTS: AgentType[] = [
  "creative_strategist",
  "copywriter",
  "seo",
  "social",
  "qa",
  "video_script",
  "translator",
  "project_manager",
];

function generateStepId(): string {
  return Math.random().toString(36).slice(2, 10);
}

const TEMPLATE_ICONS: Record<TemplateType, React.ReactNode> = {
  social_media: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  ),
  seo_content: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  brand_identity: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13.5" cy="6.5" r="0.5" fill="currentColor" /><circle cx="17.5" cy="10.5" r="0.5" fill="currentColor" /><circle cx="8.5" cy="7.5" r="0.5" fill="currentColor" /><circle cx="6.5" cy="12.5" r="0.5" fill="currentColor" /><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
    </svg>
  ),
  video: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" />
    </svg>
  ),
  translation: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
  ad_campaign: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  custom: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  ),
};

// ─── Page Component ─────────────────────────────────────────────────────────

export default function NewTeamPage() {
  const router = useRouter();

  // Step: 0 = template picker, 1 = form
  const [step, setStep] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType | null>(null);
  const isCustom = selectedTemplate === "custom";

  // Form state
  const [name, setName] = useState("");
  const [clientId, setClientId] = useState("");
  const [brief, setBrief] = useState("");

  // Custom steps state
  const [customSteps, setCustomSteps] = useState<CustomStep[]>([
    { id: generateStepId(), agentType: "creative_strategist", label: "" },
  ]);

  // Data
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/clients");
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

  function handleSelectTemplate(type: TemplateType) {
    setSelectedTemplate(type);
    if (type === "custom") {
      setCustomSteps([
        { id: generateStepId(), agentType: "creative_strategist", label: "" },
      ]);
    }
    setStep(1);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTemplate || !clientId || !name.trim() || !brief.trim()) return;

    if (isCustom) {
      const validSteps = customSteps.filter((s) => s.label.trim());
      if (validSteps.length === 0) return;
    }

    setSubmitting(true);
    setError(null);

    const stepsPayload = isCustom
      ? customSteps
          .filter((s) => s.label.trim())
          .map((s, i) => ({
            agentType: s.agentType,
            stepOrder: i + 1,
            label: s.label.trim(),
          }))
      : TEAM_TEMPLATES[selectedTemplate as Exclude<TemplateType, "custom">].steps.map((s) => ({
            agentType: s.agentType,
            stepOrder: s.stepOrder,
            label: s.label,
          }));

    try {
      const res = await fetch("/api/admin/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          clientId,
          templateType: selectedTemplate,
          brief: brief.trim(),
          steps: stepsPayload,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to create team");
      }

      const data = await res.json();
      router.push(`/admin/teams/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  const selectedTemplateData = selectedTemplate && selectedTemplate !== "custom"
    ? TEAM_TEMPLATES[selectedTemplate]
    : null;

  const customStepsValid = isCustom
    ? customSteps.filter((s) => s.label.trim()).length > 0
    : true;

  const formValid =
    name.trim().length > 0 &&
    clientId.length > 0 &&
    brief.trim().length >= 20 &&
    customStepsValid;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/teams"
          className="p-2 rounded-lg text-neutral-400 hover:text-brand-black hover:bg-neutral-100 transition-colors"
          aria-label="Back to teams"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-brand-black">New AI Team</h1>
          <p className="text-neutral-500 text-sm mt-0.5">
            {step === 0
              ? "Choose a project template"
              : `Configure your ${isCustom ? "Custom" : selectedTemplateData?.name} team`}
          </p>
        </div>
      </div>

      {/* Step 0: Template Picker */}
      {step === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {(Object.values(TEAM_TEMPLATES) as TeamTemplate[])
            .filter((tmpl) => tmpl.type !== "custom")
            .map((tmpl) => (
            <button
              key={tmpl.type}
              onClick={() => handleSelectTemplate(tmpl.type)}
              className="bg-white border border-neutral-300 rounded-xl p-5 text-left hover:border-brand-cerulean hover:shadow-sm transition-all group"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-sky-50 text-brand-cerulean flex items-center justify-center group-hover:bg-brand-cerulean group-hover:text-white transition-colors">
                  {TEMPLATE_ICONS[tmpl.type]}
                </div>
                <h3 className="font-semibold text-brand-black">{tmpl.name}</h3>
              </div>
              <p className="text-sm text-neutral-500 mb-4 line-clamp-2">
                {tmpl.description}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {tmpl.steps.map((s) => (
                  <span
                    key={s.stepOrder}
                    className="px-2 py-0.5 bg-neutral-100 text-neutral-500 text-xs rounded-full"
                  >
                    {AGENT_TYPE_LABELS[s.agentType]}
                  </span>
                ))}
              </div>
            </button>
          ))}

          {/* Custom Team card */}
          <button
            onClick={() => handleSelectTemplate("custom")}
            className="bg-white border border-dashed border-neutral-300 rounded-xl p-5 text-left hover:border-brand-cerulean hover:shadow-sm transition-all group"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-sky-50 text-brand-cerulean flex items-center justify-center group-hover:bg-brand-cerulean group-hover:text-white transition-colors">
                {TEMPLATE_ICONS.custom}
              </div>
              <h3 className="font-semibold text-brand-black">Custom Team</h3>
            </div>
            <p className="text-sm text-neutral-500 mb-4 line-clamp-2">
              Build your own team with custom agents and steps
            </p>
            <div className="flex flex-wrap gap-1.5">
              <span className="px-2 py-0.5 bg-neutral-100 text-neutral-500 text-xs rounded-full">
                You choose the agents
              </span>
            </div>
          </button>
        </div>
      )}

      {/* Step 1: Configuration Form */}
      {step === 1 && (selectedTemplateData || isCustom) && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Selected template summary */}
          <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-cerulean text-white flex items-center justify-center shrink-0">
              {selectedTemplate ? TEMPLATE_ICONS[selectedTemplate] : null}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-brand-black">
                  {isCustom ? "Custom Team" : selectedTemplateData?.name}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setStep(0);
                    setSelectedTemplate(null);
                  }}
                  className="text-xs text-brand-cerulean hover:underline"
                >
                  Change template
                </button>
              </div>
              <p className="text-sm text-neutral-600 mt-0.5">
                {isCustom
                  ? `${customSteps.filter((s) => s.label.trim()).length} custom step(s) configured`
                  : `${selectedTemplateData?.steps.length} steps: ${selectedTemplateData?.steps.map((s) => s.label).join(" -> ")}`}
              </p>
            </div>
          </div>

          {/* Custom step builder */}
          {isCustom && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-brand-black">
                Define your steps
              </label>
              {customSteps.map((cs, idx) => (
                <div
                  key={cs.id}
                  className="flex items-start gap-2 bg-white border border-neutral-300 rounded-lg p-3"
                >
                  <span className="w-6 h-6 rounded-full bg-neutral-100 text-neutral-500 flex items-center justify-center text-xs font-bold shrink-0 mt-1">
                    {idx + 1}
                  </span>
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <select
                      value={cs.agentType}
                      onChange={(e) => {
                        const val = e.target.value as AgentType;
                        setCustomSteps((prev) =>
                          prev.map((s) =>
                            s.id === cs.id ? { ...s, agentType: val } : s
                          )
                        );
                      }}
                      className="px-3 py-2 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                      aria-label={`Agent type for step ${idx + 1}`}
                    >
                      {AVAILABLE_AGENTS.map((a) => (
                        <option key={a} value={a}>
                          {AGENT_TYPE_LABELS[a]}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={cs.label}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomSteps((prev) =>
                          prev.map((s) =>
                            s.id === cs.id ? { ...s, label: val } : s
                          )
                        );
                      }}
                      placeholder="Step label (e.g. Brand audit)"
                      className="px-3 py-2 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                      aria-label={`Label for step ${idx + 1}`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (customSteps.length <= 1) return;
                      setCustomSteps((prev) =>
                        prev.filter((s) => s.id !== cs.id)
                      );
                    }}
                    disabled={customSteps.length <= 1}
                    className="p-1.5 text-neutral-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0 mt-1"
                    aria-label={`Remove step ${idx + 1}`}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setCustomSteps((prev) => [
                    ...prev,
                    {
                      id: generateStepId(),
                      agentType: "copywriter",
                      label: "",
                    },
                  ])
                }
                className="text-sm font-medium text-brand-cerulean hover:underline"
              >
                + Add step
              </button>
            </div>
          )}

          {/* Team Name */}
          <div className="space-y-2">
            <label
              htmlFor="team-name"
              className="block text-sm font-medium text-brand-black"
            >
              Team name
            </label>
            <input
              id="team-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. TikTok Q2 Social Campaign"
              className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
              required
            />
          </div>

          {/* Client */}
          <div className="space-y-2">
            <label
              htmlFor="team-client"
              className="block text-sm font-medium text-brand-black"
            >
              Client
            </label>
            {loadingClients ? (
              <div className="flex items-center gap-2 text-sm text-neutral-400">
                <div className="w-4 h-4 border-2 border-neutral-300 border-t-brand-cerulean rounded-full animate-spin" />
                Loading clients...
              </div>
            ) : (
              <select
                id="team-client"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                required
              >
                <option value="">-- Select a client --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Brief */}
          <div className="space-y-2">
            <label
              htmlFor="team-brief"
              className="block text-sm font-medium text-brand-black"
            >
              Master brief
            </label>
            <textarea
              id="team-brief"
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder="Describe the project goals, target audience, key messages, deliverables expected, and any constraints or references..."
              rows={6}
              className="w-full px-4 py-3 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent resize-y"
              required
            />
            <p className="text-xs text-neutral-400">
              {brief.length < 20
                ? `${20 - brief.length} more characters needed`
                : "This brief will be shared with all agents in the team."}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={!formValid || submitting}
              className="px-6 py-2.5 bg-brand-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting && (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {submitting ? "Creating..." : "Create Team"}
            </button>
            <Link
              href="/admin/teams"
              className="px-4 py-2.5 text-sm font-medium text-neutral-500 hover:text-brand-black transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
