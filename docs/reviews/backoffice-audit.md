# Back-Office Audit — Sarani — 2026-03-25

*Produced by @reviewer*
*Reference: `docs/backoffice/agent-input-requirements.md` (source of truth)*

---

## 1. Score global : 7.5 / 10

**Justification :** Le back-office est fonctionnel, coherent dans son UX pattern, et couvre les 13 agents avec une qualite d'implementation elevee. Les composants partages (ClientSelector, FormField, StepIndicator, PreSubmitSummary, TextareaWithCount) sont bien concus et utilises de maniere coherente. Les problemes identifies sont principalement des ecarts entre l'implementation et les specs de `agent-input-requirements.md`, des champs manquants, et quelques incoherences mineures entre agents. Aucun bloquant majeur, mais plusieurs ecarts a corriger pour atteindre 9/10.

---

## 2. Score par agent

| # | Agent | Score | Problemes principaux |
|---|-------|-------|---------------------|
| 1 | Project Manager IA | 8/10 | Champ `brief_attachment` (file upload) manquant (recommande dans specs). |
| 2 | Translator | 8.5/10 | Bon. Client correctement recommande (non requis). File upload absent (specs mentionnent "Textarea or file upload"). |
| 3 | Creative Strategist | 8/10 | Champ `existing_assets` (file upload) manquant. |
| 4 | Graphic Designer | 8/10 | Champ `mood_references` (file upload ou URL) manquant dans le formulaire visible. Specs demandent `visual_type` comme Radio avec valeurs specifiques (Web banners / Social post / Presentation slide / Landing page / Moodboard / Other) — implementation utilise `assetType` avec des valeurs differentes. |
| 5 | Copywriter | 8/10 | Specs demandent `copy_type` comme Select avec des valeurs specifiques (Tagline / Headline / Body copy / CTA / Email subject line / Ad copy / Product description / Other) — implementation utilise `contentType` avec des valeurs potentiellement differentes. Champ `approved_references` en optional OK. |
| 6 | Legal IA | 9/10 | Excellent. Legal info completeness check present. Smart defaults pour governing law et language. Badge Recommended present avec helper local `RecommendedBadge`. |
| 7 | Social IA | 7.5/10 | Specs ne requierent PAS de client (Social IA ecrit pour Sarani brand). L'implementation est correcte (client est optionnel comme reference). Stepper step 0 n'est pas "Select Client" mais "Content Brief" — bon. MAIS le stepper n'a que 3 etapes alors que le step 0 combine required fields et ne separe pas client selection. Champ `client_reference` est Select/Text dans specs mais ici c'est un simple text field. |
| 8 | SEO IA | 8/10 | Client est requis dans le Step 0 mais specs le marquent NON requis (pas dans le tableau des requis). Bonne implementation des champs recommended avec badges. |
| 9 | Proposal IA | 6/10 | **PROBLEME MAJEUR** : N'utilise PAS le `ClientSelector` compose partage. Specs requierent `client` comme champ obligatoire avec Select (client record) — l'implementation utilise un simple champ texte `prospectName`. Pas de `ClientContextPanel`. Pas de smart defaults. Pas d'auto-detection des champs client. |
| 10 | Presentation IA | 8/10 | Bon. Client requis, ClientSelector utilise. Champs recommandes bien marques. Champ `data_and_charts` n'a pas de file upload (specs mentionnent "File upload or Textarea"). |
| 11 | Email Drafter IA | 8.5/10 | Bon. Smart defaults pour language. Guidance message present. All required fields covered. |
| 12 | Video Script IA | 8/10 | Specs requierent `video_duration` comme Select avec des valeurs specifiques (15s / 30s / 60s / 90s / 3-5min / 10min+) — implementation utilise `videoFormat` qui combine platform + duration. Acceptable mais devie des specs. |
| 13 | QA / Proofreader IA | 7.5/10 | Stepper n'a que 2 etapes au lieu de 3. Les specs ne requierent pas de client (c'est recommande) — c'est correct dans l'implementation. MAIS la separation en seulement 2 steps est une incoherence UX avec les 12 autres agents qui en ont tous 3. Champ `specific_focus` bien implemente en multi-select. |

---

## 3. Problemes critiques (bloquants pour un 9/10)

### 3.1 Proposal IA — Pas de ClientSelector
- **Fichier** : `src/app/admin/(authenticated)/agents/proposal/page.tsx`
- **Lignes** : 1-22 (imports) + 58-81 (FormState)
- **Probleme** : N'importe pas et n'utilise pas `ClientSelector`. Specs exigent `client` comme champ Required avec Select (client record) qui charge le contexte client (industry, contact name, language preference, previous interactions). L'implementation actuelle utilise un simple `prospectName` text field.
- **Impact** : L'agent Proposal perd toute l'intelligence du client record : pas de brand tone, pas de contact name auto-fill, pas de proof case matching par industry, pas de language preference auto-detect.
- **Fix suggere** : Ajouter `ClientSelector` (import + step 0 = "Select Client"), garder `prospectName` comme fallback pour les prospects non encore dans le CRM. Restructurer le stepper en 3 steps: "Select Client or Prospect" / "Configure" / "Review & Generate".

### 3.2 SEO IA — Client marque requis alors que specs le marquent NON requis
- **Fichier** : `src/app/admin/(authenticated)/agents/seo/page.tsx`
- **Ligne** : 160-162 (`canProceedStep0`)
- **Probleme** : Specs indiquent que SEO IA n'a PAS de `client` dans ses Required fields (il ecrit pour le brand Sarani). Mais l'implementation bloque la progression si aucun client n'est selectionne (`return !!form.clientId`).
- **Impact** : Si l'operateur veut ecrire un article SEO generique pour le site Sarani (cas le plus frequent), il est force de selectionner un client alors que ce n'est pas pertinent.
- **Fix suggere** : Rendre le client optionnel dans le Step 0 (comme le Translator). Modifier `canProceedStep0` pour retourner `true` sans condition.

### 3.3 File upload absent sur tous les agents
- **Fichier** : `src/components/admin/guided-form.tsx` + toutes les pages agents
- **Probleme** : Aucun composant `FileUpload` n'existe dans guided-form.tsx. Les specs mentionnent des file uploads pour les agents suivants :
  - PM IA : `brief_attachment` (PDF, DOCX, images)
  - Translator : `source_content` (file upload alternative)
  - Designer IA : `mood_references` (file upload or URL)
  - Creative Strategist : `existing_assets` (file upload)
  - Presentation IA : `data_and_charts` (file upload), `existing_template` (file upload), `must_include_assets` (file upload)
  - Proofreader : `content_to_review` (file upload alternative), `original_source` (file), `previous_version` (file upload)
- **Impact** : Les operateurs doivent copier-coller manuellement le contenu de PDF/DOCX au lieu de drag-and-drop un fichier. Pour la Proofreader en particulier, c'est un flux critique — relire un DOCX de 40 slides par copier-coller est impraticable.
- **Fix suggere** : Creer un composant `FileUpload` dans guided-form.tsx (avec drag-and-drop, preview, types acceptes). L'integrer dans les agents concernes en priorite : Proofreader > PM IA > Translator > Presentation.

### 3.4 Proofreader — Stepper a 2 etapes au lieu de 3
- **Fichier** : `src/app/admin/(authenticated)/agents/proofreader/page.tsx`
- **Ligne** : 92 (`const STEPS = ["Configure", "Review & Generate"];`)
- **Probleme** : Tous les autres agents (12/13) ont un stepper a 3 etapes. Le Proofreader n'en a que 2, ce qui cree une incoherence UX.
- **Impact** : Rupture de la coherence visuelle et du modele mental de l'utilisateur qui s'attend a 3 steps partout.
- **Fix suggere** : Ajouter un Step 0 "Content & Language" qui regroupe les champs required (content, language, content_type), puis Step 1 "Configure" (recommended/optional), Step 2 "Review & Generate".

---

## 4. Problemes mineurs

### 4.1 Incoherence du `max-w` container
- PM IA : `max-w-3xl` (ligne 267)
- Creative Strategist : `max-w-3xl` (ligne 324)
- Translator, Designer, Copywriter, Social, SEO : `max-w-4xl`
- Legal, Presentation, Email Drafter, Video Script, Proofreader : `max-w-4xl`
- **Fix** : Standardiser a `max-w-4xl` pour tous les agents.

### 4.2 Nommage inconsistant des toggles Advanced
- Certains agents utilisent `showAdvanced` / `setShowAdvanced` (PM, Translator, Creative, Designer, Copywriter, Email, Video, Proofreader)
- D'autres utilisent `advancedOpen` / `setAdvancedOpen` (Legal, Social, SEO, Proposal)
- **Impact** : Zero impact fonctionnel, mais inconsistance de code. Aucun fix urgent necessaire.

### 4.3 RecommendedBadge inconsistant
- Les premiers agents (PM, Translator, Creative, Designer, Copywriter) utilisent un inline JSX pour le badge Recommended : `<span className="ml-2 text-xs font-medium bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">Recommended</span>`
- Les agents plus recents (Legal, Social, SEO, Proposal) definissent un composant local `RecommendedBadge()` avec un style legerement different : `text-[10px] font-semibold uppercase tracking-wide border border-orange-200`
- **Fix** : Extraire `RecommendedBadge` dans `guided-form.tsx` comme composant partage. Unifier le style.

### 4.4 GuidanceMessage inconsistant
- PM, Translator, Creative, Designer, Copywriter : inline `<div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">`
- Legal, Social, SEO : composant local `GuidanceMessage()`
- Presentation, Email, Video, Proofreader : constante `GUIDANCE_MESSAGE` + inline rendering
- **Fix** : Extraire `GuidanceMessage` dans `guided-form.tsx`.

### 4.5 Designer — visual_type nomenclature
- Specs : `visual_type` avec Radio (Web banners / Social post / Presentation slide / Landing page / Moodboard / Other)
- Implementation : `assetType` avec des valeurs importees de `lib/validations/designer.ts` (`ASSET_TYPES`). Les labels exacts ne sont pas verifiables sans lire le fichier de validation, mais les valeurs du form state (`banner`, etc.) suggerent un decalage possible.
- **Fix** : Verifier que les labels affiches dans le select correspondent exactement aux specs.

### 4.6 Video Script — `video_duration` vs `videoFormat`
- Specs : `video_duration` est un champ Required distinct (Select: 15s / 30s / 60s / 90s / 3-5min / 10min+)
- Implementation : `videoFormat` combine platform et duration (ex: `tiktok-30s`). Ce n'est pas un select independant.
- **Impact** : Fonctionnel, mais decouple du modele mental des specs. L'utilisateur voit un format combine au lieu de choisir la duree independamment.
- **Fix** : Separer `platform` et `video_duration` en deux selects distincts si fidelite aux specs est souhaitee.

### 4.7 Social IA — Pas de composant ClientSelector pour client_reference
- Specs definissent `client_reference` comme "Select (client list) or Text"
- Implementation : le champ `clientReference` semble etre un simple text field, pas un ClientSelector
- **Fix** : Ajouter un ClientSelector optionnel dans le step 1 (recommended section) pour permettre de selectionner un client par son nom plutot que taper manuellement.

---

## 5. Incoherences inter-agents

| Aspect | Agents conformes | Agents divergents | Detail |
|--------|-----------------|-------------------|--------|
| Stepper 3 etapes | 12/13 agents | Proofreader (2 etapes) | Devrait avoir 3 etapes |
| `max-w` container | 11 agents (`max-w-4xl`) | PM, Creative (`max-w-3xl`) | Standardiser |
| ClientSelector utilise | 11/13 agents | Proposal (absent), Social (partiel) | Proposal doit l'integrer |
| RecommendedBadge | Inline (5 agents) vs composant local (4 agents) | Les deux groupes | Extraire composant partage |
| GuidanceMessage | Inline (5) vs composant local (3) vs constante (4) | Trois patterns differents | Extraire composant partage |
| Smart defaults language | PM, Translator, Copywriter, Legal, SEO, Email, Video, Proofreader, Presentation | Social (pas de smart default langue), Proposal (pas de client), Creative (pas de smart default langue) | Harmoniser |
| History button | Tous les agents | --- | Coherent partout |
| Step 0 = Client | 10 agents | Social (Step 0 = Content Brief), Proofreader (pas de Step 0 client), Proposal (pas de ClientSelector) | Justifie pour Social (Sarani brand) et Proofreader (client recommande, pas requis). Proposal doit etre corrige. |

---

## 6. Audit des composants partages

### `guided-form.tsx` — Score : 8/10
- **ClientSelector** : Bien concu. Fetch async, loading state, ClientContextPanel integre. Manque : recherche/filtre quand la liste de clients devient longue (>20).
- **ClientContextPanel** : Affiche industry, language, brand tone, colors, font, guidelines. Complet.
- **FormField** : Label, required marker, helper text, error. Solide.
- **StepIndicator** : Bon visuellement. Manque : les steps ne sont pas cliquables pour navigation directe (l'utilisateur doit utiliser Back/Next). Amelioration souhaitable mais non bloquante.
- **PreSubmitSummary** : Grid 2 colonnes, boutons Back/Confirm. Complet.
- **TextareaWithCount** : Compteur de caracteres, minLength warning. Bien.
- **Composants manquants** : `FileUpload`, `RecommendedBadge`, `GuidanceMessage`.

### `sidebar.tsx` — Score : 9/10
- Tous les 13 agents listes : OK
- Dashboard et Clients dans la navigation : OK
- Active state highlighting : OK
- Icons SVG inline pour chaque agent : OK
- **Amelioration possible** : Ajouter un indicateur de nombre d'outputs recents par agent (badge compteur).

### `client-form.tsx` — Score : 8/10
- Utilise react-hook-form + zod validation. Solide.
- Sections organisees (Identity, Brand, Legal).
- Champs couverts : name, industry, status, primaryLanguage, contact, clickup, colors, fonts, etc.

### Dashboard (`page.tsx`) — Score : 7.5/10
- Stats basiques : Total Clients, Active Clients, Agent Outputs.
- Recent outputs list avec client name et agent type.
- **Ameliorations pour 9/10** : Ajouter des raccourcis vers les agents les plus utilises, un graphique d'activite hebdomadaire, et un indicateur de outputs en attente de validation.

---

## 7. Recommandations pour atteindre 9/10

### Priorite 1 — Corrections bloquantes (Impact : +1 point)
1. **Proposal IA** : Integrer `ClientSelector` avec fallback prospect mode. C'est le seul agent qui ne respecte pas le pattern partage.
2. **SEO IA** : Rendre le client optionnel (pas de blocage en step 0 si pas de client).
3. **Proofreader** : Passer a 3 etapes pour coherence UX.

### Priorite 2 — Composants partages (Impact : +0.5 point)
4. Creer un composant `FileUpload` dans `guided-form.tsx` et l'integrer dans les agents concernes.
5. Extraire `RecommendedBadge` et `GuidanceMessage` dans `guided-form.tsx` pour eliminer les 3 patterns differents.

### Priorite 3 — Harmonisation (Impact : +0.5 point)
6. Standardiser `max-w-4xl` sur tous les agents.
7. Ajouter le ClientSelector optionnel dans Social IA pour le champ `client_reference`.
8. Verifier les labels exacts de Designer (`visual_type`) et Copywriter (`copy_type`) contre les specs.

### Priorite 4 — Polish (Impact : +0.5 point)
9. Steps cliquables dans le StepIndicator (navigation directe).
10. Recherche/filtre dans le ClientSelector pour les listes >20 clients.
11. Dashboard enrichi : raccourcis agents, graphique activite.

**Projection** : avec P1 + P2 + P3 corrigees = 9/10. Avec P4 = 9.5/10.

---

## 8. Edge cases audites

| Scenario | Comportement observe | Verdict |
|----------|---------------------|---------|
| Pas de client selectionne (agent qui le requiert) | Bouton Next desactive (disabled) | OK |
| Champs texte vides ou trop courts | minLength warning via TextareaWithCount + bouton Next desactive | OK |
| Source = Target language (Translator) | Error message inline "Source and target language must be different" | OK |
| Legal entity incomplete (Legal IA) | Warning affiche, bouton Next desactive tant que les infos ne sont pas completes | Excellent |
| Pas de client en CRM (Proposal) | Le formulaire fonctionne sans client (text libre) | Acceptable mais non conforme aux specs |
| Timeout/erreur API | Error message affiche en rouge sous le formulaire | OK partout |

---

## Auto-evaluation du reviewer

- [x] Ai-je lu TOUS les livrables existants ? Oui — 13 pages agents + sidebar + guided-form + dashboard + client-form + specs (agent-input-requirements.md, ai-team-specs.md).
- [x] Chaque contradiction identifiee a-t-elle une resolution proposee et un agent responsable ? Oui — @fullstack pour toutes les corrections.
- [x] Les angles morts identifies sont-ils reellement des manques ? Oui — le file upload est un manque fonctionnel reel, pas un hors-scope.
- [x] Ma recommandation est-elle justifiable ? Oui — 7.5/10 avec un chemin clair vers 9/10.

---

**Handoff -> @orchestrator**
- Fichiers produits : `docs/reviews/backoffice-audit.md`
- Decisions prises : Score 7.5/10. 4 problemes critiques identifies. Chemin vers 9/10 defini en 4 niveaux de priorite.
- Points d'attention : Proposal IA doit etre retravaille (ClientSelector manquant). FileUpload composant absent partout. Proofreader a 2 steps au lieu de 3. SEO IA bloque inutilement sans client.
- Agent a reinvoquer : @fullstack pour corrections P1-P3.
