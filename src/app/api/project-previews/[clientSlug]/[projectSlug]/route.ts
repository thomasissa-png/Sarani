import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projectPreviews } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  listDriveItems,
  type DriveItem,
  SharePointApiError,
} from "@/lib/integrations/sharepoint";
import {
  SHAREPOINT_ASSETS_DRIVE_ID,
  ASSETS_CUSTOMERS_BASE_PATH,
  getMappingBySpaceName,
} from "@/lib/integrations/config";

// ─── Types ─────────────────────────────────────────────────────────────────

interface BatchItem {
  name: string;
  webUrl: string;
  mimeType: string;
  size: number;
}

interface BatchGroup {
  name: string;
  items: BatchItem[];
}

interface ProjectPreviewResponse {
  project: {
    name: string;
    clientName: string;
    brief: string | null;
    projectDate: string | null;
    sharepointCustomerFolder: string | null;
  };
  batches: BatchGroup[];
  error?: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────

const ALLOWED_MIMETYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
]);

const BATCH_PATTERN = /^Batch\s*\d+/i;

/** Maximum recursion depth when traversing subfolders inside a batch. */
const MAX_SUBFOLDER_DEPTH = 3;

/** Maximum total files returned across all batches to prevent overloading. */
const MAX_TOTAL_FILES = 100;

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Normalize a string for fuzzy folder matching: lowercase, strip non-alpha, collapse spaces. */
function normalizeForMatch(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Fuzzy-match a project name against SharePoint folder names. */
function findProjectFolder(
  folders: DriveItem[],
  projectName: string
): DriveItem | null {
  const foldersOnly = folders.filter((f) => f.folder);
  const normalizedProject = normalizeForMatch(projectName);

  // 1. Exact match (case-insensitive)
  const exact = foldersOnly.find(
    (f) => f.name.toLowerCase() === projectName.toLowerCase()
  );
  if (exact) return exact;

  // 2. Contains match (normalized)
  const contains = foldersOnly.find((f) => {
    const normalizedFolder = normalizeForMatch(f.name);
    return (
      normalizedFolder.includes(normalizedProject) ||
      normalizedProject.includes(normalizedFolder)
    );
  });
  if (contains) return contains;

  // 3. No match found
  return null;
}

/** Natural sort for batch folder names ("Batch 1" < "Batch 2" < "Batch 10"). */
function naturalSort(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

/**
 * Recursively list all files inside a folder (including subfolders).
 * Subfolders are traversed in parallel at each level.
 * Returns a flat array of DriveItems (files only, no folders).
 */
async function listDriveItemsRecursive(
  driveId: string,
  folderPath: string,
  currentDepth: number,
  fileCountRef: { count: number }
): Promise<DriveItem[]> {
  if (currentDepth > MAX_SUBFOLDER_DEPTH || fileCountRef.count >= MAX_TOTAL_FILES) {
    return [];
  }

  const items = await listDriveItems(driveId, folderPath);

  const files: DriveItem[] = [];
  const subfolders: DriveItem[] = [];

  for (const item of items) {
    if (item.folder) {
      subfolders.push(item);
    } else if (item.file) {
      files.push(item);
      fileCountRef.count++;
      if (fileCountRef.count >= MAX_TOTAL_FILES) {
        return files;
      }
    }
  }

  // Recurse into subfolders in parallel
  if (subfolders.length > 0 && fileCountRef.count < MAX_TOTAL_FILES) {
    const subResults = await Promise.all(
      subfolders.map((sub) =>
        listDriveItemsRecursive(
          driveId,
          `${folderPath}/${sub.name}`,
          currentDepth + 1,
          fileCountRef
        )
      )
    );
    for (const subFiles of subResults) {
      files.push(...subFiles);
    }
  }

  return files;
}

// ─── Route Handler ─────────────────────────────────────────────────────────

/**
 * GET /api/project-previews/[clientSlug]/[projectSlug]
 * Public route: returns project info + SharePoint batch assets.
 * ISR: revalidate every 300 seconds (5 minutes).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientSlug: string; projectSlug: string }> }
) {
  const { clientSlug, projectSlug } = await params;

  // Rate limit: 60 req/min per IP
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(`preview-view:${ip}`, 60, 60_000)) {
    return NextResponse.json(
      { error: "RATE_LIMITED", message: "Too many requests. Try again later." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  // Look up the preview record
  const [preview] = await db
    .select()
    .from(projectPreviews)
    .where(
      and(
        eq(projectPreviews.clientSlug, clientSlug),
        eq(projectPreviews.projectSlug, projectSlug)
      )
    );

  if (!preview || !preview.isActive) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  // Resolve SharePoint customer folder from client name
  const mapping = getMappingBySpaceName(preview.clientName);
  const sharepointCustomerFolder = mapping?.sharepointCustomerFolder ?? null;

  // Build the base project response
  const projectData: ProjectPreviewResponse = {
    project: {
      name: preview.projectName,
      clientName: preview.clientName,
      brief: null,
      projectDate: null,
      sharepointCustomerFolder,
    },
    batches: [],
  };

  // If no SharePoint mapping, return project info with empty batches
  if (!sharepointCustomerFolder) {
    return NextResponse.json(projectData, {
      status: 200,
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
    });
  }

  // Fetch batches from SharePoint
  try {
    const customerFolderPath = `${ASSETS_CUSTOMERS_BASE_PATH}/${sharepointCustomerFolder}`;

    // Step 1: List folders in customer directory to find the project folder
    const customerItems = await listDriveItems(
      SHAREPOINT_ASSETS_DRIVE_ID,
      customerFolderPath
    );

    const projectFolder = findProjectFolder(customerItems, preview.projectName);

    if (!projectFolder) {
      // No matching folder found -- return empty batches (assets coming soon)
      return NextResponse.json(projectData, {
        status: 200,
        headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
      });
    }

    // Step 2: List Batch subfolders in the project folder
    const projectFolderPath = `${customerFolderPath}/${projectFolder.name}`;
    const projectItems = await listDriveItems(
      SHAREPOINT_ASSETS_DRIVE_ID,
      projectFolderPath
    );

    const batchFolders = projectItems
      .filter((item) => item.folder && BATCH_PATTERN.test(item.name))
      .sort((a, b) => naturalSort(a.name, b.name));

    // Step 3: For each batch folder, recursively list and filter assets
    // (subfolders inside batches are traversed up to MAX_SUBFOLDER_DEPTH levels)
    const batches: BatchGroup[] = [];
    const fileCountRef = { count: 0 };

    for (const batchFolder of batchFolders) {
      if (fileCountRef.count >= MAX_TOTAL_FILES) break;

      const batchPath = `${projectFolderPath}/${batchFolder.name}`;
      const batchItems = await listDriveItemsRecursive(
        SHAREPOINT_ASSETS_DRIVE_ID,
        batchPath,
        1,
        fileCountRef
      );

      const filteredItems: BatchItem[] = batchItems
        .filter(
          (item) =>
            item.file && ALLOWED_MIMETYPES.has(item.file.mimeType)
        )
        .sort((a, b) => {
          // Images first, then PDFs, both sorted by name
          const aIsImage = a.file!.mimeType.startsWith("image/");
          const bIsImage = b.file!.mimeType.startsWith("image/");
          if (aIsImage && !bIsImage) return -1;
          if (!aIsImage && bIsImage) return 1;
          return a.name.localeCompare(b.name);
        })
        .map((item) => ({
          name: item.name,
          webUrl: item.webUrl,
          mimeType: item.file!.mimeType,
          size: item.size,
        }));

      if (filteredItems.length > 0) {
        batches.push({ name: batchFolder.name, items: filteredItems });
      }
    }

    projectData.batches = batches;
  } catch (err) {
    // SharePoint unavailable -- return project info with error flag
    console.error(
      "[project-preview] SharePoint error:",
      err instanceof SharePointApiError ? err.message : err
    );
    projectData.error = "SHAREPOINT_UNAVAILABLE";
  }

  return NextResponse.json(projectData, {
    status: 200,
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
  });
}
