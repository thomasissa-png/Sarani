# Audit Infrastructure — Sarani

**Date** : 2026-03-24
**Agent** : @infrastructure
**Projet** : Sarani — Site vitrine agence creative internationale
**Stack** : Next.js 16.2 / React 19 / Tailwind 4 / Replit
**Pages** : 7 (home, about, work, pricing, contact, legal, case-studies/[slug])

---

## Note globale : 5.5 / 10

Le projet repose sur une stack moderne et bien choisie (Next.js 16, React 19, Tailwind 4) avec un bon travail SEO/accessibilite dans le layout. En revanche, l'absence totale de CI/CD, monitoring, health check, headers de securite, configuration Replit, et strategie de cache constitue un risque operationnel majeur pour un site vitrine d'une agence a 3.5M EUR de CA.

---

## 1. Stack technique et Dependances — 7 / 10

**Points forts**
- Stack de pointe : Next.js 16.2, React 19.2, Tailwind 4, TypeScript strict — aucune dette technique sur les choix fondamentaux
- Dependencies minimales et bien choisies : zod pour la validation, react-hook-form, framer-motion — pas de bloat

**Points faibles**
- Aucun outil de monitoring/observabilite installe (pas de Sentry, pas de logging structure)
- Pas de dependance pour le rate limiting, les headers de securite, ou la gestion d'images optimisee (sharp)

**Recommandations**
- Ajouter `@sentry/nextjs` pour le error tracking (free tier 5K events/mois suffit pour un site vitrine)
- Ajouter `sharp` en dependance pour l'optimisation d'images Next.js en production

---

## 2. Performance estimee — 6 / 10

**Points forts**
- Fonts locales avec `display: swap` et `localFont` — pas de FOUT/FOIT, pas de requete Google Fonts externe
- Stack legere : pas de state manager lourd, animations via framer-motion (tree-shakeable)

**Points faibles**
- `next.config.ts` est vide — pas d'optimisation images, pas de compression, pas de headers cache
- Aucune strategie ISR/SSG visible : pour un site vitrine, toutes les pages devraient etre statiquement generees

**Recommandations**
- Configurer `images.formats: ['image/avif', 'image/webp']` et `images.remotePatterns` dans next.config.ts
- Activer `output: 'standalone'` pour Replit et definir des headers cache statiques (`Cache-Control: public, max-age=31536000, immutable` pour les assets)

---

## 3. Configuration Next.js — 4 / 10

**Points forts**
- TypeScript strict active avec path aliases `@/*` — DX correcte
- Utilisation de l'App Router avec Server Components par defaut

**Points faibles**
- `next.config.ts` est completement vide — zero configuration de production (images, headers, redirects, compression)
- Pas de configuration `output`, `poweredByHeader: false`, ni de `headers()` pour la securite

**Recommandations**
- Configurer next.config.ts : `poweredByHeader: false`, `output: 'standalone'`, `images`, `headers` (CSP, X-Frame-Options, HSTS)
- Ajouter un middleware.ts pour le rate limiting sur /api/contact et les headers de securite globaux

---

## 4. Securite — 3 / 10

**Points forts**
- Validation des formulaires cote client via zod + react-hook-form (bonne base)
- Pas d'authentification requise = surface d'attaque reduite

**Points faibles**
- Aucun header de securite configure (pas de CSP, X-Frame-Options, X-Content-Type-Options, HSTS, Referrer-Policy, Permissions-Policy)
- Pas de rate limiting sur l'API contact — vulnerable au spam et au DDoS applicatif

**Recommandations**
- Ajouter des security headers via next.config.ts `headers()` ou un middleware.ts (CSP, HSTS, X-Frame-Options: DENY, etc.)
- Implementer un rate limiting basique sur /api/contact (in-memory Map avec TTL ou un service externe comme Upstash Redis)

---

## 5. SEO technique — 8 / 10

**Points forts**
- Metadata bien structuree : title template, description, OpenGraph, Twitter Card, robots, metadataBase
- JSON-LD Organization injecte globalement — bon signal pour les moteurs de recherche et l'IA generative

**Points faibles**
- Pas de sitemap.xml ni robots.txt configures dans le projet (fichiers Next.js `app/sitemap.ts` et `app/robots.ts` absents)
- Pas de gestion des balises canonical explicites ni de hreflang (site international en anglais uniquement pour l'instant)

**Recommandations**
- Creer `src/app/sitemap.ts` et `src/app/robots.ts` pour la generation automatique
- Preparer la structure hreflang si une version multilingue est envisagee (meme si non prioritaire aujourd'hui)

---

## 6. Accessibilite technique — 7 / 10

**Points forts**
- Skip link present (`<a href="#main-content" className="skip-link">`) — bonne pratique a11y
- Semantique HTML correcte : `<main id="main-content">`, `<Header>`, `<Footer>`, `lang="en"` sur le html

**Points faibles**
- Pas d'audit automatise d'accessibilite dans le pipeline (pas de axe-core, pa11y, ou Lighthouse CI)
- Impossible de verifier les contrastes, ARIA, et focus management sans voir les composants en detail

**Recommandations**
- Ajouter `@axe-core/react` en dev pour detecter les violations a11y en developpement
- Integrer un check Lighthouse a11y dans le futur pipeline CI/CD (score minimum 90)

---

## 7. CI/CD et DX — 2 / 10

**Points forts**
- Scripts package.json standards (dev, build, start, lint) — base fonctionnelle
- ESLint configure via eslint-config-next — linting de base en place

**Points faibles**
- Aucun pipeline CI/CD : pas de `.github/workflows/`, pas de `.replit` — zero automatisation
- Pas de pre-commit hooks (husky/lint-staged), pas de tests, pas de build automatique sur push

**Recommandations**
- Creer `.github/workflows/ci.yml` avec : lint, type-check (`tsc --noEmit`), build — bloque les merges si echec
- Creer un fichier `.replit` avec run/build commands et port forwarding pour que le deploy Replit fonctionne sans friction

---

## 8. Monitoring et Observabilite — 1 / 10

**Points forts**
- Analytics Umami bien implemente avec typage strict et silent failure — bon pattern
- Tracking plan structure avec event map typee — base solide pour la mesure

**Points faibles**
- Aucun endpoint `/api/health` — impossible de monitorer la disponibilite
- Zero error tracking (pas de Sentry), zero alerting, zero monitoring de performance en production

**Recommandations**
- Creer `/api/health` retournant le status de l'application (uptime, version, timestamp)
- Deployer Sentry free tier + configurer UptimeRobot/BetterStack sur l'endpoint /api/health avec alerte si downtime > 1 min

---

## Verdict final

Le projet Sarani a une **fondation frontend solide** : stack moderne, SEO bien initialise, accessibilite correcte, analytics bien typees. C'est le travail d'un @fullstack competent.

Cependant, **toute la couche infrastructure est absente** :

| Priorite | Action | Impact |
|----------|--------|--------|
| P0 | Configurer next.config.ts (images, headers securite, standalone) | Securite + Performance |
| P0 | Creer .github/workflows/ci.yml (lint, tsc, build) | Fiabilite des deployments |
| P0 | Creer .replit (run, build, port) | Deploiement Replit sans friction |
| P1 | Ajouter /api/health + monitoring externe | Observabilite |
| P1 | Ajouter Sentry | Error tracking |
| P1 | Ajouter rate limiting sur /api/contact | Securite |
| P2 | Creer sitemap.ts et robots.ts | SEO technique |
| P2 | Ajouter pre-commit hooks (husky + lint-staged) | DX |

Pour un site vitrine d'une agence a 3.5M EUR de CA ciblant des grands comptes internationaux (TikTok, Sony, Adidas), l'absence de monitoring et de securite headers est un risque reputationnel. Un incident non detecte ou une faille XSS sur le formulaire contact pourrait nuire a la credibilite aupres des prospects enterprise.

**Score par critere :**

| Critere | Note |
|---------|------|
| Stack technique et Dependances | 7/10 |
| Performance estimee | 6/10 |
| Configuration Next.js | 4/10 |
| Securite | 3/10 |
| SEO technique | 8/10 |
| Accessibilite technique | 7/10 |
| CI/CD et DX | 2/10 |
| Monitoring et Observabilite | 1/10 |
| **Moyenne** | **4.75/10** |
| **Note globale (ponderee criticite)** | **5.5/10** |

---

**Handoff -> @orchestrator**
- Fichier produit : `docs/reviews/infrastructure-audit.md`
- Decisions : aucune modification appliquee, audit uniquement
- Points d'attention : les 4 actions P0 doivent etre traitees avant tout deploiement en production
