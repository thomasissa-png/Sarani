import { NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { clients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSpaces } from "@/lib/integrations/clickup";
import { listDriveItems } from "@/lib/integrations/sharepoint";
import {
  SHAREPOINT_ASSETS_DRIVE_ID,
  ASSETS_CUSTOMERS_BASE_PATH,
  CLIENT_MAPPINGS,
  CLICKUP_SPACES_WITHOUT_TRACKER,
  getMappingBySpaceName,
} from "@/lib/integrations/config";
import { logSync } from "@/lib/integrations/cache";

// Names of ClickUp Spaces that are internal (not real clients)
const INTERNAL_SPACE_NAMES = new Set(
  CLICKUP_SPACES_WITHOUT_TRACKER.map((s) => s.name.toLowerCase())
);

interface SyncResult {
  created: string[];
  skipped: string[];
  errors: string[];
}

export async function POST() {
  try {
    // Auth check — admin only
    const session = await getUserFromSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 });
    }

    const result: SyncResult = {
      created: [],
      skipped: [],
      errors: [],
    };

    // 1. Fetch ClickUp Spaces (each Space = 1 client)
    const spaces = await getSpaces();

    // 2. Fetch existing clients from DB to avoid duplicates
    const existingClients = await db.select().from(clients);
    const existingNameSet = new Set(
      existingClients.map((c) => c.name.toLowerCase())
    );

    // 3. Try to list SharePoint customer folders for enrichment
    let sharepointFolders: Map<string, string> = new Map();
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
      // SharePoint not available — continue without it
      result.errors.push(
        `SharePoint folder listing failed: ${e instanceof Error ? e.message : "Unknown error"}`
      );
    }

    // 4. For each ClickUp Space, create client if not exists
    for (const space of spaces) {
      // Skip internal/non-client spaces
      if (INTERNAL_SPACE_NAMES.has(space.name.toLowerCase())) {
        result.skipped.push(`${space.name} (internal space)`);
        continue;
      }

      // Skip "Other customers" — it's a catch-all, not a single client
      if (space.name.toLowerCase() === "other customers") {
        result.skipped.push(`${space.name} (catch-all space)`);
        continue;
      }

      // Check if client already exists (case-insensitive match)
      if (existingNameSet.has(space.name.toLowerCase())) {
        result.skipped.push(`${space.name} (already exists)`);
        continue;
      }

      // Look up the mapping for SharePoint folder info
      const mapping = getMappingBySpaceName(space.name);

      try {
        await db.insert(clients).values({
          name: space.name,
          industry: "other",
          status: "active",
          primaryLanguage: "EN",
          clickupProjectId: space.id,
        });

        result.created.push(space.name);
        existingNameSet.add(space.name.toLowerCase());
      } catch (insertError) {
        result.errors.push(
          `Failed to create ${space.name}: ${insertError instanceof Error ? insertError.message : "Unknown error"}`
        );
      }
    }

    // 5. Also check SharePoint for clients that might not have a ClickUp Space
    // (e.g. PICO XR appears in ClickUp but might not be in CLIENT_MAPPINGS)
    // We already processed all ClickUp spaces above, so this is just for logging

    await logSync({
      source: "clickup",
      action: "sync_clients",
      payload: {
        created: result.created.length,
        skipped: result.skipped.length,
        errors: result.errors.length,
      },
      status: result.errors.length > 0 ? "error" : "success",
    });

    return NextResponse.json({
      message: `Sync complete: ${result.created.length} created, ${result.skipped.length} skipped, ${result.errors.length} errors`,
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
