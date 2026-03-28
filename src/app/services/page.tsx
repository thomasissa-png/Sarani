import type { Metadata } from "next";
import Image from "next/image";
import { Section } from "@/components/layout/section";
import { Button } from "@/components/ui/button";
import { ClientLogos } from "@/components/home/client-logos";
import { BreadcrumbSchema } from "@/components/seo/breadcrumb-schema";
import { BREADCRUMBS } from "@/lib/breadcrumb-jsonld";

export const metadata: Metadata = {
  title: "Services — Sarani Enterprise Creative",
  description:
    "Enterprise creative delivered in 24 hours. 35 experts across 5 continents work in relay — strategy, content, distribution, on-demand production. Fixed prices. Unlimited revisions.",
  openGraph: {
    title: "Services — Sarani Enterprise Creative",
    description:
      "Enterprise creative delivered in 24 hours. 35 experts, 5 continents, working in relay. Fixed prices. Unlimited revisions.",
    url: "/services",
  },
  alternates: {
    canonical: "https://sarani.studio/services",
  },
};

/* ------------------------------------------------------------------ */
/*  Service section data                                               */
/* ------------------------------------------------------------------ */

type ServiceSection = {
  id: string;
  accent: string;
  accentText: string;
  accentBorder: string;
  headline: string;
  subtitle: string;
  services: { group?: string; items: string[] }[];
  proofPoint: string;
  /** Per-section CTA config — null means no CTA for this block */
  cta: { label: string; href: string; ariaLabel: string; variant: "primary" | "secondary" | "ghost" } | null;
  /** Illustration image */
  image?: { src: string; alt: string };
};

const SERVICE_SECTIONS: ServiceSection[] = [
  {
    id: "strategic-marketing",
    accent: "bg-brand-flame/10",
    accentText: "text-brand-flame-dark",
    accentBorder: "border-l-brand-flame",
    headline: "The brief before the brief.",
    subtitle:
      "Good creative production starts with the right questions. Before an asset ships, we make sure the strategy behind it is solid \u2014 market positioning, communication planning, competitive analysis.",
    services: [
      { items: ["Strategic Plan", "Marketing and Communication Plan", "Market Research"] },
    ],
    proofPoint:
      "Sony\u2019s European TV line-up launched with 125 assets across 15 languages in 14 days \u2014 8,500\u20AC, with daily HQ Japan approval. The production was fast because the brief was clear. Strategy first \u2014 execution follows.",
    cta: null,
    image: { src: "/L'Oréal Fashion Week 2025/Captura de pantalla 2025-11-13 233119.png", alt: "L'Oréal Le Défilé — Paris Fashion Week 2025 campaign by Sarani" },
  },
  {
    id: "content-creation",
    accent: "bg-brand-cerulean/10",
    accentText: "text-brand-cerulean-dark",
    accentBorder: "border-l-brand-cerulean",
    headline: "Every asset your campaign needs. On time.",
    subtitle:
      "This is where most of the work happens. Branding, graphics, video, copy, presentations, web, and virtual spaces \u2014 produced by a 35-person team working 24/7, in relay, across 5 continents.",
    services: [
      { group: "Branding", items: ["Logo", "Brand Identity"] },
      { group: "Graphics", items: ["Online banners", "Offline marketing assets", "Graphic content"] },
      { group: "Videos", items: ["Motion", "Social Media", "Production", "Animation", "3D"] },
      { group: "Copy", items: ["Copywriting", "Translations"] },
      { group: "Presentation", items: ["Pitch Decks", "Templates", "Media Kits", "Adaptations"] },
      { group: "Web", items: ["Landing Pages", "Newsletters", "Websites", "UX"] },
    ],
    proofPoint:
      "TikTok\u2019s Gaming Showcase: 300 million views across 3 markets. TikTok\u2019s #GimmeTheMic Germany: 94 million views for 3,800\u20AC. Adidas turned the Adidas Arena Paris into a giant shoebox \u2014 stadium wraps, decor, invitations, tickets, projections, and every collateral piece. Sony\u2019s European TV launch: 125 assets across 15 languages in 2 weeks. GEODIS: 5,700 slides rebranded in 3 weeks for 8,500\u20AC. LEGO took the Champs-\u00C9lys\u00E9es with a campaign, a web platform, and scenography we produced end-to-end.",
    cta: {
      label: "See our work",
      href: "/work",
      ariaLabel: "See content creation case studies",
      variant: "secondary",
    },
    image: { src: "/Le Grand Tournoi des Champs LEGO/KV-LEGO_1080x1920.png", alt: "LEGO Le Grand Tournoi des Champs — Champs-Élysées campaign by Sarani" },
  },
  {
    id: "operational-marketing",
    accent: "bg-brand-lemon/10",
    accentText: "text-brand-lemon-dark",
    accentBorder: "border-l-brand-lemon",
    headline: "Distribution, acquisition, visibility.",
    subtitle:
      "Creative assets need to reach the right people. Social media management, paid acquisition, SEO, LinkedIn campaigns, emailings \u2014 we run the channels that turn content into results.",
    services: [
      { group: "Social Media", items: ["Assets", "Complete management", "Influence campaigns"] },
      { group: "Client Acquisition", items: ["Outbound campaigns", "Emailings", "LinkedIn", "Phoning"] },
      { group: "Paid Ads", items: ["Social Ads", "Display", "DOOH"] },
      { group: "SEO", items: ["Optimisation", "Analysis", "Implementation"] },
      { group: "Merchandising", items: ["Plans", "Offline implementation", "Print management"] },
    ],
    proofPoint:
      "TikTok\u2019s #GimmeTheMic campaign: 94 million views for 3,800\u20AC. TikTok\u2019s #RoadToParis video \u2014 produced for 360\u20AC \u2014 reached 51 million views with 24 revision rounds included. 1,500+ UGC edits delivered every month at $20 per video.",
    cta: {
      label: "View pricing",
      href: "/pricing",
      ariaLabel: "View operational marketing pricing",
      variant: "secondary",
    },
    image: { src: "/CROCS.jpg", alt: "Crocs campaign on Times Square NASDAQ billboard — produced by Sarani" },
  },
  {
    id: "on-demand",
    accent: "bg-brand-flame/10",
    accentText: "text-brand-flame-dark",
    accentBorder: "border-l-brand-flame",
    headline: "Need something that doesn\u2019t fit a category?",
    subtitle:
      "Custom creations, project management, task outsourcing \u2014 if it falls outside a standard brief, send it anyway. We work it out.",
    services: [
      { items: ["Custom creation", "Management", "Tasks Outsourcing"] },
    ],
    proofPoint:
      "Sony needed Black Friday banners with a same-day turnaround. No standard brief, no standard process. Request in the morning. Two proposals by afternoon. Delivery by the next morning. 150\u20AC.",
    cta: {
      label: "Tell us what you need",
      href: "/contact",
      ariaLabel: "Send us a custom brief",
      variant: "primary",
    },
    image: { src: "/Sony Month Boulanger/SONY_FR_Homepage_716x1040px_Boulanger Banners V2.jpg", alt: "Sony Month Boulanger banners — produced by Sarani" },
  },
];

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function ServicesPage() {
  return (
    <div className="pt-[var(--header-height)]">
      <BreadcrumbSchema items={BREADCRUMBS.services} />
      {/* Hero */}
      <Section ariaLabel="Services hero" className="!pb-8">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand-flame mb-4">
            What We Do
          </p>
          <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight text-brand-black sm:text-5xl lg:text-6xl">
            Enterprise creative. Every format.
            <br />
            Delivered in 24&nbsp;hours.
          </h1>
          <p className="max-w-3xl text-lg leading-relaxed text-neutral-600">
            Strategy, content, distribution, on-demand production &mdash;
            produced by 35&nbsp;experts across 5&nbsp;continents, working in relay.
            No retainer. Fixed prices. Unlimited revisions.
            First project satisfaction or no invoice.
          </p>
          <div className="mt-8">
            <Button variant="secondary" href="/work" aria-label="See examples of our work">
              See our work
            </Button>
          </div>
        </div>
      </Section>

      {/* Client logos — tight spacing */}
      <div className="border-t border-neutral-100 py-4">
        <ClientLogos />
      </div>

      {/* Service sections */}
      {SERVICE_SECTIONS.map((section) => (
        <ServiceBlock key={section.id} section={section} />
      ))}

      {/* Timezone relay module */}
      <Section ariaLabel="How Sarani delivers in 24 hours" className="bg-brand-black">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-6 text-3xl font-bold text-brand-white sm:text-4xl">
            Why 24&nbsp;hours is our default, not our premium.
          </h2>
          <p className="mb-8 text-lg text-neutral-300">
            35&nbsp;experts across 5&nbsp;time zones work in relay.
            When Paris signs off, Dubai continues. When Dubai hands off,
            S&atilde;o Paulo picks up. Your brief never waits for a timezone
            to wake up. D+1 delivery is the standard &mdash; not an add-on.
          </p>
          <p className="mb-10 text-sm font-medium uppercase tracking-widest text-neutral-400">
            35&nbsp;experts &middot; 5&nbsp;continents &middot; 18&nbsp;languages &middot; 24/7
          </p>
          <Button variant="ghost" href="/about" aria-label="Meet the Sarani team" className="text-brand-white hover:text-brand-white">
            Meet the team &rarr;
          </Button>
        </div>
      </Section>

      {/* Closing section */}
      <Section ariaLabel="Start working with Sarani" className="bg-surface-warm">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-6 text-3xl font-bold text-brand-black sm:text-4xl">
            Every service. Any combination.
          </h2>
          <p className="mb-4 text-lg text-neutral-600">
            Sarani works as a full programme &mdash; strategy through operational execution &mdash;
            or as a single-service partner. You pick what you need. No retainer. No minimum
            commitment. Fixed prices, published upfront.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button variant="primary" href="/contact" aria-label="Start a project with Sarani">
              Start a project
            </Button>
            <Button variant="secondary" href="/pricing" aria-label="View all service pricing">
              View pricing
            </Button>
          </div>
          <p className="mt-4 text-sm text-neutral-500">
            First project satisfaction or no invoice.
          </p>
        </div>
      </Section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Service Block component                                            */
/* ------------------------------------------------------------------ */

function ServiceBlock({ section }: { section: ServiceSection }) {
  const sectionIndex = SERVICE_SECTIONS.indexOf(section);
  const isEvenIndex = sectionIndex % 2 === 1;
  const imageOnRight = sectionIndex % 2 === 0;

  return (
    <Section
      id={section.id}
      ariaLabel={section.headline}
      className={isEvenIndex ? "bg-surface-warm" : undefined}
    >
      <div className={`grid gap-10 lg:gap-16 items-start ${section.image ? "lg:grid-cols-5" : ""}`}>
        {/* Text content */}
        <div className={`${section.image ? "lg:col-span-3" : ""} ${section.image && !imageOnRight ? "lg:order-2" : ""}`}>
          {/* Heading */}
          <div className={`mb-8 border-l-4 pl-6 ${section.accentBorder}`}>
            <h2 className="mb-3 text-3xl font-bold text-brand-black sm:text-4xl">
              {section.headline}
            </h2>
            <p className="max-w-2xl text-lg text-neutral-600">
              {section.subtitle}
            </p>
          </div>

          {/* Services list */}
          <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {section.services.map((group, gi) => (
              <div key={gi}>
                {group.group && (
                  <h3 className={`mb-2 text-sm font-bold uppercase tracking-wider ${section.accentText}`}>
                    {group.group}
                  </h3>
                )}
                <ul className="space-y-1.5">
                  {group.items.map((item) => (
                    <li key={item} className="text-neutral-600">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Proof point */}
          <div className={`rounded-xl ${section.accent} p-6`}>
            <p className="text-sm font-medium text-neutral-700 italic">
              {section.proofPoint}
            </p>
          </div>

          {/* CTA */}
          {section.cta && (
            <div className="mt-8">
              <Button
                variant={section.cta.variant}
                href={section.cta.href}
                aria-label={section.cta.ariaLabel}
              >
                {section.cta.label}
              </Button>
            </div>
          )}
        </div>

        {/* Image */}
        {section.image && (
          <div className={`lg:col-span-2 ${!imageOnRight ? "lg:order-1" : ""}`}>
            <div className="relative overflow-hidden rounded-2xl border border-neutral-200">
              <Image
                src={section.image.src}
                alt={section.image.alt}
                width={600}
                height={400}
                className="w-full h-auto object-cover"
                sizes="(max-width: 1024px) 100vw, 40vw"
              />
            </div>
          </div>
        )}
      </div>
    </Section>
  );
}
