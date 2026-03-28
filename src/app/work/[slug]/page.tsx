import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Section } from "@/components/layout/section";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/case-studies/stat-card";
import { CaseStudyCard } from "@/components/case-studies/case-study-card";
import {
  getAllCaseStudySlugs,
  getCaseStudyBySlug,
  getRelatedCaseStudies,
  getAdjacentCaseStudies,
} from "@/data/case-studies";

/* ---------- SSG ---------- */

export function generateStaticParams() {
  return getAllCaseStudySlugs().map((slug) => ({ slug }));
}

/* ---------- Metadata ---------- */

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const cs = getCaseStudyBySlug(slug);
  if (!cs) return {};

  return {
    title: `${cs.client} — ${cs.headline} | Sarani`,
    description: cs.metaDescription,
    openGraph: {
      title: `${cs.client} — ${cs.headline} | Sarani`,
      description: cs.metaDescription,
      url: `/work/${cs.slug}`,
      type: "article",
    },
    alternates: {
      canonical: `https://sarani.studio/work/${slug}`,
    },
  };
}

/* ---------- Page ---------- */

export default async function WorkCaseStudyPage({ params }: PageProps) {
  const { slug } = await params;
  const cs = getCaseStudyBySlug(slug);
  if (!cs) notFound();

  const related = getRelatedCaseStudies(slug);
  const { prev, next } = getAdjacentCaseStudies(slug);
  const pagePath = `/work/${cs.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: `${cs.client} — ${cs.headline}`,
    description: cs.metaDescription,
    url: `https://sarani.studio${pagePath}`,
    creator: {
      "@type": "Organization",
      name: "Sarani",
      url: "https://sarani.studio",
    },
    about: {
      "@type": "Organization",
      name: cs.client,
    },
  };

  return (
    <div className="relative pt-[var(--header-height)]">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <Section ariaLabel={`${cs.client} case study hero`}>
        <div className="mx-auto max-w-3xl">
          {/* Tags + Category */}
          <div className="mb-4 flex flex-wrap gap-2">
            <span className="inline-block rounded-full border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-500">
              {cs.category}
            </span>
            {cs.tags && cs.tags.map((tag) => (
              <span
                key={tag}
                className="inline-block rounded-full bg-brand-black/5 px-3 py-1 text-xs font-medium text-neutral-600"
              >
                {tag}
              </span>
            ))}
          </div>

          <p className="mb-4 text-sm font-medium uppercase tracking-wider text-brand-flame-dark">
            {cs.client}
          </p>
          <h1 className="mb-6 text-3xl font-bold leading-tight text-brand-black sm:text-4xl lg:text-5xl">
            {cs.headline}
          </h1>
          {cs.subtitle && (
            <p className="mb-8 text-lg text-neutral-600">
              {cs.subtitle}
            </p>
          )}

          {/* Meta strip */}
          <div className="flex flex-wrap gap-6 text-sm text-neutral-500">
            <div>
              <span className="block text-xs uppercase tracking-wider text-neutral-500">
                Deliverable
              </span>
              <span className="font-medium text-brand-black">
                {cs.deliverable}
              </span>
            </div>
            <div>
              <span className="block text-xs uppercase tracking-wider text-neutral-500">
                Timeline
              </span>
              <span className="font-medium text-brand-black">
                {cs.turnaround}
              </span>
            </div>
            <div>
              <span className="block text-xs uppercase tracking-wider text-neutral-500">
                Volume
              </span>
              <span className="font-medium text-brand-black">{cs.volume}</span>
            </div>
          </div>
        </div>
      </Section>

      {/* Challenge + Solution */}
      <Section ariaLabel="Challenge and solution">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-8">
            {cs.challenge && (
              <>
                <h2 className="mb-6 text-2xl font-bold text-brand-black">
                  Challenge
                </h2>
                <p className="mb-10 text-lg leading-relaxed text-neutral-600">
                  {cs.challenge}
                </p>
              </>
            )}
            {cs.solution && (
              <>
                <h2 className="mb-6 text-2xl font-bold text-brand-black">
                  Solution
                </h2>
                <div className="space-y-4 text-lg leading-relaxed text-neutral-600">
                  {cs.solution.split("\n\n").map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}
                </div>
              </>
            )}
            {!cs.challenge && !cs.solution && (
              <>
                <h2 className="mb-6 text-2xl font-bold text-brand-black">
                  The Brief
                </h2>
                <p className="text-lg leading-relaxed text-neutral-600">
                  {cs.brief}
                </p>
              </>
            )}
          </div>

          {/* At a Glance sidebar */}
          <aside className="lg:col-span-4">
            <div className="sticky top-24 rounded-2xl border border-neutral-300 bg-surface-elevated p-8">
              <h3 className="mb-6 text-lg font-bold text-brand-black">
                At a Glance
              </h3>
              <dl className="space-y-4">
                <div>
                  <dt className="text-xs uppercase tracking-wider text-neutral-500">
                    Client
                  </dt>
                  <dd className="font-medium text-brand-black">{cs.client}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-neutral-500">
                    Deliverable
                  </dt>
                  <dd className="font-medium text-brand-black">
                    {cs.deliverable}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-neutral-500">
                    Volume
                  </dt>
                  <dd className="font-medium text-brand-black">{cs.volume}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-neutral-500">
                    Timeline
                  </dt>
                  <dd className="font-medium text-brand-black">
                    {cs.turnaround}
                  </dd>
                </div>
              </dl>
              <div className="mt-8">
                <Button variant="primary" href="/contact" className="w-full">
                  Start a project
                </Button>
              </div>
            </div>
          </aside>
        </div>
      </Section>

      {/* Results */}
      <Section ariaLabel="Results" id="results">
        <h2 className="mb-8 text-center text-2xl font-bold text-brand-black">
          Results
        </h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {cs.stats.map((stat) => (
            <StatCard key={stat.label} label={stat.label} value={stat.value} />
          ))}
        </div>
        <p className="mt-8 text-center text-lg font-medium text-neutral-600">
          {cs.resultsDetail || cs.result}
        </p>
      </Section>

      {/* Prev / Next navigation */}
      {(prev || next) && (
        <Section ariaLabel="Navigate case studies" tight>
          <div className="flex items-center justify-between border-t border-neutral-200 pt-8">
            {prev ? (
              <Link
                href={`/work/${prev.slug}`}
                className="group flex flex-col gap-1"
              >
                <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Previous
                </span>
                <span className="text-sm font-bold text-brand-black transition-colors group-hover:text-brand-cerulean-dark">
                  <span aria-hidden="true">&larr; </span>
                  {prev.client} — {prev.deliverable}
                </span>
              </Link>
            ) : (
              <div />
            )}
            {next ? (
              <Link
                href={`/work/${next.slug}`}
                className="group flex flex-col items-end gap-1 text-right"
              >
                <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Next
                </span>
                <span className="text-sm font-bold text-brand-black transition-colors group-hover:text-brand-cerulean-dark">
                  {next.client} — {next.deliverable}
                  <span aria-hidden="true"> &rarr;</span>
                </span>
              </Link>
            ) : (
              <div />
            )}
          </div>
        </Section>
      )}

      {/* Closing CTA */}
      <Section ariaLabel="Start your project">
        <div className="text-center">
          <h2 className="mb-4 text-3xl font-bold text-brand-black sm:text-4xl">
            Your brief could be next.
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-neutral-500">
            First project satisfaction or no invoice.
          </p>
          <Button variant="primary" href="/contact">
            Start a project
          </Button>
        </div>
      </Section>

      {/* Related case studies */}
      {related.length > 0 && (
        <Section ariaLabel="Related case studies" tight>
          <h2 className="mb-8 text-2xl font-bold text-brand-black">
            More Case Studies
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.slice(0, 3).map((r) => (
              <CaseStudyCard
                key={r.slug}
                caseStudy={r}
                trackingLocation="related_section"
              />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
