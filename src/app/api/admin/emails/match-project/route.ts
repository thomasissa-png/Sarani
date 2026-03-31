import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getUserFromSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { emailProjectLinks } from "@/lib/db/schema";
import { checkRateLimit } from "@/lib/rate-limit";
import { getSpaces, getTasksForList, getListsForSpace } from "@/lib/integrations/clickup";
import type { ClickUpTask } from "@/lib/integrations/clickup";

// ─── Validation ────────────────────────────────────────────────────────────

const MatchProjectSchema = z.object({
  conversationId: z.string().optional(),
  clientDomain: z.string().min(1),
  subject: z.string().min(1),
  bodyPreview: z.string().optional(),
});

// ─── String similarity (normalized Levenshtein) ────────────────────────────

function levenshteinDistance(a: string, b: string): number {
  const la = a.length;
  const lb = b.length;
  const dp: number[][] = Array.from({ length: la + 1 }, () =>
    Array.from({ length: lb + 1 }, () => 0)
  );

  for (let i = 0; i <= la; i++) dp[i][0] = i;
  for (let j = 0; j <= lb; j++) dp[0][j] = j;

  for (let i = 1; i <= la; i++) {
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[la][lb];
}

function normalizedSimilarity(a: string, b: string): number {
  const aLower = a.toLowerCase().trim();
  const bLower = b.toLowerCase().trim();
  if (aLower === bLower) return 1;
  const maxLen = Math.max(aLower.length, bLower.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(aLower, bLower) / maxLen;
}

// ─── Statuses that indicate a project may need reopening ───────────────────

const CLOSED_STATUSES = new Set(["approved", "invoiced", "closed", "complete"]);

// ─── POST handler ──────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Auth guard
  const session = await getUserFromSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 20 requests per minute
  if (!checkRateLimit("email-match-project", 20, 60_000)) {
    return NextResponse.json(
      { error: "Too many match requests. Please wait." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  // Parse & validate input
  let input: z.infer<typeof MatchProjectSchema>;
  try {
    const rawBody = await request.json();
    input = MatchProjectSchema.parse(rawBody);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Invalid JSON body. Send { conversationId?, clientDomain, subject, bodyPreview? }." },
      { status: 400 }
    );
  }

  try {
    // ── Strategy 1: Match by conversationId ──────────────────────────────
    if (input.conversationId) {
      const rows = await db
        .select()
        .from(emailProjectLinks)
        .where(eq(emailProjectLinks.conversationId, input.conversationId))
        .limit(1);

      if (rows.length > 0) {
        const link = rows[0];
        return NextResponse.json({
          matched: true,
          matchMethod: "conversation_id" as const,
          confidence: 1,
          projectName: link.projectName,
          clickupTaskId: link.clickupTaskId,
        });
      }
    }

    // ── Strategy 2: Fallback — domain + subject similarity via ClickUp ──
    const matchResult = await matchByDomainAndSubject(
      input.clientDomain,
      input.subject
    );

    return NextResponse.json(matchResult);
  } catch (error) {
    console.error("[Match Project] Error:", error);
    const message =
      error instanceof Error ? error.message : "Match failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── Fallback matching: domain + subject similarity ────────────────────────

interface MatchResult {
  matched: boolean;
  matchMethod?: "conversation_id" | "domain_subject_similarity";
  confidence?: number;
  projectName?: string;
  clickupTaskId?: string;
  projectStatus?: string;
  needsReopening?: boolean;
}

async function matchByDomainAndSubject(
  clientDomain: string,
  subject: string
): Promise<MatchResult> {
  // 1. Get all spaces → lists → tasks from ClickUp
  //    Filter tasks whose name or assignee domain matches clientDomain
  const domainLower = clientDomain.toLowerCase();

  let allTasks: ClickUpTask[] = [];

  try {
    const spaces = await getSpaces();

    // Fetch tasks from all lists across all spaces (limited to first page per list for perf)
    for (const space of spaces) {
      const lists = await getListsForSpace(space.id);
      for (const list of lists) {
        const result = await getTasksForList(list.id, { page: 0 });
        allTasks.push(...result.tasks);
      }
    }
  } catch (error) {
    console.error("[Match Project] ClickUp fetch failed:", error);
    // If ClickUp is unreachable, we can't do fallback matching
    return { matched: false };
  }

  // 2. Filter tasks that likely belong to this client (by domain in name or assignees)
  const clientTasks = allTasks.filter((task) => {
    const nameLower = task.name.toLowerCase();
    // Check if the task name contains the domain root (e.g., "sony" for "sony.com")
    const domainRoot = domainLower.split(".")[0];
    return nameLower.includes(domainRoot);
  });

  if (clientTasks.length === 0) {
    return { matched: false };
  }

  // 3. Score each task by subject similarity
  let bestMatch: ClickUpTask | null = null;
  let bestScore = 0;

  for (const task of clientTasks) {
    const score = normalizedSimilarity(subject, task.name);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = task;
    }
  }

  // Threshold: only return match if confidence > 0.6
  if (!bestMatch || bestScore < 0.6) {
    return { matched: false };
  }

  const taskStatus = bestMatch.status.status.toLowerCase();

  return {
    matched: true,
    matchMethod: "domain_subject_similarity",
    confidence: Math.round(bestScore * 100) / 100,
    projectName: bestMatch.name,
    clickupTaskId: bestMatch.id,
    projectStatus: bestMatch.status.status,
    needsReopening: CLOSED_STATUSES.has(taskStatus),
  };
}
