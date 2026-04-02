/**
 * Public project presentation page.
 * SSR with cache headers for ISR-like behavior (revalidate 300s).
 * Dark-themed (Sarani brand: bg-black, text-white, accent Flame).
 */
import { Metadata } from "next";
import Image from "next/image";
import ImageLightbox from "@/components/ui/ImageLightbox";
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
]);

// Folders to SKIP when scanning for deliverables
const SKIP_FOLDER_NAMES = new Set([
  "supporting files",
  "rework",
  "00. brief",
  "brief",
  "source files",
  "sources",
  "assets source",
  "archive",
  "old",
  "template",
  "templates",
]);

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
    const data = await graphFetch<{ value: Array<{
      id: string;
      name: string;
      size: number;
      file?: { mimeType: string };
      folder?: { childCount: number };
      webUrl: string;
      "@microsoft.graph.downloadUrl"?: string;
    }> }>(`/drives/${driveId}/items/${folderId}/children`);

    const items = data.value ?? [];

    // Separate folders (batch subfolders) and files (direct assets)
    const subfolders = items
      .filter((item) => item.folder && !SKIP_FOLDER_NAMES.has(item.name.toLowerCase().trim()))
      .sort((a, b) => naturalSort(a.name, b.name));

    const directFiles = items
      .filter((item) => item.file && ALLOWED_MIMETYPES.has(item.file.mimeType))
      .map((item) => ({
        name: item.name,
        webUrl: item["@microsoft.graph.downloadUrl"] ?? item.webUrl,
        mimeType: item.file!.mimeType,
        size: item.size,
      }));

    const batches: BatchGroup[] = [];

    // If there are subfolders, treat each as a batch and list its files
    for (const folder of subfolders) {
      try {
        const subData = await graphFetch<{ value: Array<{
          name: string;
          size: number;
          file?: { mimeType: string };
          webUrl: string;
          "@microsoft.graph.downloadUrl"?: string;
        }> }>(`/drives/${driveId}/items/${folder.id}/children`);

        const batchFiles = (subData.value ?? [])
          .filter((item) => item.file && ALLOWED_MIMETYPES.has(item.file.mimeType))
          .sort((a, b) => {
            const aIsImage = a.file!.mimeType.startsWith("image/");
            const bIsImage = b.file!.mimeType.startsWith("image/");
            if (aIsImage && !bIsImage) return -1;
            if (!aIsImage && bIsImage) return 1;
            return a.name.localeCompare(b.name);
          })
          .map((item) => ({
            name: item.name,
            webUrl: item["@microsoft.graph.downloadUrl"] ?? item.webUrl,
            mimeType: item.file!.mimeType,
            size: item.size,
          }));

        if (batchFiles.length > 0) {
          batches.push({ name: folder.name, items: batchFiles });
        }
      } catch {
        // Skip unreadable subfolders
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
      const batchPath = `${assetRoot}/${batchFolder.name}`;
      const batchItems = await listDriveItems(
        SHAREPOINT_ASSETS_DRIVE_ID,
        batchPath
      );

      const filteredItems: BatchItem[] = batchItems
        .filter(
          (item) => item.file && ALLOWED_MIMETYPES.has(item.file.mimeType)
        )
        .sort((a, b) => {
          const aIsImage = a.file!.mimeType.startsWith("image/");
          const bIsImage = b.file!.mimeType.startsWith("image/");
          if (aIsImage && !bIsImage) return -1;
          if (!aIsImage && bIsImage) return 1;
          return a.name.localeCompare(b.name);
        })
        .map((item) => ({
          name: item.name,
          // Use the pre-authenticated download URL if available (expires ~1h),
          // fall back to webUrl (requires auth — won't display on public page)
          webUrl: item["@microsoft.graph.downloadUrl"] ?? item.webUrl,
          mimeType: item.file!.mimeType,
          size: item.size,
        }));

      if (filteredItems.length > 0) {
        batches.push({ name: batchFolder.name, items: filteredItems });
      }
    }

    // If no batch subfolders found, scan the asset root directly for images
    if (batches.length === 0) {
      console.log(`[share-page] No subfolders with images found, scanning root for direct files`);
      const rootImages = assetRootItems
        .filter((item) => item.file && ALLOWED_MIMETYPES.has(item.file.mimeType))
        .map((item) => ({
          name: item.name,
          webUrl: item["@microsoft.graph.downloadUrl"] ?? item.webUrl,
          mimeType: item.file!.mimeType,
          size: item.size,
        }));
      if (rootImages.length > 0) {
        batches.push({ name: "Assets", items: rootImages });
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

  // If the PM selected a specific SP folder (spFolderId), load assets directly from it.
  // Otherwise, fall back to the old fuzzy-match approach.
  let { batches, error: spError } = preview.spFolderId
    ? await fetchBatchesByFolderId(
        preview.spFolderId,
        preview.spDriveId || SHAREPOINT_ASSETS_DRIVE_ID
      )
    : await fetchBatches(preview.clientName, preview.projectName);

  // If PM selected specific assets, filter batches to only show those
  if (preview.selectedAssets) {
    try {
      const selected: Array<{ name: string }> = JSON.parse(preview.selectedAssets);
      const selectedNames = new Set(selected.map((s) => s.name.toLowerCase()));
      batches = batches
        .map((b) => ({
          ...b,
          items: b.items.filter((item) => selectedNames.has(item.name.toLowerCase())),
        }))
        .filter((b) => b.items.length > 0);
    } catch {
      // Invalid JSON — show all assets
    }
  }

  const images = batches.flatMap((b) =>
    b.items.filter((i) => i.mimeType.startsWith("image/"))
  );
  const totalAssets = batches.reduce((sum, b) => sum + b.items.length, 0);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/sarani-logo-white-sm.png"
            alt="Sarani"
            width={120}
            height={57}
            className="h-8 w-auto"
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
              {totalAssets} asset{totalAssets !== 1 ? "s" : ""}
            </span>
          )}
          {batches.length > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-white/30" />
              {batches.length} delivery{batches.length !== 1 ? " batches" : ""}
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

        {preview.sharepointLink && (
          <a
            href={preview.sharepointLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-flame focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            Access project files
          </a>
        )}
      </section>

      {/* Creative Proposal */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40 mb-10">
          Creative Proposal
        </h2>

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
              const isFinal = idx === 0; // First after reverse = highest batch

              return (
                <div key={batch.name}>
                  <h3 className="text-lg font-semibold mb-5 text-white/80 flex items-center gap-3">
                    {formatBatchName(batch.name)}
                    {isFinal && (
                      <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-brand-flame/20 text-brand-flame">
                        Final
                      </span>
                    )}
                  </h3>

                  {/* Image Grid */}
                  {batchImages.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-4">
                      {batchImages.map((item) => (
                        <ImageLightbox
                          key={item.webUrl}
                          src={item.webUrl}
                          alt={item.name}
                        >
                          <div className="group relative aspect-video rounded-lg overflow-hidden bg-white/5 border border-white/10 hover:border-[var(--color-brand-flame)]/50 transition-colors">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={item.webUrl}
                              alt={item.name}
                              loading="lazy"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                              <span className="text-xs text-white/80 truncate">
                                {item.name}
                              </span>
                            </div>
                          </div>
                        </ImageLightbox>
                      ))}
                    </div>
                  )}

                  {/* Video Players */}
                  {batchVideos.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      {batchVideos.map((item) => (
                        <div key={item.webUrl} className="rounded-lg overflow-hidden bg-white/5 border border-white/10">
                          <video
                            controls
                            preload="metadata"
                            className="w-full aspect-video bg-black"
                            playsInline
                          >
                            <source src={item.webUrl} type={item.mimeType} />
                            Your browser does not support video playback.
                          </video>
                          <div className="px-3 py-2 flex items-center justify-between">
                            <span className="text-xs text-white/60 truncate">{item.name.replace(/\.[^.]+$/, "")}</span>
                            <a
                              href={item.webUrl}
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

                  {/* PDF Links */}
                  {batchPdfs.length > 0 && (
                    <div className="space-y-2">
                      {batchPdfs.map((item) => (
                        <a
                          key={item.webUrl}
                          href={item.webUrl}
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

      {/* Footer */}
      <footer className="border-t border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-center gap-3">
          <span className="text-xs text-white/30">Sarani Studio — Creative Agency</span>
          <span className="text-white/10">·</span>
          <a
            href="https://sarani.studio"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-white/40 hover:text-white/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-flame focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded"
          >
            sarani.studio
          </a>
        </div>
      </footer>
    </div>
  );
}
