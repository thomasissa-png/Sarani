# Auto-Brief — Functional Specifications

> **Statut** : Draft v1 — 2026-03-28
> **Agent** : @product-manager
> **Feature** : Auto-Brief (email → ClickUp + brief Sarani + réponse client)
> **Dépendances** : `src/lib/integrations/email.ts`, `src/lib/brief-templates.ts`, ClickUp API, SharePoint, Excel tracker

---

## 1. Overview

L'Auto-Brief transforme automatiquement chaque email client entrant en un brief Sarani complet (format 6 sections emoji) et une réponse client personnalisée — sans action manuelle de Thomas ou du PM.

**Pour qui** : Thomas et les client managers Sarani, qui gèrent en moyenne X projets simultanés et passent du temps significatif à reformuler les briefs clients en format interne.

**Pourquoi maintenant** : L'email import est déjà en place (`src/lib/integrations/email.ts`) et les templates briefs sont définis (`src/lib/brief-templates.ts`). L'infrastructure est prête — cette feature l'active intelligemment.

**Ce que ça change** : Un email client entrant déclenche automatiquement la classification (client vs bruit), le matching ClickUp (projet existant ou nouveau), la génération du brief reformulé en anglais, le calcul des livrables depuis l'Excel tracker, et un draft de réponse client au ton Sarani — le tout soumis à validation en 1 clic avant envoi.

---

## 2. User Stories

### US-AB-01 : Classifier automatiquement les emails entrants

**Persona** : Thomas (fondateur / PM Sarani)
**Epic** : Auto-Brief
**Dépendances** : Aucune
**Priorité RICE** : R=10 I=10 C=8 E=1 → Score=80

#### Job-to-be-done
En tant que Thomas, je veux que le système distingue automatiquement les emails clients des emails de bruit (paiements, newsletters, notifications automatiques) afin de ne traiter que les vrais briefs entrants et réduire le temps de tri à zéro.

#### Critères d'acceptance

**Happy path :**
- [ ] GIVEN un email entrant dont le domaine expéditeur correspond à un client ClickUp existant WHEN le système le reçoit THEN il est classifié `client_brief` avec un score de confiance >= 0.8
- [ ] GIVEN un email contenant des mots-clés brief (projet, brief, deadline, livrables, besoin, can you, we need, could you) WHEN le système l'analyse THEN il est classifié `client_brief`
- [ ] GIVEN un email dont l'expéditeur est `noreply@`, `billing@`, `invoice@`, ou `no-reply@` WHEN le système l'analyse THEN il est classifié `noise` et ignoré sans alerte

**Cas d'erreur :**
- [ ] GIVEN un email dont le score de confiance est entre 0.5 et 0.8 WHEN le système l'analyse THEN il est classifié `uncertain` et mis en file de révision manuelle avec le score affiché
- [ ] GIVEN un email classifié `noise` par erreur WHEN Thomas le reclassifie manuellement en `client_brief` THEN le système met à jour son modèle de classification pour ce domaine expéditeur

**Cas limites :**
- [ ] GIVEN un email vide (sujet uniquement, pas de corps) WHEN le système l'analyse THEN il est classifié `uncertain` + flagué "corps vide"
- [ ] GIVEN un email dont le domaine expéditeur n'est pas dans ClickUp WHEN le système l'analyse THEN il est classifié `new_client_potential` et soumis à validation manuelle avant traitement

**Permissions :**
- [ ] GIVEN utilisateur avec rôle `user` WHEN il accède à la liste des emails classifiés THEN il voit uniquement les emails assignés à ses projets, pas tous les emails

**Données existantes :**
- [ ] GIVEN un email déjà traité (brief déjà généré) WHEN le même email est réimporté THEN le système détecte le doublon via message-id et affiche "Déjà traité — voir brief [ID]" sans créer un second brief

---

### US-AB-02 : Matcher l'email avec un projet ClickUp

**Persona** : Thomas
**Epic** : Auto-Brief
**Dépendances** : US-AB-01
**Priorité RICE** : R=10 I=9 C=8 E=1 → Score=72

#### Job-to-be-done
En tant que Thomas, je veux que le système identifie si l'email correspond à un projet ClickUp existant ou s'il s'agit d'un nouveau projet, afin que le brief soit attaché au bon contexte dès la génération.

#### Critères d'acceptance

**Happy path :**
- [ ] GIVEN un email client dont le domaine correspond à un client ClickUp avec un projet actif WHEN le système le reçoit THEN il propose l'attachement au projet existant avec son nom ClickUp affiché
- [ ] GIVEN un email client sans projet ClickUp correspondant WHEN le système l'analyse THEN il propose la création d'un nouveau projet avec le nom du client pré-rempli

**Cas d'erreur :**
- [ ] GIVEN un client avec 2+ projets actifs dans ClickUp WHEN le système tente le matching THEN il affiche la liste des projets candidats et demande à Thomas de sélectionner le bon

**Cas limites :**
- [ ] GIVEN un email avec plusieurs clients mentionnés (forward d'une chaîne) WHEN le système l'analyse THEN il extrait le client principal (expéditeur original) et signale les autres clients mentionnés

**Permissions :**
- [ ] GIVEN utilisateur `user` WHEN il tente de créer un projet ClickUp depuis l'Auto-Brief THEN l'action est autorisée si le projet est dans sa liste de clients assignés

**Données existantes :**
- [ ] GIVEN un projet ClickUp archivé correspondant au domaine expéditeur WHEN le système le trouve THEN il propose "Nouveau projet" par défaut et signale l'existence du projet archivé

---

### US-AB-03 : Générer automatiquement le brief Sarani

**Persona** : Thomas
**Epic** : Auto-Brief
**Dépendances** : US-AB-01, US-AB-02
**Priorité RICE** : R=10 I=10 C=9 E=1 → Score=90

#### Job-to-be-done
En tant que Thomas, je veux que le système reformule l'email client en brief Sarani complet (6 sections emoji) traduit en anglais, afin que l'équipe de 35 experts reçoive un briefing structuré et actionnable sans intervention de ma part.

#### Critères d'acceptance

**Happy path :**
- [ ] GIVEN un email client classifié `client_brief` WHEN le brief est généré THEN il contient les 6 sections obligatoires (🌟 Introduction/Goal, ✈️ Brief, 🚚 Deliverables, 📍 Source Files, 💬 Branding/Inspirations, ➡️ Others) sans section vide
- [ ] GIVEN un email en français WHEN le brief est généré THEN le brief est entièrement rédigé en anglais (langue de travail Sarani)
- [ ] GIVEN un email avec une demande ambiguë WHEN le brief est généré THEN les zones ambiguës sont marquées `[TO CONFIRM WITH CLIENT]` dans le brief
- [ ] GIVEN un brief généré WHEN Thomas le consulte en preview THEN il peut éditer chaque section individuellement avant validation

**Cas d'erreur :**
- [ ] GIVEN un email trop court (< 20 mots) pour générer un brief complet WHEN le système tente la génération THEN il génère le maximum possible et marque toutes les sections incomplètes `[MISSING — confirm with client]`

**Cas limites :**
- [ ] GIVEN un email contenant des pièces jointes WHEN le brief est généré THEN les pièces jointes sont listées dans 📍 Source Files avec leur nom de fichier
- [ ] GIVEN un email avec une date limite mentionnée WHEN le brief est généré THEN la deadline est extraite et affichée dans une zone "Deadline" dédiée en haut du brief

**Permissions :**
- [ ] GIVEN utilisateur `admin` WHEN il valide un brief THEN il peut créer le projet ClickUp directement depuis l'interface de validation

**Données existantes :**
- [ ] GIVEN un client avec un historique de projets ClickUp WHEN le brief est généré THEN la section 💬 Branding/Inspirations inclut automatiquement le lien vers le brand book stocké dans la fiche client du back-office

---

### US-AB-04 : Calculer automatiquement les livrables depuis l'Excel tracker

**Persona** : Thomas
**Epic** : Auto-Brief
**Dépendances** : US-AB-03
**Priorité RICE** : R=9 I=9 C=7 E=1 → Score=57

#### Job-to-be-done
En tant que Thomas, je veux que le système extraie les types et quantités de livrables depuis les colonnes de l'Excel tracker afin que la section 🚚 Deliverables du brief soit pré-remplie avec précision sans saisie manuelle.

#### Critères d'acceptance

**Happy path :**
- [ ] GIVEN un email mentionnant "150 banners, formats 1080x1080 and 1200x628" WHEN le brief est généré THEN la section 🚚 Deliverables liste "150 banners — 1080x1080 / 1200x628" avec le count exact
- [ ] GIVEN un Excel tracker avec des colonnes "Type", "Quantity", "Format" WHEN le système parse le tracker THEN il mappe ces colonnes vers la section Deliverables sans intervention manuelle

**Cas d'erreur :**
- [ ] GIVEN un email sans mention de quantités ou formats WHEN le brief est généré THEN la section Deliverables affiche `[TO CONFIRM — quantity and formats not specified]`

**Cas limites :**
- [ ] GIVEN un email mentionnant des livrables dans plusieurs langues ("300 vidéos en FR et EN") WHEN le brief est généré THEN les livrables sont listés par langue avec le total par langue ET le total global
- [ ] GIVEN un Excel tracker absent ou inaccessible WHEN le système tente le calcul THEN il génère le brief sans cette donnée et signale "Excel tracker unavailable — deliverables estimated from email"

**Permissions :**
- [ ] GIVEN utilisateur `user` WHEN il édite la section Deliverables THEN les modifications sont sauvegardées mais l'original IA est conservé dans un champ "AI draft" non affiché par défaut

**Données existantes :**
- [ ] GIVEN un projet similaire dans l'historique ClickUp WHEN les livrables semblent sous-estimés THEN le système signale "Similar project [nom] had [X] deliverables — confirm scope"

---

### US-AB-05 : Générer la réponse client au ton Sarani

**Persona** : Thomas
**Epic** : Auto-Brief
**Dépendances** : US-AB-01, US-AB-03
**Priorité RICE** : R=10 I=10 C=9 E=1 → Score=90

#### Job-to-be-done
En tant que Thomas, je veux que le système génère un draft de réponse email au client dans son prénom, dans sa langue, au ton Sarani (dynamique, pro, cool, dispo), afin d'envoyer une confirmation d'intake en moins de 5 minutes sans rédiger manuellement.

#### Critères d'acceptance

**Happy path :**
- [ ] GIVEN un email client en français WHEN la réponse est générée THEN elle est rédigée en français avec le prénom du client utilisé dès la première phrase
- [ ] GIVEN un email client en anglais WHEN la réponse est générée THEN elle est rédigée en anglais — jamais en français
- [ ] GIVEN une réponse générée WHEN Thomas la consulte THEN elle contient : (1) accusé de réception du projet, (2) confirmation de la deadline ou demande de précision si absente, (3) prochaines étapes Sarani, (4) signature Sarani standard
- [ ] GIVEN une réponse approuvée par Thomas WHEN il clique "Send" THEN l'email est envoyé via Resend depuis l'adresse Sarani dédiée avec les en-têtes corrects (Reply-To, Subject avec "Re:")

**Cas d'erreur :**
- [ ] GIVEN un email dont le prénom du client n'est pas identifiable WHEN la réponse est générée THEN elle commence par "Hi [FIRST NAME — please confirm]" avec alerte orange dans l'interface

**Cas limites :**
- [ ] GIVEN un email envoyé depuis une adresse générique (contact@company.com) WHEN la réponse est générée THEN le système utilise le nom de l'entreprise au lieu du prénom : "Hi [Company] team,"
- [ ] GIVEN une réponse client générée WHEN Thomas l'édite THEN les modifications sont sauvegardées et l'original IA est consultable via "Show AI draft"

**Permissions :**
- [ ] GIVEN utilisateur `user` WHEN il tente d'envoyer la réponse THEN l'envoi est possible uniquement si un admin a validé le brief au préalable

**Données existantes :**
- [ ] GIVEN un client avec qui Sarani a déjà travaillé (présent dans ClickUp) WHEN la réponse est générée THEN elle mentionne la relation existante : "Great to hear from you again on this new project"

---

### US-AB-06 : Valider et créer le projet ClickUp depuis le back-office

**Persona** : Thomas
**Epic** : Auto-Brief
**Dépendances** : US-AB-02, US-AB-03, US-AB-05
**Priorité RICE** : R=10 I=9 C=9 E=1 → Score=81

#### Job-to-be-done
En tant que Thomas, je veux valider le brief généré et créer le projet ClickUp en 1 clic depuis l'interface de validation, afin que le projet soit opérationnel pour l'équipe sans changer d'outil.

#### Critères d'acceptance

**Happy path :**
- [ ] GIVEN un brief validé par Thomas WHEN il clique "Create ClickUp project" THEN le projet est créé dans ClickUp avec le nom du client, le brief complet en description, la deadline si détectée, et les livrables comme tâches individuelles
- [ ] GIVEN un projet ClickUp créé WHEN la création réussit THEN le lien ClickUp du projet est affiché dans le back-office et dans la confirmation de validation

**Cas d'erreur :**
- [ ] GIVEN une erreur API ClickUp (rate limit, token expiré) WHEN la création échoue THEN le brief est sauvegardé localement avec statut "ClickUp sync pending" et une alerte rouge dans le dashboard
- [ ] GIVEN un projet ClickUp avec le même nom existant WHEN Thomas tente la création THEN le système affiche "Project [nom] already exists — attach or create new?" avec aperçu du projet existant

**Cas limites :**
- [ ] GIVEN un brief avec 20+ livrables WHEN le projet ClickUp est créé THEN les livrables sont groupés par type (banners / videos / presentations) et non listés individuellement comme 20 tâches séparées
- [ ] GIVEN un projet créé sans deadline WHEN le projet ClickUp est créé THEN la deadline ClickUp est laissée vide (pas de date inventée) et flaguée "TBC"

**Permissions :**
- [ ] GIVEN utilisateur `user` WHEN il accède à la validation THEN il peut éditer le brief mais seul un admin peut déclencher la création ClickUp

**Données existantes :**
- [ ] GIVEN un brief déjà soumis (statut "validated") WHEN Thomas tente de le re-soumettre THEN le système bloque et affiche "Brief already submitted — see ClickUp project [lien]"

---

## 3. Workflow

```
EMAIL REÇU (via email.ts webhook)
        │
        ▼
[CLASSIFICATION IA]
        │
        ├─── noise ──────────────────────► IGNORÉ (archivé)
        │
        ├─── uncertain ──────────────────► FILE MANUELLE
        │                                  (Thomas revisite)
        │
        └─── client_brief ───────────────►
                │
                ▼
        [MATCHING CLICKUP]
                │
                ├─── projet existant ────► Proposer attachement
                │
                ├─── nouveau client ─────► Créer nouveau projet (draft)
                │
                └─── ambigu (2+ projets)► Liste projets candidats → sélection Thomas
                        │
                        ▼
                [GÉNÉRATION BRIEF IA]
                        │
                        ├─ Reformuler en 6 sections emoji (format Sarani)
                        ├─ Traduire en anglais si email non-EN
                        ├─ Extraire deadline
                        ├─ Calculer livrables (email + Excel tracker si dispo)
                        └─ Marquer zones ambiguës [TO CONFIRM WITH CLIENT]
                        │
                        ▼
                [GÉNÉRATION RÉPONSE CLIENT IA]
                        │
                        ├─ Détecter langue expéditeur
                        ├─ Extraire prénom client
                        ├─ Rédiger au ton Sarani
                        └─ Référencer relation existante si client connu
                        │
                        ▼
                [INTERFACE DE VALIDATION — back-office]
                        │
                        ├─ Preview brief (éditable section par section)
                        ├─ Preview réponse client (éditable)
                        ├─ Deadline détectée affichée + confirmation
                        └─ Bouton "Validate & Create ClickUp + Send Reply"
                        │
                        ▼
                [ACTIONS SIMULTANÉES]
                        │
                        ├─ Créer projet ClickUp (API)
                        ├─ Envoyer email réponse (Resend)
                        └─ Archiver email source + brief dans back-office
```

---

## 4. Email Classification

### Règles de classification

| Signal | Poids | Classe cible |
|---|---|---|
| Expéditeur `noreply@`, `billing@`, `invoice@`, `no-reply@`, `notification@` | Éliminatoire | `noise` |
| Objet contient "payment", "invoice", "receipt", "unsubscribe", "newsletter", "auto-reply", "out of office" | Fort | `noise` |
| Domaine expéditeur = domaine client ClickUp connu | Fort | `client_brief` |
| Corps contient >= 2 mots-clés brief : project, brief, deadline, deliverable, we need, can you, could you, asap, urgent, campaign, créer, besoin, livraison, projet | Moyen | `client_brief` |
| Objet contient "Re:" ou "Fwd:" avec thread existant ClickUp | Moyen | `client_brief` (existing project) |
| Domaine inconnu + aucun mot-clé brief | Faible | `uncertain` |
| Signature corporate détectée (titre, entreprise) + demande identifiable | Moyen | `client_brief` |

### Score de confiance

```
score = (poids_domaine × 0.4) + (poids_mots_cles × 0.4) + (poids_structure × 0.2)

score >= 0.8  → client_brief (traitement automatique)
score 0.5-0.8 → uncertain (file manuelle)
score < 0.5   → noise (ignoré)
```

### Exemples concrets

| Email | Classification attendue |
|---|---|
| From: marketing@sony.com / Subject: "New project — Black Friday banners" | `client_brief` (domaine connu + mots-clés) |
| From: noreply@stripe.com / Subject: "Payment confirmed" | `noise` (expéditeur éliminatoire) |
| From: procurement@newcompany.com / Subject: "Agency inquiry" | `uncertain` (domaine inconnu, sujet vague) |
| From: manager@tiktok.com / Subject: "Urgent — 300 videos needed ASAP" | `client_brief` (domaine connu + urgence + quantité) |
| From: info@unknownco.com / Subject: "Hello" / Body: 5 mots | `uncertain` (aucun signal fort) |

---

## 5. Brief Generation

### Pipeline de reformulation IA

Le brief n'est **jamais un copier-coller** de l'email. Le système reformule, structure, et enrichit le contenu selon le processus suivant :

**Étape 1 — Extraction**
- Nom du client et de l'entreprise
- Contexte du projet (campaign, produit, événement)
- Type de livrables mentionnés (design, video, translation, other)
- Quantités et formats si précisés
- Deadline (date absolue, délai relatif, "ASAP", absent)
- Liens ou fichiers joints
- Contraintes spécifiques (langue, marché, ton, taille)

**Étape 2 — Reformulation**
- Réécrire le contexte en langage Sarani : direct, professionnel, actionnable
- Éliminer les formules de politesse inutiles de l'email
- Structurer les informations dans l'ordre logique pour un exécutant
- Marquer `[TO CONFIRM WITH CLIENT]` toute information ambiguë ou manquante

**Étape 3 — Traduction**
- Si l'email source est en français → brief généré en anglais
- Si l'email source est dans une autre langue → brief en anglais + note "Original brief in [langue]"
- Le brief est TOUJOURS en anglais (langue de travail de l'équipe Sarani internationale)

**Étape 4 — Calcul des livrables**
- Parser les quantités depuis l'email (regex + IA)
- Si Excel tracker disponible : matcher les colonnes Type/Quantity/Format
- Grouper par type : `design`, `video`, `translation`, `presentation`, `other`
- Calculer le total par type et le total global

### Template 6 sections (format Sarani)

```
🌟 Introduction / Goal:
[Client name — project name — campaign context — purpose — target audience]
[1-3 phrases max. Direct et factuel.]

✈️ Brief:
[Description complète et reformulée du projet. Ce que doit faire l'équipe,
pour quel marché, avec quelles contraintes. Pas de paraphrase de l'email —
c'est la version Sarani structurée.]
[Zones ambiguës marquées [TO CONFIRM WITH CLIENT]]

🚚 Deliverables:
[Liste structurée par type :]
- [Type] × [Quantity] — [Formats] — [Languages if applicable]
Total: [X] assets

[Si deadline détectée :]
⏰ Deadline: [Date / "ASAP" / "TBC — to confirm with client"]

📍 Source Files:
[Liens SharePoint "Anyone" obligatoires]
[Pièces jointes nommées]
[Si aucun lien : "No source files provided — to request from client"]

💬 Branding / Inspirations:
[Lien brand book depuis fiche client back-office si disponible]
[Références visuelles mentionnées dans l'email]
[Contraintes de couleurs/fonts si mentionnées]
[Si aucun : "No branding provided — check client file in back-office"]

➡️ Others:
[Naming convention si mentionnée]
[Marchés/langues spécifiques]
[Contraintes techniques ou légales]
[Instructions spéciales]
[Si rien : "No additional instructions"]
```

### Prompt système (base)

```
You are the Sarani Project Manager. You receive a client email and must produce a complete Sarani brief.

Rules:
1. NEVER copy-paste from the email. Rewrite and structure.
2. The brief is ALWAYS in English, regardless of the email language.
3. Use the exact 6-section Sarani format with emoji headers.
4. Mark ambiguous or missing information as [TO CONFIRM WITH CLIENT].
5. Be direct and actionable — write for a senior designer/video editor who needs to start working immediately.
6. Extract exact deliverable quantities and formats. If not specified, write [TO CONFIRM — quantity/formats not specified].
7. Deadline: extract exact date if mentioned. If "ASAP" → write "ASAP". If none → write "TBC — to confirm with client".

Context about Sarani: international creative agency, 35 experts, 24/7 delivery, clients include Sony, TikTok, Adidas, GEODIS.

Client email:
---
{email_body}
---

Client name (from ClickUp or email signature): {client_name}
Client history (previous projects): {client_history}
Brand book link (from back-office): {brand_book_url}
Excel tracker data: {tracker_data}
```

---
