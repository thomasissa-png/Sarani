# Sarani — Blog Architecture
*Produced by @seo — 2026-03-26*
*Language: English*

---

## 1. URL Structure

### Confirmed structure (already implemented)
```
https://sarani.studio/blog/[slug]
```

Blog index: `https://sarani.studio/blog`
Individual article: `https://sarani.studio/blog/[kebab-case-slug]`

**No categories in the URL.** Rationale: categories would add a subfolder layer (`/blog/category/slug`) that creates unnecessary crawl depth and dilutes link equity. A flat `/blog/[slug]` structure keeps all articles one click from the index, maximises crawl efficiency, and avoids duplicate content risks from category pagination.

Category filters (if added in the future) must use query parameters (`?category=enterprise`) or client-side filtering — never separate URL paths that generate indexable category pages without unique content.

### Sitemap integration
The blog is currently absent from `src/app/sitemap.ts`. The sitemap must be updated to include:
- `/blog` (changeFrequency: "weekly", priority: 0.7)
- All `/blog/[slug]` routes (changeFrequency: "monthly", priority: 0.7)

This requires adding a dynamic blog routes section to `sitemap.ts` using `getAllBlogSlugs()` — analogous to the existing case study routes pattern.

---

## 2. Content Categories

Five categories cover the full thematic scope of Sarani's blog, each with a distinct audience angle and keyword group:

### Category 1 — Enterprise Creative Operations
**Focus:** How global marketing teams manage high-volume creative production — the operational and strategic dimension.
**Persona:** Sophie (Head of Marketing) and her operational team.
**Keyword group:** creative production workflow, enterprise creative ops, manage creative agency at scale
**Existing articles:** "Why Enterprise Teams Are Leaving Traditional Agencies" (Thought Leadership → reclassify to this category)
**Article cadence target:** 2 articles/quarter

### Category 2 — Behind the Scenes
**Focus:** Inside Sarani's production model — how the relay team operates, case-specific process articles.
**Persona:** Sophie (proof-seeker) + procurement (Marc, risk-reducer).
**Keyword group:** creative production at scale, video editing workflow, D+1 delivery how it works
**Existing articles:** "How We Deliver 1,500+ Creatives Per Month for TikTok" (already tagged Behind the Scenes — keep)
**Article cadence target:** 1 article/quarter (requires real data and case approval)

### Category 3 — Industry Insights
**Focus:** Analysis of trends in agency models, pricing, creative outsourcing — thought leadership positioning Sarani as an authority.
**Persona:** Sophie + Marc + senior marketing decision-makers.
**Keyword group:** fixed pricing vs retainers, creative agency cost, agency model analysis
**Existing articles:** "Fixed Pricing vs Retainers: What Global Brands Actually Prefer" (already tagged Industry Insights — keep)
**Article cadence target:** 2 articles/quarter

### Category 4 — Practical Guides
**Focus:** Actionable how-to articles for enterprise marketers — briefs, workflows, agency selection criteria.
**Persona:** Sophie's team (marketing managers, content leads who brief agencies).
**Keyword group:** how to brief a creative agency, creative brief template, how to manage an outsourced creative team
**Article cadence target:** 2 articles/quarter

### Category 5 — Agency Model Analysis
**Focus:** Agency model comparisons, pricing structures, creative outsourcing decision frameworks. High commercial intent.
**Persona:** Sophie or Marc actively evaluating creative agency options and models.
**Keyword group:** per project creative agency enterprise, agency model comparison, creative agency pricing guide, how to choose a creative agency
**Article cadence target:** 1 article/quarter (evergreen, updated annually)

---

## 3. Twenty Proposed Article Titles — SEO Mapped

Articles are ordered by production priority (P1 first). P1 articles target the first 4 to be produced per the roadmap (W7–W8). Three existing articles are included for mapping completeness.

### P1 — Produce First (W7–W8)

| # | Article Title | Category | Target Keyword | Slug | Status |
|---|---|---|---|---|---|
| 1 | Why Enterprise Teams Are Leaving Traditional Agencies | Enterprise Creative Ops | why enterprise teams leave traditional agencies | why-enterprise-teams-are-leaving-traditional-agencies | **EXISTS** |
| 2 | How We Deliver 1,500+ Creatives Per Month for TikTok | Behind the Scenes | how to produce 1000 creatives per month | how-we-deliver-1500-creatives-per-month-for-tiktok | **EXISTS** |
| 3 | Fixed Pricing vs Retainers: What Global Brands Actually Prefer | Industry Insights | fixed pricing vs agency retainer enterprise | fixed-pricing-vs-retainers-what-global-brands-prefer | **EXISTS** |
| 4 | How Enterprise Teams Scale Creative Production Without Subscription Lock-In | Agency Model Analysis | how to choose between subscription and per-project creative agency | how-enterprise-teams-scale-creative-production | **TO PRODUCE** |
| 5 | How Much Does a Creative Agency Actually Cost? An Enterprise Guide | Industry Insights | how much does a creative agency cost | creative-agency-cost-enterprise-guide | **TO PRODUCE** |
| 6 | How D+1 Delivery Works: Inside Sarani's 24-Hour Creative Production Model | Behind the Scenes | agency 24 hour delivery creative | how-24-hour-creative-delivery-works | **TO PRODUCE** |
| 7 | Fixed Price vs Subscription: Why Enterprise Brands Are Ditching Retainers | Industry Insights | fixed price creative agency | fixed-price-vs-subscription-creative-agency | **TO PRODUCE** |

### P2 — Produce Next (W9–W12)

| # | Article Title | Category | Target Keyword | Slug | Status |
|---|---|---|---|---|---|
| 8 | How to Write a Creative Brief That Gets Results First Time | Practical Guides | how to brief a creative agency enterprise | how-to-write-a-creative-brief-enterprise | TO PRODUCE |
| 9 | Creative Production at Scale: How TikTok Manages 1,500 Assets Per Month | Enterprise Creative Ops | creative production at scale | creative-production-at-scale-tiktok | TO PRODUCE |
| 10 | Video Localization at Scale: How Enterprise Brands Manage 15-Language Campaigns | Enterprise Creative Ops | video localization agency enterprise | video-localization-scale-enterprise | TO PRODUCE |
| 11 | In-House Creative Team vs Agency: A Real Cost Comparison for Enterprise Brands | Industry Insights | creative agency cost savings vs in-house team | in-house-creative-team-vs-agency-cost | TO PRODUCE |
| 12 | What Is a Multilingual Creative Agency — And Does Your Brand Need One? | Enterprise Creative Ops | multilingual creative agency | multilingual-creative-agency-enterprise | TO PRODUCE |

### P3 — Build Topical Authority (Month 3–6)

| # | Article Title | Category | Target Keyword | Slug | Status |
|---|---|---|---|---|---|
| 13 | How to Manage a Creative Agency Relationship at Enterprise Scale | Practical Guides | how to manage creative agency at scale | manage-creative-agency-enterprise-scale | TO PRODUCE |
| 14 | The Enterprise Creative Production Workflow: From Brief to Delivery in 24 Hours | Enterprise Creative Ops | creative production workflow large brand | enterprise-creative-production-workflow | TO PRODUCE |
| 15 | What Enterprise Brands Actually Need From a Creative Partner (That Subscription Services Don't Offer) | Agency Model Analysis | design outsourcing service | what-enterprise-brands-need-from-a-creative-partner | TO PRODUCE |
| 16 | How Global Brands Handle Content for 15+ Markets Simultaneously | Enterprise Creative Ops | global creative agency international team | global-brands-content-production-15-markets | TO PRODUCE |
| 17 | What Does "Unlimited Revisions" Actually Mean? An Agency Transparency Guide | Industry Insights | unlimited revisions creative agency | unlimited-revisions-creative-agency-guide | TO PRODUCE |
| 18 | How to Select a Creative Agency for Enterprise: The 8-Point Checklist | Practical Guides | outsource creative work enterprise | how-to-select-creative-agency-enterprise | TO PRODUCE |
| 19 | Creative Services On Demand vs Annual Contract: Which Works for Enterprise? | Industry Insights | creative services on demand | creative-services-on-demand-vs-contract | TO PRODUCE |
| 20 | Behind Sony's Black Friday Campaign: 125 Banners in 24 Hours | Behind the Scenes | video editing agency enterprise | sony-black-friday-banners-24-hours | TO PRODUCE |

---

## 4. Keyword → Article Mapping (Summary)

| Priority Keyword | Mapped Article # | Target Page |
|---|---|---|
| enterprise creative agency | Homepage (primary) | N/A — not a blog article |
| creative agency for enterprise brands | Homepage / Services | N/A — not a blog article |
| outsource creative work enterprise | Article 18 | /blog/how-to-select-creative-agency-enterprise |
| creative production agency | Services page | N/A — not a blog article |
| unlimited revisions creative agency | Article 17 | /blog/unlimited-revisions-creative-agency-guide |
| outsource graphic design enterprise | Article 18 | /blog/how-to-select-creative-agency-enterprise |
| content creation agency enterprise | Services page | N/A — not a blog article |
| video editing agency enterprise | Article 20 | /blog/sony-black-friday-banners-24-hours |
| agency 24 hour delivery creative | Article 6 | /blog/how-24-hour-creative-delivery-works |
| fixed price creative agency | Article 7 | /blog/fixed-price-vs-subscription-creative-agency |
| creative agency no retainer | Article 3 (existing) | /blog/fixed-pricing-vs-retainers-what-global-brands-prefer |
| how much does a creative agency cost | Article 5 | /blog/creative-agency-cost-enterprise-guide |
| multilingual creative agency | Article 12 | /blog/multilingual-creative-agency-enterprise |
| per project creative agency enterprise | Article 4 | /blog/how-enterprise-teams-scale-creative-production |
| how to choose between subscription and per-project creative agency | Article 4 (secondary) | /blog/how-enterprise-teams-scale-creative-production |

---

## 5. Internal Linking Strategy

### Principle: every article is a commercial funnel entry point

Each blog article must serve two functions simultaneously:
1. **Rank** for a target keyword and attract organic traffic
2. **Convert** by linking to a relevant commercial page with a contextual CTA

No article should be a dead end. Every article ends with a conversion path.

### Link architecture rules

**Rule 1 — Link to one primary commercial page per article**
Each article must contain exactly one primary contextual link to a commercial page:

| If the article covers... | Primary link target |
|---|---|
| Agency model / why outsource | `/services` |
| Pricing / cost comparison | `/pricing` |
| How to choose a creative agency model | `/contact` (start a project) |
| How Sarani works / case study | `/work/[relevant-slug]` |
| Brief / workflow guides | `/contact` |

**Rule 2 — Link to 2–3 related blog articles (cluster linking)**
Each article links to 2–3 thematically related articles within the blog to build topical clusters. This strengthens topical authority and reduces bounce rate.

Example cluster — "Agency Model" cluster:
- Article 1 (why enterprise teams leave agencies) → links to Article 3 (fixed pricing vs retainers) + Article 5 (cost guide) + `/pricing`
- Article 3 (fixed pricing vs retainers) → links to Article 1 (why leave agencies) + Article 7 (fixed price vs subscription) + `/pricing`
- Article 5 (cost guide) → links to Article 3 (fixed pricing) + Article 4 (how enterprise teams scale creative production) + `/contact`

**Rule 3 — The pillar page concept for the blog**
The blog index (`/blog`) is the content pillar. Every article links back to at least one related article. The homepage links to the blog via a "Latest insights" or "From the blog" section (3 most recent articles).

**Rule 4 — Use case studies as proof links**
Articles about production volume, speed, or quality must link to the relevant work page:
- TikTok-related articles → `/work/tiktok` (or equivalent case study slug)
- Sony-related articles → `/work/sony` (or equivalent case study slug)
- GEODIS-related articles → `/work/geodis` (or equivalent case study slug)

**Rule 5 — CTA placement in articles**
Every article must include:
- One inline contextual CTA (mid-article, relevant to the topic)
- One closing CTA block with the Sarani guarantee ("First project satisfaction or no invoice — [Start a project →]")

### Maillage interne — depth audit

Current site structure (max 3 clicks from homepage):
```
/ (homepage)
├── /blog (1 click)
│   └── /blog/[slug] (2 clicks)
├── /work (1 click)
│   └── /work/[slug] (2 clicks)
├── /services (1 click)
├── /pricing (1 click)
├── /about (1 click)
└── /contact (1 click)
```

All blog articles are 2 clicks from homepage — optimal. No article exceeds 3 clicks. The sitemap must reflect this.

---

## 6. Schema Markup Recommendations

### 6.1 Article schema (individual blog posts)

Every `/blog/[slug]` page must implement `Article` JSON-LD. The following template should be added to `src/app/blog/[slug]/page.tsx` via a `<script type="application/ld+json">` tag:

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "[post.metaTitle]",
  "description": "[post.metaDescription]",
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
      "url": "https://sarani.studio/og-image.jpg"
    }
  },
  "datePublished": "[post.publishedAt]",
  "dateModified": "[post.publishedAt]",
  "url": "https://sarani.studio/blog/[post.slug]",
  "mainEntityOfPage": "https://sarani.studio/blog/[post.slug]"
}
```

Implementation: this data is already available in `BlogPost` interface (`publishedAt`, `metaTitle`, `metaDescription`, `slug`). Pass via `generateMetadata` and inject JSON-LD in the page component.

### 6.2 FAQPage schema (for pricing and comparison articles)

Articles 4 (how enterprise teams scale creative production), 5 (agency cost guide), and 17 (unlimited revisions guide) should implement `FAQPage` JSON-LD. Each FAQ section in the article body maps to a Question/Answer pair:

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How much does a creative agency cost for enterprise brands?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Enterprise creative agency costs vary widely. Traditional network agencies (WPP, Publicis, Havas) charge 50,000–500,000€+ in annual retainers. Subscription services charge thousands per month regardless of actual volume. Sarani offers per-project fixed pricing: a banner starts at 155€, a full rebranding at 5,000€ — no subscription, no retainer, no minimum commitment."
      }
    }
  ]
}
```

FAQPage schema increases the probability of Google rich snippet display (accordion Q&A in SERP) — directly improving CTR.

### 6.3 Organization schema (homepage and blog index)

The homepage must implement `Organization` JSON-LD. Verify it is in place at `src/app/layout.tsx` or `src/app/page.tsx`. If absent, add:

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Sarani",
  "url": "https://sarani.studio",
  "logo": "https://sarani.studio/logo.svg",
  "description": "Enterprise-quality creative, delivered in 24 hours — unlimited revisions, fixed prices, zero surprises.",
  "foundingDate": "2020",
  "numberOfEmployees": "35",
  "areaServed": "Worldwide",
  "knowsLanguage": ["en", "fr", "de", "es", "zh", "ja", "ko", "ar", "pt", "it", "nl", "ru", "pl", "tr", "sv", "da", "no", "fi"],
  "sameAs": [
    "https://www.linkedin.com/company/sarani",
    "https://www.instagram.com/sarani"
  ]
}
```

### 6.4 BreadcrumbList schema (blog pages)

Blog article pages should implement `BreadcrumbList` for SERP breadcrumb display:

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {"@type": "ListItem", "position": 1, "name": "Home", "item": "https://sarani.studio"},
    {"@type": "ListItem", "position": 2, "name": "Blog", "item": "https://sarani.studio/blog"},
    {"@type": "ListItem", "position": 3, "name": "[Article Title]", "item": "https://sarani.studio/blog/[slug]"}
  ]
}
```

---

## 7. Technical SEO Checklist — Next.js Specific

### 7.1 Metadata — generateMetadata

Status of existing implementation: the blog index (`/blog/page.tsx`) has static `metadata` export with title and description. The blog article page must have dynamic `generateMetadata` using the `BlogPost` interface fields.

**Checklist:**

- [ ] `/blog/page.tsx` — static metadata present (title + description + OG) — **DONE (verified)**
- [ ] `/blog/[slug]/page.tsx` — dynamic `generateMetadata` using `post.metaTitle` and `post.metaDescription` — **TO VERIFY**
- [ ] All meta titles follow the format: `[Specific Title] — Sarani` (max 60 chars)
- [ ] All meta descriptions are 140–160 characters (actionable, keyword-containing)
- [ ] OG image is set per article (or falls back to a default `/og-image.jpg` with the Sarani brand)
- [ ] `canonical` URL is set on all blog pages to prevent duplicate content

### 7.2 Sitemap

- [ ] `src/app/sitemap.ts` — add `/blog` static route (priority 0.7, changeFrequency: "weekly")
- [ ] `src/app/sitemap.ts` — add dynamic blog article routes using `getAllBlogSlugs()` (priority 0.7, changeFrequency: "monthly")
- [ ] Verify sitemap is accessible at `https://sarani.studio/sitemap.xml` after deployment
- [ ] Submit sitemap to Google Search Console (once site is live — W4 milestone)

**Required code addition to `src/app/sitemap.ts`:**
```typescript
import { getAllBlogSlugs } from "@/data/blog-posts";

// Inside the sitemap function, add:
const blogStaticRoute = {
  url: `${baseUrl}/blog`,
  lastModified,
  changeFrequency: "weekly" as const,
  priority: 0.7,
};

const blogArticleRoutes = getAllBlogSlugs().map((slug) => ({
  url: `${baseUrl}/blog/${slug}`,
  lastModified,
  changeFrequency: "monthly" as const,
  priority: 0.7,
}));

// Return: [...staticRoutes, ...caseStudyRoutes, blogStaticRoute, ...blogArticleRoutes]
```

### 7.3 robots.txt

- [ ] Current `robots.ts` verified: allows all public routes, disallows `/api/` — **DONE (verified)**
- [ ] Add `/admin` to disallow list (admin routes must not be indexed):

```typescript
// In src/app/robots.ts, update rules:
rules: [
  {
    userAgent: "*",
    allow: "/",
    disallow: ["/api/", "/admin/"],
  },
],
```

### 7.4 OG Images

- [ ] Default OG image at `/public/og-image.jpg` — 1200x630px, Sarani brand
- [ ] Blog articles: either dynamic OG (using Next.js ImageResponse) or static default
- [ ] Verify OG image renders correctly on LinkedIn and Twitter Card validators before go-live

### 7.5 Core Web Vitals — Blog Specific

Blog articles are server-rendered (SSG via `generateStaticParams`) — performance should be strong by default. Specific checks:

- [ ] Confirm `src/app/blog/[slug]/page.tsx` uses `generateStaticParams` for SSG (not SSR on demand)
- [ ] Images in blog articles (if any) use `next/image` with explicit `width` and `height` (prevents CLS)
- [ ] No client-side data fetching on article load (content is in `blog-posts.ts` — static)
- [ ] LCP target: article hero/H1 visible in <2.5s on 4G mobile (Infrastructure @infrastructure to validate at W4)

### 7.6 Internal Linking — Technical Implementation

- [ ] Blog index page (`/blog/page.tsx`) renders links to all articles — **DONE (verified)**
- [ ] Each article page links to at least 2 related articles (RelatedPosts component or inline)
- [ ] Each article page links to one primary commercial page (Services, Pricing, or Contact)
- [ ] Homepage includes a "From the blog" section with 3 most recent articles (if not yet implemented, add to @fullstack backlog)

---

## 8. Roadmap Alignment

| Roadmap Item | Deliverable | Status |
|---|---|---|
| W6 — SEO keyword map | `docs/seo/keyword-map.md` | **DONE** |
| W6 — Blog architecture | `docs/seo/blog-architecture.md` | **DONE** |
| W7–W8 — First 4 SEO articles (AI-produced) | Articles 4 (how enterprise teams scale creative production), 5 (cost guide), 6 (D+1 delivery), 7 (fixed price vs subscription) | Handoff → @copywriter |
| W8–W9 — GEO/LLM optimization layer | FAQPage schema + structured content on blog | Handoff → @geo |
| W9–W10 — Ongoing 2 articles/month | Autonomous pipeline | Handoff → @seo + @ia |

---

## 9. Hypotheses to Validate

- [HYPOTHESE] The blog index currently has no pagination. If the blog reaches 20+ articles, adding pagination with `rel="canonical"` or load-more (preferred) will be necessary to avoid thin-content indexing issues.
- [HYPOTHESE] No CMS is in place — articles are stored in `blog-posts.ts`. At 10+ articles, this file becomes unwieldy. A headless CMS (Contentful, Sanity) or MDX-based approach should be evaluated at W10. Flagged for @product-manager and @fullstack.
- [HYPOTHESE] The `BlogPost.content` field is a plain string. If articles are to be structured with H2/H3 headings (required for SEO — heading hierarchy), the content format must support markdown or JSX. Current format appears to use raw markdown syntax (`**bold**`) rendered as plain text — verify this renders correctly with heading structure on the article page.

---
*Self-evaluation checklist (@seo internal):*
- [x] URL structure defined and justified
- [x] 5 content categories with persona and keyword group
- [x] 20 article titles proposed with target keyword and slug
- [x] Keyword → article mapping complete
- [x] Internal linking strategy covers both editorial and commercial links
- [x] Schema markup (Article, FAQPage, Organization, BreadcrumbList) with implementation-ready JSON-LD
- [x] Technical SEO checklist is Next.js specific — referencing actual files from the codebase audit
- [x] Sitemap update code snippet provided for @fullstack
- [x] robots.txt gap identified (/admin not disallowed) — actionable fix provided
- [x] All hypotheses documented
- [x] Roadmap alignment verified
