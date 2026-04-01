# Inbox Overhaul Specs — 6 Corrections Thomas
**Date :** 2026-04-01 | **Agent :** @product-manager | **Persona :** Thomas (fondateur, utilisateur du back-office)

---

## Tableau récapitulatif — Catégories × Workflows

| Catégorie email | Protocole | Boutons inbox | Action PM | Action Arya |
|---|---|---|---|---|
| `enquiry` | PROTO-ENQUIRY | Draft Reply / Archive | Review + envoyer le draft | Génère une réponse email complète (salutation + corps + signature) |
| `new_project` | PROTO-EMAIL-INTAKE | Create Brief / Draft Reply / Archive | Review brief + approuver | Génère le brief + crée ClickUp task + SharePoint + Excel |
| `project_feedback` | PROTO-CLIENT-RETURN | Add ClickUp Comment / Draft Reply / Archive | Review commentaire ClickUp + approuver | Génère le commentaire ClickUp, l'ajoute, repasse le task en "Open" |
| `other` | archive | Archive | — | Archive automatique |

---

## Fix 1 — Draft Reply = vraie réponse email pré-rédigée

### Problème
`DraftReplyModal` pre-fill avec `suggestedAction` qui contient l'analyse d'Arya ("This email is about X, I suggest Y"), pas une réponse email professionnelle prête à envoyer.

### User Story
**Given** Thomas clique "Draft Reply" sur un email classifié,
**When** le modal s'ouvre,
**Then** le champ reply body contient une vraie réponse email avec salutation (Prénom du sender), corps répondant au contenu de l'email, et signature Sarani — pas une analyse.

### Changements techniques

**`src/app/api/admin/emails/classify/route.ts`**

Remplacer le champ `suggestedAction` dans le prompt LLM par `draftReply` :

```
"draftReply": "Complete email reply ready to send. Format:
- Greeting: 'Hi [FirstName],' or formal equivalent in sender's language
- Body: 2-3 sentences directly addressing the email content
- Closing: 'Best regards,\nThe Sarani Team'
- Language: match the sender's email language (field: language)"
```

Mettre à jour le Zod schema : remplacer `suggestedAction: z.string()` par `draftReply: z.string()` + garder `suggestedAction` pour usage interne (reasoning visible PM).

**`src/components/inbox/DraftReplyModal.tsx`**

Ligne 36 : remplacer `payload.classification.suggestedAction` par `payload.classification.draftReply`.

**`src/components/inbox/EmailCard.tsx`** et `src/app/api/admin/inbox/route.ts`

Mettre à jour le type `EmailPayload.classification` : ajouter `draftReply: string`, garder `suggestedAction: string` (affiché comme "Arya's analysis" dans le modal pour contexte PM).

### Affichage dans le modal
- Bloc readonly "Arya's analysis" : affiche `suggestedAction` (contexte pour le PM)
- Champ editable "Reply" : pre-fill avec `draftReply`

### Critères de validation
- [ ] GIVEN un email en français WHEN classification THEN `draftReply` commence par "Bonjour [Prénom],"
- [ ] GIVEN un email en anglais WHEN classification THEN `draftReply` commence par "Hi [FirstName],"
- [ ] GIVEN le modal s'ouvre WHEN PM inspecte le champ reply THEN le contenu ne contient pas "I suggest", "This email is about", "You should"
- [ ] GIVEN `draftReply` vide (LLM failure) WHEN modal s'ouvre THEN champ editable vide (pas de crash), PM peut rédiger manuellement
- [ ] GIVEN PM modifie le draft WHEN clique "Create Draft in Outlook" THEN c'est le contenu modifié (pas l'original) qui est envoyé à l'API draft

---

## Fix 2 — Open ClickUp = ouvrir le bon projet

### Problème
`tryOpenClickUp()` dans `ProjectActionModal` tombe en fallback `https://app.clickup.com` si `clickupUrl`/`taskId` absent du payload.

### User Story
**Given** Thomas clique "Open Project" sur un email `project_feedback`,
**When** Arya a identifié le projet ClickUp correspondant,
**Then** ClickUp s'ouvre directement sur le bon task.

**Given** Thomas clique "Open Project" et le projet ClickUp n'a pas été trouvé,
**When** le modal s'ouvre,
**Then** le bouton "Open in ClickUp" est désactivé avec le label "Project not found in ClickUp — search manually" (lien vers `https://app.clickup.com`) — pas d'ouverture silencieuse de la page d'accueil ClickUp.

### Changements techniques

**`src/app/api/admin/emails/classify/route.ts`**

Ajouter dans le prompt LLM un champ `clickupProjectHint` :
```
"clickupProjectHint": "Client name or project name extracted from the email, as it would appear in ClickUp task titles. Null if not identifiable."
```

Ajouter dans le schema Zod : `clickupProjectHint: z.string().nullable()`.

**Nouveau endpoint : `src/app/api/admin/clickup/search/route.ts`**

```
POST /api/admin/clickup/search
Body: { query: string }
Response: { taskId: string | null, taskUrl: string | null, taskName: string | null }
```

Appelle l'API ClickUp `GET /api/v2/team/{team_id}/task?query={query}` (ou search tasks endpoint).
Retourne le premier résultat avec score de confiance > 0.8 sur le nom, null sinon.

**`src/app/api/admin/emails/classify/route.ts`** — après classification LLM

Si `category === "project_feedback"` et `clickupProjectHint` non null : appeler `/api/admin/clickup/search` avec le hint, stocker `taskId` et `taskUrl` dans le payload de l'inbox item.

**`src/components/inbox/ProjectActionModal.tsx`**

```typescript
const tryOpenClickUp = () => {
  if (clickupUrl) {
    window.open(clickupUrl, "_blank", "noopener,noreferrer");
    showToast("Opened project in ClickUp", "success");
    handleMarkDone();
  } else {
    // No URL found — do NOT silently open ClickUp home
    showToast("Project not found in ClickUp. Use manual search.", "error");
  }
};
```

Le bouton "Open in ClickUp" est disabled + tooltip "Project not found — search manually" si `clickupUrl` null.
Ajouter un lien secondaire "Search in ClickUp" (`https://app.clickup.com`) visible mais non CTA primaire.

### Critères de validation
- [ ] GIVEN `clickupUrl` présent dans le payload WHEN PM clique "Open Project" THEN ClickUp s'ouvre sur le bon task (URL contient l'ID du task)
- [ ] GIVEN `clickupUrl` absent WHEN PM clique "Open in ClickUp" THEN le bouton est disabled et affiche "Project not found in ClickUp"
- [ ] GIVEN `clickupUrl` absent WHEN PM clique le lien secondaire "Search in ClickUp" THEN `https://app.clickup.com` s'ouvre dans un nouvel onglet
- [ ] GIVEN la recherche ClickUp retourne 0 résultat WHEN classification termine THEN `taskId` et `taskUrl` sont null dans le payload (pas d'erreur silencieuse)
- [ ] GIVEN l'API ClickUp est down WHEN classification s'exécute THEN la classification continue sans `taskId` (graceful degradation, pas de crash de la classification)

---

## Fix 3 — 4 catégories email avec 4 workflows distincts

### Problème
La classification actuelle (5 catégories) ne mappe pas sur les 4 cas métier réels de Sarani. Les protocoles sont redondants ou inexacts.

### Nouveau mapping catégories

| Ancienne catégorie | Nouvelle catégorie | Protocole |
|---|---|---|
| `new_client_potential` + `new_client_prospect` | `enquiry` | PROTO-ENQUIRY |
| `client_brief` | `new_project` | PROTO-EMAIL-INTAKE |
| `client_followup` | `project_feedback` | PROTO-CLIENT-RETURN |
| `noise` | `other` | archive |

### Changements techniques

**`src/app/api/admin/emails/classify/route.ts`**

Remplacer les types :
```typescript
type EmailCategory = "enquiry" | "new_project" | "project_feedback" | "other";
type RouteTo = "PROTO-ENQUIRY" | "PROTO-EMAIL-INTAKE" | "PROTO-CLIENT-RETURN" | "archive";
```

Mettre à jour le Zod schema `ClassificationResultSchema` avec les nouvelles valeurs d'enum.

Nouveau prompt système (remplace entièrement l'actuel) :
```
Categories:
- "enquiry": Question about Sarani's services, request for quote/pricing, general question, first contact (casual or specific). No existing project involved.
- "new_project": A brief for a NEW project from an existing OR new client — contains deliverables, timeline, brand info, or a clear project request. Sender may or may not have worked with Sarani before.
- "project_feedback": Feedback, revision request, follow-up, status question, or any message about an EXISTING ongoing project. The sender references a specific past or ongoing project.
- "other": Newsletters, automated notifications, system alerts, out-of-office, marketing emails.

Routing:
- enquiry → "PROTO-ENQUIRY"
- new_project → "PROTO-EMAIL-INTAKE"
- project_feedback → "PROTO-CLIENT-RETURN"
- other → "archive"
```

**`src/app/admin/(authenticated)/page.tsx`**

Mettre à jour `PROTOCOL_LABELS` :
```typescript
const PROTOCOL_LABELS: Record<string, string> = {
  "PROTO-ENQUIRY": "Enquiry",
  "PROTO-EMAIL-INTAKE": "New Project",
  "PROTO-CLIENT-RETURN": "Project Feedback",
  "archive": "Other",
};
```

**`src/components/inbox/EmailCard.tsx`**

Les boutons d'action sont conditionnels à la catégorie (voir tableau Fix 3 — colonne "Boutons inbox").

### Critères de validation
- [ ] GIVEN un email de type "Hi, can you tell me your pricing for video editing?" WHEN classification THEN `category === "enquiry"`
- [ ] GIVEN un email "Hi team, we need 20 banners for Q3 — specs attached" (nouveau client) WHEN classification THEN `category === "new_project"`
- [ ] GIVEN un email "The revision I requested on the deck is still not done" WHEN classification THEN `category === "project_feedback"`
- [ ] GIVEN un email provenant d'un sender `noreply@newsletter.com` WHEN classification THEN `category === "other"`
- [ ] GIVEN une ancienne inbox item avec `protocol === "PROTO-CLIENT-REPLY"` WHEN affichage THEN le label affiche "Enquiry" (migration du label affichage, pas de re-classification des items existants)

---

## Fix 4 — Nouveaux filtres inbox

### Changements techniques

**`src/app/admin/(authenticated)/page.tsx`**

Remplacer le type et les constantes :
```typescript
type FilterTab =
  | "all"
  | "new_project"
  | "project_feedback"
  | "enquiry"
  | "project_reviews"
  | "other"
  | "done";

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "new_project", label: "New Projects" },
  { key: "project_feedback", label: "Project Feedback" },
  { key: "enquiry", label: "Enquiries" },
  { key: "project_reviews", label: "Project Reviews" },
  { key: "other", label: "Others" },
  { key: "done", label: "Managed" },
];
```

Logique de filtrage à mettre à jour dans la fonction de filtre des items :
```typescript
const filterItems = (items: InboxItem[], filter: FilterTab): InboxItem[] => {
  if (filter === "all") return items.filter(i => i.status !== "done" && i.status !== "dismissed");
  if (filter === "done") return items.filter(i => i.status === "done" || i.status === "dismissed");
  if (filter === "project_reviews") return items.filter(i =>
    ["review_human", "review_ai_ready", "review_escalated"].includes(i.type) &&
    i.status !== "done" && i.status !== "dismissed"
  );
  // email categories map to protocol
  const protocolMap: Record<string, string> = {
    new_project: "PROTO-EMAIL-INTAKE",
    project_feedback: "PROTO-CLIENT-RETURN",
    enquiry: "PROTO-ENQUIRY",
    other: "archive",
  };
  return items.filter(i =>
    i.protocol === protocolMap[filter] &&
    i.status !== "done" && i.status !== "dismissed"
  );
};
```

Supprimer les anciens filtres : `urgent`, `email_classified`, `ai_team_complete`, `qa_gates_pass`, `followup_alert`.

### Critères de validation
- [ ] GIVEN onglet "All" actif WHEN items chargés THEN items avec status `done` ou `dismissed` sont exclus
- [ ] GIVEN onglet "Managed" actif WHEN items chargés THEN seuls les items avec status `done` ou `dismissed` sont affichés
- [ ] GIVEN onglet "Project Reviews" actif WHEN items chargés THEN seuls les items de type `review_human`, `review_ai_ready`, `review_escalated` sont affichés
- [ ] GIVEN onglet "New Projects" actif WHEN items chargés THEN seuls les items avec `protocol === "PROTO-EMAIL-INTAKE"` non-done sont affichés
- [ ] GIVEN aucun item dans un filtre WHEN onglet actif THEN état vide affiché avec message "No items in this category"

---

## Fix 5 — Supprimer les alertes ClickUp de l'inbox

### Problème
Les items de type `followup_alert` génèrent du bruit dans l'inbox. Ils n'ont pas de workflow PM clair.

### Recommandation Arya
Retirer `followup_alert` de l'inbox active. Remplacer par un encart "Projects due today" dans le header de la page inbox — un bandeau informatif non-actionnable, pas un item de travail. Le bandeau appelle `/api/admin/clickup/due-today` (GET, liste les tasks ClickUp avec due date = aujourd'hui). Si l'API ClickUp n'est pas configurée, le bandeau est masqué.

### Changements techniques

**`src/app/api/admin/inbox/route.ts`**

Dans la query de récupération des items, exclure les items de type `followup_alert` du résultat principal :
```typescript
where: { type: { not: "followup_alert" } }
```

Les `followup_alert` existants gardent leur statut en BDD — ils ne sont pas supprimés, juste exclus de l'affichage inbox.

**`src/app/admin/(authenticated)/page.tsx`**

Ajouter un composant `DueTodayBanner` en haut de la page (avant les filtres) :
```typescript
// Appelle GET /api/admin/clickup/due-today
// Affiche: "3 projects due today: [Project A], [Project B], [Project C]"
// Si 0 results ou API non configurée: masqué (display: none, pas de placeholder vide)
```

**Nouveau endpoint : `src/app/api/admin/clickup/due-today/route.ts`**
```
GET /api/admin/clickup/due-today
Response: { tasks: { id: string, name: string, url: string }[] }
```
Si `CLICKUP_API_KEY` non configuré, retourne `{ tasks: [] }`.

**`src/app/admin/(authenticated)/page.tsx`** — TYPE_CONFIG

Supprimer l'entrée `followup_alert` de `TYPE_CONFIG` (ou la conserver pour les items historiques déjà en BDD — à garder pour éviter les erreurs de rendu sur les items anciens).

### Critères de validation
- [ ] GIVEN un item de type `followup_alert` en BDD WHEN inbox chargée THEN l'item n'apparaît dans aucun onglet (All, Managed, ni aucun filtre)
- [ ] GIVEN l'API ClickUp configurée et 2 tasks dus aujourd'hui WHEN inbox chargée THEN le bandeau affiche "2 projects due today: [noms]"
- [ ] GIVEN l'API ClickUp non configurée (`CLICKUP_API_KEY` absent) WHEN inbox chargée THEN le bandeau est masqué (pas d'erreur visible)
- [ ] GIVEN 0 task dû aujourd'hui WHEN inbox chargée THEN le bandeau est masqué

---

## Fix 6 — Onglet "Managed" (historique des items traités)

### Problème
Aucun historique visible des items archivés ou traités. Thomas ne peut pas retrouver ce qui a été fait sur un email passé.

### User Story
**Given** Thomas clique sur l'onglet "Managed",
**When** les items chargent,
**Then** il voit tous les items avec status `done` ou `dismissed`, chacun avec un badge indiquant l'action prise.

### Badge par action
| Status | Dernier protocole / type | Badge affiché |
|---|---|---|
| `done` | `PROTO-EMAIL-INTAKE` | "Brief created" |
| `done` | `PROTO-ENQUIRY` | "Replied" |
| `done` | `PROTO-CLIENT-RETURN` | "Feedback added" |
| `dismissed` | tout | "Archived" |
| `done` | `review_*` | "Review done" |

### Changements techniques

**`src/app/admin/(authenticated)/page.tsx`**

L'onglet "Managed" est déjà couvert par la logique de filtrage du Fix 4 (`filter === "done"`).

Ajouter un helper `getActionBadge(item: InboxItem): string` qui retourne le label du badge selon la table ci-dessus.

**`src/components/inbox/EmailCard.tsx`**

Dans le mode "Managed" (prop `isManagedView?: boolean`), afficher :
- Badge coloré avec l'action prise (fond gris neutre, text-neutral-400)
- Champ `processedAt` formaté ("Replied 2 days ago")
- Pas de boutons d'action (archived — lecture seule)
- Permettre un bouton "Restore" (remet le status à `pending`) si Thomas réalise qu'il a archivé par erreur

**`src/app/api/admin/inbox/route.ts`**

Ajouter support du PATCH `{ id, status: "pending" }` pour la restauration.

### Critères de validation
- [ ] GIVEN un item avec status `done` et protocol `PROTO-EMAIL-INTAKE` WHEN affiché dans "Managed" THEN le badge affiche "Brief created"
- [ ] GIVEN un item avec status `dismissed` WHEN affiché dans "Managed" THEN le badge affiche "Archived"
- [ ] GIVEN Thomas clique "Restore" sur un item "Managed" WHEN confirmation THEN l'item repasse en `pending` et apparaît dans l'onglet "All"
- [ ] GIVEN l'onglet "Managed" actif WHEN items chargés THEN les boutons d'action (Draft Reply, Create Brief, Archive) ne sont pas affichés — lecture seule
- [ ] GIVEN `processedAt` null sur un item done WHEN affiché THEN le champ date affiche "Date unknown" (pas de crash)

---

## Edge cases transversaux

- **Migration des items existants** : les items avec les anciens protocoles (`PROTO-CLIENT-REPLY`, `PROTO-PITCH`) gardent leur valeur en BDD. Le `PROTOCOL_LABELS` updated les affiche correctement côté UI sans re-classifier. Aucune migration BDD requise.
- **Double classification** : si un item est re-classifié manuellement, le `protocol` en BDD est mis à jour — le filtre inbox reflète la nouvelle catégorie immédiatement.
- **Items sans protocol** : items avec `protocol: null` apparaissent uniquement dans l'onglet "All" (pas dans les filtres catégorie).
- **Ordre d'affichage** : items triés par `createdAt` DESC dans tous les onglets. L'onglet "Managed" trie par `processedAt` DESC.

---

## Dépendances d'implémentation

```
Fix 3 (nouvelles catégories) → doit être fait AVANT Fix 4 (filtres) et Fix 1 (draft reply)
Fix 2 (ClickUp search) → dépend de Fix 3 (category "project_feedback" trigger la recherche ClickUp)
Fix 5 (supprimer followup_alert) → indépendant, peut être fait en parallèle
Fix 6 (Managed tab) → dépend de Fix 4 (logique de filtrage)
Fix 7 (Lark = même classif que emails) → dépend de Fix 3 + Fix 4 (+ Fix 2 recommandé)
```

---

**Handoff → @fullstack**
- Fichiers produits : `/home/user/Sarani/docs/product/inbox-overhaul-specs.md`
- Décisions prises : 4 nouvelles catégories email (enquiry/new_project/project_feedback/other), suppression followup_alert remplacée par DueTodayBanner, draftReply champ LLM dédié vs suggestedAction, bouton ClickUp disabled si projet non trouvé (pas de fallback silencieux)
- Points d'attention :
  - Fix 3 est la dépendance racine — implémenter en premier (change les enums BDD + LLM prompt)
  - Fix 2 nécessite que `CLICKUP_API_KEY` soit configuré en env var — graceful degradation obligatoire si absent
  - Les items BDD existants avec anciens protocoles ne doivent PAS être migrés — le mapping UI gère la compatibilité ascendante
  - `draftReply` dans le LLM doit matcher la langue de l'email (champ `language` déjà dans le schema)
  - **Fix 7 doit être fait APRÈS Fix 3** (les nouvelles catégories email doivent exister avant d'aligner Lark dessus)

---

## Fix 7 — Messages Lark classifiés comme les emails (AJOUT THOMAS 2026-04-01)

### Problème
Les messages Lark (`type: lark_message`) utilisent leur propre système de classification avec 4 catégories internes (`internal_request`, `status_update`, `client_mention`, `noise`) qui ne correspondent PAS aux 4 catégories email (`enquiry`, `new_project`, `project_feedback`, `other`). Résultat : les messages Lark n'apparaissent dans aucun des filtres inbox par catégorie (New Projects, Enquiries, Project Feedback) et n'ont pas les mêmes boutons d'action que les emails.

Thomas veut une inbox unifiée : un message Lark classifié `new_project` doit apparaître dans l'onglet "New Projects" avec le bouton "Create Brief", exactement comme un email.

### État actuel du code

**`src/app/api/webhooks/lark/route.ts`** :
- Classification LLM avec prompt Lark-spécifique → 4 catégories : `internal_request`, `status_update`, `client_mention`, `noise`
- Stockage en BDD avec `type: "lark_message"`, `protocol: "PROTO-LARK-TRIAGE"` (ou null pour noise)
- Pas de `routeTo`, pas de `draftReply`, pas de `clickupProjectHint`

**`src/app/admin/(authenticated)/page.tsx`** :
- L'EmailCard est déjà rendu pour `lark_message` (ligne ~673 : `item.type === "email_classified" || item.type === "lark_message"`)
- Mais les filtres par onglet utilisent `protocol` → les lark_message ont `PROTO-LARK-TRIAGE` qui ne matche aucun onglet

### Changements techniques

**`src/app/api/webhooks/lark/route.ts`**

1. **Remplacer le prompt de classification Lark** par le même prompt email (ou un prompt aligné) utilisant les 4 catégories email :
   - `enquiry` : un message Lark qui pose une question sur un service, un tarif, une disponibilité — souvent un client ou prospect qui contacte via le bot Lark
   - `new_project` : un message Lark contenant un brief, une demande de projet, des livrables attendus
   - `project_feedback` : un message Lark avec du feedback, une demande de révision, un suivi de projet existant
   - `other` : messages internes sans action requise, notifications, bruit

2. **Ajouter les mêmes champs de sortie que la classification email** :
   ```typescript
   type LarkClassificationResult = {
     category: "enquiry" | "new_project" | "project_feedback" | "other";
     confidence: number;
     reasoning: string;
     suggestedAction: string;
     draftReply: string;           // Reply draft adapted for Lark context
     clickupProjectHint: string | null;
     language: string;
     routeTo: "PROTO-ENQUIRY" | "PROTO-EMAIL-INTAKE" | "PROTO-CLIENT-RETURN" | "archive";
   };
   ```

3. **Stocker le protocol email correspondant** (pas `PROTO-LARK-TRIAGE`) :
   ```typescript
   // Routing — same as emails
   const routeMap: Record<string, string> = {
     enquiry: "PROTO-ENQUIRY",
     new_project: "PROTO-EMAIL-INTAKE",
     project_feedback: "PROTO-CLIENT-RETURN",
     other: "archive",
   };

   await db.insert(inboxItems).values({
     type: "lark_message",  // Keep the type for display differentiation
     status: classification.category === "other" ? "dismissed" : "pending",
     protocol: routeMap[classification.category] ?? null,
     priority: priorityFromCategory(classification.category),
     // ... rest
   });
   ```

4. **Mettre à jour `priorityFromCategory`** pour les nouvelles catégories :
   ```typescript
   function priorityFromCategory(category: string): "high" | "medium" | "low" {
     switch (category) {
       case "new_project": return "high";
       case "project_feedback": return "high";
       case "enquiry": return "medium";
       case "other": return "low";
       default: return "medium";
     }
   }
   ```

5. **ClickUp search pour project_feedback** : si `category === "project_feedback"` et `clickupProjectHint` non null, appeler `/api/admin/clickup/search` (même logique que Fix 2 pour les emails).

**`src/app/admin/(authenticated)/page.tsx`** — Filtrage

Le filtrage par onglet (Fix 4) utilise `protocol` pour mapper les catégories. Comme les lark_message auront maintenant le même `protocol` que les emails (`PROTO-EMAIL-INTAKE`, `PROTO-ENQUIRY`, etc.), ils apparaîtront automatiquement dans les bons onglets sans modification supplémentaire du code de filtrage.

Vérifier que la logique de filtrage ne filtre PAS par `type === "email_classified"` — elle doit filtrer par `protocol`, ce qui inclut naturellement les lark_message avec le bon protocol.

**`src/components/inbox/EmailCard.tsx`** — Boutons d'action

Les boutons d'action sont déjà rendus pour les lark_message (car le composant est utilisé pour `email_classified || lark_message`). Vérifier que :
- Un lark_message `new_project` affiche "Create Brief" + "Draft Reply" + "Archive"
- Un lark_message `project_feedback` affiche "Add ClickUp Comment" + "Draft Reply" + "Archive"
- Un lark_message `enquiry` affiche "Draft Reply" + "Archive"
- Un lark_message `other` n'apparaît pas (dismissed)

**Adaptation du prompt LLM pour le contexte Lark** : le prompt doit préciser que le message vient de Lark (pas un email) et que le `draftReply` sera une réponse Lark (plus courte, style messagerie instantanée, pas de "Best regards" formel). Le contexte du message est différent (chat ID, pas de subject line), donc le prompt doit s'adapter :
```
Context: This is a Lark (Feishu) instant message, not an email.
The reply draft should be conversational and concise (1-2 sentences, no formal greeting/closing).
Classify using the same 4 categories as emails.
```

### Summary stocké dans l'inbox item

Le champ `summary` (JSON) doit inclure les mêmes champs que pour les emails classifiés, pour que l'EmailCard puisse parser uniformément :
```json
{
  "from": "<sender open_id or display name>",
  "subject": "[Lark] <first 80 chars of message>",
  "bodyPreview": "<full text content>",
  "classification": {
    "category": "new_project",
    "confidence": 0.92,
    "reasoning": "...",
    "suggestedAction": "...",
    "draftReply": "...",
    "language": "en",
    "routeTo": "PROTO-EMAIL-INTAKE"
  }
}
```

Cela garantit que `parseEmailPayload()` dans la page inbox fonctionne identiquement pour les emails et les messages Lark.

### Dépendances
- Fix 3 (nouvelles catégories email) DOIT être fait AVANT Fix 7
- Fix 4 (filtres inbox) DOIT être fait AVANT Fix 7 (pour que le filtrage par protocol fonctionne)
- Fix 2 (ClickUp search) est recommandé AVANT Fix 7 (pour le enrichissement project_feedback)

### Critères de validation
- [ ] GIVEN un message Lark "We need 50 social media banners for Q3 launch" WHEN webhook reçu THEN `category === "new_project"` et `protocol === "PROTO-EMAIL-INTAKE"`
- [ ] GIVEN un message Lark classifié `new_project` WHEN inbox chargée avec onglet "New Projects" actif THEN le message Lark apparaît dans la liste avec le badge "Lark"
- [ ] GIVEN un message Lark classifié `new_project` WHEN EmailCard rendu THEN les boutons "Create Brief", "Draft Reply", "Archive" sont affichés
- [ ] GIVEN un message Lark classifié `project_feedback` avec un `clickupProjectHint` WHEN classification termine THEN le search ClickUp est exécuté et `taskId`/`taskUrl` sont stockés si trouvés
- [ ] GIVEN un message Lark classifié `other` WHEN webhook reçu THEN `status === "dismissed"` (n'apparaît pas dans l'inbox active)
- [ ] GIVEN un message Lark WHEN EmailCard affiché THEN le `draftReply` est conversationnel (pas de "Best regards,\nThe Sarani Team")
- [ ] GIVEN l'onglet "All" actif WHEN items chargés THEN les emails ET les messages Lark classifiés sont mélangés, triés par `createdAt` DESC
- [ ] GIVEN un message Lark en français WHEN classification THEN `language === "fr"` et `draftReply` en français
