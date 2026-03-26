"use client";

import { useState } from "react";
import { CaseStudyCard } from "@/components/case-studies/case-study-card";
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

  const filtered =
    activeCategory === "all"
      ? caseStudies
      : caseStudies.filter((cs) => cs.category === activeCategory);

  return (
    <>
      {/* Category filter */}
      <div className="mb-10 flex flex-wrap gap-3">
        <button
          onClick={() => setActiveCategory("all")}
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
            onClick={() => setActiveCategory(cat)}
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
          <CaseStudyCard
            key={cs.slug}
            caseStudy={cs}
            trackingLocation="work_listing"
          />
        ))}
      </div>

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
