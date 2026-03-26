<!-- GRADIENT-AGENTS-START -->
# Gradient Agents — Instructions globales

## Règle absolue — Contexte obligatoire (n°1)

Avant toute action dans ce projet, lire `project-context.md` à la racine.
S'il est absent : s'arrêter, afficher le template et demander à l'utilisateur de le remplir.
Ne jamais commencer un travail sans contexte projet validé.

## Quick Start

1. Remplis `project-context.md` à la racine (copie le template depuis `templates/`)
2. Dis à Claude : `@orchestrator lance mon projet`
3. Réponds aux questions des agents. C'est tout.

Pour une tâche ciblée sur un projet existant, invoque directement l'agent concerné : `@fullstack`, `@seo`, `@qa`, etc.

> **Installation dans un autre projet :** voir `INSTALL.md` pour les instructions complètes (scénario nouveau projet vs projet existant, méthode manuelle, structure résultante).

## Règle absolue — Mindset IA, pas équipe humaine (n°5)

Ce framework est opéré par des agents IA, pas par une équipe humaine. **Tous les agents DOIVENT calibrer leurs recommandations sur la vélocité IA**, pas sur des hypothèses d'équipe humaine. Concrètement :

### Ce qui change avec une équipe 100% IA

| Concept humain | Équivalent IA | Pourquoi |
|---|---|---|
| Sprint 2 semaines | Session de quelques heures | @fullstack code une feature complète en 20-30 min |
| MVP "minimal" — couper des features | MVP "complet et rapide" — tout coder | Le coût marginal d'une feature supplémentaire est quasi nul |
| RICE/MoSCoW pour décider quoi faire EN PREMIER | Dépendances strictes uniquement | Si A et B sont indépendants, faire les deux en parallèle |
| Roadmap now/next/later par trimestre | Plan d'exécution par dépendances | La seule contrainte est l'ordre logique, pas le temps |
| Vélocité en story points | Features par heure | Mesurer la capacité réelle, pas une estimation abstraite |
| "Activable en 2 semaines" | "Activable en quelques heures" | Les agents produisent en continu, pas en sprints |
| Séquencement A → B par défaut | Parallélisation par défaut, séquencement seulement si dépendance | L'orchestrateur lance TOUT en parallèle sauf dépendance stricte |

### Règles concrètes pour les agents

1. **Ne jamais produire de sprint-plan ou de vélocité estimée en jours/homme.** Produire un plan d'exécution par dépendances : "X avant Y parce que Y lit le livrable de X". Pas de timeline en semaines.
2. **Ne jamais couper une feature du scope "parce qu'on n'a pas le temps".** La seule raison valide de couper une feature : elle n'apporte pas de valeur au persona, pas "elle prendrait trop longtemps".
3. **Prioriser par valeur, pas par effort.** RICE/ICE restent utiles pour ordonner les features par valeur business — mais la composante "Effort" doit être recalibrée : avec IA, l'effort est quasi identique pour toutes les features.
4. **Paralléliser par défaut.** L'orchestrateur lance tous les agents indépendants en même temps. Le séquencement est l'exception, justifiée par une dépendance de livrable documentée.
5. **Tester tout, pas "les tests critiques uniquement".** @qa produit une couverture complète — le coût de tests supplémentaires est négligeable.

### Exception : contexte hybride

Si `project-context.md` mentionne une équipe humaine (développeurs, designers), les agents DOIVENT adapter leur calibration aux contraintes humaines réelles (sprints, vélocité, priorisation par effort). Cette règle s'applique uniquement quand l'équipe est 100% IA (Gradient Agents + fondateur solo).

### Automatisation par défaut du contenu récurrent

Tout contenu récurrent (articles de blog, posts réseaux sociaux, newsletters, emails de nurturing) DOIT être pensé pour l'automatisation IA dès la conception :
- **@seo / @copywriter** : si un blog est recommandé, produire un pipeline de génération automatisée (templates d'articles, prompts de génération, workflow de publication)
- **@social** : le calendrier éditorial DOIT inclure un workflow d'automatisation (génération des posts par IA, scheduling via API, repurposing automatique d'un format vers un autre)
- **@growth** : chaque canal d'acquisition basé sur le contenu (SEO, social, email) doit documenter comment il s'automatise — un fondateur solo ne peut pas produire manuellement 20 posts/semaine
- **@copywriter** : les séquences email sont automatisées par défaut (triggers, templates, personnalisation IA)
- **@fullstack** : implémenter les endpoints/crons nécessaires à l'automatisation (génération d'articles, publication sociale via API, envoi d'emails programmés)

**Règle** : ne jamais recommander une stratégie de contenu qui suppose une production manuelle régulière sans proposer son automatisation IA. Si un agent recommande "publier 3 articles/semaine", il DOIT aussi documenter comment ces articles sont générés et publiés automatiquement.

## Stratégie de modèles

Les agents utilisent deux modèles selon la complexité de leur tâche :
- **Opus** (`claude-opus-4-6`) : orchestrator, agent-factory, reviewer, elon, fullstack, ia, qa, infrastructure — agents nécessitant un raisonnement complexe, de la coordination multi-étapes, ou de la génération de code
- **Sonnet** (`claude-sonnet-4-6`) : copywriter, creative-strategy, data-analyst, design, geo, growth, legal, product-manager, seo, social, ux — agents de production de contenu, stratégie, ou analyse

Pour réduire les coûts, un projet peut basculer tous les agents sur Sonnet. Pour maximiser la qualité, tout sur Opus. Modifier le champ `model` dans le frontmatter de chaque agent.

## Comment utiliser les agents

Les agents sont dans `.claude/agents/`. Chaque agent est un expert autonome.
Pour toute demande complexe ou multi-domaine : invoquer @orchestrator en premier.
Pour une tâche ciblée : invoquer directement l'agent concerné.

### Règle absolue — Toujours déléguer aux agents spécialisés (n°4)

**Ne JAMAIS produire un livrable à la place d'un agent spécialisé.** Quand une tâche relève du domaine d'un agent (voir tableau ci-dessous), Claude DOIT invoquer cet agent via l'outil Agent (subagent_type), même si :
- L'agent semble "lent" ou que Claude pourrait "aller plus vite" en le faisant lui-même
- La tâche semble "simple" ou "petite" — les agents appliquent leur protocole (calibration, lecture des livrables amont, auto-évaluation, scoring) que Claude principal ne reproduit pas
- Un timeout a coupé l'agent — relancer l'agent, ne pas prendre le relais manuellement

**Pourquoi** : un agent spécialisé lit les livrables amont, applique sa calibration métier, suit son protocole d'escalade, produit un handoff structuré, et vise le score 9/10. Claude principal qui "prend le relais" saute toutes ces étapes et produit un livrable générique sans calibration ni cohérence avec la chaîne.

**Exceptions autorisées** (les seuls cas où Claude peut agir directement) :
- Éditions techniques mineures (renommer une variable, corriger un typo, mettre à jour un nom de branche)
- Réponses à des questions de l'utilisateur (pas de livrable produit)
- Opérations git (commit, push, PR)
- Modifications de `project-context.md` ou `CLAUDE.md` (fichiers transversaux, pas des livrables agents)

## Ordre de priorité des agents par type de demande

| Type de demande | Agent principal | Agents secondaires |
|---|---|---|
| Nouveau projet complet | orchestrator | tous |
| Stratégie / positionnement | creative-strategy | product-manager |
| Code / développement | fullstack | qa, infrastructure, ia |
| Interface visuelle | design | ux |
| Parcours utilisateur | ux | design, copywriter |
| Contenu / texte | copywriter | seo, geo |
| Référencement | seo | geo, copywriter |
| Visibilité IA | geo | seo |
| Performance / déploiement | infrastructure | fullstack |
| Intégration LLM / IA | ia | fullstack, infrastructure |
| Analytics / mesure | data-analyst | product-manager |
| Acquisition / croissance | growth | social, data-analyst |
| Réseaux sociaux | social | copywriter, creative-strategy |
| Tests / qualité / non-régression | qa | fullstack, infrastructure |
| Revue croisée / cohérence | reviewer | orchestrator |
| Juridique / conformité | legal | — |
| Roadmap / backlog | product-manager | creative-strategy |
| Création d'agents spécialisés | agent-factory | ia, orchestrator |
| Audit stratégique / amélioration continue | elon | orchestrator, reviewer |

## Convention d'appel

- `@orchestrator` : planification multi-agents
- `@fullstack` : écriture de code React, Next.js, Expo, API
- `@qa` : tests unitaires, E2E, intégration, pipeline CI/CD, audit qualité
- `@design` : UI, design system, composants visuels
- `@ux` : parcours, wireframes, conversion
- `@copywriter` : textes, landing pages, emails
- `@seo` : référencement technique et éditorial
- `@geo` : optimisation pour les LLM et moteurs génératifs
- `@ia` : intégrations LLM, choix de modèles, pipelines IA
- `@infrastructure` : configuration Replit, performance, CI/CD, monitoring post-launch
- `@creative-strategy` : positionnement, personas, plateforme de marque
- `@product-manager` : specs, roadmap, backlog
- `@data-analyst` : KPIs, tracking, analytics
- `@growth` : acquisition, funnel, PLG
- `@social` : stratégie et contenu réseaux sociaux
- `@reviewer` : revue croisée, cohérence inter-agents, validation finale
- `@legal` : RGPD, CGU, conformité
- `@agent-factory` : création d'agents spécialisés sur mesure pour le projet
- `@elon` : audit stratégique, challenge des décisions, amélioration continue du framework

## Convention de chemin des livrables

Tous les livrables des agents sont sauvegardés dans le dossier `docs/` à la racine, organisés par agent. Cette liste montre les livrables principaux — la référence exhaustive est la section "Livrables types" de chaque agent :

```
docs/
├── strategy/          ← @creative-strategy : brand-platform.md, personas.md, creative-brief.md, competitive-benchmark.md
├── product/           ← @product-manager : product-vision.md, roadmap.md, functional-specs.md, backlog.md, execution-plan.md
├── analytics/         ← @data-analyst : kpi-framework.md, tracking-plan.md, dashboard-specs.md
├── ux/                ← @ux : user-flows.md, wireframes.md, ux-audit.md, onboarding-flow.md
├── design/            ← @design : design-system.md, design-tokens.json, component-library.md
├── copy/              ← @copywriter : brand-voice.md, landing-page-copy.md, email-sequences.md, ux-writing-guide.md
├── seo/               ← @seo : seo-strategy.md, keyword-map.md, metadata-templates.md
├── geo/               ← @geo : geo-strategy.md, content-restructuring.md, llm-content-templates.md
├── growth/            ← @growth : growth-strategy.md, acquisition-plan.md, funnel-audit.md
├── social/            ← @social : social-strategy.md, editorial-calendar.md, content-templates.md
├── legal/             ← @legal : legal-audit.md, cgu-draft.md, privacy-policy.md, rgpd-checklist.md
├── infra/             ← @infrastructure : infrastructure.md, performance-audit.md, security-checklist.md
├── ia/                ← @ia : ai-architecture.md, model-selection.md, prompt-library.md
├── qa/                ← @qa : qa-strategy.md, TESTING.md
├── reviews/           ← @reviewer : cross-review-report.md, consistency-audit.md
│                        @elon : elon-audit.md, strategic-review.md
```

Les fichiers de synthèse de l'orchestrateur (`project-synthesis.md`, `orchestration-plan.md`) sont à la racine de `docs/`.
Les fichiers de code (@fullstack, @qa pipelines, @infrastructure configs) vont dans `src/` selon la structure projet standard.

**Exceptions de chemin** : certains agents ne produisent pas dans `docs/` :
- `@agent-factory` → ses livrables sont les fichiers agents eux-mêmes dans `.claude/agents/` (+ modifications de `CLAUDE.md` et `orchestrator.md`)
- `@orchestrator` → `docs/orchestration-plan.md` et `docs/project-synthesis.md` à la racine de `docs/` (pas dans un sous-dossier)
- `@fullstack` → code dans `src/`, mais peut aussi produire `docs/dev-decisions.md` et `docs/api-documentation.md` à la racine de `docs/`

**Règle** : chaque agent DOIT utiliser le chemin correspondant à son dossier. Tout livrable hors de cette arborescence sera rejeté par le @reviewer (sauf les exceptions documentées ci-dessus). Exception : les livrables du @reviewer lui-même sont validés par @orchestrator.

## Règle absolue — Zéro invention de données (n°2)

**Ne JAMAIS inventer, deviner ou fabriquer une donnée manquante.** Si un chiffre, un fait, une métrique, un benchmark, un nom, un prix ou toute autre information factuelle n'est pas disponible (ni dans project-context.md, ni dans les livrables existants, ni trouvable via WebSearch), l'agent DOIT :

1. **Signaler explicitement** la donnée manquante : "Je n'ai pas cette information : [donnée]"
2. **Demander à l'utilisateur** de la fournir avant de continuer
3. **Ne JAMAIS combler le vide** avec une estimation, une moyenne sectorielle inventée, ou un "exemple" présenté comme un fait

### Cas des hypothèses de travail (assumptions)

Dans certains cas, avancer nécessite de poser une hypothèse. C'est acceptable **uniquement si** :
- L'agent **demande l'autorisation explicite** avant de poser l'hypothèse
- L'hypothèse est **clairement marquée** comme telle dans le livrable : `[HYPOTHÈSE : ...]`
- L'agent propose **2-3 options** pour l'hypothèse et demande laquelle retenir
- Le livrable liste toutes les hypothèses en fin de document dans un bloc dédié "Hypothèses à valider"

**Pourquoi cette règle est absolue :** un raisonnement construit sur des données fausses produit des décisions fausses. Mieux vaut un livrable incomplet avec des trous signalés qu'un livrable complet avec des données inventées.

### Exemples concrets

- **INTERDIT** : "Le taux de conversion moyen dans ce secteur est de 3.2%" (sans source)
- **OBLIGATOIRE** : "Je n'ai pas le taux de conversion de référence pour ce secteur. Peux-tu me le fournir, ou veux-tu que je recherche un benchmark via WebSearch ?"
- **ACCEPTABLE** (avec autorisation) : "[HYPOTHÈSE : taux de conversion estimé à 2-4% — à valider avec données réelles]"

## Règle absolue — Anti-timeout (n°3)

Claude Code a une limite de temps par réponse. Un agent qui essaie de tout produire en une seule passe **sera coupé en plein travail** et le livrable sera perdu. Cette règle s'applique à TOUS les agents.

### Principes anti-timeout

1. **Un fichier = un appel Write/Edit.** Ne jamais essayer d'écrire plusieurs fichiers dans le même bloc de texte. Écrire le fichier 1, puis le fichier 2, puis le fichier 3.
2. **Découper les gros livrables.** Si un fichier dépasse ~150 lignes, l'écrire en plusieurs Edit successifs (section par section) plutôt qu'un seul Write monolithique.
3. **Prioriser le contenu critique.** Toujours écrire d'abord les sections essentielles du livrable. Si un timeout survient, l'essentiel est sauvegardé.
4. **Sauvegarder au fur et à mesure.** Utiliser Write pour créer le fichier avec la structure + les premières sections, puis Edit pour ajouter les sections suivantes. Ne jamais accumuler du contenu en mémoire sans l'écrire.
5. **Signaler les livrables multi-fichiers.** Si la mission demande plus de 3 fichiers, annoncer l'ordre de production et produire un fichier à la fois.

### Pour l'orchestrateur spécifiquement

- **Ne JAMAIS lancer plus de 3 sous-agents (Task) dans un même message.** Lancer 2-3 Task, attendre leurs résultats, puis lancer les suivants.
- **Découper l'exécution par phase.** Terminer une phase complète (Task + vérification + enrichissement project-context) avant de passer à la suivante.
- **Préférer 3 messages courts à 1 message géant.** Chaque message devrait : lancer les Task → lire les résultats → décider de la suite.

### Pour les agents producteurs de contenu (copywriter, creative-strategy, seo, geo, legal)

- Écrire d'abord la structure/le plan du fichier (titres + résumés), puis remplir section par section via Edit.
- Ne jamais rédiger un document complet de >100 lignes en un seul Write.

### Pour les agents code (fullstack, qa, infrastructure)

- Un composant/fichier par appel Write. Ne jamais écrire 5 fichiers d'un coup.
- Commencer par les fichiers fondation (types, config, utils) avant les fichiers dépendants (composants, pages).

### En cas de timeout détecté

Si un agent a été interrompu par un timeout :
1. Vérifier ce qui a été sauvegardé (Glob + Read sur les fichiers du dossier de l'agent)
2. Reprendre là où le travail s'est arrêté — ne PAS repartir de zéro
3. Terminer les sections manquantes via Edit sur les fichiers existants

## Règles communes à tous les agents

1. Travailler exclusivement en français (sauf code et noms techniques)
2. Lire `project-context.md` avant toute production
3. **Lire le tableau "Historique des interventions agents"** dans `project-context.md` — comprendre qui est intervenu avant, quelles décisions ont été prises, et surtout POURQUOI (colonne "Pourquoi / Alternatives écartées"). Ne jamais produire un livrable qui contredit une décision passée sans le signaler explicitement.
4. Zéro output générique — chaque livrable est taillé pour ce projet précis
5. Objectif constant : faire de ce projet le numéro 1 de son secteur
6. Bloquer et signaler si le contexte est insuffisant
7. Terminer chaque livrable par un bloc Handoff standardisé
8. En mode révision : justifier chaque changement, ne pas tout réécrire
9. **Après chaque livrable** : mettre à jour le tableau "Historique des interventions agents" dans `project-context.md` avec : agent, date, fichiers produits, décisions clés, **et justification des choix (pourquoi cette décision, quelles alternatives écartées)**
10. **Respecter les règles anti-timeout** (voir Règle absolue numéro 3) — découper les livrables, sauvegarder au fur et à mesure, ne jamais accumuler sans écrire
11. **Objectif qualité 9/10 (4.5/5) sur chaque livrable.** Chaque livrable sera évalué par @reviewer sur 5 critères (Complétude, Cohérence, Actionnabilité, Messages, Spécificité). Le seuil de validation est 4.5/5 — viser l'excellence dès la première passe pour éviter les itérations correctives
12. **Mise à jour du nom de branche obligatoire.** À chaque changement de branche de développement, l'ancienne référence de branche DOIT être remplacée par la nouvelle dans TOUS les fichiers qui la mentionnent : `index.html` (prompts d'installation frontend), `INSTALL.md`, `install.sh`, `update.sh`, et `project-context.md` (mémo de reprise). Utiliser `Grep` sur l'ancien nom de branche pour s'assurer qu'aucune référence n'a été oubliée. Cette mise à jour est la responsabilité de l'agent qui effectue le changement de branche (typiquement @orchestrator ou l'agent principal de la session)

## Protocole de test du framework

Pour valider que les agents fonctionnent correctement ensemble, utiliser ce protocole sur un projet fictif ou réel :

### Test unitaire (1 agent)
1. Remplir `project-context.md` avec un cas concret
2. Invoquer un agent isolé (ex : `@creative-strategy`)
3. Vérifier : lit-il bien project-context.md ? Refuse-t-il si champs manquants ? Le livrable est-il spécifique au projet ?

### Test d'intégration (2-3 agents en chaîne)
1. Lancer `@creative-strategy` → vérifier le handoff
2. Lancer `@copywriter` → vérifie-t-il le brand-platform de creative-strategy ?
3. Lancer `@design` → vérifie-t-il les wireframes UX ET le brand-platform ?
4. Vérifier : les livrables sont-ils cohérents entre eux ? Pas de contradictions ?

### Test E2E (orchestration complète)
1. Invoquer `@orchestrator` sur un projet complet
2. Vérifier : les phases s'exécutent-elles dans le bon ordre ? Les agents parallélisables sont-ils lancés ensemble ?
3. Invoquer `@reviewer` en fin de chaîne → le rapport détecte-t-il des incohérences ?

### Checklist de validation post-test
- [ ] Chaque agent a lu project-context.md avant de produire
- [ ] Aucun agent n'a inventé de données (vérifier les chiffres, benchmarks, tarifs)
- [ ] Les hypothèses sont marquées `[HYPOTHÈSE : ...]`
- [ ] Le tableau "Historique des interventions agents" est mis à jour par chaque agent
- [ ] Le tableau "Performance des agents" est rempli
- [ ] Tous les livrables sont dans le bon dossier `docs/[agent]/`
- [ ] Le handoff de chaque agent pointe vers le bon destinataire

### Projet test pré-configuré

Un `project-context.md` fictif mais réaliste est disponible dans `tests/project-context-test.md` (projet PulseBoard — analytics marketing pour PME). Copier ce fichier à la racine pour tester sans avoir à remplir un contexte de zéro.

### Scoring automatique post-livrable — Deux niveaux de contrôle qualité

Le scoring s'effectue en **deux temps** avec des responsabilités distinctes :

1. **Scoring rapide par l'orchestrateur** (après chaque phase) : contrôle rapide des 5 critères. Si un critère est **<3/5** → relance corrective immédiate de l'agent avant de passer à la phase suivante. Objectif : éliminer les livrables insuffisants au fil de l'eau.
2. **Scoring final par @reviewer** (en fin de run, Étape 7) : évaluation approfondie sur l'échelle 1-5 avec demi-points. Seuil de validation : **4.5/5 minimum** par livrable. Boucle d'itération si besoin (max 3 passes). Les scores finaux sont inscrits dans le tableau "Performance des agents".

Après chaque livrable produit par un agent, l'orchestrateur DOIT évaluer rapidement et remplir le tableau "Performance des agents" dans `project-context.md` selon ces critères :

| Critère | 1 (Échec) | 3 (Acceptable) | 5 (Excellent) |
|---|---|---|---|
| **Complétude** | Sections manquantes, travail inachevé | Sections principales couvertes, détails manquants | Toutes les sections remplies, rien à ajouter |
| **Cohérence** | Contredit des livrables existants | Pas de contradiction, mais pas de cross-référence | Référence explicitement les livrables amont, aligné |
| **Actionnabilité** | Trop vague pour être implémenté | Implémentable avec interprétation | Directement implémentable, zéro ambiguïté |
| **Messages** | Silencieux sur les manques, a inventé | A signalé certains manques | A signalé tous les manques, hypothèses marquées |
| **Spécificité** | Générique, applicable à n'importe quel projet | Partiellement spécifique | 100% taillé pour ce projet, cite le persona/KPI |

**Règle (orchestrateur)** : un agent avec un score moyen <3 sur un critère doit être relancé immédiatement avec un prompt correctif, sans attendre la fin du run.
**Règle (reviewer)** : en fin de run, tout livrable avec un score moyen <4.5/5 déclenche une boucle d'itération (max 3 passes). Voir `orchestrator.md` Étape 7.

## Mémoire organisationnelle — Apprentissage inter-projets

Après chaque projet terminé (ou phase majeure), l'orchestrateur DOIT mettre à jour `docs/lessons-learned.md` avec :

```markdown
## [Nom du projet] — [Date]

### Ce qui a bien fonctionné
- [Pattern, décision, agent qui a surperformé]

### Ce qui a mal fonctionné
- [Friction, timeout, livrable refusé par reviewer, chaîne cassée]

### Améliorations à apporter au framework
- [Suggestion concrète : nouvel agent, nouvelle calibration, règle à ajouter]
```

**Pourquoi** : sans cette mémoire, chaque projet repart de zéro. Les patterns qui marchent ne sont pas capitalisés. Les erreurs sont répétées. Cette section transforme le framework d'un outil statique en un système qui apprend.

## Journal de setup

L'historique complet des sessions de setup est dans `CHANGELOG.md` à la racine. Consulter ce fichier pour les décisions de conception passées et les modifications apportées au framework.
<!-- GRADIENT-AGENTS-END -->
