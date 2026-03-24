import type { Metadata } from "next";
import { Section } from "@/components/layout/section";

export const metadata: Metadata = {
  title: "Contact Sarani — Brief Us Today",
  description:
    "Send your brief. Get a response within hours. Sarani's team works 24/7 across 5 continents — your project starts the moment you reach out.",
};

export default function ContactPage() {
  return (
    <div className="pt-[72px]">
      <Section ariaLabel="Contact form">
        <div className="mx-auto max-w-[640px]">
          <h1 className="mb-4 text-4xl font-bold text-brand-white sm:text-5xl">
            Start your first project
          </h1>
          <p className="mb-10 text-lg text-white/70">
            Not satisfied? No invoice.
          </p>
          {/* [PROVISOIRE — Full contact form (US-103 CRITICAL) will be implemented in Sprint 1b] */}
          <div className="rounded-lg border border-neutral-700 bg-surface-elevated p-8">
            <p className="text-neutral-500">
              Contact form coming in Sprint 1b — US-103 critical path component.
            </p>
          </div>
        </div>
      </Section>
    </div>
  );
}
