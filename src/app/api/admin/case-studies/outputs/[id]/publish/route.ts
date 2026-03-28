import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { caseStudyOutputs, caseStudyCandidates } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
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

    // 2. Read current case-studies.ts
    let fileContent: string;
    try {
      fileContent = readFileSync(CASE_STUDIES_FILE, "utf-8");
    } catch {
      return NextResponse.json(
        { error: "Could not read case-studies.ts file" },
        { status: 500 }
      );
    }

    // 3. Validate slug uniqueness
    const caseStudy = output.content as Record<string, unknown>;
    const slug = caseStudy.slug as string;

    if (!slug || typeof slug !== "string") {
      return NextResponse.json(
        { error: "Case study has no valid slug" },
        { status: 400 }
      );
    }

    // Check for slug conflict
    if (fileContent.includes(`slug: "${slug}"`)) {
      // Try appending -v2
      const altSlug = `${slug}-v2`;
      if (fileContent.includes(`slug: "${altSlug}"`)) {
        return NextResponse.json(
          {
            error: `Slug "${slug}" and "${altSlug}" both exist. Choose a different slug.`,
          },
          { status: 409 }
        );
      }
      caseStudy.slug = altSlug;
    }

    // 4. Build the CaseStudy object as a TypeScript literal
    const tsObject = buildTsObject(caseStudy);

    // 5. Insert before the closing `];`
    const insertionPoint = fileContent.lastIndexOf("];");
    if (insertionPoint === -1) {
      return NextResponse.json(
        { error: "Could not find array closing in case-studies.ts" },
        { status: 500 }
      );
    }

    const newContent =
      fileContent.slice(0, insertionPoint) +
      `  ${tsObject},\n` +
      fileContent.slice(insertionPoint);

    // 6. Write back
    try {
      writeFileSync(CASE_STUDIES_FILE, newContent, "utf-8");
    } catch (err) {
      return NextResponse.json(
        {
          error: `Failed to write case-studies.ts: ${err instanceof Error ? err.message : "unknown"}`,
        },
        { status: 500 }
      );
    }

    // 7. Update DB
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

    return NextResponse.json({
      success: true,
      slug: caseStudy.slug,
      message: `Case study published at /work/${caseStudy.slug}`,
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

    if (!output || !output.caseStudySlug) {
      return NextResponse.json(
        { error: "Output not found or not published" },
        { status: 404 }
      );
    }

    // Read file and remove the entry by slug
    let fileContent: string;
    try {
      fileContent = readFileSync(CASE_STUDIES_FILE, "utf-8");
    } catch {
      return NextResponse.json(
        { error: "Could not read case-studies.ts" },
        { status: 500 }
      );
    }

    // Find and remove the object block containing this slug
    const slugPattern = `slug: "${output.caseStudySlug}"`;
    const slugIndex = fileContent.indexOf(slugPattern);
    if (slugIndex === -1) {
      // Already removed — just update DB
    } else {
      // Find the enclosing { ... }, starting from before the slug
      let braceStart = fileContent.lastIndexOf("{", slugIndex);
      // Walk backwards to find the correct opening brace
      let depth = 0;
      let braceEnd = -1;
      for (let i = braceStart; i < fileContent.length; i++) {
        if (fileContent[i] === "{") depth++;
        if (fileContent[i] === "}") {
          depth--;
          if (depth === 0) {
            braceEnd = i;
            break;
          }
        }
      }

      if (braceEnd > braceStart) {
        // Remove the object + trailing comma and newline
        let removeEnd = braceEnd + 1;
        if (fileContent[removeEnd] === ",") removeEnd++;
        if (fileContent[removeEnd] === "\n") removeEnd++;

        // Also remove leading whitespace on the line
        let removeStart = braceStart;
        while (removeStart > 0 && fileContent[removeStart - 1] === " ") {
          removeStart--;
        }

        fileContent =
          fileContent.slice(0, removeStart) + fileContent.slice(removeEnd);
        writeFileSync(CASE_STUDIES_FILE, fileContent, "utf-8");
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

function buildTsObject(obj: Record<string, unknown>): string {
  const lines: string[] = ["{"];
  for (const [key, value] of Object.entries(obj)) {
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
