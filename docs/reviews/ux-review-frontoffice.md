# UX Audit Front-Office — Sarani
**Score global : 7.4/10** | Date : 2026-03-25 | Agent : @ux

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
| F6 | **Majeur** | About | Duplication de données : `TEAM_STATS` (35, 5, 18) et `KEY_NUMBERS` (35+, 5, 18, D+1, 60%, 1500+) — la page montre les mêmes chiffres deux fois | Fusionner en une seule section ou différencier clairement le contenu |
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
| M2 | Hero stats (35+ / 5 / 18) s'affichent en `flex gap-8` — risque de débordement sur petits écrans (<375px) | Layout |
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
