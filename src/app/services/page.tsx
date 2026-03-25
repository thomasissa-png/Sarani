import type { Metadata } from "next";
import { Section } from "@/components/layout/section";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Services — Sarani Enterprise Creative",
  description:
    "Strategic marketing, content creation, operational marketing, and on-demand production. 35 experts, 5 continents, 18 languages. No retainer required.",
  openGraph: {
    title: "Services — Sarani Enterprise Creative",
    description:
      "Strategic marketing, content creation, operational marketing, and on-demand production. No retainer required.",
    url: "/services",
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
};

const SERVICE_SECTIONS: ServiceSection[] = [
  {
    id: "strategic-marketing",
    accent: "bg-brand-flame/10",
    accentText: "text-brand-flame",
    accentBorder: "border-l-brand-flame",
    headline: "The brief before the brief.",
    subtitle:
      "Good creative production starts with the right questions. Before an asset ships, we make sure the strategy behind it is solid \u2014 market positioning, communication planning, competitive analysis.",
    services: [
      { items: ["Strategic Plan", "Marketing and Communication Plan", "Market Research"] },
    ],
    proofPoint:
      "Sony\u2019s European TV line-up launched with 125 assets in 14 days. The production was fast because the brief was clear. Strategy first \u2014 execution follows.",
  },
  {
    id: "content-creation",
    accent: "bg-brand-cerulean/10",
    accentText: "text-brand-cerulean",
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
      { group: "Virtualisation", items: ["Art Galleries", "Corporate Spaces", "Leisure", "Virtual Showrooms"] },
    ],
    proofPoint:
      "TikTok trusted us with 1,500+ video edits a month. Adidas turned the Adidas Arena Paris into a giant shoebox \u2014 stadium wraps, decor, invitations, tickets, projections, and every collateral piece in between. LEGO took the Champs-\u00C9lys\u00E9es with a campaign, a web platform, and scenography we produced end-to-end.",
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
      "TikTok\u2019s #RoadToParis video \u2014 produced for 360\u20AC \u2014 reached 51 million views. The TikTok Comedy Club contest generated 27 million views and a winner who sold out La Cigale in Paris.",
  },
  {
    id: "on-demand",
    accent: "bg-brand-flame/10",
    accentText: "text-brand-flame",
    accentBorder: "border-l-brand-flame",
    headline: "Need something that doesn\u2019t fit a category?",
    subtitle:
      "Custom creations, project management, task outsourcing \u2014 if it falls outside a standard brief, send it anyway. We work it out.",
    services: [
      { items: ["Custom creation", "Management", "Tasks Outsourcing"] },
    ],
    proofPoint:
      "Sony needed Black Friday banners with a same-day turnaround. No standard brief, no standard process. Request in the morning. Two proposals by afternoon. Delivery by the next morning. 155\u20AC.",
  },
];

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function ServicesPage() {
  return (
    <div className="pt-[var(--header-height)]">
      {/* Hero */}
      <Section ariaLabel="Services hero">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="mb-6 text-5xl font-bold tracking-tight text-brand-black sm:text-6xl lg:text-7xl">
            What we do. All of it.
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-neutral-600">
            Strategic marketing, content creation, operational marketing, and on-demand production
            &mdash; available as a complete programme or &agrave; la carte. No retainer required.
          </p>
        </div>
      </Section>

      {/* Service sections */}
      {SERVICE_SECTIONS.map((section) => (
        <ServiceBlock key={section.id} section={section} />
      ))}

      {/* Closing section */}
      <Section ariaLabel="Every service, any combination" className="bg-brand-black">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-6 text-3xl font-bold text-brand-white sm:text-4xl">
            Every service. Any combination.
          </h2>
          <p className="mb-4 text-lg text-neutral-400">
            Sarani works as a full programme &mdash; strategy through operational execution &mdash;
            or as a single-service partner. You pick what you need. No retainer. No minimum
            commitment. Fixed prices, published upfront.
          </p>
          <p className="mb-10 text-lg font-bold text-brand-white">
            35 experts. 5 continents. 18 languages. 24/7.
          </p>
          <Button variant="primary" href="/contact">
            Start a project
          </Button>
          <p className="mt-3 text-sm text-neutral-400">
            First project satisfaction or no invoice.
          </p>
          <div className="mt-6">
            <Button variant="ghost" href="/pricing">
              View pricing
            </Button>
          </div>
        </div>
      </Section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Service Block component                                            */
/* ------------------------------------------------------------------ */

function ServiceBlock({ section }: { section: ServiceSection }) {
  const isEvenIndex = SERVICE_SECTIONS.indexOf(section) % 2 === 1;

  return (
    <Section
      id={section.id}
      ariaLabel={section.headline}
      className={isEvenIndex ? "bg-surface-warm" : undefined}
    >
      <div className="mx-auto max-w-4xl">
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
        <div className="mt-8">
          <Button variant="primary" href="/contact">
            Start a project
          </Button>
        </div>
      </div>
    </Section>
  );
}
