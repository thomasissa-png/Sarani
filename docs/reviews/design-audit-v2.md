# Sarani — Design Audit V2
*Produced by @design — 2026-03-24*
*Scope : code implémenté (Next.js / Tailwind v4). Référence benchmark : Superside, Pentagram, Collins.*

---

## Note globale : 5.5 / 10

**Résumé en une phrase :** Le design system V2 est techniquement propre et fonctionnellement cohérent — mais il manque de personnalité créative à la hauteur d'une agence qui prétend à "Unlimited Creativity" et travaille pour TikTok et Sony.

---

## Table des matières

1. [Notes par axe](#1-notes-par-axe)
2. [Points forts](#2-points-forts)
3. [Points faibles critiques](#3-points-faibles-critiques)
4. [Recommandations prioritaires](#4-recommandations-prioritaires)
5. [Analyse page par page](#5-analyse-page-par-page)
6. [Verdict final](#6-verdict-final)
7. [Hypothèses à valider](#7-hypothèses-à-valider)

---

## 1. Notes par axe

| Axe | Note /5 | Niveau |
|-----|---------|--------|
| a) Identité visuelle / Wow factor | 2.5/5 | Insuffisant |
| b) Système de design | 4/5 | Bon |
| c) Hiérarchie visuelle | 3.5/5 | Acceptable |
| d) CTA et conversion | 4/5 | Bon |
| e) Responsive / Mobile | 3.5/5 | Acceptable |
| f) Micro-interactions et animations | 2/5 | Faible |
| g) Accessibilité WCAG AA | 3.5/5 | Acceptable |
| h) Portfolio / Work | 2/5 | Faible |
| i) Typographie | 3.5/5 | Acceptable |
| j) Couleurs et contrastes | 3.5/5 | Acceptable |

**Moyenne pondérée : 5.5 / 10**

---

## 2. Points forts

### Design system : cohérence technique irréprochable

Le système de tokens dans `globals.css` et `design-tokens.json` est proprement défini. Trois couleurs d'accent (Flame, Cerulean, Lemon), une échelle de neutres complète, des shadows documentées, une grille de z-index explicite. C'est le travail d'un développeur méthodique. Les tokens sont cohérents entre le fichier de documentation et l'implémentation CSS — aucune dérive.

### Composant Button : propre et fonctionnel

`button.tsx` est bien architecturé. Trois variants (primary, secondary, ghost), états hover/active/disabled corrects, pattern polymorphique `<a>` ou `<button>` selon le contexte, rounded-full pour correspondre au style V2. Le CTA primaire lemon sur fond noir a de l'impact. C'est le meilleur composant du système.

### Header : comportement scroll correct

Le header sticky avec `bg-brand-white/90 backdrop-blur-[12px]` au scroll est une décision juste. L'hamburger cercle bleu (cerulean) sur mobile est un clin d'œil identitaire cohérent avec les points décoratifs du logo. Blocage du scroll body quand le menu mobile est ouvert : bonne pratique.

### Ancrage de marque via les accents colorés

Le logo SVG avec les dots colorés (lemon, cerulean, flame) est une bonne signature visuelle. La répétition de ces trois couleurs en tant que séparateurs, états hover, et labels (cerulean pour les client names, flame pour les prix, lemon pour les stats) crée une cohérence mémorielle. Le `Submark` (trois points) est un system élégant pour les usages restreints.

### Contact form : best-in-class fonctionnel

C'est la page techniquement la plus solide. Validation Zod, honeypot anti-spam, file upload avec validation type/taille, analytics sur form_view / form_start / form_submit, gestion rate-limiting, focus sur le premier champ invalide. Visuellement sobre mais accessible et fonctionnel.

### Footer : dark-first, compact et complet

Le footer noir avec la typographie hiérarchisée (heading blanc, liens neutral-400 → blanc au hover) est le seul endroit du site où la promesse dark-first du design system original est pleinement exprimée. Structure 4 colonnes propre.

### Proof cards : données réelles, prix visibles

Les trois preuves sociales (Sony 155€, GEODIS 8,500€, TikTok 1,500+/mois) avec les prix en `brand-flame` sont une excellente décision éditoriale. Afficher les prix en couleur d'accent sur un fond blanc, c'est courageux et différenciant par rapport aux agences qui cachent leurs tarifs.

---

## 3. Points faibles critiques

### CRITIQUE 1 — Héro : texte centré + fond blanc = agence générique (bloquant)

**Le problème fondamental du site se joue ici.**

`page.tsx`, section Hero : `text-center`, fond `bg-brand-white`, `text-6xl font-bold`. "Unlimited Creativity" en Outfit Bold centré sur blanc. C'est un héro de landing page SaaS de 2019. Superside, Pentagram, Collins n'ont pas un héro comme ça. Ils ont des images de travail réel, des mises en scène typographiques audacieuses, des compositions qui provoquent.

Problèmes spécifiques :
- **Zéro image de travail créatif.** Pas un seul visuel de production dans la section hero. Une agence créative qui prétend à "Unlimited Creativity" sans montrer sa créativité dans les 5 premières secondes est en contradiction avec elle-même.
- **Typographie trop conventionnelle.** `text-6xl` à `xl:text-[7rem]` est une taille correcte mais sans traitement typographique distinctif. Pas de rupture de baseline, pas d'alignement mixte, pas de mise en valeur partielle d'un mot en accent couleur. Ça reste du texte bold noir sur blanc.
- **Les 4 value props en ligne horizontale** ("24/7 availability", "D+1 deliveries", "Fixed prices", "Unlimited revisions") sont des badges texte sans hiérarchie. Ils ressemblent à une liste de features SaaS, pas à des preuves d'une agence créative premium.
- **Les HeroDots décoratifs sont sous-dimensionnés.** Six points entre 1.5px et 3px sur un viewport full-height : invisibles en pratique, cosmétiques sans impact.

Référence manquée : Superside a un hero avec une vidéo background montrant des assets réels. Pentagram a une rotation dynamique de projets. Sarani a "Unlimited Creativity" en noir sur blanc.

---

### CRITIQUE 2 — Portfolio/Work : zéro visuel, zéro preuve créative (bloquant)

**C'est le défaut le plus dommageable pour la conversion.**

`work/page.tsx` : une grille de cards texte. `case-study-card.tsx` : client name en flame, headline en bold, description en neutral-500, lien "Read case study →" en cerulean. Aucune image, aucune thumbnail, aucun aperçu visuel.

`case-studies/[slug]/page.tsx` : ligne 119 — `<div className="aspect-video w-full rounded-2xl bg-surface-elevated" />` — c'est un placeholder gris. Lignes 197-201 : deux autres placeholders gris. Trois zones d'image manquantes sur chaque case study.

Sophie, Head of Marketing d'un grand groupe, arrive sur /work pour évaluer la qualité créative de Sarani avant de signer. Elle voit des cards texte et des rectangles gris. Elle part. C'est fini.

Les agences de référence vendent par le visuel : Pentagram a des grilles d'images fullbleed. Collins a des animations et des compositions visuelles par projet. Superside montre des assets réels dans chaque case study.

---

### CRITIQUE 3 — Design system incohérent avec lui-même : dark-first documenté, light-first implémenté (majeur)

`design-tokens.json` définit `colors.surface.base` = `#000000` (fond noir). `design-system.md` section 1.1 : "Sarani's visual identity is built on a dark-first palette." Section 1.4 : "There is no light mode toggle required for v1."

Pourtant, `globals.css` implémente `body { background-color: #ffffff }` et la majorité des pages est sur fond blanc. Le design system documente une chose, l'implémentation en fait une autre. C'est une contradiction formelle dans le système.

De plus, `design-tokens.json` (surface.base = #000000) diverge de `globals.css` (surface-base = #ffffff). Deux sources de vérité pour le même token : dette design active.

---

### CRITIQUE 4 — Typographie : une seule police, pas de poids varié, pas de hiérarchie émotionnelle (majeur)

Outfit Bold pour tout (headings h1 à h6), Outfit Regular pour le body. Pas de Medium (500) utilisé dans les titres intermédiaires. Aucune variation de casse structurée. Résultat : une hiérarchie visuelle entièrement portée par la taille et la couleur, sans jeu de poids. Les pages longues (About, Pricing) manquent d'air et de rythme.

La documentation prévoit `fontWeight.medium = 500` mais il n'est jamais utilisé dans les composants lus. Toutes les sections utilisent soit `font-bold` (700) soit pas de font-weight spécifique (défaut 400).

Pour une agence qui se positionne "créative et premium", Outfit seul est trop neutre. Les agences de haut niveau utilisent soit une typographie custom, soit deux polices complémentaires avec des personnalités distinctes.

---

### CRITIQUE 5 — Micro-interactions : quasi inexistantes (majeur)

`transition-all duration-150` sur les boutons, `hover:border-brand-lemon` sur les cards, `hover:text-brand-flame` sur les nav links. C'est tout.

Pas d'animation d'entrée au scroll. Pas de parallaxe. Pas d'indicateur animé sur les métriques (compteur des chiffres "1,500+", "<24h"). Pas de cursor custom. Pas de loading state élaboré. Pas de transition de page.

Le site est statique en pratique. Pour une agence qui produit des vidéos et des assets créatifs à la demande, un site statique est un contre-signal violent. Superside a des animations Lottie dans son hero. Collins a des transitions typographiques. Sarani a `hover:scale-[1.02]` sur les boutons.

---

### CRITIQUE 6 — Client logos : texte pur, sans poids visuel (majeur)

`client-logos.tsx` : les logos TikTok, Sony, GEODIS, Adidas, L'Oréal, PICO sont affichés comme des spans texte uppercase `text-neutral-400`. Pas de vrais logos SVG/PNG. Pas de traitements visuels différenciés.

Cette section devrait être un moment de réassurance fort — les logos reconnus de TikTok et Sony ont une valeur de signal immense pour Sophie. Les afficher en texte gris allégé diminue radicalement leur pouvoir de validation sociale.

---

### CRITIQUE 7 — Page Pricing : comparaison table avec erreur de contraste (mineur/bloquant accessibilité)

`pricing/page.tsx` ligne 143 : `bg-brand-cerulean` pour l'en-tête de colonne "Sarani", avec `text-brand-black`. Le cerulean (#0babe8) sur blanc donne 6.75:1 (OK), mais le fond cerulean avec texte noir sur les cellules de données (ligne 159) : `text-brand-cerulean` sur `bg-surface-elevated` (#f5f5f5). Contraste : cerulean (#0babe8) sur f5f5f5 = environ 3.1:1. C'est en FAIL pour le texte normal (< 4.5:1). Uniquement acceptable comme grand texte UI — or c'est du texte de données tableau en 1rem.

---

### CRITIQUE 8 — About page : aucune section héro visuelle, hiérarchie des sections cassée (mineur)

`about/page.tsx` : h1 "Why Sarani exists" en `text-4xl sm:text-5xl` sans préambule visuel. Pas de photo d'équipe, pas de carte des 5 continents, pas d'illustration. La section "Our team" sur fond noir utilise des chiffres en `text-brand-lemon` (35, 5, 18) — c'est le seul moment fort visuel de la page. Mais le reste est un mur de texte journalistique bien écrit mais non rythmé visuellement.

---

## 4. Recommandations prioritaires

Classées par impact décroissant. Les 3 premières sont des corrections bloquantes.

---

### P1 — Ajouter des visuels de travail dans les case studies et le hero (impact : très élevé)

**Problème résolu :** la désynchronisation entre la promesse créative et la preuve visuelle.

Actions concrètes :
1. **Case studies** : remplacer les trois `<div className="aspect-video rounded-2xl bg-surface-elevated" />` par de vraies images (format recommandé : 16:9, 1200px min, WebP). Minimum 1 image hero par case study + 2 images galerie. Si les assets ne sont pas disponibles, utiliser des captures d'écran ou des maquettes du travail livré.
2. **Hero homepage** : ajouter une grille flottante de 3-4 aperçus de travail réel (bannières Sony, slides GEODIS, thumbnails TikTok) visibles en desktop, masquée en mobile. Ces images peuvent être positionnées en `absolute` avec un léger angle pour créer de la dynamique.
3. **Work page** : ajouter une thumbnail visuelle à chaque `CaseStudyCard` — même un fond coloré avec le logo client en SVG serait mieux que du texte pur.

**Complexité :** moyenne (principalement un travail de production d'assets + intégration image).

---

### P2 — Transformer le héro : typographie émotionnelle + layout asymétrique (impact : très élevé)

**Problème résolu :** le manque de "wow factor" dès la première impression.

Actions concrètes :
1. Passer de `text-center` à un layout split horizontal (desktop) : texte à gauche, visuel créatif animé ou statique à droite.
2. Traitement typographique sur "Unlimited" vs "Creativity" : tailles différentes, un mot en couleur accent. Exemple : "Unlimited" en black large, "Creativity" en flame ou lemon outline. Briser la symétrie du héro.
3. Remplacer les 4 value props texte par des badges pill stylisés avec icônes : `⚡ D+1 delivery`, `∞ Unlimited revisions`, `💬 24/7 availability`, `€ Fixed prices`. Ces badges peuvent utiliser les couleurs accent de façon ciblée.
4. Augmenter la taille des HeroDots décoratifs : minimum 8px-16px pour être perceptibles. Les animer en CSS (float subtil, `@keyframes`).

**Complexité :** moyenne (pas de refonte structurelle, modifications de layout et style).

---

### P3 — Corriger la contradiction dark-first vs light-first dans le design system (impact : élevé)

**Problème résolu :** la dette design entre documentation et implémentation.

Actions concrètes :
1. **Décision à prendre (demander à l'utilisateur)** : le site est-il light-first (fond blanc dominant, sections noires alternées) ou dark-first (fond noir dominant, sections blanches comme respiration) ? La V2 implémentée est clairement light-first. Le design system documente dark-first. Il faut choisir et aligner.
2. **Si light-first confirmé** : mettre à jour `design-tokens.json` — `surface.base` = `#ffffff`, `surface.dark` = `#000000`. Mettre à jour `design-system.md` section 1.1 et 1.4 pour refléter la réalité.
3. **Si dark-first souhaité** : révision plus profonde du code — inverser les sections en priorité dark.

**Complexité :** faible pour la mise à jour de documentation, moyenne pour un basculement dark-first.

---

### P4 — Ajouter des animations d'entrée au scroll (impact : élevé)

**Problème résolu :** le sentiment de site statique.

Actions concrètes :
1. Implémentation recommandée : `framer-motion` avec `whileInView` sur les sections, ou `IntersectionObserver` natif avec des classes CSS `animate-fadeInUp`.
2. Priorité d'animation : métriques homepage (les chiffres "<24h", "∞", "100%", "6" pourraient compter depuis 0), proof cards (entrée en stagger), case study cards.
3. Compteur animé pour les stats : un chiffre qui défile de 0 à la valeur finale quand il entre dans le viewport est un classique qui reste efficace pour des valeurs numériques fortes.
4. Transition de page entre routes Next.js : `<AnimatePresence>` de Framer Motion pour une continuité fluide.

**Complexité :** faible à moyenne (ajout de librairie + application sur composants existants).

---

### P5 — Remplacer les client logos texte par des SVG réels (impact : élevé)

**Problème résolu :** la perte de valeur de signal des logos reconnus.

Actions concrètes :
1. Créer `src/components/home/client-logos.tsx` avec les vraies images SVG pour TikTok, Sony, GEODIS, Adidas, L'Oréal, PICO. Les SVG de marques connues sont tous disponibles en open-source (Simpleicons, SVGRepo).
2. Traitement recommandé light-first : logos en `filter: grayscale(100%)` par défaut, passage en couleur au hover. C'est la norme Superside, Toptal, et autres agences premium.
3. Desktop : grille statique centrée. Mobile : marquee continu (déjà implémenté, juste à brancher sur les vraies images).
4. Ajouter un label au-dessus : "Trusted by" en `text-xs uppercase tracking-widest text-neutral-400`.

**Complexité :** faible (recherche + intégration SVG).

---

### P6 — Corriger le contraste cerulean dans la table pricing (impact : moyen / accessibilité)

**Problème résolu :** WCAG AA fail sur les données de prix.

Action concrète : dans `pricing/page.tsx`, ligne 159, remplacer `text-brand-cerulean` par `text-brand-cerulean-dark` (#0888ba sur #f5f5f5 = environ 4.6:1, PASS) ou passer en `font-bold` pour bénéficier du seuil 3:1 des grands textes UI.

**Complexité :** triviale (changement de classe CSS).

---

### P7 — Enrichir la typographie : introduire des traitements Medium (500) et des variations structurelles (impact : moyen)

**Problème résolu :** la monotonie typographique sur les pages longues.

Actions concrètes :
1. Utiliser `font-medium` (500) pour les éléments intermédiaires : sous-titres de section, labels de méta-données, descriptions de cards.
2. Introduire une ligne décorative (border-left 3px flame) sur les blocs de citation ou les statistiques clés dans les pages About et Case Studies.
3. Sur les headers de section h2, considérer un traitement en deux lignes avec break manuel et taille différente entre ligne 1 et ligne 2 (technique typographique courante dans les agences créatives).

**Complexité :** faible (ajout de classes Tailwind ciblées).

---

### P8 — Page About : ajouter une représentation visuelle de l'équipe internationale (impact : moyen)

**Problème résolu :** l'absence de preuve humaine sur une page qui parle d'une équipe de 35 experts.

Actions concrètes :
1. Une carte du monde SVG simple avec des dots positionnés sur les 5 continents (couleurs brand) aurait plus d'impact qu'un paragraphe texte sur "35 in-house experts across 5 continents".
2. Alternativement : une grille de photos d'équipe (même anonymisées/stylisées) transmet de l'authenticité.
3. Les sections texte longues peuvent être interrompues par des "pull quotes" visuellement traités (grande taille, couleur accent) pour créer du rythme.

**Complexité :** faible à moyenne.

---

## 5. Analyse page par page

### Homepage (`page.tsx`)

**Note : 5/10**

Structure en 6 sections alternées blanc/noir : bien conçue en rythme. La section "Our metrics" sur fond noir avec les chiffres blancs est le moment le plus fort de la page. La section footer CTA noir avec "The creative agency enterprises call when every other agency says two weeks" est une copy exceptionnelle qui mérite un traitement typographique plus ambitieux (taille plus grande, mot clé en accent couleur).

Faiblesses majeures :
- Héro sans visuel créatif (voir P1, P2)
- Client logos en texte gris (voir P5)
- `ServicesList` : les services en bold noir séparés par des points flame est une bonne idée mais l'exécution est plate — pas de hiérarchie entre les services, pas d'indication cliquable, pas de visual interest.
- Section "What we do" : h2 "What we do" est trop générique pour une agence qui se différencie. Alternative : "8 disciplines, one team, no waiting."

---

### Work / Case Studies listing (`work/page.tsx`)

**Note : 3/10**

La grille de cards texte sans visuels est le point le plus faible du site. Pour une agence créative, c'est une erreur stratégique grave. Le titre "Case Studies" est descriptif mais pas commercial — manque de hook.

Points positifs : le copy des descriptions est précis et factuel ("Real briefs. Real deadlines. Real results."). Le grid responsive `sm:grid-cols-2 lg:grid-cols-3` est correct.

---

### Case Study page (`case-studies/[slug]/page.tsx`)

**Note : 3.5/10**

La structure narrative est bonne : hero > image > brief + sidebar > results > gallery > CTA > related. La sidebar sticky "At a Glance" est une excellente décision UX/design. Les StatCards avec valeurs en `brand-flame` créent un moment visuel fort.

Mais les trois placeholders `bg-surface-elevated` (héro image, deux galeries) font du site un wireframe interactif, pas un portfolio d'agence créative. C'est la priorité absolue.

La metadata strip (Deliverable / Timeline / Volume) est bien exécutée : `text-xs uppercase tracking-wider` pour les labels, `font-medium text-brand-black` pour les valeurs — exactement la bonne hiérarchie.

---

### About (`about/page.tsx`)

**Note : 4.5/10**

La copy est excellente — c'est le meilleur texte du site. "The traditional agency model was broken before anyone admitted it." est une ouverture forte. Mais le design ne met pas en valeur ce texte. Mur de paragraphes sans rupture visuelle.

Le bloc "Our team" sur fond noir avec les stats en lemon (35, 5, 18) est le point fort. Il devrait être étendu et visuellement enrichi (carte, photos, témoignages).

La section "What we believe" avec "We say: tomorrow." en finale est un excellent moment d'éditoriale — mais il mériterait un traitement typographique exceptionnel, pas juste `font-semibold text-brand-black`.

---

### Pricing (`pricing/page.tsx`)

**Note : 5/10**

Le choix d'afficher les prix publics est courageux et différenciant — c'est une décision stratégique forte qui est bien servie visuellement. La structure des `PricingCard` avec liste price/item est propre et lisible.

La barre de garantie ("Not satisfied with your first project? No invoice.") entre le hero et la grille est un excellent dispositif de réassurance — bien positionnée.

Le tableau de comparaison a le problème de contraste signalé (P6). L'en-tête cerulean de la colonne Sarani est visuellement juste mais crée une inconsistance : le cerulean est défini comme couleur "Trust & Information" dans le design system, pas comme couleur primaire de marque — c'est le lemon qui devrait highlighter Sarani.

---

### Contact (`contact/page.tsx` + `contact-form.tsx`)

**Note : 6/10**

La page la plus fonctionnellement solide du site. Le form est exemplaire en termes d'accessibilité, de validation et d'analytics. Le copy "Tell us what you need. We'll get back to you within the hour." est direct et confiant.

Piste d'amélioration design : la page est très austère. Pour une page qui est le point de conversion principal, ajouter des éléments de réassurance visuels à droite (témoignages clients, logo clients, réponse typique, photo de l'équipe qui répond) créerait une expérience plus rassurante pour Sophie.

Le placeholder du champ message `"We need 50 banners in 3 languages by Friday..."` est une excellente micro-copy qui illustre exactement le persona cible.

---

## 6. Verdict final

### La vérité directe

Sarani a un **bon site fonctionnel** et un **design system techniquement solide**. Ce n'est pas suffisant pour une agence qui prétend à "Unlimited Creativity" et sert TikTok, Sony et L'Oréal.

La note de 5.5/10 reflète une réalité : le site est en avance sur la majorité des PME françaises, mais en retard de 3 ans sur les agences créatives internationales de référence. Comparé à Superside (vidéo background, assets réels, animations), à Pentagram (gallery interactive, fullbleed imagery, typographie expressive), ou à Collins (identité visuelle forte, mise en scène systématique du travail), Sarani ressemble à un site de template bien customisé.

**Le problème principal n'est pas le code, c'est l'absence de preuve créative.** Vous pouvez avoir le design system le plus propre du monde — si le site n'a pas d'images de travail réel, Sophie partira en 10 secondes. Elle évalue votre capacité à produire du visuel de qualité. Elle a besoin de voir des bannières Sony, des slides GEODIS, des vidéos TikTok. Elle ne les voit pas.

### Ce qu'il faudrait pour atteindre 8/10

1. Visuels de travail sur chaque case study et dans le héro (P1) — non négociable
2. Héro redesigné avec typographie émotionnelle et layout asymétrique (P2)
3. Animations d'entrée au scroll sur les métriques et les cards (P4)
4. Vrais logos SVG clients (P5)

Ces 4 actions sont suffisantes pour passer de 5.5 à 8+. Le reste (P3, P6, P7, P8) améliorerait la note marginalement.

### Ce qu'il ne faut pas changer

- La copy. Le texte du site est excellent — précis, confiant, différenciant. "The creative agency enterprises call when every other agency says two weeks." est une headline d'agence premium. Ne pas toucher.
- La structure du design system. Les tokens, l'échelle typographique, le composant Button, la palette à 3 accents — c'est solide. Construire dessus, pas refondre.
- La page de pricing avec les prix publics. C'est un choix stratégique fort. Ne pas abandonner.
- Le formulaire de contact. Meilleur composant technique du site.

### Score final par rapport aux benchmarks

| Benchmark | Score estimé | Sarani V2 |
|-----------|-------------|-----------|
| Pentagram (wearecollins.com) | 9.5/10 | Site de référence créative mondiale |
| Superside (superside.com) | 8.5/10 | Meilleur site de la catégorie agence scale |
| Collins (wearecollins.com) | 9/10 | Expression de marque exceptionnelle |
| **Sarani V2 actuel** | **5.5/10** | Bon fondational, manque de créativité visible |
| **Sarani V2 + P1-P4** | **~8/10** | Niveau compétitif international |

---

## 7. Hypothèses à valider

Les points suivants ne peuvent pas être tranchés sur la base du code seul — ils nécessitent une décision du client ou des assets manquants.

| # | Hypothèse / Décision nécessaire | Qui décide | Impact |
|---|--------------------------------|------------|--------|
| H1 | Le site est-il **light-first** (fond blanc dominant) ou **dark-first** (fond noir dominant) ? Le code dit light-first, le design system dit dark-first. | Client + @fullstack | Élevé — aligne la documentation et l'implémentation |
| H2 | Les assets visuels des case studies (images des livrables Sony, GEODIS, TikTok) **existent-ils** et sont-ils autorisés à la publication ? | Client | Critique — bloque P1 et P3 |
| H3 | La page Contact doit-elle rester minimaliste ou intégrer des éléments de réassurance visuels (sidebar) ? | Client + @ux | Moyen — impacte le taux de complétion du form |
| H4 | La police Outfit est-elle un choix définitif ou peut-on explorer une seconde police pour les headings display (plus expressive) ? | Client + @design | Moyen — impacte l'identité visuelle globale |
| H5 | Les logos clients (TikTok, Sony, etc.) peuvent-ils être utilisés dans la section client logos ? Certains clients ont des restrictions sur l'usage de leur logo par leurs partenaires. | Client + @legal | Élevé si restriction — affecte la crédibilité |

---

**Handoff → @fullstack**

- Fichiers produits : `/home/user/Sarani/docs/reviews/design-audit-v2.md`
- Décisions à prendre en priorité :
  - H1 (light-first vs dark-first) — aligner design-tokens.json avec globals.css
  - H2 (assets visuels) — toutes les corrections P1 sont bloquées sans images
- Corrections techniques immédiates (non bloquées par H1-H5) :
  - P6 : corriger contraste cerulean dans pricing table (`text-brand-cerulean` → `text-brand-cerulean-dark` ou `font-bold`)
  - P5 : remplacer les spans texte des client logos par des SVG (Simpleicons)
  - P7 : introduire `font-medium` sur les sous-titres et labels intermédiaires
- Points d'attention :
  - Les trois placeholders `bg-surface-elevated` dans `case-studies/[slug]/page.tsx` (lignes 119, 198-200) sont des wireframes visibles en production — priorité de livraison
  - Le design system existant (`design-tokens.json` + `design-system.md`) doit être mis à jour pour refléter la réalité light-first une fois H1 tranché
  - Si Framer Motion est ajouté pour P4, anticiper l'impact sur le bundle size (librairie ~40kB gzip)
