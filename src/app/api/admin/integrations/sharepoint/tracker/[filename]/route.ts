import { NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";
import {
  getDriveItemByPath,
  readExcelUsedRange,
  SharePointApiError,
} from "@/lib/integrations/sharepoint";
import { fetchWithCache, logSync } from "@/lib/integrations/cache";
import {
  SHAREPOINT_TRACKERS_DRIVE_ID,
  TRACKERS_BASE_PATH,
  CACHE_TTL,
  getMappingByTrackerFilename,
} from "@/lib/integrations/config";

interface TrackerData {
  filename: string;
  clientMapping: string | null;
  headers: string[];
  rows: (string | number | boolean | null)[][];
  rowCount: number;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    // Auth check
    const session = await getUserFromSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { filename } = await params;
    const decodedFilename = decodeURIComponent(filename);

    // Validate filename — must be a safe .xlsx filename with no path separators
    if (!/^[^/\\]+\.xlsx$/.test(decodedFilename) || decodedFilename.includes("..")) {
      return NextResponse.json(
        { error: "Invalid filename. Must be a safe .xlsx filename." },
        { status: 400 }
      );
    }

    const mapping = getMappingByTrackerFilename(decodedFilename);
    const cacheKey = `sharepoint:tracker_data:${decodedFilename}`;

    const result = await fetchWithCache<TrackerData>({
      cacheKey,
      source: "sharepoint",
      ttlSeconds: CACHE_TTL.sharepoint,
      fetcher: async () => {
        // Resolve the file path to an item ID
        const filePath = `${TRACKERS_BASE_PATH}/${decodedFilename}`;
        const item = await getDriveItemByPath(
          SHAREPOINT_TRACKERS_DRIVE_ID,
          filePath
        );

        // Read the first sheet's used range
        // Most tracker files use "Sheet1" or the first worksheet
        // Graph API defaults to the first sheet if the name doesn't match
        let rangeData;
        try {
          rangeData = await readExcelUsedRange(
            SHAREPOINT_TRACKERS_DRIVE_ID,
            item.id,
            "Sheet1",
          );
        } catch {
          // Try common French worksheet names as fallback
          try {
            rangeData = await readExcelUsedRange(
              SHAREPOINT_TRACKERS_DRIVE_ID,
              item.id,
              "Feuil1",
            );
          } catch {
            // Last resort: try "Feuille1"
            rangeData = await readExcelUsedRange(
              SHAREPOINT_TRACKERS_DRIVE_ID,
              item.id,
              "Feuille1",
            );
          }
        }

        const allRows = rangeData.values;
        if (allRows.length === 0) {
          return {
            filename: decodedFilename,
            clientMapping: mapping?.clickupSpaceName ?? null,
            headers: [],
            rows: [],
            rowCount: 0,
          };
        }

        // First row = headers, rest = data rows
        const headers = allRows[0].map((h) =>
          h !== null && h !== undefined ? String(h) : ""
        );
        const dataRows = allRows.slice(1).filter((row) =>
          // Skip fully empty rows
          row.some((cell) => cell !== null && cell !== undefined && cell !== "")
        );

        await logSync({
          source: "sharepoint",
          action: "read_tracker",
          entityId: decodedFilename,
          payload: {
            rowCount: dataRows.length,
            columnCount: headers.length,
          },
        });

        return {
          filename: decodedFilename,
          clientMapping: mapping?.clickupSpaceName ?? null,
          headers,
          rows: dataRows,
          rowCount: dataRows.length,
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

    if (error instanceof SharePointApiError) {
      const isNotFound = error.statusCode === 404;

      await logSync({
        source: "sharepoint",
        action: "read_tracker",
        status: "error",
        error: error.message,
      }).catch(() => {});

      return NextResponse.json(
        {
          status: "unavailable",
          cached: false,
          error: isNotFound
            ? "Tracker file not found. Check SharePoint configuration."
            : `SharePoint API error: ${error.statusCode}`,
          data: null,
        },
        { status: isNotFound ? 404 : 200 }
      );
    }

    console.error("SharePoint tracker read error:", error);
    return NextResponse.json(
      {
        status: "unavailable",
        cached: false,
        error: "Unexpected error reading tracker data.",
        data: null,
      },
      { status: 200 }
    );
  }
}
