// ─── Tracker Data Merge Logic ────────────────────────────────────────────────
// M-02: Extracted from tracker/route.ts.
// Merges Excel projects with ClickUp tasks and Evoliz invoices.
// Matching strategy: exact name > word-overlap > token overlap > unmatched
//
// Match levels (in priority order):
//   L1a: Exact normalized name match within same client (safest)
//   L1b: Exact normalized name match globally (cross-client fallback)
//   L2:  High word-overlap (≥ 70%) within same client
//   L2c: Contains match (one name fully inside the other, ≥8 chars, ≥40% length ratio)
//   L3:  Medium word-overlap (≥ 50%) + date proximity (≤ 14 days) within same client
//   L4:  Token match (2+ tokens of 4+ chars shared) within same client
//
// Client resolution for "Other customers" space:
//   Tasks use list.name as client key (not the generic space name).
//   Client lookup uses fuzzy matching (contains, first-word) as fallback.

import type { ClickUpTask } from "@/lib/integrations/clickup";
import type { EvolizInvoice } from "@/lib/integrations/evoliz";
import type { ExcelProject } from "@/lib/integrations/excel-parser";
import type { TrackerProject } from "@/types/integrations";
import { extractSharePointUrlFromTask } from "@/lib/integrations/clickup";
import { getMappingBySpaceId, mapClickUpStatus } from "@/lib/integrations/config";

/**
 * Extract SharePoint URL from a ClickUp task's custom fields.
 * Delegates to the shared utility in clickup.ts.
 */
function extractSharePointLink(task: ClickUpTask): string {
  return extractSharePointUrlFromTask(task) ?? "";
}

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
 * Uses minLen=2 by default to catch codes like "Q2", "15", "3D", etc.
 */
function extractWords(normalized: string, minLen = 2): string[] {
  return normalized.split(" ").filter((w) => w.length >= minLen);
}

/**
 * Calculate word-overlap score between two strings.
 * Returns a ratio (0–1) of how many significant words (≥2 chars) overlap
 * relative to the shorter word list. This ensures short names like "LEGO Q2"
 * match well against longer names like "LEGO Q2 Campaign".
 *
 * Also checks for numeric prefix matches: "15s" matches "15" (same number).
 */
function wordOverlapScore(a: string, b: string): number {
  const wordsA = extractWords(normalizeForMatch(a));
  const wordsB = extractWords(normalizeForMatch(b));
  if (wordsA.length === 0 || wordsB.length === 0) return 0;

  const setB = new Set(wordsB);
  let overlap = 0;
  for (const w of wordsA) {
    if (setB.has(w)) {
      overlap++;
    } else {
      // Numeric prefix match: "15s" matches "15sec", "15" matches "15s"
      const numA = w.match(/^(\d+)/)?.[1];
      if (numA) {
        for (const wb of wordsB) {
          const numB = wb.match(/^(\d+)/)?.[1];
          if (numB && numA === numB) {
            overlap += 0.8; // partial credit for numeric prefix match
            break;
          }
        }
      }
    }
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

/**
 * Find client tasks with fuzzy client key matching.
 * Tries exact key first, then contains-match and first-word match against all keys.
 * This handles cases where Excel says "GEODIS" but ClickUp list is "Geodis SAS".
 */
function findClientTasks(
  clientName: string,
  tasksByClient: Map<string, ClickUpTask[]>
): ClickUpTask[] {
  const clientKey = normalizeForMatch(clientName);

  // 1. Exact key
  const exact = tasksByClient.get(clientKey);
  if (exact?.length) return exact;

  // 2. Contains match: "geodis" in "geodis sas" or vice versa
  for (const [key, tasks] of tasksByClient) {
    if (key.includes(clientKey) || clientKey.includes(key)) {
      debugLog(`  Fuzzy client match: "${clientKey}" ~ "${key}" (contains)`);
      return tasks;
    }
  }

  // 3. First-word match: "geodis" matches "geodis sas"
  const firstWord = clientKey.split(" ")[0];
  if (firstWord && firstWord.length >= 3) {
    for (const [key, tasks] of tasksByClient) {
      const keyFirst = key.split(" ")[0];
      if (keyFirst === firstWord) {
        debugLog(`  Fuzzy client match: "${clientKey}" ~ "${key}" (first-word)`);
        return tasks;
      }
    }
  }

  return [];
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
 *   L1a. Exact name match within same client (safest)
 *   L1b. Exact name match globally (cross-client fallback)
 *   L2.  High word-overlap (≥ 70%) within same client
 *   L2c. Contains match (one name inside the other) within same client
 *   L3.  Medium word-overlap (≥ 50%) + date proximity (≤ 14 days)
 *   L4.  Token match (2+ tokens of 4+ chars shared) within same client
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
   * Priority:
   *   L1a: Exact normalized name match within same client (safest)
   *   L1b: Exact normalized name match globally (cross-client, risky for short names)
   *   L2:  High word-overlap (≥ 70%) within same client
   *   L2c: One normalized name fully contains the other within same client
   *   L3:  Medium word-overlap (≥ 50%) + date proximity (≤ 14 days) within same client
   *   L4:  Token match (2+ tokens of 4+ chars shared) within same client
   */
  function findClickUpMatch(
    ep: ExcelProject
  ): { task: ClickUpTask; level: string } | undefined {
    const exactKey = normalizeForExactKey(ep.project);
    const normalizedProject = normalizeForMatch(ep.project);

    // Get client tasks for scoped matching (L1a, L2–L4)
    const clientTasks = findClientTasks(ep.client, tasksByClient);

    // L1a: Exact name match within same client (preferred — avoids cross-client collisions)
    if (clientTasks.length) {
      const clientExact = clientTasks.filter(
        (t) => normalizeForExactKey(t.name) === exactKey
      );
      if (clientExact.length) {
        const best = clientExact.sort(
          (a, b) => parseInt(b.date_updated) - parseInt(a.date_updated)
        )[0];
        debugLog(
          `L1a EXACT+CLIENT: "${ep.project}" → "${best.name}" [${ep.client}]`
        );
        return { task: best, level: "L1" };
      }
    }

    // L1b: Exact name match globally (fallback — risky for short/generic names)
    const globalExact = tasksByExactName.get(exactKey);
    if (globalExact?.length) {
      const best = globalExact.sort(
        (a, b) => parseInt(b.date_updated) - parseInt(a.date_updated)
      )[0];
      debugLog(
        `L1b EXACT+GLOBAL: "${ep.project}" → "${best.name}" [${ep.client}] (task client: ${resolveTaskClientName(best)})`
      );
      return { task: best, level: "L1" };
    }

    if (!clientTasks.length) {
      debugLog(
        `NO CLIENT TASKS for "${ep.client}" (key: "${normalizeForMatch(ep.client)}"). Available keys: [${Array.from(tasksByClient.keys()).join(", ")}]. Excel project: "${ep.project}"`
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

    // L2c: Contains match — one normalized name fully contains the other
    // Catches "LEGO Q2" ⊂ "LEGO Q2 Campaign - January" where word overlap may be < 70%
    // Guard: require the shorter name to be ≥ 8 chars to avoid false positives
    if (normalizedProject.length >= 8) {
      let bestContains: { task: ClickUpTask; lenRatio: number } | undefined;
      for (const t of clientTasks) {
        const normalizedTask = normalizeForMatch(t.name);
        if (normalizedTask.includes(normalizedProject) || normalizedProject.includes(normalizedTask)) {
          const shorter = Math.min(normalizedProject.length, normalizedTask.length);
          const longer = Math.max(normalizedProject.length, normalizedTask.length);
          const lenRatio = shorter / longer;
          // Only accept if the shorter string is at least 40% of the longer
          // (prevents "video" matching "video production campaign q2 france")
          if (lenRatio >= 0.4 && (!bestContains || lenRatio > bestContains.lenRatio)) {
            bestContains = { task: t, lenRatio };
          }
        }
      }
      if (bestContains) {
        debugLog(
          `L2c CONTAINS(ratio ${(bestContains.lenRatio * 100).toFixed(0)}%): "${ep.project}" → "${bestContains.task.name}" [${ep.client}]`
        );
        return { task: bestContains.task, level: "L2" };
      }
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

    // Debug: show top candidates that almost matched
    if (MERGE_DEBUG) {
      const candidates = clientTasks
        .map((t) => ({
          name: t.name,
          wordScore: wordOverlapScore(ep.project, t.name),
          tokenCount: sharedTokenCount(ep.project, t.name),
        }))
        .filter((c) => c.wordScore > 0.2 || c.tokenCount >= 1)
        .sort((a, b) => b.wordScore - a.wordScore)
        .slice(0, 5);
      if (candidates.length) {
        debugLog(
          `NO MATCH: "${ep.project}" [${ep.client}] — top candidates:`,
          candidates.map((c) => `"${c.name}" (words:${(c.wordScore * 100).toFixed(0)}%, tokens:${c.tokenCount})`).join(", ")
        );
      } else {
        debugLog(
          `NO MATCH: "${ep.project}" [${ep.client}] — ${clientTasks.length} client tasks, no candidates above threshold`
        );
      }
    }
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

    const clickupStatusRaw = clickupTask ? clickupTask.status.status : "";
    const mappedStatus = clickupStatusRaw ? mapClickUpStatus(clickupStatusRaw) : null;

    const invoiceStatus = evolizInvoice
      ? mapEvolizStatus(evolizInvoice.status)
      : mappedStatus?.invoiceStatus ?? ep.invoiceStatus;

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
      status: mappedStatus?.projectStatus || clickupStatusRaw || ep.status,
      category: ep.category,
      sharepointLink: ep.sharepointLink || (clickupTask ? extractSharePointLink(clickupTask) : ""),
      totalValue: ep.totalValue,
      poNumber: ep.poNumber,
      invoiceStatus,
      invoiceNumber,
      clickupTaskUrl: clickupTask?.url ?? "",
      clickupStatus: clickupStatusRaw,
      excelTrackerFile: ep.excelTrackerFile,
      excelSheetName: ep.excelSheetName,
      excelTrackerUrl: ep.excelTrackerUrl,
      displayClient,
      division,
      country,
      clickupListName: clickupTask?.list?.name ?? undefined,
    };
  });

  // 2. Add ClickUp tasks that have NO matching Excel row
  const clickupOnly: TrackerProject[] = [];
  for (const task of clickupTasks) {
    if (matchedTaskIds.has(task.id)) continue;

    const clientName = resolveTaskClientName(task);

    const rawStatus = task.status?.status ?? "";
    const mapped = rawStatus ? mapClickUpStatus(rawStatus) : null;

    clickupOnly.push({
      client: clientName,
      project: task.name,
      date: getClickUpTaskDate(task),
      contact: task.assignees?.[0]?.username ?? "",
      status: mapped?.projectStatus || rawStatus,
      category: "",
      sharepointLink: extractSharePointLink(task),
      totalValue: null,
      poNumber: "",
      invoiceStatus: mapped?.invoiceStatus ?? "",
      invoiceNumber: "",
      clickupTaskUrl: task.url ?? "",
      clickupStatus: rawStatus,
      clickupListName: task.list?.name ?? undefined,
    });
  }

  // Deduplicate by client+project (Excel-enriched first since they have richer data from both sources)
  // Then ClickUp-only fills remaining entries
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
        clickupListName: existing.clickupListName || p.clickupListName,
      });
    }
  }

  const total = matchStats.L1 + matchStats.L2 + matchStats.L3 + matchStats.L4 + matchStats.none;
  const matched = total - matchStats.none;
  const matchRate = total > 0 ? ((matched / total) * 100).toFixed(1) : "0";
  debugLog(
    `Match stats: L1=${matchStats.L1}, L2=${matchStats.L2}, L3=${matchStats.L3}, L4=${matchStats.L4}, unmatched=${matchStats.none} — rate: ${matchRate}%`
  );
  debugLog(`Final: ${seen.size} merged projects`);

  return Array.from(seen.values());
}
