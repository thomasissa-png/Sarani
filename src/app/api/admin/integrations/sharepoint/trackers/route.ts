import { NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";
import {
  listDriveItems,
  SharePointApiError,
} from "@/lib/integrations/sharepoint";
import { fetchWithCache, logSync } from "@/lib/integrations/cache";
import {
  SHAREPOINT_TRACKERS_DRIVE_ID,
  TRACKERS_BASE_PATH,
  CACHE_TTL,
} from "@/lib/integrations/config";

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

    if (error instanceof SharePointApiError) {
      await logSync({
        source: "sharepoint",
        action: "list_tracker_files",
        status: "error",
        error: error.message,
      }).catch(() => {});

      return NextResponse.json(
        {
          status: "unavailable",
          cached: false,
          error: `SharePoint API error: ${error.statusCode}`,
          data: null,
        },
        { status: 200 }
      );
    }

    console.error("SharePoint trackers error:", error);
    return NextResponse.json(
      {
        status: "unavailable",
        cached: false,
        error: "Unexpected error fetching tracker list.",
        data: null,
      },
      { status: 200 }
    );
  }
}
