import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentOutputs, caseStudyCandidates, landingPages } from "@/lib/db/schema";
import { sql, eq, gte, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

    const [errorsResult, caseStudyGeneratingResult, landingPageGeneratingResult] =
      await Promise.all([
        // agentOutputs with status='error' in last 48h
        db
          .select({ count: sql<number>`count(*)` })
          .from(agentOutputs)
          .where(
            and(
              eq(agentOutputs.status, "error"),
              gte(agentOutputs.createdAt, fortyEightHoursAgo)
            )
          )
          .then((r) => Number(r[0]?.count ?? 0)),

        // caseStudyCandidates with status='generating'
        db
          .select({ count: sql<number>`count(*)` })
          .from(caseStudyCandidates)
          .where(eq(caseStudyCandidates.status, "generating"))
          .then((r) => Number(r[0]?.count ?? 0)),

        // landingPages with status='generating'
        db
          .select({ count: sql<number>`count(*)` })
          .from(landingPages)
          .where(eq(landingPages.status, "generating"))
          .then((r) => Number(r[0]?.count ?? 0)),
      ]);

    return NextResponse.json({
      errors: errorsResult,
      generating: caseStudyGeneratingResult + landingPageGeneratingResult,
      caseStudiesGenerating: caseStudyGeneratingResult,
      landingPagesGenerating: landingPageGeneratingResult,
    });
  } catch (error) {
    console.error("Error fetching badges:", error);
    return NextResponse.json(
      { error: "Failed to fetch badges" },
      { status: 500 }
    );
  }
}
