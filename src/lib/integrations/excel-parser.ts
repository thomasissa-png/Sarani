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
  customer: ["customer", "client", "client name", "company", "account"],
  division: ["division", "department", "bu", "business unit", "entity"],
  date: ["date", "project date", "creation date", "start date", "brief date", "order date"],
  project: ["project", "project name", "project description", "description", "brief", "job", "job name", "titre", "titre du projet"],
  contact: ["contact", "contact name", "client contact", "requestor", "demandeur", "contact client", "person"],
  status: ["status", "project status", "statut", "état", "state"],
  category: ["category", "cat", "cat.", "type", "service", "service type", "deliverable type"],
  link: ["link", "sharepoint link", "folder link", "sharepoint", "folder", "url", "dossier"],
  totalValue: [
    "total value", "total value (eur)", "total", "total eur", "total usd",
    "value", "amount", "montant", "prix", "price", "total price",
    "total value (usd)", "project value", "budget", "fee", "fees",
    "valeur", "valeur totale",
  ],
  poNumber: ["po", "po number", "po #", "po#", "purchase order", "bon de commande", "po ref", "po reference"],
  invoiceNumber: ["invoice", "invoice number", "invoice #", "inv", "inv.", "invoice ref", "facture", "n° facture"],
  invoiceStatus: [
    "invoice status", "payment status", "payment", "inv. status", "inv status",
    "paiement", "statut facture", "billing status", "billing",
  ],
} as const;

// ─── Header Detection ───────────────────────────────────────────────────────

/** All known column aliases flattened for header row detection */
const ALL_KNOWN_HEADERS: Set<string> = new Set(
  Object.values(COL_MAP).flatMap((aliases) => [...aliases])
);

/**
 * Scan rows to find the actual header row.
 * Many Sarani tracker files have a "Performance Dashboard" title block
 * in the first rows — the real column headers start further down.
 * A row is considered the header row if it contains at least 2 recognized
 * column names (e.g. "project", "status", "date", "contact").
 *
 * @returns The index of the header row, or -1 if not found.
 */
function findHeaderRowIndex(
  values: (string | number | boolean | null)[][],
  maxScanRows = 20
): number {
  const limit = Math.min(values.length, maxScanRows);
  for (let i = 0; i < limit; i++) {
    const row = values[i];
    if (!row || row.length < 2) continue;

    let matchCount = 0;
    for (const cell of row) {
      if (cell === null || cell === undefined) continue;
      const normalized = String(cell).toLowerCase().trim();
      if (ALL_KNOWN_HEADERS.has(normalized)) {
        matchCount++;
        if (matchCount >= 2) return i;
      }
    }
  }
  return -1;
}

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

  // Find the real header row (skip dashboard title rows)
  const headerIdx = findHeaderRowIndex(values);
  if (headerIdx === -1) return [];

  const headers = values[headerIdx].map((h) =>
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

  // Data starts after the header row
  const dataRows = values.slice(headerIdx + 1);
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
