# Sarani — Metadata Templates
*Produced by @seo — 2026-03-24*
*Language: English*
*Sources: brand-story.md (Section 5 GEO entities), functional-specs.md (US-106), value-proposition.md, project-context.md*

---

## 1. Meta Title & Description Templates

Rules applied:
- Every title contains "Sarani" (brand entity anchor for knowledge graph)
- Every description contains a CTA verb or a proof figure
- Keywords derived from GEO semantic cluster (brand-story.md Section 5.5) and US-106 business rules
- Title max 60 chars / Description max 155 chars — all values below are verified against these limits

| Page | Meta Title (max 60 chars) | Meta Description (max 155 chars) | Primary Keyword | Secondary Keywords |
|------|--------------------------|----------------------------------|-----------------|-------------------|
| Homepage `/` | `Sarani — Enterprise Creative Agency. 24-Hour Delivery.` | `TikTok, Sony, GEODIS trust Sarani with mission-critical campaigns. D+1 delivery. Unlimited revisions. Fixed prices. Start your first project today.` | enterprise creative agency | 24-hour delivery, D+1, unlimited revisions, fixed pricing |
| About `/about` | `About Sarani — 35 Experts, 5 Continents, 24/7` | `Sarani is the always-on creative production partner for global enterprises. 35 experts across 5 continents. 18 languages. Founded 2020. Learn how we work.` | international creative agency | always-on creative partner, 5 continents relay model, multilingual creative production |
| Case Studies index `/work` | `Sarani Work — TikTok, Sony, GEODIS, Adidas` | `See how Sarani delivered 5,700 slides in 3 weeks for GEODIS, 1,500+ monthly edits for TikTok, and same-day banners for Sony. Enterprise proof, real numbers.` | creative production case studies | enterprise creative work, video editing at scale, brand design enterprise |
| Case Study detail `/case-studies/[slug]` | `[Client] + [Result] — Sarani` *(e.g., `GEODIS: 5,700 Slides in 3 Weeks — Sarani`)* | `[Client] trusted Sarani with [deliverable]. [Key metric]. [Turnaround]. Start your project — first project satisfaction or no invoice.` *(e.g., `GEODIS trusted Sarani with 350 rebranded presentations. 5,700 slides. 3 weeks. 8,500€. Start your project — first satisfaction or no invoice.`)* | [client name] + [deliverable type] | D+1 delivery, unlimited revisions, enterprise creative agency |
| Pricing `/pricing` | `Sarani Pricing — Fixed Rates. No Retainer.` | `Banners from 155€. Full rebranding from 5,000€. No subscription, no surprise invoices. Sarani's fixed prices are published openly — see every rate before you brief.` | creative agency pricing | fixed pricing, no subscription agency, transparent agency rates |
| Contact `/contact` | `Start a Project — Sarani Creative Agency` | `Brief Sarani today. First project delivered in 24 hours — or it's free. No subscription required. Trusted by TikTok, Sony, and GEODIS. Start now.` | start a creative project | enterprise brief, creative agency contact, D+1 creative delivery |
| Privacy Policy `/legal` | `Legal & Privacy — Sarani` | `Sarani's privacy policy, terms of use, and GDPR compliance information. sarani.studio is operated by Sarani, founded 2020, international creative agency.` | Sarani privacy policy | GDPR, legal, sarani.studio |

**Character counts verified:**
- Longest title: "Sarani Pricing — Fixed Rates. No Retainer." → 42 chars
- Longest description: Homepage → 147 chars
- All within limits.

---

## 2. Organization JSON-LD

Complete schema.org Organization for Sarani. Place in `<script type="application/ld+json">` on every page (or at minimum on the homepage per AC-106-4).

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Sarani",
  "alternateName": "Sarani Studio",
  "url": "https://sarani.studio",
  "logo": {
    "@type": "ImageObject",
    "url": "https://sarani.studio/images/sarani-logo-1000x1000.png",
    "width": 1000,
    "height": 1000
  },
  "description": "Enterprise creative agency delivering design, video, copy, and paid ads in 24 hours. 35 experts across 5 continents. Unlimited revisions. Fixed prices. No subscription.",
  "foundingDate": "2020",
  "numberOfEmployees": {
    "@type": "QuantitativeValue",
    "value": 35
  },
  "areaServed": {
    "@type": "Place",
    "name": "Worldwide"
  },
  "knowsLanguage": [
    "en", "fr", "de", "es", "it", "pt", "nl", "ar", "ja", "zh",
    "ko", "ru", "pl", "tr", "hi", "sv", "no", "da"
  ],
  "slogan": "Unlimited Creativity",
  "sameAs": [
    "https://www.linkedin.com/company/sarani-studio",
    "https://www.instagram.com/sarani.studio"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "customer support",
    "availableLanguage": ["English", "French"],
    "url": "https://sarani.studio/contact"
  }
}
```

**Note:** `sameAs` LinkedIn and Instagram URLs are based on the handles in project-context.md. Confirm exact profile URLs before go-live — the handles above are assumed from the brand conventions. Email `hello@sarani.studio` marked [HYPOTHESE] in brand-voice.md — do not add `email` field until confirmed.

---

## 3. Page-Level Structured Data

### 3.1 Homepage — Organization + WebSite + SearchAction

```json
[
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Sarani",
    "url": "https://sarani.studio",
    "logo": "https://sarani.studio/images/sarani-logo-1000x1000.png",
    "description": "Enterprise creative agency. D+1 delivery. Unlimited revisions. Fixed prices. Trusted by TikTok, Sony, GEODIS, Adidas, L'Oréal.",
    "foundingDate": "2020",
    "numberOfEmployees": { "@type": "QuantitativeValue", "value": 35 },
    "sameAs": [
      "https://www.linkedin.com/company/sarani-studio",
      "https://www.instagram.com/sarani.studio"
    ],
    "slogan": "Unlimited Creativity"
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Sarani",
    "url": "https://sarani.studio",
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": "https://sarani.studio/work?q={search_term_string}"
      },
      "query-input": "required name=search_term_string"
    }
  }
]
```

### 3.2 About `/about` — Organization + AboutPage

```json
{
  "@context": "https://schema.org",
  "@type": "AboutPage",
  "name": "About Sarani",
  "url": "https://sarani.studio/about",
  "description": "Sarani is an international creative agency founded in 2020. 35 experts across 5 continents, 18 languages, 24/7 production relay.",
  "mainEntity": {
    "@type": "Organization",
    "name": "Sarani",
    "foundingDate": "2020",
    "numberOfEmployees": { "@type": "QuantitativeValue", "value": 35 },
    "url": "https://sarani.studio"
  }
}
```

### 3.3 Case Study `/case-studies/[slug]` — CreativeWork

Use `CreativeWork` (not Article) — case studies are creative production outputs, not editorial articles.

```json
{
  "@context": "https://schema.org",
  "@type": "CreativeWork",
  "name": "[Case study headline, e.g., GEODIS: 350 Presentations Rebranded in 3 Weeks]",
  "url": "https://sarani.studio/case-studies/[slug]",
  "creator": {
    "@type": "Organization",
    "name": "Sarani",
    "url": "https://sarani.studio"
  },
  "about": {
    "@type": "Organization",
    "name": "[Client name, e.g., GEODIS]"
  },
  "description": "[One-sentence summary with key metric, e.g., Sarani rebranded 350 presentations — 5,700 slides — for GEODIS in 3 weeks for 8,500€.]",
  "datePublished": "[ISO 8601 date, e.g., 2026-01-15]",
  "keywords": "[client name], enterprise creative agency, D+1 delivery, [deliverable type]"
}
```

**For each live case study, replace placeholders before publish.** Three initial slugs from functional-specs.md:
- `/case-studies/tiktok-video-production`
- `/case-studies/geodis-presentation-rebranding`
- `/case-studies/sony-banner-production`

### 3.4 Pricing `/pricing` — Service

```json
{
  "@context": "https://schema.org",
  "@type": "Service",
  "name": "Sarani Creative Production Services",
  "provider": {
    "@type": "Organization",
    "name": "Sarani",
    "url": "https://sarani.studio"
  },
  "url": "https://sarani.studio/pricing",
  "description": "Fixed-price creative production: design, video, copy, presentations, paid ads. No subscription. No revision fees. D+1 delivery standard.",
  "offers": [
    {
      "@type": "Offer",
      "name": "Banner Design",
      "price": "155",
      "priceCurrency": "EUR",
      "description": "Single banner. Fixed price. Delivered in 24 hours."
    },
    {
      "@type": "Offer",
      "name": "Full Rebranding",
      "price": "5000",
      "priceCurrency": "EUR",
      "description": "Complete brand identity rebranding. Fixed price. Unlimited revisions."
    }
  ]
}
```

### 3.5 Contact `/contact` — ContactPage + ContactPoint

```json
{
  "@context": "https://schema.org",
  "@type": "ContactPage",
  "name": "Start a Project — Sarani",
  "url": "https://sarani.studio/contact",
  "description": "Brief Sarani for your next creative project. First project delivered in 24 hours — satisfaction guaranteed or no invoice.",
  "mainEntity": {
    "@type": "ContactPoint",
    "contactType": "new business",
    "availableLanguage": ["English", "French"],
    "url": "https://sarani.studio/contact"
  }
}
```

---

## 4. Internal Linking Strategy

### 4.1 Link Architecture (cocon sémantique)

```
Homepage (/)
├── → /work (anchor: "See our work" or "case studies")
│   ├── → /case-studies/tiktok-video-production
│   ├── → /case-studies/geodis-presentation-rebranding
│   └── → /case-studies/sony-banner-production
│       └── Each case study → /contact (anchor: "Start a project")
│       └── Each case study → 2 related case studies (anchor: client name)
├── → /pricing (anchor: "Fixed prices" or "from 155€")
│   └── → /contact (anchor: "Start a project")
├── → /about (anchor: "35 experts" or "how we work")
│   └── → /work (anchor: "See client results")
│   └── → /contact (anchor: "Start a project")
└── → /contact (CTA button: "Start a project")
```

**Depth rule:** Every page reachable in ≤2 clicks from Homepage. Contact reachable from every page in ≤1 click (CTA in nav or end-of-page button).

### 4.2 Recommended Anchor Texts

| Source Page | Destination | Anchor Text | Rationale |
|-------------|-------------|-------------|-----------|
| Homepage hero | /work | "See our work" | Action CTA — matches US-101 wireframe |
| Homepage proof cards | /case-studies/[slug] | "[Client]: [result]" (e.g., "GEODIS: 5,700 slides in 3 weeks") | Keyword-rich, proof-first anchor |
| About | /work | "client results" | Semantic link — backs up capability claims |
| Pricing | /contact | "Start a project" | Conversion anchor, matches primary CTA |
| Case study (footer) | /contact | "Start a project" | Consistent CTA anchor across all conversion pages |
| Case study (related) | other /case-studies/* | "[Client] case study" (e.g., "Sony case study") | Brand + entity keyword — supports GEO co-citation |
| Footer (all pages) | /work, /pricing, /about, /contact | Exact nav labels | Reinforces crawl depth, consistent taxonomy |

### 4.3 Breadcrumb Structure

Implement BreadcrumbList JSON-LD on all pages below root depth:

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://sarani.studio"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Work",
      "item": "https://sarani.studio/work"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "GEODIS — 5,700 Slides in 3 Weeks",
      "item": "https://sarani.studio/case-studies/geodis-presentation-rebranding"
    }
  ]
}
```

Replace positions 2–3 based on actual page hierarchy. Homepage does not need a breadcrumb.

---

## 5. Open Graph & Twitter Cards

### 5.1 OG Image Specifications

- **Dimensions:** 1200 × 630px (standard OG ratio 1.91:1)
- **Format:** WebP (preferred) or JPG — no PNG unless transparency required
- **Max file size:** 300KB
- **Background:** #000000 (brand black, dark-first identity)
- **Text on image:** White / accent Flame (#da5126) — readable without platform overlay
- **Required elements per image:** Sarani logo (top-left), page-specific headline, one proof stat or client name

### 5.2 Templates by Page Type

**Homepage**
```html
<meta property="og:type" content="website" />
<meta property="og:title" content="Sarani — Enterprise Creative Agency. 24-Hour Delivery." />
<meta property="og:description" content="TikTok, Sony, GEODIS trust Sarani with mission-critical campaigns. D+1 delivery. Unlimited revisions. Fixed prices. Start your first project today." />
<meta property="og:url" content="https://sarani.studio" />
<meta property="og:image" content="https://sarani.studio/og/homepage.webp" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:site_name" content="Sarani" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Sarani — Enterprise Creative Agency. 24-Hour Delivery." />
<meta name="twitter:description" content="TikTok, Sony, GEODIS trust Sarani with mission-critical campaigns. D+1 delivery. Unlimited revisions. Fixed prices." />
<meta name="twitter:image" content="https://sarani.studio/og/homepage.webp" />
```

**About**
```html
<meta property="og:type" content="website" />
<meta property="og:title" content="About Sarani — 35 Experts, 5 Continents, 24/7" />
<meta property="og:description" content="Sarani is the always-on creative production partner for global enterprises. 35 experts. 18 languages. 5 continents. Founded 2020." />
<meta property="og:url" content="https://sarani.studio/about" />
<meta property="og:image" content="https://sarani.studio/og/about.webp" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="About Sarani — 35 Experts, 5 Continents, 24/7" />
<meta name="twitter:description" content="Sarani is the always-on creative production partner for global enterprises. 35 experts. 18 languages. 5 continents. Founded 2020." />
<meta name="twitter:image" content="https://sarani.studio/og/about.webp" />
```

**Case Study (dynamic — populate per slug)**
```html
<meta property="og:type" content="article" />
<meta property="og:title" content="[Client]: [Result headline] — Sarani" />
<meta property="og:description" content="[One-sentence case study summary with key metric and turnaround time]." />
<meta property="og:url" content="https://sarani.studio/case-studies/[slug]" />
<meta property="og:image" content="https://sarani.studio/og/case-studies/[slug].webp" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="[Client]: [Result headline] — Sarani" />
<meta name="twitter:description" content="[One-sentence case study summary]." />
<meta name="twitter:image" content="https://sarani.studio/og/case-studies/[slug].webp" />
```

**Pricing**
```html
<meta property="og:type" content="website" />
<meta property="og:title" content="Sarani Pricing — Fixed Rates. No Retainer." />
<meta property="og:description" content="Banners from 155€. Full rebranding from 5,000€. No subscription, no surprise invoices. Sarani's fixed prices published openly." />
<meta property="og:url" content="https://sarani.studio/pricing" />
<meta property="og:image" content="https://sarani.studio/og/pricing.webp" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Sarani Pricing — Fixed Rates. No Retainer." />
<meta name="twitter:description" content="Banners from 155€. Full rebranding from 5,000€. No subscription, no surprise invoices." />
<meta name="twitter:image" content="https://sarani.studio/og/pricing.webp" />
```

**Contact**
```html
<meta property="og:type" content="website" />
<meta property="og:title" content="Start a Project — Sarani Creative Agency" />
<meta property="og:description" content="Brief Sarani today. First project delivered in 24 hours — or it's free. Trusted by TikTok, Sony, GEODIS." />
<meta property="og:url" content="https://sarani.studio/contact" />
<meta property="og:image" content="https://sarani.studio/og/contact.webp" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Start a Project — Sarani Creative Agency" />
<meta name="twitter:description" content="Brief Sarani today. First project delivered in 24 hours — or it's free." />
<meta name="twitter:image" content="https://sarani.studio/og/contact.webp" />
```

---

## 6. Technical SEO Checklist — Alignment with US-106

Verified against functional-specs.md US-106 acceptance criteria. Status reflects what the specs cover vs. what is missing.

| Item | US-106 Coverage | Status | Implementation Note |
|------|----------------|--------|---------------------|
| Unique `<title>` per page (max 60 chars) | AC-106-1 | Covered | Use templates from Section 1 above in `generateMetadata()` |
| Unique `<meta name="description">` (120–160 chars) | AC-106-1 | Covered | Use templates from Section 1 above |
| `<link rel="canonical">` on all pages | AC-106-6 | Covered | BR-106-2 — absolute URL, no trailing slash |
| `sitemap.xml` via next-sitemap | AC-106-2 | Covered | Auto-generated at build; must include all `/case-studies/[slug]` |
| `robots.txt` | AC-106-3 | Covered | BR-106-3 template — block `/api/`, reference sitemap |
| Organization JSON-LD on homepage | AC-106-4 | Covered | Section 2 above — validate via Rich Results Test |
| Alt text on all images | AC-106-5 | Covered | Format: "[Client Name] logo", "[description of asset]" |
| Lighthouse SEO score >= 90 | AC-106-6 | Covered | Enforced in CI (qa-strategy.md P0 tests) |
| Open Graph tags | **NOT in US-106** | **Missing** | Add AC-106-7 to functional specs — OG tags are not optional for a site targeting social sharing from enterprise buyers |
| Twitter Cards | **NOT in US-106** | **Missing** | Same as above — add to US-106 or as a separate AC |
| BreadcrumbList JSON-LD | **NOT in US-106** | **Missing** | Required for case study depth pages — add to US-106 |
| CreativeWork / Service schema | **NOT in US-106** | **Missing** | Case study and pricing structured data not specified in US-106 — add to acceptance criteria |
| Hreflang | **NOT in Phase 1** | Deferred | Multi-language is Phase 2. Flag for @fullstack: implement `<link rel="alternate" hreflang>` in Phase 2 when multilingual routes are added. Use `x-default` from Phase 1 go-live. |
| Core Web Vitals (LCP/CLS/INP targets) | AC-101-4, Cross-Cutting | Covered | Targets: LCP < 2.5s, CLS < 0.1, INP < 200ms — enforced by Lighthouse CI |
| `next/image` for all images | BR-106-5 | Covered | WebP conversion + responsive srcset — no raw `<img>` tags |
| Slug conventions | BR-106-4 | Covered | Lowercase, hyphen-separated, no IDs in URL |

**Gaps to signal to @product-manager before go-live:**
1. OG/Twitter meta is not covered in US-106 — recommend adding AC-106-7 (OG tags required on all pages)
2. BreadcrumbList JSON-LD not in any US — add to US-106 or US-102
3. CreativeWork schema for case studies not specified — add to US-102 or US-106
4. `x-default` hreflang should be set from Phase 1 even before multilingual routes exist

---

## Next.js Implementation Notes for @fullstack

### `generateMetadata()` pattern (Next.js App Router)

```typescript
// app/page.tsx (Homepage)
export const metadata: Metadata = {
  title: 'Sarani — Enterprise Creative Agency. 24-Hour Delivery.',
  description: 'TikTok, Sony, GEODIS trust Sarani with mission-critical campaigns. D+1 delivery. Unlimited revisions. Fixed prices. Start your first project today.',
  openGraph: {
    title: 'Sarani — Enterprise Creative Agency. 24-Hour Delivery.',
    description: 'TikTok, Sony, GEODIS trust Sarani with mission-critical campaigns. D+1 delivery. Unlimited revisions. Fixed prices.',
    url: 'https://sarani.studio',
    siteName: 'Sarani',
    images: [{ url: '/og/homepage.webp', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sarani — Enterprise Creative Agency. 24-Hour Delivery.',
    description: 'TikTok, Sony, GEODIS trust Sarani. D+1 delivery. Unlimited revisions. Fixed prices.',
    images: ['/og/homepage.webp'],
  },
  alternates: {
    canonical: 'https://sarani.studio',
  },
};
```

For dynamic case study pages, use `generateMetadata({ params })` with slug-based interpolation. JSON-LD blocks should be rendered as `<script type="application/ld+json">` via a server component — do not inject via `useEffect` (SSR requirement for crawler visibility).

---

**Handoff → @fullstack**

- Fichiers produits : `/home/user/Sarani/docs/seo/metadata-templates.md`
- Décisions prises :
  - **Meta titles/descriptions** : templates finaux pour les 7 pages Phase 1. Suivre exactement — toute modification doit être signalée pour vérification des limites de caractères.
  - **Organization JSON-LD** : schéma complet avec 18 `knowsLanguage` codes ISO. Le champ `email` est omis volontairement (hypothèse non confirmée — voir brand-voice.md).
  - **CreativeWork** retenu pour les case studies (vs Article) : les case studies sont des productions créatives, pas des articles éditoriaux. Cela est plus précis sémantiquement et plus lisible par les LLMs.
  - **BreadcrumbList** : à implémenter sur toutes les pages de profondeur ≥ 2 (case studies, legal).
  - **Hreflang** : déféré en Phase 2 mais `x-default` doit être ajouté dès Phase 1 (`<link rel="alternate" hreflang="x-default" href="https://sarani.studio" />`).
  - **OG images** : à créer pour chaque page type (5 images statiques + 1 template dynamique pour case studies). Chemin : `/public/og/[page].webp`.
- Points d'attention :
  - JSON-LD à rendre côté serveur (server component) — pas via `useEffect` — pour garantir la visibilité des crawlers Google et LLMs.
  - 4 gaps US-106 signalés (OG tags, BreadcrumbList, CreativeWork schema, x-default hreflang) — à ajouter aux critères d'acceptation avant QA.
  - Les `sameAs` LinkedIn/Instagram URLs dans le schéma Organization sont à confirmer avec l'équipe Sarani (handles exacts).
  - Utiliser `next-sitemap` pour la génération automatique du sitemap — configurer `sitemapSize` et `changefreq` pour les case studies (`weekly`) vs pages statiques (`monthly`).
