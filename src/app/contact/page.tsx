import type { Metadata } from "next";
import { Section } from "@/components/layout/section";
import { ContactForm } from "@/components/forms/contact-form";

export const metadata: Metadata = {
  title: "Contact Sarani \u2014 Brief Us Today",
  description:
    "Send your brief. Get a response within hours. Sarani's team works 24/7 across 5 continents \u2014 your project starts the moment you reach out.",
};

export default function ContactPage() {
  return (
    <div className="pt-[72px]">
      <Section ariaLabel="Contact form">
        <div className="mx-auto max-w-[640px]">
          <h1 className="mb-4 text-4xl font-bold text-brand-white sm:text-5xl">
            Start a project.
          </h1>
          <p className="mb-10 text-lg text-neutral-400">
            Tell us what you need. We'll get back to you within the hour.
          </p>

          <ContactForm />

          <p className="mt-10 text-sm text-neutral-500">
            Prefer email?{" "}
            <a
              href="mailto:team@sarani.studio"
              className="text-brand-cerulean underline underline-offset-4 hover:text-brand-cerulean-light transition-colors"
            >
              team@sarani.studio
            </a>
          </p>
        </div>
      </Section>
    </div>
  );
}
