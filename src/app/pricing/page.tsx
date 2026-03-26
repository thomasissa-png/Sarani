import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Section } from "@/components/layout/section";
import { Button } from "@/components/ui/button";
import { ClientLogos } from "@/components/home/client-logos";

export const metadata: Metadata = {
  title: "Sarani Pricing — Fixed Rates, No Subscription",
  description:
    "Transparent fixed pricing for enterprise creative work. Banners from 150€. Full rebrand from 5,000€. No monthly retainer. No surprise invoices.",
};

/* ------------------------------------------------------------------ */
/*  Pricing Data                                                       */
/* ------------------------------------------------------------------ */

type PricingItem = {
  name: string;
  price: string;
  priceUsd?: string;
  note?: string;
};

type PricingCategory = {
  title: string;
  icon: React.ReactNode;
  accent: string;
  items: PricingItem[];
  note?: string;
};

/* ── Category Icons (inline SVG, 24x24) ── */

function IconPalette() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="13.5" cy="6.5" r="0.5" fill="currentColor" /><circle cx="17.5" cy="10.5" r="0.5" fill="currentColor" /><circle cx="8.5" cy="7.5" r="0.5" fill="currentColor" /><circle cx="6.5" cy="12.5" r="0.5" fill="currentColor" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2Z" />
    </svg>
  );
}

function IconVideo() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.934a.5.5 0 0 0-.777-.416L16 11" /><rect x="2" y="6" width="14" height="12" rx="2" />
    </svg>
  );
}

function IconPresentation() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 3h20" /><path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3" /><path d="m7 21 5-5 5 5" />
    </svg>
  );
}

function IconTrendingUp() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
    </svg>
  );
}

function IconLanguages() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 8 6 6" /><path d="m4 14 6-6 2-3" /><path d="M2 5h12" /><path d="M7 2h1" /><path d="m22 22-5-10-5 10" /><path d="M14 18h6" />
    </svg>
  );
}

function IconZap() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
    </svg>
  );
}

const PRICING_CATEGORIES: PricingCategory[] = [
  {
    title: "Content Creation",
    icon: <IconPalette />,
    accent: "border-t-brand-flame",
    items: [
      { name: "Static banner", price: "150\u00A0€", priceUsd: "$\u00A0170" },
      { name: "Banner adaptation", price: "35\u00A0€/size", priceUsd: "$\u00A040/size" },
      { name: "Full rebranding", price: "from 5,000\u00A0€", priceUsd: "from $\u00A05,500" },
      { name: "Infographic", price: "180\u00A0€ + 35\u00A0€/lang", priceUsd: "$\u00A0200 + $\u00A040/lang" },
      { name: "Newsletter", price: "450–600\u00A0€/edition", priceUsd: "$\u00A0500–660/edition" },
      { name: "Website", price: "5,000–8,000\u00A0€", priceUsd: "$\u00A05,500–8,800" },
    ],
  },
  {
    title: "Video Production",
    icon: <IconVideo />,
    accent: "border-t-brand-cerulean",
    items: [
      { name: "Basic video edit", price: "85\u00A0€", priceUsd: "$\u00A095" },
      { name: "Social media video (30s)", price: "360\u00A0€", priceUsd: "$\u00A0400" },
      { name: "Sizzle reel", price: "360–900\u00A0€", priceUsd: "$\u00A0400–1,000" },
      { name: "Video turnkey", price: "from 3,800\u00A0€", priceUsd: "from $\u00A04,200", note: "Contact us for production packages and complex productions." },
    ],
  },
  {
    title: "Presentations",
    icon: <IconPresentation />,
    accent: "border-t-brand-lemon",
    items: [
      { name: "Per slide", price: "30\u00A0€", priceUsd: "$\u00A035" },
      { name: "Full deck (reference)", price: "from 360\u00A0€", priceUsd: "from $\u00A0400" },
    ],
  },
  {
    title: "Copy & Translation",
    icon: <IconLanguages />,
    accent: "border-t-brand-cerulean",
    items: [
      { name: "Translation", price: "0.12\u00A0€/word", priceUsd: "$\u00A00.14/word", note: "e.g. 1,000-word document = 120\u00A0€ / $\u00A0140" },
      { name: "Copywriting", price: "0.25\u00A0€/word", priceUsd: "$\u00A00.28/word", note: "e.g. 500-word landing page = 125\u00A0€ / $\u00A0140" },
    ],
  },
  {
    title: "Operations & Marketing",
    icon: <IconTrendingUp />,
    accent: "border-t-brand-flame",
    items: [
      { name: "LinkedIn management", price: "1,800–2,500\u00A0€/month", priceUsd: "$\u00A02,000–2,750/month" },
      { name: "Paid ads fee", price: "8% of budget", note: "e.g. 10,000\u00A0€ budget = 800\u00A0€/month" },
      { name: "SEO", price: "custom quote" },
    ],
  },
  {
    title: "On-Demand / Retainer",
    icon: <IconZap />,
    accent: "border-t-brand-cerulean",
    items: [{ name: "Monthly pack", price: "custom quote" }],
    note: "Need regular volume? Ask us about retained partnerships.",
  },
];

type ProofPoint = {
  metric: string;
  detail: string;
  client: string;
};

const PROOF_POINTS: ProofPoint[] = [
  { metric: "150\u00A0€", detail: "per banner — delivered same day", client: "Sony Black Friday" },
  { metric: "8,500\u00A0€", detail: "for 350 presentations in 3 weeks", client: "GEODIS rebrand" },
  { metric: "$20", detail: "per video — 1,500+ per month", client: "TikTok compliance edits" },
  { metric: "60%", detail: "average savings vs previous agency", client: "Enterprise clients" },
];

const FAQ_ITEMS = [
  {
    q: "Are revisions really unlimited?",
    a: "Yes. We iterate until you're 100% satisfied. No extra charge, no limit.",
  },
  {
    q: "What does D+1 delivery mean?",
    a: "For standard graphic design (banners, adaptations), we deliver within 24 hours of brief validation. Larger scopes (video, branding) are confirmed at brief — typically 48 to 96 hours.",
  },
  {
    q: "Do I need a minimum commitment?",
    a: "No. Order one banner or a thousand. No retainer, no contract lock-in. Pay per project.",
  },
  {
    q: "What if I'm not satisfied with the first project?",
    a: "You don't pay. Simple as that. We believe in earning trust through work, not contracts.",
  },
  {
    q: "Can you handle volume?",
    a: "Absolutely. We produce 1,500+ deliverables per month for clients like Sony, TikTok, and Adidas. Scale is what we do.",
  },
];

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ITEMS.map((faq) => ({
    "@type": "Question",
    name: faq.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.a,
    },
  })),
};

export default function PricingPage() {
  return (
    <div className="pt-[var(--header-height)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }}
      />
      {/* Hero — bold, creative */}
      <Section ariaLabel="Pricing hero">
        <div className="mx-auto max-w-3xl text-center">
          <span className="mb-4 inline-block text-xs font-medium uppercase tracking-[0.2em] text-brand-cerulean-dark">
            Transparent pricing
          </span>
          <h1 className="mb-6 text-5xl font-bold tracking-tight text-brand-black sm:text-6xl lg:text-7xl">
            Fixed prices.
            <br />
            <span className="text-brand-flame">Zero surprises.</span>
          </h1>
          <p className="mx-auto max-w-xl text-lg text-neutral-600">
            No retainer. No minimum commitment. Unlimited revisions.
            Up to 60% savings vs traditional agencies.
          </p>
        </div>
      </Section>

      {/* Guarantee Strip — high impact */}
      <div className="bg-brand-black">
        <div className="mx-auto max-w-screen-xl px-5 py-5 md:px-8">
          <p className="text-center text-lg font-bold text-brand-white">
            Not satisfied with your first project?{" "}
            <span className="text-brand-lemon">No invoice.</span> No questions.
          </p>
        </div>
      </div>

      {/* Pricing Grid */}
      <Section ariaLabel="Pricing grid">
        {/* First row: 3 columns on desktop */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {PRICING_CATEGORIES.slice(0, 3).map((category) => (
            <PricingCard key={category.title} category={category} />
          ))}
        </div>

        {/* Second row: 3 columns on desktop */}
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {PRICING_CATEGORIES.slice(3).map((category) => (
            <PricingCard key={category.title} category={category} />
          ))}
        </div>

        {/* VAT note — integrated */}
        <p className="mt-8 text-center text-sm text-neutral-500">
          All prices exclude VAT (HT). VAT is applied according to applicable regulations.
        </p>
      </Section>

      {/* Proof Points — results speak louder than comparisons */}
      <Section ariaLabel="Results" className="bg-brand-black">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-3 text-center text-3xl font-bold text-brand-white sm:text-4xl">
            The numbers speak.
          </h2>
          <p className="mb-10 text-center text-neutral-400">
            Real prices. Real clients. Real deadlines met.
          </p>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {PROOF_POINTS.map((proof) => (
              <div
                key={proof.client}
                className="rounded-xl border border-neutral-800 p-6 text-center"
              >
                <p className="text-3xl font-bold text-brand-lemon sm:text-4xl">
                  {proof.metric}
                </p>
                <p className="mt-2 text-base text-brand-white">
                  {proof.detail}
                </p>
                <p className="mt-1 text-sm text-neutral-500">
                  {proof.client}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Trust — client logos */}
      <Section ariaLabel="Trusted by">
        <ClientLogos />
      </Section>

      {/* FAQ Pricing */}
      <Section ariaLabel="Pricing FAQ" className="bg-surface-warm">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-10 text-center text-3xl font-bold text-brand-black sm:text-4xl">
            Questions? Answered.
          </h2>
          <div className="space-y-4">
            {FAQ_ITEMS.map((faq) => (
              <details
                key={faq.q}
                className="group rounded-xl border border-neutral-300 bg-brand-white px-6 py-5 transition-shadow hover:shadow-base"
              >
                <summary className="flex cursor-pointer items-center justify-between font-bold text-brand-black">
                  {faq.q}
                  <span className="ml-4 text-xl text-neutral-400 transition-transform duration-200 group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-neutral-600 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </Section>

      {/* Closing CTA — bold */}
      <Section ariaLabel="Call to action" className="bg-brand-black">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-4xl font-bold text-brand-white sm:text-5xl">
            One brief.
            <br />
            <span className="text-brand-flame">24 hours. Done.</span>
          </h2>
          <p className="mb-8 text-neutral-400">
            Zero risk. No commitment. Start with one project and see for yourself.
          </p>
          <Button variant="primary" href="/contact">
            Start a project
          </Button>
        </div>
      </Section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Pricing Card — with personality                                    */
/* ------------------------------------------------------------------ */

function PricingCard({ category }: { category: PricingCategory }) {
  return (
    <div
      className={`rounded-xl border-t-4 ${category.accent} bg-brand-white p-6 shadow-base transition-all duration-200 hover:shadow-lg hover:-translate-y-1 md:p-8`}
    >
      <div className="mb-4 flex items-center gap-3">
        <span className="text-brand-flame-dark">
          {category.icon}
        </span>
        <h3 className="text-xl font-bold text-brand-black">
          {category.title}
        </h3>
      </div>
      <ul className="space-y-3">
        {category.items.map((item) => (
          <li
            key={item.name}
            className="border-b border-neutral-200 pb-3 last:border-0 last:pb-0"
          >
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-neutral-600">{item.name}</span>
              <span className="shrink-0 text-right">
                <span className="font-bold text-brand-black">{item.price}</span>
                {item.priceUsd && (
                  <span className="block text-xs text-neutral-400">{item.priceUsd}</span>
                )}
              </span>
            </div>
            {item.note && (
              <p className="mt-1 text-xs text-neutral-500 italic">{item.note}</p>
            )}
          </li>
        ))}
      </ul>
      {category.note && (
        <p className="mt-5 text-sm text-neutral-500 italic">{category.note}</p>
      )}
    </div>
  );
}
