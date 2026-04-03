import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";
import {
  listDriveItems,
  createAnonymousSharingLink,
  resolveSharePointUrl,
  getDriveItemByPath,
  graphFetch,
} from "@/lib/integrations/sharepoint";
import {
  SHAREPOINT_ASSETS_DRIVE_ID,
  ASSETS_CUSTOMERS_BASE_PATH,
  getMappingBySpaceName,
} from "@/lib/integrations/config";
import { checkRateLimit } from "@/lib/rate-limit";

interface DriveItemChild {
  id: string;
  name: string;
  size: number;
  lastModifiedDateTime: string;
  webUrl: string;
  folder?: { childCount: number };
  file?: { mimeType: string };
  thumbnails?: Array<{
    small?: { url: string };
    medium?: { url: string };
  }>;
  "@microsoft.graph.downloadUrl"?: string;
}

type ResolvedItem = { id: string; name?: string; parentReference?: { driveId: string } };

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Format drive items into a standard response shape. */
function formatResponse(items: DriveItemChild[], opts: { path: string; driveId: string; resolvedFrom: string }) {
  const folders = items
    .filter((i) => i.folder)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((i) => ({
      name: i.name, id: i.id, childCount: i.folder?.childCount ?? 0,
      lastModified: i.lastModifiedDateTime, webUrl: i.webUrl,
    }));
  const files = items
    .filter((i) => i.file)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((i) => ({
      name: i.name, id: i.id, size: i.size, mimeType: i.file?.mimeType ?? "",
      lastModified: i.lastModifiedDateTime, webUrl: i.webUrl,
      thumbnailUrl: i.thumbnails?.[0]?.medium?.url ?? i.thumbnails?.[0]?.small?.url ?? null,
    }));
  return NextResponse.json({
    path: opts.path, folders, files,
    totalFolders: folders.length, totalFiles: files.length,
    driveId: opts.driveId, resolvedFrom: opts.resolvedFrom,
  });
}

/** List children of a resolved item and return formatted response. */
async function listAndRespond(item: ResolvedItem, resolvedFrom: string, fallbackName?: string) {
  const driveId = item.parentReference?.driveId ?? SHAREPOINT_ASSETS_DRIVE_ID;
  const children = await graphFetch<{ value: DriveItemChild[] }>(
    `/drives/${driveId}/items/${item.id}/children?$expand=thumbnails`
  );
  return formatResponse(children.value ?? [], {
    path: item.name ?? fallbackName ?? "Project folder",
    driveId, resolvedFrom,
  });
}

/**
 * Resolve a folder by name (not URL). Searches:
 * 1. Inside the client's SharePoint customer folder (if clientName provided)
 * 2. At the drive root
 * 3. Via Graph search API
 */
async function resolveByFolderName(folderName: string, clientName?: string | null): Promise<ResolvedItem | null> {
  // Try 1: Client folder path
  if (clientName) {
    const mapping = getMappingBySpaceName(clientName);
    if (mapping) {
      const clientPath = `${ASSETS_CUSTOMERS_BASE_PATH}/${mapping.sharepointCustomerFolder}/${folderName}`;
      try {
        const item = await getDriveItemByPath(SHAREPOINT_ASSETS_DRIVE_ID, clientPath);
        if (item?.id) return { ...item, parentReference: { driveId: SHAREPOINT_ASSETS_DRIVE_ID } };
      } catch { /* path not found */ }
    }
  }

  // Try 2: Drive root
  try {
    const item = await getDriveItemByPath(SHAREPOINT_ASSETS_DRIVE_ID, `/${folderName}`);
    if (item?.id) return { ...item, parentReference: { driveId: SHAREPOINT_ASSETS_DRIVE_ID } };
  } catch { /* not found */ }

  // Try 3: Graph search
  try {
    const searchResult = await graphFetch<{ value: Array<{ id: string; name: string; folder?: unknown; parentReference?: { driveId: string } }> }>(
      `/drives/${SHAREPOINT_ASSETS_DRIVE_ID}/root/search(q='${encodeURIComponent(folderName)}')?$top=5`
    );
    const match = searchResult?.value?.find(
      (item) => item.folder && item.name.toLowerCase() === folderName.toLowerCase()
    );
    if (match) return { id: match.id, name: match.name, parentReference: { driveId: SHAREPOINT_ASSETS_DRIVE_ID } };
  } catch { /* search failed */ }

  return null;
}

/**
 * GET /api/admin/integrations/sharepoint/folders?client=TikTok
 * GET /api/admin/integrations/sharepoint/folders?client=TikTok&path=05.%20TikTok/ProjectName
 * GET /api/admin/integrations/sharepoint/folders?url=https://xxx.sharepoint.com/...
 *
 * Four modes:
 * 0. ?folderId= — drill-down into a specific subfolder by ID
 * 1. ?url= — resolve a direct SharePoint URL (or folder name) and list its contents
 * 2. ?client=&path= — drill-down into a specific subfolder by path
 * 3. ?client= — list project folders inside the client's SP directory
 */
export async function GET(request: NextRequest) {
  const session = await getUserFromSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!checkRateLimit("sp-folders", 30, 60_000)) {
    return NextResponse.json(
      { error: "Rate limited. Try again in a minute." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  const directUrl = request.nextUrl.searchParams.get("url");
  const folderId = request.nextUrl.searchParams.get("folderId");
  const client = request.nextUrl.searchParams.get("client");
  const subPath = request.nextUrl.searchParams.get("path");

  if (!directUrl && !folderId && !client) {
    return NextResponse.json(
      { error: "Missing required query parameter: client, url, or folderId" },
      { status: 400 }
    );
  }

  try {
    // ─── Mode 0: Drill-down by folder ID (for subfolder navigation) ───
    if (folderId) {
      const children = await graphFetch<{ value: DriveItemChild[] }>(
        `/drives/${SHAREPOINT_ASSETS_DRIVE_ID}/items/${folderId}/children?$expand=thumbnails`
      );
      return formatResponse(children.value ?? [], {
        path: "subfolder", driveId: SHAREPOINT_ASSETS_DRIVE_ID, resolvedFrom: "folderId",
      });
    }

    // ─── Mode 1: Direct SharePoint URL or folder name ─────────────────
    if (directUrl) {
      // Strip sp-folder: prefix if present
      const SP_FOLDER_PREFIX = "sp-folder:";
      const cleanUrl = directUrl.startsWith(SP_FOLDER_PREFIX)
        ? directUrl.slice(SP_FOLDER_PREFIX.length).trim()
        : directUrl.trim();

      // If it's not a URL, resolve as folder name
      const isUrl = cleanUrl.startsWith("http") || cleanUrl.includes("sharepoint.com") || cleanUrl.includes("1drv.ms");
      if (!isUrl) {
        const resolved = await resolveByFolderName(cleanUrl, client);
        if (resolved) {
          return listAndRespond(resolved, "folder-name", cleanUrl);
        }
        console.error("[SP Folders] Folder not found by name:", cleanUrl);
        return NextResponse.json(
          { error: `Folder not found: ${cleanUrl}. Try browsing the client folders manually.` },
          { status: 404 }
        );
      }

      // It's a URL — resolve via Graph APIs
      // Try 1: resolve via Graph sharing API (works for most URLs)
      let resolvedItem = await resolveSharePointUrl(cleanUrl);

      // Try 2: if sharing API fails, extract path from URL and try getDriveItemByPath on hardcoded drive
      if (!resolvedItem?.id && cleanUrl.includes("sharepoint.com")) {
        try {
          const urlObj = new URL(cleanUrl);
          const decodedPath = decodeURIComponent(urlObj.pathname);
          const pathMatch = decodedPath.match(/\/(?:Shared\s*Documents|Documents)\/(.*)/i);
          if (pathMatch) {
            const spPath = "/Documents/" + pathMatch[1].replace(/\/$/, "");
            const byPath = await getDriveItemByPath(SHAREPOINT_ASSETS_DRIVE_ID, spPath);
            if (byPath?.id) {
              resolvedItem = { ...byPath, parentReference: { driveId: SHAREPOINT_ASSETS_DRIVE_ID } } as typeof resolvedItem;
            }
          }
        } catch {
          // Path-based resolution on hardcoded drive failed — Try 3 below
        }
      }

      // Try 3: Extract site from URL, look up the correct drive dynamically
      if (!resolvedItem?.id && cleanUrl.includes("sharepoint.com")) {
        try {
          const urlObj = new URL(cleanUrl);
          const hostname = urlObj.hostname;
          const siteMatch = urlObj.pathname.match(/\/(sites\/[^/]+)/);
          if (siteMatch) {
            const sitePath = siteMatch[1];
            const site = await graphFetch<{ id: string }>(`/sites/${hostname}:/${sitePath}`);
            if (site?.id) {
              const drives = await graphFetch<{ value: Array<{ id: string; name: string; driveType: string }> }>(
                `/sites/${site.id}/drives`
              );
              const docDrive = drives?.value?.find(
                (d) => d.name === "Documents" || d.driveType === "documentLibrary"
              );
              if (docDrive) {
                const decodedPath = decodeURIComponent(urlObj.pathname);
                const pathMatch = decodedPath.match(/\/(?:Shared\s*Documents|Documents)\/(.*)/i);
                if (pathMatch) {
                  const spPath = "/" + pathMatch[1].replace(/\/$/, "");
                  const byPath = await getDriveItemByPath(docDrive.id, spPath);
                  if (byPath?.id) {
                    resolvedItem = { ...byPath, parentReference: { driveId: docDrive.id } } as typeof resolvedItem;
                  }
                } else {
                  // URL has no recognizable document library path — try last segment as folder name
                  const urlParts = decodedPath.split("/").filter(Boolean);
                  const lastPart = urlParts[urlParts.length - 1];
                  if (lastPart && lastPart !== sitePath.split("/")[1]) {
                    try {
                      const byPath = await getDriveItemByPath(docDrive.id, "/" + lastPart);
                      if (byPath?.id) {
                        resolvedItem = { ...byPath, parentReference: { driveId: docDrive.id } } as typeof resolvedItem;
                      }
                    } catch { /* Last segment match failed */ }
                  }
                }
              }
            }
          }
        } catch { /* Site-based resolution failed */ }
      }

      // Try 4: Last resort — extract folder name from URL and search by name
      if (!resolvedItem?.id) {
        try {
          const urlObj = new URL(cleanUrl);
          const decodedPath = decodeURIComponent(urlObj.pathname);
          const segments = decodedPath.split("/").filter(Boolean);
          const lastSegment = segments[segments.length - 1];
          if (lastSegment && lastSegment.length > 3) {
            const resolved = await resolveByFolderName(lastSegment, client);
            if (resolved) {
              resolvedItem = resolved as typeof resolvedItem;
            }
          }
        } catch { /* URL parsing failed */ }
      }

      if (!resolvedItem?.id || !resolvedItem?.parentReference?.driveId) {
        console.error("[SP Folders] Could not resolve SharePoint URL:", cleanUrl);
        return NextResponse.json(
          { error: `Could not resolve SharePoint URL: ${cleanUrl.substring(0, 100)}${cleanUrl.length > 100 ? "..." : ""}` },
          { status: 404 }
        );
      }

      return listAndRespond(resolvedItem, "url");
    }

    // ─── Mode 2 & 3: Client-based path resolution ────────────────────
    let folderPath: string;

    if (subPath) {
      folderPath = `${ASSETS_CUSTOMERS_BASE_PATH}/${subPath}`;
    } else {
      const mapping = getMappingBySpaceName(client!);
      if (!mapping) {
        return NextResponse.json(
          { error: `No SharePoint mapping found for client "${client}"` },
          { status: 404 }
        );
      }
      folderPath = `${ASSETS_CUSTOMERS_BASE_PATH}/${mapping.sharepointCustomerFolder}`;
    }

    const items = await listDriveItems(SHAREPOINT_ASSETS_DRIVE_ID, folderPath);

    // Return folders and files separately, folders first
    const folders = items
      .filter((item) => item.folder)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((item) => ({
        name: item.name,
        id: item.id,
        childCount: item.folder?.childCount ?? 0,
        lastModified: item.lastModifiedDateTime,
        webUrl: item.webUrl,
      }));

    const files = items
      .filter((item) => item.file)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((item) => ({
        name: item.name,
        id: item.id,
        size: item.size,
        mimeType: item.file?.mimeType ?? "",
        lastModified: item.lastModifiedDateTime,
        webUrl: item.webUrl,
      }));

    return NextResponse.json({
      path: folderPath.replace(ASSETS_CUSTOMERS_BASE_PATH + "/", ""),
      folders,
      files,
      totalFolders: folders.length,
      totalFiles: files.length,
    });
  } catch (error) {
    console.error("[SP Folders] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("404") || message.includes("itemNotFound")) {
      return NextResponse.json(
        { error: "Folder not found on SharePoint", path: client },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Failed to list SharePoint folders" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/integrations/sharepoint/folders
 * Generate an anonymous "Anyone" sharing link for a specific SP folder.
 * Body: { folderId: string }
 */
export async function POST(request: NextRequest) {
  const session = await getUserFromSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!checkRateLimit("sp-share-link", 20, 60_000)) {
    return NextResponse.json(
      { error: "Rate limited." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  try {
    const body = await request.json();
    const { folderId } = body as { folderId?: string };

    if (!folderId || typeof folderId !== "string") {
      return NextResponse.json(
        { error: "Missing required field: folderId" },
        { status: 400 }
      );
    }

    const sharingLink = await createAnonymousSharingLink(
      SHAREPOINT_ASSETS_DRIVE_ID,
      folderId
    );

    if (!sharingLink) {
      return NextResponse.json(
        { error: "Failed to create sharing link. Check SharePoint permissions." },
        { status: 502 }
      );
    }

    return NextResponse.json({ sharingLink });
  } catch (error) {
    console.error("[SP Share] Error:", error);
    return NextResponse.json(
      { error: "Failed to create sharing link" },
      { status: 500 }
    );
  }
}
