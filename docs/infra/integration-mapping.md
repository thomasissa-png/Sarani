# Integration Mapping — ClickUp × SharePoint × Evoliz

> Document de référence pour vérifier la cohérence des mappings entre les 3 systèmes.
> Source : `src/lib/integrations/config.ts` + code des routes API.
> Dernière mise à jour : 2026-03-27

---

## 1. Table de mapping clients

| Client | ClickUp Space | Space ID | Excel Tracker File | SharePoint Folder | Evoliz |
|--------|--------------|----------|-------------------|-------------------|--------|
| **Sony** | Sony | 90100452675 | `01. Sarani_Sony Projects.xlsx` | `02. Sony` | Match par PO ou nom projet |
| **TikTok** | TikTok | 90050434316 | `02. Sarani_Bytedance Projects.xlsx` | `05. TikTok` | Match par PO ou nom projet |
| **PICO XR** | PICO XR | 90050434327 | `02. Sarani_Bytedance Projects.xlsx` *(partagé avec TikTok)* | `05. TikTok` *(partagé)* | Match par PO ou nom projet |
| **Other customers** | Other customers | 90050435651 | `03. Sarani_Other Projects.xlsx` | `01. Single Projects` | Match par PO ou nom projet |
| **Aristocrat** | Aristocrat | 90174878459 | `04. Sarani_Aristocrat Projects.xlsx` | `11. Aristocrat` | Match par PO ou nom projet |
| **Ubi** | Ubi | 90171040997 | `09. Sarani_Projets Ubi.xlsx` | `17. Ubi` | Match par PO ou nom projet |
| **Aujan** | Aujan | 90171121804 | `10. Sarani_Aujan Projects.xlsx` | `18. Aujan` | Match par PO ou nom projet |
| **Bose** | Bose | 90171343766 | `11. Sarani_Bose Projects.xlsx` | `19. Bose` | Match par PO ou nom projet |
| **Lamarck** | Lamarck | 90172906076 | `12. Sarani_Lamarck Projects.xlsx` | `21.Lamarck` | Match par PO ou nom projet |
| **CMC Markets** | CMC Markets | 90172572190 | `13. Sarani_CMC Markets Project.xlsx` | `20. CMC Markets` | Match par PO ou nom projet |

**Note** : TikTok et PICO XR partagent le même fichier Excel (`02. Sarani_Bytedance Projects.xlsx`) et le même dossier SharePoint (`05. TikTok`). Le parser distingue les deux par le nom de l'onglet Excel (les onglets PICO sont détectés par `resolveClientFromSheet`).

---

## 2. ClickUp Spaces sans tracker

Ces spaces existent dans ClickUp mais ne sont **PAS** mappés à un Excel tracker :

| Space | ID | Raison |
|-------|----|--------|
| **Brand Native** | 90050436581 | Space interne — pas un client |
| **Sarani** | 90050433950 | Space interne — projets Sarani |

Ces spaces sont exclus du tracker (filtrés dans `CLICKUP_SPACES_WITHOUT_TRACKER`).

---

## 3. Flow de données

### Lecture (Tracker → affichage)

```
┌──────────┐     ┌────────────┐     ┌──────────┐
│  ClickUp │     │ SharePoint │     │  Evoliz  │
│  (tasks) │     │  (Excel)   │     │(invoices)│
└────┬─────┘     └─────┬──────┘     └────┬─────┘
     │                 │                  │
     │  getSpaces()    │  getDriveItem()  │  getInvoices()
     │  getLists()     │  listWorksheets()│  (paginated, max 50 pages)
     │  getTasks()     │  readUsedRange() │
     │                 │  parseExcel()    │
     └────────┬────────┴────────┬─────────┘
              │                 │
              ▼                 ▼
         mergeData() ── Match par :
         1. Nom exact (normalized)
         2. Fuzzy (client-scoped)
         3. Evoliz : PO number → fallback nom projet
              │
              ▼
         Dedup par client+project
              │
              ▼
         TrackerResponse JSON
```

### Écriture (Create Project → 3 systèmes)

```
Formulaire "New Project"
         │
         ▼
POST /api/admin/integrations/create-project
         │
    ┌────┼────────────────┐
    │    │                │
    ▼    ▼                ▼
ClickUp  SharePoint       Excel
 task     folder +        row dans
 créée    00. Brief/      le tracker
```

---

## 4. Logique de matching

### ClickUp ↔ Excel (dans `tracker-merge.ts`)

| Priorité | Méthode | Exemple |
|----------|---------|---------|
| 1 | **Exact match** — nom normalisé (lowercase, alphanum only) | Excel "Sony BF 2026" = ClickUp "Sony BF 2026" |
| 2 | **Fuzzy match** — même client (Space) + nom partiel | Excel "Sony BF" matche ClickUp "Sony Black Friday 2026 BF" |
| 3 | **Non matché** — affiché séparément | Projets Excel-only ou ClickUp-only visibles dans le tracker |

### Evoliz ↔ Excel/ClickUp (dans `tracker-merge.ts`)

| Priorité | Méthode | Exemple |
|----------|---------|---------|
| 1 | **PO number** — référence Evoliz = PO dans Excel | PO "SAR-2026-001" dans Excel matche reference Evoliz |
| 2 | **Fallback nom projet** — même client + référence Evoliz contient le nom du projet | Client "Sony" + ref Evoliz "SONY-BF-2026" matche projet "BF 2026" |
| 3 | **Non matché** — facture non liée | La facture n'apparaît pas dans le tracker |

### Client matching (dans `config.ts` — `getMappingBySpaceName`)

| Priorité | Méthode | Exemple |
|----------|---------|---------|
| 1 | **Exact** (case-insensitive) | "Sony" = "Sony" |
| 2 | **Contains** | "TikTok France" contient "TikTok" |
| 3 | **First-word** (≥3 chars) | "CMC" matche "CMC Markets" |
| 4 | **Fallback** | → "Other customers" |

---

## 5. Colonnes Excel reconnues

Le parser (`excel-parser.ts`) détecte automatiquement les colonnes par alias :

| Donnée | Alias reconnus |
|--------|---------------|
| **Client** | customer, client, client name, company, account |
| **Division** | division, department, bu, business unit, entity |
| **Date** | date, project date, creation date, start date, brief date, order date |
| **Projet** | project, project name, project description, description, brief, job, job name, titre, titre du projet, projet |
| **Contact** | contact, contact name, client contact, requestor, demandeur, contact client, person |
| **Statut** | status, project status, statut, état, state, po status |
| **Catégorie** | category, cat, cat., type, service, service type, deliverable type, catégorie, categorie |
| **Lien SP** | link, sharepoint link, folder link, sharepoint, folder, url, dossier, lien projet, lien, lien sharepoint |
| **Valeur** | total value, total value (eur), total, total eur, total usd, value, amount, montant, prix, price, total price, total value (usd), project value, budget, fee, fees, valeur, valeur totale, facturé client, facture client, revenue, chiffre, ca |
| **PO** | po, po number, po #, po#, purchase order, bon de commande, po ref, po reference, code projet |
| **Facture** | invoice, invoice number, invoice #, inv, inv., invoice ref, facture, n° facture, n° invoice, n°invoice |
| **Statut facture** | invoice status, payment status, payment, inv. status, inv status, paiement, statut facture, billing status, billing, status2, statut, status inv., echéance, echeance |

Le parser saute automatiquement les onglets : performance, dashboard, overview, template, config, instructions, total, summary.

---

## 6. Gaps et incohérences potentielles

### Clients potentiellement manquants

Ces clients sont mentionnés dans `project-context.md` mais n'ont **PAS** de mapping dédié dans `config.ts` (ils tomberaient dans "Other customers") :

| Client | Présent dans project-context.md | Mapping dédié |
|--------|-------------------------------|---------------|
| GEODIS | Oui (case study majeur) | **NON** → Other customers |
| L'Oréal | Oui (case study) | **NON** → Other customers |
| Pernod Ricard | Oui (case study) | **NON** → Other customers |
| Air Corsica | Oui (case study ROI 29.9%) | **NON** → Other customers |
| IKEA | Oui (case study) | **NON** → Other customers |
| LEGO | Oui (case study) | **NON** → Other customers |
| France Chimie | Oui | **NON** → Other customers |
| ProcessOut | Oui | **NON** → Other customers |
| Adidas | Oui (case study) | **NON** → Other customers |

**Question pour Thomas** : Ces clients ont-ils leur propre Space ClickUp + fichier Excel tracker ? Si oui, il faut ajouter leur mapping dans `config.ts`. S'ils sont dans "Other customers", c'est normal mais les projets seront tous mélangés dans le même fichier Excel.

### Incohérences de nommage SharePoint

| Client | Dossier SharePoint | Remarque |
|--------|-------------------|----------|
| Lamarck | `21.Lamarck` | Manque l'espace après le point (vs `20. CMC Markets`) |

### Evoliz — limites du matching

1. **Sans PO** : si un projet n'a pas de numéro PO dans l'Excel, le matching Evoliz se fait par nom de projet — plus fragile
2. **Noms différents** : si la facture Evoliz a un nom différent du projet Excel/ClickUp, pas de match
3. **Multi-factures** : un projet avec plusieurs factures → seule la dernière non-brouillon est affichée
4. **Pagination** : max 5000 factures (50 pages × 100). Au-delà, les factures anciennes sont ignorées

### Cache TTL

| Source | TTL | Force refresh |
|--------|-----|--------------|
| ClickUp | 10 min | Bouton "Sync now" |
| SharePoint/Excel | 1 heure | Bouton "Sync now" |
| Evoliz | 10 min | Bouton "Sync now" |

Le SharePoint est à 1h car c'est l'opération la plus coûteuse (50+ onglets à lire sur 9 fichiers).

---

## 7. Fichiers Excel sur SharePoint (source de vérité)

Ces fichiers sont dans le OneDrive `team@sarani.studio` sous `/00. Administrative/03. Financials (Trackers)/` :

| # | Fichier | Client(s) |
|---|---------|-----------|
| 01 | `Sarani_Sony Projects.xlsx` | Sony |
| 02 | `Sarani_Bytedance Projects.xlsx` | TikTok + PICO XR (onglets séparés) |
| 03 | `Sarani_Other Projects.xlsx` | Tous les clients sans tracker dédié |
| 04 | `Sarani_Aristocrat Projects.xlsx` | Aristocrat |
| 09 | `Sarani_Projets Ubi.xlsx` | Ubi |
| 10 | `Sarani_Aujan Projects.xlsx` | Aujan |
| 11 | `Sarani_Bose Projects.xlsx` | Bose |
| 12 | `Sarani_Lamarck Projects.xlsx` | Lamarck |
| 13 | `Sarani_CMC Markets Project.xlsx` | CMC Markets |
| 00 | `Global Overview.xlsx` | Vue consolidée (non lu par le tracker) |

**Note** : les numéros 05, 06, 07, 08 n'existent pas dans le mapping — fichiers supprimés ou jamais créés ?
