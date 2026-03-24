import type { Metadata } from "next";
import { Section } from "@/components/layout/section";

export const metadata: Metadata = {
  title: "Legal Notice",
  description: "Legal information and privacy policy for Sarani Studio.",
};

export default function LegalPage() {
  return (
    <div className="pt-[72px]">
      <Section ariaLabel="Legal notice">
        <h1 className="mb-6 text-4xl font-bold text-brand-white sm:text-5xl">
          Legal Notice
        </h1>
        {/* [PROVISOIRE — Legal content (CGV, mentions legales, privacy policy) will be implemented using docs/legal/ livrables] */}
        <div className="prose prose-invert max-w-3xl">
          <h2 className="text-2xl font-bold text-brand-white">Company Information</h2>
          <p className="text-neutral-400">
            SARANI — SAS (Societe par Actions Simplifiee)<br />
            SIREN: 881 687 503<br />
            SIRET: 881 687 503 00022<br />
            VAT: FR76881687503<br />
            4 rue des Artisans, 25300 Arcon, France<br />
            Founded: February 18, 2020<br />
            Share capital: 1,500&euro;
          </p>
          <p className="text-neutral-500">
            Full legal terms, privacy policy, and GDPR compliance documentation will be published
            before go-live.
          </p>
        </div>
      </Section>
    </div>
  );
}
