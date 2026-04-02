// ─── Shared Integration Types ────────────────────────────────────────────────
// Q-04/Q-05: Single source of truth for types used across API routes and pages.

export interface TrackerProject {
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
  /** Excel tracker filename (for "Open Tracker" link) */
  excelTrackerFile?: string;
  /** Excel sheet/tab name (for deep-link to correct sheet) */
  excelSheetName?: string;
  /** SharePoint webUrl of the tracker file (for direct open) */
  excelTrackerUrl?: string;
  /** Display name: sheet name if more specific than client (e.g. "Sony France") */
  displayClient?: string;
  /** Division/tab name from Excel (e.g. "France", "Professional") */
  division?: string;
  /** Country/market extracted from sheet name (e.g. "France", "Germany", "Global") */
  country?: string;
  /** ClickUp list name (e.g. "TikTok Shop UK") — used to find the right SP subfolder */
  clickupListName?: string;
}

export interface SourceMeta {
  status: "live" | "stale" | "unavailable";
  fetchedAt: string | null;
  error?: string;
}

export interface TrackerResponse {
  projects: TrackerProject[];
  sources: {
    clickup: SourceMeta;
    sharepoint: SourceMeta;
    evoliz: SourceMeta;
  };
  debug?: {
    clickupTaskCount: number;
    excelProjectCount: number;
    evolizInvoiceCount: number;
    mergedProjectCount: number;
  };
}
