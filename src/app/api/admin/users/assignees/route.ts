import { NextRequest, NextResponse } from "next/server";
import { isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { isAuthenticatedFromCookie } from "@/lib/auth";

// ─── GET — List users with a ClickUp mapping (for assignee dropdowns) ──────
// Returns only users who have a clickupUserId set.
// Lightweight endpoint used by CreateBriefModal and AutoBriefCard.

export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const auth = await isAuthenticatedFromCookie(cookieHeader);
    if (!auth.authenticated) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const assignees = await db
      .select({
        name: users.name,
        clickupUserId: users.clickupUserId,
      })
      .from(users)
      .where(isNotNull(users.clickupUserId));

    return NextResponse.json({
      assignees: assignees.map((a) => ({
        name: a.name,
        clickupUserId: a.clickupUserId as number,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
