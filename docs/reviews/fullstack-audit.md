# Fullstack Code Audit — Sarani

**Agent** : @fullstack
**Date** : 2026-03-24
**Scope** : Codebase `src/` (39 fichiers TS/TSX), Next.js 16 + React 19 + Tailwind 4
**Projet** : Site vitrine international, agence creative Sarani

---

## Note globale : 7.5 / 10

Codebase propre et bien structuree pour un site vitrine. Bonne separation des responsabilites, typage TypeScript solide, accessibilite soignee. Les points de progression sont principalement lies a l'absence de tests, a la gestion d'erreurs limitee et a quelques patterns qui pourraient etre optimises.

---

## 1. Architecture & Structure — 8 / 10

**Points forts**
- Structure de dossiers claire et coherente : `components/ui`, `components/layout`, `components/home`, `components/forms`, `lib/`, `data/`, `app/` avec routes bien decoupees (work, pricing, about, contact, case-studies/[slug], legal).
- Bonne separation Server Components (page.tsx, layout.tsx) vs Client Components (header, button, animations) — le choix est delibere a chaque fichier.

**Points faibles**
- Pas de dossier `hooks/`, `types/`, `actions/` ou `config/` — toute la logique est concentree dans `lib/` (3 fichiers seulement). A mesure que le projet grandit, cela manquera de structure.
- Pas de validation des variables d'environnement au demarrage (pas de `config/env.ts` avec zod). Le fichier `.env.example` n'a pas ete verifie.

**Recommandations**
1. Creer un fichier `src/config/env.ts` qui valide les variables d'environnement avec zod au build time.
2. Extraire les types partages (analytics EventMap, case studies) dans `src/types/` pour une meilleure decouverte.

---

## 2. Qualite TypeScript — 8 / 10

**Points forts**
- Typage strict et expressif dans `analytics.ts` : interface map `EventMap` avec types discrimines par nom d'event, generique `track<T extends EventName>` — excellent pattern.
- Typage polymorphique du `Button` (ButtonAsButton | ButtonAsLink) avec discrimination via `href` — propre et type-safe.

**Points faibles**
- Cast `as unknown as Record<string, string>` dans `track()` (ligne 129 de analytics.ts) — perte de type safety au point d'appel Umami.
- Interfaces `FormViewProperties` et `FormStartProperties` sont vides (extends StandardProperties sans rien ajouter) — signe de sur-ingenierie prematuree.

**Recommandations**
1. Typer le SDK Umami plus precisement ou creer un wrapper qui accepte `Record<string, string | number>` directement pour eviter le double cast.
2. Utiliser des type aliases simples (`type FormViewProperties = StandardProperties`) plutot que des interfaces vides — plus explicite sur l'intention.

---

## 3. Composants React — 7.5 / 10

**Points forts**
- Composants bien decoupes par responsabilite : `ScrollTracker`, `TrackedCta`, `AnimatedHeroDots`, `AnimatedMetrics` — chaque composant a un role unique et clair.
- Bonne accessibilite : `aria-label` sur les sections, `aria-expanded` et `aria-controls` sur le hamburger, `skip-link` dans le layout, `role="list"` sur les navigations.

**Points faibles**
- Le `Button` wrape tout dans `motion.div` meme quand l'animation n'est pas souhaitee — pas de moyen de desactiver l'animation spring. Cela force aussi le `"use client"` sur tous les consumers.
- `page.tsx` (homepage) fait 167 lignes avec 9 sections inline — proche de la limite de lisibilite. Certaines sections pourraient etre extraites en composants.

**Recommandations**
1. Ajouter une prop `animated?: boolean` au Button (default true) pour permettre un rendu statique quand l'animation n'est pas voulue, evitant le surcout de framer-motion.
2. Extraire les sections 4 (metrics) et 9 (footer CTA) qui ont un markup specifique (bg-brand-black) en composants dedies pour garder la homepage sous 120 lignes.

---

## 4. State Management — 7 / 10

**Points forts**
- State local simple et adapte au besoin (useState pour scroll/mobile menu) — pas de sur-ingenierie avec un state manager global pour un site vitrine.
- Effet de scroll avec `{ passive: true }` et cleanup propre du listener — bonne pratique performance.

**Points faibles**
- Manipulation directe du DOM (`document.body.style.overflow = "hidden"`) dans le header pour le lock de scroll — fragile et non-React.
- Pas de gestion d'etat partagee entre composants (ex : si plusieurs composants ont besoin de savoir si le menu est ouvert). Pour l'instant non bloquant, mais limitant.

**Recommandations**
1. Remplacer la manipulation directe de `document.body.style.overflow` par une classe CSS sur le body via un hook dedie `useScrollLock(isLocked)` pour un pattern plus robuste.
2. Si le projet ajoute des fonctionnalites (blog, filtres case studies), envisager Zustand pour l'etat global plutot qu'un prop drilling.

---

## 5. Styling & Tailwind — 8.5 / 10

**Points forts**
- Utilisation coherente de `cn()` (clsx + tailwind-merge) pour la composition conditionnelle de classes — pattern standard bien applique.
- Design tokens bien integres dans les classes Tailwind (`brand-lemon`, `brand-cerulean`, `brand-flame`, `surface-warm`, `surface-elevated`) — alignement avec le design system.

**Points faibles**
- Quelques valeurs magiques en dur : `z-[200]`, `z-[300]`, `h-[72px]`, `pt-[72px]`, `backdrop-blur-[12px]` — devrait etre tokenise.
- Duplication de styles entre le bouton hamburger et le bouton close dans le menu mobile (memes classes, memes SVG en inline).

**Recommandations**
1. Centraliser les z-index et hauteurs fixes dans les CSS custom properties ou les tokens Tailwind (`--header-height`, `--z-header`, `--z-overlay`).
2. Extraire le bouton hamburger/close en composant `MenuToggle` reutilisable avec les SVGs en prop ou en variante.

---

## 6. Performance Code — 7.5 / 10

**Points forts**
- Homepage en Server Component avec des Client Components isoles (animations, tracking) — bon tree-shaking et minimal JS envoye au client.
- Font locale avec `display: "swap"` et chargement des poids necessaires uniquement (400, 500, 700) — pas de flash, pas de surplus.

**Points faibles**
- Framer Motion importe sur chaque composant anime et sur le Button — bundle potentiellement lourd pour un site vitrine. Le package pese ~30KB gzippe.
- `ProjectSlider` est instancie deux fois sur la homepage (hero + section 6) — possible double chargement des memes assets.

**Recommandations**
1. Evaluer le remplacement de framer-motion par des CSS animations natives (keyframes + `@starting-style` en CSS4) pour les animations simples (fade-in, slide-up), et ne garder framer-motion que pour les animations complexes (AnimatePresence, layout animations).
2. Verifier que `ProjectSlider` partage ses donnees entre les deux instances (memoisation ou data prop) plutot que de les fetcher/calculer deux fois.

---

## 7. Gestion d'erreurs — 5.5 / 10

**Points forts**
- `track()` dans analytics.ts echoue silencieusement (try/catch vide) — correct pour un tracker qui ne doit jamais casser l'UI.
- Route API contact (`src/app/api/contact/route.ts`) avec validation zod (`src/lib/validation.ts`) — bonne pratique.

**Points faibles**
- Pas de fichiers `error.tsx` ou `not-found.tsx` visibles dans les routes — les erreurs Next.js affichent le fallback par defaut (mauvaise UX).
- Pas de gestion d'erreur cote composants (pas de Error Boundaries React, pas de gestion des etats d'erreur dans les formulaires au-dela de la validation).

**Recommandations**
1. Creer des fichiers `src/app/error.tsx`, `src/app/not-found.tsx` et `src/app/global-error.tsx` avec un design coherent avec la marque Sarani.
2. Ajouter un Error Boundary generique dans le layout pour capturer les erreurs runtime des Client Components.

---

## 8. Maintenabilite & DX — 7 / 10

**Points forts**
- Commentaires de reference vers les docs (`Source: docs/seo/metadata-templates.md Section 2`, `Source: docs/analytics/tracking-plan.md`) — tracabilite excellente.
- Constantes extraites et typees (`NAV_LINKS as const`, `variantStyles Record<ButtonVariant, string>`) — facile a maintenir et a etendre.

**Points faibles**
- Zero tests : pas de Vitest, pas de Playwright, pas de configuration de test dans package.json. Aucun filet de securite pour les regressions.
- Pas de fichier `.env.example` ni de documentation technique (`docs/dev-decisions.md`) — un nouveau developpeur ne sait pas quelles variables d'environnement configurer.

**Recommandations**
1. Mettre en place Vitest + testing-library pour les composants critiques (Button, Header, formulaire contact) et Playwright pour un smoke test E2E de la homepage.
2. Creer `docs/dev-decisions.md` documentant les choix techniques (pourquoi Next.js 16, pourquoi framer-motion, pourquoi Umami) et `.env.example` avec les variables requises.

---

## Verdict final

Le codebase Sarani est solide pour un site vitrine en phase de lancement : architecture bien pensee, TypeScript expressif, accessibilite soignee, tracking analytics integre des le depart. Les fondations sont saines.

**Priorites d'amelioration** (par impact) :
1. **Gestion d'erreurs** (5.5/10) — ajouter error.tsx, not-found.tsx, Error Boundaries
2. **Tests** — configurer Vitest + Playwright, couvrir les composants critiques
3. **Performance** — auditer le poids de framer-motion, migrer les animations simples vers CSS natif
4. **Documentation** — creer dev-decisions.md, .env.example, config/env.ts

Le projet est pret pour la production avec ces ajustements. La dette technique est faible et maitrisable.
