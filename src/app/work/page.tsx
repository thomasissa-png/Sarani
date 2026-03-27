import type { Metadata } from "next";
import { Section } from "@/components/layout/section";
import { Button } from "@/components/ui/button";
import { WorkGrid } from "@/components/case-studies/work-grid";
import { getOrderedCaseStudies, getCategories } from "@/data/case-studies";

export const metadata: Metadata = {
  title: "Work — Enterprise Creative at Scale | Sarani",
  description:
    "TikTok, Sony, Adidas, LEGO, IKEA, GEODIS. 300M+ views. 1,500+ edits per month. See how Sarani delivers enterprise creative in 24 hours.",
  openGraph: {
    title: "Work — Enterprise Creative at Scale | Sarani",
    description:
      "TikTok, Sony, Adidas, LEGO, IKEA, GEODIS. Real briefs. Real deadlines. Real results.",
    url: "/work",
  },
};

export default function WorkPage() {
  const orderedStudies = getOrderedCaseStudies();
  const categories = getCategories();

  return (
    <div className="pt-[var(--header-height)]">
      {/* Hero */}
      <Section ariaLabel="Work overview">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand-flame mb-4">
          Our Work
        </p>
        <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight text-brand-black sm:text-5xl lg:text-6xl">
          Enterprise creative. Proven at scale.
        </h1>
        <p className="mb-4 max-w-2xl text-lg leading-relaxed text-neutral-600">
          TikTok, Sony, Adidas, LEGO, IKEA, GEODIS.
          Real briefs. Real deadlines. Real results.
        </p>
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm font-medium text-neutral-500">
          <span>300M+ campaign views</span>
          <span>1,500+ edits per month</span>
          <span>15 languages</span>
          <span>D+1 delivery</span>
        </div>
      </Section>

      {/* Filtered grid */}
      <Section ariaLabel="Case studies">
        <WorkGrid caseStudies={orderedStudies} categories={categories} />
      </Section>

      {/* Footer CTA */}
      <Section ariaLabel="Start your project" className="bg-brand-black">
        <div className="text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">Ready to start?</h2>
          <p className="text-lg text-neutral-400 max-w-xl mx-auto">First project satisfaction or no invoice.</p>
          <Button variant="primary" href="/contact">
            Start a project
          </Button>
        </div>
      </Section>
    </div>
  );
}
