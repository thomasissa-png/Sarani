import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  projectClosures,
  starPipelineItems,
  clients,
  caseStudyCandidates,
} from "@/lib/db/schema";
import { isAuthenticatedFromCookie } from "@/lib/auth";
import {
  calculateStarScore,
  type StarCriteriaInput,
  type StarCriteriaScores,
} from "@/lib/arya/star-score";

// ─── Auth helper ──────────────────────────────────────────────────────────────

async function requireAdmin(
  request: NextRequest
): Promise<
  | { authorized: true; userId: string }
  | { authorized: false; response: NextResponse }
> {
  const cookieHeader = request.headers.get("cookie");
  const auth = await isAuthenticatedFromCookie(cookieHeader);
  if (!auth.authenticated || auth.role !== "admin") {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { authorized: true, userId: auth.userId ?? "unknown" };
}

// ─── Rate limiter (in-memory, 20/min) ─────────────────────────────────────────

const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) ?? [];
  const recent = timestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);

  if (recent.length >= RATE_LIMIT_MAX) {
    rateLimitMap.set(ip, recent);
    return true;
  }

  recent.push(now);
  rateLimitMap.set(ip, recent);
  return false;
}

function getIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
  );
}

// ─── Validation schemas ───────────────────────────────────────────────────────

const createClosureSchema = z.object({
  clickupTaskId: z.string().min(1, "ClickUp task ID is required"),
  closureReason: z.enum(["client_approved", "timeout_14d", "manual"]),
  projectName: z.string().min(1, "Project name is required"),
  clientId: z.string().uuid().optional(),
  // Star score inputs — optional, used for scoring
  clientName: z.string().optional(),
  clientRevenueEstimate: z.number().optional(),
  metrics: z.array(z.string()).optional(),
  projectType: z.string().optional(),
  marketsOrLanguages: z.number().optional(),
  creativeDescription: z.string().optional(),
  hasStrongNarrative: z.boolean().optional(),
  clientVerbatim: z.string().optional(),
  existingCaseStudiesInSector: z.number().optional(),
  demonstratesNewCapability: z.boolean().optional(),
  sector: z.string().optional(),
  caseStudyScore: z.number().min(0).max(100).optional(),
  // Score overrides (admin only)
  scoreOverrides: z
    .object({
      clientTier: z.number().min(5).max(25).optional(),
      measurableImpact: z.number().min(5).max(25).optional(),
      creativeAmbition: z.number().min(5).max(20).optional(),
      storytelling: z.number().min(5).max(15).optional(),
      portfolioGap: z.number().min(5).max(15).optional(),
    })
    .optional(),
});

// ─── Pipeline output types ────────────────────────────────────────────────────

const PIPELINE_OUTPUT_TYPES = [
  "case_study",
  "linkedin_post",
  "presentation_slide",
  "seo_signal",
] as const;

// ─── POST /api/admin/closures ─────────────────────────────────────────────────
// Trigger a project closure, compute star score, and create pipeline items if star.

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const authCheck = await requireAdmin(request);
    if (!authCheck.authorized) return authCheck.response;

    // Rate limit
    if (isRateLimited(getIp(request))) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    // Validate input
    const body = await request.json();
    const parsed = createClosureSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check for duplicate closure (idempotency)
    const existing = await db
      .select()
      .from(projectClosures)
      .where(eq(projectClosures.clickupTaskId, data.clickupTaskId))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        {
          error: "Project already has a closure record",
          closureId: existing[0].id,
        },
        { status: 409 }
      );
    }

    // Compute star score
    const starInput: StarCriteriaInput = {
      clientName: data.clientName ?? data.projectName,
      clientRevenueEstimate: data.clientRevenueEstimate,
      metrics: data.metrics ?? [],
      projectType: data.projectType ?? "",
      marketsOrLanguages: data.marketsOrLanguages,
      creativeDescription: data.creativeDescription,
      hasStrongNarrative: data.hasStrongNarrative,
      clientVerbatim: data.clientVerbatim,
      existingCaseStudiesInSector: data.existingCaseStudiesInSector ?? 3,
      demonstratesNewCapability: data.demonstratesNewCapability,
      sector: data.sector,
    };

    const overrides: Partial<StarCriteriaScores> | undefined =
      data.scoreOverrides
        ? {
            clientTier: data.scoreOverrides.clientTier,
            measurableImpact: data.scoreOverrides.measurableImpact,
            creativeAmbition: data.scoreOverrides.creativeAmbition,
            storytelling: data.scoreOverrides.storytelling,
            portfolioGap: data.scoreOverrides.portfolioGap,
          }
        : undefined;

    const starResult = calculateStarScore(
      starInput,
      data.caseStudyScore,
      overrides
    );

    // Determine closure status
    const closureStatus =
      starResult.starStatus === "STAR" ? "star_pipeline" : "closed";

    // Create closure record
    const [closure] = await db
      .insert(projectClosures)
      .values({
        clickupTaskId: data.clickupTaskId,
        clientId: data.clientId ?? null,
        projectName: data.projectName,
        status: closureStatus,
        closureReason: data.closureReason,
        starScore: starResult.totalScore,
        starDetails: starResult.scores,
        starStatus: starResult.starStatus,
        closedAt: new Date(),
        closedBy: authCheck.userId,
      })
      .returning();

    // If star, create pipeline items automatically
    let pipelineItems: Array<{
      id: string;
      outputType: string;
      status: string;
    }> = [];

    if (
      starResult.starStatus === "STAR" ||
      starResult.starStatus === "STRONG_STORY_WEAK_ASSETS"
    ) {
      const outputTypes =
        starResult.starStatus === "STAR"
          ? PIPELINE_OUTPUT_TYPES
          : (["linkedin_post"] as const);

      const insertValues = outputTypes.map((outputType) => ({
        closureId: closure.id,
        outputType,
        status: "pending" as const,
      }));

      pipelineItems = await db
        .insert(starPipelineItems)
        .values(insertValues)
        .returning({
          id: starPipelineItems.id,
          outputType: starPipelineItems.outputType,
          status: starPipelineItems.status,
        });
    }

    // Note: ClickUp status update is NOT done here automatically.
    // As per specs, Arya flags for PM validation — closure is PM-confirmed.
    // The ClickUp API call would be triggered separately after PM confirms.

    return NextResponse.json(
      {
        closure: {
          id: closure.id,
          clickupTaskId: closure.clickupTaskId,
          projectName: closure.projectName,
          status: closure.status,
          closureReason: closure.closureReason,
          starScore: starResult.totalScore,
          starStatus: starResult.starStatus,
          starDetails: starResult.scores,
          closedAt: closure.closedAt,
        },
        pipelineItems,
        pipelineRecommendation: starResult.pipelineRecommendation,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating project closure:", error);
    return NextResponse.json(
      { error: "Failed to create closure" },
      { status: 500 }
    );
  }
}

// ─── GET /api/admin/closures ──────────────────────────────────────────────────
// List recent closures, optionally filtered by status or star status.

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const authCheck = await requireAdmin(request);
    if (!authCheck.authorized) return authCheck.response;

    // Rate limit
    if (isRateLimited(getIp(request))) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const starStatus = searchParams.get("starStatus");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100);

    let query = db
      .select({
        closure: projectClosures,
        clientName: clients.name,
      })
      .from(projectClosures)
      .leftJoin(clients, eq(projectClosures.clientId, clients.id))
      .orderBy(desc(projectClosures.createdAt))
      .limit(limit);

    if (status) {
      query = query.where(eq(projectClosures.status, status)) as typeof query;
    }
    if (starStatus) {
      query = query.where(
        eq(projectClosures.starStatus, starStatus)
      ) as typeof query;
    }

    const results = await query;

    // For each closure, load its pipeline items
    const closureIds = results.map((r) => r.closure.id);
    let pipelineItemsByClosureId: Record<
      string,
      Array<{
        id: string;
        outputType: string;
        status: string;
        reviewedAt: Date | null;
      }>
    > = {};

    if (closureIds.length > 0) {
      const allPipelineItems = await db
        .select({
          id: starPipelineItems.id,
          closureId: starPipelineItems.closureId,
          outputType: starPipelineItems.outputType,
          status: starPipelineItems.status,
          reviewedAt: starPipelineItems.reviewedAt,
        })
        .from(starPipelineItems);

      for (const item of allPipelineItems) {
        if (!pipelineItemsByClosureId[item.closureId]) {
          pipelineItemsByClosureId[item.closureId] = [];
        }
        pipelineItemsByClosureId[item.closureId].push({
          id: item.id,
          outputType: item.outputType,
          status: item.status,
          reviewedAt: item.reviewedAt,
        });
      }
    }

    const closureResponse = results.map((r) => ({
      ...r.closure,
      clientNameResolved: r.clientName,
      pipelineItems: pipelineItemsByClosureId[r.closure.id] ?? [],
      source: "closure" as const,
    }));

    // Also fetch case_study_candidates (starred from tracker)
    // These are projects starred by PM that haven't been formally closed yet
    const candidates = await db
      .select()
      .from(caseStudyCandidates)
      .where(ne(caseStudyCandidates.status, "excluded"))
      .orderBy(desc(caseStudyCandidates.createdAt))
      .limit(limit);

    // Don't duplicate: exclude candidates whose clickupTaskId already appears in closures
    const closureTaskIds = new Set(results.map((r) => r.closure.clickupTaskId));
    const uniqueCandidates = candidates.filter(
      (c) => !closureTaskIds.has(c.clickupTaskId)
    );

    const candidateResponse = uniqueCandidates.map((c) => ({
      id: c.id,
      clickupTaskId: c.clickupTaskId,
      clientId: c.clientId,
      projectName: c.projectName ?? c.clientName,
      status: c.status,
      closureReason: "starred",
      starScore: c.scoreTotal,
      starDetails: null,
      starStatus: "STAR",
      closedAt: null,
      closedBy: null,
      createdAt: c.createdAt?.toISOString() ?? new Date().toISOString(),
      updatedAt: c.updatedAt?.toISOString() ?? new Date().toISOString(),
      clientNameResolved: c.clientName,
      pipelineItems: [],
      pipelineStatus: c.pipelineStatus ?? "idle",
      source: "candidate" as const,
    }));

    // Merge: candidates first (newest starred), then closures
    const response = [...candidateResponse, ...closureResponse];

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching closures:", error);
    return NextResponse.json(
      { error: "Failed to fetch closures" },
      { status: 500 }
    );
  }
}

// ─── PATCH /api/admin/closures ──────────────────────────────────────────────
// PM Star Override: validate/reject star status, or nominate a project as star.

const patchSchema = z.object({
  closureId: z.string().uuid("Closure ID must be a valid UUID"),
  action: z.enum(["confirm_star", "reject_star", "nominate_star"]),
  reason: z.string().min(1).max(500).optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const authCheck = await requireAdmin(request);
    if (!authCheck.authorized) return authCheck.response;

    if (isRateLimited(getIp(request))) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    const rawBody = await request.json();
    const body = patchSchema.parse(rawBody);

    // Fetch the closure
    const [closure] = await db
      .select()
      .from(projectClosures)
      .where(eq(projectClosures.id, body.closureId))
      .limit(1);

    if (!closure) {
      return NextResponse.json({ error: "Closure not found" }, { status: 404 });
    }

    if (body.action === "confirm_star") {
      // PM confirms Arya's star assessment — keep star status, mark as PM-validated
      await db
        .update(projectClosures)
        .set({
          starStatus: "STAR",
          status: "star_pipeline",
          closedBy: `pm_confirmed:${authCheck.userId}`,
        })
        .where(eq(projectClosures.id, body.closureId));

      // Create pipeline items if they don't exist yet
      const existingItems = await db
        .select({ id: starPipelineItems.id })
        .from(starPipelineItems)
        .where(eq(starPipelineItems.closureId, body.closureId))
        .limit(1);

      if (existingItems.length === 0) {
        const outputTypes = ["case_study", "linkedin_post", "presentation_slide", "seo_signal"] as const;
        await db.insert(starPipelineItems).values(
          outputTypes.map((type) => ({
            closureId: body.closureId,
            outputType: type,
            status: "pending",
          }))
        );
      }

      return NextResponse.json({ success: true, action: "confirmed", starStatus: "STAR" });

    } else if (body.action === "reject_star") {
      // PM overrides — project is NOT star despite Arya's score
      await db
        .update(projectClosures)
        .set({
          starStatus: "STANDARD",
          status: "closed",
          closedBy: `pm_rejected:${authCheck.userId}`,
        })
        .where(eq(projectClosures.id, body.closureId));

      // Remove pending pipeline items (keep published ones)
      await db
        .delete(starPipelineItems)
        .where(
          and(
            eq(starPipelineItems.closureId, body.closureId),
            eq(starPipelineItems.status, "pending")
          )
        );

      return NextResponse.json({ success: true, action: "rejected", starStatus: "STANDARD" });

    } else if (body.action === "nominate_star") {
      // PM nominates a non-star project as star (manual override upward)
      await db
        .update(projectClosures)
        .set({
          starStatus: "STAR",
          status: "star_pipeline",
          closedBy: `pm_nominated:${authCheck.userId}`,
        })
        .where(eq(projectClosures.id, body.closureId));

      // Create pipeline items
      const existingItems = await db
        .select({ id: starPipelineItems.id })
        .from(starPipelineItems)
        .where(eq(starPipelineItems.closureId, body.closureId))
        .limit(1);

      if (existingItems.length === 0) {
        const outputTypes = ["case_study", "linkedin_post", "presentation_slide", "seo_signal"] as const;
        await db.insert(starPipelineItems).values(
          outputTypes.map((type) => ({
            closureId: body.closureId,
            outputType: type,
            status: "pending",
          }))
        );
      }

      return NextResponse.json({ success: true, action: "nominated", starStatus: "STAR" });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating closure:", error);
    return NextResponse.json(
      { error: "Failed to update closure" },
      { status: 500 }
    );
  }
}
