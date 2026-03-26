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

After working with TikTok, Sony, GEODIS, Adidas, and Pernod Ricard, the pattern is clear. Enterprise marketing leads do not want a creative partner — they want a creative infrastructure. Predictable pricing. Predictable timelines. Unlimited capacity that scales with their calendar, not against it.

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
      "Behind Sarani's TikTok operation: 300-500 video edits per week, relay teams across 5 continents, $20 per video. How high-volume production works.",
  },
  {
    slug: "how-enterprise-teams-scale-creative-production",
    title: "How Enterprise Teams Scale Creative Production Without Subscription Lock-In",
    excerpt:
      "Most enterprise marketing teams are over-paying for creative capacity they do not always use. Here is how global brands like TikTok, Sony, and GEODIS scale production without committing to a monthly subscription floor.",
    content: `Enterprise marketing teams face a structural contradiction. Their creative volume is unpredictable — Black Friday peaks, product launches, reactive campaigns — but most creative partnerships are priced for predictability. Monthly subscriptions. Annual retainers. Commitments that assume a volume you cannot guarantee.

The result: you either pay for capacity you do not use in slow months, or you scramble for capacity in peak ones.

There is a model that resolves this contradiction. Here is how enterprise teams are using it.

**The problem with subscription pricing at enterprise scale**

Subscription creative services are built for one use case: consistent, high-volume output of similar deliverable types. If you produce 200 social assets every month without exception, a flat monthly fee can be efficient.

Most enterprise marketing teams do not look like that. A campaign for Q4 requires 300 assets across 12 markets. January is quiet. March is reactive — three assets needed in 24 hours for a breaking news moment. June is a product launch with 80 deliverables in two weeks.

Subscription pricing forces you to size your commitment to your peak volume. You pay for that peak every month, including the months you do not need it.

**The per-project model: what enterprise procurement actually wants**

TikTok, Sony, GEODIS, and Pernod Ricard use Sarani on a per-project basis. No subscription. No monthly commitment. No renegotiation when the next campaign is larger or smaller than the last.

Here is what that looks like in practice:

- Sony needed 125 banners across 15 languages for Black Friday. Brief in the morning. Every banner delivered the same day. One invoice: 150€ per banner, fixed. No retainer activated, no SOW renegotiated, no subscription seat resized.

- GEODIS needed 350 presentations rebranded across multiple European markets. Their previous vendor had quoted 80,000€ and 3 months. Sarani delivered 5,700 slides in 3 weeks for 8,500€. Fixed price, confirmed before the first slide was touched.

- TikTok needed 300–500 video edits per week — 1,500+ per month — for compliance and paid distribution. At 20€ per video, the unit economics are transparent. The volume scales with TikTok's calendar, not with a subscription contract.

**What makes per-project pricing work at this volume**

The obvious question: how does a per-project model sustain D+1 delivery at Sony's volume or TikTok's throughput?

The answer is the relay structure. Sarani operates across 5 continents — 35 experts working in timezone handoff. A brief submitted at any hour is active in production immediately. No queue. No waiting for the team to wake up.

This is why D+1 delivery does not require a subscription. The capacity is structural, not reserved. Every project brief triggers the same relay response regardless of whether you briefed yesterday or not for three months.

**Scaling up and scaling down: what procurement actually needs**

Marc in procurement runs into a consistent problem with subscription creative services: the exit. Minimum contract periods. Cancellation clauses. "Strategic alignment" fees baked into the monthly cost regardless of output.

Per-project pricing removes that problem entirely. The commitment ends when the deliverable is approved. The next project starts a new commitment. There is no exit to negotiate because there is no contract to exit.

For enterprise teams building multi-agency creative structures — a brand specialist here, a production partner there, a regional agency for specific markets — per-project pricing makes it simple to route briefs to the most efficient partner without renegotiating seats, tiers, or annual commitments.

**The volume threshold question**

At what volume does per-project pricing become more expensive than a subscription?

That calculation depends on your deliverable mix and revision patterns. For standard social assets and display banners at consistent monthly volume, a subscription can be more economical at scale. For mixed creative with variable volume — which describes most enterprise marketing calendars — per-project pricing eliminates the cost of unused capacity.

TikTok's 1,500+ monthly edits at 20€/video is 30,000€/month. For that volume, a subscription seat might appear cheaper. But TikTok's volume is not guaranteed to be identical month over month — and the per-project model adjusts automatically. No renegotiation when volume drops. No penalty when volume spikes.

**The first project test**

For enterprise teams evaluating a new creative partner, the financial risk of the first project matters. Sarani's guarantee: if you are not satisfied with the first project, there is no invoice.

That guarantee removes the switching cost of evaluation. Start with a single project — a banner, a presentation, a short-form video. D+1 delivery, fixed price, unlimited revisions. If the output is not right, you pay nothing. If it is right, you have a production partner you can brief tomorrow without activating a subscription.

**FAQ**

**How does per-project pricing scale for large campaigns?**

Large campaigns are quoted as a single fixed-price deliverable. GEODIS's 5,700-slide rebrand was 8,500€ confirmed before work began. Sony's 125 banners were 150€ each, quoted as a batch. Volume does not change the pricing model — it changes the total invoice, which is confirmed upfront.

**Does Sarani require a minimum number of projects per month?**

No minimum. TikTok briefs us every week. Other clients brief once a quarter. The model adapts to your calendar, not the other way around.

**How are rush projects handled?**

D+1 delivery is the standard — not a rush premium. A brief submitted at any hour is picked up immediately by the active regional team. There is no expedite fee because speed is built into the relay model, not sold as an upgrade.

**Can Sarani handle multilingual campaigns without additional cost?**

18 languages and 5 continents are structural, not premium. GEODIS's multi-market rebrand was included in the fixed project price. Sony's 15-language Black Friday campaign was quoted per banner, not per language. Multilingual output is what the team is built for.

**What types of creative does Sarani produce?**

Social media assets, display banners, video editing and motion, presentations, brand identity, print materials, and multilingual adaptations. Full scope at sarani.studio/services.`,
    author: "Sarani Team",
    publishedAt: "2026-03-26",
    category: "Agency Model Analysis",
    readTime: "6 min read",
    metaTitle: "How Enterprise Teams Scale Creative Production Without Subscription Lock-In",
    metaDescription:
      "TikTok, Sony, and GEODIS scale creative production without a monthly subscription. Per-project fixed pricing, D+1 delivery, unlimited revisions — here is how the model works.",
  },
  {
    slug: "creative-agency-cost-enterprise-guide",
    title: "How Much Does a Creative Agency Cost? Enterprise Pricing Guide 2026",
    excerpt:
      "From $499/month subscriptions to $500,000+ retainers — creative agency pricing varies by orders of magnitude. Here is what enterprise teams actually pay, and how to evaluate what is worth it.",
    content: `Enterprise marketing teams spend more on creative production than almost any other line in the marketing budget. And yet most of them cannot tell you precisely what they are paying per deliverable, per revision, or per language adaptation.

That opacity is by design. Traditional agencies prefer retainers because retainers obscure the unit economics. This guide breaks it down.

**The five pricing models in the market**

Understanding what a creative agency costs starts with understanding which pricing model you are evaluating.

**1. Traditional agency retainer**
Traditional network agencies typically price on annual retainers. For enterprise clients, retainer agreements range from 50,000€ to 500,000€+ per year, depending on scope, team size, and geography. The retainer covers a defined number of hours per month — anything beyond that is billed as change orders at 150–250€/hour.

The hidden cost: revision cycles, scope extensions, and "strategic meetings" consume a significant portion of the retainer hours before any production work begins.

**2. Subscription design services**
Subscription creative platforms charge a flat monthly fee for unlimited requests within a defined queue. Entry points range from $499/month (SMB tier) to $10,000+/month (enterprise tier).

The hidden cost: if your monthly volume is variable, you pay for capacity you do not use in slow months. Subscription models also typically limit the number of active requests in queue — which creates bottlenecks during campaign peaks.

**3. Per-project fixed pricing**
Fixed pricing per deliverable — a banner at 150€, a video edit at 20€, a full rebranding at 5,000€. No subscription, no retainer, no change orders. You pay for what you order.

This is the model Sarani operates on. It is the only model where the unit economics are fully transparent before you approve the brief.

**4. Freelance / marketplace**
Freelance marketplace platforms offer individual designers at variable rates. Quality and turnaround are inconsistent by nature. For isolated one-off projects, this can be cost-effective. For enterprise-scale production at volume, the coordination overhead and inconsistency negate the per-unit savings.

**5. In-house creative team**
A fully staffed in-house team (3–5 designers, 1–2 video editors, 1 creative director) typically costs 300,000–600,000€/year in salaries, tools, and management overhead. Output is capped by headcount and timezone. In-house teams struggle with peaks, multilingual adaptation, and production volume beyond their staffed capacity.

**What enterprise teams actually pay — real benchmarks**

These figures are drawn from documented Sarani engagements and publicly available competitor pricing. They are not estimates.

| Deliverable | Traditional agency | Subscription service | Sarani fixed price |
| Single display banner | 400–1,200€ | Included in monthly subscription | 150–470€ |
| 125 banners (Black Friday Sony) | 15,000–40,000€ | Monthly subscription ongoing | 150€/banner — Sony's campaign delivered same-day |
| 350 presentations rebranded (GEODIS) | 80,000€ (quoted) | Subscription + overages | 8,500€ (delivered in 3 weeks) |
| Video edit compliance (per video) | 150–400€ | Included in subscription | 20€ |
| 1,500 video edits/month (TikTok) | 225,000–600,000€ | Enterprise subscription tier | 30,000€/month |

The 60% savings figure Sarani documents is not marketing copy — it reflects the gap between traditional agency billing and fixed-price production at volume.

**The revision cost problem**

Most agency pricing discussions ignore revision economics. They should not.

TikTok ran 24 revision rounds on a single video. Under a traditional agency model with change orders at 150€/hour, that iteration cycle would have generated an invoice of 3,600–7,200€ on top of the initial production cost.

Under Sarani's fixed pricing, 24 revisions cost zero additional. Unlimited revisions are included because iteration is part of production, not an exception to it.

Before signing any agency agreement, ask this question: how are revisions billed? If the answer involves hourly rates or "reasonable revisions included," you are in a change-order model. Budget accordingly.

**How to evaluate creative agency costs for enterprise**

Four questions that reveal the real cost of any agency relationship:

1. **What is the per-deliverable cost?** Force the agency to give you a unit price for your 10 most common request types. If they cannot, that is information.

2. **How are revisions billed?** If revisions are capped or billed separately, model the total cost over 6 months including your historical revision rate.

3. **What is the rush delivery cost?** Campaign peaks are predictable. If a 24-hour turnaround doubles the invoice, that cost is structural — not exceptional.

4. **What is the multilingual adaptation cost?** If your campaigns run in 5+ languages, price the per-language cost explicitly. Network agencies often bill multilingual adaptation as a separate project.

**The procurement reality**

Sophie in marketing and Marc in procurement have different questions about the same invoice. Sophie wants quality and speed. Marc wants transparency and defensibility to his CFO.

Fixed pricing answers both questions simultaneously. A 150€ banner is auditable. An "8% of project budget for strategic alignment meetings" is not.

For enterprise teams, the move toward per-project pricing is not about saving money on individual deliverables. It is about removing the negotiation and approval overhead that makes every campaign launch slower than it needs to be.

**FAQ**

**How much does a creative agency cost for enterprise brands?**

Traditional network agencies charge 50,000–500,000€+ per year in retainers. Subscription creative services charge thousands per month regardless of actual volume used. Per-project agencies like Sarani charge per deliverable: a banner starts at 150€, a full rebranding at 5,000€. The right model depends on your volume and procurement structure.

**Is a subscription model cheaper than per-project pricing?**

It depends on your monthly volume. If you consistently need 100+ deliverables per month of the same type, a subscription can be cost-effective. If your volume is variable, per-project pricing eliminates the cost of unused capacity. At Sarani's rates, 1,500 video edits per month costs approximately 30,000€ — and scales down automatically in slower months.

**What is included in Sarani's fixed prices?**

Fixed prices include unlimited revisions, D+1 delivery, and the first-project satisfaction guarantee. There are no change orders, no rush fees, and no additional charges for revisions. The price you see when you approve the brief is the price on the invoice.

**How do traditional agencies justify their higher pricing?**

Traditional agencies charge for strategy, account management, and "relationships." For enterprise brands that need production at scale, those components add cost without proportionally adding value. Sarani's model separates production (what you pay for) from strategy (what you may already have in-house or can buy separately).

**Can Sarani produce for multiple markets simultaneously?**

Yes. 35 experts across 18 languages and 5 continents. GEODIS's 350 presentations were rebranded across multiple European markets simultaneously. TikTok's 1,500+ monthly edits span multiple regional compliance requirements. Multilingual and multi-market production is structural, not a premium add-on.`,
    author: "Sarani Team",
    publishedAt: "2026-03-26",
    category: "Industry Insights",
    readTime: "7 min read",
    metaTitle: "How Much Does a Creative Agency Cost? Enterprise Pricing Guide 2026",
    metaDescription:
      "From $499/month subscriptions to $500,000 retainers — what enterprise teams actually pay for creative production in 2026. Real benchmarks, hidden costs, and a model comparison.",
  },
  {
    slug: "how-24-hour-creative-delivery-works",
    title: "How 24-Hour Creative Delivery Actually Works (Behind the Scenes)",
    excerpt:
      "D+1 delivery sounds like a marketing promise. Here is the operational reality: how 35 experts across 5 continents handle a brief submitted at 11pm and deliver a finished asset by 9am.",
    content: `Every creative agency claims to be fast. Most of them mean "faster than a traditional agency," which is a low bar. D+1 delivery — a finished, revised, production-ready asset within 24 hours of briefing — requires something more specific than speed. It requires architecture.

Here is how it actually works.

**The relay model**

Sarani operates across 5 continents: Europe, North America, South America, Africa, and Asia-Pacific. At any given hour, at least one regional team is in active working hours. This is not time-zone arbitrage — it is coverage design.

When a brief comes in at 11pm Paris time, it is not sitting in a queue until 9am the next morning. It is picked up by the team that is active in that moment. The first version is built while the client sleeps. By the time Sophie opens her inbox, a draft is waiting.

This is D+1 delivery as a structural guarantee, not a case-by-case effort. The relay runs on every brief, every day, including weekends.

**What happens when a brief arrives**

The sequence is consistent regardless of deliverable type:

1. **Brief intake and assignment** — The brief is logged, categorized by deliverable type (banner, video edit, presentation, etc.), and assigned to the active region. Assignment takes minutes, not hours.

2. **First version production** — The assigned team member builds the first version against the brief and the client's brand guidelines. No interpretation gaps — brand assets are stored in the client file and referenced at every step.

3. **Internal QC** — Before delivery, a second team member reviews against the brief. The goal is to catch misalignments before the client sees them, not after. Quality control is a production step, not an afterthought.

4. **First delivery** — The first version is delivered to the client, typically within the first 12 hours. For complex deliverables, it may be 18–20 hours. For simple banners, it can be 4–6 hours.

5. **Revision cycle** — The client reviews and requests revisions. Revisions are handled by the active region at the time of the feedback — no waiting for "the team" to reconvene Monday morning. Unlimited revisions are included in the fixed price.

6. **Final delivery** — Production-ready files in the required formats and dimensions.

**The Sony Black Friday case**

Sony needed 125 banners across 15 languages for Black Friday. The brief arrived in the morning. Every banner was delivered the same day.

That is not a one-time exception — it is the relay model in action at scale. 125 deliverables across 15 languages in one working day requires more than fast designers. It requires a system where multiple team members work in parallel on the same brief, with consistent brand guidelines and format specs accessible to every contributor.

The per-banner cost was 150€. Total project: under 20,000€, delivered same-day. A traditional agency would have quoted 3 weeks and 3x the budget.

**What D+1 does not mean**

D+1 delivery does not mean the first version will be perfect. It means the first version will be in your inbox within 24 hours, ready for your review and feedback.

The revision cycle is where quality is achieved. Sarani's model separates first delivery speed from final quality — the relay ensures you always have something to react to, and unlimited revisions ensure you can iterate to the right result without additional cost.

This distinction matters for enterprise teams. Campaign calendars are tight. Having a first version in 24 hours means you have a reaction surface immediately — not a status update and a promise.

**GEODIS: 5,700 slides in 3 weeks**

GEODIS needed 350 presentations rebranded across multiple markets. Their previous agency had quoted 80,000€ and 3 months.

Sarani delivered 5,700 slides in 3 weeks for 8,500€. The speed came from the relay model — multiple team members working simultaneously on different sections, with centralized brand guidelines ensuring consistency across the output.

3 weeks is longer than 24 hours. But the D+1 principle applies to each individual deliverable within a large project: each batch of slides was delivered in sequence, allowing GEODIS to review and approve in parallel rather than waiting for a final dump at the end of week 12.

**Why most agencies cannot do this**

Traditional agencies are staffed for project capacity, not throughput. A senior designer at a Paris agency works Paris hours. A brief at 4pm Thursday is untouched until Monday. Revisions are scheduled between other client commitments.

This is not a criticism — it is a structural reality. Agency staffing models optimize for quality of individual projects. The relay model optimizes for consistent output at volume across any time window.

Subscription creative services have partially addressed the timezone problem with distributed teams. The difference is the commercial model: a subscription creates a queue. A per-project model creates urgency — every brief is a commitment, not a position in a queue.

**What you need to make D+1 work**

D+1 delivery is fast on our end. It requires one thing from yours: a complete brief.

A complete brief means: deliverable type and format, dimensions or specs, brand guidelines or a reference to your client file, key message and copy (if copy-dependent), and any mandatory elements (logos, legal disclaimers, language).

An incomplete brief generates a clarification round before production starts. That clarification round is the most common reason a D+1 delivery becomes a D+2. The brief is the rate-limiting step — not the production.

**FAQ**

**Does 24-hour delivery apply to all project types?**

D+1 is the standard for most deliverable types: banners, social assets, video edits, presentations, and short-form creative. Complex brand identity projects or campaigns requiring strategic input may have longer initial turnaround — but each deliverable within the project follows the D+1 principle once the brief is confirmed.

**What happens if the first version is not right?**

You request revisions. Revisions are handled by the active regional team at the time of your feedback — there is no waiting for a team meeting or a weekly check-in. Unlimited revisions are included in the fixed price.

**Can Sarani handle urgent briefs submitted on weekends?**

Yes. The relay model operates 7 days a week. A brief submitted Friday evening will have a first version ready Saturday morning. There is no weekend surcharge.

**How does the brand brief process work for new clients?**

New clients complete a brand intake — logo files, brand guidelines, color codes, approved fonts, and any mandatory usage rules. This is stored in your client file and referenced by every team member on every project. You brief once; the brand guidelines live permanently in the system.

**Is D+1 delivery included at every price point?**

Yes. D+1 delivery is structural — it is not a premium tier. A 150€ banner has the same delivery standard as a 5,000€ rebranding project.`,
    author: "Sarani Team",
    publishedAt: "2026-03-26",
    category: "Behind the Scenes",
    readTime: "6 min read",
    metaTitle: "How 24-Hour Creative Delivery Works — Behind the Scenes at Sarani",
    metaDescription:
      "D+1 delivery is not a marketing promise — it is an operational system. 35 experts, 5 continents, timezone relay. Here is exactly how a brief at 11pm becomes an asset by 9am.",
  },
  {
    slug: "fixed-price-vs-subscription-creative-agency",
    title: "Fixed Price vs Subscription Creative Agency: Which Model Fits Enterprise?",
    excerpt:
      "Subscription creative services promise unlimited output for a flat monthly fee. Fixed-price agencies charge per deliverable. After working with TikTok, Sony, and GEODIS, here is what the data shows about which model serves enterprise teams better.",
    content: `The creative agency market has split into two distinct models. On one side: subscription services that charge a flat monthly fee for unlimited creative requests. On the other: per-project agencies that charge a fixed price per deliverable.

Both models have genuine advantages. The right choice depends on the specifics of your procurement structure, campaign calendar, and volume patterns — not on which model has better marketing.

**How subscription creative agencies work**

Subscription models charge a recurring monthly fee — ranging from $499/month (SMB tier) to $10,000+/month (enterprise tier) — in exchange for access to a creative team that works through a queue of your requests.

The core proposition: predictable monthly cost, no per-project negotiation, and theoretically unlimited creative output.

The operational reality: subscription queues have capacity limits. Most services limit active requests in queue (typically 1–2 at a time on standard plans). Campaign peaks — the moments when enterprise teams need the most output — are precisely when subscription queues create bottlenecks.

**How fixed-price creative agencies work**

Per-project pricing charges a defined amount per deliverable type. A banner is 150€. A video edit is 20€. A presentation rebrand is 8,500€. You pay when you order. There is no monthly minimum, no commitment, and no unused capacity.

The core proposition: complete cost transparency, no lock-in, and pricing that scales proportionally to actual volume.

The operational reality: fixed pricing requires the agency to be efficient. If the price is fixed and revisions are unlimited, the agency must either be fast enough that revision cycles are short, or confident enough in its quality that revisions are few. Sarani's D+1 model and relay team structure are the operational answer to this constraint.

**The volume break-even analysis**

At what monthly volume does a subscription become more economical than fixed pricing?

Using Sarani's rates as the fixed-price baseline:

| Monthly volume | Sarani fixed price | Subscription service ($10K/month tier) | Break-even |
| 50 banners | 7,750€ | 10,000€ | Sarani cheaper |
| 100 banners | 15,500€ | 10,000€ | Subscription cheaper |
| 500 video edits | 10,000€ | 10,000€ | Equal |
| 1,500 video edits | 30,000€ | 10,000€ (1 seat) | Subscription cheaper |

The break-even point depends entirely on deliverable type and volume. For high-volume video editing at consistent monthly levels, a subscription makes mathematical sense at scale. For mixed creative at moderate volume — which describes most enterprise marketing teams outside pure content-production operations — per-project pricing is more economical.

**The procurement argument**

Marc in procurement sees the two models differently from Sophie in marketing.

A $10,000/month subscription is a recurring operational expense. It needs annual budget approval, a vendor contract, and a justification that assumes a minimum volume that validates the cost. If the following year's campaign plan changes, the subscription cost stays fixed.

A per-project invoice is a variable expense tied directly to output. It is auditable at the deliverable level. A 150€ banner invoice answers its own procurement question: one banner, 150 euros, delivered in 24 hours. There is no contract to renegotiate, no unused capacity to explain, and no exit process if the relationship is not working.

For enterprises with formal procurement cycles, per-project pricing removes approximately 3–4 weeks of annual contract administration per creative vendor.

**When a subscription makes sense**

Three scenarios where a subscription model is the rational choice:

1. **Consistently high volume with predictable output types.** If you need 200+ deliverables per month of the same type (social assets, display banners), a subscription tier calibrated to that volume is more economical than per-project rates.

2. **Teams that cannot manage per-project approval cycles.** Some procurement structures require a PO for every invoice. If your internal process makes frequent per-project invoices operationally difficult, a monthly subscription simplifies administration.

3. **Long-term brand continuity without handoff overhead.** Subscription teams learn your brand over time. For organizations that change creative partners frequently and lose institutional knowledge each time, a subscription with a dedicated team has retention value.

**When fixed pricing makes more sense**

Three scenarios where per-project pricing is the rational choice:

1. **Variable volume with unpredictable campaign calendars.** If some months require 200 deliverables and others require 20, per-project pricing means you pay for what you use — no subscription floor to justify in slow months.

2. **Enterprise trial or vendor diversification.** Before committing to a subscription, a fixed-price project lets you evaluate quality, communication, and turnaround without a monthly commitment. First project satisfaction or no invoice removes the risk entirely.

3. **Multi-agency structure.** Many enterprise teams work with multiple creative partners simultaneously — a specialist for brand, a generalist for production, a regional partner for specific markets. Fixed pricing makes it simple to route specific project types to the most efficient partner without renegotiating subscription tiers.

**The revision economics**

Both models claim unlimited revisions. The economics behind that claim differ.

Under a subscription, unlimited revisions are included — but revision cycles consume queue capacity. If you run 24 revision rounds on a single video (as TikTok did), you are using queue slots that could otherwise be processing new briefs. High revision cycles on a subscription create a throughput problem.

Under fixed pricing, unlimited revisions have a different economic logic. The price is set at the deliverable level. Revision efficiency incentivizes the agency to deliver quality on the first version, because unlimited revisions at a fixed price reward iteration, not just speed. The agency that cannot deliver quality in 2–3 revision cycles loses the economics on every project.

**The model Sarani chose, and why**

Sarani operates on fixed pricing because it is the only model where the interests of the agency and the client are fully aligned. Fixed price means: we get paid when you approve the brief, and we do not get paid again until the next project. That structure creates one incentive — quality and speed on every deliverable, not volume management and queue optimization.

For enterprise teams evaluating creative partners, the model choice signals something about the agency's operational confidence. A subscription agency bets on your inertia. A fixed-price agency bets on its own output.

**FAQ**

**Can I switch from a subscription to per-project pricing mid-contract?**

That depends on your current subscription agreement. Most subscription services have minimum contract periods (typically 3–12 months). Sarani requires no minimum commitment — you can start with a single project and continue at whatever volume fits your calendar.

**Does Sarani offer subscription pricing for high-volume clients?**

Not as a default model. For clients with consistently high monthly volume, custom pricing arrangements can be discussed. Contact Sarani's team to discuss volume structures for 100+ deliverables per month.

**How does fixed pricing handle rush orders?**

D+1 delivery is standard at Sarani — it is not a rush premium. A brief submitted in the morning is delivered the following morning as a default. There is no expedite fee because speed is built into the model.

**What happens if I need more revisions than expected?**

Unlimited revisions are included in every fixed price. There is no cap, no additional charge, and no conversation about "reasonable revisions." You iterate until the deliverable is right.

**Is fixed pricing available for large-scale projects?**

Yes. GEODIS's 5,700-slide rebrand was delivered at a fixed price of 8,500€. Large projects are quoted as a single fixed-price deliverable, not as an hourly estimate. The fixed price is confirmed before work begins.`,
    author: "Sarani Team",
    publishedAt: "2026-03-26",
    category: "Industry Insights",
    readTime: "7 min read",
    metaTitle: "Fixed Price vs Subscription Creative Agency: Which Model Fits Enterprise?",
    metaDescription:
      "Subscription creative services charge a monthly flat fee. Fixed-price agencies charge per deliverable. After serving TikTok, Sony, and GEODIS — here is which model fits enterprise teams.",
  },
  {
    slug: "fixed-pricing-vs-retainers-what-global-brands-prefer",
    title: "Fixed Pricing vs Retainers: What Global Brands Actually Prefer",
    excerpt:
      "Retainers promise predictability but deliver scope creep. After serving TikTok, Sony, and GEODIS, the data is clear — fixed pricing wins for enterprise creative production. Here is why.",
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

Retainers protect the agency. Fixed pricing protects the client. For enterprise teams managing multi-market campaigns with unpredictable volume, fixed pricing removes the friction between "we need this" and "it is done."

**FAQ**

**Is fixed pricing really cheaper than a retainer for enterprise?**

It depends on your volume pattern. GEODIS saved over 90% compared to their previous retainer quote — 8,500€ vs 80,000€ for 350 presentations. For teams with variable monthly volume, fixed pricing eliminates the cost of unused capacity. For teams with constant high volume, the math is worth running — but the transparency advantage remains.

**How does Sarani handle revisions under fixed pricing?**

Unlimited revisions are included in every fixed price. TikTok ran 24 revision rounds on a single 360€ video — no additional charge. The price you approve at briefing is the price on the invoice, regardless of how many iterations the creative requires.

**Can fixed pricing scale for large campaigns?**

Yes. Sony needed 125 banners across 15 languages for Black Friday. Each banner was priced at 150€, delivered same-day. The model scales by multiplying units, not by renegotiating contracts. Large projects are quoted as a single fixed-price deliverable, confirmed before work begins.

**What if the first project is not up to standard?**

First project satisfaction or no invoice. If the output does not meet your expectations, there is no charge. That guarantee removes the switching cost of evaluating a new creative partner.`,
    author: "Sarani Team",
    publishedAt: "2026-03-05",
    category: "Industry Insights",
    readTime: "5 min read",
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

/** Get unique blog categories (preserves insertion order) */
export function getBlogCategories(): string[] {
  return [...new Set(blogPosts.map((post) => post.category))];
}

/** Get related blog posts — same category first, max 2 */
export function getRelatedBlogPosts(currentSlug: string): BlogPost[] {
  const current = blogPosts.find((post) => post.slug === currentSlug);
  if (!current) return [];

  const others = blogPosts.filter((post) => post.slug !== currentSlug);
  const sameCategory = others.filter(
    (post) => post.category === current.category
  );
  const differentCategory = others.filter(
    (post) => post.category !== current.category
  );

  return [...sameCategory, ...differentCategory].slice(0, 2);
}

/** Format a date string to readable format */
export function formatBlogDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
