import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Section } from "@/components/layout/section";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/case-studies/stat-card";
import { CaseStudyCard } from "@/components/case-studies/case-study-card";
import { CaseStudyScrollTracker } from "@/components/case-studies/scroll-tracker";
import { CaseStudyCta } from "./cta";
import {
  getAllCaseStudySlugs,
  getCaseStudyBySlug,
  getRelatedCaseStudies,
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
    title: `${cs.client} — ${cs.deliverable}`,
    description: cs.metaDescription,
    openGraph: {
      title: `${cs.client} — ${cs.deliverable} | Sarani`,
      description: cs.metaDescription,
      url: `/case-studies/${cs.slug}`,
      type: "article",
    },
  };
}

/* ---------- Page ---------- */

export default async function CaseStudyPage({ params }: PageProps) {
  const { slug } = await params;
  const cs = getCaseStudyBySlug(slug);
  if (!cs) notFound();

  const related = getRelatedCaseStudies(slug);
  const pagePath = `/case-studies/${cs.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: `${cs.client} — ${cs.deliverable}`,
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
    <div className="relative pt-[72px]">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Scroll depth tracking */}
      <CaseStudyScrollTracker page={pagePath} />

      {/* Hero */}
      <Section ariaLabel={`${cs.client} case study hero`}>
        <p className="mb-4 text-sm font-medium uppercase tracking-wider text-brand-flame">
          {cs.client}
        </p>
        <h1 className="mb-8 max-w-3xl text-3xl font-bold leading-tight text-brand-white sm:text-4xl lg:text-5xl">
          {cs.headline}
        </h1>
        {/* Meta strip */}
        <div className="flex flex-wrap gap-6 text-sm text-neutral-400">
          <div>
            <span className="block text-xs uppercase tracking-wider text-neutral-500">
              Deliverable
            </span>
            <span className="font-medium text-brand-white">
              {cs.deliverable}
            </span>
          </div>
          <div>
            <span className="block text-xs uppercase tracking-wider text-neutral-500">
              Timeline
            </span>
            <span className="font-medium text-brand-white">
              {cs.turnaround}
            </span>
          </div>
          <div>
            <span className="block text-xs uppercase tracking-wider text-neutral-500">
              Volume
            </span>
            <span className="font-medium text-brand-white">{cs.volume}</span>
          </div>
        </div>
      </Section>

      {/* Hero image placeholder */}
      <Section ariaLabel="Project imagery" tight>
        <div className="aspect-video w-full rounded-2xl bg-surface-elevated" />
      </Section>

      {/* The Brief — 2-col layout */}
      <Section ariaLabel="The brief">
        <div className="grid gap-12 lg:grid-cols-12">
          {/* Content — 8 cols */}
          <div className="lg:col-span-8">
            <h2 className="mb-6 text-2xl font-bold text-brand-white">
              The Brief
            </h2>
            <p className="text-lg leading-relaxed text-neutral-300">
              {cs.brief}
            </p>
          </div>

          {/* At a Glance sidebar — 4 cols */}
          <aside className="lg:col-span-4">
            <div className="sticky top-24 rounded-2xl border border-surface-overlay bg-surface-elevated p-8">
              <h3 className="mb-6 text-lg font-bold text-brand-white">
                At a Glance
              </h3>
              <dl className="space-y-4">
                <div>
                  <dt className="text-xs uppercase tracking-wider text-neutral-500">
                    Client
                  </dt>
                  <dd className="font-medium text-brand-white">{cs.client}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-neutral-500">
                    Deliverable
                  </dt>
                  <dd className="font-medium text-brand-white">
                    {cs.deliverable}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-neutral-500">
                    Volume
                  </dt>
                  <dd className="font-medium text-brand-white">{cs.volume}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-neutral-500">
                    Timeline
                  </dt>
                  <dd className="font-medium text-brand-white">
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
        <h2 className="mb-8 text-center text-2xl font-bold text-brand-white">
          Results
        </h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {cs.stats.map((stat) => (
            <StatCard key={stat.label} label={stat.label} value={stat.value} />
          ))}
        </div>
        <p className="mt-8 text-center text-lg font-medium text-neutral-300">
          {cs.result}
        </p>
      </Section>

      {/* Gallery placeholder */}
      <Section ariaLabel="Project gallery" tight>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="aspect-video rounded-2xl bg-surface-elevated" />
          <div className="aspect-video rounded-2xl bg-surface-elevated" />
        </div>
      </Section>

      {/* Closing CTA */}
      <Section ariaLabel="Start your project">
        <div className="text-center">
          <h2 className="mb-4 text-3xl font-bold text-brand-white sm:text-4xl">
            Ready to start your first project?
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-neutral-400">
            Fixed pricing. Unlimited revisions. First project satisfaction or no
            invoice.
          </p>
          <CaseStudyCta client={cs.client} />
        </div>
      </Section>

      {/* Related case studies */}
      {related.length > 0 && (
        <Section ariaLabel="Related case studies" tight>
          <h2 className="mb-8 text-2xl font-bold text-brand-white">
            More Case Studies
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {related.map((r) => (
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
