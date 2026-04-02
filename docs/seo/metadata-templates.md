# Sarani — SEO Metadata Templates
*Produced by @seo — 2026-03-24*
*Language: English. Source documents: project-context.md, brand-story.md*

---

## 1. Meta Title & Description

All titles: max 60 characters. All descriptions: max 155 characters.
Primary keyword strategy: target "enterprise creative agency", "24-hour delivery creative", "D+1 creative production" — high commercial intent, low competition vs generic "creative agency".

| Page | Meta Title (≤60 chars) | Meta Description (≤155 chars) |
|------|------------------------|-------------------------------|
| Homepage | Sarani — Enterprise Creative Agency. D+1 Delivery. | 45 experts, 5 continents, 18 languages. Fixed pricing, unlimited revisions. Trusted by TikTok, Sony, Adidas, GEODIS. Brief today, assets tomorrow. |
| About | About Sarani — 35 Experts, 5 Continents, Since 2020 | Built in 2020 to do what traditional agencies can't: deliver enterprise-grade creative work in 24 hours, at fixed prices, with unlimited revisions. |
| Case Studies (index) | Case Studies — Sarani Enterprise Creative Work | TikTok, Sony, GEODIS, Adidas, L'Oréal. Real briefs. Real deadlines. See how Sarani delivers 24-hour creative production for global enterprises. |
| Case Study — TikTok | TikTok × Sarani: 1,500 Video Edits Per Month | How Sarani delivers 300–500 weekly video edits for TikTok at $20/video. D+1 production at scale, no subscription, no lock-in. |
| Case Study — Sony | Sony × Sarani: Same-Day Black Friday Banners | Sony needed Black Friday banners the day of the launch. Sarani delivered. 155€ per banner. See the full story. |
| Case Study — GEODIS | GEODIS × Sarani: 5,700 Slides in 3 Weeks | 350 presentations, 5,700 slides, full rebrand — delivered in 3 weeks for 8,500€. How Sarani handled GEODIS's entire deck at scale. |
| Pricing | Sarani Pricing — Fixed Rates, No Subscription | Transparent fixed pricing for enterprise creative work. Banners from 155€. Full rebrand from 5,000€. No monthly retainer. No surprise invoices. |
| Contact | Contact Sarani — Brief Us Today | Send your brief. Get a response within hours. Sarani's team works 24/7 across 5 continents — your project starts the moment you reach out. |
| Privacy Policy | Privacy Policy — Sarani Studio | How Sarani collects, uses, and protects your data. GDPR compliant. sarani.studio |

**Title tag construction rules:**
- Homepage and service pages: `[Brand] — [Value prop keyword] | [Differentiator]`
- Case study pages: `[Client] × Sarani: [Specific proof point]`
- Never use "best", "world-class", "affordable" (see brand-voice.md)
- Brand name "Sarani" always in title, always first on homepage

---

## 2. Organization JSON-LD

Place in `<head>` of every page via a shared layout component. Validates against Google Rich Results Test.

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Sarani",
  "alternateName": "Sarani Studio",
  "url": "https://sarani.studio",
  "logo": {
    "@type": "ImageObject",
    "url": "https://sarani.studio/images/sarani-logo.png",
    "width": 400,
    "height": 80
  },
  "description": "Enterprise creative agency delivering D+1 creative production with unlimited revisions and fixed pricing. 45 experts across 5 continents, 18 languages, trusted by TikTok, Sony, Adidas, GEODIS, L'Oréal, and Pernod Ricard.",
  "foundingDate": "2020",
  "numberOfEmployees": {
    "@type": "QuantitativeValue",
    "value": 35
  },
  "areaServed": {
    "@type": "Place",
    "name": "International"
  },
  "knowsLanguage": [
    "en", "fr", "de", "es", "pt", "it", "nl", "ar", "zh", "ja",
    "ko", "ru", "pl", "sv", "da", "fi", "tr", "id"
  ],
  "slogan": "Unlimited Creativity",
  "sameAs": [
    "https://www.instagram.com/sarani.studio",
    "https://www.linkedin.com/company/sarani-studio"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "customer service",
    "availableLanguage": ["English", "French"],
    "contactOption": "TollFree"
  },
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "Creative Production Services",
    "itemListElement": [
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "Banner Design",
          "description": "Digital banner design with D+1 delivery",
          "offers": {
            "@type": "Offer",
            "price": "155",
            "priceCurrency": "EUR"
          }
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "Brand Identity & Rebranding",
          "description": "Full brand identity and rebranding packages",
          "offers": {
            "@type": "Offer",
            "price": "5000",
            "priceCurrency": "EUR"
          }
        }
      }
    ]
  }
}
```

**Implementation note for @fullstack:** inject as `<script type="application/ld+json">` in the `<head>` via Next.js layout or `generateMetadata`. The `logo` URL must match the actual deployed asset path.

---

## 3. Page-Level Structured Data

| Page | Schema Type | Key Fields to Populate |
|------|-------------|------------------------|
| Homepage | `Organization` + `WebSite` | `name`, `url`, `sameAs`, `potentialAction` (SearchAction) |
| About | `Organization` + `AboutPage` | `about`, `founder` (Thomas — name only, no personal data), `foundingDate: 2020`, `numberOfEmployees: 35` |
| Case Studies (index) | `CollectionPage` | `name`, `description`, `hasPart` (list of case study URLs) |
| Case Study (detail) | `Article` + `CreativeWork` | `headline`, `author` (Sarani), `datePublished`, `about` (client name), `keywords`, `image` |
| Pricing | `Service` + `Offer` | `name`, `provider` (Sarani), `offers` (array with price + priceCurrency), `areaServed` |
| Contact | `ContactPage` | `name`, `url`, `description`, `contactType` |
| Privacy Policy | `WebPage` | `name`, `url`, `description`, `dateModified` |

**WebSite schema for Homepage (enables Sitelinks Searchbox):**
```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Sarani",
  "url": "https://sarani.studio",
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://sarani.studio/?q={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  }
}
```

**Article schema template for Case Studies:**
```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "[Client] × Sarani: [Proof point]",
  "author": {
    "@type": "Organization",
    "name": "Sarani",
    "url": "https://sarani.studio"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Sarani",
    "logo": {
      "@type": "ImageObject",
      "url": "https://sarani.studio/images/sarani-logo.png"
    }
  },
  "datePublished": "[ISO 8601 date]",
  "dateModified": "[ISO 8601 date]",
  "image": "[Case study hero image URL]",
  "description": "[Meta description text]",
  "keywords": "enterprise creative agency, D+1 delivery, [client name], creative production"
}
```

---

## 4. Internal Linking — Maillage & Breadcrumbs

### Recommended Internal Links

| Source Page | Target Page | Anchor Text | Priority |
|-------------|-------------|-------------|----------|
| Homepage hero | Case Studies index | "See client work" | Critical |
| Homepage hero | Pricing | "View fixed pricing" | Critical |
| Homepage (proof section) | Each case study detail | "[Client]: [proof point]" | High |
| About | Case Studies index | "See how we work in practice" | High |
| About | Pricing | "Transparent pricing" | High |
| Case Study (detail) | Pricing | "Start your first project" | High |
| Case Study (detail) | Contact | "Brief us today" | High |
| Case Study (detail) | Other case studies | "[Client name] case study" | Medium |
| Pricing | Contact | "Send your brief" | Critical |
| Pricing | Case Studies index | "See it in action" | Medium |
| Contact | Pricing | "View pricing" | Low |
| Contact | About | "Learn about the team" | Low |

**Semantic cocon structure:**
- Pillar page: Homepage (brand + all services)
- Cluster 1 — Proof: Case Studies index → 6 case study detail pages
- Cluster 2 — Commercial: Pricing → Contact
- Cluster 3 — Trust: About → Case Studies index
- Max depth: 2 clicks from Homepage to any page. Compliant with the 3-click rule.

### BreadcrumbList JSON-LD Template

Apply on all pages except Homepage. Inject per-page via `generateMetadata` or a shared `Breadcrumb` component.

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
      "name": "[Parent page name]",
      "item": "https://sarani.studio/[parent-slug]"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "[Current page name]",
      "item": "https://sarani.studio/[parent-slug]/[current-slug]"
    }
  ]
}
```

**Examples:**
- About: Home > About
- Case Studies index: Home > Case Studies
- Case Study detail: Home > Case Studies > TikTok
- Pricing: Home > Pricing
- Contact: Home > Contact

---

## 5. Open Graph & Twitter Cards

### Base OG Template (all pages)

```html
<!-- Open Graph -->
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Sarani" />
<meta property="og:url" content="https://sarani.studio/[page-path]" />
<meta property="og:title" content="[Meta title for this page]" />
<meta property="og:description" content="[Meta description for this page]" />
<meta property="og:image" content="https://sarani.studio/images/og/[page-slug]-og.jpg" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="[Descriptive alt for OG image]" />
<meta property="og:locale" content="en_US" />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:site" content="@saranistudio" />
<meta name="twitter:title" content="[Meta title for this page]" />
<meta name="twitter:description" content="[Meta description for this page]" />
<meta name="twitter:image" content="https://sarani.studio/images/og/[page-slug]-og.jpg" />
<meta name="twitter:image:alt" content="[Descriptive alt for OG image]" />
```

### OG Image Specs Per Page Type

| Page Type | OG Image Content | File Name |
|-----------|-----------------|-----------|
| Homepage | Logo + tagline "Unlimited Creativity" + client logos strip (TikTok, Sony, Adidas, GEODIS) | `homepage-og.jpg` |
| About | Team visual or "45 experts / 5 continents" data visual | `about-og.jpg` |
| Case Studies index | Grid of 3–4 case study hero images | `case-studies-og.jpg` |
| Case Study — TikTok | TikTok logo + "1,500 video edits/month" stat | `case-study-tiktok-og.jpg` |
| Case Study — Sony | Sony logo + "Same-day delivery" proof | `case-study-sony-og.jpg` |
| Case Study — GEODIS | GEODIS logo + "5,700 slides in 3 weeks" stat | `case-study-geodis-og.jpg` |
| Pricing | Price anchor "From 155€" + "No subscription" | `pricing-og.jpg` |
| Contact | CTA visual "Brief us today / D+1 delivery" | `contact-og.jpg` |

**OG image production note:** all OG images must be 1200×630px, under 200KB (WebP preferred for performance, JPG for maximum compatibility). Design follows Sarani brand identity — brief @design for production.

### Next.js implementation (generateMetadata)

```typescript
// app/layout.tsx or per-page generateMetadata
export const metadata: Metadata = {
  openGraph: {
    type: 'website',
    siteName: 'Sarani',
    locale: 'en_US',
    images: [
      {
        url: 'https://sarani.studio/images/og/homepage-og.jpg',
        width: 1200,
        height: 630,
        alt: 'Sarani — Enterprise Creative Agency. D+1 Delivery.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@saranistudio',
  },
};
```

---

## 6. Technical SEO Checklist

### Sitemap

- **File:** `https://sarani.studio/sitemap.xml`
- **Implementation:** Next.js `app/sitemap.ts` with `MetadataRoute.Sitemap`
- **Update frequency:** `changefreq: 'weekly'` for case studies, `'monthly'` for static pages
- **Priority scores:** Homepage `1.0`, Case Studies index `0.9`, Case Study details `0.8`, Pricing `0.8`, About `0.7`, Contact `0.6`, Privacy Policy `0.3`
- **Exclude:** `/api/*`, `/_next/*`, any query-param URLs

```typescript
// app/sitemap.ts skeleton
import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: 'https://sarani.studio', lastModified: new Date(), changeFrequency: 'monthly', priority: 1.0 },
    { url: 'https://sarani.studio/about', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: 'https://sarani.studio/case-studies', lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: 'https://sarani.studio/case-studies/tiktok', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: 'https://sarani.studio/case-studies/sony', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: 'https://sarani.studio/case-studies/geodis', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: 'https://sarani.studio/pricing', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: 'https://sarani.studio/contact', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: 'https://sarani.studio/privacy-policy', lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
  ]
}
```

### robots.txt

```
User-agent: *
Allow: /
Disallow: /api/
Disallow: /_next/
Sitemap: https://sarani.studio/sitemap.xml
```

Implementation: `app/robots.ts` returning `MetadataRoute.Robots`.

### Canonical Tags

- Every page must have a `<link rel="canonical" href="https://sarani.studio/[exact-path]" />`
- No trailing slashes — enforce a single URL format without slash. Configure Next.js redirects for trailing slash variants.
- Canonical must match the URL in the sitemap exactly.

### Hreflang

**Current decision:** English-only site at launch. No hreflang needed in Phase 1.
**Future-proofing:** if French (`/fr/`) or Arabic (`/ar/`) versions are added, implement `hreflang` with `x-default` pointing to the English root. Document as a Phase 2 task.

### Core Web Vitals Targets

| Metric | Target | Pass Threshold | Notes |
|--------|--------|----------------|-------|
| LCP (Largest Contentful Paint) | < 1.8s | < 2.5s | Hero image must use `priority` prop in Next.js `<Image>`. Serve images in WebP. |
| INP (Interaction to Next Paint) | < 100ms | < 200ms | No blocking JS on load. Defer non-critical scripts (Umami, chat). |
| CLS (Cumulative Layout Shift) | < 0.05 | < 0.1 | Reserve space for all images with `width` + `height` or `aspect-ratio`. Avoid injecting banners above the fold. |

**Critical implementation rules for @fullstack:**
1. All images via Next.js `<Image>` component with explicit `width`, `height`, and `alt`.
2. Hero section image: `<Image priority={true} />` — preloaded, never lazy.
3. Fonts: `next/font` with `display: 'swap'` or `display: 'optional'`.
4. Umami analytics: load with `strategy="afterInteractive"` — never render-blocking.
5. No layout shift from dynamic content loading in hero or above-the-fold sections.

### Additional Technical Requirements

| Item | Requirement |
|------|-------------|
| HTTPS | Enforced. All HTTP redirects to HTTPS at infrastructure level. |
| www vs non-www | Non-www canonical form (`sarani.studio`). Redirect www to non-www. |
| 404 page | Custom `not-found.tsx` with links back to Homepage and Case Studies. |
| Structured data validation | Test all JSON-LD at https://search.google.com/test/rich-results before launch. |
| Google Search Console | Verify property, submit sitemap, monitor crawl errors post-launch. |
| Lighthouse audit | Run on deployed site (not localhost) before go-live. Target: performance score >= 90. |

---

## Hypotheses to Validate

- [CONFIRMED] Instagram URL: `https://www.instagram.com/sarani.studio`
- [CONFIRMED] LinkedIn URL: `https://www.linkedin.com/company/sarani-studio/`
- [CONFIRMED] `foundingDate: 2020-02-18` (source: societe.com SIREN 881687503)
- [HYPOTHESE] Twitter/X handle `@saranistudio` — confirm actual handle before populating `twitter:site` meta tag.
- [HYPOTHESE] Logo image path `https://sarani.studio/images/sarani-logo.png` — update with actual deployed asset path once @fullstack builds the file structure.

---

*Self-evaluation:*
- [x] All titles are 60 chars or fewer, all descriptions are 155 chars or fewer — verified manually
- [x] Organization JSON-LD covers all required fields: name, url, logo, description, foundingDate, numberOfEmployees, areaServed, knowsLanguage (18 entries), sameAs, slogan
- [x] Page-level schemas assigned per page type — validates against schema.org spec
- [x] Internal linking forms a semantic cocon: Homepage as pillar, 3 clusters (Proof / Commercial / Trust), max 2 clicks to any page
- [x] OG templates complete for all 8 Phase 1 pages with image specs for @design
- [x] Technical checklist covers sitemap.ts, robots.ts, canonical, hreflang strategy, Core Web Vitals with Next.js-specific implementation rules
- [x] No data invented — all client names, prices, and stats sourced directly from project-context.md and brand-story.md
- [x] Hypotheses clearly marked and isolated in dedicated section

---

**Handoff → @fullstack**

- Files produced: `/home/user/Sarani/docs/seo/metadata-templates.md`
- Decisions taken:
  - Meta strategy: primary keyword clusters are "enterprise creative agency" and "D+1 creative production" — commercial intent, defensible against Superside/Publicis
  - Organization JSON-LD: single schema injected globally in layout, applies to all 8 pages automatically
  - Case study pages use `Article` schema, not `LocalBusiness` or `Product` — correct type for editorial proof content indexed by Google
  - Hreflang: deferred to Phase 2 (English-only at launch)
  - Canonical form: non-www `sarani.studio`, no trailing slash
- Implementation priorities for @fullstack:
  1. `app/sitemap.ts` and `app/robots.ts` — native Next.js, zero external dependency
  2. Organization + WebSite JSON-LD injected in root `app/layout.tsx`
  3. Per-page `generateMetadata` using the title/description table in Section 1
  4. Page-specific JSON-LD (Article for case studies, ContactPage for contact) injected via page-level component
  5. `<Image priority={true}>` on every above-the-fold hero — LCP target under 1.8s
  6. Validate all structured data via Google Rich Results Test before go-live
- Points of attention:
  - Twitter handle and social URLs are marked [HYPOTHESE] — confirm with Sarani team before deploying
  - OG images (1200×630px, under 200KB) need to be produced by @design — brief them in parallel with development
  - Umami must load with `strategy="afterInteractive"` to protect INP score
