# Video AI Preview — Feature Specs

*Produced by @product-manager — 2026-03-27*
*Livrable : `docs/product/video-ai-specs.md`*

---

## Table of Contents

1. [Product Vision](#1-product-vision)
2. [User Stories](#2-user-stories)
3. [Architecture technique](#3-architecture-technique)
4. [UI/UX](#4-uiux)
5. [Roadmap — Nouvelle phase](#5-roadmap--nouvelle-phase)
6. [Risques et hypothèses](#6-risques-et-hypothèses)
7. [Hypothèses à valider](#hypothèses-à-valider)

---

## 1. Product Vision

Sarani gère pour ses clients (TikTok, Sony, GEODIS, L'Oréal...) des projets vidéo impliquant jusqu'à 1 500 clips par mois. Aujourd'hui, la validation client nécessite de produire un vrai montage avant d'obtenir un feu vert — soit 1 à 2 jours de cycle compressibles. L'agent Video Script du back-office génère déjà des scripts structurés (scènes, durées, descriptions, audio). La feature **Video AI Preview** transforme ces scripts en previews vidéo IA en quelques minutes, directement partageables avec le client pour validation.

**Problème résolu :** le client valide sur un script texte (abstrait) plutôt que sur une preview visuelle (concrète). Résultat : allers-retours post-production évitables, délais allongés, frustration côté Sophie (Head of Marketing) qui doit défendre l'approbation en interne sans matériau visuel.

**Pour qui :** l'équipe Sarani (Thomas + client managers) lors de la phase de validation créative avec le client, avant le tournage ou la production finale.

**Gain mesuré :** réduction estimée de 1 à 2 jours par cycle de validation, soit ~40% du temps de validation actuel éliminé.

**Périmètre V1 :** génération de previews par scène depuis un script existant, assemblage en vidéo complète, partage par lien sécurisé. Pas de génération de production finale — previews uniquement (watermark Sarani acceptable).

**Lien North Star :** vitesse de livraison = différenciateur #1 de Sarani. Raccourcir les cycles de validation contribue directement à la capacité à scaler sans sacrifier la qualité — chemin vers 10M€ CA à 20% EBITDA.

---

## 2. User Stories

### US-VA-01 — Générer une preview depuis un script existant

**Given** un script vidéo a été généré par l'agent Video Script (avec au moins 1 scène ayant `action`, `visualDirection` et `duration` renseignés),
**When** le client manager clique sur "Generate AI Preview" depuis la page de résultat du script,
**Then** le système envoie chaque scène à l'API vidéo IA (Kling via PiAPI), retourne une preview par scène dans l'interface back-office, et affiche le statut de génération (pending / generating / ready / failed) en temps réel par scène.

**Critères d'acceptance :**
- Le bouton "Generate AI Preview" est visible uniquement si le script contient >= 1 scène
- Chaque scène génère une vidéo indépendante (5s ou 10s selon `duration`)
- Le statut de chaque scène est visible en temps réel (polling toutes les 5s via l'API)
- Si une scène échoue, les autres continuent (pas de blocage en cascade)
- La génération est lancée en parallèle pour toutes les scènes (pas de séquençage)
- L'utilisateur peut quitter la page et retrouver les previews prêtes à son retour (stockage persistant)

**Edge cases :**
- Script avec 0 scène : bouton désactivé, message "No scenes to preview"
- API timeout (>120s par scène) : statut "Failed — API timeout", bouton "Retry this scene"
- `visualDirection` vide : warning affiché à l'utilisateur avant la génération ("Scene 3 has no visual direction — the AI will interpret the action only. Proceed?")

---

### US-VA-02 — Prévisualiser une scène individuelle

**Given** une scène a été générée avec succès (statut "ready"),
**When** le client manager clique sur la thumbnail de la scène,
**Then** un player vidéo s'ouvre en modal (ou inline), la scène se lit en boucle, et le texte du script (action, dialogue, visualDirection) reste visible en overlay ou en panneau latéral pour comparaison.

**Critères d'acceptance :**
- Lecture en boucle automatique
- Script de la scène visible en regard (action + dialogue + visualDirection)
- Bouton "Regenerate this scene" disponible depuis le player
- Bouton "Download this scene" disponible (format MP4)
- Navigation scène suivante / précédente depuis le player

---

### US-VA-03 — Re-générer une scène individuelle

**Given** une scène a été générée mais le résultat ne convient pas (visuellement ou thématiquement),
**When** le client manager clique sur "Regenerate this scene" (avec ou sans modification du prompt),
**Then** une nouvelle génération est lancée pour cette scène uniquement, la version précédente est conservée jusqu'à validation, et l'utilisateur peut comparer les deux versions avant de choisir.

**Critères d'acceptance :**
- La version précédente reste visible pendant la régénération (pas d'écrasement immédiat)
- L'utilisateur choisit explicitement "Keep new" ou "Keep previous"
- Le coût estimé de la régénération est affiché avant confirmation : "This will cost approximately $0.25 — Confirm?"
- Historique des versions par scène conservé (max 3 versions)

---

### US-VA-04 — Assembler les scènes en vidéo complète

**Given** au moins 2 scènes ont le statut "ready",
**When** le client manager clique sur "Assemble full preview",
**Then** les vidéos des scènes sont concaténées dans l'ordre du script (en utilisant FFmpeg côté serveur), une vidéo complète est générée et disponible en téléchargement et en lecture dans le back-office.

**Critères d'acceptance :**
- Les scènes sont assemblées dans l'ordre `sceneNumber` du script
- Les scènes manquantes (failed/pending) sont remplacées par un placeholder avec la description textuelle de la scène
- La vidéo assemblée porte le nom : `[client]-[script-title]-preview-v[n].mp4`
- Durée totale calculée et affichée avant assemblage
- Si une seule scène est prête, l'assemblage n'est pas disponible (message : "Need at least 2 scenes to assemble")

**Edge cases :**
- Scènes de durées hétérogènes (5s + 10s) : assemblage sans re-encoding pour minimiser la latence
- Vidéo > 5 minutes : warning affiché ("This preview will be large — consider selecting key scenes only")

---

### US-VA-05 — Partager la preview avec le client

**Given** une vidéo complète (ou une sélection de scènes) a été assemblée,
**When** le client manager clique sur "Share with client",
**Then** un lien de partage sécurisé est généré (token UUID valide 7 jours), accessible sans authentification, affichant la preview avec le script en regard, et un bouton "Approve" / "Request changes" pour le client.

**Critères d'acceptance :**
- Le lien est accessible sans compte Sarani (page publique avec token)
- La page affiche : titre du projet, nom du client, vidéo complète ou scènes, script en regard
- Watermark "Sarani Preview — Not for distribution" visible sur la vidéo
- Bouton "Approve" enregistre l'approbation avec timestamp et IP en base
- Bouton "Request changes" ouvre un champ texte libre (max 1000 chars) et notifie l'équipe Sarani par email
- Le lien expire automatiquement après 7 jours (configurable)
- Le lien peut être révoqué manuellement depuis le back-office

**Edge cases :**
- Lien expiré : page "This preview link has expired — please contact your Sarani account manager"
- Lien révoqué : même message
- Client appuie "Approve" après révocation : 404 avec message explicite

---

### US-VA-06 — Suivre le statut de validation côté équipe Sarani

**Given** un lien de partage a été envoyé au client,
**When** le client interagit avec la preview (view, approve, request changes),
**Then** le client manager voit le statut mis à jour en temps réel dans le back-office : "Sent", "Viewed", "Approved", "Changes requested", avec timestamp de chaque événement.

**Critères d'acceptance :**
- Statuts distincts : Not sent / Sent / Viewed / Approved / Changes requested
- Timestamp de chaque changement de statut
- Notification email interne à l'équipe Sarani lors d'une approbation ou d'une demande de changement
- Les demandes de changement sont listées dans le back-office avec le texte du client et la date

---

### US-VA-07 — Estimer le coût avant génération

**Given** un script avec N scènes est affiché dans le back-office,
**When** l'utilisateur survole ou clique sur "Generate AI Preview",
**Then** un récapitulatif de coût estimé est affiché avant confirmation : nombre de scènes, durée totale, coût estimé en USD.

**Critères d'acceptance :**
- Calcul : N scènes × durée (5s ou 10s) × tarif PiAPI ($0.20–$0.33/5s selon mode)
- Mode Standard (720p) vs Pro (1080p) sélectionnable avec impact coût affiché
- Confirmation requise ("Generate N scenes — estimated cost: $X.XX")
- Coût réel enregistré post-génération (pour suivi budgétaire)

---

## 3. Architecture technique

### API vidéo : PiAPI (provider Kling)

**Provider retenu :** PiAPI (`https://api.piapi.ai`) — accès à Kling 2.6 sans l'overhead du contrat enterprise Kling direct ($4,200 minimum). API REST standard, auth par `x-api-key`.

**Endpoint principal :** `POST /api/v1/task` (création de tâche) + `GET /api/v1/task/{task_id}` (polling du statut).

**Mode recommandé V1 :** Standard (720p) à $0.20/5s — qualité suffisante pour previews de validation. Pro (1080p, $0.33/5s) disponible en option utilisateur (US-VA-07).

**Payload de génération (text-to-video) :**
```json
{
  "model": "kling",
  "task_type": "video_generation",
  "input": {
    "prompt": "[action] + [visualDirection] du script",
    "negative_prompt": "blurry, watermark, text overlay",
    "duration": 5,
    "aspect_ratio": "16:9"
  }
}
```

### Stockage des vidéos générées

**Stockage V1 :** SharePoint via Microsoft Graph API (déjà intégré dans le back-office Sarani — voir `docs/product/phase3-integrations-specs.md`). Dossier : `/Sarani Back-Office/Video Previews/[clientId]/[scriptId]/`.

[HYPOTHÈSE H-01 : si SharePoint ne supporte pas les liens de partage publics temporaires, fallback vers Replit Object Storage ou un bucket S3 dédié. À valider avec Thomas avant dev.]

**Nommage :** `scene-[n]-v[version]-[timestamp].mp4` pour chaque scène, `full-preview-v[n]-[timestamp].mp4` pour l'assemblage.

**Rétention :** vidéos conservées 30 jours par défaut, purge automatique (cron quotidien), configurable par client.

### Assemblage des scènes

**Outil :** FFmpeg via subprocess Node.js (déjà disponible dans l'environnement Replit) ou `fluent-ffmpeg` (wrapper npm).

**Commande type :** `ffmpeg -f concat -safe 0 -i filelist.txt -c copy output.mp4`

**Watermark :** appliqué à l'assemblage uniquement (pas aux scènes individuelles) via `drawtext` FFmpeg.

### Estimation des coûts par projet

| Format | Scènes typiques | Coût Standard | Coût Pro |
|--------|----------------|---------------|----------|
| TikTok 15s | 3 scènes × 5s | ~$0.60 | ~$1.00 |
| TikTok 60s | 6 scènes × 10s | ~$2.40 | ~$3.96 |
| Corporate 2min | 10 scènes × 10s | ~$4.00 | ~$6.60 |
| Corporate 5min | 20 scènes × 10s | ~$8.00 | ~$13.20 |

**Coût réel avec régénérations (x1.5 moyen) :** TikTok 15s → ~$0.90, Corporate 2min → ~$6.00.

**Route API back-office à créer :**
- `POST /api/video-preview/generate` — lance la génération pour toutes les scènes d'un script
- `GET /api/video-preview/[scriptId]/status` — statut de chaque scène (polling frontend)
- `POST /api/video-preview/[sceneId]/regenerate` — relance une scène individuelle
- `POST /api/video-preview/[scriptId]/assemble` — assemble les scènes prêtes
- `POST /api/video-preview/[scriptId]/share` — génère un lien de partage public (token UUID)
- `GET /preview/[token]` — page publique accessible sans auth (route Next.js `app/preview/[token]/`)

---

## 4. UI/UX

**Placement :** la feature s'insère dans la page de résultat de l'agent Video Script (`/admin/agents/video-script/[outputId]`), en dessous de l'affichage du script généré.

**Zone dédiée "AI Preview" :** bloc collapsible "Generate AI Preview" affiché après le script. Contient :
1. Récapitulatif du coût estimé (US-VA-07) + sélecteur Standard/Pro
2. Bouton principal "Generate all scenes" (CTA Flame, désactivé si 0 scènes)
3. Grille de scènes avec : thumbnail (placeholder skeleton pendant génération), statut badge (Pending / Generating / Ready / Failed), boutons "Play", "Regenerate", "Download"

**Player de scène :** modal overlay fullscreen sur mobile, 2/3 largeur sur desktop. Panneau latéral droit : script de la scène (action + dialogue + visualDirection). Navigation scène précédente/suivante en bas.

**Assemblage :** bouton "Assemble full preview" activé dès que >= 2 scènes sont "Ready". Barre de progression pendant l'assemblage FFmpeg. Résultat dans un player distinct avec bouton "Share with client" (CTA Flame).

**Page de partage client (/preview/[token]) :** design minimal, fond noir (dark-first Sarani), logo Sarani en haut, titre du projet, player vidéo centré, script en accordéon en dessous, boutons "Approve" (vert) et "Request changes" (outline Flame) épinglés en bas de page sur mobile.

**Règle UX :** toutes les actions coûteuses (Generate, Regenerate, Assemble) demandent une confirmation avec coût estimé avant exécution.

---

## 5. Roadmap — Nouvelle phase

### État actuel de l'orchestration

| Phase | Nom | Statut |
|-------|-----|--------|
| 0–3d | Strategy, Design, Dev, Back-Office V1 & V2 | COMPLETE |
| 3e | Front-Office Polish | COMPLETE |
| 4 | QA & Pre-Launch | IN PROGRESS (~20%) |
| 5 | Launch & Post-Launch | NOT STARTED |

### Nouvelle phase proposée : 3f — Video AI Preview

**Numéro :** Phase 3f

**Nom :** Back-Office V3 — Video AI Preview

**Statut :** NOT STARTED

**Position dans le plan :** parallélisable avec Phase 4 (QA) car la Video AI Preview est une feature isolée du chemin critique site vitrine. Elle ne bloque pas le go-live. Elle peut démarrer dès que Phase 3d est complète (ce qui est le cas).

**Séquençage des dépendances :**
```
Phase 3d (Back-Office V2) — COMPLETE
    └── Phase 3f (Video AI Preview) ← peut démarrer maintenant
         ├── dépend de : agent Video Script existant (/admin/agents/video-script) — DONE
         ├── dépend de : SharePoint integration — DONE (phase3-integrations-specs.md)
         └── produit : Feature complète Video AI Preview
```

**Agents impliqués :**

| Agent | Rôle | Dépendance |
|-------|------|------------|
| @fullstack | Implémenter les 6 routes API, page `/preview/[token]`, UI back-office (grille scènes, player, modal partage), intégration PiAPI + FFmpeg assemblage | Specs present doc |
| @ia | Prompt engineering pour la conversion scene → prompt Kling (champ `action` + `visualDirection` → prompt text-to-video optimisé), choix du provider définitif (PiAPI vs Kie.ai vs Kling direct), stratégie de fallback | Specs present doc + `src/lib/ai/prompts/video-script.ts` |
| @qa | Tests E2E : génération scène, polling statut, assemblage, lien de partage (expiration, révocation), approbation client | Specs present doc + docs/qa/qa-strategy.md |
| @infrastructure | Configuration FFmpeg dans l'environnement Replit, variables d'env PiAPI key, stockage SharePoint video folder, monitoring coût IA (alerte si spend > seuil) | docs/infra/infrastructure.md |

**Parallélisable avec :** Phase 4 (QA site vitrine) et Phase 5 (Launch). Cette feature n'est pas requise pour le go-live du site vitrine — elle améliore l'efficacité opérationnelle interne.

**Estimation (nombre de sessions) :**

| Session | Contenu | Agents |
|---------|---------|--------|
| Session A | Routes API + intégration PiAPI + polling + stockage SharePoint | @fullstack + @ia |
| Session B | UI back-office (grille scènes + player + modal) + assemblage FFmpeg + page partage public | @fullstack |
| Session C | Tests E2E + edge cases (timeout, régénération, expiration lien) | @qa + @infrastructure |

**Total : 3 sessions.** Sessions A et B sont séquentielles (B dépend des routes de A). Session C est indépendante, lançable en parallèle de B.

**Go/No-Go criteria Phase 3f :**
- [ ] `POST /api/video-preview/generate` retourne un job_id et lance la génération en parallèle pour toutes les scènes
- [ ] Polling `/status` reflète l'état réel de chaque scène en < 6s de latence d'affichage
- [ ] Page `/preview/[token]` accessible sans auth, affiche script + vidéo, boutons Approve/Request changes fonctionnels
- [ ] Assemblage FFmpeg produit un MP4 valide avec watermark
- [ ] Lien expiré retourne le message correct (pas de 500)
- [ ] Coût estimé affiché avant toute génération (US-VA-07)

---

## 6. Risques et hypothèses

### R-01 — Latence de génération (Probabilité : Haute / Impact : Moyen)

**Risque :** Kling 2.6 via PiAPI prend entre 30 et 120 secondes par scène selon la charge serveur. Un script de 10 scènes peut prendre jusqu'à 20 minutes en parallèle (les appels sont simultanés mais chaque tâche a sa propre file d'attente PiAPI).

**Mitigation :** génération en arrière-plan avec polling non-bloquant (l'utilisateur peut quitter la page), notification email/in-app quand toutes les scènes sont prêtes. Afficher un ETA estimé basé sur la durée médiane PiAPI.

---

### R-02 — Qualité visuelle insuffisante pour la validation client (Probabilité : Moyenne / Impact : Élevé)

**Risque :** les previews IA text-to-video peuvent ne pas représenter fidèlement les personnages, le branding client, ou les assets visuels spécifiques (logo, produit). Le client rejette la preview car trop générique.

**Mitigation :** positionner explicitement la feature comme "concept preview" et non "production preview" — wording dans le back-office et sur la page de partage client ("AI-generated concept preview — final production will match your brand guidelines"). Ajouter une option image-to-video (I2V) dans V2 pour permettre l'upload d'un frame de référence.

---

### R-03 — Dérive des coûts IA non contrôlée (Probabilité : Moyenne / Impact : Moyen)

**Risque :** l'usage massif de régénérations (US-VA-03) ou de scripts longs peut faire exploser le budget mensuel PiAPI sans alerte.

**Mitigation :** (1) Confirmation avec coût estimé avant chaque génération (US-VA-07). (2) Dashboard coût cumulé par mois dans le back-office admin. (3) Alerte @infrastructure si dépense > seuil configurable (défaut : $50/mois). (4) Historique des coûts par client pour refacturation potentielle.

---

### R-04 — FFmpeg non disponible dans l'environnement Replit (Probabilité : Faible / Impact : Élevé)

**Risque :** l'assemblage des scènes via FFmpeg peut être bloqué par les restrictions sandbox de Replit.

**Mitigation :** [HYPOTHÈSE H-02 — à valider par @infrastructure avant dev] : FFmpeg est généralement disponible sur Replit Deployments via `apt-get install ffmpeg`. Si bloqué, alternative : utiliser `ffmpeg.wasm` (implémentation WebAssembly, plus lente mais sans dépendance système) ou déléguer l'assemblage à un service tiers (Cloudflare Workers avec ffmpeg, ou Shotstack API).

---

### R-05 — Stockage SharePoint inadapté aux fichiers vidéo volumineux (Probabilité : Moyenne / Impact : Moyen)

**Risque :** SharePoint a des limites sur les fichiers individuels (250GB max par fichier — non-bloquant) mais des quotas d'upload API et une latence plus élevée que S3 pour les binaires lourds.

**Mitigation :** [HYPOTHÈSE H-01] valider avec Thomas. Si SharePoint est trop lent, migrer vers Replit Object Storage (déjà disponible dans l'environnement) ou un bucket S3/R2 dédié. Le code de stockage doit être derrière une interface abstraite (`storage.ts`) pour faciliter ce switch sans réécriture de la feature.

---

## Hypothèses à valider

| ID | Hypothèse | Impact si fausse | Owner | Urgence | Statut |
|----|-----------|-----------------|-------|---------|--------|
| H-01 | SharePoint supporte le stockage et les liens temporaires pour les fichiers vidéo générés | Nécessite un stockage alternatif (Replit Object Storage ou S3/R2) — 1 session de refactoring | Thomas | Avant Session A | **VALIDÉE** — Thomas confirme SharePoint OK (2026-03-27) |
| H-02 | FFmpeg est installable dans l'environnement Replit Deployments | L'assemblage doit passer par ffmpeg.wasm ou une API tierce (ex : Shotstack ~$0.01/min assemblé) | @infrastructure | Avant Session B | **VALIDÉE** — Thomas confirme OK (2026-03-27) |
| H-03 | PiAPI est le provider optimal — ni Kling direct ni Kie.ai ne sont plus adaptés au volume Sarani | Changement de provider = update des routes API uniquement (impact faible si code derrière abstraction) | @ia | Avant Session A | **EN COURS** — Thomas demande le meilleur rendu qualité/fiabilité, pas nécessairement PiAPI. Recherche @ia lancée (2026-03-27) |
| H-04 | Le client (Sophie) valide réellement sur une preview IA et non sur un storyboard PDF | Si non, la feature n'apporte pas le gain de cycle attendu — valider avec 2-3 clients avant dev | Thomas | Avant Session A | **DÉCISION** — Thomas valide l'ajout d'une étape storyboard intermédiaire AVANT la vidéo. Les deux étapes coexistent : storyboard (optionnel) → vidéo. Specs storyboard en cours par @product-manager (2026-03-27) |
| H-05 | La page de partage public `/preview/[token]` sans auth est acceptable pour les clients Sarani (confidentialité des briefs) | Nécessite une auth légère (code PIN ou lien + email de vérification) sur la page publique | Thomas + @legal | Avant Session B | **VALIDÉE** — Thomas confirme page publique OK (2026-03-27) |

---

## Auto-évaluation (@product-manager)

□ Chaque user story a des critères d'acceptance testables et des edge cases — OUI (7 stories, edge cases documentés)
□ La priorisation est chiffrée — OUI (coûts par scène calculés avec source réelle PiAPI 2026)
□ Le scope V1 est complet — OUI (toutes les features retirées le sont pour des raisons de valeur/risque, pas d'effort)
□ Le plan de recherche utilisateur identifie les hypothèses critiques — OUI (H-04 : valider l'adoption client avant dev)
□ Les contraintes juridiques sont identifiées — OUI (H-05 : confidentialité page publique, watermark preview)

**Score estimé : GO conditionnel** — les 5 hypothèses doivent être validées par Thomas avant Session A pour éviter une refonte post-dev.

---

## Agents spécialisés recommandés

| Agent proposé | Type | Rôle | Justification | Priorité |
|---|---|---|---|---|
| @video-preview-tester | Testeur persona | Simule le comportement de Sophie qui reçoit un lien de preview client et interagit avec | US-VA-05 et US-VA-06 — la page `/preview/[token]` est vue par le client externe, pas par l'équipe. Un testeur générique @qa ne simulera pas les frictions d'un CMO de grand groupe | Haute |

### Specs pour @agent-factory

**@video-preview-tester**
- **Inputs :** lien `/preview/[token]` + persona Sophie (brand-platform.md) + script vidéo associé
- **Outputs :** rapport de friction UX côté client (temps de compréhension, lisibilité du script, clarté des boutons Approve/Request changes, confiance dans le watermark "preview only")
- **Critère de succès :** identifie >= 3 frictions que @qa généraliste ne détecterait pas en test E2E technique

---

**Handoff → @fullstack**

Fichiers produits :
- `/home/user/Sarani/docs/product/video-ai-specs.md`

Décisions prises :
- Provider API vidéo : PiAPI (Kling 2.6) — Standard $0.20/5s, Pro $0.33/5s — source : PiAPI.ai 2026
- Stockage : SharePoint (existant) en V1, abstraction `storage.ts` pour migration facile
- Assemblage : FFmpeg via fluent-ffmpeg (à valider avec @infrastructure — H-02)
- Page de partage : route Next.js publique `/preview/[token]`, token UUID, expiration 7 jours
- Mode : previews de validation uniquement (pas de production finale), watermark obligatoire
- Séquençage : Session A (routes API + PiAPI + stockage) → Session B (UI + assemblage + partage) → Session C (QA)

Points d'attention :
- H-01 (SharePoint vidéo) et H-02 (FFmpeg Replit) : valider avant de coder le stockage et l'assemblage
- H-05 (confidentialité page publique) : valider avec Thomas avant de rendre la route `/preview/[token]` accessible sans auth
- Toutes les actions coûteuses doivent afficher le coût estimé avant confirmation (règle UX non-négociable — US-VA-07)
- Le code de génération vidéo doit être derrière une abstraction `VideoGenerationProvider` pour faciliter le changement de provider sans réécriture
- Paralléliser les appels PiAPI (une Promise par scène, `Promise.allSettled`) — ne pas séquencer scène par scène

---

## Note critique — Prompt Engineering vidéo IA

**Décision Thomas** : le prompt envoyé à l'API vidéo est le facteur #1 de qualité. Avant toute implémentation, @product-manager et @ia DOIVENT collaborer pour produire une bibliothèque de prompts vidéo optimisés pour Kling 2.6.

Ce que le prompt doit contrôler :
- **Composition** : cadrage, rule of thirds, leading lines
- **Mouvement caméra** : pan, tilt, zoom, tracking shot, static
- **Éclairage** : natural, studio, golden hour, dramatic
- **Cohérence inter-scènes** : style uniforme, palette cohérente, transitions logiques
- **Style** : cinematic, corporate, social-native, editorial

@ia doit tester les prompts sur les 4 cas d'usage Sarani (TikTok social, corporate brand, event recap, product showcase) et itérer jusqu'à 9/10 de qualité. Le prompt library sera stocké dans `src/lib/ai/prompts/video-generation.ts`.
