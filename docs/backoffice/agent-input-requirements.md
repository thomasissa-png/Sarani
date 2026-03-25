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

*(Sections to follow)*

---

## Agent 4 — Graphic Designer IA

*(Sections to follow)*

---

## Agent 5 — Copywriter IA

*(Sections to follow)*

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
