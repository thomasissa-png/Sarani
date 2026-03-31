# Arya — Protocoles opérationnels

*Produit par @product-manager — 2026-03-31*

> Arya travaille en binôme avec une PM humaine. Chaque protocole a des gates de validation ⏸️ où la PM humaine valide avant de continuer.

### Gestion des erreurs API (transversal)

Si un appel API échoue (timeout, erreur serveur, rate limit), Arya :
1. Log l'erreur avec le contexte (endpoint, paramètres, code d'erreur)
2. Signale à la PM avec une explication claire ("L'appel à ClickUp a échoué — timeout après 30s")
3. Propose une alternative manuelle ("Tu peux créer la tâche directement dans ClickUp en attendant")
4. Ne retente PAS en boucle sans supervision

### Règle anti-hallucination (transversal)

**Chaque chiffre de performance cité** (%, montant, volume, résultat) DOIT être sourcé depuis le tracker Excel client, un document client valide, ou project-context.md. Si aucune donnée factuelle n'est disponible → marquer `[DONNÉE À CONFIRMER PAR THOMAS]`. Ne JAMAIS inventer de métrique.

---

## Vue d'ensemble

| Protocole | Trigger | Output | Durée estimée |
|-----------|---------|--------|---------------|
| PROTO-EMAIL-INTAKE | Email reçu sur team@sarani.studio | Brief structuré + projet créé | 5-10 min |
| PROTO-CLIENT-REPLY | Besoin de répondre à un client | Brouillon email Outlook | 2-3 min |
| PROTO-ASSET-REVIEW | Assets uploadés sur SharePoint | Rapport d'anomalies + statut ClickUp | 5-15 min |
| PROTO-QUOTE | Devis demandé | PDF devis premium | 5-10 min |
| PROTO-PROJECT-FOLLOWUP | Scan quotidien / relance | Drafts de relance | 5 min |
| PROTO-AI-TEAM | Brief faisable par IA | Livrables complets à 10/10 | 30-60 min |
| PROTO-PITCH | Pitch/présentation client | Deck de pitch | 20-30 min |

## Mode binôme PM humaine

Arya fait le travail. La PM humaine valide. Le symbole ⏸️ marque les points de validation humaine.

**Principes** :
- Arya ne fait RIEN d'irréversible sans validation (pas d'envoi email, pas de mise à jour ClickUp, pas de livraison client)
- Si la PM valide → Arya continue
- Si la PM corrige → Arya intègre et repropose
- Si la PM refuse → Arya escalade à @moi

---

## PROTO-EMAIL-INTAKE — Email reçu → Brief structuré

**Trigger** : Nouvel email sur team@sarani.studio
**Endpoint** : POST /api/admin/emails/classify + POST /api/admin/emails/[id]/import

### Étapes

1. **Classifier l'email** → POST /api/admin/emails/classify
   - client_brief → continuer le protocole
   - client_followup → rediriger vers PROTO-CLIENT-REPLY
   - noise → archiver automatiquement
   - new_client_potential → ⏸️ VALIDATION PM ("Nouveau prospect. Traiter ?")

2. **Matcher le client** → identification par domaine email
   - Client connu → charger le contexte (brand guidelines, tarifs, historique)
   - Client inconnu → ⏸️ VALIDATION PM ("Client non reconnu. Créer fiche client ?")

3. **Extraire et structurer le brief** → 6 sections Sarani (🌟✈️🚚📍💬➡️)
   - ⏸️ VALIDATION PM — "Voici le brief structuré. Corrections ?"
   - Critères : toutes les 6 sections remplies, deadline identifiée, 0 donnée inventée

4. **Brief-check IA** → POST /api/admin/brief-check
   - Si gaps détectés → préparer un draft de questions au client (PROTO-CLIENT-REPLY)
   - ⏸️ VALIDATION PM — "Le brief a X gaps. Envoyer les questions au client ?"

5. **Créer le projet** → ClickUp + SharePoint + Excel
   - Tâche ClickUp avec statut "Open", custom fields remplis
   - Dossier SharePoint dans l'arborescence client
   - Ligne ajoutée au tracker Excel
   - ⏸️ VALIDATION PM — "Projet créé. Confirmer ?"

**Output** : Brief structuré dans docs/pm/briefs/ + projet créé dans les 3 systèmes

---

## PROTO-CLIENT-REPLY — Réponse email client

**Trigger** : Email client nécessitant une réponse
**Endpoint** : POST /api/admin/emails/draft

### Étapes

1. **Analyser le contexte** → lire l'email, l'historique du projet ClickUp, les livrables en cours
2. **Rédiger le brouillon** au ton Sarani (miroir registre client, prénom, dynamique/pro/cool)
   - ⏸️ VALIDATION PM — "Voici le brouillon. Ajuster le ton ? Le contenu ?"
   - Critères : prénom du client, ton miroir, 0 donnée inventée, action claire
3. **Créer le draft Outlook** → POST /api/admin/emails/draft
   - La PM ouvre le lien Outlook, relit, et clique "Envoyer"

**Output** : Brouillon dans Outlook, prêt à envoyer

---

## PROTO-ASSET-REVIEW — Revue de livrables

**Trigger** : Assets uploadés dans le dossier SharePoint du projet
**Endpoint** : SharePoint Graph API (lecture fichiers)

### Étapes

1. **Scanner les assets** → lister les fichiers dans le dossier du projet SharePoint
2. **Vérifier vs le brief** → comparer :
   - Dimensions et formats attendus vs livrés
   - Nombre de livrables vs demandés
   - Langues/versions vs spécifiées dans le brief
3. **Détecter les anomalies** → rapport structuré :
   - ✅ Conforme : fichier X — dimensions OK, format OK
   - ❌ Anomalie : fichier Y — dimensions 728x90 attendu, reçu 600x400
   - ⚠️ Manquant : version FR non livrée
   - ⏸️ VALIDATION PM — "Voici le rapport de revue. Valider pour envoi au client ou retour designer ?"
4. **Mettre à jour ClickUp** → statut Internal Review → Client Review (si OK) ou retour au designer avec commentaires

**Output** : Rapport de revue dans docs/pm/asset-reviews/ + statut ClickUp mis à jour

---

## PROTO-QUOTE — Génération de devis

**Trigger** : Demande de devis pour un client/projet
**Endpoint** : POST /api/admin/quotes/prefill + POST /api/admin/quotes

### Étapes

1. **Identifier le client et le projet** → lookup dans le tracker Excel
2. **Récupérer les tarifs** → Excel tracker du client (colonne prix)
   - Si tarif trouvé → utiliser
   - Si tarif NON trouvé → STOP, marquer [PRIX À CONFIRMER PAR THOMAS], escalader à @moi
3. **Pré-remplir le devis** → POST /api/admin/quotes/prefill
   - Purpose of Work : 2 phrases (compréhension + livrables)
   - Line items depuis le brief
   - TVA auto si client français
   - ⏸️ VALIDATION PM — "Voici le devis pré-rempli. Prix corrects ? Scope complet ?"
4. **Générer le PDF** → POST /api/admin/quotes
   - PDF premium Sarani
   - Upload SharePoint
   - ⏸️ VALIDATION PM — "PDF généré. Envoyer au client ?"
5. **Préparer l'email d'envoi** → PROTO-CLIENT-REPLY avec le devis en pièce jointe

**Output** : PDF devis dans SharePoint + brouillon email Outlook

---

## PROTO-PROJECT-FOLLOWUP — Scan quotidien et relances

**Trigger** : Scan quotidien (cron ou invocation manuelle)
**Endpoint** : ClickUp API (lecture tâches + filtres)

### Étapes

1. **Scanner ClickUp** pour détecter les alertes :
   - 🔴 Deadlines < 24h sans review complétée
   - 🟠 Projets en "Client Review" depuis > 48h sans réponse client
   - 🟡 Projets sans update depuis > 5 jours (tous statuts sauf Closed/Invoiced)

2. **Pour chaque alerte** → préparer un draft de relance adapté :
   - Deadline proche → relance interne (designer/équipe) avec rappel deadline
   - Client Review en attente → relance client polie avec rappel du contexte
   - Projet dormant → relance interne + notification PM
   - ⏸️ VALIDATION PM — "Voici les X alertes du jour avec les drafts de relance. Envoyer lesquels ?"

3. **Exécuter les relances validées** → PROTO-CLIENT-REPLY pour chaque relance approuvée

**Output** : Liste d'alertes quotidienne + drafts de relance prêts à envoyer

---

## PROTO-AI-TEAM — Brief faisable par IA → Livrables complets

**Trigger** : Brief identifié comme faisable par l'équipe IA interne
**Endpoint** : POST /api/admin/teams + POST /api/admin/teams/[id]/steps/[stepId]/execute (step par step)

### Triage IA vs Humain

| Type de livrable | Exécuteur | Pourquoi |
|------------------|-----------|----------|
| Contenu texte (social posts, SEO, traduction) | IA | Templates + quality gates automatisables |
| Design sur-mesure Figma | Humain | Créativité visuelle, outils Figma non accessibles |
| Vidéo script / storyboard | IA | Structurable via templates + brief |
| Bannières à partir de templates | IA | Déclinaison automatisable |
| Motion design / animation | Humain | Outils spécialisés (After Effects, etc.) |
| Stratégie / positionnement | IA (@creative-strategy) | Raisonnement structuré |

### Étapes

1. **Sélectionner le template d'équipe** → basé sur le type de brief (social pack, SEO batch, traduction, etc.)
2. **Créer l'équipe IA** → POST /api/admin/teams avec les agents nécessaires (ex: @copywriter + @seo + @design)
3. **Lancer l'exécution step par step** → POST /api/admin/teams/[id]/steps/[stepId]/execute pour chaque step
   - Chaque agent produit son livrable dans l'ordre des dépendances (step 1 avant step 2, etc.)
   - Entre chaque step : review automatique via quality gates
4. **Quality gates par type** → référence `src/lib/teams/quality-gates.ts`, fonction `buildGatesPrompt(templateType)`
   - `social_media` : SM-1 à SM-7 (hook <150 chars, CTA explicite, format plateforme, 0 jargon, hashtags calibrés, ton brief, 0 placeholder)
   - `seo_content` : SEO-1 à SEO-7 (keyword H1/meta/intro, meta title 50-60 chars, structure Hn, longueur ±10%, liens internes/externes, intro <100 mots, 0 contenu générique)
   - `translation` : TR-1 à TR-5 (0 artefact littéral, adaptation culturelle, termes cohérents, format préservé, brand voice)
   - `brand_identity` : DS-1 à DS-6 (brief créatif complet, hiérarchie visuelle, CTA lisible, brand guidelines, déclinaisons cohérentes, texte lisible)
   - `video_production` : VD-1 à VD-7 (hook 3s, durée conforme, structure HOOK/BODY/CTA, direction visuelle, CTA unique, oral, sous-titres séparés)
   - `ad_campaign` : AD-1 à AD-5 (headline ≤30 chars, value prop, CTA verbe, variantes A/B, alignement LP)
   - Verdict : **ALL GATES PASS** → continuer / **REVISION NEEDED** → itérer
5. **Itération si gates FAIL** → relance de l'agent avec feedback des gates (max 3 tours)
   - Tour 1 : correction ciblée sur les gates FAIL
   - Tour 2 : correction + review croisée par un second agent
   - Tour 3 : si toujours FAIL → escalade à @moi
6. **Package final** → ⏸️ VALIDATION PM — "Voici le package complet (ALL GATES PASS). Valider pour livraison client ?"
7. **Livraison** → upload SharePoint + mise à jour ClickUp + draft email client (PROTO-CLIENT-REPLY)

**Output** : Package de livrables complet à 10/10 dans le dossier SharePoint du projet

---

## PROTO-PITCH — Pitch et présentations client

**Trigger** : Pitch ou présentation demandée (nouveau client, upsell, appel d'offres)
**Endpoint** : POST /api/admin/agents/presentation/generate

### Étapes

1. **Rechercher les case studies pertinentes** → filtrer par secteur client, type de projet, budget comparable
   - Sources : portfolio Sarani, résultats passés documentés, témoignages clients
   - Si aucune case study pertinente → ⏸️ VALIDATION PM ("Pas de case study pour ce secteur. Continuer sans ?")

2. **Structurer le pitch** → framework standard Sarani :
   - **Problème** : reformulation de la douleur client (depuis le brief ou l'email initial)
   - **Solution** : approche Sarani spécifique à ce problème
   - **Preuves** : case studies, chiffres, témoignages
   - **Pricing** : estimation ou fourchette (tarifs depuis Excel tracker, sinon [PRIX À CONFIRMER PAR THOMAS])
   - **Next steps** : timeline proposée + actions immédiates

3. **Collaboration @creative-strategy** → enrichir le positionnement et les angles de différenciation
   - @creative-strategy apporte : analyse concurrentielle rapide, angles de conviction, tone of voice adapté au prospect

4. **Générer le deck** → POST /api/admin/agents/presentation/generate
   - ⏸️ VALIDATION PM — "Voici le deck de pitch (X slides). Ajustements ?"

5. **Préparer l'envoi** → PROTO-CLIENT-REPLY avec le deck en pièce jointe ou lien de présentation

**Output** : Deck de pitch dans docs/pm/presentations/ + brouillon email Outlook

---

## Intégration back-office — État des endpoints

| Protocole | Endpoints existants ✅ | Endpoints à créer ❌ |
|-----------|----------------------|---------------------|
| EMAIL-INTAKE | classify ✅, import ✅, brief-check ✅, create-project ✅ | — |
| CLIENT-REPLY | draft ✅ | — |
| ASSET-REVIEW | SharePoint read ✅ | Asset comparison endpoint ❌ |
| QUOTE | prefill ✅, generate ✅ | — |
| PROJECT-FOLLOWUP | ClickUp read ✅ | Cron/scan endpoint ❌ |
| AI-TEAM | teams CRUD ✅, execute ✅ | Auto-review loop ❌ |
| PITCH | presentation/generate ✅ | Case study search ❌ |

### Endpoints à développer (backlog @fullstack)

1. **Asset comparison endpoint** — POST /api/admin/assets/compare
   - Input : brief_id + dossier SharePoint
   - Output : rapport de conformité (dimensions, formats, nombre, langues)
   - Priorité : haute (PROTO-ASSET-REVIEW bloqué sans)

2. **Cron/scan endpoint** — POST /api/admin/projects/scan
   - Input : filtres (deadline_within, no_update_since, status)
   - Output : liste d'alertes structurées avec contexte projet
   - Priorité : moyenne (PROTO-PROJECT-FOLLOWUP faisable manuellement via ClickUp)

3. **Auto-review loop** — POST /api/admin/teams/[id]/review-loop
   - Input : team_execution_id + quality_gates_config
   - Output : score par gate + feedback structuré + relance auto si < seuil
   - Priorité : haute (PROTO-AI-TEAM limité sans boucle automatique)

4. **Case study search** — GET /api/admin/case-studies/search
   - Input : sector, project_type, budget_range
   - Output : case studies triées par pertinence
   - Priorité : basse (PROTO-PITCH faisable avec recherche manuelle)

---

## Handoff

**Destinataires** : @fullstack (endpoints à créer), @client-manager (implémentation des protocoles), @moi (validation stratégique)

**Livrables produits** :
- `docs/pm/arya-protocols.md` — ce fichier

**Décisions clés** :
- 7 protocoles couvrent 100% des workflows opérationnels d'Arya
- Mode binôme PM humaine avec gates ⏸️ systématiques — Arya ne fait rien d'irréversible seule
- 4 endpoints manquants identifiés, dont 2 haute priorité (asset comparison, auto-review loop)
- Triage IA vs Humain documenté pour PROTO-AI-TEAM

**Prochaines étapes** :
- @fullstack → développer les 4 endpoints manquants (asset comparison en premier)
- @client-manager → implémenter les protocoles dans son workflow opérationnel
- @moi → valider le mode binôme PM humaine et les seuils d'escalade
