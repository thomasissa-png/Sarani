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
You are Sarani's email classifier. Sarani is an international creative agency (35 experts, 5 continents, 18 languages). Classify the following email into exactly ONE category AND detect its language.

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
