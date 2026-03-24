"use client";

import { useCallback } from "react";
import { track, getDevice, getReferrer } from "@/lib/analytics";

const CASE_STUDIES = [
  {
    client: "TikTok",
    headline: "1,500+ edits per month",
    description:
      "Ongoing video production at scale for TikTok's EMEA marketing team.",
    slug: "tiktok-video-production",
  },
  {
    client: "GEODIS",
    headline: "5,700 slides, 3 weeks",
    description:
      "Complete corporate presentation rebrand across all business units.",
    slug: "geodis-presentation-rebranding",
  },
  {
    client: "Sony",
    headline: "125 assets, TV launch",
    description:
      "Full campaign banner production for a major product launch.",
    slug: "sony-banner-production",
  },
] as const;

/**
 * Case study teaser cards with click tracking.
 * V2 light design.
 */
export function CaseStudyTeasers() {
  const handleClick = useCallback((client: string, slug: string) => {
    track("case_study_click", {
      client,
      slug,
      location: "homepage_teaser",
      page: "/",
      device: getDevice(),
      referrer: getReferrer(),
    });
  }, []);

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {CASE_STUDIES.map((study) => (
        <a
          key={study.slug}
          href={`/case-studies/${study.slug}`}
          onClick={() => handleClick(study.client, study.slug)}
          className="group rounded-2xl border border-neutral-300 bg-brand-white p-8 transition-all duration-200 hover:border-brand-lemon hover:shadow-md"
        >
          <p className="mb-2 text-sm font-bold uppercase tracking-wider text-brand-cerulean">
            {study.client}
          </p>
          <p className="mb-3 text-xl font-bold text-brand-black">
            {study.headline}
          </p>
          <p className="mb-6 text-sm text-neutral-500">
            {study.description}
          </p>
          <span className="text-sm font-bold text-brand-flame transition-colors group-hover:text-brand-flame-light">
            Read case study &rarr;
          </span>
        </a>
      ))}
    </div>
  );
}
