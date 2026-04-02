# Audit Technique — Classification Emails (Inbox)

**Date** : 2026-04-02
**Agent** : @ia
**Scope** : `src/lib/ai/prompts/classifier.ts`, `poll-emails/route.ts`, `emails/classify/route.ts`

---

## Score prompt : 5.5/10

Prompt bien structuré sur le fond, mais 3 problèmes structurels causent les bugs observés.

---

## Bugs techniques identifiés

### BUG 1 — maxTokens insuffisant pour la tâche demandée (critique)

**Fichier** : `poll-emails/route.ts` ligne 113, `emails/classify/route.ts` ligne 114

`maxTokens: 512` pour un JSON contenant 8 champs dont `draftReply` (un email complet) et `reasoning`.

Estimation réaliste du JSON de sortie :
- `draftReply` seul = 80-200 tokens (email professionnel complet)
- `reasoning` + `suggestedAction` = 40-80 tokens
- Reste des champs = ~40 tokens
- Total : 160-320 tokens minimum, sans compter l'enveloppe JSON

Avec 512 tokens, la réponse est **tronquée sur les emails longs**. Haiku renvoie alors du JSON invalide → `safeParse` échoue → l'email n'est pas traité (ligne 123 : `errors++; continue`). Ces emails disparaissent silencieusement.

**Fix** : passer `maxTokens` à 1024 minimum dans les deux routes.

---

### BUG 2 — Compétition de budget attention : 1 appel fait 4 tâches

**Fichier** : `classifier.ts` lignes 41-88

Le prompt demande simultanément :
1. Classification (tâche de raisonnement)
2. `draftReply` (tâche de génération)
3. `clickupProjectHint` (tâche d'extraction)
4. `language` (tâche de détection)

Haiku est un modèle petit. Quand le corps de l'email est complexe, le budget d'attention du modèle est saturé par la génération du `draftReply`, ce qui dégrade la précision de la classification. C'est la cause probable des `project_feedback` classifiés `new_project` : le modèle "oublie" les signaux de contexte pendant la génération de la réponse.

**Fix recommandé** : séparer en 2 appels séquentiels. Appel 1 (Haiku, 256 tokens) = classification + confidence + category uniquement. Appel 2 (Haiku, 512 tokens) = draftReply, déclenché seulement si category != "other".

---

### BUG 3 — Frontière new_project / project_feedback trop faible pour Haiku

**Fichier** : `classifier.ts` lignes 44-46

La définition `new_project` contient le mot "NEW" en majuscules 4 fois, mais les signaux de distinction pour Haiku restent ambigus. "Voici les retours partie 3" contient un objet projet existant implicite ("partie 3" = continuation), mais le sujet de l'email ou le nom de l'expéditeur peuvent déclencher `new_project` si le client envoie depuis une adresse non reconnue sur un thread non cité explicitement.

Le guard `"If in doubt between new_project and project_feedback, choose project_feedback"` existe (ligne 46) mais **Haiku ne l'applique pas de façon fiable** : il est noyé au milieu de 88 lignes de prompt.

**Fix** : déplacer ce guard en toute fin du bloc "Categories", juste avant "Routing", et le reformuler comme règle absolue prioritaire :

```
CRITICAL RULE: When the email body contains ANY reference to past work (part numbers, version numbers, file names, "retours", "corrections", "v2", "suite de", "comme convenu"), classify as project_feedback regardless of other signals. Only classify as new_project if the email contains ZERO reference to prior work.
```

---

### BUG 4 — Emails Sarani non filtrés dans la route manuelle

**Fichier** : `emails/classify/route.ts` — absent

`poll-emails/route.ts` appelle `isSaraniEmail(from)` (ligne 82) et skip les emails internes.

`emails/classify/route.ts` n'appelle **pas** `isSaraniEmail`. Un PM qui reclassifie manuellement un email Sarani depuis l'inbox le réinjecte dans le pipeline sans filtre.

**Fix** : ajouter après la vérification `isNoiseByEmail` (ligne 89 de classify/route.ts) :

```typescript
if (isSaraniEmail(from)) {
  return NextResponse.json({ error: "Internal Sarani email — not classifiable." }, { status: 400 });
}
```

---

### BUG 5 — Zod laisse passer les réponses tronquées si JSON partiellement valide

**Fichier** : `classifier.ts` lignes 28-37, `poll-emails/route.ts` ligne 118

`ClassificationResultSchema.safeParse` valide uniquement la structure. Si Haiku truncate le JSON mid-stream, `callClaudeJSON` reçoit du JSON invalide → parse JSON échoue avant Zod → le catch de `callClaudeJSON` retourne `null` ou une erreur. Résultat : l'email est compté en `errors` et ignoré définitivement (pas de retry).

Il n'y a **aucun retry** ni aucune fallback de classification par défaut.

**Fix** : ajouter un fallback `enquiry` avec confidence 0.3 quand la validation échoue, plutôt que de silently skip. Un faux positif `enquiry` vaut mieux qu'un email client perdu.

---

## Recommandations synthèse

| Priorité | Action | Fichier | Impact |
|---|---|---|---|
| P0 | `maxTokens` 512 → 1024 dans les 2 routes | `poll-emails/route.ts` l.113, `classify/route.ts` l.114 | Élimine les truncations silencieuses |
| P0 | Ajouter `isSaraniEmail` guard dans `classify/route.ts` | `classify/route.ts` après l.89 | Élimine les emails Sarani en reclassif manuelle |
| P1 | Déplacer la CRITICAL RULE new_project/project_feedback en fin de section Categories | `classifier.ts` l.46 | Corrige les feedbacks classifiés new_project |
| P1 | Fallback `enquiry` conf 0.3 si `safeParse` échoue | `poll-emails/route.ts` l.119-126 | Plus d'emails perdus silencieusement |
| P2 | Séparer classification et draftReply en 2 appels | `classifier.ts` + routes | Améliore précision sans coût significatif |

---

## Note sur le modèle

Haiku est acceptable pour la classification pure (appel 1 du split recommandé). Pour `draftReply`, Haiku produit des réponses génériques. Sonnet 3.5 pour le draftReply donnerait une qualité nettement supérieure pour +0.20$/1K tokens — ROI positif si le PM envoie ces drafts sans modification.

---

**Handoff → @fullstack**
- Fichiers produits : `docs/reviews/ia-classification-audit.md`
- Actions code requises (dans `src/lib/ai/` et routes) :
  1. `maxTokens` 512 → 1024 dans `poll-emails/route.ts` l.113 et `classify/route.ts` l.114
  2. Ajouter `isSaraniEmail(from)` guard dans `classify/route.ts` après l.89 (import depuis `@/lib/inbox/sarani-filter`)
  3. CRITICAL RULE prompt : déplacer et reformuler le guard new_project/project_feedback dans `classifier.ts`
  4. Fallback classification `enquiry` quand `safeParse` échoue dans `poll-emails/route.ts` l.119-126
- Points d'attention : le BUG 4 (classify/route.ts) est le seul qui cause les emails Sarani dans l'inbox en reclassif manuelle. Le BUG 1 (maxTokens) est probablement responsable des emails perdus silencieusement.
