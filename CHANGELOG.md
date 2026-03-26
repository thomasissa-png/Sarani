# Changelog — Gradient Agents Framework

Historique des modifications du framework. Ce fichier est séparé du CLAUDE.md pour garder les instructions opérationnelles courtes et scannable.

---

## Session du 2026-03-22 — 20 nouveaux prompts (39→59) post-audits de couverture

**Ce qui a ete fait :**

1. **Consolidation de 5 audits de couverture** : @elon (6/10), @creative-strategy (5.5/10), @growth (3/10), @product-manager, @design — identification des prompts manquants avec deduplication croisee
2. **20 nouveaux prompts ajoutes** dans `index.html` (39→59 prompts) :
   - Phase 0 (6) : Valider la demande, Proposition de valeur, Messaging matrix, Pricing, Scope MVP, Storytelling
   - Phase 1 (4) : Direction artistique, Identite verbale, Specs interaction composants, Specs responsive
   - Phase 2 (2) : Setup initial projet, Audit handoff design→code
   - Phase 3 (1) : Strategie de contenu & calendrier editorial
   - Phase 4 (5) : Plan de lancement, Referral, Retention/churn, PLG, PMF
   - Raccourcis (2) : Feedback & roadmap v2, A/B testing
3. **Standard 9/10 applique** : chaque prompt inclut le pattern d'autonomie ("Lis [fichier]. S'il n'existe pas, pose-moi les questions..."), les chemins de livrables explicites, le chainage multi-agents avec handoffs, et les notes anti-timeout quand pertinent
4. **8 prompts dedupliques** : Naming, Unit economics, Scalabilite technique, Sprint planning, Retrospective, Upsell/expansion, Scale 1K-10K, Prototype interactif — fusionnes ou integres dans les prompts existants/nouveaux
5. **Plan d'orchestration** : `docs/orchestration-plan-new-prompts.md` mis a jour avec la liste consolidee, la methode de deduplication, et les prompts non retenus avec justification

**Decisions de conception :**
- Priorite aux prompts couvrant les phases manquantes du cycle business (retention, monetisation, validation marche) plutot qu'a la granularite operationnelle (sprint planning, retrospective)
- Les prompts de scale (1K→10K) et d'expansion revenue integres dans PMF et PLG plutot qu'isoles
- Le naming reste geerable via le prompt brand-platform existant (ajout optionnel si demande)

---

## Session du 2026-03-22 — Compaction + @elon + audit 9/10

**Ce qui a été fait :**

1. **Compaction des 19 agents** : sections dupliquées (timeouts, escalade, mode révision, auto-éval, protocole de fin) remplacées par références à `CLAUDE.md` et `_base-agent-protocol.md` → ~900 lignes éliminées
2. **Création de @elon** : agent stratégique incarnant Elon Musk — first principles thinking, audit brutal, scoring sur 10, modes Audit/Conseil/Challenge, communication structurée avec @orchestrator
3. **Dashboard HTML** (`index.html`) : ajout de @agent-factory et @elon (17→19 agents)
4. **Auto-évaluations enrichies** : tous les 19 agents ont maintenant 5+ questions spécifiques
5. **Audit final @elon** : 9/10 sur les 10 dimensions (architecture, qualité agents, calibrations, orchestration, erreurs, tests, doc, versioning, cohérence, impact)

**Décisions de conception :**
- @elon est un agent hors-phase, invocable à tout moment pour auditer le framework ou les projets
- @elon peut émettre des verdicts GO/PIVOT/KILL sur les projets et communiquer à @orchestrator
- Le nombre d'agents reste à 19 (18 opérationnels + @elon advisory) — pas d'inflation

---

## Session du 2026-03-22 — Audit Elon Musk initial + implémentation

**Ce qui a été fait :**

1. **Versioning agents** : ajout de `version: "1.0"` dans le frontmatter des 18 agents
2. **Protocole de base centralisé** : création de `_base-agent-protocol.md` — les sections communes ne sont plus dupliquées dans chaque agent
3. **Calibrations croisées corrigées** : @design←user-flows, @qa←design-tokens+WebSearch, @social←growth-strategy, @fullstack←champs critiques enrichis, @creative-strategy←growth, @data-analyst←growth
4. **Personas renforcés** : opinions fortes ajoutées à @copywriter, @seo, @ia, @social, @geo
5. **CLAUDE.md nettoyé** : journal extrait dans CHANGELOG.md, instructions opérationnelles compactées
6. **Infrastructure de test** : projet-test fictif dans `tests/`, scoring automatique post-livrable
7. **Mécanismes de disruption** : mémoire organisationnelle (`docs/lessons-learned.md`), mode autopilot pour l'orchestrateur
8. **Auto-évaluations enrichies** : @copywriter, @ia, @reviewer portés à 5+ questions spécifiques
9. **Exception chemin livrables** : documentée pour @agent-factory et @orchestrator
10. **@agent-factory v2** : déduplication, sections domaine, mini-templates format, test fonctionnel, garde-fous batch/niche/dépréciation

**Décisions de conception :**
- Les agents héritent des règles communes via CLAUDE.md (toujours en contexte) — pas de duplication
- Le `_base-agent-protocol.md` est une référence, pas un agent exécutable
- Versioning par agent permet de figer une version par projet
- Le journal de setup sort du CLAUDE.md pour garder les instructions ≤200 lignes

---

## Session du 2026-03-22 — Ajout de @agent-factory

**Ce qui a été fait :**

1. **Nouvel agent `@agent-factory`** créé dans `.claude/agents/agent-factory.md` — agent capable de créer des agents spécialisés sur mesure pour chaque projet (architecte, directeur podcast, trader, SFX, etc.)

2. **Processus en 5 étapes** intégré dans l'agent :
   - Recueil du besoin (rôle, mission, livrables, interactions, outils, domaine)
   - Vérification anti-doublon (pas de chevauchement avec agents existants)
   - Construction selon le template canonique exact du framework
   - Intégration dans le framework (CLAUDE.md + orchestrator.md)
   - Validation via checklist de conformité (15 points)

3. **Intégrations** : CLAUDE.md mis à jour (tableau priorité, convention d'appel, compteur 18 agents), orchestrator.md mis à jour (mapping subagent_type)

**Décisions de conception :**
- L'agent-factory lit TOUS les agents existants avant de créer (calibration complète) — évite les doublons
- WebSearch obligatoire si le domaine est inconnu — l'agent ne fabrique jamais un expert sur un domaine qu'il ne comprend pas
- Le template canonique est intégré dans le processus de création, pas dans un fichier séparé — évite la désynchronisation
- L'agent-factory peut aussi modifier des agents existants (mode révision) — pas seulement en créer de nouveaux

---

## Session du 2026-03-22 — Enrichissements et audit qualité

**Ce qui a été fait :**

1. **Règle absolue numéro 2 — Zéro invention de données** : ajoutée au CLAUDE.md et aux 18 agents
2. **Enrichissement des agents** (cas d'usage manquants) :
   - @growth : rétention, churn, pricing & packaging, expansion revenue
   - @data-analyst : roadmap CRO, analyse rétention cohortes, attribution
   - @product-manager : recherche utilisateur, pricing, feedback loops
   - @copywriter : help center, knowledge base, changelog
   - @fullstack : API publique RESTful, webhooks, SDK client
3. **Tableau de performance des agents** ajouté au template project-context.md
4. **Audit complet par @ia** — note moyenne 8.47/10. Rapport dans `docs/ia/agent-audit-report.md`
5. **Implémentation des 7 recommandations de l'audit** (P0-1 à P2-7)
6. **Fix installation** : instructions corrigées pour installer `.claude/agents/` à la racine du repo git

**Décisions prises :**
- Enrichir les agents existants plutôt que créer de nouveaux agents (éviter la complexité)
- La règle anti-invention est la plus importante du framework — un livrable incomplet vaut mieux qu'un livrable faux
- Les calibrations croisées sont le levier #1 de cohérence inter-agents

---

## Session du 2026-03-21 — Setup initial du framework Gradient Agents

**Ce qui a été fait :**

1. **18 agents créés** dans `.claude/agents/` — structure homogène (identité, compétences, protocoles, calibration, handoff)
2. **Agents disponibles :** orchestrator, fullstack, qa, design, ux, copywriter, seo, geo, ia, infrastructure, creative-strategy, product-manager, data-analyst, growth, social, reviewer, legal, agent-factory
3. **Template project-context.md** créé dans `templates/`
4. **CLAUDE.md** — instructions globales, conventions, règles

**Décisions de conception :**
- Modèle claude-opus-4-6 pour tous les agents (qualité maximale)
- Orchestrateur limité à 3 sous-agents par message (anti-timeout)
- Convention de chemins stricte (`docs/[agent]/`) vérifiée par @reviewer
- Langue : français pour tout sauf code et termes techniques
