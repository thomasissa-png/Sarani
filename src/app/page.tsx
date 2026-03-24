import { Section } from "@/components/layout/section";
import { ClientLogos } from "@/components/home/client-logos";
import { ProjectSlider } from "@/components/home/project-slider";
import { Testimonials } from "@/components/home/testimonials";
import { Faq } from "@/components/home/faq";
import { TrackedCta } from "@/components/home/tracked-cta";
import { ScrollTracker } from "@/components/home/scroll-tracker";
import { Submark } from "@/components/ui/logo";
import Link from "next/link";

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
  { label: "branding", href: "/work?category=branding" },
  { label: "graphic design", href: "/work?category=graphic-design" },
  { label: "marketing assets", href: "/work?category=marketing-assets" },
  { label: "presentations", href: "/work?category=presentations" },
  { label: "photos", href: "/work?category=photos" },
  { label: "social media", href: "/work?category=social-media" },
  { label: "videos", href: "/work?category=videos" },
  { label: "web design", href: "/work?category=web-design" },
] as const;

function ServicesList() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-2">
      {SERVICES.map((service, i) => (
        <span key={service.label} className="flex items-center gap-2">
          <Link
            href={service.href}
            className="text-lg font-bold text-brand-black transition-colors hover:text-brand-flame md:text-xl"
          >
            {service.label}
          </Link>
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
  { value: "5", label: "Continents covered", sublabel: "" },
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

      {/* ── Section 1: Hero ── */}
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
        </div>

        {/* Auto-scrolling project images slider */}
        <div className="mt-12 w-full overflow-hidden">
          <ProjectSlider />
        </div>
      </section>

      {/* ── Section 2: We are Sarani ── */}
      <Section ariaLabel="We are Sarani">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-6 text-4xl font-bold text-brand-black md:text-5xl">
            We are Sarani.
          </h2>
          <p className="text-lg leading-relaxed text-neutral-700">
            We envision a world where every dream could take form, every brand could tell its
            story, and every entrepreneur could paint their vision all without the traditional
            barriers of high costs, slow turnaround times, and rigid processes.
          </p>
        </div>
      </Section>

      {/* ── Section 3: What we do ── */}
      <Section ariaLabel="What we do" className="bg-surface-warm">
        <div className="text-center">
          <h2 className="mb-8 text-4xl font-bold text-brand-black md:text-5xl">
            What we do
          </h2>
          <ServicesList />
        </div>
      </Section>

      {/* ── Section 4: Our metrics — Dark bg ── */}
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

      {/* ── Section 5: Are you ready? — Mid-page CTA ── */}
      <Section ariaLabel="Are you ready">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-8 text-4xl font-bold text-brand-black md:text-5xl">
            Are you ready?
          </h2>
          <TrackedCta
            href="/contact"
            variant="primary"
            trackingLocation="mid_cta"
            trackingLabel="yes_lets_talk"
          >
            Yes, let&apos;s talk!
          </TrackedCta>
        </div>
      </Section>

      {/* ── Section 6: Our recent work ── */}
      <Section ariaLabel="Our recent work" className="bg-surface-elevated">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-3xl font-bold text-brand-black md:text-4xl">
            Our recent work
          </h2>
          <Link
            href="/work"
            className="text-sm font-bold text-brand-flame transition-colors hover:text-brand-flame-light"
          >
            view all works &rarr;
          </Link>
        </div>
        <ProjectSlider />
      </Section>

      {/* ── Section 7: Testimonials — "With happiness comes trust" ── */}
      <Section ariaLabel="Testimonials">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-brand-black md:text-4xl">
            With happiness comes trust
          </h2>
        </div>
        <Testimonials />
        {/* Client logos strip */}
        <div className="mt-12">
          <ClientLogos />
        </div>
      </Section>

      {/* ── Section 8: FAQ ── */}
      <Section ariaLabel="FAQ" className="bg-surface-warm">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-12 text-center text-3xl font-bold text-brand-black md:text-4xl">
            Frequently asked questions
          </h2>
          <Faq />
        </div>
      </Section>

      {/* ── Section 9: Final CTA — Dark bg ── */}
      <section
        aria-label="Get started"
        className="relative w-full bg-brand-black py-16 md:py-24"
      >
        <div className="mx-auto max-w-3xl px-5 text-center md:px-8">
          <h2 className="mb-4 text-3xl font-bold text-brand-white md:text-4xl">
            Ready to see transformative results?
          </h2>
          <TrackedCta
            href="/contact"
            variant="primary"
            trackingLocation="footer_cta"
            trackingLabel="lets_chat"
          >
            Let&apos;s chat
          </TrackedCta>
          <p className="mt-6 text-sm text-neutral-400">
            If you&apos;re not happy with our work, we&apos;ll refine it until it meets your standards.
          </p>
          <Submark size={12} className="mx-auto mt-6 justify-center" />
        </div>
      </section>
    </div>
  );
}
