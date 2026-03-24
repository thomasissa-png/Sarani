# Sarani — UX Writing Guide
*Produced by @copywriter — 2026-03-24*
*Voice: Assured / Direct / Warm. Dark-first site. Contact form = critical conversion point.*

---

## 1. Error Messages

Never blame the user. State what happened. Tell them exactly what to do next.

| Context | Message | Tone | Action shown |
|---|---|---|---|
| Empty required field | "This field is required." | Neutral, factual | Highlight field border in red |
| Invalid email format | "That doesn't look like a valid email address." | Warm, not accusatory | Inline, below field |
| File exceeds 10MB | "This file is too large. Maximum size is 10MB." | Factual | Show file size limit before upload |
| Server error (5xx) | "Something went wrong on our end. Try again — or email us directly at team@sarani.studio." | Accountable, warm | Retry button + direct email link |
| Network error | "We lost the connection. Check your internet and try again." | Neutral | Retry button, form data preserved |
| 404 Page not found | "This page doesn't exist — but your project can." | Assured, slightly warm | CTA: "Start a project" |
| Rate limit (429) | "Too many requests. Give it a minute and try again." | Neutral, non-blaming | Auto-retry after 60s countdown |

**Rules:** No exclamation marks on errors. No "Oops!" No "Uh oh!" No passive voice. Never say "invalid" without explaining what valid looks like.

---

## 2. Empty States

Empty states are a brief. Not a dead end.

| Context | Headline | Body | CTA |
|---|---|---|---|
| No case studies loaded | "The work is on its way." | "Case studies are being formatted. Check back in 24 hours." | — |
| Search returns no results | "Nothing matches that search." | "Try a different keyword, or browse all projects." | "Browse all projects" |
| No files attached to brief | "No files yet." | "You can attach a brief, brand guidelines, or references — up to 10MB." | "Attach files" |
| Portfolio filter returns empty | "Nothing in this category yet." | "See everything we've made." | "View all work" |

---

## 3. Loading States

Loading copy replaces silence. Use it to manage expectation, not just fill space.

| Context | Message | Notes |
|---|---|---|
| Form submission | "Sending your brief…" | Replace button label while submitting. Disable button. |
| Page transition | "Loading…" | Only if transition exceeds 1.5s. |
| Image lazy-load | No text — skeleton block only | Matches dark-first aesthetic. Avoid spinners. |
| File upload in progress | "Uploading — [filename]" | Show file name to confirm correct file is uploading. |

---

## 4. Success States

Success on the contact form is the most critical moment on the site. It must feel like the beginning of something, not a receipt.

| Context | Headline | Body | Notes |
|---|---|---|---|
| Contact form submitted | "Brief received." | "We'll respond within the hour." | No emoji. No "Thank you so much!" Just the fact. |
| Newsletter signup | "You're in." | "Expect sharp work, not inbox noise." | Confirm what they're getting, not just that they signed up. |
| File upload complete | "Uploaded." | Show file name + size. | Keep it minimal. |

**Non-negotiable:** "We'll respond within the hour." is a commitment. Do not soften it. Do not add qualifiers. This copy is the promise Sarani makes — ops must honour it.

---

## 5. Tooltips & Help Text

Tooltips answer the question the user was about to ask. They should never repeat the label.

| Field / Element | Help text | Placement |
|---|---|---|
| "Your brief" textarea | "No formal brief? A sentence on what you need, your deadline, and your budget is enough." | Below field, visible on focus |
| File attachment | "Accepted: PDF, JPG, PNG, AI, Figma link. Max 10MB." | Below input, always visible |
| Budget field | "No set budget? Write 'TBD' — we'll work from there." | Inline tooltip on focus |
| Turnaround expectation | "Standard delivery is 24–48h. Need it faster? Say so." | Tooltip on hover / focus |
| "How did you hear about us?" | "Optional — helps us understand what's working." | Inline, below field |

---

## 6. CTAs by Context

| Location | Text | Variant | Notes |
|---|---|---|---|
| Hero section | "Start a project" | Primary / large | The only CTA above the fold. No competing links. |
| Case study bottom | "Start a project like this" | Primary | Links to contact form with project type pre-filled if possible |
| Pricing section | "Get started" | Primary | Below each tier or plan description |
| Navigation (desktop) | "Start a project" | Ghost / outlined | Persistent. Right-aligned in nav. |
| Footer | "Let's work together" | Text link | Paired with email address |
| 404 page | "Start a project" | Primary | The only exit from the 404. |
| Newsletter | "Subscribe" | Secondary | No "Sign up for free updates" — just "Subscribe" |
| Mobile nav | "Start a project" | Full-width primary | Last item in the menu |

**Rules:** Every CTA contains a verb. Maximum 5 words. No "Click here." No "Learn more" as a standalone CTA without context.

---

## 7. Formatting Rules

**Capitalisation**
- Sentence case everywhere. Not Title Case For CTAs. Not ALL CAPS for emphasis.
- Brand names follow their own style: TikTok, GEODIS, Sony.

**Punctuation**
- No Oxford comma in UI copy (space is too tight).
- Em dash (—) for parenthetical asides, not parentheses.
- Ellipsis only in loading states.
- No exclamation marks. Ever.

**Numbers**
- Under 10: spell out in body copy. ("three revisions", not "3 revisions")
- 10 and above: numerals. ("24 hours", "1,500 edits")
- Prices: 155€ not €155. No space between number and currency.

**Emojis:** Not used. Not in UI, not in error messages, not in success states.

**Max lengths (characters, excluding spaces)**
- Button label: 24
- Tooltip: 80
- Error message: 90
- Empty state body: 100
- Success state body: 120

---

## 8. Accessibility Writing

**Alt text conventions**
- Decorative images: `alt=""` (empty string, not "decorative").
- Case study images: describe the work, not the aesthetics. "GEODIS rebrand — slide deck cover, dark navy and white" not "A beautiful presentation slide."
- Portraits: "Sophie L., Head of Marketing at GEODIS" (name + role, no physical description).
- Logo: "Sarani agency logo"

**ARIA labels**
- Icon-only buttons: always include `aria-label`. "Close menu", "Open navigation", "Submit brief".
- Form fields: `aria-describedby` pointing to help text element ID.
- Error states: `aria-invalid="true"` + `aria-describedby` pointing to error message.
- Loading states: `aria-live="polite"` on status region.

**Link text rules**
- Descriptive, always. "Read the TikTok case study" not "Read more" not "Click here."
- Include destination context: "Download the PDF brief template" not "Download."
- No URLs as link text.
- Avoid "here" as a link anchor in any context.

---
