import type { Metadata } from "next";
import { Section } from "@/components/layout/section";
import { Button } from "@/components/ui/button";

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

const TEAM_STATS: Stat[] = [
  { value: "35", label: "In-house experts" },
  { value: "5", label: "Continents" },
  { value: "18", label: "Languages" },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AboutPage() {
  return (
    <div className="pt-[72px]">
      {/* ── Section 1: Why Sarani exists ── */}
      <Section ariaLabel="Why Sarani exists">
        <div className="max-w-3xl">
          <h1 className="mb-6 text-4xl font-bold text-brand-black sm:text-5xl">
            Why Sarani exists
          </h1>
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
          <h2 className="mb-4 text-2xl font-bold text-brand-black">
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
            Five agencies for five language markets. A $10,000/month
            subscription before a single asset is produced.
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
          <h2 className="mb-4 text-2xl font-bold text-brand-black">
            How we work differently
          </h2>
          <p className="mb-6 text-lg leading-relaxed text-neutral-600">
            We built a different architecture. 35 in-house experts across 5
            continents work in time-zone relay, so your brief never waits for a
            timezone to wake up. When your brief arrives at 6pm Paris time, your
            team in Asia has already started. When you wake up, it&apos;s done.
          </p>
          <p className="text-lg leading-relaxed text-neutral-600">
            Fixed prices, published on the website. Unlimited revisions,
            included. D+1 delivery as the default — not a premium add-on. And
            no subscription lock-in: you start with one project, at 155&#8364;,
            and scale when it makes sense for you.
          </p>
        </div>
      </Section>

      {/* ── Section 2: Our team — Stats on black bg ── */}
      <section
        aria-label="Our team"
        className="w-full bg-brand-black py-16 md:py-24"
      >
        <div className="mx-auto max-w-screen-xl px-5 md:px-8">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-2xl font-bold text-brand-white">
              Our team
            </h2>
          </div>
          <div className="mb-12 grid gap-10 text-center md:grid-cols-3">
            {TEAM_STATS.map((stat) => (
              <div key={stat.label}>
                <p className="text-5xl font-bold text-brand-lemon">{stat.value}</p>
                <p className="mt-2 text-lg text-neutral-400">{stat.label}</p>
              </div>
            ))}
          </div>
          <div className="max-w-3xl">
            <p className="mb-6 text-lg leading-relaxed text-neutral-300">
              Sarani is not a freelance marketplace. These are 35 in-house
              experts — designers, video editors, copywriters, motion specialists,
              paid ads strategists — working in a structured relay model that
              makes 24/7 creative production structurally possible, not just a
              claim.
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

      {/* ── Section 3: What we believe ── */}
      <Section ariaLabel="What we believe">
        <div className="max-w-3xl">
          <h2 className="mb-4 text-2xl font-bold text-brand-black">
            What we believe
          </h2>
          <p className="mb-6 text-lg leading-relaxed text-neutral-600">
            We refuse to accept that fast and good are a trade-off.
          </p>
          <p className="mb-6 text-lg leading-relaxed text-neutral-600">
            TikTok trusted us with 1,500+ video edits a month. Sony called us
            the day their Black Friday banners were needed — not the week
            before, that day — and we delivered at 155&#8364; per banner. GEODIS
            gave us 350 presentations to rebrand in 3 weeks. 5,700 slides.
            8,500&#8364;. Every one delivered.
          </p>
          <p className="mb-6 text-lg leading-relaxed text-neutral-600">
            Enterprise-quality creative should not require an enterprise-sized
            commitment. A reliable creative partner should be earned project by
            project — not locked in by contract before the relationship is
            proven.
          </p>
          <p className="mb-6 text-lg font-semibold leading-relaxed text-brand-black">
            We are the creative agency enterprises call when every other agency
            says two weeks.
          </p>
          <p className="text-lg font-semibold leading-relaxed text-brand-black">
            We say: tomorrow.
          </p>
          <p className="mt-6 text-base italic text-neutral-500">
            First project satisfaction or no invoice.
          </p>
        </div>
      </Section>

      {/* ── Closing CTA ── */}
      <Section ariaLabel="Get started" className="bg-surface-elevated">
        <div className="mx-auto max-w-3xl text-center">
          <Button variant="primary" href="/contact">
            Let&apos;s chat
          </Button>
          <p className="mt-4 text-sm text-neutral-500">
            First project satisfaction or no invoice.
          </p>
        </div>
      </Section>
    </div>
  );
}
