import type { Metadata } from "next";
import { Section } from "@/components/layout/section";
import { CaseStudyCard } from "@/components/case-studies/case-study-card";
import { caseStudies } from "@/data/case-studies";

export const metadata: Metadata = {
  title: "Case Studies — Enterprise Creative Work",
  description:
    "TikTok, Sony, GEODIS, Adidas, L'Oreal. Real briefs. Real deadlines. See how Sarani delivers 24-hour creative production for global enterprises.",
  openGraph: {
    title: "Case Studies — Sarani Enterprise Creative Work",
    description:
      "TikTok, Sony, GEODIS, Adidas, L'Oreal. Real briefs. Real deadlines. Real results.",
    url: "/work",
  },
};

export default function WorkPage() {
  return (
    <div className="pt-[var(--header-height)]">
      <Section ariaLabel="Case studies">
        <h1 className="mb-6 text-4xl font-bold text-brand-black sm:text-5xl">
          Case Studies
        </h1>
        <p className="mb-12 max-w-2xl text-lg text-neutral-600">
          TikTok, Sony, GEODIS, Adidas, L&apos;Or&eacute;al. Real briefs. Real
          deadlines. Real results.
        </p>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {caseStudies.map((cs) => (
            <CaseStudyCard
              key={cs.slug}
              caseStudy={cs}
              trackingLocation="work_listing"
            />
          ))}
        </div>
      </Section>
    </div>
  );
}
