// ─── Tracker Data Merge Logic ────────────────────────────────────────────────
// M-02: Extracted from tracker/route.ts.
// Merges Excel projects with ClickUp tasks and Evoliz invoices.

import type { ClickUpTask } from "@/lib/integrations/clickup";
import type { EvolizInvoice } from "@/lib/integrations/evoliz";
import type { ExcelProject } from "@/lib/integrations/excel-parser";
import type { TrackerProject } from "@/types/integrations";

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

  return excelProjects.map((ep) => {
    // Match ClickUp task by project name (pick most recently updated)
    const matchingTasks = tasksByName.get(normalizeForMatch(ep.project));
    const clickupTask = matchingTasks
      ? matchingTasks.sort(
          (a, b) =>
            parseInt(b.date_updated) - parseInt(a.date_updated)
        )[0]
      : undefined;

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
}
