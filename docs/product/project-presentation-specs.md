# Project Presentation Link — Functional Specs

> Agent : @product-manager | Date : 2026-03-28 | Statut : Draft V1

---

## 1. Product Vision

**Problem statement** : Quand Sarani veut partager l'avancement d'un projet avec Sophie (cliente), il n'existe pas de lien web structuré. Thomas envoie des assets SharePoint en vrac, ou un email avec des captures d'écran. Sophie ne peut pas partager facilement en interne. Pas de page de présentation professionnelle.

**Solution** : Un bouton "Share Preview" dans le back-office Tracker génère une URL publique permanente `/project/[client]/[project-slug]` présentant le projet au client — intro compilée depuis les données existantes + visuels (images + PDF) listés automatiquement depuis les sous-dossiers "Batch" SharePoint. Zéro action manuelle de la part de Thomas.

**KPI North Star rattaché** : NPS / satisfaction client (Sophie peut partager la page en interne — signal de professionnalisme et de confiance).

**Scope V1** :
- Génération de l'URL publique depuis le tracker back-office
- Page publique : intro statique (données existantes) + galerie auto depuis SharePoint Batches
- PDF : lien cliquable vers la webUrl SharePoint (pas de viewer inline)
- Durée : permanent tant que le projet est actif (pas d'expiration)

**Hors scope V1** : intro générée par IA, commentaires client, mot de passe de protection, analytics de consultation.

---

## 2. User Stories

### US-01 : Générer le lien de présentation depuis le tracker

**Persona** : Thomas (admin back-office Sarani)
**Epic** : Project Presentation Link
**Dépendances** : Aucune
**Priorité RICE** : R=100 I=8 C=8 E=1 → Score=6400

#### Job-to-be-done
En tant que Thomas, je veux cliquer sur "Share Preview" dans la fiche projet du tracker afin de générer une URL publique que je peux envoyer à Sophie en 5 secondes.

#### Contexte de navigation
- **Page/écran d'origine** : Back-office Tracker — fiche projet (ligne ou modal détail)
- **Déclencheur** : Clic sur le bouton "Share Preview"
- **Page/écran de destination (succès)** : Même page — une notification toast affiche l'URL copiée dans le presse-papier
- **Page/écran de destination (échec)** : Même page — toast d'erreur avec message explicite

#### Données et champs
| Champ | Type | Obligatoire | Validation | Limites | Exemple |
|---|---|---|---|---|---|
| client_slug | string | Oui | Slugifié depuis clientName (lowercase, tirets, sans accents) | 2-50 chars | `sony` |
| project_slug | string | Oui | Slugifié depuis projectName | 2-100 chars | `black-friday-banners-2024` |
| project_id | string | Oui | ID interne existant du projet | — | `proj_abc123` |
| sharepoint_customer_folder | string | Oui | Depuis CLIENT_MAPPINGS (config.ts) | — | `02. Sony` |
| created_at | date | Oui | Auto — timestamp serveur | — | `2026-03-28T10:00:00Z` |
| is_active | boolean | Oui | true par défaut | — | `true` |

#### 5 états UI (Gate G21)
| État | Comportement | Message/Affichage |
|---|---|---|
| Défaut | Bouton "Share Preview" visible dans la fiche projet | Bouton avec icône share, libellé "Share Preview" |
| Loading | Après clic — appel POST en cours (génération + vérification SharePoint) | Bouton désactivé, spinner inline, libellé "Generating…" |
| Vide | N/A — le bouton existe toujours même si aucun batch n'est encore disponible | — |
| Erreur | Échec de création (slug déjà pris avec conflit, SharePoint inaccessible) | Toast rouge : "Could not generate preview link. Try again." + bouton réactivé |
| Succès | Lien généré — URL copiée automatiquement dans le presse-papier | Toast vert : "Preview link copied to clipboard — /project/sony/black-friday-banners-2024" |

#### Critères d'acceptance (Given/When/Then)

**Happy path :**
- [ ] GIVEN Thomas est sur la fiche d'un projet Sony WHEN il clique sur "Share Preview" THEN un enregistrement est créé en base, l'URL `/project/sony/black-friday-banners-2024` est copiée dans le presse-papier, un toast vert s'affiche avec l'URL complète
- [ ] GIVEN le projet a déjà un lien généré WHEN Thomas reclique sur "Share Preview" THEN l'URL existante est copiée dans le presse-papier (pas de doublon créé), toast vert : "Preview link copied — already exists"
- [ ] GIVEN la génération réussit WHEN Thomas inspecte la base THEN un enregistrement `project_previews` existe avec `project_id`, `client_slug`, `project_slug`, `is_active=true`

**Cas d'erreur :**
- [ ] GIVEN le client n'a pas de mapping SharePoint dans CLIENT_MAPPINGS WHEN Thomas clique "Share Preview" THEN toast rouge : "SharePoint folder not configured for this client. Contact dev." — aucune entrée créée en base
- [ ] GIVEN l'API SharePoint retourne une erreur 5xx WHEN Thomas clique "Share Preview" THEN le lien est quand même généré (la page publique affichera un état vide pour les visuels), toast orange : "Preview link created — SharePoint assets unavailable for now"

**Cas limites :**
- [ ] GIVEN le nom du projet contient des caractères spéciaux (`&`, `#`, espaces, accents) WHEN le slug est généré THEN les caractères spéciaux sont remplacés par des tirets, les accents sont translittérés, pas de tirets doubles
- [ ] GIVEN deux projets Sony ont des noms identiques (ex : "Campaign 2024" × 2) WHEN le second lien est généré THEN un suffixe numérique est ajouté : `campaign-2024-2`
- [ ] GIVEN Thomas double-clique rapidement sur "Share Preview" WHEN les deux requêtes arrivent THEN une seule entrée est créée (idempotence via upsert sur `project_id`)
- [ ] GIVEN la session admin expire WHEN Thomas clique "Share Preview" THEN redirection vers `/login` avec message "Session expired"

**Permissions :**
- [ ] GIVEN un utilisateur non authentifié WHEN il appelle POST `/api/project-previews` THEN réponse 401 — pas d'entrée créée

**Données existantes :**
- [ ] GIVEN un projet dont le slug existe déjà pour un autre projet du même client WHEN le second slug est calculé THEN suffixe `-2` ajouté automatiquement sans erreur pour Thomas

#### Payload API
- **Endpoint** : `POST /api/project-previews`
- **Authentification** : Session cookie (admin back-office uniquement)
- **Rate limit** : 20 requêtes/min par session
- **Request body** :
```json
{
  "projectId": "proj_abc123"
}
```
- **Response succès** :
```json
{
  "url": "/project/sony/black-friday-banners-2024",
  "created": true
}
```
- **Response erreur** :
```json
{
  "error": "NO_SHAREPOINT_MAPPING",
  "message": "SharePoint folder not configured for client: BrandNative"
}
```
Status codes : 200 (upsert — déjà existant), 201 (nouveau), 400 (validation), 401 (non auth), 500 (erreur serveur)

#### Events analytics
| Event | Trigger | Propriétés | Funnel |
|---|---|---|---|
| `preview_link_generated` | POST /api/project-previews 201 | `client_slug`, `project_slug`, `project_id` | retention |
| `preview_link_copied` | Toast succès affiché | `url`, `already_existed` | retention |
| `preview_link_error` | Toast erreur affiché | `error_code`, `client` | retention |

---

### US-02 : Consulter la page de présentation projet (vue client Sophie)

**Persona** : Sophie (Head of Marketing, cliente Sarani)
**Epic** : Project Presentation Link
**Dépendances** : US-01
**Priorité RICE** : R=100 I=9 C=8 E=1 → Score=7200

#### Job-to-be-done
En tant que Sophie, je veux ouvrir un lien reçu par email et voir immédiatement une présentation claire du projet (nom, brief, visuels livrés) afin de partager en interne avec mon équipe sans passer par SharePoint.

#### Contexte de navigation
- **Page/écran d'origine** : Email de Thomas avec l'URL, ou message Slack
- **Déclencheur** : Clic sur l'URL `/project/[client]/[project-slug]`
- **Page/écran de destination (succès)** : Page publique de présentation projet
- **Page/écran de destination (échec)** : Page 404 si projet inexistant ou inactif

#### Données et champs
| Champ | Type | Obligatoire | Validation | Limites | Exemple |
|---|---|---|---|---|---|
| client_slug | string | Oui | Paramètre URL | — | `sony` |
| project_slug | string | Oui | Paramètre URL | — | `black-friday-banners-2024` |

#### 5 états UI (Gate G21)
| État | Comportement | Message/Affichage |
|---|---|---|
| Défaut | Page chargée avec intro + galerie | Header Sarani + nom projet + brief + section visuels |
| Loading | Chargement initial de la page (SSR) + lazy-load des assets SharePoint | Skeleton sur la section galerie (titres et zones images en gris) |
| Vide | Aucun batch trouvé dans SharePoint | Section galerie affiche : "Assets coming soon — check back later." |
| Erreur | Projet inexistant, inactif, ou slug invalide | Page 404 branded Sarani : "This project page is not available." + lien vers sarani.studio |
| Succès | Tous les assets listés correctement | Galerie avec batches organisés par sous-dossier, images affichées, PDF en lien cliquable |

#### Critères d'acceptance (Given/When/Then)

**Happy path :**
- [ ] GIVEN Sophie ouvre `/project/sony/black-friday-banners-2024` WHEN la page se charge THEN elle voit : nom du client (Sony), nom du projet (Black Friday Banners 2024), la date du projet, le brief (si disponible dans les données du tracker), et la section "Deliverables"
- [ ] GIVEN le dossier SharePoint `02. Sony/[project-folder]/` contient des sous-dossiers "Batch X" WHEN la page charge THEN chaque batch apparaît comme une section distincte avec les images inline et les PDF en liens cliquables
- [ ] GIVEN un PDF est présent dans un batch WHEN Sophie clique dessus THEN le lien ouvre la webUrl SharePoint dans un nouvel onglet (target="_blank")
- [ ] GIVEN les images sont présentes dans un batch WHEN Sophie voit la galerie THEN les images sont affichées en grille responsive (lazy-loaded), cliquables pour agrandissement lightbox

**Cas d'erreur :**
- [ ] GIVEN le slug ne correspond à aucun enregistrement `project_previews` WHEN Sophie charge la page THEN status HTTP 404 + page branded "This project page is not available."
- [ ] GIVEN `is_active=false` sur l'enregistrement WHEN Sophie charge la page THEN même comportement que 404 (pas d'indication sur la raison)
- [ ] GIVEN SharePoint retourne une erreur lors du listing des batches WHEN Sophie charge la page THEN l'intro s'affiche normalement, la section galerie affiche "Assets temporarily unavailable." sans bloquer le reste de la page

**Cas limites :**
- [ ] GIVEN Sophie partage le lien sur mobile WHEN elle l'ouvre THEN la page est responsive (viewport 375px minimum), les images s'adaptent en une colonne
- [ ] GIVEN le brief est vide ou null dans les données projet WHEN la page s'affiche THEN le champ brief est masqué (pas de label vide visible)
- [ ] GIVEN un batch contient 50+ images WHEN la page charge THEN lazy-loading activé — seules les images dans le viewport sont chargées initialement
- [ ] GIVEN le nom de projet contient des apostrophes ou guillemets WHEN la page affiche le titre THEN les caractères sont correctement encodés (XSS prevention)

**Permissions :**
- [ ] GIVEN n'importe quel visiteur non authentifié WHEN il ouvre l'URL THEN la page se charge sans login requis (page publique)

**Données existantes :**
- [ ] GIVEN le projet a été renommé après la génération du lien WHEN Sophie charge la page THEN le nom affiché correspond aux données actuelles du projet (lookup dynamique), pas au slug figé

#### Payload API
- **Endpoint** : `GET /api/project-previews/[client-slug]/[project-slug]`
- **Authentification** : Publique (aucune)
- **Rate limit** : 60 requêtes/min par IP
- **Request body** : GET uniquement — pas de body
- **Response succès** :
```json
{
  "project": {
    "name": "Black Friday Banners 2024",
    "clientName": "Sony",
    "brief": "Series of animated banners for Black Friday campaign across EU markets.",
    "projectDate": "2024-11-15",
    "sharepointCustomerFolder": "02. Sony"
  },
  "batches": [
    {
      "name": "Batch 1",
      "items": [
        { "name": "banner_300x250.png", "webUrl": "https://...", "mimeType": "image/png" },
        { "name": "brief_v2.pdf", "webUrl": "https://...", "mimeType": "application/pdf" }
      ]
    }
  ]
}
```
- **Response erreur** :
```json
{ "error": "NOT_FOUND" }
```
Status codes : 200 (trouvé), 404 (slug inconnu ou inactif), 500 (erreur serveur)

#### Events analytics
| Event | Trigger | Propriétés | Funnel |
|---|---|---|---|
| `preview_page_viewed` | Page chargée (200) | `client_slug`, `project_slug`, `batch_count`, `asset_count` | retention |
| `preview_pdf_clicked` | Clic sur lien PDF | `filename`, `project_slug` | retention |
| `preview_image_enlarged` | Clic lightbox | `filename`, `project_slug` | retention |
| `preview_404` | Page chargée (404) | `attempted_slug` | retention |

---

### US-03 : Désactiver un lien de présentation depuis le tracker

**Persona** : Thomas (admin back-office Sarani)
**Epic** : Project Presentation Link
**Dépendances** : US-01
**Priorité RICE** : R=30 I=6 C=9 E=1 → Score=1620

#### Job-to-be-done
En tant que Thomas, je veux pouvoir désactiver un lien de présentation existant afin de couper l'accès à Sophie si le projet est annulé ou confidentiel.

#### Contexte de navigation
- **Page/écran d'origine** : Back-office Tracker — fiche projet (le bouton "Share Preview" est remplacé par "Preview Active" + option "Deactivate")
- **Déclencheur** : Clic sur "Deactivate preview"
- **Page/écran de destination (succès)** : Même page — toast de confirmation, bouton repasse à "Share Preview"
- **Page/écran de destination (échec)** : Toast erreur

#### Données et champs
| Champ | Type | Obligatoire | Validation | Limites | Exemple |
|---|---|---|---|---|---|
| project_id | string | Oui | ID existant | — | `proj_abc123` |
| is_active | boolean | Oui | Mis à `false` | — | `false` |

#### 5 états UI (Gate G21)
| État | Comportement | Message/Affichage |
|---|---|---|
| Défaut | Bouton "Preview Active" (badge vert) + menu déroulant avec "Copy link" et "Deactivate" | Badge vert "Active", chevron dropdown |
| Loading | Clic sur "Deactivate" — appel PATCH en cours | Bouton désactivé, spinner |
| Vide | N/A | — |
| Erreur | Échec du PATCH | Toast rouge : "Could not deactivate. Try again." |
| Succès | `is_active=false` en base | Toast orange : "Preview link deactivated." — bouton revient à "Share Preview" |

#### Critères d'acceptance (Given/When/Then)

**Happy path :**
- [ ] GIVEN Thomas clique "Deactivate" sur un projet avec lien actif WHEN la requête PATCH réussit THEN `is_active=false` en base, toast orange, bouton revient à l'état initial "Share Preview"
- [ ] GIVEN Sophie tente d'accéder au lien après désactivation WHEN elle charge la page THEN elle voit une page 404 branded (pas de distinction "désactivé" vs "inexistant")

**Cas d'erreur :**
- [ ] GIVEN le réseau échoue pendant le PATCH WHEN la requête timeout THEN toast rouge, `is_active` inchangé en base

**Cas limites :**
- [ ] GIVEN Thomas réactive un lien désactivé (reclique "Share Preview") WHEN la requête POST arrive THEN `is_active` repasse à `true` — pas de nouvelle entrée créée (upsert)
- [ ] GIVEN deux admins désactivent le même lien simultanément WHEN les deux PATCH arrivent THEN résultat idempotent — `is_active=false`, pas d'erreur

**Permissions :**
- [ ] GIVEN utilisateur non authentifié WHEN il appelle PATCH `/api/project-previews/[id]` THEN 401

**Données existantes :**
- [ ] GIVEN le projet n'a pas de lien généré WHEN Thomas tente de désactiver THEN le bouton "Deactivate" n'est pas visible (impossible d'atteindre cet état via l'UI)

#### Payload API
- **Endpoint** : `PATCH /api/project-previews/[project-id]`
- **Authentification** : Session cookie (admin uniquement)
- **Rate limit** : 20 requêtes/min
- **Request body** :
```json
{ "is_active": false }
```
- **Response succès** :
```json
{ "updated": true, "is_active": false }
```
- **Response erreur** :
```json
{ "error": "NOT_FOUND" }
```
Status codes : 200 (mis à jour), 401, 404, 500

#### Events analytics
| Event | Trigger | Propriétés | Funnel |
|---|---|---|---|
| `preview_link_deactivated` | PATCH réussi | `project_id`, `client_slug` | retention |

---

## 3. Data Model

### New table : `project_previews`

```sql
CREATE TABLE project_previews (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      TEXT NOT NULL UNIQUE,   -- FK to projects table (1 preview per project)
  client_slug     TEXT NOT NULL,          -- e.g. "sony"
  project_slug    TEXT NOT NULL,          -- e.g. "black-friday-banners-2024"
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_client_project_slug UNIQUE (client_slug, project_slug)
);

CREATE INDEX idx_project_previews_slugs ON project_previews (client_slug, project_slug);
CREATE INDEX idx_project_previews_project_id ON project_previews (project_id);
```

**Slug generation rule (server-side utility) :**
1. Lowercase the input string
2. Transliterate accents (é→e, ü→u, etc.) via a unicode normalization pass (NFD + strip combining marks)
3. Replace `&` with `and`, `/` with `-`
4. Replace any sequence of non-alphanumeric characters with a single `-`
5. Strip leading and trailing `-`
6. On conflict with `UNIQUE (client_slug, project_slug)`: append `-2`, `-3`, etc. until unique

**No new columns needed on existing tables.** The presentation page does a live JOIN on `projects` (or equivalent) using `project_id` to get `name`, `brief`, `clientName`, `projectDate`.

**SharePoint folder resolution (no new column) :** client slug → reverse-lookup in `CLIENT_MAPPINGS` from `config.ts` to get `sharepointCustomerFolder`. The project folder name within that customer folder is resolved by a fuzzy match against the project name (see Section 6).

---

## 4. API Routes

### Route 1 — `POST /api/project-previews`

**Purpose** : Create or reactivate a presentation link for a project.
**Auth** : Back-office session cookie (NextAuth / admin only).
**Logic** :
1. Validate `projectId` — fetch project from DB, 404 if not found.
2. Check `CLIENT_MAPPINGS` for the client — if no mapping: return 400 `NO_SHAREPOINT_MAPPING`.
3. Generate `client_slug` and `project_slug` from client name + project name.
4. Upsert into `project_previews` on `project_id`:
   - If exists and `is_active=false`: set `is_active=true`, return 200.
   - If exists and `is_active=true`: return 200 (idempotent, same URL).
   - If new: insert, handle slug collision with numeric suffix, return 201.
5. Return full public URL: `https://sarani.studio/project/${clientSlug}/${projectSlug}`.

**Request** :
```json
{ "projectId": "proj_abc123" }
```

**Response 201** :
```json
{ "url": "https://sarani.studio/project/sony/black-friday-banners-2024", "created": true }
```

**Response 200** (already existed) :
```json
{ "url": "https://sarani.studio/project/sony/black-friday-banners-2024", "created": false }
```

**Error codes** : 400 `NO_SHAREPOINT_MAPPING`, 401 `UNAUTHORIZED`, 404 `PROJECT_NOT_FOUND`, 500 `INTERNAL_ERROR`.

---

### Route 2 — `GET /api/project-previews/[client-slug]/[project-slug]`

**Purpose** : Fetch full project data for the public presentation page render (called server-side in Next.js `generateStaticParams` / ISR).
**Auth** : Public — no authentication.
**Cache** : `{ next: { revalidate: 300 } }` (5-minute ISR).
**Logic** :
1. Look up `project_previews` by `(client_slug, project_slug)`.
2. If not found or `is_active=false`: return 404.
3. Fetch project details from `projects` table via `project_id`.
4. Resolve SharePoint path from `CLIENT_MAPPINGS` using client name.
5. Call `listDriveItems(SHAREPOINT_ASSETS_DRIVE_ID, customerFolderPath)` to find the project sub-folder (fuzzy match on name — see Section 6).
6. For each matched Batch sub-folder: call `listDriveItems` again to list assets.
7. Filter assets by mime type (images + PDF only). Sort batches by name.
8. Return combined payload.

**Response 200** :
```json
{
  "project": {
    "name": "Black Friday Banners 2024",
    "clientName": "Sony",
    "brief": "Animated banners for Black Friday across EU markets.",
    "projectDate": "2024-11-15"
  },
  "batches": [
    {
      "name": "Batch 1",
      "items": [
        { "name": "banner_300x250.png", "webUrl": "https://...", "mimeType": "image/png", "size": 204800 },
        { "name": "specs_v2.pdf",       "webUrl": "https://...", "mimeType": "application/pdf", "size": 512000 }
      ]
    }
  ]
}
```

**Error codes** : 404 `NOT_FOUND`, 500 `INTERNAL_ERROR`.

---

### Route 3 — `PATCH /api/project-previews/[project-id]`

**Purpose** : Deactivate (or reactivate) a presentation link.
**Auth** : Back-office session cookie (admin only).
**Logic** :
1. Validate `project_id` — fetch `project_previews` record, 404 if not found.
2. Apply `{ is_active, updated_at: now() }` patch.
3. Return updated record state.

**Request** :
```json
{ "is_active": false }
```

**Response 200** :
```json
{ "updated": true, "is_active": false }
```

**Error codes** : 401 `UNAUTHORIZED`, 404 `NOT_FOUND`, 500 `INTERNAL_ERROR`.

---

## 5. UI Wireframes ASCII

### 5.1 — "Share Preview" button in the Tracker back-office

Project row (state: no preview generated yet):
```
┌────────────────────────────────────────────────────────────────┐
│ Sony  │  Black Friday Banners 2024  │  In Progress  │ [Share Preview ↗] │
└────────────────────────────────────────────────────────────────┘
```

Project row (state: preview active):
```
┌────────────────────────────────────────────────────────────────────────────┐
│ Sony  │  Black Friday Banners 2024  │  In Progress  │ [● Active ▾]         │
│                                                       ├─ Copy link          │
│                                                       └─ Deactivate         │
└────────────────────────────────────────────────────────────────────────────┘
```

Success toast (bottom-right, auto-dismiss 5s):
```
┌──────────────────────────────────────────────────────┐
│ ✓  Preview link copied to clipboard                  │
│    sarani.studio/project/sony/black-friday-…         │
└──────────────────────────────────────────────────────┘
```

---

### 5.2 — Public presentation page `/project/[client]/[project-slug]`

```
┌──────────────────────────────────────────────────────────────────┐
│  [Sarani logo]                              sarani.studio         │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Sony                                                             │
│  ──────────────────────────────────────────────                   │
│  Black Friday Banners 2024                                        │
│  Project date: November 2024                                      │
│                                                                   │
│  Animated banners for Black Friday campaign across EU markets.    │
│  Series of 12 formats, 4 languages, display + social.             │
│                                                                   │
├──────────────────────────────────────────────────────────────────┤
│  DELIVERABLES                                                     │
│                                                                   │
│  Batch 1                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │ [img]    │  │ [img]    │  │ [img]    │  │ [img]    │         │
│  │ 300x250  │  │ 728x90   │  │ 160x600  │  │ 320x50   │         │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘         │
│  📄 brief_v2.pdf ↗                                               │
│                                                                   │
│  Batch 2                                                          │
│  ┌──────────┐  ┌──────────┐                                      │
│  │ [img]    │  │ [img]    │                                      │
│  │ 1080x1080│  │ 1920x1080│                                      │
│  └──────────┘  └──────────┘                                      │
│                                                                   │
├──────────────────────────────────────────────────────────────────┤
│  Powered by Sarani — sarani.studio                               │
└──────────────────────────────────────────────────────────────────┘
```

**Empty state (no batches found):**
```
│  DELIVERABLES                                                     │
│                                                                   │
│  Assets coming soon — check back later.                          │
```

**Error state (SharePoint unavailable):**
```
│  DELIVERABLES                                                     │
│                                                                   │
│  Assets temporarily unavailable.                                 │
│  The rest of the project information is shown above.             │
```

**Responsive (mobile 375px):** grid collapses to 1 column. Images full-width. PDF links remain full-width tap targets (min 44px height).

---

## 6. SharePoint Integration — Batch Discovery

### Step-by-step resolution

**Input** : `client_slug` + `project_id` from `project_previews` table.

**Step 1 — Resolve customer folder path**
```
clientName → getMappingBySpaceName(clientName) → ClientIntegrationMapping.sharepointCustomerFolder
customerFolderPath = ASSETS_CUSTOMERS_BASE_PATH + "/" + sharepointCustomerFolder
// e.g. "/Documents/03. Customers/02. Sony"
```

**Step 2 — Find the project sub-folder (fuzzy match)**
```
items = listDriveItems(SHAREPOINT_ASSETS_DRIVE_ID, customerFolderPath)
// items is DriveItem[] — filter where item.folder exists
// Match strategy (ordered):
//   1. Exact match on item.name vs project.name (case-insensitive)
//   2. item.name contains a normalised version of project.name (strip special chars)
//   3. Fallback: present all folder names and log warning — use none (return empty batches)
projectFolder = matched DriveItem with folder property
```

**Step 3 — List Batch sub-folders**
```
batchCandidates = listDriveItems(SHAREPOINT_ASSETS_DRIVE_ID, projectFolder.parentReference.path + "/" + projectFolder.name)
// Filter: item.folder exists AND item.name matches /^Batch\s*\d+/i
batches = batchCandidates.filter(item => item.folder && /^Batch\s*\d+/i.test(item.name))
// Sort: natural sort on name ("Batch 1" < "Batch 2" < "Batch 10")
```

**Step 4 — List assets in each Batch folder**
```
for each batch in batches:
  assets = listDriveItems(SHAREPOINT_ASSETS_DRIVE_ID, batchPath)
  // Filter by mimeType:
  ALLOWED_MIMETYPES = ["image/png", "image/jpeg", "image/gif", "image/webp", "application/pdf"]
  filteredAssets = assets.filter(item => item.file && ALLOWED_MIMETYPES.includes(item.file.mimeType))
  // Within a batch: images first (sorted by name), then PDFs (sorted by name)
```

**Step 5 — Return structured payload**
```typescript
return {
  batches: batches.map(b => ({
    name: b.name,
    items: filteredAssets   // { name, webUrl, mimeType, size } from DriveItem
  }))
}
```

### Graph API calls budget per page render

| Call | Path | Purpose |
|---|---|---|
| 1 | `/drives/{ASSETS_DRIVE_ID}/root:{customerFolderPath}:/children` | List customer sub-folders |
| 2 | `/drives/{ASSETS_DRIVE_ID}/root:{projectFolderPath}:/children` | List Batch folders in project |
| N | `/drives/{ASSETS_DRIVE_ID}/root:{batchFolderPath}:/children` | List assets per Batch (1 call per Batch) |

**Typical total** : 2 + N calls where N = number of Batch folders (usually 1-5). All calls use the existing `graphFetch` helper from `sharepoint.ts`.

**ISR cache** : `revalidate: 300` (5 minutes). Batch additions appear on the page within 5 minutes of being uploaded to SharePoint — no manual action needed.

### `"Other customers"` space handling

If `getMappingBySpaceName` returns the `"Other customers"` mapping (`sharepointCustomerFolder: "01. Single Projects"`), the resolution continues normally. The customer folder path becomes `/Documents/03. Customers/01. Single Projects/` and the project sub-folder fuzzy match runs within it.

---

## 7. Edge Cases

### 7.1 — Slug conflicts

| Scenario | Behaviour |
|---|---|
| Two Sony projects named "Campaign 2024" | Second slug becomes `campaign-2024-2` — auto-incremented on INSERT conflict |
| Project renamed after link creation | Page title fetched live from `projects` table — slug in URL does NOT change |
| Client with no `CLIENT_MAPPINGS` entry (e.g. Brand Native) | `POST /api/project-previews` returns 400 `NO_SHAREPOINT_MAPPING`. No preview created. Thomas sees: "SharePoint folder not configured for this client." |

### 7.2 — SharePoint folder naming inconsistencies

| Scenario | Behaviour |
|---|---|
| Project folder name has extra prefix in SharePoint (e.g. "2024-11 Black Friday Banners") | Fuzzy match (Step 2) catches it via contains logic on normalised strings |
| Project folder does not exist in SharePoint at all | `batches: []` returned — page shows Empty state "Assets coming soon" |
| Batch folder named "Batch Final" or "Batch Review" | Excluded — `/^Batch\s*\d+/i` only matches numeric batches in V1 |
| Batch folder contains `.ai`, `.psd`, `.zip`, `.sketch` files | Filtered out silently — only images and PDFs shown |
| SharePoint returns 403 (token expired mid-render) | One retry after token refresh via existing `graphFetch` retry logic. If still 403: return `{ batches: [], error: "SHAREPOINT_UNAVAILABLE" }` |

### 7.3 — URL and security

| Scenario | Behaviour |
|---|---|
| Someone guesses a valid URL (brute-force) | By design, public — no secret. The URL is "intelligent" (client/project name), not randomly guessable. Acceptable risk for V1. |
| XSS via project name displayed on page | All string values escaped via React's default rendering — no `dangerouslySetInnerHTML` used |
| Open redirect via `webUrl` from SharePoint | SharePoint `webUrl` values are always `https://*.sharepoint.com` — no redirect risk. Validate domain before rendering as `href`. |
| Double-submit of "Share Preview" button | Button disabled on first click, re-enabled only after response. Server-side: upsert on `project_id` guarantees idempotency. |

### 7.4 — Performance

| Scenario | Behaviour |
|---|---|
| Batch with 50+ images | Next.js `Image` component with `loading="lazy"` and `sizes` prop. Only viewport images loaded on initial paint. |
| Page render > 3s (slow SharePoint) | ISR — if cached render available, serve stale while revalidating in background. First render after cache miss may be slow — acceptable. |
| No `projects` table record for `project_id` | This should never occur (FK constraint), but if it does: 500 `INTERNAL_ERROR` logged server-side, 404 served to Sophie. |

---

## 8. Hypotheses and Handoff

### 8.1 — Hypotheses to validate before dev

| Hypothesis | Evidence level | Validation test | Status |
|---|---|---|---|
| The SharePoint project sub-folder name is consistent enough with the project name for fuzzy matching to work | Low — folder naming is manual by Sarani team | Sample 10 active projects: compare `project.name` vs actual SharePoint folder name. If >30% don't match → define a mandatory `sharepointFolderName` field in the project DB | [HYPOTHESIS — to validate] |
| "Batch 1", "Batch 2" naming convention is consistently used across all clients | Low — naming is manual | Check 3 client SharePoint folders for naming patterns | [HYPOTHESIS — to validate] |
| Sophie will perceive the page as professional enough without AI-generated copy | Medium — brief + project name covers the basics | Share first prototype with 1 real client contact | [HYPOTHESIS — to validate] |
| Graph API read-only token already in use has `Files.Read.All` scope covering the Assets drive | High — likely given existing integration | Verify token scopes in Azure AD app registration | [HYPOTHESIS — likely true] |

### 8.2 — Out of scope V1 (deferred, not killed)

| Feature | Reason deferred |
|---|---|
| AI-generated project intro text | Thomas's decision: prefer existing data (brief, name, date) for V1. AI copy in V2 if Sophie feedback indicates the intro is too thin. |
| Password protection on the URL | No client request for this yet. V1 is intentionally public. Add in V2 if a client reports a confidentiality concern. |
| Inline PDF viewer | Complexity (CORS, PDF.js) not worth V1 effort. SharePoint webUrl opens cleanly in new tab. |
| Analytics dashboard for Thomas (who viewed the link) | V2 feature — requires cookie consent infrastructure not yet in place. |
| Lightbox for image zoom | Not explicitly requested by Thomas. `[HYPOTHESIS]` — add only if UX review confirms it's needed. |
| Expiration date on links | Thomas's explicit decision: permanent while project active. |

### 8.3 — Definition of Done (checklist for @fullstack)

- [ ] `project_previews` table created with migration
- [ ] `POST /api/project-previews` functional with upsert + slug collision handling
- [ ] `GET /api/project-previews/[client-slug]/[project-slug]` functional with ISR 300s
- [ ] `PATCH /api/project-previews/[project-id]` functional
- [ ] `/project/[client]/[project-slug]` public page renders all 5 UI states
- [ ] SharePoint batch discovery works for Sony and TikTok (minimum 2 tested clients)
- [ ] "Share Preview" button integrated in Tracker back-office row
- [ ] Slug generation handles accents, special chars, collisions
- [ ] All 3 API routes return correct status codes per specs
- [ ] Mobile responsive (375px) verified

---

**Handoff → @fullstack**

- Files produced: `/home/user/Sarani/docs/product/project-presentation-specs.md`
- Key decisions:
  - Table name: `project_previews` (not `project_presentations` — shorter, consistent with existing naming)
  - URL pattern: `/project/[client-slug]/[project-slug]` — no UUID token, permanent
  - SharePoint batch filter: `/^Batch\s*\d+/i` — numeric batches only in V1
  - PDF: `webUrl` link in new tab — no inline viewer
  - ISR: 5-minute revalidation on the public page
  - Auth: POST + PATCH require back-office session; GET is fully public
- Watch points:
  - Fuzzy match on SharePoint folder name (Step 2, Section 6) is the highest risk item — validate manually on real data before implementing
  - Graph API call budget per render: 2 + N (where N = batch count). For projects with 10+ batches, consider a parallel `Promise.all` on step 4 calls
  - `SHAREPOINT_ASSETS_DRIVE_ID` and `ASSETS_CUSTOMERS_BASE_PATH` are already defined in `src/lib/integrations/config.ts` — import directly, do not duplicate
