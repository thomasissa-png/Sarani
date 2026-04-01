# Audit Arya v2 — Avis Elon

> AVIS CONSULTATIF — 2026-04-01 (post-Session 12)

## Score Arya : 5.5/10

Le code est a 7.5 (QA), les prompts a 8-9.5 (audit Arya). Mais la question de Thomas c'est pas "le code est-il propre" — c'est "est-ce que je peux virer ma PM humaine et la remplacer par Arya ?". Reponse : non. Arya est un pipeline d'extraction, pas une PM. Elle transforme de l'information — elle ne prend aucune decision. Le 0.5 de plus vs la v1 c'est le LLM brief qui marche maintenant (S12 fix), le feedback extractor qui comprend les liens SharePoint, et le filtre Sarani emails. Des fixes, pas de la vision.

---

## Les 3 plus gros gaps (calibres sur les frustrations de Thomas)

### 1. Arya prepare — elle ne DECIDE pas

Quand Sony envoie 300 fichiers pour demain, une PM humaine dit : "Impossible en D+1 avec l'equipe actuelle, je propose de livrer les 1200x628 demain et le reste en J+2, j'assigne Maria qui a fait les 3 derniers Sony." Arya extrait des champs JSON et attend un clic. Thomas doit reconstituer le raisonnement lui-meme.

La knowledge base existe (loaders, token caps, tout le pipeline). Mais elle n'est PAS injectee dans les prompts critiques (classifier, brief-extractor, feedback-extractor). Arya a de la memoire mais ne l'utilise pas. C'est un cerveau deconnecte de ses yeux.

### 2. Le workflow est a l'envers — Thomas produit, Arya assiste

Aujourd'hui : email → ouvrir modal → lire brief → selectionner client → entity dropdown → assignee → confirmer → execute. C'est 6-8 clics par email, 30-50 emails/jour = 200+ clics de friction quotidiens. Thomas a dit en S10 : "inbox de validation, pas panneau de controle". Deux sessions plus tard, c'est toujours un panneau de controle.

Le flow correct : Arya execute automatiquement (brief + ClickUp + SharePoint + tracker + draft reply) et Thomas recoit un resume : "3 projets crees, 2 feedbacks postes — valider ou ajuster." Il passe de producteur a superviseur.

### 3. Les pannes silencieuses tuent la confiance

BASE_URL → INTERNAL_URL = zero cron pendant une duree inconnue. Thomas l'a decouvert en testant manuellement ("draft reply est vide"). Pas d'alerte, pas de health check, pas de bandeau rouge. C'est comme une PM qui arrete de bosser sans prevenir. Chaque panne silencieuse detruit la confiance — et sans confiance, Thomas ne laissera jamais Arya agir seule. C'est un cercle vicieux.

---

## Les 3 quick wins

### 1. Auto-execute pour les cas evidents — inverser le paradigme

Si confidence > 0.95 ET client connu ET mapping ClickUp resolu : executer automatiquement et mettre en "pending_review". La PM valide au lieu de configurer. C'est le meme passage que Tesla a fait en passant de "l'humain assemble" a "le robot assemble, l'humain supervise". Gain : -70% du temps de traitement inbox.

### 2. "Arya Recommends" en tete de chaque modal

Aujourd'hui le modal montre des champs vides a remplir. Demain il montre : "Client: Sony (15 projets) | Assignee recommande: Maria | Urgence: HAUTE (deadline demain) | Action recommandee: executer maintenant." La PM lit 3 lignes, valide ou ajuste. C'est la difference entre un GPS qui te montre une carte blanche et un GPS qui te dit "tournez a droite dans 200m".

### 3. Health check + bandeau alerte

Un endpoint `/api/admin/health` : poll-emails OK ? Dernier poll < 10 min ? LLM repond ? ClickUp API OK ? Bandeau rouge en haut de l'inbox si un cron est mort. Thomas ne decouvre plus les pannes en testant manuellement. Cout : 2h. Gain : confiance = capacite a deleguer.

---

## Vision : Arya 10/10

Thomas ouvre l'inbox le matin. Il voit :

> "Bonjour Thomas. Cette nuit : 5 emails traites. 2 briefs Sony crees et assignes a Maria (deadline demain 18h). 1 feedback TikTok poste sur ClickUp, task reouverte. 1 enquiry prospect — je recommande de repondre, draft pret. 1 email archive (newsletter). Charge equipe : design 85%, video 30%. Alerte : deadline GEODIS dans 24h, on est a 60%."

Thomas valide les 2 briefs en 10 secondes. Ajuste le draft enquiry. Voit l'alerte GEODIS et decide de decaler. Total : 3 minutes au lieu de 45.

C'est le principe de l'usine qui fait l'usine. Arya n'est pas le produit — c'est la machine qui fait tourner la production. Et la capacite a produire vite et bien est plus importante que n'importe quel brief individuel.

---

## Recommandations (par impact)

| # | Action | Impact | Agent |
|---|---|---|---|
| 1 | Auto-execute + review async (inverser le flow) | Divise par 3-5x le temps inbox de Thomas | @product-manager → @fullstack |
| 2 | "Arya Recommends" header dans chaque modal | La PM valide au lieu de reconstituer | @fullstack + @ia |
| 3 | Health check crons + bandeau alerte inbox | Zero panne silencieuse = confiance = delegation | @fullstack |
| 4 | Injecter knowledge dans classifier + brief + feedback | Arya connait ses clients, pas juste leurs emails | @ia + @fullstack |
| 5 | Daily digest automatique (resume + alertes + charge equipe) | Thomas supervise au lieu de scanner | @fullstack + @ia |

---

Le mot de la fin : chaque minute que Thomas passe a cliquer sur "Create Brief" c'est une minute qu'il ne passe pas a signer de nouveaux clients. Pour atteindre 10M a 20% EBITDA, Thomas doit deleguer 80% de l'ops a Arya. Aujourd'hui on est a 20%. Le gap n'est pas technique — les prompts sont bons, le code tourne. Le gap est conceptuel : Arya est un PIPELINE (email → extraction → affichage → clic → action) alors qu'elle doit devenir un AGENT (email → analyse → decision → action → supervision humaine).

Si j'etais toi, lundi matin : specifier le mode auto-execute avec @product-manager. C'est la recommandation #1 et elle debloque tout le reste.

---

**Handoff → @orchestrator**
- Fichier produit : `docs/reviews/elon-arya-audit.md`
- Avis : Arya 5.5/10 comme PM (7.5 comme code). 3 gaps : pas de decision, workflow inverse, pannes silencieuses
- Recommandations : 5 actions, #1 = auto-execute mode (changement de paradigme)
- Agents concernes : @product-manager (specifier le flow auto-execute), @fullstack (implementer), @ia (enrichir les prompts avec knowledge)
- Rappel : ces recommandations sont des AVIS, pas des directives. Thomas decide.
