/**
 * Public project presentation page.
 * Dynamic SSR on every request — ensures download URLs are always fresh
 * (SharePoint @microsoft.graph.downloadUrl expires after ~1h).
 * Dark-themed (Sarani brand: bg-black, text-white, accent Flame).
 */
import { Metadata } from "next";
import ImageLightbox from "@/components/ui/ImageLightbox";
import CommentCountBadge, { CommentCountInline } from "@/components/ui/CommentCountBadge";
import { VideoPlayer } from "@/components/ui/VideoPlayer";
import { db } from "@/lib/db";
import { projectPreviews } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import {
  listDriveItems,
  graphFetch,
  type DriveItem,
  SharePointApiError,
} from "@/lib/integrations/sharepoint";
import { presentationComments } from "@/lib/db/schema";
import { sql } from "drizzle-orm";
import {
  SHAREPOINT_ASSETS_DRIVE_ID,
  ASSETS_CUSTOMERS_BASE_PATH,
  getMappingBySpaceName,
} from "@/lib/integrations/config";

// ─── Types ─────────────────────────────────────────────────────────────────

interface BatchItem {
  name: string;
  /** SharePoint Graph item ID — unique across all folders */
  itemId: string;
  webUrl: string;
  /** Proxy URL that never expires (redirects to fresh SP download URL) */
  proxyUrl: string;
  /**
   * Pre-authenticated direct download URL from SharePoint Graph API.
   * Valid for ~1 hour. Used for video src instead of proxy streaming,
   * because proxying large video files through Next.js API routes is
   * unreliable on Replit (timeouts, body size limits, worker killed mid-stream).
   * The page is SSR with 300s revalidation, so URLs refresh well before expiry.
   */
  directUrl?: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
}

interface BatchGroup {
  name: string;
  items: BatchItem[];
}

type Props = {
  params: Promise<{ clientSlug: string; projectSlug: string }>;
};

// ─── Helpers ───────────────────────────────────────────────────────────────

const ALLOWED_MIMETYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-msvideo",
  "video/x-ms-wmv",
  "video/x-matroska",
  "video/mpeg",
  "video/3gpp",
]);

/**
 * Video extensions → proper MIME type. Used when SharePoint returns
 * "application/octet-stream" for a file that is actually a video.
 * Without this, videos are silently excluded from the share page.
 * REGRESSION FIX: root cause of video playback broken for 4 iterations.
 */
const VIDEO_EXT_TO_MIME: Record<string, string> = {
  ".mp4": "video/mp4",
  ".m4v": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".avi": "video/x-msvideo",
  ".wmv": "video/x-ms-wmv",
  ".mkv": "video/x-matroska",
  ".mpeg": "video/mpeg",
  ".mpg": "video/mpeg",
  ".3gp": "video/3gpp",
};

/**
 * Check if a file should be included on the share page.
 * First checks the MIME type from SharePoint, then falls back to
 * extension-based detection for application/octet-stream files.
 */
function isAllowedFile(child: GraphDriveChild): { allowed: boolean; mimeType: string } {
  const mime = child.file?.mimeType ?? "";
  if (ALLOWED_MIMETYPES.has(mime)) {
    return { allowed: true, mimeType: mime };
  }
  // Fallback: check extension for video files with wrong/missing MIME type
  const ext = child.name.substring(child.name.lastIndexOf(".")).toLowerCase();
  const videoMime = VIDEO_EXT_TO_MIME[ext];
  if (videoMime) {
    return { allowed: true, mimeType: videoMime };
  }
  return { allowed: false, mimeType: mime };
}

// Folders to SKIP when scanning for deliverables
const SKIP_FOLDER_NAMES = new Set([
  "supporting files",
  "rework",
  "00. brief",
  "brief",
  "source files",
  "source",
  "sources",
  "assets source",
  "archive",
  "old",
  "template",
  "templates",
]);

/**
 * Fetch individual files by their Graph API item IDs.
 * Used when selectedAssets contains IDs from multiple folders —
 * scanning a single folder would miss files from other folders.
 * Groups items by their parent folder name to preserve subfolder categories.
 */
async function fetchAssetsByIds(
  assetIds: string[],
  driveId: string
): Promise<{ batches: BatchGroup[]; error?: string }> {
  try {
    // Fetch each item individually — Graph API returns parentReference with folder name
    const results = await Promise.allSettled(
      assetIds.map(async (id) => {
        const item = await graphFetch<GraphDriveChild>(
          `/drives/${driveId}/items/${id}?$select=id,name,size,file,image,webUrl,parentReference,@microsoft.graph.downloadUrl`
        );
        return item;
      })
    );

    // Group items by parent folder name
    const grouped = new Map<string, BatchItem[]>();

    for (const result of results) {
      if (result.status !== "fulfilled") continue;
      const item = result.value;
      if (!item.file) continue;
      const check = isAllowedFile(item);
      if (!check.allowed) continue;

      const folderName = item.parentReference?.name || "Assets";
      const isVideo = check.mimeType.startsWith("video/");
      if (!grouped.has(folderName)) grouped.set(folderName, []);
      grouped.get(folderName)!.push({
        name: item.name,
        itemId: item.id,
        webUrl: item.webUrl,
        proxyUrl: `/api/project-assets/${item.id}?driveId=${encodeURIComponent(driveId)}`,
        directUrl: isVideo ? item["@microsoft.graph.downloadUrl"] : undefined,
        mimeType: check.mimeType,
        size: item.size,
        width: item.image?.width,
        height: item.image?.height,
      });
    }

    if (grouped.size === 0) return { batches: [] };

    // Convert to BatchGroup array, sorted by folder name
    const batches: BatchGroup[] = Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, items]) => ({ name, items }));

    return { batches };
  } catch (err) {
    console.error("[share-page] Error fetching assets by IDs:", err);
    return { batches: [], error: "Failed to load selected assets" };
  }
}

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

  const exact = foldersOnly.find(
    (f) => f.name.toLowerCase() === projectName.toLowerCase()
  );
  if (exact) return exact;

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

function naturalSort(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatBatchName(name: string): string {
  // "Batch 01" → "Delivery 1"
  const batchMatch = name.match(/batch\s*(\d+)/i);
  if (batchMatch) return `Delivery ${parseInt(batchMatch[1], 10)}`;
  // Clean up folder names: remove leading numbers/dots ("01. Brief" → "Brief")
  const cleaned = name.replace(/^\d+\.\s*/, "").trim();
  return cleaned || name;
}

// ─── SharePoint Batch Fetching ─────────────────────────────────────────────

/** Shape returned by Graph API for drive item children. */
interface GraphDriveChild {
  id: string;
  name: string;
  size: number;
  file?: { mimeType: string };
  image?: { width: number; height: number };
  folder?: { childCount: number };
  parentReference?: { name?: string; path?: string };
  webUrl: string;
  "@microsoft.graph.downloadUrl"?: string;
}

/** Maximum depth when recursing into subfolders inside a batch. */
const MAX_FOLDER_DEPTH = 4;
/** Maximum concurrent Graph API calls when recursing subfolders. */
const MAX_CONCURRENCY = 5;

/** Process items in batches of `limit` concurrent promises. */
async function mapConcurrent<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += limit) {
    const batch = items.slice(i, i + limit);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}

/**
 * Recursively collect all allowed files from a Graph folder item.
 * Traverses subfolders up to MAX_FOLDER_DEPTH, skipping folders in SKIP_FOLDER_NAMES.
 * Limits concurrent Graph API calls to MAX_CONCURRENCY.
 */
async function collectFilesRecursive(
  driveId: string,
  folderId: string,
  depth: number
): Promise<BatchItem[]> {
  if (depth > MAX_FOLDER_DEPTH) return [];

  try {
    const data = await graphFetch<{ value: GraphDriveChild[] }>(
      `/drives/${driveId}/items/${folderId}/children`
    );
    const children = data.value ?? [];

    const files: BatchItem[] = [];
    const nestedFolders: GraphDriveChild[] = [];

    for (const child of children) {
      const check = child.file ? isAllowedFile(child) : null;
      if (check?.allowed) {
        const isVideo = check.mimeType.startsWith("video/");
        files.push({
          name: child.name,
          itemId: child.id,
          webUrl: child.webUrl,
          proxyUrl: `/api/project-assets/${child.id}?driveId=${encodeURIComponent(driveId)}`,
          directUrl: isVideo ? child["@microsoft.graph.downloadUrl"] : undefined,
          mimeType: check.mimeType,
          size: child.size,
          width: child.image?.width,
          height: child.image?.height,
        });
      } else if (
        child.folder &&
        !SKIP_FOLDER_NAMES.has(child.name.toLowerCase().trim())
      ) {
        nestedFolders.push(child);
      }
    }

    // Recurse into nested subfolders with concurrency limit
    if (nestedFolders.length > 0) {
      const nestedResults = await mapConcurrent(
        nestedFolders,
        MAX_CONCURRENCY,
        (f) => collectFilesRecursive(driveId, f.id, depth + 1)
      );
      for (const nested of nestedResults) {
        files.push(...nested);
      }
    }

    return files;
  } catch {
    return [];
  }
}

/**
 * Fetch batches directly from a known SP folder ID (Graph API item ID).
 * Used when the PM selected the exact folder via the Share modal.
 * No fuzzy matching needed — the folder ID is exact.
 */
async function fetchBatchesByFolderId(
  folderId: string,
  driveId: string
): Promise<{ batches: BatchGroup[]; error?: string }> {
  try {
    // List direct children of the selected folder
    const data = await graphFetch<{ value: GraphDriveChild[] }>(
      `/drives/${driveId}/items/${folderId}/children`
    );

    const items = data.value ?? [];

    // Separate folders (batch subfolders) and files (direct assets)
    const subfolders = items
      .filter((item) => item.folder && !SKIP_FOLDER_NAMES.has(item.name.toLowerCase().trim()))
      .sort((a, b) => naturalSort(a.name, b.name));

    const directFiles = items
      .filter((item) => item.file && isAllowedFile(item).allowed)
      .map((item) => {
        const { mimeType } = isAllowedFile(item);
        const isVideo = mimeType.startsWith("video/");
        return {
          name: item.name,
          itemId: item.id,
          webUrl: item.webUrl,
          proxyUrl: `/api/project-assets/${item.id}?driveId=${encodeURIComponent(driveId)}`,
          directUrl: isVideo ? item["@microsoft.graph.downloadUrl"] : undefined,
          mimeType,
          size: item.size,
          width: item.image?.width,
          height: item.image?.height,
        };
      });

    const batches: BatchGroup[] = [];

    // If there are subfolders, treat each as a batch and recursively collect its files
    for (const folder of subfolders) {
      const batchFiles = await collectFilesRecursive(driveId, folder.id, 1);

      // Sort: images first, then videos, then PDFs — alphabetical within each group
      batchFiles.sort((a, b) => {
        const aIsImage = a.mimeType.startsWith("image/");
        const bIsImage = b.mimeType.startsWith("image/");
        if (aIsImage && !bIsImage) return -1;
        if (!aIsImage && bIsImage) return 1;
        return a.name.localeCompare(b.name);
      });

      if (batchFiles.length > 0) {
        batches.push({ name: folder.name, items: batchFiles });
      }
    }

    // If no subfolders with assets found, show direct files as a single batch
    if (batches.length === 0 && directFiles.length > 0) {
      batches.push({ name: "Assets", items: directFiles });
    }

    return { batches };
  } catch (err) {
    console.error("[share-page] Error loading folder by ID:", err);
    return { batches: [] };
  }
}

/**
 * Legacy: fetch batches by client name + fuzzy project name matching.
 * Used for old previews without a specific spFolderId.
 */
async function fetchBatches(
  clientName: string,
  projectName: string
): Promise<{ batches: BatchGroup[]; error?: string }> {
  const mapping = getMappingBySpaceName(clientName);
  if (!mapping) {
    console.log(`[share-page] No mapping for client "${clientName}"`);
    return { batches: [] };
  }

  try {
    const customerFolderPath = `${ASSETS_CUSTOMERS_BASE_PATH}/${mapping.sharepointCustomerFolder}`;
    console.log(`[share-page] Scanning ${customerFolderPath} for project "${projectName}"`);

    const customerItems = await listDriveItems(
      SHAREPOINT_ASSETS_DRIVE_ID,
      customerFolderPath
    );
    console.log(`[share-page] Found ${customerItems.length} items in customer folder. Folders: ${customerItems.filter(i => i.folder).map(i => i.name).join(", ")}`);

    const projectFolder = findProjectFolder(customerItems, projectName);
    if (!projectFolder) {
      console.log(`[share-page] No project folder matching "${projectName}"`);
      return { batches: [] };
    }
    console.log(`[share-page] Matched project folder: "${projectFolder.name}"`);

    const projectFolderPath = `${customerFolderPath}/${projectFolder.name}`;
    const projectItems = await listDriveItems(
      SHAREPOINT_ASSETS_DRIVE_ID,
      projectFolderPath
    );

    // Smart folder discovery:
    // Some projects have assets directly in subfolders (Batch 01, Banner 1, etc.)
    // Others have a NESTED project folder (same name as project) containing the asset folders
    // Strategy: if we find a subfolder matching the project name → go one level deeper
    let assetRoot = projectFolderPath;
    let assetRootItems = projectItems;

    const deliveryFolders = projectItems.filter(
      (item) => item.folder && !SKIP_FOLDER_NAMES.has(item.name.toLowerCase().trim())
    );

    // Check if one of the subfolders matches the project name (nested structure)
    const nestedProjectFolder = deliveryFolders.find((f) => {
      const normalizedFolder = normalizeForMatch(f.name);
      const normalizedProject = normalizeForMatch(projectName);
      return normalizedFolder.includes(normalizedProject) || normalizedProject.includes(normalizedFolder);
    });

    if (nestedProjectFolder) {
      // Go one level deeper — the real assets are inside this subfolder
      assetRoot = `${projectFolderPath}/${nestedProjectFolder.name}`;
      assetRootItems = await listDriveItems(SHAREPOINT_ASSETS_DRIVE_ID, assetRoot);
    }

    // Now scan the asset root for deliverable folders
    const batchFolders = assetRootItems
      .filter((item) => item.folder && !SKIP_FOLDER_NAMES.has(item.name.toLowerCase().trim()))
      .sort((a, b) => naturalSort(a.name, b.name));

    const batches: BatchGroup[] = [];

    for (const batchFolder of batchFolders) {
      // Use recursive collection via Graph item ID to find files in nested subfolders
      const batchFiles = await collectFilesRecursive(
        SHAREPOINT_ASSETS_DRIVE_ID,
        batchFolder.id,
        1
      );

      // Sort: images first, then videos, then PDFs — alphabetical within each group
      batchFiles.sort((a, b) => {
        const aIsImage = a.mimeType.startsWith("image/");
        const bIsImage = b.mimeType.startsWith("image/");
        if (aIsImage && !bIsImage) return -1;
        if (!aIsImage && bIsImage) return 1;
        return a.name.localeCompare(b.name);
      });

      if (batchFiles.length > 0) {
        batches.push({ name: batchFolder.name, items: batchFiles });
      }
    }

    // If no batch subfolders found, scan the asset root directly for files
    if (batches.length === 0) {
      console.log(`[share-page] No subfolders with images found, scanning root for direct files`);
      const rootFiles = assetRootItems
        .filter((item) => item.file && isAllowedFile(item).allowed)
        .map((item) => {
          const { mimeType } = isAllowedFile(item);
          const isVideo = mimeType.startsWith("video/");
          return {
            name: item.name,
            itemId: item.id,
            webUrl: item.webUrl,
            proxyUrl: `/api/project-assets/${item.id}?driveId=${encodeURIComponent(SHAREPOINT_ASSETS_DRIVE_ID)}`,
            directUrl: isVideo ? item["@microsoft.graph.downloadUrl"] : undefined,
            mimeType,
            size: item.size,
          };
        });
      if (rootFiles.length > 0) {
        batches.push({ name: "Assets", items: rootFiles });
      }
    }

    console.log(`[share-page] Found ${batches.length} groups, ${batches.reduce((s, b) => s + b.items.length, 0)} total assets`);
    return { batches };
  } catch (err) {
    console.error(
      "[share-page] SharePoint error:",
      err instanceof SharePointApiError ? `${err.message} (status: ${err.statusCode})` : err
    );
    // Return empty batches instead of error — show the brief without assets
    return { batches: [] };
  }
}

// ─── Metadata ──────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { clientSlug, projectSlug } = await params;

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
    return { title: "Project Not Found - Sarani" };
  }

  return {
    title: `${preview.projectName} - ${preview.clientName} | Sarani`,
    description: `Project presentation for ${preview.clientName}: ${preview.projectName}`,
    robots: { index: false, follow: false },
  };
}

// ─── Page Component ────────────────────────────────────────────────────────

export default async function ProjectPreviewPage({ params }: Props) {
  const { clientSlug, projectSlug } = await params;

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
    notFound();
  }

  // If specific assets were selected (with IDs), load them directly by ID.
  // This handles cross-folder selections correctly — scanning a single folder
  // would miss files from other folders.
  // Otherwise, load from the SP folder (or fuzzy-match).
  let batches: BatchGroup[] = [];
  let spError: string | undefined;

  if (preview.selectedAssets) {
    try {
      const selected: Array<{ id?: string; name: string }> = JSON.parse(preview.selectedAssets);
      const selectedIds = selected.map((s) => s.id).filter(Boolean) as string[];

      if (selectedIds.length > 0) {
        // Direct fetch by ID — works across multiple folders
        const driveId = preview.spDriveId || SHAREPOINT_ASSETS_DRIVE_ID;
        const result = await fetchAssetsByIds(selectedIds, driveId);
        batches = result.batches;
        spError = result.error;

        // Fallback: if fetching by ID returned nothing (stale IDs, API error),
        // fall back to folder scan + ID filter
        if (batches.length === 0 && preview.spFolderId) {
          console.log("[share-page] fetchAssetsByIds returned empty, falling back to folder scan");
          const folderResult = await fetchBatchesByFolderId(preview.spFolderId, driveId);
          batches = folderResult.batches;
          spError = folderResult.error;
          // Filter by selected IDs if folder scan returned results
          const idSet = new Set(selectedIds);
          batches = batches
            .map((b) => ({
              ...b,
              items: b.items.filter((item) => idSet.has(item.itemId)),
            }))
            .filter((b) => b.items.length > 0);
          // If still empty after filtering, show all folder contents
          if (batches.length === 0) {
            const fullResult = await fetchBatchesByFolderId(preview.spFolderId, driveId);
            batches = fullResult.batches;
            spError = fullResult.error;
          }
        }
      } else {
        // Legacy: no IDs, fall back to folder scan + name filter
        const folderResult = preview.spFolderId
          ? await fetchBatchesByFolderId(preview.spFolderId, preview.spDriveId || SHAREPOINT_ASSETS_DRIVE_ID)
          : await fetchBatches(preview.clientName, preview.projectName);
        batches = folderResult.batches;
        spError = folderResult.error;

        const selectedNames = new Set(selected.map((s) => s.name.toLowerCase()));
        batches = batches
          .map((b) => ({
            ...b,
            items: b.items.filter((item) => selectedNames.has(item.name.toLowerCase())),
          }))
          .filter((b) => b.items.length > 0);
      }
    } catch {
      // Invalid JSON — fall through to folder scan
      const folderResult = preview.spFolderId
        ? await fetchBatchesByFolderId(preview.spFolderId, preview.spDriveId || SHAREPOINT_ASSETS_DRIVE_ID)
        : await fetchBatches(preview.clientName, preview.projectName);
      batches = folderResult.batches;
      spError = folderResult.error;
    }
  } else {
    // No selection — show all assets from the folder
    const folderResult = preview.spFolderId
      ? await fetchBatchesByFolderId(preview.spFolderId, preview.spDriveId || SHAREPOINT_ASSETS_DRIVE_ID)
      : await fetchBatches(preview.clientName, preview.projectName);
    batches = folderResult.batches;
    spError = folderResult.error;
  }

  const images = batches.flatMap((b) =>
    b.items.filter((i) => i.mimeType.startsWith("image/"))
  );
  const totalAssets = batches.reduce((sum, b) => sum + b.items.length, 0);

  // If no sharepointLink but we have a folderId, fetch the folder's webUrl for the download section
  let folderDownloadUrl = preview.sharepointLink ?? null;
  if (!folderDownloadUrl && preview.spFolderId) {
    try {
      const folderInfo = await graphFetch<{ webUrl?: string }>(
        `/drives/${preview.spDriveId || SHAREPOINT_ASSETS_DRIVE_ID}/items/${preview.spFolderId}?$select=webUrl`
      );
      folderDownloadUrl = folderInfo?.webUrl ?? null;
    } catch { /* non-critical */ }
  }

  // Fetch comment counts per asset for badge display
  const commentCountRows = await db
    .select({
      assetName: presentationComments.assetName,
      count: sql<number>`cast(count(*) as int)`,
    })
    .from(presentationComments)
    .where(eq(presentationComments.previewId, preview.id))
    .groupBy(presentationComments.assetName);

  const commentCountMap = new Map<string, number>();
  for (const row of commentCountRows) {
    if (row.assetName) {
      commentCountMap.set(row.assetName, row.count);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/sarani-logo-white.png"
            alt="Sarani"
            width={120}
            height={32}
            className="h-10 w-auto"
          />
          <a
            href="https://sarani.studio"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-white/50 hover:text-white/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-flame focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded"
          >
            sarani.studio
          </a>
        </div>
      </header>

      {/* Project Intro */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <p className="text-sm font-medium uppercase tracking-widest text-[var(--color-brand-flame)] mb-3">
          {preview.clientName}
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
          {preview.projectName}
        </h1>

        <div className="flex flex-wrap items-center gap-4 text-sm text-white/50 mb-8">
          {(
            <span>
              {new Date(preview.createdAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          )}
          {totalAssets > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-white/30" />
              {totalAssets} file{totalAssets !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {preview.brief ? (
          <p className="text-base text-white/70 leading-relaxed max-w-3xl">
            {preview.brief}
          </p>
        ) : (
          <p className="text-base text-white/40 leading-relaxed max-w-3xl italic">
            Project presentation for {preview.clientName}.
          </p>
        )}

      </section>

      {/* Creative Proposal */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
            Creative Proposal
          </h2>
          {/* Hint: click to review — only shown when images exist */}
          {images.length > 0 && (
            <p className="text-xs text-white/50 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
              Click on any image to leave feedback
            </p>
          )}
        </div>

        {batches.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 px-6 py-12 text-center">
            <p className="text-white/50">
              Creative assets are being prepared and will be available shortly.
            </p>
            <p className="text-white/30 text-sm mt-2">
              Please check back in a few moments.
            </p>
          </div>
        ) : (
          <div className="space-y-14">
            {/* Show batches in reverse order — highest batch = final delivery */}
            {[...batches].reverse().map((batch, idx) => {
              const batchImages = batch.items.filter((i) =>
                i.mimeType.startsWith("image/")
              );
              const batchVideos = batch.items.filter((i) =>
                i.mimeType.startsWith("video/")
              );
              const batchPdfs = batch.items.filter(
                (i) => i.mimeType === "application/pdf"
              );
              return (
                <div key={batch.name}>
                  <h3 className="text-lg font-semibold mb-5 text-white/80 flex items-center gap-3">
                    {formatBatchName(batch.name)}
                  </h3>

                  {/* Image Grid — uniform cards with contained images */}
                  {batchImages.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                      {batchImages.map((item, imgIdx) => {
                        // Use itemId as unique comment key to prevent same-name files
                        // in different folders from sharing comments
                        const commentKey = item.itemId || `${batch.name}::${item.name}`;
                        const assetCommentCount = commentCountMap.get(commentKey) ?? commentCountMap.get(item.name) ?? 0;
                        return (
                        <ImageLightbox
                          key={item.itemId || `${batch.name}-${item.name}`}
                          src={item.proxyUrl}
                          alt={item.name.replace(/\.[^.]+$/, "")}
                          previewId={preview.id}
                          assetName={commentKey}
                          allImages={batchImages.map((bi) => ({
                            src: bi.proxyUrl,
                            alt: bi.name.replace(/\.[^.]+$/, ""),
                            assetName: bi.itemId || `${batch.name}::${bi.name}`,
                          }))}
                          currentIndex={imgIdx}
                        >
                          <div className="group relative rounded-lg overflow-hidden bg-white/5 border border-white/10 hover:border-brand-flame/50 transition-colors">
                            <CommentCountBadge previewId={preview.id} assetName={commentKey} initialCount={assetCommentCount} />
                            <div className="aspect-[4/3] flex items-center justify-center bg-neutral-900 p-2">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={item.proxyUrl}
                                alt={item.name.replace(/\.[^.]+$/, "")}
                                loading="lazy"
                                className="max-w-full max-h-full object-contain"
                              />
                            </div>
                            <div className="px-3 py-2 bg-white/5 flex items-center justify-between gap-2">
                              <span className="text-xs text-white/50 truncate flex items-center gap-1.5">
                                {item.name.replace(/\.[^.]+$/, "")}
                                <CommentCountInline previewId={preview.id} assetName={commentKey} initialCount={assetCommentCount} />
                              </span>
                              <span className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[10px] text-white/25 tabular-nums">
                                  {item.width && item.height ? `${item.width}×${item.height}` : item.name.split(".").pop()?.toUpperCase()}
                                </span>
                                <a
                                  href={item.proxyUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-white/30 hover:text-white/60 transition-colors"
                                  aria-label={`Download ${item.name}`}
                                >
                                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="7 10 12 15 17 10" />
                                    <line x1="12" y1="15" x2="12" y2="3" />
                                  </svg>
                                </a>
                              </span>
                            </div>
                          </div>
                        </ImageLightbox>
                        );
                      })}
                    </div>
                  )}

                  {/* Video Players — Client Component that resolves fresh download URLs */}
                  {batchVideos.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      {batchVideos.map((item) => (
                        <div key={item.itemId} className="rounded-lg overflow-hidden bg-white/5 border border-white/10">
                          <VideoPlayer
                            proxyUrl={item.proxyUrl}
                            directUrl={item.directUrl}
                            mimeType={item.mimeType}
                            name={item.name}
                          />
                          <div className="px-3 py-2 flex items-center justify-between">
                            <span className="text-xs text-white/60 truncate">{item.name.replace(/\.[^.]+$/, "")}</span>
                            <a
                              href={item.proxyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`Download ${item.name}`}
                              className="text-xs text-white/40 hover:text-white/70 transition-colors shrink-0 ml-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-flame rounded"
                            >
                              Download
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* PDF Links — open in new tab via proxy with inline Content-Disposition */}
                  {batchPdfs.length > 0 && (
                    <div className="space-y-2">
                      {batchPdfs.map((item) => (
                        <a
                          key={item.itemId || item.name}
                          href={`${item.proxyUrl}&inline=1`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white/5 border border-white/10 hover:border-[var(--color-brand-flame)]/50 hover:bg-white/10 transition-all min-h-[44px]"
                        >
                          {/* PDF icon */}
                          <svg
                            className="w-5 h-5 text-[var(--color-brand-flame)] shrink-0"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                            <polyline points="10 9 9 9 8 9" />
                          </svg>
                          <span className="text-sm text-white/80 truncate flex-1">
                            {item.name}
                          </span>
                          <span className="text-xs text-white/30 shrink-0">
                            {formatFileSize(item.size)}
                          </span>
                          {/* External link icon */}
                          <svg
                            className="w-4 h-4 text-white/30 shrink-0"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                          </svg>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Download section */}
      {folderDownloadUrl && (
        <section className="max-w-6xl mx-auto px-6 pb-16">
          <div className="rounded-xl border border-white/10 bg-white/5 px-6 py-8 text-center">
            <p className="text-sm text-white/50 mb-4">
              Need to download all files or access the full project folder?
            </p>
            <a
              href={folderDownloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 min-h-[44px] rounded-lg bg-white text-black text-sm font-semibold hover:bg-white/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-flame focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
              Download project files
            </a>
          </div>
        </section>
      )}

      {/* Footer — simplified, cohérent with brand but not the full site nav */}
      <footer className="border-t border-white/10 mt-8">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/sarani-logo-white.png" alt="Sarani" className="h-6 w-auto opacity-50" />
            <span className="text-xs text-white/30">Creative Agency — 45 experts, 5 continents</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="https://sarani.studio" target="_blank" rel="noopener noreferrer" className="text-xs text-white/40 hover:text-white/60 transition-colors">sarani.studio</a>
            <a href="https://www.linkedin.com/company/sarani-studio/" target="_blank" rel="noopener noreferrer" aria-label="Sarani on LinkedIn" className="text-white/30 hover:text-white/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-flame rounded">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            </a>
            <a href="https://www.instagram.com/sarani.studio" target="_blank" rel="noopener noreferrer" aria-label="Sarani on Instagram" className="text-white/30 hover:text-white/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-flame rounded">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
