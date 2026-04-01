import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  projectClosures,
  starPipelineItems,
  clients,
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

    const response = results.map((r) => ({
      ...r.closure,
      clientNameResolved: r.clientName,
      pipelineItems: pipelineItemsByClosureId[r.closure.id] ?? [],
    }));

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching closures:", error);
    return NextResponse.json(
      { error: "Failed to fetch closures" },
      { status: 500 }
    );
  }
}
