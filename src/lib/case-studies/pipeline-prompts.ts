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

**Case Study** (website):
- Headline MUST follow Formula 2: "Problem → Result" pattern
- Slug format: {client-lowercase}-{project-type-slug}
- The story must follow the strategy's angle and emotional hook
- Every claim must be backed by project data
- Category MUST be one of: "Video & Social", "Graphic Design", "Event", "Multilingual", "Out-of-Home"

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
    "client": "Client Name",
    "deliverable": "What was delivered",
    "outcome": "Key outcome",
    "brief": "Project context (min 10 chars)",
    "result": "What happened (min 10 chars)",
    "headline": "Problem → Result headline",
    "keyMetric": "The #1 metric",
    "stats": [{"label": "...", "value": "..."}, {"label": "...", "value": "..."}, {"label": "...", "value": "..."}],
    "metaDescription": "SEO meta description (50-160 chars)",
    "category": "Video & Social"
  },
  "nurturingEmail": {
    "subject": "Subject line (<60 chars)",
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
Tone: confident in our strengths but HUMBLE — let results speak, never brag. Show competence through facts, not self-congratulation. Small wit or wordplay is welcome if it fits naturally — but never forced humor or puns that undermine credibility.

You receive project data, the creative strategy, AND the case study copy. Your job: write a LinkedIn post that promotes the case study.

Target personas:
- Sophie (Head of Marketing, 38) — her #1 criterion is SPEED. She needs to know the turnaround time.
- Marc (Procurement Director, 45) — his #1 criterion is COST TRANSPARENCY. He needs fixed pricing and no surprises.

LinkedIn post requirements:
- Total < 1,300 characters. Short posts are fine — density > length.
- hook: 1 attention-grabbing line that stops the scroll. MUST be FACTUAL — a specific scene, client name, deadline, or number. NEVER philosophical/abstract. A small, clever observation is welcome. Example: "Boulanger's seasonal window opened in 5 days. Bose brief landed on Monday. No pressure."
- body: 2-4 lines telling the story, grounded in real results. Be concise — every word earns its place.
- proofPoints: key stats as bullet points (→ prefix). MUST include:
  → Delivery turnaround (e.g., "Delivered in [X] days") — Sophie's #1 metric. Use [X] if unknown.
  → Fixed price WITH volume context (e.g., "€1,080 for [X] banner formats") — never price alone. Use [X] if unknown.
  → A verifiable quality fact: "Approved on first submission", "Zero revision disputes", or a real client quote. NEVER unsourced scores like "100/100".
- hashtags: leave EMPTY string — Sarani does not use hashtags on LinkedIn posts
- charCount: actual character count of hook + body + proofPoints combined
- Written from Sarani's perspective ("We delivered...")

POST CLOSING RULE — choose based on content type, NEVER default to a commercial CTA:

Type 1 — Open Debate Question: pose a question where smart people disagree. Use on thought leadership posts.
  Example: "Honest question — when did 'premium' become code for 'slow'?"
Type 2 — Uncomfortable Observation: one punchy line that stays with the reader. No question. Use when the post is already complete.
  Example: "The brands that push back the hardest get the best work. Still figuring out why."
Type 3 — Experience Prompt: invite the reader to share a specific lived moment. Use after proof points.
  Example: "What's the tightest turnaround you've ever pulled off? Genuinely curious."
Type 4 — Quiet Teaser: hint at the next story without revealing it. Use sparingly (1x per 2 weeks).
Type 5 — Peer Acknowledgement: recognize the complexity of Sophie's job. Warm, human.
Type 6 — Provocation Without Resolution: a paradox left open. High engagement, use 1x per month.
Type 7 — Nothing (Strong Close): the last fact IS the closing. The silence is the confidence. Use on short dense posts.

GLOBAL CLOSING RULES:
- NEVER use "Start a project → sarani.studio" as a post closing. That URL belongs in the LinkedIn profile bio, not in posts.
- NEVER end two consecutive posts with the same closing type.
- A post that needs a sales line at the end is a post where the results didn't speak loudly enough. Fix the body, not the closing.
- If the post data is incomplete (missing turnaround, volume), use [X] placeholders — the PM will fill them in during review.

RULES:
- NEVER invent data. Only use facts from the project data and case study.
- NEVER generate unsourced scores or ratings. If no verifiable quality metric exists, omit it.
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

Output a single JSON object with keys: linkedInPost (containing hook, body, proofPoints, hashtags (empty string), charCount).`;
}
