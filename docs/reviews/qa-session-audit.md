# Audit QA — Session `claude/session-recovery-analysis-b03NR`

**Date** : 2026-04-03
**Type** : audit technique et logique (code review statique)
**Commits audites** : 7b30909 → e3bc5b9 (7 commits)
**Verdict global** : PASS (code review statique) — 2 risques P1 actifs, 0 P0

> **Transparence** : cet audit est une review statique du code. Aucun test live n'a ete execute (pas d'execution Playwright, pas de requetes SharePoint reelles). Les verdicts portent sur la logique, les types, la securite et les edge cases tels que lisibles dans le code source.

---

## 1. TypeScript — `tsc --noEmit`

| Check | Verdict | Detail |
|---|---|---|
| `npx tsc --noEmit` | **PASS** | 0 erreur, 0 warning |

---

## 2. Fichier par fichier

### 2.1 `src/app/project/[clientSlug]/[projectSlug]/page.tsx` — Share link public page

| Check | Verdict | Detail |
|---|---|---|
| Recursive folder traversal | **PASS** | `collectFilesRecursive` avec `MAX_FOLDER_DEPTH = 4` empeche la recursion infinie. Les dossiers SKIP sont filtres. |
| Null/undefined safety | **PASS** | `data.value ?? []` protege contre un retour null de l'API Graph. `item.file?.mimeType`, `item.image?.width` — optionnel chaining correct. |
| Comment count badges | **PASS** | La requete DB groupBy est correcte. `commentCountMap.get(item.name) ?? 0` gere le cas absent. |
| Video support | **PASS** | Les types video sont dans `ALLOWED_MIMETYPES`. Le proxy URL est utilise pour les `<video>` et `<source>`. `preload="metadata"` est correct pour la performance. |
| Selected assets filtering | **PASS** | `JSON.parse(preview.selectedAssets)` est protege par un try/catch. Le fallback affiche tous les assets. |
| Performance — N+1 | **P1 RISQUE** | `collectFilesRecursive` fait un appel Graph API par sous-dossier en parallele (`Promise.all`). Pour un projet avec beaucoup de sous-dossiers imbriques, cela peut generer des dizaines d'appels API en cascade. La profondeur max (4) limite le pire cas, mais il n'y a pas de limite sur le nombre de dossiers par niveau. Un dossier avec 50 sous-dossiers generera 50 appels paralleles. |
| Performance — pas de cache SSR | **INFO** | La page est SSR sans `revalidate` explicite dans l'export. Les headers de cache ne sont pas definis sur la page elle-meme (uniquement sur l'API route `/api/project-previews/`). Cependant, la page est server-side rendered a chaque requete, ce qui inclut les appels SharePoint. En pratique, le volume est faible (pages de presentation client). |
| XSS | **PASS** | Tous les contenus dynamiques passent par le JSX React (auto-escape). Pas de `dangerouslySetInnerHTML`. |

### 2.2 `src/app/api/project-assets/[itemId]/route.ts` — Asset proxy (video streaming)

| Check | Verdict | Detail |
|---|---|---|
| Logique metier | **PASS** | Images → 302 redirect. Videos → streaming proxy avec Range headers forwarded. La logique est correcte et bien commentee. |
| Timeout | **PASS** | `AbortSignal.timeout(30_000)` empeche un fetch infini vers SharePoint. |
| Status codes | **PASS** | 404 si pas de download URL, 502 si upstream fail, 200/206 forward du status upstream. |
| Auth check | **ABSENT** | Pas de `getUserFromSession` ni de rate limiting. C'est une route publique par design (les pages de presentation sont publiques). L'itemId SharePoint n'est pas devinable facilement, mais c'est un GUID Graph — pas un secret. |
| Input validation — itemId | **P1 RISQUE** | Le `itemId` est directement interpole dans l'URL Graph API (`/drives/${driveId}/items/${itemId}`). Si un attaquant forge un itemId avec des caracteres speciaux (ex: `../` ou des parametres supplementaires), cela pourrait alterer la requete Graph. En pratique, `graphFetch` utilise probablement un base URL fixe et le SDK Graph gere l'encoding, mais une validation regex sur `itemId` (alphanum + tirets uniquement) serait plus sure. Meme risque pour `driveId` venant du query param. |
| Cache headers | **PASS** | `Cache-Control: public, max-age=300` est correct pour les assets. |
| Memory — streaming | **PASS** | `upstream.body` est forward en streaming (pas buffered en memoire). Correct pour les gros fichiers video. |

### 2.3 `src/app/admin/(authenticated)/tracker/page.tsx` — Tracker page

| Check | Verdict | Detail |
|---|---|---|
| Star visibility + filter | **PASS** | `starredIds` est un `Set<string>`, le toggle via POST est correct. Le filtre `showStarredOnly` filtre correctement dans `filteredProjects`. |
| Columns dropdown fix | **PASS** | Le dropdown utilise un `ref` + `mousedown` listener avec cleanup. Le `columnsDropdownRef.current.contains(e.target)` est la bonne approche pour fermer au clic exterieur. |
| Back button preserves filters | **PASS** | Les filtres sont synchronises vers l'URL via `window.history.replaceState` dans un `useEffect`. Cela preserve les filtres lors de la navigation retour. |
| Null safety | **PASS** | `p.clickupTaskUrl?.match(...)`, `taskIdMatch?.[1]`, `(p.displayClient ?? p.client)` — tous les cas null sont geres. |
| localStorage | **PASS** | `localStorage.getItem/setItem` sont dans des try/catch. Le fallback en cas d'erreur est correct. |
| Performance | **PASS** | `useMemo` sur les donnees filtrees/triees. Pagination avec `ITEMS_PER_PAGE = 50`. Pas de re-render superflu. |
| TRACKER_CACHE_KEY dependency | **INFO** | `TRACKER_CACHE_KEY` est une constante string definie dans le composant, listee dans les deps de `syncAndFetch`. Ce n'est pas un bug (la valeur ne change jamais), mais c'est un pattern inhabituel. |

### 2.4 `src/app/admin/(authenticated)/projects/[id]/page.tsx` — Project detail

| Check | Verdict | Detail |
|---|---|---|
| BackToTrackerLink | **PASS** | `window.history.length > 2 || document.referrer.includes("/admin/tracker")` est une heuristique raisonnable. Le fallback `href="/admin/tracker"` fonctionne si le JS echoue. |
| Brief display | **PASS** | Le brief est fetch via l'API details (qui appelle ClickUp `getTask`). Null safety correcte. |
| Nominate button (case study) | **PASS** | Le bouton etoile reutilise la meme logique que le tracker. |
| ShareFolderModal integration | **PASS** | Le modal recoit les bonnes props (`clientName`, `projectName`, `clickupTaskUrl`, `sharepointLink`). |

### 2.5 `src/app/api/admin/projects/[id]/details/route.ts` — Project details API

| Check | Verdict | Detail |
|---|---|---|
| ClickUp brief fetch | **PASS** | Le taskId est extrait par regex `/\/t\/([a-zA-Z0-9]+)/` — correct. Le `getTask` est dans un try/catch. Le brief est `null` si le fetch echoue. |
| SQL injection via LIKE | **P1 RISQUE** | Les requetes utilisent `like(clients.name, \`%${clientName}%\`)` ou `clientName` vient directement des query params ou du path. Drizzle ORM parametrise les requetes (les valeurs sont passees comme parametres SQL, pas interpolees dans la string SQL), donc le risque d'injection SQL reelle est **faible**. Cependant, un `clientName` contenant `%` ou `_` (caracteres speciaux LIKE) pourrait elargir la recherche de maniere inattendue (ex: `%` matche tout). Ce n'est pas une faille de securite critique mais un comportement inattendu potentiel. |
| Auth check | **PASS** | Pas de `getUserFromSession` dans le handler, mais le middleware Next.js (`src/middleware.ts`) protege toutes les routes `/api/admin/*` par cookie auth via le matcher. Protection confirmee. |
| N+1 sur storyboard scenes | **INFO** | Les scene counts sont fetch en boucle `for` (un query par storyboard). Avec la limite de 20 storyboards et le volume attendu, ce n'est pas critique. Un `COUNT GROUP BY` serait plus optimal mais le gain est marginal. |
| Error handling | **PASS** | Chaque query DB est dans un try/catch individuel. Une erreur sur une table n'empeche pas les autres donnees de remonter. |

### 2.6 `src/components/ui/ImageLightbox.tsx` — Lightbox UX

| Check | Verdict | Detail |
|---|---|---|
| Close button | **PASS** | Le bouton X est positionne `absolute top-4 right-4 z-50` avec un aria-label. Visible et accessible. |
| Comment hint | **PASS** | Le hint "Click anywhere on the image to leave a comment" est affiche au-dessus de l'image quand `previewId` est present. |
| Navigation prev/next | **PASS** | Wrap-around correct avec modulo. Keyboard navigation (arrows, Escape) est implementee. |
| Polling comments | **INFO** | `setInterval(fetchComments, 5000)` — polling toutes les 5 secondes quand le lightbox est ouvert. Le cleanup via `clearInterval` est correct. En cas d'erreur reseau, le catch silencieux est acceptable (polling de commodite). |
| Body scroll lock | **PASS** | `document.body.style.overflow = "hidden"` avec cleanup dans le return du useEffect. |
| postComment — stale closure | **INFO** | Le `useCallback` de `postComment` depend de `assetName` et `alt` mais utilise `currentImage.assetName`. Les deps listent `assetName` et `alt` mais pas `currentImage` — cependant `currentImage` est derive de `navIndex` + `allImages` qui ne sont pas dans les deps non plus. En pratique, `currentImage.assetName` sera correct car `postComment` est recree quand `assetName` change. Pas de bug observable mais les deps meritent un nettoyage. |

### 2.7 `src/components/admin/ShareFolderModal.tsx` — Share folder modal

| Check | Verdict | Detail |
|---|---|---|
| SharePoint URL resolution fallback | **PASS** | Si la resolution URL echoue, le modal fait un fallback vers le client root puis tente un auto-navigate via `clickupListName`. Logique robuste. |
| File selection | **PASS** | Auto-select all files on folder change. Toggle select/deselect all. Les IDs sont stockes dans un `Set`. |
| Share with selection | **PASS** | `shareFolderWithSelection` envoie la liste des fichiers selectionnes en JSON. Le fallback `null` pour selection vide est correct. |
| Clipboard | **PASS** | `navigator.clipboard.writeText` dans un try/catch (clipboard peut etre indisponible). |

### 2.8 `src/app/api/admin/integrations/sharepoint/folders/route.ts` — SharePoint folder resolution

| Check | Verdict | Detail |
|---|---|---|
| `:f:/s/` format resolution | **PASS** | 3 strategies de resolution en cascade : (1) Graph sharing API, (2) path-based sur drive hardcode, (3) site-based dynamic drive lookup. Robuste. |
| Auth | **PASS** | `getUserFromSession()` verifie en debut de handler. |
| Rate limiting | **PASS** | `checkRateLimit("sp-folders", 30, 60_000)` — 30 req/min. |
| Input validation | **PASS** | Verifie qu'au moins un param (`url`, `folderId`, `client`) est present. |
| Error handling | **PASS** | Les erreurs SharePoint sont mappees vers des 404/500 avec messages clairs. |

### 2.9 `src/app/api/project-previews/[clientSlug]/[projectSlug]/route.ts` — Share link assets API

| Check | Verdict | Detail |
|---|---|---|
| Recursive subfolder traversal | **PASS** | `listDriveItemsRecursive` avec `MAX_SUBFOLDER_DEPTH = 3` et `MAX_TOTAL_FILES = 100`. Double protection contre les explosions. |
| Rate limiting | **PASS** | 60 req/min par IP. |
| Cache headers | **PASS** | `s-maxage=300, stale-while-revalidate=60`. |
| BATCH_PATTERN | **INFO** | Le pattern `BATCH_PATTERN = /^Batch\s*\d+/i` ne matche que les dossiers commencant par "Batch". La page principale (`page.tsx`) n'utilise pas ce pattern et montre tous les dossiers non-skipped. Il y a une divergence de comportement entre la route API et la page SSR — la page SSR est plus permissive (montre tous les dossiers), ce qui semble etre le comportement voulu apres les commits recents. |

### 2.10 `src/components/inbox/ProjectActionModal.tsx` — Inbox project mapping

| Check | Verdict | Detail |
|---|---|---|
| Manual ClickUp mapping | **PASS** | Le search POST vers `/api/admin/clickup/search` avec `multi: true` est correct. La sauvegarde via PATCH `/api/admin/inbox` persiste le mapping. |
| Auto-search fallback | **PASS** | Si pas de `clickupProjectHint` → affiche directement le panel de recherche manuelle. Si auto-search echoue → idem. |
| Feedback extraction | **PASS** | Appel LLM pour extraire le feedback. Fallback sur le body brut si erreur. Le `isExtractingFeedback` desactive le textarea pendant l'extraction. |
| UX flow | **PASS** | Le mapping est sauvegarde sans marquer l'item comme "done" (`status: "pending"`). L'utilisateur doit ensuite cliquer "Open in ClickUp" ou "Post Feedback" pour finaliser. |
| Focus trap | **PASS** | Tab cycling implementee. Escape ferme le modal. |

---

## 3. Risques identifies

### P1 — Input validation manquante sur le proxy d'assets

**Fichier** : `src/app/api/project-assets/[itemId]/route.ts`
**Risque** : Le `itemId` (param route) et le `driveId` (query param) sont passes directement a l'API Graph sans validation. Un attaquant pourrait tenter une injection de chemin.
**Impact** : Faible en pratique (le SDK Graph encode les URLs), mais une validation regex `^[a-zA-Z0-9!_-]+$` sur les deux params serait une defense en profondeur.
**Action recommandee** : Ajouter une validation en debut de handler. Signaler a @fullstack.

### RESOLU — Auth sur la route admin `/api/admin/projects/[id]/details`

**Fichier** : `src/app/api/admin/projects/[id]/details/route.ts`
**Constat initial** : Pas de `getUserFromSession()` dans le handler.
**Verification** : Le middleware (`src/middleware.ts`) protege toutes les routes `/api/admin/*` via le matcher `["/admin/:path*", "/api/admin/:path*"]`. L'auth est verifiee par cookie au niveau middleware avant que le handler soit atteint.
**Verdict** : **Pas de faille**. Le handler n'a pas besoin d'un double check d'auth. La protection est assuree par le middleware.

### P1 — Potentiel explosion d'appels Graph API

**Fichier** : `src/app/project/[clientSlug]/[projectSlug]/page.tsx`
**Risque** : `collectFilesRecursive` n'a pas de limite sur le nombre de sous-dossiers par niveau. 50 sous-dossiers x 4 niveaux = potentiellement 200+ appels API en parallele.
**Impact** : Throttling/rate limiting cote Microsoft Graph. Temps de chargement degrade.
**Action recommandee** : Ajouter une limite de concurrence (ex: `Promise.all` en lots de 5) ou un compteur total d'appels. Signaler a @fullstack.

---

## 4. Points positifs

- **Robustesse SharePoint** : 3 strategies de resolution d'URL en cascade. Fallbacks bien penses.
- **Video streaming** : Le proxy avec Range headers est correct et bien implemente. Le timeout de 30s protege le serveur.
- **UX lightbox** : Navigation clavier, scroll lock, polling comments, close button accessible.
- **Tracker filters** : Persistence URL via replaceState, back button preserves context, mobile bottom sheet pour les filtres.
- **Error boundaries** : Chaque query DB dans le details route est isolee dans son propre try/catch. Une erreur partielle ne casse pas toute la page.
- **Comment count badges** : Requete SQL groupBy efficace (pas de N+1).

---

## 5. Score global

| Categorie | Score |
|---|---|
| TypeScript | 10/10 |
| Logique metier | 9/10 |
| Edge cases / null safety | 9/10 |
| Securite | 8/10 |
| Performance | 8/10 |
| **Global** | **8.8/10** |

Le point le plus faible est l'absence de validation d'input sur le proxy public d'assets et le potentiel d'explosion d'appels Graph API sur les arborescences profondes.

---

## 6. Resume des actions

| Priorite | Fichier | Action | Destinataire |
|---|---|---|---|
| P1 | `route.ts` (project-assets) | Ajouter validation regex sur `itemId` et `driveId` | @fullstack |
| RESOLU | `route.ts` (project details) | Middleware auth confirme — pas d'action necessaire | — |
| P1 | `page.tsx` (share link) | Limiter la concurrence des appels Graph API recursifs | @fullstack |
| INFO | `ImageLightbox.tsx` | Nettoyer les deps du `useCallback` de `postComment` | @fullstack |
| INFO | `route.ts` (project-previews) | Le `BATCH_PATTERN` est plus restrictif que la page SSR — divergence intentionnelle ? | @fullstack |
