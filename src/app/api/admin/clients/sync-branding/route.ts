import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getUserFromSession } from "@/lib/auth";
import { CLIENT_MAPPINGS } from "@/lib/integrations/config";

/**
 * POST /api/admin/clients/sync-branding
 * Syncs branding info from CLIENT_MAPPINGS into the clients DB table.
 * Creates clients that don't exist yet, updates existing ones.
 */
export async function POST() {
  const session = await getUserFromSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Branding data from Thomas (same as CLIENT_BRANDING in client-profile-builder.ts)
  // but structured for DB columns
  const BRANDING_DATA: Record<string, {
    brandGuidelinesLink?: string;
    logoFolderLink?: string;
    fontFolderLink?: string;
    notes?: string;
  }> = {
    Sony: {
      brandGuidelinesLink: "https://saranistudio.sharepoint.com/:b:/s/SaraniAssets/IQCTQO0L4sJvQpoB3l-hU8BwAbQZUn84k4yu5MzIZjZ0yM8",
      logoFolderLink: "https://saranistudio.sharepoint.com/:f:/s/SaraniAssets/IgDz2ywnj3atTJC2AEzlfuokAYVbofZQ4B4t6vRC_DDC1lo",
      fontFolderLink: "https://saranistudio.sharepoint.com/:f:/s/SaraniAssets/IgDZ6KVJoYInQK1cxGQRvMoJAYEpi-aH55eaLAOCUZXogEY",
      notes: "3 divisions: Sony France, Sony Europe, Sony Pro. Visual inspirations: https://saranistudio.sharepoint.com/:b:/s/SaraniAssets/IQBndjYcTj6wSbgVgecq_Cb_AWboH1TbZQsjSDFPSqlFbT8",
    },
    Bose: {
      brandGuidelinesLink: "https://saranistudio.sharepoint.com/:f:/s/SaraniAssets/IgCMrKMBePVfQY-z0u2iwAa_AadlAU9eOtOqcZy8jQiD2Cg",
      logoFolderLink: "https://saranistudio.sharepoint.com/:f:/s/SaraniAssets/IgAzFUoicfYcRqCFgDaSCn0hAT90Bf_uj7C1Mc7J09ygRoM",
      fontFolderLink: "https://saranistudio.sharepoint.com/:f:/s/SaraniAssets/IgBZk4O5VR0tQZzaBi822r50AemNHN0JMdibM6rAfWVDPpY",
      notes: "Sort by Bose entity in projects folder. Palette: https://saranistudio.sharepoint.com/:f:/s/SaraniAssets/IgCBAT58XQCARomKBGZcDskXAZK19wgSxaMO-usjnq4J7CI",
    },
    TikTok: {
      brandGuidelinesLink: "https://saranistudio.sharepoint.com/:f:/s/SaraniAssets/IgCLhBQNdaHKQpaviLeO_b39AYXKcD_KVcncmYK_TYi4MZg",
      notes: "22 divisions. Also: https://tiktokbrandhub.com/. TVA 20% ONLY for TikTok France.",
    },
    "PICO XR": {
      brandGuidelinesLink: "https://saranistudio.sharepoint.com/:f:/s/SaraniAssets/IgBbX1jrkGZaSqX40qP4uLA4AUzpGlEatWDexJtlNDb-cOE",
      notes: "Part of Bytedance. 2 entities: B2C EMEA + B2B EMEA.",
    },
    Aristocrat: {
      brandGuidelinesLink: "https://saranistudio.sharepoint.com/:f:/s/SaraniAssets/IgBCJutkb3MqRJvd0Hu2kNh1AaHtXHxVcdZ8SZTGsOh8Ky8",
      notes: "2 divisions: USA + Asia.",
    },
    "CMC Markets": {
      brandGuidelinesLink: "https://saranistudio.sharepoint.com/:b:/s/SaraniAssets/IQCnEmhVukvISL7fxouW_sPnAVdS8Y3dQjd8YtzbkQTELhs",
      logoFolderLink: "https://saranistudio.sharepoint.com/:b:/s/SaraniAssets/IQCnEmhVukvISL7fxouW_sPnAVdS8Y3dQjd8YtzbkQTELhs",
    },
    GEODIS: {
      brandGuidelinesLink: "https://saranistudio.sharepoint.com/:f:/s/SaraniAssets/IgCC3EZk4-7JQ5xtMxUU4oHvAYLb_CRN_go6XmmjAWl0XRE",
      notes: "TVA 20%.",
    },
    Lamarck: {
      brandGuidelinesLink: "https://saranistudio.sharepoint.com/:b:/s/SaraniAssets/IQDfXwOvZseyTJP5rq6C1TRUAUAc5dcmwgPvRzNBPfQXI2c",
      logoFolderLink: "https://saranistudio.sharepoint.com/:f:/s/SaraniAssets/IgDktrAXJTaFSZeIPtlpEp-5AW5FnPKMaDvqJ4SaehIoJiA",
      notes: "Partner agency (TVA 20%). End client: MIKO Relai d'Or.",
    },
    Aujan: {
      notes: "3 sub-brands: Aujan (parent), Rani, Barbican. Each has own branding + ClickUp list.",
    },
    Ubi: {
      notes: "Partner agency (TVA 20%). Sub-clients: Adidas, Lego, Red Bull, Ubisoft, Perrier, IKEA, TikTok via Ubi, Barilla. Each sub-client has own branding.",
    },
  };

  let synced = 0;
  let created = 0;
  const errors: string[] = [];

  for (const mapping of CLIENT_MAPPINGS) {
    const clientName = mapping.clickupSpaceName;
    if (clientName === "Other customers") continue;

    const branding = BRANDING_DATA[clientName];

    try {
      // Find existing client by name
      const [existing] = await db
        .select({ id: clients.id })
        .from(clients)
        .where(eq(clients.name, clientName))
        .limit(1);

      const updateData = {
        clickupSpaceId: mapping.clickupSpaceId,
        sharepointFolder: mapping.sharepointCustomerFolder,
        excelTrackerFilename: mapping.excelTrackerFilename,
        brandGuidelinesLink: branding?.brandGuidelinesLink ?? null,
        logoFolderLink: branding?.logoFolderLink ?? null,
        fontFolderLink: branding?.fontFolderLink ?? null,
        notes: branding?.notes ?? null,
      };

      if (existing) {
        await db.update(clients).set(updateData).where(eq(clients.id, existing.id));
        synced++;
      } else {
        await db.insert(clients).values({
          name: clientName,
          industry: "other",
          status: "active",
          primaryLanguage: "EN",
          ...updateData,
        });
        created++;
      }
    } catch (err) {
      errors.push(`${clientName}: ${err instanceof Error ? err.message : "unknown error"}`);
    }
  }

  // Sync clients that have branding data but are NOT in CLIENT_MAPPINGS
  // (e.g., GEODIS, ProcessOut — they share the "Other customers" ClickUp space)
  const mappedNames = new Set(CLIENT_MAPPINGS.map((m) => m.clickupSpaceName));
  for (const [clientName, branding] of Object.entries(BRANDING_DATA)) {
    if (mappedNames.has(clientName)) continue; // Already handled above

    try {
      const [existing] = await db
        .select({ id: clients.id })
        .from(clients)
        .where(eq(clients.name, clientName))
        .limit(1);

      const updateData = {
        brandGuidelinesLink: branding.brandGuidelinesLink ?? null,
        logoFolderLink: branding.logoFolderLink ?? null,
        fontFolderLink: branding.fontFolderLink ?? null,
        notes: branding.notes ?? null,
      };

      if (existing) {
        await db.update(clients).set(updateData).where(eq(clients.id, existing.id));
        synced++;
      } else {
        await db.insert(clients).values({
          name: clientName,
          industry: "other",
          status: "active",
          primaryLanguage: "EN",
          ...updateData,
        });
        created++;
      }
    } catch (err) {
      errors.push(`${clientName}: ${err instanceof Error ? err.message : "unknown error"}`);
    }
  }

  return NextResponse.json({ synced, created, errors });
}
