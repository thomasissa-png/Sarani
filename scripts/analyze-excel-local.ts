/**
 * Analyze Excel tracker files locally to understand sheet structures.
 * Reads from public/*.xlsx files uploaded to the repo.
 */
import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";

const PUBLIC_DIR = path.join(process.cwd(), "public");

function analyzeFile(filePath: string) {
  const wb = XLSX.readFile(filePath);
  const filename = path.basename(filePath);

  console.log(`\n${"═".repeat(70)}`);
  console.log(`FILE: ${filename}`);
  console.log(`Sheets: ${wb.SheetNames.join(", ")}`);
  console.log(`${"═".repeat(70)}`);

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const data: (string | number | boolean | null)[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });

    console.log(`\n  ── Sheet: "${sheetName}" (${data.length} rows)`);

    if (data.length === 0) {
      console.log("     (empty)");
      continue;
    }

    // Show first 8 rows
    const rowsToShow = Math.min(data.length, 8);
    for (let i = 0; i < rowsToShow; i++) {
      const row = data[i] || [];
      const cells = row.slice(0, 16).map((c) => {
        const s = String(c ?? "").trim();
        return s.length > 22 ? s.slice(0, 19) + "..." : s.padEnd(22);
      });
      console.log(`     R${String(i).padStart(2)}| ${cells.join(" | ")}`);
    }

    // Try to detect header row
    const knownHeaders = new Set([
      "project", "project name", "project description", "description", "brief", "job", "titre",
      "date", "status", "contact", "contact name", "client contact",
      "total value", "total", "value", "amount", "montant", "prix", "price", "fee",
      "total value (eur)", "total value (usd)", "total eur", "total usd",
      "po", "po number", "invoice", "invoice number", "payment status",
      "category", "cat", "type", "link", "sharepoint", "folder",
      "customer", "client", "division", "department",
    ]);

    let headerRowIdx = -1;
    for (let i = 0; i < Math.min(data.length, 20); i++) {
      const row = data[i] || [];
      let matchCount = 0;
      for (const cell of row) {
        if (cell === null || cell === undefined) continue;
        const normalized = String(cell).toLowerCase().trim();
        if (knownHeaders.has(normalized)) matchCount++;
      }
      if (matchCount >= 2) {
        headerRowIdx = i;
        break;
      }
    }

    if (headerRowIdx >= 0) {
      const headers = (data[headerRowIdx] || []).map(c => String(c ?? "").trim());
      const dataRowCount = data.length - headerRowIdx - 1;

      // Count non-empty project rows
      const projectColIdx = headers.findIndex(h =>
        ["project", "project name", "project description", "description", "brief", "job", "titre"].includes(h.toLowerCase().trim())
      );
      let projectCount = 0;
      let totalValue = 0;

      // Find value column
      const valueColIdx = headers.findIndex(h =>
        ["total value", "total value (eur)", "total value (usd)", "total", "value", "amount", "montant", "prix", "price", "fee", "total eur", "total usd"].includes(h.toLowerCase().trim())
      );

      if (projectColIdx >= 0) {
        for (let i = headerRowIdx + 1; i < data.length; i++) {
          const row = data[i] || [];
          const projName = String(row[projectColIdx] ?? "").trim();
          if (projName) {
            projectCount++;
            if (valueColIdx >= 0) {
              const val = Number(row[valueColIdx]);
              if (!isNaN(val)) totalValue += val;
            }
          }
        }
      }

      console.log(`     ✅ Header at row ${headerRowIdx}: ${headers.filter(h => h).join(" | ")}`);
      console.log(`     📊 ${projectCount} projects, total value: ${totalValue.toLocaleString()}`);
    } else {
      console.log(`     ⚠️ No header row detected in first 20 rows`);
    }
  }
}

// Main
const files = fs.readdirSync(PUBLIC_DIR)
  .filter(f => f.endsWith(".xlsx"))
  .sort();

console.log(`Found ${files.length} Excel files in public/\n`);

for (const file of files) {
  try {
    analyzeFile(path.join(PUBLIC_DIR, file));
  } catch (e: any) {
    console.error(`❌ Error reading ${file}: ${e.message}`);
  }
}
