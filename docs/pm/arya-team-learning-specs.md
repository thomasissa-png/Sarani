# Arya — Team Learning + AI Templates + Workflow Coverage

*Produit par @product-manager — 2026-03-31*

---

## Section 1 : Team Knowledge Base (équipe Sarani @sarani.studio)

### Concept

En plus des clients, Arya connaît son ÉQUIPE — les 35 experts @sarani.studio. Pour chaque membre, elle accumule des connaissances sur leur style, forces, axes d'amélioration, et préférences.

**Règle de pertinence** : chaque entrée doit répondre à "est-ce que cette info change la façon dont on assigne ou briefe ce membre ?" Si non, on ne l'enregistre pas.

### Data Model

```sql
CREATE TABLE IF NOT EXISTS team_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_email VARCHAR(255) NOT NULL,
  team_member_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL, -- 'designer', 'copywriter', 'pm', 'video_producer', 'translator', 'developer', 'art_director'
  category VARCHAR(50) NOT NULL, -- 'style', 'strength', 'improvement', 'preference', 'availability', 'language', 'expertise'
  knowledge_text TEXT NOT NULL,
  source VARCHAR(500), -- 'email_scan', 'pm_observation', 'client_feedback', 'project_xyz'
  confidence VARCHAR(20) DEFAULT 'observed', -- 'confirmed', 'observed', 'hypothesized'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tk_email ON team_knowledge(team_member_email);
CREATE INDEX IF NOT EXISTS idx_tk_role ON team_knowledge(role);
CREATE INDEX IF NOT EXISTS idx_tk_category ON team_knowledge(category);
```

### API Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/admin/team/knowledge | Liste (filtres : role, category, member_email) |
| POST | /api/admin/team/knowledge | Ajouter une connaissance |
| PATCH | /api/admin/team/knowledge/[id] | Modifier/désactiver |
| GET | /api/admin/team/knowledge/prompt?member=email | Bloc injectable pour les prompts |

### Bootstrap via Email Scan

1. Fetch paginé de tous les emails envoyés/reçus par @sarani.studio (Graph API `$filter=from/emailAddress/address eq '...'`)
2. Grouper par expéditeur @sarani.studio
3. Pour chaque membre : Claude analyse les patterns de communication
   - Ton habituel (formel/casual, longueur des emails, emojis)
   - Domaines de compétence (projets assignés, types de livrables)
   - Réactivité (temps de réponse moyen)
   - Langues utilisées
4. Stocker dans `team_knowledge` avec confidence "observed", source "email_scan"

### Usage par Arya

- **Assignation** : quand Arya doit recommander un expert pour un projet, elle consulte le team knowledge (forces, disponibilité, expertise sectorielle)
- **Briefing** : quand Arya rédige un brief pour Ahmed, elle adapte le format à ses préférences
- **Revue** : quand Arya review un livrable de Maria, elle connaît ses forces et ses points d'attention habituels

---

## Section 2 : AI Team Templates complets (12 templates)

### Templates existants (6)

Les templates dans `src/lib/teams/templates.ts` : social_media, seo_content, brand_identity, video_production, translation, ad_campaign.

### Templates à ajouter (6)

| Template | Famille | Agents séquencés | Livrables par step | Quality Gates |
|----------|---------|-----------------|-------------------|---------------|
| graphic_design | Design graphique | Creative Strategist → Designer → QA | Brief créatif → Assets visuels → Rapport qualité | DS-1 à DS-6 |
| marketing_campaign | Marketing 360 | Creative Strategist → Copywriter → Designer → Social → SEO → QA | Stratégie → Copy → Visuels → Posts sociaux → Contenu SEO → Validation | SM + SEO combinés |
| event_communication | Événementiel | Creative Strategist → Copywriter → Designer → Presentation → QA | Concept → Textes → Visuels → Deck présentation → Validation | DS-1 à DS-6 |
| email_marketing | Email marketing | Creative Strategist → Copywriter → Email Drafter → QA | Stratégie → Séquence copy → Emails HTML → Validation | SM-1, SM-2, SM-6, SM-7 |
| presentation | Présentation | Creative Strategist → Copywriter → Presentation → QA | Positionnement → Contenu slides → Deck finalisé → Validation | DS-1 à DS-6 |
| legal_review | Juridique | Legal → Proofreader → QA | Analyse juridique → Relecture → Validation | CU-1 à CU-3 |

### Détail par template

#### graphic_design
- **Step 1 — Creative Strategist** : brief créatif avec direction artistique, références visuelles, palette, ton
- **Step 2 — Designer** : production des assets (bannières, visuels, déclinaisons) selon le brief
- **Step 3 — QA** : vérification dimensions, formats, brand compliance via gates DS-1 à DS-6
- **Use case Sarani** : bannières Sony, visuels GEODIS, assets Adidas

#### marketing_campaign
- **Step 1 — Creative Strategist** : stratégie de campagne, persona targeting, messages clés
- **Step 2 — Copywriter** : textes de campagne (headlines, body, CTAs)
- **Step 3 — Designer** : visuels de campagne par canal
- **Step 4 — Social** : déclinaison par plateforme (LinkedIn, Instagram, TikTok)
- **Step 5 — SEO** : contenu optimisé si canal search inclus
- **Step 6 — QA** : revue complète multi-canal
- **Use case Sarani** : campagnes lancement produit, campagnes saisonnières

#### event_communication
- **Step 1 — Creative Strategist** : concept événementiel, messages, identité visuelle de l'event
- **Step 2 — Copywriter** : textes (invitations, programme, signalétique, communiqués)
- **Step 3 — Designer** : visuels (affiches, bannières web, badges, kakémonos)
- **Step 4 — Presentation** : deck de présentation pour l'événement
- **Step 5 — QA** : cohérence globale
- **Use case Sarani** : events PICO XR, conférences France Chimie

#### email_marketing
- **Step 1 — Creative Strategist** : stratégie séquence, segmentation, objectifs par email
- **Step 2 — Copywriter** : sujets, body, CTAs par email de la séquence
- **Step 3 — Email Drafter** : mise en forme HTML, personnalisation, variables
- **Step 4 — QA** : vérification ton, CTA, placeholders, personnalisation
- **Use case Sarani** : nurturing prospects, onboarding clients, newsletters

#### presentation
- **Step 1 — Creative Strategist** : angle, structure, messages clés du deck
- **Step 2 — Copywriter** : contenu texte de chaque slide
- **Step 3 — Presentation** : assemblage deck final avec visuels et data
- **Step 4 — QA** : cohérence, typos, alignement brand
- **Use case Sarani** : pitchs commerciaux, rapports clients, présentations de résultats

#### legal_review
- **Step 1 — Legal** : analyse juridique (contrats, CGV, conformité RGPD, droits PI)
- **Step 2 — Proofreader** : relecture juridique + linguistique
- **Step 3 — QA** : validation finale
- **Use case Sarani** : contrats-cadres grands comptes, NDA, CGV internationales

---

## Section 3 : Workflow Coverage Validation

### Protocoles existants (8)

| Protocole | Cas d'usage | Couvert ? |
|-----------|------------|-----------|
| PROTO-EMAIL-INTAKE | Email brief → projet créé | ✅ |
| PROTO-CLIENT-RETURN | Retour client → projet existant mis à jour | ✅ |
| PROTO-CLIENT-REPLY | Réponse email → brouillon Outlook | ✅ |
| PROTO-ASSET-REVIEW | Livrables uploadés → revue + statut ClickUp | ✅ |
| PROTO-QUOTE | Demande devis → PDF premium | ✅ |
| PROTO-PROJECT-FOLLOWUP | Scan quotidien → alertes + relances | ✅ |
| PROTO-AI-TEAM | Brief IA → livrables complets via équipe IA | ✅ |
| PROTO-PITCH | Pitch/présentation → deck + email | ✅ |

### Protocoles manquants (3)

#### PROTO-CLIENT-ONBOARDING
**Trigger** : nouveau client signé ou premier projet avec un nouveau client
**Étapes** :
1. Créer la fiche client dans le back-office (nom, domaine, contacts, secteur)
2. Créer le Space ClickUp (ou sous-dossier dans "Other Customers")
3. Créer le dossier SharePoint client (`Documents/03. Customers/[Client]/`)
4. Initialiser le tracker Excel (nouvelle ligne ou nouveau fichier)
5. Demander les brand guidelines au client (logo, charte, fonts, couleurs)
6. Initialiser le client_knowledge avec les premières observations
7. ⏸️ VALIDATION PM — "Fiche client créée. Brand guidelines reçues ?"
**Output** : fiche client complète + espaces de travail prêts

#### PROTO-PROJECT-CLOSE
**Trigger** : projet livré et validé par le client
**Étapes** :
1. Vérifier que tous les livrables sont uploadés sur SharePoint
2. Mettre à jour le statut ClickUp → "Closed" ou "Invoiced"
3. Générer ou synchroniser la facture Evoliz (si applicable)
4. Mettre à jour le tracker Excel (statut, montant facturé)
5. Extraire les learnings du projet (client_knowledge : ce qui a marché, feedbacks)
6. ⏸️ VALIDATION PM — "Projet clôturé. Facture envoyée ?"
**Output** : projet archivé + facture + learnings enregistrés

#### PROTO-ESCALATION
**Trigger** : deadline impossible, réclamation client, conflit, situation hors protocole
**Étapes** :
1. Arya identifie la situation d'escalade (deadline <2h sur un projet complexe, client mécontent, contradiction brief)
2. Préparer un résumé de la situation avec contexte complet (emails, historique, enjeux)
3. Escalade immédiate à @moi (proxy Thomas)
4. @moi décide de l'action → Arya exécute
5. Documenter la résolution dans client_knowledge + arya_learnings
**Output** : situation résolue + learning enregistré

---

## Handoff

→ **@fullstack** : implémenter team_knowledge (migration + API + loader) + 6 nouveaux templates dans templates.ts + 3 protocoles manquants dans arya-protocols.md
→ **@ia** : review du team knowledge loader pour usage en conditions réelles
→ **@qa** : tests sur les nouvelles routes et templates
