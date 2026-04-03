# Pipeline Case Study -- Audit PM (Arya)

**Date** : 2026-04-03
**Agent** : @client-manager (Arya)
**Scope** : Workflow complet candidat --> publication tous canaux
**Score global** : 7.5 / 10

---

## Workflow Walkthrough

### Step 1 -- Liste candidats, je repere TikTok score 85

La page listing est claire. Tableau avec Client / Project / Type / Score / Status / Actions. Les filtres (status, client search, min score) sont bien places. Le score avec barre de progression coloree me donne une lecture instantanee. Je clique sur la ligne TikTok --> navigation vers la page detail. **Verdict : fluide, pas de friction.**

### Step 2 -- Page detail, Generate, que vois-je pendant 30-60s ?

Je vois le bouton "Generate All Outputs". Je clique. Le bouton passe en "Generating..." avec un spinner. **Mais il n'y a PAS de polling automatique sur la page detail** -- contrairement a la liste qui poll toutes les 5s quand un candidat est "generating". Le `handleGenerate` attend la reponse HTTP complete (synchrone). Si le pipeline prend 30-60s (3 appels LLM sequentiels avec retry), **je suis bloquee avec un bouton spinner sans aucun feedback de progression pendant toute la duree**.

La barre de progression "Pipeline Progress" ne s'affiche QUE si `pipelineStatus !== "idle"`, mais comme le fetch ne se met a jour qu'une fois le call termine, **je ne vois jamais la progression en temps reel**. C'est le probleme majeur de l'UX.

**P0 -- Pas de feedback de progression en temps reel.** La PM voit un spinner pendant 30-60s sans savoir si ca avance. Risque : double-clic, abandon, ou impression que ca plante.

### Step 3 -- Generation terminee, 3 outputs, comment valider ?

Apres generation, la page se recharge. Je vois les 3 onglets : Case Study / LinkedIn Post / Email. La CaseStudyPreview affiche headline, client, category, deliverable, key metric, brief, result, stats, meta description, slug. **C'est complet et lisible.** Le regeneration input en bas avec instruction est un excellent ajout -- je peux demander "Make the headline more punchy" sans relancer tout le pipeline. Le versionning (Version 1, 2...) est affiche.

Pour valider le contenu, le flow est : lire --> si OK, fermer l'onglet, passer au suivant --> une fois tout lu, "Mark as Reviewed" dans le panel gauche. **Verdict : fonctionnel mais le bouton "Mark as Reviewed" est loin des outputs** (panel gauche vs contenu a droite). Je dois scroller pour le trouver.

### Step 4 -- Visuels, selection images

Le panel "Visual Assets" se charge automatiquement depuis SharePoint quand le pipeline est complete. Les thumbnails sont affichees en grille 4 colonnes avec checkbox overlay. Je peux selectionner des visuels et un compteur "X visuals selected" apparait. **Mais les visuels selectionnes ne sont lies a rien.** Pas de bouton "Attach to case study" ou "Use as hero image". La selection est purement visuelle sans action downstream. Le lien "Browse more in SharePoint" est un bon fallback.

**P1 -- La selection de visuels n'a aucun effet concret.** Je selectionne des images mais rien ne se passe. Pas d'association aux outputs, pas d'export, pas de lien avec la page publique.

### Step 5 -- Publication site, un clic ou deux ?

Depuis l'onglet Case Study, un bouton "Publish to Website" en vert. Un seul clic. L'output passe en "published" et un lien "View on Website" apparait. **Le flow est simple : 1 clic = publie.** Un bouton "Unpublish" est aussi present.

**P1 -- Pas de confirmation avant publication.** Un clic accidentel publie directement sur le site public. Il manque un modal "Are you sure? This will be visible on sarani.studio".

**P2 -- Le slug affiche dans la preview dit `/work/{slug}` mais le lien de publication pointe aussi vers `/work/{slug}`.** Or la page publique est a `/case-studies/{slug}`. Incoherence de routing qui pourrait confondre.

### Step 6 -- LinkedIn buffer, clipboard clair ?

L'onglet LinkedIn Post affiche le post dans un format preview (hook en gras, body, proof points, hashtags en bleu). Le compteur de caracteres est visible (X / 1,300). Le bouton "Copy to LinkedIn Buffer" avec l'icone LinkedIn est explicite. Apres clic, le feedback "Copied! Paste it on LinkedIn." est clair. **Verdict : excellent UX, rien a redire.**

### Step 7 -- Email nurturing, copy et usage ?

L'onglet Email affiche subject line avec compteur de caracteres (X / 60 chars), body dans un block gris, segment suggere et CTA. Le bouton "Copy Email" copie subject + body. **Verdict : fonctionnel.** Il manque une indication de l'usage prevu (quel outil de mailing ? Mailchimp ? HubSpot ? Manuel ?).

---

## Audit FOND -- Qualite des outputs LLM

### Prompts : donnent-ils assez de contexte ?

**Creative Strategy** : Le prompt est bien calibre Sophie (frustrations, role, contexte). Il recoit les donnees projet brutes (client, type, montant, assets, score breakdown). **Probleme : les donnees sont pauvres.** On envoie un JSON avec clientName, amount, assetCount -- mais pas de description du projet, pas de brief original, pas de temoignage client, pas de timeline de livraison. Le LLM doit inventer le "story" a partir de quasi rien.

**P0 -- Le pipeline ne recoit aucune donnee narrative.** Sans description de projet, brief client, ou resultats mesurables, le LLM va halluciner ou produire du generique. Un case study "TikTok -- Video Production -- 15,000EUR -- 45 assets" ne donne pas assez pour ecrire un challenge/solution convaincant.

**Copywriter** : Bons garde-fous ("NEVER invent data", "if volume or turnaround data not available, omit"). Le prompt interdit les mots banned (affordable, cheap, game-changer). La formule headline "Problem --> Result" est enforced. **Mais il depend de l'output strategy qui est lui-meme pauvre en donnees.**

**Social** : Bien calibre (< 1,300 chars, structure hook/body/proof/hashtags). Le chainage strategy --> copy --> social est logique.

### Scoring seuil 70 : pertinent ?

Le score breakdown comprend : clientName, amount, assets, projectType, recency, diversity. C'est un score de "case-study-worthiness" purement factuel. **Le seuil 70 est raisonnable** -- il filtre les petits projets anonymes. Mais il manque un critere "richesse narrative" : un projet a 50K EUR avec un beau story vaut plus qu'un projet a 100K EUR sans contexte.

**P2 -- Le scoring ne mesure pas la qualite narrative potentielle.** Il faudrait ajouter un critere "description richness" ou "brief completeness".

---

## Audit FORME -- Interface PM

### Clarte generale

L'interface est propre, sobre, professionnelle. Les badges de statut colores sont intuitifs. Le layout 2 colonnes (score/metadata a gauche, outputs a droite) est logique. **Pour une PM non-technique, c'est navigable.** Les labels sont en anglais clair, pas de jargon technique.

### Etats d'erreur

L'error banner rouge est present sur les deux pages (listing + detail). Le message d'erreur est affiche en clair avec un bouton "Dismiss". **Mais en cas d'echec pipeline :**

- Le status revient a "suggested" et pipelineStatus passe a "failed"
- Sur la liste, un badge rouge "Pipeline" avec X apparait -- c'est visible
- Sur le detail, le PipelineProgressBar montre l'etape qui a echoue (rouge)
- **Mais il n'y a pas de message expliquant POURQUOI ca a echoue ni quoi faire.** La PM voit un X rouge sans action claire. Retry ? Contacter Thomas ? Changer quelque chose ?

**P1 -- Pas de guidance en cas d'echec pipeline.** Ajouter un message "Step X failed: [reason]. Try again or contact Thomas."

### Feedback manquant

**P2 -- Pas de toast/notification de succes apres generation.** La page se recharge silencieusement. Un toast "3 outputs generated successfully!" serait bienvenu.

**P2 -- Pas d'indication du temps d'attente estimee.** "This usually takes 30-60 seconds" rassurerait la PM.

---

## Synthese des problemes

| # | Severite | Probleme | Impact PM |
|---|----------|----------|-----------|
| 1 | **P0** | Pas de feedback progression temps reel pendant generation (30-60s spinner muet) | PM ne sait pas si ca tourne, risque double-clic ou abandon |
| 2 | **P0** | Donnees narratives absentes dans le pipeline -- le LLM recoit uniquement des metadata factuelles | Outputs generiques, non publiables sans retouche lourde |
| 3 | **P1** | Selection visuels sans action downstream (pas d'attach, pas d'export) | Feature decorative, perte de temps PM |
| 4 | **P1** | Pas de confirmation avant publication site | Risque publication accidentelle |
| 5 | **P1** | Pas de guidance en cas d'echec pipeline (juste un X rouge) | PM bloquee sans savoir quoi faire |
| 6 | **P2** | Scoring ne mesure pas la richesse narrative | Candidats scores haut mais outputs pauvres |
| 7 | **P2** | Pas de toast succes ni estimation du temps d'attente | UX incomplete |
| 8 | **P2** | Incoherence route `/work/` vs `/case-studies/` dans le preview | Confusion PM |

---

## Recommandations

1. **SSE ou polling pour la progression** -- Soit streamer les etapes via Server-Sent Events, soit poller `/candidates/{id}` toutes les 3s pendant la generation pour mettre a jour la barre de progression en temps reel.

2. **Enrichir les donnees pipeline** -- Ajouter au candidat : description projet (extrait du brief ClickUp ou de l'email client), timeline de livraison, temoignage client si dispo, metriques de performance (nombre de revisions, delai moyen). Sans ca, le case study sera toujours generique.

3. **Lier la selection visuels aux outputs** -- Quand je selectionne des visuels, ils doivent etre associes au case study (hero image, gallery) et persistes en DB pour la page publique.

4. **Modal de confirmation avant publish** -- "You are about to publish this case study on sarani.studio. It will be visible to everyone. Continue?"

5. **Message d'erreur actionnable** -- En cas d'echec, afficher le step qui a echoue + le message d'erreur + un bouton "Retry" explicite.

6. **Review humaine obligatoire** -- Le flow actuel permet de passer de "generated" a "published" sans que Thomas ou Arya ait explicitement valide le contenu. Le statut "reviewed" existe mais n'est pas bloquant pour la publication. Rendre le statut "reviewed" obligatoire avant "Publish to Website".

---

**Handoff --> @fullstack**
- Fichiers audites : listing page, detail page, generate route, pipeline-prompts, page publique
- Decisions : les P0 (progression temps reel + enrichissement donnees) doivent etre traites en priorite
- Points d'attention : la qualite des outputs LLM depend directement de la richesse des donnees en input -- c'est le bottleneck principal du pipeline
