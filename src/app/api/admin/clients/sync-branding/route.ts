import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getUserFromSession } from "@/lib/auth";
import { CLIENT_MAPPINGS } from "@/lib/integrations/config";

/**
 * POST /api/admin/clients/sync-branding
 * Syncs branding info + business rules data from CLIENT_MAPPINGS into the clients DB table.
 * Creates clients that don't exist yet, updates existing ones.
 * Idempotent: safe to call multiple times.
 */

// ─── Business rules data (from docs/pm/arya-business-rules.md) ──────────────
// Industry, language, VAT, PM assignments, end-client status

interface BusinessRuleEntry {
  isEndClient: boolean;
  industry: string;
  primaryLanguage: string;
  paymentTermsDays: number;
  /** Extra notes to append (TVA rules, PM mapping, etc.) */
  businessNotes: string[];
}

const BUSINESS_RULES_DATA: Record<string, BusinessRuleEntry> = {
  Sony: {
    isEndClient: true,
    industry: "entertainment",
    primaryLanguage: "EN",
    paymentTermsDays: 45,
    businessNotes: [
      "TVA 20% ONLY for Sony France.",
      "PM (CET): Aurélie. PM (evening): Fanny / Clara.",
    ],
  },
  TikTok: {
    isEndClient: true,
    industry: "tech",
    primaryLanguage: "EN",
    paymentTermsDays: 45,
    businessNotes: [
      "TVA 20% ONLY for TikTok France.",
      "PM (CET): Mahée / Carole. PM (evening): Claire / Clara.",
    ],
  },
  "PICO XR": {
    isEndClient: true,
    industry: "tech",
    primaryLanguage: "EN",
    paymentTermsDays: 45,
    businessNotes: [
      "Part of Bytedance (shares Excel tracker with TikTok).",
      "PM (CET): Aurélie.",
    ],
  },
  Aristocrat: {
    isEndClient: true,
    industry: "entertainment",
    primaryLanguage: "EN",
    paymentTermsDays: 45,
    businessNotes: [
      "PM (CET): Anastasia. PM (evening): Claire.",
    ],
  },
  Bose: {
    isEndClient: true,
    industry: "tech",
    primaryLanguage: "EN",
    paymentTermsDays: 45,
    businessNotes: [
      "PM (CET): Anastasia.",
    ],
  },
  Aujan: {
    isEndClient: true,
    industry: "fmcg",
    primaryLanguage: "EN",
    paymentTermsDays: 45,
    businessNotes: [
      "PM (CET): Ameena.",
    ],
  },
  GEODIS: {
    isEndClient: true,
    industry: "logistics",
    primaryLanguage: "FR",
    paymentTermsDays: 45,
    businessNotes: [
      "TVA 20%. French client.",
      "PM (CET): Aurélie.",
    ],
  },
  Ubi: {
    isEndClient: false,
    industry: "entertainment",
    primaryLanguage: "EN",
    paymentTermsDays: 45,
    businessNotes: [
      "Partner agency (TVA 20%). Sub-clients: Adidas, Lego, Red Bull, Ubisoft, Perrier, IKEA, TikTok via Ubi, Barilla.",
      "PM (CET): AnneLaure.",
    ],
  },
  "CMC Markets": {
    isEndClient: true,
    industry: "other",
    primaryLanguage: "EN",
    paymentTermsDays: 45,
    businessNotes: [
      "PM (CET): Anastasia. PM (evening): Clara.",
    ],
  },
  Lamarck: {
    isEndClient: false,
    industry: "other",
    primaryLanguage: "FR",
    paymentTermsDays: 45,
    businessNotes: [
      "Partner agency (TVA 20%). End client: MIKO Relai d'Or.",
      "PM (CET): AnneLaure.",
    ],
  },
  ProcessOut: {
    isEndClient: true,
    industry: "tech",
    primaryLanguage: "EN",
    paymentTermsDays: 45,
    businessNotes: [
      "TVA 20%.",
      "checkout.com = ProcessOut (parent company).",
      "Small revenue — shares ClickUp space with Other customers.",
    ],
  },
};

// ─── Branding data (SharePoint links from arya-business-rules.md) ───────────

const BRANDING_DATA: Record<string, {
  brandGuidelinesLink?: string;
  logoFolderLink?: string;
  fontFolderLink?: string;
  primaryColor?: string;
  fontName?: string;
  brandTone?: string;
}> = {
  Sony: {
    brandGuidelinesLink: "https://saranistudio.sharepoint.com/:b:/s/SaraniAssets/IQCTQO0L4sJvQpoB3l-hU8BwAbQZUn84k4yu5MzIZjZ0yM8",
    logoFolderLink: "https://saranistudio.sharepoint.com/:f:/s/SaraniAssets/IgDz2ywnj3atTJC2AEzlfuokAYVbofZQ4B4t6vRC_DDC1lo",
    fontFolderLink: "https://saranistudio.sharepoint.com/:f:/s/SaraniAssets/IgDZ6KVJoYInQK1cxGQRvMoJAYEpi-aH55eaLAOCUZXogEY",
    // [DONNEES MANQUANTES — Thomas doit fournir primaryColor, fontName, brandTone]
  },
  Bose: {
    brandGuidelinesLink: "https://saranistudio.sharepoint.com/:f:/s/SaraniAssets/IgCMrKMBePVfQY-z0u2iwAa_AadlAU9eOtOqcZy8jQiD2Cg",
    logoFolderLink: "https://saranistudio.sharepoint.com/:f:/s/SaraniAssets/IgAzFUoicfYcRqCFgDaSCn0hAT90Bf_uj7C1Mc7J09ygRoM",
    fontFolderLink: "https://saranistudio.sharepoint.com/:f:/s/SaraniAssets/IgBZk4O5VR0tQZzaBi822r50AemNHN0JMdibM6rAfWVDPpY",
    // [DONNEES MANQUANTES — Thomas doit fournir primaryColor, fontName, brandTone]
  },
  TikTok: {
    brandGuidelinesLink: "https://saranistudio.sharepoint.com/:f:/s/SaraniAssets/IgCLhBQNdaHKQpaviLeO_b39AYXKcD_KVcncmYK_TYi4MZg",
    // [DONNEES MANQUANTES — Thomas doit fournir logoFolderLink, fontFolderLink, primaryColor, fontName, brandTone]
  },
  "PICO XR": {
    brandGuidelinesLink: "https://saranistudio.sharepoint.com/:f:/s/SaraniAssets/IgBbX1jrkGZaSqX40qP4uLA4AUzpGlEatWDexJtlNDb-cOE",
    // [DONNEES MANQUANTES — Thomas doit fournir logoFolderLink, fontFolderLink, primaryColor, fontName, brandTone]
  },
  Aristocrat: {
    brandGuidelinesLink: "https://saranistudio.sharepoint.com/:f:/s/SaraniAssets/IgBCJutkb3MqRJvd0Hu2kNh1AaHtXHxVcdZ8SZTGsOh8Ky8",
    // [DONNEES MANQUANTES — Thomas doit fournir logoFolderLink, fontFolderLink, primaryColor, fontName, brandTone]
  },
  "CMC Markets": {
    brandGuidelinesLink: "https://saranistudio.sharepoint.com/:b:/s/SaraniAssets/IQCnEmhVukvISL7fxouW_sPnAVdS8Y3dQjd8YtzbkQTELhs",
    logoFolderLink: "https://saranistudio.sharepoint.com/:b:/s/SaraniAssets/IQCnEmhVukvISL7fxouW_sPnAVdS8Y3dQjd8YtzbkQTELhs",
    // [DONNEES MANQUANTES — Thomas doit fournir fontFolderLink, primaryColor, fontName, brandTone]
  },
  GEODIS: {
    brandGuidelinesLink: "https://saranistudio.sharepoint.com/:f:/s/SaraniAssets/IgCC3EZk4-7JQ5xtMxUU4oHvAYLb_CRN_go6XmmjAWl0XRE",
    // [DONNEES MANQUANTES — Thomas doit fournir logoFolderLink, fontFolderLink, primaryColor, fontName, brandTone]
  },
  Lamarck: {
    brandGuidelinesLink: "https://saranistudio.sharepoint.com/:b:/s/SaraniAssets/IQDfXwOvZseyTJP5rq6C1TRUAUAc5dcmwgPvRzNBPfQXI2c",
    logoFolderLink: "https://saranistudio.sharepoint.com/:f:/s/SaraniAssets/IgDktrAXJTaFSZeIPtlpEp-5AW5FnPKMaDvqJ4SaehIoJiA",
    // [DONNEES MANQUANTES — Thomas doit fournir fontFolderLink, primaryColor, fontName, brandTone]
  },
  Aujan: {
    // Aujan corporate has no dedicated branding link — sub-brands Rani and Barbican do
    // Sub-brand Rani branding: https://saranistudio.sharepoint.com/:b:/s/SaraniAssets/IQBPylSuEyrcTLERDaOf5P9aAU8ISsUfKlHHdEr0N1qaagQ
    // Sub-brand Rani assets/logos/font: https://saranistudio.sharepoint.com/:f:/s/SaraniAssets/IgCMmlFzHJBpTJJPUEgmypmLAetzo8F6MalqdLpRvNUh5Yg
    // Sub-brand Barbican branding: https://saranistudio.sharepoint.com/:b:/s/SaraniAssets/IQAZuGuHSxGtQK-kc2YcRaGVAelL_QfVJzR1F2dVV55UZcI
    // Sub-brand Barbican assets/logos: https://saranistudio.sharepoint.com/:f:/s/SaraniAssets/IgAzqDsWe7PRTYVHvEEwZOxTAVF9mNnxYc1Jv6581YFKM4w
    // [DONNEES MANQUANTES — Thomas doit fournir primaryColor, fontName, brandTone for Aujan parent + sub-brands]
  },
  ProcessOut: {
    brandGuidelinesLink: "https://saranistudio.sharepoint.com/sites/SaraniAssets/Shared%20Documents/Forms/AllItems.aspx?id=%2Fsites%2FSaraniAssets%2FShared%20Documents%2F03%2E%20Customers%2F15%2E%20ProcessOut%2F01%2E%20Branding&viewid=2c2e4824%2D3cb1%2D4619%2Db7c6%2D219dce795204",
    // [DONNEES MANQUANTES — Thomas doit fournir logoFolderLink, fontFolderLink, primaryColor, fontName, brandTone]
  },
  Ubi: {
    // Ubi itself uses https://ubi.fr/ — sub-client branding varies per sub-client
    // Sub-client Adidas branding: https://saranistudio.sharepoint.com/:f:/s/SaraniAssets/IgBL8zzafFOASphGhuGJLY19AfSX9UBxan6jy0cICZX4QUA
    // Sub-client LEGO branding: https://saranistudio.sharepoint.com/:f:/s/SaraniAssets/IgDQ4K2X9UPTSbpEaCNynATwAekjalnGuoe-INSRwwcNjCs
    // Sub-client Ubisoft branding: https://saranistudio.sharepoint.com/:f:/s/SaraniAssets/IgBuEIMN9LBMQJqAcOvIZVKfAX5mmMbmcV-Baw9sGG9LQps
    // Sub-client Perrier branding: https://saranistudio.sharepoint.com/:f:/s/SaraniAssets/IgBDtIHXF4q4To0HKqUTePQgAYIuO_UyqLvFxn9boRY_djA
    // Sub-client IKEA branding: https://saranistudio.sharepoint.com/:f:/s/SaraniAssets/IgCaJaA6RjKsTYMNIuqlBCEPAQdrbuZE75qAKLNZvpp2f_0
    // Sub-client Red Bull: no dedicated branding folder
    // Sub-client Barilla: no dedicated branding folder
    // [DONNEES MANQUANTES — Thomas doit fournir primaryColor, fontName, brandTone for Ubi + sub-clients]
  },
  "Air Corsica": {
    // Assets folder: https://saranistudio.sharepoint.com/:f:/s/SaraniAssets/IgDzWH-EYwhDQJMYuQvQBDHmAUKeNC-_tBuoKUj3Kh88H7A
    // [DONNEES MANQUANTES — Thomas doit fournir brandGuidelinesLink, logoFolderLink, fontFolderLink, primaryColor, fontName, brandTone]
  },
};

// ─── Helper: build subdivision notes from config.ts ─────────────────────────

function buildSubdivisionNotes(
  mapping: (typeof CLIENT_MAPPINGS)[number],
): string | null {
  if (!mapping.subdivisions || mapping.subdivisions.length === 0) return null;
  const lines = mapping.subdivisions.map(
    (sub) => `  - ${sub.name} (list: ${sub.clickupListId})`,
  );
  return `Subdivisions (${mapping.subdivisions.length}):\n${lines.join("\n")}`;
}

// ─── Helper: merge all notes sources into a single string ───────────────────

function buildNotes(
  clientName: string,
  mapping: (typeof CLIENT_MAPPINGS)[number] | null,
): string {
  const parts: string[] = [];

  // 1. Business rules notes (TVA, PM mapping)
  const rules = BUSINESS_RULES_DATA[clientName];
  if (rules?.businessNotes.length) {
    parts.push(...rules.businessNotes);
  }

  // 2. Subdivision notes from config.ts
  if (mapping) {
    const subdivNotes = buildSubdivisionNotes(mapping);
    if (subdivNotes) parts.push(subdivNotes);
  }

  // 3. Extra branding context
  if (clientName === "TikTok") {
    parts.push("Brand hub: https://tiktokbrandhub.com/");
  }
  if (clientName === "Sony") {
    parts.push(
      "Visual inspirations: https://saranistudio.sharepoint.com/:b:/s/SaraniAssets/IQBndjYcTj6wSbgVgecq_Cb_AWboH1TbZQsjSDFPSqlFbT8",
    );
  }
  if (clientName === "Bose") {
    parts.push(
      "Palette: https://saranistudio.sharepoint.com/:f:/s/SaraniAssets/IgCBAT58XQCARomKBGZcDskXAZK19wgSxaMO-usjnq4J7CI",
    );
    parts.push("Sort by Bose entity in projects folder.");
  }
  if (clientName === "Aujan") {
    parts.push(
      "3 sub-brands: Aujan (parent), Rani, Barbican. Each has own branding + ClickUp list.",
    );
  }

  return parts.join("\n") || "";
}

export async function POST() {
  const session = await getUserFromSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let synced = 0;
  let created = 0;
  const errors: string[] = [];

  // ─── Phase 1: Sync clients from CLIENT_MAPPINGS ────────────────────────────
  for (const mapping of CLIENT_MAPPINGS) {
    const clientName = mapping.clickupSpaceName;
    if (clientName === "Other customers") continue;

    const branding = BRANDING_DATA[clientName];
    const rules = BUSINESS_RULES_DATA[clientName];
    const notes = buildNotes(clientName, mapping);

    try {
      const [existing] = await db
        .select({ id: clients.id })
        .from(clients)
        .where(eq(clients.name, clientName))
        .limit(1);

      const updateData = {
        // From config.ts
        clickupSpaceId: mapping.clickupSpaceId,
        sharepointFolder: mapping.sharepointCustomerFolder,
        excelTrackerFilename: mapping.excelTrackerFilename,
        // From BRANDING_DATA
        brandGuidelinesLink: branding?.brandGuidelinesLink ?? null,
        logoFolderLink: branding?.logoFolderLink ?? null,
        fontFolderLink: branding?.fontFolderLink ?? null,
        // From BRANDING_DATA — visual identity fields
        primaryColor: branding?.primaryColor ?? null,
        fontName: branding?.fontName ?? null,
        brandTone: branding?.brandTone ?? null,
        // From BUSINESS_RULES_DATA
        isEndClient: rules?.isEndClient ?? true,
        industry: rules?.industry ?? "other",
        primaryLanguage: rules?.primaryLanguage ?? "EN",
        paymentTermsDays: rules?.paymentTermsDays ?? 45,
        // Merged notes
        notes: notes || null,
      };

      if (existing) {
        await db
          .update(clients)
          .set(updateData)
          .where(eq(clients.id, existing.id));
        synced++;
      } else {
        await db.insert(clients).values({
          name: clientName,
          status: "active",
          ...updateData,
        });
        created++;
      }
    } catch (err) {
      errors.push(
        `${clientName}: ${err instanceof Error ? err.message : "unknown error"}`,
      );
    }
  }

  // ─── Phase 2: Sync clients that have data but are NOT in CLIENT_MAPPINGS ───
  // (e.g., GEODIS, ProcessOut — they share the "Other customers" ClickUp space)
  const mappedNames = new Set(CLIENT_MAPPINGS.map((m) => m.clickupSpaceName));

  // Merge keys from both data sources to catch all clients
  const extraClientNames = new Set([
    ...Object.keys(BRANDING_DATA),
    ...Object.keys(BUSINESS_RULES_DATA),
  ]);

  for (const clientName of extraClientNames) {
    if (mappedNames.has(clientName)) continue; // Already handled in Phase 1

    const branding = BRANDING_DATA[clientName];
    const rules = BUSINESS_RULES_DATA[clientName];
    const notes = buildNotes(clientName, null);

    try {
      const [existing] = await db
        .select({ id: clients.id })
        .from(clients)
        .where(eq(clients.name, clientName))
        .limit(1);

      const updateData = {
        brandGuidelinesLink: branding?.brandGuidelinesLink ?? null,
        logoFolderLink: branding?.logoFolderLink ?? null,
        fontFolderLink: branding?.fontFolderLink ?? null,
        // Visual identity fields
        primaryColor: branding?.primaryColor ?? null,
        fontName: branding?.fontName ?? null,
        brandTone: branding?.brandTone ?? null,
        isEndClient: rules?.isEndClient ?? true,
        industry: rules?.industry ?? "other",
        primaryLanguage: rules?.primaryLanguage ?? "EN",
        paymentTermsDays: rules?.paymentTermsDays ?? 45,
        notes: notes || null,
      };

      if (existing) {
        await db
          .update(clients)
          .set(updateData)
          .where(eq(clients.id, existing.id));
        synced++;
      } else {
        await db.insert(clients).values({
          name: clientName,
          status: "active",
          ...updateData,
        });
        created++;
      }
    } catch (err) {
      errors.push(
        `${clientName}: ${err instanceof Error ? err.message : "unknown error"}`,
      );
    }
  }

  return NextResponse.json({ synced, created, errors });
}
