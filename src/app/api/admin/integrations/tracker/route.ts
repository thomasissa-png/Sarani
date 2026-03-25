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
} from "@/lib/integrations/sharepoint";
import { getInvoices, type EvolizInvoice } from "@/lib/integrations/evoliz";
import { fetchWithCache, logSync } from "@/lib/integrations/cache";
import {
  SHAREPOINT_TRACKERS_DRIVE_ID,
  TRACKERS_BASE_PATH,
  CACHE_TTL,
  CLIENT_MAPPINGS,
  CLICKUP_SPACES_WITHOUT_TRACKER,
  type ClientIntegrationMapping,
} from "@/lib/integrations/config";

// ─── Types ──────────────────────────────────────────────────────────────────

interface TrackerProject {
  client: string;
  project: string;
  date: string;
  contact: string;
  status: string;
  category: string;
  sharepointLink: string;
  totalValue: number | null;
  poNumber: string;
  invoiceStatus: string;
  invoiceNumber: string;
  clickupTaskUrl: string;
  clickupStatus: string;
}

interface TrackerResponse {
  projects: TrackerProject[];
  sources: {
    clickup: SourceMeta;
    sharepoint: SourceMeta;
    evoliz: SourceMeta;
  };
}

interface SourceMeta {
  status: "live" | "stale" | "unavailable";
  fetchedAt: string | null;
  error?: string;
}

// Internal Excel space names to skip
const INTERNAL_SPACE_NAMES = new Set(
  CLICKUP_SPACES_WITHOUT_TRACKER.map((s) => s.name.toLowerCase())
);

// ─── Excel Parsing Helpers ──────────────────────────────────────────────────

// Known Excel column headers (case-insensitive matching)
const COL_MAP = {
  customer: ["customer", "client"],
  division: ["division"],
  date: ["date"],
  project: ["project", "project name", "project description"],
  contact: ["contact", "contact name"],
  status: ["status"],
  category: ["category", "cat", "cat."],
  link: ["link", "sharepoint link", "folder link", "sharepoint"],
  totalValue: ["total value", "total value (eur)", "total", "total eur"],
  poNumber: ["po", "po number", "po #", "po#"],
  invoiceNumber: ["invoice", "invoice number", "invoice #", "inv", "inv."],
  invoiceStatus: [
    "invoice status",
    "payment status",
    "payment",
    "inv. status",
    "inv status",
  ],
} as const;

function findColumnIndex(
  headers: string[],
  aliases: readonly string[]
): number {
  const lower = headers.map((h) => h.toLowerCase().trim());
  for (const alias of aliases) {
    const idx = lower.indexOf(alias);
    if (idx !== -1) return idx;
  }
  return -1;
}

function cellToString(cell: string | number | boolean | null): string {
  if (cell === null || cell === undefined) return "";
  return String(cell).trim();
}

function cellToNumber(cell: string | number | boolean | null): number | null {
  if (cell === null || cell === undefined || cell === "") return null;
  const n = Number(cell);
  return isNaN(n) ? null : n;
}

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
        const allTasks: ClickUpTask[] = [];

        for (const space of spaces) {
          if (INTERNAL_SPACE_NAMES.has(space.name.toLowerCase())) continue;

          const lists = await getListsForSpace(space.id);
          for (const list of lists) {
            const tasks = await getAllTasksForList(list.id);
            allTasks.push(...tasks);
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

interface ExcelProject {
  client: string;
  project: string;
  date: string;
  contact: string;
  status: string;
  category: string;
  sharepointLink: string;
  totalValue: number | null;
  poNumber: string;
  invoiceNumber: string;
  invoiceStatus: string;
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
        const allProjects: ExcelProject[] = [];

        for (const mapping of CLIENT_MAPPINGS) {
          try {
            const projects = await readTrackerFile(mapping);
            allProjects.push(...projects);
          } catch (err) {
            console.error(
              `Failed to read tracker for ${mapping.clickupSpaceName}:`,
              err
            );
            // Continue with other trackers
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

  // Try common sheet names
  let rangeData;
  for (const sheetName of ["Sheet1", "Feuil1", "Feuille1"]) {
    try {
      rangeData = await readExcelUsedRange(
        SHAREPOINT_TRACKERS_DRIVE_ID,
        item.id,
        sheetName
      );
      break;
    } catch {
      // Try next sheet name
    }
  }

  if (!rangeData || rangeData.values.length < 2) return [];

  const headers = rangeData.values[0].map((h) =>
    h !== null && h !== undefined ? String(h) : ""
  );

  // Find column indices
  const colCustomer = findColumnIndex(headers, COL_MAP.customer);
  const colProject = findColumnIndex(headers, COL_MAP.project);
  const colDate = findColumnIndex(headers, COL_MAP.date);
  const colContact = findColumnIndex(headers, COL_MAP.contact);
  const colStatus = findColumnIndex(headers, COL_MAP.status);
  const colCategory = findColumnIndex(headers, COL_MAP.category);
  const colLink = findColumnIndex(headers, COL_MAP.link);
  const colTotalValue = findColumnIndex(headers, COL_MAP.totalValue);
  const colPoNumber = findColumnIndex(headers, COL_MAP.poNumber);
  const colInvoiceNumber = findColumnIndex(headers, COL_MAP.invoiceNumber);
  const colInvoiceStatus = findColumnIndex(headers, COL_MAP.invoiceStatus);

  // If no project column found, skip this file
  if (colProject === -1) return [];

  const dataRows = rangeData.values.slice(1);
  const projects: ExcelProject[] = [];

  for (const row of dataRows) {
    const projectName = cellToString(row[colProject]);
    if (!projectName) continue; // Skip empty rows

    // Use client from Excel "Customer" column, fallback to mapping space name
    const client =
      colCustomer !== -1
        ? cellToString(row[colCustomer]) || mapping.clickupSpaceName
        : mapping.clickupSpaceName;

    projects.push({
      client,
      project: projectName,
      date: colDate !== -1 ? cellToString(row[colDate]) : "",
      contact: colContact !== -1 ? cellToString(row[colContact]) : "",
      status: colStatus !== -1 ? cellToString(row[colStatus]) : "",
      category: colCategory !== -1 ? cellToString(row[colCategory]) : "",
      sharepointLink: colLink !== -1 ? cellToString(row[colLink]) : "",
      totalValue: colTotalValue !== -1 ? cellToNumber(row[colTotalValue]) : null,
      poNumber: colPoNumber !== -1 ? cellToString(row[colPoNumber]) : "",
      invoiceNumber:
        colInvoiceNumber !== -1 ? cellToString(row[colInvoiceNumber]) : "",
      invoiceStatus:
        colInvoiceStatus !== -1 ? cellToString(row[colInvoiceStatus]) : "",
    });
  }

  return projects;
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
          // Safety limit
          if (page > 20) break;
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

// ─── Merge Logic ────────────────────────────────────────────────────────────

function normalizeForMatch(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function mergeData(
  excelProjects: ExcelProject[],
  clickupTasks: ClickUpTask[],
  evolizInvoices: EvolizInvoice[]
): TrackerProject[] {
  // Build ClickUp task lookup by normalized name
  const tasksByName = new Map<string, ClickUpTask>();
  for (const task of clickupTasks) {
    tasksByName.set(normalizeForMatch(task.name), task);
  }

  // Build Evoliz invoice lookup by PO reference
  const invoicesByPO = new Map<string, EvolizInvoice>();
  for (const inv of evolizInvoices) {
    if (inv.reference) {
      invoicesByPO.set(normalizeForMatch(inv.reference), inv);
    }
  }

  return excelProjects.map((ep) => {
    // Match ClickUp task by project name
    const clickupTask = tasksByName.get(normalizeForMatch(ep.project));

    // Match Evoliz invoice by PO number
    const evolizInvoice = ep.poNumber
      ? invoicesByPO.get(normalizeForMatch(ep.poNumber))
      : undefined;

    // Determine ClickUp status (prefer ClickUp over Excel)
    const clickupStatus = clickupTask
      ? clickupTask.status.status
      : "";

    // Determine invoice status (prefer Evoliz over Excel)
    const invoiceStatus = evolizInvoice
      ? mapEvolizStatus(evolizInvoice.status)
      : ep.invoiceStatus;

    // Determine invoice number (prefer Evoliz)
    const invoiceNumber = evolizInvoice
      ? evolizInvoice.invoiceNumber
      : ep.invoiceNumber;

    return {
      client: ep.client,
      project: ep.project,
      date: ep.date,
      contact: ep.contact,
      status: clickupStatus || ep.status,
      category: ep.category,
      sharepointLink: ep.sharepointLink,
      totalValue: ep.totalValue,
      poNumber: ep.poNumber,
      invoiceStatus,
      invoiceNumber,
      clickupTaskUrl: clickupTask?.url ?? "",
      clickupStatus,
    };
  });
}

function mapEvolizStatus(status: string): string {
  switch (status) {
    case "paid":
      return "Paid";
    case "sent":
    case "unpaid":
      return "Invoiced";
    case "overdue":
      return "Overdue";
    case "draft":
      return "Draft";
    default:
      return status;
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

    const response: TrackerResponse = {
      projects,
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
