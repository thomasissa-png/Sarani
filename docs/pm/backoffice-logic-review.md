# Back-office — Revue logique opérationnelle
*Produit par @pm — 2026-03-26*
*Basé sur l'analyse du code source et des specs phase3-integrations-specs.md*

---

## Score de cohérence logique : 6/10

Le back-office est techniquement solide mais souffre d'un **problème d'identité** : deux sections font des choses similaires (Projects et Tracker), la section Quotes vit dans sa propre bulle sans connexion au Tracker, et le flux de création de projet aboutit sur une page morte (pas de redirection vers le tracker après création). Les fondations sont bonnes — les gaps sont tous corrigibles.

---

## Tableau d'analyse par section

### 1. Projects (`/admin/projects`)

| Dimension | Détail |
|---|---|
| **Ce que fait le code actuellement** | Affiche une liste de "projets" construits dynamiquement en groupant les `agentOutputs` par `(clientId, briefSummary)`. Ce ne sont pas de vrais projets — ce sont des sessions de briefs IA regroupées. Aucune connexion ClickUp. Les boutons en header pointent vers `/admin/quick-brief` et `/admin/agents/pm` pour créer un nouveau brief. |
| **Ce que Thomas attend** | Voir la liste des vrais projets clients (= les lignes du tracker ClickUp/Excel). Et si je crée un projet depuis cette page, ça doit créer une tâche dans ClickUp. |
| **Gap** | Le gap est total. `/admin/projects` affiche des outputs IA, pas des projets opérationnels. ClickUp n'est pas consulté. La création de projet depuis cette page n'existe pas — elle se trouve dans `/admin/tracker/new`. |
| **Recommandation** | Deux options : (A) Renommer `/admin/projects` en "AI Outputs" ou "Briefs" pour refléter ce qu'il fait réellement, et laisser le Tracker être la vue des vrais projets. (B) Transformer `/admin/projects` en une vue des projets ClickUp/tracker (en supprimant le doublon avec le Tracker). **L'option A est recommandée** — elle préserve les deux utilités sans casser l'existant. |

---

### 2. Tracker (`/admin/tracker`) + New Project (`/admin/tracker/new`)

| Dimension | Détail |
|---|---|
| **Ce que fait le code actuellement** | `/admin/tracker` : vue unifiée ClickUp + SharePoint + Evoliz avec filtres, tri, pagination, statuts API en temps réel. Très complet. Bouton "New Project" en header qui pointe vers `/admin/tracker/new`. `/admin/tracker/new` : formulaire de création projet avec champs Client, Project Name, Contact, Category, Division (auto-détectée depuis ClickUp), Estimated Value. À la soumission, appelle `/api/admin/integrations/create-project` qui crée simultanément la tâche ClickUp, le dossier SharePoint et la ligne Excel. |
| **Ce que Thomas attend** | Voir la liste des projets dans le Tracker. Créer un projet depuis le Tracker → ça doit s'envoyer dans ClickUp. **C'est exactement ce qui est implémenté.** |
| **Gap** | Pas de gap fonctionnel majeur. Deux points d'amélioration : (1) Après la création réussie (`allSuccess`), le seul bouton disponible est "Create another project" — il n'y a pas de bouton "View in Tracker" pour retourner directement voir le projet créé dans la liste. (2) Le Tracker affiche un filtre "in progress" dans `PROJECT_STATUSES` alors que ClickUp utilise "OPEN / ON HOLD / SUBMITTED / CLOSED" — incohérence de labels entre les specs et le code. |
| **Recommandation** | (1) Ajouter un bouton "Back to Tracker" à côté de "Create another project" après succès. (2) Aligner les labels de statut projet dans le filtre du Tracker avec les statuts ClickUp réels. |

---

### 3. Quotes (`/admin/quotes`)

| Dimension | Détail |
|---|---|
| **Ce que fait le code actuellement** | Page autonome avec un formulaire manuel complet : Client (dropdown), Contact, Project Name (champ libre), Description, Scope, ligne items (Qté × Prix unitaire = Total). Le tout génère un PDF téléchargeable + upload SharePoint. Historique des quotes précédentes en bas de page. Le formulaire est entièrement manuel — aucune donnée n'est pré-remplie depuis le Tracker. |
| **Ce que Thomas attend** | "Ce ne serait pas mieux de faire les quotes directement depuis le tracker ? Cliquer sur 'generate quote' de la ligne dont je veux générer ?" |
| **Gap** | Total. La logique de Thomas est parfaitement juste. Actuellement, pour générer une quote, il faut : (1) aller dans Quotes, (2) retaper le nom du client, (3) retaper le nom du projet, (4) ressaisir manuellement tous les line items — alors que toutes ces données existent déjà dans le Tracker (colonnes Q-AX pour les line items, Customer, Division, Contact). C'est une saisie double inutile et source d'erreurs. |
| **Recommandation** | Ajouter un bouton "Generate Quote" sur chaque ligne du Tracker. Ce bouton pré-remplit le formulaire Quotes avec les données de la ligne : clientName, projectName, contact, et surtout les line items depuis les colonnes Q-AX du tracker Excel. Thomas n'a plus qu'à vérifier et cliquer "Download PDF". |

---

## Top 5 recommandations — ordonnées par impact

### R1 — "Generate Quote" depuis le Tracker (Impact : Critique)

**Problème** : Double saisie systématique. Thomas doit retaper manuellement des données déjà dans le Tracker.

**Solution** : Ajouter un bouton "Generate Quote" sur chaque ligne du Tracker (colonne Actions). Au clic, rediriger vers `/admin/quotes?projectId=XXX` (ou ouvrir un drawer/modal) avec les champs pré-remplis depuis la ligne du Tracker :
- `clientName` ← colonne "Customer"
- `projectName` ← colonne "Project name"
- `contactName` ← colonne "Contact"
- `items` ← colonnes Q-AX (quantities × unit prices depuis la grille tarifaire)

La page Quotes lit ces paramètres d'URL et pré-remplit le formulaire. Thomas confirme et télécharge. La saisie manuelle disparaît.

**Précondition** : la route `/admin/quotes/page.tsx` doit être adaptée pour lire les `searchParams` et pré-remplir l'état du formulaire.

---

### R2 — Rediriger vers le Tracker après création de projet (Impact : Élevé)

**Problème** : Après avoir créé un projet avec succès dans `/admin/tracker/new`, l'utilisateur est bloqué sur la page de résultat. Aucun moyen rapide de retrouver le projet dans la liste.

**Solution** : Ajouter un bouton "View in Tracker" à côté de "Create another project" une fois `allSuccess === true`. Ce bouton redirige vers `/admin/tracker` (avec optionnellement un filtre sur le client créé).

---

### R3 — Clarifier l'identité de la section "Projects" (Impact : Élevé)

**Problème** : `/admin/projects` s'appelle "Projects" mais affiche des outputs IA groupés, pas des projets opérationnels. Thomas arrive sur cette page en attendant de voir ses projets clients, et trouve à la place une liste de briefs IA.

**Solution** : Renommer la section "Projects" → "AI Outputs" (ou "Briefs & Outputs") dans la sidebar et le header de page. Cela élimine la confusion et rend explicite la différence entre "les projets client" (dans le Tracker) et "les sessions de brief IA" (dans AI Outputs).

---

### R4 — Aligner les labels de statut projet (Impact : Moyen)

**Problème** : Dans le Tracker, le filtre `PROJECT_STATUSES` contient "in progress" — label qui n'existe pas dans ClickUp. Les statuts ClickUp sont OPEN / ON HOLD / SUBMITTED / CLOSED. Le filtre "in progress" ne retournera jamais de résultats si les données viennent de ClickUp.

**Solution** : Mettre à jour `PROJECT_STATUSES` dans `tracker/page.tsx` :
```
const PROJECT_STATUSES = ["All", "Open", "On Hold", "Submitted", "Closed"]
```
Et aligner `getStatusBadgeClasses()` avec ces nouveaux labels.

---

### R5 — Ajouter un lien "Tracker" dans l'empty state de la section Projects (Impact : Faible)

**Problème** : Quand un utilisateur atterrit sur `/admin/projects` sans outputs IA, le message dit "Create your first brief" — ce qui est pertinent pour les agents IA. Mais si Thomas cherche ses projets clients, il n'a aucune indication que le vrai endroit est le Tracker.

**Solution** : Dans le message empty state de la page Projects, ajouter une ligne :
"Looking for client projects? Go to the [Tracker →](`/admin/tracker`)"

---

## Wireframe textuel — Flux idéal

```
SIDEBAR
├── Dashboard
├── Quick Brief          ← lancer une tâche IA rapide
├── AI Outputs           ← (ex-"Projects") résultats des agents IA
├── Tracker              ← TOUT LE BUSINESS est ici
│   └── [New Project]    ← crée dans ClickUp + SharePoint + Excel
├── Quotes               ← génération PDF (accessible aussi via Tracker)
├── Clients
└── Users

FLUX 1 — Voir les projets clients
Thomas clique Tracker
→ liste unifiée ClickUp + Excel + Evoliz, filtrée par client/statut/invoice
→ chaque ligne = un projet avec toutes ses infos opérationnelles

FLUX 2 — Créer un nouveau projet
Thomas clique [New Project] dans le Tracker
→ formulaire /admin/tracker/new (déjà bien implémenté)
→ après succès : [Create another] [View in Tracker ← MANQUANT]

FLUX 3 — Générer un devis depuis une ligne du Tracker
Thomas voit la ligne "TikTok — Holiday Campaign"
→ clic sur [Generate Quote] dans la colonne Actions ← A CRÉER
→ redirige vers /admin/quotes?projectId=XXX
→ formulaire Quotes pré-rempli : client, projet, contact, line items depuis Excel
→ Thomas vérifie, clique [Preview] → [Download PDF]
→ PDF téléchargé + uploadé sur SharePoint automatiquement

FLUX 4 — Lancer un brief IA sur un projet
Thomas est dans le Tracker, ligne "Sony — Black Friday"
→ clic sur [AI Brief] (optionnel, futur)
→ ou navigue vers Quick Brief / AI Outputs pour les outils IA
→ les deux mondes (opérationnel + IA) restent séparés mais navigables
```

---

## Hypothèses à valider

- **H1** : Les colonnes Q-AX de l'Excel tracker contiennent bien les line items nécessaires pour pré-remplir les quotes. Thomas doit confirmer la structure exacte des colonnes (voir OQ-5 dans phase3-integrations-specs.md).
- **H2** : Thomas souhaite que le bouton "Generate Quote" soit dans le Tracker (et non que la page Quotes soit entièrement remplacée). La page Quotes reste utile pour créer une quote ex nihilo (prospect sans projet tracker existant).
- **H3** : Les statuts projet dans ClickUp sont bien OPEN / ON HOLD / SUBMITTED / CLOSED — à confirmer avec la configuration réelle du workspace ClickUp de Sarani.

---

**Handoff → @fullstack**
- Fichiers produits : `docs/pm/backoffice-logic-review.md`
- Décisions prises :
  - Renommer "Projects" → "AI Outputs" dans sidebar (R3)
  - Ajouter bouton "View in Tracker" après création projet (R2)
  - Ajouter bouton "Generate Quote" par ligne dans le Tracker, avec pré-remplissage du formulaire Quotes (R1 — priorité critique)
  - Aligner les labels de statut ClickUp dans le filtre du Tracker (R4)
- Points d'attention :
  - R1 nécessite de lire les colonnes Q-AX du tracker Excel — dépendance sur la confirmation de Thomas (H1)
  - Le pré-remplissage de la page Quotes peut se faire via `searchParams` (URL params) sans modifier l'architecture existante
  - Ne pas supprimer la page Quotes standalone — elle reste utile pour les quotes hors-tracker
