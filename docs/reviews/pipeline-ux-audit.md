# UX Audit — Case Study Multi-Agent Pipeline
**Date** : 2026-04-03 | **Auditeur** : @ux | **Persona** : Sophie, CMO grand groupe

---

## Score global

| Parcours | Score | Verdict |
|---|---|---|
| PM back-office (listing + détail pipeline) | 7/10 | GO CONDITIONNEL — 4 frictions actionnables |
| Sophie page publique /case-studies/[slug] | 6.5/10 | GO CONDITIONNEL — 5 frictions actionnables |
| Cohérence /case-studies vs /work | 5.5/10 | NO-GO partiel — gaps structurels |

---

## Parcours PM — Back-office

### Workflow walkthrough : candidat → publié

**Étape 1** : Listing `/admin/agents/case-studies`
→ Le PM voit le tableau, clique "Run Scan" si liste vide. Résultat : banner succès + refresh auto. Clair.

**Étape 2** : Candidat "suggested" → clic "Generate" dans la colonne Actions
→ La ligne passe en statut "Generating" avec spinner. Auto-poll toutes les 5s. Clair.

**Étape 3** : Candidat "generated" → clic "Reviewed" dans la colonne Actions
→ Statut passe à "reviewed". Feedback : refresh silencieux de la ligne. **Pas de confirmation visuelle que l'action a réussi.**

**Étape 4** : Candidat "reviewed" → clic "View & Publish"
→ Redirection vers `/admin/agents/case-studies/[id]`. Le PM doit retrouver le bouton "Publish to Website" dans l'onglet Case Study. **4 clics minimum entre l'arrivée sur la page détail et la publication effective** (arrivée → onglet Case Study visible par défaut ✓ → scroll pour voir le bouton Publish → clic Publish → feedback "View on Website" apparaît).

**Nombre de clics listing → publié : 5 clics minimum.** Acceptable pour un workflow admin, mais l'étape 4 peut être réduite.

---

### Frictions PM identifiées

**[P0] Slug affiché sur la page détail pointe vers `/work/[slug]` au lieu de `/case-studies/[slug]`**
- Ligne 623 : `<p className="text-sm mt-1 font-mono text-neutral-600">/work/{cs.slug as string}</p>`
- La page publique est sur `/case-studies/[slug]`. Le PM voit `/work/[slug]` — confusion garantie quand il va vérifier la page publiée.
- **Correction** : afficher `/case-studies/{cs.slug}`. Le lien "View on Website" (ligne 631) pointe également vers `/work/${output.caseStudySlug}` — même bug.

**[P1] Pipeline Progress Bar invisible quand `pipelineStatus === "idle"`**
- Le composant `PipelineProgressBar` n'est rendu que si `pipelineStatus !== "idle"`. Avant la génération, le PM ne voit pas qu'un pipeline en 3 étapes existe. Il doit deviner que cliquer "Generate All Outputs" va déclencher 3 agents.
- **H1 FAIL** : l'état du système n'est pas visible avant action.
- **Correction** : afficher la progress bar en état "all pending" dès l'arrivée sur la page, avec les 3 étapes grisées. Rend la mécanique compréhensible avant le premier clic.

**[P1] "Copy to LinkedIn Buffer" vs "Copy Email" — ambiguïté clipboard**
- L'intitulé "Copy to LinkedIn Buffer" implique une intégration avec un outil de scheduling. En réalité c'est un simple `navigator.clipboard.writeText`. Sophie/le PM pourrait s'attendre à une publication directe.
- **H2 FAIL** : le terme "Buffer" réfère à un outil tiers (Buffer.com) — vocabulaire trompeur.
- **Correction** : renommer en "Copy text" ou "Copy to clipboard" + ajouter une note inline : "Paste directly on LinkedIn".

**[P2] Expand step output : JSON brut partiellement visible**
- Lignes 884-898 : le panel "Step X Output" affiche un `Object.entries(output).slice(0, 6)` avec `JSON.stringify(val)` pour les valeurs non-string. Les arrays et objets imbriqués apparaissent en JSON brut.
- **H8 FAIL** : bruit visuel, contenu technique visible dans un outil orienté non-développeurs.
- **Correction** : pour chaque step, afficher uniquement les champs textuels clés (strategy, angle, headline) avec rendu propre. Masquer les arrays/objets imbriqués ou les formater en liste.

---

### 5 états UX — Listing

| État | Présent | Commentaire |
|---|---|---|
| Défaut (liste chargée) | ✅ | Tableau avec badges statuts |
| Loading | ✅ | Spinner centré + texte |
| Vide (0 candidats) | ✅ | Empty state avec CTA "Run Scan" |
| Erreur | ✅ | Banner rouge dismissible |
| Succès (action) | ⚠️ | Présent pour Scan (banner vert), absent pour "Reviewed" (juste refresh silencieux) |

### 5 états UX — Page détail

| État | Présent | Commentaire |
|---|---|---|
| Défaut | ✅ | Layout 2 colonnes |
| Loading | ✅ | Spinner plein écran |
| Vide (pas d'outputs) | ✅ | Empty state dans la zone droite |
| Erreur | ✅ | Banner rouge |
| Succès (publish) | ✅ | Bouton devient "View on Website" + "Unpublish" |

---

## Parcours Sophie — Page publique `/case-studies/[slug]`

### Compréhension immédiate en 5s

Le hero propose : tags + catégorie, client en orange, headline H1, keyMetric badge, meta strip (Deliverable + Category).

**Problème** : la catégorie apparaît deux fois dans les 5 premières secondes — une fois dans les tags (ligne 161) et une fois dans le meta strip "Category" (lignes 203-208). Sophie, qui scanne rapidement, perçoit une redondance qui questionne le soin apporté au contenu.

**[P0] Duplication catégorie hero**
- Tags ligne 161 : `{cs.category}` en badge neutre
- Meta strip lignes 203-208 : label "Category" + valeur `{cs.category}`
- **Correction** : supprimer l'entrée "Category" du meta strip dans `/case-studies/[slug]`. Conserver uniquement "Deliverable" (qui n'est pas dans les tags). La catégorie est déjà visible via le badge tag.

**[P1] Meta strip incomplet vs /work**
- `/work/[slug]` affiche : Deliverable + Timeline + Volume — 3 données contextuelles chiffrées
- `/case-studies/[slug]` affiche : Deliverable + Category — sans données temporelles ni volumétriques
- Pour Sophie, la vitesse et le volume sont les preuves clés de Sarani. L'absence de Timeline/Volume dans le nouveau format pipeline affaiblit la proposition de valeur.
- **Correction** : si le schema `CaseStudyOutput` contient `turnaround` ou `volume`, les exposer. Sinon, s'assurer que le pipeline génère ces champs.

**[P1] CTA sidebar "Start a project" trop précoce**
- Le CTA primaire apparaît dans le sidebar fixe (sticky top-24) pendant toute la lecture du challenge et de la solution. Sophie est en mode conviction — elle lit, elle évalue. Un CTA commercial pendant cette phase est une friction.
- **Règle projet** : "CTAs commerciaux uniquement sur les pages ACTION ou en conclusion d'une page de conviction."
- **Correction** : retirer le Button "Start a project" du sidebar. Il est déjà présent dans la Section closing "Your brief could be next" en bas de page. Le sidebar doit rester informatif ("At a Glance" + données factuelles uniquement).

**[P1] Prev/Next navigation absente**
- `/work/[slug]` implémente `getAdjacentCaseStudies` avec navigation Prev/Next.
- `/case-studies/[slug]` n'a aucune navigation inter-case-studies. Après lecture, Sophie est dans une impasse : elle doit revenir en arrière manuellement.
- **H3 FAIL** : pas de chemin de sortie naturel vers d'autres case studies du même client/secteur.
- **Correction** : implémenter la même logique `getAdjacentCaseStudies` ou filtrer par slug de la DB. Au minimum, un lien "Back to Work" au-dessus du fold.

**[P2] Testimonial absent : trou de section potentiel**
- `cs.testimonial` est optionnel (`{cs.testimonial && ...}`). Quand absent, la page passe directement de la gallery à la closing CTA. Il n'y a pas de trou visuel (la section disparaît proprement). **Pas de problème structurel.**
- Note : la section "Results" est conditionnelle (0 stats = section absente). Si aucun stat n'est généré par le pipeline, la page perd son bloc de preuve chiffrée — impact fort sur la crédibilité.

**[P2] Gallery lightbox : ImageLightbox est un composant partagé avec /work**
- Le composant est identique entre les deux routes. Le fonctionnement lightbox est cohérent. **Pas de friction détectée ici.**
- Note : `/work/[slug]` utilise une grille explicite `grid-cols-2 md:grid-cols-3 lg:grid-cols-4` avec `ImageLightbox` wrappant chaque item. `/case-studies/[slug]` passe `galleryImages` directement à `<ImageLightbox images={galleryImages} />` avec une signature différente. Vérifier que le composant supporte les deux API (multi-images vs single).

---

## Comparaison /case-studies vs /work

| Feature | /work/[slug] | /case-studies/[slug] | Gap |
|---|---|---|---|
| Hero image | ✅ `cs.image` | ❌ Absent | Image manquante — impact visuel fort |
| Subtitle | ✅ `cs.subtitle` | ❌ Absent | — |
| Meta strip : Timeline | ✅ | ❌ | Preuve vitesse absente |
| Meta strip : Volume | ✅ | ❌ | Preuve capacité absente |
| Stats section | Toujours affichée | Conditionnelle (si stats.length > 0) | Risque section absente |
| resultsDetail | Affiché après stats | Affiché dans section Challenge/Solution | Ordre logique différent |
| Prev/Next nav | ✅ | ❌ | Navigation brisée |
| Sidebar CTA | Présent | Présent (P1 signalé) | Même problème sur /work |
| Closing CTA | Button direct | CaseStudyCta (composant contextuel) | /case-studies plus riche ici |
| Schema JSON-LD | CreativeWork | CreativeWork | Cohérent |

**Verdict** : la page `/case-studies/[slug]` est structurellement moins complète que `/work/[slug]` sur 4 dimensions critiques pour Sophie (image héro, timeline, volume, navigation). Le pipeline génère du contenu riche mais la page le présente dans un format plus pauvre que l'existant.

---

## Tests UX — Synthèse

| Test | Critère | Statut |
|---|---|---|
| Parcours PM : listing → publié sans aide | 5 clics, workflow lisible | ✅ |
| Charge cognitive listing : ≤ 3 actions par ligne | Generate + Exclude + Reviewed/View & Publish | ✅ |
| Progress bar : état système visible avant génération | Absent quand idle | ❌ |
| Edge case "Reviewed" : feedback succès | Refresh silencieux, pas de confirmation | ⚠️ |
| Sophie : compréhension 5s | Hero lisible mais catégorie dupliquée | ⚠️ |
| Sophie : conviction-first (pas de CTA commercial pendant lecture) | CTA sidebar présent pendant lecture | ❌ |
| Prev/Next navigation | Absent | ❌ |
| Slug affiché correct | `/work/` au lieu de `/case-studies/` | ❌ |

---

## Plan de corrections classé

### P0 — Bloquant avant mise en production

1. **Slug incorrect** : corriger les lignes 623 et 631 du détail page — afficher `/case-studies/{slug}` et linker vers `/case-studies/${output.caseStudySlug}`.

2. **Duplication catégorie hero** : supprimer l'entrée "Category" du meta strip de `/case-studies/[slug]` (lignes 203-208). Conserver uniquement "Deliverable".

### P1 — À corriger dans la session

3. **Pipeline Progress Bar toujours visible** : afficher les 3 steps en état "pending" même quand `pipelineStatus === "idle"`. Rend la mécanique compréhensible avant le premier clic.

4. **CTA sidebar retiré** : supprimer `<Button variant="primary" href="/contact">Start a project</Button>` du sidebar "At a Glance" dans `/case-studies/[slug]`. Le CTA closing en bas de page suffit.

5. **Prev/Next navigation** : ajouter la navigation inter-case-studies dans `/case-studies/[slug]`, en parallèle du système existant dans `/work/[slug]`. Au minimum, un lien "All Case Studies" linkant vers `/work`.

6. **"Copy to LinkedIn Buffer" → "Copy to clipboard"** : renommer le bouton + ajouter note "Paste directly on LinkedIn".

### P2 — Améliorations recommandées

7. **Step Output panel** : filtrer l'affichage sur les champs textuels clés uniquement — supprimer le `JSON.stringify` des valeurs non-string.

8. **Meta strip Timeline + Volume** : si le schema pipeline inclut ces champs, les exposer dans le hero de `/case-studies/[slug]`. Demander à @product-manager si ces champs sont générés.

9. **Image héro** : si le pipeline génère ou associe une image représentative, l'intégrer dans le hero de `/case-studies/[slug]` (cf. `/work/[slug]` lignes 149-159).

---

## Métriques HEART — Parcours PM

| Dimension | Signal | Métrique | Cible |
|---|---|---|---|
| Task success | PM complète le workflow listing → publié | Taux de complétion (= candidat published / candidat suggested) | >= 80% |
| Engagement | Utilisation de la régénération | % de case studies avec >= 1 régénération | Indicateur qualité |
| Happiness | Confiance dans le pipeline | Pas de confusion slug /work vs /case-studies | 0 bug P0 ouvert |

---

**Handoff → @fullstack**
- Fichier produit : `/home/user/Sarani/docs/reviews/pipeline-ux-audit.md`
- Corrections P0 à implémenter en priorité absolue : slug incorrect (lignes 623 + 631 de `/src/app/admin/(authenticated)/agents/case-studies/[id]/page.tsx`) + duplication catégorie (lignes 203-208 de `/src/app/case-studies/[slug]/page.tsx`)
- Corrections P1 : progress bar toujours visible, retrait CTA sidebar, Prev/Next nav, renommage bouton LinkedIn
- Points d'attention : l'API `ImageLightbox` diffère entre `/work` (single item wrapper) et `/case-studies` (multi-images prop) — vérifier la cohérence avant mise en production
