// ─── Auto-select visuals from SharePoint project folder ─────────────────────
// Step 4 of the case study pipeline.
// Lists images in the candidate's SP folder, picks the 3 best,
// and returns proxy URLs for downstream use (Satori, DB storage).

import {
  type DriveItem,
  resolveSharePointUrl,
  listDriveItems,
  graphFetch,
} from "@/lib/integrations/sharepoint";
import {
  SHAREPOINT_ASSETS_DRIVE_ID,
  ASSETS_CUSTOMERS_BASE_PATH,
  getMappingBySpaceName,
} from "@/lib/integrations/config";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SelectedVisual {
  url: string;
  thumbnailUrl: string;
  name: string;
  size: number;
  itemId: string;
  driveId: string;
}

export interface AutoSelectedVisuals {
  heroImage?: SelectedVisual;
  linkedInImage?: SelectedVisual;
  emailHeader?: SelectedVisual;
  allImages: SelectedVisual[];
  source: "auto" | "manual";
}

// ─── Constants ──────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MIN_FILE_SIZE = 10 * 1024; // 10 KB

/** Folders to skip when scanning for deliverables */
const SKIP_FOLDERS = new Set([
  "supporting files", "rework", "00. brief", "brief",
  "source files", "source", "sources", "assets source",
  "archive", "old", "template", "templates",
]);

// ─── Helpers ────────────────────────────────────────────────────────────────

function isImage(item: DriveItem): boolean {
  return !!item.file?.mimeType && item.file.mimeType.startsWith("image/") && !item.folder;
}

function isValidSize(item: DriveItem): boolean {
  return item.size >= MIN_FILE_SIZE && item.size <= MAX_FILE_SIZE;
}

function shouldSkip(name: string): boolean {
  return SKIP_FOLDERS.has(name.toLowerCase().trim());
}

/** Sort by most recent modification date, then by size (largest first) */
function sortByRecent(items: DriveItem[]): DriveItem[] {
  return [...items].sort((a, b) => {
    const dateA = a.lastModifiedDateTime ? new Date(a.lastModifiedDateTime).getTime() : 0;
    const dateB = b.lastModifiedDateTime ? new Date(b.lastModifiedDateTime).getTime() : 0;
    if (dateB !== dateA) return dateB - dateA;
    return b.size - a.size;
  });
}

function buildProxyUrl(item: DriveItem, driveId: string): string {
  const did = item.parentReference?.driveId ?? driveId;
  return `/api/project-assets/${item.id}?driveId=${encodeURIComponent(did)}`;
}

function buildThumbnailUrl(item: DriveItem): string {
  return item["@microsoft.graph.downloadUrl"] ?? item.webUrl;
}

/** List children of a folder by its Graph item ID */
async function listByItemId(itemId: string, driveId: string): Promise<DriveItem[]> {
  const data = await graphFetch<{ value: DriveItem[] }>(
    `/drives/${driveId}/items/${itemId}/children`
  );
  return data.value ?? [];
}

// ─── Main function ──────────────────────────────────────────────────────────

export async function autoSelectVisuals(
  sharePointFolderUrl: string,
  clientName?: string | null
): Promise<AutoSelectedVisuals> {
  const driveId = SHAREPOINT_ASSETS_DRIVE_ID;
  const empty: AutoSelectedVisuals = { allImages: [], source: "auto" };

  // ── Step 1: Resolve the project folder ────────────────────────────────
  let projectItems: DriveItem[] = [];

  // Strategy 1: Sharing link — ONLY for actual sharing links (/:f:/ or /:v:/ format)
  // Skip for regular webUrls (they hang for 30s+ per variant in the /shares/ API)
  const isSharingLink = /\/:[a-z]:\//i.test(sharePointFolderUrl);
  if (isSharingLink) {
    try {
      const resolveWithTimeout = Promise.race([
        resolveSharePointUrl(sharePointFolderUrl),
        new Promise<null>((r) => setTimeout(() => r(null), 5_000)), // 5s max
      ]);
      const folderItem = await resolveWithTimeout;
      if (folderItem?.id) {
        const did = folderItem.parentReference?.driveId ?? driveId;
        projectItems = await listByItemId(folderItem.id, did);
        console.log(`[auto-select] Strategy 1 (sharing link): ${projectItems.length} items`);
      }
    } catch { /* try next */ }
  }

  // Strategy 2: Extract path from webUrl
  if (projectItems.length === 0 && sharePointFolderUrl.includes("sharepoint.com")) {
    try {
      const urlObj = new URL(sharePointFolderUrl);
      const pathMatch = urlObj.pathname.match(/\/Shared\s*Documents\/(.+)/i)
        ?? urlObj.pathname.match(/\/Documents\/(.+)/i);
      if (pathMatch) {
        const spPath = decodeURIComponent(pathMatch[1]);
        projectItems = await listDriveItems(driveId, `/${spPath}`);
        console.log(`[auto-select] Strategy 2 (webUrl path): ${projectItems.length} items`);
      }
    } catch { /* try next */ }
  }

  // Strategy 3: SKIP — client root is too broad (lists all divisions, not project files).
  // If strategies 1-2 failed, we don't have a precise folder → return empty.
  if (projectItems.length === 0) {
    console.warn(`[auto-select] Strategies 1-2 failed. URL: ${sharePointFolderUrl.substring(0, 100)}`);
    return empty;
  }

  if (projectItems.length === 0) {
    console.warn(`[auto-select] No items found for: ${sharePointFolderUrl.substring(0, 100)}`);
    return empty;
  }

  // ── Step 2: Find images ───────────────────────────────────────────────
  // Pattern: look for images in sub-folders (Batch 01, Batch 02, etc.)
  // Skip: Supporting Files, Source, Brief, Archive, etc.
  // Priority: most recent sub-folder first

  let images: DriveItem[] = [];

  // Get all sub-folders, filter out skippable ones, sort most recent first
  const subFolders = sortByRecent(
    projectItems.filter((i) => i.folder && !shouldSkip(i.name))
  );

  // Scan sub-folders from most recent to oldest — stop when we have 3+ images
  for (const folder of subFolders) {
    if (images.length >= 3) break;
    try {
      const folderDriveId = folder.parentReference?.driveId ?? driveId;
      const children = await listByItemId(folder.id, folderDriveId);
      const folderImages = children.filter(isImage).filter(isValidSize);
      if (folderImages.length > 0) {
        console.log(`[auto-select] Found ${folderImages.length} images in "${folder.name}"`);
        images.push(...folderImages);
      }
    } catch {
      console.warn(`[auto-select] Failed to list sub-folder "${folder.name}"`);
    }
  }

  // Fallback: check root folder for direct images
  if (images.length === 0) {
    images = projectItems.filter(isImage).filter(isValidSize);
    if (images.length > 0) {
      console.log(`[auto-select] Found ${images.length} images in root folder`);
    }
  }

  if (images.length === 0) {
    console.warn(`[auto-select] No suitable images found (${MIN_FILE_SIZE/1024}KB-${MAX_FILE_SIZE/(1024*1024)}MB)`);
    return empty;
  }

  // Sort by most recent, pick top 6
  const sorted = sortByRecent(images).slice(0, 6);

  // ── Step 3: Build SelectedVisual objects ───────────────────────────────
  const allImages: SelectedVisual[] = sorted.map((item) => ({
    name: item.name,
    url: buildProxyUrl(item, driveId),
    thumbnailUrl: buildThumbnailUrl(item),
    size: item.size,
    itemId: item.id,
    driveId: item.parentReference?.driveId ?? driveId,
  }));

  // ── Step 4: Assign roles ──────────────────────────────────────────────
  // hero = website case study page, linkedIn = LinkedIn visual, email = email header
  // Use different images for each role when possible
  return {
    heroImage: allImages[0],
    linkedInImage: allImages[1] ?? allImages[0], // fallback to hero if only 1 image
    emailHeader: allImages[2] ?? allImages[0],   // fallback to hero if < 3 images
    allImages,
    source: "auto",
  };
}
