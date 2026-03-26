# Project Context — Projet Test (fictif)

Ce fichier est un project-context.md pré-rempli pour tester le framework Gradient Agents.
Projet fictif mais réaliste — permet de valider que chaque agent fonctionne en conditions réelles.

---

## Identité du projet

| Champ | Valeur |
|---|---|
| Nom du projet | **PulseBoard** |
| URL | pulseboard.io (fictif) |
| Secteur | Analytics marketing pour PME françaises (10-50 employés) |
| Stade actuel | Idée |
| Date de création du contexte | 2026-03-22 |

## Cible

| Champ | Valeur |
|---|---|
| Persona principal | Marie, 35 ans, responsable marketing en PME industrielle. Gère 4 outils analytics (GA4, HubSpot, Mailchimp, réseaux sociaux). Perd 3h/semaine à consolider ses données manuellement dans Google Sheets. Frustrée par l'absence de vue unifiée. Prend ses décisions marketing à l'intuition faute de dashboard clair. |
| Problème principal | Données marketing éparpillées entre 4-6 outils, consolidation manuelle chronophage, pas de dashboard unifié, décisions prises à l'intuition |
| Alternative actuelle | Google Sheets + exports manuels + intuition. Quelques PME utilisent Databox ou Klipfolio mais les trouvent trop techniques et chers. |

## Positionnement

| Champ | Valeur |
|---|---|
| Promesse unique | Dashboard analytics unifié en 1 clic, sans intégration technique — Marie connecte ses outils et voit ses KPIs en 30 secondes |
| Ton de marque | Expert et bienveillant : on guide sans jargon, on rassure sans simplifier. Comme un collègue data senior qui explique avec patience. |
| 3 mots qui définissent la marque | Clarté, Confiance, Simplicité |
| 3 mots qui NE définissent PAS la marque | Complexe, Technique, Froid |
| Concurrent principal | Databox |
| Ce qui nous en différencie | Databox vise les équipes data/growth de scale-ups. PulseBoard vise les responsables marketing de PME qui n'ont PAS de data analyst. Zéro SQL, zéro configuration technique, templates métier prêts à l'emploi. |

## Objectifs

| Champ | Valeur |
|---|---|
| Objectif principal à 6 mois | 500 utilisateurs actifs (connexion ≥1x/semaine), dont 100 payants, MRR 5K€ |
| KPI North Star | Nombre de dashboards consultés par semaine (proxy d'usage réel et de valeur perçue) |
| KPI secondaire | Time-to-first-dashboard : temps entre l'inscription et la création du premier dashboard |
| Critère de succès à 12 mois | 2000 utilisateurs actifs, MRR 25K€, NPS ≥50, churn mensuel <5% |

## Stack technique

| Composant | Choix |
|---|---|
| Frontend | Next.js 14 App Router |
| Backend | API Routes Next.js + Server Actions |
| Base de données | PostgreSQL intégré Replit + Prisma ORM |
| Authentification | Clerk |
| Hébergement | Replit (Deployments) |
| Paiements | Stripe (abonnements mensuels/annuels) |
| Outils IA | Claude API pour génération d'insights automatiques sur les dashboards |
| Analytics | PostHog |

## Contraintes

| Champ | Valeur |
|---|---|
| Budget infra mensuel | 200€ max (Replit + services tiers) |
| Budget acquisition mensuel | 500€ (principalement SEO + content marketing, très peu de paid) |
| Timeline | V1 complète en 3 mois, lancement public en 4 mois |
| Contraintes légales | RGPD (données analytics des utilisateurs), pas de stockage de données sensibles clients finaux |
| Ressources humaines | 1 fondateur technique solo + framework Gradient Agents |

## Historique des interventions agents

| Agent | Date | Fichiers produits | Décisions clés | Pourquoi / Alternatives écartées |
|---|---|---|---|---|
| — | — | — | — | — |

## Performance des agents

| Agent | Complétude (1-5) | Cohérence (1-5) | Actionnabilité (1-5) | Messages (1-5) | Spécificité (1-5) |
|---|---|---|---|---|---|
| — | — | — | — | — | — |

## Notes libres

Projet test pour valider le framework Gradient Agents. Tous les agents doivent produire des livrables spécifiques à PulseBoard, pas des templates génériques.
