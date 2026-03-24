import { Section } from "@/components/layout/section";
import { ClientLogos } from "@/components/home/client-logos";
import { ProofCards } from "@/components/home/proof-cards";
import { CaseStudyTeasers } from "@/components/home/case-study-teasers";
import { TrackedCta } from "@/components/home/tracked-cta";
import { ScrollTracker } from "@/components/home/scroll-tracker";

/* ---------- Inline SVG icons for value props ---------- */

function ClockIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className="mx-auto mb-4"
    >
      <circle cx="24" cy="24" r="20" stroke="#0babe8" strokeWidth="2.5" />
      <path d="M24 14v11l8 5" stroke="#0babe8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className="mx-auto mb-4"
    >
      <circle cx="24" cy="24" r="20" stroke="#0babe8" strokeWidth="2.5" />
      <ellipse cx="24" cy="24" rx="10" ry="20" stroke="#0babe8" strokeWidth="2.5" />
      <path d="M4 24h40" stroke="#0babe8" strokeWidth="2.5" />
      <path d="M8 14h32" stroke="#0babe8" strokeWidth="1.5" />
      <path d="M8 34h32" stroke="#0babe8" strokeWidth="1.5" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className="mx-auto mb-4"
    >
      <path
        d="M24 4l5.5 13.5L44 19l-11 9.5L36 42l-12-7.5L12 42l3-13.5L4 19l14.5-1.5L24 4z"
        stroke="#0babe8"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ---------- Page ---------- */

export default function HomePage() {
  return (
    <div className="relative">
      {/* Scroll depth tracking sentinels */}
      <ScrollTracker />

      {/* ── Section 1: Hero ── */}
      <section
        aria-label="Hero"
        className="flex min-h-dvh flex-col justify-center bg-brand-black pt-[72px]"
      >
        <div className="mx-auto max-w-screen-xl px-5 md:px-8">
          <div className="max-w-3xl">
            <p className="mb-6 text-sm font-normal uppercase tracking-wider text-brand-cerulean">
              The always-on enterprise creative partner
            </p>
            <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight text-brand-white lg:text-6xl">
              Enterprise-quality creative.
              <br />
              Delivered in 24 hours.
            </h1>
            <p className="mb-8 text-xl text-neutral-400">
              TikTok, Sony, Adidas trust us with theirs.
            </p>
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <TrackedCta
                href="/contact"
                variant="primary"
                trackingLocation="hero"
                trackingLabel="start_a_project"
              >
                Start a project
              </TrackedCta>
              <TrackedCta
                href="/work"
                variant="secondary"
                trackingLocation="hero"
                trackingLabel="see_our_work"
              >
                See our work
              </TrackedCta>
            </div>
            <p className="mt-4 text-sm text-neutral-500">
              First project satisfaction or no invoice.
            </p>
          </div>
        </div>

        {/* ── Section 2: Client Logo Strip (inside hero for above-fold) ── */}
        <div className="mx-auto mt-16 w-full max-w-screen-xl px-5 md:px-8">
          <ClientLogos />
        </div>
      </section>

      {/* ── Section 3: Proof Points ── */}
      <Section ariaLabel="Proof points">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-brand-white md:text-4xl">
            Real results. Real clients. Real prices.
          </h2>
        </div>
        <ProofCards />
      </Section>

      {/* ── Section 4: Value Proposition ── */}
      <Section ariaLabel="Value proposition" className="bg-surface-elevated">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-brand-white md:text-4xl">
            Unlimited revisions. Fixed prices. Zero surprises.
          </h2>
        </div>
        <div className="grid gap-10 text-center md:grid-cols-3">
          <div>
            <ClockIcon />
            <p className="text-2xl font-bold text-brand-white">D+1 delivery standard</p>
            <p className="mt-2 text-sm text-neutral-500">
              Brief today, assets tomorrow. Every time.
            </p>
          </div>
          <div>
            <GlobeIcon />
            <p className="text-2xl font-bold text-brand-white">
              35 experts, 5 continents
            </p>
            <p className="mt-2 text-sm text-neutral-500">
              18 languages, 24/7 coverage across every time zone.
            </p>
          </div>
          <div>
            <StarIcon />
            <p className="text-2xl font-bold text-brand-white">60% savings vs agencies</p>
            <p className="mt-2 text-sm text-neutral-500">
              Enterprise quality without enterprise overhead.
            </p>
          </div>
        </div>
      </Section>

      {/* ── Section 5: Case Study Teasers ── */}
      <Section ariaLabel="Case studies">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-brand-white md:text-4xl">
            See how we deliver
          </h2>
        </div>
        <CaseStudyTeasers />
      </Section>

      {/* ── Section 6: Footer CTA ── */}
      <Section ariaLabel="Get started" className="bg-surface-elevated">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-8 text-3xl font-bold text-brand-white md:text-4xl">
            The creative agency enterprises call when every other agency says two weeks.
          </h2>
          <TrackedCta
            href="/contact"
            variant="primary"
            trackingLocation="footer_cta"
            trackingLabel="start_a_project"
          >
            Start a project
          </TrackedCta>
          <p className="mt-4 text-sm text-neutral-500">
            First project satisfaction or no invoice.
          </p>
        </div>
      </Section>
    </div>
  );
}
