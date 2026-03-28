/**
 * Server-side utility to fetch gallery images for case study detail pages.
 * Looks up the client's SharePoint folder and lists image files from project subfolders.
 * Graceful fallback: returns empty array if SharePoint is unavailable or no mapping exists.
 */

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

// ─── Types ──────────────────────────────────────────────────────────────────

export interface GalleryImage {
  url: string;
  name: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const IMAGE_MIMETYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
]);

const BATCH_PATTERN = /^Batch\s*\d+/i;
const MAX_GALLERY_IMAGES = 12;

// ─── Helpers ────────────────────────────────────────────────────────────────

function normalizeForMatch(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

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

  return null;
}

function isImageItem(item: DriveItem): boolean {
  return !!item.file && IMAGE_MIMETYPES.has(item.file.mimeType);
}

/**
 * Get the best available URL for a DriveItem image.
 * Prefers the pre-authenticated download URL (valid ~1 hour, no auth needed)
 * over webUrl (which requires SharePoint authentication).
 */
function getImageUrl(item: DriveItem): string {
  return item["@microsoft.graph.downloadUrl"] || item.webUrl;
}

// ─── Main Function ──────────────────────────────────────────────────────────

/**
 * Fetch gallery images for a case study from SharePoint.
 *
 * @param clientName - The client name (e.g. "TikTok", "Sony") used to look up the SharePoint folder
 * @param projectName - Optional project/deliverable name to fuzzy-match a subfolder
 * @returns Array of gallery images (max 12), or empty array if unavailable
 */
export async function fetchCaseStudyGallery(
  clientName: string,
  projectName?: string
): Promise<GalleryImage[]> {
  try {
    const mapping = getMappingBySpaceName(clientName);
    if (!mapping) {
      return [];
    }

    const customerFolderPath = `${ASSETS_CUSTOMERS_BASE_PATH}/${mapping.sharepointCustomerFolder}`;

    // List subfolders in the customer directory
    const customerItems = await listDriveItems(
      SHAREPOINT_ASSETS_DRIVE_ID,
      customerFolderPath
    );

    // If a project name is provided, try to find its specific folder
    let targetFolderPath = customerFolderPath;
    if (projectName) {
      const projectFolder = findProjectFolder(customerItems, projectName);
      if (projectFolder) {
        targetFolderPath = `${customerFolderPath}/${projectFolder.name}`;
      }
    }

    // List items in the target folder
    const folderItems = await listDriveItems(
      SHAREPOINT_ASSETS_DRIVE_ID,
      targetFolderPath
    );

    // Collect images: first from top-level, then from Batch subfolders
    const images: GalleryImage[] = [];

    // Top-level images in the folder
    for (const item of folderItems) {
      if (isImageItem(item)) {
        images.push({ url: getImageUrl(item), name: item.name });
      }
      if (images.length >= MAX_GALLERY_IMAGES) break;
    }

    // If we don't have enough images, look inside Batch subfolders
    if (images.length < MAX_GALLERY_IMAGES) {
      const batchFolders = folderItems
        .filter((item) => item.folder && BATCH_PATTERN.test(item.name))
        .sort((a, b) =>
          a.name.localeCompare(b.name, undefined, {
            numeric: true,
            sensitivity: "base",
          })
        );

      for (const batchFolder of batchFolders) {
        if (images.length >= MAX_GALLERY_IMAGES) break;

        const batchPath = `${targetFolderPath}/${batchFolder.name}`;
        try {
          const batchItems = await listDriveItems(
            SHAREPOINT_ASSETS_DRIVE_ID,
            batchPath
          );

          for (const item of batchItems) {
            if (images.length >= MAX_GALLERY_IMAGES) break;
            if (isImageItem(item)) {
              images.push({ url: getImageUrl(item), name: item.name });
            }
          }
        } catch {
          // Skip individual batch errors silently
          continue;
        }
      }
    }

    return images;
  } catch (err) {
    // Graceful degradation: log and return empty array
    console.error(
      "[case-study-gallery] SharePoint error:",
      err instanceof SharePointApiError ? err.message : err
    );
    return [];
  }
}
