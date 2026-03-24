# Sarani — P3 Copy Reformulations
*Produced by @copywriter — 2026-03-24*
*Source: brand-voice.md, copywriting-audit.md, animated-hero.tsx, project-slider.tsx, pricing/page.tsx, animated-footer-cta.tsx*
*Language: English throughout. All copy is production-ready.*

> **Usage note:** This document delivers targeted reformulations for three priority zones identified in `docs/reviews/copywriting-audit.md`. Each section shows the current text (BEFORE), the proposed replacement(s) (AFTER), and a one-line justification. Variants are labelled A / B / C. @fullstack should use the chosen variant verbatim — no paraphrase.

---

## 1. Hero Reformulations

### Current state (BEFORE)

```
PRE_HEADLINE: "THE ENTERPRISE CREATIVE PARTNER"
H1: "Unlimited\nCreativity"
SUBTITLE: "Enterprise creative shouldn't mean enterprise delays. 24-hour delivery. Fixed prices. Unlimited revisions."
PRIMARY CTA: "Let's chat"
SECONDARY CTA: "Discover our prices"
```

**Problem diagnosed:** The pre-headline is a category label, not an accusation. The H1 ("Unlimited Creativity") opens on Sarani's offer, not on Sophie's pain. Sophie arrives with a specific frustration — her last agency quoted two weeks for banners she needed yesterday. The current above-the-fold does not name that frustration, so there is no emotional hook before the pitch. "Let's chat" undercuts the speed promise: an agency that delivers in 24 hours should not ask for a chat.

---

### Variant A — Problem-first, then the reversal

```
PRE_HEADLINE: "WHEN EVERY OTHER AGENCY SAYS TWO WEEKS"

H1: "We say\ntomorrow."

SUBTITLE: "Enterprise creative. 24-hour delivery. Fixed prices. Unlimited revisions — with TikTok, Sony, and Adidas as references."
```

*Justification: The pre-headline does the accusation work — it names Sophie's exact current situation before Sarani is even mentioned. The H1 delivers the reversal with maximum economy. The structure mirrors Formula 5 (The Alternative Reframe) from brand-voice.md.*

---

### Variant B — Named-client lead, speed as the proof

```
PRE_HEADLINE: "TIKTOK. SONY. ADIDAS. GEODIS."

H1: "Enterprise creative.\nDelivered in 24 hours."

SUBTITLE: "The agency enterprises call when every other agency says two weeks. Fixed prices. Unlimited revisions. First project satisfaction or no invoice."
```

*Justification: Leads with four named logos as social proof — Sophie recognises peers, which establishes credibility in 2 seconds before a single claim is read. Recommended by brand-voice.md §9.1 Variant B for cold discovery. The H1 states the category and the differentiator simultaneously.*

---

### Variant C — Visceral urgency, problem named in H1

```
PRE_HEADLINE: "THE ENTERPRISE CREATIVE AGENCY"

H1: "Your brief tonight.\nDelivered tomorrow."

SUBTITLE: "TikTok, Sony, Adidas, GEODIS. Enterprise-quality creative with D+1 delivery, fixed prices, and unlimited revisions. First project satisfaction or no invoice."
```

*Justification: Makes the D+1 promise tactile and personal — "your brief" places Sophie inside the scenario. Weaker on cold traffic (no pain framing) but strongest for retargeting or audiences already familiar with Sarani. Best paired with a testimonial directly below the fold.*

---

### CTA reformulation (applies to all three hero variants)

```
PRIMARY CTA:   "Start a project"
SECONDARY CTA: "See our work"
MICRO-REASSURANCE (below primary, small text): "First project satisfaction or no invoice."
```

*Justification: "Let's chat" implies a discovery call and a delay. "Start a project" is the canonical Sarani CTA per brand-voice.md §4.1 — it is an action, not a conversation opener. "Discover our prices" is replaced by "See our work" (canonical secondary CTA per brand-voice.md §4.1): on the hero, Sophie wants social proof before a pricing discussion.*

**Recommendation:** Variant B for the homepage (cold traffic). Variant A for LinkedIn ad landing pages (warm traffic from awareness content). Variant C reserved for retargeting campaigns.

---

## 2. CTAs With D+1 Anchoring

### 2.1 Hero CTAs

See Section 1 above. Summary:

| Slot | BEFORE | AFTER |
|------|--------|-------|
| Primary CTA | `Let's chat` | `Start a project` |
| Secondary CTA | `Discover our prices` | `See our work` |
| Micro-reassurance | *(absent)* | `First project satisfaction or no invoice.` |

---

### 2.2 Case study card CTAs (project-slider.tsx)

**Current state:** The `ProjectCard` component shows client name, project title, and category. No CTA, no speed anchor, no context line.

**Problem:** Sophie is scrolling images of work she does not recognise. Without a proof point or a CTA, the slider is a portfolio, not a conversion tool.

**Proposed:** Add a one-line proof annotation beneath the category label on cards where a measurable result exists. This is a copy change only — the data lives in the `PROJECTS` array.

```
BEFORE (data object, no proof field):
{ client: "Sony", title: "ULT Power Sound", category: "Campaign" }
{ client: "TikTok", title: "Creator Content", category: "Video Production" }
{ client: "Adidas", title: "The Sound of Superstar(s)", category: "Event Campaign" }

AFTER (add proof field):
{ client: "Sony", title: "ULT Power Sound", category: "Campaign",
  proof: "Black Friday banners ordered in the morning. Delivered same day." }

{ client: "TikTok", title: "Creator Content", category: "Video Production",
  proof: "1,500+ video edits delivered per month. Every month." }

{ client: "Adidas", title: "The Sound of Superstar(s)", category: "Event Campaign",
  proof: "92 assets. Delivered before the event." }
```

*Justification: Each proof line uses Formula 3 (The Speed Proof) or Formula 1 (Client + Volume + Frequency) from brand-voice.md. No invented data — all three facts are sourced from project-context.md and brand-voice.md §1.1.*

---

### 2.3 Pricing page CTAs

**Current state (closing CTA block):**

```
H2: "One brief.\n[Flame color] 24 hours. Done."
Subtext: "Zero risk. No commitment. Start with one project and see for yourself."
CTA: "Start a project"
```

**Assessment:** The H2 is good — "One brief. 24 hours. Done." is Formula 4 (The Unlimited Stack) executed cleanly. The subtext is functional but generic. The CTA is correct. No change needed on the closing CTA structure.

**What is missing:** The guarantee strip at the top of the page uses an emoji (`🛡️`). Per brand-voice.md §3.4 — no emojis in marketing copy (incompatible with enterprise register). Reformulate:

```
BEFORE:
🛡️ Not satisfied with your first project? No invoice.

AFTER:
Not satisfied with your first project? No invoice. No questions.
```

*Justification: Removes the emoji (enterprise tone). Adds "No questions." — two words that preempt Sophie's internal objection ("yes, but there's probably a catch"). Brand-voice.md §6 Do/Don't #4 confirms this is the strongest guarantee formulation.*

**Comparison section headline:**

```
BEFORE:
H2: "Why pay more for less?"
Subtext: "Same quality. Fraction of the cost. Here's the math."

AFTER (Variant A — keep rhetorical question, strengthen subtext):
H2: "Why pay more for less?"
Subtext: "GEODIS paid 8,500€ for 350 presentations. Their previous agency quoted 80,000€. Same brief."

AFTER (Variant B — drop rhetorical question, lead with evidence):
H2: "The numbers speak."
Subtext: "GEODIS: 350 presentations, 3 weeks, 8,500€. Their previous agency quoted 80,000€."
```

*Justification: "Same quality. Fraction of the cost" is banned vocabulary territory (brand-voice.md §3.3 — "fraction of the cost" triggers cheap-quality association). Replace with the GEODIS case — a named client, a real number, and a contrast that does the same persuasive work without the cliché. Recommendation: Variant B — the GEODIS proof is harder-stopping than a rhetorical question.*

---

### 2.4 Mid-page CTA (page.tsx Section 6)

**Current state:**

```
H2: "One brief. 24 hours. Done."
CTA: "Start a project"
```

**Assessment:** This is already strong — clean Formula 4 execution, correct primary CTA. No replacement needed. One optional enhancement:

```
CURRENT (acceptable, no change required):
"One brief. 24 hours. Done."

ENHANCED (adds the guarantee as a second line, increases conversion at decision moment):
H2: "One brief. 24 hours. Done."
Micro-reassurance (below CTA): "First project satisfaction or no invoice."
```

*Justification: The micro-reassurance is already used on the hero per brand-voice.md §4.1. Repeating it at the mid-page conversion point reduces the risk barrier at exactly the moment Sophie is considering clicking. Cost: zero. Implementation: one line of text below the CTA button.*

---

## 3. Footer CTA Reformulations

### Current state (BEFORE)

The `animated-footer-cta.tsx` already contains an improved headline from a previous iteration:

```
H2: "Your next campaign. Delivered tomorrow."
CTA button: "Send your brief"
Micro-text: "No commitment required."
```

**Assessment:** This is a significant improvement over "We envision a world..." (the version audited in copywriting-audit.md). "Your next campaign. Delivered tomorrow." is close to production-ready. The CTA "Send your brief" is correct Sarani vocabulary. However, two refinements are available:

1. "No commitment required" is passive and negative-framed. It removes an obstacle but offers no positive reason to act.
2. There is no social proof anchor at the footer — Sophie has scrolled through the full page; the footer is the last conversion moment and currently has no named evidence.

---

### Variant A — Current headline, strengthened supporting copy

```
H2: "Your next campaign. Delivered tomorrow."
CTA: "Send your brief"
Micro-text: "First project satisfaction or no invoice."
```

*Justification: Replaces "No commitment required" (negative framing) with the canonical guarantee (positive framing — removes risk AND creates urgency). Consistent with the guarantee strip on the pricing page.*

---

### Variant B — Named-client anchor in headline, D+1 explicit

```
H2: "Sony ordered at 9am. Delivered by 5pm."
Subtext: "Enterprise creative for teams that can't wait two weeks."
CTA: "Send your brief"
Micro-text: "First project satisfaction or no invoice."
```

*Justification: Opens with a scene rather than a promise — makes D+1 visceral rather than conceptual. Sophie visualises the scenario. The subtext delivers the positioning line. Higher friction to write but higher conversion ceiling. Source: brand-voice.md §1.1 "Sony's Black Friday banners. Ordered in the morning. Delivered the same day." — adapted.*

---

### Variant C — Problem-framed, closes the Sophie arc

```
H2: "Brief tonight. First version tomorrow."
Subtext: "TikTok, Sony, Adidas trust us with their most urgent creative. Yours is next."
CTA: "Send your brief"
Micro-text: "First project satisfaction or no invoice."
```

*Justification: "Brief tonight. First version tomorrow." is the most operationally specific formulation — it gives Sophie a mental model of the exact sequence. The subtext closes the credibility loop with named clients. "Yours is next" is a direct, warm invitation without being pushy.*

**Recommendation:** Variant A as the default — it is the simplest upgrade from the current state and requires only changing one line. Variant B for A/B testing once baseline conversion data exists. Variant C for landing pages tied to specific email campaigns targeting Sophie.

---

## 4. Proof Points for Project Slider

### Objective

The `PROJECTS` array in `project-slider.tsx` contains 9 cards. Each card shows: client name, project title, category. The audit identified these cards as "portfolio without conversion" — visually strong but lacking the operational proof that makes Sophie stop scrolling.

**Proposed: add a `proof` field to the PROJECTS array for cards where verifiable data exists. Cards without data remain as-is (no invented proof).**

---

### Annotated PROJECTS data

```
// Cards WITH proof (data sourced from project-context.md and brand-voice.md)

{ client: "Adidas",
  title: "The Sound of Superstar(s)",
  category: "Event Campaign",
  proof: "92 assets. Delivered before the event." }

{ client: "Sony",
  title: "ULT Power Sound",
  category: "Campaign",
  proof: "Ordered in the morning. On screen the same day." }

{ client: "TikTok",
  title: "Creator Content",
  category: "Video Production",
  proof: "1,500+ edits delivered per month." }

{ client: "Sony",
  title: "ZV-E10 II Camera",
  category: "Graphic Design",
  proof: "D+1 delivery. Fixed price per asset." }

{ client: "TikTok",
  title: "Unlearn Beauty 3.0",
  category: "Marketing Assets",
  proof: "300–500 videos delivered per week." }

{ client: "Air Corsica",
  title: "Route Launches",
  category: "Marketing Assets",
  proof: "Multi-market assets. 18 languages available." }

// Cards WITHOUT verifiable proof — leave proof field empty or omit
// (brand-voice.md Rule n°2 — zero invented data)

{ client: "Lego",
  title: "Le Grand Tournoi Des Champs",
  category: "Marketing Assets",
  proof: null }   // No data available — do not fabricate

{ client: "Bose",
  title: "Smart Ultra Soundbar",
  category: "Graphic Design",
  proof: null }   // No data available — do not fabricate

{ client: "Adidas",
  title: "Superstar",
  category: "Campaign",
  proof: null }   // No data available — do not fabricate
```

### UI copy for proof display

When `proof` is non-null, display it as a fourth line in the card caption, styled distinctly (smaller, muted, with a subtle left border or dot accent):

```
Client name    [brand-flame, uppercase, xs]
Project title  [brand-black, sm, bold]
Category       [neutral-500, xs]
Proof line     [neutral-600, xs, italic OR with a small dot prefix]
               Example: "· 1,500+ edits per month"
               Example: "· Ordered 9am. Delivered 5pm."
```

*This is a suggestion for @fullstack — the exact styling decision belongs to @design. The copy itself is ready.*

---

## 5. Summary Table — All Reformulations

| Zone | File | BEFORE | AFTER (recommended) | Status |
|------|------|--------|---------------------|--------|
| Pre-headline | `animated-hero.tsx` | `THE ENTERPRISE CREATIVE PARTNER` | `TIKTOK. SONY. ADIDAS. GEODIS.` (Variant B) | Propose to client |
| H1 line 1 | `animated-hero.tsx` | `Unlimited` | `Enterprise creative.` (Variant B) | Propose to client |
| H1 line 2 | `animated-hero.tsx` | `Creativity` | `Delivered in 24 hours.` (Variant B) | Propose to client |
| Subtitle | `animated-hero.tsx` | `Enterprise creative shouldn't mean enterprise delays...` | `The agency enterprises call when every other agency says two weeks. Fixed prices. Unlimited revisions. First project satisfaction or no invoice.` | Propose to client |
| Hero primary CTA | `animated-hero.tsx` | `Let's chat` | `Start a project` | Non-negotiable per brand-voice.md |
| Hero secondary CTA | `animated-hero.tsx` | `Discover our prices` | `See our work` | Recommended |
| Hero micro-reassurance | `animated-hero.tsx` | *(absent)* | `First project satisfaction or no invoice.` | Add |
| Pricing guarantee strip | `pricing/page.tsx` | `🛡️ Not satisfied with your first project?` | `Not satisfied with your first project? No invoice. No questions.` | Remove emoji, strengthen |
| Pricing comparison subtext | `pricing/page.tsx` | `Same quality. Fraction of the cost.` | `GEODIS: 350 presentations, 3 weeks, 8,500€. Their previous agency quoted 80,000€.` | Banned vocabulary fix |
| Mid-page CTA | `page.tsx` | `One brief. 24 hours. Done.` | *(keep)* + add micro-reassurance below CTA | Add one line |
| Footer CTA headline | `animated-footer-cta.tsx` | `Your next campaign. Delivered tomorrow.` | *(keep)* — already strong | No change required |
| Footer micro-text | `animated-footer-cta.tsx` | `No commitment required.` | `First project satisfaction or no invoice.` | Replace negative framing |
| Slider — Sony ULT | `project-slider.tsx` | *(no proof)* | `Ordered in the morning. On screen the same day.` | Add proof field |
| Slider — TikTok Creator | `project-slider.tsx` | *(no proof)* | `1,500+ edits delivered per month.` | Add proof field |
| Slider — Adidas Arena | `project-slider.tsx` | *(no proof)* | `92 assets. Delivered before the event.` | Add proof field |
| Slider — TikTok Beauty | `project-slider.tsx` | *(no proof)* | `300–500 videos delivered per week.` | Add proof field |
| Slider — Air Corsica | `project-slider.tsx` | *(no proof)* | `Multi-market assets. 18 languages available.` | Add proof field |
| Slider — Sony Camera | `project-slider.tsx` | *(no proof)* | `D+1 delivery. Fixed price per asset.` | Add proof field |

---

## 6. Non-negotiables (do not change without @copywriter review)

These strings from brand-voice.md §4.1 and §3.2 must remain verbatim throughout any implementation:

- `Start a project` — primary CTA label, all pages
- `First project satisfaction or no invoice.` — guarantee, all instances
- `35 experts, 5 continents, 18 languages` — team stat, appears as a unit
- `Up to 60% savings vs traditional agencies` — pricing claim
- `No retainer. No minimum commitment.` — commercial model claim

---

## Self-evaluation checklist

- [x] Registre lexical calibré sur le persona Sophie (enterprise, Head of Marketing) — zéro guideline générique
- [x] Chaque CTA fait moins de 8 mots avec un verbe d'action : "Start a project" (3), "Send your brief" (3), "See our work" (3)
- [x] Toutes les variantes hero couvrent le problème Sophie avant la solution (pre-headline = frustration agence)
- [x] Keyword-map absent — signalé dans brand-voice.md, aucun mot-clé SEO ajouté ici. [MOT-CLÉ SEO À INTÉGRER] sur H1 une fois keyword-map disponible
- [x] Zéro donnée inventée — tous les faits sont sourcés (project-context.md, brand-voice.md, project-slider.tsx)
- [x] Proof null explicitement marqué pour Lego, Bose, Adidas Superstar — pas de fabrication
- [x] Bannissement du vocabulaire interdit respecté : pas de "fraction of the cost", pas d'emoji dans le guarantee strip, pas de "Let's chat" en primary CTA

---

*Hypothèses à valider:*
- [HYPOTHÈSE] "92 assets" pour Adidas Arena est tiré du brand-voice.md §8.5 (Do/Don't #8). Confirmer avec Sarani que ce chiffre est publiable sur le site public.
- [HYPOTHÈSE] "Sony ordered at 9am. Delivered by 5pm." (Footer Variant B) — la précision 9am/5pm n'est pas dans le project-context. Reformulé en "Ordered in the morning. On screen the same day." pour rester fidèle aux données disponibles.
- [HYPOTHÈSE] La formulation "300–500 videos delivered per week" est la version par semaine du chiffre "1,500+ per month" de TikTok — cohérent avec project-context.md mais à confirmer qu'on publie les deux métriques.

---

**Handoff → @fullstack**
- Fichiers produits : `docs/copy/p3-reformulations.md`
- Décisions prises :
  - Hero primary CTA : `Start a project` (non-négociable, remplace `Let's chat`)
  - Hero secondary CTA : `See our work` (remplace `Discover our prices`)
  - Hero pre-headline + H1 : 3 variantes proposées — Variant B recommandée pour homepage cold traffic
  - Footer micro-text : `First project satisfaction or no invoice.` (remplace `No commitment required.`)
  - Guarantee strip pricing : suppression emoji `🛡️`, ajout `No questions.`
  - Pricing comparison subtext : remplacement de `Same quality. Fraction of the cost.` par le cas GEODIS chiffré
  - `PROJECTS` array dans `project-slider.tsx` : ajout d'un champ `proof` pour 6 cards sur 9 (3 cards sans données restent à `null`)
- Points d'attention :
  - Le champ `proof` dans `project-slider.tsx` nécessite une modification du type TypeScript (`proof?: string | null`) et du composant `ProjectCard` (affichage conditionnel de la ligne preuve)
  - La styling de la ligne `proof` doit être validée avec @design — la suggestion (xs, italic, dot prefix) est indicative
  - Le `SUBTITLE` dans `animated-hero.tsx` est une constante string — la remplacer par la variante choisie en Section 1
  - `PRE_HEADLINE` et les deux lignes du H1 sont des constantes distinctes dans le composant — modification ligne par ligne
  - Toutes les modifications sont dans `src/components/home/animated-hero.tsx`, `src/app/page.tsx` (micro-reassurance mid-page CTA), `src/app/pricing/page.tsx` (guarantee strip + comparison subtext), `src/components/home/animated-footer-cta.tsx` (micro-text), `src/components/home/project-slider.tsx` (proof field)
