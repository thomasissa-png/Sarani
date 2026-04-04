import type { Metadata } from "next";
import { Suspense } from "react";
import { Section } from "@/components/layout/section";
import { Button } from "@/components/ui/button";
import { WorkGrid } from "@/components/case-studies/work-grid";
import { getOrderedCaseStudies, getCategories, type CaseStudy } from "@/data/case-studies";
import { BreadcrumbSchema } from "@/components/seo/breadcrumb-schema";
import { BREADCRUMBS } from "@/lib/breadcrumb-jsonld";
import { db } from "@/lib/db";
import { caseStudyOutputs } from "@/lib/db/schema";
import { eq, isNotNull, and, desc } from "drizzle-orm";

// Dynamic rendering — include DB-published case studies immediately
export const dynamic = "force-dynamic";
export const revalidate = 0;

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
  alternates: {
    canonical: "https://sarani.studio/work",
  },
};

export default async function WorkPage() {
  const staticStudies = getOrderedCaseStudies();
  const staticSlugs = new Set(staticStudies.map((s) => s.slug));

  // Fetch DB-published case studies and merge (pipeline-generated)
  let dbStudies: CaseStudy[] = [];
  try {
    const rows = await db
      .select({ content: caseStudyOutputs.content })
      .from(caseStudyOutputs)
      .where(
        and(
          eq(caseStudyOutputs.outputType, "case_study"),
          isNotNull(caseStudyOutputs.publishedAt)
        )
      )
      .orderBy(desc(caseStudyOutputs.publishedAt));

    dbStudies = rows
      .map((r) => r.content as unknown as CaseStudy)
      .filter((cs) => cs?.slug && !staticSlugs.has(cs.slug)); // Avoid duplicates
  } catch (err) {
    console.error("[work] DB query for published case studies failed:", err instanceof Error ? err.message : err);
  }

  // DB-published case studies appear first (newest), then static
  const orderedStudies = [...dbStudies, ...staticStudies];
  // Merge categories from both sources
  const allCategories = new Set([
    ...getCategories(),
    ...dbStudies.map((cs) => cs.category).filter(Boolean),
  ]);
  const categories = Array.from(allCategories);

  return (
    <div className="pt-[var(--header-height)]">
      <BreadcrumbSchema items={BREADCRUMBS.work} />
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
        <Suspense>
          <WorkGrid caseStudies={orderedStudies} categories={categories} />
        </Suspense>
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
