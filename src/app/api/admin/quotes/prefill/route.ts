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
  getMappingBySpaceName,
} from "@/lib/integrations/config";
import {
  findColumnIndex,
  cellToString,
  cellToNumber,
  COL_MAP,
} from "@/lib/integrations/excel-parser";
import { readCache } from "@/lib/integrations/cache";
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
const STANDARD_COL_ALIASES: Set<string> = new Set(
  Object.values(COL_MAP).flatMap((aliases) => [...aliases])
);

/**
 * Detect the price row by scanning rows after the header for the first row
 * that has mostly numeric values in the non-standard (asset) columns.
 * Some trackers have a sub-header row between the header and the price row.
 */
function detectPriceRowIndex(
  values: (string | number | boolean | null)[][],
  headerRowIndex: number,
  standardColIndices: Set<number>,
  maxScanRows = 3
): number {
  const headers = values[headerRowIndex];
  if (!headers) return headerRowIndex + 1;

  // Count how many non-standard columns exist (potential asset columns)
  let assetColCount = 0;
  for (let col = 0; col < headers.length; col++) {
    if (standardColIndices.has(col)) continue;
    const header = headers[col];
    if (header !== null && header !== undefined && String(header).trim()) {
      assetColCount++;
    }
  }

  if (assetColCount === 0) return headerRowIndex + 1;

  // Scan rows headerRowIndex+1, +2, +3 for the one with the most numeric values in asset columns
  let bestRow = headerRowIndex + 1;
  let bestNumericRatio = 0;

  const limit = Math.min(headerRowIndex + 1 + maxScanRows, values.length);
  for (let rowIdx = headerRowIndex + 1; rowIdx < limit; rowIdx++) {
    const row = values[rowIdx];
    if (!row) continue;

    let numericCount = 0;
    let nonEmptyCount = 0;
    for (let col = 0; col < headers.length; col++) {
      if (standardColIndices.has(col)) continue;
      const header = headers[col];
      if (!header || !String(header).trim()) continue;

      const cellVal = row[col];
      if (cellVal === null || cellVal === undefined || String(cellVal).trim() === "") continue;
      nonEmptyCount++;
      const num = cellToNumber(cellVal);
      if (num !== null && num > 0) numericCount++;
    }

    // Ratio of numeric cells among non-empty asset cells
    const ratio = nonEmptyCount > 0 ? numericCount / nonEmptyCount : 0;
    // A price row should have a high ratio of numeric values (>= 0.5) and at least some values
    if (ratio > bestNumericRatio && numericCount >= 2) {
      bestNumericRatio = ratio;
      bestRow = rowIdx;
    }
  }

  return bestRow;
}

/**
 * Detect asset columns in the Excel tracker and extract line items.
 *
 * Excel structure:
 * - headerRowIndex: row with asset type names (e.g., "Banner creation (static)")
 * - priceRowIndex: row just below header with unit prices (e.g., 120, 35, 220)
 *   (auto-detected if the provided row doesn't have mostly numeric values)
 * - projectRowIndex: the project's row with quantities (e.g., 1, 24, 1)
 *
 * For each non-standard column:
 *   description = header cell, unitPrice = price row cell, quantity = project row cell
 *   total = unitPrice * quantity. Only include if quantity > 0.
 */
function extractAssetLineItems(
  values: (string | number | boolean | null)[][],
  headerRowIndex: number,
  priceRowIndex: number,
  projectRowIndex: number
): PrefillLineItem[] {
  const headers = values[headerRowIndex];
  if (!headers) return [];
  const dataRow = values[projectRowIndex];
  if (!dataRow) return [];

  const items: PrefillLineItem[] = [];

  // Identify standard columns to exclude
  const standardColIndices = new Set<number>();
  const headerStrings = headers.map((h) => (h !== null && h !== undefined ? String(h) : ""));
  for (const aliases of Object.values(COL_MAP)) {
    const idx = findColumnIndex(headerStrings, aliases);
    if (idx !== -1) standardColIndices.add(idx);
  }

  // Auto-detect the actual price row — the provided priceRowIndex may not have prices
  // (e.g., sub-header row between header and prices). Scan rows N+1..N+3 for numeric content.
  const actualPriceRowIdx = detectPriceRowIndex(values, headerRowIndex, standardColIndices);
  const priceRow = values[actualPriceRowIdx];
  if (!priceRow) return [];

  // Scan ALL columns — any non-standard column with a quantity > 0 is an asset
  for (let col = 0; col < headers.length; col++) {
    // Skip standard columns (project, status, date, contact, value, PO, etc.)
    if (standardColIndices.has(col)) continue;

    const header = cellToString(headers[col]);
    if (!header) continue;

    // Skip if this is a standard column alias we missed
    if (STANDARD_COL_ALIASES.has(header.toLowerCase().trim())) continue;

    // Quantity comes from the project row
    const quantity = cellToNumber(dataRow[col]);
    if (quantity === null || quantity <= 0) continue;

    // Unit price comes from the detected price row
    const unitPrice = cellToNumber(priceRow[col]);
    if (unitPrice === null || unitPrice <= 0) continue;

    items.push({
      description: header,
      quantity,
      unitPrice,
      total: unitPrice * quantity,
    });
  }

  return items;
}

// ─── Find header row (duplicated from excel-parser to avoid circular dep) ───

const ALL_KNOWN_HEADERS: Set<string> = new Set(
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

  // ─── 1. Extract metadata from ClickUp task (for purpose building later) ──

  let clickupCategory = "";
  let clickupType = "";
  let clickupBrief = ""; // The actual brief content — rich context about the project

  try {
    const cached = await readCache<ClickUpTask[]>("tracker:clickup_all_tasks");
    if (cached?.data) {
      // Fuzzy match: try exact project name, then includes both ways
      const matchingTask = cached.data.find((task) => {
        const taskName = task.name.toLowerCase().trim();
        return taskName === projectLower || taskName.includes(projectLower) || projectLower.includes(taskName);
      }) ?? (() => {
        // Secondary: find the client's ClickUp space using getMappingBySpaceName (3-tier fuzzy match)
        // This handles cases like "Bose" where the ClickUp space name may differ slightly
        const clientMapping = getMappingBySpaceName(clientParam);
        if (!clientMapping) return undefined;
        // Also try matching clientParam directly against space names in CLIENT_MAPPINGS
        // using includes/startsWith both ways for maximum coverage
        const allMatchingSpaceIds = new Set<string>();
        allMatchingSpaceIds.add(clientMapping.clickupSpaceId);
        for (const m of CLIENT_MAPPINGS) {
          const spaceLower = m.clickupSpaceName.toLowerCase();
          if (spaceLower === "other customers") continue;
          if (
            spaceLower === clientLower ||
            clientLower.includes(spaceLower) ||
            spaceLower.includes(clientLower) ||
            clientLower.startsWith(spaceLower) ||
            spaceLower.startsWith(clientLower)
          ) {
            allMatchingSpaceIds.add(m.clickupSpaceId);
          }
        }
        // Within the client's space(s), try looser name matching
        return cached.data.find((task) => {
          const taskSpaceId = task.space?.id;
          if (!taskSpaceId || !allMatchingSpaceIds.has(taskSpaceId)) return false;
          const taskName = task.name.toLowerCase().trim();
          const projectWords = projectLower.split(/[\s\-_]+/).filter((w) => w.length >= 3);
          return projectWords.length > 0 && projectWords.every((word) => taskName.includes(word));
        });
      })();

      if (matchingTask?.description) {
        const cleaned = matchingTask.description.replace(/<[^>]+>/g, "").trim();
        const separatorIdx = cleaned.indexOf("---");

        // Extract metadata (before ---) for category/type
        const metadataSection = separatorIdx > 0 ? cleaned.slice(0, separatorIdx).trim() : "";
        if (metadataSection) {
          for (const line of metadataSection.split("\n").filter(Boolean)) {
            if (line.startsWith("Category:")) clickupCategory = line.replace("Category:", "").trim();
            if (line.startsWith("Type:")) clickupType = line.replace("Type:", "").trim();
          }
        }

        // Extract brief content (after ---) — this is the rich project context
        const briefSection = separatorIdx > 0
          ? cleaned.slice(separatorIdx + 3).trim()
          : (metadataSection ? "" : cleaned); // If no separator, treat whole description as brief if no metadata found

        if (briefSection) {
          // Clean: strip URLs, emoji headers, section headers, excessive whitespace
          // IMPORTANT: strip section headers BEFORE joining lines, so they don't leak
          // into sentences. Handles patterns like:
          //   "Introduction/Goal of the project:"
          //   "🌟 Deliverables:"
          //   "BRANDING"
          //   "Source Files:"
          const cleanedBrief = briefSection
            .split("\n")
            .filter((line) => {
              const trimmed = line.trim();
              if (!trimmed) return false;
              // Strip lines starting with emoji (broad Unicode emoji ranges)
              if (/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/u.test(trimmed)) return false;
              // Strip specific emoji characters that may not be caught by ranges
              if (/^[🌟✈️🚚📍💬➡️🎯📋📦🎨📝🔗💡⚡🏆📸🖼️🎬📐]/u.test(trimmed)) return false;
              // Strip "Introduction/Goal of the project:" and variants (with or without spaces around /)
              if (/^introduction\s*[\/\-]\s*(goal|objective)/i.test(trimmed)) return false;
              // Strip known section header patterns — match at start of line, optionally ending with ":"
              if (/^(introduction|goal(\s+of\s+the\s+project)?|brief|deliverables|source\s*files?|branding|others|objective|scope|context|background|overview|description|requirements|assets|timeline|deadline|notes|instructions|reference|format|specifications|key\s*(information|details)|project\s*(details|info))\s*[:\-/]?\s*$/i.test(trimmed)) return false;
              // Strip lines that start with a header keyword followed by ":" even with trailing text
              // (catches "Introduction: " or "Goal of the project:" inline)
              if (/^(introduction|goal|brief|deliverables|source\s*files?|branding|others|objective|scope|context|overview|description)\s*[\/\s]*(of\s+the\s+project)?\s*:\s*$/i.test(trimmed)) return false;
              // Strip ALL CAPS lines (section headers) — at least 4 chars, all uppercase letters/spaces/punctuation
              if (trimmed.length > 3 && trimmed === trimmed.toUpperCase() && /^[A-Z\s\-/:&]+$/.test(trimmed)) return false;
              // Strip lines that are ONLY a label ending with ":" (e.g. "Source Files:", "Branding:")
              if (/^[A-Za-z\s\/\-]+:\s*$/.test(trimmed)) return false;
              // Strip bullet-style header lines like "- Deliverables:" or "• Branding:"
              if (/^[\-•*]\s*[A-Za-z\s\/]+:\s*$/.test(trimmed)) return false;
              return true;
            })
            .join(" ")
            .replace(/https?:\/\/\S+/g, "")
            .replace(/[🌟✈️🚚📍💬➡️🎯📋📦🎨📝🔗💡⚡🏆📸🖼️🎬📐]/gu, "")
            .replace(/\s{2,}/g, " ")
            .trim()
            .slice(0, 500); // Cap at 500 chars — enough context without flooding
          clickupBrief = cleanedBrief;
        }
      }
    }
  } catch (e) {
    console.error("[Prefill] ClickUp cache read error:", e);
  }

  // ─── 2. Try to get line items from Excel tracker ────────────────────────

  // Find the client mapping to know which Excel file to read
  // Use the robust 3-tier matching from getMappingBySpaceName (exact, contains, first-word)
  const mapping = getMappingBySpaceName(clientParam);

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

          // Detect the actual price row (may not be headerIdx+1 if there's a sub-header)
          const standardColIndicesForDetection = new Set<number>();
          for (const aliases of Object.values(COL_MAP)) {
            const idx = findColumnIndex(headers, aliases);
            if (idx !== -1) standardColIndicesForDetection.add(idx);
          }
          const detectedPriceRowIdx = detectPriceRowIndex(values, headerIdx, standardColIndicesForDetection);

          // Find the row matching our project — skip header row AND price row
          // Start searching AFTER the detected price row to avoid treating it as a project
          const projectSearchStart = Math.max(headerIdx + 2, detectedPriceRowIdx + 1);
          for (let rowIdx = projectSearchStart; rowIdx < values.length; rowIdx++) {
            const row = values[rowIdx];
            const projectCell = cellToString(row[colProject]).toLowerCase().trim();

            if (
              projectCell === projectLower ||
              projectCell.includes(projectLower) ||
              projectLower.includes(projectCell)
            ) {
              matchedSheetName = sheet.name;

              // Extract asset line items: header = asset names, detectedPriceRowIdx = unit prices, rowIdx = quantities
              const assetItems = extractAssetLineItems(values, headerIdx, detectedPriceRowIdx, rowIdx);
              if (assetItems.length > 0) {
                response.lineItems = assetItems;
                response.sources.lineItems = "excel";
              }

              // Grab Excel category for purpose building
              if (!clickupCategory) {
                const colCategory = findColumnIndex(headers, COL_MAP.category);
                if (colCategory !== -1) {
                  clickupCategory = cellToString(row[colCategory]);
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

  // ─── 4. Build purpose of work — ALWAYS a clean 1-2 sentence description ──
  // GUARD: never output raw URLs, raw briefs, or internal metadata
  response.purpose = buildPurpose(
    clientParam,
    projectParam,
    clickupCategory,
    clickupType,
    clickupBrief,
    response.lineItems
  );
  response.sources.purpose = clickupBrief ? "clickup" : clickupCategory ? "clickup" : response.lineItems.length > 0 ? "excel" : "none";

  return NextResponse.json(response);
}

/**
 * Build a professional purpose-of-work that demonstrates Sarani's understanding
 * of the client's project. This is NOT a brief, NOT a list of deliverables.
 * It's a 2-sentence text that shows we understand WHAT the client needs and WHY.
 *
 * PRIORITY 1: Use the ClickUp brief to show real understanding of the project context.
 * PRIORITY 2: Fallback to category/type + line items when no brief is available.
 *
 * Sentence 1: Our understanding of the project — what it's about, what the client needs.
 * Sentence 2: What Sarani will concretely deliver.
 *
 * NEVER just repeats the project name. NEVER includes URLs or raw metadata.
 * Thomas has flagged this 5 times — the purpose must show COMPREHENSION.
 */
function buildPurpose(
  clientName: string,
  projectName: string,
  category: string,
  projectType: string,
  brief: string,
  lineItems: PrefillLineItem[]
): string {
  // Clean inputs — strip any URLs that may have leaked in
  const cleanStr = (s: string) =>
    s.replace(/https?:\/\/\S+/g, "").replace(/\s{2,}/g, " ").trim();

  const cleanProject = cleanStr(projectName);
  const cleanCategory = cleanStr(category);
  const cleanType = cleanStr(projectType);
  const cleanBrief = cleanStr(brief);

  // Build a human-readable deliverables summary from line items
  let deliverablesText = "";
  if (lineItems.length > 0) {
    const names = lineItems.map((i) => i.description.toLowerCase());
    if (names.length === 1) {
      deliverablesText = names[0];
    } else if (names.length === 2) {
      deliverablesText = `${names[0]} and ${names[1]}`;
    } else if (names.length <= 5) {
      deliverablesText = names.slice(0, -1).join(", ") + `, and ${names[names.length - 1]}`;
    } else {
      deliverablesText = names.slice(0, 4).join(", ") + `, and ${names.length - 4} additional deliverable${names.length - 4 > 1 ? "s" : ""}`;
    }
  }

  // ─── SENTENCE 1: Show understanding of the project ───────────────────────

  let sentence1: string;

  // IMPORTANT: The ClickUp brief is an INTERNAL document (instructions for the Sarani team).
  // It must NEVER be copied into the Purpose of Work which is CLIENT-FACING.
  // We build the purpose from: client name, project name, category/type, and deliverables list.
  {
    // FALLBACK: No brief available — build from category/type/project name
    const scopeLabel = (cleanType && cleanType !== "generic")
      ? cleanType.toLowerCase()
      : cleanCategory
        ? cleanCategory.toLowerCase()
        : "creative production";

    if (scopeLabel === "creative production" && !cleanCategory && !cleanType) {
      // Worst case: no brief, no category, no type — use the guaranteed meaningful fallback
      sentence1 = `Sarani will manage all creative production for ${clientName}'s ${cleanProject} project, ensuring delivery to the highest standards within the agreed timeline.`;
    } else {
      sentence1 = `As part of ${clientName}'s ${cleanProject} initiative, Sarani will handle all ${scopeLabel} needs to ensure the project is delivered on time and to the highest creative standards.`;
    }
  }

  // ─── SENTENCE 2: Concrete deliverables and commitment ────────────────────

  let sentence2: string;
  if (deliverablesText) {
    sentence2 = `The scope of work includes ${deliverablesText}, with unlimited revisions included until final client approval.`;
  } else {
    sentence2 = `The scope covers all required creative assets and deliverables, with unlimited revisions included until final client approval.`;
  }

  return `${sentence1} ${sentence2}`;
}
