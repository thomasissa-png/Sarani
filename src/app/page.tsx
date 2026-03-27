import { Section } from "@/components/layout/section";
import { ClientLogos } from "@/components/home/client-logos";
import { ProjectSlider } from "@/components/home/project-slider";
import { Testimonials } from "@/components/home/testimonials";
import { Faq } from "@/components/home/faq";
import { TrackedCta } from "@/components/home/tracked-cta";
import { ScrollTracker } from "@/components/home/scroll-tracker";
import { ProofCards } from "@/components/home/proof-cards";
import {
  FadeInUp,
  StaggerChildren,
  StaggerItem,
  AnimatedSection,
} from "@/components/ui/animated";
import { AnimatedHeroDots, AnimatedHeroContent } from "@/components/home/animated-hero";
import { AnimatedMetrics } from "@/components/home/animated-metrics";
import { AnimatedServicesList } from "@/components/home/animated-services";
import { AnimatedFooterCta } from "@/components/home/animated-footer-cta";
import Link from "next/link";

/* ---------- Page ---------- */

export default function HomePage() {
  return (
    <div className="relative">
      {/* Scroll depth tracking sentinels */}
      <ScrollTracker />

      {/* -- Section 1: Hero -- */}
      <section
        aria-label="Hero"
        className="relative flex min-h-dvh flex-col items-center justify-center bg-brand-white pt-[var(--header-height)]"
      >
        <AnimatedHeroDots />
        <AnimatedHeroContent />

        {/* Client logos — trust strip above the fold */}
        <div className="w-full max-w-screen-xl mx-auto px-5 md:px-8">
          <ClientLogos />
        </div>

        {/* Auto-scrolling project images slider */}
        <div className="mt-4 w-full overflow-hidden">
          <ProjectSlider />
        </div>
      </section>

      {/* -- Section 2: Our metrics -- Dark bg -- */}
      <section
        aria-label="Our metrics"
        className="w-full bg-brand-black py-16 md:py-24"
      >
        <div className="mx-auto max-w-screen-xl px-5 md:px-8">
          <FadeInUp>
            <h2 className="mb-12 text-center text-3xl font-bold text-brand-white sm:text-4xl">
              Our metrics
            </h2>
          </FadeInUp>
          <AnimatedMetrics />
          <FadeInUp delay={0.8}>
            <p className="mt-8 text-center text-xs text-neutral-500">
              *D+1 is our standard for graphic design. For larger scopes, delivery is confirmed at brief — typically 48 to 96 hours.
            </p>
          </FadeInUp>
        </div>
      </section>

      {/* -- Section 3: What we do -- */}
      <Section ariaLabel="What we do" className="bg-surface-warm">
        <div className="text-center">
          <FadeInUp>
            <h2 className="mb-8 text-3xl font-bold text-brand-black sm:text-4xl">
              8 disciplines, one team, no waiting.
            </h2>
          </FadeInUp>
          <AnimatedServicesList />
        </div>
      </Section>

      {/* -- Section 4: Real results — Proof cards -- */}
      <Section ariaLabel="Real results">
        <FadeInUp>
          <h2 className="mb-10 text-center text-3xl font-bold text-brand-black sm:text-4xl">
            Real results
          </h2>
        </FadeInUp>
        <ProofCards />
      </Section>

      {/* -- Section 5: Our recent work -- */}
      <Section ariaLabel="Our recent work" className="bg-surface-elevated">
        <FadeInUp>
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-3xl font-bold text-brand-black sm:text-4xl">
              Our recent work
            </h2>
            <Link
              href="/work"
              className="text-sm font-medium text-brand-flame transition-colors hover:text-brand-flame-light"
            >
              view all works &rarr;
            </Link>
          </div>
        </FadeInUp>
        <ProjectSlider />
      </Section>

      {/* -- Section 6: Mid-page CTA -- */}
      <Section ariaLabel="Start a project">
        <AnimatedSection className="mx-auto max-w-3xl text-center">
          <FadeInUp>
            <h2 className="mb-8 text-3xl font-bold text-brand-black sm:text-4xl">
              One brief. 24 hours. Done.
            </h2>
          </FadeInUp>
          <FadeInUp delay={0.2}>
            <TrackedCta
              href="/contact"
              variant="primary"
              trackingLocation="mid_cta"
              trackingLabel="start_a_project"
            >
              Start a project
            </TrackedCta>
            <p className="mt-3 text-sm text-neutral-500">
              First project satisfaction or no invoice.
            </p>
          </FadeInUp>
        </AnimatedSection>
      </Section>

      {/* -- Section 7: Testimonials -- */}
      <Section ariaLabel="Testimonials" className="bg-surface-elevated">
        <FadeInUp>
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-brand-black sm:text-4xl">
              Trusted by global brands
            </h2>
          </div>
        </FadeInUp>
        <Testimonials />
      </Section>

      {/* -- Section 8: FAQ -- */}
      <Section ariaLabel="FAQ" className="bg-surface-warm">
        <div className="mx-auto max-w-3xl">
          <FadeInUp>
            <h2 className="mb-12 text-center text-3xl font-bold text-brand-black sm:text-4xl">
              Frequently asked questions
            </h2>
          </FadeInUp>
          <Faq />
        </div>
      </Section>

      {/* -- Section 9: Final CTA -- Dark bg -- */}
      <AnimatedFooterCta />
    </div>
  );
}
