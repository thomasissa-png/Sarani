import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Section } from "@/components/layout/section";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/case-studies/stat-card";
import { CaseStudyCard } from "@/components/case-studies/case-study-card";
import {
  getAllCaseStudySlugs,
  getCaseStudyBySlug,
  getRelatedCaseStudies,
} from "@/data/case-studies";
import { type CaseStudyOutput } from "@/lib/case-studies/schemas";
import { BreadcrumbSchema } from "@/components/seo/breadcrumb-schema";
import { workDetailBreadcrumb } from "@/lib/breadcrumb-jsonld";
import { db } from "@/lib/db";
import { caseStudyOutputs } from "@/lib/db/schema";
import { eq, isNotNull, and } from "drizzle-orm";
import { CaseStudyCta } from "./cta";
import { fetchCaseStudyGallery } from "@/lib/case-studies/fetch-gallery";
import ImageLightbox from "@/components/ui/ImageLightbox";

// ISR — Rendering strategy: revalidates every hour. Checks DB first for pipeline-generated
// case studies, falls back to static data (redirects to /work/[slug]).
export const revalidate = 3600;

/* ---------- Data fetching ---------- */

async function fetchPublishedCaseStudy(
  slug: string
): Promise<CaseStudyOutput | null> {
  try {
    const [output] = await db
      .select({
        content: caseStudyOutputs.content,
        publishedAt: caseStudyOutputs.publishedAt,
      })
      .from(caseStudyOutputs)
      .where(
        and(
          eq(caseStudyOutputs.caseStudySlug, slug),
          eq(caseStudyOutputs.outputType, "case_study"),
          isNotNull(caseStudyOutputs.publishedAt)
        )
      )
      .limit(1);

    if (!output) return null;
    return output.content as unknown as CaseStudyOutput;
  } catch {
    // DB unavailable — graceful fallback
    return null;
  }
}

/* ---------- Static params for known slugs ---------- */

export function generateStaticParams() {
  return getAllCaseStudySlugs().map((slug) => ({ slug }));
}

/* ---------- Metadata ---------- */

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;

  // Check DB first
  const dbCs = await fetchPublishedCaseStudy(slug);
  if (dbCs) {
    return {
      title: `${dbCs.client} — ${dbCs.headline}`,
      description: dbCs.metaDescription,
      openGraph: {
        title: `${dbCs.client} — ${dbCs.headline} | Sarani`,
        description: dbCs.metaDescription,
        url: `/case-studies/${slug}`,
        type: "article",
      },
      alternates: {
        canonical: `https://sarani.studio/case-studies/${slug}`,
      },
    };
  }

  // Static fallback — redirect will happen in the page component
  const cs = getCaseStudyBySlug(slug);
  if (!cs) return {};

  return {
    title: `${cs.client} — ${cs.headline}`,
    description: cs.metaDescription,
    alternates: {
      canonical: `https://sarani.studio/work/${slug}`,
    },
  };
}

/* ---------- Page ---------- */

export default async function CaseStudyPage({ params }: PageProps) {
  const { slug } = await params;

  // 1. Check DB for pipeline-generated case study
  const dbCs = await fetchPublishedCaseStudy(slug);

  // 2. If not in DB, check static data — redirect to /work/[slug]
  if (!dbCs) {
    const staticCs = getCaseStudyBySlug(slug);
    if (staticCs) {
      redirect(`/work/${slug}`);
    }
    notFound();
  }

  // 3. Render the pipeline-generated case study
  const cs = dbCs;
  const stats = cs.stats ?? [];
  const related = getRelatedCaseStudies(slug).slice(0, 3);
  const pagePath = `/case-studies/${slug}`;

  // Fetch gallery images from SharePoint (graceful fallback to empty array)
  const galleryImages = await fetchCaseStudyGallery(cs.client, cs.deliverable);

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
      <BreadcrumbSchema
        items={workDetailBreadcrumb(cs.client, slug)}
      />
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
            {cs.tags &&
              cs.tags.map((tag) => (
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

          {/* Key metric badge */}
          {cs.keyMetric && (
            <div className="mb-8">
              <span className="inline-block rounded-full bg-brand-flame/10 px-4 py-2 text-sm font-bold text-brand-flame">
                {cs.keyMetric}
              </span>
            </div>
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
                Category
              </span>
              <span className="font-medium text-brand-black">
                {cs.category}
              </span>
            </div>
          </div>
        </div>
      </Section>

      {/* Stats */}
      {stats.length > 0 && (
        <Section ariaLabel="Key results" id="results">
          <h2 className="mb-8 text-center text-2xl font-bold text-brand-black">
            Results
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {stats.slice(0, 3).map((stat) => (
              <StatCard
                key={stat.label}
                label={stat.label}
                value={stat.value}
              />
            ))}
          </div>
        </Section>
      )}

      {/* Challenge + Solution + Brief/Result */}
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
            {cs.resultsDetail && (
              <>
                <h2 className="mt-10 mb-6 text-2xl font-bold text-brand-black">
                  Results in Detail
                </h2>
                <p className="text-lg leading-relaxed text-neutral-600">
                  {cs.resultsDetail}
                </p>
              </>
            )}
            {!cs.challenge && !cs.solution && (
              <>
                <h2 className="mb-6 text-2xl font-bold text-brand-black">
                  The Brief
                </h2>
                <p className="mb-10 text-lg leading-relaxed text-neutral-600">
                  {cs.brief}
                </p>
                <h2 className="mb-6 text-2xl font-bold text-brand-black">
                  The Result
                </h2>
                <p className="text-lg leading-relaxed text-neutral-600">
                  {cs.result}
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
                  <dd className="font-medium text-brand-black">
                    {cs.client}
                  </dd>
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
                    Category
                  </dt>
                  <dd className="font-medium text-brand-black">
                    {cs.category}
                  </dd>
                </div>
                {cs.keyMetric && (
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-neutral-500">
                      Key Metric
                    </dt>
                    <dd className="font-bold text-brand-flame">
                      {cs.keyMetric}
                    </dd>
                  </div>
                )}
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

      {/* Project Gallery — visual proof of work (critical for credibility) */}
      {galleryImages.length > 0 && (
        <Section ariaLabel="Project gallery">
          <h2 className="mb-8 text-center text-2xl font-bold text-brand-black">
            The Work
          </h2>
          <ImageLightbox images={galleryImages} />
        </Section>
      )}

      {/* Testimonial */}
      {cs.testimonial && (
        <Section ariaLabel="Client testimonial">
          <div className="mx-auto max-w-3xl text-center">
            <blockquote className="text-xl md:text-2xl font-medium italic leading-relaxed text-brand-black">
              &ldquo;{cs.testimonial.quote}&rdquo;
            </blockquote>
            <div className="mt-6">
              <p className="font-semibold text-brand-black">
                {cs.testimonial.author}
              </p>
              <p className="text-sm text-neutral-500">
                {cs.testimonial.role}, {cs.testimonial.company}
              </p>
            </div>
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
          <CaseStudyCta client={cs.client} />
        </div>
      </Section>

      {/* Related case studies */}
      {related.length > 0 && (
        <Section ariaLabel="Related case studies" tight>
          <h2 className="mb-8 text-2xl font-bold text-brand-black">
            More Case Studies
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
