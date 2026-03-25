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

type FormState = {
  clientId: string;
  presentationType: PresentationType | "";
  topic: string;
  audienceDescription: string;
  slideCount: number;
  language: PresentationLanguage;
  keyMessages: string;
  includeData: boolean;
};

const INITIAL_FORM: FormState = {
  clientId: "",
  presentationType: "",
  topic: "",
  audienceDescription: "",
  slideCount: 12,
  language: "English",
  keyMessages: "",
  includeData: false,
};

const STEPS = ["Select Client", "Configure", "Review & Generate"];

// ─── Page Component ─────────────────────────────────────────────────────────

export default function PresentationAgentPage() {
  // Step state
  const [step, setStep] = useState(0);

  // Client data
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Form state
  const [form, setForm] = useState<FormState>(INITIAL_FORM);

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
      !!form.presentationType &&
      form.topic.length >= 20 &&
      form.audienceDescription.length >= 5
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
        presentationType: form.presentationType,
        topic: form.topic,
        audienceDescription: form.audienceDescription,
        slideCount: form.slideCount,
        language: form.language,
        includeData: form.includeData,
      };

      if (form.keyMessages.trim()) {
        payload.keyMessages = form.keyMessages;
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
        label: "Presentation Type",
        value: form.presentationType
          ? PRESENTATION_TYPE_LABELS[form.presentationType]
          : "---",
      },
      { label: "Slides", value: String(form.slideCount) },
      { label: "Language", value: form.language },
      { label: "Include Data", value: form.includeData ? "Yes" : "No" },
      {
        label: "Topic",
        value:
          form.topic.length > 80
            ? form.topic.slice(0, 80) + "..."
            : form.topic,
      },
      {
        label: "Audience",
        value:
          form.audienceDescription.length > 60
            ? form.audienceDescription.slice(0, 60) + "..."
            : form.audienceDescription,
      },
    ];
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-3xl">
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
              helperText="Select the client this presentation is for. Their brand colors and tone will guide the visual suggestions."
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
            {/* Presentation type */}
            <FormField
              label="Presentation Type"
              required
              helperText="The type determines the structure, tone, and level of detail."
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

            {/* Topic */}
            <FormField
              label="Topic"
              required
              helperText="Be specific about the subject, goals, and key points. This drives the entire presentation structure."
            >
              <TextareaWithCount
                value={form.topic}
                onChange={(val) =>
                  setForm((prev) => ({ ...prev, topic: val }))
                }
                placeholder="e.g. Q1 2026 campaign results for GEODIS — rebrand impact across 12 markets"
                minLength={20}
                rows={3}
              />
            </FormField>

            {/* Audience description */}
            <FormField
              label="Audience"
              required
              helperText="Describe who will see this presentation. This affects tone, level of detail, and vocabulary."
            >
              <input
                type="text"
                value={form.audienceDescription}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    audienceDescription: e.target.value,
                  }))
                }
                placeholder="e.g. GEODIS Marketing Director + 3 regional managers"
                className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
              />
            </FormField>

            {/* Slide count + Language */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label={`Number of Slides (${form.slideCount})`}
                helperText="5 for a quick pitch, 15-20 for a standard deck, 30+ for a detailed review."
              >
                <input
                  type="range"
                  min={5}
                  max={40}
                  value={form.slideCount}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      slideCount: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-brand-black"
                />
                <div className="flex justify-between text-xs text-neutral-400 mt-0.5">
                  <span>5</span>
                  <span>40</span>
                </div>
              </FormField>
              <FormField
                label="Language"
                helperText="Auto-filled from client profile."
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

            {/* Key messages */}
            <FormField
              label="Key Messages"
              helperText="Optional. List the key messages or themes that must appear. One per line."
            >
              <TextareaWithCount
                value={form.keyMessages}
                onChange={(val) =>
                  setForm((prev) => ({ ...prev, keyMessages: val }))
                }
                placeholder="e.g. Brand awareness +45% in target markets\nCost per asset reduced by 30%\nNew workflow saved 2 weeks per campaign"
                rows={3}
              />
            </FormField>

            {/* Include data toggle */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={form.includeData}
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    includeData: !prev.includeData,
                  }))
                }
                className={`relative w-10 h-6 rounded-full transition-colors ${
                  form.includeData ? "bg-brand-black" : "bg-neutral-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                    form.includeData ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
              <label className="text-sm text-neutral-700">
                Include data & metrics slides (charts, KPIs, statistics)
              </label>
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
