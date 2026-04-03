import { NextRequest, NextResponse } from "next/server";
import { graphFetch } from "@/lib/integrations/sharepoint";
import { SHAREPOINT_ASSETS_DRIVE_ID } from "@/lib/integrations/config";

/**
 * GET /api/project-assets/[itemId]?driveId=xxx
 * Public proxy — redirects to a fresh SharePoint download URL.
 *
 * The @microsoft.graph.downloadUrl token expires after ~1 hour.
 * This endpoint re-fetches it on demand so presentation pages
 * always serve fresh image/video URLs.
 *
 * Response: 302 redirect to the download URL (cached 5 min by browsers).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const { itemId } = await params;
  const driveId = request.nextUrl.searchParams.get("driveId") || SHAREPOINT_ASSETS_DRIVE_ID;

  try {
    const item = await graphFetch<{
      "@microsoft.graph.downloadUrl"?: string;
      webUrl?: string;
    }>(`/drives/${driveId}/items/${itemId}`);

    const downloadUrl = item["@microsoft.graph.downloadUrl"];
    if (!downloadUrl) {
      // Fallback to webUrl (requires auth — won't display directly)
      return NextResponse.json({ error: "No download URL available" }, { status: 404 });
    }

    // 302 redirect to the fresh download URL
    // Cache for 5 minutes (URL is valid for ~1h, but refresh often enough)
    return NextResponse.redirect(downloadUrl, {
      status: 302,
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    });
  } catch (error) {
    console.error(`[Asset Proxy] Error fetching item ${itemId}:`, error);
    return NextResponse.json({ error: "Failed to load asset" }, { status: 502 });
  }
}
