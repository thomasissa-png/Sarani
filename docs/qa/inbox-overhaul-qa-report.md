# Inbox Overhaul -- QA Report

**Date** : 2026-04-01
**Scope** : 9 fichiers (7 modifies, 2 crees)
**Score global : 7.5 / 10 -- GO avec reserves**

---

## Resultats par fichier

| # | Fichier | Verdict | Notes |
|---|---|---|---|
| 1 | `api/admin/emails/classify/route.ts` | **FAIL** | P0 : internal fetch sans auth cookies |
| 2 | `components/inbox/EmailCard.tsx` | PASS | Backward compat solide, legacy categories gerees |
| 3 | `components/inbox/DraftReplyModal.tsx` | PASS | Focus trap, Escape, validation, pre-fill OK |
| 4 | `components/inbox/ProjectActionModal.tsx` | PASS (reserves) | P1 : aria-labels manquants sur boutons action |
| 5 | `app/admin/(authenticated)/page.tsx` | PASS | 7 filtres, Managed tab, DueTodayBanner, restore OK |
| 6 | `api/admin/inbox/route.ts` | PASS (reserves) | P2 : couplage includeNoise / followup_alert |
| 7 | `api/webhooks/lark/route.ts` | PASS | Categories alignees, routeTo, draftReply present |
| 8 | `api/admin/clickup/search/route.ts` | PASS (reserves) | P1 : pas de rate limit ; P2 : pagination page 0 only |
| 9 | `api/admin/clickup/due-today/route.ts` | PASS (reserves) | P1 : pas de rate limit |

---

## Bugs trouves

### P0 -- Bloquant

**B1 -- Internal fetch sans credentials (classify -> clickup/search)**
- **Fichier** : `src/app/api/admin/emails/classify/route.ts` L211-229
- **Probleme** : le `fetch("/api/admin/clickup/search")` cote serveur ne transmet pas les cookies de session. Le endpoint search appelle `getUserFromSession()` qui retournera null -> 401. Le catch graceful degrade, donc pas de crash, mais le ClickUp search ne fonctionnera JAMAIS depuis la classification.
- **Fix** : soit forwarder les cookies (`headers: { cookie: request.headers.get("cookie") }`), soit appeler directement l'API ClickUp sans passer par l'endpoint interne (refactor en shared util).

### P1 -- A corriger

**B2 -- Pas de rate limit sur les 2 endpoints ClickUp**
- **Fichiers** : `clickup/search/route.ts`, `clickup/due-today/route.ts`
- **Probleme** : les endpoints sont proteges par auth mais n'ont pas de rate limiting. Un acteur authentifie peut spammer l'API ClickUp.
- **Fix** : ajouter `checkRateLimit("clickup-search", 20, 60_000)` et equivalent pour due-today.

**B3 -- aria-labels manquants dans ProjectActionModal**
- **Fichier** : `src/components/inbox/ProjectActionModal.tsx`
- **Probleme** : les boutons "Open in ClickUp", "Draft Reply", "Archive", "Cancel", "Draft Welcome Reply", "Create Client Profile" n'ont pas d'aria-label. Seul le bouton Close en a un.
- **Fix** : ajouter aria-label descriptif sur chaque bouton interactif.

### P2 -- Ameliorations

**B4 -- ClickUp search : page 0 uniquement**
- **Fichier** : `clickup/search/route.ts` L42
- **Probleme** : ne recupere que la premiere page de tasks. Si le workspace a 100+ tasks, le match peut rater.
- **Impact** : faible a court terme (Sarani a un volume de tasks gerable), a adresser quand le workspace grandit.

**B5 -- Couplage includeNoise / followup_alert**
- **Fichier** : `api/admin/inbox/route.ts` L64
- **Probleme** : `includeNoise=true` desactive aussi le filtre followup_alert, ce qui n'est probablement pas voulu. Ces deux exclusions devraient etre independantes.

**B6 -- maxTokens 256 potentiellement bas pour draftReply**
- **Fichiers** : classify/route.ts L185, lark/route.ts L150
- **Probleme** : le LLM doit produire un JSON complet incluant draftReply (email complet). 256 tokens peut tronquer la reponse sur des emails longs necessitant une reply detaillee.
- **Fix** : augmenter a 512 tokens.

---

## Points positifs

- **Backward compat** : CATEGORY_CONFIG dans EmailCard couvre les 5 legacy categories + 4 nouvelles. LEGACY_PROTOCOL_TO_FILTER dans page.tsx mappe PROTO-PITCH et PROTO-CLIENT-REPLY. Aucun risque de crash sur les anciens items.
- **Graceful degradation** : CLICKUP_API_KEY absent -> reponse null/vide partout. LLM timeout -> 504 explicite. ClickUp search fail -> bouton reste disabled.
- **Zod validation** : presente sur tous les endpoints (classify, inbox, clickup/search, lark webhook).
- **Accessibilite EmailCard** : aria-labels sur tous les boutons, ConfidenceDot avec label, touch targets 44px.
- **Focus trap** : DraftReplyModal et ProjectActionModal ont tous deux un focus trap + Escape + body scroll lock.
- **parseEmailPayload** : defensif, gere email format + Lark format + retourne null proprement.

---

## Verdict : GO avec reserves

Le P0 (B1) ne cause pas de crash grace au catch, mais le ClickUp search depuis classify ne fonctionne pas -- c'est un feature dead code. Les P1 (rate limit, aria-labels) sont a corriger rapidement. Le code est globalement solide : types coherents, validation Zod partout, backward compat bien pensee, graceful degradation systematique.

**Actions requises avant prochaine release :**
1. Corriger B1 (P0) -- forwarder les cookies ou refactorer en util partage
2. Ajouter rate limit sur clickup/search et clickup/due-today (B2)
3. Ajouter aria-labels dans ProjectActionModal (B3)

---

**Handoff -> @fullstack**
- Fichier produit : `docs/qa/inbox-overhaul-qa-report.md`
- Decisions prises : classification P0/P1/P2 basee sur impact fonctionnel reel
- Points d'attention : B1 est le seul bug qui empeche une feature de fonctionner (ClickUp auto-link depuis classification). B2-B3 sont des durcissements a planifier.
