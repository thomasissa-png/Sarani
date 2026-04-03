import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Section } from "@/components/layout/section";
import {
  getAllCaseStudySlugs,
  getCaseStudyBySlug,
  getRelatedCaseStudies,
} from "@/data/case-studies";
import { type CaseStudyOutput } from "@/lib/case-studies/schemas";
import { BreadcrumbSchema } from "@/components/seo/breadcrumb-schema";
import { caseStudyDetailBreadcrumb } from "@/lib/breadcrumb-jsonld";
import { db } from "@/lib/db";
import { caseStudyOutputs } from "@/lib/db/schema";
import { eq, isNotNull, and } from "drizzle-orm";
import { CaseStudyCta } from "./cta";
import { fetchCaseStudyGallery } from "@/lib/case-studies/fetch-gallery";
import ImageLightbox from "@/components/ui/ImageLightbox";

// ISR — revalidates every hour. DB-first for pipeline-generated case studies,
// falls back to static data (redirects to /work/[slug]).
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
      title: `${dbCs.client} — ${dbCs.headline} | Sarani`,
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
    title: `${cs.client} — ${cs.headline} | Sarani`,
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

  // 3. Render the pipeline-generated case study (dark-first design)
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
    <div className="relative bg-brand-black pt-[var(--header-height)]">
      <BreadcrumbSchema
        items={caseStudyDetailBreadcrumb(cs.client, slug)}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ── Hero ── */}
      <Section ariaLabel={`${cs.client} case study hero`}>
        <div className="mx-auto max-w-3xl">
          {/* Tags + Category */}
          <div className="mb-4 flex flex-wrap gap-2">
            <span className="inline-block rounded-full border border-white/20 px-3 py-1 text-xs font-medium text-white/60">
              {cs.category}
            </span>
            {cs.tags &&
              cs.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-block rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-white/50"
                >
                  {tag}
                </span>
              ))}
          </div>

          <p className="mb-4 text-sm font-medium uppercase tracking-wider text-brand-flame">
            {cs.client}
          </p>
          <h1 className="mb-6 text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
            {cs.headline}
          </h1>

          {cs.subtitle && (
            <p className="mb-8 text-lg text-neutral-400">
              {cs.subtitle}
            </p>
          )}

          {/* Hero image from VisualSelector */}
          {cs.heroImage && (
            <div className="mb-8 overflow-hidden rounded-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cs.heroImage}
                alt={`${cs.client} — ${cs.headline}`}
                className="w-full object-cover"
              />
            </div>
          )}

          {/* Key metric badge */}
          {cs.keyMetric && (
            <div className="mb-8">
              <span className="inline-block rounded-full bg-brand-flame px-4 py-2 text-sm font-bold text-white">
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
              <span className="font-medium text-white">
                {cs.deliverable}
              </span>
            </div>
            {cs.volume && (
              <div>
                <span className="block text-xs uppercase tracking-wider text-neutral-500">
                  Volume
                </span>
                <span className="font-medium text-white">{cs.volume}</span>
              </div>
            )}
            {cs.turnaround && (
              <div>
                <span className="block text-xs uppercase tracking-wider text-neutral-500">
                  Timeline
                </span>
                <span className="font-medium text-white">
                  {cs.turnaround}
                </span>
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* ── Stats ── */}
      {stats.length > 0 && (
        <Section ariaLabel="Key results" id="results">
          <h2 className="mb-8 text-center text-2xl font-bold text-white">
            Results
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {stats.slice(0, 3).map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center"
              >
                <p className="text-3xl font-bold text-brand-lemon">
                  {stat.value}
                </p>
                <p className="mt-2 text-sm uppercase tracking-wider text-white/60">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── Challenge + Solution + Brief/Result ── */}
      <Section ariaLabel="Challenge and solution">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-8">
            {cs.challenge && (
              <>
                <h2 className="mb-6 text-2xl font-bold text-white">
                  The Challenge
                </h2>
                <p className="mb-10 text-lg leading-relaxed text-neutral-400">
                  {cs.challenge}
                </p>
              </>
            )}
            {cs.solution && (
              <>
                <h2 className="mb-6 text-2xl font-bold text-white">
                  Our Approach
                </h2>
                <div className="space-y-4 text-lg leading-relaxed text-neutral-400">
                  {cs.solution.split("\n\n").map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}
                </div>
              </>
            )}
            {cs.resultsDetail && (
              <>
                <h2 className="mt-10 mb-6 text-2xl font-bold text-white">
                  Results in Detail
                </h2>
                <p className="text-lg leading-relaxed text-neutral-400">
                  {cs.resultsDetail}
                </p>
              </>
            )}
            {!cs.challenge && !cs.solution && (
              <>
                <h2 className="mb-6 text-2xl font-bold text-white">
                  The Brief
                </h2>
                <p className="mb-10 text-lg leading-relaxed text-neutral-400">
                  {cs.brief}
                </p>
                <h2 className="mb-6 text-2xl font-bold text-white">
                  The Result
                </h2>
                <p className="text-lg leading-relaxed text-neutral-400">
                  {cs.result}
                </p>
              </>
            )}
          </div>

          {/* At a Glance sidebar */}
          <aside className="lg:col-span-4">
            <div className="sticky top-24 rounded-2xl border border-white/10 bg-white/5 p-8">
              <h3 className="mb-6 text-lg font-bold text-white">
                At a Glance
              </h3>
              <dl className="space-y-4">
                <div>
                  <dt className="text-xs uppercase tracking-wider text-neutral-500">
                    Client
                  </dt>
                  <dd className="font-medium text-white">{cs.client}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-neutral-500">
                    Deliverable
                  </dt>
                  <dd className="font-medium text-white">
                    {cs.deliverable}
                  </dd>
                </div>
                {cs.volume && (
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-neutral-500">
                      Volume
                    </dt>
                    <dd className="font-medium text-white">{cs.volume}</dd>
                  </div>
                )}
                {cs.turnaround && (
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-neutral-500">
                      Turnaround
                    </dt>
                    <dd className="font-medium text-white">
                      {cs.turnaround}
                    </dd>
                  </div>
                )}
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
            </div>
          </aside>
        </div>
      </Section>

      {/* ── Project Gallery ── */}
      {galleryImages.length > 0 && (
        <Section ariaLabel="Project gallery">
          <h2 className="mb-8 text-center text-2xl font-bold text-white">
            The Work
          </h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {galleryImages.map((img) => (
              <ImageLightbox key={img.url} src={img.url} alt={img.name}>
                <div className="aspect-video overflow-hidden rounded-xl bg-white/5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={img.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
              </ImageLightbox>
            ))}
          </div>
        </Section>
      )}

      {/* ── Testimonial ── */}
      {cs.testimonial && (
        <Section ariaLabel="Client testimonial">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 text-brand-flame">
              <svg
                className="mx-auto h-10 w-10"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
              </svg>
            </div>
            <blockquote className="text-xl font-medium italic leading-relaxed text-white md:text-2xl">
              {cs.testimonial.quote}
            </blockquote>
            <div className="mt-6">
              <p className="font-semibold text-white">
                {cs.testimonial.author}
              </p>
              <p className="text-sm text-neutral-500">
                {cs.testimonial.role}, {cs.testimonial.company}
              </p>
            </div>
          </div>
        </Section>
      )}

      {/* ── Closing CTA ── */}
      <Section ariaLabel="Start your project">
        <div className="text-center">
          <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
            Ready for results like these?
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-neutral-500">
            First project satisfaction or no invoice.
          </p>
          <CaseStudyCta client={cs.client} />
        </div>
      </Section>

      {/* Back to all case studies */}
      <div className="pb-8 text-center">
        <a
          href="/case-studies"
          className="text-sm font-medium text-brand-cerulean hover:underline"
        >
          &larr; View all case studies
        </a>
      </div>

      {/* ── Related case studies ── */}
      {related.length > 0 && (
        <Section ariaLabel="Related case studies" tight>
          <h2 className="mb-8 text-2xl font-bold text-white">
            More Case Studies
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((r) => (
              <a
                key={r.slug}
                href={`/work/${r.slug}`}
                className="group rounded-2xl border border-white/10 bg-white/5 p-6 transition-all duration-200 hover:border-brand-flame/40 hover:bg-white/10"
              >
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="inline-block rounded-full bg-brand-flame/20 px-3 py-1 text-xs font-bold text-brand-flame">
                    {r.keyMetric}
                  </span>
                  <span className="inline-block rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-neutral-500">
                    {r.category}
                  </span>
                </div>
                <p className="mb-1 text-sm font-medium uppercase tracking-wider text-brand-flame">
                  {r.client}
                </p>
                <p className="text-lg font-bold leading-snug text-white">
                  {r.headline}
                </p>
              </a>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
