// ─── GET /api/admin/case-studies/candidates/:id/linkedin-visual ───────────────
// Generates (or re-generates) the LinkedIn visual PNG for a case study candidate.
// Returns the image directly as Content-Type: image/png.
//
// Caching: stores the generated PNG as base64 in caseStudyOutputs (outputType =
// 'linkedin_visual'). Use ?regenerate=true to force re-generation.
//
// Rendering: SSR — on-demand generation per candidate, admin-only endpoint.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { caseStudyCandidates, caseStudyOutputs } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { UUID_REGEX, checkRateLimit } from "@/lib/rate-limit";
import { generateLinkedInVisual } from "@/lib/case-studies/linkedin-visual";
import { getClientLogoUrl } from "@/lib/case-studies/client-logos";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    // Rate limit: 20 requests per 60s (image generation is CPU-bound)
    if (!checkRateLimit("linkedin-visual-gen", 20, 60_000)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again shortly." },
        { status: 429 }
      );
    }

    const regenerate = request.nextUrl.searchParams.get("regenerate") === "true";

    // Check for cached visual in DB (unless regeneration is requested)
    if (!regenerate) {
      const [cached] = await db
        .select()
        .from(caseStudyOutputs)
        .where(
          and(
            eq(caseStudyOutputs.candidateId, id),
            eq(caseStudyOutputs.outputType, "linkedin_visual")
          )
        )
        .limit(1);

      if (cached?.content) {
        const content = cached.content as Record<string, unknown>;
        const base64Png = content.base64Png as string | undefined;
        if (base64Png) {
          const buffer = Buffer.from(base64Png, "base64");
          const arrayBuffer = new ArrayBuffer(buffer.length);
          const view = new Uint8Array(arrayBuffer);
          for (let i = 0; i < buffer.length; i++) {
            view[i] = buffer[i];
          }
          return new Response(arrayBuffer, {
            status: 200,
            headers: {
              "Content-Type": "image/png",
              "Content-Disposition": `inline; filename="linkedin-visual-${id}.png"`,
              "Cache-Control": "public, max-age=300",
            },
          });
        }
      }
    }

    // 1. Fetch candidate
    const [candidate] = await db
      .select()
      .from(caseStudyCandidates)
      .where(eq(caseStudyCandidates.id, id))
      .limit(1);

    if (!candidate) {
      return NextResponse.json(
        { error: "Candidate not found" },
        { status: 404 }
      );
    }

    // 2. Fetch outputs to get headline and visual URLs
    const outputs = await db
      .select()
      .from(caseStudyOutputs)
      .where(eq(caseStudyOutputs.candidateId, id));

    const caseStudyOutput = outputs.find((o) => o.outputType === "case_study");
    const content = caseStudyOutput?.content as Record<string, unknown> | undefined;

    // Build title: prefer headline from case study output, fallback to projectName
    const projectTitle =
      (content?.headline as string) ??
      candidate.projectName ??
      `${candidate.clientName} Project`;

    // Collect project images from case study output visuals
    const projectImages: string[] = [];
    if (content?.heroImage) projectImages.push(content.heroImage as string);
    if (content?.linkedInImage) projectImages.push(content.linkedInImage as string);
    if (content?.emailHeader) projectImages.push(content.emailHeader as string);

    // Fallback: check visualSuggestions on the candidate
    if (projectImages.length === 0 && candidate.visualSuggestions) {
      const suggestions = candidate.visualSuggestions as Array<{
        url: string;
        name: string;
        thumbnailUrl: string;
        selected: boolean;
      }>;
      const selected = suggestions.filter((s) => s.selected);
      const source = selected.length > 0 ? selected : suggestions;
      for (const img of source.slice(0, 3)) {
        projectImages.push(img.url);
      }
    }

    // Build secondary text: clientName + first stat if available
    let secondaryText: string | undefined;
    const stats = content?.stats as Array<{ label: string; value: string }> | undefined;
    if (stats && stats.length > 0) {
      secondaryText = `${candidate.clientName} — ${stats[0].value} ${stats[0].label}`;
    }

    // 3. Generate the visual
    const clientLogoUrl = getClientLogoUrl(candidate.clientName);

    const pngBuffer = await generateLinkedInVisual({
      clientName: candidate.clientName,
      projectTitle,
      accentWord: candidate.clientName,
      clientLogoUrl,
      projectImages,
      secondaryText,
    });

    // 4. Store in DB for caching
    const base64Png = pngBuffer.toString("base64");
    const existingVisual = outputs.find((o) => o.outputType === "linkedin_visual");

    if (existingVisual) {
      await db
        .update(caseStudyOutputs)
        .set({
          content: { base64Png, generatedAt: new Date().toISOString() },
          updatedAt: new Date(),
        })
        .where(eq(caseStudyOutputs.id, existingVisual.id));
    } else {
      await db.insert(caseStudyOutputs).values({
        candidateId: id,
        outputType: "linkedin_visual",
        content: { base64Png, generatedAt: new Date().toISOString() },
        currentVersion: 1,
      });
    }

    // 5. Return as PNG
    const arrayBuffer = new ArrayBuffer(pngBuffer.length);
    const view = new Uint8Array(arrayBuffer);
    for (let i = 0; i < pngBuffer.length; i++) {
      view[i] = pngBuffer[i];
    }
    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `inline; filename="linkedin-visual-${candidate.clientName.toLowerCase().replace(/\s+/g, "-")}.png"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[linkedin-visual] Error generating visual:", error);
    return NextResponse.json(
      { error: "Failed to generate LinkedIn visual" },
      { status: 500 }
    );
  }
}
