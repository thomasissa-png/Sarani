# Plan d'orchestration — Sarani Back-Office (Phase 3 Roadmap)

*Produit par @orchestrator — 2026-03-24*
*Document vivant — mis a jour apres chaque phase*

---

## Demande utilisateur

Orchestration complete du back-office interne Sarani : dashboard de suivi projets (ClickUp), facturation (Evoliz), et 3 agents IA internes (traduction, creative strategist, deck generator). Cible : equipe Sarani (35 experts, 5 continents). Scope defini dans roadmap.md Phase 3 (W11-W18) et backlog.md US-301 a US-305.

## Mode detecte

**Projet existant** — Phases 0-2 du site vitrine terminees. 25+ livrables produits. Le back-office est un module independant (confirme dans roadmap.md : "Phase 3 is independent"). Cependant, c'est un nouveau perimetre avec un persona different (equipe interne, pas Sophie/Marc) et des besoins techniques differents (auth, APIs tierces, agents IA).

## Profil utilisateur

- Niveau technique : Technique (connait les APIs, comprend les choix d'archi)
- Ton de communication : Mixte (metier + technique)
- Mode d'interaction : Standard (validation entre phases)

## Complexite estimee

**Lourde** — 6-8 agents, 4 phases, integrations API tierces, 3 agents IA a concevoir. Risque timeout eleve. Decoupage en sessions multiples probable.

---

## Analyse du contexte — Champs critiques pour le back-office

### Ce qui est suffisant (reutilisable depuis project-context.md)

| Champ | Statut | Valeur |
|-------|--------|--------|
| Nom du projet | OK | Sarani |
| Secteur | OK | Agence creative internationale |
| Stack frontend | OK | Next.js sur Replit |
| Ton de marque | OK | Bienveillant, dynamique, reference |
| Contraintes budget infra | OK | Pas de limite |

### Ce qui est INSUFFISANT ou MANQUANT pour le back-office

Le project-context.md est optimise pour le site vitrine (persona Sophie/Marc). Le back-office a des besoins specifiques non couverts :

| Champ | Probleme | Impact |
|-------|----------|--------|
| **Persona back-office** | Non defini. Sophie et Marc sont les personas du site vitrine. Le back-office cible l'equipe interne : client managers, designers, traducteurs, directeurs creatifs. Leurs frustrations et workflows quotidiens ne sont pas documentes. | Bloque @ux (parcours utilisateurs), @ia (specs agents), @copywriter (UX writing interne) |
| **KPI North Star back-office** | "10M€ CA a 20% EBITDA" est le KPI global. Le back-office a des KPIs operationnels differents : temps de coordination, factures manquees, temps de revue traduction. Aucun baseline mesure. | Bloque @data-analyst (framework KPI interne) |
| **Auth method** | "Non requise" dans project-context.md (site vitrine). Le back-office NECESSITE une auth. Methode non choisie. | Bloque @fullstack, @infrastructure |
| **API ClickUp** | API key ? Workspace ID ? Quels espaces/listes a synchroniser ? Quelle granularite (taches, sous-taches, custom fields) ? | Bloque @fullstack pour US-301 |
| **API Evoliz** | API key ? Company ID ? Quelles donnees sont accessibles ? Scope read+write confirme ? | Bloque @fullstack pour US-302 |
| **Budget IA agents** | "A definir" dans project-context.md. Les 3 agents IA (traduction, creative, deck) consomment des tokens. Budget mensuel ? | Bloque @ia pour choix de modeles |
| **Priorite entre agents IA** | Le roadmap note cette question comme ouverte (Open Question #5). Traduction > Creative > Deck ? ou autre ordre ? | Impact sequencement dev |
| **Deploiement back-office** | Meme app Next.js que le site vitrine ou app separee ? Meme domaine (sarani.studio/admin) ou sous-domaine (admin.sarani.studio) ? | Bloque @infrastructure, @fullstack |
| **Roles et permissions** | Tous les membres ont les memes droits ? Ou distinction admin/client-manager/designer ? | Impact @ux, @fullstack |
| **Glossaire terminologique** | US-303 (agent traduction) necessite un glossaire de marque par langue. Existe-t-il ? | Bloque @ia pour l'agent traduction |
| **Template deck Sarani** | US-305 (deck generator) necessite un template de presentation brande. Existe-t-il ? Format ? | Bloque @ia, @design |
| **Output format deck** | Google Slides ? Canva ? PowerPoint ? PDF ? Le backlog mentionne "shareable link" sans preciser la plateforme. | Bloque @ia, @fullstack |

---

## Questions bloquantes — A poser AVANT Phase 0

### Priorite 1 — Bloquent l'architecture (a repondre avant Phase 0)

**Q1 — Deploiement back-office :**
Le back-office est-il integre dans la meme app Next.js que le site vitrine (route `/admin` ou `/dashboard`) ou c'est une app separee (sous-domaine `admin.sarani.studio` ou repo separe) ?
> Impact : architecture, auth, deploy, CI/CD.

**Q2 — Methode d'authentification :**
Quel niveau de securite pour l'acces au back-office ?
- Option A : Simple login/password (un compte partage ou comptes individuels)
- Option B : Restriction IP (whitelist des IPs de l'equipe)
- Option C : OAuth via un provider (Google Workspace si l'equipe utilise Google, ou autre)
- Option D : Combinaison (login + IP restriction)
> Impact : complexite dev, experience utilisateur, securite.

**Q3 — Roles et permissions :**
Tous les membres de l'equipe ont-ils les memes droits sur le back-office, ou faut-il des roles differencies (ex: seul un admin peut creer des factures, tout le monde peut voir les projets) ?
> Impact : modele de donnees, UX, complexite.

### Priorite 2 — Bloquent les integrations (a repondre avant Phase 2)

**Q4 — API ClickUp :**
- Avez-vous une API key ClickUp ? (ou faut-il la creer ?)
- Quel est le Workspace ID ?
- Quels espaces/listes doivent etre affiches dans le dashboard ? (tous les projets actifs ? un espace specifique ?)
- Utilisez-vous des custom fields dans ClickUp qu'il faut afficher ?
> Impact : scope de l'integration, complexite API.

**Q5 — API Evoliz :**
- Avez-vous une API key Evoliz ? (ou faut-il la creer ?)
- Quel est le Company ID ?
- Confirmez-vous que le scope read+write est accessible ? (creation de factures depuis le back-office)
- Les donnees de facturation dans Evoliz sont-elles a jour et propres ?
> Impact : scope de l'integration, fiabilite des donnees.

**Q6 — Budget IA mensuel :**
Les 3 agents IA (traduction, creative strategist, deck) consomment des tokens LLM. Quel budget mensuel max pour les APIs IA ?
- < 50$/mois → modeles legers (GPT-4o-mini, Claude Haiku)
- 50-200$/mois → modeles mid (GPT-4o, Claude Sonnet)
- > 200$/mois → modeles premium (GPT-4, Claude Opus)
> Impact : choix de modeles, qualite des outputs.

### Priorite 3 — Bloquent les agents IA (a repondre avant Phase 2 Sprint 2)

**Q7 — Priorite entre les 3 agents IA :**
Dans quel ordre construire les agents ? Proposition basee sur le roadmap :
1. Agent traduction (utilise quotidiennement par l'equipe de 18 langues)
2. Agent creative strategist (utilise par les directeurs creatifs et account managers)
3. Agent deck generator (utilise par les client managers)
> Confirmez ou reordonnez.

**Q8 — Glossaire terminologique :**
L'agent traduction (US-303) a besoin d'un glossaire de termes de marque par langue. Ce glossaire existe-t-il deja ? Si non, qui le produit ? (L'agent peut fonctionner sans, mais avec une qualite reduite.)
> Impact : qualite de l'agent traduction.

**Q9 — Template de presentation :**
L'agent deck generator (US-305) a besoin d'un template de presentation brande Sarani.
- Ce template existe-t-il ? (le deck commercial de 96 slides est mentionne dans project-context.md — est-ce la base ?)
- Format de sortie souhaite : Google Slides / Canva / PowerPoint / PDF ?
> Impact : architecture technique de l'agent, integrations necessaires.

---

## Plan par phase

### Phase 0 — Strategy & Architecture (semaine 1)

**Objectif :** Specs fonctionnelles detaillees, architecture IA, KPIs internes. Repondre aux questions bloquantes restantes.

**Agents :**
| Agent | Mission | Livrable | Dependance |
|-------|---------|----------|------------|
| @product-manager | Specs fonctionnelles back-office (detailler US-301 a US-305 en specs techniques) | `docs/backoffice/functional-specs.md` | Reponses Q1-Q3 |
| @ia | Architecture IA des 3 agents internes (choix modeles, pipelines, prompts systeme) | `docs/backoffice/ai-architecture.md` | Reponses Q6-Q9, functional-specs.md |
| @data-analyst | KPI framework interne (metriques operationnelles, baseline, tracking) | `docs/backoffice/kpi-framework.md` | functional-specs.md |

**Parallelisation :** @product-manager en premier (sequentiel). @ia et @data-analyst en parallele apres reception des specs.

**Checkpoint :** Validation utilisateur des specs + architecture IA avant Phase 1.

**Livrables attendus :**
- `docs/backoffice/functional-specs.md` — specs techniques detaillees par feature
- `docs/backoffice/ai-architecture.md` — choix modeles, pipelines, prompts, fallbacks
- `docs/backoffice/kpi-framework.md` — metriques internes, baseline, events tracking

---

### Phase 1 — Design & UX (semaine 2)

**Objectif :** Parcours utilisateurs internes, wireframes dashboard, design system interne (extension des tokens existants).

**Agents :**
| Agent | Mission | Livrable | Dependance |
|-------|---------|----------|------------|
| @ux | Parcours utilisateurs internes (client manager, designer, traducteur) + wireframes dashboard | `docs/backoffice/user-flows.md`, `docs/backoffice/wireframes.md` | functional-specs.md |
| @design | Extension design system pour le back-office (composants dashboard, tableaux, formulaires) | `docs/backoffice/design-system.md` | wireframes.md, docs/design/design-tokens.json existant |

**Parallelisation :** @ux en premier, puis @design (sequentiel — design depend des wireframes).

**Checkpoint :** Validation utilisateur des wireframes avant dev.

**Livrables attendus :**
- `docs/backoffice/user-flows.md` — parcours par role (client manager, designer, traducteur)
- `docs/backoffice/wireframes.md` — ecrans dashboard, ClickUp, Evoliz, agents IA
- `docs/backoffice/design-system.md` — composants internes, extension des tokens existants

---

### Phase 2 — Development (semaines 3-6)

**Objectif :** Code du back-office complet. 4 sprints.

**Sprint 1 — Foundation + Auth (W3)**
| Agent | Mission | Livrable | Dependance |
|-------|---------|----------|------------|
| @infrastructure | Config auth, env vars (API keys ClickUp/Evoliz), route protection | Config Replit + middleware auth | Reponse Q1-Q2 |
| @fullstack | Dashboard shell + layout + navigation + page auth/login | Code `src/` | infrastructure config, wireframes.md |

**Parallelisation :** @infrastructure et @fullstack en parallele (infra setup pendant que fullstack code le shell).

**Sprint 2 — API Integrations (W4-W5)**
| Agent | Mission | Livrable | Dependance |
|-------|---------|----------|------------|
| @fullstack | ClickUp API integration (US-301) : liste projets, statuts, deadlines, assignes, cache, fallback UI | Code `src/` | API key ClickUp (Q4) |
| @fullstack | Evoliz API integration (US-302) : liste factures, creation facture/devis, statuts paiement, fallback UI | Code `src/` | API key Evoliz (Q5) |

**Parallelisation :** ClickUp et Evoliz peuvent etre developpes en parallele (pas de dependance entre eux). Si un seul agent @fullstack est disponible, sequentiel.

**Sprint 3 — Agents IA (W5-W7)**
| Agent | Mission | Livrable | Dependance |
|-------|---------|----------|------------|
| @ia | Implementation agent traduction (US-303) : pipeline LLM, prompts, interface review | Code `src/` | ai-architecture.md, glossaire (Q8) |
| @ia | Implementation agent creative strategist (US-304) : pipeline LLM, prompts, output structure | Code `src/` | ai-architecture.md |
| @fullstack | UI des agents IA dans le back-office (formulaires input, affichage output, export) | Code `src/` | wireframes.md, @ia pipelines |

**Parallelisation :** @ia code les pipelines pendant que @fullstack code les UI. Coordination necessaire sur les interfaces (input/output formats).

**Sprint 4 — Deck Generator + Polish (W7-W8)**
| Agent | Mission | Livrable | Dependance |
|-------|---------|----------|------------|
| @ia | Implementation deck generator (US-305) : pipeline LLM + integration output (Google Slides/autre) | Code `src/` | ai-architecture.md, template deck (Q9) |
| @fullstack | UI deck generator + integration finale | Code `src/` | @ia pipeline deck |

**Parallelisation :** Sequentiel — @ia d'abord (pipeline), @fullstack ensuite (UI).

---

### Phase 3 — QA & Deploy (semaine 8)

**Objectif :** Tests complets, securite, deploiement.

**Agents :**
| Agent | Mission | Livrable | Dependance |
|-------|---------|----------|------------|
| @qa | Tests E2E back-office : auth, dashboard, ClickUp sync, Evoliz sync, agents IA, fallback states | `docs/backoffice/qa-report.md`, tests dans `src/` | Code Phase 2 complet |
| @infrastructure | Audit securite (auth, API keys, rate limits), monitoring API health, performance | `docs/backoffice/security-audit.md` | Code Phase 2 complet |
| @reviewer | Revue croisee coherence back-office (specs vs code vs design) | `docs/backoffice/cross-review.md` | Tous livrables |

**Parallelisation :** @qa et @infrastructure en parallele. @reviewer apres les deux.

**Go/No-Go back-office (depuis roadmap.md Milestone 3) :**
- [ ] ClickUp integration : donnees temps reel affichees, fallback UI testee
- [ ] Evoliz integration : liste factures affichee, fallback UI testee
- [ ] Agent traduction : review doc 1000 mots en <30s avec inconsistances flaggees
- [ ] Agent deck : deck brande genere en <5 minutes depuis un brief
- [ ] Controle d'acces : dashboard accessible uniquement a l'equipe Sarani
- [ ] Zero P0 bugs

---

### Phase 4 — Launch & Monitoring (semaine 9)

**Objectif :** Mise en production, formation equipe, monitoring.

**Actions :**
1. Deploy back-office en production
2. Formation equipe (guide utilisateur simplifie)
3. Baseline survey coordination time (mesure avant/apres)
4. Monitoring API ClickUp/Evoliz (alertes si down)
5. @orchestrator : synthese finale back-office

**Livrables :**
- `docs/backoffice/user-guide.md` — guide utilisateur interne
- `docs/backoffice/project-synthesis.md` — synthese orchestration back-office

---

## Dependances critiques inter-phases

```
Phase 0 (Specs + Archi IA + KPIs)
    |
    ├── functional-specs.md ──→ Phase 1 (@ux, @design)
    ├── ai-architecture.md ──→ Phase 2 Sprint 3 (@ia)
    └── kpi-framework.md ──→ Phase 3 (@qa verification KPIs)

Phase 1 (Design & UX)
    |
    ├── wireframes.md ──→ Phase 2 tous sprints (@fullstack)
    └── design-system.md ──→ Phase 2 tous sprints (@fullstack)

Phase 2 (Development)
    |
    ├── Sprint 1 (Shell + Auth) ──→ Sprint 2 (APIs)
    ├── Sprint 2 (APIs) ──→ Sprint 3 (Agents IA — contexte projets/clients)
    └── Sprint 3 (Agents IA) ──→ Sprint 4 (Deck — depend du creative strategist)

Phase 3 (QA) ──→ Phase 4 (Launch)
```

---

## Risques identifies

| Risque | Severite | Mitigation |
|--------|----------|------------|
| API ClickUp rate limit | Moyenne | Cache 15min, queue requests, fallback UI |
| API Evoliz indisponible | Moyenne | Fallback manual entry, lien direct Evoliz |
| Agents IA lents (>30s) | Haute | Timeout 30s, UI non-bloquante, spinner + notification |
| Auth trop simple (password partage) | Moyenne | Recommander comptes individuels + IP restriction minimum |
| Glossaire traduction manquant | Faible | Agent fonctionne sans, qualite reduite, flag a l'utilisateur |
| Template deck inexistant | Moyenne | @design cree un template minimal, ou reutilise le deck 96 slides existant |
| Budget IA insuffisant | Haute | Choix modeles adapte au budget, fallback vers modeles legers |

---

## Estimation effort

| Phase | Duree estimee | Agents | Complexite |
|-------|---------------|--------|------------|
| Phase 0 — Strategy & Architecture | 1 session | 3 agents | Moyenne |
| Phase 1 — Design & UX | 1 session | 2 agents | Moyenne |
| Phase 2 — Development | 3-4 sessions | 2-3 agents | Haute |
| Phase 3 — QA & Deploy | 1 session | 3 agents | Moyenne |
| Phase 4 — Launch | 1 session | 1 agent | Faible |
| **Total** | **7-8 sessions** | **8 agents uniques** | **Lourde** |

---

## Statut actuel

| Phase | Statut |
|-------|--------|
| Phase 0 — Strategy & Architecture | EN ATTENTE — reponses Q1-Q9 requises |
| Phase 1 — Design & UX | EN ATTENTE |
| Phase 2 — Development | EN ATTENTE |
| Phase 3 — QA & Deploy | EN ATTENTE |
| Phase 4 — Launch | EN ATTENTE |

**Prochain step :** Repondre aux questions bloquantes Q1-Q9, puis lancer Phase 0.

---

**Handoff → utilisateur**
- Fichier produit : `docs/backoffice/orchestration-plan.md`
- Agents invoques : aucun (phase de planification)
- Decisions prises : plan en 4+1 phases, 8 agents, 7-8 sessions estimees
- Points d'attention : 9 questions bloquantes a repondre avant de demarrer
- Prochaines etapes : repondre aux questions Q1-Q9, puis lancement Phase 0 avec @product-manager
