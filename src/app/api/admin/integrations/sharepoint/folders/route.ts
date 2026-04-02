import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";
import { listDriveItems, createAnonymousSharingLink } from "@/lib/integrations/sharepoint";
import {
  SHAREPOINT_ASSETS_DRIVE_ID,
  ASSETS_CUSTOMERS_BASE_PATH,
  getMappingBySpaceName,
} from "@/lib/integrations/config";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * GET /api/admin/integrations/sharepoint/folders?client=TikTok
 * Lists project folders inside a client's SharePoint directory.
 * Used by the Share modal to let the PM pick the right folder.
 *
 * GET /api/admin/integrations/sharepoint/folders?client=TikTok&path=05.%20TikTok/ProjectName
 * Lists subfolders inside a specific path (for drill-down navigation).
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

  const client = request.nextUrl.searchParams.get("client");
  const subPath = request.nextUrl.searchParams.get("path");

  if (!client) {
    return NextResponse.json(
      { error: "Missing required query parameter: client" },
      { status: 400 }
    );
  }

  try {
    let folderPath: string;

    if (subPath) {
      // Drill-down: list contents of a specific subfolder
      folderPath = `${ASSETS_CUSTOMERS_BASE_PATH}/${subPath}`;
    } else {
      // Root: list project folders inside the client's SP directory
      const mapping = getMappingBySpaceName(client);
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
