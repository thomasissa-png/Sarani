import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { caseStudyCandidates } from "@/lib/db/schema";
import { eq, like, and, desc, gte, SQL } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const client = searchParams.get("client");
    const minScore = searchParams.get("minScore");
    const sort = searchParams.get("sort") ?? "score_desc";

    const conditions: SQL[] = [];

    if (status && status !== "all") {
      conditions.push(eq(caseStudyCandidates.status, status));
    }
    if (client) {
      conditions.push(like(caseStudyCandidates.clientName, `%${client}%`));
    }
    if (minScore) {
      const score = parseInt(minScore, 10);
      if (!isNaN(score)) {
        conditions.push(gte(caseStudyCandidates.scoreTotal, score));
      }
    }

    const orderBy =
      sort === "score_asc"
        ? caseStudyCandidates.scoreTotal
        : sort === "date_desc"
          ? desc(caseStudyCandidates.lastScannedAt)
          : sort === "client_asc"
            ? caseStudyCandidates.clientName
            : desc(caseStudyCandidates.scoreTotal);

    const result = await db
      .select()
      .from(caseStudyCandidates)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(orderBy);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching case study candidates:", error);
    return NextResponse.json(
      { error: "Failed to fetch candidates" },
      { status: 500 }
    );
  }
}
