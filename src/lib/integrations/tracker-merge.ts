// ─── Tracker Data Merge Logic ────────────────────────────────────────────────
// M-02: Extracted from tracker/route.ts.
// Merges Excel projects with ClickUp tasks and Evoliz invoices.
// Matching strategy: client-scoped name match > fuzzy name match > unmatched

import type { ClickUpTask } from "@/lib/integrations/clickup";
import type { EvolizInvoice } from "@/lib/integrations/evoliz";
import type { ExcelProject } from "@/lib/integrations/excel-parser";
import type { TrackerProject } from "@/types/integrations";
import { getMappingBySpaceId } from "@/lib/integrations/config";

// ─── Country Detection ───────────────────────────────────────────────────────

const COUNTRY_PATTERNS: [RegExp, string][] = [
  [/\bfrance\b|\bfr\b/i, "France"],
  [/\bgermany\b|\bde\b|\bdeutschland\b/i, "Germany"],
  [/\buk\b|\bunited\s*kingdom\b|\bgb\b/i, "UK"],
  [/\bitaly\b|\bit\b|\bitalia\b/i, "Italy"],
  [/\bspain\b|\bes\b|\bespa[nñ]a\b/i, "Spain"],
  [/\bnetherlands\b|\bnl\b|\bholland\b/i, "Netherlands"],
  [/\bjapan\b|\bjp\b/i, "Japan"],
  [/\busa\b|\bus\b|\bunited\s*states\b/i, "USA"],
  [/\bchina\b|\bcn\b/i, "China"],
  [/\bglobal\b/i, "Global"],
];

function detectCountry(sheetName: string): string {
  for (const [pattern, country] of COUNTRY_PATTERNS) {
    if (pattern.test(sheetName)) return country;
  }
  return "Other";
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function normalizeForMatch(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Check if normalized string a contains normalized string b, or vice versa */
function fuzzyMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  return a.includes(b) || b.includes(a);
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

// ─── Merge ──────────────────────────────────────────────────────────────────

/**
 * Merge data from Excel, ClickUp, and Evoliz into unified TrackerProject records.
 *
 * Matching strategy (in priority order):
 * 1. Exact name match (normalized)
 * 2. Client-scoped fuzzy match: ClickUp task in same client space + partial name overlap
 * 3. Unmatched Excel rows → shown with Excel data only
 * 4. Unmatched ClickUp tasks → shown with ClickUp data only
 */
export function mergeData(
  excelProjects: ExcelProject[],
  clickupTasks: ClickUpTask[],
  evolizInvoices: EvolizInvoice[]
): TrackerProject[] {
  // Build ClickUp task lookup:
  // - By exact normalized name
  // - By client (space) for fuzzy matching
  const tasksByName = new Map<string, ClickUpTask[]>();
  const tasksByClient = new Map<string, ClickUpTask[]>();

  for (const task of clickupTasks) {
    // By name
    const nameKey = normalizeForMatch(task.name);
    const byName = tasksByName.get(nameKey) ?? [];
    byName.push(task);
    tasksByName.set(nameKey, byName);

    // By client (space name from config mapping)
    const mapping = getMappingBySpaceId(task.space?.id);
    const clientKey = normalizeForMatch(
      mapping?.clickupSpaceName ?? task.list?.name ?? ""
    );
    if (clientKey) {
      const byClient = tasksByClient.get(clientKey) ?? [];
      byClient.push(task);
      tasksByClient.set(clientKey, byClient);
    }
  }

  // Build Evoliz invoice lookup by ALL reference fields (object, external_ref, reference, label...)
  // Each reference string maps to its invoice — a single invoice can appear under multiple keys
  const invoicesByRef = new Map<string, EvolizInvoice[]>();
  for (const inv of evolizInvoices) {
    const refs = inv.allReferences ?? (inv.reference ? [inv.reference] : []);
    for (const ref of refs) {
      const key = normalizeForMatch(ref);
      if (!key) continue;
      const existing = invoicesByRef.get(key) ?? [];
      existing.push(inv);
      invoicesByRef.set(key, existing);
    }
  }

  // Build Evoliz invoice lookup by client name (fallback for project name matching)
  const invoicesByClient = new Map<string, EvolizInvoice[]>();
  for (const inv of evolizInvoices) {
    if (inv.clientName) {
      const key = normalizeForMatch(inv.clientName);
      const existing = invoicesByClient.get(key) ?? [];
      existing.push(inv);
      invoicesByClient.set(key, existing);
    }
  }

  // Track matched ClickUp task IDs to identify unmatched ones later
  const matchedTaskIds = new Set<string>();

  /**
   * Find the best ClickUp task match for an Excel project.
   * Priority: exact name > same-client fuzzy name
   */
  function findClickUpMatch(ep: ExcelProject): ClickUpTask | undefined {
    const nameKey = normalizeForMatch(ep.project);

    // 1. Exact name match
    const exactMatches = tasksByName.get(nameKey);
    if (exactMatches?.length) {
      return exactMatches.sort(
        (a, b) => parseInt(b.date_updated) - parseInt(a.date_updated)
      )[0];
    }

    // 2. Client-scoped fuzzy match
    const clientKey = normalizeForMatch(ep.client);
    const clientTasks = tasksByClient.get(clientKey);
    if (clientTasks?.length) {
      // Find tasks whose name partially overlaps with the Excel project name
      const fuzzyMatches = clientTasks.filter((t) =>
        fuzzyMatch(normalizeForMatch(t.name), nameKey)
      );
      if (fuzzyMatches.length) {
        return fuzzyMatches.sort(
          (a, b) => parseInt(b.date_updated) - parseInt(a.date_updated)
        )[0];
      }
    }

    return undefined;
  }

  // 1. Start with Excel projects, enriched with ClickUp + Evoliz
  const excelMerged = excelProjects.map((ep) => {
    const clickupTask = findClickUpMatch(ep);
    if (clickupTask) matchedTaskIds.add(clickupTask.id);

    // Match Evoliz invoice — 3 strategies:
    // 1. Exact PO match against ALL Evoliz reference fields (object, external_ref, reference, label)
    // 2. Fuzzy: PO appears inside any Evoliz reference (or vice versa)
    // 3. Fallback: project name fuzzy-matches an invoice reference from the same client
    let matchingInvoices: EvolizInvoice[] | undefined;

    if (ep.poNumber) {
      const poKey = normalizeForMatch(ep.poNumber);
      // Strategy 1: exact match on any reference field
      matchingInvoices = invoicesByRef.get(poKey);

      // Strategy 2: fuzzy — PO contained in a reference, or reference contained in PO
      if (!matchingInvoices?.length) {
        const fuzzyPOMatches: EvolizInvoice[] = [];
        for (const inv of evolizInvoices) {
          const refs = inv.allReferences ?? (inv.reference ? [inv.reference] : []);
          for (const ref of refs) {
            if (fuzzyMatch(normalizeForMatch(ref), poKey)) {
              fuzzyPOMatches.push(inv);
              break;
            }
          }
        }
        if (fuzzyPOMatches.length) matchingInvoices = fuzzyPOMatches;
      }
    }

    // Strategy 3: match by project name against invoice references from the same client
    if (!matchingInvoices?.length && ep.project && ep.client) {
      const clientKey = normalizeForMatch(ep.client);
      const projectKey = normalizeForMatch(ep.project);
      const clientInvoices = invoicesByClient.get(clientKey);
      if (clientInvoices?.length) {
        const refMatches = clientInvoices.filter((inv) => {
          const refs = inv.allReferences ?? (inv.reference ? [inv.reference] : []);
          return refs.some((ref) => fuzzyMatch(normalizeForMatch(ref), projectKey));
        });
        if (refMatches.length) {
          matchingInvoices = refMatches;
        }
      }
    }

    const evolizInvoice = matchingInvoices?.length
      ? matchingInvoices
          .filter((inv) => inv.status !== "draft")
          .sort(
            (a, b) =>
              new Date(b.issueDate).getTime() -
              new Date(a.issueDate).getTime()
          )[0] ?? matchingInvoices[0]
      : undefined;

    const clickupStatus = clickupTask ? clickupTask.status.status : "";

    const invoiceStatus = evolizInvoice
      ? mapEvolizStatus(evolizInvoice.status)
      : ep.invoiceStatus;

    const invoiceNumber = evolizInvoice
      ? evolizInvoice.invoiceNumber
      : ep.invoiceNumber;

    // Determine display name: prefer sheet name if it contains more info than just the client name
    // Strip internal suffixes like "- Hors CM", "- Internal", etc.
    const sheetName = ep.excelSheetName ?? "";
    const cleanedSheetName = sheetName
      .replace(/\s*-\s*(hors\s+\w+|internal|test|archive|old|template)\s*$/i, "")
      .trim();
    const displayClient =
      cleanedSheetName && cleanedSheetName.toLowerCase() !== ep.client.toLowerCase()
        ? cleanedSheetName
        : ep.client;

    // Extract division (the part of the sheet name beyond the client name)
    const division =
      sheetName && sheetName.toLowerCase() !== ep.client.toLowerCase()
        ? sheetName.replace(new RegExp(`^${ep.client}\\s*`, "i"), "").trim() ||
          sheetName
        : undefined;

    // Detect country/market from sheet name
    const country = sheetName ? detectCountry(sheetName) : "Other";

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
      excelTrackerFile: ep.excelTrackerFile,
      excelSheetName: ep.excelSheetName,
      excelTrackerUrl: ep.excelTrackerUrl,
      displayClient,
      division,
      country,
    };
  });

  // 2. Add ClickUp tasks that have NO matching Excel row
  const clickupOnly: TrackerProject[] = [];
  for (const task of clickupTasks) {
    if (matchedTaskIds.has(task.id)) continue;

    const mapping = getMappingBySpaceId(task.space?.id);
    const spaceName =
      mapping?.clickupSpaceName ?? task.list?.name ?? "Unknown";

    clickupOnly.push({
      client: spaceName,
      project: task.name,
      date: task.date_created
        ? new Date(parseInt(task.date_created)).toISOString().split("T")[0]
        : "",
      contact: task.assignees?.[0]?.username ?? "",
      status: task.status?.status ?? "",
      category: "",
      sharepointLink: "",
      totalValue: null,
      poNumber: "",
      invoiceStatus: "",
      invoiceNumber: "",
      clickupTaskUrl: task.url ?? "",
      clickupStatus: task.status?.status ?? "",
    });
  }

  // Deduplicate by client+project (keep first occurrence — Excel-enriched wins over ClickUp-only)
  const seen = new Map<string, TrackerProject>();
  for (const p of [...excelMerged, ...clickupOnly]) {
    const key = `${p.client.toLowerCase().trim()}::${p.project.toLowerCase().trim()}`;
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, p);
    } else {
      // Merge: keep richer data (prefer non-empty fields)
      seen.set(key, {
        ...existing,
        status: existing.status || p.status,
        date: existing.date || p.date,
        contact: existing.contact || p.contact,
        category: existing.category || p.category,
        sharepointLink: existing.sharepointLink || p.sharepointLink,
        totalValue: existing.totalValue ?? p.totalValue,
        clickupTaskUrl: existing.clickupTaskUrl || p.clickupTaskUrl,
        clickupStatus: existing.clickupStatus || p.clickupStatus,
        invoiceStatus: existing.invoiceStatus || p.invoiceStatus,
        invoiceNumber: existing.invoiceNumber || p.invoiceNumber,
        excelTrackerFile: existing.excelTrackerFile || p.excelTrackerFile,
        excelSheetName: existing.excelSheetName || p.excelSheetName,
        excelTrackerUrl: existing.excelTrackerUrl || p.excelTrackerUrl,
        displayClient: existing.displayClient || p.displayClient,
        division: existing.division || p.division,
        country: existing.country || p.country,
      });
    }
  }
  return Array.from(seen.values());
}
