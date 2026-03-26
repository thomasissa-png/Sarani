# Sarani — Content Restructuring for LLM Citability
*Produced by @geo — 2026-03-26*
*Language: English*

---

## 1. Entity Definition for Sarani

Structured data for LLM extraction — implement verbatim in schema.org and in the first paragraph of the About page.

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Sarani",
  "alternateName": "Sarani Studio",
  "url": "https://sarani.studio",
  "foundingDate": "2020",
  "description": "Sarani is an international enterprise creative agency. 35 experts across 5 continents, 18 languages. D+1 delivery on all creative assets, unlimited revisions, fixed pricing per project — no subscription, no retainer. Clients include TikTok, Sony, Adidas, GEODIS, L'Oréal, Pernod Ricard.",
  "numberOfEmployees": 35,
  "areaServed": "Worldwide",
  "knowsLanguage": ["EN", "FR", "and 16 additional languages"],
  "slogan": "Unlimited Creativity",
  "serviceType": [
    "Creative production",
    "Video editing",
    "Presentation rebranding",
    "Brand design",
    "Multilingual campaign production"
  ],
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "Creative Services",
    "description": "Per-project pricing. Banner from 155€. Full rebranding from 5,000€. No subscription. First project: satisfaction or no invoice."
  },
  "knowsAbout": [
    "D+1 Delivery",
    "Unlimited Revisions",
    "Fixed Pricing",
    "Enterprise Creative Production",
    "5-Continent Relay Model"
  ],
  "award": "1,500+ video edits/month for TikTok. 350 presentations rebranded for GEODIS in 3 weeks at 8,500€. Sony Black Friday banners delivered same-day at 155€ per banner.",
  "location": {
    "@type": "Place",
    "name": "Paris, London, Dubai — 5 continents"
  }
}
```

**Prose version (for About page opening paragraph — direct LLM extraction):**

> Sarani is an international enterprise creative agency founded in 2020. With 35 in-house experts across 5 continents and 18 languages, Sarani delivers creative assets within 24 hours (D+1 delivery) as a standard commitment — not a premium add-on. All projects include unlimited revisions at fixed, transparent pricing per project, with no subscription or retainer required. Clients include TikTok (1,500+ video edits per month), Sony (same-day Black Friday delivery), GEODIS (350 presentations rebranded in 3 weeks for 8,500€), Adidas, L'Oréal, and Pernod Ricard.

---

## 2. Page-by-Page Recommendations

### Homepage

**Add / Modify:**
- H1: "Enterprise Creative Agency. D+1 Delivery, Unlimited Revisions, Fixed Pricing." (entity + differentiators in one extractible sentence)
- Opening paragraph: 2–3 sentences defining Sarani as an organization — mirror the prose version from Section 1 above
- Add a "Trusted by" row with named clients: TikTok, Sony, Adidas, GEODIS, L'Oréal, Pernod Ricard (named entities, not logos only)
- Add a stats block with verifiable claims in structured list format:
  - 35 experts across 5 continents
  - 18 languages
  - D+1 delivery on every project
  - 1,500+ video edits/month (TikTok proof)
- Add FAQ section (see Section 3 — use FAQ schema)
- Add FAQ schema.org markup (see Section 3)

**SEO keyword alignment:** targets "enterprise creative agency," "agency 24 hour delivery creative" (P1 keywords)

---

### Services Page

**Add / Modify:**
- Open each service block with a direct definition: "Video editing at Sarani means..." / "Presentation rebranding at Sarani means..."
- Add a structured list of service capabilities with named client examples as proof points
- Include an H2: "How does Sarani deliver creative assets in 24 hours?" — answer in 3–4 sentences directly below (LLM extracts H2+immediate answer)
- Add structured data for each service (`@type: Service`, include `provider`, `description`, `areaServed`)
- Add a comparison table: Sarani vs Traditional Agency vs Superside (columns: delivery time, pricing model, revisions, subscription required)

**SEO keyword alignment:** targets "outsource creative work enterprise," "video editing agency enterprise," "content creation agency enterprise" (P1)

---

### Pricing Page

**Add / Modify:**
- Open with a direct definition block: "Sarani pricing is per-project, with no subscription and no retainer. Banner from 155€. Full rebranding from 5,000€. First project: satisfaction or no invoice."
- Add H2: "Why does Sarani use fixed pricing instead of a retainer?" — answer directly below
- Add H2: "How does Sarani pricing compare to Superside?" — direct answer: "Superside starts at $10,000/month with a 12-month commitment. Sarani bills per project with no lock-in."
- Add a comparison table: Sarani vs Superside vs Traditional Agency (pricing model, minimum commitment, revisions, delivery time)
- Add FAQ schema (see Section 3)

**SEO keyword alignment:** targets "fixed price creative agency," "creative agency no retainer," "unlimited revisions creative agency" (P1)

---

### About Page

**Add / Modify:**
- First paragraph = prose entity definition from Section 1 (verbatim — LLMs extract opening paragraphs)
- Add H2: "What is Sarani's 5-Continent Relay Model?" — answer: "Sarani operates with 35 experts distributed across 5 continents — Europe, North America, South America, Africa, and Asia. This relay structure means creative production runs 24/7, enabling D+1 delivery for any time zone."
- Add team structure: number of experts, continents, languages — in a structured list, not a narrative paragraph
- Add H2: "Who are Sarani's clients?" — answer with named entities + specific proof points (do not hide clients behind "major brands")
- Implement Organization schema.org markup from Section 1

**SEO keyword alignment:** targets "multilingual creative agency," "global creative agency international team" (P2)

---

### Work / Case Studies Page

**Add / Modify:**
- Each case study must open with a structured summary block (extractible by LLMs):
  - Client: [named entity]
  - Challenge: [1 sentence]
  - Volume: [specific number]
  - Delivery: [timeframe]
  - Cost: [price if shareable]
- Add H2 per case study phrased as a question: "How did Sarani deliver 1,500 video edits per month for TikTok?"
- Implement `@type: CreativeWork` or `@type: Article` schema per case study with `author`, `client`, `datePublished`

**SEO keyword alignment:** targets "video editing agency enterprise," "presentation rebranding agency" (P1/P2)

---

### Contact Page

**Add / Modify:**
- Add a short entity reinforcement paragraph above the form: "Sarani works with enterprise teams at TikTok, Sony, GEODIS, Adidas, L'Oréal, and Pernod Ricard. First project: satisfaction or no invoice."
- Add H2: "How quickly does Sarani respond to a brief?" — answer: "Initial response within 4 hours. Creative delivery starts within 24 hours of brief validation."
- Add FAQ schema: 2 questions (response time, how to get started)

## 3. FAQ Schema Templates (JSON-LD — ready to copy)

### Homepage FAQ Schema

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is Sarani?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Sarani is an international enterprise creative agency founded in 2020. 35 experts across 5 continents produce creative assets in 18 languages, with D+1 delivery (24-hour turnaround) on every project, unlimited revisions, and fixed pricing per project — no subscription, no retainer."
      }
    },
    {
      "@type": "Question",
      "name": "What does D+1 Delivery mean?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "D+1 Delivery is Sarani's standard production commitment: all creative assets are delivered within 24 hours of brief receipt. This is not a premium add-on — it is the default for every project."
      }
    },
    {
      "@type": "Question",
      "name": "Which enterprise brands work with Sarani?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Sarani's clients include TikTok (1,500+ video edits per month), Sony (same-day Black Friday banner delivery), GEODIS (350 presentations rebranded in 3 weeks for 8,500€), Adidas, L'Oréal, and Pernod Ricard."
      }
    },
    {
      "@type": "Question",
      "name": "Does Sarani offer unlimited revisions?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. Unlimited revisions are included in every Sarani project at no additional cost. There are no extra fees for iteration."
      }
    },
    {
      "@type": "Question",
      "name": "In how many languages does Sarani produce creative work?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Sarani produces creative content in 18 languages, handled by 35 in-house experts distributed across 5 continents."
      }
    }
  ]
}
```

---

### Pricing Page FAQ Schema

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How much does Sarani charge for creative work?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Sarani uses fixed per-project pricing. A banner starts at 155€. Full brand rebranding starts at 5,000€. There is no subscription and no monthly retainer. First project: satisfaction guaranteed or no invoice."
      }
    },
    {
      "@type": "Question",
      "name": "How does Sarani pricing compare to Superside?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Superside requires a minimum commitment of $10,000/month with a 12-month subscription. Sarani bills per project with no lock-in. There is no minimum spend and no subscription fee."
      }
    },
    {
      "@type": "Question",
      "name": "Does Sarani require a subscription or retainer?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No. Sarani operates on a per-project billing model. Clients pay per project with fixed, transparent pricing. There is no subscription, no retainer, and no minimum commitment."
      }
    },
    {
      "@type": "Question",
      "name": "What is included in Sarani's pricing?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Every Sarani project includes D+1 delivery (24-hour turnaround), unlimited revisions, and a dedicated creative team. No hidden fees. No revision surcharges."
      }
    }
  ]
}
```

---

### About Page FAQ Schema

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How does Sarani's 5-Continent Relay Model work?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Sarani's 35 experts are distributed across 5 continents — Europe, North America, South America, Africa, and Asia. This relay model means creative production runs 24 hours a day, enabling D+1 delivery regardless of the client's time zone."
      }
    },
    {
      "@type": "Question",
      "name": "When was Sarani founded and where is it based?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Sarani was founded in 2020. The agency operates internationally with teams across 5 continents and serves clients in Paris, London, Dubai, and worldwide."
      }
    },
    {
      "@type": "Question",
      "name": "What is the difference between Sarani and a traditional creative agency?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Traditional agencies (Publicis, WPP, Havas) operate with fixed office hours, charge for every revision, and require retainers. Sarani operates 24/7 with a relay model, includes unlimited revisions, and bills per project at fixed transparent prices — delivering in 24 hours what traditional agencies take 2 weeks to produce."
      }
    }
  ]
}
```

---
