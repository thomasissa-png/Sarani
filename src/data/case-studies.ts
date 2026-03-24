/**
 * Case study data — source: docs/product/functional-specs.md US-102
 * Static data, no API dependency. Used by /work listing and /case-studies/[slug] detail pages.
 */

export interface CaseStudyStat {
  label: string;
  value: string;
}

export interface CaseStudy {
  slug: string;
  client: string;
  deliverable: string;
  volume: string;
  turnaround: string;
  outcome: string;
  brief: string;
  result: string;
  /** H1 on detail page — Formula 2: Problem to Result */
  headline: string;
  /** Short metric for card display */
  keyMetric: string;
  /** Stats displayed in the results section (3 cards) */
  stats: [CaseStudyStat, CaseStudyStat, CaseStudyStat];
  /** SEO meta description */
  metaDescription: string;
}

export const caseStudies: CaseStudy[] = [
  {
    slug: "tiktok-video-production",
    client: "TikTok",
    deliverable: "Video editing",
    volume: "1,500+ edits per month",
    turnaround: "Ongoing, daily delivery",
    outcome: "51M+ views across campaigns",
    brief:
      "TikTok needed 300-500 video edits per week for creator campaigns across multiple markets. Speed and consistency were non-negotiable.",
    result: "1,500+ edits per month. 51M+ views. Every deadline met.",
    headline: "300-500 edits per week. 51M+ views. Every deadline met.",
    keyMetric: "51M+ views",
    stats: [
      { label: "Edits per month", value: "1,500+" },
      { label: "Total views", value: "51M+" },
      { label: "Deadlines met", value: "100%" },
    ],
    metaDescription:
      "How Sarani delivers 1,500+ video edits per month for TikTok creator campaigns across multiple markets. 51M+ views. Every deadline met.",
  },
  {
    slug: "sony-banner-production",
    client: "Sony",
    deliverable: "Banner production",
    volume: "125 assets",
    turnaround: "Same day (24 hours)",
    outcome: "Black Friday campaign, banners from 155\u20AC",
    brief:
      "Sony needed Black Friday banners delivered the same day. We produced 125 assets \u2014 banners, social cards, and email headers \u2014 before the deadline.",
    result: "125 assets. Same day. From 155\u20AC per banner.",
    headline: "125 Black Friday assets. Same day. From 155\u20AC per banner.",
    keyMetric: "125 assets in 24h",
    stats: [
      { label: "Assets delivered", value: "125" },
      { label: "Turnaround", value: "24h" },
      { label: "Price per banner", value: "155\u20AC" },
    ],
    metaDescription:
      "How Sarani produced 125 Black Friday banner assets for Sony in 24 hours. Banners, social cards, and email headers \u2014 same-day delivery from 155\u20AC.",
  },
  {
    slug: "geodis-presentation-rebranding",
    client: "GEODIS",
    deliverable: "Presentation rebranding",
    volume: "5,700 slides (350 presentations)",
    turnaround: "3 weeks",
    outcome: "8,500\u20AC total (previous agency quoted 80,000\u20AC)",
    brief:
      "GEODIS needed 350 presentations rebranded across 12 markets in 3 weeks, full brand consistency. Their previous agency quoted 80,000\u20AC and 3 months.",
    result: "5,700 slides. 3 weeks. 8,500\u20AC total.",
    headline:
      "350 presentations rebranded in 3 weeks. 8,500\u20AC instead of 80,000\u20AC.",
    keyMetric: "90% cost savings",
    stats: [
      { label: "Slides rebranded", value: "5,700" },
      { label: "Total cost", value: "8,500\u20AC" },
      { label: "Time to deliver", value: "3 weeks" },
    ],
    metaDescription:
      "How Sarani rebranded 5,700 slides across 350 presentations for GEODIS in 3 weeks for 8,500\u20AC \u2014 their previous agency quoted 80,000\u20AC and 3 months.",
  },
];

/** Lookup a case study by slug. Returns undefined if not found. */
export function getCaseStudyBySlug(slug: string): CaseStudy | undefined {
  return caseStudies.find((cs) => cs.slug === slug);
}

/** Get all slugs for generateStaticParams */
export function getAllCaseStudySlugs(): string[] {
  return caseStudies.map((cs) => cs.slug);
}

/** Get related case studies (all except the current one) */
export function getRelatedCaseStudies(currentSlug: string): CaseStudy[] {
  return caseStudies.filter((cs) => cs.slug !== currentSlug);
}
