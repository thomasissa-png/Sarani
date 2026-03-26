// ─── Excel Tracker Parsing Utilities ─────────────────────────────────────────
// M-02: Extracted from tracker/route.ts to reduce file size and improve reuse.

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ExcelProject {
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

// ─── Column Mapping ─────────────────────────────────────────────────────────

/** Known Excel column headers (case-insensitive matching) */
export const COL_MAP = {
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

// ─── Helpers ────────────────────────────────────────────────────────────────

export function findColumnIndex(
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

export function cellToString(cell: string | number | boolean | null): string {
  if (cell === null || cell === undefined) return "";
  return String(cell).trim();
}

export function cellToNumber(
  cell: string | number | boolean | null
): number | null {
  if (cell === null || cell === undefined || cell === "") return null;
  const n = Number(cell);
  return isNaN(n) ? null : n;
}

// ─── Parser ─────────────────────────────────────────────────────────────────

/**
 * Parse raw Excel rows into structured ExcelProject objects.
 * Uses flexible column detection via COL_MAP aliases.
 *
 * @param values - 2D array from readExcelUsedRange (first row = headers)
 * @param fallbackClient - Client name to use if no "Customer" column found
 */
export function parseExcelProjects(
  values: (string | number | boolean | null)[][],
  fallbackClient: string
): ExcelProject[] {
  if (values.length < 2) return [];

  const headers = values[0].map((h) =>
    h !== null && h !== undefined ? String(h) : ""
  );

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

  if (colProject === -1) return [];

  const dataRows = values.slice(1);
  const projects: ExcelProject[] = [];

  for (const row of dataRows) {
    const projectName = cellToString(row[colProject]);
    if (!projectName) continue;

    const client =
      colCustomer !== -1
        ? cellToString(row[colCustomer]) || fallbackClient
        : fallbackClient;

    projects.push({
      client,
      project: projectName,
      date: colDate !== -1 ? cellToString(row[colDate]) : "",
      contact: colContact !== -1 ? cellToString(row[colContact]) : "",
      status: colStatus !== -1 ? cellToString(row[colStatus]) : "",
      category: colCategory !== -1 ? cellToString(row[colCategory]) : "",
      sharepointLink: colLink !== -1 ? cellToString(row[colLink]) : "",
      totalValue:
        colTotalValue !== -1 ? cellToNumber(row[colTotalValue]) : null,
      poNumber: colPoNumber !== -1 ? cellToString(row[colPoNumber]) : "",
      invoiceNumber:
        colInvoiceNumber !== -1 ? cellToString(row[colInvoiceNumber]) : "",
      invoiceStatus:
        colInvoiceStatus !== -1 ? cellToString(row[colInvoiceStatus]) : "",
    });
  }

  return projects;
}
