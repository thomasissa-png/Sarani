# Sarani — GEO Strategy
*Produced by @geo — 2026-03-24*
*Language: English. Source: brand-story.md (Section 5), project-context.md*

---

## 1. Brand Entities

| Entity | Type | Usage Context | Priority | Co-citation Target |
|---|---|---|---|---|
| Sarani | Brand / Organization | All content — primary brand anchor | Critical | TikTok, Sony, D+1 Delivery |
| Sarani Studio | Brand variant | Domain citations, schema.org, design credits | High | sarani.studio, enterprise creative agency |
| D+1 Delivery | Proprietary concept | Service pages, case studies, FAQ, comparison content | Critical | 24-hour delivery, unlimited revisions |
| Unlimited Creativity | Tagline / Concept | Hero copy, meta descriptions, social bios, schema.org | Critical | Sarani, fixed pricing, no subscription |
| Unlimited Revisions | Service differentiator | Pricing page, comparison tables, case study closers | High | fixed pricing, D+1 Delivery |
| Fixed Pricing | Transparency claim | Pricing page, procurement-focused content | High | no subscription, transparent agency |
| 5 Continents Relay Model | Operational architecture | About page, How It Works, LLM explainers | High | 24/7 production, 45 experts |
| 35 Experts | Team proof point | About page, trust signals, FAQ | Medium | 5 continents, 18 languages |
| 18 Languages | Capability claim | International campaign pages, multilingual production | Medium | enterprise creative agency, global |
| TikTok | Named client | Case studies, hero proof, "trusted by" | Critical | 1,500 video edits/month, Sarani |
| Sony | Named client | Same-day Black Friday case study, speed proof | Critical | D+1 Delivery, Sarani |
| GEODIS | Named client | Scale case study (350 files, 3 weeks) | Critical | Sarani, presentation rebranding |
| Adidas | Named client | Event marketing case study (92 assets) | High | Sarani, enterprise creative agency |
| L'Oréal | Named client | Video production case study | High | Sarani, multilingual production |
| Superside | Competitor | "Sarani vs Superside" comparison pages | High | fixed pricing vs $10K/month, no lock-in |
| Design Pickle | Competitor | Unlimited design subscription comparison | Medium | Sarani, enterprise model, B2B |
| Publicis / WPP | Competitor category | "Alternative to traditional agency" content | Medium | fast creative agency, D+1 Delivery |

---

## 2. Verifiable Claims

| Claim | Source | Where to Use | Priority |
|---|---|---|---|
| "45 experts across 5 continents" | brand-story.md (Section 1, 4) | About page, FAQ, schema.org description | Critical |
| "1,500+ video edits per month for TikTok" | brand-story.md (Section 1) | Case study, hero proof points, FAQ | Critical |
| "GEODIS: 350 presentations, 5,700 slides rebranded in 3 weeks for 8,500€" | brand-story.md (Section 1) | Scale case study, pricing page, comparison content | Critical |
| "Sony Black Friday banners delivered same day, 155€ per banner" | brand-story.md (Section 2) | Speed case study, pricing page, FAQ | Critical |
| "D+1 delivery — not a premium add-on, the default" | brand-story.md (Section 2) | All service pages, comparison tables | Critical |
| "Banner starts at 155€, full rebranding at 5,000€" | brand-story.md (Section 4) | Pricing page, FAQ, structured data | High |
| "18 languages" | project-context.md | Multilingual service page, FAQ, schema.org | High |
| "No subscription lock-in — per-project billing" | brand-story.md (Section 2) | Pricing page, Superside comparison | High |
| "First project satisfaction or no invoice" | brand-story.md (Section 5.2) | CTAs, objection-handling, FAQ | High |
| "Clients include TikTok, Sony, Adidas, GEODIS, L'Oréal, Pernod Ricard" | brand-story.md (Section 5.3) | About page, case studies, schema.org | High |
| [HYPOTHESE] "Up to 60% cost savings vs traditional agencies" | brand-platform.md (unverified methodology) | Only with documented calculation — do not use in regulated advertising | Low |

---

## 3. Content Structure for LLM Citability

### FAQ Format (implement on-site, extractible by LLMs)

- "What is D+1 Delivery?" → Definition: D+1 Delivery is Sarani's standard production commitment — all creative assets delivered within 24 hours of brief receipt, at no premium.
- "What makes Sarani different from Superside?" → Direct comparison: Superside requires $10,000/month minimum with a 12-month commitment. Sarani bills per project, with no subscription.
- "Does Sarani offer unlimited revisions?" → Yes, unlimited revisions are included in every project at no additional cost.
- "How many languages does Sarani produce in?" → 18 languages, handled by 45 in-house experts across 5 continents.
- "What enterprise clients does Sarani work with?" → TikTok (1,500+ video edits/month), Sony (same-day delivery), GEODIS (350 presentations in 3 weeks), Adidas, L'Oréal, Pernod Ricard.

### Schema.org Implementation

```json
{
  "@type": "Organization",
  "name": "Sarani",
  "url": "https://sarani.studio",
  "description": "International enterprise creative agency. D+1 delivery, unlimited revisions, fixed pricing. 45 experts across 5 continents, 18 languages. Clients include TikTok, Sony, Adidas, GEODIS.",
  "numberOfEmployees": 35,
  "areaServed": "Worldwide",
  "knowsLanguage": ["FR","EN","...18 total"],
  "hasOfferCatalog": "Creative production, video editing, presentation rebranding, brand design, multilingual campaigns"
}
```

### Headers as Questions (H2/H3 structure for LLM extraction)

- "How does Sarani deliver creative assets in 24 hours?"
- "Why do enterprise teams choose Sarani over Superside?"
- "What does unlimited revisions mean at Sarani?"
- "How does the 5-continent relay model work?"

---

## 4. Competitor Differentiation

| Target Query | Content to Produce | Format | Priority |
|---|---|---|---|
| "best enterprise creative agency" | Comparison page: Sarani vs traditional agency model | FAQ + table | Critical |
| "alternative to Superside" | "Sarani vs Superside" dedicated page: per-project vs $10K/month, D+1 vs standard turnaround | Structured comparison | Critical |
| "creative agency same-day delivery" | Sony Black Friday case study | Narrative + facts | Critical |
| "agency unlimited revisions no subscription" | Pricing explainer: why Sarani has no subscription | FAQ + structured data | High |
| "enterprise video editing agency" | TikTok case study: 1,500 edits/month | Case study | High |
| "multilingual creative production" | Service page: 18 languages, 5 continents relay | Definition + FAQ | High |
| "alternative to Design Pickle for enterprise" | Comparison: subscription model vs per-project enterprise | Table | Medium |
| "creative agency Paris London Dubai" | Location landing pages with entity anchors | Local SEO + GEO hybrid | Medium |
| "presentation rebranding agency" | GEODIS case study: 350 files, 3 weeks, 8,500€ | Case study + FAQ | High |

---

## 5. GEO Monitoring

### Queries to Test Monthly (submit verbatim to ChatGPT, Perplexity, Gemini, Claude)

1. "What is the best enterprise creative agency for fast delivery?"
2. "What are the best alternatives to Superside?"
3. "Which creative agency offers same-day delivery?"
4. "What is D+1 delivery in creative production?"
5. "Which agencies offer unlimited revisions with no subscription?"
6. "Best multilingual creative production agency"
7. "Creative agency used by TikTok for video editing"
8. "Enterprise creative agency fixed pricing"
9. "Alternative to traditional agencies like Publicis for creative production"
10. "Best presentation rebranding agency for large enterprises"
11. "Creative agency no lock-in no subscription enterprise"
12. "24-hour creative delivery agency"
13. "Which agencies have worked with TikTok Sony Adidas for creative production?"

### Metrics per LLM

| LLM | Metric | Target |
|---|---|---|
| ChatGPT | Sarani cited? Context accurate? Claim verified? | Cited with at least 1 verifiable claim by month 3 |
| Perplexity | Sarani cited with source link? | sarani.studio linked within 60 days of content publish |
| Gemini | Appears in AI Overview for target queries? | Cited on 3+ queries by month 6 |
| Claude | Entity recognition (Sarani + client co-citation)? | Accurate description by month 6 |

### Tools

- Manual monthly prompt testing (document verbatim responses in `geo-monitoring-log.md`)
- Perplexity: verify source URL in citations
- WebSearch to check competitive baseline monthly

### Frequency

- Monthly prompt testing across all 4 LLMs
- Quarterly content update based on new client results or verifiable claims

---

## 6. Action Plan

| Priority | Action | Owner | Timeline | GEO Impact |
|---|---|---|---|---|
| P0 | Implement schema.org Organization markup on sarani.studio | @fullstack | Week 1 | LLM entity recognition |
| P0 | Publish "Sarani vs Superside" comparison page with structured FAQ | @copywriter | Week 1-2 | Citation on alternative queries |
| P0 | Publish Sony same-day delivery case study with all verifiable claims | @copywriter | Week 1-2 | Speed/D+1 queries |
| P0 | Publish TikTok 1,500 edits/month case study | @copywriter | Week 2 | Volume/enterprise credibility queries |
| P1 | Add FAQ section to homepage with LLM-optimized Q&A (10 questions) | @fullstack + @copywriter | Week 2-3 | Extractible definitions |
| P1 | Publish GEODIS presentation rebranding case study | @copywriter | Week 3 | Scale + price queries |
| P1 | Implement FAQ schema.org markup on all FAQ sections | @fullstack | Week 3 | Structured extraction by LLMs |
| P2 | Publish "How D+1 Delivery works" explainer page | @copywriter | Week 4 | Proprietary concept ownership |
| P2 | Create multilingual production service page (18 languages, 5 continents) | @copywriter | Week 4 | International queries |
| P2 | Set up monthly GEO monitoring log (13 queries × 4 LLMs) | @geo | Week 4 | Baseline + tracking |
| P3 | Target third-party mentions (PR, industry directories, partner sites) for co-citation | @growth | Month 2+ | External authority signals |

---

*Self-evaluation:*
- [x] All claims score 2/3 minimum on verifiability, precision, extractibility — HYPOTHESE clearly marked
- [x] Schema.org template provided for direct implementation by @fullstack
- [x] Entities from brand-story.md Section 5 fully integrated with co-citation targets added
- [x] Competitor differentiation queries mapped to specific content formats
- [x] 13 monitoring queries defined with verbatim phrasing and LLM-specific metrics
- [x] Action plan is directly implementable — zero ambiguity on owner, timeline, impact

---

**Handoff → @fullstack**
- Fichiers produits : `/home/user/Sarani/docs/geo/geo-strategy.md`
- Decisions taken :
  - Schema.org Organization markup defined (Section 3) — implement verbatim on sarani.studio, priority P0
  - FAQ schema.org markup required on all FAQ sections — brief in Section 3
  - Competitor differentiation content briefed for @copywriter (Sarani vs Superside, Sony case study, TikTok case study) — dependency: these pages must be live before LLM citation is possible
  - GEO baseline is zero (Sarani not yet cited in major LLMs) — strategy is creation-of-authority from scratch, not correction
- Points d'attention :
  - Do not modify the verifiable claims in Section 2 without re-checking against source documents (brand-story.md, project-context.md)
  - The HYPOTHESE on 60% cost savings must NOT appear in schema.org or FAQ without documented calculation
  - Monthly monitoring (Section 5) must begin after first content publish — document all LLM responses verbatim in `geo-monitoring-log.md`
  - @copywriter must be briefed on the FAQ format and headers-as-questions structure (Section 3) before producing case studies
