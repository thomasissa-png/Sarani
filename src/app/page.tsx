import { Section } from "@/components/layout/section";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <>
      {/* Hero Section — placeholder for Sprint 2 full implementation */}
      <section className="flex min-h-dvh flex-col justify-center bg-brand-black pt-[72px]">
        <div className="mx-auto max-w-screen-xl px-5 md:px-8">
          <div className="max-w-3xl">
            <p className="mb-6 text-sm font-normal uppercase tracking-wider text-brand-cerulean">
              The always-on enterprise creative partner
            </p>
            <h1 className="mb-6 text-3xl font-bold leading-tight tracking-tight text-brand-white sm:text-5xl lg:text-6xl">
              Enterprise creative. 24 hours. TikTok, Sony, Adidas.
            </h1>
            <p className="mb-8 text-lg text-neutral-400">
              GEODIS rebranded 350 presentations in 3 weeks for 8,500&euro;. Their previous agency
              quoted 80,000&euro; and 3 months. Fixed prices. Unlimited revisions. First project
              satisfaction or no invoice.
            </p>
            <div className="flex flex-wrap items-center gap-4">
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
        </div>
      </section>

      {/* Proof Points — placeholder */}
      <Section ariaLabel="Proof points">
        <p className="text-center text-neutral-500">
          {/* [PROVISOIRE — Case study teasers and proof points will be implemented in Sprint 2] */}
          &nbsp;
        </p>
      </Section>
    </>
  );
}
