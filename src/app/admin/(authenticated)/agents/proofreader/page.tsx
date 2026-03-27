"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import type { Client } from "@/lib/db/schema";
import {
  ClientSelector,
  ClientContextPanel,
  FormField,
  FileUpload,
  GuidanceMessage,
  RecommendedBadge,
  StepIndicator,
  PreSubmitSummary,
  TextareaWithCount,
} from "@/components/admin/guided-form";
import { ProjectSelector, type SelectedProject } from "@/components/admin/ProjectSelector";
import {
  CONTENT_TYPES,
  CONTENT_TYPE_LABELS,
  PROOFREADER_LANGUAGES,
  PROOFREADER_LANGUAGE_LABELS,
  type ContentType,
  type ProofreaderLanguage,
  type ProofreadResponse,
  type ProofreadIssue,
} from "@/lib/validations/proofreader";

// ─── Types ──────────────────────────────────────────────────────────────────

type ReviewApiResponse = {
  review: ProofreadResponse;
  outputId: string | null;
  usage: { inputTokens: number; outputTokens: number };
};

// Register options from specs
const REGISTER_OPTIONS = ["Formal", "Standard", "Informal"] as const;

// Review level options (spec: Surface / Deep / Complete)
const REVIEW_LEVEL_OPTIONS = [
  {
    value: "surface",
    label: "Surface",
    description: "Spelling and grammar only",
  },
  {
    value: "deep",
    label: "Deep",
    description: "Tone, style, and brand consistency",
  },
  {
    value: "complete",
    label: "Complete",
    description: "Everything — spelling, grammar, tone, style, brand, glossary",
  },
] as const;

type ReviewLevel = "surface" | "deep" | "complete";

// Specific focus multi-select options from specs
const SPECIFIC_FOCUS_OPTIONS = [
  "Spelling",
  "Grammar",
  "Punctuation",
  "Style consistency",
  "Terminology",
  "Formatting",
  "Readability",
  "Character count",
] as const;

type FormState = {
  // Required
  contentToReview: string;
  sourceLanguage: ProofreaderLanguage;
  contentType: ContentType;
  // Recommended
  clientId: string;
  register: string;
  reviewLevel: ReviewLevel;
  specificFocus: string[];
  // Optional
  knownIssues: string;
  originalSource: string;
  lengthConstraint: string;
  checkBrand: boolean;
  checkGlossary: boolean;
  documentUpload: File | null;
};

type ActiveTab = "issues" | "improved" | "brand" | "glossary";

// ─── Constants ──────────────────────────────────────────────────────────────

const STEPS = ["Content", "Options", "Review & Submit"];

const GUIDANCE_MESSAGE =
  "For a perfect proofread, I need to know the language, the register, and the content type. If there are client-specific terminology preferences or known inconsistencies to watch for, add them. The more context you give me, the fewer errors pass through to the client.";

// ─── Helpers ────────────────────────────────────────────────────────────────

function getScoreColor(score: number): string {
  if (score >= 8) return "text-green-600";
  if (score >= 5) return "text-yellow-600";
  return "text-red-600";
}

function getScoreBg(score: number): string {
  if (score >= 8) return "bg-green-50 border-green-200";
  if (score >= 5) return "bg-yellow-50 border-yellow-200";
  return "bg-red-50 border-red-200";
}

function getScoreBarColor(score: number): string {
  if (score >= 8) return "bg-green-500";
  if (score >= 5) return "bg-yellow-500";
  return "bg-red-500";
}

function getSeverityBadge(severity: ProofreadIssue["severity"]): string {
  switch (severity) {
    case "error":
      return "bg-red-100 text-red-700 border-red-200";
    case "warning":
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    case "suggestion":
      return "bg-blue-100 text-blue-700 border-blue-200";
  }
}

function getTypeBadge(type: ProofreadIssue["type"]): string {
  switch (type) {
    case "spelling":
    case "grammar":
    case "punctuation":
      return "bg-neutral-100 text-neutral-700";
    case "style":
    case "tone":
      return "bg-purple-100 text-purple-700";
    case "terminology":
    case "brand":
      return "bg-orange-100 text-orange-700";
    case "consistency":
    case "formatting":
      return "bg-neutral-100 text-neutral-600";
    case "factual":
      return "bg-red-100 text-red-700";
  }
}

// ─── Page Component ─────────────────────────────────────────────────────────

export default function ProofreaderPage() {
  // Step state
  const [step, setStep] = useState(0);

  // Client ref
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [linkedProject, setLinkedProject] = useState<SelectedProject | null>(null);

  // Advanced options toggle
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Form state
  const [form, setForm] = useState<FormState>({
    contentToReview: "",
    sourceLanguage: "EN",
    contentType: "presentation",
    clientId: "",
    register: "",
    reviewLevel: "complete",
    specificFocus: [],
    knownIssues: "",
    originalSource: "",
    lengthConstraint: "",
    checkBrand: false,
    checkGlossary: false,
    documentUpload: null,
  });

  // Review state
  const [reviewing, setReviewing] = useState(false);
  const [result, setResult] = useState<ProofreadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Client loaded callback ──────────────────────────────────────────────

  const handleClientLoaded = useCallback(
    (client: Client | null) => {
      setSelectedClient(client);
      if (client?.primaryLanguage) {
        const lang = client.primaryLanguage as ProofreaderLanguage;
        if (PROOFREADER_LANGUAGES.includes(lang)) {
          setForm((prev) => ({ ...prev, sourceLanguage: lang }));
        }
      }
      // Reset brand/glossary checks when client is deselected
      if (!client) {
        setForm((prev) => ({
          ...prev,
          checkBrand: false,
          checkGlossary: false,
        }));
      }
    },
    []
  );

  // ── Toggle specific focus ─────────────────────────────────────────────

  function toggleFocus(focus: string) {
    setForm((prev) => {
      const current = prev.specificFocus;
      if (current.includes(focus)) {
        return {
          ...prev,
          specificFocus: current.filter((f) => f !== focus),
        };
      }
      return { ...prev, specificFocus: [...current, focus] };
    });
  }

  // ── Step validation ─────────────────────────────────────────────────────

  function canAdvanceFromStep(s: number): boolean {
    if (s === 0)
      return (
        form.contentToReview.trim().length >= 20 &&
        !!form.contentType &&
        !!form.sourceLanguage
      );
    if (s === 1) return true; // Options step — all fields are optional/recommended
    return true;
  }

  function getStepError(s: number): string | null {
    if (s === 0) {
      if (form.contentToReview.trim().length < 20)
        return "Content must be at least 20 characters to review.";
      if (!form.contentType) return "Please select the content type.";
      if (!form.sourceLanguage) return "Please select the content language.";
    }
    return null;
  }

  // ── Handle review ─────────────────────────────────────────────────────

  async function handleReview() {
    setError(null);
    setResult(null);
    setReviewing(true);

    try {
      const res = await fetch("/api/admin/agents/proofreader/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: form.clientId || undefined,
          contentToReview: form.contentToReview,
          contentType: form.contentType,
          sourceLanguage: form.sourceLanguage,
          checkBrand: form.checkBrand,
          checkGlossary: form.checkGlossary,
          // Extended fields
          register: form.register || undefined,
          reviewLevel: form.reviewLevel,
          specificFocus:
            form.specificFocus.length > 0 ? form.specificFocus : undefined,
          knownIssues: form.knownIssues || undefined,
          originalSource: form.originalSource || undefined,
          lengthConstraint: form.lengthConstraint || undefined,
          clickupTaskId: linkedProject?.clickupTaskId || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Review failed");
      }

      const data: ReviewApiResponse = await res.json();
      setResult(data.review);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to review content"
      );
    } finally {
      setReviewing(false);
    }
  }

  // ── Build summary items ─────────────────────────────────────────────────

  function buildSummaryItems() {
    return [
      {
        label: "Client",
        value: selectedClient?.name || "No client (generic mode)",
      },
      { label: "Content type", value: CONTENT_TYPE_LABELS[form.contentType] },
      {
        label: "Language",
        value: PROOFREADER_LANGUAGE_LABELS[form.sourceLanguage],
      },
      { label: "Review level", value: form.reviewLevel },
      {
        label: "Register",
        value: form.register || "Not specified",
      },
      {
        label: "Focus areas",
        value:
          form.specificFocus.length > 0
            ? form.specificFocus.join(", ")
            : "All",
      },
      {
        label: "Content preview",
        value:
          form.contentToReview.length > 100
            ? form.contentToReview.slice(0, 100) + "..."
            : form.contentToReview,
      },
      {
        label: "Content length",
        value: `${form.contentToReview.length} characters`,
      },
    ];
  }

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-black">
            QA / Proofreader
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            Review content for spelling, grammar, style, brand consistency, and
            glossary compliance
          </p>
        </div>
        <Link
          href="/admin/agents/proofreader/history"
          className="px-4 py-2 bg-white border border-neutral-300 text-sm font-semibold rounded-lg hover:bg-neutral-100 transition-colors text-brand-black"
        >
          History
        </Link>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl border border-neutral-300 p-6 space-y-5">
        {/* Guidance message */}
        <GuidanceMessage text={GUIDANCE_MESSAGE} />

        <StepIndicator steps={STEPS} currentStep={step} />

        {/* ── Step 0: Content ──────────────────────────────────────────── */}
        {step === 0 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-brand-black">
              Content
            </h2>

            {/* Content to review */}
            <FormField
              label="Content to Review"
              required
              helperText="Paste the content you want the proofreader to check."
            >
              <TextareaWithCount
                value={form.contentToReview}
                onChange={(val) =>
                  setForm((prev) => ({
                    ...prev,
                    contentToReview: val,
                  }))
                }
                placeholder="Paste the content you want reviewed — translation, social post, article, email, contract, or any deliverable"
                minLength={20}
                rows={10}
              />
            </FormField>

            {/* Or upload a document */}
            <FormField
              label="Or Upload a Document"
              helperText="Upload a PDF or DOCX instead of pasting text above. Useful for formatted documents."
            >
              <FileUpload
                value={form.documentUpload}
                onChange={(file) =>
                  setForm((prev) => ({ ...prev, documentUpload: file }))
                }
                accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              />
            </FormField>

            {/* Content type + Language */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Content Type"
                required
                helperText="A contract and a social post have different error priorities."
              >
                <select
                  value={form.contentType}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      contentType: e.target.value as ContentType,
                    }))
                  }
                  className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                >
                  {CONTENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {CONTENT_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField
                label="Language"
                required
                helperText="The language of the content determines which grammar, spelling, and style rules apply."
              >
                <select
                  value={form.sourceLanguage}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      sourceLanguage: e.target.value as ProofreaderLanguage,
                    }))
                  }
                  className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                >
                  {PROOFREADER_LANGUAGES.map((lang) => (
                    <option key={lang} value={lang}>
                      {PROOFREADER_LANGUAGE_LABELS[lang]} ({lang})
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            {/* Step navigation */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  if (canAdvanceFromStep(0)) {
                    setError(null);
                    setStep(1);
                  } else {
                    setError(getStepError(0));
                  }
                }}
                className="px-6 py-2.5 bg-brand-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors"
              >
                Next: Options
              </button>
            </div>
          </div>
        )}

        {/* ── Step 1: Options ─────────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-brand-black">
              Options
            </h2>

            {/* Client (recommended, not required) */}
            <div className="space-y-5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Recommended
                </span>
                <RecommendedBadge />
              </div>

              <ClientSelector
                value={form.clientId}
                onChange={(id) =>
                  setForm((prev) => ({ ...prev, clientId: id }))
                }
                required={false}
                helperText="Activates the client glossary (terms to use and not to use). Without it, the agent may 'correct' a brand-specific term."
                onClientLoaded={handleClientLoaded}
              />
              <FormField label="Link to Project" helperText="Optional. Link this output to a tracker project so it appears in the project view.">
                <ProjectSelector value={linkedProject?.clickupTaskUrl ?? ""} onChange={setLinkedProject} clientName={selectedClient?.name} />
              </FormField>

              {selectedClient && (
                <ClientContextPanel client={selectedClient} />
              )}

              {/* Review level + Register */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="Review Level"
                  helperText="How deep should the review go?"
                >
                  <select
                    value={form.reviewLevel}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        reviewLevel: e.target.value as ReviewLevel,
                      }))
                    }
                    className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                  >
                    {REVIEW_LEVEL_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label} — {opt.description}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField
                  label="Register"
                  helperText="Flags register inconsistencies within the document."
                >
                  <select
                    value={form.register}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        register: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                  >
                    <option value="">Not specified</option>
                    {REGISTER_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>

              {/* Specific focus (multi-select chips) */}
              <FormField
                label="Specific Focus Areas"
                helperText="Direct the agent's attention to specific areas. Select none for a comprehensive review."
              >
                <div className="flex flex-wrap gap-2">
                  {SPECIFIC_FOCUS_OPTIONS.map((focus) => (
                    <button
                      key={focus}
                      type="button"
                      onClick={() => toggleFocus(focus)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                        form.specificFocus.includes(focus)
                          ? "bg-brand-black text-white border-brand-black"
                          : "bg-white text-neutral-600 border-neutral-300 hover:border-neutral-400"
                      }`}
                    >
                      {focus}
                    </button>
                  ))}
                </div>
              </FormField>

              {/* Brand & Glossary checks */}
              {form.clientId && (
                <div className="space-y-2">
                  <label
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      form.checkBrand
                        ? "border-brand-cerulean bg-blue-50"
                        : "border-neutral-200 hover:bg-neutral-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={form.checkBrand}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          checkBrand: e.target.checked,
                        }))
                      }
                      className="mt-0.5 rounded border-neutral-300"
                    />
                    <div>
                      <span className="text-sm font-medium text-brand-black">
                        Check brand consistency
                      </span>
                      <p className="text-xs text-neutral-500">
                        Compare against client&apos;s brand tone and guidelines
                      </p>
                    </div>
                  </label>
                  <label
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      form.checkGlossary
                        ? "border-brand-cerulean bg-blue-50"
                        : "border-neutral-200 hover:bg-neutral-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={form.checkGlossary}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          checkGlossary: e.target.checked,
                        }))
                      }
                      className="mt-0.5 rounded border-neutral-300"
                    />
                    <div>
                      <span className="text-sm font-medium text-brand-black">
                        Check glossary compliance
                      </span>
                      <p className="text-xs text-neutral-500">
                        Verify all client-specific terms are used correctly
                      </p>
                    </div>
                  </label>
                </div>
              )}
            </div>

            {/* ── Optional Fields (collapsible) ── */}
            <div className="border-t border-neutral-200 pt-4">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-brand-black transition-colors"
              >
                <span
                  className={`transition-transform ${showAdvanced ? "rotate-90" : ""}`}
                >
                  &#9654;
                </span>
                Advanced options
              </button>

              {showAdvanced && (
                <div className="mt-4 space-y-5">
                  <FormField
                    label="Known Issues"
                    helperText="If you already suspect specific problems, flagging them makes the review more targeted."
                  >
                    <TextareaWithCount
                      value={form.knownIssues}
                      onChange={(val) =>
                        setForm((prev) => ({
                          ...prev,
                          knownIssues: val,
                        }))
                      }
                      placeholder="The French version has inconsistent capitalization of 'Supply Chain', check every slide"
                      rows={3}
                    />
                  </FormField>

                  <FormField
                    label="Original Source"
                    helperText="For reviewing a translation: provide the source document so the QA agent can verify translation accuracy."
                  >
                    <TextareaWithCount
                      value={form.originalSource}
                      onChange={(val) =>
                        setForm((prev) => ({
                          ...prev,
                          originalSource: val,
                        }))
                      }
                      placeholder="Paste the original source text for translation comparison..."
                      rows={4}
                    />
                  </FormField>

                  <FormField
                    label="Length Constraint"
                    helperText="For social posts and banners: the character limit. The agent will flag any element exceeding the allowed count."
                  >
                    <input
                      type="text"
                      value={form.lengthConstraint}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          lengthConstraint: e.target.value,
                        }))
                      }
                      placeholder="e.g. 280 characters for Twitter, 2200 for Instagram"
                      className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                    />
                  </FormField>
                </div>
              )}
            </div>

            {/* Step navigation */}
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
                onClick={() => {
                  setError(null);
                  setStep(2);
                }}
                className="px-6 py-2.5 bg-brand-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors"
              >
                Next: Review
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Review & Submit ─────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-brand-black">
              Review & Submit
            </h2>
            <PreSubmitSummary
              items={buildSummaryItems()}
              onConfirm={handleReview}
              onBack={() => setStep(1)}
              loading={reviewing}
              buttonLabel="Review Content"
            />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {error}
          </div>
        )}
      </div>

      {/* Review Result */}
      {result && <ReviewOutput result={result} />}
    </div>
  );
}

// ─── Review Output Component ────────────────────────────────────────────────

function ReviewOutput({ result }: { result: ProofreadResponse }) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("issues");
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(result.improvedVersion);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const errorCount = result.issues.filter((i) => i.severity === "error").length;
  const warningCount = result.issues.filter(
    (i) => i.severity === "warning"
  ).length;
  const suggestionCount = result.issues.filter(
    (i) => i.severity === "suggestion"
  ).length;

  const tabs: { key: ActiveTab; label: string }[] = [
    {
      key: "issues",
      label: `Issues (${result.issues.length})`,
    },
    { key: "improved", label: "Improved Version" },
    { key: "brand", label: "Brand" },
    { key: "glossary", label: "Glossary" },
  ];

  return (
    <div className="bg-white rounded-xl border border-neutral-300 p-6 space-y-5">
      {/* Score header */}
      <div className="flex items-start justify-between">
        <h2 className="text-lg font-semibold text-brand-black">
          Review Results
        </h2>
        <div
          className={`flex items-center gap-3 px-4 py-2 rounded-lg border ${getScoreBg(result.overallScore)}`}
        >
          <span className="text-sm font-medium text-neutral-600">
            Overall Score
          </span>
          <span
            className={`text-2xl font-bold ${getScoreColor(result.overallScore)}`}
          >
            {result.overallScore}
          </span>
          <span className="text-sm text-neutral-400">/10</span>
        </div>
      </div>

      {/* Score bar */}
      <div className="w-full bg-neutral-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${getScoreBarColor(result.overallScore)}`}
          style={{ width: `${result.overallScore * 10}%` }}
        />
      </div>

      {/* Summary */}
      <p className="text-sm text-neutral-600 bg-neutral-50 rounded-lg p-3">
        {result.summary}
      </p>

      {/* Issue counts */}
      <div className="flex items-center gap-4">
        {errorCount > 0 && (
          <span className="text-xs font-medium bg-red-100 text-red-700 px-2.5 py-1 rounded-full">
            {errorCount} error{errorCount > 1 ? "s" : ""}
          </span>
        )}
        {warningCount > 0 && (
          <span className="text-xs font-medium bg-yellow-100 text-yellow-700 px-2.5 py-1 rounded-full">
            {warningCount} warning{warningCount > 1 ? "s" : ""}
          </span>
        )}
        {suggestionCount > 0 && (
          <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">
            {suggestionCount} suggestion{suggestionCount > 1 ? "s" : ""}
          </span>
        )}
        {result.issues.length === 0 && (
          <span className="text-xs font-medium bg-green-100 text-green-700 px-2.5 py-1 rounded-full">
            No issues found
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-neutral-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-brand-black text-brand-black"
                : "border-transparent text-neutral-500 hover:text-neutral-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "issues" && <IssuesList issues={result.issues} />}
      {activeTab === "improved" && (
        <ImprovedVersion
          text={result.improvedVersion}
          onCopy={handleCopy}
          copied={copied}
        />
      )}
      {activeTab === "brand" && (
        <BrandConsistencyPanel data={result.brandConsistency} />
      )}
      {activeTab === "glossary" && (
        <GlossaryCompliancePanel data={result.glossaryCompliance} />
      )}
    </div>
  );
}

// ─── Issues List ────────────────────────────────────────────────────────────

function IssuesList({ issues }: { issues: ProofreadIssue[] }) {
  if (issues.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-neutral-500">
        No issues found. The content looks great!
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {issues.map((issue, i) => (
        <div
          key={i}
          className="border border-neutral-200 rounded-lg p-4 space-y-2"
        >
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded border ${getSeverityBadge(issue.severity)}`}
            >
              {issue.severity}
            </span>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded ${getTypeBadge(issue.type)}`}
            >
              {issue.type}
            </span>
          </div>
          <div className="flex items-start gap-3 text-sm">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-red-600 line-through bg-red-50 px-1.5 py-0.5 rounded text-xs">
                  {issue.original}
                </span>
                <span className="text-neutral-400">-&gt;</span>
                <span className="text-green-700 bg-green-50 px-1.5 py-0.5 rounded text-xs">
                  {issue.suggestion}
                </span>
              </div>
              <p className="text-neutral-600 text-xs">{issue.explanation}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Improved Version ───────────────────────────────────────────────────────

function ImprovedVersion({
  text,
  onCopy,
  copied,
}: {
  text: string;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="bg-neutral-50 rounded-lg p-4">
        <pre className="text-sm text-brand-black whitespace-pre-wrap font-sans leading-relaxed">
          {text}
        </pre>
      </div>
      <div className="flex justify-end">
        <button
          onClick={onCopy}
          className="px-4 py-2 text-sm font-semibold rounded-lg border border-neutral-300 text-brand-black hover:bg-neutral-100 transition-colors"
        >
          {copied ? "Copied!" : "Copy Improved Version"}
        </button>
      </div>
    </div>
  );
}

// ─── Brand Consistency Panel ────────────────────────────────────────────────

function BrandConsistencyPanel({
  data,
}: {
  data: ProofreadResponse["brandConsistency"];
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-neutral-600">
          Brand Consistency Score
        </span>
        <span className={`text-xl font-bold ${getScoreColor(data.score)}`}>
          {data.score}
        </span>
        <span className="text-sm text-neutral-400">/10</span>
      </div>
      <div className="w-full bg-neutral-200 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full transition-all ${getScoreBarColor(data.score)}`}
          style={{ width: `${data.score * 10}%` }}
        />
      </div>
      {data.notes.length > 0 && (
        <ul className="space-y-1">
          {data.notes.map((note, i) => (
            <li
              key={i}
              className="text-sm text-neutral-600 flex items-start gap-2"
            >
              <span className="text-neutral-400 shrink-0">--</span>
              {note}
            </li>
          ))}
        </ul>
      )}
      {data.notes.length === 0 && (
        <p className="text-sm text-neutral-500">No brand notes.</p>
      )}
    </div>
  );
}

// ─── Glossary Compliance Panel ──────────────────────────────────────────────

function GlossaryCompliancePanel({
  data,
}: {
  data: ProofreadResponse["glossaryCompliance"];
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-neutral-600">
          Glossary Compliance Score
        </span>
        <span className={`text-xl font-bold ${getScoreColor(data.score)}`}>
          {data.score}
        </span>
        <span className="text-sm text-neutral-400">/10</span>
      </div>
      <div className="w-full bg-neutral-200 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full transition-all ${getScoreBarColor(data.score)}`}
          style={{ width: `${data.score * 10}%` }}
        />
      </div>
      {data.violations.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-neutral-500 uppercase">
            Violations ({data.violations.length})
          </h4>
          {data.violations.map((v, i) => (
            <div
              key={i}
              className="border border-orange-200 bg-orange-50 rounded-lg p-3 text-sm space-y-1"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-orange-800">
                  {v.term}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                  Found: {v.found}
                </span>
                <span className="text-neutral-400">-&gt;</span>
                <span className="text-green-700 bg-green-50 px-1.5 py-0.5 rounded">
                  Expected: {v.expected}
                </span>
              </div>
              <p className="text-xs text-neutral-500">
                Location: {v.location}
              </p>
            </div>
          ))}
        </div>
      )}
      {data.violations.length === 0 && (
        <p className="text-sm text-neutral-500">No glossary violations.</p>
      )}
    </div>
  );
}
