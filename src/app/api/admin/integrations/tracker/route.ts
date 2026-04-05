import { NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";
import {
  getSpaces,
  getAllListsForSpace,
  getAllTasksForList,
  type ClickUpTask,
} from "@/lib/integrations/clickup";
import {
  getDriveItemByPath,
  readExcelUsedRange,
  listWorksheets,
} from "@/lib/integrations/sharepoint";
import { getInvoices, type EvolizInvoice } from "@/lib/integrations/evoliz";
import { fetchWithCache, readCache, writeCache, invalidateCache, logSync } from "@/lib/integrations/cache";
import {
  SHAREPOINT_TRACKERS_DRIVE_ID,
  TRACKERS_BASE_PATH,
  CACHE_TTL,
  CLIENT_MAPPINGS,
  CLICKUP_SPACES_WITHOUT_TRACKER,
  type ClientIntegrationMapping,
} from "@/lib/integrations/config";
import type {
  TrackerResponse,
  SourceMeta,
} from "@/types/integrations";

// Internal Excel space names to skip
const INTERNAL_SPACE_NAMES = new Set(
  CLICKUP_SPACES_WITHOUT_TRACKER.map((s) => s.name.toLowerCase())
);

import { parseExcelProjects, type ExcelProject } from "@/lib/integrations/excel-parser";
import { mergeData } from "@/lib/integrations/tracker-merge";

// ─── Data Fetchers ──────────────────────────────────────────────────────────

async function fetchClickUpTasks(): Promise<{
  tasks: ClickUpTask[];
  meta: SourceMeta;
}> {
  try {
    const result = await fetchWithCache<ClickUpTask[]>({
      cacheKey: "tracker:clickup_all_tasks",
      source: "clickup",
      ttlSeconds: CACHE_TTL.clickup,
      fetcher: async () => {
        const spaces = await getSpaces();
        const clientSpaces = spaces.filter(
          (s) => !INTERNAL_SPACE_NAMES.has(s.name.toLowerCase())
        );

        // P-01: Fetch ALL lists (folderless + inside folders) for all spaces in parallel
        const listsPerSpace = await Promise.all(
          clientSpaces.map((space) => getAllListsForSpace(space.id))
        );

        // Flatten all lists, then fetch tasks for all lists in parallel
        const allLists = listsPerSpace.flat();
        const taskResults = await Promise.allSettled(
          allLists.map((list) => getAllTasksForList(list.id))
        );

        const allTasks: ClickUpTask[] = [];
        for (const result of taskResults) {
          if (result.status === "fulfilled") {
            allTasks.push(...result.value);
          }
        }

        return allTasks;
      },
    });

    return {
      tasks: result.data,
      meta: {
        status: result.stale ? "stale" : "live",
        fetchedAt: result.fetchedAt.toISOString(),
      },
    };
  } catch (error) {
    console.error("[Tracker] ClickUp fetch error:", error);
    return {
      tasks: [],
      meta: {
        status: "unavailable",
        fetchedAt: null,
        error: error instanceof Error ? error.message : "Unknown error",
      },
    };
  }
}

/** Cache entry for a single Excel tracker file */
interface FileCacheEntry {
  projects: ExcelProject[];
  lastModified: string; // ISO date from SharePoint
}

/**
 * Fetch Excel trackers using incremental sync:
 * 1. Get file metadata (lightweight — just lastModifiedDateTime)
 * 2. Compare with cached version
 * 3. Only re-read files that changed since last sync
 * 4. Merge cached + fresh results
 */
async function fetchExcelTrackers(): Promise<{
  projects: ExcelProject[];
  meta: SourceMeta;
}> {
  try {
    // Deduplicate files
    const uniqueFiles = new Map<string, ClientIntegrationMapping>();
    for (const mapping of CLIENT_MAPPINGS) {
      if (!uniqueFiles.has(mapping.excelTrackerFilename)) {
        uniqueFiles.set(mapping.excelTrackerFilename, mapping);
      }
    }

    const allProjects: ExcelProject[] = [];
    let filesRead = 0;
    let filesSkipped = 0;

    // Process each file: check if changed, re-read only if needed
    for (const mapping of uniqueFiles.values()) {
      const cacheKey = `tracker:excel:${mapping.excelTrackerFilename}`;

      try {
        const filePath = `${TRACKERS_BASE_PATH}/${mapping.excelTrackerFilename}`;
        const item = await getDriveItemByPath(SHAREPOINT_TRACKERS_DRIVE_ID, filePath);
        const fileModified = item.lastModifiedDateTime;

        // Check if we have a cached version with the same lastModified
        const cached = await readCache<FileCacheEntry>(cacheKey);

        if (cached && !cached.stale && cached.data.lastModified === fileModified) {
          // File hasn't changed — use cached projects
          allProjects.push(...cached.data.projects);
          filesSkipped++;
          continue;
        }

        // File changed or no cache — re-read all sheets
        const projects = await readTrackerFile(mapping);
        allProjects.push(...projects);
        filesRead++;

        // Cache the result with the file's lastModified timestamp
        await writeCache(cacheKey, "sharepoint", {
          projects,
          lastModified: fileModified,
        } satisfies FileCacheEntry, CACHE_TTL.sharepoint);
      } catch (e) {
        // Try to use stale cache as fallback
        const cacheKey = `tracker:excel:${mapping.excelTrackerFilename}`;
        const staleCache = await readCache<FileCacheEntry>(cacheKey);
        if (staleCache) {
          allProjects.push(...staleCache.data.projects);
          filesSkipped++;
        } else {
          console.error(
            `[Tracker] Failed to read ${mapping.excelTrackerFilename}:`,
            e instanceof Error ? e.message : e
          );
        }
      }
    }

    await logSync({
      source: "sharepoint",
      action: "fetch_all_trackers",
      payload: { projectCount: allProjects.length, filesRead, filesSkipped },
    });

    return {
      projects: allProjects,
      meta: {
        status: "live",
        fetchedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error("[Tracker] SharePoint/Excel fetch error:", error);
    return {
      projects: [],
      meta: {
        status: "unavailable",
        fetchedAt: null,
        error: error instanceof Error ? error.message : "Unknown error",
      },
    };
  }
}

/** Sheet names to skip — these are dashboards/summaries, not project data */
const SKIP_SHEET_PATTERNS = [
  "performance",
  "dashboard",
  "overview",
  "template",
  "config",
  "instructions",
  "total",
];

/** Exact sheet names to skip (case-insensitive) — NOT partial matches */
const SKIP_SHEET_EXACT = new Set([
  "instructions",
  "total",
  "summary",
]);

function shouldSkipSheet(name: string): boolean {
  const lower = name.toLowerCase().trim();
  if (SKIP_SHEET_EXACT.has(lower)) return true;
  return SKIP_SHEET_PATTERNS.some((p) => lower.includes(p));
}

/**
 * Resolve the actual client name from a sheet name.
 * Some Excel files contain tabs for multiple clients
 * (e.g. ByteDance file has "TikTok France" AND "PICO Global" tabs).
 * Check if the sheet name matches a different CLIENT_MAPPINGS entry.
 */
function resolveClientFromSheet(
  sheetName: string,
  defaultClient: string
): string {
  const sheetLower = sheetName.toLowerCase();
  // Check if any other client mapping name appears in the sheet name
  for (const mapping of CLIENT_MAPPINGS) {
    const clientLower = mapping.clickupSpaceName.toLowerCase();
    // Skip the default client (already the fallback)
    if (clientLower === defaultClient.toLowerCase()) continue;
    // Check if client name (or first word) appears in sheet name
    const firstName = clientLower.split(/\s+/)[0];
    if (sheetLower.includes(firstName) && firstName.length >= 3) {
      return mapping.clickupSpaceName;
    }
  }
  return defaultClient;
}

/**
 * Read ALL sheets in a tracker file.
 * Each sheet = a division (e.g. "Sony France", "Sony Professional").
 * Skips dashboard/performance sheets.
 */
async function readTrackerFile(
  mapping: ClientIntegrationMapping
): Promise<ExcelProject[]> {
  const filePath = `${TRACKERS_BASE_PATH}/${mapping.excelTrackerFilename}`;
  const item = await getDriveItemByPath(SHAREPOINT_TRACKERS_DRIVE_ID, filePath);
  const fileWebUrl = item.webUrl || "";

  // List ALL worksheets in the workbook
  const sheets = await listWorksheets(SHAREPOINT_TRACKERS_DRIVE_ID, item.id);

  const allProjects: ExcelProject[] = [];

  // Read sheets in batches of 5 to avoid SharePoint Graph rate limiting
  const dataSheets = sheets.filter((sheet) => !shouldSkipSheet(sheet.name));
  const BATCH = 5;

  for (let i = 0; i < dataSheets.length; i += BATCH) {
    const batch = dataSheets.slice(i, i + BATCH);
    const batchResults = await Promise.allSettled(
      batch.map(async (sheet) => {
        try {
          const rangeData = await readExcelUsedRange(
            SHAREPOINT_TRACKERS_DRIVE_ID,
            item.id,
            sheet.name
          );

          // Determine the client name from the sheet name
          // Some files contain multiple clients in different tabs
          // (e.g. ByteDance file has TikTok tabs AND PICO tabs)
          const fallbackClient = resolveClientFromSheet(
            sheet.name,
            mapping.clickupSpaceName
          );
          const projects = parseExcelProjects(rangeData.values, fallbackClient);

          // Tag each project with the sheet/division name for better matching
          return projects.map((p) => ({
            ...p,
            // If the sheet name is different from the client name, add it as context
            category: p.category || sheet.name,
            // Tag source for "Open Tracker" link
            excelTrackerFile: mapping.excelTrackerFilename,
            excelSheetName: sheet.name,
            excelTrackerUrl: fileWebUrl,
          }));
        } catch (e) {
          console.error(
            `[Tracker] Failed to read sheet "${sheet.name}" in ${mapping.excelTrackerFilename}:`,
            e instanceof Error ? e.message : e
          );
          return [];
        }
      })
    );

    for (const result of batchResults) {
      if (result.status === "fulfilled") {
        allProjects.push(...result.value);
      }
    }
  }

  return allProjects;
}

async function fetchEvolizInvoices(): Promise<{
  invoices: EvolizInvoice[];
  meta: SourceMeta;
}> {
  try {
    const result = await fetchWithCache<EvolizInvoice[]>({
      cacheKey: "tracker:evoliz_all_invoices",
      source: "evoliz",
      ttlSeconds: CACHE_TTL.evoliz,
      fetcher: async () => {
        // Fetch all invoices (paginate if needed)
        const allInvoices: EvolizInvoice[] = [];
        let page = 1;
        const perPage = 100;
        let hasMore = true;

        while (hasMore) {
          const batch = await getInvoices({ page, perPage });
          allInvoices.push(...batch);
          hasMore = batch.length === perPage;
          page++;
          // R-01: Safety limit with warning when reached
          if (page > 50) {
            console.warn(
              `[Evoliz] Pagination safety limit reached (50 pages, ${allInvoices.length} invoices). ` +
              `Some invoices may be missing. Consider increasing the limit if Sarani grows.`
            );
            break;
          }
        }

        return allInvoices;
      },
    });

    return {
      invoices: result.data,
      meta: {
        status: result.stale ? "stale" : "live",
        fetchedAt: result.fetchedAt.toISOString(),
      },
    };
  } catch (error) {
    return {
      invoices: [],
      meta: {
        status: "unavailable",
        fetchedAt: null,
        error: error instanceof Error ? error.message : "Unknown error",
      },
    };
  }
}

// ─── Route Handler ──────────────────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    // Auth check — allow cron secret for background cache warming
    const cronSecret = request.headers.get("x-cron-secret");
    const isCron = cronSecret && cronSecret === process.env.CRON_SECRET;
    const session = isCron ? null : await getUserFromSession();
    if (!isCron && !session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // If force-refresh header is set, force a fresh fetch (don't serve stale)
    const forceRefresh = request.headers.get("x-force-refresh") === "true";
    if (forceRefresh) {
      // Invalidate per-file Excel caches + ClickUp + Evoliz
      const excelInvalidations = CLIENT_MAPPINGS.map((m) =>
        invalidateCache(`tracker:excel:${m.excelTrackerFilename}`)
      );
      await Promise.all([
        invalidateCache("tracker:clickup_all_tasks"),
        invalidateCache("tracker:evoliz_all_invoices"),
        ...excelInvalidations,
      ]);
    }

    // Fetch all 3 sources in parallel
    const [clickupResult, excelResult, evolizResult] = await Promise.all([
      fetchClickUpTasks(),
      fetchExcelTrackers(),
      fetchEvolizInvoices(),
    ]);

    // Merge the data
    const projects = mergeData(
      excelResult.projects,
      clickupResult.tasks,
      evolizResult.invoices
    );

    // S-01/S-02: Strip financial data for non-admin users
    // Cron calls get full data (for cache warming). User calls check role.
    const isAdmin = isCron || session?.role === "admin";
    const filteredProjects = isAdmin
      ? projects
      : projects.map(({ totalValue, invoiceStatus, invoiceNumber, ...rest }) => ({
          ...rest,
          totalValue: null,
          invoiceStatus: "",
          invoiceNumber: "",
        }));

    const response: TrackerResponse = {
      projects: filteredProjects,
      sources: {
        clickup: clickupResult.meta,
        sharepoint: excelResult.meta,
        evoliz: evolizResult.meta,
      },
      debug: {
        clickupTaskCount: clickupResult.tasks.length,
        excelProjectCount: excelResult.projects.length,
        evolizInvoiceCount: evolizResult.invoices.length,
        mergedProjectCount: projects.length,
      },
    };

    return NextResponse.json(response, {
      headers: {
        // max-age=120: browser cache serves instantly for 2 min (covers mobile cold start)
        // stale-while-revalidate=600: serve stale for 10 min while refreshing in background
        "Cache-Control": "private, max-age=120, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("Tracker API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tracker data." },
      { status: 500 }
    );
  }
}
