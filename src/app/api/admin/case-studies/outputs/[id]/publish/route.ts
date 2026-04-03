import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { caseStudyOutputs, caseStudyCandidates } from "@/lib/db/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const CASE_STUDIES_FILE = join(
  process.cwd(),
  "src",
  "data",
  "case-studies.ts"
);

/**
 * POST /api/admin/case-studies/outputs/:id/publish
 * Publish a case study to the website by appending to case-studies.ts.
 * Admin role only.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Fetch output
    const [output] = await db
      .select()
      .from(caseStudyOutputs)
      .where(eq(caseStudyOutputs.id, id))
      .limit(1);

    if (!output) {
      return NextResponse.json({ error: "Output not found" }, { status: 404 });
    }

    if (output.outputType !== "case_study") {
      return NextResponse.json(
        { error: "Only case_study outputs can be published to the website" },
        { status: 400 }
      );
    }

    // 2. Validate slug
    const caseStudy = output.content as Record<string, unknown>;
    const slug = caseStudy.slug as string;

    if (!slug || typeof slug !== "string") {
      return NextResponse.json(
        { error: "Case study has no valid slug" },
        { status: 400 }
      );
    }

    // 3. Check slug uniqueness in DB
    const existing = await db
      .select({ id: caseStudyOutputs.id })
      .from(caseStudyOutputs)
      .where(and(
        eq(caseStudyOutputs.caseStudySlug, slug),
        isNotNull(caseStudyOutputs.publishedAt)
      ))
      .limit(1);

    if (existing.length > 0 && existing[0].id !== id) {
      const altSlug = `${slug}-v2`;
      caseStudy.slug = altSlug;
    }

    // 4. Try to write to static file (best effort — DB is source of truth)
    try {
      const fileContent = readFileSync(CASE_STUDIES_FILE, "utf-8");
      const tsObject = buildTsObject(caseStudy);
      const insertionPoint = fileContent.lastIndexOf("];");
      if (insertionPoint !== -1) {
        const newContent = fileContent.slice(0, insertionPoint) + `  ${tsObject},\n` + fileContent.slice(insertionPoint);
        writeFileSync(CASE_STUDIES_FILE, newContent, "utf-8");
      }
    } catch {
      console.warn("[Publish] Could not update case-studies.ts — DB still updated");
    }

    // 5. Update DB
    await db
      .update(caseStudyOutputs)
      .set({
        publishedAt: new Date(),
        publishedBy: "admin",
        caseStudySlug: caseStudy.slug as string,
        updatedAt: new Date(),
      })
      .where(eq(caseStudyOutputs.id, id));

    await db
      .update(caseStudyCandidates)
      .set({ status: "published", updatedAt: new Date() })
      .where(eq(caseStudyCandidates.id, output.candidateId));

    // Revalidate public pages immediately (don't wait for ISR cycle)
    revalidatePath("/case-studies");
    revalidatePath(`/case-studies/${caseStudy.slug}`);

    return NextResponse.json({
      success: true,
      slug: caseStudy.slug,
      message: `Case study published at /case-studies/${caseStudy.slug}`,
    });
  } catch (error) {
    console.error("Error publishing case study:", error);
    return NextResponse.json(
      { error: "Publish failed" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/case-studies/outputs/:id/publish
 * Unpublish a case study — remove from case-studies.ts.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [output] = await db
      .select()
      .from(caseStudyOutputs)
      .where(eq(caseStudyOutputs.id, id))
      .limit(1);

    if (!output || !output.publishedAt) {
      return NextResponse.json(
        { error: "Output not found or not published" },
        { status: 404 }
      );
    }

    // Try to remove from static file (best effort — DB is the source of truth)
    if (output.caseStudySlug) {
      try {
        const fileContent = readFileSync(CASE_STUDIES_FILE, "utf-8");
        const slugPattern = `slug: "${output.caseStudySlug}"`;
        const slugIndex = fileContent.indexOf(slugPattern);
        if (slugIndex !== -1) {
          const braceStart = fileContent.lastIndexOf("{", slugIndex);
          let depth = 0;
          let braceEnd = -1;
          for (let i = braceStart; i < fileContent.length; i++) {
            if (fileContent[i] === "{") depth++;
            if (fileContent[i] === "}") {
              depth--;
              if (depth === 0) { braceEnd = i; break; }
            }
          }
          if (braceEnd > braceStart) {
            let removeEnd = braceEnd + 1;
            if (fileContent[removeEnd] === ",") removeEnd++;
            if (fileContent[removeEnd] === "\n") removeEnd++;
            let removeStart = braceStart;
            while (removeStart > 0 && fileContent[removeStart - 1] === " ") removeStart--;
            writeFileSync(CASE_STUDIES_FILE, fileContent.slice(0, removeStart) + fileContent.slice(removeEnd), "utf-8");
          }
        }
      } catch {
        // Static file cleanup failed — not critical, DB is source of truth
        console.warn("[Unpublish] Could not update case-studies.ts — DB still updated");
      }
    }

    // Update DB
    await db
      .update(caseStudyOutputs)
      .set({
        publishedAt: null,
        publishedBy: null,
        caseStudySlug: null,
        updatedAt: new Date(),
      })
      .where(eq(caseStudyOutputs.id, id));

    await db
      .update(caseStudyCandidates)
      .set({ status: "reviewed", updatedAt: new Date() })
      .where(eq(caseStudyCandidates.id, output.candidateId));

    // Revalidate public pages immediately
    if (output.caseStudySlug) {
      revalidatePath(`/case-studies/${output.caseStudySlug}`);
    }
    revalidatePath("/case-studies");

    return NextResponse.json({
      success: true,
      message: "Case study unpublished",
    });
  } catch (error) {
    console.error("Error unpublishing case study:", error);
    return NextResponse.json(
      { error: "Unpublish failed" },
      { status: 500 }
    );
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

// P0-2: Allowlist to prevent code injection via LLM-generated keys
const ALLOWED_CASE_STUDY_KEYS = new Set([
  "slug", "client", "deliverable", "volume", "turnaround", "outcome",
  "brief", "result", "headline", "keyMetric", "stats", "metaDescription",
  "category", "subtitle", "challenge", "solution", "resultsDetail", "tags", "image", "testimonial",
]);

function buildTsObject(obj: Record<string, unknown>): string {
  const lines: string[] = ["{"];
  for (const [key, value] of Object.entries(obj)) {
    if (!ALLOWED_CASE_STUDY_KEYS.has(key)) continue;
    if (value === undefined || value === null) continue;
    if (typeof value === "string") {
      lines.push(`    ${key}: ${JSON.stringify(value)},`);
    } else if (Array.isArray(value)) {
      if (value.length > 0 && typeof value[0] === "object") {
        // Array of objects (stats)
        const items = value.map(
          (item) =>
            `{ ${Object.entries(item as Record<string, unknown>)
              .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
              .join(", ")} }`
        );
        lines.push(`    ${key}: [${items.join(", ")}],`);
      } else {
        lines.push(`    ${key}: ${JSON.stringify(value)},`);
      }
    } else {
      lines.push(`    ${key}: ${JSON.stringify(value)},`);
    }
  }
  lines.push("  }");
  return lines.join("\n");
}
