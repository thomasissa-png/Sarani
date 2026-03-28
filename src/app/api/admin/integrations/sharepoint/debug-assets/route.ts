import { NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";
import { listDriveItems } from "@/lib/integrations/sharepoint";
import {
  SHAREPOINT_ASSETS_DRIVE_ID,
  ASSETS_CUSTOMERS_BASE_PATH,
  CLIENT_MAPPINGS,
  getMappingBySpaceName,
} from "@/lib/integrations/config";

/**
 * GET /api/admin/integrations/sharepoint/debug-assets?client=Bose&project=Boulanger+Banners+-+Jours+%2B%2B
 * Debug endpoint: traces the entire folder discovery path for the Share page.
 */
export async function GET(request: Request) {
  const session = await getUserFromSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const clientName = searchParams.get("client") || "Bose";
  const projectName = searchParams.get("project") || "Boulanger Banners - Jours ++";

  const steps: Record<string, unknown>[] = [];

  // Step 1: Find mapping
  const mapping = getMappingBySpaceName(clientName);
  steps.push({
    step: "1. getMappingBySpaceName",
    input: clientName,
    result: mapping ? { spaceName: mapping.clickupSpaceName, folder: mapping.sharepointCustomerFolder } : null,
  });

  if (!mapping) {
    return NextResponse.json({ steps, error: "No mapping found" });
  }

  // Step 2: List root of Assets drive
  try {
    const rootItems = await listDriveItems(SHAREPOINT_ASSETS_DRIVE_ID, "/");
    steps.push({
      step: "2. Drive root listing",
      driveId: SHAREPOINT_ASSETS_DRIVE_ID,
      folders: rootItems.filter(i => i.folder).map(i => i.name),
      files: rootItems.filter(i => i.file).map(i => i.name).slice(0, 5),
    });
  } catch (e) {
    steps.push({ step: "2. Drive root listing", error: e instanceof Error ? e.message : String(e) });
  }

  // Step 3: Try the configured path
  const configuredPath = `${ASSETS_CUSTOMERS_BASE_PATH}/${mapping.sharepointCustomerFolder}`;
  try {
    const items = await listDriveItems(SHAREPOINT_ASSETS_DRIVE_ID, configuredPath);
    steps.push({
      step: "3. Configured path",
      path: configuredPath,
      folders: items.filter(i => i.folder).map(i => i.name).slice(0, 20),
    });
  } catch (e) {
    steps.push({ step: "3. Configured path FAILED", path: configuredPath, error: e instanceof Error ? e.message : String(e) });

    // Step 3b: Try without /Documents prefix
    const altPath = configuredPath.replace("/Documents/", "/");
    try {
      const items = await listDriveItems(SHAREPOINT_ASSETS_DRIVE_ID, altPath);
      steps.push({
        step: "3b. Alt path (no /Documents)",
        path: altPath,
        folders: items.filter(i => i.folder).map(i => i.name).slice(0, 20),
      });
    } catch (e2) {
      steps.push({ step: "3b. Alt path FAILED", path: altPath, error: e2 instanceof Error ? e2.message : String(e2) });
    }

    // Step 3c: Try just the customer folder
    try {
      const items = await listDriveItems(SHAREPOINT_ASSETS_DRIVE_ID, `/${mapping.sharepointCustomerFolder}`);
      steps.push({
        step: "3c. Direct customer folder",
        path: `/${mapping.sharepointCustomerFolder}`,
        folders: items.filter(i => i.folder).map(i => i.name).slice(0, 20),
      });
    } catch (e3) {
      steps.push({ step: "3c. Direct customer folder FAILED", error: e3 instanceof Error ? e3.message : String(e3) });
    }
  }

  return NextResponse.json({ clientName, projectName, mapping: { spaceName: mapping.clickupSpaceName, folder: mapping.sharepointCustomerFolder }, steps });
}
