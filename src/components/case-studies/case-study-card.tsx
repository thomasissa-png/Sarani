"use client";

import { track, getDevice, getReferrer } from "@/lib/analytics";
import type { CaseStudy } from "@/data/case-studies";

interface CaseStudyCardProps {
  caseStudy: CaseStudy;
  /** Analytics location — e.g. "work_listing", "related_section", "homepage" */
  trackingLocation: string;
}

/**
 * Reusable case study card — V2 light design.
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
    <a
      href={`/case-studies/${caseStudy.slug}`}
      onClick={handleClick}
      className="group block rounded-2xl border border-neutral-300 bg-brand-white p-8 transition-all duration-200 hover:border-brand-lemon hover:shadow-md"
    >
      <p className="mb-1 text-sm font-medium uppercase tracking-wider text-brand-flame">
        {caseStudy.client}
      </p>
      <p className="mb-3 text-lg font-bold text-brand-black">
        {caseStudy.deliverable}
      </p>
      <p className="mb-6 text-sm text-neutral-500">
        {caseStudy.keyMetric}
      </p>
      <span className="inline-flex items-center gap-1 text-sm font-bold text-brand-cerulean transition-all duration-150 group-hover:gap-2">
        Read case study
        <span aria-hidden="true">&rarr;</span>
      </span>
    </a>
  );
}
