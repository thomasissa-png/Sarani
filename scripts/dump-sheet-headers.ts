/**
 * Dump first 10 rows of every sheet in every tracker file.
 * This lets Claude see the actual column structure without API access.
 * Run with: npx tsx scripts/dump-sheet-headers.ts
 */
import { getDriveItemByPath, readExcelUsedRange, listWorksheets } from "../src/lib/integrations/sharepoint";
import { CLIENT_MAPPINGS, SHAREPOINT_TRACKERS_DRIVE_ID, TRACKERS_BASE_PATH } from "../src/lib/integrations/config";

const SKIP = ["performance", "dashboard", "summary", "template", "config", "instructions"];
function shouldSkip(name: string): boolean {
  const lower = name.toLowerCase().trim();
  return SKIP.some((p) => lower.includes(p));
}

async function main() {
  // Deduplicate files
  const seen = new Set<string>();
  const uniqueMappings = CLIENT_MAPPINGS.filter((m) => {
    if (seen.has(m.excelTrackerFilename)) return false;
    seen.add(m.excelTrackerFilename);
    return true;
  });

  for (const mapping of uniqueMappings) {
    const filePath = `${TRACKERS_BASE_PATH}/${mapping.excelTrackerFilename}`;
    console.log(`\n${"═".repeat(70)}`);
    console.log(`FILE: ${mapping.excelTrackerFilename} (${mapping.clickupSpaceName})`);
    console.log(`${"═".repeat(70)}`);

    try {
      const item = await getDriveItemByPath(SHAREPOINT_TRACKERS_DRIVE_ID, filePath);
      const sheets = await listWorksheets(SHAREPOINT_TRACKERS_DRIVE_ID, item.id);

      for (const sheet of sheets) {
        const skip = shouldSkip(sheet.name);
        console.log(`\n  ── Sheet: "${sheet.name}" ${skip ? "(SKIPPED — dashboard)" : ""}`);
        if (skip) continue;

        try {
          const range = await readExcelUsedRange(SHAREPOINT_TRACKERS_DRIVE_ID, item.id, sheet.name);
          console.log(`     Total rows: ${range.values.length}`);

          // Show first 10 rows (truncate cells to 25 chars)
          const rowsToShow = Math.min(range.values.length, 10);
          for (let i = 0; i < rowsToShow; i++) {
            const row = range.values[i];
            const cells = row.slice(0, 15).map((c) => {
              const s = String(c ?? "").trim();
              return s.length > 25 ? s.slice(0, 22) + "..." : s.padEnd(25);
            });
            const prefix = i === 0 ? "  R0" : `  R${i}`;
            console.log(`     ${prefix.padEnd(5)}| ${cells.join(" | ")}`);
          }
        } catch (e: any) {
          console.log(`     ❌ Error: ${e.message?.slice(0, 100)}`);
        }
      }
    } catch (e: any) {
      console.log(`  ❌ File error: ${e.message?.slice(0, 100)}`);
    }
  }
}

main().catch(console.error);
