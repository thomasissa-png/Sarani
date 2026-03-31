# Client Knowledge Base — Specs

*Produit par @product-manager — 2026-03-31*

> Specs pour le système de knowledge base client d'Arya. Permet à Arya d'accumuler et d'exploiter des connaissances structurées par client (société, division, contact individuel) pour personnaliser ses outputs (briefs, emails, revues, devis).
> Référence amont : `docs/pm/arya-protocols.md` (7 protocoles), `docs/pm/arya-specs-v2.md` (learning journal, classification enrichie), `src/lib/db/schema.ts` (table `clients` existante).

---

## 1. Data Model

### Table `client_knowledge`

Chaque ligne = une connaissance atomique liée à un client. La granularité va du client global (Sony) à une division (Sony Music) à un contact individuel (Sophie chez Sony Music).

| Colonne | Type | Nullable | Description |
|---------|------|----------|-------------|
| id | uuid | NOT NULL | PK, `gen_random_uuid()` |
| client_id | uuid | NOT NULL | FK → `clients.id` ON DELETE CASCADE |
| division | varchar(255) | NULL | Division au sein du client (ex: "Sony Music", "Sony Pictures"). NULL = s'applique à tout le client |
| contact_name | varchar(255) | NULL | Nom du contact individuel (ex: "Sophie Durand"). NULL = s'applique à toute la division ou au client entier |
| contact_email | varchar(255) | NULL | Email du contact. Permet le matching automatique depuis les emails entrants |
| category | varchar(50) | NOT NULL | Enum applicatif : `'tone'` \| `'preference'` \| `'positive_feedback'` \| `'improvement'` \| `'guideline'` \| `'workflow'` |
| knowledge_text | text | NOT NULL | Le contenu du learning (ex: "Toujours utiliser un fond blanc pour les bannières") |
| source | text | NOT NULL | D'où vient ce knowledge : "email:msg-id-xxx", "pm_correction:learning-id-xxx", "project:project-name", "client_feedback:inbox-item-xxx", "manual:pm-name" |
| confidence | varchar(20) | NOT NULL | `'confirmed'` (validé explicitement par PM ou client), `'observed'` (déduit de patterns, 2+ occurrences), `'hypothesized'` (première occurrence, à confirmer) |
| is_active | boolean | NOT NULL | DEFAULT `true`. Permet de désactiver sans supprimer |
| created_at | timestamp | NOT NULL | DEFAULT `now()` |
| updated_at | timestamp | NOT NULL | DEFAULT `now()` |

### Indexes

| Index | Colonnes | Type | Raison |
|-------|----------|------|--------|
| `idx_ck_client_id` | `client_id` | btree | Lookup principal : toutes les connaissances d'un client |
| `idx_ck_contact_email` | `contact_email` | btree | Matching automatique depuis un email entrant |
| `idx_ck_category` | `category` | btree | Filtrage par type de connaissance dans l'UI |
| `idx_ck_client_division` | `client_id, division` | btree | Lookup par division au sein d'un client |
| `uq_ck_no_duplicate` | `client_id, division, contact_email, category, knowledge_text` | unique (partiel, sur `is_active = true`) | Empêche les doublons actifs identiques |

### Relations avec le modèle existant

- **FK `client_id` → `clients.id`** : la table `clients` existe déjà avec `id`, `name`, `industry`, `status`, `primary_contact_name`, `primary_contact_email`, etc. Le knowledge base s'appuie sur cette table — pas de duplication du nom client.
- **Lien avec `arya_learnings`** (specs-v2, Action 5) : quand un learning est capturé avec un `client_domain`, il peut être promu en `client_knowledge` entry (pas seulement en `arya_rules` globale). Le champ `source` tracera l'origine : `"pm_correction:learning-id-xxx"`.
- **Lien avec `email_project_links`** (specs-v2, Action 2) : le `client_domain` du lien email-projet permet de retrouver le `client_id` et donc les connaissances applicables.

### Drizzle Schema

```typescript
// Dans src/lib/db/schema.ts

export const clientKnowledge = pgTable(
  "client_knowledge",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    division: varchar("division", { length: 255 }),
    contactName: varchar("contact_name", { length: 255 }),
    contactEmail: varchar("contact_email", { length: 255 }),
    category: varchar("category", { length: 50 }).notNull(), // tone | preference | positive_feedback | improvement | guideline | workflow
    knowledgeText: text("knowledge_text").notNull(),
    source: text("source").notNull(),
    confidence: varchar("confidence", { length: 20 }).notNull(), // confirmed | observed | hypothesized
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_ck_client_id").on(table.clientId),
    index("idx_ck_contact_email").on(table.contactEmail),
    index("idx_ck_category").on(table.category),
    index("idx_ck_client_division").on(table.clientId, table.division),
  ]
);
```

---

## 2. API Routes

### GET /api/admin/clients/[id]/knowledge — Lister les connaissances

```typescript
// Query params
interface ListKnowledgeParams {
  division?: string;        // filtrer par division
  contactEmail?: string;    // filtrer par contact
  category?: string;        // filtrer par catégorie
  confidence?: string;      // filtrer par niveau de confiance
  isActive?: "true" | "false"; // défaut: "true"
}

// Response 200
interface ListKnowledgeResponse {
  knowledge: Array<{
    id: string;
    clientId: string;
    division: string | null;
    contactName: string | null;
    contactEmail: string | null;
    category: "tone" | "preference" | "positive_feedback" | "improvement" | "guideline" | "workflow";
    knowledgeText: string;
    source: string;
    confidence: "confirmed" | "observed" | "hypothesized";
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  total: number;
}

// Processing:
// 1. Valider que le client existe (404 si non trouvé)
// 2. Query client_knowledge WHERE client_id = [id] AND is_active = true (sauf si isActive param overridé)
// 3. Appliquer les filtres optionnels
// 4. Ordonner par : category ASC, division ASC NULLS FIRST, created_at DESC
```

### POST /api/admin/clients/[id]/knowledge — Ajouter une connaissance

```typescript
// Input
interface CreateKnowledgeInput {
  division?: string;
  contactName?: string;
  contactEmail?: string;
  category: "tone" | "preference" | "positive_feedback" | "improvement" | "guideline" | "workflow";
  knowledgeText: string;
  source: string;
  confidence?: "confirmed" | "observed" | "hypothesized"; // défaut: "observed"
}

// Zod validation
const CreateKnowledgeSchema = z.object({
  division: z.string().max(255).optional(),
  contactName: z.string().max(255).optional(),
  contactEmail: z.string().email().max(255).optional(),
  category: z.enum(["tone", "preference", "positive_feedback", "improvement", "guideline", "workflow"]),
  knowledgeText: z.string().min(5).max(5000),
  source: z.string().min(3).max(1000),
  confidence: z.enum(["confirmed", "observed", "hypothesized"]).default("observed"),
});

// Processing:
// 1. Valider que le client existe (404 si non trouvé)
// 2. Vérifier qu'un knowledge identique actif n'existe pas déjà (client_id + division + contact_email + category + knowledge_text) → 409 Conflict si doublon
// 3. Si contactEmail fourni mais pas contactName → tenter de résoudre le nom depuis la table clients (primary_contact_email) ou les knowledge existants
// 4. INSERT dans client_knowledge
// 5. Retourner 201 avec l'entrée créée

// Response 201
interface CreateKnowledgeResponse {
  knowledge: { /* même shape que ListKnowledgeResponse.knowledge[0] */ };
}
```

### PATCH /api/admin/clients/[id]/knowledge/[knowledgeId] — Modifier ou désactiver

```typescript
// Input (tous les champs optionnels)
interface UpdateKnowledgeInput {
  division?: string;
  contactName?: string;
  contactEmail?: string;
  category?: "tone" | "preference" | "positive_feedback" | "improvement" | "guideline" | "workflow";
  knowledgeText?: string;
  source?: string;
  confidence?: "confirmed" | "observed" | "hypothesized";
  isActive?: boolean;
}

// Processing:
// 1. Valider que le client et le knowledge existent (404 si non trouvé)
// 2. Valider que le knowledge appartient bien au client (403 si mismatch)
// 3. UPDATE les champs fournis + updated_at = now()
// 4. Retourner 200 avec l'entrée mise à jour

// Response 200
interface UpdateKnowledgeResponse {
  knowledge: { /* même shape */ };
}
```

### GET /api/admin/clients/[id]/knowledge/prompt — Bloc prompt injectable

C'est la route clé : elle retourne un bloc de texte structuré à injecter dans les prompts d'Arya quand elle travaille pour ce client.

```typescript
// Query params
interface KnowledgePromptParams {
  contactEmail?: string;   // si fourni, inclut les knowledge spécifiques à ce contact
  division?: string;       // si fourni, inclut les knowledge spécifiques à cette division
  categories?: string;     // filtre par catégories (comma-separated), défaut: toutes
}

// Response 200
interface KnowledgePromptResponse {
  promptBlock: string;     // texte prêt à injecter dans un prompt
  knowledgeCount: number;  // nombre de knowledge entries incluses
  clientName: string;      // pour log/debug
}

// Processing:
// 1. Fetch le client (name)
// 2. Fetch tous les knowledge actifs pour ce client
// 3. Si contactEmail fourni → inclure aussi les knowledge spécifiques à ce contact
// 4. Si division fourni → inclure aussi les knowledge spécifiques à cette division
// 5. Hiérarchie d'application : client-level < division-level < contact-level (le plus spécifique gagne en cas de contradiction)
// 6. Construire le bloc texte structuré (voir format ci-dessous)

// Format du promptBlock généré :
`
--- CLIENT KNOWLEDGE: ${clientName} ---

## Tone & Communication
- [CLIENT-LEVEL] ${knowledgeText}
- [CONTACT: Sophie Durand] ${knowledgeText}

## Preferences & Guidelines
- [CLIENT-LEVEL] ${knowledgeText}
- [DIVISION: Sony Music] ${knowledgeText}

## What Works (Positive Feedback)
- ${knowledgeText}

## What to Improve
- ${knowledgeText}

## Workflow
- ${knowledgeText}

PRIORITY RULE: Contact-level knowledge overrides division-level, which overrides client-level. If a contact prefers casual tone but the client default is formal, use casual for this contact.

--- END CLIENT KNOWLEDGE ---
`
```

### Logique de résolution hiérarchique

Quand Arya reçoit un email de `sophie@sony.com` :

1. **Résoudre le client** : matcher `sony.com` → client "Sony" (via `clients.primary_contact_email` domain ou lookup dédié)
2. **Charger le knowledge client-level** : `WHERE client_id = sony_id AND division IS NULL AND contact_email IS NULL`
3. **Charger le knowledge division-level** : si la division est connue (ex: "Sony Music"), `WHERE client_id = sony_id AND division = 'Sony Music'`
4. **Charger le knowledge contact-level** : `WHERE client_id = sony_id AND contact_email = 'sophie@sony.com'`
5. **Fusionner** avec priorité : contact > division > client

---

## 3. Capture automatique

### 3.1 Capture depuis les emails entrants (PROTO-EMAIL-INTAKE)

**Quand** : Arya classifie un email et matche un client (étape 2 de PROTO-EMAIL-INTAKE).

**Quoi** : après le matching client, appeler GET `/api/admin/clients/[id]/knowledge/prompt?contactEmail={sender}` pour charger le knowledge. Ce bloc est injecté dans le prompt de structuration du brief (étape 3).

**Capture implicite** : pas de création automatique de knowledge à l'intake. Le knowledge se crée uniquement via les corrections PM (3.2) ou les feedbacks clients (3.3).

### 3.2 Capture depuis les corrections PM (via Learning Journal)

**Quand** : une PM corrige un livrable Arya pour un client spécifique (Action 5 de arya-specs-v2).

**Mécanisme** : modification du handler `POST /api/admin/arya/learnings` (existant dans specs-v2) :

```typescript
// Après l'insertion du learning dans arya_learnings (étape 4 du processing existant) :

// AJOUT — Proposition de knowledge client
if (input.clientDomain) {
  const client = await findClientByDomain(input.clientDomain);
  if (client) {
    // Appeler Haiku pour déterminer si cette correction est spécifique au client
    // (vs une correction générale d'Arya)
    const analysis = await analyzeForClientKnowledge({
      diffSummary: learning.diffSummary,
      category: learning.category,
      clientName: client.name,
      contactEmail: extractSenderEmail(input), // si disponible
    });

    if (analysis.isClientSpecific) {
      // Créer un knowledge entry en confidence "hypothesized"
      // La PM devra confirmer dans la fiche client
      await createClientKnowledge({
        clientId: client.id,
        division: analysis.division || null,
        contactName: analysis.contactName || null,
        contactEmail: analysis.contactEmail || null,
        category: mapLearningCategoryToKnowledgeCategory(learning.category),
        knowledgeText: analysis.knowledgeText,
        source: `pm_correction:${learning.id}`,
        confidence: "hypothesized",
      });
    }
  }
}
```

**Mapping catégorie learning → catégorie knowledge** :

| Learning category | Knowledge category | Logique |
|---|---|---|
| ton | tone | Direct — correction de ton spécifique au client |
| contenu | preference | Le contenu corrigé reflète une préférence client |
| structure | preference | Le format corrigé reflète une préférence client |
| pricing | workflow | Correction de tarification → workflow tarifaire du client |
| missing_info | guideline | Info manquante = guideline pas encore documentée |

**Prompt Haiku pour l'analyse** :

```
You are analyzing a PM correction to determine if it reveals CLIENT-SPECIFIC knowledge.

Client: ${clientName}
Correction category: ${category}
Diff summary: ${diffSummary}

Questions to answer:
1. Is this correction specific to this client (vs a general Arya improvement)?
   - "Always use formal tone" = general (applies to all clients) → isClientSpecific: false
   - "Sony prefers white backgrounds for banners" = client-specific → isClientSpecific: true
   - "Sophie prefers short emails" = contact-specific → isClientSpecific: true
2. If client-specific:
   - Is it about a specific division? Which one?
   - Is it about a specific contact? Name and email if available?
   - Summarize the knowledge in one actionable sentence.

Return JSON:
{
  "isClientSpecific": boolean,
  "knowledgeText": "one actionable sentence" | null,
  "division": "division name" | null,
  "contactName": "contact name" | null,
  "contactEmail": "contact@email" | null,
  "reasoning": "why this is/isn't client-specific"
}
```

### 3.3 Capture depuis les feedbacks clients (PROTO-CLIENT-RETURN)

**Quand** : un email classifié `client_followup` est identifié comme un feedback (positif ou négatif) par PROTO-CLIENT-RETURN (Action 2 de arya-specs-v2, US-2.4).

**Mécanisme** : modification du handler de feedback extraction dans PROTO-CLIENT-RETURN :

```typescript
// Après extraction des items de feedback (US-2.4, étape "extraire les items de feedback structurés") :

for (const feedbackItem of extractedFeedback) {
  if (feedbackItem.type === "positive" || feedbackItem.type === "negative") {
    const category = feedbackItem.type === "positive" ? "positive_feedback" : "improvement";

    await createClientKnowledge({
      clientId: matchedProject.clientId,
      division: matchedProject.division || null,
      contactName: senderName,
      contactEmail: senderEmail,
      category,
      knowledgeText: feedbackItem.summary,
      source: `client_feedback:${inboxItemId}`,
      confidence: "observed", // vient directement du client, mais pas encore "confirmed" par PM
    });
  }
}
```

**Le workflow complet** :
1. Client envoie un email de feedback
2. PROTO-CLIENT-RETURN le classifie et extrait les items de feedback
3. Pour chaque item positif/négatif → création automatique d'un knowledge entry (`confidence: "observed"`)
4. La PM voit les nouveaux knowledge dans la fiche client
5. La PM peut confirmer (`confidence → "confirmed"`), éditer, ou désactiver

### 3.4 Capture manuelle par la PM

**Quand** : la PM veut ajouter un knowledge manuellement (ex: après un appel téléphonique, un meeting, une info reçue hors email).

**Mécanisme** : formulaire dans la fiche client (`/admin/clients/[id]`) → appelle `POST /api/admin/clients/[id]/knowledge`.

**Source** : `"manual:{pm_name}"` — permet de tracer les knowledge créés manuellement vs automatiquement.

---

## 4. Injection dans les protocoles

### PROTO-EMAIL-INTAKE — Personnalisation du brief

**Point d'injection** : étape 2 ("Matcher le client") → après identification du client, avant étape 3 ("Extraire et structurer le brief").

```typescript
// Dans le handler PROTO-EMAIL-INTAKE, après le matching client :
const knowledgeBlock = await fetch(
  `/api/admin/clients/${clientId}/knowledge/prompt?contactEmail=${senderEmail}`
).then(r => r.json());

// Injecter dans le prompt de structuration du brief (étape 3)
const briefPrompt = `${BASE_BRIEF_PROMPT}

${knowledgeBlock.promptBlock}

Use the client knowledge above to:
- Structure the brief according to known client preferences (format, detail level)
- Flag if the request seems inconsistent with known guidelines
- Note any missing information that this client usually provides
`;
```

**Impact** : le brief structuré tient compte des préférences connues. Ex: si Sony préfère toujours recevoir les briefs avec un champ "Brand Guidelines Link", Arya l'inclut automatiquement même si le client ne l'a pas mentionné dans l'email.

### PROTO-CLIENT-REPLY — Ton et style personnalisés

**Point d'injection** : avant la génération du brouillon email.

```typescript
// Charger le knowledge filtré sur tone + preference + le contact spécifique
const knowledgeBlock = await fetch(
  `/api/admin/clients/${clientId}/knowledge/prompt?contactEmail=${recipientEmail}&categories=tone,preference`
).then(r => r.json());

// Injecter dans le prompt de rédaction
const replyPrompt = `${BASE_REPLY_PROMPT}

${knowledgeBlock.promptBlock}

CRITICAL: Adapt your tone and style to match this client's preferences.
- If tone knowledge exists for this specific contact, use it.
- If no contact-specific tone, use the client-level tone.
- If no tone knowledge at all, use Sarani's default tone (warm, professional, proactive).
`;
```

**Impact** : si Sophie chez Sony communique de manière casual et en anglais, Arya rédige l'email en conséquence. Si Marc chez Sony (Procurement) est formel et en français, Arya adapte.

### PROTO-ASSET-REVIEW — Guidelines client

**Point d'injection** : avant l'analyse des assets uploadés.

```typescript
// Charger le knowledge filtré sur guideline + preference
const knowledgeBlock = await fetch(
  `/api/admin/clients/${clientId}/knowledge/prompt?categories=guideline,preference&division=${division}`
).then(r => r.json());

// Injecter dans le prompt de review
const reviewPrompt = `${BASE_REVIEW_PROMPT}

${knowledgeBlock.promptBlock}

CHECK EACH ASSET AGAINST THESE CLIENT-SPECIFIC GUIDELINES.
If a guideline says "always white background for banners" and an asset has a colored background → flag it.
If a preference says "no stock photos" and an asset uses stock → flag it.
List violations with the specific knowledge entry they violate.
`;
```

**Impact** : la revue d'assets vérifie automatiquement les guidelines client connues. Ex: "GEODIS n'accepte pas de texte en dehors de la safe zone de 20px" → Arya flag tout asset qui viole cette règle.

### PROTO-QUOTE — Préférences tarifaires

**Point d'injection** : avant la génération du devis.

```typescript
// Charger le knowledge filtré sur workflow (inclut les prefs pricing) + preference
const knowledgeBlock = await fetch(
  `/api/admin/clients/${clientId}/knowledge/prompt?categories=workflow,preference`
).then(r => r.json());

// Injecter dans le prompt de devis
const quotePrompt = `${BASE_QUOTE_PROMPT}

${knowledgeBlock.promptBlock}

Apply client-specific pricing and workflow knowledge:
- If the client has a contract rate → use it instead of standard pricing
- If the client prefers itemized quotes → use itemized format
- If the client has specific payment terms → mention them
- If the client always requests a PO number → include a PO field
`;
```

### PROTO-AI-TEAM — Brief des agents IA

**Point d'injection** : dans la construction du brief pour chaque agent de l'AI Team.

```typescript
// Charger tout le knowledge du client (toutes catégories)
const knowledgeBlock = await fetch(
  `/api/admin/clients/${clientId}/knowledge/prompt?contactEmail=${contactEmail}&division=${division}`
).then(r => r.json());

// Injecter dans le brief de chaque agent
const agentBrief = `${BASE_AGENT_BRIEF}

${knowledgeBlock.promptBlock}

You are producing work for ${clientName}. Follow ALL client-specific guidelines above.
Pay special attention to:
- Tone preferences (match the client's communication style)
- Visual guidelines (colors, fonts, layouts the client expects)
- Known positive feedback (repeat what works)
- Known improvements (avoid past mistakes)
`;
```

**Impact** : chaque agent IA de la team reçoit le knowledge client et adapte sa production. Le designer sait que Sony préfère les fonds blancs, le copywriter sait que GEODIS préfère un ton corporate.

### Fonction utilitaire partagée

```typescript
// src/lib/arya/client-knowledge.ts

/**
 * Charge le knowledge block d'un client pour injection dans un prompt Arya.
 * Utilisé par tous les protocoles.
 */
export async function getClientKnowledgeBlock(params: {
  clientId: string;
  contactEmail?: string;
  division?: string;
  categories?: string[];
}): Promise<{ promptBlock: string; knowledgeCount: number; clientName: string }> {
  const queryParams = new URLSearchParams();
  if (params.contactEmail) queryParams.set("contactEmail", params.contactEmail);
  if (params.division) queryParams.set("division", params.division);
  if (params.categories?.length) queryParams.set("categories", params.categories.join(","));

  const response = await fetch(
    `${BASE_URL}/api/admin/clients/${params.clientId}/knowledge/prompt?${queryParams}`
  );

  if (!response.ok) {
    console.warn(`[ClientKnowledge] Failed to load knowledge for client ${params.clientId}: ${response.status}`);
    return { promptBlock: "", knowledgeCount: 0, clientName: "unknown" };
  }

  return response.json();
}
```

---

## 5. User Stories

### US-CK-01 — Chargement automatique du knowledge en intake

```
Given un email arrive de sophie@sony.com sur team@sarani.studio
When Arya classifie l'email et identifie le client Sony (via le domaine sony.com)
Then Arya appelle GET /api/admin/clients/{sony_id}/knowledge/prompt?contactEmail=sophie@sony.com
And le promptBlock retourné contient les knowledge client-level Sony + les knowledge contact-level Sophie
And ce promptBlock est injecté dans le prompt de structuration du brief (PROTO-EMAIL-INTAKE étape 3)
And le brief structuré reflète les préférences connues (ex: si Sophie préfère les briefs courts → le brief est concis)
```

**Critères d'acceptation** :
- [ ] CA-CK-01a : Un email de `sophie@sony.com` charge les knowledge Sony (client-level) + Sophie (contact-level)
- [ ] CA-CK-01b : Un email de `marc@sony.com` (contact inconnu) charge uniquement les knowledge Sony (client-level)
- [ ] CA-CK-01c : Un email de `unknown@newclient.com` (client inconnu) ne crash pas — retourne un promptBlock vide
- [ ] CA-CK-01d : Le brief structuré est différent avec vs sans knowledge (vérifier sur 3 emails de test)

### US-CK-02 — Capture automatique depuis les corrections PM

```
Given une PM corrige le ton d'un email draft d'Arya destiné à GEODIS
When la PM change "Hi team!" en "Dear GEODIS team," et sauvegarde
Then le learning est capturé dans arya_learnings (Action 5 existante)
And Haiku analyse le diff et détecte que c'est une correction spécifique au client GEODIS (pas une correction générale)
And un knowledge entry est créé : { clientId: geodis_id, category: "tone", knowledgeText: "GEODIS prefers formal salutations ('Dear' not 'Hi')", confidence: "hypothesized", source: "pm_correction:{learning_id}" }
And la PM voit ce nouveau knowledge dans la fiche client GEODIS avec un badge "À confirmer"
```

**Critères d'acceptation** :
- [ ] CA-CK-02a : Une correction de ton spécifique au client crée un knowledge entry `confidence: "hypothesized"`
- [ ] CA-CK-02b : Une correction générale (pas spécifique au client) NE crée PAS de knowledge entry
- [ ] CA-CK-02c : Le mapping learning category → knowledge category est correct (voir tableau section 3.2)
- [ ] CA-CK-02d : Le knowledge entry créé est visible dans la fiche client

### US-CK-03 — Knowledge par division

```
Given le client Sony a deux divisions connues : "Sony Music" et "Sony Pictures"
And Sony Music a un knowledge : { category: "preference", knowledgeText: "Album artwork always needs explicit parental advisory logo placement specs" }
And Sony Pictures a un knowledge : { category: "preference", knowledgeText: "Movie posters require MPAA rating placement" }
When un nouveau projet arrive pour Sony Music
Then Arya charge : knowledge Sony (client-level) + knowledge Sony Music (division-level)
And NE charge PAS les knowledge Sony Pictures
And le promptBlock affiche clairement la hiérarchie : [CLIENT-LEVEL] vs [DIVISION: Sony Music]
```

**Critères d'acceptation** :
- [ ] CA-CK-03a : Le prompt endpoint avec `?division=Sony Music` retourne les knowledge client-level + Sony Music, PAS Sony Pictures
- [ ] CA-CK-03b : Sans paramètre division, tous les knowledge sont retournés (client-level + toutes divisions)
- [ ] CA-CK-03c : Le promptBlock indique clairement le scope de chaque knowledge ([CLIENT-LEVEL], [DIVISION: X], [CONTACT: Y])

### US-CK-04 — Interface PM de gestion du knowledge

```
Given la PM ouvre la fiche client Sony dans /admin/clients/{sony_id}
When elle clique sur l'onglet "Knowledge Base"
Then elle voit la liste de tous les knowledge Sony, groupés par catégorie (Tone, Preferences, Guidelines, etc.)
And chaque entry affiche : texte, source, confidence (badge couleur), division/contact (si spécifique), date
And elle peut :
  - Ajouter un knowledge manuellement (formulaire avec division/contact/category/texte/source)
  - Éditer un knowledge existant (inline edit)
  - Désactiver un knowledge (toggle is_active → false, pas de suppression définitive)
  - Confirmer un knowledge hypothesized (confidence → "confirmed")
  - Filtrer par division, contact, catégorie, confidence
```

**Critères d'acceptation** :
- [ ] CA-CK-04a : La liste knowledge est visible dans la fiche client avec groupement par catégorie
- [ ] CA-CK-04b : Le formulaire d'ajout crée un knowledge via POST /api/admin/clients/{id}/knowledge
- [ ] CA-CK-04c : Le toggle is_active fonctionne via PATCH (soft delete, pas de suppression)
- [ ] CA-CK-04d : Le filtre par division fonctionne (affiche uniquement les knowledge de la division sélectionnée + client-level)
- [ ] CA-CK-04e : Les knowledge `hypothesized` ont un badge orange "À confirmer" avec un bouton "Confirmer"

### US-CK-05 — Injection dans la revue d'assets

```
Given Sony a un knowledge guideline : "Banners must always have a white background"
When Arya review des assets pour un projet Sony (PROTO-ASSET-REVIEW)
Then le promptBlock Sony est injecté dans le prompt de review
And si un asset a un fond coloré, Arya le flag avec référence au knowledge : "Violation guideline CK-xxx: 'Banners must always have a white background'"
```

**Critères d'acceptation** :
- [ ] CA-CK-05a : Les guidelines client sont injectées dans PROTO-ASSET-REVIEW
- [ ] CA-CK-05b : Un asset violant une guideline connue est flaggé avec la référence au knowledge

### US-CK-06 — Feedback client capturé automatiquement

```
Given un email de retour client Sony classifié client_followup positif
When PROTO-CLIENT-RETURN extrait le feedback : "The video edits were perfect, exactly the style we wanted"
Then un knowledge entry est créé : { clientId: sony_id, category: "positive_feedback", knowledgeText: "Video edits style validated — client confirmed the editing approach works", confidence: "observed", source: "client_feedback:{inbox_item_id}" }
And ce knowledge sera utilisé lors des prochains projets vidéo pour Sony
```

**Critères d'acceptation** :
- [ ] CA-CK-06a : Un feedback positif crée un knowledge `positive_feedback` avec `confidence: "observed"`
- [ ] CA-CK-06b : Un feedback négatif crée un knowledge `improvement` avec `confidence: "observed"`
- [ ] CA-CK-06c : Le source tracke l'inbox_item d'origine

---

## 6. Migration SQL

```sql
-- Migration: add_client_knowledge_table
-- Description: Creates the client_knowledge table for Arya's per-client knowledge base

CREATE TABLE IF NOT EXISTS "client_knowledge" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "client_id" uuid NOT NULL,
  "division" varchar(255),
  "contact_name" varchar(255),
  "contact_email" varchar(255),
  "category" varchar(50) NOT NULL,
  "knowledge_text" text NOT NULL,
  "source" text NOT NULL,
  "confidence" varchar(20) NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

-- Foreign key
ALTER TABLE "client_knowledge"
  ADD CONSTRAINT "client_knowledge_client_id_clients_id_fk"
  FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;

-- Indexes
CREATE INDEX IF NOT EXISTS "idx_ck_client_id"
  ON "client_knowledge" USING btree ("client_id");

CREATE INDEX IF NOT EXISTS "idx_ck_contact_email"
  ON "client_knowledge" USING btree ("contact_email");

CREATE INDEX IF NOT EXISTS "idx_ck_category"
  ON "client_knowledge" USING btree ("category");

CREATE INDEX IF NOT EXISTS "idx_ck_client_division"
  ON "client_knowledge" USING btree ("client_id", "division");

-- Partial unique index to prevent active duplicates
CREATE UNIQUE INDEX IF NOT EXISTS "uq_ck_no_duplicate"
  ON "client_knowledge" ("client_id", COALESCE("division", ''), COALESCE("contact_email", ''), "category", "knowledge_text")
  WHERE "is_active" = true;
```

**Note pour @fullstack** : cette migration doit être ajoutée comme fichier `drizzle/XXXX_add_client_knowledge.sql` (numéro séquentiel suivant le dernier fichier dans `drizzle/`). Le schema Drizzle correspondant est dans la section 1 de ce document.

---

## Handoff

**Destinataires** :
- **@fullstack** : implémenter la table, les 4 routes API, la fonction utilitaire `getClientKnowledgeBlock`, et l'onglet Knowledge dans la fiche client (`/admin/clients/[id]`). Modifier les handlers des protocoles existants pour injecter le knowledge (PROTO-EMAIL-INTAKE, PROTO-CLIENT-REPLY, PROTO-ASSET-REVIEW, PROTO-QUOTE, PROTO-AI-TEAM). Modifier le handler `POST /api/admin/arya/learnings` pour la capture automatique depuis les corrections PM (section 3.2). Modifier PROTO-CLIENT-RETURN pour la capture depuis les feedbacks (section 3.3).
- **@qa** : écrire les tests pour les 4 routes API + les 6 user stories. Priorité : US-CK-01 (chargement) et US-CK-02 (capture) car ils touchent le cœur du système.
- **@moi** : valider les catégories de knowledge (tone/preference/positive_feedback/improvement/guideline/workflow) et le seuil de confiance (hypothesized → observed → confirmed). Valider aussi la hiérarchie client > division > contact.

**Livrables produits** :
- `docs/pm/client-knowledge-specs.md` — ce fichier

**Décisions clés** :
- **FK vers `clients.id`** plutôt que duplication du nom client → garantit la cohérence, simplifie les queries, et le CASCADE delete nettoie automatiquement si un client est supprimé
- **Hiérarchie client > division > contact** avec résolution au moment de l'injection (pas de dénormalisation) → flexible, permet d'ajouter des niveaux plus tard
- **Confidence à 3 niveaux** (hypothesized/observed/confirmed) → filtre le bruit sans perdre les signaux faibles. Les knowledge `hypothesized` sont injectés dans les prompts mais marqués comme tels
- **Capture automatique via le learning journal existant** (section 3.2) → pas de nouveau pipeline à construire, on enrichit le flux existant avec une analyse Haiku supplémentaire
- **Soft delete** (is_active toggle) plutôt que hard delete → auditabilité, possibilité de réactiver, et le prompt endpoint ne charge que les actifs
- **Partial unique index** sur les entrées actives → empêche les doublons sans bloquer la réactivation d'un knowledge désactivé

**Dépendances** :
- Table `clients` (existe, `src/lib/db/schema.ts`)
- Table `arya_learnings` + API `/api/admin/arya/learnings` (specs-v2, Action 5 — doit être implémentée avant ou en parallèle de la section 3.2)
- PROTO-CLIENT-RETURN (specs-v2, Action 2 — doit être implémenté avant la section 3.3)
- Classification enrichie avec `language` (specs-v2, Action 3 — indépendant)

**Ordre d'implémentation recommandé** :
1. Migration SQL + schema Drizzle (table `client_knowledge`)
2. Routes CRUD (GET/POST/PATCH + GET prompt)
3. Onglet Knowledge dans la fiche client (UI)
4. Injection dans les protocoles (modification des prompts existants)
5. Capture automatique depuis corrections PM (modification du handler learnings)
6. Capture automatique depuis feedbacks client (modification de PROTO-CLIENT-RETURN)
