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
    // scoreTotal/scoreBreakdown intentionally excluded — internal metric, not for LLM
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

export const SOCIAL_PROMPT = `Write a LinkedIn post for Sarani, a creative agency.

You receive project data and a case study. Write a short, airy LinkedIn post.

═══ THE SARANI STYLE — Learn from these REAL posts ═══

Post 1:
"Aristocrat | ICE 2026 | Barcelona

One show. One presence.

For ICE 2026, the global gaming industry's largest European trade show, we transformed Aristocrat's escalator and pillar sponsorship into a bold, unified statement.

The goal was clear: bring Aristocrat Gaming and Aristocrat Interactive together under one cohesive visual identity, from the main lobby through to the booth.

Customers noticed. Teams noticed.

Big space. One collective brand."

Post 2:
"Times Square leaves no room for hesitation.

For Crocs' week-long takeover of TikTok Shop USA, Sarani created and adapted visuals designed to stand out on some of the biggest digital screens in the world.

Custom-built layouts, designed square by square. Assets adapted to the unique grid of Times Square screens. Clear, readable visuals built to hold attention at scale.

Global teamwork, high-visibility delivery.

Project lead: TikTok Shop USA"

Post 3:
"i-Run | adidas | Paris Pop-Up

Built to perform. Designed to stand out.

A Paris pop-up bringing i-Run and adidas together in a space where the product does the talking and the visuals keep up.

Fast execution, global teamwork. This was fun!

Project lead: Ubi"

Post 4:
"LIVE Production in New York for TikTok in front of an audience of millions with best-selling author Mel Robbins: done!"

Post 5:
"Launching new routes is about being seen clearly, at exactly the right moment.

For Air Corsica's expansion into Munich and Vienna, Sarani delivered a comprehensive suite of creative assets designed to cut through the noise of a busy airport.

Print. Digital. Video. High-impact, terminal-ready.

Global teamwork, real-world impact. Thanks for the trust on these launches.

Project lead: R-Advertising"

═══ THE HOOK IS EVERYTHING ═══

The hook is the ONLY thing people see before clicking "...see more". It must make them WANT to read.

Study the hooks from the 5 posts above:
- "Aristocrat | ICE 2026 | Barcelona" → Client | Event | Place. Clean. Specific.
- "Times Square leaves no room for hesitation." → The place IS the story. Intriguing.
- "i-Run | adidas | Paris Pop-Up" → Two brands | City | Format. You know what it is.
- "LIVE Production in New York for TikTok..." → What | Where | For whom. One breath.
- "Launching new routes is about being seen clearly, at exactly the right moment." → An insight.

The hook must do ONE of these:
A) Say something intriguing about the project that makes you want to read more → "Seasonal windows don't negotiate." / "Times Square leaves no room for hesitation."
B) Summarize everything in one breath → "5,700 slides. 3 weeks. 12 markets."
C) Use the Client | Event | Place format ONLY for events/shows → "Aristocrat | ICE 2026 | Barcelona"

Play with the project theme when possible. If it's a Summer campaign, use "summer" imagery. If it's Black Friday, the hook should feel urgent. If it's a live event, make it cinematic. The hook should feel like it BELONGS to this specific project — not a template you could paste on any project.

The hook must NEVER:
- Talk about Sarani ("We delivered...", "Sarani created...")
- Mention price, speed, or process
- Be generic ("Great project with a great client")
- Use the "Client | Project | Place" pipe format for non-events (it's lazy)

═══ WHAT MAKES THESE POSTS WORK ═══

1. They describe the WORK — the project, the client, the place. Not Sarani's business model.
2. They're AIRY — blank lines between every section. Never a wall of text.
3. They have STYLE — the writing plays with the project's own theme. A Summer campaign should feel warm. A Black Friday post should feel urgent. A live event should feel cinematic. The words match the energy of the project, not just describe it.
4. They have ONE clever line — a double meaning, a satisfying parallel. Not forced humor.
   "Customers noticed. Teams noticed." / "Big space. One collective brand." / "This was fun!"
4. They end warm — "Thanks for the trust.", "This was fun!", "Global teamwork." Not a sales pitch.
5. NO bullet points. NO scores. NO comparisons to other agencies. NO selling points.
6. Short is fine. Post 4 is ONE line and it works perfectly.

═══ WHAT TO NEVER DO ═══

Never write: "Fixed price: €3,585 — full scope, zero overruns"
Never write: "100/100 quality score"
Never write: "Unlike traditional agencies..."
Never write: "Unlimited revisions built in"
Never write: "Enterprise-grade seasonal creative"
Never write bullet lists with • or → or - as list markers
Never use hashtags (#anything)
Never use emojis
Never start with: "Thrilled to...", "Proud to share...", "Excited to...", "I'm...", "We're...", "So proud..."
Never mention the project price/amount in the post — the work matters, not the invoice

═══ OUTPUT ═══

JSON:
- hook: first 1-2 lines. Starts with client name, place, or project. Punchy.
- body: rest of the post. Short paragraphs separated by \\n\\n. Include a closer and "Project lead: X" if relevant.
- proofPoints: "" (always empty)
- hashtags: "" (always empty)
- charCount: total characters
- visualTitle: 2-4 UPPERCASE WORDS for the visual image (poster style: "I RUN STORE", "SUMMER CASHBACK", "350 SLIDES")

Output valid JSON only.`;

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
