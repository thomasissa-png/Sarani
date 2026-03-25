# Sarani Back-Office — AI Team Functional Specifications

*Produced by @product-manager — 2026-03-25*
*Language: French (internal document). Back-office UI language: English.*

---

## Table of contents

1. [Context and vision](#1-context-and-vision)
2. [Transversal architecture](#2-transversal-architecture)
   - 2.1 Client record — minimum vital
   - 2.2 Simplified data model
   - 2.3 Orchestration flow PM → agents
   - 2.4 Monthly cost estimates
3. [Agent 1 — Project Manager IA](#3-agent-1--project-manager-ia)
4. [Agent 2 — Translator](#4-agent-2--translator)
5. [Agent 3 — Creative Strategist](#5-agent-3--creative-strategist)
6. [Agent 4 — Graphic Designer IA](#6-agent-4--graphic-designer-ia)
7. [Agent 5 — Legal IA](#7-agent-5--legal-ia)
8. [Agent 6 — Social IA](#8-agent-6--social-ia)
9. [Agent 7 — SEO IA](#9-agent-7--seo-ia)
10. [Hypothèses à valider](#10-hypotheses-a-valider)

---

## 1. Context and vision

### Problème métier résolu

Thomas (fondateur) et la responsable des opérations gèrent 15-20 projets clients en parallèle : briefs qui changent, deadlines serrées, clients dans 5 fuseaux horaires, 35 experts à coordonner sur 5 continents. Sans outil centralisé, chaque tâche répétitive (traduction, contrat, brief stratégique, post LinkedIn) mobilise du temps humain senior.

**Objectif quantifié** : gagner 2h/jour minimum par utilisateur sur les tâches à faible valeur ajoutée (rédaction de contrats, premières ébauches de traduction, structuration de briefs).

### Vision back-office

Route `/admin` de l'app Next.js existante. Auth simple password partagé (v1). Les 7 agents IA forment une équipe virtuelle permanente — chaque agent a un profil métier précis, une interface dédiée, et une mémoire par client.

### Utilisateurs v1

| Utilisateur | Profil | Usage principal |
|-------------|--------|-----------------|
| Thomas | Fondateur, vision stratégique | PM IA, Creative Strategist, Social IA |
| Responsable opérations | Coordination 15-20 projets/mois | PM IA, Translator, Legal IA |
| Client managers (v2) | Suivi comptes clés | PM IA, Translator |

### Principes directeurs

- **Formulaire d'abord** : toute tâche récurrente = formulaire structuré (pas de chat libre pour les tâches définies)
- **Chat libre en complément** : pour les demandes ambiguës ou la conversation avec un agent
- **Mémoire par client** : chaque agent se souvient du contexte client (glossaire, ton, brand book, historique)
- **Output téléchargeable** : chaque livrable = fichier téléchargeable + sauvegardé en BDD + synchronisable ClickUp
- **Zero invention** : si le contexte client est insuffisant, l'agent demande — il n'invente pas

---

## 2. Transversal architecture

### 2.1 Client record — Minimum vital

Chaque client Sarani a une fiche dans le back-office. Champs obligatoires et facultatifs :

**Bloc identité (obligatoire)**

| Champ | Type | Description |
|-------|------|-------------|
| `client_name` | text | Nom commercial (ex: TikTok, Sony, GEODIS) |
| `client_id` | uuid | Identifiant unique interne |
| `industry` | select | Secteur d'activité (tech, luxe, logistics, entertainment, FMCG, aviation, other) |
| `primary_language` | select | Langue de travail principale (FR/EN/IT/ES/DE) |
| `secondary_languages` | multiselect | Langues additionnelles de livraison |
| `primary_contact_name` | text | Nom du contact client principal |
| `primary_contact_email` | email | Email du contact client |
| `clickup_project_id` | text | ID du projet ClickUp correspondant (optionnel v1) |
| `status` | select | Active / Inactive / Prospect |

**Bloc brand (optionnel mais critique pour Designer IA)**

| Champ | Type | Description |
|-------|------|-------------|
| `brand_book` | file upload | PDF/ZIP du brand book officiel |
| `primary_color` | color | Couleur principale brand (hex) |
| `secondary_colors` | text | Couleurs secondaires (hex, séparées par virgule) |
| `logo_files` | file upload | SVG/PNG du logo (fond blanc + fond noir) |
| `font_name` | text | Police principale (ex: Gotham, Helvetica Neue) |
| `brand_tone` | textarea | Description du ton de marque en 3-5 phrases |
| `brand_guidelines_notes` | textarea | Notes spécifiques issues du brand book |

**Bloc traduction (optionnel mais critique pour Translator)**

| Champ | Type | Description |
|-------|------|-------------|
| `glossary` | textarea ou file | Glossaire client : termes à ne pas traduire, préférences de traduction |
| `translation_memory` | textarea | Formulations validées passées (alimente automatiquement depuis les outputs) |
| `prohibited_terms` | textarea | Mots à éviter dans les traductions |

**Bloc juridique (optionnel mais critique pour Legal IA)**

| Champ | Type | Description |
|-------|------|-------------|
| `legal_entity_name` | text | Raison sociale exacte du client |
| `legal_country` | select | Pays de la raison sociale |
| `vat_number` | text | Numéro TVA intracommunautaire |
| `signed_framework_agreement` | boolean | Contrat-cadre signé (oui/non) |
| `framework_agreement_file` | file upload | PDF du contrat-cadre signé |
| `preferred_contract_template` | select | Template par défaut (UGC / SOW / NDA / autre) |

**Bloc historique (auto-généré)**

| Champ | Type | Description |
|-------|------|-------------|
| `agent_outputs` | relation | Liste des outputs générés par les agents pour ce client |
| `project_history` | relation | Projets passés (sync ClickUp optionnel) |
| `total_revenue` | computed | [HYPOTHÈSE : calculé depuis Evoliz si intégré] |

---

### 2.2 Simplified data model

```
Client
├── id (uuid, PK)
├── name, industry, status, primary_language, secondary_languages
├── brand_assets[] (file references)
├── glossary, translation_memory, prohibited_terms
├── legal_entity_name, vat_number, legal_country
├── clickup_project_id
└── agent_outputs[] → AgentOutput

AgentOutput
├── id (uuid, PK)
├── client_id (FK → Client)
├── agent_type (enum: pm | translator | creative | designer | legal | social | seo)
├── input_payload (jsonb) — les données du formulaire soumis
├── output_content (text/jsonb) — le livrable généré
├── output_files[] (file references) — fichiers téléchargeables
├── status (enum: pending | processing | done | error)
├── clickup_task_id (nullable) — ID de la tâche ClickUp synchronisée
├── created_at, updated_at
└── created_by (user reference)

User
├── id (uuid, PK)
├── name, email
└── role (admin | operator — v2 seulement, v1 = password unique)

ClientGlossaryEntry
├── id (uuid, PK)
├── client_id (FK)
├── source_term
├── target_term
├── language_pair (ex: "fr→en")
└── validated_at

ContractTemplate
├── id (uuid, PK)
├── name (UGC / SOW / NDA / Freelance)
├── template_file (docx)
└── variables[] — liste des variables à remplir ({{client_name}}, {{amount}}, etc.)
```

---

### 2.3 Orchestration flow — PM → agents

```
User submits brief (form or email)
         │
         ▼
┌─────────────────────┐
│  PROJECT MANAGER IA │  ← Chef d'orchestre. Seul agent capable
│  (orchestrateur)    │    d'activer les autres agents
└─────────┬───────────┘
          │
          │ Analyse le brief → identifie les sous-tâches
          │
    ┌─────┴──────────────────────────────────────────┐
    │                                                │
    ▼                                                ▼
Sous-tâche simple                          Sous-tâche complexe
(1 agent)                                  (plusieurs agents en séquence)
    │                                                │
    ▼                                                ▼
┌─────────────┐  ┌──────────────┐  ┌───────────┐  ┌──────────────┐
│ Translator  │  │  Creative    │  │ Designer  │  │  Legal IA    │
│             │  │  Strategist  │  │  IA       │  │              │
└─────────────┘  └──────────────┘  └───────────┘  └──────────────┘
┌─────────────┐  ┌──────────────┐
│  Social IA  │  │   SEO IA     │
│             │  │              │
└─────────────┘  └──────────────┘
          │
          ▼
Output sauvegardé en BDD
+ téléchargeable
+ sync ClickUp (optionnel)
          │
          ▼
PM IA agrège les outputs
+ prépare le rendu client
```

**Règle d'orchestration** : seul le PM IA peut dispatch vers d'autres agents. Les autres agents ne s'invoquent pas entre eux directement — toutes les chaînes passent par le PM IA.

---

### 2.4 Monthly cost estimates (fourchette réaliste)

Hypothèses : 20 sessions/jour, mix de tâches (traduction courte, contrat, post LinkedIn, article SEO). Les coûts ci-dessous sont des ordres de grandeur — à valider après 30 jours de prod.

| Agent | Modèle suggéré | Coût/requête estimé | Usage mensuel estimé | Coût mensuel |
|-------|----------------|---------------------|----------------------|--------------|
| PM IA | Claude Sonnet 4.5 | ~$0.008 | 200 req/mois | ~$1.6 |
| Translator | Claude Sonnet 4.5 | ~$0.012 (10K tokens) | 400 req/mois | ~$4.8 |
| Creative Strategist | Claude Opus 4 | ~$0.08 | 60 req/mois | ~$4.8 |
| Designer IA | GPT-Image-1 / Ideogram | ~$0.04/image | 100 images/mois | ~$4 |
| Legal IA | Claude Sonnet 4.5 | ~$0.015 | 50 req/mois | ~$0.75 |
| Social IA | Claude Sonnet 4.5 | ~$0.006 | 120 req/mois | ~$0.72 |
| SEO IA | Claude Sonnet 4.5 | ~$0.02 (article long) | 30 req/mois | ~$0.6 |
| **Total** | — | — | — | **~$17/mois** |

[HYPOTHÈSE : ces estimations supposent un usage modéré (usage daily par 2 utilisateurs). Si 35 experts utilisent le back-office quotidiennement, multiplier par ~5-10. Budget reste raisonnable vs valeur produite.]

---

## 3. Agent 1 — Project Manager IA

### 3.1 Persona utilisateur

**Qui l'utilise** : Thomas (fondateur) et la responsable des opérations.

**Quand** : Au début de chaque nouveau projet client, quand un brief arrive (email, appel, document), et quand il faut coordonner plusieurs livrables en parallèle.

**Pourquoi** : Un brief client arrivant par email (3 paragraphes en anglais, parfois flou) doit être transformé en un plan d'action structuré avec les bons agents activés dans le bon ordre. Sans le PM IA, cette structuration prend 30-45 min de temps mental senior. Avec le PM IA, l'output est prêt en 5 minutes.

**Douleur quotidienne résolue** : "Je reçois un email de Sony qui dit 'on a besoin de 50 bannières pour le Black Friday, livraison vendredi'. Je dois comprendre ce qu'il faut faire, savoir si on a le brand book Sony à jour, briefer le designer, préparer le devis, envoyer la confirmation. Le PM IA fait tout ça dès que je colle l'email."

---

### 3.2 User stories

**US-PM-01 — Décomposition de brief**
```
Given : l'opérateur colle un brief client (texte libre ou email)
  And : le client est sélectionné dans la fiche client
When : il soumet le formulaire "New brief"
Then : le PM IA analyse le brief
  And : produit une décomposition structurée (tâches identifiées, agents suggérés, priorité, délai estimé)
  And : l'opérateur valide ou modifie avant dispatch
  And : le PM IA peut dispatcher automatiquement aux agents sélectionnés
```

**US-PM-02 — Dispatch multi-agents**
```
Given : une décomposition de brief validée par l'opérateur
  And : au moins un agent sélectionné pour dispatch
When : l'opérateur confirme le dispatch
Then : le PM IA envoie les sous-briefs structurés aux agents concernés
  And : chaque agent reçoit le contexte client (fiche client automatiquement jointe)
  And : le statut des sous-tâches est visible dans un tracker temps réel
```

**US-PM-03 — Synthèse client pour rendu**
```
Given : les outputs de plusieurs agents sont disponibles pour un même projet
When : l'opérateur demande "Prepare client delivery"
Then : le PM IA compile les outputs en un document de rendu cohérent (English)
  And : le document suit le ton Sarani (Assured, Direct, Warm — brand-voice.md)
  And : le document est téléchargeable en PDF ou .docx
```

**US-PM-04 — Suivi de projet ClickUp**
```
Given : un projet est lié à un ID ClickUp dans la fiche client
When : un brief est créé et des tâches sont dispatchées
Then : le PM IA crée les tâches correspondantes dans ClickUp via API
  And : le statut Sarani BDD est synchronisé avec ClickUp
  And : si l'API ClickUp est indisponible : l'output est sauvegardé localement, la sync est mise en queue
```

**US-PM-05 — Détection d'ambiguité**
```
Given : le brief client contient des informations manquantes critiques (pas de deadline, format non précisé, langue cible absente)
When : le PM IA analyse le brief
Then : il liste les informations manquantes avant de proposer une décomposition
  And : il propose des options pour chaque information manquante (ex: "deadline non précisée — livraison standard D+1 Sarani ?")
  And : l'opérateur confirme les informations avant dispatch
```

---

### 3.3 Interface — Wireframe ASCII

**Écran principal : New Brief**

```
┌─────────────────────────────────────────────────────────────┐
│ SARANI BACK-OFFICE          [Projects] [Clients] [Agents]   │
├─────────────────────────────────────────────────────────────┤
│ PROJECT MANAGER IA                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Client                                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [Select client v]                    [+ New client] │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Brief (paste email, write or describe the project)        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │                                                     │   │
│  │                                                     │   │
│  │                                        [Attach]     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Deadline              Priority                             │
│  [Date picker]         [Normal / Urgent / ASAP v]          │
│                                                             │
│                              [Analyze brief ->]             │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ BRIEF ANALYSIS (appears after submit)                       │
├─────────────────────────────────────────────────────────────┤
│  [ok] Client: Sony -- brand book found                      │
│  [ok] Languages detected: EN -> FR                         │
│  [!]  Deadline: not specified -- assuming D+1? [Confirm]   │
│                                                             │
│  Suggested tasks:                                           │
│  [x] [Designer IA] 50 web banners -- 728x90, 300x250       │
│  [x] [Translator] Brief FR -> EN confirmation              │
│  [ ] [Legal IA] SOW draft -- fixed price                   │
│                                                             │
│  [Edit tasks]                  [Dispatch selected ->]       │
└─────────────────────────────────────────────────────────────┘
```

**Écran : Project tracker**

```
┌─────────────────────────────────────────────────────────────┐
│ ACTIVE PROJECTS                              [+ New brief]  │
├─────────────────────────────────────────────────────────────┤
│ Client    | Brief             | Agents     | Status | Due   │
│-----------│-------------------│------------│--------│-------│
│ Sony      | Black Friday      | Designer   | Done   | 25/03 │
│           | banners x50       | Legal      | Pend.  |       │
│ GEODIS    | 20 slides rebrnd  | Designer   | Proc.  | 26/03 │
│ TikTok    | Monthly content   | Social     | Done   | 31/03 │
└─────────────────────────────────────────────────────────────┘
```

---

### 3.4 Workflow détaillé

1. L'opérateur ouvre le PM IA et sélectionne le client
2. Il colle le brief (email copié, description libre, ou fichier joint)
3. Le PM IA lit la fiche client (brand book, langue principale, historique)
4. Le PM IA analyse le brief : identifie le type de deliverable, la langue, le format, la deadline
5. Si informations manquantes : bloque et liste les gaps (US-PM-05)
6. Le PM IA propose une décomposition en tâches avec agents suggérés
7. L'opérateur valide / modifie / ajoute des tâches
8. Dispatch : le PM IA envoie chaque sous-brief à l'agent concerné avec le contexte client
9. Suivi en temps réel : statut de chaque sous-tâche (pending / processing / done / error)
10. Quand tous les outputs sont prêts : "Prepare client delivery" → rendu compilé
11. Sync ClickUp (si activé) : création des tâches correspondantes

---

### 3.5 Inputs / Outputs

| Input | Type | Obligatoire |
|-------|------|-------------|
| Client sélectionné | select (fiche client) | Oui |
| Brief texte | textarea | Oui (min 20 chars) |
| Pièce jointe | file (PDF, DOCX, images) | Non |
| Deadline | date | Non (défaut D+1) |
| Priorité | select (Normal/Urgent/ASAP) | Non (défaut Normal) |

| Output | Format | Description |
|--------|--------|-------------|
| Décomposition de brief | texte structuré (affiché UI) | Liste tâches + agents + estimations |
| Sub-briefs dispatchés | jsonb (envoyé aux agents) | Brief structuré par agent |
| Rendu client compilé | PDF ou .docx | Document de livraison final |
| Tâches ClickUp | API call | Tâches créées dans ClickUp |
| Entrée BDD AgentOutput | jsonb | Historique complet du projet |

---

### 3.6 Mémoire client

| Donnée mémorisée | Source | Usage |
|------------------|--------|-------|
| Brand book + assets | Fiche client | Transmis automatiquement au Designer IA |
| Langue principale | Fiche client | Inférée si non précisée dans le brief |
| Historique projets | AgentOutput[] | Contexte pour décomposition |
| Templates contracts | Fiche client | Sélection automatique du bon template Legal |
| Glossaire | Fiche client | Transmis au Translator |

---

### 3.7 Interactions inter-agents

| Agent | Type d'interaction | Déclencheur |
|-------|-------------------|-------------|
| Translator | Dispatch sous-brief | Brief contient un besoin de traduction |
| Designer IA | Dispatch sous-brief | Brief contient un besoin visuel |
| Creative Strategist | Dispatch sous-brief | Brief contient un besoin stratégique |
| Legal IA | Dispatch sous-brief | Brief contient un besoin contractuel |
| Social IA | Dispatch sous-brief | Brief contient un besoin de contenu social |
| SEO IA | Dispatch sous-brief | Brief contient un besoin éditorial/SEO |
| ClickUp API | Sync bidirectionnelle | A chaque création/mise à jour de tâche |

**Règle** : le PM IA est le seul point d'entrée pour le dispatch. Il ne peut pas être appelé par un autre agent.

---

### 3.8 Stack technique

| Élément | Choix | Justification |
|---------|-------|---------------|
| Modèle IA | Claude Sonnet 4.5 | Excellent en analyse structurée et décomposition de tâches. Coût raisonnable pour usage fréquent. |
| System prompt | Personnalisé Sarani | Inclut le contexte agence, le ton de marque, les types de tâches récurrentes |
| Contexte client | Injecté automatiquement | La fiche client complète est injectée dans le context window à chaque requête |
| ClickUp API | REST v2 | Création de tâches, mise à jour statuts |
| Output compilation | Claude Sonnet 4.5 + template | Rendu client formaté selon templates Sarani |
| Coût estimé | ~$0.008/requête | [HYPOTHÈSE : voir section 2.4] |

---

### 3.9 Edge cases

| Situation | Comportement attendu |
|-----------|---------------------|
| Brief en langue non supportée (ex: japonais) | PM IA détecte la langue, demande confirmation, propose de traduire d'abord via Translator |
| Client sans fiche (nouveau client) | PM IA bloque et redirige vers "Create client record first" |
| Brief ambigu sans deadline | PM IA liste les ambiguïtés, propose valeurs par défaut (D+1), opérateur confirme |
| Un agent en erreur dans un dispatch multiple | Livre les outputs disponibles, marque l'agent en erreur, permet retry individuel |
| ClickUp API indisponible | Output sauvegardé localement. Bannière "ClickUp sync pending". Retry auto toutes les 10 min. |
| Données client confidentielles dans le brief | [HYPOTHÈSE : data processing agreement Anthropic requis avant mise en prod pour clients avec exigences DPA. Signaler à Thomas avant go-live back-office.] |

---

## 4. Agent 2 — Translator

### 4.1 Persona utilisateur

**Qui l'utilise** : Responsable des opérations, Thomas, et (v2) les client managers.

**Quand** : Dès qu'un document client doit être traduit (brief entrant, livrable sortant, email de suivi, présentation). Usage quotidien — c'est l'agent le plus sollicité en fréquence.

**Pourquoi** : Sarani livre dans 18 langues avec une promesse de qualité "natif professionnel". La traduction manuelle par un expert senior prend 1-2h pour un document standard. Le Translator IA produit une première version de qualité en 2 minutes, que l'expert humain valide et affine si nécessaire.

**Douleur quotidienne résolue** : "Sony m'envoie un brief en japonais à 23h. Mon traducteur japonais est à Tokyo et ne commence que dans 6 heures. Le Translator IA me donne une version anglaise immédiatement pour que je puisse commencer à travailler, et je valide avec le traducteur humain le matin."

---

### 4.2 User stories

**US-TR-01 — Traduction de document**
```
Given : l'opérateur sélectionne un client
  And : upload un fichier (PDF, DOCX, TXT, email copié)
  And : sélectionne la langue source et la langue cible
When : il soumet le formulaire
Then : le Translator produit la traduction complète en respectant le glossaire client
  And : les termes non-traduisibles (noms de marque, abréviations spécifiques) sont préservés
  And : le résultat est affiché dans l'UI et téléchargeable en .docx et .txt
  And : la traduction est sauvegardée dans l'historique du client
```

**US-TR-02 — Mémoire de traduction par client**
```
Given : une traduction a été validée par l'opérateur pour un client donné
When : une nouvelle traduction est demandée pour ce même client
Then : le Translator utilise automatiquement le glossaire et les traductions validées précédentes
  And : les formulations récurrentes sont cohérentes avec l'historique
  And : l'opérateur peut voir les termes du glossaire appliqués (mode "show glossary hits")
```

**US-TR-03 — Validation et feedback**
```
Given : une traduction est générée
When : l'opérateur ou l'expert humain modifie une portion de la traduction
  And : clique "Save as validated"
Then : la version corrigée est sauvegardée dans la translation memory du client
  And : les corrections alimentent le glossaire pour les prochaines traductions
```

**US-TR-04 — Traduction rapide (texte court)**
```
Given : l'opérateur a un texte court (moins de 500 mots) à traduire
When : il colle le texte directement dans le chat de l'agent
Then : la traduction est produite immédiatement sans formulaire
  And : l'opérateur peut préciser la langue cible dans le chat
```

---

### 4.3 Interface — Wireframe ASCII

**Écran principal : Translate**

```
+-------------------------------------------------------------+
| TRANSLATOR                                        [History] |
+-------------------------------------------------------------+
|                                                             |
|  Client (for glossary and memory)                          |
|  [Select client v] (optional -- enables glossary)          |
|                                                             |
|  Source language          Target language                   |
|  [FR v]                   [EN v]                           |
|                                                             |
|  Input                                                      |
|  +--------------------------------------------------+      |
|  | Paste text or upload a file                      |      |
|  |                                                  |      |
|  |                                    [Upload file] |      |
|  +--------------------------------------------------+      |
|                                                             |
|  Options                                                    |
|  [ ] Formal register    [ ] Show glossary hits              |
|                                                             |
|                                [Translate ->]               |
|                                                             |
+-------------------------------------------------------------+
| OUTPUT                                                      |
+-------------------------------------------------------------+
|  +--------------------------------------------------+      |
|  | [Translated text -- editable inline]             |      |
|  |                                                  |      |
|  | Glossary hits highlighted                        |      |
|  +--------------------------------------------------+      |
|                                                             |
|  [Save as validated]  [Download .docx]  [Download .txt]    |
+-------------------------------------------------------------+
```

---

### 4.4 Workflow détaillé

1. L'opérateur sélectionne (optionnel) le client pour activer le glossaire
2. Sélectionne langue source et langue cible (5 langues v1 : FR, EN, IT, ES, DE)
3. Colle le texte ou upload un fichier (PDF, DOCX, TXT)
4. Le Translator injecte le glossaire client (si disponible) dans son contexte
5. Traduction produite avec respect du ton de marque client et des termes protégés
6. Affichage des "glossary hits" (termes du glossaire appliqués, surlignés)
7. L'opérateur lit, modifie si nécessaire
8. "Save as validated" : alimente la translation memory du client
9. Téléchargement en .docx ou .txt
10. Output sauvegardé dans l'historique AgentOutput du client

---

### 4.5 Inputs / Outputs

| Input | Type | Obligatoire |
|-------|------|-------------|
| Client | select | Non (requis pour activer le glossaire) |
| Langue source | select (FR/EN/IT/ES/DE) | Oui |
| Langue cible | select (FR/EN/IT/ES/DE) | Oui |
| Texte source | textarea ou file upload | Oui |
| Registre | toggle (Formal/Standard) | Non (défaut Standard) |

| Output | Format | Description |
|--------|--------|-------------|
| Traduction | texte affiché (éditable) | Version traduite complète |
| Fichier .docx | téléchargeable | Mise en forme préservée si input DOCX |
| Fichier .txt | téléchargeable | Version texte brut |
| Translation memory update | BDD | Si "Save as validated" cliqué |
| AgentOutput entry | jsonb | Historique sauvegardé |

---

### 4.6 Mémoire client

| Donnée mémorisée | Source | Usage |
|------------------|--------|-------|
| Glossaire (termes spécifiques) | Fiche client + validation humaine | Injecté dans chaque requête de traduction |
| Translation memory (formulations validées) | Sauvegardé après "Save as validated" | Cohérence inter-documents |
| Termes interdits | Fiche client | Exclus systématiquement |
| Registre préféré | Fiche client | Appliqué par défaut |

---

### 4.7 Interactions inter-agents

| Agent | Type | Déclencheur |
|-------|------|-------------|
| PM IA | Réception de sous-brief | PM IA dispatche un besoin de traduction |
| Legal IA | Coordination possible | Contrats à traduire avant livraison |

---

### 4.8 Stack technique

| Élément | Choix | Justification |
|---------|-------|---------------|
| Modèle IA | Claude Sonnet 4.5 | Excellente qualité de traduction sur les 5 langues v1. Respect fin du contexte injecté (glossaire). |
| Injection glossaire | System prompt enrichi | Glossaire client injecté avant chaque requête |
| Parsing DOCX | mammoth.js (extraction texte) | Extraction fiable du texte des .docx |
| Export DOCX | docx.js | Reconstruction du document formaté |
| Coût estimé | ~$0.012/requête (10K tokens) | [HYPOTHÈSE : voir section 2.4] |

---

### 4.9 Edge cases

| Situation | Comportement attendu |
|-----------|---------------------|
| Langue non supportée en v1 (ex: japonais) | Message : "This language pair is not supported in v1 (FR/EN/IT/ES/DE only). Contact the team for manual translation." |
| Même langue source et cible | Erreur de validation avant soumission : "Source and target language must be different." |
| PDF non extractible (scan) | Message : "This PDF appears to be a scan. Please copy-paste the text manually." |
| Terme du glossaire absent pour une paire de langues | Traduction standard sans glossaire. Message : "No glossary found for this language pair." |
| Texte très long (plus de 50 pages) | [HYPOTHÈSE : segmentation automatique en chunks de 8K tokens. Résultats concaténés. A valider avec les limites context window Anthropic.] |
| Client sans glossaire | Traduction sans mémoire client. Message : "No glossary found for this client. Add terms in the client record." |

---

## 5. Agent 3 — Creative Strategist

### 5.1 Persona utilisateur

**Qui l'utilise** : Thomas (fondateur), et les account managers en charge de grands comptes.

**Quand** : Avant une présentation client stratégique, en début de nouveau projet, quand un client demande une recommandation créative ou un rebranding. Usage moins fréquent que le Translator (2-5x/semaine), mais à haute valeur ajoutée.

**Pourquoi** : Construire une recommandation stratégique créative (brand platform, positionnement, messaging) prend 4-6h à un stratège senior. Le Creative Strategist IA produit une première version structurée en 10 minutes sur base du brief et du contexte client — que Thomas enrichit avec son expertise et son vécu du client.

**Douleur quotidienne résolue** : "TikTok me demande une recommandation pour leur campagne EMEA 2026. J'ai 2 jours pour préparer la présentation. Le Creative Strategist me donne la structure stratégique, les insights consommateur, les axes créatifs en 15 minutes. Je passe mon temps à challenger et affiner plutôt qu'à rédiger."

---

### 5.2 User stories

**US-CS-01 — Brief stratégique → Recommandation**
```
Given : l'opérateur sélectionne un client
  And : remplit le formulaire de brief (objectif de la campagne, cible, budget, contraintes)
  And : le brand book et l'historique client sont disponibles dans la fiche client
When : il soumet le formulaire
Then : le Creative Strategist produit une recommandation structurée (problem statement, insights, axes créatifs, idée directrice, KPIs suggérés)
  And : chaque recommandation est justifiée et rattachée aux données client
  And : le document est affiché dans l'UI et téléchargeable en .docx
```

**US-CS-02 — Benchmark concurrentiel intégré**
```
Given : le brief inclut un secteur ou des concurrents cités
When : le Creative Strategist analyse le brief
Then : il intègre un benchmark des pratiques créatives du secteur (basé sur son entraînement + données fournies)
  And : les insights sont contextualisés par rapport aux concurrents du client
  And : les données concurrentielles non vérifiables sont marquées [HYPOTHESE]
```

**US-CS-03 — Itération sur la recommandation**
```
Given : une recommandation a été produite
When : l'opérateur donne un feedback dans le chat ("renforce l'axe émotionnel", "cible plus jeune", "budget réduit de moitié")
Then : le Creative Strategist produit une version révisée qui intègre le feedback
  And : les changements sont clairement indiqués vs la version précédente
```

**US-CS-04 — Génération de brief créatif**
```
Given : une recommandation stratégique a été validée
When : l'opérateur demande "Generate creative brief"
Then : le Creative Strategist produit un brief créatif opérationnel (pour les designers, copywriters, etc.)
  And : le brief inclut : objectif, cible, message clé, ton, contraintes techniques, exemples de références
  And : le brief est transmissible directement au Designer IA ou à l'équipe créative
```

---

### 5.3 Interface — Wireframe ASCII

**Écran principal : New Strategy**

```
+-------------------------------------------------------------+
| CREATIVE STRATEGIST                           [History]     |
+-------------------------------------------------------------+
|                                                             |
|  Client                                                     |
|  [Select client v]  -- brand book and history auto-loaded  |
|                                                             |
|  Project brief                                              |
|  Objective                                                  |
|  +--------------------------------------------------+      |
|  | What does the client want to achieve?            |      |
|  +--------------------------------------------------+      |
|                                                             |
|  Target audience                                            |
|  +--------------------------------------------------+      |
|  | Who are we speaking to?                          |      |
|  +--------------------------------------------------+      |
|                                                             |
|  Budget range              Timeline                         |
|  [Select v]                [Date picker]                   |
|                                                             |
|  Constraints / Context                                      |
|  +--------------------------------------------------+      |
|  | Competitor, market context, mandatories...        |      |
|  +--------------------------------------------------+      |
|                                                             |
|  Output type                                                |
|  (o) Strategic recommendation                              |
|  ( ) Creative brief                                         |
|  ( ) Campaign concept                                       |
|                                                             |
|                        [Generate strategy ->]               |
|                                                             |
+-------------------------------------------------------------+
| OUTPUT                          [Download .docx] [Iterate] |
+-------------------------------------------------------------+
|  ## STRATEGIC RECOMMENDATION                                |
|  ### Problem statement                                      |
|  [AI-generated content]                                     |
|  ### Consumer insights                                      |
|  [AI-generated content]                                     |
|  ### Creative territories (3)                               |
|  [AI-generated content]                                     |
|  ### Recommended direction                                  |
|  [AI-generated content]                                     |
|                                                             |
|  [Chat for feedback]                                        |
+-------------------------------------------------------------+
```

---

### 5.4 Workflow détaillé

1. L'opérateur sélectionne le client (brand book, historique projets chargés automatiquement)
2. Remplit le formulaire : objectif, cible, budget, timeline, contraintes
3. Choisit le type d'output (recommandation stratégique, brief créatif, concept de campagne)
4. Le Creative Strategist injecte le contexte client complet (brand tone, historique, secteur)
5. Production de la recommandation structurée (problem statement → insights → axes → direction → KPIs)
6. Itération via chat si nécessaire
7. Export .docx pour présentation client
8. Optionnel : génération du brief créatif opérationnel (US-CS-04) à transmettre au Designer IA

---

### 5.5 Inputs / Outputs

| Input | Type | Obligatoire |
|-------|------|-------------|
| Client | select | Oui |
| Objectif | textarea | Oui |
| Cible | textarea | Oui |
| Budget | select (fourchettes) | Non |
| Timeline | date | Non |
| Contraintes / Contexte | textarea | Non |
| Type d'output | radio | Oui |

| Output | Format | Description |
|--------|--------|-------------|
| Recommandation stratégique | texte structuré (affiché) | Problem → Insights → Axes → Direction → KPIs |
| Brief créatif opérationnel | texte structuré (affiché) | Brief transmissible au Designer IA |
| Fichier .docx | téléchargeable | Version formatted pour présentation client |
| AgentOutput entry | jsonb | Historique sauvegardé |

---

### 5.6 Mémoire client

| Donnée mémorisée | Source | Usage |
|------------------|--------|-------|
| Brand book (ton, guidelines) | Fiche client | Injecté dans chaque requête |
| Historique recommandations | AgentOutput[] | Cohérence et évolution de la stratégie client |
| Secteur et concurrents | Fiche client + historique | Contextualisation benchmark |
| Axes créatifs validés passés | AgentOutput[] (validated) | Ne pas reproduire des directions déjà explorées |

---

### 5.7 Interactions inter-agents

| Agent | Type | Déclencheur |
|-------|------|-------------|
| PM IA | Réception de sous-brief | PM IA dispatche un besoin stratégique |
| Designer IA | Transfert de brief créatif | Brief créatif généré en US-CS-04 transmis au Designer |

---

### 5.8 Stack technique

| Élément | Choix | Justification |
|---------|-------|---------------|
| Modèle IA | Claude Opus 4 | Raisonnement stratégique complexe — Opus surpasse Sonnet sur les tâches de synthèse créative et d'analyse multi-niveaux. Valeur justifie le coût plus élevé. |
| System prompt | Basé sur @creative-strategy agent existant | Adaptation du prompt agent Sarani au contexte back-office interne |
| Contexte client | Injecté automatiquement (brand book + historique) | Max 20K tokens de contexte client injecté |
| Coût estimé | ~$0.08/requête | [HYPOTHÈSE : voir section 2.4] |

---

### 5.9 Edge cases

| Situation | Comportement attendu |
|-----------|---------------------|
| Brief vague sans objectif clair | Creative Strategist liste 3 questions de clarification avant de procéder. Ne génère pas sans objectif. |
| Client sans brand book | Génère la recommandation sans contrainte brand, signale : "No brand book found — recommendation generated without brand guidelines." |
| Recommandation contredisant l'historique client | Signale la contradiction : "Note: this direction differs from [Projet X, date]. Consider whether this represents an evolution or a gap." |
| Budget trop faible pour les ambitions décrites | Signale le gap et propose des ajustements scope/ambition alignés avec le budget indiqué. |
| Données concurrentielles invérifiables | Marquées systématiquement [HYPOTHESE] dans l'output. Jamais présentées comme des faits. |

---

## 6. Agent 4 — Graphic Designer IA

### 6.1 Persona utilisateur

**Qui l'utilise** : Thomas, la responsable des opérations, et les client managers.

**Quand** : Pour générer des premiers jets visuels avant l'intervention des designers humains seniors. Cas d'usage prioritaires : (1) moodboards de proposition créative, (2) premiers jets de bannières web, (3) slides de présentation pour des appels d'offres, (4) landing pages rapides pour des pitchs.

**Pourquoi** : Un designer senior Sarani facture son expertise sur la finition et la sophistication créative — pas sur la production du premier jet. Le Designer IA produit ce premier jet en respectant les contraintes brand du client, ce qui permet au designer humain de concentrer son énergie sur l'itération et la qualité finale.

**Douleur quotidienne résolue** : "Un client me demande une proposition créative pour lundi. Il est vendredi 16h. Mes designers sont sur d'autres projets. Le Designer IA génère 3 directions visuelles respectant leur brand book en 10 minutes. Je peux présenter une proposition lundi matin et les designers finalisent la direction retenue en semaine."

---

### 6.2 User stories

**US-DES-01 — Génération de visuels sur brief**
```
Given : l'opérateur sélectionne un client avec brand book disponible
  And : sélectionne le type de visuel (bannière web, slide, landing page, social post, moodboard)
  And : remplit le brief (message, format, contraintes, exemples)
When : il soumet le formulaire
Then : le Designer IA génère 3 variantes du visuel en respectant les couleurs, polices et guidelines du brand book
  And : les visuels sont affichés dans l'UI
  And : chaque variante est téléchargeable individuellement
  And : les visuels sont sauvegardés dans l'historique client
```

**US-DES-02 — Génération sans brand book (mode libre)**
```
Given : aucun brand book n'est disponible pour le client sélectionné
When : l'opérateur soumet le formulaire
Then : un message d'avertissement s'affiche : "No brand book found -- generating without brand constraints"
  And : le Designer IA génère les visuels sur base du brief uniquement
  And : les visuels sont marqués "Draft -- brand unconstrained" dans l'historique
```

**US-DES-03 — Création de slides pour appel d'offres**
```
Given : l'opérateur sélectionne le type "Presentation / Pitch deck"
  And : fournit le brief (nombre de slides, messages clés, contenu par slide)
When : il soumet le formulaire
Then : le Designer IA génère les slides en format image (PNG par slide)
  And : un PDF compilé est disponible en téléchargement
  And : [HYPOTHESE : intégration Google Slides API pour export en format editable -- à valider en phase de dev]
```

**US-DES-04 — Génération de landing page visuelle**
```
Given : l'opérateur sélectionne le type "Landing page"
  And : fournit le brief (objectif, sections, messages, CTA)
When : il soumet le formulaire
Then : le Designer IA génère un wireframe visuel haute-fidélité (image PNG)
  And : les sections sont annotées (Hero, Benefits, Proof, CTA)
  And : le visuel est exportable pour revue client
```

---

### 6.3 Interface — Wireframe ASCII

**Écran principal : New Visual**

```
+-------------------------------------------------------------+
| GRAPHIC DESIGNER IA                           [Gallery]     |
+-------------------------------------------------------------+
|                                                             |
|  Client                                                     |
|  [Select client v]                                          |
|  [ok] Brand book found: Sony_guidelines_2025.pdf           |
|  Colors: #000000 #FF0000 #FFFFFF   Font: Sony Sketch EF    |
|                                                             |
|  Type of visual                                             |
|  ( ) Web banners         (o) Social post                   |
|  ( ) Presentation slide  ( ) Landing page                  |
|  ( ) Moodboard           ( ) Other                         |
|                                                             |
|  Format / Dimensions                                        |
|  [1080x1080 (Instagram) v]  or  [Custom: W___ x H___]      |
|                                                             |
|  Brief                                                      |
|  +--------------------------------------------------+      |
|  | Describe the visual: message, mood, content,     |      |
|  | mandatory elements, references...                |      |
|  +--------------------------------------------------+      |
|                                                             |
|  Number of variants                                         |
|  ( ) 1    (o) 3    ( ) 5                                    |
|                                                             |
|                          [Generate visuals ->]              |
|                                                             |
+-------------------------------------------------------------+
| OUTPUT -- 3 variants                                        |
+-------------------------------------------------------------+
|  +----------+  +----------+  +----------+                  |
|  | Visual 1 |  | Visual 2 |  | Visual 3 |                  |
|  |          |  |          |  |          |                  |
|  | [DL PNG] |  | [DL PNG] |  | [DL PNG] |                  |
|  +----------+  +----------+  +----------+                  |
|                                                             |
|  [Download all]   [Select & iterate]   [Chat with agent]   |
+-------------------------------------------------------------+
```

**Section back-office : Client Brand Assets**

```
+-------------------------------------------------------------+
| CLIENT RECORD -- Sony                  [Edit] [Back]        |
+-------------------------------------------------------------+
| BRAND ASSETS                                                |
+-------------------------------------------------------------+
|  Brand book      [Sony_guidelines_2025.pdf]  [Replace]     |
|  Logo (dark bg)  [Sony_logo_white.svg]       [Replace]     |
|  Logo (light bg) [Sony_logo_black.svg]       [Replace]     |
|  Primary color   [#FF0000] [#000000] [#FFFFFF]             |
|  Font name       [Sony Sketch EF]                          |
|  Brand tone      [Bold, minimal, premium...]               |
|                                                             |
|  Guidelines notes                                          |
|  +--------------------------------------------------+      |
|  | No gradients. White space is key. Never use      |      |
|  | red background except on hero elements.          |      |
|  +--------------------------------------------------+      |
|                                    [Save brand assets]      |
+-------------------------------------------------------------+
```

---

### 6.4 Workflow détaillé

1. L'opérateur sélectionne le client
2. Le Designer IA charge automatiquement le brand book (couleurs, police, guidelines)
3. Si aucun brand book : avertissement affiché, génération en mode libre
4. Sélection du type de visuel et du format
5. Remplissage du brief (message, mood, contraintes, exemples)
6. Génération de 1 à 5 variantes via API image IA
7. Affichage des variantes dans l'UI
8. Téléchargement individuel ou en lot (ZIP)
9. Optionnel : itération via chat ("plus de blanc", "texte plus gros", "variante 2 mais rouge")
10. Visuels sauvegardés dans l'historique client (gallery view)

---

### 6.5 Inputs / Outputs

| Input | Type | Obligatoire |
|-------|------|-------------|
| Client | select | Oui |
| Type de visuel | radio | Oui |
| Format/dimensions | select ou custom | Oui |
| Brief | textarea | Oui (min 20 chars) |
| Nombre de variantes | radio (1/3/5) | Non (défaut 3) |
| Brand book | auto-chargé | Non (auto si disponible) |

| Output | Format | Description |
|--------|--------|-------------|
| Visuels générés | PNG (1-5 images) | Affichés dans l'UI + téléchargeables |
| ZIP de variantes | téléchargeable | Toutes les variantes |
| PDF compilé (slides) | téléchargeable | Pour type "Presentation" |
| AgentOutput entry | jsonb + file refs | Historique client |

---

### 6.6 Mémoire client

| Donnée mémorisée | Source | Usage |
|------------------|--------|-------|
| Brand book (PDF/ZIP) | Fiche client | Lu et parsé avant chaque génération |
| Couleurs primaires/secondaires | Fiche client | Injectées dans le prompt de génération image |
| Police principale | Fiche client | Mention dans le prompt |
| Guidelines notes | Fiche client | Injectées textuellement dans le prompt |
| Historique visuels | AgentOutput[] | Références disponibles pour itération |

---

### 6.7 Interactions inter-agents

| Agent | Type | Déclencheur |
|-------|------|-------------|
| PM IA | Réception de sous-brief | PM IA dispatche un besoin visuel |
| Creative Strategist | Réception de brief créatif | Brief créatif généré transmis |

---

### 6.8 Stack technique

| Élément | Choix | Justification |
|---------|-------|---------------|
| Modèle image | GPT-Image-1 (OpenAI) | [HYPOTHÈSE : meilleure cohérence brand sur instruction précise. A évaluer vs Ideogram v2 (meilleur en typographie) et Flux 1.1 Pro (meilleur en photoréalisme). Choix à valider avec Thomas sur tests réels.] |
| Prompt engineering | Claude Sonnet 4.5 | Transformation du brief texte en prompt image optimisé |
| Brand extraction | Lecture PDF + parsing couleurs | Extraction des couleurs hex et guidelines du brand book |
| Export slides | [HYPOTHÈSE : html2canvas ou Puppeteer. Google Slides API pour export editable en v2.] | — |
| Stockage images | [HYPOTHÈSE : Supabase Storage ou Cloudflare R2 — à décider avec @fullstack] | — |
| Coût estimé | ~$0.04/image | [HYPOTHÈSE : voir section 2.4] |

---

### 6.9 Edge cases

| Situation | Comportement attendu |
|-----------|---------------------|
| Brand book manquant | Avertissement clair, génération en mode libre, sortie marquée "Draft -- brand unconstrained" |
| Brief trop vague | Designer IA demande des précisions : message, mood, mandatory elements |
| Format non standard (ex: print A4) | Accepté. Message : "Note: AI generation is optimized for screen formats. Print results may vary." |
| Génération avec texte incorrect dans l'image | [HYPOTHÈSE : recommandation -- générer sans texte, ajouter le texte en post-traitement. A documenter dans les contraintes UI.] |
| Guidelines très strictes (ex: usage logo interdit sur certains fonds) | Guidelines injectées textuellement. Avertissement : "Brand guidelines are applied via prompt only. Human review required before client delivery." |

---

## 7. Agent 5 — Legal IA

### 7.1 Persona utilisateur

**Qui l'utilise** : Thomas (fondateur) et la responsable des opérations.

**Quand** : À chaque nouveau projet (SOW), campagne UGC (contrat UGC), collaboration freelance (contrat freelance), ou demande de NDA. Usage : 5-10 contrats/mois estimé.

**Pourquoi** : Chaque contrat généré par un avocat externe coûte entre 300€ et 1 000€ et prend 2-3 jours. Le Legal IA génère un contrat prêt-à-signer en 5 minutes sur base des templates validés par Thomas et son conseil juridique. La validation humaine reste obligatoire avant signature — l'agent génère, l'humain valide.

**Douleur quotidienne résolue** : "TikTok valide un projet à 15 000€. Je dois envoyer un SOW signé dans 24h. Sans Legal IA, je passe 1h à ouvrir mon template Word, copier-coller les infos du brief, reformuler les clauses. Avec Legal IA, je remplis le formulaire en 5 minutes et le contrat est prêt."

---

### 7.2 User stories

**US-LG-01 — Génération de contrat depuis template**
```
Given : l'opérateur sélectionne un client et un type de contrat (UGC / SOW / NDA / Freelance)
  And : remplit les variables du formulaire (montant, scope, durée, livrables)
When : il soumet le formulaire
Then : le Legal IA injecte les variables dans le template correspondant
  And : génère un contrat Word (.docx) complet
  And : le contrat est affiché en preview dans l'UI
  And : le .docx est téléchargeable immédiatement
  And : le contrat est sauvegardé dans l'historique du client
```

**US-LG-02 — Gestion des templates**
```
Given : Thomas souhaite mettre à jour un template de contrat
When : il accède à "Manage contract templates" dans le back-office
Then : il peut uploader un nouveau template .docx avec des variables balisées (ex: {{client_name}}, {{amount}}, {{scope}})
  And : le Legal IA reconnaît automatiquement les variables du template
  And : le formulaire de génération s'adapte aux variables détectées
```

**US-LG-03 — Validation avant envoi**
```
Given : un contrat vient d'être généré
When : l'opérateur lit le contrat en preview
Then : il peut modifier des sections directement dans l'interface
  And : une bannière de rappel s'affiche : "This contract has not been reviewed by legal counsel. Review before sending."
  And : le statut du contrat est "Draft" jusqu'à ce qu'il soit marqué "Ready to send"
```

---

### 7.3 Interface — Wireframe ASCII

**Écran principal : New Contract**

```
+-------------------------------------------------------------+
| LEGAL IA                     [Manage templates] [History]   |
+-------------------------------------------------------------+
|                                                             |
|  Client                                                     |
|  [Select client v]                                          |
|  Legal entity: TikTok Technology Limited                    |
|  Country: Ireland (EU)  VAT: IE9825613N                     |
|                                                             |
|  Contract type                                              |
|  (o) SOW -- Statement of Work                              |
|  ( ) UGC -- Creator Agreement                              |
|  ( ) NDA -- Non-Disclosure Agreement                       |
|  ( ) Freelance -- Independent Contractor                   |
|                                                             |
|  -- SOW variables --                                        |
|  Project name           [Black Friday Campaign 2026]        |
|  Scope of work          [50 web banners, 5 formats...]      |
|  Total amount (EUR)     [15,000]                            |
|  Payment terms          [50% upfront / 50% on delivery v]  |
|  Delivery date          [2026-04-15]                        |
|  Revisions included     [Unlimited v]                       |
|  Governing law          [France v]                          |
|                                                             |
|                          [Generate contract ->]             |
+-------------------------------------------------------------+
| PREVIEW                                    [Download .docx] |
+-------------------------------------------------------------+
|  [Contract preview -- scrollable]                           |
|                                                             |
|  [!] This contract has not been reviewed by legal counsel. |
|      Review before sending to client.                       |
|                                                             |
|  [Mark as "Ready to send"]                                  |
+-------------------------------------------------------------+
```

---

### 7.4 Workflow détaillé

1. L'opérateur sélectionne le client (données légales auto-chargées : raison sociale, TVA, pays)
2. Sélectionne le type de contrat
3. Remplit les variables du formulaire (scope, montant, dates, conditions)
4. Le Legal IA injecte les variables dans le template .docx correspondant
5. Preview du contrat dans l'UI
6. L'opérateur vérifie, modifie si besoin
7. Téléchargement .docx
8. Marqué "Ready to send" après validation humaine
9. Sauvegardé dans l'historique du client

---

### 7.5 Inputs / Outputs

| Input | Type | Obligatoire |
|-------|------|-------------|
| Client | select | Oui |
| Type de contrat | radio | Oui |
| Variables contractuelles | formulaire dynamique | Oui (selon le template) |
| Template actif | auto-sélectionné par type | Oui |

| Output | Format | Description |
|--------|--------|-------------|
| Contrat généré | .docx téléchargeable | Prêt pour signature |
| Preview | HTML rendu dans l'UI | Lecture avant téléchargement |
| AgentOutput entry | jsonb + file ref | Historique sauvegardé |

---

### 7.6 Mémoire client

| Donnée mémorisée | Source | Usage |
|------------------|--------|-------|
| Raison sociale exacte | Fiche client | Auto-remplie dans tous les contrats |
| Numéro TVA | Fiche client | Auto-rempli dans les clauses fiscales |
| Pays de la raison sociale | Fiche client | Détermination du droit applicable par défaut |
| Contrat-cadre signé | Fiche client | Si existant, SOW fait référence au cadre |
| Historique contrats | AgentOutput[] | Cohérence des conditions (montants, termes) |

---

### 7.7 Interactions inter-agents

| Agent | Type | Déclencheur |
|-------|------|-------------|
| PM IA | Réception de sous-brief | PM IA dispatche un besoin contractuel |
| Translator | Coordination possible | Contrat à traduire (ex: SOW en anglais pour client allemand) |

---

### 7.8 Stack technique

| Élément | Choix | Justification |
|---------|-------|---------------|
| Modèle IA | Claude Sonnet 4.5 | Injection de variables dans templates structurés — tâche de substitution précise, pas de raisonnement complexe. Sonnet suffit et est plus économique. |
| Template format | .docx avec variables balisées | Compatible avec les outils de travail habituels (Word, Notion, email) |
| Parsing/generation .docx | docx.js (node) | Remplacement des variables et génération du fichier |
| System prompt | Basé sur @legal agent existant | Adaptation au contexte Sarani (types de contrats, clauses standard) |
| Coût estimé | ~$0.015/requête | [HYPOTHÈSE : voir section 2.4] |

---

### 7.9 Edge cases

| Situation | Comportement attendu |
|-----------|---------------------|
| Client sans données légales (raison sociale manquante) | Avertissement : "Legal entity information is incomplete for this client. Please update the client record before generating a contract." Champs manquants listés. |
| Template demandé non disponible | Message : "This contract template is not available. Contact Thomas to upload it in 'Manage templates'." |
| Montant nul ou négatif | Erreur de validation avant soumission : "Amount must be greater than 0." |
| Variable critique non remplie (ex: scope vide) | Erreur de validation : les champs obligatoires sont bloquants avant génération. |
| Contrat pour un pays hors UE (ex: client US) | Avertissement : "Client is based outside the EU. Verify governing law and applicable regulations before sending." |
| Modification post-génération créant une incohérence | Bannière : "You have modified this contract manually. Ensure consistency with the original template terms." |

---

## 8. Agent 6 — Social IA

### 8.1 Persona utilisateur

**Qui l'utilise** : Thomas (fondateur), la responsable des opérations, et (v2) un community manager dédié si embauché.

**Quand** : Chaque semaine pour préparer le contenu LinkedIn de Sarani. En v1, focus LinkedIn uniquement. L'humain valide et publie manuellement — l'agent génère, l'humain décide.

**Pourquoi** : Sarani a 1 000 abonnés LinkedIn (base existante) et un potentiel de croissance organique fort sur ce canal (cible Sophie = Head of Marketing, présente sur LinkedIn). Produire 3-4 posts LinkedIn par semaine + un calendrier éditorial mensuel = 3-4h de travail. Le Social IA réduit cela à 45 minutes de validation.

**Douleur quotidienne résolue** : "Je dois publier sur LinkedIn 3x/semaine pour garder notre visibilité mais je n'ai pas le temps de rédiger. Le Social IA me propose le calendrier du mois, les sujets, les formats, et le texte complet. Je lis, j'ajuste 2-3 mots, je publie. Fait en 15 minutes au lieu de 3 heures."

---

### 8.2 User stories

**US-SOC-01 — Génération de calendrier éditorial mensuel**
```
Given : l'opérateur ouvre le Social IA
  And : sélectionne le mois cible et la fréquence souhaitée (ex: 3 posts/semaine)
When : il soumet le formulaire
Then : le Social IA génère un calendrier éditorial complet pour le mois
  And : chaque post a une date, un sujet, un format (texte long / carrousel / vidéo / image), et un angle
  And : les sujets sont variés (proof cases, thought leadership, team, behind the scenes, offer)
  And : le calendrier est affiché dans un tableau et téléchargeable en .csv ou .docx
```

**US-SOC-02 — Génération de post individuel**
```
Given : l'opérateur sélectionne un sujet (libre ou depuis le calendrier)
  And : précise le format et l'angle (optionnel)
When : il soumet le formulaire
Then : le Social IA génère le texte complet du post LinkedIn
  And : le post respecte le ton Sarani (Assured, Direct, Warm — brand-voice.md)
  And : le post inclut : hook première ligne, corps, CTA, hashtags suggérés
  And : le texte est affiché dans l'UI, éditable, et copiable en 1 clic
```

**US-SOC-03 — Validation et queue de publication**
```
Given : un post est généré et validé par l'opérateur
When : il clique "Add to queue"
Then : le post est sauvegardé avec sa date de publication prévue
  And : la queue est visible dans un planning mensuel
  And : l'opérateur publie manuellement au moment prévu (pas de publication automatique v1)
  And : chaque post peut être marqué "Published" après publication manuelle
```

**US-SOC-04 — Réutilisation des case studies**
```
Given : des case studies Sarani sont disponibles (TikTok, Sony, GEODIS, Adidas...)
When : l'opérateur demande un post sur un client
Then : le Social IA utilise les données réelles du case study (chiffres, contexte, résultats)
  And : aucune donnée inventée -- si les chiffres manquent, ils sont demandés avant génération
  And : les preuves chiffrées sont mises en avant (tone: Evidence-first)
```

---

### 8.3 Interface — Wireframe ASCII

**Écran principal : Content Planner**

```
+-------------------------------------------------------------+
| SOCIAL IA (LinkedIn)                          [History]     |
+-------------------------------------------------------------+
|  [Generate calendar]  [New post]  [Queue (3)]               |
+-------------------------------------------------------------+
| CONTENT QUEUE -- April 2026                                 |
+-------------------------------------------------------------+
| Date    | Subject                | Format    | Status       |
|---------|-----------------------|-----------|--------------|
| Apr 1   | TikTok 1500+ vids/mth  | Long text | Draft        |
| Apr 3   | D+1 promise -- how?    | Carousel  | Validated    |
| Apr 5   | Team spotlight: Tokyo  | Image     | Published    |
| Apr 8   | Sony Black Friday case | Long text | Draft        |
+-------------------------------------------------------------+
|                          [+ New post]  [Generate calendar]  |
+-------------------------------------------------------------+
```

**Formulaire : New post**

```
+-------------------------------------------------------------+
| NEW LINKEDIN POST                                           |
+-------------------------------------------------------------+
|                                                             |
|  Topic / Angle                                              |
|  +--------------------------------------------------+      |
|  | What is this post about?                         |      |
|  | ex: Sony Black Friday case study, D+1 promise... |      |
|  +--------------------------------------------------+      |
|                                                             |
|  Format                                                     |
|  (o) Long text (1000-1500 chars)                           |
|  ( ) Short text (under 500 chars)                          |
|  ( ) Carousel script (text per slide)                      |
|                                                             |
|  Tone emphasis                                              |
|  [Evidence-first v]  (default -- can override)             |
|                                                             |
|  Scheduled date                                             |
|  [Date picker]                                              |
|                                                             |
|                              [Generate post ->]             |
|                                                             |
+-------------------------------------------------------------+
| OUTPUT                                                      |
+-------------------------------------------------------------+
|  Hook: "TikTok needed 1,500+ videos edited per month..."   |
|  [Full post text -- editable]                              |
|                                                             |
|  Suggested hashtags: #ContentMarketing #AgenceCreative...  |
|                                                             |
|  Characters: 1,243 / 3,000                                 |
|                                                             |
|  [Copy to clipboard]  [Add to queue]  [Regenerate]         |
+-------------------------------------------------------------+
```

---

### 8.4 Workflow détaillé

1. L'opérateur ouvre le Social IA
2. Option A : génère un calendrier mensuel → valide les sujets proposés
3. Option B : génère directement un post individuel sur un sujet précis
4. Le Social IA accède aux case studies Sarani (docs/copy/case-studies-content.md) pour les preuves
5. Génération du texte respectant brand-voice.md (Assured, Direct, Warm, Evidence-first)
6. L'opérateur lit, modifie si nécessaire
7. "Add to queue" : le post est planifié avec sa date
8. Publication manuelle à la date prévue (v1 = pas d'API LinkedIn)
9. Marqué "Published" après publication

---

### 8.5 Inputs / Outputs

| Input | Type | Obligatoire |
|-------|------|-------------|
| Topic / Angle | textarea | Oui |
| Format | radio | Non (défaut Long text) |
| Tone emphasis | select | Non (défaut Evidence-first) |
| Scheduled date | date | Non |
| Données case study | auto-injectées | Non (si client sélectionné) |

| Output | Format | Description |
|--------|--------|-------------|
| Texte du post | texte affiché (éditable) | Hook + corps + CTA + hashtags |
| Calendrier éditorial | tableau affiché + .csv ou .docx | Planning mensuel complet |
| Queue entry | BDD | Post planifié avec date |
| AgentOutput entry | jsonb | Historique sauvegardé |

---

### 8.6 Mémoire client (Sarani — pas de contexte client ici)

Cet agent travaille pour le compte de Sarani elle-même (pas pour un client). La mémoire porte sur :

| Donnée mémorisée | Source | Usage |
|------------------|--------|-------|
| Ton de marque Sarani | brand-voice.md | Injecté dans chaque requête |
| Case studies publiés | docs/copy/case-studies-content.md | Preuves factuelles pour les posts |
| Posts générés et validés | Queue BDD | Cohérence éditoriale, pas de répétition |
| Posts publiés | Queue BDD (statut Published) | Historique pour varier les sujets |

---

### 8.7 Interactions inter-agents

| Agent | Type | Déclencheur |
|-------|------|-------------|
| PM IA | Réception de sous-brief | PM IA dispatche un besoin contenu social |
| SEO IA | Coordination possible | Sujets blog réutilisés en posts LinkedIn |

---

### 8.8 Stack technique

| Élément | Choix | Justification |
|---------|-------|---------------|
| Modèle IA | Claude Sonnet 4.5 | Génération de contenu court-moyen, ton à respecter. Sonnet suffit. |
| System prompt | Basé sur brand-voice.md + guidelines LinkedIn | Ton Sarani verrouillé, format LinkedIn respecté |
| Injection case studies | Contexte documentaire statique | case-studies-content.md injecté comme référence |
| LinkedIn API | Non utilisée en v1 | Publication manuelle. API LinkedIn v2 pour v2 (planification automatique). |
| Export calendrier | .csv + .docx | Compatibilité avec les outils de l'équipe |
| Coût estimé | ~$0.006/requête | [HYPOTHÈSE : voir section 2.4] |

---

### 8.9 Edge cases

| Situation | Comportement attendu |
|-----------|---------------------|
| Sujet trop sensible (ex: commenter une actualité négative du secteur) | Social IA génère mais ajoute une note : "This post references a sensitive topic. Review carefully before publishing." |
| Données case study manquantes (chiffres non disponibles) | Social IA demande les chiffres avant de générer. Ne fabrique pas de métriques. |
| Calendrier avec trop de répétition de sujets | Algorithme de diversification : détecte les sujets des 30 derniers jours, évite les doublons |
| Tone drift (post trop commercial) | Vérification automatique : si le post contient plus de 2 mentions de prix ou offres, avertissement "This post may feel too promotional for organic LinkedIn." |
| Extension à Instagram ou Twitter en v2 | [HYPOTHÈSE : architecture modulaire — chaque réseau = un module de formatting. Le contenu est généré une fois et reformaté par réseau. A spécifier en v2.] |

---

## 9. Agent 7 — SEO IA

### 9.1 Persona utilisateur

**Qui l'utilise** : Thomas et la responsable des opérations.

**Quand** : Pour alimenter le blog Sarani, améliorer le référencement du site, et produire du contenu qui attire les Sophie en phase de recherche ("creative agency enterprise", "agence créative international", etc.).

**Pourquoi** : Sarani part de zéro en SEO (aucune stratégie en place, trafic organique non mesuré). Le blog est le levier principal d'acquisition organique à 6-12 mois. Produire un article SEO de qualité (1 500-2 500 mots, optimisé) prend 4-6h. Le SEO IA réduit cela à 30 minutes de validation.

**Douleur quotidienne résolue** : "Je sais que je dois publier des articles SEO pour générer du trafic mais personne n'a le temps. Le SEO IA me propose les sujets du mois basés sur les mots-clés, rédige les articles optimisés, et je n'ai qu'à valider. En 30 minutes par article au lieu de 5 heures."

---

### 9.2 User stories

**US-SEO-01 — Proposition de sujets d'articles**
```
Given : l'opérateur ouvre le SEO IA
  And : indique la période (mois cible) et le volume de publications souhaité
When : il soumet le formulaire
Then : le SEO IA propose 5-10 sujets d'articles
  And : chaque sujet inclut : titre suggéré, mot-clé principal, volume de recherche estimé [HYPOTHESE], intention de recherche, angle différenciant
  And : les sujets sont alignés avec le positionnement Sarani (enterprise, D+1, international)
  And : l'opérateur valide ou rejette chaque sujet
```

**US-SEO-02 — Rédaction d'article optimisé**
```
Given : un sujet est validé par l'opérateur
  And : le mot-clé principal et les mots-clés secondaires sont confirmés
When : l'opérateur lance la rédaction
Then : le SEO IA rédige un article complet (1,500-2,500 mots)
  And : le titre respecte la structure SEO (H1, H2, H3 balisés)
  And : le mot-clé principal apparaît dans le titre, le premier paragraphe, et naturellement dans le corps
  And : l'article inclut : introduction avec hook, corps argumenté, conclusion avec CTA vers sarani.studio
  And : le texte respecte le ton Sarani (brand-voice.md)
  And : l'article est affiché dans l'UI et exportable en .md ou .docx
```

**US-SEO-03 — Optimisation méta-données**
```
Given : un article est rédigé
When : l'opérateur demande l'optimisation SEO
Then : le SEO IA génère le meta title (50-60 chars), la meta description (150-160 chars), le slug URL
  And : les métadonnées sont vérifiées en nombre de caractères et affichées dans un preview simulant un résultat Google
  And : les métadonnées sont exportables pour intégration dans le CMS
```

**US-SEO-04 — Audit SEO rapide d'une page existante**
```
Given : l'opérateur colle l'URL ou le contenu d'une page existante du site Sarani
When : il soumet pour audit
Then : le SEO IA identifie les opportunités d'optimisation (title, density, structure H, inbound links manquants, longueur)
  And : les recommandations sont classées par priorité (P1 bloquant, P2 important, P3 nice-to-have)
```

---

### 9.3 Interface — Wireframe ASCII

**Écran principal : SEO Content**

```
+-------------------------------------------------------------+
| SEO IA                          [Article drafts] [Audit]   |
+-------------------------------------------------------------+
|  [Suggest topics]   [Write article]   [Optimize meta]      |
+-------------------------------------------------------------+
| SUGGEST TOPICS                                              |
+-------------------------------------------------------------+
|                                                             |
|  Month target          Posts per month                      |
|  [April 2026 v]        [4 v]                               |
|                                                             |
|  Focus (optional)                                           |
|  [enterprise creative agency, D+1 delivery...]             |
|                                                             |
|                          [Suggest topics ->]                |
|                                                             |
+-------------------------------------------------------------+
| SUGGESTED TOPICS                                            |
+-------------------------------------------------------------+
| # | Title (suggested)                  | Keyword     | OK? |
|---|------------------------------------|-----------  |----|
| 1 | How to brief a creative agency...  | creative... | [v] |
| 2 | Enterprise design at startup speed | enterprise  | [v] |
| 3 | 5 signs your agency is too slow    | agency slow | [ ] |
| 4 | Black Friday creative: case study  | black friday | [v] |
+-------------------------------------------------------------+
|                         [Write validated topics ->]         |
+-------------------------------------------------------------+
```

**Formulaire : Write article**

```
+-------------------------------------------------------------+
| WRITE ARTICLE                                               |
+-------------------------------------------------------------+
|                                                             |
|  Title (H1)                                                 |
|  [How to brief a creative agency for D+1 delivery]         |
|                                                             |
|  Primary keyword                                            |
|  [brief creative agency]                                    |
|                                                             |
|  Secondary keywords (optional, comma-separated)            |
|  [creative agency brief, agency briefing template...]       |
|                                                             |
|  Target length                                              |
|  (o) 1,500 words   ( ) 2,000 words   ( ) 2,500 words       |
|                                                             |
|  Include CTA to                                             |
|  (o) Contact form  ( ) Pricing page  ( ) Case studies      |
|                                                             |
|                            [Write article ->]               |
+-------------------------------------------------------------+
```

---

### 9.4 Workflow détaillé

1. L'opérateur ouvre le SEO IA et demande des suggestions de sujets
2. Le SEO IA s'appuie sur le positionnement Sarani + les mots-clés identifiés dans docs/seo/
3. L'opérateur valide les sujets retenus
4. Pour chaque sujet validé : rédaction d'un article complet
5. Génération automatique des métadonnées SEO (meta title, description, slug)
6. Preview de l'article dans l'UI
7. Export en .md (pour intégration directe Next.js) ou .docx
8. Publication dans le CMS/blog par l'opérateur (étape manuelle)
9. Possibilité d'audit SEO sur articles existants

---

### 9.5 Inputs / Outputs

| Input | Type | Obligatoire |
|-------|------|-------------|
| Mois cible | select | Oui (pour suggestions) |
| Volume articles | select | Non (défaut 4/mois) |
| Titre (H1) | text | Oui (pour rédaction) |
| Mot-clé principal | text | Oui |
| Mots-clés secondaires | text (CSV) | Non |
| Longueur cible | radio | Non (défaut 1 500 mots) |
| CTA cible | radio | Non (défaut Contact form) |

| Output | Format | Description |
|--------|--------|-------------|
| Suggestions de sujets | tableau affiché | 5-10 sujets avec metadata SEO |
| Article complet | texte structuré + .md ou .docx | Article prêt à publier |
| Meta title / description / slug | texte + preview | Métadonnées SEO |
| Rapport d'audit | liste priorisée | Recommandations P1/P2/P3 |
| AgentOutput entry | jsonb | Historique sauvegardé |

---

### 9.6 Mémoire agent (Sarani — pas de contexte client)

| Donnée mémorisée | Source | Usage |
|------------------|--------|-------|
| Positionnement Sarani | brand-platform.md | Alignement éditorial |
| Ton de marque | brand-voice.md | Registre des articles |
| Mots-clés existants | docs/seo/keyword-map.md (si disponible) | Base de travail |
| Articles publiés | Queue BDD (statut Published) | Éviter les doublons, construire le maillage |
| Metadata templates | docs/seo/metadata-templates.md | Format SEO respecté |

---

### 9.7 Interactions inter-agents

| Agent | Type | Déclencheur |
|-------|------|-------------|
| PM IA | Réception de sous-brief | PM IA dispatche un besoin SEO/blog |
| Social IA | Coordination possible | Article de blog réutilisé en post LinkedIn |

---

### 9.8 Stack technique

| Élément | Choix | Justification |
|---------|-------|---------------|
| Modèle IA | Claude Sonnet 4.5 | Rédaction longue forme structurée. Sonnet produit des articles de qualité éditoriale avec bonne gestion du contexte long. |
| System prompt | Basé sur @seo agent existant + brand-voice.md | Ton Sarani + contraintes SEO techniques |
| Injection contexte | brand-platform.md + brand-voice.md + keyword-map.md | Articles alignés stratégie |
| Export | .md (Next.js ready) + .docx | Deux formats selon le workflow |
| Coût estimé | ~$0.02/requête (article 2K mots) | [HYPOTHÈSE : voir section 2.4] |

---

### 9.9 Edge cases

| Situation | Comportement attendu |
|-----------|---------------------|
| Mot-clé trop concurrentiel (ex: "creative agency") | SEO IA signale : "This keyword has very high competition. Consider a long-tail variant." Propose 3 alternatives. |
| Doublon avec un article déjà publié | Détection et avertissement : "A similar article was published on [date]. Consider a different angle or an update of the existing article." |
| Article produit sans keyword-map disponible | SEO IA travaille sur base du positionnement Sarani uniquement. Note : "No keyword map found — topics based on brand positioning only. Run a keyword research first for better SEO impact." |
| Longueur demandée irréaliste (ex: 10 000 mots) | Limitée à 3 000 mots max en v1. Message : "Maximum article length is 3,000 words. Consider splitting into a series." |
| CTA vers une page non existante | Vérification : si la page cible n'existe pas dans le site, avertissement avant génération. |

---

## 10. Hypotheses a valider

> Ce bloc liste toutes les hypothèses non confirmées de ce document. Chaque hypothèse doit être validée par Thomas ou la responsable des opérations avant le début du développement.

| # | Hypothèse | Agent(s) concerné(s) | Impact si invalide | Responsable validation |
|---|-----------|----------------------|-------------------|------------------------|
| H-01 | Coûts IA estimés à ~$17/mois pour 2 utilisateurs (voir section 2.4) | Tous | Budget IA à revoir | Thomas |
| H-02 | GPT-Image-1 (OpenAI) est le meilleur modèle pour la génération d'images brand-constrained | Designer IA | Choix API image à revalider | Thomas + test pratique |
| H-03 | Les contrats Sarani (SOW, UGC, NDA, Freelance) sont disponibles en format .docx avec variables balisées | Legal IA | Blocker -- Legal IA ne fonctionne pas sans templates | Thomas |
| H-04 | La segmentation en chunks de 8K tokens pour les documents longs fonctionne sans perte de cohérence | Translator | Qualité traduction dégradée sur longs documents | @fullstack + test |
| H-05 | Google Slides API peut être utilisée pour exporter des slides en format editable (v2 Designer IA) | Designer IA v2 | Export slides limité à PDF/PNG en v1 | @fullstack |
| H-06 | Supabase Storage ou Cloudflare R2 comme solution de stockage des fichiers générés | Designer IA, Legal IA | Stockage fichiers à redécider avec @fullstack | @fullstack |
| H-07 | ClickUp API v2 permet la création de tâches avec le niveau de détail requis par le PM IA | PM IA | Sync ClickUp à respec si API limitée | Thomas (tester avec ses credentials) |
| H-08 | Data Processing Agreement avec Anthropic suffisant pour traiter des briefs clients potentiellement sensibles | Tous (données client) | Risque juridique -- à valider avec conseil avant go-live | Thomas + legal counsel |
| H-09 | La keyword-map SEO sera disponible avant le démarrage du SEO IA (docs/seo/keyword-map.md non encore produit) | SEO IA | SEO IA fonctionne en mode dégradé (positionnement Sarani uniquement) | @seo agent |
| H-10 | 35 experts Sarani utilisent le back-office quotidiennement (vs 2 utilisateurs en v1) | Tous | Coûts IA x5-10 si adoption large | Thomas (décision de rollout) |

---

## Handoff

---
**Handoff -> @agent-factory**
- Fichiers produits : /home/user/Sarani/docs/backoffice/ai-team-specs.md
- Décisions prises :
  - 7 agents spécifiés avec personas, user stories Given/When/Then, wireframes ASCII, workflows, inputs/outputs, mémoire client, stack technique et edge cases
  - PM IA = seul orchestrateur, point d'entrée unique pour le dispatch
  - Mémoire par client via fiche client centralisée (brand book, glossaire, legal, historique)
  - Formulaires structurés pour les tâches récurrentes + chat libre en complément
  - Output format standard : téléchargeable + BDD + sync ClickUp optionnelle
  - Modèles IA : Claude Sonnet 4.5 pour la majorité, Claude Opus 4 pour le Creative Strategist, GPT-Image-1 [HYPOTHÈSE] pour le Designer IA
  - Auth simple password partagé (v1) -- décision validée dans project-context.md
  - Budget IA estimé ~$17/mois pour usage modéré (2 utilisateurs) -- [HYPOTHÈSE H-01]
- Points d'attention :
  - H-03 est un hard blocker pour Legal IA : Thomas doit fournir les templates .docx avant le dev
  - H-08 (DPA Anthropic) est un risque juridique à adresser avant go-live -- voir legal-audit.md
  - H-07 (ClickUp API) à tester avec les credentials Thomas avant d'intégrer la sync
  - Le Designer IA nécessite un choix de modèle image à valider sur des tests pratiques (H-02)
  - La section "Client Brand Assets" de la fiche client est critique pour le Designer IA -- son absence dégrade significativement la qualité des outputs
---

**Handoff -> @fullstack**
- Fichiers produits : /home/user/Sarani/docs/backoffice/ai-team-specs.md
- Décisions prises :
  - Architecture : route /admin dans l'app Next.js existante (validé project-context.md)
  - Auth : simple password partagé (middleware Next.js sur /admin)
  - BDD : nouvelles tables Client, AgentOutput, ClientGlossaryEntry, ContractTemplate (voir section 2.2)
  - APIs tierces : Anthropic (Claude Sonnet + Opus), OpenAI [HYPOTHÈSE image], ClickUp API v2
  - Export fichiers : mammoth.js (DOCX parsing), docx.js (DOCX generation), PDF generation [à choisir]
  - Stockage fichiers générés : Supabase Storage ou Cloudflare R2 [HYPOTHÈSE H-06 -- à décider]
  - 7 interfaces à développer : une par agent + la fiche client + le tracker projets du PM IA
- Points d'attention :
  - La fiche client (section 2.1) est le composant fondation -- à développer en premier avant les agents
  - Le PM IA (Agent 1) est le composant le plus complexe à cause de l'orchestration multi-agents
  - Le Legal IA (Agent 5) est bloqué par H-03 (templates .docx manquants) -- développer l'interface en premier, intégrer les templates quand disponibles
  - Segmentation chunks pour Translator (H-04) à tester en conditions réelles
  - Tous les outputs IA doivent être sauvegardés en BDD avant d'être affichés (pas de perte si timeout réseau)
---

---
