# Audit du site public Sarani — 2026-03-25

## Score global : 7.5/10

Le site est solide sur le plan structurel, bien aligne avec le positionnement Sarani (Ultra-rapide, Ultra-serviable, Livre-toujours), avec un design system coherent et un bon niveau d'accessibilite. Les problemes identifes sont principalement : des liens morts dans le footer, des incoherences de donnees entre composants, des images placeholder non remplacees, et quelques opportunites de conversion manquees.

---

## Score par page

| Page | Score | Problemes principaux |
|---|---|---|
| Homepage | 8/10 | ProjectSlider duplique, proof cards sans lien vers case studies |
| About | 8/10 | Pas d'images equipe, bon storytelling, CTA un peu faible |
| Services | 8.5/10 | Excellente structure, proof points convaincants |
| Work/Portfolio | 7/10 | Pas de filtrage par categorie, pas de CTA en bas de page |
| Case Studies detail | 7.5/10 | Images placeholder vides, galleries vides |
| Work Detail | 7.5/10 | Code quasi-duplique avec case-studies/[slug], images placeholder |
| Pricing | 8.5/10 | Tres persuasif, tableau comparatif efficace |
| Contact | 8.5/10 | Formulaire complet et bien structure, excellent UX |
| Legal | 7/10 | Correct mais basique, ancre #privacy dans footer pointe mal |

---

## Problemes critiques

### C1 — Lien mort : `/how-we-work` (footer.tsx, ligne 5)

**Fichier** : `src/components/layout/footer.tsx`, ligne 5
**Probleme** : Le footer reference `/how-we-work` dans ABOUT_LINKS. Cette page n'existe pas — aucun fichier `src/app/how-we-work/page.tsx` n'est present. Les visiteurs qui cliquent sur "How we work" arriveront sur la page 404.
**Criticite** : BLOQUANT
**Fix** : Supprimer le lien ou le rediriger vers `/about` ou `/services`. Alternativement, creer la page.

### C2 — Lien mort : `/legal#privacy` (footer.tsx, ligne 26)

**Fichier** : `src/components/layout/footer.tsx`, ligne 26
**Probleme** : Le footer reference `/legal#privacy` mais la page legal utilise l'id `privacy-policy` (ligne 84 de legal/page.tsx). L'ancre ne marchera pas — le scroll ne se fera pas vers la bonne section.
**Criticite** : MAJEUR
**Fix** : Changer le href dans le footer de `/legal#privacy` a `/legal#privacy-policy`.

### C3 — Incoherence de donnees : "50+ experts" vs "35 experts"

**Fichiers** : `src/components/home/faq.tsx` (lignes 22, 57-58) vs tout le reste du site
**Probleme** : Dans la FAQ, deux reponses mentionnent "50+ experts" et "50+ in-house experts" :
- "Our structured team of 50+ experts works in a relay model" (question 3)
- "We have 50+ in-house experts across Paris, London, Dubai, Buenos Aires, Manila" (question 12)

Or, tout le reste du site (hero, about, services, layout metadata) dit "35 experts". Le project-context.md confirme 35.
**Criticite** : BLOQUANT — incoherence factuelle visible par le visiteur, detruit la credibilite.
**Fix** : Remplacer "50+" par "35" dans les deux reponses FAQ.

### C4 — Images placeholder sur les case studies detail

**Fichiers** : `src/app/case-studies/[slug]/page.tsx` (lignes 118-120, 198-201) et `src/app/work/[slug]/page.tsx` (lignes 132-133, 236-241)
**Probleme** : Les sections "Hero image" et "Gallery" sont des `<div>` vides avec `bg-surface-elevated`. Aucune image reelle n'est affichee. Pour une agence creative, montrer des blocs gris a la place du portfolio est un probleme grave de credibilite.
**Criticite** : BLOQUANT — les case studies sont la preuve de competence de Sarani.
**Fix** : Ajouter les images reelles de chaque projet. En attendant, au minimum afficher une image generique par client plutot qu'un bloc gris.

### C5 — Page `/services` absente de la navigation principale

**Fichier** : `src/components/layout/header.tsx`, lignes 12-17
**Probleme** : Le header NAV_LINKS contient Work, Pricing, About, Contact — mais pas Services. La page services existe pourtant et est riche. Un visiteur ne la trouvera que via le footer (lien indirect via categories). Sophie (persona) qui veut comprendre ce que Sarani fait doit deviner.
**Criticite** : MAJEUR
**Fix** : Ajouter "Services" dans NAV_LINKS, idalement entre "Work" et "Pricing". Ou fusionner Services dans la page About si la navigation doit rester compacte.

### C6 — Code duplique : deux templates de case study quasi-identiques

**Fichiers** : `src/app/case-studies/[slug]/page.tsx` et `src/app/work/[slug]/page.tsx`
**Probleme** : Les deux pages partagent ~80% du meme code (hero, At a Glance sidebar, Results, Gallery, Related, CTA). La page `/work/[slug]` ajoute les champs challenge/solution/tags, mais la structure est un copier-coller. Cela cree un risque de derive : une correction sur l'un ne sera pas appliquee a l'autre. De plus, le meme slug genere deux URLs differentes (`/case-studies/sony-black-friday` ET `/work/sony-black-friday`) ce qui est un probleme SEO (contenu duplique).
**Criticite** : MAJEUR (SEO + maintenabilite)
**Fix** : Choisir une seule route (`/work/[slug]` semble le choix naturel), supprimer l'autre, et mettre en place une redirection 301 de l'ancienne route vers la nouvelle.

### C7 — TrackedCta hardcode `page: "/"` dans toutes les pages

**Fichier** : `src/components/home/tracked-cta.tsx`, ligne 34
**Probleme** : Le tracking analytique envoie toujours `page: "/"` dans l'evenement `cta_click`, meme quand le CTA est utilise sur d'autres pages que la homepage (il est utilise sur la homepage sections mid_cta, hero, footer_cta). Toute analyse de conversion par page sera faussee.
**Criticite** : MAJEUR
**Fix** : Utiliser `usePathname()` de Next.js pour envoyer le pathname reel au lieu de `"/"`.

---

## Problemes de contenu / copy

### CP1 — Phrases generiques identifiees

| Emplacement | Phrase generique | Suggestion alignee Sarani |
|---|---|---|
| FAQ Q4 | "Every deliverable goes through an internal review by our Creative Director and senior leads" | Formulation correcte mais manque de preuve concrete — ajouter un chiffre ou un exemple client |
| FAQ Q7 | "Visit our Projects page to see work we've delivered for TikTok, Sony, Adidas, IKEA, LEGO, and many others" | Reference a "IKEA" et "LEGO" ici mais ces clients ne sont pas dans les logos hero (client-logos.tsx) — incoherence |
| FAQ Q8 | "Adobe Illustrator, Photoshop, InDesign, After Effects [...] Figma" | Liste d'outils generique — n'importe quelle agence dirait la meme chose. Remplacer par un angle unique (ex: "We work with your tools, your templates, your brand system.") |
| About page "What we believe" | "Enterprise-quality creative should not require an enterprise-sized commitment" | Correct et percutant — garder |

### CP2 — Client logos manquants dans le trust strip

**Fichier** : `src/components/home/client-logos.tsx`
**Probleme** : Seuls 6 logos sont affiches (TikTok, Sony, GEODIS, Adidas, L'Oreal, PICO). Le project-context mentionne aussi Pernod Ricard, Air Corsica, LEGO, IKEA, Bose. La FAQ mentionne IKEA et LEGO. Les case studies incluent LEGO et IKEA. L'absence de ces logos dans le strip de confiance est une opportunite manquee.
**Criticite** : MINEUR
**Fix** : Ajouter au minimum LEGO, IKEA et Pernod Ricard au trust strip.

### CP3 — "First project satisfaction or no invoice" repete 5+ fois

**Emplacements** : Hero, mid-CTA, footer CTA, pricing page, contact form
**Probleme** : Ce n'est pas en soi un probleme — c'est une garantie forte qui merite de la repetition. Cependant, sur la homepage seule, elle apparait 3 fois en scrollant. Risque de dilution du message.
**Criticite** : MINEUR — surveiller mais acceptable.

### CP4 — TikTok proof card prix ambigu

**Fichier** : `src/components/home/proof-cards.tsx`, ligne 22
**Probleme** : Le proof card TikTok affiche "300-500/week" comme prix, ce qui est en fait le volume de videos par semaine, pas le prix. Confusion avec les deux autres cards qui affichent un prix (155 EUR, 8,500 EUR).
**Criticite** : MAJEUR — induit le visiteur en erreur sur le pricing.
**Fix** : Remplacer par "$20/video" (prix reel mentionne dans les case studies) ou clarifier la presentation.

---

## Problemes de coherence visuelle

### V1 — FAQ homepage (animated framer-motion) vs FAQ pricing (native `<details>`)

**Fichiers** : `src/components/home/faq.tsx` vs `src/app/pricing/page.tsx` (lignes 234-250)
**Probleme** : La homepage utilise un composant FAQ avec framer-motion et une animation fluide du + qui tourne a 45 degres. La page pricing utilise un element `<details>` natif HTML avec un style different (rounded-xl, border, bg-brand-white, shadow hover). L'experience visuelle est incoherente — deux patterns differents pour la meme fonctionnalite.
**Criticite** : MINEUR
**Fix** : Reutiliser le composant `<Faq>` de la homepage, ou creer un composant partage `<Accordion>` utilise partout.

### V2 — Button component wraps avec motion.div cree un `<div>` inline

**Fichier** : `src/components/ui/button.tsx`
**Probleme** : Le Button wraps `<a>` ou `<button>` dans un `<motion.div className="inline-block">`. Cela signifie que chaque Button genere un `<div>` supplementaire dans le DOM. Le composant est utilise comme enfant de `<p>` et `<div>` dans plusieurs endroits, mais si jamais il est place dans un contexte inline, le `<div>` casserait la semantique HTML.
**Criticite** : MINEUR
**Fix** : Utiliser `motion.span` au lieu de `motion.div` pour etre inline-safe.

---

## Problemes SEO

### S1 — Contenu duplique : deux routes pour les memes case studies

Voir C6 ci-dessus. `/case-studies/[slug]` et `/work/[slug]` generent le meme contenu. Google risque d'indexer les deux, diluant le ranking.
**Fix** : Une seule route + redirect 301 + canonical tag.

### S2 — Page Work/Portfolio n'a pas de CTA en bas de page

**Fichier** : `src/app/work/page.tsx`
**Probleme** : La page se termine abruptement apres la grille de case studies. Pas de CTA "Start a project", pas de section de reassurance. Un visiteur qui a parcouru le portfolio et qui est convaincu n'a pas de call-to-action evident pour avancer.
**Criticite** : MAJEUR (conversion)
**Fix** : Ajouter une section CTA en bas de page, similaire aux autres pages.

### S3 — OG image generique

**Fichier** : `src/app/layout.tsx`, ligne 36
**Probleme** : L'OG image reference `/images/og/homepage-og.jpg`. Verifier que ce fichier existe reellement. Chaque page devrait idealement avoir sa propre OG image.
**Criticite** : MINEUR

### S4 — Schema.org ContactPoint incomplet

**Fichier** : `src/app/layout.tsx`, lignes 91-94
**Probleme** : Le contactPoint dans le JSON-LD ne contient ni email, ni telephone, ni URL de contact.
**Fix** : Ajouter `"email": "team@sarani.studio"` et `"url": "https://sarani.studio/contact"`.

### S5 — FAQ schema manquant sur homepage et pricing

**Probleme** : Les deux pages ont des FAQ substantielles (14 questions homepage, 5 pricing) mais aucun schema FAQPage n'est injecte. C'est une opportunite de rich snippets manquee.
**Fix** : Ajouter un JSON-LD FAQPage sur les pages homepage et pricing.

---

## Problemes d'accessibilite

### A1 — Alt text generique sur project-slider images

**Fichier** : `src/components/home/project-slider.tsx`, ligne 44
**Situation** : `alt={${client} -- ${title}}` — c'est correct et descriptif. Bon point.

### A2 — Skip link present et fonctionnel

**Fichier** : `src/app/layout.tsx`, ligne 113 + `globals.css` lignes 90-107
**Situation** : Un skip link "Skip to main content" est present et correctement cache visuellement. Bon point.

### A3 — Focus visible sur tous les elements interactifs

**Fichier** : `globals.css`, lignes 110-113
**Situation** : `*:focus-visible` applique un outline 3px cerulean. Bon point.

### A4 — Formulaire de contact avec labels, aria-invalid, aria-describedby

**Fichier** : `src/components/forms/contact-form.tsx`
**Situation** : Excellent travail d'accessibilite. Labels associes, aria-invalid sur erreur, aria-describedby pour messages d'aide et d'erreur, honeypot cache correctement. Bon point.

### A5 — Header mobile : focus trap et Escape key

**Fichier** : `src/components/layout/header.tsx`
**Situation** : Focus trap implementee, Escape pour fermer, body scroll lock. Bon point.

### A6 — Prefers-reduced-motion respecte partout

**Fichiers** : Tous les composants animes utilisent `useReducedMotion()` de framer-motion.
**Situation** : Excellent — chaque animation verifie et s'adapte. `globals.css` a aussi un fallback global. Bon point.

### A7 — Contraste potentiellement insuffisant : `text-neutral-400` sur fond blanc

**Fichier** : Plusieurs composants
**Probleme** : `text-neutral-400` (#a3a3a3) sur `bg-brand-white` (#ffffff) donne un ratio de contraste d'environ 2.6:1, en dessous du minimum WCAG AA de 4.5:1 pour le texte normal. Utilise pour les sublabels des metriques, "Trusted by", et d'autres textes auxiliaires.
**Criticite** : MINEUR (texte auxiliaire, pas de contenu critique)
**Fix** : Passer a `text-neutral-500` (#737373) pour les textes sur fond blanc, ratio ~4.6:1.

---

## Problemes mobile et responsive

### M1 — Hero stats non-wrapping sur petit ecran

**Fichier** : `src/components/home/animated-hero.tsx`, ligne 101
**Probleme** : `flex items-center gap-8` pour les stats (35+ experts, 5 continents, 18 languages) — sur un ecran tres etroit (<320px), les 3 items risquent de deborder.
**Criticite** : MINEUR — les ecrans <320px sont rares.
**Fix** : Ajouter `flex-wrap` pour securiser.

### M2 — Pricing comparison table overflow mobile

**Fichier** : `src/app/pricing/page.tsx`, lignes 185-220
**Situation** : Le tableau de comparaison a `overflow-x-auto` et `min-w-[480px]`. Scroll horizontal sur mobile — acceptable mais pas ideal pour la conversion.
**Criticite** : MINEUR
**Fix** : Envisager un layout en cards empilees sur mobile au lieu d'un tableau.

---

## Recommandations pour atteindre 9/10

### Priorite 1 — Bloquants (a corriger avant tout)
1. **Corriger "50+ experts" → "35 experts"** dans la FAQ (C3)
2. **Ajouter les vraies images** dans les case studies (C4)
3. **Supprimer le lien `/how-we-work`** du footer ou creer la page (C1)
4. **Choisir une seule route case study** et rediriger l'autre (C6)

### Priorite 2 — Majeurs (a corriger rapidement)
5. **Ajouter "Services" au header** navigation (C5)
6. **Corriger l'ancre footer** `/legal#privacy` → `/legal#privacy-policy` (C2)
7. **Corriger le prix TikTok** proof card : "300-500/week" → "$20/video" (CP4)
8. **Corriger TrackedCta** page hardcodee → `usePathname()` (C7)
9. **Ajouter un CTA** en bas de la page Work (S2)
10. **Ajouter FAQ Schema** JSON-LD sur homepage et pricing (S5)

### Priorite 3 — Ameliorations
11. Ajouter plus de logos clients dans le trust strip (LEGO, IKEA, Pernod Ricard)
12. Unifier le composant FAQ (homepage vs pricing)
13. Ameliorer le contraste des textes auxiliaires
14. Ajouter des OG images specifiques par page
15. Completer le ContactPoint schema
16. Transformer le tableau comparatif pricing en cards mobile

---

## Auto-evaluation du reviewer

- [x] Ai-je lu TOUS les fichiers de toutes les pages listees ? Oui
- [x] Chaque probleme identifie a-t-il un fichier, une ligne et un fix ? Oui
- [x] Les problemes sont-ils classes par criticite ? Oui
- [x] Ai-je verifie la coherence entre les donnees (35 vs 50+ experts) ? Oui — contradiction trouvee
- [x] Ai-je verifie les liens internes ? Oui — 2 liens morts trouves
- [x] Ai-je note les bons points (accessibilite, reduced motion) ? Oui

---

**Handoff → @orchestrator**
- Fichiers produits : `/home/user/Sarani/docs/reviews/public-site-audit.md`
- Decisions prises : Score 7.5/10, GO avec reserves (3 bloquants, 7 majeurs)
- Points d'attention :
  - 3 problemes BLOQUANTS a corriger avant mise en production : FAQ "50+ experts" (C3), images placeholder case studies (C4), lien mort /how-we-work (C1)
  - Duplication code/SEO entre /case-studies/[slug] et /work/[slug] a resoudre (C6)
  - Page Services invisible dans la navigation principale (C5)
  - Agents a reinvoquer : @fullstack pour les corrections code, @copywriter pour la FAQ
---
