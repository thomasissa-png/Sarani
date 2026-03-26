// ─── Tracker Data Merge Logic ────────────────────────────────────────────────
// M-02: Extracted from tracker/route.ts.
// Merges Excel projects with ClickUp tasks and Evoliz invoices.

import type { ClickUpTask } from "@/lib/integrations/clickup";
import type { EvolizInvoice } from "@/lib/integrations/evoliz";
import type { ExcelProject } from "@/lib/integrations/excel-parser";
import type { TrackerProject } from "@/types/integrations";
import { getMappingBySpaceId } from "@/lib/integrations/config";

// ─── Helpers ────────────────────────────────────────────────────────────────

function normalizeForMatch(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
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
 * Excel is the source of truth for project list. ClickUp and Evoliz enrich it.
 *
 * E-07/E-08: Uses arrays for multi-match scenarios, picks most relevant.
 */
export function mergeData(
  excelProjects: ExcelProject[],
  clickupTasks: ClickUpTask[],
  evolizInvoices: EvolizInvoice[]
): TrackerProject[] {
  // Build ClickUp task lookup by normalized name (E-07: use array for multi-match)
  const tasksByName = new Map<string, ClickUpTask[]>();
  for (const task of clickupTasks) {
    const key = normalizeForMatch(task.name);
    const existing = tasksByName.get(key) ?? [];
    existing.push(task);
    tasksByName.set(key, existing);
  }

  // Build Evoliz invoice lookup by PO reference (E-08: use array for multi-match)
  const invoicesByPO = new Map<string, EvolizInvoice[]>();
  for (const inv of evolizInvoices) {
    if (inv.reference) {
      const key = normalizeForMatch(inv.reference);
      const existing = invoicesByPO.get(key) ?? [];
      existing.push(inv);
      invoicesByPO.set(key, existing);
    }
  }

  // Track which ClickUp tasks have been matched to Excel rows
  const matchedClickUpKeys = new Set<string>();

  // 1. Start with Excel projects, enriched with ClickUp + Evoliz
  const excelMerged = excelProjects.map((ep) => {
    // Match ClickUp task by project name (pick most recently updated)
    const key = normalizeForMatch(ep.project);
    const matchingTasks = tasksByName.get(key);
    const clickupTask = matchingTasks
      ? matchingTasks.sort(
          (a, b) =>
            parseInt(b.date_updated) - parseInt(a.date_updated)
        )[0]
      : undefined;

    if (clickupTask) matchedClickUpKeys.add(key);

    // Match Evoliz invoice by PO number (pick latest non-draft)
    const matchingInvoices = ep.poNumber
      ? invoicesByPO.get(normalizeForMatch(ep.poNumber))
      : undefined;
    const evolizInvoice = matchingInvoices
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

  // 2. Add ClickUp tasks that have NO matching Excel row
  // This ensures projects appear even if Excel trackers are empty or unavailable
  const clickupOnly: TrackerProject[] = [];
  for (const [key, tasks] of tasksByName) {
    if (matchedClickUpKeys.has(key)) continue;
    const task = tasks.sort(
      (a, b) => parseInt(b.date_updated) - parseInt(a.date_updated)
    )[0];

    // Derive client name from ClickUp space ID → config mapping → list name
    const mapping = getMappingBySpaceId(task.space?.id);
    const spaceName = mapping?.clickupSpaceName ?? task.list?.name ?? "Unknown";

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

  return [...excelMerged, ...clickupOnly];
}
