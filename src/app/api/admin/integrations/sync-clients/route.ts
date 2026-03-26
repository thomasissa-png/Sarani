import { NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { clients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSpaces } from "@/lib/integrations/clickup";
import { listDriveItems, type DriveItem } from "@/lib/integrations/sharepoint";
import {
  SHAREPOINT_ASSETS_DRIVE_ID,
  ASSETS_CUSTOMERS_BASE_PATH,
  CLICKUP_SPACES_WITHOUT_TRACKER,
  getMappingBySpaceName,
} from "@/lib/integrations/config";
import { logSync } from "@/lib/integrations/cache";

// Names of ClickUp Spaces that are internal (not real clients)
const INTERNAL_SPACE_NAMES = new Set(
  CLICKUP_SPACES_WITHOUT_TRACKER.map((s) => s.name.toLowerCase())
);

// Folder names that contain branding guidelines
const GUIDELINES_FOLDER_CANDIDATES = [
  "01. guidelines",
  "guidelines",
  "branding",
  "guidelines and branding",
  "01. branding",
  "01. guidelines and branding",
];

interface SyncResult {
  created: string[];
  updated: string[];
  skipped: string[];
  brandingFound: string[];
  errors: string[];
}

/**
 * Find the branding/guidelines subfolder within a client's SharePoint folder.
 * Tries common naming patterns: "01. Guidelines", "Branding", "Guidelines and Branding", etc.
 */
async function findBrandingFolder(
  clientFolderName: string
): Promise<{ files: DriveItem[]; folderName: string } | null> {
  try {
    const clientPath = `${ASSETS_CUSTOMERS_BASE_PATH}/${clientFolderName}`;
    const subfolders = await listDriveItems(
      SHAREPOINT_ASSETS_DRIVE_ID,
      clientPath
    );

    // Find the guidelines subfolder (case-insensitive match against candidates)
    const guidelinesFolder = subfolders.find(
      (item) =>
        item.folder &&
        GUIDELINES_FOLDER_CANDIDATES.includes(item.name.toLowerCase().trim())
    );

    if (!guidelinesFolder) return null;

    // List files inside the guidelines folder
    const guidelinesPath = `${clientPath}/${guidelinesFolder.name}`;
    const files = await listDriveItems(
      SHAREPOINT_ASSETS_DRIVE_ID,
      guidelinesPath
    );

    return {
      files: files.filter((f) => f.file), // Only files, not subfolders
      folderName: guidelinesFolder.name,
    };
  } catch {
    return null;
  }
}

/**
 * Build a branding notes string from the list of guideline files found.
 */
function buildBrandingNotes(
  folderName: string,
  clientFolder: string,
  files: DriveItem[]
): string {
  const lines = [
    `📁 SharePoint: ${clientFolder}/${folderName}`,
    `${files.length} file(s) found:`,
    ...files.map(
      (f) =>
        `  - ${f.name} (${formatSize(f.size)}, modified ${f.lastModifiedDateTime.split("T")[0]})`
    ),
  ];
  return lines.join("\n");
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function POST() {
  try {
    // Auth check — admin only
    const session = await getUserFromSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden — admin only" },
        { status: 403 }
      );
    }

    const result: SyncResult = {
      created: [],
      updated: [],
      skipped: [],
      brandingFound: [],
      errors: [],
    };

    // 1. Fetch ClickUp Spaces (each Space = 1 client)
    let spaces: { id: string; name: string }[] = [];
    try {
      spaces = await getSpaces();
    } catch (e) {
      result.errors.push(
        `ClickUp fetch failed: ${e instanceof Error ? e.message : "Unknown error"}`
      );
    }

    // 2. Fetch existing clients from DB
    const existingClients = await db.select().from(clients);
    const existingByName = new Map(
      existingClients.map((c) => [c.name.toLowerCase(), c])
    );

    // 3. List SharePoint customer folders
    let sharepointFolders: Map<string, string> = new Map(); // cleanName -> originalFolderName
    try {
      const items = await listDriveItems(
        SHAREPOINT_ASSETS_DRIVE_ID,
        ASSETS_CUSTOMERS_BASE_PATH
      );
      for (const item of items) {
        if (item.folder) {
          // Extract clean name: "02. Sony" -> "Sony"
          const cleanName = item.name.replace(/^\d+\.\s*/, "").trim();
          sharepointFolders.set(cleanName.toLowerCase(), item.name);
        }
      }
    } catch (e) {
      result.errors.push(
        `SharePoint folder listing failed: ${e instanceof Error ? e.message : "Unknown error"}`
      );
    }

    // 4. Create clients from ClickUp Spaces
    const processedNames = new Set<string>();

    for (const space of spaces) {
      const nameLower = space.name.toLowerCase();

      // Skip internal/non-client spaces
      if (INTERNAL_SPACE_NAMES.has(nameLower)) {
        result.skipped.push(`${space.name} (internal space)`);
        continue;
      }

      // Skip "Other customers" — it's a catch-all, not a single client
      if (nameLower === "other customers") {
        result.skipped.push(`${space.name} (catch-all space)`);
        continue;
      }

      processedNames.add(nameLower);

      if (existingByName.has(nameLower)) {
        result.skipped.push(`${space.name} (already exists)`);
      } else {
        try {
          await db.insert(clients).values({
            name: space.name,
            industry: "other",
            status: "active",
            primaryLanguage: "EN",
            clickupProjectId: space.id,
          });
          result.created.push(space.name);
          existingByName.set(nameLower, { name: space.name } as typeof existingClients[number]);
        } catch (insertError) {
          result.errors.push(
            `Failed to create ${space.name}: ${insertError instanceof Error ? insertError.message : "Unknown error"}`
          );
        }
      }
    }

    // 5. Create clients from SharePoint folders NOT already covered by ClickUp
    for (const [cleanNameLower, originalFolder] of sharepointFolders) {
      if (processedNames.has(cleanNameLower)) continue;
      if (existingByName.has(cleanNameLower)) {
        processedNames.add(cleanNameLower);
        continue;
      }

      // Skip generic folders
      if (
        cleanNameLower === "single projects" ||
        cleanNameLower === "templates"
      ) {
        continue;
      }

      const cleanName =
        originalFolder.replace(/^\d+\.\s*/, "").trim();

      try {
        await db.insert(clients).values({
          name: cleanName,
          industry: "other",
          status: "active",
          primaryLanguage: "EN",
        });
        result.created.push(`${cleanName} (from SharePoint)`);
        existingByName.set(cleanNameLower, { name: cleanName } as typeof existingClients[number]);
        processedNames.add(cleanNameLower);
      } catch (insertError) {
        result.errors.push(
          `Failed to create ${cleanName}: ${insertError instanceof Error ? insertError.message : "Unknown error"}`
        );
      }
    }

    // 6. Refetch all clients from DB (to get IDs of newly created ones)
    const allClients = await db.select().from(clients);
    const clientsByName = new Map(
      allClients.map((c) => [c.name.toLowerCase(), c])
    );

    // 7. Fetch branding guidelines from SharePoint for all clients
    // For each client, find their SharePoint folder, then look for guidelines subfolder
    const brandingPromises: Promise<void>[] = [];

    // Deduplicate: collect all unique client names to process
    const allClientNames = new Set<string>();
    for (const c of allClients) {
      allClientNames.add(c.name.toLowerCase());
    }

    for (const clientNameLower of allClientNames) {
      // Find the SharePoint folder for this client
      const spFolder =
        sharepointFolders.get(clientNameLower) ||
        // Also try matching via CLIENT_MAPPINGS
        (() => {
          const client = clientsByName.get(clientNameLower);
          if (!client) return null;
          const mapping = getMappingBySpaceName(client.name);
          return mapping?.sharepointCustomerFolder ?? null;
        })();

      if (!spFolder) continue;

      const client = clientsByName.get(clientNameLower);
      if (!client) continue;

      brandingPromises.push(
        (async () => {
          const branding = await findBrandingFolder(spFolder);
          if (!branding || branding.files.length === 0) return;

          const notes = buildBrandingNotes(
            branding.folderName,
            spFolder,
            branding.files
          );

          // Only update if branding notes changed
          if (client.brandGuidelinesNotes !== notes) {
            try {
              await db
                .update(clients)
                .set({
                  brandGuidelinesNotes: notes,
                  updatedAt: new Date(),
                })
                .where(eq(clients.id, client.id));
              result.updated.push(`${client.name} (branding)`);
              result.brandingFound.push(
                `${client.name}: ${branding.files.length} file(s) in ${branding.folderName}`
              );
            } catch (updateError) {
              result.errors.push(
                `Failed to update branding for ${client.name}: ${updateError instanceof Error ? updateError.message : "Unknown error"}`
              );
            }
          } else {
            result.brandingFound.push(
              `${client.name}: ${branding.files.length} file(s) (unchanged)`
            );
          }
        })()
      );
    }

    // Run branding fetches in parallel (max 5 concurrent)
    const BATCH_SIZE = 5;
    for (let i = 0; i < brandingPromises.length; i += BATCH_SIZE) {
      await Promise.all(brandingPromises.slice(i, i + BATCH_SIZE));
    }

    await logSync({
      source: "clickup",
      action: "sync_clients",
      payload: {
        created: result.created.length,
        updated: result.updated.length,
        skipped: result.skipped.length,
        brandingFound: result.brandingFound.length,
        errors: result.errors.length,
      },
      status: result.errors.length > 0 ? "error" : "success",
    });

    return NextResponse.json({
      message: `Sync complete: ${result.created.length} created, ${result.updated.length} branding updated, ${result.skipped.length} skipped, ${result.errors.length} errors`,
      ...result,
    });
  } catch (error) {
    console.error("Client sync error:", error);

    if (
      error instanceof Error &&
      error.message.includes("environment variable is not set")
    ) {
      return NextResponse.json(
        { error: "Integration not configured. Check API credentials." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Failed to sync clients." },
      { status: 500 }
    );
  }
}
