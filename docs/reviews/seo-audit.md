# SEO Audit — Sarani Studio
> Agent @seo — 2026-03-24

---

## Note globale : 7.2 / 10

Site Next.js bien structuré avec une base SEO technique solide. Les fondamentaux sont en place (metadata, sitemap, robots, JSON-LD Organization). Les lacunes principales concernent le contenu indexable (composants client-side), l'absence de pages cluster/blog, et l'internationalisation non implémentée pour un acteur qui cible 18 langues.

---

## 1. Metadonnees — 8 / 10

**Points forts**
- Title avec template `%s | Sarani` correctement configuré dans layout.tsx — cohérence garantie sur toutes les pages.
- Description principale dense et différenciante : cite les clients (TikTok, Sony, Adidas), la promesse (D+1, fixed pricing), et les preuves sociales (35 experts, 5 continents, 18 langues).

**Points faibles**
- OpenGraph ne déclare pas `url` explicitement — risque de duplication sur le partage social.
- Twitter card sans `creator` tag — manque de signal d'autorité pour le compte @saranistudio.

**Recommandations**
- Ajouter `url: "https://sarani.studio"` dans le bloc `openGraph` du layout.
- Ajouter `creator: "@saranistudio"` dans le bloc `twitter` du layout.

---

## 2. Architecture technique (URLs / Sitemap / Robots) — 8.5 / 10

**Points forts**
- Sitemap.ts typé MetadataRoute.Sitemap avec priorités cohérentes (homepage 1.0, /work 0.9, /contact 0.9) et changeFrequency correctement différenciée par type de page.
- Robots.ts minimal et correct : allow `/`, disallow `/api/`, sitemap déclaré — zéro sur-blocage.

**Points faibles**
- `lastModified: new Date()` génère une date dynamique à chaque build — Google peut interpréter toutes les pages comme modifiées à chaque déploiement, ce qui dilue le signal de fraîcheur.
- Les case studies sont dans le sitemap mais sans vérification que leurs routes existent réellement dans `src/app/case-studies/` — risque de 404 indexés.

**Recommandations**
- Remplacer `new Date()` par des dates statiques (ou des dates issues d'un CMS/fichier de données) pour chaque URL dans sitemap.ts.
- Vérifier l'existence des routes `/case-studies/tiktok-video-production`, `/case-studies/sony-banner-production`, `/case-studies/geodis-presentation-rebranding` avant le lancement.

---

## 3. Performance technique — 6.5 / 10

**Points forts**
- Police locale (Outfit via localFont) avec `display: "swap"` — pas de render-blocking, LCP non pénalisé par le chargement de font.
- Next.js SSR/SSG natif : HTML pré-rendu côté serveur, crawlable par Googlebot sans JS.

**Points faibles**
- Composants préfixés `Animated` (AnimatedHeroDots, AnimatedHeroContent, AnimatedMetrics, AnimatedServicesList) sont vraisemblablement des Client Components — si le contenu texte critique (H1, valeur différenciante) est rendu uniquement côté client, le LCP et l'indexation en souffrent.
- Aucune config `next/image` visible dans les imports page.tsx — le ProjectSlider charge probablement des images sans optimisation automatique Next.js.

**Recommandations**
- Auditer AnimatedHeroContent : si le H1 est à l'intérieur, le déplacer dans un composant Server Component statique et ne garder que l'animation en Client Component (pattern : server shell + client wrapper).
- Vérifier que toutes les images du ProjectSlider utilisent `next/image` avec `priority` sur l'image above-the-fold.

---

## 4. Contenu & Mots-cles — 6 / 10

**Points forts**
- Homepage couvre les intentions commerciales clés : "enterprise creative agency", "D+1 delivery", "unlimited revisions", "fixed pricing" — aligné sur les requêtes head de la cible B2B.
- Les case studies (TikTok, Sony, GEODIS) apportent une preuve concrète et des mots-clés longue traîne naturels ("video production agency", "banner production", "presentation rebranding").

**Points faibles**
- Aucun blog / ressources / insights détectés dans la structure — zéro contenu informationnel pour capturer le trafic top-of-funnel ("how to brief a creative agency", "creative agency for enterprise").
- Les sections hero et "We are Sarani" sont largement animées côté client — le texte indexé par Google est probablement minimal sur ces sections critiques.

**Recommandations**
- Créer une section blog ou "Resources" avec 6-8 articles piliers ciblant les intentions informationnelles : "enterprise creative agency vs in-house team", "how to brief a creative agency at scale", "D+1 creative production guide".
- S'assurer que le H1 de chaque page est un Server Component avec le mot-clé principal visible sans JS.

---

## 5. Maillage interne — 5.5 / 10

**Points forts**
- Navigation Header + Footer présente sur toutes les pages via layout.tsx — base de maillage fonctionnelle.
- Les case studies sont linkés depuis le sitemap et vraisemblablement depuis /work — chaîne logique.

**Points faibles**
- Aucun cocon sémantique visible : pas de pages clusters autour de services spécifiques ("video production", "banner design", "presentation design") qui renforceraient l'autorité thématique de la page pilier /work.
- Les case studies ne semblent pas s'entrelinkier entre eux ni pointer vers /pricing ou /contact — perte de conversion et de jus SEO.

**Recommandations**
- Créer des pages services individuelles (/services/video-production, /services/banner-design, /services/presentation-design) linkées depuis /work et depuis les case studies correspondants.
- Ajouter des CTAs de maillage interne dans chaque case study : lien vers la page service associée + lien vers /pricing + lien vers /contact.

---

## 6. Mobile-first — 7.5 / 10

**Points forts**
- Tailwind CSS avec breakpoints mobile-first (`md:text-5xl` visible dans page.tsx) — responsive natif.
- `min-h-dvh` utilisé pour le hero — gestion correcte de la hauteur sur mobile avec barre d'adresse variable.

**Points faibles**
- Le ProjectSlider (slider horizontal auto-scrolling) peut générer du CLS sur mobile si les dimensions image ne sont pas définies statiquement.
- Aucune mention de tests sur des viewports spécifiques dans le code visible — risque de régression mobile non détectée.

**Recommandations**
- Définir `width` et `height` fixes sur toutes les images du ProjectSlider pour éliminer le CLS (Core Web Vital critique pour le ranking mobile).
- Ajouter des tests Playwright sur viewports mobile (375px, 390px) dans la suite QA.

---

## 7. Accessibilite SEO — 7 / 10

**Points forts**
- Skip link "Skip to main content" implementé dans layout.tsx — bonne pratique d'accessibilité qui favorise également la lisibilité par les crawlers.
- `aria-label` sur les sections principales dans page.tsx (`aria-label="Hero"`, `ariaLabel="We are Sarani"`) — structure sémantique correcte.

**Points faibles**
- `lang="en"` hardcodé dans le html root — correct pour la version actuelle mais bloquant pour une internationalisation future sans refactor.
- Les composants animés (Framer Motion ou équivalent) peuvent masquer du contenu temporairement — vérifier que les attributs `aria-hidden` ne cachent pas du contenu SEO critique.

**Recommandations**
- Préparer l'attribut `lang` pour être dynamique dès maintenant : `lang={locale}` via un paramètre layout — facilitera la migration i18n sans casser l'existant.
- Auditer les composants FadeInUp/StaggerChildren pour s'assurer que le contenu est accessible (pas de `visibility: hidden` initial persistant).

---

## 8. Internationalisation — 5 / 10

**Points forts**
- Le JSON-LD Organization déclare `knowsLanguage` avec les 18 langues — signal de pertinence internationale pour les moteurs.
- La `description` metadata mentionne "18 languages" — cohérence du signal multi-langues.

**Points faibles**
- Aucun hreflang implémenté — pour une agence qui opère en 18 langues et cible Paris, Londres, Dubaï, l'absence de versions localisées est un manque stratégique majeur.
- `locale: "en_US"` seul dans OpenGraph — pas de variantes `en_GB` ou `fr_FR` pour les marchés principaux identifiés.

**Recommandations**
- Définir une stratégie i18n prioritaire : au minimum EN + FR (marchés Paris/Londres) avec routes `/en/` et `/fr/` — Next.js App Router supporte nativement l'internationalisation via le dossier `[locale]`.
- Ajouter des balises hreflang auto-référencées dès qu'une deuxième locale est créée, via `generateMetadata` avec `alternates.languages`.

---

## Verdict final

Sarani dispose d'une base technique SEO solide pour un site Next.js greenfield. Les fondamentaux (sitemap, robots, JSON-LD, metadata template) sont correctement implémentés. Les trois chantiers prioritaires pour progresser :

1. **Contenu indexable** (priorité haute) : s'assurer que le contenu des composants animés est rendu server-side, et créer un minimum de contenu informationnel (blog/resources).
2. **Maillage interne** (priorité haute) : créer des pages services individuelles pour former un cocon sémantique autour de /work.
3. **Internationalisation** (priorité moyenne) : implémenter au minimum EN + FR avec hreflang pour capturer les marchés Paris et Londres — c'est un différentiateur stratégique fort pour une agence qui revendique 18 langues.

Avec ces corrections, la note cible est 8.5-9 / 10.

---

**Handoff → @orchestrator**
- Fichiers produits : `docs/reviews/seo-audit.md`
- Decisions prises : audit des 8 criteres SEO, identification des 3 chantiers prioritaires (contenu indexable, maillage interne, i18n EN+FR)
- Points d'attention : les composants "Animated" cote client sont le risque SEO le plus immediat — a verifier avec @fullstack avant lancement. La strategie i18n doit etre arbitree avec @orchestrator (scope, timeline, locales prioritaires).
