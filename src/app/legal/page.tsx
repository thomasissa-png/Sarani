import type { Metadata } from "next";
import { Section } from "@/components/layout/section";

export const metadata: Metadata = {
  title: "Legal & Privacy — Sarani",
  description:
    "Legal information, privacy policy, and GDPR compliance for Sarani Studio. SARANI SAS, SIREN 881687503.",
};

const TOC_ITEMS = [
  { id: "company-information", label: "Company Information" },
  { id: "privacy-policy", label: "Privacy Policy" },
  { id: "data-processing", label: "Data Processing" },
  { id: "your-rights", label: "Your Rights" },
  { id: "framework-agreements", label: "Framework Agreements & DPA" },
  { id: "analytics", label: "Analytics" },
] as const;

export default function LegalPage() {
  return (
    <div className="pt-[var(--header-height)]">
      <Section ariaLabel="Legal and privacy">
        <div className="max-w-3xl">
          <h1 className="mb-4 text-4xl font-bold leading-tight tracking-tight text-brand-black sm:text-5xl lg:text-6xl">
            Legal &amp; Privacy
          </h1>
          <p className="mb-10 text-sm text-neutral-500">
            Last updated: March 2026
          </p>

          {/* Table of Contents */}
          <nav
            aria-label="Table of contents"
            className="mb-12 rounded-xl border border-neutral-200 bg-surface-elevated p-6"
          >
            <p className="mb-3 text-sm font-bold uppercase tracking-wider text-neutral-500">
              Contents
            </p>
            <ol className="list-inside list-decimal space-y-2 text-neutral-600">
              {TOC_ITEMS.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className="underline underline-offset-4 transition-colors hover:text-brand-cerulean-dark"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          {/* Section 1: Company Information */}
          <section id="company-information" className="mb-12 scroll-mt-[calc(var(--header-height)+2rem)]">
            <h2 className="mb-4 text-2xl font-bold text-brand-black">
              Company Information
            </h2>
            <p className="leading-relaxed text-neutral-600">
              SARANI SAS (Soci&eacute;t&eacute; par Actions Simplifi&eacute;e)
              <br />
              SIREN: 881 687 503
              <br />
              SIRET: 881 687 503 00022
              <br />
              VAT: FR76881687503
              <br />
              Registered address: 4 rue des Artisans, 25300 Ar&ccedil;on, France
              <br />
              Founded: February 18, 2020
              <br />
              Share capital: 1,500&euro;
              <br />
              Contact:{" "}
              <a
                href="mailto:team@sarani.studio"
                className="underline underline-offset-4 transition-colors hover:text-brand-black"
              >
                team@sarani.studio
              </a>
            </p>
            <h3 className="mb-2 mt-6 text-xl font-bold text-brand-black">
              Hosting Provider
            </h3>
            <p className="leading-relaxed text-neutral-600">
              Replit, Inc. — 350 Townsend St, San Francisco, CA 94107, USA
            </p>
          </section>

          {/* Section 2: Privacy Policy */}
          <section id="privacy-policy" className="mb-12 scroll-mt-[calc(var(--header-height)+2rem)]">
            <h2 className="mb-4 text-2xl font-bold text-brand-black">
              Privacy Policy
            </h2>

            <h3 className="mb-2 mt-6 text-xl font-bold text-brand-black">
              What we collect
            </h3>
            <p className="leading-relaxed text-neutral-600">
              When you submit the contact form, we collect: your name, company
              name, email address, company size category, how you heard about
              us, and your project description. We also collect optional file
              attachments you choose to share.
            </p>

            <h3 className="mb-2 mt-6 text-xl font-bold text-brand-black">
              Why we collect it
            </h3>
            <p className="leading-relaxed text-neutral-600">
              Legal basis: Legitimate interest (GDPR Article 6(1)(f)). We
              process this data to respond to your business inquiry and to
              evaluate whether Sarani can serve your creative needs.
            </p>

            <h3 className="mb-2 mt-6 text-xl font-bold text-brand-black">
              How long we keep it
            </h3>
            <p className="leading-relaxed text-neutral-600">
              Contact form submissions are retained for 3 years from your last
              interaction with Sarani. After this period, your data is
              permanently deleted.
            </p>

            <h3 className="mb-2 mt-6 text-xl font-bold text-brand-black">
              Who receives your data
            </h3>
            <p className="leading-relaxed text-neutral-600">
              Your submission is sent to the Sarani team (
              <a
                href="mailto:team@sarani.studio"
                className="underline underline-offset-4 transition-colors hover:text-brand-black"
              >
                team@sarani.studio
              </a>
              ) for processing. We do not sell, rent, or share your personal
              data with third parties for marketing purposes.
            </p>
          </section>

          {/* Section 3: Data Processing */}
          <section id="data-processing" className="mb-12 scroll-mt-[calc(var(--header-height)+2rem)]">
            <h2 className="mb-4 text-2xl font-bold text-brand-black">
              Data Processing
            </h2>

            <h3 className="mb-2 mt-6 text-xl font-bold text-brand-black">
              International transfers
            </h3>
            <p className="leading-relaxed text-neutral-600">
              Sarani&apos;s team operates across 5 continents. Your contact form
              data is processed on servers hosted by Replit (United States).
              This transfer is covered by Standard Contractual Clauses (SCCs) as
              approved by the European Commission.
            </p>

            <h3 className="mb-2 mt-6 text-xl font-bold text-brand-black">
              Sub-processors
            </h3>
            <ul className="list-inside list-disc space-y-1 text-neutral-600">
              <li>Replit, Inc. (hosting) — United States</li>
              <li>Email service provider — to be confirmed</li>
            </ul>
          </section>

          {/* Section 4: Your Rights */}
          <section id="your-rights" className="mb-12 scroll-mt-[calc(var(--header-height)+2rem)]">
            <h2 className="mb-4 text-2xl font-bold text-brand-black">
              Your Rights (GDPR Articles 15-22)
            </h2>
            <p className="mb-4 leading-relaxed text-neutral-600">
              Under GDPR, you have the right to:
            </p>
            <ul className="mb-4 list-inside list-disc space-y-1 text-neutral-600">
              <li>Access your personal data</li>
              <li>Rectify inaccurate data</li>
              <li>Request erasure (&ldquo;right to be forgotten&rdquo;)</li>
              <li>Restrict processing</li>
              <li>Data portability</li>
              <li>Object to processing</li>
            </ul>
            <p className="mb-4 leading-relaxed text-neutral-600">
              To exercise any of these rights, contact:{" "}
              <a
                href="mailto:team@sarani.studio"
                className="underline underline-offset-4 transition-colors hover:text-brand-black"
              >
                team@sarani.studio
              </a>
              . We will respond within 30 days.
            </p>
            <p className="leading-relaxed text-neutral-600">
              You also have the right to lodge a complaint with the CNIL
              (Commission Nationale de l&apos;Informatique et des
              Libert&eacute;s):{" "}
              <a
                href="https://www.cnil.fr"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4 transition-colors hover:text-brand-black"
              >
                www.cnil.fr
              </a>
            </p>
          </section>

          {/* Section 5: Framework Agreements & DPA */}
          <section id="framework-agreements" className="mb-12 scroll-mt-[calc(var(--header-height)+2rem)]">
            <h2 className="mb-4 text-2xl font-bold text-brand-black">
              Framework Agreements &amp; DPA
            </h2>
            <p className="leading-relaxed text-neutral-600">
              Enterprise accounts: framework agreements and Data Processing
              Agreements (DPAs) are available on request. Contact:{" "}
              <a
                href="mailto:team@sarani.studio"
                className="underline underline-offset-4 transition-colors hover:text-brand-black"
              >
                team@sarani.studio
              </a>
            </p>
          </section>

          {/* Section 6: Analytics */}
          <section id="analytics" className="mb-12 scroll-mt-[calc(var(--header-height)+2rem)]">
            <h2 className="mb-4 text-2xl font-bold text-brand-black">
              Analytics
            </h2>
            <p className="leading-relaxed text-neutral-600">
              This website uses Umami Analytics, a privacy-first analytics tool.
              Umami does not use cookies, does not collect personal data, and
              does not track users across websites. No consent is required for
              this type of analytics under CNIL guidelines.
            </p>
          </section>
        </div>
      </Section>
    </div>
  );
}
