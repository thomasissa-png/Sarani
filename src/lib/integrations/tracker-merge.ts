// ─── Tracker Data Merge Logic ────────────────────────────────────────────────
// M-02: Extracted from tracker/route.ts.
// Merges Excel projects with ClickUp tasks and Evoliz invoices.
// Matching strategy: exact name > word-overlap > token overlap > unmatched
//
// Match levels (in priority order):
//   L1: Exact normalized name match
//   L2: High word-overlap (≥ 70%) within same client
//   L3: Medium word-overlap (≥ 50%) + date proximity (≤ 14 days) within same client
//   L4: Token match (2+ tokens of 4+ chars shared) within same client

import type { ClickUpTask } from "@/lib/integrations/clickup";
import type { EvolizInvoice } from "@/lib/integrations/evoliz";
import type { ExcelProject } from "@/lib/integrations/excel-parser";
import type { TrackerProject } from "@/types/integrations";
import { getMappingBySpaceId } from "@/lib/integrations/config";

// ─── Debug Logging ──────────────────────────────────────────────────────────

const MERGE_DEBUG = process.env.TRACKER_MERGE_DEBUG === "true";

function debugLog(...args: unknown[]): void {
  if (MERGE_DEBUG) {
    console.log("[Merge]", ...args);
  }
}

// ─── Constants ──────────────────────────────────────────────────────────────

/** ClickUp Space ID for "Other customers" — tasks here need list-name scoping */
const OTHER_CUSTOMERS_SPACE_ID = "90050435651";

// ─── Country Detection ───────────────────────────────────────────────────────

const COUNTRY_PATTERNS: [RegExp, string][] = [
  [/\bfrance\b|\bfr\b/i, "France"],
  [/\bgermany\b|\bde\b|\bdeutschland\b/i, "Germany"],
  [/\buk\b|\bunited\s*kingdom\b|\bgb\b/i, "UK"],
  [/\bitaly\b|\bit\b|\bitalia\b/i, "Italy"],
  [/\bspain\b|\bes\b|\bespa[nñ]a\b/i, "Spain"],
  [/\bnetherlands\b|\bnl\b|\bholland\b/i, "Netherlands"],
  [/\bjapan\b|\bjp\b/i, "Japan"],
  [/\busa\b|\bus\b|\bunited\s*states\b/i, "USA"],
  [/\bchina\b|\bcn\b/i, "China"],
  [/\bglobal\b/i, "Global"],
];

function detectCountry(sheetName: string): string {
  for (const [pattern, country] of COUNTRY_PATTERNS) {
    if (pattern.test(sheetName)) return country;
  }
  return "Other";
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Normalize a string for matching: lowercase, strip punctuation (keep spaces),
 * collapse multiple spaces into one, trim.
 *
 * Preserves word boundaries so that "LEGO Q2" → "lego q2" and
 * "LEGO - Q2 Campaign" → "lego q2 campaign" — enabling word-overlap matching.
 */
function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ") // replace punctuation with space
    .replace(/\s+/g, " ") // collapse multiple spaces
    .trim();
}

/**
 * Legacy exact-key normalization: strips ALL non-alphanumeric for exact lookup.
 * Used only for the exact-match index (Level 1).
 */
function normalizeForExactKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Extract significant words (≥ minLen chars) from a normalized string.
 */
function extractWords(normalized: string, minLen = 3): string[] {
  return normalized.split(" ").filter((w) => w.length >= minLen);
}

/**
 * Calculate word-overlap score between two strings.
 * Returns a ratio (0–1) of how many significant words (≥3 chars) overlap
 * relative to the shorter word list. This ensures short names like "LEGO Q2"
 * match well against longer names like "LEGO Q2 Campaign".
 */
function wordOverlapScore(a: string, b: string): number {
  const wordsA = extractWords(normalizeForMatch(a));
  const wordsB = extractWords(normalizeForMatch(b));
  if (wordsA.length === 0 || wordsB.length === 0) return 0;

  const setB = new Set(wordsB);
  let overlap = 0;
  for (const w of wordsA) {
    if (setB.has(w)) overlap++;
  }

  // Ratio relative to the shorter list — so "LEGO Q2" (2 words, both match)
  // vs "LEGO Q2 Campaign" (3 words) → 2/2 = 1.0
  const minLen = Math.min(wordsA.length, wordsB.length);
  return overlap / minLen;
}

/**
 * Extract tokens of minLen+ chars from a normalized string.
 * Used for Level 4 token matching.
 */
function extractTokens(normalized: string, minLen = 4): string[] {
  return normalized.split(" ").filter((w) => w.length >= minLen);
}

/**
 * Count shared tokens (≥ minLen chars) between two strings.
 */
function sharedTokenCount(a: string, b: string, minLen = 4): number {
  const tokensA = extractTokens(normalizeForMatch(a), minLen);
  const tokensB = new Set(extractTokens(normalizeForMatch(b), minLen));
  let count = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) count++;
  }
  return count;
}

/**
 * Check if two date strings are within `maxDays` days of each other.
 * Returns false if either date is missing or unparseable.
 */
function datesWithinRange(
  dateA: string,
  dateB: string,
  maxDays: number
): boolean {
  if (!dateA || !dateB) return false;
  const a = new Date(dateA).getTime();
  const b = new Date(dateB).getTime();
  if (isNaN(a) || isNaN(b)) return false;
  const diffMs = Math.abs(a - b);
  return diffMs <= maxDays * 86_400_000;
}

/** Check if normalized string a contains normalized string b, or vice versa */
function fuzzyMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  return a.includes(b) || b.includes(a);
}

function mapEvolizStatus(status: string): string {
  switch (status) {
    case "paid":
      return "Paid";
    case "sent":
    case "unpaid":
      return "Invoiced";
    case "overdue":
      return "Overdue";
    case "draft":
      return "Draft";
    default:
      return status;
  }
}

/**
 * Resolve the client key for a ClickUp task.
 * For tasks in the "Other customers" space, use the list name (which is
 * typically the actual client name) instead of the generic space name.
 */
function resolveTaskClientKey(task: ClickUpTask): string {
  const spaceId = task.space?.id;
  if (spaceId === OTHER_CUSTOMERS_SPACE_ID) {
    // For "Other customers", the list name IS the client name
    const listName = task.list?.name ?? "";
    if (listName) {
      return normalizeForMatch(listName);
    }
  }
  // For dedicated client spaces, use the mapping's space name
  const mapping = getMappingBySpaceId(spaceId);
  return normalizeForMatch(
    mapping?.clickupSpaceName ?? task.list?.name ?? ""
  );
}

/**
 * Get the display client name for a ClickUp-only task.
 */
function resolveTaskClientName(task: ClickUpTask): string {
  const spaceId = task.space?.id;
  if (spaceId === OTHER_CUSTOMERS_SPACE_ID) {
    const listName = task.list?.name ?? "";
    if (listName) return listName;
  }
  const mapping = getMappingBySpaceId(spaceId);
  return mapping?.clickupSpaceName ?? task.list?.name ?? "Unknown";
}

/**
 * Extract a date string from a ClickUp task (prefer due_date/start_date over date_created).
 */
function getClickUpTaskDate(task: ClickUpTask): string {
  // Prefer due_date or start_date (more meaningful) over date_created
  const ts = task.due_date ?? task.start_date ?? task.date_created;
  if (!ts) return "";
  return new Date(parseInt(ts)).toISOString().split("T")[0];
}

// ─── Merge ──────────────────────────────────────────────────────────────────

/**
 * Merge data from Excel, ClickUp, and Evoliz into unified TrackerProject records.
 *
 * Matching strategy (in priority order):
 *   L1. Exact name match (normalized, stripped)
 *   L2. High word-overlap (≥ 70%) within same client
 *   L3. Medium word-overlap (≥ 50%) + date proximity (≤ 14 days) within same client
 *   L4. Token match (2+ tokens of 4+ chars shared) within same client
 *   Unmatched Excel rows → shown with Excel data only
 *   Unmatched ClickUp tasks → shown with ClickUp data only
 */
export function mergeData(
  excelProjects: ExcelProject[],
  clickupTasks: ClickUpTask[],
  evolizInvoices: EvolizInvoice[]
): TrackerProject[] {
  debugLog(
    `Starting merge: ${excelProjects.length} Excel, ${clickupTasks.length} ClickUp, ${evolizInvoices.length} Evoliz`
  );

  // Build ClickUp task lookup:
  // - By exact normalized name (stripped key for L1)
  // - By client (space/list) for fuzzy matching (L2–L4)
  const tasksByExactName = new Map<string, ClickUpTask[]>();
  const tasksByClient = new Map<string, ClickUpTask[]>();

  for (const task of clickupTasks) {
    // By exact stripped name (L1)
    const exactKey = normalizeForExactKey(task.name);
    const byName = tasksByExactName.get(exactKey) ?? [];
    byName.push(task);
    tasksByExactName.set(exactKey, byName);

    // By client key — uses list name for "Other customers"
    const clientKey = resolveTaskClientKey(task);
    if (clientKey) {
      const byClient = tasksByClient.get(clientKey) ?? [];
      byClient.push(task);
      tasksByClient.set(clientKey, byClient);
    }
  }

  debugLog(
    `Task index: ${tasksByExactName.size} exact keys, ${tasksByClient.size} client keys`
  );
  if (MERGE_DEBUG) {
    for (const [key, tasks] of tasksByClient) {
      debugLog(`  Client "${key}": ${tasks.length} tasks`);
    }
  }

  // Build Evoliz invoice lookup by ALL reference fields (object, external_ref, reference, label...)
  // Each reference string maps to its invoice — a single invoice can appear under multiple keys
  const invoicesByRef = new Map<string, EvolizInvoice[]>();
  for (const inv of evolizInvoices) {
    const refs = inv.allReferences ?? (inv.reference ? [inv.reference] : []);
    for (const ref of refs) {
      const key = normalizeForExactKey(ref);
      if (!key) continue;
      const existing = invoicesByRef.get(key) ?? [];
      existing.push(inv);
      invoicesByRef.set(key, existing);
    }
  }

  // Build Evoliz invoice lookup by client name (fallback for project name matching)
  const invoicesByClient = new Map<string, EvolizInvoice[]>();
  for (const inv of evolizInvoices) {
    if (inv.clientName) {
      const key = normalizeForExactKey(inv.clientName);
      const existing = invoicesByClient.get(key) ?? [];
      existing.push(inv);
      invoicesByClient.set(key, existing);
    }
  }

  // Track matched ClickUp task IDs to identify unmatched ones later
  const matchedTaskIds = new Set<string>();

  // Match statistics
  const matchStats = { L1: 0, L2: 0, L3: 0, L4: 0, none: 0 };

  /**
   * Find the best ClickUp task match for an Excel project.
   * Priority: L1 exact > L2 word-overlap 70% > L3 word-overlap 50% + date > L4 token
   */
  function findClickUpMatch(
    ep: ExcelProject
  ): { task: ClickUpTask; level: string } | undefined {
    const exactKey = normalizeForExactKey(ep.project);

    // L1: Exact name match (stripped)
    const exactMatches = tasksByExactName.get(exactKey);
    if (exactMatches?.length) {
      const best = exactMatches.sort(
        (a, b) => parseInt(b.date_updated) - parseInt(a.date_updated)
      )[0];
      debugLog(
        `L1 EXACT: "${ep.project}" → "${best.name}" [${ep.client}]`
      );
      return { task: best, level: "L1" };
    }

    // Get client tasks for L2–L4
    const clientKey = normalizeForMatch(ep.client);
    const clientTasks = tasksByClient.get(clientKey);

    if (!clientTasks?.length) {
      debugLog(
        `NO CLIENT TASKS for "${ep.client}" (key: "${clientKey}"). Excel project: "${ep.project}"`
      );
      return undefined;
    }

    // L2: High word-overlap (≥ 70%) within same client
    let bestL2: { task: ClickUpTask; score: number } | undefined;
    for (const t of clientTasks) {
      const score = wordOverlapScore(ep.project, t.name);
      if (score >= 0.7 && (!bestL2 || score > bestL2.score)) {
        bestL2 = { task: t, score };
      }
    }
    if (bestL2) {
      debugLog(
        `L2 WORD-OVERLAP(${(bestL2.score * 100).toFixed(0)}%): "${ep.project}" → "${bestL2.task.name}" [${ep.client}]`
      );
      return { task: bestL2.task, level: "L2" };
    }

    // L3: Medium word-overlap (≥ 50%) + date proximity (≤ 14 days)
    let bestL3: { task: ClickUpTask; score: number } | undefined;
    for (const t of clientTasks) {
      const score = wordOverlapScore(ep.project, t.name);
      if (score >= 0.5) {
        const taskDate = getClickUpTaskDate(t);
        if (datesWithinRange(ep.date, taskDate, 14)) {
          if (!bestL3 || score > bestL3.score) {
            bestL3 = { task: t, score };
          }
        }
      }
    }
    if (bestL3) {
      debugLog(
        `L3 WORD-OVERLAP(${(bestL3.score * 100).toFixed(0)}%)+DATE: "${ep.project}" → "${bestL3.task.name}" [${ep.client}]`
      );
      return { task: bestL3.task, level: "L3" };
    }

    // L4: Token match (2+ tokens of 4+ chars shared)
    let bestL4: { task: ClickUpTask; count: number } | undefined;
    for (const t of clientTasks) {
      const count = sharedTokenCount(ep.project, t.name);
      if (count >= 2 && (!bestL4 || count > bestL4.count)) {
        bestL4 = { task: t, count };
      }
    }
    if (bestL4) {
      debugLog(
        `L4 TOKEN(${bestL4.count} shared): "${ep.project}" → "${bestL4.task.name}" [${ep.client}]`
      );
      return { task: bestL4.task, level: "L4" };
    }

    debugLog(
      `NO MATCH: "${ep.project}" [${ep.client}] — ${clientTasks.length} client tasks checked`
    );
    return undefined;
  }

  // 1. Start with Excel projects, enriched with ClickUp + Evoliz
  const excelMerged = excelProjects.map((ep) => {
    const match = findClickUpMatch(ep);
    const clickupTask = match?.task;
    if (clickupTask) {
      matchedTaskIds.add(clickupTask.id);
      matchStats[match.level as keyof typeof matchStats]++;
    } else {
      matchStats.none++;
    }

    // Match Evoliz invoice — 3 strategies:
    // 1. Exact PO match against ALL Evoliz reference fields (object, external_ref, reference, label)
    // 2. Fuzzy: PO appears inside any Evoliz reference (or vice versa)
    // 3. Fallback: project name fuzzy-matches an invoice reference from the same client
    let matchingInvoices: EvolizInvoice[] | undefined;

    if (ep.poNumber) {
      const poKey = normalizeForExactKey(ep.poNumber);
      // Strategy 1: exact match on any reference field
      matchingInvoices = invoicesByRef.get(poKey);

      // Strategy 2: fuzzy — PO contained in a reference, or reference contained in PO
      if (!matchingInvoices?.length) {
        const fuzzyPOMatches: EvolizInvoice[] = [];
        for (const inv of evolizInvoices) {
          const refs = inv.allReferences ?? (inv.reference ? [inv.reference] : []);
          for (const ref of refs) {
            if (fuzzyMatch(normalizeForExactKey(ref), poKey)) {
              fuzzyPOMatches.push(inv);
              break;
            }
          }
        }
        if (fuzzyPOMatches.length) matchingInvoices = fuzzyPOMatches;
      }
    }

    // Strategy 3: match by project name against invoice references from the same client
    if (!matchingInvoices?.length && ep.project && ep.client) {
      const clientKeyInv = normalizeForExactKey(ep.client);
      const projectKeyInv = normalizeForExactKey(ep.project);
      const clientInvoices = invoicesByClient.get(clientKeyInv);
      if (clientInvoices?.length) {
        const refMatches = clientInvoices.filter((inv) => {
          const refs = inv.allReferences ?? (inv.reference ? [inv.reference] : []);
          return refs.some((ref) => fuzzyMatch(normalizeForExactKey(ref), projectKeyInv));
        });
        if (refMatches.length) {
          matchingInvoices = refMatches;
        }
      }
    }

    const evolizInvoice = matchingInvoices?.length
      ? matchingInvoices
          .filter((inv) => inv.status !== "draft")
          .sort(
            (a, b) =>
              new Date(b.issueDate).getTime() -
              new Date(a.issueDate).getTime()
          )[0] ?? matchingInvoices[0]
      : undefined;

    const clickupStatus = clickupTask ? clickupTask.status.status : "";

    const invoiceStatus = evolizInvoice
      ? mapEvolizStatus(evolizInvoice.status)
      : ep.invoiceStatus;

    const invoiceNumber = evolizInvoice
      ? evolizInvoice.invoiceNumber
      : ep.invoiceNumber;

    // Determine display name: prefer sheet name if it contains more info than just the client name
    // Strip internal suffixes like "- Hors CM", "- Internal", etc.
    const sheetName = ep.excelSheetName ?? "";
    const cleanedSheetName = sheetName
      .replace(/\s*-\s*(hors\s+\w+|internal|test|archive|old|template)\s*$/i, "")
      .trim();
    const displayClient =
      cleanedSheetName && cleanedSheetName.toLowerCase() !== ep.client.toLowerCase()
        ? cleanedSheetName
        : ep.client;

    // Extract division (the part of the sheet name beyond the client name)
    const division =
      sheetName && sheetName.toLowerCase() !== ep.client.toLowerCase()
        ? sheetName.replace(new RegExp(`^${ep.client}\\s*`, "i"), "").trim() ||
          sheetName
        : undefined;

    // Detect country/market from sheet name
    const country = sheetName ? detectCountry(sheetName) : "Other";

    return {
      client: ep.client,
      project: ep.project,
      date: ep.date,
      contact: ep.contact,
      status: clickupStatus || ep.status,
      category: ep.category,
      sharepointLink: ep.sharepointLink,
      totalValue: ep.totalValue,
      poNumber: ep.poNumber,
      invoiceStatus,
      invoiceNumber,
      clickupTaskUrl: clickupTask?.url ?? "",
      clickupStatus,
      excelTrackerFile: ep.excelTrackerFile,
      excelSheetName: ep.excelSheetName,
      excelTrackerUrl: ep.excelTrackerUrl,
      displayClient,
      division,
      country,
    };
  });

  // 2. Add ClickUp tasks that have NO matching Excel row
  const clickupOnly: TrackerProject[] = [];
  for (const task of clickupTasks) {
    if (matchedTaskIds.has(task.id)) continue;

    const clientName = resolveTaskClientName(task);

    clickupOnly.push({
      client: clientName,
      project: task.name,
      date: getClickUpTaskDate(task),
      contact: task.assignees?.[0]?.username ?? "",
      status: task.status?.status ?? "",
      category: "",
      sharepointLink: "",
      totalValue: null,
      poNumber: "",
      invoiceStatus: "",
      invoiceNumber: "",
      clickupTaskUrl: task.url ?? "",
      clickupStatus: task.status?.status ?? "",
    });
  }

  // Deduplicate by client+project (keep first occurrence — Excel-enriched wins over ClickUp-only)
  const seen = new Map<string, TrackerProject>();
  for (const p of [...excelMerged, ...clickupOnly]) {
    const key = `${p.client.toLowerCase().trim()}::${p.project.toLowerCase().trim()}`;
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, p);
    } else {
      // Merge: keep richer data (prefer non-empty fields)
      seen.set(key, {
        ...existing,
        status: existing.status || p.status,
        date: existing.date || p.date,
        contact: existing.contact || p.contact,
        category: existing.category || p.category,
        sharepointLink: existing.sharepointLink || p.sharepointLink,
        totalValue: existing.totalValue ?? p.totalValue,
        clickupTaskUrl: existing.clickupTaskUrl || p.clickupTaskUrl,
        clickupStatus: existing.clickupStatus || p.clickupStatus,
        invoiceStatus: existing.invoiceStatus || p.invoiceStatus,
        invoiceNumber: existing.invoiceNumber || p.invoiceNumber,
        excelTrackerFile: existing.excelTrackerFile || p.excelTrackerFile,
        excelSheetName: existing.excelSheetName || p.excelSheetName,
        excelTrackerUrl: existing.excelTrackerUrl || p.excelTrackerUrl,
        displayClient: existing.displayClient || p.displayClient,
        division: existing.division || p.division,
        country: existing.country || p.country,
      });
    }
  }

  debugLog(
    `Match stats: L1=${matchStats.L1}, L2=${matchStats.L2}, L3=${matchStats.L3}, L4=${matchStats.L4}, unmatched=${matchStats.none}`
  );
  debugLog(`Final: ${seen.size} merged projects`);

  return Array.from(seen.values());
}
