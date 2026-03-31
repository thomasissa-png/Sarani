import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { aryaLearnings, aryaRules } from "@/lib/db/schema";
import { eq, and, desc, SQL } from "drizzle-orm";
import { callClaudeJSON } from "@/lib/ai/claude";
import { checkRateLimit } from "@/lib/rate-limit";

// ─── Types ─────────────────────────────────────────────────────────────────

const LEARNING_CATEGORIES = ["ton", "contenu", "structure", "pricing", "missing_info"] as const;
type LearningCategory = (typeof LEARNING_CATEGORIES)[number];

const ITEM_TYPES = [
  "email_draft", "brief", "quote", "pitch", "followup", "ack_receipt",
] as const;

interface CategorizationResult {
  category: LearningCategory;
  diffSummary: string;
}

interface CoherenceFlag {
  conflictingRuleId: string;
  conflictingRuleText: string;
  message: string;
}

// ─── Validation schemas ───────────────────────────────────────────────────

const GetFiltersSchema = z.object({
  category: z.enum(LEARNING_CATEGORIES).optional(),
  itemType: z.enum(ITEM_TYPES).optional(),
  promoted: z.enum(["true", "false"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

const CreateLearningSchema = z.object({
  itemType: z.enum(ITEM_TYPES),
  itemId: z.string().optional(),
  aryaOriginal: z.string().min(1),
  pmEdited: z.string().min(1),
  pmName: z.string().min(1),
  projectId: z.string().optional(),
  clientDomain: z.string().optional(),
});

// ─── Categorization prompt ────────────────────────────────────────────────

const CATEGORIZE_SYSTEM_PROMPT = `You are analyzing a PM's correction to an AI-generated text for Sarani (international creative agency). Compare the original and edited versions and categorize the type of correction.

Categories:
- "ton": tone/register changes (formal↔informal, assertive↔soft, etc.)
- "contenu": content changes (facts added/removed, information corrected, details changed)
- "structure": structural changes (reordering sections, reformatting, reorganizing)
- "pricing": pricing/commercial changes (prices, discounts, payment terms, commercial offers)
- "missing_info": information was missing from original and PM had to add it

Return JSON:
{
  "category": "ton"|"contenu"|"structure"|"pricing"|"missing_info",
  "diffSummary": "2-3 sentences describing what the PM changed and why (inferred)"
}

Rules:
- Return valid JSON only, no markdown.
- Be specific in diffSummary — reference actual words/phrases that changed.
- If multiple categories apply, pick the dominant one.`;

// ─── Helpers ──────────────────────────────────────────────────────────────

async function categorizeLearning(
  original: string,
  edited: string
): Promise<CategorizationResult> {
  const result = await callClaudeJSON<CategorizationResult>({
    systemPrompt: CATEGORIZE_SYSTEM_PROMPT,
    userMessage: `ORIGINAL:\n${original.slice(0, 3000)}\n\nEDITED BY PM:\n${edited.slice(0, 3000)}`,
    model: "claude-haiku-4-5-20251001",
    maxTokens: 512,
    timeout: 10_000,
  });
  return result.data;
}

async function checkCoherence(
  category: LearningCategory,
  diffSummary: string
): Promise<CoherenceFlag | null> {
  // Fetch active rules in the same category
  const activeRules = await db
    .select()
    .from(aryaRules)
    .where(and(eq(aryaRules.active, true), eq(aryaRules.category, category)));

  if (activeRules.length === 0) return null;

  // Simple heuristic: if a rule exists in the same category, flag for review
  // A more sophisticated version could use LLM to detect actual contradiction
  // For now, we flag so the PM can confirm
  for (const rule of activeRules) {
    // Return the first potential conflict for PM review
    return {
      conflictingRuleId: rule.id,
      conflictingRuleText: rule.ruleText,
      message: `This correction is in category "${category}" which has an existing rule. Please verify this correction does not contradict: "${rule.ruleText}"`,
    };
  }

  return null;
}

async function checkPromotionCandidate(
  category: LearningCategory
): Promise<{ pattern: string; occurrences: number; suggestedRule: string } | null> {
  // Count non-promoted learnings in this category
  const recentLearnings = await db
    .select()
    .from(aryaLearnings)
    .where(
      and(
        eq(aryaLearnings.category, category),
        eq(aryaLearnings.promoted, false)
      )
    )
    .orderBy(desc(aryaLearnings.createdAt))
    .limit(10);

  if (recentLearnings.length < 3) return null;

  // If 3+ non-promoted learnings in same category, suggest promotion
  return {
    pattern: `Recurring "${category}" corrections detected`,
    occurrences: recentLearnings.length,
    suggestedRule: `PM consistently corrects ${category} in Arya outputs. Review the ${recentLearnings.length} most recent corrections to formulate a rule.`,
  };
}

// ─── GET — List learnings ─────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const session = await getUserFromSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  let filters: z.infer<typeof GetFiltersSchema>;
  try {
    filters = GetFiltersSchema.parse(params);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid filters", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });
  }

  try {
    const conditions: SQL[] = [];
    if (filters.category) {
      conditions.push(eq(aryaLearnings.category, filters.category));
    }
    if (filters.itemType) {
      conditions.push(eq(aryaLearnings.itemType, filters.itemType));
    }
    if (filters.promoted !== undefined) {
      conditions.push(eq(aryaLearnings.promoted, filters.promoted === "true"));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const learnings = await db
      .select()
      .from(aryaLearnings)
      .where(whereClause)
      .orderBy(desc(aryaLearnings.createdAt))
      .limit(filters.limit)
      .offset(filters.offset);

    return NextResponse.json({ learnings, count: learnings.length });
  } catch (error) {
    console.error("[Arya Learnings API] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch learnings" },
      { status: 500 }
    );
  }
}

// ─── POST — Create a new learning ────────────────────────────────────────

export async function POST(request: NextRequest) {
  const session = await getUserFromSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 20 requests per minute
  if (!checkRateLimit("arya-learnings", 20, 60_000)) {
    return NextResponse.json(
      { error: "Too many learning submissions. Please wait." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  let body: z.infer<typeof CreateLearningSchema>;
  try {
    const rawBody = await request.json();
    body = CreateLearningSchema.parse(rawBody);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    // Step 1: Categorize with Haiku
    const categorization = await categorizeLearning(body.aryaOriginal, body.pmEdited);

    // Step 2: Check coherence against active rules
    const coherenceFlag = await checkCoherence(
      categorization.category,
      categorization.diffSummary
    );

    // Step 3: Insert learning
    const [inserted] = await db
      .insert(aryaLearnings)
      .values({
        pmName: body.pmName,
        itemType: body.itemType,
        itemId: body.itemId,
        aryaOriginal: body.aryaOriginal,
        pmEdited: body.pmEdited,
        diffSummary: categorization.diffSummary,
        category: categorization.category,
        projectId: body.projectId,
        clientDomain: body.clientDomain,
      })
      .returning({ id: aryaLearnings.id });

    // Step 4: Check if promotion threshold reached
    const promotionCandidate = await checkPromotionCandidate(categorization.category);

    // Build response
    const response: Record<string, unknown> = {
      learningId: inserted.id,
      category: categorization.category,
      diffSummary: categorization.diffSummary,
    };

    if (coherenceFlag) {
      response.coherenceFlag = coherenceFlag;
    }

    if (promotionCandidate) {
      response.promotionCandidate = promotionCandidate;
    }

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("[Arya Learnings API] POST error:", error);

    const message =
      error instanceof Error ? error.message : "Failed to create learning";

    if (message.toLowerCase().includes("timeout")) {
      return NextResponse.json(
        { error: "Categorization timed out. Please try again." },
        { status: 504 }
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
