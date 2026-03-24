import type { Metadata } from "next";
import { Section } from "@/components/layout/section";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Sarani Pricing — Fixed Rates, No Subscription",
  description:
    "Transparent fixed pricing for enterprise creative work. Banners from 155€. Full rebrand from 5,000€. No monthly retainer. No surprise invoices.",
};

/* ------------------------------------------------------------------ */
/*  Pricing Data                                                       */
/* ------------------------------------------------------------------ */

type PricingItem = {
  name: string;
  price: string;
};

type PricingCategory = {
  title: string;
  items: PricingItem[];
  note?: string;
};

const PRICING_CATEGORIES: PricingCategory[] = [
  {
    title: "Content Creation",
    items: [
      { name: "Static banner", price: "155\u00A0€" },
      { name: "Banner adaptation", price: "35\u00A0€/size" },
      { name: "Full rebranding", price: "from 5,000\u00A0€" },
      { name: "Infographic", price: "180\u00A0€ + 35\u00A0€/lang" },
      { name: "Newsletter", price: "450–600\u00A0€/edition" },
      { name: "Website", price: "5,000–8,000\u00A0€" },
    ],
  },
  {
    title: "Video Production",
    items: [
      { name: "Basic video edit", price: "85\u00A0€" },
      { name: "Social media video (30s)", price: "360\u00A0€" },
      { name: "Sizzle reel", price: "360–900\u00A0€" },
      { name: "Video turnkey", price: "3,800–99,800\u00A0€" },
    ],
  },
  {
    title: "Presentations",
    items: [
      { name: "Per slide", price: "30\u00A0€" },
      { name: "Full deck (reference)", price: "from 360\u00A0€" },
    ],
  },
  {
    title: "Operations & Marketing",
    items: [
      { name: "LinkedIn management", price: "1,800–2,500\u00A0€/month" },
      { name: "Paid ads fee", price: "8% of budget" },
      { name: "SEO", price: "custom quote" },
    ],
  },
  {
    title: "On-Demand / Retainer",
    items: [{ name: "Monthly pack", price: "custom quote" }],
    note: "Need regular volume? Ask us about retained partnerships.",
  },
];

type ComparisonRow = {
  label: string;
  sarani: string;
  agency: string;
};

const COMPARISON_ROWS: ComparisonRow[] = [
  { label: "Banner", sarani: "155–470\u00A0€", agency: "500–2,000\u00A0€" },
  {
    label: "Revisions",
    sarani: "Included",
    agency: "200–800\u00A0€ each",
  },
  { label: "Turnaround", sarani: "24 hours", agency: "10–15 days" },
  { label: "Commitment", sarani: "None", agency: "Retainer required" },
];

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function PricingPage() {
  return (
    <div className="pt-[72px]">
      {/* Hero */}
      <Section ariaLabel="Pricing hero">
        <h1 className="mb-6 text-4xl font-bold text-brand-black sm:text-5xl">
          Fixed prices. Zero surprises.
        </h1>
        <p className="max-w-2xl text-xl text-neutral-600">
          No retainer. No minimum commitment. Unlimited revisions. Up to 60%
          savings vs agencies.
        </p>
      </Section>

      {/* Guarantee Strip */}
      <div className="border-y border-neutral-300 bg-surface-elevated">
        <div className="mx-auto max-w-screen-xl px-5 py-5 text-center md:px-8">
          <p className="text-lg font-bold text-brand-black">
            Not satisfied with your first project? No invoice.
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

        {/* Second row: 2 columns on desktop, centered */}
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:mx-auto lg:max-w-[calc(66.666%+0.75rem)]">
          {PRICING_CATEGORIES.slice(3).map((category) => (
            <PricingCard key={category.title} category={category} />
          ))}
        </div>
      </Section>

      {/* Comparison Section */}
      <Section ariaLabel="Pricing comparison">
        <h2 className="mb-10 text-center text-3xl font-bold text-brand-black sm:text-4xl">
          Up to 60% savings vs traditional agencies
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse text-left">
            <thead>
              <tr>
                <th className="rounded-tl-lg border border-neutral-300 bg-surface-elevated px-6 py-4 text-sm font-bold uppercase tracking-wider text-neutral-500">
                  &nbsp;
                </th>
                <th className="border border-neutral-300 bg-brand-cerulean px-6 py-4 text-sm font-bold uppercase tracking-wider text-brand-black">
                  Sarani
                </th>
                <th className="rounded-tr-lg border border-neutral-300 bg-surface-elevated px-6 py-4 text-sm font-bold uppercase tracking-wider text-neutral-500">
                  Network Agency
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row, i) => (
                <tr key={row.label}>
                  <td
                    className={`border border-neutral-300 bg-surface-elevated px-6 py-4 font-bold text-brand-black ${i === COMPARISON_ROWS.length - 1 ? "rounded-bl-lg" : ""}`}
                  >
                    {row.label}
                  </td>
                  <td className="border border-neutral-300 bg-surface-elevated px-6 py-4 text-brand-cerulean">
                    {row.sarani}
                  </td>
                  <td
                    className={`border border-neutral-300 bg-surface-elevated px-6 py-4 text-neutral-500 ${i === COMPARISON_ROWS.length - 1 ? "rounded-br-lg" : ""}`}
                  >
                    {row.agency}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* VAT Footnote */}
      <div className="mx-auto max-w-screen-xl px-5 pb-2 text-center md:px-8">
        <p className="text-sm text-neutral-500">
          All prices exclude VAT (HT). VAT is applied according to applicable
          regulations.
        </p>
      </div>

      {/* Closing CTA */}
      <Section ariaLabel="Call to action">
        <div className="text-center">
          <h2 className="mb-6 text-3xl font-bold text-brand-black sm:text-4xl">
            Start your first project today.
          </h2>
          <Button variant="primary" href="/contact">
            Start a project
          </Button>
          <p className="mt-6 text-sm text-neutral-500">
            First project satisfaction or no invoice.
          </p>
        </div>
      </Section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Pricing Card                                                       */
/* ------------------------------------------------------------------ */

function PricingCard({ category }: { category: PricingCategory }) {
  return (
    <div className="rounded-lg border border-neutral-300 bg-surface-elevated p-6 md:p-8">
      <h3 className="mb-5 text-xl font-bold text-brand-black">
        {category.title}
      </h3>
      <ul className="space-y-3">
        {category.items.map((item) => (
          <li
            key={item.name}
            className="flex items-baseline justify-between gap-4"
          >
            <span className="text-neutral-600">{item.name}</span>
            <span className="shrink-0 font-bold text-brand-black">
              {item.price}
            </span>
          </li>
        ))}
      </ul>
      {category.note && (
        <p className="mt-5 text-sm text-neutral-500 italic">{category.note}</p>
      )}
    </div>
  );
}
