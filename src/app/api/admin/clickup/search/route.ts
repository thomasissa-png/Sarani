import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromSession } from "@/lib/auth";
import { searchTaskByName, searchTasksByName } from "@/lib/integrations/clickup";
import { checkRateLimit } from "@/lib/rate-limit";

// ─── Validation ────────────────────────────────────────────────────────────

const SearchSchema = z.object({
  query: z.string().min(1).max(200),
  multi: z.boolean().optional().default(false),
});

// ─── POST — Search ClickUp tasks by name ──────────────────────────────────

export async function POST(request: NextRequest) {
  const session = await getUserFromSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!checkRateLimit("clickup-search", 20, 60_000)) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  let body: z.infer<typeof SearchSchema>;
  try {
    const rawBody = await request.json();
    body = SearchSchema.parse(rawBody);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Multi-result mode: return up to 5 matches for manual mapping UI
  if (body.multi) {
    const results = await searchTasksByName(body.query, 5);
    return NextResponse.json({ results });
  }

  // Single-result mode: backward compatible
  const result = await searchTaskByName(body.query);

  return NextResponse.json({
    taskId: result?.taskId ?? null,
    taskUrl: result?.taskUrl ?? null,
    taskName: result?.taskName ?? null,
  });
}
