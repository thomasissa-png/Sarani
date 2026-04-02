# Sarani — Visual Audit : Hero Section
*Produced by @design — 2026-03-24*
*Scope : Hero section + Header (screenshot déployé + code source)*
*Reference : docs/design/design-system.md, docs/design/design-tokens.json*

---

## Résumé exécutif

Note globale du hero : **5/10**

Le hero est fonctionnellement lisible et techniquement propre (animations soignées, code sans dette). Mais il échoue sur sa mission première : convaincre Sophie en 5 secondes qu'elle a affaire à une agence créative d'exception. La moitié droite de l'écran est vide, aucun visuel créatif n'est visible, et plusieurs micro-incohérences visuelles (pill sans fond, CTAs mal calibrés sur la palette) signalent un travail inachevé. Pour une agence dont la promesse est "Unlimited Creativity", l'absence totale de preuve visuelle above the fold est le problème critique numéro un.

---

## Grille d'audit par élément

| Élément | Criticité | Statut |
|---|---|---|
| Moitié droite vide | BLOQUANT | Echec |
| Pill "Unlimited revisions" sans fond | MAJEUR | Echec |
| CTA primaire "Let's chat" en Flame absent | MAJEUR | Ecart design system |
| Header : logo sur fond blanc | MAJEUR | Ecart charte logo |
| Header : CTA "Start a project" en Lemon | MAJEUR | Ecart design system |
| Dots flottants sans composition | MINEUR | Faible |
| Absence de pre-headline tag | MINEUR | Manque |
| Absence de stats / proof row | MINEUR | Manque |
| Absence de logos clients above fold | MINEUR | Manque |

---

## Détail des problèmes

---

### 1. La moitié droite du hero est vide — BLOQUANT

**Observation.** Sur desktop, tout le contenu (titre, subtitle, pills, CTAs) est concentré sur la moitié gauche. La moitié droite ne contient que 3–4 dots flottants dispersés. Le résultat visuel est un écran à moitié rempli qui semble inachevé.

**Pourquoi c'est bloquant.** Sarani est une agence créative. Sophie arrive sur ce site avec un problème de production (elle a besoin de 300 vidéos ou de 150 bannières livrées demain matin). La première chose qu'elle va chercher visuellement, c'est la preuve que l'agence *fait* ce qu'elle dit. Un hero tout-texte sans aucun visuel de travail dit l'inverse de ce qu'il veut dire : il dit "nous sommes une agence qui parle de créativité mais ne la montre pas." Ce gap a déjà été identifié comme critique dans le design-audit-v2.md (P1) et confirmé dans le creative-strategy-audit-v2.md. Le code actuel inclut bien un `<ProjectSlider />` en bas de section, mais il est trop bas dans la page et hors du viewport initial.

**Recommandation.** Introduire un visuel structuré dans la moitié droite du hero. Deux options à valider par le client :

- **Option A (préférée) — Grille de références asymétrique** : 3 à 4 vignettes empilées et légèrement rotées (±2°) montrant des livrables réels — une bannière Sony, une slide GEODIS, une frame video TikTok. Classe visuellement, aligne avec le positionnement "portfolio premium". Source : assets existants autorisés par les clients (décision confirmée 2026-03-24 dans project-context.md).
- **Option B — Metric cards flottantes** : si les assets visuels ne sont pas disponibles immédiatement, utiliser des cartes de stats animées ("+1500 videos/month", "D+1 delivery", "Sony Black Friday — same day") positionnées dans la moitié droite. Moins impactant visuellement mais réalisable sans assets.

Dans les deux cas, le layout du hero doit passer d'un bloc full-width centré à un **split layout 50/50** (ou 55/45) sur `lg:` et au-dessus. Le contenu textuel reste à gauche, le visuel à droite.

---

### 2. Le 4e pill "Unlimited revisions" n'a pas de fond — MAJEUR

**Observation dans le code.** Le tableau `PILL_STYLES` dans `animated-hero.tsx` (ligne 11–16) définit 4 styles :
```
"bg-brand-lemon/10 text-brand-black"   → pill 1 : fond Lemon pâle
"bg-brand-cerulean/10 text-brand-black" → pill 2 : fond Cerulean pâle
"bg-brand-flame/10 text-brand-black"    → pill 3 : fond Flame pâle
"bg-neutral-100 text-brand-black"       → pill 4 : fond blanc (#ffffff)
```

Le pill 4 utilise `bg-neutral-100` qui vaut `#ffffff` dans `globals.css` (ligne 25). Sur un fond de hero blanc (`bg-brand-white`), le résultat visuel est un pill sans fond apparent — il se confond avec la surface de la page.

**Règle design system violée.** Les pills sont des éléments de signal (value props de la marque). Leur rôle est de capter l'oeil et de renforcer la mémorisation des 4 promesses. Un pill invisible trahit la 4e promesse ("Unlimited revisions") — la plus différenciante de Sarani.

**Recommandation.** Remplacer `"bg-neutral-100 text-brand-black"` par `"bg-brand-black/8 text-brand-black"` ou `"bg-neutral-300/60 text-brand-black"`. Cela donne un fond gris clair cohérent avec les autres pills tout en restant dans la palette de neutrals du design system. Ne pas utiliser une 4e couleur accent (ce serait 4 accents en ligne, ce qui dilue leur pouvoir de signal).

---

### 3. CTA primaire : "Let's chat" n'est pas en Flame — MAJEUR

**Observation.** Le CTA primaire du hero est labellisé "Let's chat" et passe par `TrackedCta` avec `variant="primary"`. D'après le screenshot, il apparaît avec un fond Lemon (#faca15) — cohérent avec la couleur appliquée dans le header. Or le design system (section 3.2) définit explicitement :

> "Primary Button — Background: colors.accent.flame (#da5126)"

**Pourquoi c'est un problème.** Le Lemon est réservé aux highlights, avertissements et décorations (design-system.md section 1.2). Sur fond blanc, un bouton jaune pâle ne ressort pas suffisamment comme CTA primaire — le contraste visuel est faible. De plus, l'utilisation du Lemon pour le CTA primaire crée une confusion sémantique : Lemon = highlight/warning, Flame = action/CTA. Cette confusion est cohérente avec une implémentation "light-first" qui a dérivé du design system dark-first d'origine.

**Recommandation.** Vérifier le composant `Button` variant "primary" (src/components/ui/button.tsx non lu dans cet audit — à vérifier). Si le bouton est défini en Lemon dans le code du composant, le corriger en Flame. Sur fond blanc, Flame (#e35019) donne un contraste élevé et signale clairement l'action. Texte en noir : 5.32:1, WCAG AA pass.

[À VALIDER] Si le client préfère conserver le Lemon pour l'harmonie visuelle du hero (fond blanc + Lemon = palette plus douce), documenter comme exception intentionnelle dans design-system.md et maintenir le Flame pour tous les autres CTAs primaires du site.

---

### 4. Header : logo "dark" sur fond blanc — MAJEUR

**Observation dans le code.** Le `Header` utilise `<Logo variant="dark" />` (header.tsx ligne 122). La variante "dark" est définie pour les fonds noirs (design-system.md section 4.5). Le header est actuellement sur fond blanc (`bg-brand-white/90` au scroll). Sur fond blanc, le logo "dark" (fond noir intégré au PNG) crée un bloc noir visible qui casse la propreté du header.

**Règle design system violée.** Section 4.5 : "White (#ffffff) → White/Transparent version with black wordmark — create on demand". La variante "Primary" avec fond noir ne doit jamais être posée sur fond blanc.

**Recommandation.** Utiliser la variante transparente du logo (Sarani Logo_WHT-01.png ou une version à fond transparent) avec le wordmark en noir sur fond blanc. Si cet asset n'existe pas encore, le créer est une priorité. En attendant, documenter comme dette visuelle et prioriser la création de l'asset transparent fond-blanc.

---

### 5. Header : CTA "Start a project" en fond jaune — MAJEUR

**Observation.** Cohérent avec le point 3, le CTA du header apparaît en Lemon sur fond blanc, ce qui pose les mêmes problèmes sémantiques. De plus, dans le design system, le CTA header est prévu plus petit que le CTA hero (design-system.md section 3.5 : "padding-y spacing.3 12px, padding-x spacing.6 24px") — ce point semble correctement implémenté dans le code.

**Recommandation.** Aligner sur Flame pour tous les boutons variant="primary". Si le header a un fond blanc au scroll, Flame (#e35019) sur fond blanc offre un contraste fort qui guide l'oeil vers l'action principale.

---

### 6. Dots flottants sans composition intentionnelle — MINEUR

**Observation.** Les 8 dots de `AnimatedHeroDots` sont positionnés avec des coordonnées absolues dispersées sur tout le hero (top/left/right variables entre 12% et 65%). Leur distribution couvre autant la zone gauche (texte) que la zone droite (vide). Le résultat : les dots "compétitent" visuellement avec le titre et n'ont pas de rôle de guidage de lecture.

**Contexte positif.** Le design system autorise les dots décoratifs dans la moitié droite du hero ("The 3-dot Sarani submark can float in the right half of the hero on desktop — decorative, non-interactive"). Le problème est la distribution, pas le concept.

**Recommandation.** Une fois le visuel de la moitié droite ajouté (voir point 1), les dots doivent être reconfigurés pour ne flotter **que dans la moitié droite** et servir d'ornement autour du visuel. Les coordonnées `left-[22%]` et `left-[30%]` doivent être supprimées ou déplacées à droite. Réduire à 5–6 dots maximum (les 8 actuels sur un héro sans contenu visuel créent du bruit).

---

### 7. Absence du pre-headline tag — MINEUR

**Observation.** Le design system (section 3.1) spécifie une structure stricte pour le hero : "Pre-headline tag: small, all-caps, letter-spacing wide, Cerulean or white, e.g. 'The always-on enterprise creative partner'". Ce tag est absent du code actuel.

**Pourquoi c'est important.** Pour Sophie, qui arrive souvent via une recherche ou un referral, le pre-headline est le signal de qualification immédiate : "je suis au bon endroit, c'est une agence pour les grandes entreprises." Le titre "Unlimited Creativity" est fort mais non qualifié — il pourrait s'appliquer à une agence de graphisme indépendant ou à une startup créative pour PME.

**Recommandation.** Ajouter au-dessus du H1 un tag de 12–14px, all-caps, Cerulean, letter-spacing large : `"THE ENTERPRISE CREATIVE PARTNER"` ou `"35 EXPERTS. 5 CONTINENTS. 18 LANGUAGES."`. Peu d'effort d'implémentation, fort gain de qualification.

---

### 8. Absence de stats / proof row au-dessus du fold — MINEUR

**Observation.** Les métriques clés de Sarani (45 experts, 5 continents, 18 langues) sont dans la Section 2 "Our metrics" (fond noir, en-dessous du hero). Le design system prévoit une stats row dans le hero lui-même (section 3.1 point 4). Ces stats sont la principale preuve de taille et de légitimité pour Sophie.

**Recommandation.** Ajouter une ligne de 3 stats compactes sous le subtitle, avant les pills. Format : chiffre en Bold Lemon + label en Regular blanc/gris. Cela donne une preuve de scale immédiate sans quitter le hero. Si le split layout (point 1) est retenu, les stats peuvent migrer dans la moitié droite à la place d'une des metric cards.

---

### 9. Absence de logos clients above the fold — MINEUR

**Observation.** Les logos clients (TikTok, Sony, Adidas, GEODIS) apparaissent en Section 7 "Testimonials" — très loin dans la page. Le design system prévoit un "Trust logos strip" dans le hero, sous le CTA.

**Recommandation.** Ajouter une bande de 4–5 logos clients sous les CTAs du hero, précédée d'un label "Trusted by" en 12px neutral-500. Sur fond blanc, utiliser les logos en version grisée (grayscale + opacité 40%) pour ne pas casser la hiérarchie visuelle. Cet ajout est à faible effort et fort impact pour Sophie qui reconnaît immédiatement TikTok ou Sony.

---

## Synthèse des priorités

| Priorité | Problème | Impact conversion Sophie | Effort estimé |
|---|---|---|---|
| P1 | Moitié droite vide — pas de visuels créatifs | Critique | Élevé (dépend des assets) |
| P2 | Pill "Unlimited revisions" sans fond | Fort | Faible (1 ligne CSS) |
| P3 | CTA primaire non en Flame | Fort | Faible (1 token couleur) |
| P4 | Logo variant incorrecte sur fond blanc | Moyen | Moyen (asset à créer) |
| P5 | Pre-headline tag manquant | Moyen | Faible (1 composant texte) |
| P6 | Logos clients absents above fold | Moyen | Faible (composant existant à déplacer) |
| P7 | Stats absentes above fold | Moyen | Faible (données disponibles) |
| P8 | Dots flottants mal distribués | Faible | Faible (repositionnement) |

---

## Points conformes au design system

Les éléments suivants sont correctement implémentés et n'appellent pas de correction :

- Typographie Outfit Bold, taille Display (`text-8xl`/`xl:text-[7rem]`), tracking-tight — conforme section 2.2
- Structure H1 "Unlimited / Creativity" en deux lignes avec `leading-[1.05]` — conforme
- Subtitle en `text-lg`/`text-xl` Regular, couleur neutral-600 — conforme (la couleur exacte diffère du blanc 80% prévu pour fond noir, mais cohérent avec le choix light-first)
- Pills en `rounded-full` avec padding `px-4 py-2` — conforme section 3.2
- Deux CTAs avec variants distincts (primary + secondary) — structure conforme section 3.2
- Scroll listener sur le header avec transition `duration-250` — conforme section 3.5
- `prefers-reduced-motion` respecté sur toutes les animations — conforme accessibilité WCAG 2.2
- Focus trap implémenté sur le mobile menu (header.tsx lignes 47–79) — conforme WCAG 2.2 SC 2.1.1

---

## Note sur la contradiction dark-first / light-first

Ce point a été documenté dans les audits précédents (design-audit-v2.md, cross-review-report.md) et reste actif. Le design system définit un "natively dark" design (section 1.4), mais le site implémenté est light-first (fond blanc hero, header blanc au scroll). Les recommandations ci-dessus sont toutes formulées dans le contexte light-first actuel — ce n'est pas la session pour trancher la contradiction, qui nécessite une décision produit du client.

[À VALIDER PAR @orchestrator] : La direction dark-first vs light-first doit être arbitrée avant le sprint de refonte du hero (P1). Cela conditionne le traitement du visuel de la moitié droite (fond blanc avec visuels colorés vs fond noir avec visuels lumineux).

---

## Hypothèses à valider

- **H1** : Les assets visuels clients (bannières Sony, slides GEODIS, frames vidéo TikTok) sont disponibles en haute résolution et leur utilisation sur le hero est autorisée par les clients. Sans ces assets, l'option A (grille de références) n'est pas réalisable.
- **H2** : La direction choisit de maintenir le hero en light-first (fond blanc) ou de basculer en dark-first. Les couleurs des CTAs et la lisibilité du logo dépendent de cette décision.
- **H3** : Le composant `Button` variant="primary" dans `src/components/ui/button.tsx` utilise actuellement Lemon et non Flame — à vérifier avant implémentation des corrections P2/P3.

---

**Handoff → @fullstack**

- Fichiers produits : `/home/user/Sarani/docs/design/visual-audit.md`
- Décisions à implémenter (par priorité) :
  - P2 : `PILL_STYLES[3]` dans `animated-hero.tsx` → remplacer `bg-neutral-100` par `bg-brand-black/8`
  - P3 : Vérifier `button.tsx` variant primary — corriger Lemon → Flame si applicable
  - P5 : Ajouter pre-headline tag au-dessus du H1 dans `animated-hero.tsx`
  - P6 : Déplacer le composant `ClientLogos` sous les CTAs du hero (copie ou déplacement depuis Section 7)
  - P7 : Ajouter une ligne 3 stats (45 experts / 5 continents / 18 languages) entre subtitle et pills
  - P1 (dépend de H1 et H2) : Refonte layout split 50/50 avec visuel créatif — attendre validation client
  - P8 : Repositionner les dots flottants uniquement dans la moitié droite (left > 50%)
- Points d'attention :
  - P4 (logo) nécessite un asset PNG/SVG fond transparent avec wordmark noir — à créer ou demander au client
  - Tous les CTAs primaires du site doivent être alignés sur Flame si la correction P3 est validée (cohérence multi-pages)
  - La correction P1 est conditionnée à une décision dark-first/light-first et à la disponibilité des assets clients
