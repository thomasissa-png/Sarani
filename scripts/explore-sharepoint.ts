/**
 * SharePoint Drive Explorer
 * Finds the correct Drive IDs and paths for tracker Excel files.
 * Run with: npx tsx scripts/explore-sharepoint.ts
 */
import { getAccessToken } from "../src/lib/integrations/sharepoint";

const GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0";

async function graphGet<T>(path: string): Promise<T> {
  const token = await getAccessToken();
  const url = `${GRAPH_BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Graph ${res.status}: ${res.statusText} — ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

interface DriveInfo {
  id: string;
  name: string;
  driveType: string;
  webUrl: string;
  owner?: { user?: { displayName: string } };
}

interface DriveItem {
  id: string;
  name: string;
  size: number;
  folder?: { childCount: number };
  file?: { mimeType: string };
  webUrl: string;
}

async function main() {
  console.log("=== SHAREPOINT DRIVE EXPLORER ===\n");

  // 1. List all sites accessible to the app
  console.log("--- Step 1: Listing accessible sites ---");
  try {
    const sites = await graphGet<{ value: { id: string; displayName: string; webUrl: string }[] }>(
      "/sites?search=*&$top=20"
    );
    console.log(`Found ${sites.value.length} sites:`);
    for (const site of sites.value) {
      console.log(`  - "${site.displayName}" (id: ${site.id})`);
      console.log(`    URL: ${site.webUrl}`);
    }
  } catch (e: any) {
    console.error("Sites error:", e.message);
  }

  // 2. List all drives for each site
  console.log("\n--- Step 2: Listing drives per site ---");
  try {
    const sites = await graphGet<{ value: { id: string; displayName: string }[] }>(
      "/sites?search=*&$top=20"
    );

    for (const site of sites.value) {
      console.log(`\nSite: "${site.displayName}"`);
      try {
        const drives = await graphGet<{ value: DriveInfo[] }>(
          `/sites/${site.id}/drives`
        );
        for (const drive of drives.value) {
          console.log(`  Drive: "${drive.name}" (type: ${drive.driveType})`);
          console.log(`    ID: ${drive.id}`);
          console.log(`    URL: ${drive.webUrl}`);

          // 3. List root children to find tracker folders
          try {
            const children = await graphGet<{ value: DriveItem[] }>(
              `/drives/${drive.id}/root/children?$top=30`
            );
            const folderNames = children.value.map(c =>
              c.folder ? `📁 ${c.name} (${c.folder.childCount} items)` : `📄 ${c.name}`
            );
            console.log(`    Root contents: ${folderNames.join(", ")}`);

            // Look for Documents folder
            const docsFolder = children.value.find(
              c => c.folder && c.name.toLowerCase() === "documents"
            );
            if (docsFolder) {
              console.log(`    → Found /Documents, exploring...`);
              const docChildren = await graphGet<{ value: DriveItem[] }>(
                `/drives/${drive.id}/items/${docsFolder.id}/children?$top=30`
              );
              for (const child of docChildren.value) {
                if (child.folder) {
                  console.log(`      📁 ${child.name} (${child.folder.childCount} items)`);

                  // Look for Administrative or Financials or Trackers
                  if (
                    child.name.toLowerCase().includes("admin") ||
                    child.name.toLowerCase().includes("financial") ||
                    child.name.toLowerCase().includes("tracker")
                  ) {
                    console.log(`      → Exploring ${child.name}...`);
                    const subChildren = await graphGet<{ value: DriveItem[] }>(
                      `/drives/${drive.id}/items/${child.id}/children?$top=30`
                    );
                    for (const sub of subChildren.value) {
                      if (sub.folder) {
                        console.log(`        📁 ${sub.name} (${sub.folder.childCount} items)`);
                        // Look for .xlsx files one level deeper
                        if (
                          sub.name.toLowerCase().includes("financial") ||
                          sub.name.toLowerCase().includes("tracker")
                        ) {
                          console.log(`        → Exploring ${sub.name}...`);
                          const xlsxChildren = await graphGet<{ value: DriveItem[] }>(
                            `/drives/${drive.id}/items/${sub.id}/children?$top=30`
                          );
                          for (const xlsx of xlsxChildren.value) {
                            const icon = xlsx.file ? "📄" : "📁";
                            console.log(`          ${icon} ${xlsx.name}${xlsx.file ? ` (${(xlsx.size / 1024).toFixed(0)} KB)` : ""}`);
                          }
                        }
                      } else if (sub.name.endsWith(".xlsx")) {
                        console.log(`        📄 ${sub.name} (${(sub.size / 1024).toFixed(0)} KB)`);
                      }
                    }
                  }
                }
              }
            }
          } catch (e: any) {
            console.log(`    Root listing error: ${e.message.slice(0, 100)}`);
          }
        }
      } catch (e: any) {
        console.log(`  Drives error: ${e.message.slice(0, 100)}`);
      }
    }
  } catch (e: any) {
    console.error("Exploration error:", e.message);
  }

  // 4. Test the current configured Drive ID directly
  console.log("\n--- Step 3: Testing configured Drive IDs ---");
  const CONFIGURED_TRACKER_DRIVE = "b!JFtnCBXApE6jsyomGN6hXni64SgHnShCg41yK06ZLObe1kAv17nOTZJFGBX3aH4A";
  const CONFIGURED_ASSETS_DRIVE = "b!BTvSB7PxVEeCQbtgLKBtdI62eOvL4gFEkH_L6luQY04w7z1UWPKDQ4GDuZJmfD9_";

  for (const [label, driveId] of [
    ["Trackers Drive", CONFIGURED_TRACKER_DRIVE],
    ["Assets Drive", CONFIGURED_ASSETS_DRIVE],
  ] as const) {
    console.log(`\n${label} (${driveId.slice(0, 20)}...):`);
    try {
      const drive = await graphGet<DriveInfo>(`/drives/${driveId}`);
      console.log(`  ✅ Found: "${drive.name}" (${drive.driveType})`);
      console.log(`  URL: ${drive.webUrl}`);

      // List root
      const root = await graphGet<{ value: DriveItem[] }>(
        `/drives/${driveId}/root/children?$top=20`
      );
      console.log(`  Root contents:`);
      for (const item of root.value) {
        console.log(`    ${item.folder ? "📁" : "📄"} ${item.name}`);
      }
    } catch (e: any) {
      console.log(`  ❌ ERROR: ${e.message.slice(0, 200)}`);
    }
  }
}

main().catch(console.error);
