import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { caseStudyCandidates } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { UUID_REGEX } from "@/lib/rate-limit";
import {
  graphFetch,
  resolveSharePointUrl,
  type DriveItem,
} from "@/lib/integrations/sharepoint";

// ─── Types ────────────────────────────────────────────────────────────────

interface ThumbnailSet {
  id: string;
  large?: { url: string; width: number; height: number };
  medium?: { url: string; width: number; height: number };
  small?: { url: string; width: number; height: number };
}

interface VisualItem {
  id: string;
  name: string;
  thumbnailUrl: string;
  downloadUrl: string;
}

const IMAGE_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg",
  ".bmp",
  ".tiff",
]);

const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".avi", ".webm"]);

function isVisualFile(name: string): boolean {
  const ext = name.toLowerCase().slice(name.lastIndexOf("."));
  return IMAGE_EXTENSIONS.has(ext) || VIDEO_EXTENSIONS.has(ext);
}

// ─── GET handler ──────────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    // 1. Fetch candidate to get SharePoint folder URL
    const [candidate] = await db
      .select({
        sharePointFolderUrl: caseStudyCandidates.sharePointFolderUrl,
        clientName: caseStudyCandidates.clientName,
      })
      .from(caseStudyCandidates)
      .where(eq(caseStudyCandidates.id, id))
      .limit(1);

    if (!candidate) {
      return NextResponse.json(
        { error: "Candidate not found" },
        { status: 404 }
      );
    }

    if (!candidate.sharePointFolderUrl) {
      return NextResponse.json({
        visuals: [],
        message: "No SharePoint folder linked to this candidate",
      });
    }

    // 2. Resolve the SharePoint URL to a drive item
    const folderItem = await resolveSharePointUrl(
      candidate.sharePointFolderUrl
    );

    if (!folderItem || !folderItem.parentReference?.driveId) {
      return NextResponse.json({
        visuals: [],
        message:
          "Could not resolve SharePoint folder. The URL may be invalid or inaccessible.",
      });
    }

    const driveId = folderItem.parentReference.driveId;
    const folderId = folderItem.id;

    // 3. List children of the folder (files + subfolders)
    const children = await graphFetch<{ value: DriveItem[] }>(
      `/drives/${driveId}/items/${folderId}/children?$top=100&$select=id,name,size,webUrl,file,folder,@microsoft.graph.downloadUrl`
    );

    // 4. Filter visual files and fetch thumbnails
    const visualFiles = children.value.filter(
      (item) => item.file && isVisualFile(item.name)
    );

    const visuals: VisualItem[] = [];

    for (const file of visualFiles.slice(0, 20)) {
      // Fetch thumbnail for each file
      let thumbnailUrl = "";
      try {
        const thumbs = await graphFetch<{ value: ThumbnailSet[] }>(
          `/drives/${driveId}/items/${file.id}/thumbnails`
        );
        const thumbSet = thumbs.value?.[0];
        thumbnailUrl =
          thumbSet?.large?.url ??
          thumbSet?.medium?.url ??
          thumbSet?.small?.url ??
          "";
      } catch {
        // No thumbnail available — use download URL as fallback
        thumbnailUrl = file["@microsoft.graph.downloadUrl"] ?? file.webUrl;
      }

      visuals.push({
        id: file.id,
        name: file.name,
        thumbnailUrl,
        downloadUrl: file["@microsoft.graph.downloadUrl"] ?? file.webUrl,
      });
    }

    return NextResponse.json({ visuals });
  } catch (error) {
    console.error("Error fetching case study visuals:", error);
    return NextResponse.json(
      { error: "Failed to fetch visuals from SharePoint" },
      { status: 500 }
    );
  }
}
