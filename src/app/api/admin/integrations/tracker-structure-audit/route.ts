import { NextResponse } from "next/server";
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
} from "@/lib/integrations/config";
import {
  findColumnIndex,
  cellToString,
  cellToNumber,
  COL_MAP,
} from "@/lib/integrations/excel-parser";

/**
 * GET /api/admin/integrations/tracker-structure-audit
 * Opens every Excel tracker, reads every sheet, and dumps:
 * - Header row position and column names
 * - Price row detection (row after header with mostly numbers)
 * - First 3 project rows with their asset columns
 * - Which columns are "standard" vs "asset" columns
 *
 * TEMPORARY diagnostic endpoint — remove after fixing line items.
 */
export async function GET() {
  const session = await getUserFromSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, unknown> = {};

  for (const mapping of CLIENT_MAPPINGS) {
    const filename = mapping.excelTrackerFilename;
    const fileResult: Record<string, unknown> = { client: mapping.clickupSpaceName, sheets: [] };

    try {
      const filePath = `${TRACKERS_BASE_PATH}/${filename}`;
      const item = await getDriveItemByPath(SHAREPOINT_TRACKERS_DRIVE_ID, filePath);
      const sheets = await listWorksheets(SHAREPOINT_TRACKERS_DRIVE_ID, item.id);

      const SKIP = ["performance", "dashboard", "overview", "template", "config", "instructions", "total", "summary"];
      const dataSheets = sheets.filter((s) => {
        const lower = s.name.toLowerCase().trim();
        return !SKIP.some((p) => lower.includes(p));
      });

      const sheetsData: unknown[] = [];

      for (const sheet of dataSheets) {
        try {
          const rangeData = await readExcelUsedRange(
            SHAREPOINT_TRACKERS_DRIVE_ID,
            item.id,
            sheet.name
          );
          const values = rangeData.values;

          // Find header row
          const ALL_KNOWN: Set<string> = new Set(
            Object.values(COL_MAP).flatMap((a) => [...a])
          );
          let headerIdx = -1;
          for (let i = 0; i < Math.min(values.length, 20); i++) {
            const row = values[i];
            if (!row) continue;
            let matchCount = 0;
            for (const cell of row) {
              if (cell === null || cell === undefined) continue;
              if (ALL_KNOWN.has(String(cell).toLowerCase().trim())) {
                matchCount++;
                if (matchCount >= 2) { headerIdx = i; break; }
              }
            }
            if (headerIdx !== -1) break;
          }

          if (headerIdx === -1) {
            sheetsData.push({
              sheet: sheet.name,
              error: "No header row found",
              totalRows: values.length,
              firstRows: values.slice(0, 5).map((r) => r?.slice(0, 10).map((c) => cellToString(c))),
            });
            continue;
          }

          const headers = values[headerIdx].map((h) => cellToString(h));

          // Identify standard vs asset columns
          const standardCols: Record<number, string> = {};
          const assetCols: Record<number, string> = {};
          for (let col = 0; col < headers.length; col++) {
            const h = headers[col];
            if (!h) continue;
            let isStandard = false;
            for (const [key, aliases] of Object.entries(COL_MAP)) {
              if (findColumnIndex([h], aliases) !== -1) {
                standardCols[col] = `${key} (${h})`;
                isStandard = true;
                break;
              }
            }
            if (!isStandard) {
              assetCols[col] = h;
            }
          }

          // Read the row after header (potential price row)
          const priceRowIdx = headerIdx + 1;
          const priceRow = values[priceRowIdx];
          const priceRowData: Record<string, unknown> = {};
          if (priceRow) {
            for (const [colStr, name] of Object.entries(assetCols)) {
              const col = parseInt(colStr);
              const val = priceRow[col];
              const num = cellToNumber(val);
              priceRowData[name] = { raw: cellToString(val), numeric: num };
            }
          }

          // Read first 3 project rows
          const projectRows: unknown[] = [];
          let projectCount = 0;
          const colProject = findColumnIndex(headers, COL_MAP.project);
          const colValue = findColumnIndex(headers, COL_MAP.totalValue);

          for (let r = headerIdx + 2; r < Math.min(values.length, headerIdx + 20); r++) {
            const row = values[r];
            if (!row) continue;
            const projName = colProject !== -1 ? cellToString(row[colProject]) : "";
            if (!projName) continue;

            const rowAssets: Record<string, unknown> = {};
            for (const [colStr, name] of Object.entries(assetCols)) {
              const col = parseInt(colStr);
              const val = row[col];
              const num = cellToNumber(val);
              if (num !== null && num > 0) {
                rowAssets[name] = { raw: cellToString(val), quantity: num };
              }
            }

            projectRows.push({
              rowIndex: r,
              project: projName,
              totalValue: colValue !== -1 ? cellToNumber(row[colValue]) : null,
              assetQuantities: rowAssets,
            });

            projectCount++;
            if (projectCount >= 3) break;
          }

          sheetsData.push({
            sheet: sheet.name,
            totalRows: values.length,
            headerRowIndex: headerIdx,
            standardColumns: standardCols,
            assetColumns: assetCols,
            assetColumnCount: Object.keys(assetCols).length,
            priceRow: {
              index: priceRowIdx,
              data: priceRowData,
              hasNumericPrices: Object.values(priceRowData).some((v: any) => v.numeric !== null && v.numeric > 0),
            },
            sampleProjects: projectRows,
          });
        } catch (sheetErr) {
          sheetsData.push({
            sheet: sheet.name,
            error: sheetErr instanceof Error ? sheetErr.message : "Unknown error",
          });
        }
      }

      fileResult.sheets = sheetsData;
    } catch (fileErr) {
      fileResult.error = fileErr instanceof Error ? fileErr.message : "Unknown error";
    }

    results[filename] = fileResult;
  }

  return NextResponse.json(results);
}
