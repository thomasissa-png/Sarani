import { NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

// ─── GET — Fetch ClickUp workspace members ──────────────────────────────────
// SSR route — fetches live member list from ClickUp API.
// Used by admin users page to map DB users to their ClickUp accounts.

export interface ClickUpMemberResponse {
  members: Array<{
    id: number;
    username: string;
    email: string;
  }>;
}

export async function GET() {
  const session = await getUserFromSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Rate limit: 10 requests per minute per global key (shared endpoint)
  if (!checkRateLimit("clickup-members", 10, 60_000)) {
    return NextResponse.json(
      { error: "Rate limited. Try again in a minute." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  const apiKey = process.env.CLICKUP_API_KEY;
  const teamId = process.env.CLICKUP_WORKSPACE_ID;

  if (!apiKey || !teamId) {
    return NextResponse.json(
      { error: "ClickUp API not configured" },
      { status: 503 }
    );
  }

  try {
    const response = await fetch(
      `https://api.clickup.com/api/v2/team/${teamId}/member`,
      {
        headers: { Authorization: apiKey },
        signal: AbortSignal.timeout(10_000), // 10s timeout
      }
    );

    if (!response.ok) {
      const text = await response.text().catch(() => "Unknown error");
      console.error(
        `[clickup-members] API error ${response.status}: ${text}`
      );
      return NextResponse.json(
        { error: "Failed to fetch ClickUp members" },
        { status: 502 }
      );
    }

    const data = await response.json();

    // ClickUp v2 returns { team: { members: [{ user: { id, username, email } }] } }
    // or for some endpoints: { members: [{ user: { id, username, email } }] }
    const rawMembers: Array<{ user: { id: number; username: string; email: string } }> =
      data?.team?.members ?? data?.members ?? [];

    const members = rawMembers
      .map((m) => ({
        id: m.user.id,
        username: m.user.username || "",
        email: m.user.email || "",
      }))
      .sort((a, b) => a.username.localeCompare(b.username));

    return NextResponse.json({ members });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      return NextResponse.json(
        { error: "ClickUp API request timed out" },
        { status: 504 }
      );
    }
    console.error("[clickup-members] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 }
    );
  }
}
