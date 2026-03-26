/**
 * Case study data — source: docs/product/functional-specs.md US-102
 * Static data, no API dependency. Used by /work listing and /case-studies/[slug] detail pages.
 */

export interface CaseStudyStat {
  label: string;
  value: string;
}

export interface CaseStudy {
  slug: string;
  client: string;
  deliverable: string;
  volume: string;
  turnaround: string;
  outcome: string;
  brief: string;
  result: string;
  /** H1 on detail page — Formula 2: Problem to Result */
  headline: string;
  /** Short metric for card display */
  keyMetric: string;
  /** Stats displayed in the results section (3 cards) */
  stats: [CaseStudyStat, CaseStudyStat, CaseStudyStat];
  /** SEO meta description */
  metaDescription: string;
  /** Optional subtitle for detail page */
  subtitle?: string;
  /** Optional detailed challenge text for detail page */
  challenge?: string;
  /** Optional detailed solution text for detail page */
  solution?: string;
  /** Optional detailed results text for detail page */
  resultsDetail?: string;
  /** Optional tags (category/year) for detail page */
  tags?: string[];
}

export const caseStudies: CaseStudy[] = [
  {
    slug: "tiktok-video-production",
    client: "TikTok",
    deliverable: "Video editing",
    volume: "1,500+ edits per month",
    turnaround: "Ongoing, daily delivery",
    outcome: "400M+ total campaign views",
    brief:
      "TikTok needed 300-500 video edits per week for creator campaigns across multiple markets. Speed and consistency were non-negotiable.",
    result: "1,500+ edits per month. 400M+ total campaign views. Every deadline met.",
    headline: "300-500 edits per week. 400M+ views. Every deadline met.",
    keyMetric: "400M+ views",
    stats: [
      { label: "Edits per month", value: "1,500+" },
      { label: "Total campaign views", value: "400M+" },
      { label: "Deadlines met", value: "100%" },
    ],
    metaDescription:
      "How Sarani delivers 1,500+ video edits per month for TikTok creator campaigns across multiple markets. 400M+ total campaign views. Every deadline met.",
  },
  {
    slug: "sony-banner-production",
    client: "Sony",
    deliverable: "Banner production",
    volume: "125+ assets across 15 languages",
    turnaround: "Same day (24 hours)",
    outcome: "Black Friday campaign, banners from 150\u20AC",
    brief:
      "Sony needed Black Friday banners delivered the same day across 15 languages. We produced 125+ assets \u2014 banners, social cards, and email headers \u2014 before the deadline.",
    result: "125+ assets. 15 languages. Same day. From 150\u20AC per banner.",
    headline: "125+ Black Friday assets across 15 languages. Same day. From 150\u20AC per banner.",
    keyMetric: "125+ assets in 24h",
    stats: [
      { label: "Assets delivered", value: "125+" },
      { label: "Languages", value: "15" },
      { label: "Turnaround", value: "24h" },
    ],
    metaDescription:
      "How Sarani produced 125+ Black Friday assets for Sony across 15 languages in 24 hours. Banners, social cards, and email headers \u2014 same-day delivery from 150\u20AC.",
  },
  {
    slug: "geodis-presentation-rebranding",
    client: "GEODIS",
    deliverable: "Presentation rebranding",
    volume: "5,700 slides (350 presentations)",
    turnaround: "3 weeks",
    outcome: "8,500\u20AC total (previous agency quoted 80,000\u20AC)",
    brief:
      "GEODIS needed 350 presentations rebranded across 12 markets in 3 weeks, full brand consistency. Their previous agency quoted 80,000\u20AC and 3 months.",
    result: "5,700 slides. 3 weeks. 8,500\u20AC total.",
    headline:
      "350 presentations rebranded in 3 weeks. 8,500\u20AC instead of 80,000\u20AC.",
    keyMetric: "90% cost savings",
    stats: [
      { label: "Slides rebranded", value: "5,700" },
      { label: "Total cost", value: "8,500\u20AC" },
      { label: "Time to deliver", value: "3 weeks" },
    ],
    metaDescription:
      "How Sarani rebranded 5,700 slides across 350 presentations for GEODIS in 3 weeks for 8,500\u20AC \u2014 their previous agency quoted 80,000\u20AC and 3 months.",
  },
  {
    slug: "adidas-superstar-concert",
    client: "Adidas",
    deliverable: "Event creative production",
    volume: "Hundreds of assets",
    turnaround: "Before event date",
    outcome: "Full-venue transformation — Adidas Arena Paris",
    brief:
      "Adidas needed to turn the Adidas Arena in Paris into a giant shoebox for a single night. Not a themed evening. A full physical transformation — stadium wraps, interior decor, signage, invitations, tickets, stickers, badges, goodies, menus, video projections, and digital content.",
    result: "The Adidas Arena Paris was transformed for the night. Every asset delivered on time, before the event.",
    headline: "Adidas Arena: One Night, One Shoebox",
    keyMetric: "Hundreds of assets",
    stats: [
      { label: "Assets produced", value: "Hundreds" },
      { label: "Scope", value: "Full-venue" },
      { label: "Client", value: "Adidas" },
    ],
    metaDescription:
      "How Sarani produced hundreds of assets to transform the Adidas Arena Paris into a giant shoebox — stadium wraps, decor, invitations, tickets, and digital content.",
    subtitle: "Hundreds of assets, one brief \u2014 transforming a stadium into Adidas\u2019 most iconic product.",
    challenge: "Adidas needed to turn the Adidas Arena in Paris into a giant shoebox for a single night. Not a themed evening. Not a branded backdrop. A full physical transformation \u2014 stadium wraps, interior decor, signage, invitations, tickets, stickers, badges, goodies, menus, video projections, and digital content. Every touchpoint of the venue, consistent with a single creative concept.",
    solution: "Working under Ubi\u2019s project lead, Sarani took on the full asset production \u2014 hundreds of individual pieces designed to hold visual coherence across a space the size of a stadium. Stadium wraps were built to scale. Interior decor mapped to the shoebox concept. Each collateral piece \u2014 from badges to menus to invitations \u2014 carried the same system.\n\nEvery asset type required a different technical specification: outdoor-grade materials for the wraps, high-DPI print files for tickets and signage, optimised digital content for projection screens. One brief. One creative system. Hundreds of outputs.",
    resultsDetail: "The Adidas Arena Paris was transformed for the night. The Superstar concept held from the entrance to the stage \u2014 stadium exterior to in-hand collateral. Every asset delivered, on time, before the event.",
    tags: ["Graphic Design", "Event"],
  },
  {
    slug: "lego-grand-tournoi",
    client: "LEGO",
    deliverable: "Campaign + Web + Event",
    volume: "Full campaign suite",
    turnaround: "Pre-event delivery",
    outcome: "250+ teams on the Champs-\u00C9lys\u00E9es",
    brief:
      "On 21 September 2025, LEGO transformed the Avenue des Champs-\u00C9lys\u00E9es into a city-scale playground. LEGO needed a complete creative system \u2014 from the first poster to the web platform handling team registrations.",
    result: "250+ competing teams. Every campaign phase ran on assets Sarani delivered.",
    headline: "LEGO Takes the Champs-\u00C9lys\u00E9es",
    keyMetric: "250+ teams",
    stats: [
      { label: "Teams", value: "250+" },
      { label: "Location", value: "Champs-\u00C9lys\u00E9es" },
      { label: "Date", value: "21 Sept 2025" },
    ],
    metaDescription:
      "How Sarani produced the full campaign, web platform, and event assets for LEGO\u2019s Grand Tournoi des Champs on the Avenue des Champs-\u00C9lys\u00E9es.",
    subtitle: "250+ teams, one avenue, and every asset Sarani could produce \u2014 print, digital, web, and on-site.",
    challenge: "On 21 September 2025, LEGO transformed the Avenue des Champs-\u00C9lys\u00E9es into a city-scale playground. 250+ teams competing in creative construction challenges, on one of the most visible streets in the world. LEGO needed a complete creative system to hold the event together \u2014 from the first poster seen by Parisians to the web platform handling team registrations to the branded elements visible on the day.",
    solution: "Under Ubi\u2019s project lead, Sarani produced the full campaign and event asset suite. The main event poster anchored the visual identity \u2014 designed for outdoor print and adapted for the digital campaign running ahead of the event. The print and digital campaign extended the system across formats and channels.\n\nOn-site, the scenography assets and screen content were produced to run live. The web platform handled the tournament structure, team sign-ups, and real-time display needs. Branded elements ran across every touchpoint on the avenue.",
    resultsDetail: "The Avenue des Champs-\u00C9lys\u00E9es hosted 250+ competing teams on a single September day. Every campaign phase \u2014 pre-event, on-site, digital \u2014 ran on assets Sarani delivered.",
    tags: ["Graphic Design", "Web", "Event", "2025"],
  },
  {
    slug: "sony-black-friday",
    client: "Sony",
    deliverable: "Black Friday banners",
    volume: "2 assets",
    turnaround: "Same day",
    outcome: "150\u20AC total \u2014 brief to delivery in under 24h",
    brief:
      "Sony needed Black Friday banners for their ULT series \u2014 urgently. The brief arrived in the morning. The campaign was live the next day.",
    result: "2 production-ready banner assets delivered. Brief to final file in under 24 hours.",
    headline: "Black Friday Banners. Same Day.",
    keyMetric: "150\u20AC",
    stats: [
      { label: "Assets delivered", value: "2" },
      { label: "Price", value: "150\u20AC" },
      { label: "Turnaround", value: "<24h" },
    ],
    metaDescription:
      "How Sarani delivered Sony\u2019s Black Friday banners in under 24 hours for 150\u20AC \u2014 same-day first proposals, overnight finish, morning delivery.",
    subtitle: "Request in the morning. Two proposals by afternoon. Final delivery by the next morning. 150\u20AC.",
    challenge: "Sony needed Black Friday banners for their ULT series \u2014 urgently. The brief arrived in the morning. The campaign was live the next day. There was no room for the standard agency process: intake, briefing, kickoff, creative exploration, first draft, feedback loop. Sony needed proposals the same day the brief landed.",
    solution: "Two proposals were produced and returned to Sony the same afternoon. One designer worked the day shift, a second took over overnight to apply Sony\u2019s final feedback and prepare the delivery files. By morning, the assets were ready.\n\nThis is the relay structure that makes Sarani\u2019s D+1 commitment structurally possible \u2014 not a rush fee, not an exception. It is how the team is built: 35+ experts across 5 continents, working in time-zone relay so a brief that lands at 9am in Paris is still being worked on at 2am Paris time in another timezone.",
    resultsDetail: "2 production-ready banner assets delivered. Brief to final file in under 24 hours.",
    tags: ["Graphic Design"],
  },
  {
    slug: "sony-tv-launch",
    client: "Sony",
    deliverable: "European TV launch assets",
    volume: "125 assets",
    turnaround: "2 weeks",
    outcome: "8,500\u20AC \u2014 HQ Japan approved daily",
    brief:
      "Sony was launching a new TV line-up across Europe. 125 assets total: 20 product sheets, 72 online banners, 30 offline marketing elements, and a 40-slide presentation. Every piece required daily sign-off from Sony HQ Japan.",
    result: "125 assets produced and approved by Sony HQ Japan over a 14-day period. Every daily review cycle met.",
    headline: "125 Assets. 2 Weeks. HQ Japan Approved.",
    keyMetric: "125 assets in 2 weeks",
    stats: [
      { label: "Assets delivered", value: "125" },
      { label: "Price", value: "8,500\u20AC" },
      { label: "Duration", value: "2 weeks" },
    ],
    metaDescription:
      "How Sarani produced 125 assets for Sony\u2019s European TV launch in 2 weeks for 8,500\u20AC with daily HQ Japan approval cycles.",
    subtitle: "Sony\u2019s new TV line-up launched across Europe \u2014 20 product sheets, 72 banners, 30 offline elements, 1 presentation. All in 14 days.",
    challenge: "Sony was launching a new TV line-up across Europe. The asset volume was non-negotiable: 20 product sheets, 72 online banners, 30 offline marketing elements, and a 40-slide presentation \u2014 125 assets total. Every piece required daily review and sign-off from Sony\u2019s headquarters in Japan, which meant approval cycles running across time zones, every day, for two weeks straight.",
    solution: "Sarani ran two-person teams working in day/night relay \u2014 one designer active while another rested \u2014 to maintain a continuous production cycle. Daily review sessions with HQ Japan were factored into the schedule rather than treated as interruptions. Revisions arrived overnight in European time; assets were updated and ready for the next review window.\n\nThe 40-slide presentation was built to Sony\u2019s brand standards and adapted for the European market context. The 72 online banners were produced in multiple formats across the required specifications. The 30 offline elements \u2014 print-ready, correctly sized for each application \u2014 were delivered alongside the digital suite.",
    resultsDetail: "125 assets produced and approved by Sony HQ Japan over a 14-day period. Every daily review cycle met. The European TV line-up launched on schedule.",
    tags: ["Graphic Design"],
  },
  {
    slug: "tiktok-ugc-edits",
    client: "TikTok",
    deliverable: "UGC video editing",
    volume: "1,500+ edits per month",
    turnaround: "Ongoing, weekly delivery",
    outcome: "$20 per video \u2014 300\u2013500 edits per week",
    brief:
      "TikTok buys advertising space in the United States and distributes user-generated content. Before any UGC goes live as paid advertising, it needs compliance editing: brand marks blurred, scenes removed, music replaced. 300\u2013500 videos per week.",
    result: "1,500+ video edits delivered per month, consistently. TikTok\u2019s UGC programme runs on Sarani\u2019s output.",
    headline: "1,500+ Videos. Every Month. Every Week.",
    keyMetric: "$20 per video",
    stats: [
      { label: "Weekly output", value: "300\u2013500" },
      { label: "Monthly total", value: "1,500+" },
      { label: "Price per video", value: "$20" },
    ],
    metaDescription:
      "How Sarani delivers 1,500+ UGC video edits per month for TikTok\u2019s US advertising programme at $20 per video \u2014 compliance editing at scale.",
    subtitle: "TikTok distributes UGC advertising across the US \u2014 Sarani handles the edits, the compliance, the volume.",
    challenge: "TikTok buys advertising space in the United States and distributes user-generated content by content theme. Before any UGC goes live as paid advertising, it needs to be edited for compliance: brand marks blurred, compromising scenes removed, music replaced. Every week. At scale. 300\u2013500 videos per week, ranging from 15 seconds to 2 minutes.\n\nNo traditional post-production house could sustain this volume at this frequency without a dedicated team and a retainer that priced the relationship out of a weekly operational budget.",
    solution: "Sarani became TikTok\u2019s ongoing video editing partner for this programme. Working at $20 per video, with a consistent weekly output of 300\u2013500 edits, the team processed every file through the same compliance workflow: marks blurred, scenes flagged and removed, music cleared and replaced.\n\nThe relay structure \u2014 35+ experts across 5 continents, day and night \u2014 made weekly volume delivery at this scale operationally sustainable. No single timezone dependence. No production bottleneck on Monday morning.",
    resultsDetail: "1,500+ video edits delivered per month, consistently. TikTok\u2019s UGC advertising programme operates on Sarani\u2019s production output every week.",
    tags: ["Video"],
  },
  {
    slug: "tiktok-road-to-paris",
    client: "TikTok",
    deliverable: "Promotional video",
    volume: "1 video, 24 revision rounds",
    turnaround: "2 days (first draft)",
    outcome: "51 million views \u2014 360\u20AC total",
    brief:
      "TikTok needed a promotional video for their #RoadToParis campaign \u2014 a dedicated search engine built for the Paris 2024 Olympic Games. Technically simple, but every detail had to be right.",
    result: "The final video reached 51 million views. Price paid: 360\u20AC.",
    headline: "51 Million Views. 360\u20AC. 2 Days.",
    keyMetric: "51M views for 360\u20AC",
    stats: [
      { label: "Views", value: "51M" },
      { label: "Price", value: "360\u20AC" },
      { label: "Revision rounds", value: "24" },
    ],
    metaDescription:
      "How Sarani produced a promotional video for TikTok\u2019s #RoadToParis campaign that reached 51 million views \u2014 for 360\u20AC with 24 revision rounds included.",
    subtitle: "A simple video to launch TikTok\u2019s Olympic Games search engine \u2014 and the revision process that made it right.",
    challenge: "TikTok needed a promotional video for their #RoadToParis campaign \u2014 a dedicated search engine built for the Paris 2024 Olympic Games. The ask was technically simple: showcase the feature, make it shareable, make it work. The challenge was getting every detail right for a platform as sensitive to execution as TikTok\u2019s own product team.",
    solution: "A first draft was produced in 2 days. From there, TikTok\u2019s team ran 24 rounds of feedback \u2014 adjustments to pacing, transitions, music, text placement, language \u2014 all handled within Sarani\u2019s unlimited revision policy. No additional invoices per round. No negotiation. Every adjustment was absorbed into the 360\u20AC project scope.\n\n24 round-trips. One fixed price.",
    resultsDetail: "The final video reached 51 million views. Price paid: 360\u20AC.",
    tags: ["Video", "2024"],
  },
  {
    slug: "tiktok-comedy-club",
    client: "TikTok",
    deliverable: "Campaign + Social content",
    volume: "Campaign identity + 3 videos + in-app content",
    turnaround: "Campaign duration",
    outcome: "27 million views \u2014 sold out La Cigale \u2014 1,350\u20AC",
    brief:
      "TikTok was launching the world\u2019s first Comedy Club contest in partnership with Redouane Bougheraba. The campaign needed both a strong identity and a full suite of in-app content to drive entries.",
    result: "The contest reached 27 million views. The winner sold out La Cigale in Paris.",
    headline: "27 Million Views. A Full House at La Cigale.",
    keyMetric: "27M views, 1,350\u20AC",
    stats: [
      { label: "Views", value: "27M" },
      { label: "Winner outcome", value: "Sold out La Cigale" },
      { label: "Price", value: "1,350\u20AC" },
    ],
    metaDescription:
      "How Sarani built TikTok\u2019s Comedy Club contest campaign \u2014 27 million views, a sold-out La Cigale, and 3 promotional videos for 1,350\u20AC.",
    subtitle: "The world\u2019s first Comedy Club contest on TikTok \u2014 campaign, content, and 3 promotional videos. 1,350\u20AC.",
    challenge: "TikTok was launching the world\u2019s first Comedy Club contest in partnership with French comedian Redouane Bougheraba. The campaign needed to work across two distinct dimensions simultaneously: a strong campaign identity to establish the contest in users\u2019 feeds, and a full suite of in-app content to drive entries and sustain participation. Three promotional videos. Entry forms. Communication banners. All built to perform on TikTok\u2019s own platform.",
    solution: "Sarani built the campaign identity from scratch and extended it across every asset in the brief. The in-app content was designed for TikTok\u2019s native formats and interaction patterns \u2014 not adapted from other channels. Entry forms and communication banners held the system together at every stage of the funnel.\n\nThree promotional videos were produced to run at different phases of the contest: launch, mid-campaign, and final push. Each one was built for the platform\u2019s pacing expectations and Bougheraba\u2019s existing audience tone.",
    resultsDetail: "The contest reached 27 million views. The winner \u2014 discovered through the TikTok contest \u2014 sold out La Cigale in Paris.",
    tags: ["Social Media"],
  },
  {
    slug: "ikea-summer-tour",
    client: "IKEA",
    deliverable: "Tour creative production",
    volume: "Full creative suite",
    turnaround: "Pre-tour + during tour",
    outcome: "8 cities across France \u2014 truck + campaign + video",
    brief:
      "IKEA\u2019s Summer Tour was a mobile design workshop travelling to 8 cities across France. Three production layers: the physical truck design, the pre-tour promotional campaign, and the video content.",
    result: "The IKEA Summer Tour ran across 8 cities. Every creative layer was produced and delivered.",
    headline: "8 Cities. One Truck. Complete Creative Production.",
    keyMetric: "8 cities, full production",
    stats: [
      { label: "Cities", value: "8" },
      { label: "Scope", value: "Full creative" },
      { label: "Client", value: "IKEA" },
    ],
    metaDescription:
      "How Sarani produced the complete creative suite for IKEA\u2019s Summer Tour across 8 French cities \u2014 truck design, promotional campaign, and video content.",
    subtitle: "IKEA\u2019s Summer Tour across France \u2014 truck design, campaign, promotional materials, and video content. All in.",
    challenge: "IKEA\u2019s Summer Tour was a mobile design workshop travelling to 8 cities across France. The brief had three distinct production layers: the physical truck \u2014 its design and setup, which had to function as both a vehicle and a live workspace; the pre-tour promotional campaign, which needed to build anticipation across every city stop; and the video content to document and promote the mobile workshop experience itself.",
    solution: "Working under Ubi\u2019s project lead, Sarani took on all three layers. The truck design was built to work as a visual installation in each city \u2014 identifiable, on-brand, and self-contained as a workshop space. Promotional materials ran ahead of each stop. The pre-tour campaign was produced for print and digital distribution across the 8 cities.\n\nVideo content captured the workshop experience and the people who came through it \u2014 usable as both real-time social content and a longer-format record of the tour.",
    resultsDetail: "The IKEA Summer Tour ran across 8 cities in France. Every creative layer \u2014 physical, print, digital, video \u2014 was produced and delivered.",
    tags: ["Graphic Design", "Event", "Video"],
  },
];

/** Lookup a case study by slug. Returns undefined if not found. */
export function getCaseStudyBySlug(slug: string): CaseStudy | undefined {
  return caseStudies.find((cs) => cs.slug === slug);
}

/** Get all slugs for generateStaticParams */
export function getAllCaseStudySlugs(): string[] {
  return caseStudies.map((cs) => cs.slug);
}

/** Get related case studies (all except the current one) */
export function getRelatedCaseStudies(currentSlug: string): CaseStudy[] {
  return caseStudies.filter((cs) => cs.slug !== currentSlug);
}
