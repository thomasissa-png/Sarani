// ─── Auto-select visuals from SharePoint project folder ─────────────────────
// Step 4 of the case study pipeline.
// Lists images in the candidate's SP folder, picks the 3 best by size heuristic,
// and returns anonymous sharing links for downstream use (Satori, DB storage).

import {
  type DriveItem,
  resolveSharePointUrl,
  listDriveItems,
  createAnonymousSharingLink,
  getDriveItemByPath,
  graphFetch,
} from "@/lib/integrations/sharepoint";
import {
  SHAREPOINT_ASSETS_DRIVE_ID,
  ASSETS_CUSTOMERS_BASE_PATH,
  getMappingBySpaceName,
} from "@/lib/integrations/config";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SelectedVisual {
  /** Stable proxy URL: /api/project-assets/{itemId}?driveId={driveId} — never expires */
  url: string;
  thumbnailUrl: string;
  name: string;
  size: number;
  /** SharePoint item ID for direct Graph API access */
  itemId: string;
  /** SharePoint drive ID */
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

/** Preferred sub-folder names (case-insensitive) — checked in order */
const PREFERRED_SUBFOLDERS = [
  "final",
  "export",
  "exports",
  "delivered",
  "livrables",
];

/** Files above this threshold are likely PSDs/source files — skip them */
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/** Minimum file size to consider (skip tiny thumbnails / placeholders) */
const MIN_FILE_SIZE_BYTES = 10 * 1024; // 10 KB

// ─── Helpers ────────────────────────────────────────────────────────────────

function isImageFile(item: DriveItem): boolean {
  return (
    !!item.file?.mimeType &&
    item.file.mimeType.startsWith("image/") &&
    !item.folder
  );
}

function isFolder(item: DriveItem): boolean {
  return !!item.folder;
}

/**
 * Check if a folder name matches one of the preferred sub-folder names.
 */
function isPreferredFolder(name: string): boolean {
  const lower = name.toLowerCase().trim();
  return PREFERRED_SUBFOLDERS.includes(lower);
}

/**
 * Build a stable proxy URL for a drive item.
 * Uses /api/project-assets/{itemId}?driveId={driveId} which re-fetches
 * the downloadUrl on each request — never expires.
 * Falls back to anonymous sharing link if itemId is not available.
 */
async function getStableUrl(item: DriveItem): Promise<string> {
  const driveId = item.parentReference?.driveId;
  if (driveId && item.id) {
    return `/api/project-assets/${item.id}?driveId=${driveId}`;
  }
  // Fallback: try anonymous sharing link
  if (driveId && item.id) {
    const link = await createAnonymousSharingLink(driveId, item.id);
    if (link) return link;
  }
  // Last resort: temporary download URL
  return item["@microsoft.graph.downloadUrl"] ?? item.webUrl;
}

/**
 * Build a thumbnail URL from a drive item.
 * Graph API provides thumbnails at /thumbnails/0/large/url for drive items.
 */
function getThumbnailUrl(item: DriveItem): string {
  // The downloadUrl works as a thumbnail for images; a proper thumbnail
  // endpoint would be /drives/{driveId}/items/{itemId}/thumbnails but
  // that requires an extra call. The downloadUrl is pre-authenticated
  // and serves the actual image which is good enough for preview.
  return item["@microsoft.graph.downloadUrl"] ?? item.webUrl;
}

// ─── Main function ──────────────────────────────────────────────────────────

/**
 * Auto-select the 3 best images from a SharePoint project folder.
 *
 * Strategy:
 * 1. Resolve the SP folder URL to a driveItem
 * 2. Look for preferred sub-folders (Final, Export, Delivered, etc.)
 * 3. List image files, filter by size, sort by size descending
 * 4. Pick top 3 as heroImage, linkedInImage, emailHeader
 * 5. Generate anonymous sharing links for each
 *
 * @param sharePointFolderUrl - The SharePoint folder URL of the project
 * @param _clientName - Optional client name (reserved for future scoring)
 * @returns The auto-selected visuals with sharing links
 */
export async function autoSelectVisuals(
  sharePointFolderUrl: string,
  clientName?: string | null
): Promise<AutoSelectedVisuals> {
  const driveId = SHAREPOINT_ASSETS_DRIVE_ID;
  let items: DriveItem[] = [];

  // Strategy 1: Try to resolve as a sharing link via /shares/ API
  try {
    const folderItem = await resolveSharePointUrl(sharePointFolderUrl);
    if (folderItem?.id && folderItem.parentReference?.driveId) {
      const resolvedDriveId = folderItem.parentReference.driveId;
      const folderPath = folderItem.parentReference.path
        ? `${folderItem.parentReference.path}/${folderItem.name}`
        : `/${folderItem.name}`;
      const cleanPath = folderPath.replace(/^\/drives\/[^/]+\/root:/, "").replace(/^\/drive\/root:/, "");
      items = await listDriveItems(resolvedDriveId, cleanPath);
      console.log(`[auto-select-visuals] Strategy 1 (sharing link): ${items.length} items`);
    }
  } catch {
    // Strategy 1 failed — try next
  }

  // Strategy 2: Extract path from webUrl and list via ASSETS drive
  if (items.length === 0 && sharePointFolderUrl.includes("sharepoint.com")) {
    try {
      // webUrl looks like: https://tenant.sharepoint.com/sites/SiteName/Shared Documents/path/to/folder
      const urlObj = new URL(sharePointFolderUrl);
      const pathMatch = urlObj.pathname.match(/\/Shared\s*Documents\/(.+)/i)
        ?? urlObj.pathname.match(/\/Documents\/(.+)/i);
      if (pathMatch) {
        const spPath = decodeURIComponent(pathMatch[1]);
        items = await listDriveItems(driveId, `/${spPath}`);
        console.log(`[auto-select-visuals] Strategy 2 (webUrl path): ${items.length} items from /${spPath}`);
      }
    } catch {
      // Strategy 2 failed
    }
  }

  // Strategy 3: Use client name + config mapping to find the project folder
  if (items.length === 0 && clientName) {
    try {
      const mapping = getMappingBySpaceName(clientName);
      if (mapping) {
        const customerPath = `${ASSETS_CUSTOMERS_BASE_PATH}/${mapping.sharepointCustomerFolder}`;
        const customerItems = await listDriveItems(driveId, customerPath);
        // Use all images from the client's root as a fallback
        items = customerItems;
        console.log(`[auto-select-visuals] Strategy 3 (client root): ${items.length} items`);
      }
    } catch {
      // Strategy 3 failed
    }
  }

  if (items.length === 0) {
    console.warn(
      "[auto-select-visuals] All strategies failed for:",
      sharePointFolderUrl.substring(0, 120),
      "client:", clientName
    );
    return { allImages: [], source: "auto" };
  }

  // 3. Check for preferred sub-folders
  const subFolders = items.filter(isFolder);
  let imageItems: DriveItem[] = [];

  for (const folderName of PREFERRED_SUBFOLDERS) {
    const match = subFolders.find(
      (f) => f.name.toLowerCase().trim() === folderName
    );
    if (match) {
      try {
        // List sub-folder contents by item ID (not path — path varies by strategy)
        const subData = await graphFetch<{ value: DriveItem[] }>(
          `/drives/${match.parentReference?.driveId ?? driveId}/items/${match.id}/children`
        );
        const subImages = (subData.value ?? []).filter(isImageFile);
        if (subImages.length > 0) {
          imageItems = subImages;
          break; // Use the first preferred folder that has images
        }
      } catch {
        // Sub-folder listing failed, try next
      }
    }
  }

  // If no preferred sub-folder had images, use root folder images
  if (imageItems.length === 0) {
    imageItems = items.filter(isImageFile);
  }

  // 4. Filter by size and sort
  const filteredImages = imageItems
    .filter((item) => item.size >= MIN_FILE_SIZE_BYTES)
    .filter((item) => item.size <= MAX_FILE_SIZE_BYTES)
    .sort((a, b) => b.size - a.size); // Largest first = highest quality finals

  if (filteredImages.length === 0) {
    console.warn(
      "[auto-select-visuals] No suitable images found in folder"
    );
    return { allImages: [], source: "auto" };
  }

  // 5. Generate stable proxy URLs for top candidates (max 6 to have some alternates)
  const topCandidates = filteredImages.slice(0, 6);
  const allImages: SelectedVisual[] = await Promise.all(
    topCandidates.map(async (item) => ({
      name: item.name,
      url: await getStableUrl(item),
      size: item.size,
      thumbnailUrl: getThumbnailUrl(item),
      itemId: item.id,
      driveId: item.parentReference?.driveId ?? driveId,
    }))
  );

  // 6. Assign the top 3
  return {
    heroImage: allImages[0],
    linkedInImage: allImages[1],
    emailHeader: allImages[2],
    allImages,
    source: "auto",
  };
}
