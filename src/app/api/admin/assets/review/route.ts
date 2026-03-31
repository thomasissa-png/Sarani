// SSR — asset review compares SharePoint files against expected deliverables
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromSession } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  listDriveItems,
  type DriveItem,
} from "@/lib/integrations/sharepoint";
import {
  SHAREPOINT_ASSETS_DRIVE_ID,
  ASSETS_CUSTOMERS_BASE_PATH,
  CLIENT_MAPPINGS,
} from "@/lib/integrations/config";

// ─── Validation schemas ───────────────────────────────────────────────────

const ExpectedDeliverableSchema = z.object({
  name: z.string().min(1),
  format: z.string().optional(), // e.g. "PNG", "JPG", "PDF"
  dimensions: z.string().optional(), // e.g. "728x90", "1920x1080"
});

const AssetReviewInputSchema = z.object({
  projectId: z.string().min(1, "projectId is required"),
  briefSummary: z.string().optional(),
  expectedDeliverables: z.array(ExpectedDeliverableSchema).optional(),
});

// ─── Types ────────────────────────────────────────────────────────────────

interface FileMatch {
  file: string;
  expected: string;
  status: "match" | "format_mismatch";
  details?: string;
}

interface AssetReviewReport {
  totalFiles: number;
  expectedFiles: number;
  matches: FileMatch[];
  missing: string[];
  unexpected: string[];
  anomalies: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function getExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : "";
}

/**
 * Normalize a name for fuzzy matching: lowercase, strip extension,
 * collapse whitespace/dashes/underscores.
 */
function normalizeName(name: string): string {
  return name
    .replace(/\.[^.]+$/, "") // strip extension
    .toLowerCase()
    .replace(/[-_\s]+/g, " ")
    .trim();
}

/**
 * Try to match a file to an expected deliverable.
 * Uses fuzzy name matching + optional format check.
 */
function matchFileToExpected(
  file: DriveItem,
  expected: z.infer<typeof ExpectedDeliverableSchema>
): FileMatch | null {
  const fileName = file.name;
  const normalizedFile = normalizeName(fileName);
  const normalizedExpected = normalizeName(expected.name);

  // Check if file name contains the expected name or vice versa
  const nameMatch =
    normalizedFile.includes(normalizedExpected) ||
    normalizedExpected.includes(normalizedFile);

  // Also check dimensions in filename (e.g. "banner_728x90.png")
  const dimensionsMatch =
    expected.dimensions && fileName.toLowerCase().includes(expected.dimensions.toLowerCase());

  if (!nameMatch && !dimensionsMatch) return null;

  // Check format
  const fileExt = getExtension(fileName);
  if (expected.format && fileExt !== expected.format.toUpperCase()) {
    return {
      file: fileName,
      expected: expected.name,
      status: "format_mismatch",
      details: `Expected ${expected.format.toUpperCase()}, got ${fileExt}`,
    };
  }

  return {
    file: fileName,
    expected: expected.name,
    status: "match",
  };
}

/**
 * Recursively list all files in a SharePoint folder (1 level deep for subfolders).
 */
async function listAllFiles(
  driveId: string,
  path: string
): Promise<DriveItem[]> {
  const items = await listDriveItems(driveId, path);
  const files: DriveItem[] = [];

  for (const item of items) {
    if (item.file) {
      files.push(item);
    } else if (item.folder && item.folder.childCount > 0) {
      // Go 1 level deep into subfolders
      try {
        const subItems = await listDriveItems(driveId, `${path}/${item.name}`);
        for (const sub of subItems) {
          if (sub.file) {
            files.push(sub);
          }
        }
      } catch {
        // Subfolder read failed — skip silently
      }
    }
  }

  return files;
}

// ─── POST — Review assets vs expected deliverables ────────────────────────

export async function POST(request: NextRequest) {
  const session = await getUserFromSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 10 req/min
  if (!checkRateLimit("asset-review", 10, 60_000)) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again in 1 minute." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  let body: z.infer<typeof AssetReviewInputSchema>;
  try {
    const rawBody = await request.json();
    body = AssetReviewInputSchema.parse(rawBody);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    // Resolve the project folder path on SharePoint.
    // projectId format: either a full path like "02. Sony/ProjectName"
    // or a ClickUp-style identifier. We try the path directly first.
    let folderPath: string;

    // Check if projectId looks like a SharePoint path (contains /)
    if (body.projectId.includes("/")) {
      folderPath = `${ASSETS_CUSTOMERS_BASE_PATH}/${body.projectId}`;
    } else {
      // Try to find a client mapping and build the path
      const mapping = CLIENT_MAPPINGS.find(
        (m) =>
          m.clickupSpaceId === body.projectId ||
          m.clickupSpaceName.toLowerCase() === body.projectId.toLowerCase()
      );
      if (mapping) {
        folderPath = `${ASSETS_CUSTOMERS_BASE_PATH}/${mapping.sharepointCustomerFolder}`;
      } else {
        // Use as-is under customers base
        folderPath = `${ASSETS_CUSTOMERS_BASE_PATH}/${body.projectId}`;
      }
    }

    // List all files in the project folder
    const files = await listAllFiles(SHAREPOINT_ASSETS_DRIVE_ID, folderPath);

    // Filter out system/hidden files
    const relevantFiles = files.filter(
      (f) => !f.name.startsWith(".") && !f.name.startsWith("~$")
    );

    // Detect anomalies
    const anomalies: string[] = [];
    for (const file of relevantFiles) {
      if (file.size === 0) {
        anomalies.push(`${file.name} (0 bytes — possibly corrupted)`);
      } else if (file.size < 100) {
        anomalies.push(`${file.name} (${file.size} bytes — suspiciously small)`);
      }
    }

    // If no expected deliverables, return a basic inventory
    if (!body.expectedDeliverables || body.expectedDeliverables.length === 0) {
      const report: AssetReviewReport = {
        totalFiles: relevantFiles.length,
        expectedFiles: 0,
        matches: [],
        missing: [],
        unexpected: relevantFiles.map((f) => f.name),
        anomalies,
      };
      return NextResponse.json({ report, folderPath });
    }

    // Match files to expected deliverables
    const matches: FileMatch[] = [];
    const matchedFileNames = new Set<string>();
    const matchedExpectedNames = new Set<string>();

    for (const expected of body.expectedDeliverables) {
      let bestMatch: FileMatch | null = null;

      for (const file of relevantFiles) {
        if (matchedFileNames.has(file.name)) continue;

        const match = matchFileToExpected(file, expected);
        if (match) {
          // Prefer exact match over format_mismatch
          if (!bestMatch || (match.status === "match" && bestMatch.status !== "match")) {
            bestMatch = match;
          }
        }
      }

      if (bestMatch) {
        matches.push(bestMatch);
        matchedFileNames.add(bestMatch.file);
        matchedExpectedNames.add(expected.name);
      }
    }

    // Find missing deliverables (expected but not matched)
    const missing = body.expectedDeliverables
      .filter((e) => !matchedExpectedNames.has(e.name))
      .map((e) => {
        const parts = [e.name];
        if (e.format) parts.push(e.format);
        if (e.dimensions) parts.push(e.dimensions);
        return parts.join(" — ");
      });

    // Find unexpected files (present but not matched to any expected)
    const unexpected = relevantFiles
      .filter((f) => !matchedFileNames.has(f.name))
      .map((f) => f.name);

    const report: AssetReviewReport = {
      totalFiles: relevantFiles.length,
      expectedFiles: body.expectedDeliverables.length,
      matches,
      missing,
      unexpected,
      anomalies,
    };

    return NextResponse.json({ report, folderPath });
  } catch (error) {
    console.error("[Asset Review API] Error:", error);

    // Check if it's a SharePoint "item not found" error
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("404") || message.includes("itemNotFound")) {
      return NextResponse.json(
        { error: "Project folder not found on SharePoint", projectId: body.projectId },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Failed to review assets", details: message },
      { status: 500 }
    );
  }
}
