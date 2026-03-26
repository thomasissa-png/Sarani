import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { quotes } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const session = await getUserFromSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const clientFilter = searchParams.get("client");

    // S-03: Role-based filtering — users see only their own quotes, admins see all
    const conditions: ReturnType<typeof eq>[] = [];
    if (clientFilter) {
      conditions.push(eq(quotes.clientName, clientFilter));
    }
    if (session.role !== "admin") {
      conditions.push(eq(quotes.createdBy, session.userId));
    }

    const whereClause = conditions.length > 0
      ? conditions.length === 1 ? conditions[0] : and(...conditions)
      : undefined;

    const result = await db
      .select()
      .from(quotes)
      .where(whereClause)
      .orderBy(desc(quotes.createdAt));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching quotes:", error);
    return NextResponse.json(
      { error: "Failed to fetch quotes" },
      { status: 500 }
    );
  }
}
