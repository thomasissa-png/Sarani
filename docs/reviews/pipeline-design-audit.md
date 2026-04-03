# Pipeline Design Audit — Case Study Pipeline
*@design — 2026-04-03*
*Scope : Admin pipeline page (`/admin/.../case-studies/[id]`) + Page publique (`/case-studies/[slug]`) + CTA component. Référence : `docs/design/design-system.md`.*

---

## Score global

| Zone | Score | Verdict |
|---|---|---|
| Admin pipeline — tokens & couleurs | 5/10 | P1 |
| Admin pipeline — progress bar | 6/10 | P1 |
| Page publique — hiérarchie & brand | 7/10 | P1 |
| Page publique — keyMetric badge | 5/10 | P0 |
| Sidebar "At a Glance" | 6/10 | P1 |
| Stats cards | 6/10 | P1 |
| Gallery & responsive | 7/10 | P2 |
| **Score global** | **6/10** | — |

---

## P0 — Bloquant

### P0-1 — keyMetric badge vs tags : collision visuelle confirmée

**Problème.** Le badge keyMetric utilise `bg-brand-flame/10 + text-brand-flame`. Les tags utilisent `bg-brand-black/5 + text-neutral-600`. La catégorie utilise `border border-neutral-200 + text-neutral-500`. La famille Flame du badge keyMetric lui confère une distinction chromatique, mais l'opacité 10% produit un beige-orangé pâle (`#da5126` à 10% sur blanc = ~`#faeee9`) quasi identique visuellement au `bg-brand-black/5` sur petit écran ou en conditions d'éclairage moyen.

**Impact WCAG.** `text-brand-flame` (#da5126) sur `bg-brand-flame/10` (~#faeee9) = ratio ≈ 3.4:1 — FAIL WCAG AA (4.5:1 requis pour texte normal, 3:1 pour large text). Le badge est en `text-sm font-bold` — il passe en "large text" uniquement si bold + 14px, ce qui n'est pas garanti à toutes les tailles d'écran.

**Correction.**
```tsx
// Remplacer :
<span className="inline-block rounded-full bg-brand-flame/10 px-4 py-2 text-sm font-bold text-brand-flame">

// Par (fond plein, texte blanc — ratio 3.94:1, PASS large text) :
<span className="inline-block rounded-full bg-brand-flame px-4 py-2 text-sm font-bold text-white">

// Ou si fond doux conservé (ratio 5.32:1, PASS normal text) :
<span className="inline-block rounded-full bg-brand-flame/10 px-4 py-2 text-sm font-bold text-black">
```

La version `bg-brand-flame + text-white` est recommandée : elle est visuellement distincte des tags, conforme WCAG, et aligne le badge avec la règle système "Flame = action + énergie".

---

## P1 — Majeur

### P1-1 — Admin pipeline : couleurs hors design system

**Problème.** La progress bar utilise `emerald`, `blue`, `red` natifs Tailwind — jamais définis dans les tokens Sarani. L'admin back-office devient visuellement découplé du front-office sans justification.

**Occurrences concrètes :**
- `bg-emerald-50 text-emerald-700 border-emerald-200` — état "complete"
- `bg-blue-50 text-blue-700 border-blue-200` — état "active"
- `bg-red-50 text-red-700 border-red-200` — état "failed"
- `text-green-700` / `text-yellow-700` / `text-red-700` dans `getScoreColor()`
- `bg-green-700` sur le bouton "Publish to Website"
- `bg-[#0A66C2]` / `bg-[#004182]` sur le bouton LinkedIn (hardcodé hex brut)
- `bg-blue-100 text-blue-700` sur le badge segment email
- `text-blue-600` sur les hashtags LinkedIn

**Correction.** Pour un back-office Sarani, remapper sur les tokens sémantiques existants + Tailwind system colors structurés :

```tsx
// États pipeline — utiliser les tokens Sarani ou des aliases sémantiques cohérents :
// "complete"  → bg-brand-cerulean/10 text-brand-cerulean border-brand-cerulean/30
// "active"    → bg-brand-lemon/10 text-brand-black border-brand-lemon/40 (+ spinner)
// "failed"    → bg-brand-flame/10 text-brand-flame border-brand-flame/30
// "pending"   → bg-neutral-50 text-neutral-400 border-neutral-200

// Score colors — adopter les tokens directement :
// score >= 70 → text-brand-cerulean (confiance)
// score >= 40 → text-brand-lemon (warning)
// score < 40  → text-brand-flame (urgence)

// Bouton LinkedIn — garder la couleur de marque LinkedIn (#0A66C2) mais l'extraire en constante :
// const LINKEDIN_COLOR = "#0A66C2"; // dans un fichier de constantes — pas un hex inline
```

### P1-2 — Sidebar "At a Glance" : duplication de la catégorie

**Problème.** Dans `case-studies/[slug]/page.tsx`, la catégorie apparaît à DEUX endroits visibles simultanément :
1. Hero — dans les tags (ligne 162 : `{cs.category}` dans le premier `<span>`)
2. Sidebar — champ "Category" dans le bloc "At a Glance" (lignes 302-308)

La sidebar de 4 colonnes sur 12 est déjà dense. Répéter la catégorie est du bruit visuel sans valeur ajoutée pour Sophie.

**Correction.** Supprimer le champ "Category" de la sidebar. Remplacer par un champ plus utile selon les données disponibles : `Timeline` (turnaround), `Volume`, ou `Assets`. Ces données sont présentes sur `/work/[slug]` mais absentes de `/case-studies/[slug]` — les ajouter au schéma pipeline est recommandé (`[À VALIDER @product-manager]`).

### P1-3 — Stats cards : design générique, pas premium

**Problème.** Les StatCard dans la section "Results" utilisent vraisemblablement un layout simple (value + label sur fond blanc/neutre). Aucune différenciation visuelle Sarani. Les 3 stats les plus importantes d'un case study (ex : "60% savings", "150 banners", "D+1") méritent un traitement premium.

**Correction.**
```tsx
// Remplacement du StatCard courant (à vérifier dans src/components/case-studies/stat-card.tsx)
// Pattern recommandé :
<div className="rounded-2xl bg-brand-black p-6 text-center">
  <p className="text-3xl font-bold text-brand-lemon">{value}</p>
  <p className="mt-2 text-sm text-white/70 uppercase tracking-wider">{label}</p>
</div>
// Fond black + value en Lemon + label en white/70 = premium, distinctif, brand-aligned
// Alternative acceptable : bg-white border-2 border-brand-flame avec value text-brand-flame
```

### P1-4 — Tabs admin : indicateur actif trop discret

**Problème.** L'onglet actif utilise `border-b-2 border-brand-black` — discret sur fond blanc. Les onglets inactifs sont `text-neutral-500`. La hiérarchie visuelle active/inactive est faible.

**Correction.**
```tsx
// Actif :
"bg-brand-black text-white rounded-t-lg px-4 py-2.5 text-sm font-semibold"
// Inactif :
"text-neutral-500 hover:text-neutral-700 px-4 py-2.5 text-sm"
// Supprimer le border-b-2 au profit d'un fond plein — plus lisible, plus Sarani
```

### P1-5 — focus-visible absent sur les boutons admin

**Problème.** Le champ input de régénération utilise `focus:outline-none focus:ring-2 focus:ring-brand-black/20` — correct. Mais les boutons de la progress bar, le bouton "Back", et le bouton "Mark as Reviewed" n'ont aucun `focus-visible` déclaré. WCAG 2.2 AA exige un focus-visible sur tous les éléments interactifs.

**Correction.**
```tsx
// Ajouter sur chaque <button> interactif :
className="... focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-black focus-visible:ring-offset-2"
```

---

## P2 — Mineur

### P2-1 — Valeurs hardcodées résiduelles (admin)

- `top-24` dans la sidebar (ligne 287 de `case-studies/[slug]/page.tsx`) — devrait être `top-[var(--header-height)]` ou un spacing token
- `max-h-48` dans le step output expandé (admin, ligne 886) — valeur arbitraire, non dans la scale
- `px-2.5 py-0.5` sur le badge segment email — non dans la scale 8px (2px, 4px, 8px...). Utiliser `px-2 py-0.5` ou `px-3 py-1`
- `p-3 text-center` dans les stats admin preview (ligne 610) — acceptable, mais incohérent avec `p-5` des autres cards

### P2-2 — Page publique : client name en `text-brand-flame-dark` non documenté

**Problème.** La ligne `text-brand-flame-dark` (lignes 175 et 109 des deux fichiers page) référence un token qui n'apparaît pas dans `design-system.md`. Si ce token n'est pas défini dans `design-tokens.json`, c'est une valeur hors-système.

**Correction.** Vérifier que `brand-flame-dark` est bien défini dans `tailwind.config.ts`. Si absent, utiliser `text-brand-flame` ou `text-brand-black` selon le contraste souhaité.

### P2-3 — Gallery responsive : incohérence /work vs /case-studies

**Problème.** Sur `/work/[slug]`, la galerie utilise `grid-cols-2 md:grid-cols-3 lg:grid-cols-4` avec `ImageLightbox` individuel. Sur `/case-studies/[slug]`, la galerie utilise un composant `ImageLightbox` unique wrappant toutes les images — comportement différent, layouts probablement différents. Les deux pages sont visuellement similaires (même marque, même client) mais l'expérience galerie diverge.

**Correction.** Aligner sur un pattern unique. La grille `2→3→4 colonnes` de `/work/[slug]` est plus adaptée à un portfolio d'agence. Appliquer le même pattern sur `/case-studies/[slug]`.

### P2-4 — Bouton "Start a project" sidebar : CTA commercial en contexte évaluation

**Problème.** La règle "conviction-first" du design system Sarani (préférence fondateur P0) précise que les CTAs commerciaux ("Start a project") ne doivent apparaître que sur les pages ACTION ou en conclusion. La sidebar "At a Glance" place le CTA en position latérale mid-page, visible dès l'ouverture du contenu Challenge/Solution — avant que Sophie ait évalué la valeur.

**Correction.** Supprimer le `<Button>` "Start a project" de la sidebar. Le CTA de closing (`<CaseStudyCta>`) en bas de page est suffisant et plus cohérent avec le principe conviction-first.

---

## Récapitulatif des corrections prioritaires

| # | Priorité | Fichier | Action |
|---|---|---|---|
| 1 | P0 | `case-studies/[slug]/page.tsx` | Corriger le badge keyMetric : `bg-brand-flame text-white` ou `bg-brand-flame/10 text-black` |
| 2 | P1 | `admin/.../case-studies/[id]/page.tsx` | Remplacer emerald/blue/red par tokens Sarani dans la progress bar |
| 3 | P1 | `case-studies/[slug]/page.tsx` | Supprimer la duplication "Category" de la sidebar |
| 4 | P1 | `components/case-studies/stat-card.tsx` | Upgrade visuel : fond black + valeur Lemon |
| 5 | P1 | `admin/.../case-studies/[id]/page.tsx` | Tabs actifs : fond plein `bg-brand-black text-white` |
| 6 | P1 | `admin/.../case-studies/[id]/page.tsx` | Ajouter `focus-visible` sur tous les boutons |
| 7 | P2 | `case-studies/[slug]/page.tsx` | Supprimer CTA "Start a project" de la sidebar (mid-page) |
| 8 | P2 | `case-studies/[slug]/page.tsx` | Vérifier token `brand-flame-dark` dans tailwind.config |
| 9 | P2 | `case-studies/[slug]/page.tsx` | Aligner galerie sur pattern `/work/[slug]` (grille 2→3→4) |

---

**Handoff → @fullstack**
- Fichiers produits : `docs/reviews/pipeline-design-audit.md`
- Corrections P0 : badge keyMetric (ratio WCAG insuffisant) — correction immédiate avant tout déploiement
- Corrections P1 : tokens couleurs admin (emerald/blue → Sarani tokens), tabs, focus-visible, duplication sidebar, stat cards
- Corrections P2 : CTA sidebar mid-page, token `brand-flame-dark` à vérifier, galerie responsive à aligner
- Points d'attention : le token `brand-flame-dark` doit être documenté dans `design-tokens.json` ou supprimé. La constante LinkedIn `#0A66C2` doit être extraite, pas inline.
