import type { Metadata } from "next";
import { Section } from "@/components/layout/section";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Case Studies — Sarani Enterprise Creative Work",
  description:
    "TikTok, Sony, GEODIS, Adidas, L'Oreal. Real briefs. Real deadlines. See how Sarani delivers 24-hour creative production for global enterprises.",
};

export default function WorkPage() {
  return (
    <div className="pt-[72px]">
      <Section ariaLabel="Case studies">
        <h1 className="mb-6 text-4xl font-bold text-brand-white sm:text-5xl">
          Case Studies
        </h1>
        <p className="mb-8 max-w-2xl text-lg text-neutral-400">
          TikTok, Sony, GEODIS, Adidas, L&apos;Or&eacute;al. Real briefs. Real deadlines. Real
          results.
        </p>
        {/* [PROVISOIRE — Case study cards will be implemented in Sprint 2] */}
        <Button variant="primary" href="/contact">
          Start a project
        </Button>
      </Section>
    </div>
  );
}
