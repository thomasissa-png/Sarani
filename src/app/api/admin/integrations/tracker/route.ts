import { NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";
import {
  getSpaces,
  getListsForSpace,
  getAllTasksForList,
  type ClickUpTask,
} from "@/lib/integrations/clickup";
import {
  getDriveItemByPath,
  readExcelUsedRange,
  resolveSheetName,
} from "@/lib/integrations/sharepoint";
import { getInvoices, type EvolizInvoice } from "@/lib/integrations/evoliz";
import { fetchWithCache, logSync } from "@/lib/integrations/cache";
import {
  SHAREPOINT_TRACKERS_DRIVE_ID,
  TRACKERS_BASE_PATH,
  CACHE_TTL,
  CLIENT_MAPPINGS,
  CLICKUP_SPACES_WITHOUT_TRACKER,
  EXCEL_SHEET_NAME_CANDIDATES,
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

        // P-01: Fetch lists for all spaces in parallel
        const listsPerSpace = await Promise.all(
          clientSpaces.map((space) => getListsForSpace(space.id))
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

async function fetchExcelTrackers(): Promise<{
  projects: ExcelProject[];
  meta: SourceMeta;
}> {
  try {
    const result = await fetchWithCache<ExcelProject[]>({
      cacheKey: "tracker:sharepoint_all_excel",
      source: "sharepoint",
      ttlSeconds: CACHE_TTL.sharepoint,
      fetcher: async () => {
        // P-02: Read all tracker files in parallel instead of sequentially
        const results = await Promise.allSettled(
          CLIENT_MAPPINGS.map((mapping) => readTrackerFile(mapping))
        );

        const allProjects: ExcelProject[] = [];
        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          if (result.status === "fulfilled") {
            allProjects.push(...result.value);
          } else {
            console.error(
              `Failed to read tracker for ${CLIENT_MAPPINGS[i].clickupSpaceName}:`,
              result.reason
            );
          }
        }

        await logSync({
          source: "sharepoint",
          action: "fetch_all_trackers",
          payload: { projectCount: allProjects.length },
        });

        return allProjects;
      },
    });

    return {
      projects: result.data,
      meta: {
        status: result.stale ? "stale" : "live",
        fetchedAt: result.fetchedAt.toISOString(),
      },
    };
  } catch (error) {
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

async function readTrackerFile(
  mapping: ClientIntegrationMapping
): Promise<ExcelProject[]> {
  const filePath = `${TRACKERS_BASE_PATH}/${mapping.excelTrackerFilename}`;
  const item = await getDriveItemByPath(SHAREPOINT_TRACKERS_DRIVE_ID, filePath);

  // Resolve actual sheet name via Graph API
  const sheetName = await resolveSheetName(
    SHAREPOINT_TRACKERS_DRIVE_ID,
    item.id,
    EXCEL_SHEET_NAME_CANDIDATES
  );

  const rangeData = await readExcelUsedRange(
    SHAREPOINT_TRACKERS_DRIVE_ID,
    item.id,
    sheetName
  );

  // M-02: Delegate parsing to shared excel-parser module
  return parseExcelProjects(rangeData.values, mapping.clickupSpaceName);
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
          if (page > 20) {
            console.warn(
              `[Evoliz] Pagination safety limit reached (20 pages, ${allInvoices.length} invoices). ` +
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

export async function GET() {
  try {
    // Auth check
    const session = await getUserFromSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    // Per spec BR-INT-02: "A user role never sees financial data (invoice amounts, billing status)"
    const filteredProjects = session.role === "admin"
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
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Tracker API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tracker data." },
      { status: 500 }
    );
  }
}
