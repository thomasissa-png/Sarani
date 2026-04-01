import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { quotes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// ─── GET /api/admin/quotes/[id] ────────────────────────────────────────────
// Returns a single quote by ID. Admin only.

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const session = await getUserFromSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const [quote] = await db
      .select()
      .from(quotes)
      .where(eq(quotes.id, id))
      .limit(1);

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    return NextResponse.json(quote);
  } catch (error) {
    console.error("[Quotes] GET by ID failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch quote" },
      { status: 500 }
    );
  }
}
