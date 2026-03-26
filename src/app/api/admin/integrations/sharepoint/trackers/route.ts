import { NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";
import { listDriveItems } from "@/lib/integrations/sharepoint";
import { fetchWithCache, logSync } from "@/lib/integrations/cache";
import {
  SHAREPOINT_TRACKERS_DRIVE_ID,
  TRACKERS_BASE_PATH,
  CACHE_TTL,
} from "@/lib/integrations/config";
import { handleIntegrationError } from "@/lib/integrations/error-handler";

interface TrackerFileInfo {
  id: string;
  name: string;
  size: number;
  lastModified: string;
  webUrl: string;
}

export async function GET() {
  try {
    // Auth check
    const session = await getUserFromSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await fetchWithCache<TrackerFileInfo[]>({
      cacheKey: "sharepoint:tracker_files_list",
      source: "sharepoint",
      ttlSeconds: CACHE_TTL.sharepoint,
      fetcher: async () => {
        const items = await listDriveItems(
          SHAREPOINT_TRACKERS_DRIVE_ID,
          TRACKERS_BASE_PATH
        );

        // Filter to only .xlsx files (exclude folders and sub-folders)
        const excelFiles = items
          .filter(
            (item) =>
              item.file &&
              item.name.endsWith(".xlsx") &&
              !item.name.startsWith("~$") // Exclude temp lock files
          )
          .map(
            (item): TrackerFileInfo => ({
              id: item.id,
              name: item.name,
              size: item.size,
              lastModified: item.lastModifiedDateTime,
              webUrl: item.webUrl,
            })
          );

        await logSync({
          source: "sharepoint",
          action: "list_tracker_files",
          payload: { fileCount: excelFiles.length },
        });

        return excelFiles;
      },
    });

    return NextResponse.json({
      status: result.stale ? "stale" : "live",
      cached: result.cached,
      fetchedAt: result.fetchedAt.toISOString(),
      data: result.data,
    });
  } catch (error) {
    // A-03: Log before delegating to centralized error handler
    await logSync({
      source: "sharepoint",
      action: "list_tracker_files",
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    }).catch(() => {});

    return handleIntegrationError(error, { source: "sharepoint" });
  }
}
