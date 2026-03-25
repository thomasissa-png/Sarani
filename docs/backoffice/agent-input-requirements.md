# Sarani Back-Office — Agent Input Requirements

*Produced by @product-manager — 2026-03-25*
*Reference: ai-team-specs.md — this document defines the exact inputs each agent needs, the justification for each field, and the guidance text displayed in the UI.*
*Language: English (back-office UI language)*

---

## Purpose

This document defines the optimal inputs for each of the 13 Sarani back-office agents. Each field is justified from a professional standpoint — not "nice to have" but "here's what breaks without it." Fullstack uses this as the source of truth for form implementation.

**Key principle:** every field that is "recommended" or "optional" should remain visible in the form but not block submission. Every "required" field blocks submission with an inline error message.

---

## Table of contents

1. [Agent 1 — Project Manager IA](#agent-1--project-manager-ia)
2. [Agent 2 — Translator](#agent-2--translator)
3. [Agent 3 — Creative Strategist](#agent-3--creative-strategist)
4. [Agent 4 — Graphic Designer IA](#agent-4--graphic-designer-ia)
5. [Agent 5 — Copywriter IA](#agent-5--copywriter-ia)
6. [Agent 6 — Legal IA](#agent-6--legal-ia)
7. [Agent 7 — Social IA](#agent-7--social-ia)
8. [Agent 8 — SEO IA](#agent-8--seo-ia)
9. [Agent 9 — Proposal IA](#agent-9--proposal-ia)
10. [Agent 10 — Presentation IA](#agent-10--presentation-ia)
11. [Agent 11 — Email Drafter IA](#agent-11--email-drafter-ia)
12. [Agent 12 — Video Script IA](#agent-12--video-script-ia)
13. [Agent 13 — QA / Proofreader IA](#agent-13--qaproofreader-ia)
14. [Auto-detected fields — global reference](#auto-detected-fields--global-reference)

---

## Agent 1 — Project Manager IA

**Why this agent needs these inputs:** The PM IA is the nerve center — it receives raw client briefs (emails, calls, documents) and transforms them into structured action plans dispatched to the right agents. Without knowing the client, the urgency, and the actual ask, it produces generic decompositions that miss Sarani's operational specifics (D+1 promise, format requirements, multi-language delivery).

### Message de guidance (displayed at the top of the form)

> "Paste the client's email or describe the project in plain language — I'll handle the structure. The more context you give me (client, deadline, language, format), the more precise the task breakdown will be. If something is missing, I'll flag it before dispatching."

### Inputs requis (mandatory — blocks submission)

| Field | Type | Why it's mandatory | Placeholder / example |
|-------|------|--------------------|-----------------------|
| `client` | Select (client record) | Without the client, the PM IA has no brand book, no language preference, no legal entity, no historical context to inform the decomposition. Selecting a client auto-loads all relevant context. | Select client → Sony |
| `brief_text` | Textarea (min 20 chars) | This is the raw material. The PM IA cannot decompose what it doesn't have. Even a 2-line email qualifies. | "Sony needs 50 Black Friday banners by Friday — 728x90, 300x250, 160x600. EN and FR versions." |

### Inputs recommandés (strongly advised — improves output quality significantly)

| Field | Type | What it improves | Placeholder / example |
|-------|------|------------------|-----------------------|
| `deadline` | Date picker | Without a deadline, the PM IA defaults to D+1. If the actual deadline is different, the priority and dispatch order will be wrong — causing missed commitments with the client. | 2026-03-28 |
| `priority` | Select (Normal / Urgent / ASAP) | Changes the dispatch strategy: ASAP triggers immediate parallel dispatch; Normal allows sequential. Critical for a 24/7 operation. | Urgent |
| `brief_attachment` | File upload (PDF, DOCX, images) | When the client sends a PDF brief or a visual reference, the PM IA needs to read it to detect technical specs, format requirements, and constraints that are never mentioned in the email body. | Sony_BF2026_brief.pdf |

### Inputs optionnels

| Field | Type | What it enriches |
|-------|------|-----------------|
| `internal_note` | Textarea | Context visible only to the team — what was said on the call, sensitivities, client mood. Injected into the PM IA context but not sent to sub-agents. |
| `clickup_project_id_override` | Text | If this brief belongs to a specific ClickUp project that differs from the client's default project ID. |
| `preferred_agents` | Multi-select (agent list) | Pre-select which agents should be activated, bypassing the PM IA's automatic detection. Useful when the operator already knows what's needed. |

### Auto-detected from client record

- `client.primary_language` → used as default language if brief doesn't specify
- `client.brand_book` → auto-attached to Designer IA sub-brief
- `client.glossary` → auto-attached to Translator sub-brief
- `client.legal_entity_name` + `client.preferred_contract_template` → auto-attached to Legal IA sub-brief
- `client.clickup_project_id` → used for ClickUp task creation
- `client.agent_outputs[]` → last 5 outputs injected as context ("history for this client")

---

## Agent 2 — Translator

**Why this agent needs these inputs:** A professional translator asks two questions before touching a single word: "What register?" and "Are there terms I must not translate?" Without the glossary and the tone register, the output will be technically correct but brand-wrong — a product name translated, a client-specific acronym rendered incorrectly, or a formal corporate client getting a casual translation.

### Message de guidance (displayed at the top of the form)

> "Select the client to activate their glossary and translation memory — this is what makes the difference between a generic translation and one that sounds like it came from their team. If you're translating something sensitive or technical, paste the text directly rather than uploading a scanned PDF."

### Inputs requis (mandatory — blocks submission)

| Field | Type | Why it's mandatory | Placeholder / example |
|-------|------|--------------------|-----------------------|
| `source_language` | Select (FR / EN / IT / ES / DE) | Cannot translate without knowing the source language. Auto-detection is unreliable for mixed-language documents. | FR |
| `target_language` | Select (FR / EN / IT / ES / DE) | Cannot produce the output without a target. Must differ from source (validation rule). | EN |
| `source_content` | Textarea or file upload (PDF, DOCX, TXT) | The actual content to translate. Without it, nothing exists to work on. | Paste text or upload Sony_brief_FR.docx |

### Inputs recommandés (strongly advised — improves output quality significantly)

| Field | Type | What it improves | Placeholder / example |
|-------|------|------------------|-----------------------|
| `client` | Select (client record) | Activates the client glossary and translation memory. Without it, the translation is generic and may contradict validated formulations from previous deliveries to this client. When translating for Sony, "Content Creator" must stay untranslated — the glossary enforces this automatically. | Select client → GEODIS |
| `register` | Toggle (Formal / Standard) | Corporate clients (GEODIS, Sony, L'Oréal) expect formal register. Failing to apply it makes Sarani look unprofessional. Default is Standard but this should be checked before submitting for a B2B enterprise client. | Formal |

### Inputs optionnels

| Field | Type | What it enriches |
|-------|------|-----------------|
| `context_note` | Textarea (short) | What is this document for? (internal brief, client-facing presentation, legal contract, social post). Changes the register calibration — a social post and a legal contract are translated differently even in the same language pair. |
| `show_glossary_hits` | Toggle | Highlights applied glossary terms in the output. Useful for training new team members or auditing a translation. Default OFF. |
| `preserve_formatting` | Toggle | For DOCX input: attempt to preserve bold, italic, table structure in output. Default ON. |

### Auto-detected from client record

- `client.glossary` → injected into every translation request for this client
- `client.translation_memory` → formulations validated in previous sessions applied first
- `client.prohibited_terms` → excluded from all translation outputs
- `client.primary_language` → pre-fills source language if the client's primary language matches

---

## Agent 3 — Creative Strategist

**Why this agent needs these inputs:** A strategic recommendation without a clear objective is just an opinion. The Creative Strategist needs to know what success looks like (the objective), who it's talking to (the audience), and what constraints exist (budget, mandatories) before it can build a credible strategic framework. Without these, it produces boilerplate "insight-led" recommendations that could apply to any brand in any category.

### Message de guidance (displayed at the top of the form)

> "Think of this as briefing a senior strategist before a client presentation. The more specific you are about what the client wants to achieve and who they're targeting, the more useful the recommendation will be. Vague objectives produce vague strategies — give me a real brief and I'll give you something worth presenting."

### Inputs requis (mandatory — blocks submission)

| Field | Type | Why it's mandatory | Placeholder / example |
|-------|------|--------------------|-----------------------|
| `client` | Select (client record) | Loads the brand book, brand tone, sector, and previous strategic recommendations. Without it, the strategist works without brand constraints and may propose directions already explored or explicitly rejected for this client. | Select client → TikTok |
| `campaign_objective` | Textarea | This is the north star of any strategy. Without it, the agent produces a structure with no strategic direction. Must be specific enough to be measurable. | "Drive awareness of TikTok for Business among CMOs in EMEA. Target: 200 qualified leads at the TechSummit event in June 2026." |
| `target_audience` | Textarea | Creative strategy is audience-driven. Without knowing who we're talking to, the messaging, tone, and creative territories are guesswork. | "CMOs and Heads of Digital Marketing at EMEA enterprise companies (500M+ revenue). Age 35-50. Skeptical of social media ROI for B2B." |
| `output_type` | Radio (Strategic recommendation / Creative brief / Campaign concept) | Determines the structure and depth of the output. A strategic recommendation and a creative brief require completely different outputs. | Strategic recommendation |

### Inputs recommandés (strongly advised — improves output quality significantly)

| Field | Type | What it improves | Placeholder / example |
|-------|------|------------------|-----------------------|
| `budget_range` | Select (Under 50K€ / 50K-200K€ / 200K-1M€ / 1M€+) | Budget fundamentally shapes creative ambition. A 50K€ budget should not receive a recommendation that requires 3 TVC shoots. Without it, the strategist may produce ideas that are strategically sound but commercially undeliverable. | 200K-1M€ |
| `timeline` | Date picker or text | Determines what's executable. A 2-week timeline eliminates any production that takes 4 weeks. Prevents recommendations that look great but are physically impossible to execute on time. | Campaign launch: June 15, 2026 |
| `constraints_and_context` | Textarea | Mandatory elements (brand mandatories, legal disclaimers, competitive restrictions), recent context (the client just ran a similar campaign), or market specifics (category shrinking, new competitor entered). Prevents recommending something the client already tried or legally can't do. | "Must avoid direct competitor comparisons. Previous campaign (Q4 2025) used 'For You' messaging — don't repeat. Must include accessibility standards." |
| `competitors_to_benchmark` | Text (comma-separated) | Without knowing the competitive landscape, the strategy may recommend something already done better by a competitor. | Meta for Business, Google Ads, Snapchat for Business |

### Inputs optionnels

| Field | Type | What it enriches |
|-------|------|-----------------|
| `existing_assets` | File upload | If the client already has research, brand tracking, or creative references, injecting them improves the quality of consumer insights significantly. |
| `inspiration_references` | Textarea | Campaigns or brands the client admires (or wants to differentiate from). Orients the creative territories. |
| `number_of_territories` | Select (2 / 3 / 5) | How many creative directions to explore. Default 3. More territories = wider exploration but longer output. |

### Auto-detected from client record

- `client.brand_tone` → applied to all creative territories (brand-consistent)
- `client.industry` → used to frame the category context and benchmark
- `client.brand_guidelines_notes` → constraints injected into the strategic framing
- `client.agent_outputs[]` (Creative Strategist type) → previous strategic recommendations loaded to avoid direction duplication

---

## Agent 4 — Graphic Designer IA

**Why this agent needs these inputs:** An art director cannot start without knowing the canvas (format/dimensions), the message (what needs to be communicated), and the brand constraints (colors, fonts, rules). Missing any one of these produces a visually generic output that either breaks the client's brand guidelines or misses the communication goal entirely. For clients like Sony or L'Oréal, a wrong color or untreated logo is a blocker to delivery.

### Message de guidance (displayed at the top of the form)

> "The more precise your brief, the closer the first visual will be to what the client expects. Include the message you want the viewer to read, the mood you're after, and any mandatory elements (logo placement, legal copy, specific CTA). The brand book will be loaded automatically — but specific guidelines for this project always override defaults."

### Inputs requis (mandatory — blocks submission)

| Field | Type | Why it's mandatory | Placeholder / example |
|-------|------|--------------------|-----------------------|
| `client` | Select (client record) | Loads brand book, colors, fonts, logo files, and guidelines notes. Without it, the agent generates images with no brand consistency — unusable for client delivery. | Select client → Sony |
| `visual_type` | Radio (Web banners / Social post / Presentation slide / Landing page / Moodboard / Other) | Determines the generation approach: a web banner needs a text hierarchy, a moodboard needs mood references, a social post needs square/vertical formats. Different pipelines behind the scenes. | Web banners |
| `dimensions` | Select (preset list) or custom W×H input | An image generated at wrong dimensions cannot be repurposed. A 1080×1080 Instagram post and a 728×90 leaderboard banner require fundamentally different compositions. | 728×90, 300×250, 160×600 (multi-select for banners) |
| `visual_brief` | Textarea (min 30 chars) | The key message, mandatory elements, mood, and references. Without this, the agent produces a visually branded but communicatively empty image — like printing the Sony logo on a white background. | "Black Friday sale. 30% off Sony headphones. Product shot centered. Message: 'Your sound. Your price.' Black background. CTA: 'Shop now' button bottom right." |

### Inputs recommandés (strongly advised — improves output quality significantly)

| Field | Type | What it improves | Placeholder / example |
|-------|------|------------------|-----------------------|
| `number_of_variants` | Radio (1 / 3 / 5) | 3 variants allow creative selection and avoid locking the designer into one direction. 1 variant is risky; the first generation is rarely production-ready. | 3 |
| `mood_references` | File upload or URL | Visual references ("I want it to feel like this") are the most efficient way to align on aesthetics. Reduces iteration cycles significantly. | Upload competitor ad, or paste Pinterest board URL |
| `mandatory_text_elements` | Text | Text content that must appear in the visual (product name, tagline, CTA, legal disclaimer). Without this, the agent generates beautiful images with placeholder text that needs a full redo. | "Shop now — sarani.studio — Valid until Nov 29" |
| `text_placement_instruction` | Text | Where specific text elements should sit. AI image generation struggles with text placement — being explicit reduces failures. | "Logo top left, CTA button bottom right, product name center" |

### Inputs optionnels

| Field | Type | What it enriches |
|-------|------|-----------------|
| `format_context` | Select (Digital — web / Digital — social / Print / OOH / Email) | Screen-optimized images behave differently from print. Signals the rendering environment to the generation prompt. |
| `forbidden_elements` | Textarea | What must NOT appear: specific colors, imagery, style choices. Critical for brands with strict guidelines (no gradients, no lifestyle photography, etc.). |
| `reference_from_history` | Select (previous outputs for this client) | "Make it like visual #XYZ we generated for this client last month." Re-uses a validated direction as a stylistic anchor. |

### Auto-detected from client record

- `client.brand_book` → parsed for color extraction and injected as context into the image generation prompt
- `client.primary_color` + `client.secondary_colors` → explicitly injected as hex codes in the generation prompt
- `client.font_name` → mentioned in the prompt (note: AI image generation has limited font control — documented limitation)
- `client.brand_tone` → used to calibrate the visual mood
- `client.brand_guidelines_notes` → injected verbatim as constraints in the generation prompt
- `client.logo_files` → displayed in the UI as reference; cannot be injected into AI-generated images directly (known limitation — human post-processing required)

---

## Agent 5 — Copywriter IA

**Why this agent needs these inputs:** Copy without a brief is creative writing. Copy with a brief is communication. A copywriter senior at Ogilvy won't write a single headline until they know the one thing the reader should feel, who that reader is, and where the copy will live. Without these, the agent produces polished words that say nothing specific to anyone in particular — the definition of bad copy.

### Message de guidance (displayed at the top of the form)

> "Good copy is specific. Tell me the one thing you want the reader to feel or do, who they are, and where this will appear. A tagline for a Sony product launch and a CTA for a GEODIS procurement email require completely different tones. The more specific your brief, the sharper the copy."

### Inputs requis (mandatory — blocks submission)

| Field | Type | Why it's mandatory | Placeholder / example |
|-------|------|--------------------|-----------------------|
| `client` | Select (client record) | Loads brand tone, prohibited terms, and copy history. Without it, the agent writes generic copy that may use language the client has explicitly rejected, or miss the brand voice entirely. | Select client → Adidas |
| `copy_type` | Select (Tagline / Headline / Body copy / CTA / Email subject line / Ad copy / Product description / Other) | Different copy types have entirely different constraints: a tagline is 3-6 words at most, body copy can be 200 words. Without knowing the type, the agent cannot calibrate length, structure, or rhythm. | Tagline |
| `key_message` | Textarea | The single idea the copy must communicate. Not the features list — the one thing. If the copywriter doesn't know this, they write copy that says everything, which means nothing. | "Adidas Ultraboost 26 makes you 15% faster over long distances — proven by independent biomechanics research." |
| `target_audience` | Textarea (short) | Copy changes fundamentally depending on who's reading. A 24-year-old runner and a 45-year-old procurement director are not the same person. | "Elite amateur runners, 28-45, train 5x/week, read performance reviews before buying" |

### Inputs recommandés (strongly advised — improves output quality significantly)

| Field | Type | What it improves | Placeholder / example |
|-------|------|------------------|-----------------------|
| `placement` | Select (Website hero / Banner / Email / Social post / OOH / Print / Video script / Packaging) | Copy tone and length are dictated by where it appears. An OOH billboard is read in 3 seconds; an email can be 150 words. The same message needs radically different treatment. | Banner (728×90) |
| `tone_direction` | Select (Inspiring / Urgent / Informational / Playful / Premium / Technical) | Even within a brand's tone of voice, specific campaigns call for specific emotional registers. Overrides the default brand tone when needed for a particular campaign. | Inspiring |
| `number_of_variants` | Select (1 / 3 / 5 / 10) | Copy should always be explored in multiple directions before selecting. 3 variants minimum for any client-facing piece. | 3 |
| `competitive_context` | Textarea | What are competitors saying? The copy should differentiate. Without knowing this, the agent may produce something that sounds exactly like the market leader. | "Nike is owning 'Just Do It' / performance. We must own the science angle." |

### Inputs optionnels

| Field | Type | What it enriches |
|-------|------|-----------------|
| `existing_copy_to_improve` | Textarea | Paste the current copy to rewrite or refine rather than generate from scratch. |
| `approved_references` | Textarea | Examples of copy the client has approved in the past. Anchors the tone to something already validated. |
| `hard_constraints` | Textarea | Character limits (e.g., "max 60 characters for this banner"), words to avoid, mandatory inclusions. |
| `language` | Select (EN / FR / IT / ES / DE) | Default is English. Specify if the copy needs to be written directly in another language. |

### Auto-detected from client record

- `client.brand_tone` → injected as tone baseline ("write in this voice")
- `client.prohibited_terms` → excluded from all copy output
- `client.glossary` → brand-specific terminology applied consistently
- `client.agent_outputs[]` (Copywriter type) → previous validated copy injected as style reference

---

## Agent 6 — Legal IA

*(Sections to follow)*

---

## Agent 7 — Social IA

*(Sections to follow)*

---

## Agent 8 — SEO IA

*(Sections to follow)*

---

## Agent 9 — Proposal IA

*(Sections to follow)*

---

## Agent 10 — Presentation IA

*(Sections to follow)*

---

## Agent 11 — Email Drafter IA

*(Sections to follow)*

---

## Agent 12 — Video Script IA

*(Sections to follow)*

---

## Agent 13 — QA / Proofreader IA

*(Sections to follow)*

---

## Auto-detected fields — global reference

*(Section to follow)*
