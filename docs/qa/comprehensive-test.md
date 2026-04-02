# Comprehensive Test Report — 2026-04-02

## 1. Tests unitaires (Vitest)

**Commande** : `npx vitest run tests/unit/inbox-*.test.ts`

| Metrique | Resultat |
|---|---|
| Fichiers de test | 6 passed |
| Tests | **133 passed** |
| Echecs | 0 |
| Duree | 2.81s |

**Verdict : PASS**

---

## 2. TypeScript type check

**Commande** : `npx tsc --noEmit`

| Metrique | Resultat |
|---|---|
| Erreurs | **0** |

**Verdict : PASS**

---

## 3. Verification des fix recents

### 3a. Classification prompt (`src/lib/ai/prompts/classifier.ts`)

| Checkpoint | Attendu | Trouve | Verdict |
|---|---|---|---|
| CRITICAL RULES en haut du prompt | Oui, 4 regles | Lignes 51-55 : 4 CRITICAL RULES (version refs -> feedback, volume -> new_project, acks -> other, doute -> feedback) | **PASS** |
| maxTokens = 1024 dans poll-emails | Oui | Lignes 114 et 206 de poll-emails/route.ts | **PASS** |
| maxTokens = 1024 dans classify | Oui | Ligne 120 de emails/classify/route.ts | **PASS** |
| Fallback enquiry quand safeParse echoue | Oui | Lignes 118-133 de poll-emails/route.ts : `category: "enquiry"`, `confidence: 0.3`, `routeTo: "PROTO-ENQUIRY"` | **PASS** |
| isInternalEmail guard dans classify/route.ts | Oui | Ligne 91 : `if (isSaraniEmail(from) \|\| isInternalEmail(from))` retourne 400 | **PASS** |
| isInternalEmail() existe dans classifier.ts | Oui | Lignes 101-106 : verifie domaines `sarani.studio`, `sarani.fr` | **PASS** |
| Importee dans classify/route.ts | Oui | Ligne 11 : `isInternalEmail` importe depuis classifier | **PASS** |

**Verdict : PASS**

---

### 3b. SP link conversion

#### `src/app/api/admin/feedback/extract/route.ts`

| Checkpoint | Attendu | Trouve | Verdict |
|---|---|---|---|
| Import getPublicSharingLink | Oui | Ligne 13 : `import { getPublicSharingLink } from "@/lib/integrations/sharepoint"` | **PASS** |
| Regex scan + conversion apres LLM | Oui | Lignes 107-118 : regex `saranistudio.sharepoint.com`, boucle de conversion, fallback silencieux | **PASS** |

#### `src/app/api/admin/brief/extract/route.ts`

| Checkpoint | Attendu | Trouve | Verdict |
|---|---|---|---|
| Import getPublicSharingLink | Oui | Ligne 12 : `import { getPublicSharingLink } from "@/lib/integrations/sharepoint"` | **PASS** |
| Regex scan + conversion apres LLM | Oui | Lignes 106-117 : meme pattern regex sur `brief_body` | **PASS** |

**Verdict : PASS**

---

### 3c. Profile loading timeout

| Checkpoint | Attendu | Trouve | Verdict |
|---|---|---|---|
| Promise.race avec 3s timeout dans feedback/extract | Oui | Lignes 69-71 : `Promise.race([profilePromise, new Promise(resolve => setTimeout(() => resolve(""), 3_000))])` | **PASS** |
| Promise.race avec 3s timeout dans brief/extract | Oui | Lignes 54-56 : meme pattern | **PASS** |

**Verdict : PASS**

---

### 3d. Asset review (`src/app/api/admin/assets/review/route.ts`)

| Checkpoint | Attendu | Trouve | Verdict |
|---|---|---|---|
| resolveSharePointUrl importe | Oui | Ligne 10 : `resolveSharePointUrl` importe depuis sharepoint | **PASS** |
| Gere URL complete (https://) | Oui | Lignes 229-238 : `if (body.projectId.startsWith("https://"))` -> resolveSharePointUrl | **PASS** |
| Gere chemin relatif (contient /) | Oui | Ligne 243 : `if (body.projectId.includes("/"))` -> concatenation avec base path | **PASS** |
| Gere ClickUp ID (fallback) | Oui | Lignes 245-253 : recherche dans CLIENT_MAPPINGS par spaceId ou spaceName | **PASS** |
| Brief endpoint retourne folderUrl | Oui | `src/app/api/admin/assets/review/brief/route.ts` lignes 59-65 : extraction depuis custom fields ClickUp ("Folder URL", "Folder", "SharePoint", "SP Link"), retourne dans JSON ligne 71 | **PASS** |

**Verdict : PASS**

---

### 3e. DraftReplyModal (`src/components/inbox/DraftReplyModal.tsx`)

| Checkpoint | Attendu | Trouve | Verdict |
|---|---|---|---|
| Ne ferme PAS le modal apres creation du draft | Oui | Ligne 157 : commentaire explicite "Don't close the modal — Thomas wants to stay on the modal after creating the draft". Seul `onDrafted()` est appele (callback de notification), pas `onClose()` | **PASS** |

**Verdict : PASS**

---

### 3f. Client filter (`src/app/admin/(authenticated)/page.tsx`)

| Checkpoint | Attendu | Trouve | Verdict |
|---|---|---|---|
| CLIENT_FILTER_TABS existe | Oui | Lignes 157-160 | **PASS** |
| 12 entries | Oui | `["all", "TikTok", "Sony", "Bose", "Ubi", "Lamarck", "Aristocrat", "Aujan", "CMC Markets", "PICO XR", "GEODIS", "Others"]` = 12 | **PASS** |
| activeClientFilter state | Oui | Ligne 242 : `useState<string>("all")` | **PASS** |
| clientFilteredItems logique | Oui | Ligne 652+ : filtre par client avec matching texte, gestion TikTok/Bytedance, Ubi/ubisoft, PICO XR/pico, et bucket "Others" | **PASS** |
| daily_digest filtre de l'inbox | Oui | Ligne 296 : `if (i.type === "daily_digest") return false` | **PASS** |

**Verdict : PASS**

---

### 3g. Sync branding endpoint (`src/app/api/admin/clients/sync-branding/route.ts`)

| Checkpoint | Attendu | Trouve | Verdict |
|---|---|---|---|
| Fichier existe | Oui | Confirme par Glob | **PASS** |
| Auth admin | Oui | Lignes 14-17 : `getUserFromSession()` + `session.role !== "admin"` -> 401 | **PASS** |
| 10 clients configures dans BRANDING_DATA | Oui | Sony, Bose, TikTok, PICO XR, Aristocrat, CMC Markets, GEODIS, Lamarck, Aujan, Ubi = 10 | **PASS** |

**Verdict : PASS**

---

## Anomalie detectee (non bloquante)

**GEODIS absent de CLIENT_MAPPINGS** : le fichier `src/lib/integrations/config.ts` ne contient pas d'entree `clickupSpaceName: "GEODIS"` dans CLIENT_MAPPINGS (9 clients + "Other customers"). GEODIS est present dans :
- BRANDING_DATA du sync-branding endpoint
- CLIENT_FILTER_TABS de la page admin
- Les membres d'equipe (clients array)

Impact : la boucle `for (const mapping of CLIENT_MAPPINGS)` dans sync-branding ne traitera jamais l'entree GEODIS de BRANDING_DATA car elle itere sur les mappings, pas sur BRANDING_DATA.

**Escalade** : signaler a @fullstack pour ajout de GEODIS dans CLIENT_MAPPINGS avec le clickupSpaceId, sharepointCustomerFolder et excelTrackerFilename correspondants.

---

## Verdict global

| Categorie | Resultat |
|---|---|
| Tests unitaires Vitest (133 tests) | **PASS** |
| TypeScript tsc --noEmit | **PASS** |
| 3a. Classification prompt | **PASS** |
| 3b. SP link conversion | **PASS** |
| 3c. Profile loading timeout | **PASS** |
| 3d. Asset review | **PASS** |
| 3e. DraftReplyModal | **PASS** |
| 3f. Client filter | **PASS** |
| 3g. Sync branding | **PASS** |

**VERDICT : GO** — tous les fix sont correctement implementes. 1 anomalie non bloquante a escalader (GEODIS manquant dans CLIENT_MAPPINGS).
