# Code Audit - Back-office Sarani

**Date** : 2026-03-25
**Auteur** : @qa
**Scope** : 13 agents IA (API routes, prompts, validations), DB schema, auth middleware, Claude SDK wrapper
**Build status** : PASS (0 errors)

---

## Score global : 7.5 / 10

Le code est solide, bien structure, et suit des patterns coherents sur l'ensemble des 13 agents. Le build passe proprement. Les problemes identifies sont principalement des failles de securite a corriger et des incoherences mineures de patterns entre agents.

---

## 1. Problemes critiques

### CRIT-01 : Faille de securite - Token de session base sur un hash faible (auth.ts L22-31)

**Fichier** : `src/lib/auth.ts`
**Severite** : CRITIQUE

La fonction `generateSessionTokenSync()` utilise un hash maison base sur un shift bitwise (`(hash << 5) - hash + char`) puis construit le token avec `btoa()`. Ce n'est PAS un hash cryptographique. Le token est previsible et reversible :

```typescript
// PROBLEME : hash trivial, token deductible du mot de passe
return `s_${Math.abs(hash).toString(36)}_${btoa(str).slice(0, 32)}`;
```

Le `btoa(str)` encode en base64 la chaine `sarani-admin-{PASSWORD}` -- le mot de passe admin est donc **lisible en clair dans le cookie** (il suffit de decoder le base64). Toute personne accedant au cookie dans le navigateur peut extraire le mot de passe admin.

**Impact** : Un utilisateur qui intercepte le cookie (meme via les DevTools du navigateur) peut extraire le mot de passe admin en clair.

**Recommandation** : Utiliser un token opaque genere aleatoirement (`crypto.randomUUID()` ou `crypto.getRandomValues()`), stocke cote serveur (ou signe avec HMAC). Ne jamais encoder le mot de passe dans le cookie.

> **Escalade** : Signale a @infrastructure et @fullstack. A corriger avant toute mise en production du back-office.

### CRIT-02 : Pas de rate limiting sur les routes API agents

**Fichier** : Toutes les routes `/api/admin/agents/*/generate` et `/api/admin/agents/*/recommend`
**Severite** : CRITIQUE

Aucun rate limiting n'est en place sur les routes de generation. Un utilisateur authentifie (ou un attaquant ayant vole le cookie -- cf CRIT-01) peut spammer les appels Claude API sans limite, generant des couts potentiellement massifs (le budget IA est "pas de limite" selon project-context.md, mais l'absence de controle reste un risque operationnel).

**Impact** : Couts Claude API incontroles, potential denial-of-wallet attack.

**Recommandation** : Implementer un rate limiter (par IP ou par session) sur les routes de generation. Exemples : `@upstash/ratelimit` ou un simple compteur en memoire pour commencer.

### CRIT-03 : PM agent_types incomplet vs agents reels

**Fichier** : `src/lib/validations/pm.ts` L5-12
**Severite** : HAUTE

Le PM agent ne connait que 6 types d'agents :
```typescript
export const AGENT_TYPES = [
  "translator", "creative", "designer", "legal", "social", "seo"
] as const;
```

Mais le back-office compte 13 agents : **copywriter, email-drafter, pm, presentation, proofreader, proposal, video-script** sont absents. Le PM ne peut donc pas dispatcher de taches vers ces 7 agents.

**Impact** : Le PM analyse un brief, identifie qu'il faut du copywriting ou une video, mais ne peut pas le dispatcher. Perte de fonctionnalite majeure.

**Recommandation** : Ajouter les 7 agents manquants au AGENT_TYPES :
```typescript
export const AGENT_TYPES = [
  "translator", "creative", "designer", "legal", "social", "seo",
  "copywriter", "email-drafter", "presentation", "proofreader",
  "proposal", "video-script", "pm"
] as const;
```

### CRIT-04 : PM analyze ne sauvegarde pas en DB

**Fichier** : `src/app/api/admin/agents/pm/analyze/route.ts`
**Severite** : HAUTE

Contrairement a tous les autres agents, la route PM `/analyze` ne sauvegarde pas le resultat de l'analyse dans `agent_outputs`. L'analyse est renvoyee au client mais perdue cote serveur.

**Impact** : Pas de tracabilite des analyses PM. Impossible de voir l'historique des briefs analyses. Incoherence avec le pattern des autres agents.

**Recommandation** : Ajouter un `db.insert(agentOutputs)` apres la validation, comme dans tous les autres agents.

---

## 2. Problemes de coherence

### COH-01 : Deux patterns differents pour les routes history

Certains agents utilisent une validation Zod pour les parametres de pagination (copywriter, designer, email-drafter, seo, social, translator, video-script, proofreader) :
```typescript
const parsed = copywriterHistorySchema.safeParse({
  clientId: searchParams.get("clientId") || undefined,
  limit: searchParams.get("limit") || 20,
  offset: searchParams.get("offset") || 0,
});
```

D'autres agents ne valident pas du tout et utilisent un `.limit(50)` en dur (creative, legal, pm/projects, presentation, proposal) :
```typescript
// Pas de validation Zod, pas de pagination
.limit(50);
```

**Impact** : Incoherence UX -- certains agents supportent la pagination, d'autres non. Les agents sans pagination casseront quand l'historique depassera 50 entrees.

**Recommandation** : Standardiser sur le pattern avec validation Zod + pagination pour tous les agents.

### COH-02 : Inconsistance dans la cle de reponse JSON

Chaque route de generation renvoie le resultat sous une cle differente :
- copywriter : `{ content: ... }`
- creative : `{ recommendation: ... }`
- designer : `{ design: ... }`
- email-drafter : `{ email: ... }`
- legal : `{ contractText: ... }`
- presentation : `{ presentation: ... }`
- proofreader : `{ review: ... }`
- proposal : `{ proposal: ... }`
- seo : `{ result: ... }`
- social : `{ social: ... }`
- translator : `{ translation: ... }`
- video-script : `{ script: ... }`

Ce n'est pas un bug, mais cela complexifie le code frontend qui doit connaitre la cle specifique de chaque agent.

**Recommandation** : Envelopper dans une structure uniforme `{ data: ..., outputId: ..., usage: ... }` pour simplifier le front.

### COH-03 : Modele Claude non uniforme entre agents

- La plupart des agents utilisent `claude-sonnet-4-5-20250514`
- Le Creative agent utilise `claude-opus-4-20250514` (justifie pour la strategie)
- Le Proposal agent utilise `claude-opus-4-20250514` (justifie pour les propositions commerciales)
- Le PM agent ne specifie PAS de modele (utilise le default `claude-sonnet-4-5-20250514` via claude.ts)

**Impact** : Pas de probleme fonctionnel, mais le PM devrait peut-etre utiliser Opus vu la complexite de l'analyse de briefs. A discuter avec @fullstack.

### COH-04 : innerJoin sur history exclut les outputs sans client

Toutes les routes history utilisent `innerJoin(clients, ...)`, ce qui exclut les `agent_outputs` dont le `clientId` est null.

**Impact pour proposal** : La route `proposal/history` fait correctement un select sans join (puisque les proposals ciblent des prospects, pas des clients). Mais si d'autres agents (translator, proofreader) sauvegardent conditionnellement (seulement quand clientId existe), leurs outputs sans client ne seront jamais visibles dans l'historique.

Pour translator et proofreader, les outputs sans clientId ne sont simplement pas sauvegardes (condition `if (clientId)`), donc le innerJoin est coherent. Pas de bug, mais a documenter.

---

## 3. Problemes mineurs

### MIN-01 : PM projects route -- logique de conditions confuse

**Fichier** : `src/app/api/admin/agents/pm/projects/route.ts` L1477-1481

```typescript
const conditions = [eq(agentOutputs.agentType, "pm")];
// We fetch all PM-dispatched tasks (any agent type) grouped by client.
// Remove the agentType filter to get all dispatched tasks.
conditions.length = 0;
```

Le code pousse une condition puis la supprime immediatement. C'est un artefact de dev qui rend le code confus. Devrait simplement initialiser `conditions` comme un tableau vide.

### MIN-02 : `request.json()` peut throw sans catch specifique

Si le body de la requete n'est pas du JSON valide, `request.json()` lancera une erreur avant la validation Zod. Le catch generique la rattrapera avec un message `500` generique plutot qu'un `400 Bad Request` explicite.

**Impact** : Message d'erreur peu utile pour le client en cas de body malformed. Pas critique car le front envoie toujours du JSON valide, mais c'est une mauvaise pratique pour une API.

**Recommandation** : Wrapper `request.json()` dans un try/catch specifique qui renvoie `400`.

### MIN-03 : Pas de validation de longueur maximale sur les champs texte libres

Les schemas Zod pour les briefs/topics n'ont generalement pas de `.max()`. Un utilisateur pourrait envoyer un brief de 1 million de caracteres, ce qui genererait un prompt enorme et couterait cher en tokens.

**Recommandation** : Ajouter des `.max(10000)` ou `.max(50000)` sur les champs texte libres.

### MIN-04 : agentType dans schema.ts ne liste pas tous les agents

**Fichier** : `src/lib/db/schema.ts` L62

Le commentaire dit :
```typescript
agentType: varchar("agent_type", { length: 20 }).notNull(),
// pm | translator | creative | designer | legal | social | seo | proposal
```

Il manque : copywriter, email-drafter, presentation, proofreader, video-script. Le champ n'a pas de contrainte CHECK en DB, donc ca fonctionne, mais le commentaire est trompeur.

---

## 4. Points positifs

### Patterns solides appliques uniformement

1. **Validation Zod en entree ET en sortie** : Chaque route de generation valide le body avec Zod, puis valide la reponse de Claude avec un schema Zod distinct. C'est une excellente pratique -- si Claude renvoie un JSON malformed ou incomplet, l'API renvoie un `502` propre au lieu de crasher.

2. **Injection du contexte client systematique** : Tous les agents recuperent le client en DB et injectent son contexte (brand tone, industry, colors, guidelines, prohibited terms) dans le prompt. Le code est verbeux mais correct.

3. **Sauvegarde systematique en agent_outputs** : Sauf pour PM/analyze (cf CRIT-04), tous les resultats sont sauvegardes en DB avec `inputPayload` + `outputContent` + `status`. Bonne tracabilite.

4. **Gestion d'erreur coherente** : try/catch sur toutes les routes, avec `console.error` + reponse HTTP appropriee (400/404/500/502).

5. **Middleware auth fonctionnel** : La protection par middleware couvre bien `/admin/:path*` et `/api/admin/:path*`. Les routes publiques (login, auth API) sont correctement exclues.

6. **Prompts IA de haute qualite** : Le `base.ts` definit un contexte Sarani precis (pas generique). Chaque prompt agent est detaille, avec des principes, des frameworks, et un format de sortie JSON strict. Les prompts sont professionnels et specifiques au metier de chaque agent.

7. **Schema DB bien concu** : Indexes sur `status`, `client_id`, `agent_type`. Types corrects. Cascade delete sur les relations. `clientId` nullable sur `agent_outputs` (correct pour les proposals).

8. **Claude SDK wrapper propre** : `callClaudeJSON` gere le stripping des code fences markdown, les erreurs API (rate limit, auth, timeout). Singleton pattern pour le client Anthropic.

---

## 5. Recommandations pour atteindre 9/10

| Priorite | Action | Impact |
|----------|--------|--------|
| P0 | **Corriger CRIT-01** : Remplacer le token de session par un token opaque cryptographique | Securite |
| P0 | **Corriger CRIT-03** : Ajouter les 7 agents manquants au PM AGENT_TYPES | Fonctionnalite |
| P1 | **Corriger CRIT-04** : Sauvegarder les analyses PM en DB | Tracabilite |
| P1 | **Ajouter rate limiting** sur les routes de generation (CRIT-02) | Securite/Couts |
| P2 | Standardiser la pagination sur toutes les routes history (COH-01) | Coherence |
| P2 | Wrapper `request.json()` pour renvoyer 400 au lieu de 500 (MIN-02) | Robustesse |
| P2 | Ajouter `.max()` sur les champs texte libres (MIN-03) | Couts/Securite |
| P3 | Nettoyer le code de PM projects (MIN-01) | Lisibilite |
| P3 | Unifier les cles de reponse JSON (COH-02) | DX |
| P3 | Mettre a jour le commentaire agentType dans schema.ts (MIN-04) | Documentation |

---

## 6. Resume par composant

| Composant | Score | Verdict |
|-----------|-------|---------|
| API Routes - Generate (13 agents) | 8/10 | Pattern solide, Zod in/out, sauvegarde DB. Manque rate limiting et max length inputs. |
| API Routes - History (13 agents) | 7/10 | Fonctionnelles mais 2 patterns differents (avec/sans pagination Zod). |
| Schema DB | 9/10 | Bien structure, indexes corrects, types coherents. Commentaire agentType incomplet. |
| Connexion DB | 9/10 | Simple, correcte, check env var. |
| Auth / Middleware | 5/10 | Middleware bien configure mais token de session gravement faible. |
| Prompts IA | 9/10 | Excellents -- specifiques, structures, avec format JSON strict. |
| Validations Zod | 8/10 | Bien definies pour tous les agents. PM AGENT_TYPES incomplet. |
| Claude SDK wrapper | 9/10 | Propre, gestion d'erreurs API, code fence stripping, timeout. |
| Build | 10/10 | 0 erreurs, 0 warnings. |

---

**Handoff -> @fullstack**
- Fichiers produits : `docs/reviews/code-audit.md`
- Decisions prises : Score 7.5/10. 4 problemes critiques identifies, 4 problemes de coherence, 4 problemes mineurs.
- Points d'attention :
  - **URGENT** : CRIT-01 (token session) doit etre corrige avant mise en production
  - **URGENT** : CRIT-03 (PM AGENT_TYPES) casse la fonctionnalite de dispatch pour 7 agents
  - CRIT-04 (PM analyze pas sauvegarde en DB) est une regression par rapport au pattern des autres agents
  - CRIT-02 (rate limiting) peut attendre la V2 si le back-office est restreint au reseau interne
