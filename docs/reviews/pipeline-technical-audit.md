# Audit Technique -- Case Study Multi-Agent Pipeline

**Date** : 3 avril 2026
**Auditeur** : @fullstack (mode audit statique)
**Type** : Analyse statique du code (pas d'execution live, pas de tests E2E)
**Score global** : 7.5/10

---

## Resume executif

Le pipeline multi-agent (creative-strategy -> copywriter -> social) est bien construit : architecture claire, validation Zod a chaque etape, transaction DB atomique pour les outputs finaux, gestion d'erreur par etape avec rollback du status. Cependant, plusieurs problemes P0/P1 existent : absence d'index sur le slug pour la route publique, timeout total potentiellement trop long pour Replit autoscale, pas de retry sur les etapes 1 et 3, et risque de race condition sur `savePipelineStep`.

---

## P0 -- Bloquants

### P0-1. Pas d'index DB sur `case_study_slug` -- Performance route publique

**Fichier** : `src/lib/db/schema.ts`, lignes 391-394
**Description** : La route publique `GET /api/case-studies/[slug]` et la page SSR `/case-studies/[slug]` filtrent toutes deux sur `caseStudyOutputs.caseStudySlug`. Or il n'y a aucun index sur cette colonne. Avec la croissance du nombre d'outputs, chaque requete publique fera un sequential scan.
**Fix** :
```typescript
// Dans la definition de caseStudyOutputs, ajouter :
index("idx_outputs_slug").on(table.caseStudySlug),
```
Plus une migration SQL :
```sql
CREATE INDEX IF NOT EXISTS idx_outputs_slug ON case_study_outputs (case_study_slug);
```

### P0-2. Race condition sur `savePipelineStep` (read-modify-write non-atomique)

**Fichier** : `src/app/api/admin/case-studies/candidates/[id]/generate/route.ts`, lignes 41-69
**Description** : `savePipelineStep` fait un SELECT du tableau `pipelineSteps`, ajoute un element en JS, puis UPDATE. Si deux pipelines tournent pour le meme candidat (double-click, retry rapide), le second SELECT peut lire l'etat avant le premier UPDATE et ecraser ses donnees.
**Impact** : Perte de donnees de pipeline steps.
**Fix recommande** : Utiliser une requete SQL atomique avec `jsonb_array_append` via `sql` raw de Drizzle :
```typescript
await db.execute(sql`
  UPDATE case_study_candidates 
  SET pipeline_steps = pipeline_steps || ${JSON.stringify(newStep)}::jsonb,
      updated_at = NOW()
  WHERE id = ${id}
`);
```
Ou, plus simple : ajouter un verrou optimiste (check `pipelineStatus !== 'generating'` avant de lancer) pour empecher les executions concurrentes.

### P0-3. Timeout total du pipeline potentiellement fatal sur Replit autoscale

**Fichier** : `src/app/api/admin/case-studies/candidates/[id]/generate/route.ts`
**Description** : Les 3 etapes LLM sont sequentielles avec des timeouts de 20s + 30s + 30s (etape 2 avec retry) + 20s = jusqu'a 100 secondes au total. Replit autoscale tue les workers apres ~60s d'inactivite HTTP. Le client HTTP a aussi potentiellement un timeout plus court.
**Impact** : Le pipeline peut etre tue silencieusement par la plateforme entre les etapes, laissant le candidat en status "generating" indefiniment.
**Fix recommande** :
1. Reduire les timeouts individuels (15s / 25s / 15s = 55s max)
2. Mieux : convertir en job background avec polling. Le POST retourne un `jobId` immediatement, un cron ou setInterval execute le pipeline, le frontend poll le status via le mecanisme de polling deja en place (l'auto-poll sur status "generating" existe deja dans la page listing).

---

## P1 -- Importants

### P1-1. Pas de retry sur les etapes 1 et 3 (asymetrie avec etape 2)

**Fichier** : `src/app/api/admin/case-studies/candidates/[id]/generate/route.ts`, lignes 141-176 et 240-276
**Description** : L'etape 2 (Copywriter) a un retry intelligent avec feedback de validation si le premier appel echoue. Les etapes 1 (Strategy) et 3 (Social) n'ont aucun retry -- un seul echec Zod ou timeout = pipeline echoue.
**Impact** : Taux d'echec pipeline plus eleve que necessaire. Les LLM ne sont pas deterministes.
**Fix** : Appliquer le meme pattern de retry avec feedback a toutes les etapes.

### P1-2. Le `slug` genere par le LLM n'est pas sauvegarde dans `caseStudyOutputs.caseStudySlug` lors de la generation

**Fichier** : `src/app/api/admin/case-studies/candidates/[id]/generate/route.ts`, lignes 281-340
**Description** : Les `outputRecords` inseres n'incluent pas `caseStudySlug`. Ce champ n'est rempli que lors de la publication (`publish/route.ts` ligne 117). C'est coherent fonctionnellement (le slug ne "vit" publiquement qu'apres publication), mais cela signifie que si un admin veut voir la preview de la case study par slug avant publication, c'est impossible via la route publique.
**Impact** : Mineur -- le workflow actuel passe par l'admin detail page qui utilise le candidateId, pas le slug. Pas un bug, mais une opportunite manquee pour le preview.

### P1-3. Pas de protection contre les doubles executions concurrentes

**Fichier** : `src/app/api/admin/case-studies/candidates/[id]/generate/route.ts`, lignes 128-136
**Description** : Le status est mis a "generating" avant de lancer le pipeline, mais il n'y a pas de check `IF status != 'generating'` avant de demarrer. Un double-click rapide ou un retry pendant que le pipeline tourne lancera un second pipeline en parallele.
**Fix** : Ajouter avant la ligne 128 :
```typescript
if (candidate.status === "generating") {
  return NextResponse.json(
    { error: "Pipeline already in progress for this candidate" },
    { status: 409 }
  );
}
```

### P1-4. N+1 queries sur les thumbnails SharePoint

**Fichier** : `src/app/api/admin/case-studies/candidates/[id]/visuals/route.ts`, lignes 110-133
**Description** : Pour chaque fichier visuel (jusqu'a 20), un appel API Graph individuel est fait pour recuperer les thumbnails. C'est 20 appels HTTP sequentiels vers Microsoft Graph.
**Fix** : Utiliser le batch endpoint de Graph (`$batch`) ou ajouter `$expand=thumbnails` a la requete `children` initiale :
```
/drives/${driveId}/items/${folderId}/children?$top=100&$select=id,name,size,webUrl,file,folder&$expand=thumbnails
```
Cela ramene tout en une seule requete.

### P1-5. Le `volume` et `turnaround` du schema Zod ne sont pas alimentes par les donnees du candidat

**Fichier** : `src/lib/case-studies/schemas.ts`, lignes 23-24 / `src/lib/case-studies/pipeline-prompts.ts`
**Description** : `CaseStudyOutputSchema` requiert `volume` (min 1 char) et `turnaround` (min 1 char) comme champs obligatoires. Or les donnees du candidat ne contiennent ni volume ni turnaround -- le LLM doit les inventer. Cela viole la regle "NEVER invent data" du prompt.
**Impact** : Le LLM va systematiquement halluciner ces valeurs puisqu'elles ne sont pas dans l'input.
**Fix** : Soit rendre ces champs optionnels dans le schema (`z.string().optional()`), soit les alimenter depuis les donnees ClickUp si disponibles.

### P1-6. Le `scoreTotal` est accede comme nombre mais pourrait etre null

**Fichier** : `src/app/api/admin/case-studies/candidates/[id]/generate/route.ts`, ligne 118
**Description** : `candidate.scoreTotal < 70` -- dans le schema DB, `scoreTotal` est `integer().notNull()`, donc c'est techniquement safe. Mais le type TypeScript infere de Drizzle pourrait differer selon la version. Pas critique mais a surveiller.

---

## P2 -- Ameliorations

### P2-1. Duplication du pattern error handling dans le pipeline

**Fichier** : `src/app/api/admin/case-studies/candidates/[id]/generate/route.ts`, lignes 159-176, 219-236, 260-276
**Description** : Le bloc catch de chaque etape est identique (set status "suggested", pipelineStatus "failed", return error JSON). Ce code est duplique 3 fois.
**Fix** : Extraire une fonction `handlePipelineFailure(id, step, stepName, error)`.

### P2-2. `dangerouslySetInnerHTML` pour JSON-LD -- acceptable mais a documenter

**Fichier** : `src/app/case-studies/[slug]/page.tsx`, ligne 172
**Description** : `dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}` pour le JSON-LD. Le `jsonLd` est construit a partir de `cs.client` et `cs.headline` qui viennent du LLM. `JSON.stringify` echappe les caracteres dangereux (`<`, `>`, `&`, `"`) donc le risque XSS est faible mais pas nul (certains navigateurs anciens). Next.js recommande un pattern specifique pour le JSON-LD.
**Fix** : Pas urgent. Pour une securite maximale, utiliser la metadata API de Next.js ou sanitizer le contenu.

### P2-3. Pas de cache-control sur la page SSR `/case-studies/[slug]`

**Fichier** : `src/app/case-studies/[slug]/page.tsx`
**Description** : La route API publique a `Cache-Control: public, s-maxage=3600`, mais la page SSR elle-meme n'a pas de headers de cache definis (pas de `export const revalidate = 3600` ni de headers custom).
**Fix** : Ajouter `export const revalidate = 3600;` en haut du fichier pour ISR, ou configurer les headers dans `next.config.js`.

### P2-4. Le type `DbCaseStudyContent` est defini localement au lieu d'utiliser le schema Zod

**Fichier** : `src/app/case-studies/[slug]/page.tsx`, lignes 25-46
**Description** : L'interface `DbCaseStudyContent` redefini manuellement la structure du case study au lieu d'utiliser `z.infer<typeof CaseStudyOutputSchema>` de `schemas.ts`. Si le schema Zod evolue, ce type local ne suivra pas.
**Fix** : Importer et utiliser le type infere du schema :
```typescript
import { CaseStudyOutputSchema } from "@/lib/case-studies/schemas";
type DbCaseStudyContent = z.infer<typeof CaseStudyOutputSchema>;
```

### P2-5. Constantes de rate limiting hardcodees

**Fichier** : `src/app/api/admin/case-studies/candidates/[id]/generate/route.ts`, ligne 82
**Description** : `checkRateLimit("llm-cs-generate", 10, 60_000)` -- les valeurs 10 et 60000 sont en dur. Elles devraient etre dans `src/config/`.
**Fix** : Centraliser dans un fichier de config.

### P2-6. Le `visual_suggestions` de la migration 0006 n'est pas utilise

**Fichier** : `src/lib/db/migrations/0006_add_pipeline_tracking.sql`, ligne 10
**Description** : La colonne `visual_suggestions` est ajoutee par la migration et definie dans le schema Drizzle, mais n'est jamais ecrite par le code. Les visuals sont fetchees a la volee depuis SharePoint sans etre persistees.
**Impact** : Colonne morte dans la DB. Soit la persister pour du cache, soit la supprimer.

### P2-7. `formatDate` duplique entre listing et detail

**Fichier** : `src/app/admin/(authenticated)/agents/case-studies/page.tsx` et `[id]/page.tsx`
**Description** : La meme fonction `formatDate` est definie dans les deux fichiers. Extraire dans un utilitaire partage.

### P2-8. Le contenu LLM est rendu comme texte brut dans la page publique

**Fichier** : `src/app/case-studies/[slug]/page.tsx`, lignes 259-275
**Description** : `cs.solution` est split sur `\n\n` et rendu en `<p>`. Mais si le LLM genere du markdown (listes, gras, italique), il sera affiche tel quel. Le prompt dit "No markdown", mais les LLM ne sont pas fiables sur cette instruction.
**Fix** : Soit sanitizer le contenu (strip markdown), soit le parser avec un renderer markdown securise.

---

## Points forts

1. **Architecture pipeline claire et modulaire** : La separation prompts / schemas / route est excellente. Chaque etape a son schema Zod, son prompt, et son builder d'input. Tres maintenable.

2. **Validation Zod stricte a chaque etape** : Chaque output LLM est valide avant de passer a l'etape suivante. Le pipeline ne propage pas de donnees invalides.

3. **Transaction atomique pour les outputs** : Le `db.transaction` (lignes 333-350) garantit que soit tous les outputs sont sauvegardes, soit aucun. Pas d'etat inconsistant.

4. **Retry intelligent a l'etape 2** : Le pattern de retry avec feedback de validation ("Your previous response had validation errors...") est une bonne pratique pour les appels LLM.

5. **Pipeline tracking granulaire** : Le `pipelineStatus` et `pipelineSteps` permettent de suivre la progression en temps reel dans l'admin UI, avec polling automatique.

6. **Fallback gracieux sur la page publique** : DB -> static data -> redirect -> 404. Le site ne casse pas si la DB est down.

7. **Auth middleware solide** : Les routes admin sont protegees par middleware avec verification de role pour les ecritures. La route publique est correctement ouverte.

8. **Rate limiting en place** : La route de generation a un rate limit (10/min), ce qui protege contre l'abus des appels LLM couteux.

9. **UUID validation systematique** : Les parametres d'ID sont valides contre UUID_REGEX avant toute operation DB.

10. **UI admin complete** : Listing avec filtres, detail avec tabs, pipeline progress bar, visual suggestions, regeneration avec instructions, publish/unpublish -- tout le workflow est couvert.

---

## Matrice de severite

| Severite | Count | Issues |
|----------|-------|--------|
| P0       | 3     | Index slug manquant, race condition savePipelineStep, timeout Replit |
| P1       | 6     | Retry asymetrique, slug non pre-sauvegarde, double execution, N+1 thumbnails, volume/turnaround hallucines, scoreTotal null safety |
| P2       | 8     | Duplication error handling, dangerouslySetInnerHTML, cache SSR, type local vs Zod, rate limit hardcode, colonne morte, formatDate duplique, markdown brut |

---

## Recommandation d'action

1. **Immediat** : P0-3 (timeout) -- convertir le pipeline en job background ou reduire les timeouts
2. **Immediat** : P0-2 (race condition) -- utiliser SQL atomique pour savePipelineStep
3. **Cette semaine** : P0-1 (index slug) -- une migration d'une ligne
4. **Cette semaine** : P1-3 (double execution guard) -- 5 lignes de code
5. **Cette semaine** : P1-5 (volume/turnaround) -- rendre optionnels ou alimenter
6. **Sprint suivant** : P1-1 (retry uniforme), P1-4 (batch thumbnails), P2-*

---

**Handoff -> @qa**
- Fichiers audites : liste complete ci-dessus (11 fichiers)
- Decisions : audit statique uniquement, pas d'execution live
- Points d'attention : tester le pipeline end-to-end avec un candidat reel, verifier le comportement en cas de timeout LLM, tester le double-click sur "Generate", verifier que le slug est bien indexe en production
