"use client";

import { useEffect, useState, useCallback } from "react";
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

// ─── Page Component ─────────────────────────────────────────────────────────

export default function PresentationAgentPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);

  const [form, setForm] = useState<FormState>(INITIAL_FORM);

  const [generating, setGenerating] = useState(false);
  const [presentation, setPresentation] = useState<PresentationOutput | null>(
    null
  );
  const [currentSlide, setCurrentSlide] = useState(0);
  const [expandedNotes, setExpandedNotes] = useState<Set<number>>(new Set());
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

  // ── Submit ──────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPresentation(null);
    setCurrentSlide(0);
    setExpandedNotes(new Set());

    if (!form.clientId) {
      setError("Please select a client.");
      return;
    }
    if (!form.presentationType) {
      setError("Please select a presentation type.");
      return;
    }
    if (form.topic.length < 10) {
      setError("Topic must be at least 10 characters.");
      return;
    }
    if (form.audienceDescription.length < 5) {
      setError("Audience description must be at least 5 characters.");
      return;
    }

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
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border border-neutral-300 p-6 space-y-5"
      >
        <h2 className="text-lg font-semibold text-brand-black">
          Presentation Brief
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

        {/* Presentation type */}
        <div>
          <label
            htmlFor="presentationType"
            className="block text-sm font-medium text-neutral-700 mb-1.5"
          >
            Presentation Type
          </label>
          <select
            id="presentationType"
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
        </div>

        {/* Topic */}
        <div>
          <label
            htmlFor="topic"
            className="block text-sm font-medium text-neutral-700 mb-1.5"
          >
            Topic
          </label>
          <textarea
            id="topic"
            value={form.topic}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, topic: e.target.value }))
            }
            placeholder="What is this presentation about? Be specific about the subject, goals, and key points to cover."
            rows={3}
            className="w-full px-4 py-3 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent resize-y"
          />
          <p className="text-xs text-neutral-400 mt-1">
            {form.topic.length} / 10 min characters
          </p>
        </div>

        {/* Audience description */}
        <div>
          <label
            htmlFor="audience"
            className="block text-sm font-medium text-neutral-700 mb-1.5"
          >
            Audience
          </label>
          <input
            id="audience"
            type="text"
            value={form.audienceDescription}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                audienceDescription: e.target.value,
              }))
            }
            placeholder="e.g. C-level executives, marketing team, investors, new hires"
            className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
          />
        </div>

        {/* Slide count + Language */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="slideCount"
              className="block text-sm font-medium text-neutral-700 mb-1.5"
            >
              Number of Slides ({form.slideCount})
            </label>
            <input
              id="slideCount"
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
          </div>
          <div>
            <label
              htmlFor="language"
              className="block text-sm font-medium text-neutral-700 mb-1.5"
            >
              Language
            </label>
            <select
              id="language"
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
          </div>
        </div>

        {/* Key messages */}
        <div>
          <label
            htmlFor="keyMessages"
            className="block text-sm font-medium text-neutral-700 mb-1.5"
          >
            Key Messages (optional)
          </label>
          <textarea
            id="keyMessages"
            value={form.keyMessages}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, keyMessages: e.target.value }))
            }
            placeholder="List the key messages or themes that must appear in the presentation. One per line."
            rows={3}
            className="w-full px-4 py-3 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent resize-y"
          />
        </div>

        {/* Include data toggle */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={form.includeData}
            onClick={() =>
              setForm((prev) => ({ ...prev, includeData: !prev.includeData }))
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

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={generating}
            className="px-6 py-2.5 bg-brand-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? "Generating..." : "Generate Presentation"}
          </button>
        </div>
      </form>

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
