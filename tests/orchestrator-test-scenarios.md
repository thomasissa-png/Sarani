# Scénarios de test — @orchestrator

Ces scénarios valident le comportement de l'orchestrateur dans des situations critiques. Pour chaque scénario, le résultat attendu est décrit. Si le comportement réel diffère → bug à corriger dans `orchestrator.md`.

---

## Scénario 1 — Agent qui échoue (dégradation gracieuse)

**Setup** : Lancer @orchestrator sur un projet complet. Simuler un échec de @design (timeout ou livrable vide).

**Comportement attendu** :
1. L'orchestrateur détecte l'échec après le 1er Task
2. Il relance @design avec un prompt correctif (plus de contexte, instructions simplifiées)
3. Si 2ème échec → il documente dans `orchestration-plan.md` : agent, mission, erreur, impact
4. Il évalue si les agents aval (@fullstack, @copywriter) peuvent avancer sans `design-system.md`
5. Il lance les agents aval non bloqués, avec instruction "produire sans design-system, documenter les hypothèses visuelles"
6. Il signale à l'utilisateur : "@design a échoué après 2 tentatives. Options : A) fournir manuellement, B) continuer sans"

**Critère de succès** : la chaîne ne s'arrête PAS complètement. Les agents non dépendants continuent.

---

## Scénario 2 — Contradiction entre livrables

**Setup** : @creative-strategy définit un ton "expert et technique". @copywriter produit un texte "simple et ludique".

**Comportement attendu** :
1. L'orchestrateur détecte la contradiction lors du VERIFY (critère pass/fail #1 : ton aligné brand-platform → NON)
2. Il relance @copywriter avec instruction corrective : "Le ton défini par @creative-strategy est 'expert et technique' (voir brand-platform.md). Réécrire le livrable en respectant ce ton."
3. Il NE relance PAS @creative-strategy (l'agent amont a raison, c'est l'aval qui doit s'aligner)
4. Il re-vérifie le livrable corrigé avec le même critère pass/fail
5. Il documente la contradiction et sa résolution dans `orchestration-plan.md`

**Critère de succès** : la contradiction est détectée automatiquement, pas laissée à @reviewer en fin de chaîne.

---

## Scénario 3 — Drift progressif (dérive silencieuse)

**Setup** : Phase 0 définit persona = "Marie, responsable marketing PME". En Phase 2, @fullstack code pour un persona différent (dashboard technique pour développeurs).

**Comportement attendu** :
1. L'orchestrateur vérifie le critère pass/fail #7 (persona cohérent) après le livrable @fullstack
2. Il détecte que le persona dans le code ne correspond pas à celui de `project-context.md`
3. En mode autopilot → BLOQUER (garde-fou drift)
4. Il signale : "Drift détecté : @fullstack code pour un persona 'développeur' alors que le persona défini est 'Marie, responsable marketing PME'. Correction nécessaire avant de continuer."
5. Il relance @fullstack avec le bon persona

**Critère de succès** : le drift est détecté PENDANT l'exécution, pas en fin de chaîne par @reviewer.

---

## Scénario 4 — Reprise après interruption

**Setup** : L'orchestrateur a complété Phase 0 et Phase 1, puis a été interrompu (timeout). L'utilisateur relance dans une nouvelle session.

**Comportement attendu** :
1. L'orchestrateur lit `docs/orchestration-plan.md` → détecte que Phase 0 et 1 sont complétées
2. Il fait `Glob docs/**/*.md` → confirme les livrables existants (brand-platform.md, personas.md, user-flows.md, etc.)
3. Il NE relance PAS les agents de Phase 0 et 1
4. Il signale : "Reprise détectée. Phase 0 (fondations) et Phase 1 (expérience) terminées. Je reprends à Phase 2 (développement) avec @infrastructure."
5. Il reprend à Phase 2 en transmettant le contexte des livrables existants

**Critère de succès** : aucun agent n'est relancé inutilement. La reprise est transparente.

---

## Scénario 5 — Feedback remontant P0 (blocage critique)

**Setup** : @fullstack découvre qu'un flow UX est techniquement impossible (ex : drag-and-drop complexe incompatible avec la stack choisie).

**Comportement attendu** :
1. @fullstack signale via son protocole d'escalade
2. L'orchestrateur classe ce feedback en P0 (impossibilité technique = blocage critique)
3. Il BLOQUE les agents aval dépendants de ce flow (@qa ne peut pas tester ce qu'on ne peut pas coder)
4. Il relance @ux via Task avec : "Le flow [X] est techniquement impossible avec la stack [Y]. Proposer une alternative qui respecte les mêmes objectifs utilisateur."
5. @ux corrige le flow
6. L'orchestrateur vérifie la correction, puis relance @fullstack avec le flow corrigé
7. Les agents aval bloqués sont relancés

**Critère de succès** : le P0 est traité immédiatement, pas noté pour plus tard.

---

## Scénario 6 — Mode autopilot avec livrable vide

**Setup** : En mode autopilot, @seo produit un fichier `seo-strategy.md` de 10 lignes (quasi-vide).

**Comportement attendu** :
1. L'orchestrateur vérifie le livrable après le Task
2. Il détecte que le fichier fait <20 lignes → garde-fou "livrable vide" activé
3. Il BLOQUE en mode autopilot
4. Il relance @seo avec plus de contexte : mots-clés du projet, concurrents, objectifs SEO extraits de project-context.md
5. Si le 2ème livrable est toujours insuffisant → escalader à l'utilisateur

**Critère de succès** : un livrable vide ne passe jamais silencieusement en autopilot.

---

## Comment utiliser ces scénarios

1. **Test mental** : pour chaque scénario, relire `orchestrator.md` et vérifier que les règles couvrent le comportement attendu
2. **Test réel** : sur un projet test (utiliser `tests/project-context-test.md`), essayer de reproduire le scénario et observer le comportement
3. **Régression** : après toute modification de `orchestrator.md`, repasser ces 6 scénarios mentalement pour vérifier qu'aucun n'est cassé
