// ─── Phase 3 Integration Configuration ──────────────────────────────────────
// Source of truth for all cross-system mappings:
//   ClickUp Space <-> Excel Tracker <-> SharePoint Customer Folder
// Data from Addendum A.1, A.4, A.5 of phase3-integrations-specs.md

// ─── SharePoint Drive IDs ────────────────────────────────────────────────────

/** OneDrive for Business (team@sarani.studio) — contains Excel tracker files */
export const SHAREPOINT_TRACKERS_DRIVE_ID =
  "b!JFtnCBXApE6jsyomGN6hXni64SgHnShCg41yK06ZLObe1kAv17nOTZJFGBX3aH4A";

/** SaraniAssets site — contains project folders and client assets */
export const SHAREPOINT_ASSETS_DRIVE_ID =
  "b!BTvSB7PxVEeCQbtgLKBtdI62eOvL4gFEkH_L6luQY04w7z1UWPKDQ4GDuZJmfD9_";

/** Base path within the Trackers drive (OneDrive personal — no /Documents prefix) */
export const TRACKERS_BASE_PATH =
  "/00. Administrative/03. Financials (Trackers)";

/** Base path within the Assets drive where customer folders live */
export const ASSETS_CUSTOMERS_BASE_PATH = "/Documents/03. Customers";

// ─── ClickUp Status Mappings ─────────────────────────────────────────────────
// From Addendum A.2: real statuses discovered via live API exploration

export type ClickUpStatusName = "Open" | "in progress" | "review" | "Closed";

export interface ClickUpStatusMapping {
  readonly clickupStatus: ClickUpStatusName;
  readonly type: "open" | "custom" | "closed";
  readonly color: string;
  readonly projectStatus: string;
  readonly invoiceStatus: string | null;
}

export const CLICKUP_STATUS_MAPPINGS: readonly ClickUpStatusMapping[] = [
  {
    clickupStatus: "Open",
    type: "open",
    color: "#87909e",
    projectStatus: "In progress",
    invoiceStatus: null,
  },
  {
    clickupStatus: "in progress",
    type: "custom",
    color: "#1090e0",
    projectStatus: "In progress",
    invoiceStatus: null,
  },
  {
    clickupStatus: "review",
    type: "custom",
    color: "#5f55ee",
    projectStatus: "In progress",
    invoiceStatus: "Open PO",
  },
  {
    clickupStatus: "Closed",
    type: "closed",
    color: "#008844",
    projectStatus: "Delivered",
    invoiceStatus: null,
  },
] as const;

// ─── Client Integration Mapping ─────────────────────────────────────────────
// From Addendum A.5: mapping ClickUp Space -> Excel Tracker -> SharePoint folder

export interface ClientIntegrationMapping {
  /** ClickUp Space name (exact match) */
  readonly clickupSpaceName: string;
  /** ClickUp Space ID */
  readonly clickupSpaceId: string;
  /** Excel tracker filename (in TRACKERS_BASE_PATH) */
  readonly excelTrackerFilename: string;
  /** Customer folder path relative to ASSETS_CUSTOMERS_BASE_PATH */
  readonly sharepointCustomerFolder: string;
}

export const CLIENT_MAPPINGS: readonly ClientIntegrationMapping[] = [
  {
    clickupSpaceName: "Sony",
    clickupSpaceId: "90100452675",
    excelTrackerFilename: "01. Sarani_Sony Projects.xlsx",
    sharepointCustomerFolder: "02. Sony",
  },
  {
    clickupSpaceName: "TikTok",
    clickupSpaceId: "90050434316",
    excelTrackerFilename: "02. Sarani_Bytedance Projects.xlsx",
    sharepointCustomerFolder: "05. TikTok",
  },
  {
    clickupSpaceName: "PICO XR",
    clickupSpaceId: "90050434327",
    excelTrackerFilename: "02. Sarani_Bytedance Projects.xlsx",
    sharepointCustomerFolder: "05. TikTok",
  },
  {
    clickupSpaceName: "Other customers",
    clickupSpaceId: "90050435651",
    excelTrackerFilename: "03. Sarani_Other Projects.xlsx",
    sharepointCustomerFolder: "01. Single Projects",
  },
  {
    clickupSpaceName: "Aristocrat",
    clickupSpaceId: "90174878459",
    excelTrackerFilename: "04. Sarani_Aristocrat Projects.xlsx",
    sharepointCustomerFolder: "11. Aristocrat",
  },
  {
    clickupSpaceName: "Ubi",
    clickupSpaceId: "90171040997",
    excelTrackerFilename: "09. Sarani_Projets Ubi.xlsx",
    sharepointCustomerFolder: "17. Ubi",
  },
  {
    clickupSpaceName: "Aujan",
    clickupSpaceId: "90171121804",
    excelTrackerFilename: "10. Sarani_Aujan Projects.xlsx",
    sharepointCustomerFolder: "18. Aujan",
  },
  {
    clickupSpaceName: "Bose",
    clickupSpaceId: "90171343766",
    excelTrackerFilename: "11. Sarani_Bose Projects.xlsx",
    sharepointCustomerFolder: "19. Bose",
  },
  {
    clickupSpaceName: "Lamarck",
    clickupSpaceId: "90172906076",
    excelTrackerFilename: "12. Sarani_Lamarck Projects.xlsx",
    sharepointCustomerFolder: "21.Lamarck",
  },
  {
    clickupSpaceName: "CMC Markets",
    clickupSpaceId: "90172572190",
    excelTrackerFilename: "13. Sarani_CMC Markets Project.xlsx",
    sharepointCustomerFolder: "20. CMC Markets",
  },
] as const;

// ─── Additional ClickUp Spaces (no tracker mapping yet) ─────────────────────

export const CLICKUP_SPACES_WITHOUT_TRACKER = [
  { name: "Brand Native", id: "90050436581" },
  { name: "Sarani", id: "90050433950" },
] as const;

// ─── Global Overview Tracker ─────────────────────────────────────────────────

export const GLOBAL_OVERVIEW_FILENAME = "00. Global Overview.xlsx";

// ─── Excel Sheet Name Candidates ────────────────────────────────────────────
// Ordered list of worksheet names to try when reading Excel files.
// Used by both the tracker route and the create-project route.
export const EXCEL_SHEET_NAME_CANDIDATES = ["Sheet1", "Feuil1", "Feuille1"] as const;

// ─── ClickUp PM User ID Mapping ─────────────────────────────────────────────
// Maps Sarani user emails to their ClickUp user IDs.
// Used to set the PM custom field on newly created tasks.
// Find IDs via ClickUp API: GET /team/{team_id}/member

export const CLICKUP_PM_MAPPING: Record<string, number> = {
  "thomas@sarani.studio": 62498950,
  // Add more PMs as needed
};

// ─── Cache TTL Configuration (seconds) ──────────────────────────────────────

export const CACHE_TTL = {
  /** ClickUp API responses */
  clickup: 600, // 10 minutes
  /** Evoliz API responses */
  evoliz: 600, // 10 minutes
  /** SharePoint Excel reads (very expensive — 50+ sheets across 9 files) */
  sharepoint: 3600, // 1 hour (force-refresh via "Sync now" button)
} as const;

// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Find the client mapping for a given ClickUp Space name.
 * Uses a 3-tier match strategy:
 *   1. Exact match (case-insensitive)
 *   2. Contains match (space name contains mapping name, or vice versa)
 *   3. First-word match (e.g. "CMC" matches "CMC Markets")
 * Returns undefined if no mapping exists (e.g. Brand Native, Sarani internal).
 */
export function getMappingBySpaceName(
  spaceName: string
): ClientIntegrationMapping | undefined {
  const lower = spaceName.toLowerCase().trim();
  // 1. Exact match
  const exact = CLIENT_MAPPINGS.find(
    (m) => m.clickupSpaceName.toLowerCase() === lower
  );
  if (exact) return exact;
  // 2. Contains match (skip "Other customers" — too generic)
  const contains = CLIENT_MAPPINGS.find((m) => {
    const ml = m.clickupSpaceName.toLowerCase();
    if (ml === "other customers") return false;
    return lower.includes(ml) || ml.includes(lower);
  });
  if (contains) return contains;
  // 3. First-word match (for cases like "CMC" matching "CMC Markets")
  const firstWord = lower.split(/\s+/)[0];
  if (firstWord.length >= 3) {
    const byFirstWord = CLIENT_MAPPINGS.find((m) => {
      const ml = m.clickupSpaceName.toLowerCase();
      if (ml === "other customers") return false;
      return ml.startsWith(firstWord) || firstWord.startsWith(ml.split(/\s+/)[0]);
    });
    if (byFirstWord) return byFirstWord;
  }
  return undefined;
}

/**
 * Find the client mapping for a given ClickUp Space ID.
 */
export function getMappingBySpaceId(
  spaceId: string
): ClientIntegrationMapping | undefined {
  return CLIENT_MAPPINGS.find((m) => m.clickupSpaceId === spaceId);
}

/**
 * Find the client mapping for a given Excel tracker filename.
 */
export function getMappingByTrackerFilename(
  filename: string
): ClientIntegrationMapping | undefined {
  return CLIENT_MAPPINGS.find(
    (m) => m.excelTrackerFilename.toLowerCase() === filename.toLowerCase()
  );
}

/**
 * Build the full SharePoint path for a tracker file.
 */
export function getTrackerFullPath(filename: string): string {
  return `${TRACKERS_BASE_PATH}/${filename}`;
}

/**
 * Build the full SharePoint path for a customer folder in SaraniAssets.
 */
export function getCustomerFolderPath(customerFolder: string): string {
  return `${ASSETS_CUSTOMERS_BASE_PATH}/${customerFolder}`;
}

/**
 * Map a ClickUp status string to the project/invoice status tuple.
 * Returns null if the status is not recognized.
 */
export function mapClickUpStatus(
  status: string
): { projectStatus: string; invoiceStatus: string | null } | null {
  const mapping = CLICKUP_STATUS_MAPPINGS.find(
    (m) => m.clickupStatus.toLowerCase() === status.toLowerCase()
  );
  if (!mapping) return null;
  return {
    projectStatus: mapping.projectStatus,
    invoiceStatus: mapping.invoiceStatus,
  };
}
