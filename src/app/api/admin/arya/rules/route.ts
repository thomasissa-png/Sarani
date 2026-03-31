// SSR — CRUD for Arya permanent rules (promoted from learnings)
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { aryaRules, aryaLearnings } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { checkRateLimit } from "@/lib/rate-limit";

// ─── Validation schemas ───────────────────────────────────────────────────

const RULE_CATEGORIES = ["ton", "contenu", "structure", "pricing", "missing_info"] as const;

const CreateRuleSchema = z.object({
  learningId: z.string().uuid("learningId must be a valid UUID"),
  ruleText: z.string().min(5, "ruleText must be at least 5 characters"),
  category: z.enum(RULE_CATEGORIES),
});

const PatchRuleSchema = z.object({
  id: z.string().uuid("id must be a valid UUID"),
  active: z.literal(false),
  reason: z.string().min(1, "Deactivation reason is required"),
});

// ─── GET — List active rules ──────────────────────────────────────────────

export async function GET() {
  const session = await getUserFromSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rules = await db
      .select()
      .from(aryaRules)
      .where(eq(aryaRules.active, true))
      .orderBy(desc(aryaRules.createdAt));

    return NextResponse.json({ rules, count: rules.length });
  } catch (error) {
    console.error("[Arya Rules API] GET error:", error);
    return NextResponse.json({ error: "Failed to fetch rules" }, { status: 500 });
  }
}

// ─── POST — Promote a learning to a permanent rule ────────────────────────

export async function POST(request: NextRequest) {
  const session = await getUserFromSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!checkRateLimit("arya-rules-create", 10, 60_000)) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again in 1 minute." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  let body: z.infer<typeof CreateRuleSchema>;
  try {
    const rawBody = await request.json();
    body = CreateRuleSchema.parse(rawBody);
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
    // Verify the learning exists and is not already promoted
    const [learning] = await db
      .select()
      .from(aryaLearnings)
      .where(eq(aryaLearnings.id, body.learningId))
      .limit(1);

    if (!learning) {
      return NextResponse.json(
        { error: "Learning not found", learningId: body.learningId },
        { status: 404 }
      );
    }

    if (learning.promoted) {
      return NextResponse.json(
        {
          error: "Learning already promoted to a rule",
          existingRuleId: learning.promotedRuleId,
        },
        { status: 409 }
      );
    }

    // Create the rule
    const [rule] = await db
      .insert(aryaRules)
      .values({
        ruleText: body.ruleText,
        category: body.category,
        sourceLearningIds: [body.learningId],
        active: true,
      })
      .returning();

    // Mark the learning as promoted
    await db
      .update(aryaLearnings)
      .set({
        promoted: true,
        promotedRuleId: rule.id,
      })
      .where(eq(aryaLearnings.id, body.learningId));

    return NextResponse.json({ rule, promoted: true }, { status: 201 });
  } catch (error) {
    console.error("[Arya Rules API] POST error:", error);
    return NextResponse.json({ error: "Failed to create rule" }, { status: 500 });
  }
}

// ─── PATCH — Deactivate a rule (soft delete) ──────────────────────────────

export async function PATCH(request: NextRequest) {
  const session = await getUserFromSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: z.infer<typeof PatchRuleSchema>;
  try {
    const rawBody = await request.json();
    body = PatchRuleSchema.parse(rawBody);
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
    const [updated] = await db
      .update(aryaRules)
      .set({
        active: false,
        deactivatedAt: new Date(),
        deactivationReason: body.reason,
      })
      .where(eq(aryaRules.id, body.id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    return NextResponse.json({ rule: updated, deactivated: true });
  } catch (error) {
    console.error("[Arya Rules API] PATCH error:", error);
    return NextResponse.json({ error: "Failed to deactivate rule" }, { status: 500 });
  }
}
