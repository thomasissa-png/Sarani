import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromSession } from "@/lib/auth";

// ─── Validation ────────────────────────────────────────────────────────────

const SearchSchema = z.object({
  query: z.string().min(1).max(200),
});

// ─── POST — Search ClickUp tasks by name ──────────────────────────────────

export async function POST(request: NextRequest) {
  const session = await getUserFromSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  const apiKey = process.env.CLICKUP_API_KEY;
  const teamId = process.env.CLICKUP_WORKSPACE_ID;

  if (!apiKey || !teamId) {
    // Graceful degradation: no ClickUp configured
    return NextResponse.json({ taskId: null, taskUrl: null, taskName: null });
  }

  try {
    const searchUrl = `https://api.clickup.com/api/v2/team/${teamId}/task?page=0&include_closed=false&custom_task_ids=false&subtasks=false`;
    const res = await fetch(searchUrl, {
      method: "GET",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(5_000),
    });

    if (!res.ok) {
      console.warn(`[ClickUp Search] API returned ${res.status}`);
      return NextResponse.json({ taskId: null, taskUrl: null, taskName: null });
    }

    const data = await res.json() as {
      tasks: Array<{ id: string; name: string; url: string }>;
    };

    // Find the best match by comparing query against task names
    const queryLower = body.query.toLowerCase();
    const match = data.tasks.find((task) => {
      const nameLower = task.name.toLowerCase();
      // Check if query is a substring of task name or vice versa
      return nameLower.includes(queryLower) || queryLower.includes(nameLower);
    });

    if (match) {
      return NextResponse.json({
        taskId: match.id,
        taskUrl: match.url,
        taskName: match.name,
      });
    }

    // No match found
    return NextResponse.json({ taskId: null, taskUrl: null, taskName: null });
  } catch (error) {
    console.warn("[ClickUp Search] Error:", error);
    // Graceful degradation — return null, don't crash
    return NextResponse.json({ taskId: null, taskUrl: null, taskName: null });
  }
}
