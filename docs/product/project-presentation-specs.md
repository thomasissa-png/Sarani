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
