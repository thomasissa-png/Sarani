# Audit métier back-office Sarani — Point de vue COO d'agence créative

**Date** : 2026-03-25
**Auditeur** : @product-manager (dans la peau de Thomas + responsable ops Sarani)
**Périmètre** : 13 agents back-office, dashboard, gestion clients, navigation
**Contexte** : 15-20 projets en parallèle, 45 experts, clients : Sony, TikTok, GEODIS, Adidas, L'Oréal, Pernod Ricard, Air Corsica

---

## 1. Score global métier

**7,2 / 10**

Le back-office est solide fonctionnellement — les agents existent, ils sont bien structurés, les formulaires sont guidés, les outputs sont utilisables. Mais pour une agence qui promet le D+1 et gère 15-20 projets en parallèle, il manque trois choses fondamentales : **la vue par projet** (je ne vois pas où en sont mes 15 projets actifs), **l'ingestion rapide** (je dois quand même reconstruire l'info au lieu de juste la faire passer à un agent), et **la traçabilité client-centric** (je veux voir tout ce que j'ai produit pour Sony cette semaine, pas tricoter dans une liste d'outputs génériques).

Ce n'est pas un outil qui me fait gagner 50% de temps aujourd'hui. C'est un outil qui a le potentiel de le faire une fois trois gaps structurels comblés.

---

## 2. Évaluation par agent

<!-- AGENTS À REMPLIR -->

### 2.1 Project Manager IA

| Dimension | Évaluation |
|---|---|
| **Score** | 8/10 |
| **Ce qui me fait gagner du temps** | Le "paste the email" est la vraie killer feature. À 8h quand Sony m'envoie un email de 3 lignes, je colle l'email dans le champ Brief, je clique Analyze, et l'agent me sort une décomposition en tâches avec les agents suggérés. C'est 20-30 min de triage que je n'ai plus à faire. Le dispatch automatique vers les autres agents est l'autre valeur réelle — je ne dois pas aller configurer chaque agent un par un. La section "Missing Information" est excellente : l'agent signale ce qui manque avant que je le découvre en bout de chaîne. L'étape Review avec les checksmarks client (brand assets, glossary, ClickUp ID) évite les oublis embarrassants. |
| **Ce qui me manque** | **1. Pas de vue "projet en cours"** — une fois que j'ai dispatché les tâches, où est-ce que je vois leur statut ? Le lien "View Projects" existe mais je ne sais pas ce qu'il contient sans l'avoir testé. Si je gère 15 projets en parallèle, je dois pouvoir revenir et voir "Sony BF banners — 3/5 tâches complètes". **2. Pas d'input "budget client"** — quand je dispatche pour TikTok, le PM IA ne sait pas que ce projet est à 20$/vidéo. La complexité des tâches suggérées devrait être calibrée au budget. **3. Pas d'alerte de deadline imminente** — si j'ai dispatché vendredi pour une livraison lundi, je voudrais que le système me relance samedi si les tâches ne sont pas terminées. **4. Pas de "re-brief rapide"** — si Sony revient avec un changement scope, je ne peux pas amender un projet existant, je dois repartir from scratch avec un nouveau brief. |
| **Ce qui me ralentit** | Le workflow en 3 étapes (Select Client → Configure → Review) est justifié pour un nouveau projet, mais trop lourd pour un "brief en urgence à 23h". Un mode Express — un seul champ texte libre + client + bouton — manque. L'étape "Select Client" obligatoire en Step 0 bloque quand le client n'est pas encore créé dans le système (prospect Sony qui envoie son premier brief). |

### 2.2 Translator

| Dimension | Évaluation |
|---|---|
| **Score** | 8/10 |
| **Ce qui me fait gagner du temps** | Le glossaire client activé automatiquement à la sélection du client est le vrai différenciateur — ça évite que "Unlimited revisions" soit traduit différemment selon l'expert qui fait la trad. La détection auto de la langue source depuis le profil client est un gain de temps. Le mode "Save as validated" crée un historique de traductions approuvées par client, ce qui améliore la cohérence dans le temps. La sortie est directement utilisable : texte éditable inline + Copy + Download. Les notes du traducteur sur les choix sont utiles pour expliquer à un client pourquoi on a traduit d'une certaine façon. |
| **Ce qui me manque** | **1. Pas de traduction multi-langues en une passe** — Air Corsica a besoin d'un document en FR, EN, IT, DE. Aujourd'hui, 4 workflows séparés. Un champ "Translate to multiple languages simultaneously" serait un gain de temps énorme. **2. Pas d'import depuis l'historique** — si je veux retranscrire un document que j'ai déjà traduit partiellement le mois dernier, je dois chercher dans l'historique et copier-coller manuellement. **3. Pas de compteur de mots avec estimation de coût** — pour les contrats facturés au mot, je dois compter ailleurs. **4. La partie "contextNote" (à quoi sert ce document) est dans advanced options** — c'est pourtant une information critique pour la qualité de la traduction, elle devrait être en champ principal recommended. |
| **Ce qui me ralentit** | L'étape client optionnelle (step 0 peut être passée) est un choix UX discutable. Si je passe l'étape client, je perds le glossaire. La logique devrait être inversée : proposer la liste clients avec un bouton "Skip (no glossary)" plus visible. Le download en .txt seulement est une limitation — pour un contrat, je veux du .docx ou au moins du .md structuré, pas du texte brut. |

### 2.3 Creative Strategist

| Dimension | Évaluation |
|---|---|
| **Score** | 6/10 |
| **Ce qui me fait gagner du temps** | Le choix entre "strategic recommendation", "creative brief" et "campaign concept" est bien pensé — ça cadre l'output avant de commencer. Les champs targetMarkets permettent de travailler international sans avoir à répéter le contexte géo. Le budget range donne une contrainte réaliste à l'agent (ce qu'une agence traditionnelle ne fait jamais en phase de créa). |
| **Ce qui me manque** | **1. Cet agent est le moins opérationnel des 13 pour mon quotidien** — je l'utilise pour des pitches, pas pour des projets récurrents. Il lui manque un champ "urgence du livrable" clair : est-ce que je pitche pour demain ou pour dans 6 semaines ? **2. Pas de référence aux projets déjà livrés pour ce client** — si j'ai déjà fait 3 campagnes pour L'Oréal, l'agent devrait pouvoir capitaliser sur ce qu'on a appris. **3. Le champ "inspirationReferences" est un textarea** — je devrais pouvoir uploader des visuels de référence directement (moodboard). Un seul upload est prévu (existingAssets) mais ce n'est pas nommé comme tel dans le formulaire visible. **4. Pas de champ "client validation status"** — est-ce que L'Oréal a validé la stratégie de l'année dernière ? Ce contexte change tout le brief. **5. L'output "strategic recommendation" est vague** — quelle est la structure précise de la sortie ? Je ne sais pas ce que je vais obtenir. |
| **Ce qui me ralentit** | Le champ "targetMarkets" (multi-select avec des marchés prédéfinis) est probablement trop rigide pour nos clients — PICO opère en Asie, un marché qui n'est peut-être pas dans la liste. Les territoires devraient être librement saisissables. L'agent demande un "campaign objective" de 30 caractères minimum — pour un pitch à un prospect qu'on ne connaît pas encore bien, on n'a pas toujours cette précision. |

### 2.4 Graphic Designer

| Dimension | Évaluation |
|---|---|
| **Score** | 7/10 |
| **Ce qui me fait gagner du temps** | Le Brand Preview qui affiche les couleurs et la typo client au moment de la sélection est excellent — ça évite les aller-retours "quelle est la couleur principale de Sony ?". Les presets de dimensions sont un vrai gain : je clique "Banner 728x90" au lieu de taper les dimensions à la main. Les prompts d'image générés sont directement copiables pour Midjourney ou Dall-E. Le brief créatif structuré (objective, target audience, key message, composition notes, technical specs) est un livrable complet qui peut être envoyé à un designer humain si l'IA ne suffit pas. Les "Forbidden elements" évitent les erreurs classiques (gradient interdit par Sony, lifestyle photo interdite par GEODIS). |
| **Ce qui me manque** | **1. Un seul asset type à la fois** — Sony demande 50 bannières en 5 formats différents. Aujourd'hui, 5 workflows. Il faut un mode "batch" : multi-formats en une passe, le même brief, dimensions différentes. **2. Pas de champ "nombre de bannières"** — je peux demander 1, 3 ou 5 variants mais Sony veut 50 bannières. La notion de "volume de production" est absente. **3. L'output Designer est un brief + des prompts** — ce n'est pas les fichiers finaux. Il faut être clair avec l'équipe sur ce que cet agent produit : un brief pour un designer, pas des créas finales. Si le client ne le comprend pas, c'est une source de déception. **4. Pas de lien direct vers un outil d'image generation** — après avoir copié le prompt, je dois aller sur Midjourney. Un bouton "Open in [tool]" serait plus fluide. |
| **Ce qui me ralentit** | La sélection du style (advanced options) est enfouie alors que pour un brief Sony vs un brief Adidas, le style est fondamentalement différent — ça devrait être en champ principal. Le champ "briefDescription" (min 30 chars) oblige à écrire même quand le brief client est un simple email de 2 lignes — il faudrait accepter le brief tel quel et laisser l'agent extraire. |

### 2.5 Copywriter

| Dimension | Évaluation |
|---|---|
| **Score** | 8/10 |
| **Ce qui me fait gagner du temps** | Le champ "Existing Copy to Improve" (mode rewrite) est très précieux — quand Adidas nous envoie une tagline à améliorer, je colle et je génère. Les 10 variants en un clic pour tester différentes directions créatives en A/B est un gain réel. Le champ "Hard Constraints" (max 60 chars, trademark symbol, etc.) évite les itérations inutiles avec le client. La langue auto-remplie depuis le profil client est un petit détail qui compte quand on gère 18 langues. L'output avec headline + body + CTA + notes est complet et directement utilisable dans un email de livraison. |
| **Ce qui me manque** | **1. Pas de champ "channel character limit" par format** — un post LinkedIn, une bannière 728x90 et un SMS ont des contraintes de longueur radicalement différentes. Le champ "Placement" est là mais n'enforçe pas automatiquement une limite de caractères dans l'output. **2. Pas d'historique des copies approuvées par client** — si L'Oréal a validé un certain ton en 2025, l'agent devrait pouvoir charger ces références depuis l'historique client plutôt que de les coller à la main dans "Approved References". **3. La "Competitive Context" est en zone recommended mais jamais mentionnée dans l'output** — l'agent dit-il vraiment comment il a différencié le copy ? Je n'ai pas de trace que cette info a été utilisée. |
| **Ce qui me ralentit** | Le champ "Target Audience" est obligatoire mais quand je travaille pour Sony Electronics, l'audience est toujours la même — je la re-saisie à chaque fois. Elle devrait être stockée dans le profil client et auto-remplie. Le step 0 (Select Client) est obligatoire et bloquant — pour un test de copy rapide, c'est une friction inutile. |

### 2.6 Legal IA

| Dimension | Évaluation |
|---|---|
| **Score** | 8/10 |
| **Ce qui me fait gagner du temps** | L'auto-remplissage de l'entité légale, du numéro de TVA et du droit applicable depuis le profil client est le gain principal — c'est ce qui m'évitait d'envoyer un contrat avec le mauvais nom légal (ça arrive). Le blocage explicite "vous ne pouvez pas avancer si les infos légales du client sont incomplètes" est la bonne décision : mieux vaut être bloqué maintenant que d'envoyer un contrat invalide. Les payment terms prédéfinis (50/50, 30 net, 60 net) couvrent 90% de nos cas. Le download en .md permet l'envoi rapide par email. Le disclaimer légal visible à l'étape Review est professionnel et protège l'agence. |
| **Ce qui me manque** | **1. Export en .docx** — les juristes des clients (Sony, GEODIS, L'Oréal ont des legal teams) n'acceptent pas les .md. Un export Word est non-négociable en pratique. **2. Pas de suivi de statut du contrat** — une fois généré, est-ce que le contrat a été envoyé ? Signé ? Le module legal devrait avoir un pipeline (draft → sent → signed → archived). **3. Pas de template de relance** — si Pernod Ricard ne répond pas en 72h, je veux un bouton "Send reminder" qui génère un email de relance adapté. **4. Les "Special clauses" sont dans advanced options** — pour nos clients grands comptes, les clauses de confidentialité NDA et les clauses de propriété intellectuelle sont quasi-systématiques. Elles devraient être en champ principal avec des options prédéfinies. **5. Pas de numéro de devis auto-incrémenté** — je dois gérer ma numérotation ailleurs. |
| **Ce qui me ralentit** | Le champ "Scope of Work" est un textarea libre — pour une agence qui livre des centaines de projets similaires, des templates de scope réutilisables seraient bien plus efficaces ("50 bannières web, X formats, Y langues, Z rounds de révisions"). Le gouverning law ne propose que 6 pays — pour nos clients à Dubaï, en Asie, en Amérique latine, "Other" ne génère probablement pas un droit adapté. |

### 2.7 Social IA

| Dimension | Évaluation |
|---|---|
| **Score** | 7/10 |
| **Ce qui me fait gagner du temps** | Le panel "Sarani brand context loaded" affiché au démarrage est la bonne décision architecturale — cet agent génère du contenu pour NOUS, pas pour nos clients. Ça évite de confondre les deux. Le champ "Proof Points" pousse l'utilisateur à donner des chiffres réels, ce qui produit des posts bien meilleurs. Les formats Long / Short / Carousel sont les 3 cas d'usage réels LinkedIn. Le "Scheduled Date" lie le post à un calendrier éditorial existant. |
| **Ce qui me manque** | **1. Pas de calendrier éditorial intégré** — je génère des posts mais je ne vois nulle part "voici les posts des 4 prochaines semaines avec leurs statuts". Le champ "scheduled date" est isolé. **2. Cet agent génère du LinkedIn Sarani uniquement** — si on veut faire du social pour nos clients (poster sur le compte Instagram d'Adidas, gérer les stories Sony), il n'y a pas d'agent pour ça. La distinction "social pour Sarani" vs "social pour nos clients" n'est pas claire dans la navigation. **3. Pas d'option "repurpose from case study"** — mon meilleur contenu LinkedIn vient des projets clients livrés. Je devrais pouvoir pointer vers un output existant (une présentation GEODIS livrée) et dire "transforme ça en 3 posts LinkedIn". **4. Pas de "content approval" avant publication** — je génère, mais qui valide avant que ce soit posté ? Il manque une étape de review interne. |
| **Ce qui me ralentit** | Le client reference en step 1 est optionnel, mais sans lui le post ne peut pas mentionner de cas client (la règle "requires confirmation that the client has authorized public mention" est correcte mais invisible dans le workflow). Un statut "client approved for public mention" dans le profil client résoudrait ça. Le "Scheduled Date" sans intégration Buffer/Hootsuite/LinkedIn direct ne sert qu'à noter une date, sans aucun effet opérationnel. |

### 2.8 SEO

| Dimension | Évaluation |
|---|---|
| **Score** | 5/10 |
| **Ce qui me fait gagner du temps** | L'agent génère plusieurs types d'outputs SEO (article, meta descriptions, keyword research, blog outline) depuis la même interface — ça évite d'avoir 4 agents distincts. Le champ "Primary Keyword" avec H1 suggéré force une discipline SEO que les rédacteurs n'ont pas toujours naturellement. |
| **Ce qui me manque** | **1. Cet agent est le moins pertinent pour notre activité principale** — Sarani est une agence créative B2B. Notre croissance vient du referral et des grands comptes, pas du SEO organique. L'utilisation principale serait pour le site vitrine Sarani.studio, pas pour des projets clients. **2. Pas de données de volume de recherche** — le champ "primaryKeyword" génère du contenu autour d'un mot-clé mais sans savoir si ce mot-clé a 100 ou 100 000 recherches/mois. **3. Pas d'audit SEO de pages existantes** — je ne peux pas coller l'URL d'une page et demander un diagnostic. **4. Le champ "Competitor articles" requiert de la recherche préalable** — je dois déjà avoir trouvé les articles concurrents pour les coller. Un agent SEO qui ne peut pas faire sa propre recherche concurrentielle est limité. **5. Les "Internal Links" à suggérer requièrent que je connaisse déjà mon arborescence** — ce n'est pas logique. |
| **Ce qui me ralentit** | Cet agent est structuré comme si c'était pour une agence SEO, pas pour une agence créative. Les "SEO articles de 1500-2500 mots" ne correspondent pas aux livrables créatifs habituels (bannières, vidéos, slides). Pour l'usage réel, les 4 modes SEO (article / meta / keyword research / outline) mériteraient chacun une page distincte plutôt qu'être dans un seul formulaire avec du contenu conditionnel. |

### 2.9 Proposal

| Dimension | Évaluation |
|---|---|
| **Score** | 7/10 |
| **Ce qui me fait gagner du temps** | Le champ "Proof Case Reference" (pointer vers un client existant comme cas de référence) est la fonctionnalité la plus puissante — quand je pitche L'Oréal, je peux dire "regardez ce qu'on a fait pour Sony" avec les données réelles. Le champ "Decision Maker" me force à penser à qui lit la proposition, ce que j'oublie sous pression. Les 3 formats (PDF, slide deck, email body) correspondent à 3 contextes réels différents. Le champ "Timeline for Decision" est utile pour calibrer le niveau d'urgence dans la proposition. |
| **Ce qui me manque** | **1. Pas de bibliothèque de propositions approuvées** — si j'ai déjà envoyé une proposition gagnante à TikTok, je veux pouvoir la cloner pour le prochain pitch TikTok. **2. Le champ "Proposed Investment" est un champ texte libre** — je dois donc calculer mon prix ailleurs et le coller ici. Un calculateur basé sur les livrables demandés (X bannières à Y€ chacune) serait un vrai gain. **3. Pas de suivi du taux de conversion des propositions** — est-ce que mes propositions convertissent ? Je ne sais pas quel format fonctionne le mieux. **4. Pas d'intégration avec l'agent Legal** — une fois la proposition acceptée, je devrais pouvoir générer le contrat en 1 clic depuis la proposition. |
| **Ce qui me ralentit** | Le champ "Client Pain Point" exige 20 caractères minimum — pour un pitch où je n'ai qu'un email de 3 lignes d'un nouveau prospect, je dois deviner ou inventer le pain point. Le formulaire suppose que j'ai fait un appel de découverte, ce qui n'est pas toujours le cas. Les "services requested" (multi-select) ont des catégories qui ne correspondent peut-être pas exactement à la façon dont nos prospects formulent leurs besoins. |

### 2.10 Presentation Generator

| Dimension | Évaluation |
|---|---|
| **Score** | 8/10 |
| **Ce qui me fait gagner du temps** | C'est l'agent le plus directement aligné avec l'un de nos projets phares (350 slides GEODIS en 3 semaines). Le champ "Key Content Points" qui force à décrire l'histoire avant de définir les slides évite le syndrome "deck vide sans narrative". Le speaker notes par slide est un détail qui économise 30 min par deck. La navigation slide-par-slide dans l'output est bien pensée — je peux reviewer sans télécharger. Le download en .md permet d'envoyer directement à un designer pour mise en forme finale. L'option "Reference Slides" (upload d'un deck existant) est la fonctionnalité la plus puissante pour les clients qui ont déjà un template. |
| **Ce qui me manque** | **1. Le download .md n'est pas un vrai PowerPoint** — le livrable final pour GEODIS c'est un .pptx, pas un .md. L'agent génère la structure et le contenu, mais la mise en forme dans un vrai deck reste manuelle. Une intégration Google Slides ou export .pptx changerait tout. **2. Pas de mode "rebrand deck existant"** — le cas GEODIS (350 slides à rebrander) n'est pas couvert. Je ne peux pas uploader un deck et dire "garde la structure, applique la nouvelle charte". **3. Pas de champ "version"** — quand je génère une V2 après feedback client, il n'y a pas de gestion de versions. Je ne sais pas quelle version a été envoyée. **4. La limite "30+ slides"** est une approximation — pour GEODIS, on travaillait sur des decks de 100+ slides. |
| **Ce qui me ralentit** | Le champ "Presentation Objective" de 20 caractères minimum est trop peu exigeant — une bonne description de l'objectif fait 2-3 phrases. Inversement, le minimum de 20 chars bloque pour les petits decks internes. Les "Must-Include Assets" sont en advanced options mais pour nos clients (logo sur chaque slide, disclaimer légal) c'est quasi-systématique. |

### 2.11 Email Drafter

| Dimension | Évaluation |
|---|---|
| **Score** | 8/10 |
| **Ce qui me fait gagner du temps** | Le "Client Context Panel" qui s'affiche en step 1 (rappel du nom, langue, tone) est le meilleur pattern UX de tout le back-office — ça évite les oublis de contexte quand on jongle entre 15 projets. Le champ "Previous Email Thread" (coller le dernier message) est la fonctionnalité killer pour les relances et les réponses. La prévisualisation de l'email avec subject / greeting / body / closing / signature avant envoi réduit les erreurs. L'option "Cultural Context" (japonais = nom de famille, français corporate = vouvoiement) est un détail qui compte pour nos clients internationaux. L'email type "urgency — deadline reminders" est directement adapté à notre quotidien. |
| **Ce qui me manque** | **1. Pas de "Reply to this email"** — dans la vraie vie, je forward un email et je veux que l'agent génère une réponse en tenant compte du thread. Coller le thread dans "Previous Email Thread" est un contournement manuel. **2. Le recipient name ne se pré-remplit pas depuis le profil client** — si Sophie Martin est le contact principal de Sony, son nom devrait apparaître automatiquement. **3. Pas de "send directly"** — l'output c'est "Copy as plain text". Je dois ensuite aller dans mon email client et coller. Une intégration Gmail/Outlook changerait l'usage au quotidien. **4. Pas d'historique des emails envoyés par client** — si j'ai relancé Sony 3 fois ce mois-ci, je veux voir ces relances dans leur timeline. |
| **Ce qui me ralentit** | Le champ "What must this email accomplish?" (min 10 chars) est la bonne contrainte, mais le label est un peu abstrait pour quelqu'un pressé. "Objet de l'email en 1 phrase" serait plus clair opérationnellement. L'étape de sélection client (step 0) bloquante est cohérente mais ralentit les emails à des prospects non encore créés. |

### 2.12 Video Script IA

| Dimension | Évaluation |
|---|---|
| **Score** | 8/10 |
| **Ce qui me fait gagner du temps** | La guidance "1500+ videos per month, every script must be production-ready" est exactement le bon cadrage. Le champ Hook Direction qui met l'accent sur les 3 premières secondes est aligné avec la réalité TikTok. La structure de l'output (concept → hook → scene-by-scene avec timecodes → CTA → hashtags → music suggestion) est directement utilisable par nos monteurs sans briefing supplémentaire. Le "Series Context" est un champ rare qui devient critique quand TikTok nous commande 100 épisodes d'une même série. L'option "Reference Script" permet de matcher le style d'un script existant approuvé par le client. |
| **Ce qui me manque** | **1. Pas de mode batch** — TikTok commande 300 scripts en une semaine. Je ne peux pas générer 300 scripts un par un. Un champ "Batch size" avec un CSV d'inputs (concept, hook direction, CTA par vidéo) serait révolutionnaire pour notre cas d'usage principal. **2. Le "tone" est hardcodé à "entertaining"** dans le code (ligne `tone: "entertaining" as VideoTone`) — c'est une limitation invisible pour l'utilisateur qui se demande pourquoi le ton est toujours le même. **3. Pas de champ "target duration in seconds"** — "TikTok 30s" est un preset, mais quand la demande est "exactement 23 secondes pour un pre-roll YouTube", il n't pas de granularité suffisante. **4. Pas de budget de production associé** — un script simple text-overlay coûte 20$ à produire, un script on-camera avec décor coûte 200$. L'agent devrait estimer le coût de production du script qu'il génère. |
| **Ce qui me ralentit** | La sélection de client est bloquante en step 0 — pour les scripts internes Sarani (nos propres vidéos LinkedIn), il n'y a pas de client. Le client ne devrait pas être obligatoire pour cet agent. Le "Script format" n'est pas dans les champs required alors que pour nos monteurs la distinction "voiceover vs text overlays only" est fondamentale pour estimer le temps de montage. |

### 2.13 Proofreader

| Dimension | Évaluation |
|---|---|
| **Score** | 7/10 |
| **Ce qui me fait gagner du temps** | Les 3 niveaux de relecture (Surface / Deep / Complete) sont bien calibrés : je fais un Surface rapide avant envoi et un Complete avant livraison finale. Le score qualité (1-10 avec code couleur) est directement utilisable pour décider si le livrable est envoyable ou pas. La liste d'issues avec "original text" vs "suggested correction" est ce qu'on veut — pas un texte corrigé à partir de zéro mais une liste d'arbitrages à faire. Le "Check Brand" et "Check Glossary" activables sont utiles pour les livrables Sony où la terminologie produit est critique. |
| **Ce qui me manque** | **1. Pas de "Accept all" ou "Reject all" sur les suggestions** — si l'agent trouve 30 erreurs, je dois les valider une par une. Un workflow de validation en lot serait plus efficace. **2. Le "contentToReview" est un textarea** — pour un document Word de 50 pages, copier-coller n'est pas réaliste. L'upload direct .docx avec OCR et relecture sur le document entier est nécessaire. **3. Pas de diff visuel** — le texte original vs le texte corrigé devrait être affiché en mode "tracked changes" comme dans Word/Google Docs, pas en deux blocs séparés. **4. Pas de "relecture à chaud" depuis un autre agent** — si je génère un email avec Email Drafter, il n'y a pas de bouton "Proofread this" qui charge automatiquement l'output dans le Proofreader. |
| **Ce qui me ralentit** | Le client est en "recommended" pas "required" pour le Proofreader — c'est la bonne décision. Mais sans client, le glossary check est vide, et l'utilisateur ne sait peut-être pas qu'il passe à côté de la feature la plus utile. Un message "Add client to activate glossary check" plus visible serait utile. Le champ "Content Type" (email, banner, legal contract, etc.) impacte les règles appliquées mais n'a pas d'explication dans l'interface sur comment il change le comportement. |

---

## 3. Workflow gaps — scénarios non couverts

Ces scénarios représentent des situations réelles de la journée type qui ne trouvent pas de réponse satisfaisante dans le back-office actuel.

### Gap 1 — L'email Sony à 23h (ingestion zero-friction)

**Scénario :** Sony envoie un email à 23h "on a besoin de 50 bannières Black Friday, livraison vendredi". Je lis ça sur mon téléphone.

**Ce qui existe :** Je dois ouvrir le back-office, aller dans PM IA, sélectionner Sony dans la liste, coller l'email dans le brief, régler la deadline, etc.

**Ce qui manque :** Une entrée unique "Paste brief" depuis n'importe quelle page du back-office qui auto-détecte le client (si Sony est mentionné dans le texte), propose une deadline, et se débrouille. Ou un email forward : je forward l'email à brief@sarani.studio et le PM IA le traite.

---

### Gap 2 — La vue projet multi-client (command center)

**Scénario :** 9h30, je veux savoir où en sont mes 15 projets actifs.

**Ce qui existe :** Le dashboard montre "X outputs récents" avec un statut (done/processing/pending/error) — mais sans groupement par client ni par projet.

**Ce qui manque :** Une vue "Projects board" qui montre : Sony — 3 projets actifs, 2 en retard / TikTok — 1 projet actif, on track / GEODIS — 5 tâches, 4 terminées. Sans cette vue, je dois aller client par client pour reconstituer le statut.

---

### Gap 3 — La vue client-centric (tout ce qu'on a fait pour Sony)

**Scénario :** 11h, je prépare un meeting de review trimestriel avec Sony. Je veux montrer tout ce qu'on a livré.

**Ce qui existe :** Les clients ont une page dans /admin/clients avec des filtres. Mais je ne sais pas si cette page liste les outputs liés à chaque client.

**Ce qui manque :** Dans la fiche client, un onglet "Deliverables" qui liste tous les outputs produits pour ce client (bannières, scripts, propositions, contrats) avec date et statut. C'est aussi l'outil de preuve pour renouveler un contrat.

---

### Gap 4 — Le mode batch pour la production à volume (TikTok 300 vidéos/semaine)

**Scénario :** TikTok commande 300 scripts courts. Chaque script a un concept différent.

**Ce qui existe :** Je peux générer un script à la fois.

**Ce qui manque :** Un mode "batch input" sur les agents Video Script, Copywriter, Designer : uploader un CSV avec N lignes (concept, ton, langue, deadline par ligne) et déclencher N générations en une passe avec un rapport de résultats. Sans ça, 300 scripts = 300 workflows manuels.

---

### Gap 5 — Le handoff agent-à-agent (copywriter → proofreader → email)

**Scénario :** Je génère un copy avec Copywriter, je veux le relire avec Proofreader, puis l'envoyer avec Email Drafter.

**Ce qui existe :** 3 agents séparés, aucun lien entre eux.

**Ce qui manque :** Un bouton "Send to Proofreader" dans l'output du Copywriter, et "Use in Email" dans l'output du Proofreader. La chaîne copywriter → relecture → livraison est la plus courante dans notre quotidien et elle n'est pas connectée.

---

### Gap 6 — La génération multi-langues simultanée (Air Corsica, 18 langues)

**Scénario :** Air Corsica veut ses slides en FR, EN, DE, IT et ES.

**Ce qui existe :** Je génère la présentation en une langue, puis je vais dans Translator et traduis 4 fois.

**Ce qui manque :** Un champ "Generate in multiple languages" dans Presentation et Copywriter qui produit N versions en une passe.

---

### Gap 7 — Le contrat-à-la-signature tracking

**Scénario :** 14h, j'envoie un contrat à Pernod Ricard. Je veux savoir quand c'est signé.

**Ce qui existe :** Legal IA génère un .md que je télécharge et envoie par email.

**Ce qui manque :** Un pipeline légal avec des statuts (draft → review → sent → signed → archived) et une relance automatique si pas de réponse en 48h.

---

### Gap 8 — Le "quick refresh" post-feedback client

**Scénario :** Sony revient avec "on aime la direction mais changez le CTA et rendez le ton plus urgent".

**Ce qui existe :** Je dois repartir from scratch dans le formulaire en question.

**Ce qui manque :** Un mode "revise with feedback" qui pre-charge l'output précédent et ajoute un champ "feedback client" pour une itération rapide sans tout reconfigurer.

---

## 4. Recommandations prioritaires

Classées par **impact sur productivité quotidienne** × **faisabilité technique estimée**. Les 5 premières sont bloquantes pour un usage intensif au quotidien.

---

### R1 — Vue "Projects Board" globale [Impact : Critique]

**Problème :** Je ne sais pas où en sont mes 15 projets actifs. Le dashboard montre des stats globales mais pas un état par projet.

**Solution :** Une page /admin/projects (ou une refonte du dashboard) qui affiche pour chaque projet : client, statut global, deadline, tâches en cours / terminées / bloquées. Filtrable par client et par statut.

**Impact attendu :** Élimine 15-20 min de triage matinal. Donne une visibilité immédiate sur les retards.

---

### R2 — Mode "Quick Brief" (Express sans wizard) [Impact : Critique]

**Problème :** Le wizard 3 étapes est justifié pour les projets complexes, mais pour un brief urgent à 23h il y a trop de friction.

**Solution :** Un bouton "Quick Brief" sur le PM IA qui propose une seule page : un textarea (coller l'email du client), sélection client (avec création rapide si nouveau), deadline par défaut J+1. L'agent se débrouille avec le reste.

**Impact attendu :** Divise par 3 le temps pour initier un projet urgent. Rend le back-office utilisable sur mobile.

---

### R3 — Mode batch sur Video Script et Copywriter [Impact : Critique pour TikTok]

**Problème :** TikTok commande 300 scripts/semaine. Le workflow actuel est 1 script = 1 workflow.

**Solution :** Un onglet "Batch" sur les agents Video Script et Copywriter permettant d'uploader un CSV avec les inputs (concept, format, langue par ligne) et de déclencher la génération en masse. Output : un CSV ou ZIP avec tous les scripts.

**Impact attendu :** Transforme un travail de 3 jours en 20 minutes pour les projets à volume. Directement lié au contrat TikTok 1500+ vidéos/mois.

---

### R4 — Handoff agent-à-agent (chaîne copywriter → proofreader → livraison) [Impact : Élevé]

**Problème :** Les agents sont des silos. La chaîne copywriter → relecture → email de livraison est la plus fréquente et elle n'est pas connectée.

**Solution :** Un bouton "Send to Proofreader" dans l'output de Copywriter / Translator / Video Script, et un bouton "Use in Email Drafter" dans l'output du Proofreader. Passe le contenu d'un agent à l'autre sans copier-coller.

**Impact attendu :** Économise 5-10 min par livrable sur les projets multi-étapes. Réduit les erreurs de copier-coller entre agents.

---

### R5 — Vue client-centric "Deliverables timeline" [Impact : Élevé]

**Problème :** Je ne peux pas montrer à Sony tout ce qu'on a livré pour eux cette année.

**Solution :** Dans la fiche client (/admin/clients/[id]), un onglet "Deliverables" qui liste tous les outputs produits (agent, type, date, statut) avec un filtre par période. Permet de générer un rapport d'activité client en 1 clic.

**Impact attendu :** Support pour les reviews trimestrielles clients. Outil de fidélisation et de renouvellement de contrats.

---

### R6 — Export .docx pour Legal et Presentation [Impact : Élevé]

**Problème :** Les juristes et les managers des grands comptes n'acceptent pas les .md. Un contrat Sony envoyé en .md ne sera pas signé.

**Solution :** Ajouter un export .docx (ou .pptx pour Presentation) en plus du .md existant. Peut utiliser une librairie comme docx.js côté client.

**Impact attendu :** Rend les outputs directement utilisables sans étape de conversion manuelle. Critique pour l'agent Legal et Presentation.

---

### R7 — Multi-langues en une passe (Translator, Presentation, Copywriter) [Impact : Moyen-élevé]

**Problème :** Air Corsica veut 5 langues. Je fais 5 workflows.

**Solution :** Un champ "Target Languages" multi-select sur Translator, Presentation et Copywriter qui génère N versions en une passe. Output : un onglet par langue.

**Impact attendu :** Divise par N le temps sur les projets multi-marchés. Aligné avec la promesse "18 langues" de Sarani.

---

### R8 — Pipeline légal avec suivi de statut de signature [Impact : Moyen]

**Problème :** Le contrat est généré mais je perds sa trace une fois envoyé.

**Solution :** Un statut de contrat (draft / sent / under review / signed / archived) modifiable dans l'historique Legal. Une alerte automatique si "sent" depuis plus de 48h sans passage à "signed".

**Impact attendu :** Évite les contrats perdus. Donne une visibilité sur le pipeline commercial.

---

### R9 — Mode "Revise with Feedback" (itération rapide) [Impact : Moyen]

**Problème :** Quand un client revient avec un feedback, je dois tout reconfigurer from scratch.

**Solution :** Un bouton "Revise" sur chaque output qui pre-charge le brief précédent et ajoute un champ "Client feedback / what to change". L'agent re-génère en tenant compte du delta.

**Impact attendu :** Les iterations clients (2-3 rounds) sont la norme. Ce mode économise 10 min par round de révision.

---

### R10 — Contact principal auto-rempli depuis le profil client [Impact : Faible mais irritant]

**Problème :** Je re-saisie "Sophie Martin, Head of Brand" à chaque email pour Sony alors qu'elle est le contact principal dans leur profil.

**Solution :** Le profil client doit stocker le(s) contact(s) avec nom, titre, email. Email Drafter, Legal et Proposal les récupèrent automatiquement.

**Impact attendu :** Petit gain par transaction mais très fréquent. Réduit les erreurs de personnalisation.

---

## Hypothèses à valider

Les points suivants sont basés sur la lecture du code source des pages. Certains comportements backend ou fonctionnalités existantes non visibles dans les pages frontend n'ont pas pu être vérifiés.

- **[HYPOTHÈSE]** La page /admin/agents/pm/projects existe et affiche bien l'état des projets dispatché. Si c'est le cas, le Gap 2 est partiellement couvert — mais le dashboard principal ne pointe pas vers cette vue de façon proéminente.
- **[HYPOTHÈSE]** Les profils clients stockent déjà un champ "primaryContact" ou équivalent — à vérifier dans le schéma DB. Si absent, R10 requiert une migration du schéma.
- **[HYPOTHÈSE]** L'agent SEO est utilisé principalement pour le site vitrine Sarani.studio et non pour des livrables clients. Si l'équipe l'utilise pour des projets clients (ex: rédaction de contenu SEO pour un client), le score 5/10 devrait être réévalué.
- **[HYPOTHÈSE]** Le tone hardcodé à "entertaining" dans Video Script IA (ligne identifiée dans le code) est un bug ou une décision temporaire, pas un choix définitif. À confirmer avec l'équipe de dev.
- **[HYPOTHÈSE]** La "Save as validated" du Translator ne sauvegarde pas réellement la traduction en DB (le handler `handleSaveValidated` ne fait que `setSaved(true)` sans appel API). À vérifier — si c'est le cas, la feature de translation memory est inexistante côté data.

---

## Re-audit — 2026-03-25

### Vérification des 6 corrections annoncées

#### 1. Projects Board — `/admin/projects` avec filtres status/client/agent

**Statut : CONFIRME**

Fichier `src/app/admin/(authenticated)/projects/page.tsx` présent et complet. Trois filtres opérationnels :
- Filtre status (all / pending / processing / done / error) en boutons pill
- Filtre client (select dynamique depuis `data.clients`)
- Filtre agent (select dynamique depuis les projets chargés)

Les filtres sont passés en query params à `GET /api/admin/projects`. Vue tableau avec colonnes Client, Brief, Agents, Status, Date, Actions. Bouton "View outputs" qui pointe vers `/admin/clients/[id]/outputs`. Lien "Quick Brief" depuis l'en-tête de page.

La gap 2 de l'audit initial (command center) est couverte. L'hypothèse "[HYPOTHÈSE] La page /admin/agents/pm/projects..." est résolue — la vue n'est pas dans les agents PM mais bien à `/admin/projects`, ce qui est mieux architecturalement.

---

#### 2. Quick Brief — `/admin/quick-brief` minimal

**Statut : CONFIRME — au-delà du scope annoncé**

Fichier `src/app/admin/(authenticated)/quick-brief/page.tsx` présent. L'implémentation va plus loin que "1 client + 1 textarea + 1 bouton" : après l'analyse PM IA, le résultat est affiché inline avec les tâches suggérées (cochables), un dispatch sélectif, et un lien direct vers Projects en cas de succès. C'est la bonne décision — le Quick Brief n'est pas une saisie aveugle, c'est une saisie avec validation immédiate.

Gap 1 (email Sony à 23h) est couverte. Gap 6 de la R2 (mode express sans wizard) est close.

---

#### 3. Bug Video Script — `form.tone` dans le payload

**Statut : CONFIRME**

Ligne 176 du fichier `video-script/page.tsx` :
```
tone: form.tone,
```

Le bug signalé dans l'audit initial (`tone: "entertaining" as VideoTone` hardcodé) est corrigé. Le payload envoie bien la valeur du formulaire. L'hypothèse "[HYPOTHÈSE] Le tone hardcodé... est un bug" est confirmée et résolue. Les 8 valeurs de `VideoTone` définies dans `lib/validations/video-script` sont maintenant accessibles à l'utilisateur.

---

#### 4. Bug Translator — `saveValidated` appelle `POST /api/admin/agents/translator/validate`

**Statut : CONFIRME**

Fichier `src/app/api/admin/agents/translator/validate/route.ts` présent et complet. L'API :
- Valide le payload avec Zod (clientId, sourceLanguage, targetLanguage, sourceText, validatedTranslation)
- Fetch le client en DB via Drizzle
- Construit une entrée formatée `[YYYY-MM-DD] (src>target) "source" => "validated"`
- Append dans `client.translationMemory` et sauvegarde

L'hypothèse "[HYPOTHÈSE] La 'Save as validated' du Translator ne sauvegarde pas réellement la traduction en DB" est confirmée comme bug et résolue. La translation memory est maintenant persistée.

---

#### 5. Dashboard enrichi — `/admin`

**Statut : CONFIRME**

Fichier `src/app/admin/(authenticated)/page.tsx` présent avec :
- 4 stat cards : Total Clients, Active Clients, Total Outputs, Outputs This Week
- Section "Quick Actions" avec 4 cards agents (PM, Translator, Email Drafter, Video Script)
- Section "Recent Outputs" : 10 derniers outputs avec agent badge coloré, lien client, date relative ("2h ago", "3d ago"), status badge

Les queries sont parallélisées via `Promise.all`. La gap "dashboard avec recent outputs et quick actions" est close. Le dashboard 2.0 remplace le dashboard vide de l'audit initial.

---

#### 6. Sidebar — Quick Brief + Projects dans la navigation

**Statut : CONFIRME**

Fichier `src/components/admin/sidebar.tsx` — tableau `NAV_ITEMS` :
```
{ label: "Quick Brief", href: "/admin/quick-brief", icon: "zap" },
{ label: "Projects", href: "/admin/projects", icon: "folder" },
```

Les deux items sont présents, avec icônes dédiées (éclair pour Quick Brief, dossier pour Projects), positionnés après Dashboard et avant Clients. La navigation rend ces deux features de premier niveau accessible depuis n'importe quelle page.

---

### Score actualisé

| Critère | Avant corrections | Après corrections |
|---|---|---|
| Vue projet (Command Center) | 4/10 — absent | 8/10 — tableau avec 3 filtres |
| Ingestion rapide (Quick Brief) | 4/10 — absent | 8/10 — presente et plus riche que prévu |
| Dashboard | 5/10 — stats vides, pas d'outputs | 8/10 — recent outputs + quick actions |
| Traçabilité client-centric | 6/10 — partiellement | 7/10 — lien "View outputs" depuis Projects |
| Bugs fonctionnels (tone, saveValidated) | 4/10 — 2 bugs bloquants identifiés | 9/10 — les deux corrigés |

**Score global re-audité : 8,5 / 10**

---

### Verdict : 9/10 atteint ?

**Non — 8,5/10 est le score juste. 9/10 n'est pas atteint, mais le delta est faible et les raisons sont documentées.**

Les 6 corrections sont confirmées dans le code. Elles adressent les 3 gaps structurels les plus critiques de l'audit initial (vue projet, ingestion rapide, bugs silencieux). Le back-office est maintenant un outil utilisable au quotidien pour une agence de 35 personnes.

Les 0,5 points manquants correspondent aux gaps qui restent ouverts :

**Ce qui bloque le 9/10 :**
1. **Vue client-centric incomplète** — le lien "View outputs" depuis Projects pointe vers `/admin/clients/[id]/outputs` mais ce n'est pas la même chose qu'un onglet "Deliverables" dans la fiche client avec timeline et filtre par période (R5 de l'audit). La gap 3 est partiellement couverte, pas close.
2. **Navigation Quick Brief depuis le dashboard** — le dashboard a 4 Quick Action cards (PM, Translator, Email, Video Script) mais ne met pas en avant le Quick Brief comme point d'entrée principal pour un brief urgent. Un utilisateur pressé à 23h ira dans "Project Manager" par réflexe, pas dans "Quick Brief" dans la sidebar.
3. **Aucun gap batch ni handoff agent-à-agent** — R3 (batch TikTok) et R4 (handoff copywriter → proofreader) restent ouverts. Ces gaps ne figuraient pas dans les 6 corrections promises, donc ils ne pèsent pas sur la validation de cette vague, mais ils pèsent sur le score global.

**Pour atteindre 9/10, il manque une seule action :**
Ajouter une Quick Action card "Quick Brief" dans le dashboard, en première position, avec une description "Paste a client email" — pour court-circuiter la friction de navigation.

**Pour atteindre 10/10, la roadmap est claire :** R3 (batch), R4 (handoff inter-agents), R5 (deliverables timeline client), R6 (export .docx).

---

**Handoff → @fullstack**

- Fichiers produits : `/home/user/Sarani/docs/reviews/pm-agency-audit.md`
- Décisions prises :
  - Score re-audité : 8,5/10 (les 6 corrections sont toutes confirmées dans le code)
  - 9/10 non atteint — delta de 0,5 expliqué par 3 points résiduels documentés
  - Quick win identifié pour atteindre 9/10 : ajouter "Quick Brief" en Quick Action card sur le dashboard
- Points d'attention :
  - La vue client-centric (`/admin/clients/[id]/outputs`) existe mais n'est pas auditée dans ce re-audit — à vérifier si elle couvre réellement la gap 3 (deliverables timeline avec filtre par période)
  - Les hypothèses de l'audit initial sur `saveValidated` et le `tone` hardcodé sont confirmées comme bugs corrigés
  - Prochaine priorité de dev : R5 (onglet Deliverables dans fiche client) + Quick Brief card dashboard

---

**Handoff → @orchestrator**

- Fichiers produits : `/home/user/Sarani/docs/reviews/pm-agency-audit.md`
- Décisions prises :
  - Score global 7,2/10 — le back-office est fonctionnel mais manque de trois features structurelles pour un usage intensif en agence
  - 10 recommandations priorisées par impact métier
  - 8 workflow gaps documentés avec scénarios réels (Sony, TikTok, GEODIS, Air Corsica)
- Points d'attention critiques pour le dev :
  - **R3 (batch)** : transformation majeure des agents Video Script et Copywriter — implique une architecture queue/async pour les générations en masse
  - **R6 (export .docx/.pptx)** : à implémenter avec docx.js ou équivalent côté client, sans dépendance serveur
  - **R4 (handoff agent-à-agent)** : nécessite un mécanisme de state partagé ou de routing avec paramètres entre les pages agents
  - **Bug identifié** : `handleSaveValidated` dans Translator (`/src/app/admin/(authenticated)/agents/translator/page.tsx`) ne fait pas d'appel API — la translation memory n'est peut-être pas persistée
  - **Bug identifié** : `tone: "entertaining" as VideoTone` hardcodé dans Video Script (`/src/app/admin/(authenticated)/agents/video-script/page.tsx`) — le champ tone du formulaire n'est pas utilisé dans la requête API
