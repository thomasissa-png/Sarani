import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";
import {
  getDriveItemByPath,
  readExcelUsedRange,
  listWorksheets,
} from "@/lib/integrations/sharepoint";
import {
  SHAREPOINT_TRACKERS_DRIVE_ID,
  TRACKERS_BASE_PATH,
  CLIENT_MAPPINGS,
  type ClientIntegrationMapping,
} from "@/lib/integrations/config";
import {
  findColumnIndex,
  cellToString,
  cellToNumber,
  COL_MAP,
} from "@/lib/integrations/excel-parser";
import { fetchWithCache, readCache } from "@/lib/integrations/cache";
import type { ClickUpTask } from "@/lib/integrations/clickup";

// ─── Types ──────────────────────────────────────────────────────────────────

interface PrefillLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface PrefillResponse {
  purpose: string;
  lineItems: PrefillLineItem[];
  applyVat: boolean;
  vatRate: number;
  /** Source info for transparency */
  sources: {
    purpose: "clickup" | "excel" | "none";
    lineItems: "excel" | "none";
    vatReason: string;
  };
}

// ─── French client detection for VAT ────────────────────────────────────────

/**
 * Clients that should have VAT (20%) applied by default.
 * Detection: exact client name match OR sheet/division contains "France" or "FR".
 */
const FRENCH_CLIENT_NAMES = [
  "ubi",
  "ubisoft",
  "sony france",
  "tiktok france",
  "lamarck",
  "air corsica",
] as const;

function shouldApplyVat(clientName: string, sheetName?: string): boolean {
  const clientLower = clientName.toLowerCase().trim();

  // Check exact client name matches
  for (const frenchClient of FRENCH_CLIENT_NAMES) {
    if (clientLower === frenchClient || clientLower.includes(frenchClient)) {
      return true;
    }
  }

  // Check sheet/division name for "France" or "FR" suffix
  if (sheetName) {
    const sheetLower = sheetName.toLowerCase().trim();
    if (sheetLower.includes("france") || sheetLower.endsWith(" fr")) {
      return true;
    }
  }

  return false;
}

// ─── Known standard columns to exclude from asset detection ─────────────────

/** All standard column aliases — anything NOT in this set is a potential asset column */
const STANDARD_COL_ALIASES = new Set(
  Object.values(COL_MAP).flatMap((aliases) => [...aliases])
);

/**
 * Detect asset columns in the Excel tracker.
 * Asset columns are those AFTER the standard project columns (V onwards, roughly).
 * They typically have a header like "Social Video 15s", "Key Visual", etc.
 * and contain a price or quantity in the data rows.
 *
 * Strategy:
 * 1. Find the header row
 * 2. Identify columns whose header is NOT a standard COL_MAP alias
 * 3. For the matched project row, check if these columns have numeric values
 * 4. Group by pairs: some trackers use (asset name col, price col) or single col with price
 */
function extractAssetLineItems(
  values: (string | number | boolean | null)[][],
  headerRowIndex: number,
  projectRowIndex: number
): PrefillLineItem[] {
  const headers = values[headerRowIndex];
  const dataRow = values[projectRowIndex];
  if (!headers || !dataRow) return [];

  const items: PrefillLineItem[] = [];

  // Scan all columns after the last standard column
  // First, find where standard columns end
  const standardColIndices = new Set<number>();
  for (const aliases of Object.values(COL_MAP)) {
    const idx = findColumnIndex(
      headers.map((h) => (h !== null && h !== undefined ? String(h) : "")),
      aliases
    );
    if (idx !== -1) standardColIndices.add(idx);
  }

  const maxStandardCol = standardColIndices.size > 0
    ? Math.max(...standardColIndices)
    : -1;

  // Asset columns start after the last standard column
  // Look at each column: if header is not a standard alias and data has a value
  for (let col = maxStandardCol + 1; col < headers.length; col++) {
    const header = cellToString(headers[col]);
    if (!header) continue;

    // Skip if this is somehow a standard column alias
    if (STANDARD_COL_ALIASES.has(header.toLowerCase().trim())) continue;

    const cellValue = dataRow[col];
    const numericValue = cellToNumber(cellValue);

    // If the cell has a numeric value > 0, it's likely a price or quantity for this asset
    if (numericValue !== null && numericValue > 0) {
      items.push({
        description: header,
        quantity: 1,
        unitPrice: numericValue,
        total: numericValue,
      });
    }
  }

  return items;
}

// ─── Find header row (duplicated from excel-parser to avoid circular dep) ───

const ALL_KNOWN_HEADERS = new Set(
  Object.values(COL_MAP).flatMap((aliases) => [...aliases])
);

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

// ─── Route Handler ──────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const session = await getUserFromSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const clientParam = searchParams.get("client");
  const projectParam = searchParams.get("project");

  if (!clientParam || !projectParam) {
    return NextResponse.json(
      { error: "Missing required parameters: client and project" },
      { status: 400 }
    );
  }

  const clientLower = clientParam.toLowerCase().trim();
  const projectLower = projectParam.toLowerCase().trim();

  const response: PrefillResponse = {
    purpose: "",
    lineItems: [],
    applyVat: false,
    vatRate: 20,
    sources: {
      purpose: "none",
      lineItems: "none",
      vatReason: "Non-French client (default: no VAT)",
    },
  };

  // ─── 1. Try to get purpose from ClickUp task description ────────────────

  try {
    const cached = await readCache<ClickUpTask[]>("tracker:clickup_all_tasks");
    if (cached?.data) {
      // Find matching task by project name
      const matchingTask = cached.data.find((task) => {
        const taskName = task.name.toLowerCase().trim();
        return taskName === projectLower || taskName.includes(projectLower) || projectLower.includes(taskName);
      });

      if (matchingTask?.description) {
        // Clean up ClickUp markdown description — strip HTML tags and excessive whitespace
        const cleaned = matchingTask.description
          .replace(/<[^>]+>/g, "")
          .replace(/\n{3,}/g, "\n\n")
          .trim();

        if (cleaned.length > 0) {
          response.purpose = cleaned;
          response.sources.purpose = "clickup";
        }
      }
    }
  } catch (e) {
    console.error("[Prefill] ClickUp cache read error:", e);
  }

  // ─── 2. Try to get line items from Excel tracker ────────────────────────

  // Find the client mapping to know which Excel file to read
  const mapping = CLIENT_MAPPINGS.find((m) => {
    const spaceLower = m.clickupSpaceName.toLowerCase();
    return (
      spaceLower === clientLower ||
      clientLower.includes(spaceLower) ||
      spaceLower.includes(clientLower)
    );
  });

  let matchedSheetName: string | undefined;

  if (mapping) {
    try {
      const filePath = `${TRACKERS_BASE_PATH}/${mapping.excelTrackerFilename}`;
      const item = await getDriveItemByPath(SHAREPOINT_TRACKERS_DRIVE_ID, filePath);
      const sheets = await listWorksheets(SHAREPOINT_TRACKERS_DRIVE_ID, item.id);

      // Skip dashboard/performance sheets
      const SKIP_PATTERNS = ["performance", "dashboard", "overview", "template", "config", "instructions", "total", "summary"];
      const dataSheets = sheets.filter((s) => {
        const lower = s.name.toLowerCase().trim();
        return !SKIP_PATTERNS.some((p) => lower.includes(p));
      });

      // Search each sheet for the project
      for (const sheet of dataSheets) {
        try {
          const rangeData = await readExcelUsedRange(
            SHAREPOINT_TRACKERS_DRIVE_ID,
            item.id,
            sheet.name
          );

          const values = rangeData.values;
          const headerIdx = findHeaderRowIndex(values);
          if (headerIdx === -1) continue;

          const headers = values[headerIdx].map((h) =>
            h !== null && h !== undefined ? String(h) : ""
          );
          const colProject = findColumnIndex(headers, COL_MAP.project);
          if (colProject === -1) continue;

          // Find the row matching our project
          for (let rowIdx = headerIdx + 1; rowIdx < values.length; rowIdx++) {
            const row = values[rowIdx];
            const projectCell = cellToString(row[colProject]).toLowerCase().trim();

            if (
              projectCell === projectLower ||
              projectCell.includes(projectLower) ||
              projectLower.includes(projectCell)
            ) {
              matchedSheetName = sheet.name;

              // Extract asset line items from columns beyond standard ones
              const assetItems = extractAssetLineItems(values, headerIdx, rowIdx);
              if (assetItems.length > 0) {
                response.lineItems = assetItems;
                response.sources.lineItems = "excel";
              }

              // If we didn't get purpose from ClickUp, try the category/description from Excel
              if (!response.purpose) {
                const colCategory = findColumnIndex(headers, COL_MAP.category);
                if (colCategory !== -1) {
                  const category = cellToString(row[colCategory]);
                  if (category) {
                    response.purpose = category;
                    response.sources.purpose = "excel";
                  }
                }
              }

              break; // Found the project row
            }
          }

          if (matchedSheetName) break; // Found in this sheet
        } catch (e) {
          console.error(`[Prefill] Failed to read sheet "${sheet.name}":`, e);
        }
      }
    } catch (e) {
      console.error("[Prefill] Excel tracker read error:", e);
    }
  }

  // ─── 3. Determine VAT applicability ─────────────────────────────────────

  const vatApplies = shouldApplyVat(clientParam, matchedSheetName);
  response.applyVat = vatApplies;

  if (vatApplies) {
    const reason = matchedSheetName?.toLowerCase().includes("france")
      ? `French division detected (sheet: "${matchedSheetName}")`
      : `French client detected ("${clientParam}")`;
    response.sources.vatReason = reason;
  }

  return NextResponse.json(response);
}
