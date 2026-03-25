"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import type { Client } from "@/lib/db/schema";
import {
  PRESENTATION_TYPES,
  PRESENTATION_TYPE_LABELS,
  PRESENTATION_LANGUAGES,
  type PresentationOutput,
  type PresentationType,
  type PresentationLanguage,
} from "@/lib/validations/presentation";
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

type GenerateResponse = {
  presentation: PresentationOutput;
  outputId: string;
  usage: { inputTokens: number; outputTokens: number };
};

type SlideCountRange = "5-7" | "8-12" | "15-20" | "30+";

const SLIDE_COUNT_OPTIONS: { value: SlideCountRange; label: string }[] = [
  { value: "5-7", label: "5-7 slides" },
  { value: "8-12", label: "8-12 slides" },
  { value: "15-20", label: "15-20 slides" },
  { value: "30+", label: "30+ slides" },
];

const SLIDE_COUNT_MAP: Record<SlideCountRange, number> = {
  "5-7": 6,
  "8-12": 10,
  "15-20": 17,
  "30+": 35,
};

const TONE_OPTIONS = [
  "Formal",
  "Consultative",
  "Inspirational",
  "Technical",
] as const;

type FormState = {
  clientId: string;
  presentationObjective: string;
  audience: string;
  keyContentPoints: string;
  // Recommended
  slideCountRange: SlideCountRange;
  presentationType: PresentationType | "";
  dataAndCharts: string;
  language: PresentationLanguage;
  // Optional
  slideOutline: string;
  toneDirection: string;
  mustIncludeAssets: string;
};

const INITIAL_FORM: FormState = {
  clientId: "",
  presentationObjective: "",
  audience: "",
  keyContentPoints: "",
  slideCountRange: "8-12",
  presentationType: "",
  dataAndCharts: "",
  language: "English",
  slideOutline: "",
  toneDirection: "",
  mustIncludeAssets: "",
};

const STEPS = ["Select Client", "Configure", "Review & Generate"];

// ─── Guidance Message ────────────────────────────────────────────────────────

const GUIDANCE_MESSAGE =
  "Think of this as briefing a McKinsey consultant who has 48 hours to prepare a deck. Tell me who will be in the room, what they need to decide or understand by the end, and what story the data tells. I'll handle the slide structure, the narrative flow, and the Sarani-branded formatting. The clearer your brief, the fewer slides end up in the bin.";

// ─── Page Component ─────────────────────────────────────────────────────────

export default function PresentationAgentPage() {
  // Step state
  const [step, setStep] = useState(0);

  // Client data
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Form state
  const [form, setForm] = useState<FormState>(INITIAL_FORM);

  // Advanced options toggle
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [presentation, setPresentation] = useState<PresentationOutput | null>(
    null
  );
  const [currentSlide, setCurrentSlide] = useState(0);
  const [expandedNotes, setExpandedNotes] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // ── Smart defaults when client is loaded ─────────────────────────────────

  const handleClientLoaded = useCallback((client: Client | null) => {
    setSelectedClient(client);
    if (client?.primaryLanguage) {
      const lang = client.primaryLanguage.toLowerCase();
      if (lang === "fr" || lang === "french") {
        setForm((prev) => ({ ...prev, language: "French" as PresentationLanguage }));
      } else if (lang === "en" || lang === "english") {
        setForm((prev) => ({ ...prev, language: "English" as PresentationLanguage }));
      }
    }
  }, []);

  // ── Step validation ─────────────────────────────────────────────────────

  function canProceedStep0(): boolean {
    return !!form.clientId;
  }

  function canProceedStep1(): boolean {
    return (
      form.presentationObjective.length >= 20 &&
      form.audience.length >= 10 &&
      form.keyContentPoints.length >= 20
    );
  }

  // ── Submit ──────────────────────────────────────────────────────────────

  async function handleGenerate() {
    setError(null);
    setPresentation(null);
    setCurrentSlide(0);
    setExpandedNotes(new Set());
    setGenerating(true);

    try {
      const payload: Record<string, unknown> = {
        clientId: form.clientId,
        presentationType: form.presentationType || undefined,
        topic: form.presentationObjective,
        audienceDescription: form.audience,
        slideCount: SLIDE_COUNT_MAP[form.slideCountRange],
        language: form.language,
        includeData: !!form.dataAndCharts.trim(),
      };

      if (form.keyContentPoints.trim()) {
        payload.keyMessages = form.keyContentPoints;
      }
      if (form.dataAndCharts.trim()) {
        payload.dataAndCharts = form.dataAndCharts;
      }
      if (form.slideOutline.trim()) {
        payload.slideOutline = form.slideOutline;
      }
      if (form.toneDirection) {
        payload.toneDirection = form.toneDirection;
      }

      const res = await fetch("/api/admin/agents/presentation/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Generation failed");
      }

      const data: GenerateResponse = await res.json();
      setPresentation(data.presentation);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate presentation"
      );
    } finally {
      setGenerating(false);
    }
  }

  // ── Toggle speaker notes ──────────────────────────────────────────────

  function toggleNotes(slideNumber: number) {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(slideNumber)) {
        next.delete(slideNumber);
      } else {
        next.add(slideNumber);
      }
      return next;
    });
  }

  // ── Copy all as markdown ──────────────────────────────────────────────

  function buildMarkdown(pres: PresentationOutput): string {
    const lines: string[] = [];

    lines.push(`# ${pres.title}`);
    lines.push(`*${pres.subtitle}*`);
    lines.push(``);
    lines.push(`**Total slides:** ${pres.totalSlides}`);
    lines.push(``);
    lines.push(`---`);

    pres.slides.forEach((slide) => {
      lines.push(``);
      lines.push(`## Slide ${slide.slideNumber}: ${slide.title}`);
      lines.push(``);
      slide.bullets.forEach((b) => lines.push(`- ${b}`));
      lines.push(``);
      lines.push(`**Speaker Notes:** ${slide.speakerNotes}`);
      lines.push(``);
      lines.push(`*Visual: ${slide.visualSuggestion}*`);
      lines.push(``);
      lines.push(`---`);
    });

    lines.push(``);
    lines.push(`## Summary`);
    lines.push(pres.summary);

    return lines.join("\n");
  }

  const [copied, setCopied] = useState(false);

  function handleCopyAll() {
    if (!presentation) return;
    navigator.clipboard.writeText(buildMarkdown(presentation));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    if (!presentation) return;
    const md = buildMarkdown(presentation);
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `presentation-${presentation.title.toLowerCase().replace(/\s+/g, "-").slice(0, 40)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Build summary items ────────────────────────────────────────────────

  function getSummaryItems() {
    return [
      { label: "Client", value: selectedClient?.name || "---" },
      {
        label: "Objective",
        value:
          form.presentationObjective.length > 80
            ? form.presentationObjective.slice(0, 80) + "..."
            : form.presentationObjective,
      },
      {
        label: "Audience",
        value:
          form.audience.length > 60
            ? form.audience.slice(0, 60) + "..."
            : form.audience,
      },
      { label: "Slide range", value: form.slideCountRange },
      {
        label: "Presentation type",
        value: form.presentationType
          ? PRESENTATION_TYPE_LABELS[form.presentationType]
          : "Not specified",
      },
      { label: "Language", value: form.language },
      {
        label: "Tone",
        value: form.toneDirection || "Not specified",
      },
    ];
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-black">
            Presentation Generator
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            Generate structured slide content for client presentations
          </p>
        </div>
        <Link
          href="/admin/agents/presentation/history"
          className="px-4 py-2 bg-white border border-neutral-300 text-sm font-semibold rounded-lg hover:bg-neutral-100 transition-colors text-brand-black"
        >
          History
        </Link>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl border border-neutral-300 p-6 space-y-5">
        {/* Guidance message */}
        <GuidanceMessage text={GUIDANCE_MESSAGE} />

        <h2 className="text-lg font-semibold text-brand-black">
          Presentation Brief
        </h2>

        <StepIndicator steps={STEPS} currentStep={step} />

        {/* ── Step 0: Select Client ─────────────────────────────────────── */}
        {step === 0 && (
          <div className="space-y-4">
            <ClientSelector
              value={form.clientId}
              onChange={(clientId) =>
                setForm((prev) => ({ ...prev, clientId }))
              }
              required
              helperText="Loads brand book for visual formatting of the deck, and historical context."
              onClientLoaded={handleClientLoaded}
            />

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
            {/* ── Required Fields ── */}

            {/* Presentation Objective */}
            <FormField
              label="Presentation Objective"
              required
              helperText="What must the audience believe, decide, or do by the last slide? Without a clear objective, the agent creates a content dump."
            >
              <TextareaWithCount
                value={form.presentationObjective}
                onChange={(val) =>
                  setForm((prev) => ({ ...prev, presentationObjective: val }))
                }
                placeholder="GEODIS management team approves the 12-month rebrand rollout plan and validates the &euro;85K budget."
                minLength={20}
                rows={3}
              />
            </FormField>

            {/* Audience */}
            <FormField
              label="Audience"
              required
              helperText="Who is in the room? Seniority level, expertise, and expected objections all change the presentation structure."
            >
              <TextareaWithCount
                value={form.audience}
                onChange={(val) =>
                  setForm((prev) => ({ ...prev, audience: val }))
                }
                placeholder="GEODIS ExCom: CEO, CFO, CDO. No design background. Decision-makers. Time-pressed. Skeptical of creative agency costs."
                minLength={10}
                rows={3}
              />
            </FormField>

            {/* Key Content Points */}
            <FormField
              label="Key Content Points"
              required
              helperText="The core information, data, or argument that must appear in the deck. Without content inputs, the agent fills slides with generic placeholder text."
            >
              <TextareaWithCount
                value={form.keyContentPoints}
                onChange={(val) =>
                  setForm((prev) => ({ ...prev, keyContentPoints: val }))
                }
                placeholder="Current state: 350 outdated slide templates. Pain: 3h per presentation for each regional manager. Solution: Sarani rebrand + template library. Proof: delivered in 3 weeks for &euro;8,500. Ask: approve 12-month rollout for &euro;85K."
                minLength={20}
                rows={4}
              />
            </FormField>

            {/* ── Recommended Fields ── */}
            <div className="border-t border-neutral-200 pt-4 space-y-5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Recommended
                </span>
                <RecommendedBadge />
              </div>

              {/* Number of slides + Presentation type */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="Number of Slides"
                  helperText="Dictates the level of narrative detail per slide."
                >
                  <select
                    value={form.slideCountRange}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        slideCountRange: e.target.value as SlideCountRange,
                      }))
                    }
                    className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                  >
                    {SLIDE_COUNT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField
                  label="Presentation Type"
                  helperText="Each type has a known narrative structure."
                >
                  <select
                    value={form.presentationType}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        presentationType: e.target.value as PresentationType | "",
                      }))
                    }
                    className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                  >
                    <option value="">Select a type...</option>
                    {PRESENTATION_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {PRESENTATION_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>

              {/* Data & Charts */}
              <FormField
                label="Data & Charts"
                helperText="Specific data the slides should visualize (tables, metrics, comparisons). Without it, the agent uses placeholder data."
              >
                <TextareaWithCount
                  value={form.dataAndCharts}
                  onChange={(val) =>
                    setForm((prev) => ({ ...prev, dataAndCharts: val }))
                  }
                  placeholder="Before: 3h per deck. After: 45min. Volume: 350 templates."
                  rows={3}
                />
              </FormField>

              {/* Language */}
              <FormField
                label="Language"
                helperText="Auto-filled from client profile. The presentation language may differ from the client's primary language."
              >
                <select
                  value={form.language}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      language: e.target.value as PresentationLanguage,
                    }))
                  }
                  className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                >
                  {PRESENTATION_LANGUAGES.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
              </FormField>
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
                  {/* Slide outline */}
                  <FormField
                    label="Slide Outline"
                    helperText="If you have a specific slide order in mind, provide it to override the auto-generated structure."
                  >
                    <TextareaWithCount
                      value={form.slideOutline}
                      onChange={(val) =>
                        setForm((prev) => ({ ...prev, slideOutline: val }))
                      }
                      placeholder="1. Title slide\n2. Problem statement\n3. Current state\n4. Proposed solution\n5. Budget breakdown\n6. Timeline\n7. Next steps"
                      rows={4}
                    />
                  </FormField>

                  {/* Tone direction */}
                  <FormField
                    label="Tone Direction"
                    helperText="Even within Sarani's brand voice, different presentations have different registers."
                  >
                    <select
                      value={form.toneDirection}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          toneDirection: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                    >
                      <option value="">Default</option>
                      {TONE_OPTIONS.map((tone) => (
                        <option key={tone} value={tone}>
                          {tone}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  {/* Must include assets note */}
                  <FormField
                    label="Must-Include Assets"
                    helperText="Describe logos, photos, or charts that must appear in the deck (file upload not yet supported)."
                  >
                    <TextareaWithCount
                      value={form.mustIncludeAssets}
                      onChange={(val) =>
                        setForm((prev) => ({ ...prev, mustIncludeAssets: val }))
                      }
                      placeholder="Include GEODIS logo on every slide, CEO headshot on slide 2, supply chain map on slide 4"
                      rows={2}
                    />
                  </FormField>
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
              buttonLabel="Generate Presentation"
            />
          </div>
        )}
      </div>

      {/* Output */}
      {presentation && (
        <PresentationPreview
          presentation={presentation}
          currentSlide={currentSlide}
          onSlideChange={setCurrentSlide}
          expandedNotes={expandedNotes}
          onToggleNotes={toggleNotes}
          onCopyAll={handleCopyAll}
          onDownload={handleDownload}
          copied={copied}
        />
      )}
    </div>
  );
}

// ─── Presentation Preview Component ──────────────────────────────────────────

function PresentationPreview({
  presentation,
  currentSlide,
  onSlideChange,
  expandedNotes,
  onToggleNotes,
  onCopyAll,
  onDownload,
  copied,
}: {
  presentation: PresentationOutput;
  currentSlide: number;
  onSlideChange: (index: number) => void;
  expandedNotes: Set<number>;
  onToggleNotes: (slideNumber: number) => void;
  onCopyAll: () => void;
  onDownload: () => void;
  copied: boolean;
}) {
  const slide = presentation.slides[currentSlide];
  const totalSlides = presentation.slides.length;

  return (
    <div className="bg-white rounded-xl border border-neutral-300 p-6 space-y-6">
      {/* Header with title and actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-brand-black">
            {presentation.title}
          </h2>
          <p className="text-sm text-neutral-500">{presentation.subtitle}</p>
        </div>
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

      {/* Summary */}
      <div className="bg-neutral-50 rounded-lg px-4 py-3">
        <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">
          Narrative Summary
        </p>
        <p className="text-sm text-brand-black leading-relaxed">
          {presentation.summary}
        </p>
      </div>

      {/* Slide navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onSlideChange(Math.max(0, currentSlide - 1))}
          disabled={currentSlide === 0}
          className="px-3 py-1.5 text-sm font-medium border border-neutral-300 rounded-lg hover:bg-neutral-100 transition-colors text-brand-black disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <span className="text-sm text-neutral-500">
          Slide {currentSlide + 1} of {totalSlides}
        </span>
        <button
          onClick={() =>
            onSlideChange(Math.min(totalSlides - 1, currentSlide + 1))
          }
          disabled={currentSlide === totalSlides - 1}
          className="px-3 py-1.5 text-sm font-medium border border-neutral-300 rounded-lg hover:bg-neutral-100 transition-colors text-brand-black disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>

      {/* Current slide card */}
      {slide && (
        <div className="border border-neutral-200 rounded-lg p-5 space-y-4">
          {/* Slide number and title */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold bg-brand-black text-white w-7 h-7 rounded-full flex items-center justify-center shrink-0">
              {slide.slideNumber}
            </span>
            <h3 className="text-base font-semibold text-brand-black">
              {slide.title}
            </h3>
          </div>

          {/* Bullets */}
          {slide.bullets.length > 0 && (
            <ul className="space-y-1.5 pl-10">
              {slide.bullets.map((bullet, i) => (
                <li
                  key={i}
                  className="text-sm text-brand-black flex items-start gap-2"
                >
                  <span className="text-neutral-400 shrink-0 mt-1 w-1.5 h-1.5 rounded-full bg-neutral-400" />
                  {bullet}
                </li>
              ))}
            </ul>
          )}

          {/* Visual suggestion */}
          <p className="text-sm text-neutral-500 italic pl-10">
            Visual: {slide.visualSuggestion}
          </p>

          {/* Speaker notes (collapsible) */}
          <div className="pl-10">
            <button
              onClick={() => onToggleNotes(slide.slideNumber)}
              className="text-xs font-medium text-brand-cerulean hover:underline"
            >
              {expandedNotes.has(slide.slideNumber)
                ? "Hide speaker notes"
                : "Show speaker notes"}
            </button>
            {expandedNotes.has(slide.slideNumber) && (
              <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                <p className="text-xs font-semibold text-amber-700 mb-1">
                  Speaker Notes
                </p>
                <p className="text-sm text-amber-900 leading-relaxed">
                  {slide.speakerNotes}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Slide dots / thumbnails */}
      <div className="flex flex-wrap gap-1.5 justify-center">
        {presentation.slides.map((s, i) => (
          <button
            key={s.slideNumber}
            onClick={() => onSlideChange(i)}
            title={`Slide ${s.slideNumber}: ${s.title}`}
            className={`w-8 h-8 text-xs rounded-lg border transition-colors flex items-center justify-center ${
              i === currentSlide
                ? "bg-brand-black text-white border-brand-black"
                : "bg-white text-neutral-600 border-neutral-300 hover:border-neutral-400"
            }`}
          >
            {s.slideNumber}
          </button>
        ))}
      </div>
    </div>
  );
}
