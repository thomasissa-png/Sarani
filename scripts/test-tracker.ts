import { getSpaces, getListsForSpace } from "../src/lib/integrations/clickup";
import { getDriveItemByPath, readExcelUsedRange, resolveSheetName } from "../src/lib/integrations/sharepoint";
import { parseExcelProjects } from "../src/lib/integrations/excel-parser";
import { CLIENT_MAPPINGS, SHAREPOINT_TRACKERS_DRIVE_ID, TRACKERS_BASE_PATH, EXCEL_SHEET_NAME_CANDIDATES } from "../src/lib/integrations/config";

async function main() {
  console.log("=== TESTING CLICKUP ===");
  try {
    const spaces = await getSpaces();
    console.log(`ClickUp: ${spaces.length} spaces found`);
    for (const s of spaces) {
      console.log(`  - ${s.name} (id: ${s.id})`);
    }
  } catch (e: any) {
    console.error("ClickUp ERROR:", e.message);
  }

  console.log("\n=== TESTING SHAREPOINT EXCEL TRACKERS ===");
  for (const mapping of CLIENT_MAPPINGS) {
    const filePath = `${TRACKERS_BASE_PATH}/${mapping.excelTrackerFilename}`;
    console.log(`\n--- ${mapping.clickupSpaceName} ---`);
    console.log(`  File: ${mapping.excelTrackerFilename}`);

    try {
      const item = await getDriveItemByPath(SHAREPOINT_TRACKERS_DRIVE_ID, filePath);
      console.log(`  SharePoint item ID: ${item.id}`);

      const sheetName = await resolveSheetName(
        SHAREPOINT_TRACKERS_DRIVE_ID,
        item.id,
        EXCEL_SHEET_NAME_CANDIDATES
      );
      console.log(`  Sheet name: ${sheetName}`);

      const rangeData = await readExcelUsedRange(
        SHAREPOINT_TRACKERS_DRIVE_ID,
        item.id,
        sheetName
      );
      console.log(`  Rows: ${rangeData.values.length} (including header)`);

      if (rangeData.values.length > 0) {
        const headers = rangeData.values[0].map(h => String(h ?? ""));
        console.log(`  Headers: ${headers.join(" | ")}`);
      }

      const projects = parseExcelProjects(rangeData.values, mapping.clickupSpaceName);
      console.log(`  Parsed projects: ${projects.length}`);

      // Show first 3 projects
      for (const p of projects.slice(0, 3)) {
        console.log(`    -> ${p.client} | ${p.project} | ${p.status} | ${p.totalValue ?? "no value"} | PO: ${p.poNumber || "none"}`);
      }
    } catch (e: any) {
      console.error(`  ERROR: ${e.message}`);
    }
  }

  console.log("\n=== MERGE TEST ===");
  try {
    const spaces = await getSpaces();
    const clientSpaces = spaces.filter(s =>
      !["Brand Native", "Sarani"].includes(s.name)
    );

    // Pick first client space that has a mapping
    const testSpace = clientSpaces.find(s =>
      CLIENT_MAPPINGS.some(m => m.clickupSpaceName.toLowerCase() === s.name.toLowerCase())
    );

    if (testSpace) {
      const mapping = CLIENT_MAPPINGS.find(m =>
        m.clickupSpaceName.toLowerCase() === testSpace.name.toLowerCase()
      )!;

      console.log(`\nTesting merge for: ${testSpace.name}`);

      // Get ClickUp tasks
      const lists = await getListsForSpace(testSpace.id);
      console.log(`  ClickUp lists: ${lists.length}`);
      let taskCount = 0;
      const taskNames: string[] = [];
      for (const list of lists.slice(0, 2)) {
        try {
          const { getAllTasksForList } = await import("../src/lib/integrations/clickup");
          const tasks = await getAllTasksForList(list.id);
          taskCount += tasks.length;
          for (const t of tasks.slice(0, 3)) {
            taskNames.push(t.name);
          }
        } catch (e: any) {
          console.log(`  List ${list.name} error: ${e.message}`);
        }
      }
      console.log(`  ClickUp tasks (sample): ${taskCount}`);
      for (const n of taskNames.slice(0, 5)) {
        console.log(`    CU: "${n}"`);
      }

      // Get Excel projects
      const filePath = `${TRACKERS_BASE_PATH}/${mapping.excelTrackerFilename}`;
      const item = await getDriveItemByPath(SHAREPOINT_TRACKERS_DRIVE_ID, filePath);
      const sheetName = await resolveSheetName(SHAREPOINT_TRACKERS_DRIVE_ID, item.id, EXCEL_SHEET_NAME_CANDIDATES);
      const rangeData = await readExcelUsedRange(SHAREPOINT_TRACKERS_DRIVE_ID, item.id, sheetName);
      const excelProjects = parseExcelProjects(rangeData.values, mapping.clickupSpaceName);

      console.log(`\n  Excel projects (sample):`);
      for (const p of excelProjects.slice(0, 5)) {
        console.log(`    XL: "${p.project}" | client: ${p.client} | value: ${p.totalValue}`);
      }

      // Check name overlap
      const normalizeForMatch = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
      const excelNorm = new Set(excelProjects.map(p => normalizeForMatch(p.project)));
      const matchCount = taskNames.filter(n => excelNorm.has(normalizeForMatch(n))).length;
      console.log(`\n  Name overlap: ${matchCount}/${taskNames.length} ClickUp tasks match an Excel project name`);
    }
  } catch (e: any) {
    console.error("Merge test error:", e.message);
  }
}

main().catch(console.error);
