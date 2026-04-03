// ─── Auto-select visuals from SharePoint project folder ─────────────────────
// Step 4 of the case study pipeline.
// Lists images in the candidate's SP folder, picks the 3 best by size heuristic,
// and returns anonymous sharing links for downstream use (Satori, DB storage).

import {
  type DriveItem,
  resolveSharePointUrl,
  listDriveItems,
  createAnonymousSharingLink,
} from "@/lib/integrations/sharepoint";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SelectedVisual {
  url: string;
  thumbnailUrl: string;
  name: string;
  size: number;
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
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

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
 * Generate an anonymous sharing link for a drive item.
 * Falls back to the downloadUrl or webUrl if link creation fails.
 */
async function getSharingUrl(item: DriveItem): Promise<string> {
  const driveId = item.parentReference?.driveId;
  if (driveId && item.id) {
    const link = await createAnonymousSharingLink(driveId, item.id);
    if (link) return link;
  }
  // Fallback: use the temporary download URL or webUrl
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
  _clientName?: string | null
): Promise<AutoSelectedVisuals> {
  // 1. Resolve the folder URL to a drive item
  const folderItem = await resolveSharePointUrl(sharePointFolderUrl);
  if (!folderItem?.id || !folderItem.parentReference?.driveId) {
    console.warn(
      "[auto-select-visuals] Could not resolve SharePoint folder URL:",
      sharePointFolderUrl.substring(0, 120)
    );
    return { allImages: [], source: "auto" };
  }

  const driveId = folderItem.parentReference.driveId;
  // Build the folder path from the parentReference
  // The item itself is the folder, so we need its path
  const folderPath = folderItem.parentReference.path
    ? `${folderItem.parentReference.path}/${folderItem.name}`
    : `/${folderItem.name}`;
  // Strip the "/drive/root:" prefix that Graph API includes
  const cleanPath = folderPath.replace(/^\/drives\/[^/]+\/root:/, "").replace(/^\/drive\/root:/, "");

  // 2. List children of the folder
  let items: DriveItem[];
  try {
    items = await listDriveItems(driveId, cleanPath);
  } catch (err) {
    console.warn(
      "[auto-select-visuals] Failed to list folder contents:",
      err instanceof Error ? err.message : err
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
        const subItems = await listDriveItems(
          driveId,
          `${cleanPath}/${match.name}`
        );
        const subImages = subItems.filter(isImageFile);
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

  // 5. Generate sharing links for top candidates (max 6 to have some alternates)
  const topCandidates = filteredImages.slice(0, 6);
  const allImages: SelectedVisual[] = await Promise.all(
    topCandidates.map(async (item) => ({
      name: item.name,
      url: await getSharingUrl(item),
      size: item.size,
      thumbnailUrl: getThumbnailUrl(item),
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
