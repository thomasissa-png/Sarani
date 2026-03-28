import { NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";
import { readCache } from "@/lib/integrations/cache";
import type { ClickUpTask } from "@/lib/integrations/clickup";
import type { ExcelProject } from "@/lib/integrations/excel-parser";
import type { EvolizInvoice } from "@/lib/integrations/evoliz";
import { mergeData } from "@/lib/integrations/tracker-merge";

/**
 * GET /api/admin/integrations/merge-audit
 * Diagnostic endpoint: runs the merge and reports match statistics.
 * Temporary — can be removed after debugging.
 */
export async function GET() {
  const session = await getUserFromSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Read cached data (same as tracker route uses)
    const clickupCache = await readCache<ClickUpTask[]>("tracker:clickup_all_tasks");
    const evolizCache = await readCache<EvolizInvoice[]>("tracker:evoliz_invoices");

    // Read all Excel caches
    const allExcelProjects: ExcelProject[] = [];
    // We need to scan for excel cache keys
    const excelCacheKeys = [
      "tracker:excel:01. Sarani_Sony Projects.xlsx",
      "tracker:excel:02. Sarani_Bytedance Projects.xlsx",
      "tracker:excel:03. Sarani_Other Projects.xlsx",
      "tracker:excel:04. Sarani_Aristocrat Projects.xlsx",
      "tracker:excel:09. Sarani_Projets Ubi.xlsx",
      "tracker:excel:10. Sarani_Aujan Projects.xlsx",
      "tracker:excel:11. Sarani_Bose Projects.xlsx",
      "tracker:excel:12. Sarani_Lamarck Projects.xlsx",
      "tracker:excel:13. Sarani_CMC Markets Project.xlsx",
    ];

    for (const key of excelCacheKeys) {
      const cache = await readCache<ExcelProject[]>(key);
      if (cache?.data) {
        allExcelProjects.push(...cache.data);
      }
    }

    const clickupTasks = clickupCache?.data ?? [];
    const evolizInvoices = evolizCache?.data ?? [];

    // Run merge
    const merged = mergeData(allExcelProjects, clickupTasks, evolizInvoices);

    // Filter to 2024+ projects
    const since2024 = merged.filter((p) => {
      if (!p.date) return true; // include undated — they're likely recent
      const year = new Date(p.date).getFullYear();
      return year >= 2024 || isNaN(year);
    });

    // Categorize
    const bothSources = since2024.filter((p) => p.clickupTaskUrl && (p.excelTrackerFile || p.totalValue !== null));
    const clickupOnly = since2024.filter((p) => p.clickupTaskUrl && !p.excelTrackerFile && p.totalValue === null);
    const excelOnly = since2024.filter((p) => !p.clickupTaskUrl && (p.excelTrackerFile || p.totalValue !== null));
    const neither = since2024.filter((p) => !p.clickupTaskUrl && !p.excelTrackerFile && p.totalValue === null);

    const matchRate = since2024.length > 0
      ? ((bothSources.length / since2024.length) * 100).toFixed(1)
      : "N/A";

    // Top unmatched for debugging
    const topClickupOnly = clickupOnly.slice(0, 20).map((p) => ({
      client: p.client,
      project: p.project,
      date: p.date,
      status: p.status,
    }));

    const topExcelOnly = excelOnly.slice(0, 20).map((p) => ({
      client: p.client,
      project: p.project,
      date: p.date,
      value: p.totalValue,
      tracker: p.excelTrackerFile,
    }));

    return NextResponse.json({
      summary: {
        totalMerged: merged.length,
        since2024: since2024.length,
        bothSources: bothSources.length,
        clickupOnly: clickupOnly.length,
        excelOnly: excelOnly.length,
        neither: neither.length,
        matchRate: `${matchRate}%`,
      },
      rawCounts: {
        clickupTasks: clickupTasks.length,
        excelProjects: allExcelProjects.length,
        evolizInvoices: evolizInvoices.length,
      },
      unmatchedClickup: topClickupOnly,
      unmatchedExcel: topExcelOnly,
    });
  } catch (error) {
    console.error("[MergeAudit] Error:", error);
    return NextResponse.json(
      { error: "Audit failed", detail: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}
