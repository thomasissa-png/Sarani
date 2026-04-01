# Inbox Quick Check — 2026-04-01

## Résultats par point

| # | Point | Fichier | Verdict | Détail |
|---|---|---|---|---|
| 1 | Sarani email filter — Graph API | `src/lib/integrations/email.ts:56` | PASS | `$filter` bloque `team@sarani.studio`. Client-side (ligne 68) bloque tous les `endsWith("@sarani.studio")`. Double filtre correct. |
| 2 | Sarani outgoing reply detection | `src/app/api/admin/cron/poll-emails/route.ts:91-96` | PASS | `bodyStart` scanné sur 400 chars. Vérifie `@sarani.studio` + (`de :` OU `from:` OU `envoyé :`). Item enregistré comme `internal_skip` pour éviter re-check. |
| 3 | Review items stay in inbox | `src/app/admin/(authenticated)/page.tsx:1008-1010` | PASS | `onApprove` distingue les types review — passe `"in_progress"` (pas `"done"`) pour `review_human`, `review_ai_ready`, `review_escalated`. Items in_progress restent visibles (ligne 476). |
| 4 | DueTodayBanner expandable | `src/app/admin/(authenticated)/page.tsx:372,754-806` | PASS | `dueTodayExpanded` state présent. Chevron avec `rotate-180` via `cn()`. Groupement par client via `grouped` map, tri alphabétique (`Other` en dernier). |
| 5 | Pagination 20 items | `src/app/admin/(authenticated)/page.tsx:686-693,1026-1036` | PASS | `PAGE_SIZE = 20`, `visibleCount` state, reset sur changement de filtre. Bouton "Show more" avec compteur restant, aria-label présent. |
| 6 | Brief extractor — client_name dans Branding | `src/lib/ai/prompts/brief-extractor.ts:76` | PASS | Le prompt dit explicitement `"Check brand guidelines on SharePoint > {client_name} folder" — use the extracted client_name, never write [Client] literally`. |
| 7 | Feedback extractor — FILES AFFECTED + English rule | `src/lib/ai/prompts/feedback-extractor.ts:38,45` | PASS | Section `FILES AFFECTED:` présente dans le format de sortie (ligne 38). Règle English explicite ligne 45 : `ALWAYS write the feedback in English`. |
| 8 | Classifier — clickupProjectHint pour new_project | `src/lib/ai/prompts/classifier.ts:73` | PASS | Le prompt interdit `null` pour `new_project` et `project_feedback` : "Return null only for enquiries from unknown senders and other/noise." |

## Verdict global

**8/8 PASS** — aucune anomalie détectée.

---

**Handoff → @orchestrator**
- Fichiers produits : `/home/user/Sarani/docs/qa/inbox-quick-check.md`
- Décisions prises : vérification statique uniquement (lecture de code + grep), pas de test d'exécution
- Points d'attention : aucun bug bloquant identifié. Le double filtre email (Graph API + client-side) est solide. La détection de reply sortant Sarani couvre `de :` / `from:` / `envoyé :` — cas `De:` sans espace non couvert, non bloquant.
