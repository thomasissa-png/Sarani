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
