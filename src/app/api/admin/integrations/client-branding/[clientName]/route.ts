import { NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";
import { listDriveItems, type DriveItem } from "@/lib/integrations/sharepoint";
import { fetchWithCache } from "@/lib/integrations/cache";
import {
  SHAREPOINT_ASSETS_DRIVE_ID,
  ASSETS_CUSTOMERS_BASE_PATH,
  CACHE_TTL,
} from "@/lib/integrations/config";

// ─── Types ──────────────────────────────────────────────────────────────────

interface BrandingFile {
  id: string;
  name: string;
  size: number;
  lastModified: string;
  webUrl: string;
  mimeType: string | null;
}

interface BrandingResponse {
  clientName: string;
  folderName: string | null;
  files: BrandingFile[];
}

// Patterns to match guidelines / branding sub-folders (case-insensitive)
const BRANDING_FOLDER_PATTERNS = [
  /^01\.\s*guidelines/i,
  /^guidelines/i,
  /^branding/i,
  /^guidelines\s+and\s+branding/i,
  /^brand\s*guidelines/i,
  /^01\.\s*brand/i,
];

function isBrandingFolder(name: string): boolean {
  return BRANDING_FOLDER_PATTERNS.some((pattern) => pattern.test(name));
}

// ─── Route ──────────────────────────────────────────────────────────────────

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ clientName: string }> }
) {
  try {
    // Auth check
    const session = await getUserFromSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { clientName } = await params;
    const decodedName = decodeURIComponent(clientName);

    if (!decodedName.trim()) {
      return NextResponse.json(
        { error: "Client name is required." },
        { status: 400 }
      );
    }

    // Validate clientName — no path traversal
    if (/[/\\]/.test(decodedName) || decodedName.includes("..")) {
      return NextResponse.json(
        { error: "Invalid client name." },
        { status: 400 }
      );
    }

    const cacheKey = `sharepoint:branding:${decodedName.toLowerCase()}`;

    const result = await fetchWithCache<BrandingResponse>({
      cacheKey,
      source: "sharepoint",
      ttlSeconds: CACHE_TTL.sharepoint,
      fetcher: async () => {
        // 1. List all customer folders to find the matching one
        const customerFolders = await listDriveItems(
          SHAREPOINT_ASSETS_DRIVE_ID,
          ASSETS_CUSTOMERS_BASE_PATH
        );

        // Find the folder matching this client name (strip numeric prefix)
        const clientFolder = customerFolders.find((item) => {
          if (!item.folder) return false;
          const cleanName = item.name.replace(/^\d+\.\s*/, "").trim();
          return cleanName.toLowerCase() === decodedName.toLowerCase();
        });

        if (!clientFolder) {
          return {
            clientName: decodedName,
            folderName: null,
            files: [],
          };
        }

        // 2. List sub-folders inside the client folder
        const clientPath = `${ASSETS_CUSTOMERS_BASE_PATH}/${clientFolder.name}`;
        const subItems = await listDriveItems(
          SHAREPOINT_ASSETS_DRIVE_ID,
          clientPath
        );

        // 3. Find the branding/guidelines sub-folder
        const brandingFolder = subItems.find(
          (item) => item.folder && isBrandingFolder(item.name)
        );

        if (!brandingFolder) {
          return {
            clientName: decodedName,
            folderName: clientFolder.name,
            files: [],
          };
        }

        // 4. List files inside the branding folder
        const brandingPath = `${clientPath}/${brandingFolder.name}`;
        const brandingItems = await listDriveItems(
          SHAREPOINT_ASSETS_DRIVE_ID,
          brandingPath
        );

        const files: BrandingFile[] = brandingItems
          .filter(
            (item): item is DriveItem & { file: { mimeType: string } } =>
              !!item.file && !item.name.startsWith("~$")
          )
          .map((item) => ({
            id: item.id,
            name: item.name,
            size: item.size,
            lastModified: item.lastModifiedDateTime,
            webUrl: item.webUrl,
            mimeType: item.file.mimeType,
          }));

        return {
          clientName: decodedName,
          folderName: `${clientFolder.name}/${brandingFolder.name}`,
          files,
        };
      },
    });

    return NextResponse.json({
      status: result.stale ? "stale" : "live",
      cached: result.cached,
      fetchedAt: result.fetchedAt.toISOString(),
      data: result.data,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("environment variable is not set")
    ) {
      return NextResponse.json(
        {
          status: "unavailable",
          cached: false,
          error: "SharePoint integration is not configured.",
          data: null,
        },
        { status: 200 }
      );
    }

    console.error("Client branding error:", error);
    return NextResponse.json(
      {
        status: "unavailable",
        cached: false,
        error: "Failed to fetch branding files.",
        data: null,
      },
      { status: 200 }
    );
  }
}
