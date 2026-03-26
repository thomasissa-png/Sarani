"use client";

import Link from "next/link";
import { track, getDevice, getReferrer } from "@/lib/analytics";
import type { CaseStudy } from "@/data/case-studies";

interface CaseStudyCardProps {
  caseStudy: CaseStudy;
  /** Analytics location — e.g. "work_listing", "related_section", "homepage" */
  trackingLocation: string;
}

/**
 * Reusable case study card — V2 light design.
 * Shows client, headline, key metric badge, category, read link, and a secondary CTA.
 */
export function CaseStudyCard({ caseStudy, trackingLocation }: CaseStudyCardProps) {
  const handleClick = () => {
    track("case_study_click", {
      client: caseStudy.client,
      location: trackingLocation,
      slug: caseStudy.slug,
      page: typeof window !== "undefined" ? window.location.pathname : "/",
      device: getDevice(),
      referrer: getReferrer(),
    });
  };

  return (
    <div className="group relative flex flex-col rounded-2xl border border-neutral-300 bg-brand-white p-8 transition-all duration-200 hover:border-brand-lemon hover:shadow-md">
      {/* Top row: metric badge + category */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="inline-block rounded-full bg-brand-black/5 px-3 py-1 text-xs font-bold text-brand-black">
          {caseStudy.keyMetric}
        </span>
        <span className="inline-block rounded-full border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-500">
          {caseStudy.category}
        </span>
      </div>

      <p className="mb-1 text-sm font-medium uppercase tracking-wider text-brand-flame-dark">
        {caseStudy.client}
      </p>
      <p className="mb-2 text-lg font-bold leading-snug text-brand-black">
        {caseStudy.headline}
      </p>
      <p className="mb-6 text-sm font-medium text-neutral-500">
        {caseStudy.outcome}
      </p>

      {/* Push links to bottom */}
      <div className="mt-auto flex flex-col gap-3">
        <Link
          href={`/work/${caseStudy.slug}`}
          onClick={handleClick}
          className="inline-flex items-center gap-1 text-sm font-bold text-brand-cerulean-dark transition-all duration-150 group-hover:gap-2"
        >
          Read case study
          <span aria-hidden="true">&rarr;</span>
        </Link>

        <Link
          href="/contact"
          className="inline-flex items-center gap-1 text-sm font-medium text-neutral-500 transition-colors duration-150 hover:text-brand-flame"
        >
          Start a similar project
          <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>
    </div>
  );
}
