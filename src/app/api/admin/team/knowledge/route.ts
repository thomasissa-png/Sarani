import { NextRequest, NextResponse } from "next/server";
import { eq, and, SQL } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { teamKnowledge } from "@/lib/db/schema";
import { isAuthenticatedFromCookie } from "@/lib/auth";

// ─── Auth helper ──────────────────────────────────────────────────────────────

async function requireAdmin(
  request: NextRequest
): Promise<
  | { authorized: true }
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
  return { authorized: true };
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
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

// ─── Validation schemas ───────────────────────────────────────────────────────

const createSchema = z.object({
  teamMemberEmail: z.string().email().max(255),
  teamMemberName: z.string().min(1).max(255),
  role: z.string().min(1).max(50),
  category: z.string().min(1).max(50),
  knowledgeText: z.string().min(1),
  source: z.string().max(500).optional(),
  confidence: z.enum(["confirmed", "observed", "hypothesized"]).optional(),
});

const patchSchema = z.object({
  id: z.string().uuid(),
  teamMemberEmail: z.string().email().max(255).optional(),
  teamMemberName: z.string().min(1).max(255).optional(),
  role: z.string().min(1).max(50).optional(),
  category: z.string().min(1).max(50).optional(),
  knowledgeText: z.string().min(1).optional(),
  source: z.string().max(500).nullable().optional(),
  confidence: z.enum(["confirmed", "observed", "hypothesized"]).optional(),
  isActive: z.boolean().optional(),
});

// ─── GET /api/admin/team/knowledge ────────────────────────────────────────────
// Filters: ?role=designer&category=skill&member_email=x@sarani.studio

export async function GET(request: NextRequest) {
  try {
    const check = await requireAdmin(request);
    if (!check.authorized) return check.response;

    const url = new URL(request.url);
    const role = url.searchParams.get("role");
    const category = url.searchParams.get("category");
    const memberEmail = url.searchParams.get("member_email");

    const conditions: SQL[] = [];
    if (role) conditions.push(eq(teamKnowledge.role, role));
    if (category) conditions.push(eq(teamKnowledge.category, category));
    if (memberEmail)
      conditions.push(eq(teamKnowledge.teamMemberEmail, memberEmail));

    const rows = await db
      .select()
      .from(teamKnowledge)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return NextResponse.json({ knowledge: rows });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// ─── POST /api/admin/team/knowledge ───────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const check = await requireAdmin(request);
    if (!check.authorized) return check.response;

    if (isRateLimited(getIp(request))) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const [created] = await db
      .insert(teamKnowledge)
      .values({
        teamMemberEmail: parsed.data.teamMemberEmail,
        teamMemberName: parsed.data.teamMemberName,
        role: parsed.data.role,
        category: parsed.data.category,
        knowledgeText: parsed.data.knowledgeText,
        source: parsed.data.source ?? null,
        confidence: parsed.data.confidence ?? "observed",
      })
      .returning();

    return NextResponse.json({ knowledge: created }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// ─── PATCH /api/admin/team/knowledge ──────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    const check = await requireAdmin(request);
    if (!check.authorized) return check.response;

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { id, ...updates } = parsed.data;

    // Build update object — only include provided fields
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (updates.teamMemberEmail !== undefined) updateData.teamMemberEmail = updates.teamMemberEmail;
    if (updates.teamMemberName !== undefined) updateData.teamMemberName = updates.teamMemberName;
    if (updates.role !== undefined) updateData.role = updates.role;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.knowledgeText !== undefined) updateData.knowledgeText = updates.knowledgeText;
    if (updates.source !== undefined) updateData.source = updates.source;
    if (updates.confidence !== undefined) updateData.confidence = updates.confidence;
    if (updates.isActive !== undefined) updateData.isActive = updates.isActive;

    const [updated] = await db
      .update(teamKnowledge)
      .set(updateData)
      .where(eq(teamKnowledge.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ knowledge: updated });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
