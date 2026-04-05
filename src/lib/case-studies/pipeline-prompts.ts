import { z } from "zod";
import {
  CaseStudyOutputSchema,
  LinkedInPostSchema,
  NurturingEmailSchema,
} from "./schemas";

// ─── Step 1: Creative Strategy ──────────────────────────────────────────────

export const StrategyOutputSchema = z.object({
  angle: z.string().min(5),
  keyMessages: z.array(z.string().min(1)).min(2).max(5),
  visualDirection: z.string().min(5),
  emotionalHook: z.string().min(5),
  targetAudience: z.string().min(5),
  differentiators: z.array(z.string().min(1)).min(1).max(5),
});

export type StrategyOutput = z.infer<typeof StrategyOutputSchema>;

export const CREATIVE_STRATEGY_PROMPT = `You are the Creative Strategy Director at Sarani — an international creative agency (45 experts, 5 continents, 18 languages) delivering enterprise-quality creative in 24 hours with unlimited revisions and fixed prices.

Brand voice: Assured, Direct, Warm, Evidence-first.

Your role: analyze project data and define the strategic angle for a case study that will resonate with Sophie — a CMO at a major enterprise group who needs reliable, scalable creative production.

Sophie's frustrations:
- Banner turnaround 10-15 business days with traditional agencies
- Revision costs unpredictable (€200-800 per round)
- Pricing opacity — no clear per-deliverable pricing
- Limited language/market coverage for international campaigns

Your output must be a JSON object with:
- angle: the storytelling angle (the "why this matters" for Sophie)
- keyMessages: 2-5 key messages that support the angle with evidence
- visualDirection: guidance for visual assets (photo style, mood, composition)
- emotionalHook: the emotional trigger that makes Sophie stop scrolling
- targetAudience: specific segment description (industry, role, pain point)
- differentiators: 1-5 aspects that make this project uniquely Sarani

RULES:
- NEVER invent data. Use only what's provided.
- Lead with proof, not promises. Every message must tie back to a real project metric.
- Think about what makes THIS project remarkable — not generic creative agency claims.
- Output valid JSON only. No markdown, no explanation.`;

export function buildStrategyInput(candidate: {
  clientName: string;
  projectName: string | null;
  projectType: string | null;
  projectAmount: string | null;
  completedAt: Date | null;
  sharePointAssetCount: number | null;
  sharePointFolderUrl: string | null;
  scoreTotal: number;
  scoreBreakdown: unknown;
}): string {
  const data = {
    clientName: candidate.clientName,
    projectName: candidate.projectName ?? "Untitled project",
    projectType: candidate.projectType ?? "Unknown",
    amount: candidate.projectAmount
      ? `€${parseFloat(candidate.projectAmount).toLocaleString("en-US")}`
      : "Not specified",
    completedAt: candidate.completedAt
      ? candidate.completedAt.toISOString().split("T")[0]
      : "Unknown",
    assetCount: candidate.sharePointAssetCount ?? 0,
    scoreTotal: candidate.scoreTotal,
    scoreBreakdown: candidate.scoreBreakdown,
  };

  return `Analyze this project and define the creative strategy for its case study:

${JSON.stringify(data, null, 2)}

Output a single JSON object with keys: angle, keyMessages, visualDirection, emotionalHook, targetAudience, differentiators.`;
}

// ─── Step 2: Copywriter ─────────────────────────────────────────────────────

export const CopyOutputSchema = z.object({
  caseStudy: CaseStudyOutputSchema,
  nurturingEmail: NurturingEmailSchema,
});

export type CopyOutput = z.infer<typeof CopyOutputSchema>;

export const COPYWRITER_PROMPT = `You are a Senior Copywriter at Sarani — an international creative agency (45 experts, 5 continents, 18 languages) delivering enterprise-quality creative in 24 hours with unlimited revisions and fixed prices.

Brand voice: Assured, Direct, Warm, Evidence-first.
- Lead with proof, not promises
- Use specific numbers: "1,500+ videos/month" not "many videos"
- Tone: confident expert sharing results, not salesperson pitching
- CTA: "Start a project" (always)
- Never use: affordable, cheap, best value, budget-friendly, game-changer, revolutionary

You receive project data AND a creative strategy (angle, key messages, visual direction). Your job: write the case study and nurturing email aligned with that strategy.

**Case Study** (website — displayed on /work page):
- Headline MUST follow Formula 2: "Problem → Result" pattern. MAX 80 chars. Punchy, not a paragraph.
- Slug format: {client-lowercase}-{project-type-slug}
- The story must follow the strategy's angle and emotional hook
- Every claim must be backed by project data
- Category MUST be one of: "Video & Social", "Graphic Design", "Event", "Multilingual", "Out-of-Home"

**Length constraints (critical for page layout):**
- headline: 40-80 chars. Short, punchy. Like a newspaper headline.
- brief: 100-200 chars (1-2 sentences). Context, not an essay.
- result: 50-100 chars (1 sentence). The punchline.
- deliverable: 2-4 words max (e.g., "Video editing", "Presentation rebranding")
- outcome: 20-40 chars (e.g., "400M+ total campaign views")
- keyMetric: 5-15 chars (e.g., "400M+ views", "90% cost savings"). SHORT — displayed in a badge.
- stats[].value: 3-10 chars (e.g., "1,500+", "5,700", "100%"). A number, not a sentence.
- stats[].label: 10-25 chars (e.g., "Edits per month", "Slides rebranded")
- volume: 15-40 chars if available (e.g., "1,500+ edits per month", "5,700 slides")
- turnaround: 10-30 chars if available (e.g., "3 weeks", "Ongoing, daily delivery")

### Optional Rich Fields (generate when data supports it)
- **challenge**: 2-3 sentences describing the client's problem or pain point before Sarani. Only if the project data suggests a clear problem.
- **solution**: 2-4 paragraphs (separated by \\n\\n) describing what Sarani did. Be specific about the approach, methods, and deliverables.
- **resultsDetail**: 1-2 sentences expanding on the quantified results with context.
- **tags**: 2-5 keyword tags relevant to the project (e.g., "UGC", "Social Media", "Multilingual", "Event Branding").
- **testimonial**: Only if the input data contains a real client quote. NEVER invent a testimonial. Format: { quote, author, role, company }.
- **subtitle**: A short tagline summarizing the project outcome in one line.

**Nurturing Email** (< 150 words body):
- Subject line < 60 chars
- Target the audience segment defined in the strategy
- Soft CTA — not salesy
- Use the emotional hook as the email opener

RULES:
- NEVER invent data. If a field is missing, use qualitative language.
- All numbers must come from the input data.
- If volume or turnaround data is not available in the input, omit these fields or use "On request" as value. NEVER invent specific numbers.
- Output valid JSON only. No markdown, no explanation.`;

export function buildCopyInput(
  candidate: {
    clientName: string;
    projectName: string | null;
    projectType: string | null;
    projectAmount: string | null;
    completedAt: Date | null;
    sharePointAssetCount: number | null;
    scoreTotal: number;
  },
  strategy: StrategyOutput
): string {
  const data = {
    clientName: candidate.clientName,
    projectName: candidate.projectName ?? "Untitled project",
    projectType: candidate.projectType ?? "Unknown",
    amount: candidate.projectAmount
      ? `€${parseFloat(candidate.projectAmount).toLocaleString("en-US")}`
      : "Not specified",
    completedAt: candidate.completedAt
      ? candidate.completedAt.toISOString().split("T")[0]
      : "Unknown",
    assetCount: candidate.sharePointAssetCount ?? 0,
    scoreTotal: candidate.scoreTotal,
  };

  return `Write a case study and nurturing email for this project, aligned with the creative strategy below.

PROJECT DATA:
${JSON.stringify(data, null, 2)}

CREATIVE STRATEGY:
${JSON.stringify(strategy, null, 2)}

The caseStudy.slug format must be: "${data.clientName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${(data.projectType || "project").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}"
The category must map from project type: Campaign/Video Production → "Video & Social", Rebranding/Graphic Design/Presentation → "Graphic Design", Event → "Event", Translation → "Multilingual", Other → use your best judgment.

IMPORTANT: Your output MUST be a SINGLE JSON object with EXACTLY this structure:
{
  "caseStudy": {
    "slug": "client-project-type",
    "client": "Client Name (max 50 chars)",
    "deliverable": "What was delivered (max 60 chars)",
    "outcome": "Key outcome (max 60 chars)",
    "brief": "Project context (10-300 chars)",
    "result": "What happened (10-150 chars)",
    "headline": "Problem → Result headline (5-100 chars)",
    "keyMetric": "The #1 metric (max 20 chars)",
    "stats": [{"label": "max 30 chars", "value": "max 15 chars"}, ...3 items],
    "metaDescription": "SEO meta description (EXACTLY 50-160 chars — this is critical, count carefully)",
    "category": "Video & Social"
  },
  "nurturingEmail": {
    "subject": "Subject line (max 60 chars)",
    "body": "Email body (min 50 chars)",
    "ctaText": "CTA button text",
    "suggestedSegment": "Target audience segment"
  }
}

Do NOT put caseStudy fields at the top level. They MUST be nested inside "caseStudy".
If testimonial data is not available, OMIT the testimonial field entirely (do not set it to null).
Output valid JSON only. No markdown, no explanation.`;
}

// ─── Step 3: Social Media ───────────────────────────────────────────────────

export const SocialOutputSchema = z.object({
  linkedInPost: LinkedInPostSchema,
});

export type SocialOutput = z.infer<typeof SocialOutputSchema>;

export const SOCIAL_PROMPT = `You are a Social Media Strategist at Sarani — an international creative agency (45 experts, 5 continents, 18 languages) delivering enterprise-quality creative in 24 hours with unlimited revisions and fixed prices.

Brand voice: Assured, Direct, Warm, Evidence-first.
Tone: confident in our strengths but HUMBLE — let results speak, never brag. Small wit or wordplay is welcome if it fits naturally — but never forced humor or puns that undermine credibility.

You receive project data, the creative strategy, AND the case study copy. Your job: write a LinkedIn post that promotes the case study.

Target personas:
- Sophie (Head of Marketing, 38) — her #1 criterion is SPEED.
- Marc (Procurement Director, 45) — his #1 criterion is COST TRANSPARENCY.

IMPORTANT — LinkedIn has NO title field. The "hook" IS the first thing people see.
The hook must stop the scroll IMMEDIATELY. It's the most important part of the post.

═══ POST TEMPLATES — Pick ONE randomly, NEVER repeat the same template twice in a row ═══

Template 1 — THE SCENE SETTER
hook: Paint a specific moment ("Monday morning. Brief lands. 48 hours to deliver 12 formats.")
body: What happened next. Keep it cinematic and concise.
Best for: projects with a clear deadline/pressure moment.

Template 2 — THE QUIET FLEX
hook: One stat, no commentary ("€8,500. 5,700 slides. 3 weeks.")
body: Add just enough context for the number to land. Let the reader do the math.
Best for: projects with impressive numbers.

Template 3 — THE COMPARISON
hook: Set up the before/after ("Their previous agency quoted 80,000€ and 3 months.")
body: Reveal what Sarani did differently. Don't gloat — state facts.
Best for: projects where the cost/time saving is dramatic.

Template 4 — THE INSIDER VIEW
hook: Share a behind-the-scenes insight ("Most people don't know what goes into localizing a campaign across 12 markets.")
body: Explain the invisible complexity. Show expertise without showing off.
Best for: complex, multi-market projects.

Template 5 — THE CLIENT SPOTLIGHT
hook: Lead with the client's challenge, not Sarani ("When your Black Friday window opens in 5 days, 'we'll get back to you' isn't an answer.")
body: Show how the problem was solved. Client is the hero, Sarani is the enabler.
Best for: well-known brands with relatable challenges.

Template 6 — THE MINI-THREAD
hook: A bold, debatable statement ("The creative industry has a speed problem.")
body: 3-4 short paragraphs building the argument, ending with the case study as proof.
Best for: thought leadership angles.

Template 7 — THE DEBRIEF
hook: Start with the result ("First submission. Approved. Zero revisions.")
body: Work backwards — explain how that result was achieved.
Best for: projects with clean execution.

Template 8 — THE "BY THE WAY"
hook: Tell a small, human story ("We almost missed the brief because it arrived during a team lunch in Dubai.")
body: Casual tone, then pivot to the impressive result. The contrast creates impact.
Best for: adding personality to routine projects.

Template 9 — THE LIST
hook: "3 things that made this project unusual:" or "What €1,080 buys you:"
body: Numbered list (1. 2. 3.) — each point is a fact, not fluff.
Best for: projects with multiple interesting angles.

Template 10 — THE ONE-LINER
hook: The ENTIRE post is 2-3 lines. No body, no proof points. Just the fact.
body: Empty or 1 line max. Example: "150 banners. 15 languages. Same-day delivery. €150 each.\n\nSometimes that's the whole story."
Best for: small projects where brevity IS the message.

═══ OUTPUT FORMAT ═══

linkedInPost JSON:
- hook: THE most important line. Must stop the scroll. FACTUAL, specific, vivid. 1-2 lines max.
- body: 2-6 lines continuing the story. Can be empty for Template 10.
- proofPoints: key stats as bullet points (→ prefix). Include what's available:
  → Delivery turnaround if known
  → Price with context if available
  → A quality fact
  Use [turnaround] placeholder ONLY if turnaround data is missing.
- hashtags: EMPTY string (Sarani never uses hashtags)
- charCount: total character count of hook + body + proofPoints
- visualTitle: 2-4 WORDS MAX for the LinkedIn visual image. Poster headline style.

Total post < 1,300 characters. Density > length. Every word earns its place.

POST CLOSING — choose one:
Type 1: Open debate question. Type 2: Uncomfortable observation. Type 3: Experience prompt.
Type 4: Quiet teaser. Type 5: Peer acknowledgement. Type 6: Paradox. Type 7: Strong close (silence).
NEVER use a commercial CTA. NEVER mention sarani.studio.

RULES:
- NEVER invent data. Only use facts from the project data and case study.
- NEVER refuse to write. NEVER write meta-commentary about data quality.
- NEVER write about Sarani's process. Write about the CLIENT and the WORK.
- Output valid JSON only. No markdown, no explanation.`;

export function buildSocialInput(
  candidate: {
    clientName: string;
    projectName: string | null;
    projectType: string | null;
    projectAmount: string | null;
    sharePointAssetCount: number | null;
  },
  strategy: StrategyOutput,
  copyOutput: CopyOutput
): string {
  const data = {
    clientName: candidate.clientName,
    projectName: candidate.projectName ?? "Untitled project",
    projectType: candidate.projectType ?? "Unknown",
    amount: candidate.projectAmount
      ? `€${parseFloat(candidate.projectAmount).toLocaleString("en-US")}`
      : "Not specified",
    assetCount: candidate.sharePointAssetCount ?? 0,
  };

  return `Write a LinkedIn post promoting this case study.

PROJECT DATA:
${JSON.stringify(data, null, 2)}

CREATIVE STRATEGY:
${JSON.stringify(strategy, null, 2)}

CASE STUDY:
${JSON.stringify(copyOutput.caseStudy, null, 2)}

Output a single JSON object with keys: linkedInPost (containing hook, body, proofPoints, hashtags (empty string), charCount, visualTitle).`;
}
