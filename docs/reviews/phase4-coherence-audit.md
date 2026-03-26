# Revue croisee — Sarani — 2026-03-26

## Resume executif (non-technique)

Les livrables Phase 2 (LinkedIn, SEO, GEO) et Phase 3 (Back-Office) sont globalement bien alignes avec la fondation strategique du projet. Le persona Sophie est present partout, le ton Assured/Direct/Warm/Evidence-first est respecte, et les livrables se referent mutuellement. Cependant, cinq incohérences meritent attention : un drift hex confirme entre les specs design et l'implementation CSS (Flame et Cerulean), une contradiction sur le modele d'authentification entre project-context.md et les specs Phase 3, des benchmarks LinkedIn dont la source et la precision doivent etre verifiees, un schema.org Organization duplique entre @seo et @geo avec des differences de format, et un risque de cannibalisation SEO/LinkedIn sur les memes proof points. Aucun de ces points n'est bloquant pour la production, mais le drift hex doit etre resolu avant go-live et le schema.org deduplique avant implementation.

## Resume technique

Score global de coherence : **7.5 / 10**. Bonne coherence strategique inter-phases. Deux contradictions techniques a resoudre (hex drift, schema.org duplications). Une contradiction de gouvernance (auth model). Recommandation : **GO avec reserves** — les 5 points ci-dessous doivent etre resolus avant implementation fullstack.

---

## Tableau par livrable

| Fichier | Phase | Score /10 | Persona Sophie | KPI North Star | Ton de marque | Cross-refs | Problemes |
|---|---|---|---|---|---|---|---|
| `docs/social/linkedin-strategy.md` | 2 | 8.5 | Oui — cible explicite, filtres titre/entreprise | Oui — lead gen 3-5/mois lie au pipeline CA | Oui — Evidence-first, Direct, pas de jargon | Oui — brand-voice.md, growth-strategy.md, personas.md | Benchmarks engagement rate a verifier (voir INC-3) |
| `docs/social/editorial-calendar.md` | 2 | 8 | Oui — hooks calibres Sophie (preuves, noms clients) | Oui — CTA "Start a project" sur posts conversion | Oui — conforme aux regles brand-voice.md | Oui — linkedin-strategy.md, brand-voice.md | Distribution pilliers legerement deviante (TL 25% vs cible 20%), mineur |
| `docs/seo/keyword-map.md` | 2 | 8 | Oui — keywords enterprise, pas SMB | Oui — keywords commerciaux maps vers pages conversion | N/A (document technique) | Oui — competitive-benchmark.md, geo coordination flaguee | Tous volumes [HYPOTHESE] — honnete et transparent |
| `docs/seo/blog-architecture.md` | 2 | 8.5 | Oui — categories orientees Sophie et Marc | Oui — chaque article = entree funnel conversion | N/A (document technique) | Oui — keyword-map.md, design-system.md, metadata-templates.md | Schema.org Article vs GEO Organization overlap (voir INC-4) |
| `docs/geo/content-restructuring.md` | 2 | 8 | Oui — structure extractible pour les requetes Sophie | Oui — visibilite LLM = acquisition organique | N/A (document technique) | Oui — geo-strategy.md, keyword-map.md, brand-story.md | Schema.org duplique avec metadata-templates.md (voir INC-4) |
| `docs/product/phase3-integrations-specs.md` | 3 | 7.5 | Indirect — back-office ne cible pas Sophie directement | Oui — efficacite operationnelle → EBITDA 20% | N/A (document interne) | Oui — auth-specs.md, product-vision.md | Contradiction auth (voir INC-2), 15+ open questions non resolues |

---

## Top 5 des incoherences detectees

### INC-1 — Drift hex Flame / Cerulean (BLOQUANT)

| Livrable A | Livrable B | Contradiction | Criticite | Resolution proposee |
|---|---|---|---|---|
| `docs/design/design-tokens.json` | `src/app/globals.css` | Flame spec: `#da5126` vs impl: `#e35019`. Cerulean spec: `#0babe8` vs impl: `#0bb3f0`. Le CSS definit aussi `--color-error: #e35019` et `--color-info: #0bb3f0` avec les hex divergents. | **BLOQUANT** | @fullstack doit aligner globals.css sur design-tokens.json. La source de verite est le design-system.md / design-tokens.json. |

**Detail de l'impact :**
- `globals.css` ligne 13 : `--color-brand-flame: #e35019;` → devrait etre `#da5126`
- `globals.css` ligne 16 : `--color-brand-cerulean: #0bb3f0;` → devrait etre `#0babe8`
- `globals.css` ligne 41 : `--color-error: #e35019;` → devrait etre `#da5126`
- `globals.css` ligne 43 : `--color-info: #0bb3f0;` → devrait etre `#0babe8`
- `src/app/global-error.tsx` ligne 22 : `bg-[#e35019]` hardcode → devrait utiliser la variable CSS ou `#da5126`
- `src/app/global-error.tsx` ligne 28 : `text-[#0bb3f0]` hardcode → devrait utiliser la variable CSS ou `#0babe8`
- Les fichiers `src/lib/export/presentation-html.ts` et `src/lib/ai/prompts/*.ts` utilisent les hex corrects (`#da5126`, `#0babe8`) — coherent avec les specs
- Le drift est donc localise dans globals.css et global-error.tsx

**Risque :** incoherence visuelle entre le site public et les exports AI/presentations. Les CTAs et etats d'erreur sur le site affichent une teinte Flame differente de celle des presentations generees par l'IA.

---

### INC-2 — Contradiction authentification back-office (MAJEUR)

| Livrable A | Livrable B | Contradiction | Criticite | Resolution proposee |
|---|---|---|---|---|
| `project-context.md` (ligne 93-94) | `docs/product/phase3-integrations-specs.md` (Section 2) + `docs/product/auth-specs.md` | project-context.md dit "Simple password pour commencer (pas d'OAuth)" et "Password unique partage pour commencer (pas de roles differencies v1)". Les specs Phase 3 imposent un systeme deux roles (`admin` / `user`) avec permissions differenciees, herite de auth-specs.md qui decrit un systeme email/mot de passe individuel. | **MAJEUR** | Mettre a jour project-context.md Section "Back-office — Decisions validees" pour refléter l'evolution vers le modele email/password + roles admin/user. Les specs Phase 3 sont l'evolution logique, mais le document de reference (project-context.md) n'a pas ete mis a jour. @product-manager ou @orchestrator doit aligner. |

**Note :** ce n'est pas une contradiction de fond — c'est une evolution non documentee. auth-specs.md explique clairement pourquoi le password unique est insuffisant. Mais project-context.md, lu par tous les agents en premier, donne encore l'ancienne decision.

---

### INC-3 — Benchmarks LinkedIn non verifies (MAJEUR)

| Livrable A | Livrable B | Contradiction | Criticite | Resolution proposee |
|---|---|---|---|---|
| `docs/social/linkedin-strategy.md` (Section 9) | Donnees externes 2026 | La strategie cite "Average B2B company engagement rate: 1.8-2.2%" sans source precise. Les benchmarks 2026 (SocialInsider, ContentIn) indiquent des chiffres tres variables : 0.5-1.5% pour le B2B organique classique, 5.20% en moyenne globale LinkedIn, 6.60% pour les carousels. Le chiffre "1.8-2.2%" n'est ni faux ni verifiable — il tombe dans une zone plausible mais non sourcee. | **MAJEUR** | @social doit ajouter les sources exactes des benchmarks cites (SocialInsider 2026, ContentIn 2026) ou ajuster les chiffres avec des references verifiables. Le 6.60% carousels est confirme. Le "1.8-2.2%" pour B2B doit etre precise (quelle taille de page ? quel type de contenu ?). |

**Regle n°2 rappel :** tout chiffre sans source explicite est presume non verifie. La strategie s'auto-declare "No invented data" mais les benchmarks Section 9 manquent de references tracables.

---

### INC-4 — Schema.org Organization duplique entre SEO et GEO (MINEUR)

| Livrable A | Livrable B | Contradiction | Criticite | Resolution proposee |
|---|---|---|---|---|
| `docs/seo/blog-architecture.md` (Section 6.3) | `docs/geo/content-restructuring.md` (Section 1) | Deux definitions Organization JSON-LD avec des differences : la version @seo a `"numberOfEmployees": "35"` (string), la version @geo a `"numberOfEmployees": 35` (number) + des champs supplementaires (`@id`, `alternateName`, `hasOfferCatalog`, `knowsAbout`, `slogan`). La version @geo est plus complete et correcte (number, pas string). | **MINEUR** | Designer une source de verite unique pour le schema.org Organization. Recommandation : adopter la version @geo (content-restructuring.md Section 1) comme reference, et supprimer la definition dans blog-architecture.md Section 6.3 en la remplacant par une reference au document GEO. @fullstack doit implementer UNE SEULE definition, pas deux. |

---

### INC-5 — Risque de cannibalisation LinkedIn / Blog sur les memes proof points (MINEUR)

| Livrable A | Livrable B | Contradiction | Criticite | Resolution proposee |
|---|---|---|---|---|
| `docs/social/editorial-calendar.md` | `docs/seo/blog-architecture.md` | Les memes proof points (TikTok 1,500 edits, Sony Black Friday, GEODIS 350 presentations) sont utilises a la fois dans le calendrier LinkedIn et dans les articles blog. Ce n'est pas une contradiction directe — c'est attendu. Mais le risque est la fatigue de contenu si Sophie voit le meme fait sur LinkedIn ET dans un article blog la meme semaine. | **MINEUR** | @social et @seo doivent coordonner le timing de publication. Recommandation : quand un article blog est publie sur un case study, le post LinkedIn de la semaine doit etre un pilier different (Thought Leadership ou Behind the Process), pas le meme proof point. Ajouter une note de coordination dans les deux livrables. |

---

## Angles morts identifies

### 1. Absence de coordination temporelle LinkedIn / Blog
Aucun livrable ne definit qui est responsable de la synchronisation entre le calendrier editorial LinkedIn et le calendrier de publication blog. Les deux fonctionnent en silo. Il manque un document ou une section "cross-channel coordination" qui definit les regles de non-collision.

**Agent recommande :** @growth ou @orchestrator pour definir les regles de coordination.

### 2. Pas de specs pour les AI agents back-office dans Phase 3
Le project-context.md mentionne 7 agents IA a creer (Project Manager, Translator, Creative Strategist, Graphic Designer, Legal, Social, SEO), mais phase3-integrations-specs.md ne couvre que les integrations ClickUp/SharePoint/Evoliz. Les specs des agents IA du back-office ne sont pas dans le scope de ce livrable. Qui les produit ?

**Agent recommande :** @product-manager (specs) + @agent-factory (implementation) + @ia (architecture).

### 3. Monitoring GEO sans baseline
content-restructuring.md definit un plan de monitoring mensuel (5 prompts LLM) mais le site n'est pas encore en ligne. Le plan de monitoring ne sera actionnable qu'apres go-live et indexation. Aucun livrable ne definit le moment exact ou le monitoring GEO demarre par rapport au go-live.

**Agent recommande :** @geo doit ajouter un declencheur ("monitoring starts W4+2 semaines post-go-live" ou equivalent).

### 4. Pas de mention du drift hex dans les livrables Phase 2/3
Le drift hex Flame/Cerulean n'est mentionne dans aucun livrable Phase 2 ou Phase 3. Il a ete detecte dans la session precedente mais n'a pas ete documente dans un ticket, une issue, ou une note de correction. Il persiste silencieusement.

**Agent recommande :** @fullstack pour correction + @design pour validation post-correction.

---

## Decisions a confirmer

1. **Schema.org Organization** : quelle version fait foi — celle de @seo (blog-architecture.md) ou celle de @geo (content-restructuring.md) ? Recommandation : @geo (plus complete).

2. **Auth back-office** : project-context.md doit-il etre mis a jour pour refleter le systeme email/password + roles, ou la decision "simple password" reste-t-elle valide pour une phase intermediaire ?

3. **Budget LinkedIn 500EUR/mois** : la strategie LinkedIn alloue 100% du budget acquisition (500EUR) a LinkedIn. Mais growth-strategy.md prevoyait-il d'autres canaux ? Confirmer que SEO organique n'a aucun budget d'acquisition dedie (100% organique).

4. **Air Corsica ROI 29.9%** : cite dans l'editorial-calendar.md Week 8. Cette donnee est-elle publiquement partageable ? L'hypothese est flaguee dans le calendrier mais pas resolue.

5. **GEODIS comparatif "80,000EUR et 3 mois"** : cite dans un post LinkedIn Week 2. Source = brand-voice.md example copy. Ce chiffre compare un concurrent non nomme. @legal a deja signale le risque de publicite comparative non documentee (legal-audit.md). Confirmer avant publication.

---

## Section Drift Hex — Detail technique

### Etat des lieux

| Token | Spec (design-tokens.json) | Implementation (globals.css) | Delta |
|---|---|---|---|
| Flame | `#da5126` | `#e35019` | Rouge plus orange, plus sature |
| Cerulean | `#0babe8` | `#0bb3f0` | Bleu legerement plus clair, plus cyan |

### Fichiers impactes

| Fichier | Hex utilise | Correcte ? |
|---|---|---|
| `docs/design/design-tokens.json` | `#da5126` / `#0babe8` | Oui (source de verite) |
| `docs/design/design-system.md` | `#da5126` / `#0babe8` | Oui |
| `src/app/globals.css` | `#e35019` / `#0bb3f0` | NON — drift |
| `src/app/global-error.tsx` | `#e35019` / `#0bb3f0` (hardcode) | NON — drift |
| `src/lib/export/presentation-html.ts` | `#da5126` / `#0babe8` | Oui |
| `src/lib/ai/prompts/presentation.ts` | `#da5126` / `#0babe8` | Oui |
| `src/lib/ai/prompts/proposal.ts` | `#da5126` / `#0babe8` | Oui |

### Resolution

1. @fullstack : modifier `src/app/globals.css` — remplacer `#e35019` par `#da5126` et `#0bb3f0` par `#0babe8` (4 occurrences)
2. @fullstack : modifier `src/app/global-error.tsx` — remplacer les hex hardcodes par les variables CSS ou les valeurs correctes
3. @design : valider visuellement apres correction que le rendu est conforme au brand board
4. @qa : ajouter un test de non-regression verifiant que les hex critiques dans globals.css correspondent a design-tokens.json

---

## Recommandation

**GO avec reserves.**

Les livrables Phase 2 et Phase 3 sont strategiquement coherents, bien alignes avec le persona Sophie, le KPI North Star, et le ton de marque. Les cross-references entre livrables sont presentes et pertinentes. Les hypotheses sont correctement marquees [HYPOTHESE]. Aucune donnee n'apparait inventee (les benchmarks LinkedIn manquent de source mais sont plausibles).

**Reserves a lever avant implementation :**
1. Corriger le drift hex (INC-1) — 30 min de travail @fullstack
2. Mettre a jour project-context.md pour l'auth (INC-2) — 10 min @product-manager
3. Ajouter les sources des benchmarks LinkedIn (INC-3) — 15 min @social
4. Dedupliquer le schema.org Organization (INC-4) — decision @orchestrator, 5 min
5. Confirmer les donnees sensibles avant publication LinkedIn (Air Corsica ROI, GEODIS comparatif)

---

*Self-evaluation checklist :*
- [x] TOUS les livrables lus (linkedin-strategy, editorial-calendar, keyword-map, blog-architecture, content-restructuring, phase3-integrations-specs, + fondation : brand-platform, brand-voice, design-system, design-tokens.json, project-context.md, auth-specs.md, geo-strategy.md)
- [x] Chaque contradiction a une resolution proposee et un agent responsable
- [x] Angles morts verifies — ce sont des manques reels, pas des hors-scope volontaires
- [x] GO avec reserves justifiable face a l'objectif 4M EUR a 6 mois
- [x] Veracite externe verifiee via WebSearch (benchmarks LinkedIn 2026)
- [x] Drift hex documente avec liste exhaustive des fichiers impactes

---

**Handoff → @orchestrator**
- Fichiers produits : `docs/reviews/phase4-coherence-audit.md`
- Decisions prises : GO avec reserves. 5 reserves a lever. Score coherence 7.5/10.
- Points d'attention :
  - INC-1 (hex drift) : @fullstack doit corriger globals.css et global-error.tsx
  - INC-2 (auth) : @product-manager doit aligner project-context.md
  - INC-3 (benchmarks) : @social doit sourcer les chiffres
  - INC-4 (schema.org) : decision @orchestrator sur la source de verite unique
  - INC-5 (cannibalisation contenu) : coordination @social + @seo
  - Angles morts : coordination cross-channel, specs agents IA back-office, baseline GEO monitoring
