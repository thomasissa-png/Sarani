import type { Metadata } from "next";
import { Section } from "@/components/layout/section";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "About Sarani — 35 Experts, 5 Continents, Since 2020",
  description:
    "Built in 2020 to do what traditional agencies can't: deliver enterprise-grade creative work in 24 hours, at fixed prices, with unlimited revisions.",
};

export default function AboutPage() {
  return (
    <div className="pt-[72px]">
      <Section ariaLabel="About Sarani">
        <h1 className="mb-6 text-4xl font-bold text-brand-white sm:text-5xl">
          About
        </h1>
        <p className="mb-8 max-w-2xl text-lg text-neutral-400">
          35 experts. 5 continents. 18 languages. 24/7. Built in 2020 to do what traditional
          agencies can&apos;t.
        </p>
        {/* [PROVISOIRE — About page content will be implemented in Sprint 2 using docs/copy/brand-story-content.md] */}
        <Button variant="primary" href="/contact">
          Start a project
        </Button>
      </Section>
    </div>
  );
}
