// SSR — asset review compares SharePoint files against expected deliverables
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromSession } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  listDriveItems,
  graphFetch,
  getDriveItemByPath,
  resolveSharePointUrl,
  type DriveItem,
} from "@/lib/integrations/sharepoint";
import {
  SHAREPOINT_ASSETS_DRIVE_ID,
  ASSETS_CUSTOMERS_BASE_PATH,
  CLIENT_MAPPINGS,
} from "@/lib/integrations/config";

// ─── Validation schemas ───────────────────────────────────────────────────

const ExpectedDeliverableSchema = z.object({
  name: z.string().min(1),
  format: z.string().optional(), // e.g. "PNG", "JPG", "PDF"
  dimensions: z.string().optional(), // e.g. "728x90", "1920x1080"
});

const AssetReviewInputSchema = z.object({
  projectId: z.string().min(1, "projectId is required"),
  briefSummary: z.string().optional(),
  expectedDeliverables: z.array(ExpectedDeliverableSchema).optional(),
});

// ─── Types ────────────────────────────────────────────────────────────────

interface DriveItemWithThumbnails extends DriveItem {
  thumbnails?: Array<{
    small?: { url: string };
    medium?: { url: string };
    large?: { url: string };
  }>;
}

interface FileMatch {
  file: string;
  expected: string;
  status: "match" | "format_mismatch";
  details?: string;
  thumbnailUrl?: string;
  mimeType?: string;
}

interface AssetReviewReport {
  totalFiles: number;
  expectedFiles: number;
  matches: FileMatch[];
  missing: string[];
  unexpected: FileInfo[];
  anomalies: string[];
}

interface FileInfo {
  name: string;
  thumbnailUrl?: string;
  mimeType?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function getExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : "";
}

/**
 * Normalize a name for fuzzy matching: lowercase, strip extension,
 * collapse whitespace/dashes/underscores.
 */
function normalizeName(name: string): string {
  return name
    .replace(/\.[^.]+$/, "") // strip extension
    .toLowerCase()
    .replace(/[-_\s]+/g, " ")
    .trim();
}

/**
 * Try to match a file to an expected deliverable.
 * Uses fuzzy name matching + optional format check.
 */
function matchFileToExpected(
  file: DriveItemWithThumbnails,
  expected: z.infer<typeof ExpectedDeliverableSchema>
): FileMatch | null {
  const fileName = file.name;
  const normalizedFile = normalizeName(fileName);
  const normalizedExpected = normalizeName(expected.name);

  // Check if file name contains the expected name or vice versa
  const nameMatch =
    normalizedFile.includes(normalizedExpected) ||
    normalizedExpected.includes(normalizedFile);

  // Also check dimensions in filename (e.g. "banner_728x90.png")
  const dimensionsMatch =
    expected.dimensions && fileName.toLowerCase().includes(expected.dimensions.toLowerCase());

  if (!nameMatch && !dimensionsMatch) return null;

  // Check format
  const fileExt = getExtension(fileName);
  const thumbnailUrl = extractThumbnailUrl(file);
  const mimeType = file.file?.mimeType;

  if (expected.format && fileExt !== expected.format.toUpperCase()) {
    return {
      file: fileName,
      expected: expected.name,
      status: "format_mismatch",
      details: `Expected ${expected.format.toUpperCase()}, got ${fileExt}`,
      thumbnailUrl,
      mimeType,
    };
  }

  return {
    file: fileName,
    expected: expected.name,
    status: "match",
    thumbnailUrl,
    mimeType,
  };
}

/**
 * List drive items with thumbnails expanded via Graph API.
 */
async function listDriveItemsWithThumbnails(
  driveId: string,
  path: string
): Promise<DriveItemWithThumbnails[]> {
  const encodedPath = encodeURIComponent(path).replace(/%2F/g, "/");
  const data = await graphFetch<{ value: DriveItemWithThumbnails[] }>(
    `/drives/${driveId}/root:${encodedPath}:/children?$expand=thumbnails`
  );
  return data.value;
}

/**
 * Extract the best thumbnail URL from a DriveItem with thumbnails.
 * Prefers "small" for list views (~96px).
 */
function extractThumbnailUrl(item: DriveItemWithThumbnails): string | undefined {
  const thumbSet = item.thumbnails?.[0];
  if (!thumbSet) return undefined;
  return thumbSet.small?.url ?? thumbSet.medium?.url ?? thumbSet.large?.url;
}

/**
 * Recursively list all files in a SharePoint folder (1 level deep for subfolders).
 * Includes thumbnail URLs when available.
 */
async function listAllFiles(
  driveId: string,
  path: string
): Promise<DriveItemWithThumbnails[]> {
  const items = await listDriveItemsWithThumbnails(driveId, path);
  const files: DriveItemWithThumbnails[] = [];

  for (const item of items) {
    if (item.file) {
      files.push(item);
    } else if (item.folder && item.folder.childCount > 0) {
      // Go 1 level deep into subfolders
      try {
        const subItems = await listDriveItemsWithThumbnails(driveId, `${path}/${item.name}`);
        for (const sub of subItems) {
          if (sub.file) {
            files.push(sub);
          }
        }
      } catch {
        // Subfolder read failed — skip silently
      }
    }
  }

  return files;
}

// ─── POST — Review assets vs expected deliverables ────────────────────────

export async function POST(request: NextRequest) {
  const session = await getUserFromSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 10 req/min
  if (!checkRateLimit("asset-review", 10, 60_000)) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again in 1 minute." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  let body: z.infer<typeof AssetReviewInputSchema>;
  try {
    const rawBody = await request.json();
    body = AssetReviewInputSchema.parse(rawBody);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    // Resolve the project folder on SharePoint.
    // projectId can be: full SP URL, relative path ("02. Sony/Project"), or ClickUp identifier
    let folderPath: string | null = null;
    let folderWebUrl: string | null = null;
    let resolvedDriveId: string = SHAREPOINT_ASSETS_DRIVE_ID;
    let resolvedItemId: string | null = null;

    // Case 1: Full SharePoint URL — resolve via Graph sharing API
    if (body.projectId.startsWith("https://")) {
      try {
        const item = await resolveSharePointUrl(body.projectId);
        if (item?.id && item?.parentReference?.driveId) {
          resolvedDriveId = item.parentReference.driveId;
          resolvedItemId = item.id;
          folderWebUrl = item.webUrl ?? body.projectId;
          folderPath = "__resolved__"; // Flag to use driveId/itemId instead of path
        }
      } catch { /* fallback to path-based */ }
    }

    // Case 2: Relative path or ClickUp identifier
    if (!folderPath) {
      if (body.projectId.includes("/")) {
        folderPath = `${ASSETS_CUSTOMERS_BASE_PATH}/${body.projectId}`;
      } else {
        const mapping = CLIENT_MAPPINGS.find(
          (m) =>
            m.clickupSpaceId === body.projectId ||
            m.clickupSpaceName.toLowerCase() === body.projectId.toLowerCase()
        );
        if (mapping) {
          folderPath = `${ASSETS_CUSTOMERS_BASE_PATH}/${mapping.sharepointCustomerFolder}`;
        } else {
          folderPath = `${ASSETS_CUSTOMERS_BASE_PATH}/${body.projectId}`;
        }
      }
    }

    // Resolve folder webUrl for direct SharePoint link
    try {
      if (folderPath && folderPath !== "__resolved__") {
        const folderItem = await getDriveItemByPath(SHAREPOINT_ASSETS_DRIVE_ID, folderPath);
        folderWebUrl = folderItem.webUrl ?? null;
        resolvedDriveId = SHAREPOINT_ASSETS_DRIVE_ID;
        resolvedItemId = folderItem.id;
      }
    } catch {
      // Non-critical — the folder link is a nice-to-have
    }

    // List all files in the project folder
    let files: DriveItemWithThumbnails[];
    if (resolvedItemId && folderPath === "__resolved__") {
      // Resolved from full URL — list children by item ID
      const data = await graphFetch<{ value: DriveItemWithThumbnails[] }>(
        `/drives/${resolvedDriveId}/items/${resolvedItemId}/children?$expand=thumbnails`
      );
      files = data.value ?? [];
    } else {
      files = await listAllFiles(resolvedDriveId, folderPath!);
    }

    // Filter out system/hidden files
    const relevantFiles = files.filter(
      (f) => !f.name.startsWith(".") && !f.name.startsWith("~$")
    );

    // Detect anomalies
    const anomalies: string[] = [];
    for (const file of relevantFiles) {
      if (file.size === 0) {
        anomalies.push(`${file.name} (0 bytes — possibly corrupted)`);
      } else if (file.size < 100) {
        anomalies.push(`${file.name} (${file.size} bytes — suspiciously small)`);
      }
    }

    // If no expected deliverables, return a basic inventory
    if (!body.expectedDeliverables || body.expectedDeliverables.length === 0) {
      const report: AssetReviewReport = {
        totalFiles: relevantFiles.length,
        expectedFiles: 0,
        matches: [],
        missing: [],
        unexpected: relevantFiles.map((f) => ({
          name: f.name,
          thumbnailUrl: extractThumbnailUrl(f),
          mimeType: f.file?.mimeType,
        })),
        anomalies,
      };
      return NextResponse.json({ report, folderPath, folderWebUrl });
    }

    // Match files to expected deliverables
    const matches: FileMatch[] = [];
    const matchedFileNames = new Set<string>();
    const matchedExpectedNames = new Set<string>();

    for (const expected of body.expectedDeliverables) {
      let bestMatch: FileMatch | null = null;

      for (const file of relevantFiles) {
        if (matchedFileNames.has(file.name)) continue;

        const match = matchFileToExpected(file, expected);
        if (match) {
          // Prefer exact match over format_mismatch
          if (!bestMatch || (match.status === "match" && bestMatch.status !== "match")) {
            bestMatch = match;
          }
        }
      }

      if (bestMatch) {
        matches.push(bestMatch);
        matchedFileNames.add(bestMatch.file);
        matchedExpectedNames.add(expected.name);
      }
    }

    // Find missing deliverables (expected but not matched)
    const missing = body.expectedDeliverables
      .filter((e) => !matchedExpectedNames.has(e.name))
      .map((e) => {
        const parts = [e.name];
        if (e.format) parts.push(e.format);
        if (e.dimensions) parts.push(e.dimensions);
        return parts.join(" — ");
      });

    // Find unexpected files (present but not matched to any expected)
    const unexpected: FileInfo[] = relevantFiles
      .filter((f) => !matchedFileNames.has(f.name))
      .map((f) => ({
        name: f.name,
        thumbnailUrl: extractThumbnailUrl(f),
        mimeType: f.file?.mimeType,
      }));

    const report: AssetReviewReport = {
      totalFiles: relevantFiles.length,
      expectedFiles: body.expectedDeliverables.length,
      matches,
      missing,
      unexpected,
      anomalies,
    };

    return NextResponse.json({ report, folderPath, folderWebUrl });
  } catch (error) {
    console.error("[Asset Review API] Error:", error);

    // Check if it's a SharePoint "item not found" error
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("404") || message.includes("itemNotFound")) {
      return NextResponse.json(
        { error: "Project folder not found on SharePoint", projectId: body.projectId },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Failed to review assets. Please try again." },
      { status: 500 }
    );
  }
}
