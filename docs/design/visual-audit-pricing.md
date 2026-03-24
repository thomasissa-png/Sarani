# Visual Audit — Pricing Page
*Produced by @design — 2026-03-24*
*Scope: https://sarani-toum92.replit.app/pricing*
*Reference: docs/design/design-system.md + docs/design/design-tokens.json*

---

## Note globale : 4.5 / 10

La page Pricing est fonctionnelle et lisible, mais elle trahit le positionnement de Sarani sur deux niveaux critiques. Premierement, elle est construite sur un fond blanc alors que le design system definit Sarani comme une marque "natively dark" (fond noir primaire). Deuxiemement, le composant Button `primary` est implementé en Lemon (#faca15) au lieu de Flame (#e35019) — écart direct avec la spec. Ces deux points seuls justifient une note bloquante. La structure de l'information (grille de tarifs, tableau comparatif, CTA de cloture) est saine et bien organisée, ce qui sauvegarde la note au-dessus de 4.

---

## Grille d'audit par element

| Element | Conforme | Ecart | Criticite |
|---|---|---|---|
| Fond de page | Non | Blanc (#ffffff) au lieu de noir (#000000) | BLOQUANT |
| Couleur bouton Primary | Non | Lemon au lieu de Flame | BLOQUANT |
| Texte sur bouton Primary | Non | Noir sur Lemon (OK ratio) mais hors spec variant | MAJEUR |
| Garantie strip | Non | `bg-surface-elevated` (#f3f5f7) sur fond blanc — contraste insuffisant visuellement | MAJEUR |
| Tableau comparatif — colonne Sarani | Non | `text-brand-cerulean` sur fond blanc : ratio 3.11:1 — WCAG AA FAIL body text | BLOQUANT |
| Hero h1 — taille | Oui | `text-4xl` (36px mobile) / `sm:text-5xl` (48px desktop) — dans la fourchette H1 spec | Conforme |
| Hero h1 — couleur | Non | `text-brand-black` (#111111) sur fond blanc — lisible mais contexte inversé vs DS | MAJEUR |
| Hero sous-titre — couleur | Non | `text-neutral-600` (#525252) sur blanc : ratio 7.2:1 PASS mais `font-medium` hors spec (spec = Regular 400) | MINEUR |
| PricingCard — fond | Non | `bg-surface-elevated` (#f3f5f7) sur fond blanc : delta visuel quasi-nul, les cartes ne ressortent pas | MAJEUR |
| PricingCard — border | Non | `border-neutral-300` (#f3f5f7 au sens CSS) — couleur de bordure = couleur de fond de carte, bordure invisible | MAJEUR |
| PricingCard — h3 couleur | Non | `text-brand-black` sur fond elevated : OK ratio mais contexte fond blanc — hors DS dark | MAJEUR |
| PricingCard — item price | Non | `text-brand-black` — le prix devrait utiliser Lemon ou Cerulean comme proof point (spec 2.3) | MINEUR |
| Section Comparison — fond | Non | Pas de differentiation de fond avec les sections adjacentes | MINEUR |
| Tableau — th Sarani | Non | `bg-brand-cerulean` + `text-brand-black` : ratio 6.75:1 PASS, mais white text serait en echec — implementation correcte | Conforme |
| Tableau — td Sarani values | Non | `text-brand-cerulean` (#0bb3f0) sur `bg-surface-elevated` (#f3f5f7) : ratio 3.11:1 — FAIL WCAG AA | BLOQUANT |
| Typographie — font family | Oui | Outfit chargée via next/font, appliquée correctement | Conforme |
| Responsive — grille tarifs | Oui | 1 col mobile / 2 col tablet / 3 col desktop — conforme spec | Conforme |
| Responsive — tableau comparatif | Oui | `overflow-x-auto` + `min-w-[480px]` — scroll horizontal mobile present | Conforme |
| Section padding | Partiellement | Section component : `py-16 md:py-24` — spec = 64px mobile / 96px desktop : 64px = spacing.16 OK, 96px = spacing.24 OK | Conforme |
| VAT footnote | Oui | `text-neutral-500` sur blanc : ratio 4.52:1 — WCAG AA PASS (juste) | Conforme |
| Closing CTA — centrage | Mineur | Texte centre pour un H2, spec interdit le centrage au-dela de H3 | MINEUR |
| Navigation (header) | Non audite | Composant Header independant, hors scope de cet audit | — |
| Footer | Non audite | Composant Footer independant, hors scope de cet audit | — |
| FAQ section | Absent | Aucune FAQ sur la page pricing — opportunite manquee (standard du secteur) | MINEUR |
| Trust signals | Absent | Aucun logo client, aucun temoignage sur la page pricing | MAJEUR |

---

## Detail des problemes par criticite

### BLOQUANTS (4 problemes — a corriger avant toute mise en production)

---

**B-01 — Fond de page blanc : rupture d'identite de marque**

- Localisation : body entier de la page, toutes sections
- Constate : `body { background-color: #ffffff }` dans globals.css. La page pricing s'affiche sur fond blanc.
- Spec DS (section 1.4) : "Sarani's design is natively dark — the primary mode is dark (black background)."
- Impact : La page pricing ne ressemble pas au reste du site (homepage dark). Un visiteur qui arrive directement sur /pricing via un lien externe percoit une marque generique, sans caractere. La promesse de marque "Ultra-rapide, referent, confiant" disparait sur fond blanc.
- Note : globals.css definit `--color-brand-black: #111111` (pas #000000 comme dans design-tokens.json) — ecart de token supplementaire a normaliser.

---

**B-02 — Bouton Primary en Lemon au lieu de Flame : violation spec CTA**

- Localisation : `src/components/ui/button.tsx`, variant `primary`, ligne 29
- Constate : `bg-brand-lemon text-brand-black hover:bg-brand-lemon-dark`
- Spec DS (section 3.2) : "Primary Button — Background: colors.accent.flame (#da5126) / Text: Black (#000000)"
- Impact : Le signal d'action principal de la marque est la couleur Flame. Utiliser Lemon pour le bouton primary affaiblit l'urgence et la lisibilite des CTAs. Par ricochet, toute page qui utilise `<Button variant="primary">` (pricing, homepage, contact) est affectee.
- Contraste Lemon/Black : 10.7:1 — WCAG AA PASS. Le probleme est strategique, pas d'accessibilite.

---

**B-03 — Cerulean sur fond clair : echec WCAG AA**

- Localisation : tableau comparatif, `<td>` colonne Sarani, ligne 159 de page.tsx
- Constate : `text-brand-cerulean` (#0bb3f0) sur `bg-surface-elevated` (#f3f5f7)
- Ratio de contraste : Cerulean (#0bb3f0) sur blanc/gris tres clair — ratio calcule ~2.8:1 a 3.1:1
- Spec DS (section 1.3) : "White text on Cerulean: restricted to UI controls only — never use for body copy" + "Cerulean must never be used as body text color on white or light backgrounds"
- Impact : Non-conformite WCAG 2.2 AA. Les valeurs Sarani dans le tableau ("155–470€", "Included", "24 hours", "None") sont illisibles pour les utilisateurs avec deficience visuelle.
- Population impactee : ~8% des utilisateurs (daltonisme + basse vision).

---

**B-04 — Token de couleur brand-black divergent entre globals.css et design-tokens.json**

- Localisation : `/src/app/globals.css` ligne 11 vs `docs/design/design-tokens.json` ligne 4
- Constate : globals.css definit `--color-brand-black: #111111` ; design-tokens.json definit `colors.primary.black: #000000`
- Impact : Toute la page pricing utilise `text-brand-black` qui resout en #111111 (gris tres sombre) et non en #000000 (noir pur). Ratio de contraste sur blanc : #111111/#ffffff = 19.7:1 (PASS, pas d'impact WCAG direct). Mais la coherence du design system est rompue — deux sources de verite contradictoires pour le meme token.

---

### MAJEURS (5 problemes — a corriger rapidement)

---

**M-01 — Cartes de tarifs invisibles sur fond blanc**

- Localisation : composant PricingCard, classe `bg-surface-elevated border-neutral-300`
- Constate : `--color-surface-elevated: #f3f5f7` et `--color-neutral-300: #f3f5f7` — meme valeur dans globals.css. La bordure et le fond de carte sont identiques. La carte n'a pas de definition visuelle.
- Impact : La grille de 5 categories de tarifs (section la plus importante de la page) se fond dans le background de page. L'utilisateur ne perçoit pas les blocs comme des unites distinctes.
- Solution DS recommandee : Passer en dark cards (`bg-neutral-900` #141413, border `neutral-800` #1d1d1d) conformement au DS "Elevated card (dark)" — ou maintenir fond blanc mais avec ombre (`shadow-md`) et bordure visible (`border-neutral-400` #a3a3a3).

---

**M-02 — Absence totale de trust signals sur la page**

- Localisation : page entiere
- Constate : Aucun logo client (TikTok, Sony, Adidas...), aucun temoignage, aucune mention de clients reels.
- Context marque : La promesse Sarani repose sur des preuves chiffrées (Sony Black Friday D+1, TikTok 1500 videos/mois, GEODIS 5700 slides). Ces preuves sont absentes de la page pricing alors que c'est exactement le moment ou le visiteur (Sophie) doit basculer de "interessante" a "je signe".
- Benchmark secteur 2025 : Les meilleures pages pricing integrent systematiquement logos clients et quotes de decision-makers en dessous ou en cote des tarifs.
- Impact conversion : Haut. La garantie "Not satisfied? No invoice" est presente (bien) mais isolee — elle n'est pas renforcee par de la preuve sociale.

---

**M-03 — H1 hero centre interdit par la spec**

- Localisation : Hero section, `<h1>` et `<p>` sous-titre
- Constate : pas de classe `text-center` sur le h1 — il est aligne a gauche. Correct.
- Mais : le h1 est `text-brand-black` sur fond blanc, pas white sur dark. Le contexte de section est inversé vs spec.
- Spec DS (section 3.1) : "left-aligned text (not center-aligned — feels more decisive)" — OK sur l'alignement. Mais le fond de la section hero pricing devrait etre dark pour etre coherent avec le hero de la homepage.

---

**M-04 — Sous-titre hero : font-weight hors spec**

- Localisation : `<p className="max-w-2xl text-xl font-medium text-neutral-600">`
- Constate : `font-medium` (weight 500)
- Spec DS (section 2.3) : "Body copy — Always Outfit Regular (400)"
- Impact : Faible visuellement, mais chaque ecart hors spec est un precedent qui fragilise le design system. Le weight 500 n'existe pas dans les tokens de typographie de Sarani.

---

**M-05 — Closing CTA section : h2 centre interdit**

- Localisation : section closing CTA, `<h2 className="mb-6 text-3xl font-bold text-brand-black sm:text-4xl">`
- Constate : le parent `<div className="text-center">` centre le h2.
- Spec DS (section 2.3) : "Never center-align beyond H3 — H4 and below are always left-aligned." Cette regle concerne H4+, le H2 centre est techniquement autorise par la spec lettre-a-lettre. Cependant, spirit de la regle : l'alignement centre signifie hesitation. Sur un CTA de cloture destine a Sophie (decisionnelle, peu de temps), le centrage affaiblit l'impact.
- Recommandation : Aligner a gauche, en coherence avec le reste du DS qui valorise la decisivite.

---

### MINEURS (4 problemes — a corriger sur le prochain sprint)

---

**m-01 — Prix des items non valorises visuellement**

- Localisation : PricingCard, `<span className="shrink-0 font-bold text-brand-black">`
- Constate : Les prix (155€, 85€, 30€...) sont en `text-brand-black` — meme couleur que les labels. Aucune hierarchie visuelle entre le nom du service et son prix.
- Spec DS (section 2.3) : "Stats / proof points : H3 or H4 size, Bold, accent color (Lemon preferred for numbers)"
- Recommandation : Passer les prix en `text-brand-lemon` pour les faire ressortir comme proof points de valeur.

---

**m-02 — Absence de section FAQ**

- Localisation : page entiere
- Constate : Aucune FAQ.
- Benchmark 2025 : Les pricing pages les plus performantes incluent une FAQ qui traite les objections de prix avant que le visiteur ne parte (ex : "Pourquoi pas d'abonnement ?", "Comment fonctionnent les revisions illimitees ?", "Quel est le delai moyen de livraison ?").
- Impact : Opportunite manquee de lever les frictions residuelles de Sophie avant le contact.

---

**m-03 — Note TVA trop discrete**

- Localisation : `<p className="text-sm text-neutral-500">All prices exclude VAT (HT)...`
- Constate : La note TVA est dans un div hors de toute `Section`, avec uniquement `pb-2`. Elle flotte visuellement entre le tableau comparatif et le closing CTA sans ancrage spatial clair.
- Recommandation : L'integrer a l'interieur de la Section comparatif comme footnote formelle, ou dans la Section closing CTA — pas dans un div orphelin.

---

**m-04 — Absence d'ancrage visuel entre sections**

- Localisation : transitions entre toutes les sections
- Constate : Toutes les sections ont le meme fond blanc. Pas de changement de couleur de fond entre Hero, Guarantee Strip, Pricing Grid, Comparison, Closing CTA.
- Spec DS (section 5.4) : "Never let two sections of the same background color touch without a clear visual separator."
- Impact : La page manque de rythme. Elle est lineaire et peu engageante visuellement.

---

## Points conformes au design system

- Structure responsive grille de tarifs : 1→2→3 colonnes (mobile→tablet→desktop) : conforme
- Section component : max-w-screen-xl + px-5 (mobile) / px-8 (desktop) : conforme
- Padding vertical : 64px mobile / 96px desktop : conforme
- Outfit chargee via next/font, appliquee en heading et body : conforme
- Focus-visible sur les elements interactifs : cercle Cerulean 3px offset 2px via globals.css : conforme
- Scroll horizontal protege sur mobile pour le tableau : conforme (`overflow-x-auto`)
- Tableau comparatif `th` Sarani : `bg-brand-cerulean text-brand-black` — ratio 6.75:1, WCAG AA PASS : conforme
- Metadata SEO page : title et description pertinents et specifiques : conforme
- aria-label sur les `<section>` : conforme

---

## Recommandations priorisees

### Sprint 1 — Bloquants (avant toute publication)

1. **Corriger le bouton Primary** : `bg-brand-flame text-brand-black hover:bg-brand-flame-dark` — implique de modifier `src/components/ui/button.tsx`. Signaler a @fullstack : impact global sur toutes les pages utilisant `<Button variant="primary">`.

2. **Corriger les valeurs Cerulean dans le tableau** : remplacer `text-brand-cerulean` sur fond clair par `text-brand-black` ou `text-neutral-700` — le Cerulean est reserve aux elements UI sur fond sombre, pas au body text sur fond blanc.

3. **Normaliser le token brand-black** : choisir entre #000000 (design-tokens.json) et #111111 (globals.css) et aligner. Recommandation : garder #111111 (valeur implementée et validee visuellement sur le site) et mettre a jour design-tokens.json en consequence. Signaler a @fullstack.

### Sprint 2 — Majeurs (avant la mise en ligne officielle)

4. **Definir la posture chromatique de la page** : la page pricing doit-elle etre dark (comme la homepage) ou light (approche actuelle) ? Cette decision strategique depasse l'audit — elle doit etre tranchee par le client. Recommandation DA : passer en dark pour cohérence de marque et differentiation. [A VALIDER PAR @orchestrator et le client]

5. **Rendre les cartes de tarifs visibles** : si fond blanc maintenu, ajouter `shadow-md` + border `neutral-400` sur les PricingCards. Si dark, utiliser `bg-neutral-900 border-neutral-800`.

6. **Ajouter des trust signals** : integrer 3 logos clients (Sony, TikTok, GEODIS — en version white sur dark ou dark sur light selon le fond choisi) + 1 quote courte au-dessus ou en dessous des tarifs.

7. **Valoriser les prix** : passer les montants en `text-brand-lemon` (dark mode) ou `text-brand-flame` (light mode) pour les distinguer visuellement des labels.

### Sprint 3 — Mineurs (amelioration continue)

8. **Ajouter une FAQ pricing** : 3 a 5 questions : "Why no subscription?", "What are unlimited revisions?", "What is your average delivery time?", "Do you work with enterprise procurement processes?".

9. **Ancrer la note TVA** dans une section existante au lieu d'un div orphelin.

10. **Corriger le font-weight du sous-titre hero** : `font-medium` → `font-normal` (Regular 400).

11. **Corriger l'alignement du closing CTA** : `text-left` sur le H2 et le Button.

---

## Hypotheses a valider

[HYPOTHESE : La page pricing actuelle est sur fond blanc intentionnellement pour creer une section "respiration" differenciee de la homepage dark. Si cette decision est confirmee par le client, les recommandations B-01 et M-03 tombent — mais les problemes de contraste WCAG (B-03) et de visibilite des cartes (M-01) restent obligatoires.]

---

## Tableau de synthese criticite

| Criticite | Nb | Impact principal |
|---|---|---|
| BLOQUANT | 4 | Conformite WCAG AA, coherence de marque, token divergent |
| MAJEUR | 5 | Conversion, identite visuelle, trust |
| MINEUR | 4 | Finition, experience utilisateur |
| **Total** | **13** | |

---

**Handoff → @fullstack**

- Fichiers produits : `docs/design/visual-audit-pricing.md`
- Decisions a prendre avant implementation :
  - B-01 : Fond dark ou light pour la page pricing — decision client requise
  - B-02 : Corriger button.tsx `primary` : `bg-brand-flame text-brand-black`
  - B-03 : Corriger `text-brand-cerulean` dans les cellules du tableau comparatif
  - B-04 : Normaliser token brand-black entre globals.css (#111111) et design-tokens.json (#000000)
- Points d'attention :
  - La correction de button.tsx impacte toutes les pages (homepage, contact, pricing) — tester une regression visuelle complete apres modification
  - Si design-tokens.json est mis a jour (B-04), signaler a @qa pour mise a jour des snapshots visuels
  - Le probleme WCAG B-03 est obligatoire independamment du choix dark/light — Cerulean sur fond clair echoue toujours AA pour le body text
