# Audit Briefs, Feedbacks & Draft Replies — Arya PM Perspective

**Date** : 2026-04-01
**Auditeur** : Arya (client-manager)
**Scope** : 6 fichiers — brief-extractor.ts, CreateBriefModal.tsx, classify/route.ts, lark/route.ts, poll-emails/route.ts, ProjectActionModal.tsx

---

## 1. Scores par output

| Output | Score | Verdict |
|---|---|---|
| **Brief** (brief-extractor + buildDefaultBrief) | 5/10 | Ameliorations necessaires |
| **Feedback** (ProjectActionModal create_feedback) | 3/10 | Insuffisant |
| **Draft Reply** (classification prompts) | 6/10 | Ameliorations necessaires |

**Verdict global : Ameliorations necessaires.** Le feedback est le point le plus faible — il n'est pas transforme du tout, on colle le draftReply ou le suggestedAction en commentaire ClickUp, ce qui n'est pas un vrai feedback ops.

---

## 2. Brief (brief-extractor.ts + buildDefaultBrief) — 5/10

### Ce qui va
- Structure en 6 sections avec emojis Sarani (conforme au standard)
- Instruction "never invent data" — bien
- Extraction du project_type (design/video/translation/social) — utile pour le routing
- Fallback "To be confirmed" / "To be provided" quand les donnees manquent — honnete

### Ce qui ne va pas

**P0 — Le brief ne parle pas au graphiste.** Le prompt extrait et reformate l'email client, mais il ne TRADUIT PAS en langage ops. Un graphiste qui recoit "brief_body" recoit du copier-coller d'email, pas un brief actionnable. Il manque :
- **Dimensions / formats exacts** : le prompt ne demande pas d'extraire les specs techniques (1920x1080, 16:9, A4, etc.)
- **Quantite de livrables** : combien de bannieres, combien de slides, combien de videos ?
- **Deadline** : aucun champ deadline dans le schema BriefExtractionResult. Le graphiste ne sait pas QUAND il doit livrer
- **Langue(s) des livrables** : pas de champ langue de sortie (EN, FR, les deux ?)
- **Reference visuelle** : le prompt ne demande pas d'extraire les liens vers des references ou mood boards mentionnes dans l'email

**P1 — buildDefaultBrief est un squelette vide.** Quand le PM clique "Create Brief" sans auto-extraction, il recoit le sujet de l'email comme "Introduction" et le bodyPreview brut comme "Brief". C'est du remplissage, pas un brief. Le PM doit tout reecrire.

**P1 — Pas de section "Deadline" explicite.** La deadline est le champ #1 qu'un graphiste regarde. Elle n'apparait ni dans le schema, ni dans le template.

### Recommandation

Ajouter au schema : `deadline`, `dimensions`, `quantity`, `output_languages`, `reference_links`. Modifier le system prompt pour instruire le LLM a extraire ces champs et a reformuler le brief en langage ops (pas en copier-coller client). Voir prompt rewrite ci-dessous.

---

## 3. Feedback (ProjectActionModal create_feedback) — 3/10

### Ce qui va
- Le workflow poste un commentaire sur la tache ClickUp ET reouvre la tache — bon reflexe ops
- Le champ est editable avant envoi — le PM peut corriger

### Ce qui ne va pas

**P0 — Le commentaire pre-rempli est le draftReply ou le suggestedAction.** C'est un texte destine au CLIENT, pas a l'equipe ops. Un graphiste qui lit "Hi Marc, thank you for your feedback, we'll take care of it right away" en commentaire ClickUp ne sait pas quoi faire.

**P0 — Aucune structuration du feedback.** Un bon feedback ClickUp doit contenir :
1. Quel livrable est concerne (nom du fichier, version, lien SharePoint)
2. Liste des modifications demandees, point par point
3. Ce qui est valide / ce qui ne doit PAS changer
4. Priorite et deadline de la revision

**P1 — Pas de traduction de la frustration client.** Si Sophie ecrit "I'm really disappointed, the colors are completely off and the logo is too small", le feedback ClickUp doit dire : "1) Ajuster les couleurs — voir palette dans brand guidelines page 3. 2) Agrandir le logo — ratio minimum 15% de la surface." Pas un copier-coller de la frustration.

### Recommandation

Creer un prompt LLM dedie (type `feedback-extractor.ts`) qui transforme l'email client en feedback ops structure. Le champ pre-rempli dans le modal doit etre le RESULTAT de cette extraction, pas le draftReply.

---

## 4. Draft Reply (classification prompts) — 6/10

### Ce qui va
- Instruction de matcher la langue du client — bien
- Format greeting + body + closing — professionnel
- Instruction "never include analysis phrases" — evite le meta-langage
- Detection de langue ISO 639-1 — utile
- Signing "The Sarani Team" — coherent (meme si on prefere le prenom du PM, c'est acceptable en auto-draft)

### Ce qui ne va pas

**P1 — Le closing signe "The Sarani Team" au lieu du prenom du PM.** Le ton Sarani impose de signer avec le nom de l'expert qui gere le projet. En mode auto-draft c'est acceptable comme placeholder, mais le prompt devrait indiquer `[PM_NAME]` pour que le PM remplace avant envoi.

**P1 — Le ton est correct mais generique.** "2-3 sentences directly addressing the email content" produit des reponses fonctionnelles mais sans la chaleur Sarani. Le prompt ne mentionne pas le ton Sarani (dynamique, cool, disponible). Resultat : des reponses polies mais interchangeables avec n'importe quelle agence.

**P2 — Le prompt ne previent pas les sur-engagements.** Le LLM peut generer "We'll have this ready by tomorrow" sans savoir si c'est tenable. Il manque une instruction du type : "Never commit to specific deadlines or deliverables not confirmed by the PM."

**P2 — Difference entre les 3 prompts de classification.** Le prompt dans `classify/route.ts` et `poll-emails/route.ts` sont quasi identiques mais pas strictement les memes. Ca cree un risque de divergence. Un seul prompt centralise serait plus fiable.

### Recommandation

Centraliser le prompt de classification dans un fichier unique (comme brief-extractor.ts). Ajouter les instructions de ton Sarani et l'interdiction de s'engager sur des deadlines.

---

## 5. Simulations — Email client reel vs output actuel vs output cible

### Simulation 1 : Sony demande 50 bannieres Black Friday

**Email client :**
> Subject: Black Friday banners — urgent
> Hi Thomas, we need 50 banners for our Black Friday campaign. 3 sizes: 1200x628, 1080x1080, 1920x1080. EN and FR versions. Product shots attached. Deadline: tomorrow 6pm CET. Can you handle this? — Marc, Sony Music France

**Brief actuel (brief-extractor.ts) :**
```
client_name: "Sony"
project_title: "Black Friday banners urgent"
brief_body:
  "Introduction: Sony needs 50 banners for Black Friday campaign.
  Brief: 3 sizes, EN and FR versions. Product shots attached. Deadline tomorrow 6pm CET.
  Deliverables: To be confirmed
  Source Files: To be provided by client"
```
Probleme : "Deliverables: To be confirmed" alors que l'email dit explicitement 50 bannieres en 3 tailles x 2 langues. Le graphiste ne sait pas qu'il a 100 fichiers a produire. Pas de deadline dans le schema.

**Brief cible :**
```
brief_body:
  "Introduction: Sony Music France Black Friday campaign — 50 banner designs, 2 languages.
  Brief: Design 50 product banners for Black Friday. Use product shots provided by client.
  Deliverables: 50 designs x 3 sizes (1200x628, 1080x1080, 1920x1080) x 2 languages (EN, FR) = 300 files total
  Deadline: Tomorrow 6pm CET — URGENT
  Source Files: Product shots attached to original email — download before starting
  Branding: Sony Music France brand guidelines (SharePoint)
  Others: Check with PM if 50 = 50 unique designs or 50 products with same template"
```

### Simulation 2 : TikTok demande des videos editees

**Email client :**
> Subject: Weekly batch — 80 videos
> Hey, here's the list for this week. 80 videos, same specs as usual. Scripts in the shared folder. Need them by Friday. Thx — Li, TikTok

**Draft reply actuel (classification prompt) :**
> "Hi Li, thank you for sending over this week's batch. We'll get started on the 80 videos right away. Best regards, The Sarani Team"

Probleme : correct mais plat. Pas de ton Sarani. Et "we'll get started right away" pourrait etre un engagement premature si l'equipe est surchargee.

**Draft reply cible :**
> "Hi Li, got the batch — 80 videos, Friday deadline, on it! We'll pull the scripts from the shared folder and start rolling. Quick heads up if anything's different from the usual specs. Talk soon, [PM_NAME]"

### Simulation 3 : GEODIS envoie un feedback mecontent

**Email client :**
> Subject: RE: Presentation deck v2
> The logo on slide 14 is still wrong. I sent the correct version last week. Also the graph on slide 22 uses the old data. Please fix ASAP. — Sophie, GEODIS

**Feedback ClickUp actuel (feedbackComment pre-rempli) :**
> "Hi Sophie, thank you for pointing this out. We'll correct the logo on slide 14 and update the graph on slide 22 with the latest data right away. Best regards, The Sarani Team"

Probleme : c'est un DRAFT REPLY, pas un feedback ops. Le graphiste qui lit ca dans ClickUp ne sait pas ce qu'il doit faire concretement.

**Feedback ClickUp cible :**
```
FEEDBACK CLIENT — Presentation deck v2 (GEODIS)
Priority: URGENT (client a demande "ASAP")

1. SLIDE 14 — Logo incorrect
   - Remplacer le logo actuel par la version envoyee par Sophie la semaine derniere
   - Verifier le fichier dans le thread email du [date] ou demander au PM
   
2. SLIDE 22 — Graphique avec anciennes donnees
   - Mettre a jour le graphique avec les donnees recentes
   - Source des nouvelles donnees : a confirmer avec PM (peut-etre dans l'email precedent)

Rappel : NE PAS modifier les autres slides — seuls ces 2 points sont concernes.
```

---

## 6. Prompt Rewrites (copy-paste ready)

### 6a. Brief Extractor — Schema enrichi

Ajouter ces champs au `BriefExtractionResultSchema` :

```typescript
deadline: z.string(),           // "Tomorrow 6pm CET" ou "To be confirmed"
dimensions: z.string(),         // "1200x628, 1080x1080" ou "To be confirmed"
quantity: z.string(),           // "50 banners x 3 sizes x 2 languages = 300 files"
output_languages: z.string(),   // "EN, FR" ou "To be confirmed"
reference_links: z.string(),    // URLs ou "None provided"
```

### 6b. Brief Extractor — System prompt enrichi

Remplacer la section `brief_body` du prompt par :

```
- brief_body: string — REFORMULATED brief for the ops team (designer/video editor/copywriter). NOT a copy-paste of the client email. Structure:

🌟 Introduction / Goal:
[1-2 sentences: what the client needs and why — translated from the email, not copied verbatim]

✈️ Brief:
[Clear description of the work to do. Use imperative verbs: "Design...", "Edit...", "Translate...". Include technical specs if mentioned.]

🚚 Deliverables:
[MUST list: number of items x formats x sizes x languages = total file count. If unclear, write "To be confirmed — ask PM: [specific question]"]

⏰ Deadline:
[Extracted deadline with timezone. If none mentioned: "No deadline specified — confirm with PM"]

📍 Source Files:
[Where to find them: attachments, SharePoint folder, shared drive. If not clear: "Request from PM before starting"]

💬 Branding / Inspirations:
[Brand guidelines location, color references, mood boards mentioned. Default: "Check brand guidelines on SharePoint > [Client] folder"]

➡️ Others:
[Ambiguities detected, questions the ops team should clarify with PM before starting. NEVER leave this as just "N/A" if there are unclear points in the email]

Rules:
- TRANSLATE the client email into ops language. The ops team should not need to read the original email.
- CALCULATE totals: if the client says "3 sizes, 2 languages, 50 designs", write "50 x 3 x 2 = 300 files".
- FLAG ambiguities in the "Others" section — never assume.
- Never invent data. If a field cannot be extracted, write "To be confirmed — [what to ask]".
```

### 6c. Classification prompt — Ton Sarani + anti-engagement

Ajouter ces regles au prompt de classification (a centraliser dans un fichier unique) :

```
- draftReply tone: Dynamic, warm, available — NOT corporate. Use short sentences, action verbs. Example: "Got it — we're on it!" not "We acknowledge receipt of your request."
- draftReply MUST use the client's first name (extract from the "From" field).
- draftReply MUST end with "[PM_NAME]" as placeholder signature, not "The Sarani Team".
- draftReply MUST NEVER commit to specific deadlines, turnaround times, or deliverables unless explicitly confirmed. Use "we'll review and get back to you shortly" instead of "we'll have this ready by tomorrow".
- draftReply MUST NEVER promise free work, discounts, or special conditions.
```

### 6d. Nouveau prompt : Feedback Extractor (a creer)

```typescript
// src/lib/ai/prompts/feedback-extractor.ts

export const FEEDBACK_EXTRACTOR_SYSTEM_PROMPT = `You are Arya, PM at Sarani creative agency. Transform a client feedback email into a structured ClickUp comment for the ops team (designer, video editor, copywriter).

The ops team MUST understand what to fix WITHOUT reading the original client email.

Output format (plain text, not JSON):

FEEDBACK CLIENT — [Project name] ([Client name])
Priority: [URGENT if client says ASAP/urgent/disappointed, NORMAL otherwise]

[Numbered list of changes requested:]
1. [LOCATION — what to change]
   - [Specific action: "Replace X with Y", "Adjust color to #HEX", "Move element to position"]
   - [Source: where to find the correct asset/data]

2. [Next change...]

DO NOT MODIFY: [List elements the client validated or did not mention — protect them from accidental changes]

QUESTIONS FOR PM: [Ambiguities the ops team should clarify before starting]

Rules:
- NEVER copy the client's emotional language. "I'm disappointed" becomes "Priority: URGENT".
- ALWAYS specify the exact location (slide number, section, timestamp, file name).
- ALWAYS use imperative verbs: "Replace", "Adjust", "Remove", "Add", "Move".
- If the client's feedback is vague ("fix the colors"), flag it: "Colors — client says 'fix' but doesn't specify which. Ask PM to clarify."
- Never invent corrections the client didn't request.`;
```

---

## 7. Plan d'action recommande

| Priorite | Action | Fichier | Impact |
|---|---|---|---|
| P0 | Creer `feedback-extractor.ts` et l'integrer dans ProjectActionModal | Nouveau fichier + ProjectActionModal.tsx | Le feedback passe de 3/10 a 7-8/10 |
| P0 | Ajouter deadline, dimensions, quantity au schema brief | brief-extractor.ts | Le graphiste sait QUOI livrer QUAND |
| P0 | Enrichir le system prompt brief pour reformuler en langage ops | brief-extractor.ts | Le brief passe de 5/10 a 8/10 |
| P1 | Centraliser le prompt de classification dans un fichier unique | Nouveau fichier + classify + poll-emails | Coherence garantie |
| P1 | Ajouter ton Sarani + anti-engagement au prompt classification | Prompt classification | DraftReply passe de 6/10 a 8/10 |
| P2 | Ameliorer buildDefaultBrief avec un vrai squelette exploitable | CreateBriefModal.tsx | Le PM sans auto-extraction a une base utile |

---

**Verdict final : Ameliorations necessaires avant de considerer les outputs comme production-ready.** La fondation technique est bonne (classification, routing, auto-brief pipeline), mais les OUTPUTS — ce que le graphiste lit, ce que le PM envoie — ne sont pas au niveau d'une agence qui gere Sony, TikTok et GEODIS. On est dans du MVP fonctionnel, pas dans du PM professionnel.
