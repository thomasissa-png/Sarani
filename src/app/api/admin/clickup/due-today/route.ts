import { NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";

// ─── GET — ClickUp tasks due today ────────────────────────────────────────

export async function GET() {
  const session = await getUserFromSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.CLICKUP_API_KEY;
  const teamId = process.env.CLICKUP_WORKSPACE_ID;

  if (!apiKey || !teamId) {
    // Graceful degradation: no ClickUp configured
    return NextResponse.json({ tasks: [] });
  }

  try {
    // Calculate today's date range in Unix ms
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfDay = startOfDay + 86_400_000 - 1;

    const url = `https://api.clickup.com/api/v2/team/${teamId}/task?page=0&include_closed=false&due_date_gt=${startOfDay - 1}&due_date_lt=${endOfDay + 1}&subtasks=false`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(5_000),
    });

    if (!res.ok) {
      console.warn(`[ClickUp DueToday] API returned ${res.status}`);
      return NextResponse.json({ tasks: [] });
    }

    const data = await res.json() as {
      tasks: Array<{ id: string; name: string; url: string; due_date: string | null }>;
    };

    const tasks = data.tasks.map((t) => ({
      id: t.id,
      name: t.name,
      url: t.url,
    }));

    return NextResponse.json({ tasks });
  } catch (error) {
    console.warn("[ClickUp DueToday] Error:", error);
    return NextResponse.json({ tasks: [] });
  }
}
