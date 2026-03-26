"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { track, getDevice, getReferrer } from "@/lib/analytics";
import type { CaseStudy, CaseStudyCategory } from "@/data/case-studies";

const CATEGORY_LABELS: Record<CaseStudyCategory, string> = {
  "Video & Social": "Video & Social",
  "Graphic Design": "Graphic Design",
  "Event": "Events",
  "Multilingual": "Multilingual",
  "Out-of-Home": "Out-of-Home",
};

interface WorkGridProps {
  caseStudies: CaseStudy[];
  categories: CaseStudyCategory[];
}

export function WorkGrid({ caseStudies, categories }: WorkGridProps) {
  const [activeCategory, setActiveCategory] = useState<CaseStudyCategory | "all">("all");
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  const filtered =
    activeCategory === "all"
      ? caseStudies
      : caseStudies.filter((cs) => cs.category === activeCategory);

  const expandedStudy = expandedSlug
    ? caseStudies.find((cs) => cs.slug === expandedSlug) ?? null
    : null;

  // Scroll the detail panel into view and move focus when expanded
  useEffect(() => {
    if (expandedSlug && detailRef.current) {
      setTimeout(() => {
        detailRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        detailRef.current?.focus();
      }, 100);
    }
  }, [expandedSlug]);

  function handleCardClick(cs: CaseStudy) {
    track("case_study_click", {
      client: cs.client,
      location: "work_listing",
      slug: cs.slug,
      page: typeof window !== "undefined" ? window.location.pathname : "/",
      device: getDevice(),
      referrer: getReferrer(),
    });
    setExpandedSlug((prev) => (prev === cs.slug ? null : cs.slug));
  }

  return (
    <>
      {/* Category filter */}
      <div className="mb-10 flex flex-wrap gap-3">
        <button
          onClick={() => { setActiveCategory("all"); setExpandedSlug(null); }}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors duration-150 ${
            activeCategory === "all"
              ? "bg-brand-black text-brand-white"
              : "bg-brand-black/5 text-neutral-600 hover:bg-brand-black/10"
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => { setActiveCategory(cat); setExpandedSlug(null); }}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors duration-150 ${
              activeCategory === cat
                ? "bg-brand-black text-brand-white"
                : "bg-brand-black/5 text-neutral-600 hover:bg-brand-black/10"
            }`}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((cs) => (
          <button
            key={cs.slug}
            type="button"
            aria-expanded={expandedSlug === cs.slug}
            onClick={() => handleCardClick(cs)}
            className={`group relative flex flex-col rounded-2xl border bg-brand-white p-8 text-left transition-all duration-200 hover:shadow-md ${
              expandedSlug === cs.slug
                ? "border-brand-flame shadow-md ring-2 ring-brand-flame/20"
                : "border-neutral-300 hover:border-brand-lemon"
            }`}
          >
            {/* Top row: metric badge + category */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="inline-block rounded-full bg-brand-black/5 px-3 py-1 text-xs font-bold text-brand-black">
                {cs.keyMetric}
              </span>
              <span className="inline-block rounded-full border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-500">
                {cs.category}
              </span>
            </div>

            <p className="mb-1 text-sm font-medium uppercase tracking-wider text-brand-flame-dark">
              {cs.client}
            </p>
            <p className="mb-2 text-lg font-bold leading-snug text-brand-black">
              {cs.headline}
            </p>
            <p className="text-sm font-medium text-neutral-500">
              {cs.outcome}
            </p>

            {/* Expand indicator */}
            <div className="mt-4 flex items-center gap-1 text-xs font-medium text-brand-cerulean-dark">
              {expandedSlug === cs.slug ? "Close" : "View details"}
              <svg
                className={`h-3 w-3 transition-transform duration-200 ${expandedSlug === cs.slug ? "rotate-180" : ""}`}
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </button>
        ))}
      </div>

      {/* Inline detail panel — appears below the grid */}
      {expandedStudy && (
        <div
          ref={detailRef}
          tabIndex={-1}
          className="mt-8 rounded-2xl border border-brand-flame/20 bg-brand-white p-5 shadow-lg sm:p-8 md:p-12 animate-in fade-in slide-in-from-top-4 duration-300 outline-none"
        >
          {/* Header */}
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <p className="mb-1 text-sm font-medium uppercase tracking-wider text-brand-flame-dark">
                {expandedStudy.client}
              </p>
              <h3 className="text-2xl font-bold text-brand-black sm:text-3xl">
                {expandedStudy.headline}
              </h3>
              {expandedStudy.subtitle && (
                <p className="mt-2 text-base text-neutral-600">{expandedStudy.subtitle}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setExpandedSlug(null)}
              className="shrink-0 rounded-full p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition-colors"
              aria-label="Close details"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Stats */}
          <div className="mb-8 grid grid-cols-3 gap-2 sm:gap-4">
            {expandedStudy.stats.map((stat) => (
              <div key={stat.label} className="min-w-0 rounded-xl bg-surface-elevated p-3 text-center sm:p-4">
                <p className="truncate text-lg font-bold text-brand-black sm:text-2xl lg:text-3xl">{stat.value}</p>
                <p className="mt-1 text-[10px] font-medium leading-tight text-neutral-500 sm:text-xs">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Challenge / Solution / Results */}
          <div className="grid gap-8 md:grid-cols-3">
            {expandedStudy.challenge && (
              <div>
                <h4 className="mb-2 text-sm font-bold uppercase tracking-wider text-neutral-400">Challenge</h4>
                <p className="text-base leading-relaxed text-neutral-700">{expandedStudy.challenge}</p>
              </div>
            )}
            {expandedStudy.solution && (
              <div>
                <h4 className="mb-2 text-sm font-bold uppercase tracking-wider text-neutral-400">Solution</h4>
                <p className="text-base leading-relaxed text-neutral-700">{expandedStudy.solution}</p>
              </div>
            )}
            {expandedStudy.resultsDetail && (
              <div>
                <h4 className="mb-2 text-sm font-bold uppercase tracking-wider text-neutral-400">Results</h4>
                <p className="text-base leading-relaxed text-neutral-700">{expandedStudy.resultsDetail}</p>
              </div>
            )}
          </div>

          {/* If no challenge/solution/results, show the brief + result */}
          {!expandedStudy.challenge && !expandedStudy.solution && (
            <div className="grid gap-8 md:grid-cols-2">
              <div>
                <h4 className="mb-2 text-sm font-bold uppercase tracking-wider text-neutral-400">The brief</h4>
                <p className="text-base leading-relaxed text-neutral-700">{expandedStudy.brief}</p>
              </div>
              <div>
                <h4 className="mb-2 text-sm font-bold uppercase tracking-wider text-neutral-400">The result</h4>
                <p className="text-base leading-relaxed text-neutral-700">{expandedStudy.result}</p>
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-neutral-200 pt-8">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-full bg-brand-flame px-6 py-3 text-sm font-bold text-white transition-colors duration-150 hover:bg-brand-flame-dark"
            >
              Start a similar project
            </Link>
            <Link
              href={`/work/${expandedStudy.slug}`}
              className="inline-flex items-center gap-1 text-sm font-medium text-brand-cerulean-dark transition-colors duration-150 hover:text-brand-cerulean"
            >
              Full case study page <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 && (
        <p className="py-12 text-center text-neutral-500">
          Nothing here yet for that filter.{" "}
          <button
            onClick={() => setActiveCategory("all")}
            className="font-medium text-brand-cerulean-dark underline"
          >
            See all our work
          </button>
        </p>
      )}
    </>
  );
}
