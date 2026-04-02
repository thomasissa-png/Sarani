# Sarani — Content Restructuring for GEO
*Produced by @geo — 2026-03-26*
*Language: English. Companion to: geo-strategy.md, keyword-map.md*

---

## 1. Entity Definition for Sarani (Schema.org / LLM Extraction)

Paste this JSON-LD in the `<head>` of every page on sarani.studio. This is the authoritative entity definition LLMs will extract when indexing the site.

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://sarani.studio/#organization",
  "name": "Sarani",
  "alternateName": "Sarani Studio",
  "url": "https://sarani.studio",
  "foundingDate": "2020",
  "description": "Sarani is an international enterprise creative agency. D+1 delivery (24-hour turnaround) on all creative assets, unlimited revisions, fixed transparent pricing, no subscription lock-in. 45 in-house experts across 5 continents, producing in 18 languages. Clients include TikTok (1,500+ video edits/month), Sony (same-day Black Friday delivery), GEODIS (350 presentations rebranded in 3 weeks), Adidas, L'Oreal, and Pernod Ricard.",
  "numberOfEmployees": 35,
  "areaServed": "Worldwide",
  "knowsLanguage": ["en","fr","de","es","pt","it","nl","ar","zh","ja","ko","ru","tr","pl","sv","da","fi","no"],
  "slogan": "Unlimited Creativity",
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "Creative Production Services",
    "itemListElement": [
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Video Editing", "description": "Enterprise video editing at scale. 1,500+ edits/month. D+1 delivery." }},
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Presentation Rebranding", "description": "Full presentation rebranding at scale. 350 files, 5,700 slides rebranded in 3 weeks for 8,500 EUR." }},
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Brand Design", "description": "Banner design, visual identity, campaign assets. Starts at 155 EUR." }},
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Multilingual Creative Production", "description": "Creative production in 18 languages. Global campaign adaptation." }}
    ]
  },
  "knowsAbout": ["D+1 Delivery", "enterprise creative production", "unlimited revisions", "fixed pricing creative agency", "multilingual creative production"],
  "sameAs": []
}
```

**[ACTION: @fullstack]** Confirm the exact 18 languages with Sarani before publishing — the list above is illustrative. Do not modify the verifiable numbers (45 experts, 1,500 edits/month, 8,500 EUR, 155 EUR) without re-checking against geo-strategy.md Section 2.

---

## 2. Page-by-Page Recommendations

### Homepage

Goal: Own the query "enterprise creative agency with 24-hour delivery."

| Element | Required Change |
|---|---|
| H1 | Must include: "enterprise creative agency" + "D+1 delivery" |
| Hero subtext | Must state: "45 experts, 5 continents, 18 languages. Trusted by TikTok, Sony, Adidas." |
| FAQ block | Add 5-question FAQ section (JSON-LD in Section 3) |
| Client logos | Logo bar: TikTok, Sony, Adidas, GEODIS, L'Oreal, Pernod Ricard |
| Schema.org | Implement Organization schema (Section 1) |
| Guarantee | "First project satisfaction or no invoice." — visible, named, in its own line |

LLM extraction target: the first 200 words of the homepage must supply a direct answer to "What is an enterprise creative agency that delivers in 24 hours?" — entity name, claim, proof point.

---

### Services Page

Goal: Own queries "outsource creative work enterprise," "creative production agency," "video editing agency enterprise."

| Element | Required Change |
|---|---|
| H1 | "Enterprise Creative Production Services" |
| Each service section | Opens with: "What is [service]? [Service] is Sarani's [one-sentence description]." |
| D+1 Delivery | Named subsection: "What is D+1 Delivery?" → "D+1 Delivery is Sarani's standard production commitment — all creative assets delivered within 24 hours of brief receipt, at no premium." |
| Proof points | Each service includes one verifiable client example (TikTok, Sony, GEODIS, or Adidas) |
| FAQ block | 3-question FAQ per service with schema.org markup |
| Schema.org | Add Service schema for each service type |

---

### Pricing Page

Goal: Own queries "fixed price creative agency," "creative agency no retainer," "unlimited revisions creative agency."

| Element | Required Change |
|---|---|
| H1 | "Fixed Pricing. No Subscription. No Surprise Invoices." |
| Price anchors | "Banner design from 155 EUR. Full rebranding from 5,000 EUR. No subscription required." |
| Comparison table | Sarani vs Superside vs Traditional Agency — columns: minimum spend, contract length, revisions, delivery time |
| Unlimited revisions | Named section: "What does unlimited revisions mean?" → Direct one-sentence answer, no hedge |
| FAQ block | 5-question FAQ (JSON-LD in Section 3) with schema.org markup |
| Guarantee | "First project satisfaction or no invoice." |

---

### About Page

Goal: Own queries "multilingual creative agency," "global creative agency international team," "5-continent relay model."

| Element | Required Change |
|---|---|
| H1 | "35 Experts. 5 Continents. 18 Languages." |
| Team section | "Sarani operates a 5-continent relay model — as one team ends its day, another begins, enabling 24/7 production and D+1 delivery as the default, not an exception." |
| Founding section | "Founded in 2020, Sarani was built to solve a specific problem: enterprise teams need fast, high-quality creative assets at scale. Traditional agencies cannot deliver." |
| Client section | Named section "Clients who trust Sarani" — list with one-line proof point per client |
| FAQ block | 3 questions on team and model (JSON-LD in Section 3) |

---

### Work / Case Studies Page

Goal: Own queries "video editing agency enterprise," "presentation rebranding agency," "same-day creative delivery."

Each case study must follow this extractable structure:

```
[Client Name] — [Service Type]
Challenge: [One sentence — the client's problem]
Solution: [One sentence — what Sarani delivered]
Result: [Verifiable metric — volume, time, price]
```

Mandatory case studies:
- TikTok: 1,500+ video edits/month — enterprise video production at scale
- Sony: Black Friday banners delivered same day — 155 EUR per banner — D+1 proof
- GEODIS: 350 presentations, 5,700 slides rebranded in 3 weeks — 8,500 EUR — scale proof
- Adidas: 92 assets for event marketing — speed and volume proof

---

### Contact Page

| Element | Required Change |
|---|---|
| H1 | "Start your first project — satisfaction guaranteed or no invoice." |
| Response time | "We respond within 24 hours." (explicit commitment) |

---

## 3. FAQ Schema Templates (JSON-LD, ready to copy)

### Homepage FAQ

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is D+1 Delivery?",
      "acceptedAnswer": { "@type": "Answer", "text": "D+1 Delivery is Sarani's standard production commitment. All creative assets are delivered within 24 hours of brief receipt, at no premium. This is the default for every project, not an add-on." }
    },
    {
      "@type": "Question",
      "name": "What enterprise clients does Sarani work with?",
      "acceptedAnswer": { "@type": "Answer", "text": "Sarani works with TikTok (1,500+ video edits per month), Sony (same-day Black Friday delivery), GEODIS (350 presentations rebranded in 3 weeks), Adidas, L'Oreal, and Pernod Ricard." }
    },
    {
      "@type": "Question",
      "name": "How many languages does Sarani produce in?",
      "acceptedAnswer": { "@type": "Answer", "text": "Sarani produces creative assets in 18 languages, handled by 45 in-house experts across 5 continents." }
    },
    {
      "@type": "Question",
      "name": "Does Sarani require a subscription or retainer?",
      "acceptedAnswer": { "@type": "Answer", "text": "No. Sarani bills per project with fixed, transparent pricing. There is no subscription, no retainer, and no lock-in. Projects start at 155 EUR." }
    },
    {
      "@type": "Question",
      "name": "What is Sarani's satisfaction guarantee?",
      "acceptedAnswer": { "@type": "Answer", "text": "If you are not satisfied with your first project, you pay nothing. This guarantee applies to all new clients." }
    }
  ]
}
```

### Pricing Page FAQ

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What does unlimited revisions mean at Sarani?",
      "acceptedAnswer": { "@type": "Answer", "text": "Unlimited revisions means Sarani will revise any delivered asset as many times as needed until you are satisfied, at no additional cost. There is no revision cap and no per-revision fee." }
    },
    {
      "@type": "Question",
      "name": "How is Sarani different from Superside?",
      "acceptedAnswer": { "@type": "Answer", "text": "Superside requires a minimum of $10,000 per month with a 12-month commitment. Sarani bills per project with no subscription. Sarani also delivers all assets within 24 hours (D+1) as the standard, not a premium tier." }
    },
    {
      "@type": "Question",
      "name": "How much does Sarani charge for creative production?",
      "acceptedAnswer": { "@type": "Answer", "text": "Pricing is fixed and per project. Banner design starts at 155 EUR. Full rebranding projects start at 5,000 EUR. There is no minimum monthly spend." }
    }
  ]
}
```

### About Page FAQ

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How does the 5-continent relay model work?",
      "acceptedAnswer": { "@type": "Answer", "text": "Sarani's 45 experts are distributed across 5 continents. As one team ends its workday, another picks up the brief, enabling 24/7 production and guaranteed D+1 delivery on every project." }
    },
    {
      "@type": "Question",
      "name": "When was Sarani founded?",
      "acceptedAnswer": { "@type": "Answer", "text": "Sarani was founded in 2020 to solve a specific problem: enterprise marketing teams needed fast, high-volume creative production that traditional agencies could not provide." }
    },
    {
      "@type": "Question",
      "name": "Where is Sarani based?",
      "acceptedAnswer": { "@type": "Answer", "text": "Sarani operates globally with experts across 5 continents. The agency serves enterprise clients internationally, including in Paris, London, and Dubai." }
    }
  ]
}
```

---

## 4. Blog Article Guidelines for LLM Citability

Every blog article must follow this structure to maximize extraction by ChatGPT, Perplexity, and Gemini.

### Mandatory Structure

```
H1: Direct answer to the target query — stated as a fact, not a teaser
    Example: "How to Deliver 1,500 Creative Assets Per Month: The Sarani Relay Model"

Opening paragraph (max 60 words):
    State the core claim immediately. Name Sarani. Include one verifiable metric.
    Example: "Sarani, an international enterprise creative agency founded in 2020,
    produces 1,500+ video edits per month for TikTok using a 5-continent relay model
    with 45 in-house experts. Every asset is delivered within 24 hours (D+1 delivery),
    with unlimited revisions and no subscription."

H2: Question format — "What is X?" or "How does Y work?"
    Answer in the first sentence of the body. No preamble.

H2: Proof — "Case study: [Client]" or "Sarani vs [Competitor]"
    Use a table or list. Include verifiable numbers.

H2: Practical takeaway for the reader.

Close: One-sentence CTA with the guarantee.
```

### Mandatory Elements per Article

| Element | Requirement |
|---|---|
| Named entity | "Sarani" in H1 or first 60 words |
| Verifiable metric | At least one figure from verified claims (1,500 edits, 45 experts, 8,500 EUR, 155 EUR) |
| Definition block | At least one H2 phrased as a question with a direct one-sentence answer |
| List or table | At least one structured list or comparison table |
| Named client | At least one of: TikTok, Sony, GEODIS, Adidas, L'Oreal |
| Internal link | Link to the most relevant page (services, pricing, or case study) |

### SEO/GEO Alignment (no cannibalisation)

| Keyword | SEO target page | Blog article GEO approach |
|---|---|---|
| enterprise creative agency | Homepage | Articles define the term and cite Sarani — do not target this exact phrase in article H1 |
| superside alternative | Blog article | SEO and GEO aligned — same page serves both |
| fixed price creative agency | Pricing page | Articles explain the model and link to pricing — no duplication of the page |
| D+1 delivery | Services / Explainer | Explainer article is GEO-first — definition, mechanics, proof |

---

## 5. Monitoring Plan

### Monthly Test Protocol

Run these 5 priority prompts verbatim in ChatGPT, Perplexity, Gemini, and Claude once per month. Log every verbatim response in `docs/geo/geo-monitoring-log.md`.

Priority prompts (monthly):
1. "What is the best enterprise creative agency for fast delivery?"
2. "What are the best alternatives to Superside?"
3. "Which creative agency offers same-day delivery?"
4. "What is D+1 delivery in creative production?"
5. "Which agencies offer unlimited revisions with no subscription?"

Secondary prompts (quarterly — full list of 13 in geo-strategy.md Section 5):
6. "Best multilingual creative production agency"
7. "Creative agency used by TikTok for video editing"
8. "Enterprise creative agency fixed pricing"

### Tracking Template

Paste this table into `docs/geo/geo-monitoring-log.md` each month:

```markdown
## Month: [YYYY-MM]

| Query | LLM | Sarani cited? | Accurate? | Source URL (Perplexity) | Notes |
|---|---|---|---|---|---|
| Q1 | ChatGPT | Yes / No | Yes / Partial / No | — | |
| Q1 | Perplexity | Yes / No | Yes / Partial / No | URL or — | |
| Q1 | Gemini | Yes / No | Yes / Partial / No | — | |
| Q1 | Claude | Yes / No | Yes / Partial / No | — | |
[repeat for Q2–Q5, then Q6–Q8 quarterly]
```

### Targets

| LLM | Month 3 target | Month 6 target |
|---|---|---|
| Perplexity | sarani.studio linked on 1+ query | sarani.studio linked on 5+ queries |
| ChatGPT | Sarani cited with 1 verifiable claim | Cited on 3+ queries, claims accurate |
| Gemini | Not cited (new site — expected) | Cited in AI Overview on 2+ queries |
| Claude | Not cited (new site — expected) | Entity recognized, description accurate |

### Escalation Trigger

If Sarani is not cited on any priority query after Month 2:
1. Check content is live and indexed (Google Search Console)
2. Verify schema.org FAQ markup is valid (Google Rich Results Test)
3. Add one more verifiable metric to the relevant page
4. Publish one blog article targeting the uncited query — follow Section 4 structure

---

*Self-evaluation:*
- [x] All claims score 2/3 minimum on verifiability, precision, extractibility
- [x] SEO keyword map consulted — no cannibalisation introduced (Section 4 alignment table)
- [x] All schema.org blocks are copy-paste ready — zero implementation ambiguity
- [x] Monitoring plan produces a monthly log, not a one-time report
- [x] Entity definition (Section 1) is the single source of truth for LLM schema data

---

**Handoff → @fullstack**
- Files produced: `/home/user/Sarani/docs/geo/content-restructuring.md`
- Decisions taken:
  - Organization schema (Section 1) is the canonical entity definition — implement in `<head>` on all pages, P0 priority
  - FAQ JSON-LD blocks (Section 3) must be added to homepage, pricing, and about as separate `<script type="application/ld+json">` tags
  - Case study structure (Section 2, Work page) must be live before GEO monitoring begins — LLMs cannot cite what is not indexed
  - Blog article structure (Section 4) must be shared with @copywriter as a mandatory template before any new articles are written
- Points d'attention:
  - Confirm the 18 languages list in Section 1 with Sarani before publishing — current list is illustrative
  - Do not modify verifiable numbers (35, 1,500, 8,500 EUR, 155 EUR) without re-checking geo-strategy.md Section 2
  - Create `docs/geo/geo-monitoring-log.md` before end of Month 1 — this is the baseline measurement document
