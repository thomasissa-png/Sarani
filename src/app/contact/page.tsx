import type { Metadata } from "next";
import { Section } from "@/components/layout/section";
import { ContactForm } from "@/components/forms/contact-form";
import { BreadcrumbSchema } from "@/components/seo/breadcrumb-schema";
import { BREADCRUMBS } from "@/lib/breadcrumb-jsonld";

export const metadata: Metadata = {
  title: "Start a Project — Sarani Creative Agency",
  description:
    "Send your brief. Get a response within hours. Sarani's team works 24/7 across 5 continents \u2014 your project starts the moment you reach out.",
  alternates: {
    canonical: "https://sarani.studio/contact",
  },
};

export default function ContactPage() {
  return (
    <div className="pt-[var(--header-height)]">
      <BreadcrumbSchema items={BREADCRUMBS.contact} />
      <Section ariaLabel="Contact form">
        <div className="mx-auto max-w-screen-xl">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_420px] lg:gap-16">
            {/* Left column — Form */}
            <div className="max-w-[640px]">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand-flame mb-4">
                Start a Project
              </p>
              <h1 className="mb-4 text-4xl font-bold leading-tight tracking-tight text-brand-black sm:text-5xl lg:text-6xl">
                Start a project.
              </h1>
              <p className="mb-10 text-lg leading-relaxed text-neutral-600">
                Tell us what you need. We&apos;ll get back to you within the
                hour.
              </p>

              {/* Mobile-only micro-reassurance — visible above the form */}
              <p className="mb-6 rounded-lg bg-surface-elevated px-4 py-3 text-sm text-neutral-600 lg:hidden">
                Response within 1 hour. Unlimited revisions. Risk-free first project.
              </p>

              <ContactForm />
            </div>

            {/* Right column — Reassurance & alternative contact */}
            <aside
              aria-label="Why work with us"
              className="flex flex-col gap-8 lg:pt-28"
            >
              {/* Reassurance points */}
              <div className="space-y-6">
                <ReassuranceItem
                  title="Risk-free first project"
                  description="Not satisfied? No invoice. We earn trust through work, not contracts."
                />
                <ReassuranceItem
                  title="Response within 1 hour"
                  description="Our team works 24/7 across 5 continents. Your brief never waits for a timezone to wake up."
                />
                <ReassuranceItem
                  title="Unlimited revisions"
                  description="We iterate until you are 100% satisfied. No extra charge, no limit."
                />
                <ReassuranceItem
                  title="Fixed prices, no surprises"
                  description="Every price is published on our website. No hidden fees, no scope-change invoices."
                />
              </div>

              {/* Alternative contact methods */}
              <div className="rounded-xl border border-neutral-200 bg-surface-elevated p-6">
                <p className="mb-3 text-sm font-bold uppercase tracking-wider text-neutral-500">
                  Prefer to reach us directly?
                </p>
                <div className="space-y-3">
                  <a
                    href="mailto:team@sarani.studio"
                    className="flex items-center gap-3 text-brand-cerulean-dark transition-colors hover:text-brand-cerulean"
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <rect width="20" height="16" x="2" y="4" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                    <span className="font-medium underline underline-offset-4">
                      team@sarani.studio
                    </span>
                  </a>
                  <a
                    href="https://www.linkedin.com/company/sarani-studio"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-brand-cerulean-dark transition-colors hover:text-brand-cerulean"
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                      <rect width="4" height="12" x="2" y="9" />
                      <circle cx="4" cy="4" r="2" />
                    </svg>
                    <span className="font-medium underline underline-offset-4">
                      LinkedIn
                    </span>
                  </a>
                </div>
              </div>

              {/* Trust signal */}
              <p className="text-sm text-neutral-500">
                Trusted by TikTok, Sony, Adidas, GEODIS, Pernod Ricard, and
                more.
              </p>
            </aside>
          </div>
        </div>
      </Section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Reassurance Item                                                    */
/* ------------------------------------------------------------------ */

function ReassuranceItem({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3">
      <svg
        className="mt-0.5 h-5 w-5 shrink-0 text-brand-cerulean-dark"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M20 6 9 17l-5-5" />
      </svg>
      <div>
        <p className="font-bold text-brand-black">{title}</p>
        <p className="mt-1 text-sm leading-relaxed text-neutral-600">
          {description}
        </p>
      </div>
    </div>
  );
}
