import type { Metadata } from "next";
import { Section } from "@/components/layout/section";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Sarani Pricing — Fixed Rates, No Subscription",
  description:
    "Transparent fixed pricing for enterprise creative work. Banners from 155\u20AC. Full rebrand from 5,000\u20AC. No monthly retainer. No surprise invoices.",
};

export default function PricingPage() {
  return (
    <div className="pt-[72px]">
      <Section ariaLabel="Pricing">
        <h1 className="mb-6 text-4xl font-bold text-brand-white sm:text-5xl">
          Pricing
        </h1>
        <p className="mb-8 max-w-2xl text-lg text-neutral-400">
          Published pricing. No retainer. Up to 60% savings vs traditional agencies.
        </p>
        {/* [PROVISOIRE — Pricing tables and comparison will be implemented in Sprint 2] */}
        <Button variant="primary" href="/contact">
          Start a project
        </Button>
      </Section>
    </div>
  );
}
