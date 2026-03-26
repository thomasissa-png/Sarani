/**
 * Full Tracker Diagnostic — Client by Client
 * Checks ClickUp spaces, Excel sheets, and merge quality.
 * Run with: npx tsx scripts/diagnose-tracker.ts
 */
import { getSpaces, getListsForSpace, getAllTasksForList, type ClickUpTask } from "../src/lib/integrations/clickup";
import { getDriveItemByPath, readExcelUsedRange, listWorksheets } from "../src/lib/integrations/sharepoint";
import { parseExcelProjects, type ExcelProject } from "../src/lib/integrations/excel-parser";
import { CLIENT_MAPPINGS, SHAREPOINT_TRACKERS_DRIVE_ID, TRACKERS_BASE_PATH, CLICKUP_SPACES_WITHOUT_TRACKER } from "../src/lib/integrations/config";
import { getInvoices } from "../src/lib/integrations/evoliz";

const INTERNAL_SPACE_NAMES = new Set(
  CLICKUP_SPACES_WITHOUT_TRACKER.map((s) => s.name.toLowerCase())
);

const SKIP_SHEET_PATTERNS = ["performance", "dashboard", "summary", "overview", "template", "config", "instructions"];
function shouldSkipSheet(name: string): boolean {
  const lower = name.toLowerCase().trim();
  return SKIP_SHEET_PATTERNS.some((p) => lower.includes(p));
}

function formatEUR(n: number | null): string {
  if (n === null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

async function main() {
  let totalExcelProjects = 0;
  let totalExcelValue = 0;
  let totalClickUpTasks = 0;
  let totalEvolizInvoices = 0;
  const issues: string[] = [];
  const clientSummaries: { client: string; cuTasks: number; xlProjects: number; xlValue: number; sheets: string[]; skippedSheets: string[]; failedSheets: string[]; parseIssues: string[] }[] = [];

  // ═══════════════════════════════════════════════════════════════
  console.log("═══════════════════════════════════════════════════════");
  console.log("    SARANI TRACKER — FULL DIAGNOSTIC");
  console.log("═══════════════════════════════════════════════════════\n");

  // 1. ClickUp
  console.log("━━━ CLICKUP ━━━");
  let allSpaces: { id: string; name: string }[] = [];
  try {
    allSpaces = await getSpaces();
    const clientSpaces = allSpaces.filter(s => !INTERNAL_SPACE_NAMES.has(s.name.toLowerCase()));
    console.log(`✅ ${allSpaces.length} spaces (${clientSpaces.length} client spaces)\n`);

    for (const space of clientSpaces) {
      const mapping = CLIENT_MAPPINGS.find(m => m.clickupSpaceName.toLowerCase() === space.name.toLowerCase());
      let taskCount = 0;

      try {
        const lists = await getListsForSpace(space.id);
        const taskResults = await Promise.allSettled(
          lists.map(l => getAllTasksForList(l.id))
        );
        for (const r of taskResults) {
          if (r.status === "fulfilled") taskCount += r.value.length;
        }
      } catch (e: any) {
        issues.push(`ClickUp: Failed to fetch tasks for ${space.name}: ${e.message}`);
      }

      totalClickUpTasks += taskCount;
      const hasMapping = mapping ? "✅" : "⚠️ NO MAPPING";
      console.log(`  ${space.name}: ${taskCount} tasks ${hasMapping}`);

      if (!mapping) {
        issues.push(`ClickUp space "${space.name}" has no entry in CLIENT_MAPPINGS — its tasks won't link to Excel`);
      }

      // Store for summary
      const existing = clientSummaries.find(c => c.client === space.name);
      if (existing) {
        existing.cuTasks = taskCount;
      } else {
        clientSummaries.push({ client: space.name, cuTasks: taskCount, xlProjects: 0, xlValue: 0, sheets: [], skippedSheets: [], failedSheets: [], parseIssues: [] });
      }
    }
  } catch (e: any) {
    console.error(`❌ ClickUp ERROR: ${e.message}`);
    issues.push(`ClickUp connection failed: ${e.message}`);
  }

  // 2. Excel trackers
  console.log("\n━━━ SHAREPOINT EXCEL TRACKERS ━━━");
  for (const mapping of CLIENT_MAPPINGS) {
    const filePath = `${TRACKERS_BASE_PATH}/${mapping.excelTrackerFilename}`;
    console.log(`\n  📁 ${mapping.clickupSpaceName} — ${mapping.excelTrackerFilename}`);

    let summary = clientSummaries.find(c => c.client === mapping.clickupSpaceName);
    if (!summary) {
      summary = { client: mapping.clickupSpaceName, cuTasks: 0, xlProjects: 0, xlValue: 0, sheets: [], skippedSheets: [], failedSheets: [], parseIssues: [] };
      clientSummaries.push(summary);
    }

    try {
      const item = await getDriveItemByPath(SHAREPOINT_TRACKERS_DRIVE_ID, filePath);
      const sheets = await listWorksheets(SHAREPOINT_TRACKERS_DRIVE_ID, item.id);

      console.log(`     ${sheets.length} sheets: ${sheets.map(s => s.name).join(", ")}`);

      const dataSheets = sheets.filter(s => !shouldSkipSheet(s.name));
      const skipped = sheets.filter(s => shouldSkipSheet(s.name));
      summary.skippedSheets = skipped.map(s => s.name);

      for (const sheet of dataSheets) {
        try {
          const rangeData = await readExcelUsedRange(SHAREPOINT_TRACKERS_DRIVE_ID, item.id, sheet.name);
          const projects = parseExcelProjects(rangeData.values, mapping.clickupSpaceName);

          const sheetValue = projects.reduce((sum, p) => sum + (p.totalValue ?? 0), 0);
          summary.sheets.push(sheet.name);
          summary.xlProjects += projects.length;
          summary.xlValue += sheetValue;
          totalExcelProjects += projects.length;
          totalExcelValue += sheetValue;

          const icon = projects.length > 0 ? "✅" : "⚠️";
          console.log(`     ${icon} "${sheet.name}": ${projects.length} projects, ${formatEUR(sheetValue)}`);

          if (projects.length === 0 && rangeData.values.length > 2) {
            summary.parseIssues.push(`"${sheet.name}": ${rangeData.values.length} rows but 0 parsed — header detection may have failed`);
            // Show first 3 rows for debug
            console.log(`        ⚠️ ${rangeData.values.length} rows but 0 parsed. First row:`);
            console.log(`           ${rangeData.values[0]?.slice(0, 8).map(c => String(c ?? "").slice(0, 20)).join(" | ")}`);
            if (rangeData.values.length > 1) {
              console.log(`        Row 2: ${rangeData.values[1]?.slice(0, 8).map(c => String(c ?? "").slice(0, 20)).join(" | ")}`);
            }
            if (rangeData.values.length > 5) {
              console.log(`        Row 6: ${rangeData.values[5]?.slice(0, 8).map(c => String(c ?? "").slice(0, 20)).join(" | ")}`);
            }
          }
        } catch (e: any) {
          summary.failedSheets.push(`"${sheet.name}": ${e.message.slice(0, 80)}`);
          console.log(`     ❌ "${sheet.name}": ${e.message.slice(0, 80)}`);
        }
      }
    } catch (e: any) {
      console.log(`     ❌ File error: ${e.message.slice(0, 100)}`);
      issues.push(`Excel file "${mapping.excelTrackerFilename}" not accessible: ${e.message.slice(0, 100)}`);
    }
  }

  // 3. Evoliz
  console.log("\n━━━ EVOLIZ ━━━");
  try {
    const invoices = await getInvoices({ perPage: 100 });
    totalEvolizInvoices = invoices.length;
    const totalInvoiceValue = invoices.reduce((s, i) => s + i.amount, 0);
    console.log(`✅ ${invoices.length} invoices (first page), total: ${formatEUR(totalInvoiceValue)}`);
  } catch (e: any) {
    if (e.message?.includes("not configured")) {
      console.log("⚠️ Not configured (optional)");
    } else {
      console.log(`❌ Error: ${e.message}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  console.log("\n═══════════════════════════════════════════════════════");
  console.log("    CLIENT-BY-CLIENT SUMMARY");
  console.log("═══════════════════════════════════════════════════════\n");

  console.log(`${"Client".padEnd(20)} | ${"CU Tasks".padStart(10)} | ${"XL Projects".padStart(12)} | ${"XL Value".padStart(14)} | ${"Sheets".padStart(8)} | Issues`);
  console.log("─".repeat(100));

  for (const c of clientSummaries.sort((a, b) => b.xlValue - a.xlValue)) {
    const issueCount = c.failedSheets.length + c.parseIssues.length + (c.cuTasks > 0 && c.xlProjects === 0 ? 1 : 0);
    const issueFlag = issueCount > 0 ? `⚠️ ${issueCount}` : "✅";
    console.log(
      `${c.client.padEnd(20)} | ${String(c.cuTasks).padStart(10)} | ${String(c.xlProjects).padStart(12)} | ${formatEUR(c.xlValue).padStart(14)} | ${String(c.sheets.length).padStart(8)} | ${issueFlag}`
    );
  }

  // ═══════════════════════════════════════════════════════════════
  console.log("\n═══════════════════════════════════════════════════════");
  console.log("    TOTALS");
  console.log("═══════════════════════════════════════════════════════\n");

  console.log(`  ClickUp tasks:     ${totalClickUpTasks}`);
  console.log(`  Excel projects:    ${totalExcelProjects}`);
  console.log(`  Excel total value: ${formatEUR(totalExcelValue)}`);
  console.log(`  Evoliz invoices:   ${totalEvolizInvoices}`);

  // ═══════════════════════════════════════════════════════════════
  if (issues.length > 0 || clientSummaries.some(c => c.parseIssues.length > 0 || c.failedSheets.length > 0)) {
    console.log("\n═══════════════════════════════════════════════════════");
    console.log("    ISSUES TO FIX");
    console.log("═══════════════════════════════════════════════════════\n");

    for (const issue of issues) {
      console.log(`  ⚠️ ${issue}`);
    }
    for (const c of clientSummaries) {
      for (const pi of c.parseIssues) {
        console.log(`  ⚠️ ${c.client} → ${pi}`);
      }
      for (const fs of c.failedSheets) {
        console.log(`  ❌ ${c.client} → sheet ${fs}`);
      }
    }
  } else {
    console.log("\n  ✅ No issues detected — all data linked successfully.");
  }
}

main().catch(console.error);
