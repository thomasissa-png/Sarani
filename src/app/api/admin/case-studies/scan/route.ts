import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { caseStudyCandidates } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  getSpaces,
  getListsForSpace,
  getAllTasksForList,
  type ClickUpTask,
  type ClickUpCustomField,
} from "@/lib/integrations/clickup";
import { listDriveItems, type DriveItem } from "@/lib/integrations/sharepoint";
import {
  CLIENT_MAPPINGS,
  SHAREPOINT_ASSETS_DRIVE_ID,
  ASSETS_CUSTOMERS_BASE_PATH,
  getMappingBySpaceId,
} from "@/lib/integrations/config";
import {
  calculateScore,
  deriveSector,
  getPublishedSectors,
  DEFAULT_SCORING_CONFIG,
} from "@/lib/case-studies/scoring";

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Extract a custom field value by name (case-insensitive) */
function getCustomField(
  fields: ClickUpCustomField[],
  name: string
): string | null {
  const field = fields.find(
    (f) => f.name.toLowerCase() === name.toLowerCase()
  );
  if (!field || field.value === null || field.value === undefined) return null;
  if (typeof field.value === "string") return field.value;
  if (typeof field.value === "number") return String(field.value);
  if (Array.isArray(field.value)) {
    // User field
    if (field.value.length > 0 && typeof field.value[0] === "object" && "username" in field.value[0]) {
      return (field.value as Array<{ username: string }>).map((u) => u.username).join(", ");
    }
    return field.value.join(", ");
  }
  return String(field.value);
}

/** Derive client name from ClickUp Space */
function clientNameFromSpace(spaceName: string): string {
  // Map specific Space names to clean client names
  const mapping = CLIENT_MAPPINGS.find(
    (m) => m.clickupSpaceName.toLowerCase() === spaceName.toLowerCase()
  );
  if (mapping) {
    // Use the folder name (cleaner) but strip leading number
    const folder = mapping.sharepointCustomerFolder;
    return folder.replace(/^\d+\.\s*/, "").trim();
  }
  return spaceName;
}

/** Derive project type from task name and custom fields */
function inferProjectType(task: ClickUpTask): string | null {
  // Try custom field first
  const typeField = getCustomField(task.custom_fields, "project_type")
    ?? getCustomField(task.custom_fields, "type")
    ?? getCustomField(task.custom_fields, "category");
  if (typeField) return typeField;

  // Infer from task name keywords
  const name = task.name.toLowerCase();
  if (name.includes("video") || name.includes("motion") || name.includes("animation")) return "Video Production";
  if (name.includes("rebrand") || name.includes("brand identity")) return "Rebranding";
  if (name.includes("campaign") || name.includes("social media")) return "Campaign";
  if (name.includes("translat") || name.includes("locali")) return "Translation";
  if (name.includes("presentation") || name.includes("deck") || name.includes("slide")) return "Presentation";
  if (name.includes("event")) return "Event";
  if (name.includes("banner") || name.includes("design") || name.includes("layout") || name.includes("visual")) return "Graphic Design";

  return null;
}

/** Extract amount from custom fields */
function extractAmount(task: ClickUpTask): number | null {
  const amountStr = getCustomField(task.custom_fields, "contract_amount")
    ?? getCustomField(task.custom_fields, "amount")
    ?? getCustomField(task.custom_fields, "budget")
    ?? getCustomField(task.custom_fields, "price");
  if (!amountStr) return null;
  const cleaned = amountStr.replace(/[^0-9.,]/g, "").replace(",", ".");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

/** Try to fuzzy-match a project folder among a list of DriveItems */
function matchProjectFolder(
  items: DriveItem[],
  projectName: string
): DriveItem | null {
  const projectNameLower = projectName.toLowerCase().trim();
  return items.find((item) => {
    if (!item.folder) return false;
    const folderLower = item.name.toLowerCase();
    return (
      folderLower.includes(projectNameLower) ||
      projectNameLower.includes(folderLower) ||
      levenshteinSimilarity(folderLower, projectNameLower) >= 0.6
    );
  }) ?? null;
}

/**
 * Count SharePoint assets for a client/project folder.
 *
 * Scans up to 3 levels deep to handle clients with nested folder structures:
 * Level 0: {clientFolder}/ → direct project folder match
 * Level 1: {clientFolder}/03. Projects/ → project folder match
 * Level 2: {clientFolder}/03. Projects/{division}/ → project folder match
 *
 * This handles both flat structures (Sony: /02. Sony/{project})
 * and deep structures (TikTok: /05. TikTok/03. Projects/15. P&E SEA/{project}).
 */
async function countSharePointAssets(
  clientFolder: string,
  projectName: string
): Promise<{ count: number; folderUrl: string | null }> {
  try {
    const parentPath = `${ASSETS_CUSTOMERS_BASE_PATH}/${clientFolder}`;
    const items = await listDriveItems(SHAREPOINT_ASSETS_DRIVE_ID, parentPath);

    // Level 0: direct match in client root
    const directMatch = matchProjectFolder(items, projectName);
    if (directMatch) {
      const folderPath = `${parentPath}/${directMatch.name}`;
      const children = await listDriveItems(SHAREPOINT_ASSETS_DRIVE_ID, folderPath);
      return {
        count: children.filter((c: DriveItem) => !c.folder).length,
        folderUrl: directMatch.webUrl ?? null,
      };
    }

    // Level 1: look inside "Projects" subfolder (numbered variants: "03. Projects", "Projects")
    const projectsFolder = items.find((item) => {
      if (!item.folder) return false;
      const lower = item.name.toLowerCase().replace(/^\d+\.\s*/, "");
      return lower === "projects";
    });

    if (projectsFolder) {
      const projectsPath = `${parentPath}/${projectsFolder.name}`;
      const projectsItems = await listDriveItems(SHAREPOINT_ASSETS_DRIVE_ID, projectsPath);

      // Try matching directly inside Projects/
      const projectMatch = matchProjectFolder(projectsItems, projectName);
      if (projectMatch) {
        const folderPath = `${projectsPath}/${projectMatch.name}`;
        const children = await listDriveItems(SHAREPOINT_ASSETS_DRIVE_ID, folderPath);
        return {
          count: children.filter((c: DriveItem) => !c.folder).length,
          folderUrl: projectMatch.webUrl ?? null,
        };
      }

      // Level 2: scan each division subfolder inside Projects/
      const divisionFolders = projectsItems.filter((i) => i.folder);
      for (const division of divisionFolders) {
        try {
          const divisionPath = `${projectsPath}/${division.name}`;
          const divisionItems = await listDriveItems(SHAREPOINT_ASSETS_DRIVE_ID, divisionPath);
          const divisionMatch = matchProjectFolder(divisionItems, projectName);
          if (divisionMatch) {
            const folderPath = `${divisionPath}/${divisionMatch.name}`;
            const children = await listDriveItems(SHAREPOINT_ASSETS_DRIVE_ID, folderPath);
            return {
              count: children.filter((c: DriveItem) => !c.folder).length,
              folderUrl: divisionMatch.webUrl ?? null,
            };
          }
        } catch {
          // Division folder listing failed — try next
        }
      }
    }

    return { count: 0, folderUrl: null };
  } catch {
    // SharePoint unavailable or folder doesn't exist — graceful degradation
    return { count: 0, folderUrl: null };
  }
}

/** Simple Levenshtein-based similarity (0-1) */
function levenshteinSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const matrix: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
    for (let j = 1; j <= b.length; j++) {
      if (i === 0) {
        matrix[i][j] = j;
      } else {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }
  }
  return 1 - matrix[a.length][b.length] / maxLen;
}

// ─── Concurrency guard ─────────────────────────────────────────────────────

let scanInProgress = false;

// ─── POST /api/admin/case-studies/scan ─────────────────────────────────────

export async function POST() {
  if (scanInProgress) {
    return NextResponse.json(
      { error: "A scan is already in progress. Please wait for it to complete." },
      { status: 409 }
    );
  }
  scanInProgress = true;
  try {
    // 1. Get published case study sectors for diversity scoring
    const publishedCandidates = await db
      .select({ clientName: caseStudyCandidates.clientName })
      .from(caseStudyCandidates)
      .where(eq(caseStudyCandidates.status, "published"));
    const coveredSectors = getPublishedSectors(
      publishedCandidates.map((c) => c.clientName)
    );

    // 2. Fetch all ClickUp Spaces
    let spaces;
    try {
      spaces = await getSpaces();
    } catch (err) {
      console.error("ClickUp API error during scan:", err);
      return NextResponse.json(
        {
          error: "ClickUp API unreachable. Check your API key and try again.",
          scanned: 0,
          newCandidates: 0,
          autoGenerated: 0,
          errors: [err instanceof Error ? err.message : "ClickUp unavailable"],
          completedAt: new Date().toISOString(),
        },
        { status: 502 }
      );
    }

    let totalScanned = 0;
    let newCandidates = 0;
    let updatedCandidates = 0;
    const errors: string[] = [];

    // 3. Iterate over all Spaces → Lists → Tasks
    for (const space of spaces) {
      const mapping = getMappingBySpaceId(space.id);
      const clientName = clientNameFromSpace(space.name);

      try {
        const lists = await getListsForSpace(space.id);

        for (const list of lists) {
          try {
            const tasks = await getAllTasksForList(list.id);

            for (const task of tasks) {
              // Only process closed/completed tasks
              if (
                task.status.type !== "closed" &&
                task.status.status.toLowerCase() !== "closed" &&
                task.status.status.toLowerCase() !== "done" &&
                task.status.status.toLowerCase() !== "complete"
              ) {
                continue;
              }

              totalScanned++;

              // Extract data from the task
              const projectType = inferProjectType(task);
              const amount = extractAmount(task);
              const completedAt = task.date_closed
                ? new Date(parseInt(task.date_closed))
                : null;

              // Count SharePoint assets (if mapping exists)
              let assetCount = 0;
              let folderUrl: string | null = null;
              if (mapping) {
                const assets = await countSharePointAssets(
                  mapping.sharepointCustomerFolder,
                  task.name
                );
                assetCount = assets.count;
                folderUrl = assets.folderUrl;
              }

              // Calculate score
              const sector = deriveSector(clientName);
              const { total, breakdown } = calculateScore({
                clientName,
                projectAmount: amount,
                assetCount,
                projectType,
                completedAt,
                coveredSectors,
                sector,
              });

              // Determine initial status
              const status =
                total >= DEFAULT_SCORING_CONFIG.autoGenerateThreshold
                  ? "suggested"
                  : "ignored";

              // Upsert: check if task already exists
              const existing = await db
                .select({ id: caseStudyCandidates.id })
                .from(caseStudyCandidates)
                .where(eq(caseStudyCandidates.clickupTaskId, task.id))
                .limit(1);

              if (existing.length === 0) {
                await db.insert(caseStudyCandidates).values({
                  clickupTaskId: task.id,
                  clientName,
                  projectName: task.name,
                  projectType,
                  projectAmount: amount ? String(amount) : null,
                  completedAt,
                  sharePointAssetCount: assetCount,
                  sharePointFolderUrl: folderUrl,
                  scoreTotal: total,
                  scoreBreakdown: breakdown,
                  status,
                  lastScannedAt: new Date(),
                });
                newCandidates++;
              } else {
                // Update score but preserve status if it was manually changed
                await db
                  .update(caseStudyCandidates)
                  .set({
                    scoreTotal: total,
                    scoreBreakdown: breakdown,
                    sharePointAssetCount: assetCount,
                    sharePointFolderUrl: folderUrl,
                    projectType,
                    projectAmount: amount ? String(amount) : null,
                    lastScannedAt: new Date(),
                    updatedAt: new Date(),
                  })
                  .where(eq(caseStudyCandidates.id, existing[0].id));
                updatedCandidates++;
              }
            }
          } catch (err) {
            const msg = `Error scanning list "${list.name}" in space "${space.name}": ${err instanceof Error ? err.message : "unknown"}`;
            console.error(msg);
            errors.push(msg);
          }
        }
      } catch (err) {
        const msg = `Error fetching lists for space "${space.name}": ${err instanceof Error ? err.message : "unknown"}`;
        console.error(msg);
        errors.push(msg);
      }
    }

    return NextResponse.json({
      scanned: totalScanned,
      newCandidates,
      updatedCandidates,
      autoGenerated: 0, // V1: no auto-generation on scan
      errors,
      completedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error running case study scan:", error);
    return NextResponse.json(
      { error: "Scan failed" },
      { status: 500 }
    );
  } finally {
    scanInProgress = false;
  }
}
