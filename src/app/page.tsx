import { Section } from "@/components/layout/section";
import { ClientLogos } from "@/components/home/client-logos";
import { ProofCards } from "@/components/home/proof-cards";
import { CaseStudyTeasers } from "@/components/home/case-study-teasers";
import { TrackedCta } from "@/components/home/tracked-cta";
import { ScrollTracker } from "@/components/home/scroll-tracker";
import { Submark } from "@/components/ui/logo";

/* ---------- Decorative dots for hero ---------- */

function HeroDots() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <span className="absolute top-[18%] left-[42%] h-3 w-3 rounded-full bg-brand-lemon" />
      <span className="absolute top-[15%] right-[38%] h-2.5 w-2.5 rounded-full bg-brand-cerulean" />
      <span className="absolute top-[55%] left-[48%] h-2 w-2 rounded-full bg-brand-flame" />
      <span className="absolute top-[52%] right-[32%] h-2.5 w-2.5 rounded-full bg-brand-lemon" />
      <span className="absolute top-[30%] left-[25%] h-1.5 w-1.5 rounded-full bg-brand-flame" />
      <span className="absolute top-[40%] right-[22%] h-1.5 w-1.5 rounded-full bg-brand-cerulean" />
    </div>
  );
}

/* ---------- Services list with dot separators ---------- */

const SERVICES = [
  "branding",
  "graphic design",
  "marketing assets",
  "presentations",
  "photos",
  "social media",
  "videos",
  "web design",
] as const;

function ServicesList() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-2">
      {SERVICES.map((service, i) => (
        <span key={service} className="flex items-center gap-2">
          <span className="text-lg font-bold text-brand-black md:text-xl">
            {service}
          </span>
          {i < SERVICES.length - 1 && (
            <span className="inline-block h-2 w-2 rounded-full bg-brand-flame" aria-hidden="true" />
          )}
        </span>
      ))}
    </div>
  );
}

/* ---------- Metrics section ---------- */

const METRICS = [
  { value: "<24h", label: "Target timeframe", sublabel: "from brief to delivery*" },
  { value: "\u221E", label: "Unlimited revisions,", sublabel: "no additional cost*" },
  { value: "100%", label: "Fixed prices only", sublabel: "" },
  { value: "6", label: "Continents covered", sublabel: "" },
] as const;

/* ---------- Value props row for hero ---------- */

const VALUE_PROPS = [
  "24/7 availability",
  "D+1 deliveries",
  "Fixed prices",
  "Unlimited revisions",
] as const;

/* ---------- Page ---------- */

export default function HomePage() {
  return (
    <div className="relative">
      {/* Scroll depth tracking sentinels */}
      <ScrollTracker />

      {/* ── Section 1: Hero — White bg, massive typography ── */}
      <section
        aria-label="Hero"
        className="relative flex min-h-dvh flex-col items-center justify-center bg-brand-white pt-[72px]"
      >
        <HeroDots />
        <div className="relative z-10 mx-auto max-w-screen-xl px-5 text-center md:px-8">
          <h1 className="mb-10 text-6xl font-bold leading-[1.05] tracking-tight text-brand-black sm:text-7xl lg:text-8xl xl:text-[7rem]">
            Unlimited
            <br />
            Creativity
          </h1>

          {/* 4 value props row */}
          <div className="mb-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 md:gap-x-12">
            {VALUE_PROPS.map((prop) => (
              <p key={prop} className="text-base font-bold text-brand-black md:text-lg">
                {prop}
              </p>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <TrackedCta
              href="/contact"
              variant="primary"
              trackingLocation="hero"
              trackingLabel="lets_chat"
            >
              Let&apos;s chat
            </TrackedCta>
            <TrackedCta
              href="/pricing"
              variant="secondary"
              trackingLocation="hero"
              trackingLabel="discover_prices"
            >
              Discover our prices
            </TrackedCta>
          </div>

          <p className="mt-6 text-sm text-neutral-500">
            First project satisfaction or no invoice.
          </p>
        </div>

        {/* Client logos — inside hero for above-fold */}
        <div className="mx-auto mt-12 w-full max-w-screen-xl px-5 md:px-8">
          <ClientLogos />
        </div>
      </section>

      {/* ── Section 2: What we do — White bg ── */}
      <Section ariaLabel="What we do">
        <div className="text-center">
          <h2 className="mb-8 text-4xl font-bold text-brand-black md:text-5xl">
            What we do
          </h2>
          <ServicesList />
        </div>
      </Section>

      {/* ── Section 3: Our metrics — Black bg like V2 ── */}
      <section
        aria-label="Our metrics"
        className="w-full bg-brand-black py-16 md:py-24"
      >
        <div className="mx-auto max-w-screen-xl px-5 md:px-8">
          <h2 className="mb-12 text-center text-4xl font-bold text-brand-white md:text-5xl">
            Our metrics
          </h2>
          <div className="grid grid-cols-2 gap-8 text-center md:grid-cols-4">
            {METRICS.map((metric) => (
              <div key={metric.value}>
                <p className="text-5xl font-bold text-brand-white md:text-6xl">
                  {metric.value}
                </p>
                <p className="mt-3 text-sm text-neutral-400">
                  {metric.label}
                </p>
                {metric.sublabel && (
                  <p className="text-sm text-neutral-400">{metric.sublabel}</p>
                )}
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-xs text-neutral-500">
            *Graphic design. Other work target from 48h to 96 hours based on brief.
            <br />
            *Because we have trust in our work!
          </p>
        </div>
      </section>

      {/* ── Section 4: Proof Points — White bg ── */}
      <Section ariaLabel="Proof points">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-brand-black md:text-4xl">
            Real results. Real clients. Real prices.
          </h2>
        </div>
        <ProofCards />
      </Section>

      {/* ── Section 5: Case Study Teasers ── */}
      <Section ariaLabel="Case studies" className="bg-surface-elevated">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-brand-black md:text-4xl">
            See how we deliver
          </h2>
        </div>
        <CaseStudyTeasers />
      </Section>

      {/* ── Section 6: Footer CTA — Black bg ── */}
      <section
        aria-label="Get started"
        className="w-full bg-brand-black py-16 md:py-24"
      >
        <div className="mx-auto max-w-3xl px-5 text-center md:px-8">
          <Submark size={12} className="mx-auto mb-6 justify-center" />
          <h2 className="mb-8 text-3xl font-bold text-brand-white md:text-4xl">
            The creative agency enterprises call when every other agency says two weeks.
          </h2>
          <TrackedCta
            href="/contact"
            variant="primary"
            trackingLocation="footer_cta"
            trackingLabel="lets_chat"
          >
            Let&apos;s chat
          </TrackedCta>
          <p className="mt-4 text-sm text-neutral-400">
            First project satisfaction or no invoice.
          </p>
        </div>
      </section>
    </div>
  );
}
