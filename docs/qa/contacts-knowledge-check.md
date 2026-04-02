# QA Check — Contacts client + Knowledge viewer
Date : 2026-04-02

## Résultats par fichier

| Fichier | Verdict | Notes |
|---|---|---|
| `ClientContactsSection.tsx` | PASS | Types corrects (`ClientContact` depuis schema), états loading/empty/error gérés, fetch silencieux sur erreur (acceptable en read-only), DELETE sans feedback toast (risque UX mineur, non bloquant) |
| `contacts/route.ts` (GET/POST) | PASS avec réserve | Zod OK, duplicate email 409 OK, source hardcodée `"manual"` correct. **Auth absente dans le fichier** — couverte par middleware global `/api/admin/:path*` → 401 automatique. Rate limit absent mais cohérent avec les autres routes clients (pas de seuil défini à ce niveau) |
| `contacts/[contactId]/route.ts` (PATCH/DELETE) | PASS avec réserve | Zod OK, vérification ownership `clientId + contactId` présente (pas d'IDOR). PATCH : `updates` typé `Record<string, unknown>` — acceptable mais `Partial<typeof clientContacts.$inferInsert>` serait plus strict. **Auth absente dans le fichier** — couverte par middleware. Rate limit absent (même remarque) |
| `knowledge/route.ts` | PASS | Auth `getUserFromSession()` présente, rate limit 30 req/min par IP présent, réponse groupée par client correcte, `isActive` peut être `null` (nullable en DB — cohérent avec schema) |
| `scan-knowledge/route.ts` L351-377 | PASS | Import `sql` présent (ligne 8), upsert sur conflict `(clientId, email)` correct, `division` utilise `sql\`${clientContacts.division}\`` pour préserver la valeur existante si null — pattern correct. Try/catch isolation : une erreur de contact n'interrompt pas le scan |

## Points d'attention (non bloquants)

1. **Auth contacts via middleware uniquement** — les routes `GET/POST/PATCH/DELETE` sur `/api/admin/clients/[id]/contacts` n'ont pas de vérification auth dans le handler. Le middleware couvre `/api/admin/:path*` → protection effective. Risque : si le middleware est bypassé (test unitaire direct, changement de config futur), les routes sont exposées. Recommandation à @fullstack : ajouter `getUserFromSession()` en début de chaque handler, comme fait dans `knowledge/route.ts`.

2. **PATCH : `updates` non typé strictement** — `Record<string, unknown>` passe à Drizzle sans erreur compile mais perd la sécurité de type. Mineur.

3. **DELETE sans rate limit** — un acteur malveillant authentifié peut supprimer tous les contacts en boucle. Risque faible (authentification requise) mais à surveiller.

4. **DELETE côté UI sans feedback toast** — `handleDelete` est silencieux sur erreur (catch vide). L'utilisateur ne sait pas si la suppression a échoué. Non bloquant mais à améliorer.

## Verdict global

PASS — aucun bug bloquant. Auth globale couverte par middleware. Zod validé sur toutes les mutations. Pas d'IDOR détecté.
