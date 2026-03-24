"use client";

import { FadeInUp, PulseAnimation } from "@/components/ui/animated";
import { TrackedCta } from "@/components/home/tracked-cta";
import { Submark } from "@/components/ui/logo";

export function AnimatedFooterCta() {
  return (
    <section
      aria-label="Get started"
      className="relative w-full bg-brand-black py-16 md:py-24"
    >
      <div className="mx-auto max-w-3xl px-5 text-center md:px-8">
        <FadeInUp>
          <h2 className="mb-4 text-3xl font-bold text-brand-white md:text-4xl">
            Ready to see transformative results?
          </h2>
        </FadeInUp>
        <FadeInUp delay={0.15}>
          <TrackedCta
            href="/contact"
            variant="primary"
            trackingLocation="footer_cta"
            trackingLabel="lets_chat"
          >
            Let&apos;s chat
          </TrackedCta>
        </FadeInUp>
        <FadeInUp delay={0.25}>
          <p className="mt-6 text-sm text-neutral-400">
            If you&apos;re not happy with our work, we&apos;ll refine it until it meets your standards.
          </p>
        </FadeInUp>
        <FadeInUp delay={0.35}>
          <PulseAnimation className="mx-auto mt-6 w-fit">
            <Submark size={12} className="justify-center" />
          </PulseAnimation>
        </FadeInUp>
      </div>
    </section>
  );
}
