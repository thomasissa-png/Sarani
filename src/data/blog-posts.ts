/**
 * Blog post data — static content for Phase 1 (no CMS).
 * Complements case studies with thought leadership content targeting
 * Sophie (Head of Marketing, enterprise / global brands).
 */

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  /** Structured JSX content — no markdown lib needed for Phase 1 */
  content: string;
  author: string;
  publishedAt: string;
  category: string;
  readTime: string;
  metaTitle: string;
  metaDescription: string;
}

export const blogPosts: BlogPost[] = [
  {
    slug: "why-enterprise-teams-are-leaving-traditional-agencies",
    title: "Why Enterprise Teams Are Leaving Traditional Agencies",
    excerpt:
      "The agency model built for the TV era does not scale for TikTok, programmatic, and always-on content. Enterprise marketing teams are making the switch — here is what is driving it.",
    content: `The traditional agency model was designed for a world where brands ran 4 campaigns per year. A 6-week creative cycle made sense when the output was a hero TVC and a print spread.

That world is gone. Enterprise marketing teams now need 300+ assets per month across TikTok, Meta, programmatic display, email, and retail media. The brief-to-delivery cycle cannot be 6 weeks — it needs to be 24 hours.

**The three breaking points**

1. **Volume mismatch.** Traditional agencies staff projects, not throughput. When Sony needs 125 banners across 15 languages for Black Friday, the agency model requires a new SOW, new timelines, and new negotiations. The campaign window does not wait.

2. **Revision economics.** Most agencies bill revisions as change orders. When TikTok ran 24 rounds of feedback on a single video, the traditional model would have generated 24 invoices. At Sarani, unlimited revisions are included — because creative quality requires iteration, not invoicing.

3. **Timezone dependency.** A Paris-based agency works Paris hours. A brief that lands at 4pm on Thursday is untouched until Monday. With a team spanning 5 continents, the brief keeps moving through the night. D+1 delivery is structural, not aspirational.

**What enterprise teams actually want**

After working with TikTok, Sony, GEODIS, Adidas, and LEGO, the pattern is clear. Enterprise marketing leads do not want a creative partner — they want a creative infrastructure. Predictable pricing. Predictable timelines. Unlimited capacity that scales with their calendar, not against it.

The agencies that survive will be the ones that rebuild around throughput, not presentations. The rest will keep losing pitches to teams that simply deliver faster.`,
    author: "Sarani Team",
    publishedAt: "2025-12-15",
    category: "Thought Leadership",
    readTime: "4 min read",
    metaTitle: "Why Enterprise Teams Are Leaving Traditional Agencies",
    metaDescription:
      "The agency model built for the TV era does not scale for TikTok and always-on content. Here is what is driving enterprise teams to switch to production-first creative partners.",
  },
  {
    slug: "how-we-deliver-1500-creatives-per-month-for-tiktok",
    title: "How We Deliver 1,500+ Creatives Per Month for TikTok",
    excerpt:
      "Behind the scenes of Sarani's highest-volume client relationship: 300-500 video edits per week, $20 per video, zero missed deadlines. Here is how the operation works.",
    content: `TikTok buys advertising space across the United States and distributes user-generated content by theme. Before any UGC goes live as paid advertising, it needs compliance editing: brand marks blurred, scenes removed, music replaced. Every week. At scale.

300-500 videos per week. 1,500+ per month. $20 per video.

**The relay structure**

No single editor handles this volume. No single timezone can sustain it. Sarani operates a relay structure — 35+ experts across 5 continents working in timezone handoff. A brief that lands at 9am in Paris is still being processed at 2am Paris time by a team member in another region.

This is not overtime. It is architecture. The relay means no single person works unsustainable hours, but the production line never stops.

**The compliance workflow**

Every video follows the same process:
- Brand marks identified and blurred
- Compromising scenes flagged and removed per TikTok's guidelines
- Music cleared and replaced with licensed alternatives
- Final QC against the compliance checklist
- Delivery in the required format and resolution

Consistency at this volume requires a system, not talent alone. Each editor works from the same checklist. Every output meets the same standard.

**Why this matters for your brand**

If we can sustain 1,500+ edits per month for one of the most demanding platforms in the world, your 50-asset campaign is not a stretch — it is a Tuesday. The infrastructure exists. The processes are proven. The only variable is your brief.`,
    author: "Sarani Team",
    publishedAt: "2026-01-22",
    category: "Behind the Scenes",
    readTime: "3 min read",
    metaTitle: "How We Deliver 1,500+ Creatives Per Month for TikTok",
    metaDescription:
      "Behind the scenes of Sarani's TikTok operation: 300-500 video edits per week, relay teams across 5 continents, $20 per video. Here is how high-volume creative production works.",
  },
  {
    slug: "fixed-pricing-vs-retainers-what-global-brands-prefer",
    title: "Fixed Pricing vs Retainers: What Global Brands Actually Prefer",
    excerpt:
      "We have worked with both models. After serving TikTok, Sony, and GEODIS, the data is clear — fixed pricing wins for enterprise creative production. Here is why.",
    content: `Every enterprise marketing lead has lived through this: a retainer that looked reasonable in January is 40% over budget by June. Scope creep, change orders, and "out of scope" emails turn a predictable cost into a quarterly negotiation.

After producing thousands of assets for global brands, we have seen both models from the inside. Here is what the data shows.

**The retainer problem**

Retainers promise predictability but deliver the opposite. A $15,000/month retainer sounds fixed — until the agency defines "fixed" as 40 hours of work. Hour 41 is billed at $200. Need a rush delivery? Surcharge. Need a 16th language? New SOW.

GEODIS experienced this firsthand. Their previous agency quoted 80,000 euros and 3 months to rebrand 350 presentations. Sarani delivered 5,700 slides in 3 weeks for 8,500 euros. Same scope. Fixed price. No surprises.

**Why fixed pricing works for enterprise**

1. **Budget certainty.** Sophie in marketing knows exactly what each deliverable costs before approving the brief. No procurement back-and-forth. No surprise invoices in Q3.

2. **Speed alignment.** When the price is fixed, there is no incentive to slow down. Faster delivery is better for both sides. Under a retainer, speed costs extra.

3. **Unlimited revisions included.** TikTok ran 24 revision rounds on a single 360-euro video. Under a retainer model, that video would have cost thousands in change orders. Under fixed pricing, iteration is built into the price.

4. **Scalable without renegotiation.** Need 125 banners instead of 25? Each banner has a fixed price. Multiply and go. No new contract, no new negotiation, no 2-week procurement cycle.

**The bottom line**

Retainers protect the agency. Fixed pricing protects the client. For enterprise teams managing multi-market campaigns with unpredictable volume, fixed pricing removes the friction between "we need this" and "it is done."`,
    author: "Sarani Team",
    publishedAt: "2026-03-05",
    category: "Industry Insights",
    readTime: "4 min read",
    metaTitle: "Fixed Pricing vs Retainers: What Global Brands Actually Prefer",
    metaDescription:
      "Retainers protect agencies. Fixed pricing protects clients. After serving TikTok, Sony, and GEODIS, here is why enterprise teams prefer fixed pricing for creative production.",
  },
];

/** Lookup a blog post by slug. Returns undefined if not found. */
export function getBlogPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug);
}

/** Get all slugs for generateStaticParams */
export function getAllBlogSlugs(): string[] {
  return blogPosts.map((post) => post.slug);
}

/** Get related blog posts (all except the current one) */
export function getRelatedBlogPosts(currentSlug: string): BlogPost[] {
  return blogPosts.filter((post) => post.slug !== currentSlug);
}

/** Format a date string to readable format */
export function formatBlogDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
