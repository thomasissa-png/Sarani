# UX Audit Front-Office — Sarani
**Score global : 7.2/10** | Date : 2026-03-25 | Agent : @ux (v2 — audit approfondi code source)

---

## Scores par page

| Page | Score | Probleme principal |
|------|-------|--------------------|
| Homepage `/` | 8/10 | Hero centré mobile mais left-aligned desktop — incohérence visuelle |
| Work `/work` | 6.5/10 | Cards sans thumbnails/images — page portfolio sans visuels |
| Services `/services` | 7.5/10 | Beaucoup de texte, peu de visuels — listes longues non scannable |
| Pricing `/pricing` | 8/10 | Bonne structure, FAQ avec `<details>` natif (pas animé comme homepage) |
| About `/about` | 7/10 | Données dupliquées (TEAM_STATS et KEY_NUMBERS ont les mêmes infos) |
| Contact `/contact` | 8.5/10 | Meilleure page — form bien structuré, reassurance visible |
| Legal `/legal` | 6/10 | Non audité en détail — page utilitaire |

---

## Problemes identifies

| # | Severite | Page | Description | Recommandation |
|---|----------|------|-------------|----------------|
| F1 | **Bloquant** | Work | Aucune image/thumbnail sur les case study cards — page portfolio d'une agence créative sans visuels | Ajouter `thumbnailUrl` aux données case-studies + `<Image>` dans `CaseStudyCard` |
| F2 | **Majeur** | Global | Button primary = `bg-brand-lemon` (jaune) au lieu de `bg-brand-flame` (orange) — incohérent avec design-system.md qui définit Flame comme couleur CTA | Changer `variantStyles.primary` dans button.tsx vers `bg-brand-flame text-brand-white` |
| F3 | **Majeur** | Header mobile | Menu mobile plein écran sans logo visible — pas d'ancrage de marque pendant la navigation | Ajouter le logo Sarani en haut du menu overlay mobile |
| F4 | **Majeur** | Global | Aucun sticky CTA mobile — Sophie sur mobile doit scroller tout en bas pour trouver "Start a project" | Ajouter un CTA sticky bottom bar sur mobile (visible après scroll 50%) |
| F5 | **Majeur** | Services | 4 sections avec CTA "Start a project" identiques — fatigue de clic, pas de différenciation | Varier les CTAs par section ou n'en garder qu'un seul en closing |
| F6 | **Majeur** | About | Duplication de données : `TEAM_STATS` (35, 5, 18) et `KEY_NUMBERS` (45+, 5, 18, D+1, 60%, 1500+) — la page montre les mêmes chiffres deux fois | Fusionner en une seule section ou différencier clairement le contenu |
| F7 | **Mineur** | Homepage | `ClientLogos` apparait deux fois (hero + section 7 testimonials) — redondant | Garder uniquement dans le hero ou ajouter des logos différents en section 7 |
| F8 | **Mineur** | Homepage | `ProjectSlider` apparait deux fois (hero + section 5) — même composant, même contenu | Différencier le contenu ou supprimer un des deux |
| F9 | **Mineur** | Pricing | FAQ utilise `<details>` natif (pas animé) alors que homepage FAQ utilise framer-motion — incohérence d'interaction | Unifier le pattern FAQ (soit natif partout, soit animé partout) |
| F10 | **Mineur** | Contact | Reassurance aside empile verticalement sur mobile sous le form — visible qu'après soumission | Ajouter 1-2 points de reassurance au-dessus du form sur mobile |
| F11 | **Mineur** | Footer | 4 colonnes dont `Categories` pointe vers `/work?category=X` — ces filtres fonctionnent-ils ? | Vérifier que le filtrage par query param est implémenté côté Work |
| F12 | **Mineur** | Header | Le CTA desktop "Start a project" a `min-w-0` qui override le `min-w-[160px]` du Button — touch target potentiellement réduit | Supprimer `min-w-0` ou s'assurer que la taille min respecte 44px de hauteur |

---

## Mobile-specific

| # | Description | Impact |
|---|-------------|--------|
| M1 | Pas de sticky CTA bottom bar — Sophie perd le CTA en scrollant | Conversion |
| M2 | Hero stats (45+ / 5 / 18) s'affichent en `flex gap-8` — risque de débordement sur petits écrans (<375px) | Layout |
| M3 | Pricing comparison table `min-w-[480px]` force le scroll horizontal — OK mais pas de hint visuel | Usabilite |
| M4 | Services page — listes de services en grille 3 colonnes qui stack mal sur mobile (items isolés) | Lisibilite |
| M5 | Contact aside invisible above-the-fold sur mobile — les reassurance points sont sous le form | Conversion |

---

## Desktop-specific

| # | Description | Impact |
|---|-------------|--------|
| D1 | Hero dots visibles uniquement `lg:block` — OK mais créent un déséquilibre visuel (dots à droite, tout le texte à gauche) | Visuel |
| D2 | Work page — grille 3 colonnes de cards sans images = mur gris monotone | Impression |
| D3 | Services sections alternent `bg-surface-warm` mais la structure est identique — monotonie de scroll | Engagement |

---

## Top 5 priorites d'action

1. **[F1] Images case studies** — Bloquant. Une agence créative sans portfolio visuel perd Sophie en 3 secondes. Ajouter thumbnails aux case study cards.
2. **[F2] Button primary Flame au lieu de Lemon** — Conformité design system. Le jaune sur blanc manque de contraste et ne respecte pas le système de couleurs défini.
3. **[F4/M1] Sticky CTA mobile** — Sophie sur mobile doit pouvoir contacter Sarani à tout moment sans scroller. Sticky bottom bar après 50% scroll.
4. **[F3] Logo dans menu mobile** — Ancrage de marque manquant. Le menu plein écran sans logo est désorientant.
5. **[F6] Dédupliquer About** — Les mêmes chiffres apparaissent deux fois. Fusionner pour gagner en impact et en crédibilité (pas de remplissage visible).

---

## Problemes additionnels (v2 — analyse code approfondie)

| # | Severite | Page/Composant | Description | Recommandation |
|---|----------|----------------|-------------|----------------|
| A1 | **Bloquant** | Home / animated-hero.tsx | Le CTA primaire "Start a project" anime avec `delay: 1.3s`. Sur connexion lente ou mobile mid-range, Sophie voit la page sans aucun bouton d'action pendant 1.5–2s. Le CTA est la seule conversion de cette page. | Réduire `delay` à 0.5s max. Ou animer uniquement le transform/y, laisser opacity à 1 dès le rendu. |
| A2 | **Bloquant** | `/work` | La page n'implémente pas les filtres `?category=` — pourtant le footer les référence (8 catégories). Sophie cherche "vidéo" et voit tout en vrac sans tri possible. | Ajouter filtre par catégorie (tabs ou pills) en haut de grille. Réutiliser les slugs existants dans footer.tsx. |
| A3 | **Majeur** | Contact form | 6 champs requis incluant "Company size" et "How did you hear about us?" (attribution). L'attribution est une donnée analytique interne — elle ne bénéficie pas à Sophie et augmente la friction. | Passer attribution et company size en optionnels dans le schéma Zod. Rester à 4 champs requis : name, company, email, message. |
| A4 | **Majeur** | `/contact` mobile | La sidebar "Why work with us" (4 points de réassurance) s'affiche après le formulaire sur mobile (layout en colonne unique). Sophie remplit 6 champs sans voir les garanties. | Afficher "Risk-free first project" et "Response within 1 hour" au-dessus du formulaire sur mobile via CSS order ou conditional rendering. |
| A5 | **Majeur** | Footer | Le lien "How we work" (colonne About) pointe vers `/services`. Label trompeur — évoque une page process/méthodo, pas une liste de services. | Renommer en "Services" pour correspondre au contenu réel. |
| A6 | **Mineur** | Home — Proof Cards | TikTok card affiche `price: "300–500/week"` sans devise ni unité. Incohérent avec Sony (155 €) et GEODIS (8,500 €). | Clarifier : "300–500 videos/week" ou "from 20 $/video". Aligner le format sur les 3 cards. |
| A7 | **Mineur** | Home — Testimonials | Carousel manuel, pas d'autoplay. 6 témoignages nécessitent 5 clics pour tout voir. Sur mobile, les boutons prev/next (h-10 w-10 = 40px) sont à la limite du touch target WCAG (44px minimum). | Ajouter autoplay 8s avec pause au survol/focus. Agrandir les boutons nav à h-11 w-11 (44px). |
| A8 | **Mineur** | `/about` | `TEAM_STATS` (35, 5, 18) + `KEY_NUMBERS` (45+, 5, 18, D+1, 60%, 1500+) — les 3 premières stats sont identiques sur la même page. | Supprimer TEAM_STATS ou les remplacer par des données distinctes (ex : années d'existence, clients actifs). |
| A9 | **Mineur** | `/services` | CTA "Start a project" répété 4x (une fois par ServiceBlock) + 1x en closing = 5 fois sur la même page. Dilution de l'intention et bruit visuel pour Sophie qui scanne. | Supprimer les CTAs des ServiceBlocks. Remplacer par un lien contextuel "→ Get a quote" pointant vers `/contact?service=X`. |

---

## Hypotheses a valider

- [HYPOTHESE] Délai 1.3s sur CTA hero : intentionnel pour l'effet de séquence narrative — à confirmer avec @design avant modification.
- [HYPOTHESE] Absence de filtres sur /work : choix temporaire lié au faible nombre de case studies actuels — à confirmer avec @product-manager.
- [HYPOTHESE] 6 champs requis du formulaire : besoin de qualification commerciale côté équipe Sarani — à confirmer avant de rendre attribution et company size optionnels.
- [HYPOTHESE] Button primary en lemon (jaune) et non flame (orange) : choix délibéré de différenciation vs la couleur secondaire, malgré l'incohérence avec design-system.md.

---

**Handoff → @orchestrator**
- Fichiers produits : `/home/user/Sarani/docs/reviews/ux-review-frontoffice.md` (mise à jour v2)
- Décisions prises : score ajusté à 7.2/10 après analyse approfondie du code source — 9 problèmes additionnels identifiés
- Points d'attention critiques pour implémentation :
  - A1 (délai CTA hero) = 1 ligne de code, impact maximal sur conversion home
  - A2 (filtres /work) = effort moyen, impact fort sur Sophie qui évalue le portfolio
  - A4 (réassurance mobile avant form) = CSS order, impact fort sur taux de soumission
  - F1 (images case studies) reste le problème bloquant n°1 — une agence créative sans visuels n'est pas crédible

