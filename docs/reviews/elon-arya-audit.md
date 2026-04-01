# Audit Arya — Avis Elon

> AVIS CONSULTATIF — 2026-04-01

## Score Arya : 5/10

Arya est un classificateur d'emails avec un joli skin de PM. Ce n'est pas une PM. La question "est-ce que je peux virer ma PM humaine et la remplacer par Arya" -- la reponse est non. Pas encore. Voici pourquoi.

---

## Les 3 plus gros gaps

### 1. Arya ne FAIT rien -- elle prepare et attend

Une vraie PM ne se contente pas de reformuler un email en brief. Elle cree la task ClickUp, assigne la bonne personne, verifie que le dossier SharePoint existe, met a jour le tracker, et SUIT le projet. Arya s'arrete a "voici un beau brief, Thomas valide ?". Ca reste 80% du travail sur les epaules de Thomas.

Le bouton "Execute" dans CreateBriefModal est un bon debut -- mais il devrait etre le DEFAUT, pas l'exception. Et apres l'execution, Arya devrait verifier que tout est ok (task creee, folder existe, Excel mis a jour) et signaler les echecs. Aujourd'hui elle fire-and-forget.

### 2. Arya ne comprend pas le contexte -- elle traite chaque email comme le premier

Quand Marc de Sony ecrit "les corrections du deck", Arya devrait savoir : quel deck, quelle version, qui travaille dessus, quelle est la deadline. Au lieu de ca, elle cherche un "clickupProjectHint" par string match. C'est du pattern matching des annees 90, pas de l'IA.

La knowledge base existe (knowledge-loader.ts, team-knowledge-loader.ts) mais elle n'est pas injectee dans les prompts de classification et d'extraction. Arya a de la memoire mais elle ne l'utilise pas au moment critique.

### 3. Les crons qui cassent silencieusement = Arya qui fait la morte

BASE_URL renomme en INTERNAL_URL = plus rien ne tourne. Aucun health check, aucune alerte. Thomas a decouvert le probleme parce que "les draft replies etaient vides". C'est comme si ta PM arretait de travailler et ne prevenait personne. Un system critique sans monitoring, c'est un systeme qui n'existe pas.

---

## Les 3 quick wins

### 1. Auto-execute par defaut, review en exception

Inverser le flow : Arya execute automatiquement (ClickUp task + SharePoint + Excel + draft reply) et Thomas recoit un resume a valider/corriger. Au lieu de "Review brief → Execute", c'est "Arya a fait X, Y, Z — tu valides ?". Ca transforme Thomas de producteur en superviseur. Gain : 80% du temps de Thomas sur chaque email.

### 2. Health check + alerte pour les crons

Un endpoint `/api/admin/health` qui verifie : poll-emails tourne ? Dernier poll < 10 min ? LLM repond ? ClickUp API ok ? Afficher un bandeau rouge en haut de l'inbox si quelque chose est casse. Cout : 2h de dev. Gain : plus jamais "pourquoi ca marche plus" sans savoir pourquoi.

### 3. Injecter la knowledge dans les prompts

Les loaders existent deja. Il manque 5 lignes : injecter `buildClientKnowledgePrompt()` dans `CLASSIFICATION_SYSTEM_PROMPT` et `BRIEF_EXTRACTOR_SYSTEM_PROMPT`. Arya passera de "c'est un email Sony" a "c'est un email de Marc chez Sony Music France, il travaille avec Fanny, ses projets sont dans le space Sony, il aime les retours rapides". Cout : 1h. Gain : briefs 3x plus pertinents.

---

## Vision : Arya 10/10

Une PM IA parfaite, c'est l'inverse de ce qu'on a. Thomas ne devrait JAMAIS ouvrir l'inbox pour traiter un email. Il l'ouvre pour verifier qu'Arya fait bien son travail.

**Arya 10/10 :**
- Recoit l'email → classifie → cree le brief → cree la task ClickUp → cree le dossier SharePoint → met a jour le tracker → assigne le bon designer → envoie le draft reply → marque in_progress. Tout ca en 30 secondes.
- Thomas recoit un digest : "3 nouveaux projets traites, 2 feedbacks ajoutes sur ClickUp, 1 enquiry en attente de ta validation (prospect nouveau)". Il valide en 1 clic.
- Quand le designer finit, Arya detecte le changement ClickUp, prepare le draft de livraison client, et notifie Thomas.
- Quand le client repond avec du feedback, Arya l'ajoute directement sur la task ClickUp, rouvre la task, et notifie le designer.
- Zero inbox pour Thomas. L'inbox devient un dashboard de supervision, pas une todo list.

C'est le meme principe que chez Tesla : l'usine qui fait l'usine. Arya n'est pas le produit -- c'est la machine qui fait tourner la production. Et aujourd'hui cette machine demande a Thomas d'appuyer sur chaque bouton manuellement.

---

## Recommandations (par impact)

| # | Action | Impact | Agent |
|---|---|---|---|
| 1 | Inverser le flow : auto-execute + validation async | Transforme Arya de "preparatrice" en "executrice" | @fullstack + @product-manager |
| 2 | Health check crons + bandeau alerte inbox | Plus jamais de panne silencieuse | @fullstack |
| 3 | Injecter knowledge dans classifier + brief + feedback | Arya connait ses clients | @fullstack |
| 4 | Webhook ClickUp → detect task done → prepare draft livraison | Arya suit le projet jusqu'au bout | @fullstack + @ia |
| 5 | Digest quotidien (email ou Lark) des actions Arya | Thomas supervise, il ne produit plus | @fullstack |

La question fondamentale : est-ce qu'on construit un outil pour aider une PM, ou est-ce qu'on construit une PM ? Aujourd'hui c'est le premier. Pour atteindre 10M a 20% EBITDA avec 35 personnes, il faut le deuxieme. Chaque minute que Thomas passe a cliquer sur "Create Brief" c'est une minute qu'il ne passe pas a signer de nouveaux clients.

---

**Handoff → @orchestrator**
- Fichier produit : `docs/reviews/elon-arya-audit.md`
- Avis : Arya = 5/10. Classificateur solide, PM inexistante. Le gap #1 est l'absence d'auto-execution.
- Points d'attention : les 5 recommandations sont des AVIS a evaluer. La reco #1 (auto-execute) est un changement de paradigme qui impacte @product-manager (specs) et @fullstack (implementation). Valider avec Thomas avant de lancer.
- Rappel : ces recommandations sont des AVIS, pas des directives. Thomas decide.
