# Audit final de session -- Inbox overhaul (~30 commits)

**Date** : 2026-04-01
**Auditeur** : @qa
**Scope** : 31 fichiers (9 endpoints crees, 7 modifies, 7 composants, 8 libs)
**Score global : 7.5 / 10**

---

## Resume par categorie

| Categorie | Verdict | Bugs |
|---|---|---|
| Auth (getUserFromSession / isAuthenticatedFromCookie) | PASS | 0 |
| Rate limiting (checkRateLimit) | **FAIL** | 4 endpoints sans rate limit |
| Zod validation | **FAIL** | 1 endpoint sans Zod |
| Type coherence inter-fichiers | PASS | 0 |
| Error handling | PASS | Bonne gestion try/catch partout |
| Workflow E2E enquiry | PASS | Draft reply fonctionne |
| Workflow E2E new_project | PASS | Brief extraction + execute OK |
| Workflow E2E project_feedback | PASS | Feedback extract + comment + reopen OK |
| Others tab | PASS | Items protocol=null affichables |
| Managed tab | PASS | Badges action corrects |
| DueTodayBanner | PASS | Grouped by client |
| Sarani email filter | PASS | Double filtre (Graph + client-side) |
| Cron poll-emails | PASS | Classification + auto-brief pipeline |
| Entity dropdown | PASS | Charge au changement de client |
| Assignee dropdown | PASS | DB fetch + fallback hardcoded |
| Manual ClickUp mapping | PASS | Search + select fonctionne |
| Legacy protocol compat | PASS | LEGACY_PROTOCOL_TO_FILTER correct |
| Securite | **FAIL** | Voir bugs P1 |

---

## Bugs classes

### P0 -- Bloquant (0)

Aucun bug bloquant detecte.

### P1 -- Important (5)

**P1-01 : Pas de rate limit sur POST /api/admin/users**
- Fichier : `src/app/api/admin/users/route.ts` ligne 81
- Risque : un admin malveillant ou un script peut creer des milliers d'utilisateurs
- Fix : ajouter `checkRateLimit("users-create", 10, 60_000)` avant le body parse

**P1-02 : Pas de rate limit sur PATCH/DELETE /api/admin/users/[id]**
- Fichier : `src/app/api/admin/users/[id]/route.ts` lignes 22, 110
- Risque : brute-force sur le changement de mot de passe (PATCH accepte `password`)
- Fix : ajouter `checkRateLimit("users-update", 20, 60_000)`

**P1-03 : Pas de rate limit sur PATCH /api/admin/inbox**
- Fichier : `src/app/api/admin/inbox/route.ts` ligne 101
- Risque : spam de status changes, potentiel DoS sur la DB
- Fix : ajouter `checkRateLimit("inbox-patch", 60, 60_000)`

**P1-04 : Pas de rate limit sur POST /api/auto-brief/execute**
- Fichier : `src/app/api/auto-brief/execute/route.ts` ligne 71
- Risque : creation massive de tasks ClickUp + dossiers SharePoint. Ce endpoint declenche 5 operations externes (ClickUp task, SharePoint folder, Excel write, 2 comments). Pas de rate limit = risque de couts et quotas API depasses.
- Fix : ajouter `checkRateLimit("auto-brief-execute", 5, 60_000)`

**P1-05 : Pas de validation Zod sur POST /api/admin/users**
- Fichier : `src/app/api/admin/users/route.ts` lignes 86-106
- Detail : la validation est faite manuellement avec des `if (!email || typeof email !== "string")`. Pas de schema Zod contrairement a tous les autres endpoints de la session. Risque : validation incomplete, pas de stripping de champs inattendus.
- Fix : creer un `CreateUserSchema = z.object({ email: z.string().email(), password: z.string().min(8), name: z.string().min(1), role: z.enum(["admin", "user"]).optional() })` et utiliser `.parse()`

### P2 -- Mineur (6)

**P2-01 : Rate limit global au lieu de per-user**
- Fichiers : tous les endpoints avec `checkRateLimit`
- Detail : la cle de rate limit est globale (ex: `"clickup-search"`, `"email-classify"`). Si 2 admins sont connectes simultanement, le rate limit est partage. Acceptable pour une equipe de 2-3 PM, mais fragile si l'equipe grandit.
- Fix (v2) : prefixer la cle avec `session.userId`

**P2-02 : `showToast` declare dans EmailCard props mais jamais appele**
- Fichier : `src/components/inbox/EmailCard.tsx` ligne 43
- Detail : `showToast` est dans l'interface `EmailCardProps` mais n'est jamais appele dans le composant. Dead prop.
- Fix : supprimer de l'interface ou l'utiliser pour les erreurs de fallback

**P2-03 : Lark webhook sans rate limit ni deduplication**
- Fichier : `src/app/api/webhooks/lark/route.ts`
- Detail : pas de `checkRateLimit`. Lark peut renvoyer le meme event plusieurs fois (retry). La deduplication repose uniquement sur `message_id` comme `sourceId` en DB, mais il n'y a pas de contrainte UNIQUE sur `sourceId` dans le schema, donc des doublons sont possibles.
- Fix : ajouter un check `SELECT WHERE sourceId = message_id` avant l'insert, comme fait dans poll-emails

**P2-04 : Cron poll-emails n'a pas de rate limit (acceptable)**
- Fichier : `src/app/api/admin/cron/poll-emails/route.ts`
- Detail : protege par `CRON_SECRET` mais pas de rate limit. Le cron-scheduler limite deja a 1 execution / 5 minutes. Risque residuel : un attaquant avec le CRON_SECRET pourrait spammer.
- Impact faible car le secret est en env var.

**P2-05 : `due_date` dans auto-brief/execute utilise la startDate comme due_date**
- Fichier : `src/app/api/auto-brief/execute/route.ts` ligne 139
- Detail : `due_date: new Date(body.startDate).getTime()` -- la date de debut est utilisee comme date d'echeance ClickUp. Semantiquement incorrect : `startDate` != `dueDate`.
- Fix : soit renommer le champ en `dueDate`, soit ajouter un champ `dueDate` separe dans le schema

**P2-06 : `brief_extractor.ts` accepte "generic" dans le schema mais le prompt dit deprecated**
- Fichier : `src/lib/ai/prompts/brief-extractor.ts` ligne 15
- Detail : `project_type: z.enum(["design", "video", "translation", "social", "other", "generic"])` mais le prompt dit `"generic": DEPRECATED -- use "other" instead`. Le LLM pourrait retourner "generic" et le code le traiterait comme valide. Dans `CreateBriefModal`, le type selector n'a pas d'option "generic" (ligne 36-41), donc un brief avec type "generic" ne serait pas selectable dans le dropdown.
- Fix : soit retirer "generic" du schema Zod, soit mapper "generic" -> "other" apres le parse

---

## Workflows E2E -- Resultat

| # | Workflow | Verdict | Note |
|---|---|---|---|
| 6 | Enquiry email -> classify -> inbox -> Draft Reply -> Outlook draft | PASS | |
| 7 | New project -> classify -> inbox -> Create Brief -> LLM -> ClickUp + SP + Excel | PASS | |
| 8 | Feedback -> classify -> inbox -> Create Feedback -> LLM -> ClickUp comment + reopen | PASS | |
| 9 | Others tab -> items protocol null | PASS | |
| 10 | Managed tab -> done/dismissed items with badges | PASS | |
| 11 | DueTodayBanner -> expand -> grouped by client | PASS | |
| 12 | Sarani email filter -> @sarani.studio + outgoing replies filtered | PASS | |
| 13 | Cron poll-emails -> classification + auto-brief pipeline | PASS | |
| 14 | Entity dropdown -> loads on client change | PASS | |
| 15 | Assignee dropdown -> DB users, fallback hardcoded | PASS | |
| 16 | Manual ClickUp mapping | PASS | |
| 17 | Review items -> restent in_progress | PASS | Filtres dans project_reviews tab |

## Edge cases

| # | Edge case | Verdict | Note |
|---|---|---|---|
| 18 | Email sans body preview | PASS | bodyPreview optionnel, fallback "" |
| 19 | ClickUp API down | PASS | Graceful degradation partout (catch -> warnings) |
| 20 | LLM timeout brief extraction | PASS | Fallback brief vide, PM peut editer |
| 21 | Client non resolu | PASS | clientResolved=false, PM choisit manuellement |
| 22 | Items legacy anciens protocoles | PASS | LEGACY_PROTOCOL_TO_FILTER + CATEGORY_CONFIG legacy |
| 23 | Lark messages nouvelles categories | PASS | Meme 4 categories, LARK_ROUTE_MAP correct |

---

## Verdict : GO CONDITIONNEL

**Justification** : aucun bug P0 bloquant. Les 5 bugs P1 concernent tous des rate limits ou validation manquants -- ils ne cassent aucune fonctionnalite mais representent un risque de securite et d'abus. Le code est globalement bien structure, coherent entre les fichiers, et les workflows E2E fonctionnent.

**Actions requises avant production** :
1. Ajouter `checkRateLimit` sur les 4 endpoints identifies (P1-01 a P1-04)
2. Migrer la validation manuelle de POST /api/admin/users vers Zod (P1-05)

**Actions recommandees (non bloquantes)** :
3. Deduplication Lark par sourceId (P2-03)
4. Corriger la semantique startDate/dueDate (P2-05)
5. Retirer "generic" du schema brief-extractor ou mapper vers "other" (P2-06)

---

**Handoff -> @fullstack**
- Fichiers produits : `docs/qa/session-final-audit.md`
- Decisions : GO CONDITIONNEL -- 5 P1 a corriger, 0 P0
- Points d'attention : les 4 endpoints sans rate limit (users, users/[id], inbox PATCH, auto-brief/execute) sont les plus urgents. La validation Zod manquante sur POST users est une dette technique mineure mais reelle.
