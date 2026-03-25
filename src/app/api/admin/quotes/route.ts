import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { quotes } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const session = await getUserFromSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const clientFilter = searchParams.get("client");

    const conditions = clientFilter
      ? eq(quotes.clientName, clientFilter)
      : undefined;

    const result = await db
      .select()
      .from(quotes)
      .where(conditions)
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
