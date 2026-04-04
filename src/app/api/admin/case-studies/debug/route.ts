import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { caseStudyOutputs } from "@/lib/db/schema";
import { eq, isNotNull, and, desc } from "drizzle-orm";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * GET /api/admin/case-studies/debug
 * Diagnostic endpoint — returns the state of published case studies + font/logo availability.
 * Admin only. Use to debug why publish doesn't show or LinkedIn visual fails.
 */
export async function GET() {
  const diagnostics: Record<string, unknown> = {};

  // 1. Check published case studies in DB
  try {
    const published = await db
      .select({
        id: caseStudyOutputs.id,
        outputType: caseStudyOutputs.outputType,
        publishedAt: caseStudyOutputs.publishedAt,
        caseStudySlug: caseStudyOutputs.caseStudySlug,
        candidateId: caseStudyOutputs.candidateId,
      })
      .from(caseStudyOutputs)
      .where(
        and(
          eq(caseStudyOutputs.outputType, "case_study"),
          isNotNull(caseStudyOutputs.publishedAt)
        )
      )
      .orderBy(desc(caseStudyOutputs.publishedAt));

    diagnostics.publishedCaseStudies = {
      count: published.length,
      items: published.map((p) => ({
        id: p.id,
        slug: p.caseStudySlug,
        publishedAt: p.publishedAt?.toISOString(),
        candidateId: p.candidateId,
      })),
    };
  } catch (err) {
    diagnostics.publishedCaseStudies = {
      error: err instanceof Error ? err.message : "DB query failed",
    };
  }

  // 2. Check ALL case_study outputs (including unpublished)
  try {
    const all = await db
      .select({
        id: caseStudyOutputs.id,
        publishedAt: caseStudyOutputs.publishedAt,
        caseStudySlug: caseStudyOutputs.caseStudySlug,
      })
      .from(caseStudyOutputs)
      .where(eq(caseStudyOutputs.outputType, "case_study"));

    diagnostics.allCaseStudyOutputs = {
      total: all.length,
      published: all.filter((a) => a.publishedAt).length,
      unpublished: all.filter((a) => !a.publishedAt).length,
    };
  } catch (err) {
    diagnostics.allCaseStudyOutputs = {
      error: err instanceof Error ? err.message : "DB query failed",
    };
  }

  // 3. Check fonts for LinkedIn visual
  const fontPaths = [
    join(process.cwd(), "public", "fonts", "Outfit-Bold.ttf"),
    join(process.cwd(), ".next", "standalone", "public", "fonts", "Outfit-Bold.ttf"),
  ];
  const fontResults: Record<string, boolean> = {};
  for (const p of fontPaths) {
    try {
      await readFile(p);
      fontResults[p] = true;
    } catch {
      fontResults[p] = false;
    }
  }
  diagnostics.fonts = fontResults;

  // 4. Check Sarani logo
  const logoPaths = [
    join(process.cwd(), "public", "images", "logo-sarani-white.png"),
    join(process.cwd(), ".next", "standalone", "public", "images", "logo-sarani-white.png"),
  ];
  const logoResults: Record<string, boolean> = {};
  for (const p of logoPaths) {
    try {
      await readFile(p);
      logoResults[p] = true;
    } catch {
      logoResults[p] = false;
    }
  }
  diagnostics.logo = logoResults;

  // 5. Check next/og availability
  try {
    const { ImageResponse } = await import("next/og");
    diagnostics.nextOg = { available: true, type: typeof ImageResponse };
  } catch (err) {
    diagnostics.nextOg = { available: false, error: err instanceof Error ? err.message : "import failed" };
  }

  // 6. Environment
  diagnostics.env = {
    cwd: process.cwd(),
    nodeVersion: process.version,
    hasGraphCredentials: !!(process.env.MICROSOFT_TENANT_ID && process.env.MICROSOFT_CLIENT_ID),
  };

  return NextResponse.json(diagnostics, {
    headers: { "Cache-Control": "no-store" },
  });
}
