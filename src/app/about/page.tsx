import type { Metadata } from "next";
import { Section } from "@/components/layout/section";
import { Button } from "@/components/ui/button";
import { ClientLogos } from "@/components/home/client-logos";

export const metadata: Metadata = {
  title: "About Sarani — 35 Experts, 5 Continents, Since 2020",
  description:
    "Built in 2020 to do what traditional agencies can't: deliver enterprise-grade creative work in 24 hours, at fixed prices, with unlimited revisions.",
};

/* ------------------------------------------------------------------ */
/*  Stats Data                                                         */
/* ------------------------------------------------------------------ */

type Stat = {
  value: string;
  label: string;
};

const IMPACT_STATS: Stat[] = [
  { value: "35", label: "In-house experts" },
  { value: "5", label: "Continents" },
  { value: "18", label: "Languages" },
  { value: "D+1", label: "Standard delivery" },
  { value: "60%", label: "Savings vs traditional agencies" },
  { value: "1,500+", label: "Deliverables per month" },
];

/* ------------------------------------------------------------------ */
/*  Client Proof Points                                                */
/* ------------------------------------------------------------------ */

type ProofPoint = {
  client: string;
  challenge: string;
  result: string;
  metric: string;
};

const PROOF_POINTS: ProofPoint[] = [
  {
    client: "TikTok",
    challenge: "1,500+ video edits needed every month",
    result: "Delivered on time. Every month.",
    metric: "1,500+/mo",
  },
  {
    client: "Sony",
    challenge: "Black Friday banners needed same-day",
    result: "Ordered in the morning. Delivered the same day.",
    metric: "150\u20AC/banner",
  },
  {
    client: "GEODIS",
    challenge: "350 presentations to rebrand in 3 weeks",
    result: "5,700 slides delivered. 8,500\u20AC. Done.",
    metric: "3 weeks",
  },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AboutPage() {
  return (
    <div className="pt-[var(--header-height)]">
      {/* ── Hero: The Sarani premise in 3 seconds ── */}
      <Section ariaLabel="About Sarani">
        <div className="max-w-3xl">
          <p className="mb-4 text-sm font-medium uppercase tracking-widest text-brand-flame">
            Since 2020
          </p>
          <h1 className="mb-6 text-4xl font-bold text-brand-black sm:text-5xl lg:text-6xl">
            The creative agency enterprises call when every other agency says
            two weeks.
          </h1>
          <p className="mb-8 text-lg leading-relaxed text-neutral-600 sm:text-xl">
            35 experts. 5 continents. 18 languages. Enterprise-quality creative,
            delivered in 24 hours — with unlimited revisions and fixed prices.
          </p>
          <div className="flex flex-wrap gap-4">
            <Button variant="primary" href="/contact">
              Start a project
            </Button>
            <Button variant="secondary" href="/work">
              See our work
            </Button>
          </div>
          <p className="mt-4 text-sm text-neutral-500">
            First project satisfaction or no invoice.
          </p>
        </div>
      </Section>

      {/* ── Client logos ── */}
      <Section ariaLabel="Trusted by" tight className="bg-surface-elevated">
        <ClientLogos />
      </Section>

      {/* ── Origin story: Why Sarani exists ── */}
      <Section ariaLabel="Why Sarani exists">
        <div className="max-w-3xl">
          <h2 className="mb-4 text-2xl font-bold text-brand-black sm:text-3xl">
            Why Sarani exists
          </h2>
          <p className="mb-6 text-lg leading-relaxed text-neutral-600">
            The traditional agency model was broken before anyone admitted it.
            Campaigns don&apos;t pause for weekly status meetings. Budgets
            don&apos;t expand for revision invoices. And deadlines — real ones —
            don&apos;t negotiate.
          </p>
          <p className="text-lg leading-relaxed text-neutral-600">
            In 2020, Thomas and the founding team built Sarani not as a response
            to the pandemic, but as a response to a structural failure. The
            pandemic simply made it impossible to ignore.
          </p>
        </div>
      </Section>

      {/* ── The problem we saw ── */}
      <Section ariaLabel="The problem we saw" className="bg-surface-elevated">
        <div className="max-w-3xl">
          <h2 className="mb-4 text-2xl font-bold text-brand-black sm:text-3xl">
            The problem we saw
          </h2>
          <p className="mb-6 text-lg leading-relaxed text-neutral-600">
            Every Head of Marketing we spoke to had the same story. The brief
            was ready. The budget was approved. The deadline was real. What she
            couldn&apos;t find was an agency that treated the deadline as the
            starting point, not a negotiating position.
          </p>
          <p className="mb-6 text-lg leading-relaxed text-neutral-600">
            Two weeks for a banner. A revision that triggers a scope change.
            Five agencies for five language markets. A subscription before a
            single asset is produced.
          </p>
          <p className="text-lg leading-relaxed text-neutral-600">
            This is not a failure of individual agencies. It is what happens
            when you build for a world where campaigns run for quarters, not
            days — and then the world changes.
          </p>
        </div>
      </Section>

      {/* ── How we work differently ── */}
      <Section ariaLabel="How we work differently">
        <div className="max-w-3xl">
          <h2 className="mb-4 text-2xl font-bold text-brand-black sm:text-3xl">
            A different architecture
          </h2>
          <p className="mb-6 text-lg leading-relaxed text-neutral-600">
            35 in-house experts across 5 continents work in time-zone relay, so
            your brief never waits for a timezone to wake up. When your brief
            arrives at 6pm Paris time, your team in Asia has already started.
            When you wake up, it&apos;s done.
          </p>
          <p className="text-lg leading-relaxed text-neutral-600">
            Fixed prices, published on the website. Unlimited revisions,
            included. D+1 delivery as the default — not a premium add-on. And
            no subscription lock-in: you start with one project, at 150&#8364;,
            and scale when it makes sense for you.
          </p>
        </div>
      </Section>

      {/* ── Our team — Stats on black bg ── */}
      <section
        aria-label="Sarani by the numbers"
        className="w-full bg-brand-black py-16 md:py-24"
      >
        <div className="mx-auto max-w-screen-xl px-5 md:px-8">
          <div className="mb-12 text-center">
            <h2 className="mb-2 text-3xl font-bold text-brand-white sm:text-4xl">
              Sarani by the numbers
            </h2>
            <p className="text-neutral-400">
              The scale behind the speed.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 text-center sm:grid-cols-3 lg:grid-cols-6">
            {IMPACT_STATS.map((stat) => (
              <div key={stat.label}>
                <p className="text-4xl font-bold text-brand-lemon sm:text-5xl">
                  {stat.value}
                </p>
                <p className="mt-2 text-sm font-medium text-neutral-400">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
          <div className="mx-auto mt-12 max-w-3xl text-center">
            <p className="mb-6 text-lg leading-relaxed text-neutral-300">
              Sarani is not a freelance marketplace. These are 35 in-house
              experts — designers, video editors, copywriters, motion
              specialists, paid ads strategists — working in a structured relay
              model that makes 24/7 creative production structurally possible,
              not just a claim.
            </p>
            <p className="text-lg leading-relaxed text-neutral-300">
              18 languages means one brief, one contact, one invoice — for
              campaigns running simultaneously in German, Japanese, Arabic, and
              Spanish. No multi-agency coordination. No briefing three times for
              three markets.
            </p>
          </div>
        </div>
      </section>

      {/* ── The track record — Individual proof cards ── */}
      <Section ariaLabel="The track record">
        <div className="max-w-4xl">
          <h2 className="mb-4 text-2xl font-bold text-brand-black sm:text-3xl">
            The track record
          </h2>
          <p className="mb-10 text-lg font-medium leading-relaxed text-brand-black">
            Fast and good are not a trade-off. The work proves it.
          </p>

          <div className="grid gap-6 sm:grid-cols-3">
            {PROOF_POINTS.map((proof) => (
              <div
                key={proof.client}
                className="rounded-lg border border-neutral-200 bg-white p-6"
              >
                <p className="mb-1 text-sm font-medium uppercase tracking-wider text-brand-flame">
                  {proof.client}
                </p>
                <p className="mb-3 text-3xl font-bold text-brand-black">
                  {proof.metric}
                </p>
                <p className="mb-2 text-base leading-relaxed text-neutral-600">
                  {proof.challenge}
                </p>
                <p className="text-base font-medium leading-relaxed text-brand-black">
                  {proof.result}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-10 max-w-3xl">
            <p className="mb-6 text-lg leading-relaxed text-neutral-600">
              Enterprise-quality creative should not require an enterprise-sized
              commitment. A reliable creative partner should be earned project by
              project — not locked in by contract before the relationship is
              proven.
            </p>
            <p className="mb-2 text-xl font-bold leading-relaxed text-brand-black">
              We are the creative agency enterprises call when every other agency
              says two weeks.
            </p>
            <p className="text-xl font-bold leading-relaxed text-brand-black">
              We say: tomorrow.
            </p>
          </div>
        </div>
      </Section>

      {/* ── Guarantee block ── */}
      <Section ariaLabel="Our guarantee" className="bg-surface-elevated">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold text-brand-black sm:text-4xl">
            Not satisfied with your first project? No invoice.
          </h2>
          <p className="text-lg leading-relaxed text-neutral-600">
            The financial risk is entirely ours. You brief, we deliver, you
            decide. If the first project isn&apos;t right, you don&apos;t pay —
            no questions, no negotiation.
          </p>
        </div>
      </Section>

      {/* ── Closing CTA ── */}
      <Section ariaLabel="Get started" className="bg-brand-black">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-4 text-3xl font-bold text-brand-white sm:text-4xl">
            Send us your brief tonight. See what&apos;s ready by morning.
          </h2>
          <p className="mb-8 text-neutral-400">
            One brief. One contact. Enterprise-quality creative, delivered
            tomorrow.
          </p>
          <Button variant="primary" href="/contact">
            Start a project
          </Button>
          <p className="mt-4 text-sm text-neutral-500">
            First project satisfaction or no invoice.
          </p>
        </div>
      </Section>
    </div>
  );
}
