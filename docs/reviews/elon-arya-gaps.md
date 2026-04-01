# Arya — Re-score post-implémentation des 4 gaps

> AVIS CONSULTATIF — 2026-04-01 (update)
> Re-scoring après implémentation : client-profile-builder, TEAM_PROFILES + PROJECT_BENCHMARKS, daily-digest cron, deadline-alerts cron.

---

## Grille de compétences — Avant / Après

| # | Compétence | Avant | Après | Ce qui manque pour 10/10 |
|---|---|---|---|---|
| 1 | Classification email | 8/10 | 8/10 | Règle explicite pour brief récurrent dans thread existant (client connu qui renvoie un brief via reply) |
| 2 | Connaissance client | 2/10 | 6/10 | Knowledge DB vide en prod — `buildClientKnowledgePrompt` retourne "" si pas d'entrées. Injecter les 10 clients prioritaires via le knowledge scanner. |
| 3 | Brief ops | 7/10 | 8/10 | `SharePoint > {client_name}` reste générique — le sous-dossier exact est dans `sharepointCustomerFolder` du mapping, l'injecter directement dans le template brief |
| 4 | Feedback ops | 7/10 | 8/10 | Arya sait qui a travaillé sur le client, mais pas sur le projet spécifique — lier le feedback à la task ClickUp active (déjà câblé côté classify, pas côté feedback-extractor) |
| 5 | Draft reply | 7/10 | 7/10 | `clientProfile` injecté dans classifier mais le `draftReply` du prompt ne l'utilise pas — ajouter une règle "si client connu, référencer le projet précédent dans la réponse" |
| 6 | Estimation charge | 0/10 | 7/10 | 8 benchmarks réels sont là et injectés. Gap résiduel : `estimated_hours` est `optional` dans le schema — si le LLM ne le renseigne pas, Thomas ne voit rien. Le rendre `required` avec fallback "To be confirmed". |
| 7 | Assignation | 1/10 | 7/10 | `recommendTeamMembers()` fonctionne avec score skill/langue/client. Gap : ~25 membres ont `clients: []` (TODO Thomas) — la logique d'expérience client est borgne sur 70% de l'équipe. Thomas doit remplir ces champs. |
| 8 | Priorisation | 0/10 | 5/10 | Le digest trie overdue + due-today + inactive. Mais pas de comparaison inter-projets temps-réel lors de la création d'un brief ("deadline Sony demain vs brief TikTok dans 10 jours — qui passe en premier ?"). C'est un tri post-hoc, pas une priorisation active. |
| 9 | Détection d'anomalies | 2/10 | 6/10 | Deadline-alerts détecte "dans 24h pas encore en review". Manque : (a) deadline irréaliste à la création du brief ("300 fichiers demain = 3× capacité"), (b) doublon email, (c) brief incomplet sans specs critiques au-delà du flag [TO CONFIRM]. |
| 10 | Proactivité | 0/10 | 6/10 | Deux crons réels (daily-digest + deadline-alerts), dédup correct, rendu inbox propre. Gap critique : le cron n'est **pas encore déclenché** — `CRON_SECRET` doit être configuré et les crons enregistrés dans l'infrastructure Replit. Sans ça, la proactivité reste 0 en prod. |

---

## Fixes exacts pour chaque compétence < 10/10

**#1 — Classification** : dans `CLASSIFICATION_SYSTEM_PROMPT`, ajouter la règle : "If sender is a known client and email is a reply to an existing thread, prefer `project_feedback` over `new_project` unless the subject explicitly signals a new scope."

**#2 — Connaissance client** : lancer `scan-knowledge` sur les 10 clients prioritaires (Sony, TikTok, PICO, Aristocrat, Ubi, Aujan, Bose, Lamarck, CMC Markets, GEODIS) — la plomberie est là, la base est vide.

**#3 — Brief ops** : dans le template brief section "Branding", remplacer `SharePoint > {client_name} folder` par `SharePoint > ${mapping.sharepointCustomerFolder}` injecté depuis `buildClientProfileBlock`.

**#4 — Feedback ops** : dans `feedback-extractor/route.ts`, ajouter la recherche ClickUp task (même pattern que dans `classify/route.ts` ligne 138-150) et injecter `taskName` + `taskUrl` dans le prompt feedback.

**#5 — Draft reply** : dans `CLASSIFICATION_SYSTEM_PROMPT`, section draftReply : "If CLIENT PROFILE is present, reference the client relationship in the opening line (e.g., 'Following up on your [last project name]...')."

**#6 — Estimation** : dans `BriefExtractionResultSchema`, changer `estimated_hours: z.string().optional()` en `estimated_hours: z.string()` avec instruction dans le prompt "always fill estimated_hours — use 'To be confirmed — no similar reference' if unsure."

**#7 — Assignation** : Thomas remplit les champs `clients: []` pour les 25 membres marqués TODO dans `config.ts` — 1h de travail, impact immédiat sur la qualité des recommandations.

**#8 — Priorisation** : dans `brief-extractor/route.ts`, après extraction, appeler `getTasksForList` sur les espaces actifs et ajouter au prompt "CURRENT LOAD: X active projects — [top 3 by deadline]" pour que le LLM contextualise la deadline proposée.

**#9 — Anomalies** : dans `buildBriefExtractionUserMessage`, ajouter post-extraction une règle de validation : "If quantity > 100 AND deadline < 48h, add a WARNING block: 'CAPACITY ALERT — [X] files in [Y]h = [Z]× standard throughput.'"

**#10 — Proactivité** : configurer `CRON_SECRET` dans Replit Secrets + créer deux cron jobs via `instrumentation.ts` : digest à 8h00 CET, deadline-alerts toutes les 4h. Sans ce câblage, les deux routes cron ne tournent jamais.

---

## Verdict

**Score global Arya : 6.8/10** (vs 3.4/10 avant les 4 gaps)

Les 4 implémentations ont fait un bond réel sur les compétences 0 → 6-7. Le problème restant n'est pas le code — c'est la data et le câblage infra :
1. Knowledge base vide (compétence #2)
2. 25 profils équipe incomplets (#7)
3. Crons non déclenchés en prod (#10)

Arya a maintenant les muscles. Elle n'a pas encore les données ni le démarrage moteur.

---

**Handoff → Thomas (décision directe)**
- Fichier mis à jour : `docs/reviews/elon-arya-gaps.md`
- Score avant : 3.4/10 — Score après : 6.8/10
- Blocages restants : (1) lancer scan-knowledge sur 10 clients, (2) Thomas remplit les TODO clients dans config.ts, (3) câbler les crons dans Replit instrumentation.ts
- Ces recommandations sont des AVIS. Thomas décide du séquencement.
