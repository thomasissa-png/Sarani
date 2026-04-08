import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { caseStudyCandidates, caseStudyOutputs } from "@/lib/db/schema";
import { eq, isNotNull, and, desc } from "drizzle-orm";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * GET /api/admin/case-studies/debug
 * Comprehensive diagnostic endpoint — checks EVERYTHING that can fail in the pipeline.
 * Hit this URL on Replit to see exactly what's configured and what's broken.
 */
export async function GET() {
  const diagnostics: Record<string, unknown> = {};

  // ─── 1. Environment Variables ──────────────────────────────────────
  diagnostics.envVars = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? `set (${process.env.OPENAI_API_KEY.substring(0, 7)}...)` : "❌ NOT SET — visual will use Satori fallback",
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? `set (${process.env.ANTHROPIC_API_KEY.substring(0, 7)}...)` : "❌ NOT SET — pipeline will fail",
    MICROSOFT_TENANT_ID: process.env.MICROSOFT_TENANT_ID ? "set" : "❌ NOT SET — SharePoint won't work",
    MICROSOFT_CLIENT_ID: process.env.MICROSOFT_CLIENT_ID ? "set" : "❌ NOT SET",
    MICROSOFT_CLIENT_SECRET: process.env.MICROSOFT_CLIENT_SECRET ? "set" : "❌ NOT SET",
    CLICKUP_API_KEY: process.env.CLICKUP_API_KEY ? "set" : "❌ NOT SET",
    DATABASE_URL: process.env.DATABASE_URL ? "set" : "❌ NOT SET",
    NODE_ENV: process.env.NODE_ENV ?? "undefined",
    cwd: process.cwd(),
    nodeVersion: process.version,
  };

  // ─── 2. OpenAI Connectivity Test ──────────────────────────────────
  if (process.env.OPENAI_API_KEY) {
    try {
      const OpenAI = (await import("openai")).default;
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        timeout: 10_000,
      });
      // Quick validation — list models to confirm key works
      const models = await openai.models.list();
      const imageModels = [];
      for await (const model of models) {
        if (model.id.includes("image") || model.id.includes("dall")) {
          imageModels.push(model.id);
        }
        if (imageModels.length >= 5) break;
      }
      diagnostics.openai = {
        status: "✅ Connected",
        availableImageModels: imageModels,
        gptImage1Available: imageModels.some(m => m.includes("gpt-image")),
      };
    } catch (err) {
      diagnostics.openai = {
        status: "❌ Failed",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  } else {
    diagnostics.openai = {
      status: "⚠️ Skipped — no OPENAI_API_KEY",
      consequence: "LinkedIn visuals will use Satori (flat dark background, no AI art)",
    };
  }

  // ─── 3. SharePoint Connectivity Test ──────────────────────────────
  if (process.env.MICROSOFT_TENANT_ID && process.env.MICROSOFT_CLIENT_ID) {
    try {
      const { graphFetch } = await import("@/lib/integrations/sharepoint");
      const site = await graphFetch<{ displayName: string; webUrl: string }>(
        "/sites/saranistudio.sharepoint.com:/sites/SaraniAssets"
      );
      diagnostics.sharepoint = {
        status: "✅ Connected",
        siteName: site.displayName,
        siteUrl: site.webUrl,
      };
    } catch (err) {
      diagnostics.sharepoint = {
        status: "❌ Failed",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  } else {
    diagnostics.sharepoint = {
      status: "⚠️ Skipped — Microsoft credentials not set",
    };
  }

  // ─── 4. Recent Pipeline Runs ──────────────────────────────────────
  try {
    const recentCandidates = await db
      .select({
        id: caseStudyCandidates.id,
        clientName: caseStudyCandidates.clientName,
        projectName: caseStudyCandidates.projectName,
        status: caseStudyCandidates.status,
        pipelineStatus: caseStudyCandidates.pipelineStatus,
        sharePointFolderUrl: caseStudyCandidates.sharePointFolderUrl,
        updatedAt: caseStudyCandidates.updatedAt,
      })
      .from(caseStudyCandidates)
      .orderBy(desc(caseStudyCandidates.updatedAt))
      .limit(5);

    diagnostics.recentPipelines = recentCandidates.map((c) => ({
      id: c.id,
      client: c.clientName,
      project: c.projectName,
      status: c.status,
      pipelineStatus: c.pipelineStatus,
      hasSPFolder: !!c.sharePointFolderUrl,
      spFolderUrl: c.sharePointFolderUrl?.substring(0, 100) ?? null,
      updatedAt: c.updatedAt?.toISOString(),
    }));
  } catch (err) {
    diagnostics.recentPipelines = {
      error: err instanceof Error ? err.message : "DB query failed",
    };
  }

  // ─── 5. Visual Cache Status (last 5 candidates) ──────────────────
  try {
    const visuals = await db
      .select({
        id: caseStudyOutputs.id,
        candidateId: caseStudyOutputs.candidateId,
        outputType: caseStudyOutputs.outputType,
        updatedAt: caseStudyOutputs.updatedAt,
      })
      .from(caseStudyOutputs)
      .where(eq(caseStudyOutputs.outputType, "linkedin_visual"))
      .orderBy(desc(caseStudyOutputs.updatedAt))
      .limit(5);

    diagnostics.cachedVisuals = visuals.map((v) => ({
      id: v.id,
      candidateId: v.candidateId,
      updatedAt: v.updatedAt?.toISOString(),
      note: "Use ?regenerate=true on the visual endpoint to force regeneration with OpenAI",
    }));
  } catch (err) {
    diagnostics.cachedVisuals = {
      error: err instanceof Error ? err.message : "DB query failed",
    };
  }

  // ─── 6. Font & Logo Files ─────────────────────────────────────────
  const filesToCheck = {
    "Poppins-Bold.ttf": join(process.cwd(), "public", "fonts", "Poppins-Bold.ttf"),
    "Poppins-Regular.ttf": join(process.cwd(), "public", "fonts", "Poppins-Regular.ttf"),
    "logo-sarani-white.png": join(process.cwd(), "public", "images", "logo-sarani-white.png"),
  };
  const fileResults: Record<string, string> = {};
  for (const [name, path] of Object.entries(filesToCheck)) {
    try {
      const buf = await readFile(path);
      fileResults[name] = `✅ Found (${(buf.length / 1024).toFixed(0)} KB)`;
    } catch {
      fileResults[name] = "❌ Not found";
    }
  }
  diagnostics.files = fileResults;

  // ─── 7. Published Case Studies ────────────────────────────────────
  try {
    const published = await db
      .select({
        id: caseStudyOutputs.id,
        caseStudySlug: caseStudyOutputs.caseStudySlug,
        publishedAt: caseStudyOutputs.publishedAt,
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
        slug: p.caseStudySlug,
        publishedAt: p.publishedAt?.toISOString(),
      })),
    };
  } catch (err) {
    diagnostics.publishedCaseStudies = {
      error: err instanceof Error ? err.message : "DB query failed",
    };
  }

  // ─── 8. Action Items ──────────────────────────────────────────────
  const actions: string[] = [];
  if (!process.env.OPENAI_API_KEY) {
    actions.push("Add OPENAI_API_KEY to Replit Secrets for AI-generated visual backgrounds");
  }
  if (!process.env.MICROSOFT_TENANT_ID) {
    actions.push("Add Microsoft Graph credentials for SharePoint integration");
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    actions.push("Add ANTHROPIC_API_KEY for pipeline LLM calls");
  }
  if (actions.length === 0) {
    actions.push("All environment variables configured. If pipeline still fails, check the logs above.");
  }
  diagnostics.actionItems = actions;

  return NextResponse.json(diagnostics, {
    headers: { "Cache-Control": "no-store" },
  });
}
