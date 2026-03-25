# Design Audit — Sarani Front-office (Pages 1–9)

**Agent** : @design
**Date** : 2026-03-25
**Scope** : Homepage, Header, Footer, About, Services (pages 1–5) + Work Listing, Work Detail, Pricing, Contact (pages 6–9)
**Référence** : Design system V2 (globals.css), positionnement premium Sarani (project-context.md)

---

## Méthodologie de scoring

Chaque page est évaluée sur 5 axes, notés /10 :
- **Identité visuelle** : cohérence avec les tokens, brand colors, typo Outfit
- **Hiérarchie visuelle** : flux de lecture, scanning, priorité des éléments
- **Qualité premium** : niveau de finition perçu, correspondance positionnement "enterprise"
- **Responsive** : adaptation mobile/tablette, grilles, lisibilité
- **Animations/interactions** : micro-interactions, transitions, états hover/focus

**Score global** = moyenne des 5 axes

---

## Page 6 — Work Listing (`/work`)

### Scores

| Axe | Score | Commentaire |
|---|---|---|
| Identité visuelle | 6/10 | Tokens corrects (brand-flame sur client, brand-cerulean sur CTA), mais aucun élément de marque différenciant — pas d'accent de couleur dans le hero, pas d'usage du brand-lemon |
| Hiérarchie visuelle | 5/10 | H1 "Case Studies" générique et fonctionnel, aucune accroche émotionnelle ou de positionnement. Le contenu utile (la grille) arrive immédiatement sans transition narrative |
| Qualité premium | 5/10 | Les CaseStudyCards sont propres mais visuellement pauvres — pas d'image, pas de visuel projet, fond blanc uniforme. Pour une agence créative "enterprise", l'absence totale d'imagery est un signal négatif fort |
| Responsive | 8/10 | Grille 1→2→3 colonnes bien calibrée. Padding et spacing System cohérents. `max-w-2xl` sur le chapeau protège la lisibilité |
| Animations | 6/10 | Hover `border-brand-lemon + shadow-md` sur la card : pertinent mais discret. L'arrow `gap-1→gap-2` sur "Read case study" est un micro-détail soigné. Aucune animation d'entrée page |

**Score global : 6/10**

### Problèmes critiques

1. **[BLOQUANT] Absence totale d'imagery.** Les cards ne contiennent aucun visuel (thumbnail, couleur de fond, illustration) — elles listent du texte sur fond blanc. Pour une agence dont le métier est le design et la production visuelle, c'est une contradiction directe avec le positionnement. Le champ `keyMetric` est mis en badge, mais aucune prévisualisation du travail réel n'existe.

2. **[MAJEUR] Hero trop fonctionnel, pas assez positionné.** Le H1 "Case Studies" et le paragraphe descriptif sont informatifs mais ne déclenchent aucune émotion. Un visiteur cold (Sophie, Head of Marketing) ne ressent pas immédiatement la puissance opérationnelle de Sarani. Aucun hook chiffré dans le hero (ex : "12 global brands. 24-hour delivery. Real results.").

3. **[MAJEUR] Pas de filtre ou de tri.** La grille affiche tous les case studies sans possibilité de filtrer par secteur, deliverable ou volume. À mesure que le portfolio grandit, la page devient non scannable pour un décisionnaire pressé.

4. **[MINEUR] Metric badge trop discret.** `bg-brand-black/5` (quasi-transparent) ne donne pas assez de poids au chiffre clé. C'est l'élément le plus persuasif de la card (400M+ views, 5,700 slides) — il devrait être en `brand-lemon` ou `brand-flame` pour déclencher une réaction émotionnelle immédiate.

### Recommandations pour atteindre 9/10

- **Imagery obligatoire** : Ajouter un champ `coverImage` dans `CaseStudy` (URL ou couleur de fond de marque client). Minimum : un bloc couleur gradient avec le logo client en overlay. Idéal : screenshot ou extrait du livrable réel.
- **Hero repensé** : Remplacer le H1 générique par une accroche de positionnement. Exemple : "12 global brands. Millions of deliverables. Every deadline met." avec une ligne de stats animées en arrière-plan ou un strip numérique défilant (cohérent avec l'animation `marquee` déjà en place dans globals.css).
- **Metric badge impactant** : Passer à `bg-brand-lemon text-brand-black` ou `bg-brand-flame text-brand-white` — le chiffre doit sauter aux yeux.
- **Filtres clients** : Ajouter un système de tags cliquables (secteur, deliverable type) dès la v2 du portfolio.
- **CTA de sortie** : Ajouter une section de conclusion avec un CTA "Start a similar project" après la grille — la page se termine actuellement de manière abrupte.

---

## Page 7 — Work Detail (`/work/[slug]`)

### Scores

| Axe | Score | Commentaire |
|---|---|---|
| Identité visuelle | 7/10 | Bonne cohérence tokens : brand-flame sur le client label, neutral scale pour le corps, H1 bold en brand-black. La sidebar "At a Glance" avec `bg-surface-elevated` est bien calibrée. Tags en `bg-brand-black/5` trop discrets |
| Hiérarchie visuelle | 7/10 | Flux logique : tags → client → H1 → meta strip → image → Challenge/Solution → Results → Gallery → CTA → Related. La sidebar sticky `top-24` sur desktop apporte une navigation contextuelle utile. Toutefois, le "Results" centré après la section principale crée une rupture de flux |
| Qualité premium | 4/10 | Deux zones critiques sont des placeholders vides : hero image (`aspect-video bg-surface-elevated`) et gallery (2x `aspect-video bg-surface-elevated`). Ces zones grises sont visuellement équivalentes à un chantier non terminé — elles détruisent la perception de qualité premium |
| Responsive | 7/10 | Grid `lg:grid-cols-12` avec 8/4 bien pensé. La sidebar passe naturellement en bas sur mobile. Le `min-w-[480px]` sur la table de résultats avec `overflow-x-auto` est correct |
| Animations | 5/10 | Aucune animation de révélation sur le hero. Le sticky sidebar ne donne pas de feedback visuel de sa position. Les StatCards n'ont pas d'animation de compteur pour les chiffres clés (400M+ views, 1500+ edits) — une opportunité manquée |

**Score global : 6/10**

### Problèmes critiques

1. **[BLOQUANT] Double placeholder imagery.** La page de détail contient deux zones grises vides qui occupent chacune la largeur complète de la page : le hero image `aspect-video` et la gallery en `sm:grid-cols-2`. Sur un écran desktop, c'est environ 60% de la longueur de page qui est visuellement morte. Pour une agence créative présentant ses réalisations à des Head of Marketing, c'est rédhibitoire.

2. **[MAJEUR] StatCards sans impact chiffré.** Les stats (ex : "1,500+ edits/month", "400M+ views") sont affichées dans des cards simples (`StatCard`). L'absence d'animation de compteur ou de mise en scène visuelle forte (couleur de fond, taille de typographie XX-Large) neutralise l'impact persuasif de ces chiffres. Ce sont précisément les données qui convertissent Sophie — elles doivent dominer visuellement la page.

3. **[MAJEUR] CTA "Results" centré incohérent.** Le titre "Results" en `text-center` dans une section large-format rompt la cohérence du layout (le reste de la page est aligné à gauche dans `max-w-3xl`). L'alignement à gauche des résultats dans le flux narratif serait plus cohérent.

4. **[MINEUR] Sidebar "At a Glance" redondante.** Les mêmes informations (Client, Deliverable, Volume, Timeline) apparaissent dans le meta strip du hero ET dans la sidebar. Sur desktop, cette duplication est visible simultanément. Différencier le contenu : le meta strip reste en haut, la sidebar sidebar pourrait contenir des informations complémentaires (secteur, technologies, lien direct CTA).

5. **[MINEUR] Tags `bg-brand-black/5` illisibles.** L'opacité 5% du fond donne des tags quasi invisibles sur fond blanc. Passer à `bg-neutral-200 text-neutral-700` pour assurer la lisibilité, ou utiliser les couleurs de marque (brand-cerulean/10) pour créer une catégorisation visuelle.

### Recommandations pour atteindre 9/10

- **Imagery réelle obligatoire** : Définir une image de couverture par case study (champ `coverImage`). En l'absence d'image, utiliser un fond dégradé couleur-de-marque-client avec logo — jamais de zone grise vide en production.
- **StatCards haute impact** : Augmenter la taille des valeurs numériques à `text-5xl lg:text-6xl font-black`, utiliser `text-brand-flame` ou `text-brand-cerulean` selon le case study. Ajouter une animation de compteur JavaScript (simple `requestAnimationFrame`).
- **Gallery supprimée jusqu'à avoir du contenu** : Préférer conditionner l'affichage (`cs.gallery && cs.gallery.length > 0`) plutôt qu'afficher des placeholders vides.
- **Sticky sidebar enrichie** : Remplacer la duplication par un contenu unique (ex : indicateurs de satisfaction, lien vers un projet similaire, quote client si disponible).
- **Tags colorés** : Mapper les tags sur des couleurs sémantiques (`brand-cerulean` pour les catégories type "Video", `brand-flame` pour "Urgent/24h", `brand-lemon` pour les métriques exceptionnelles).

---

## Page 8 — Pricing (`/pricing`)

### Scores

| Axe | Score | Commentaire |
|---|---|---|
| Identité visuelle | 8/10 | Utilisation des 3 couleurs de marque sur les `border-t-4` des cards (flame/cerulean/lemon) bien différencié. Le strip garanti en `bg-brand-black` avec `text-brand-lemon` est percutant. La table de comparaison `bg-brand-black` avec `text-brand-lemon` pour Sarani vs `text-neutral-500 line-through` pour les concurrents est élégante |
| Hiérarchie visuelle | 8/10 | Flux clair : Hero → Garantie strip → Grille pricing → Comparaison → Trust logos → FAQ → CTA final. Progression narrative convaincante. La division 3+2 de la grille avec centrage du second rang est bien pensée. Le `text-brand-flame` sur "Zero surprises." dans le H1 crée un point focal efficace |
| Qualité premium | 7/10 | Les PricingCards sont propres avec un bon ratio signal/bruit. Les emojis par catégorie (`🎨`, `🎬`, `📊`) constituent un bémol : en contexte enterprise B2B avec des clients Sony/TikTok, les emojis réduisent la perception de sérieux. C'est une tension identitaire à résoudre |
| Responsive | 7/10 | Grille 1→2→3 fonctionnelle. Le `lg:max-w-[calc(66.666%+0.75rem)]` pour le centrage du second rang est une solution technique correcte mais fragile (valeur hardcodée). La table de comparaison avec `min-w-[480px] overflow-x-auto` est bien gérée |
| Animations | 7/10 | Hover `hover:-translate-y-1 hover:shadow-lg` sur les PricingCards est satisfaisant. Le `group-open:rotate-45` sur le "+" des FAQ est une micro-interaction soignée. Le CTA final manque d'un effet de relief (shadow ou border sur le `Button primary`) |

**Score global : 7.4/10**

### Problèmes critiques

1. **[MAJEUR] Emojis dans un contexte enterprise B2B.** L'usage d'emojis (`🎨`, `🎬`, `📊`, `📈`, `⚡`) comme identifiants de catégories est une décision de design cohérente en B2C ou SaaS grand public, mais crée une friction avec le positionnement "global enterprise" de Sarani (clients : Sony, TikTok, GEODIS, L'Oréal). Sophie, Head of Marketing chez un grand groupe, pourrait percevoir ces emojis comme un manque de maturité professionnelle. Remplacer par des icônes SVG système (stroke, style cohérent avec l'iconographie du reste du site).

2. **[MAJEUR] Aucune indication de délai sur les PricingCards.** Le différenciateur #1 de Sarani est la livraison D+1 — cette information n'apparaît nulle part dans les cards de pricing. Un visiteur qui ne lit que les prix (comportement fréquent) rate l'argument de rapidité qui justifie le premium.

3. **[MINEUR] Calcul hardcodé dans le CSS.** `lg:max-w-[calc(66.666%+0.75rem)]` pour centrer le second rang est fragile : si la grille change (colonnes, gap), ce calcul sera erroné. Utiliser plutôt `lg:col-span-2 lg:mx-auto lg:w-full lg:max-w-2xl` ou une approche CSS Grid plus robuste.

4. **[MINEUR] Note TVA perdue visuellement.** `"All prices exclude VAT (HT)"` en `text-sm text-neutral-500` placée après la grille est peu visible. Pour Marc (Directeur Achats), la clarté des conditions tarifaires est critique — cette note mérite `text-neutral-600` ou un positioning dans chaque card.

5. **[MINEUR] FAQ native `<details>` sans icône custom.** Le `+` en `text-xl text-neutral-400` qui pivote à 45° fonctionne mais manque de caractère. Utiliser une icône SVG Chevron ou Cross cohérente avec le système d'icônes global renforcerait la finition.

### Recommandations pour atteindre 9/10

- **Icônes SVG à la place des emojis** : Créer 5 icônes stroke (pencil-brush pour Content, film pour Video, presentation pour Slides, chart pour Marketing, bolt pour On-Demand). Style unifié 24x24, stroke-width 1.5, couleur brand-black. Même set d'icônes que le reste du site.
- **Badge D+1 sur chaque card** : Ajouter une ligne `"D+1 delivery"` en `text-xs text-brand-cerulean font-medium` sous le titre de chaque catégorie éligible, ou un badge inline sur les items concernés.
- **Comparaison table enrichie** : Ajouter une ligne "Satisfaction guarantee" (Sarani: "Yes — or no invoice" vs Agency: "None") pour renforcer l'argument conversion.
- **Ancre de navigation interne** : Ajouter `id="pricing"` sur la section grille et un lien d'ancre dans le hero pour les deep links depuis d'autres pages.
- **CTA final renforcé** : Le CTA "One brief. 24 hours. Done." est excellent en copy — l'envelopper dans un background distinctif (gradient noir → flame) plutôt que `bg-brand-black` uni pour créer une rupture visuelle plus forte en fin de page.

---

## Page 9 — Contact (`/contact`)

### Scores

| Axe | Score | Commentaire |
|---|---|---|
| Identité visuelle | 7/10 | Le bouton submit en `bg-brand-lemon` est le seul élément de couleur de la page — choix pertinent pour l'action primaire. `focus:border-brand-cerulean focus:ring-brand-cerulean` sur les inputs est cohérent avec le design system. Le `border-l-4 border-error` sur les banners d'erreur utilise correctement les semantic colors |
| Hiérarchie visuelle | 7/10 | La page est épurée et linéaire — H1, chapeau, formulaire. `max-w-[640px]` centré maintient une largeur de ligne lisible. L'ordre des champs est logique (identité → besoin → qualification → attribution). La micro-copy de garantie "First project satisfaction or no invoice." en bas du formulaire est un élément de conversion fort bien positionné |
| Qualité premium | 6/10 | Le formulaire est fonctionnel et accessible, mais visuellement banal. Il n'y a aucune signature visuelle Sarani sur cette page — ni couleur de fond distinctive, ni élément graphique, ni section de réassurance latérale. Pour une page qui est le dernier step avant la conversion d'un lead enterprise, la sobriété frise le vide |
| Responsive | 8/10 | `max-w-[640px] mx-auto` gère bien tous les breakpoints. `min-h-[44px]` sur les inputs respecte le minimum tactile iOS/Android. `resize-y` sur le textarea est correct. Aucun problème identifié sur le responsive |
| Animations | 6/10 | `hover:scale-[1.02] active:scale-[0.98]` sur le bouton submit est une micro-interaction bien pensée. `transition-colors duration-150` sur les inputs. Le success state est statique (icône + texte) — une animation d'apparition aurait renforcé la satisfaction post-soumission |

**Score global : 6.8/10**

### Problèmes critiques

1. **[MAJEUR] Page trop austère pour un closing page.** La page contact est la page de conversion finale — c'est là que Sophie décide d'envoyer ou non son brief. La mise en page actuelle (formulaire blanc sur fond blanc, sans aucun élément de réassurance visuelle) ne crée pas de sentiment de confiance ou d'urgence positive. Aucun élément de preuve sociale (logos clients, chiffre clé, quote) n'est visible pendant le remplissage du formulaire.

2. **[MAJEUR] Select natif sans style custom.** Les deux `<select>` (company size, attribution) utilisent `appearance-none` sans aucun indicateur visuel de dropdown (chevron SVG). Sur certains navigateurs/OS, le résultat est un input plat sans indication qu'il s'agit d'un menu déroulant — problème d'affordance UX qui peut bloquer des soumissions.

3. **[MAJEUR] Input file hors-système.** Le `<input type="file">` utilise `file:bg-neutral-200 file:rounded-lg` — le pseudo-élément `::file-selector-button` est partiellement stylisé mais son rendu varie fortement entre navigateurs (Chrome vs Safari vs Firefox). Sur Safari iOS, le style est ignoré. Le bouton "Choose file" doit être remplacé par une implémentation custom (drag & drop zone ou bouton stylisé qui déclenche l'input caché).

4. **[MINEUR] H1 "Start a project." trop court.** Le titre manque d'une ligne de contexte impactante. Exemple : "Start a project." seul ne capitalise pas sur la promesse de rapidité. Une sous-accroche entre le H1 et le `<p>` chapeau pourrait renforcer la conversion ("Your brief. Our 24-hour delivery.").

5. **[MINEUR] Success state sans branding.** L'état de confirmation post-soumission (icône check + "Brief received. / We'll respond within the hour.") est minimal. Manquent : la couleur de fond brand, un message d'attente plus personnalisé ("A member of our team is reviewing your brief right now."), et un lien de retour vers le portfolio pour maintenir l'engagement.

### Recommandations pour atteindre 9/10

- **Layout 2 colonnes sur desktop** : Passer la page contact en `lg:grid lg:grid-cols-2 lg:gap-16` — colonne gauche = formulaire, colonne droite = éléments de réassurance (strip logos clients, 3 chiffres clés, quote d'un client, délai de réponse visuel "We reply within 1 hour"). Ce pattern est standard sur les landing pages B2B haute performance.
- **Select avec chevron SVG custom** : Wrapper les `<select>` dans un `<div className="relative">` avec un `<svg>` positionné `absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none` — cohérent avec le `appearance-none` déjà appliqué.
- **Input file remplacé** : Implémenter un composant `DropZone` avec drag & drop (`onDragOver`, `onDrop`) et un bouton custom stylisé. Fallback sur l'input natif caché (`className="sr-only"`) pour l'accessibilité.
- **Success state brand** : Background `bg-brand-black`, titre en `text-brand-lemon`, icône check custom. Ajouter un lien "View our work" pour rediriger vers `/work` et maintenir l'engagement post-conversion.
- **Réassurance dans le formulaire** : Ajouter sous le H1 une ligne de stats inline (`35 experts · 18 languages · Reply < 1 hour`) en `text-sm text-neutral-500` pour ancrer la promesse pendant le remplissage.

---

## Synthèse comparative

### Tableau de scores

| Page | Identité | Hiérarchie | Premium | Responsive | Animations | **Global** |
|---|---|---|---|---|---|---|
| P6 — Work Listing | 6/10 | 5/10 | 5/10 | 8/10 | 6/10 | **6.0/10** |
| P7 — Work Detail | 7/10 | 7/10 | 4/10 | 7/10 | 5/10 | **6.0/10** |
| P8 — Pricing | 8/10 | 8/10 | 7/10 | 7/10 | 7/10 | **7.4/10** |
| P9 — Contact | 7/10 | 7/10 | 6/10 | 8/10 | 6/10 | **6.8/10** |

### Points forts transversaux

- **Système de tokens cohérent** : Les 4 pages utilisent correctement les variables CSS du design system (brand-flame, brand-cerulean, brand-lemon, neutral scale). Aucune couleur hors-système détectée.
- **Accessibilité de base solide** : `aria-label` sur toutes les sections, `aria-invalid` + `aria-describedby` sur les champs du formulaire, `role="alert"` sur les banners d'erreur, skip link dans globals.css, `prefers-reduced-motion` respecté. Base WCAG 2.2 AA correcte.
- **Typographie cohérente** : Outfit exclusivement sur les 4 pages, echelle de tailles logique (text-sm → text-5xl selon le contexte), line-height `leading-relaxed` sur les corps de texte.
- **Responsive fonctionnel** : Toutes les grilles ont un comportement mobile-first correct. `min-h-[44px]` sur les inputs du formulaire respecte les guidelines tactiles.

### Problème systémique #1 — Absence d'imagery

Le problème le plus impactant transversalement est l'absence totale de visuels réels du travail de l'agence. Sur les 4 pages auditées :
- Work Listing : cards sans thumbnail
- Work Detail : 2 placeholders gris vides
- Pricing : aucun visuel d'illustration du service
- Contact : page entière sans image

Pour une agence créative dont le cœur de métier est la production visuelle, cette absence envoie un signal de manque de confiance et contredit directement le positionnement "enterprise premium". C'est le chantier prioritaire #1.

### Problème systémique #2 — Réassurance insuffisante sur les pages conversionnelles

Les pages Work (listing + detail) et Contact ne capitalisent pas assez sur la preuve sociale. Les chiffres clés (400M+ views, 1500+ edits/month, 60% savings) sont présents dans les données mais soit trop discrets visuellement, soit absents des zones à fort impact persuasif (hero, sidebar, page contact).

### Contrastes WCAG 2.2 AA — Vérification

| Combinaison couleur | Ratio estimé | AA 4.5:1 (texte normal) | AA 3:1 (grand texte) |
|---|---|---|---|
| `text-brand-black` (#000) sur `bg-brand-white` (#fff) | 21:1 | PASS | PASS |
| `text-neutral-600` (#525252) sur `bg-brand-white` (#fff) | ~7:1 | PASS | PASS |
| `text-neutral-500` (#737373) sur `bg-brand-white` (#fff) | ~4.6:1 | PASS | PASS |
| `text-neutral-400` (#a3a3a3) sur `bg-brand-white` (#fff) | ~2.9:1 | **FAIL** — texte décoratif uniquement | FAIL |
| `text-brand-lemon` (#faca15) sur `bg-brand-black` (#000) | ~10.7:1 | PASS | PASS |
| `text-brand-cerulean` (#0bb3f0) sur `bg-brand-white` (#fff) | ~3.1:1 | FAIL sur texte normal | PASS (grand texte) |
| `text-brand-flame` (#e35019) sur `bg-brand-white` (#fff) | ~4.0:1 | **FAIL** sur texte corps normal | PASS (grand texte) |
| `text-brand-white` (#fff) sur `bg-brand-black` (#000) | 21:1 | PASS | PASS |
| `text-neutral-500` (#737373) sur `bg-surface-elevated` (#f3f5f7) | ~4.1:1 | **FAIL** sur texte corps | PASS (grand texte) |

**Points de vigilance WCAG** :
- `text-neutral-400` est utilisé comme texte décoratif (placeholder, micro-copy) — acceptable uniquement si non porteur d'information critique
- `text-brand-cerulean` (#0bb3f0) sur fond blanc : ratio 3.1:1 insuffisant pour le texte corps. Les usages actuels (CTA "Read case study" en `text-sm`, lien email sur /contact) sont **sous le seuil AA**. Remplacer par `text-brand-cerulean-dark` (#0888ba) qui passe à ~4.7:1
- `text-brand-flame` (#e35019) sur fond blanc : ratio ~4.0:1, juste sous le seuil 4.5:1 pour le texte corps. Utilisé comme label client (text-sm) — **non conforme AA**. Utiliser `text-brand-flame-dark` (#b03d1c) pour le texte body (ratio ~6.8:1)

### Priorités d'action (ordre décroissant d'impact)

1. **[P0] Ajouter imagery réelle** sur Work Listing et Work Detail — bloquant pour le positionnement premium
2. **[P1] Corriger les contrastes WCAG** : cerulean et flame sur fond blanc passent en dark variants pour les usages texte corps
3. **[P1] Page Contact** : layout 2 colonnes + select chevron + input file custom
4. **[P2] Work Listing** : hero repositionné + metric badge impactant + CTA de fin
5. **[P2] Pricing** : icônes SVG à la place des emojis + badge D+1 sur les cards
6. **[P3] Work Detail** : StatCards haute impact + suppression conditionnelle des placeholders gallery

---

**Handoff → @fullstack**

- Fichiers produits : `/home/user/Sarani/docs/reviews/design-audit-frontoffice.md`
- Décisions prises :
  - Imagery manquante identifiée comme problème systémique #1 — nécessite ajout du champ `coverImage` dans l'interface `CaseStudy` (`src/data/case-studies.ts`) et rendu conditionnel dans `CaseStudyCard` et la page detail
  - Remplacement `text-brand-cerulean` → `text-brand-cerulean-dark` (#0888ba) pour tous les liens texte corps (WCAG non conforme actuellement)
  - Remplacement `text-brand-flame` → `text-brand-flame-dark` (#b03d1c) pour les labels client en `text-sm` (WCAG non conforme actuellement)
  - Select natif sur /contact : ajouter chevron SVG custom dans wrapper `relative`
  - Input file sur /contact : remplacer par composant DropZone custom
  - Page Contact : passer en layout 2 colonnes sur `lg:` avec colonne de réassurance
- Points d'attention :
  - Les tokens `--color-brand-cerulean-dark` et `--color-brand-flame-dark` existent déjà dans `globals.css` — aucun ajout de token requis, juste substitution des classes Tailwind
  - La suppression des placeholders gallery sur `/work/[slug]/page.tsx` doit être conditionnelle sur un champ `cs.gallery` futur — ne pas supprimer le slot structurel
  - Toutes les modifications de couleur texte doivent être testées en régression visuelle (@qa snapshots)
