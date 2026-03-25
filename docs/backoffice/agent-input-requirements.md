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

**Why this agent needs these inputs:** A contract is a legal instrument. Every variable — the exact legal name of the client entity, the governing law, the amount, the scope — has binding consequences. A contract generated with the wrong legal entity name is invalid. A contract with "scope TBD" will cause a dispute. The Legal IA can only be as precise as the inputs it receives, and here imprecision is not a quality issue — it's a legal risk.

### Message de guidance (displayed at the top of the form)

> "Contracts require precision. Before generating, verify that the client record contains the correct legal entity name and VAT number — these are auto-filled but should always be confirmed. Fill every variable before generating. A draft reviewed by human counsel before sending is mandatory — this agent produces the draft, not the signed contract."

### Inputs requis (mandatory — blocks submission)

| Field | Type | Why it's mandatory | Placeholder / example |
|-------|------|--------------------|-----------------------|
| `client` | Select (client record) | Auto-fills legal entity name, VAT, country, governing law default, and preferred template. Without it, the contract will have blank legal variables. If the client record is incomplete (missing legal entity), the agent blocks and lists the missing fields. | Select client → TikTok |
| `contract_type` | Radio (SOW / UGC Agreement / NDA / Freelance / Other) | Determines which template is loaded. Different templates have entirely different clause structures, variable lists, and legal logic. | SOW |
| `scope_of_work` | Textarea | The single most litigated clause in any SOW. Vague scope = scope creep = unpaid work. Must describe the deliverables with enough specificity to be enforceable. | "Design and delivery of 50 web banners in 3 formats (728×90, 300×250, 160×600) in English and French, 2 revision rounds included." |
| `total_amount` | Number (EUR) | Cannot generate a contract without the agreed commercial amount. | 15000 |
| `delivery_date` | Date picker | Contractual commitment. Without it, the SOW has no deadline clause, which eliminates Sarani's right to invoice on delivery. | 2026-04-15 |

### Inputs recommandés (strongly advised — improves output quality significantly)

| Field | Type | What it improves | Placeholder / example |
|-------|------|------------------|-----------------------|
| `payment_terms` | Select (100% upfront / 50% upfront + 50% on delivery / 30 days net / 60 days net) | Payment terms are the second most disputed clause. Leaving this blank defaults to the template standard, which may not match what was agreed verbally with the client. | 50% upfront / 50% on delivery |
| `revisions_included` | Select (Unlimited / 2 rounds / 3 rounds / None) | Sarani's differentiator is unlimited revisions — but for specific fixed-price projects, this may need to be capped. The contract must reflect what was sold. | Unlimited |
| `project_name` | Text | The project name appears in the SOW header and in ClickUp. Without it, the contract is identified only by date + client, which causes confusion when clients have multiple active SOWs simultaneously. | Black Friday Campaign 2026 |
| `governing_law` | Select (France / UK / Ireland / UAE / USA / Other) | Auto-filled from client country, but may need override. A French company contracting with a Dubai entity may prefer neutral jurisdiction. | France |

### Inputs optionnels

| Field | Type | What it enriches |
|-------|------|-----------------|
| `special_clauses` | Textarea | Non-standard clauses to add or modify (e.g., confidentiality addendum, exclusivity window, specific IP transfer terms). |
| `references_framework_agreement` | Toggle | If a master services agreement exists for this client, the SOW should reference it. Auto-filled if `signed_framework_agreement = true` in the client record. |
| `second_party_contact` | Text | Name and title of the signatory on the client side. Useful for the signature block. |

### Auto-detected from client record

- `client.legal_entity_name` → auto-filled in the "Client" party block of the contract
- `client.vat_number` → auto-filled in fiscal identification clause
- `client.legal_country` → determines governing law default
- `client.signed_framework_agreement` → if true, SOW references the master agreement automatically
- `client.preferred_contract_template` → selects the correct template version

---

## Agent 7 — Social IA

**Why this agent needs these inputs:** LinkedIn content lives or dies on specificity. A post about "how we help clients" is background noise. A post about "how TikTok went from 300 to 1,500 videos edited per month in 6 weeks" is a story that stops the scroll. The Social IA needs the topic and the proof points to produce content worth publishing — without them, it writes beautifully structured posts that say nothing memorable.

### Message de guidance (displayed at the top of the form)

> "The best Sarani posts are built on real proof: numbers, client names (when authorized), specific outcomes. If you're writing about a case study, include the actual figures — don't let me invent them. If you're writing thought leadership, tell me the one controversial or surprising insight you want to share. Generic topics produce generic posts."

### Inputs requis (mandatory — blocks submission)

| Field | Type | Why it's mandatory | Placeholder / example |
|-------|------|--------------------|-----------------------|
| `topic_or_angle` | Textarea | This is the single most important input. The topic determines everything — without it, the agent has no direction. Must be specific enough to be publishable. | "How we helped TikTok edit 1,500+ videos per month without missing a single deadline — and what made it possible." |
| `post_format` | Radio (Long text 1000-1500 chars / Short text under 500 chars / Carousel script) | LinkedIn format has a direct impact on the writing approach. A carousel requires a narrative split across 7-10 slides; a long text requires a strong hook and progressive revelation. | Long text |

### Inputs recommandés (strongly advised — improves output quality significantly)

| Field | Type | What it improves | Placeholder / example |
|-------|------|------------------|-----------------------|
| `proof_points` | Textarea | The data, outcomes, or specific facts that make the post credible and scroll-stopping. Without proof, the agent writes claims; with proof, it writes evidence. | "1,500+ videos/month. 0 missed deadlines over 8 months. Team of 6 editors across 3 time zones." |
| `client_reference` | Select (client list) or Text | If the post references a client project, selecting the client activates their case study data. Note: requires confirmation that the client has authorized public mention. | TikTok |
| `tone_emphasis` | Select (Evidence-first / Inspiring / Behind-the-scenes / Contrarian / Educational) | Sarani's brand voice is Evidence-first by default — but a behind-the-scenes post about the team or a contrarian take on creative agencies requires a different register. | Evidence-first |
| `scheduled_date` | Date picker | Without a scheduled date, the post has no place in the content queue. Scheduling is the bridge between content creation and content publishing. | 2026-04-03 |

### Inputs optionnels

| Field | Type | What it enriches |
|-------|------|-----------------|
| `hook_direction` | Textarea | A suggestion for the opening line. The hook is the most critical element of a LinkedIn post — if you have a specific angle in mind, give it. Otherwise the agent generates 3 hook options. |
| `visual_description` | Textarea | If a visual will accompany the post (generated by Designer IA or from the portfolio), describe it. The agent adapts the copy to reinforce the visual rather than repeat it. |
| `hashtag_preferences` | Text | Specific hashtags to include or avoid. Otherwise auto-generated. |
| `cta_direction` | Text | The specific action you want readers to take. Default: "link in comments" or "DM to learn more". | "Tag a CMO who needs to hear this" |

### Auto-detected from agent context (Sarani brand — not a client record)

- `sarani.brand_voice` → tone and structure locked to Assured / Direct / Warm
- `sarani.case_studies` → relevant case study data injected when a client is referenced
- `social_queue[]` → last 30 days of published and scheduled posts injected to avoid topic repetition

---

## Agent 8 — SEO IA

**Why this agent needs these inputs:** An SEO article that ranks is optimized for a specific search query made by a specific person with a specific intent. Without the primary keyword and the search intent, the agent writes a well-structured article that no one will find. Without knowing the target page (contact, pricing, case studies), it writes an article with no conversion path. Every SEO input has a direct impact on whether the article drives business or just exists on a server.

### Message de guidance (displayed at the top of the form)

> "SEO writing is a precision exercise. Give me a specific keyword (not 'marketing agency' — try 'creative agency for enterprise brands'), confirm the search intent (is the reader looking to hire, to learn, or to compare?), and tell me where you want to convert them. I'll handle the structure, the optimization, and the Sarani voice."

### Inputs requis (mandatory — blocks submission)

| Field | Type | Why it's mandatory | Placeholder / example |
|-------|------|--------------------|-----------------------|
| `article_title_h1` | Text | The H1 title determines the primary keyword placement and sets the topic frame. Without it, the agent either invents a title (which may not match the actual target keyword) or generates a generic one. | "How to Brief a Creative Agency for Same-Day Delivery" |
| `primary_keyword` | Text | This is the search query the article must rank for. Every structural and density decision in the article is built around this keyword. Without it, the article is an essay, not an SEO asset. | "brief creative agency" |

### Inputs recommandés (strongly advised — improves output quality significantly)

| Field | Type | What it improves | Placeholder / example |
|-------|------|------------------|-----------------------|
| `search_intent` | Select (Informational / Navigational / Commercial / Transactional) | Determines the article's structure and conclusion strategy. An informational article educates; a commercial article builds comparison and moves toward a decision. The same keyword can serve different intents — getting this right is the difference between a low-bounce article and a high-bounce one. | Commercial |
| `secondary_keywords` | Text (comma-separated) | Semantic keywords increase topical authority and capture long-tail queries. An article on "brief creative agency" should also rank for related queries. | "agency briefing template, creative brief example, how to write a creative brief" |
| `target_cta` | Select (Contact form / Pricing page / Case studies / Free consultation) | Every SEO article should have a conversion path. Without a CTA target, the article ends with no action for the reader to take. | Contact form |
| `target_length` | Radio (1,500 words / 2,000 words / 2,500 words) | Length signals content depth to search engines. Competitive queries require longer articles; informational queries for niche topics can rank with 1,500 words. | 2,000 words |

### Inputs optionnels

| Field | Type | What it enriches |
|-------|------|-----------------|
| `competitor_articles_to_beat` | Text (URLs) | What's currently ranking #1-3 for this keyword? Knowing what to outcompete allows the agent to structure a more comprehensive and differentiated article. |
| `internal_links_to_include` | Text (page slugs) | Specific pages to link to within the article (case studies, service pages). Builds internal link equity. |
| `proof_points_to_include` | Textarea | Specific Sarani data points to include in the article (e.g., "155€ Sony banners", "8,500€ GEODIS 5,700 slides"). Without these being explicitly provided, the agent will either omit them or use placeholders. |
| `article_outline` | Textarea | If the operator has a specific section structure in mind, providing it here overrides the agent's auto-generated outline. |

### Auto-detected from agent context (Sarani brand)

- `sarani.brand_platform` → editorial voice and positioning applied throughout
- `sarani.brand_voice` → tone calibrated (Assured, Direct, Warm — not academic)
- `seo.keyword_map` → if available, validates the keyword selection and suggests refinements
- `seo.published_articles[]` → detects potential duplicates and suggests differentiated angles

---

## Agent 9 — Proposal IA

**Why this agent needs these inputs:** A commercial proposal for L'Oréal is not a capabilities deck — it's a structured argument that connects their specific pain point to Sarani's specific solution, backed by a proof point they recognize (a brand in their industry), and a price that feels proportional to the value. Without the client's pain, the proof point, and the pricing logic, the agent produces a brochure. A proposal that wins a 200K€ account needs to speak directly to one person's problem on one specific day.

### Message de guidance (displayed at the top of the form)

> "A winning proposal is a targeted argument, not a capabilities brochure. Tell me what the client's actual pain is (not 'they need design' — 'they're losing 3 weeks on every campaign revision cycle'), what we've done for a similar brand, and what we're proposing to do. I'll handle the structure, the value framing, and the pricing narrative."

### Inputs requis (mandatory — blocks submission)

| Field | Type | Why it's mandatory | Placeholder / example |
|-------|------|--------------------|-----------------------|
| `client` | Select (client record) | Loads the client context: industry, contact name, language preference, and any previous interactions. Personalizing a proposal starts with knowing who you're writing to. | Select client → L'Oréal |
| `client_pain_point` | Textarea | This is the opening argument of the proposal. Without a specific pain, the proposal starts with Sarani's capabilities — the wrong starting point. The pain must be the client's pain, not a generic industry pain. | "L'Oréal's internal studio is 4 weeks behind on regional campaign adaptation. Their agency takes 3 days for each revision, causing delays that cost them media placements." |
| `proposed_solution` | Textarea | What specifically Sarani is proposing to do. Not the full service menu — the specific answer to the specific pain described above. | "Sarani takes over the adaptation workflow for 5 EMEA markets. D+1 delivery, unlimited revisions, dedicated point of contact in Paris timezone." |
| `proposed_investment` | Number (EUR) or Range | The commercial anchor. Without it, the proposal has no closing argument. | 8500 (monthly retainer) |

### Inputs recommandés (strongly advised — improves output quality significantly)

| Field | Type | What it improves | Placeholder / example |
|-------|------|------------------|-----------------------|
| `proof_case_reference` | Select (Sarani case studies list) | The single most persuasive element of any proposal is proof from a comparable brand. "We did this for GEODIS (same industry, same scale, same pain) and here's the result" is worth more than 10 pages of capabilities. | GEODIS — 5,700 slides in 3 weeks |
| `client_contact_name` | Text | Personalizes the proposal ("Dear Sophie," not "Dear Team"). Auto-filled from client record but overridable for a specific contact at a large company. | Sophie Martin, Head of Marketing EMEA |
| `proposal_format` | Select (PDF document / Slide deck / Email body) | Determines the output structure. A slide deck for L'Oréal and a 3-paragraph email proposal for a mid-size brand are different instruments. | PDF document |
| `timeline_for_decision` | Text | If there's a known deadline for the client to decide (e.g., they're choosing between 3 agencies by Friday), this urgency can be woven into the closing argument. | Decision expected: April 15, 2026 |

### Inputs optionnels

| Field | Type | What it enriches |
|-------|------|-----------------|
| `competitor_context` | Textarea | If Sarani knows it's competing against specific agencies on this pitch, the proposal can address the comparison points proactively without naming competitors. |
| `additional_proof_points` | Textarea | Specific metrics or outcomes not yet in the case study library: response time, client satisfaction scores, volume handled. |
| `special_conditions` | Textarea | First project satisfaction guarantee, onboarding timeline, dedicated team structure — any specific commitments that make this proposal stand out. |
| `language` | Select (EN / FR / IT / ES / DE) | Default English. Select if the proposal is to be delivered in the client's language. |

### Auto-detected from client record

- `client.industry` → used to select the most relevant proof case from the same sector
- `client.primary_contact_name` → personalization of the proposal opening
- `client.primary_language` → sets the default proposal language
- `client.brand_tone` (Sarani) → Assured, Direct, Warm applied throughout
- `client.agent_outputs[]` (Proposal type) → previous proposals to this client reviewed for consistency

---

## Agent 10 — Presentation IA

**Why this agent needs these inputs:** A presentation is not a document — it is a narrative structured for an audience in a room (or on a call) that will make a decision at the end. The structure depends entirely on who the audience is (decision-makers need a recommendation up front; technical teams need the data first) and what decision they need to make by the end. Without knowing the audience and the desired outcome, the agent produces slides — not a presentation.

### Message de guidance (displayed at the top of the form)

> "Think of this as briefing a McKinsey consultant who has 48 hours to prepare a deck. Tell me who will be in the room, what they need to decide or understand by the end, and what story the data tells. I'll handle the slide structure, the narrative flow, and the Sarani-branded formatting. The clearer your brief, the fewer slides end up in the bin."

### Inputs requis (mandatory — blocks submission)

| Field | Type | Why it's mandatory | Placeholder / example |
|-------|------|--------------------|-----------------------|
| `client` | Select (client record) | Loads brand book for visual formatting of the deck, and historical context. A presentation for GEODIS logistics has a different visual register than one for Pernod Ricard. | Select client → GEODIS |
| `presentation_objective` | Textarea | What must the audience believe, decide, or do by the last slide? Without a clear objective, the agent creates a content dump. With a clear objective, it structures a narrative arc. | "GEODIS management team approves the 12-month rebrand rollout plan and validates the €85K budget." |
| `audience` | Textarea | Who is in the room? Seniority level, expertise, and expected objections all change the presentation structure. A CFO and a Creative Director need completely different approaches to the same content. | "GEODIS ExCom: CEO, CFO, CDO. No design background. Decision-makers. Time-pressed. Skeptical of creative agency costs." |
| `key_content_points` | Textarea | The core information, data, or argument that must appear in the deck. Without content inputs, the agent fills slides with generic placeholder text. | "Current state: 350 outdated slide templates. Pain: 3h per presentation for each regional manager. Solution: Sarani rebrand + template library. Proof: delivered in 3 weeks for €8,500. Ask: approve 12-month rollout for €85K." |

### Inputs recommandés (strongly advised — improves output quality significantly)

| Field | Type | What it improves | Placeholder / example |
|-------|------|------------------|-----------------------|
| `number_of_slides` | Select (5-7 / 8-12 / 15-20 / 30+) | Dictates the level of narrative detail per slide. An executive summary deck and a detailed delivery presentation have fundamentally different slide counts. | 8-12 |
| `presentation_type` | Select (Executive summary / Project kickoff / Progress update / Client pitch / Strategy recommendation / Training) | Each type has a known narrative structure. An executive summary uses the Pyramid Principle; a project kickoff uses a timeline-first structure. | Executive summary |
| `data_and_charts` | File upload or Textarea | Specific data the slides should visualize (tables, metrics, comparisons). Without it, the agent uses placeholder data that must be replaced — adding time. | Upload GEODIS_data.xlsx or paste: "Before: 3h per deck. After: 45min. Volume: 350 templates." |
| `language` | Select (EN / FR / IT / ES / DE) | The presentation language may differ from the client's primary language depending on the audience. | FR |

### Inputs optionnels

| Field | Type | What it enriches |
|-------|------|-----------------|
| `slide_outline` | Textarea | If the operator has a specific slide order in mind, providing it overrides the agent's auto-generated structure. |
| `existing_template` | File upload | If the client or Sarani has an existing PowerPoint template, it should be used as the visual base. |
| `tone_direction` | Select (Formal / Consultative / Inspirational / Technical) | Even within Sarani's brand voice, a GEODIS ExCom presentation and a TikTok creative kickoff have different registers. |
| `must_include_assets` | File upload | Logos, photos, charts that must appear. |

### Auto-detected from client record

- `client.brand_book` → visual style applied to slide formatting (colors, fonts, layout guidelines)
- `client.primary_language` → default language for the presentation
- `client.industry` → contextualizes the content tone (logistics vs. luxury vs. tech)
- `client.agent_outputs[]` (Presentation type) → previous decks reviewed to maintain narrative consistency

---

## Agent 11 — Email Drafter IA

**Why this agent needs these inputs:** An email from Sarani to a Sony contact in Tokyo and an email to a GEODIS procurement director in Paris are entirely different instruments. The relationship status (new vs. existing client), the email purpose (following up, delivering, escalating, pitching), and the cultural context all fundamentally change what the email should say and how. Without knowing who you're writing to and why, the agent produces professional-sounding emails that miss the relationship dynamics entirely.

### Message de guidance (displayed at the top of the form)

> "Tell me who you're writing to (name, role, relationship), what you want this email to accomplish, and the one key thing you need them to do or know. If there's a specific tone consideration (they're frustrated, this is a sensitive negotiation, they just approved a budget), tell me — it changes everything."

### Inputs requis (mandatory — blocks submission)

| Field | Type | Why it's mandatory | Placeholder / example |
|-------|------|--------------------|-----------------------|
| `client` | Select (client record) | Loads relationship history, contact name, preferred language, and client tone context. Writing to a long-term partner like TikTok is different from writing to a prospect. | Select client → Sony |
| `email_purpose` | Select (Project delivery / Follow-up / New proposal / Status update / Issue escalation / Thank you / Introduction / Invoice / Other) | The email purpose determines the entire structure: a delivery email leads with the attachment; a follow-up leads with a concise reference to what was sent; an escalation requires a factual, calm tone. | Project delivery |
| `email_body_ask` | Textarea | What is the single action or understanding this email must produce? "Please find attached" is not a purpose — "Please review by Friday and confirm approval so we can proceed to print" is. | "Confirm you've received the 50 Black Friday banners and approve them for production by March 28." |

### Inputs recommandés (strongly advised — improves output quality significantly)

| Field | Type | What it improves | Placeholder / example |
|-------|------|------------------|-----------------------|
| `recipient_name` | Text | Personalizes the salutation. Auto-filled from the client's primary contact but overridable when emailing a different contact within the same company. | Sophie Tanaka, Senior Brand Manager |
| `context` | Textarea | What just happened that makes this email necessary? Without context, the email feels disconnected. "Following our call on Tuesday" or "As per your feedback on the last batch" sets the relationship continuity. | "Following Monday's call where you confirmed the banners are approved pending one copy change on the French version." |
| `language` | Select (EN / FR / IT / ES / DE) | The email language. Default is the client's primary language — but may need override when a French client's team is based in London. | EN |
| `tone_direction` | Select (Formal / Warm professional / Direct / Diplomatic) | The relationship history and the email purpose define the tone. A delivery confirmation is warm; an invoice reminder for an overdue payment is direct but diplomatic. | Warm professional |

### Inputs optionnels

| Field | Type | What it enriches |
|-------|------|-----------------|
| `attachment_description` | Textarea | If files are being sent with the email, describe what they are so the email text references them correctly. |
| `deadline_mentioned` | Date picker | If the email needs to set or reference a deadline, include it explicitly. The agent will integrate it into the closing paragraph with appropriate urgency calibration. |
| `previous_email_thread` | Textarea | Paste the last message in the thread for the agent to understand the conversation history before drafting the reply. |
| `cultural_context` | Textarea | If the recipient is in a specific cultural context (Japanese business etiquette, formal French corporate, informal US startup), flag it. |

### Auto-detected from client record

- `client.primary_contact_name` → pre-fills the recipient field
- `client.primary_language` → sets default language
- `client.brand_tone` (client's own) → calibrates formality register toward this client's culture
- `client.agent_outputs[]` (Email type) → last 3 emails to this client reviewed for tone continuity

---

## Agent 12 — Video Script IA

**Why this agent needs these inputs:** At 1,500 videos per month, there is no time for a script that misses the format. A TikTok script that runs 90 seconds will be cut; a product demo that has no hook in the first 3 seconds will be scrolled past. The Video Script IA needs to know the platform, the duration, the format, and the hook strategy before writing a single line — because a video script is not prose, it is a time-coded blueprint for a production team.

### Message de guidance (displayed at the top of the form)

> "At Sarani, we produce 1,500+ videos per month. Every script must be production-ready: right duration, right format, strong hook in the first 3 seconds. Tell me the platform, the exact duration, what happens on screen, and what the video must make the viewer do or feel. I'll write a script the editor can follow without questions."

### Inputs requis (mandatory — blocks submission)

| Field | Type | Why it's mandatory | Placeholder / example |
|-------|------|--------------------|-----------------------|
| `client` | Select (client record) | Loads brand voice, tone, and any visual identity constraints. A script for TikTok's own channel and a script for a GEODIS product video have different register, energy, and production constraints. | Select client → TikTok |
| `platform` | Select (TikTok / Instagram Reels / YouTube Shorts / YouTube long-form / LinkedIn video / Internal / Other) | Platform defines format rules, caption behavior, safe zones, and viewer attention patterns. A TikTok script written without understanding the platform's compression of narrative will not perform. | TikTok |
| `video_duration` | Select (15s / 30s / 60s / 90s / 3-5min / 10min+) | Duration is the hard constraint around which everything else is built. A 15-second TikTok requires a completely different structure from a 5-minute YouTube explainer. The script must fit the time slot exactly. | 60s |
| `video_concept` | Textarea | What is this video about? What happens visually and verbally? Without the concept, the agent writes a script without a story. | "TikTok creator shows how to use TikTok's creative toolkit to produce a brand campaign in 24 hours. POV: content creator at their desk. Fast cuts. Text overlays on each feature." |

### Inputs recommandés (strongly advised — improves output quality significantly)

| Field | Type | What it improves | Placeholder / example |
|-------|------|------------------|-----------------------|
| `hook_direction` | Textarea | The first 3 seconds of a TikTok either stop the scroll or lose the viewer forever. Without a hook direction, the agent generates an average opening. With a specific hook direction, it opens with intention. | "Start with a problem: 'Most brands spend 6 weeks on a campaign that should take 6 hours.'" |
| `script_format` | Select (Voiceover / On-camera presenter / Text overlays only / Dialogue / Hybrid) | Determines how the script is written. A voiceover script and a text-overlay-only script have different syntax and rhythm entirely. | Text overlays with voiceover |
| `cta` | Text | Every video must end with one action. Without a CTA, the video closes as entertainment, not communication. | "Follow for more — link in bio for your free consultation" |
| `language` | Select (EN / FR / IT / ES / DE) | The script language. Critical for TikTok's multilingual content pipelines where the same video may need scripts in 3 languages. | EN |

### Inputs optionnels

| Field | Type | What it enriches |
|-------|------|-----------------|
| `visual_direction` | Textarea | Shot list suggestions, visual style references, transitions to use or avoid. Makes the script a more complete production brief. |
| `music_mood` | Text | Music tempo and energy affects script pacing. A slow ballad and a 140bpm EDM track require different delivery cadences. |
| `caption_style` | Select (Auto-captions / Styled text overlays / None) | Affects how the copy elements of the script are formatted and timed. |
| `series_context` | Textarea | If this is episode N in a series, the script should reference continuity. "Last week we showed X — today we go deeper on Y." |
| `existing_reference_script` | Textarea | A script from a previous video in the same series or style. Used to match established cadence and structure. |

### Auto-detected from client record

- `client.brand_tone` → calibrates energy, formality, and vocabulary
- `client.primary_language` → default script language
- `client.agent_outputs[]` (Video Script type) → last scripts for this client reviewed for style and continuity

---

## Agent 13 — QA / Proofreader IA

*(Sections to follow)*

---

## Auto-detected fields — global reference

*(Section to follow)*
