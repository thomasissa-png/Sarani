# Arya — Specs v2 : Actions 2-5

*Produit par @product-manager — 2026-03-31*

> Specs détaillées pour les 4 prochaines actions d'Arya : retours clients (PROTO-CLIENT-RETURN), classification enrichie, activation automatique, learning journal.
> Référence amont : `docs/pm/arya-protocols.md` (7 protocoles existants), `src/app/api/admin/emails/classify/route.ts` (classification actuelle).

---

## Action 2 — PROTO-CLIENT-RETURN (8e protocole)

### Contexte

Quand un client répond à un email sur un projet existant (feedback, demande de correction, validation), Arya doit automatiquement matcher le projet, rouvrir si nécessaire, extraire le feedback, et dispatcher aux experts concernés.

### User Stories

**US-2.1 — Match projet par conversationId**
```
Given un email classifié "client_followup" par Arya
When l'email a un conversationId Microsoft Graph
Then Arya cherche dans la DB un projet lié à ce conversationId
And retourne le projet matché avec son clickupTaskId
```

**US-2.2 — Match projet par fallback (domain + sujet)**
```
Given un email classifié "client_followup" sans conversationId connu en DB
When le domaine expéditeur et le sujet sont disponibles
Then Arya extrait le domaine client, compare le sujet avec les noms de projets ClickUp actifs (statuts Open → Client Review)
And retourne le meilleur match (score de similarité > 0.6) ou { matched: false }
```

**US-2.3 — Réouverture automatique**
```
Given un projet matché avec statut "Approved", "Invoiced" ou "Closed"
When le feedback client implique du travail supplémentaire (corrections, nouvelles demandes)
Then Arya propose de réouvrir le projet (statut → In Progress)
And ⏸️ VALIDATION PM — "Projet [nom] est [statut]. Rouvrir en In Progress ?"
```

**US-2.4 — Extraction et dispatch du feedback**
```
Given un projet matché et un email de retour client
When Arya analyse le contenu de l'email
Then elle extrait les items de feedback structurés (corrections demandées, validations, questions)
And identifie les experts concernés (designer si feedback visuel, copywriter si feedback texte, etc.)
And prépare un résumé dispatché par expert
And ⏸️ VALIDATION PM — "Feedback extrait. Dispatcher aux experts listés ?"
```

**US-2.5 — Accusé de réception**
```
Given un feedback client extrait et dispatché
When la PM valide
Then Arya prépare un brouillon d'accusé de réception (PROTO-CLIENT-REPLY) confirmant la prise en compte
And ⏸️ VALIDATION PM — "Accusé de réception prêt. Envoyer ?"
```

### Data Model

**Table `email_project_links`** — lie les conversationId Graph aux projets internes

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | PK |
| conversation_id | varchar(255) | conversationId Microsoft Graph (unique index) |
| project_id | varchar(255) | ID interne du projet |
| clickup_task_id | varchar(255) | ID tâche ClickUp |
| client_domain | varchar(255) | Domaine email client (ex: sony.com) |
| created_at | timestamp | Date de création du lien |
| updated_at | timestamp | Dernière mise à jour |

**Index** : unique sur `conversation_id`, index sur `client_domain`, index sur `project_id`.

**Alimentation** : chaque fois qu'un email est traité par PROTO-EMAIL-INTAKE et qu'un projet est créé, insérer une ligne avec le `conversationId` de l'email source. Chaque fois qu'Arya envoie un draft reply (PROTO-CLIENT-REPLY), capturer le `conversationId` du reply et l'associer au même projet.

### API Routes

**POST /api/admin/emails/match-project**

```typescript
// Input
interface MatchProjectInput {
  conversationId?: string;    // prioritaire — Graph API conversationId
  clientDomain: string;       // domaine email expéditeur (ex: "sony.com")
  subject: string;            // sujet de l'email
  bodyPreview?: string;       // extrait du body pour affiner le matching
}

// Output
interface MatchProjectOutput {
  matched: boolean;
  matchMethod?: "conversation_id" | "domain_subject_similarity";
  confidence?: number;        // 0-1, seulement pour domain_subject_similarity
  projectId?: string;
  projectName?: string;
  clickupTaskId?: string;
  projectStatus?: string;     // statut ClickUp actuel
  needsReopening?: boolean;   // true si statut ∈ {Approved, Invoiced, Closed}
}
```

**Logique de matching** :
1. Si `conversationId` fourni → lookup dans `email_project_links` → si trouvé, retourner le projet
2. Sinon → fetch les projets ClickUp actifs filtrés par `clientDomain` → comparer `subject` vs noms de projets avec similarité cosinus (embedding Haiku ou Levenshtein normalisé) → retourner le meilleur match si score > 0.6
3. Si aucun match → `{ matched: false }`

**Modification de `getEmailById`** : ajouter `conversationId` aux champs retournés.

```typescript
// Dans src/lib/integrations/email.ts — enrichir EmailMessageFull
export interface EmailMessageFull extends EmailMessage {
  body: {
    contentType: string;
    content: string;
  };
  conversationId: string;  // ← AJOUT — Microsoft Graph conversationId
}
```

Le `$select` de `getEmailById` doit inclure `conversationId` dans la requête Graph.

### Intégration dans les protocoles existants

- **PROTO-EMAIL-INTAKE** (étape 1) : quand la classification retourne `client_followup`, au lieu de simplement rediriger vers PROTO-CLIENT-REPLY, d'abord lancer PROTO-CLIENT-RETURN pour matcher le projet et extraire le feedback. PROTO-CLIENT-REPLY est ensuite utilisé pour l'accusé de réception (étape 5 de PROTO-CLIENT-RETURN).
- **PROTO-EMAIL-INTAKE** (étape 5) : à la création de projet, insérer le `conversationId` dans `email_project_links`.
- **PROTO-CLIENT-REPLY** : après envoi d'un draft, capturer le `conversationId` du message envoyé et le lier au projet dans `email_project_links`.

### Critères d'acceptation

- [ ] CA-2.1 : Un email avec un `conversationId` déjà lié à un projet retourne le bon projet en < 500ms
- [ ] CA-2.2 : Un email sans `conversationId` connu mais avec un domaine client et sujet proche d'un projet actif retourne le bon match avec confidence > 0.6
- [ ] CA-2.3 : Un email sans aucun match retourne `{ matched: false }` — pas de faux positif
- [ ] CA-2.4 : Quand un projet matché a statut "Closed", le champ `needsReopening: true` est retourné
- [ ] CA-2.5 : Le `conversationId` est bien persisté dans `email_project_links` lors de la création de projet (PROTO-EMAIL-INTAKE)
- [ ] CA-2.6 : Le feedback est extrait en items structurés avec assignation d'expert correcte (test sur 5 emails types : correction visuelle → designer, correction texte → copywriter, question générale → PM)
- [ ] CA-2.7 : ⏸️ VALIDATION PM à chaque point documenté — Arya ne dispatche jamais sans validation

---

## Action 3 — Classification enrichie (prospect + langue)

### Contexte

La classification actuelle (`src/app/api/admin/emails/classify/route.ts`) retourne 4 catégories et ne détecte pas la langue. Il faut : (1) ajouter `new_client_prospect` pour distinguer les prospects de premier contact des clients existants avec brief, (2) détecter la langue de l'email pour que toutes les réponses d'Arya soient dans cette langue.

### User Stories

**US-3.1 — Classification new_client_prospect**
```
Given un email de premier contact d'un prospect qui demande un devis, un pitch, ou des informations
When Arya classifie l'email
Then la catégorie retournée est "new_client_prospect" (pas "client_brief")
And le suggestedAction pointe vers PROTO-PITCH
```

**US-3.2 — Distinction client_brief vs new_client_prospect**
```
Given un email contenant une demande de travail
When l'expéditeur est un client connu (domaine dans la DB clients) avec un brief clair et structuré
Then la catégorie est "client_brief" → route vers PROTO-EMAIL-INTAKE

When l'expéditeur est inconnu, ou le message est vague ("we're looking for an agency", "can you send us a quote?")
Then la catégorie est "new_client_prospect" → route vers PROTO-PITCH
```

**US-3.3 — Détection de langue**
```
Given un email en allemand (ou toute autre langue)
When Arya classifie l'email
Then le résultat inclut { language: "de" }
And toutes les réponses générées par Arya pour cet email/client utilisent l'allemand
```

### Data Model

Pas de nouvelle table. Modification du schema de retour de classification uniquement.

### API Routes

**Modification de POST /api/admin/emails/classify**

Schema Zod de retour enrichi :

```typescript
// Nouveau type — remplace EmailCategory
type EmailCategory =
  | "client_brief"
  | "client_followup"
  | "noise"
  | "new_client_potential"    // existant — premier contact vague
  | "new_client_prospect";    // AJOUT — prospect qui veut un devis/pitch

// Nouveau schema de retour
interface ClassificationResult {
  category: EmailCategory;
  confidence: number;
  reasoning: string;
  suggestedAction: string;
  language: string;           // AJOUT — code ISO 639-1 ("en", "fr", "de", "es", etc.)
  routeTo: string;            // AJOUT — protocole cible ("PROTO-EMAIL-INTAKE" | "PROTO-CLIENT-RETURN" | "PROTO-PITCH" | "PROTO-CLIENT-REPLY" | "archive")
}
```

**Prompt Haiku enrichi** — remplacer `CLASSIFICATION_SYSTEM_PROMPT` :

```
You are Sarani's email classifier. Sarani is an international creative agency (45 experts, 5 continents, 18 languages). Classify the following email into exactly ONE category AND detect its language.

Categories:
- "client_brief": email containing a project brief, request for work, or new deliverable request from an EXISTING or KNOWN client. The sender has worked with Sarani before, the brief is clear and specific (deliverables, timeline, brand mentioned).
- "client_followup": follow-up, question, feedback, revision request, or status update about an ONGOING project.
- "noise": newsletters, automated notifications, marketing emails, system alerts, subscription confirmations, out-of-office replies.
- "new_client_potential": first contact from someone who could become a client — casual inquiry, introduction, "just reaching out". No specific project request yet.
- "new_client_prospect": first contact from a prospect who WANTS something specific — requests a quote, a pitch, a proposal, asks for pricing, describes a project they need help with. They are ready to buy, not just browsing.

Key distinction — client_brief vs new_client_prospect:
- client_brief = KNOWN client + CLEAR brief (specific deliverables, deadline, brand context). Example: "Hi team, we need 20 banners for our Q3 campaign, here are the specs..."
- new_client_prospect = UNKNOWN sender + WANTS a quote/pitch/proposal. Example: "We're a fashion brand looking for a creative agency to handle our social media. Can you send us a proposal?"
- If unsure: does the sender reference past Sarani projects or use internal vocabulary (SharePoint links, ClickUp refs)? → client_brief. Otherwise → new_client_prospect.

Routing rules:
- client_brief → "PROTO-EMAIL-INTAKE"
- client_followup → "PROTO-CLIENT-RETURN"
- noise → "archive"
- new_client_potential → "PROTO-CLIENT-REPLY"
- new_client_prospect → "PROTO-PITCH"

Return JSON:
{
  "category": "<one of the 5 categories>",
  "confidence": 0.0 to 1.0,
  "reasoning": "one sentence explaining why this category",
  "suggestedAction": "one sentence — what should the PM do next",
  "language": "<ISO 639-1 code of the email's language>",
  "routeTo": "<protocol name from routing rules>"
}

Rules:
- Return valid JSON only, no markdown.
- If unsure between two categories, pick the one that requires human attention (prefer false positive over missed client email).
- Confidence below 0.6 means you are uncertain — flag it in reasoning.
- Language detection: identify the PRIMARY language of the email body. If mixed, use the dominant language. Default to "en" only if truly ambiguous.
```

**Zod validation du retour LLM** (à ajouter dans le route handler) :

```typescript
const ClassificationResultSchema = z.object({
  category: z.enum([
    "client_brief",
    "client_followup",
    "noise",
    "new_client_potential",
    "new_client_prospect",
  ]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  suggestedAction: z.string(),
  language: z.string().min(2).max(5),  // ISO 639-1 or BCP 47
  routeTo: z.enum([
    "PROTO-EMAIL-INTAKE",
    "PROTO-CLIENT-RETURN",
    "PROTO-PITCH",
    "PROTO-CLIENT-REPLY",
    "archive",
  ]),
});
```

### Intégration dans les protocoles existants

- **PROTO-EMAIL-INTAKE** (étape 1) : le switch sur `category` ajoute `new_client_prospect → PROTO-PITCH` comme branche. Le `routeTo` du classifier donne directement le protocole cible.
- **PROTO-CLIENT-REPLY** : Arya utilise `language` pour rédiger le brouillon dans la langue du client. Le champ est passé au prompt de génération d'email comme instruction : "Reply in {language}."
- **PROTO-PITCH** : reçoit les emails `new_client_prospect` au lieu de `new_client_potential`. La distinction : `new_client_prospect` est prêt à recevoir un pitch (demande concrète), `new_client_potential` nécessite d'abord un échange PM (contact vague).
- **Tous les protocoles** : la langue détectée est stockée dans le contexte client et réutilisée pour toute communication future avec ce contact.

### Critères d'acceptation

- [ ] CA-3.1 : Un email de prospect inconnu demandant un devis retourne `new_client_prospect` (pas `client_brief`) — tester avec 5 emails types
- [ ] CA-3.2 : Un email de client connu (Sony, TikTok) avec un brief clair retourne `client_brief` — pas de régression
- [ ] CA-3.3 : Un email en allemand retourne `{ language: "de" }` — tester avec emails en FR, EN, DE, ES, AR
- [ ] CA-3.4 : Le champ `routeTo` est cohérent avec la catégorie dans 100% des cas
- [ ] CA-3.5 : Le Zod schema valide correctement le retour LLM — les retours malformés sont rejetés avec erreur 500 + log
- [ ] CA-3.6 : La classification `new_client_potential` existante continue de fonctionner pour les contacts vagues sans demande spécifique
- [ ] CA-3.7 : Le prompt pré-LLM noise filter (`isNoiseByEmail`) n'est pas affecté — les emails noise sont toujours court-circuités avant l'appel Haiku

---

## Action 4 — Activation automatique (webhooks + crons)

### Contexte

Aujourd'hui Arya est invoquée manuellement. L'objectif est de l'activer automatiquement via : (1) un webhook Microsoft Graph pour les emails entrants, (2) un cron fallback pour les emails ratés, (3) un hook interne post-exécution pour les livrables IA. Chaque activation crée un `inbox_item` dans le dashboard PM.

### User Stories

**US-4.1 — Webhook email entrant**
```
Given un nouvel email arrive sur team@sarani.studio
When Microsoft Graph envoie une notification au webhook
Then le webhook fetch l'email complet via Graph API
And lance PROTO-EMAIL-INTAKE automatiquement (classify → route vers le bon protocole)
And crée un inbox_item avec le résultat (catégorie, projet matché, action suggérée)
```

**US-4.2 — Validation du webhook Graph**
```
Given Microsoft Graph envoie un POST de validation avec un validationToken en query param
When le webhook reçoit cette requête
Then il retourne le validationToken en text/plain avec status 200
And ne traite pas cela comme un email
```

**US-4.3 — Renouvellement de souscription**
```
Given une souscription Graph expire dans < 24h (durée max = 72h)
When le cron de renouvellement s'exécute (toutes les 24h)
Then il renouvelle la souscription via PATCH /subscriptions/{id}
And log le nouveau expirationDateTime
```

**US-4.4 — Cron fallback emails**
```
Given le webhook peut rater des emails (downtime, erreur réseau)
When le cron s'exécute toutes les 5 minutes
Then il fetch les emails non-lus via getRecentEmails()
And filtre ceux déjà traités (check par messageId dans la table processed_emails)
And pour chaque email non traité, lance le même pipeline que le webhook
```

**US-4.5 — Hook post-exécution AI Team**
```
Given une AI Team termine son dernier step
When le step final se complète avec succès
Then le système crée un inbox_item "Livrables AI Team prêts à valider" avec lien vers les outputs
And ⏸️ VALIDATION PM dans le dashboard
```

**US-4.6 — Hook QA gates pass**
```
Given le QA agent termine avec ALL GATES PASS
When le résultat est enregistré
Then le système crée un inbox_item "QA PASS — Livrables prêts à livrer au client" avec le rapport de gates
```

### Data Model

**Table `inbox_items`** — file d'attente de la PM dans le dashboard

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | PK |
| type | enum | "email_classified", "ai_team_complete", "qa_gates_pass", "followup_alert" |
| status | enum | "pending", "in_progress", "done", "dismissed" |
| title | varchar(500) | Titre court affiché dans le dashboard |
| summary | text | Résumé structuré (JSON) — contenu dépend du type |
| source_id | varchar(255) | ID de la source (messageId email, teamExecutionId, etc.) |
| source_type | varchar(50) | "email", "ai_team", "qa", "cron" |
| protocol | varchar(50) | Protocole Arya déclenché ("PROTO-EMAIL-INTAKE", "PROTO-CLIENT-RETURN", etc.) |
| project_id | varchar(255) | Projet lié (nullable — pas toujours connu à la création) |
| priority | enum | "high", "medium", "low" — déduit de la classification |
| created_at | timestamp | Date de création |
| processed_at | timestamp | Date de traitement par la PM (nullable) |
| pm_id | varchar(255) | PM assignée (nullable — pour multi-PM futur) |

**Table `processed_emails`** — déduplication pour le cron fallback

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | PK |
| message_id | varchar(255) | Microsoft Graph messageId (unique index) |
| processed_at | timestamp | Date de traitement |
| result_category | varchar(50) | Catégorie de classification |
| inbox_item_id | uuid | FK → inbox_items |

**Table `graph_subscriptions`** — suivi des souscriptions webhook

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | PK |
| subscription_id | varchar(255) | ID de la souscription Graph |
| resource | varchar(255) | Resource surveillée (ex: "/users/{email}/messages") |
| expiration_date_time | timestamp | Date d'expiration |
| client_state | varchar(255) | Secret de validation |
| created_at | timestamp | Date de création |
| renewed_at | timestamp | Dernier renouvellement |

### API Routes

**POST /api/webhooks/graph-mail** — Webhook Microsoft Graph

```typescript
// Validation request (Graph envoie à la création de souscription)
// Query: ?validationToken=abc123
// Response: text/plain "abc123" — status 200

// Notification request (nouvel email)
// Input (de Microsoft Graph)
interface GraphNotification {
  value: Array<{
    subscriptionId: string;
    clientState: string;          // doit matcher notre secret
    changeType: "created";
    resource: string;             // ex: "Users/{id}/Messages/{messageId}"
    resourceData: {
      id: string;                 // messageId
    };
  }>;
}

// Processing
// 1. Valider clientState contre le secret stocké
// 2. Pour chaque notification : fetch email → classify → create inbox_item
// 3. Retourner 202 Accepted immédiatement (Graph exige réponse < 3s)
//    Le traitement se fait en background (queue ou async)

// Output
// Status 200 (validation) ou 202 (notification traitée)
```

**POST /api/admin/graph-subscriptions/create** — Créer la souscription

```typescript
// Input
interface CreateSubscriptionInput {
  resource?: string;  // défaut: "/users/{EMAIL_ADDRESS}/messages"
}

// Output
interface CreateSubscriptionOutput {
  subscriptionId: string;
  expirationDateTime: string;
  resource: string;
}

// Appelle POST https://graph.microsoft.com/v1.0/subscriptions
// Body: {
//   changeType: "created",
//   notificationUrl: "https://sarani.studio/api/webhooks/graph-mail",
//   resource: "/users/{EMAIL_ADDRESS}/messages",
//   expirationDateTime: now + 72h (max pour messages),
//   clientState: generated_secret
// }
```

**POST /api/admin/graph-subscriptions/renew** — Renouveler (appelé par cron)

```typescript
// Input: aucun — renouvelle toutes les souscriptions expirant dans < 24h
// Output: { renewed: number, errors: string[] }
// Appelle PATCH https://graph.microsoft.com/v1.0/subscriptions/{id}
```

**GET /api/admin/cron/poll-emails** — Cron fallback (toutes les 5 min)

```typescript
// Protégé par un secret CRON_SECRET en header (pas d'auth session — appelé par le scheduler)
// Processing:
// 1. getRecentEmails(50)
// 2. Filtrer : exclure les messageId déjà dans processed_emails
// 3. Pour chaque nouveau : classify → match project → create inbox_item → insert processed_emails
// Output: { processed: number, skipped: number, errors: string[] }
```

**Hook interne — post-exécution AI Team**

Pas de nouvel endpoint. Modification dans le handler existant de `POST /api/admin/teams/[id]/steps/[stepId]/execute` :

```typescript
// Après l'exécution du dernier step d'une team :
if (isLastStep && executionResult.success) {
  await createInboxItem({
    type: "ai_team_complete",
    title: `AI Team "${teamName}" — livrables prêts`,
    summary: JSON.stringify({
      teamId,
      templateType,
      stepsCompleted: totalSteps,
      outputs: executionResult.outputs,  // liens vers les fichiers produits
    }),
    sourceId: teamExecutionId,
    sourceType: "ai_team",
    protocol: "PROTO-AI-TEAM",
    projectId,
    priority: "high",
  });
}

// Après QA gates avec ALL GATES PASS :
if (qaResult.verdict === "ALL_GATES_PASS") {
  await createInboxItem({
    type: "qa_gates_pass",
    title: `QA PASS — "${projectName}" prêt à livrer`,
    summary: JSON.stringify({
      gatesReport: qaResult.gates,
      teamExecutionId,
    }),
    sourceId: qaResult.id,
    sourceType: "qa",
    protocol: "PROTO-AI-TEAM",
    projectId,
    priority: "high",
  });
}
```

### Intégration dans les protocoles existants

- **PROTO-EMAIL-INTAKE** : n'est plus déclenché manuellement. Le webhook ou le cron le lancent automatiquement. La PM voit le résultat dans son dashboard (inbox_items) et valide aux points ⏸️.
- **PROTO-AI-TEAM** (étape 6-7) : le hook post-exécution crée l'inbox_item automatiquement. La PM reçoit une notification "livrables prêts" sans avoir à surveiller l'exécution.
- **Dashboard PM** : nouvel écran `/admin/inbox` qui affiche les inbox_items triés par priorité et date. Actions : "Review" (ouvre le protocole), "Dismiss" (archive l'item), "Snooze" (rappel dans X heures).

### Configuration requise

- **Variable d'environnement** : `GRAPH_WEBHOOK_SECRET` — secret partagé avec Graph pour valider les notifications (clientState)
- **Variable d'environnement** : `CRON_SECRET` — secret pour protéger les endpoints cron
- **Endpoint public HTTPS** : `https://sarani.studio/api/webhooks/graph-mail` doit être accessible publiquement (pas de VPN, pas de localhost)
- **Cron scheduler** : configurer deux crons dans l'infrastructure (Vercel Cron, Railway, ou Replit) :
  - `*/5 * * * *` → GET /api/admin/cron/poll-emails
  - `0 */12 * * *` → POST /api/admin/graph-subscriptions/renew

### Critères d'acceptation

- [ ] CA-4.1 : Le webhook retourne le `validationToken` en text/plain lors de la requête de validation Graph
- [ ] CA-4.2 : Un email entrant déclenche automatiquement la classification + création d'inbox_item en < 10s
- [ ] CA-4.3 : Le webhook retourne 202 en < 3s (traitement asynchrone)
- [ ] CA-4.4 : Le `clientState` est validé — une notification avec un mauvais secret est rejetée (403)
- [ ] CA-4.5 : Le cron fallback ne retraite pas un email déjà traité (déduplication via `processed_emails`)
- [ ] CA-4.6 : Le renouvellement de souscription fonctionne — pas d'expiration silencieuse
- [ ] CA-4.7 : Quand une AI Team termine son dernier step, un inbox_item apparaît dans le dashboard PM en < 5s
- [ ] CA-4.8 : Quand QA passe avec ALL GATES PASS, un inbox_item "prêt à livrer" est créé
- [ ] CA-4.9 : Le dashboard `/admin/inbox` affiche les items triés par priorité (high > medium > low) puis par date (récents en premier)

---

## Action 5 — Learning journal (apprentissage continu)

### Contexte

Arya apprend des corrections de la PM. Chaque fois qu'une PM modifie un draft d'Arya (email, brief, devis), la différence est capturée, catégorisée, et — si un pattern récurrent émerge — promue en règle permanente dans le prompt d'Arya.

### User Stories

**US-5.1 — Capture automatique de correction**
```
Given la PM ouvre un inbox_item et clique "Edit" sur le contenu généré par Arya
When elle modifie le texte et sauvegarde
Then le système capture : version originale Arya, version éditée PM, diff, et demande une catégorie
And l'entrée est stockée dans arya_learnings
```

**US-5.2 — Catégorisation du learning**
```
Given une correction capturée
When le diff est analysé (par Haiku)
Then le learning est catégorisé automatiquement : ton | contenu | structure | pricing | missing_info
And la PM peut valider ou corriger la catégorie
```

**US-5.3 — Promotion en règle**
```
Given 3+ learnings de la même catégorie et du même type de correction (ex: "ton trop formel" × 3)
When le seuil est atteint
Then Arya propose de promouvoir ce pattern en règle permanente
And ⏸️ VALIDATION PM — "Pattern détecté : [description]. Ajouter comme règle permanente ?"
And si validé → la règle est ajoutée au prompt system d'Arya
```

**US-5.4 — Cohérence check**
```
Given la PM édite un contenu Arya
When la correction contredit une règle existante (ex: règle dit "toujours tutoyer" mais la PM met du vouvoiement)
Then Arya flag l'incohérence : "Cette correction semble contredire la règle [X]. Confirmer ?"
And la PM peut : confirmer (exception ponctuelle) ou mettre à jour la règle
```

**US-5.5 — Export périodique**
```
Given des learnings accumulés dans la DB
When l'export périodique s'exécute (hebdomadaire via cron)
Then un fichier docs/pm/arya-learning-journal.md est généré/mis à jour avec tous les learnings
And les learnings promus en règles sont marqués "[PROMU → règle #X]"
```

### Data Model

**Table `arya_learnings`** — journal d'apprentissage

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | PK |
| date | timestamp | Date de la correction |
| pm_name | varchar(100) | Nom de la PM qui a corrigé |
| item_type | enum | "email_draft", "brief", "quote", "pitch", "followup", "ack_receipt" |
| item_id | varchar(255) | ID de l'inbox_item ou du document corrigé |
| arya_original | text | Texte original généré par Arya |
| pm_edited | text | Texte après correction par la PM |
| diff_summary | text | Résumé du diff (généré par Haiku) |
| category | enum | "ton", "contenu", "structure", "pricing", "missing_info" |
| category_confirmed | boolean | PM a validé la catégorie auto (default false) |
| promoted | boolean | Learning promu en règle permanente (default false) |
| promoted_rule_id | uuid | FK → arya_rules si promu (nullable) |
| project_id | varchar(255) | Projet lié (nullable) |
| client_domain | varchar(255) | Domaine client (pour détecter patterns par client) |

**Table `arya_rules`** — règles permanentes promues depuis les learnings

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | PK |
| rule_text | text | Texte de la règle (injecté dans le prompt system) |
| category | enum | "ton", "contenu", "structure", "pricing", "missing_info" |
| source_learning_ids | jsonb | IDs des learnings qui ont déclenché la promotion |
| active | boolean | Règle active (default true) |
| created_at | timestamp | Date de création |
| deactivated_at | timestamp | Date de désactivation (nullable) |
| deactivation_reason | text | Raison si désactivée (nullable) |

### API Routes

**POST /api/admin/arya/learnings** — Enregistrer une correction

```typescript
// Input
interface CreateLearningInput {
  itemType: "email_draft" | "brief" | "quote" | "pitch" | "followup" | "ack_receipt";
  itemId: string;
  aryaOriginal: string;
  pmEdited: string;
  pmName: string;
  projectId?: string;
  clientDomain?: string;
}

// Processing:
// 1. Calculer le diff
// 2. Appeler Haiku pour catégoriser : { category, diffSummary }
// 3. Vérifier cohérence vs arya_rules actives
// 4. Insérer dans arya_learnings
// 5. Vérifier seuil de promotion (3+ même catégorie, même pattern)

// Output
interface CreateLearningOutput {
  learningId: string;
  category: string;
  diffSummary: string;
  coherenceFlag?: {           // présent seulement si incohérence détectée
    conflictingRuleId: string;
    conflictingRuleText: string;
    message: string;
  };
  promotionCandidate?: {      // présent seulement si seuil atteint
    pattern: string;
    occurrences: number;
    suggestedRule: string;
  };
}
```

**POST /api/admin/arya/learnings/{id}/confirm-category** — PM valide la catégorie

```typescript
// Input
interface ConfirmCategoryInput {
  confirmed: boolean;
  correctedCategory?: "ton" | "contenu" | "structure" | "pricing" | "missing_info";
}

// Output: { updated: true }
```

**POST /api/admin/arya/rules** — Promouvoir un learning en règle

```typescript
// Input
interface CreateRuleInput {
  ruleText: string;
  category: string;
  sourceLearningIds: string[];  // les 3+ learnings qui ont déclenché
}

// Processing:
// 1. Créer la règle dans arya_rules
// 2. Marquer les learnings source comme promoted = true
// 3. La règle sera injectée dans le prompt system d'Arya au prochain appel

// Output: { ruleId: string, active: true }
```

**DELETE /api/admin/arya/rules/{id}** — Désactiver une règle

```typescript
// Input: { reason: string }
// Processing: soft delete — active = false, deactivated_at = now, deactivation_reason = reason
// Output: { deactivated: true }
```

**GET /api/admin/arya/learnings/export** — Export vers markdown (appelé par cron hebdo)

```typescript
// Protégé par CRON_SECRET
// Processing:
// 1. Fetch tous les learnings ordonnés par date
// 2. Générer le markdown avec sections par catégorie
// 3. Écrire dans docs/pm/arya-learning-journal.md
// Output: { exported: number, filePath: "docs/pm/arya-learning-journal.md" }
```

### Injection des règles dans Arya

Les règles actives de `arya_rules` sont injectées dynamiquement dans le prompt system de chaque protocole Arya. Mécanisme :

```typescript
// Fonction utilitaire — appelée avant chaque génération de contenu Arya
async function getAryaRulesBlock(): Promise<string> {
  const rules = await db.aryaRules.findMany({ where: { active: true } });
  if (rules.length === 0) return "";

  return `\n\n--- LEARNED RULES (from PM corrections) ---\n${
    rules.map((r, i) => `${i + 1}. [${r.category.toUpperCase()}] ${r.ruleText}`).join("\n")
  }\n--- END LEARNED RULES ---\n`;
}

// Usage dans chaque prompt Arya :
const systemPrompt = BASE_PROMPT + await getAryaRulesBlock();
```

### Intégration dans les protocoles existants

- **Tous les protocoles avec output éditable** (PROTO-CLIENT-REPLY, PROTO-QUOTE, PROTO-PITCH, PROTO-EMAIL-INTAKE étape 3) : quand la PM clique "Edit" dans le dashboard, le frontend capture l'état avant/après et appelle POST /api/admin/arya/learnings.
- **Dashboard PM** (`/admin/inbox`) : chaque inbox_item avec du contenu généré a un bouton "Edit" qui active le tracking. Le diff est visible dans un panneau latéral.
- **Page `/admin/arya/learnings`** : vue des learnings avec filtres (catégorie, type, date, client). Affiche les candidats à promotion en haut. Actions : confirmer catégorie, promouvoir en règle, ignorer.
- **Page `/admin/arya/rules`** : vue des règles actives. Actions : désactiver, éditer le texte.

### Critères d'acceptation

- [ ] CA-5.1 : Quand la PM édite un draft et sauvegarde, un learning est créé avec le diff correct
- [ ] CA-5.2 : La catégorisation automatique par Haiku est correcte dans >= 80% des cas (tester sur 10 corrections types)
- [ ] CA-5.3 : Quand 3 learnings de catégorie "ton" avec le même pattern existent, une promotion est suggérée
- [ ] CA-5.4 : Une correction qui contredit une règle active déclenche un flag de cohérence
- [ ] CA-5.5 : Une règle promue est injectée dans le prompt Arya au prochain appel — vérifier que le output change en conséquence
- [ ] CA-5.6 : Une règle désactivée n'est plus injectée dans le prompt
- [ ] CA-5.7 : L'export hebdomadaire génère un markdown lisible dans `docs/pm/arya-learning-journal.md`
- [ ] CA-5.8 : Le learning stocke correctement le `arya_original` et le `pm_edited` — pas de troncature sur les textes longs (> 5000 chars)

---

## Handoff

**Destinataires** : @fullstack (implémentation des 4 actions — endpoints, tables DB, hooks, webhook, crons), @client-manager (intégration dans les workflows Arya), @moi (validation stratégique du learning journal)

**Livrables produits** :
- `docs/pm/arya-specs-v2.md` — ce fichier

**Décisions clés** :
- PROTO-CLIENT-RETURN utilise `conversationId` Graph en priorité (fiable, natif) avec fallback domain+sujet (fuzzy matching, seuil 0.6)
- Classification enrichie : 5 catégories (ajout `new_client_prospect`) + détection de langue (ISO 639-1) + routage explicite par protocole
- Activation : webhook Graph + cron fallback 5 min + hooks internes post-AI-Team — triple filet pour ne rater aucun événement
- Learning journal : capture → catégorisation auto → promotion en règle après 3 occurrences → injection dynamique dans les prompts. Pattern identique à `docs/lessons-learned.md` du framework Gradient Agents
- Le webhook Graph nécessite un endpoint public HTTPS et un renouvellement toutes les 72h

**Prochaines étapes** :
- @fullstack → implémenter dans cet ordre : (1) Action 3 — classification enrichie (modification d'un fichier existant, rapide), (2) Action 2 — match-project endpoint + table `email_project_links`, (3) Action 4 — webhook + cron + inbox_items, (4) Action 5 — learning journal
- @client-manager → adapter les protocoles de `arya-protocols.md` avec les nouveaux flux (PROTO-CLIENT-RETURN, routage enrichi)
- @moi → valider le seuil de promotion (3 occurrences) et la politique de désactivation des règles
