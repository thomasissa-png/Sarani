# Audit Design Back-office Sarani

> Agent : @design | Date : 2026-03-25 | Mode : Compact

## Score global : **6.5 / 10**

---

## Sections
1. [Tokens & CSS globals](#tokens)
2. [Sidebar](#sidebar)
3. [Formulaires](#formulaires)
4. [Login](#login)
5. [Dashboard](#dashboard)
6. [Agents — pages exemples](#agents)
7. [Score final + Problèmes critiques](#score)
8. [Recommandations](#recommandations)

---

## 1. Tokens & CSS globals {#tokens}

| Critère | Statut | Note |
|---|---|---|
| Palette brand définie | OK | flame, cerulean, lemon + neutrals |
| Couleurs sémantiques | OK | success/warning/error/info + light variants |
| Warning = lemon (#faca15) | PROBLEME | Texte jaune sur fond blanc = contraste insuffisant (ratio ~1.07:1) — **WCAG AAA fail et AA fail** |
| Error = flame (#e35019) | ATTENTION | Même valeur que brand-flame — ambiguïté sémantique marque/erreur |
| Tokens surface | OK | base/elevated/warm/overlay/dark |
| Dark mode tokens | ABSENT | Aucun token dark mode défini — back-office dark non supporté |
| Font family | OK | Outfit pour heading et body |
| Shadows | OK | 5 niveaux + 3 glows brand |
| Z-index | OK | header/overlay/modal définis |
| Animations back-office | HORS-SUJET | marquee/slideshow = tokens front-end dans le fichier global — à isoler |

---

## 2. Sidebar {#sidebar}

| Critère | Statut | Note |
|---|---|---|
| Largeur | OK | w-60 (240px) — standard |
| Position sticky | OK | h-screen sticky top-0 |
| Logo | OK | "Sarani" + badge "Admin" en pill |
| Icônes inline SVG | PROBLEME | 13 agents × icône = ~180 lignes de SVG hardcodé dans le composant — maintenabilité nulle |
| Groupes de navigation | PARTIEL | 1 séparateur "Agents" uniquement — manque des sous-groupes (ex: Content / Strategy / Technical) pour 13 items |
| Active state | OK | bg-brand-black text-white |
| Hover state | OK | bg-neutral-200 hover |
| Scroll overflow | OK | overflow-y-auto sur nav |
| Indicateur de groupe | MINEUR | Label "Agents" centré uppercase — pas d'icône de groupe ni de count |
| Gestion 13+ agents | ATTENTION | Liste plate de 13 items sans regroupement thématique = navigation lente, surcharge cognitive |

---

## 3. Formulaires (guided-form.tsx) {#formulaires}

| Composant | Statut | Note |
|---|---|---|
| FormField label | OK | text-sm font-medium text-neutral-700 |
| Required star | PROBLEME | `text-red-500` — hors système (token attendu : color-error) |
| Helper text | OK | text-xs text-neutral-400 |
| Error message | PROBLEME | `text-red-500` × 2 occurrences — hors système |
| Input/select/textarea focus | OK | ring-2 ring-brand-cerulean — cohérent |
| ClientContextPanel | PROBLEME | `bg-blue-50 border-blue-200 text-blue-700/900` — Tailwind hardcodé, hors tokens (devrait utiliser color-info/info-light) |
| GuidanceMessage | PROBLEME | Idem : `bg-blue-50 border-blue-200 text-blue-800` — hors tokens |
| RecommendedBadge | PROBLEME | `bg-orange-100 text-orange-700 border-orange-200` — hors tokens (aucun token orange dans le système) |
| StepIndicator — done | PROBLEME | `bg-green-500` hors tokens (devrait : bg-success) |
| StepIndicator — connector | PROBLEME | `bg-green-500` hors tokens |
| PreSubmitSummary | PROBLEME | `bg-amber-50 border-amber-200 text-amber-700/900` — hors tokens |
| TextareaWithCount — warning | PROBLEME | `border-amber-400 text-amber-600` — hors tokens |
| FileUpload — success | PROBLEME | `border-green-300 bg-green-50 text-green-600/900` — hors tokens |
| FileUpload — drag hover | OK | border-brand-cerulean bg-blue-50 — semi-cohérent |
| FileUpload — remove btn | PROBLEME | `text-red-600 border-red-200` — hors tokens |

**Bilan formulaires : 9 occurrences de couleurs Tailwind hardcodées qui court-circuitent le design system.**

---

## 4. Login {#login}

| Critère | Statut | Note |
|---|---|---|
| Layout centré | OK | min-h-screen flex items-center justify-center |
| Background | MINEUR | bg-neutral-200 — fonctionne mais flat, pas de surface-elevated |
| Card | OK | rounded-2xl shadow-md p-8 — cohérent |
| Input style | MINEUR | rounded-xl + bg-neutral-100 — arrondi xl ≠ lg utilisé partout ailleurs |
| Bouton | OK | bg-brand-black rounded-xl — cohérent |
| Erreur | OK | text-error (token utilisé correctement ici) |
| Label | OK | sr-only — accessibilité correcte |
| Indicateur loading | OK | "Signing in..." |
| Disabled state | OK | opacity-50 cursor-not-allowed |

**Note : seule page qui utilise `text-error` (token correct) pour les erreurs — incohérence avec les formulaires qui utilisent `text-red-500`.**

---

## 5. Dashboard {#dashboard}

| Critère | Statut | Note |
|---|---|---|
| Layout spacing | OK | space-y-8 |
| StatCard | OK | bg-white rounded-xl border-neutral-300 p-5 |
| Valeur stat | OK | text-3xl font-bold text-brand-black |
| Recent Outputs card | OK | bg-white rounded-xl border-neutral-300 p-6 |
| StatusBadge — done | OK | bg-success-light text-success — tokens corrects |
| StatusBadge — processing | OK | bg-info-light text-info — tokens corrects |
| StatusBadge — pending | PROBLEME | bg-warning-light text-warning = texte #faca15 sur fond #fef9c3 — ratio ~1.07:1, **WCAG fail** |
| StatusBadge — error | OK | bg-error-light text-error — tokens corrects |
| Empty state | OK | Texte centré text-neutral-400 |
| Lien "View all" | OK | text-brand-cerulean hover:underline |
| Loading state | ABSENT | Dashboard server component — pas de skeleton, pas de suspense visible |

---

## 6. Agents — pages exemples {#agents}

### Cohérence cross-pages

| Critère | PM page | Video Script page | Cohérence |
|---|---|---|---|
| Header h1 | text-2xl font-bold text-brand-black | Idem | OK |
| Sous-titre | text-neutral-500 text-sm | Idem | OK |
| Bouton secondaire header | "View Projects" | "History" — même style | OK |
| GuidanceMessage | Composant partagé | Composant partagé | OK |
| StepIndicator | 3 steps | 3 steps | OK |
| Section Recommended | Pas de séparateur visuel | Séparateur border-t + label | INCOHÉRENCE |
| Advanced options toggle | Border full + +/- icon | Flèche ▶ + toggle class rotate | INCOHÉRENCE |
| Erreur API | bg-red-50 border-red-200 text-red-600 | Idem | OK mais hors tokens |
| Résultats — cards | bg-white rounded-xl border-neutral-300 | Idem | OK |
| Hashtags output | N/A | bg-blue-50 border-blue-200 text-blue-800 | Hors tokens |
| Hook highlight | N/A | bg-amber-50 border-amber-200 | Hors tokens |

### États manquants

| Page | Loading | Error | Empty | Success |
|---|---|---|---|---|
| PM — form | "Analyzing..." dans bouton | Bloc rouge | N/A | Bloc vert dispatch |
| PM — client load | "Loading clients..." texte | Silencieux | N/A | N/A |
| Video Script | "Generating..." dans bouton | Bloc rouge | N/A | Résultats |
| Checkbox styling natif | N/A | N/A | N/A | Input non stylisé |

---

## 7. Score final + Problèmes critiques {#score}

### Score : **6.5 / 10**

| Dimension | Score | Justification |
|---|---|---|
| Cohérence tokens | 4/10 | 9+ composants utilisent des classes Tailwind hardcodées (red/green/amber/orange/blue) au lieu des tokens du système |
| Accessibilité WCAG | 5/10 | warning (#faca15 sur fond clair) = ratio ~1.07:1, fail critique. StatusBadge pending = même problème |
| Architecture composants | 7/10 | guided-form.tsx bien structuré, composants partagés réutilisés |
| Cohérence visuelle | 7/10 | Layout et spacing cohérents, cards uniformes |
| Navigation sidebar | 6/10 | 13 items plats sans groupes, SVG hardcodés |
| États UI | 6/10 | Loading/error présents sur les CTA, mais client fetch error silencieux, checkbox natif non stylisé |

### 10 problèmes critiques

| # | Criticité | Problème | Localisation |
|---|---|---|---|
| 1 | BLOQUANT | `color-warning` (#faca15) inutilisable en texte — ratio WCAG <1.5:1 | `globals.css`, `StatusBadge pending` |
| 2 | BLOQUANT | `text-red-500` / `text-red-600` utilisés à la place de `text-error` | `guided-form.tsx` labels required + erreurs |
| 3 | MAJEUR | `bg-blue-50/border-blue-200` hors tokens dans 3 composants | `ClientContextPanel`, `GuidanceMessage`, hashtags output |
| 4 | MAJEUR | `bg-orange-*` pour RecommendedBadge — aucun token orange dans le système | `guided-form.tsx` ligne 300 |
| 5 | MAJEUR | `bg-amber-*` pour PreSubmitSummary, TextareaWithCount warning, hook highlight — hors tokens | Multiples fichiers |
| 6 | MAJEUR | `bg-green-*` pour StepIndicator done, FileUpload success — hors tokens (devrait : success/success-light) | `guided-form.tsx` |
| 7 | MAJEUR | SVG hardcodés dans sidebar — 180+ lignes non maintenables | `sidebar.tsx` |
| 8 | MINEUR | 13 agents en liste plate sans regroupement thématique | `sidebar.tsx` |
| 9 | MINEUR | Incohérence advanced options toggle : +/- vs ▶ selon la page | `pm/page.tsx` vs `video-script/page.tsx` |
| 10 | MINEUR | `rounded-xl` sur input login vs `rounded-lg` partout ailleurs — arrondi incohérent | `login/page.tsx` |

---

## 8. Recommandations pour atteindre 9/10 {#recommandations}

| # | Priorité | Action | Impact |
|---|---|---|---|
| R1 | P0 | Remplacer `color-warning` par une valeur lisible en texte : `#b45309` (amber-700) pour les états warning-text, garder lemon pour les fonds seulement. Ajouter `--color-warning-text: #b45309` dans globals.css | WCAG compliance, StatusBadge pending, TextareaWithCount |
| R2 | P0 | Auditer et remplacer toutes les classes `text-red-*` / `bg-red-*` par les tokens `text-error` / `bg-error-light` dans guided-form.tsx et les pages agents | Cohérence système |
| R3 | P1 | Remplacer toutes les classes `bg-blue-*`, `bg-amber-*`, `bg-green-*`, `bg-orange-*` par les tokens sémantiques correspondants (info-light/info, warning-light/warning-text, success-light/success) | Supprime les 9 violations de tokens |
| R4 | P1 | Créer un composant `<AdminIcon name={...} />` utilisant un import de bibliothèque (lucide-react déjà probable dans le projet) — supprimer les SVG inline de sidebar.tsx | -180 lignes, maintenabilité |
| R5 | P2 | Grouper les 13 agents sidebar en 3-4 catégories : **Content** (copywriter, video-script, proofreader, translator), **Strategy** (pm, creative, social, seo), **Production** (designer, legal, proposal, presentation, email-drafter) — ajouter un label de groupe collapsible ou visuellement distinct | Navigabilité |
