import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";
import { getPublicSharingLink } from "@/lib/integrations/sharepoint";

/**
 * POST /api/admin/integrations/sharepoint/share-link
 * Converts a direct SharePoint URL to an anonymous "Anyone" sharing link.
 * Returns the sharing link URL that works without sign-in.
 */
export async function POST(request: NextRequest) {
  const session = await getUserFromSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { url } = body as { url?: string };

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "Missing required field: url" },
        { status: 400 }
      );
    }

    // Only process SharePoint/OneDrive URLs
    if (!url.includes("sharepoint.com") && !url.includes("onedrive.com") && !url.includes("1drv.ms")) {
      return NextResponse.json(
        { error: "URL must be a SharePoint or OneDrive link" },
        { status: 400 }
      );
    }

    const sharingLink = await getPublicSharingLink(url);

    return NextResponse.json({
      originalUrl: url,
      sharingLink,
      converted: sharingLink !== url,
    });
  } catch (error) {
    console.error("[ShareLink] Error creating sharing link:", error);
    return NextResponse.json(
      { error: "Failed to create sharing link" },
      { status: 500 }
    );
  }
}
