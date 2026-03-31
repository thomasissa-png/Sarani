/**
 * AI Project Teams — Quality Gates.
 * Each template type has a set of binary PASS/FAIL gates
 * that the QA agent evaluates before a deliverable is approved.
 */

import type { TemplateType } from "./templates";

export type { TemplateType } from "./templates";

export interface QualityGate {
  id: string;
  label: string;
  description: string;
}

/**
 * Quality gates by template type.
 * Each gate is a binary criterion: PASS or FAIL.
 */
export const QUALITY_GATES: Record<TemplateType, QualityGate[]> = {
  social_media: [
    {
      id: "SM1",
      label: "Hook < 150 characters",
      description:
        "Each post opens with a hook under 150 characters that contains a question, a number, or a bold statement.",
    },
    {
      id: "SM2",
      label: "Explicit CTA",
      description:
        "Every post includes a clear call-to-action telling the reader exactly what to do next (comment, click, share, save).",
    },
    {
      id: "SM3",
      label: "Platform-adapted format",
      description:
        "Content format matches the target platform specs (character limits, image ratios, carousel structure, Reels vs. Stories).",
    },
    {
      id: "SM4",
      label: "Zero jargon",
      description:
        "No unexplained industry jargon or technical terms that the target audience would not immediately understand.",
    },
    {
      id: "SM5",
      label: "Calibrated hashtags",
      description:
        "Hashtags are relevant, mix broad and niche, and their count matches platform best practices (e.g. 3-5 for LinkedIn, 15-25 for Instagram).",
    },
    {
      id: "SM6",
      label: "Tone matches brief",
      description:
        "The writing tone, register (formal/informal), and vocabulary are consistent with the brand voice defined in the brief.",
    },
    {
      id: "SM7",
      label: "Zero placeholder",
      description:
        "No residual placeholders such as [INSERT], [TODO], [BRAND NAME], [XX], or empty sections remain in the deliverable.",
    },
  ],

  video: [
    {
      id: "VP1",
      label: "Hook in first 3 seconds",
      description:
        "The script opens with a hook designed to capture attention within the first 3 seconds of the video.",
    },
    {
      id: "VP2",
      label: "Duration matches brief",
      description:
        "The estimated script duration (based on word count at ~150 words/min) matches the duration specified in the brief.",
    },
    {
      id: "VP3",
      label: "HOOK / BODY / CTA structure",
      description:
        "The script follows a clear three-part structure: HOOK (attention grab), BODY (value delivery), CTA (action prompt).",
    },
    {
      id: "VP4",
      label: "Visual direction per scene",
      description:
        "Each scene or segment includes a visual direction note (shot type, on-screen text, b-roll suggestion, or transition cue).",
    },
    {
      id: "VP5",
      label: "Single final CTA",
      description:
        "The script ends with exactly one clear call-to-action. No competing CTAs dilute the closing message.",
    },
    {
      id: "VP6",
      label: "Written for spoken delivery",
      description:
        "The script uses natural spoken language: short sentences, contractions, conversational rhythm. No written-style prose.",
    },
    {
      id: "VP7",
      label: "Subtitles separated from voiceover",
      description:
        "On-screen text / subtitle copy is provided separately from the voiceover script, ready for production.",
    },
  ],

  brand_identity: [
    {
      id: "BI1",
      label: "Creative brief per deliverable",
      description:
        "Each brand deliverable (logo brief, color palette, typography, tagline) has its own creative brief with rationale and constraints.",
    },
    {
      id: "BI2",
      label: "Visual hierarchy defined",
      description:
        "The brand system defines a clear visual hierarchy: primary vs. secondary elements, heading vs. body treatment, accent usage.",
    },
    {
      id: "BI3",
      label: "CTA legibility",
      description:
        "All CTAs and action elements meet legibility standards: sufficient contrast, readable font size, clear visual weight.",
    },
    {
      id: "BI4",
      label: "Brand guidelines compliance",
      description:
        "All deliverables conform to the brand guidelines provided in the brief (colors, fonts, logo usage, tone).",
    },
    {
      id: "BI5",
      label: "Consistent cross-deliverable look",
      description:
        "All brand touchpoints (business card, social templates, letterhead, etc.) share a cohesive visual language.",
    },
    {
      id: "BI6",
      label: "Text legibility on all formats",
      description:
        "Body text and captions remain legible across all specified formats (print, web, mobile, social).",
    },
  ],

  seo_content: [
    {
      id: "SEO1",
      label: "Primary keyword in H1, meta title, intro, and at least one H2",
      description:
        "The primary keyword appears naturally in the H1 heading, the meta title, the first 100 words, and at least one H2 sub-heading.",
    },
    {
      id: "SEO2",
      label: "Meta title 50-60 characters",
      description:
        "The meta title is between 50 and 60 characters to avoid truncation in search results.",
    },
    {
      id: "SEO3",
      label: "Hierarchical Hn structure",
      description:
        "Headings follow a strict hierarchy: single H1, logical H2/H3 nesting, no skipped levels.",
    },
    {
      id: "SEO4",
      label: "Content length within 10% of target",
      description:
        "The final word count is within plus or minus 10% of the target length specified in the brief or content plan.",
    },
    {
      id: "SEO5",
      label: "Internal and external links included",
      description:
        "The content includes at least 2 internal links and 1 external link to an authoritative source.",
    },
    {
      id: "SEO6",
      label: "Intro under 100 words",
      description:
        "The introduction paragraph is under 100 words and clearly states what the reader will learn or gain.",
    },
    {
      id: "SEO7",
      label: "Zero generic filler content",
      description:
        "No generic sentences that could apply to any topic (e.g. 'In today\\'s fast-paced world'). Every sentence adds specific value.",
    },
  ],

  ad_campaign: [
    {
      id: "AD1",
      label: "Headline 30 characters or fewer",
      description:
        "Each ad headline is 30 characters or fewer to fit platform character limits (Google Ads, Meta, LinkedIn).",
    },
    {
      id: "AD2",
      label: "Value proposition in first line",
      description:
        "The primary value proposition appears in the first line of each ad variant, before any supporting details.",
    },
    {
      id: "AD3",
      label: "CTA uses action verb",
      description:
        "Every CTA starts with a strong action verb (Get, Start, Discover, Try, Claim) rather than passive phrasing.",
    },
    {
      id: "AD4",
      label: "A/B variants provided",
      description:
        "At least 2 distinct copy variants (A/B) are provided for each ad format, with meaningful differentiation.",
    },
    {
      id: "AD5",
      label: "Landing page alignment",
      description:
        "The ad messaging and CTA are consistent with the landing page specified in the brief. No promise mismatch.",
    },
  ],

  translation: [
    {
      id: "TR1",
      label: "Zero literal translation artifacts",
      description:
        "No awkward literal translations, calques, or source-language syntax patterns remain in the target text.",
    },
    {
      id: "TR2",
      label: "Cultural adaptation applied",
      description:
        "Idioms, references, humor, and examples have been adapted to the target culture rather than translated word-for-word.",
    },
    {
      id: "TR3",
      label: "Technical terminology consistent",
      description:
        "Industry-specific terms and product names are translated consistently throughout and match the provided glossary.",
    },
    {
      id: "TR4",
      label: "Source format preserved",
      description:
        "The translated deliverable preserves the original formatting: headings, bullet points, tables, emphasis, and layout.",
    },
    {
      id: "TR5",
      label: "Brand voice maintained",
      description:
        "The brand tone, register, and personality carry through in the translation. The translated text sounds intentional, not mechanical.",
    },
  ],

  custom: [
    {
      id: "CU1",
      label: "Deliverable matches brief requirements",
      description:
        "Every requirement listed in the brief is addressed in the deliverable. No scope item is missing or skipped.",
    },
    {
      id: "CU2",
      label: "Professional quality output",
      description:
        "The deliverable meets professional production standards: correct grammar, polished formatting, coherent structure.",
    },
    {
      id: "CU3",
      label: "Zero placeholder",
      description:
        "No residual placeholders such as [INSERT], [TODO], [BRAND NAME], [XX], or empty sections remain in the deliverable.",
    },
  ],
};

/**
 * Get quality gates for a given template type.
 * Falls back to "custom" gates if the type is not found.
 */
export function getGatesForTemplate(type: TemplateType): QualityGate[] {
  return QUALITY_GATES[type] ?? QUALITY_GATES.custom;
}

/**
 * Build the quality gates prompt text to inject into the QA agent system prompt.
 * Produces a structured instruction block that tells the QA agent to evaluate
 * each gate as PASS/FAIL and produce an actionable results table.
 */
export function buildGatesPrompt(type: TemplateType): string {
  const gates = getGatesForTemplate(type);

  const gateLines = gates
    .map((g) => `- **${g.id} — ${g.label}**: ${g.description}`)
    .join("\n");

  return `
QUALITY GATES EVALUATION (MANDATORY)
=====================================

After reviewing all upstream deliverables, you MUST evaluate each quality gate below as PASS or FAIL.
A gate is PASS only if the criterion is fully met with zero exceptions. Any partial compliance is FAIL.

GATES TO EVALUATE:
${gateLines}

OUTPUT FORMAT — include this table in your deliverable:

## Quality Gates Results

| Gate | Criterion | Verdict | Evidence |
|------|-----------|---------|----------|
${gates.map((g) => `| ${g.id} | ${g.label} | PASS/FAIL | [specific quote or reference from the deliverable] |`).join("\n")}

## Final Verdict

- If ALL gates are PASS: write "ALL GATES PASS — Deliverable approved."
- If ANY gate is FAIL: write "REVISION NEEDED" and list each failed gate with:
  1. What is wrong (specific quote or reference)
  2. What the corrected version should look like
  3. Which upstream step needs to make the fix

IMPORTANT: Do NOT skip any gate. Do NOT mark a gate PASS without providing evidence. Every verdict must cite a specific element from the reviewed content.`;
}
