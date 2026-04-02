// ─── Client Profile Builder ─────────────────────────────────────────────────
// Builds a CLIENT PROFILE block for injection into Arya's LLM prompts.
// Combines CLIENT_MAPPINGS (static config) with knowledge entries (DB).
// NON-BLOCKING: if DB or any source fails, returns empty string gracefully.

import { buildClientKnowledgePrompt } from "@/lib/arya/knowledge-loader";
import { CLIENT_MAPPINGS, getMappingBySpaceName } from "@/lib/integrations/config";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ClientProfileOptions {
  /** Client name (e.g. "Sony", "TikTok") — used for knowledge lookup */
  clientName?: string;
  /** Sender email — used for contact-level knowledge */
  senderEmail?: string;
  /** Email domain — used as fallback to match client */
  emailDomain?: string;
}

// ─── Client branding profiles (from Thomas) ──────────────────────────────

const CLIENT_BRANDING: Record<string, string> = {
  Sony: `- Brand guidelines: https://saranistudio.sharepoint.com/:b:/s/SaraniAssets/IQCTQO0L4sJvQpoB3l-hU8BwAbQZUn84k4yu5MzIZjZ0yM8
- Logo files: https://saranistudio.sharepoint.com/:f:/s/SaraniAssets/IgDz2ywnj3atTJC2AEzlfuokAYVbofZQ4B4t6vRC_DDC1lo
- Font files: https://saranistudio.sharepoint.com/:f:/s/SaraniAssets/IgDZ6KVJoYInQK1cxGQRvMoJAYEpi-aH55eaLAOCUZXogEY
- Visual inspirations: https://saranistudio.sharepoint.com/:b:/s/SaraniAssets/IQBndjYcTj6wSbgVgecq_Cb_AWboH1TbZQsjSDFPSqlFbT8
- Asset library: https://saranistudio.sharepoint.com/:f:/s/SaraniAssets/IgCGrl6DdC5-Tpz-M68Y8qZHAU7fegA6mxcIIwpsaLCuFUM
- Projects folder (Sony Europe): https://saranistudio.sharepoint.com/:f:/s/SaraniAssets/IgBcCvUgAzMbQ6ep6NU2gwDaAXs0wAKlVuw_jTB3k5Olr8A
- Projects folder (Sony France): https://saranistudio.sharepoint.com/:f:/s/SaraniAssets/IgCeSwE3o4J-T4-eIOHQx01DAY78Dc9-8Je9xFxud2aM-eE
- Projects folder (Sony Pro): https://saranistudio.sharepoint.com/:f:/s/SaraniAssets/IgDiBHRNhUD8S7Eb50r9PiRKAX4J2cDov4obkwQ9sifF-LY`,

  Lamarck: `- TYPE: Partner agency (TVA 20%). End client: MIKO Relai d'Or
- Charte MIKO: https://saranistudio.sharepoint.com/:b:/s/SaraniAssets/IQDfXwOvZseyTJP5rq6C1TRUAUAc5dcmwgPvRzNBPfQXI2c
- Logos MIKO: https://saranistudio.sharepoint.com/:f:/s/SaraniAssets/IgDktrAXJTaFSZeIPtlpEp-5AW5FnPKMaDvqJ4SaehIoJiA
- Content library: https://saranistudio.sharepoint.com/:f:/s/SaraniAssets/IgDLKQmm7iV8TKqYWWwCyulzAVwCzt8-TEJ67qbYl28cpds
- Projects (catalogues): https://saranistudio.sharepoint.com/:f:/r/sites/SaraniAssets/Shared%20Documents/03.%20Customers/21.Lamarck/2.Catalogues
- Projects (hors catalogue): https://saranistudio.sharepoint.com/:f:/r/sites/SaraniAssets/Shared%20Documents/03.%20Customers/21.Lamarck/3.Cr%C3%A9as%20-%20Hors%20catalogues
- ClickUp: https://app.clickup.com/14389859/v/li/901708730218`,

  "CMC Markets": `- TYPE: End client
- Brand guidelines + logo: https://saranistudio.sharepoint.com/:b:/s/SaraniAssets/IQCnEmhVukvISL7fxouW_sPnAVdS8Y3dQjd8YtzbkQTELhs
- Projects folder: https://saranistudio.sharepoint.com/:f:/s/SaraniAssets/IgDQdkRT7xrtQbgflPZMPMc-AfpJXeqkNg9cjSITiij_ezw
- ClickUp: https://app.clickup.com/14389859/v/li/901708074740`,

  Bose: `- TYPE: End client
- Guidelines: https://saranistudio.sharepoint.com/:f:/s/SaraniAssets/IgCMrKMBePVfQY-z0u2iwAa_AadlAU9eOtOqcZy8jQiD2Cg
- Logos: https://saranistudio.sharepoint.com/:f:/s/SaraniAssets/IgAzFUoicfYcRqCFgDaSCn0hAT90Bf_uj7C1Mc7J09ygRoM
- Fonts: https://saranistudio.sharepoint.com/:f:/s/SaraniAssets/IgBZk4O5VR0tQZzaBi822r50AemNHN0JMdibM6rAfWVDPpY
- Palette: https://saranistudio.sharepoint.com/:f:/s/SaraniAssets/IgCBAT58XQCARomKBGZcDskXAZK19wgSxaMO-usjnq4J7CI
- Projects: https://saranistudio.sharepoint.com/:f:/s/SaraniAssets/IgBWxeaeB9lPQqcj9YgZW6EQAZz4uIQhm0XldkBNT40ai9E (sort by Bose entity)
- Asset library: https://saranistudio.sharepoint.com/:f:/s/SaraniAssets/IgBWsfMlV66cTJbLAkbe8pkZAbsgwbSYCaRldXUMfwJBAX4
- ClickUp: https://app.clickup.com/14389859/v/li/901705794806`,

  Aujan: `- TYPE: End client with sub-brands (Rani, Barbican)
- Aujan (parent): Projects https://saranistudio.sharepoint.com/:f:/s/SaraniAssets/IgBEeix4GTJFTZet1EgoQ2eJAYmdPbV-yAlsEjgP_AjXzMA | ClickUp https://app.clickup.com/14389859/v/li/901705328640
- Rani: Branding https://saranistudio.sharepoint.com/:b:/s/SaraniAssets/IQBPylSuEyrcTLERDaOf5P9aAU8ISsUfKlHHdEr0N1qaagQ + Assets https://saranistudio.sharepoint.com/:f:/s/SaraniAssets/IgCMmlFzHJBpTJJPUEgmypmLAetzo8F6MalqdLpRvNUh5Yg | Projects https://saranistudio.sharepoint.com/:f:/s/SaraniAssets/IgDELsciMTuQSIL1y_E7DLS1Af8qQ1H8cpe5vBfUYsioR4E | ClickUp https://app.clickup.com/14389859/v/li/901704818470
- Barbican: Branding https://saranistudio.sharepoint.com/:b:/s/SaraniAssets/IQAZuGuHSxGtQK-kc2YcRaGVAelL_QfVJzR1F2dVV55UZcI + Assets https://saranistudio.sharepoint.com/:f:/s/SaraniAssets/IgAzqDsWe7PRTYVHvEEwZOxTAVF9mNnxYc1Jv6581YFKM4w | Projects https://saranistudio.sharepoint.com/:f:/s/SaraniAssets/IgAUjy6M6U3HTrwm5itBbwbaAcaBMZwxMd1ZFKVZc_PkGYY | ClickUp https://app.clickup.com/14389859/v/li/901705328468`,

  Ubi: `- TYPE: Partner agency (TVA 20%). Multiple end clients.
- Adidas: Branding https://saranistudio.sharepoint.com/:f:/s/SaraniAssets/IgBL8zzafFOASphGhuGJLY19AfSX9UBxan6jy0cICZX4QUA | Projects https://saranistudio.sharepoint.com/:f:/s/SaraniAssets/IgBc1Qgais5hSpRRZThKoVMRATCgn9Rcis1aPw-th_lPTqM | ClickUp https://app.clickup.com/14389859/v/li/901704341200
- Ubi (internal): Branding https://ubi.fr/ | Projects https://saranistudio.sharepoint.com/:f:/s/SaraniAssets/IgBHvp1VtG72T4woW-pVPn0DAeD7zwuXzbcScwzphTnKHi0 | ClickUp https://app.clickup.com/14389859/v/li/901704345673
- Red Bull: Projects https://saranistudio.sharepoint.com/:f:/s/SaraniAssets/IgCW1WKHi_eBTZA6jjct-xGpAUCQNp5PXCu6BA-0V93ReeM | ClickUp https://app.clickup.com/14389859/v/li/901707332168
- LEGO: Branding https://saranistudio.sharepoint.com/:f:/s/SaraniAssets/IgDQ4K2X9UPTSbpEaCNynATwAekjalnGuoe-INSRwwcNjCs | Projects https://saranistudio.sharepoint.com/:f:/s/SaraniAssets/IgA84GvbIUUpQJqVBqb2cVZIAVgbcgc8oasPU-Pi5HD7_bA | ClickUp https://app.clickup.com/14389859/v/li/901704345855
- Ubisoft: Branding https://saranistudio.sharepoint.com/:f:/s/SaraniAssets/IgBuEIMN9LBMQJqAcOvIZVKfAX5mmMbmcV-Baw9sGG9LQps | Projects https://saranistudio.sharepoint.com/:f:/s/SaraniAssets/IgD1nVIk-TCBTJvyNPNIkChhATieL_mPpSmGGKpHI-aFcNk
- Perrier: Branding https://saranistudio.sharepoint.com/:f:/s/SaraniAssets/IgBDtIHXF4q4To0HKqUTePQgAYIuO_UyqLvFxn9boRY_djA | Projects https://saranistudio.sharepoint.com/:f:/s/SaraniAssets/IgDkkSZ-IRNoSIyMyvtjfLkXAXT1g46X5c1BQ0JvEoBxU3c
- IKEA: Branding https://saranistudio.sharepoint.com/:f:/s/SaraniAssets/IgCaJaA6RjKsTYMNIuqlBCEPAQdrbuZE75qAKLNZvpp2f_0 | ClickUp https://app.clickup.com/14389859/v/li/901704970300
- TikTok (via Ubi — ONLY when brief comes from Ubi, not from TikTok directly): Same branding as TikTok direct | ClickUp https://app.clickup.com/14389859/v/li/901706944747
- Barilla: ClickUp https://app.clickup.com/14389859/v/li/901712149614`,

  "Other customers": `- TYPE: Case by case. TVA 20% for French clients (Air Corsica, etc.)
- Air Corsica ClickUp: https://app.clickup.com/14389859/v/li/901705224702
- Other clients ClickUp: https://app.clickup.com/14389859/v/li/900303492355
- Projects SharePoint: https://saranistudio.sharepoint.com/:f:/s/SaraniAssets/IgCCo4_62lS6RZa42GBKac4SAaW6WgxyxguH3Sl7UGJ798o
- Air Corsica assets: https://saranistudio.sharepoint.com/:f:/s/SaraniAssets/IgDzWH-EYwhDQJMYuQvQBDHmAUKeNC-_tBuoKUj3Kh88H7A`,
};

// ─── Domain-to-client heuristic ─────────────────────────────────────────────

const DOMAIN_CLIENT_MAP: Record<string, string> = {
  "sony.com": "Sony",
  "sonymusic.com": "Sony",
  "sonypictures.com": "Sony",
  "tiktok.com": "TikTok",
  "bytedance.com": "TikTok",
  "picoxr.com": "PICO XR",
  "aristocrat.com": "Aristocrat",
  "ubisoft.com": "Ubi",
  "aujan.com": "Aujan",
  "bose.com": "Bose",
  "lamarckgroup.com": "Lamarck",
  "cmcmarkets.com": "CMC Markets",
};

/**
 * Try to resolve a client name from a sender email address.
 * Checks domain mapping first, then CLIENT_MAPPINGS space names.
 */
function resolveClientFromEmail(senderEmail: string): string | null {
  const domain = senderEmail.split("@")[1]?.toLowerCase();
  if (!domain) return null;

  // 1. Exact domain match
  if (DOMAIN_CLIENT_MAP[domain]) return DOMAIN_CLIENT_MAP[domain];

  // 2. Partial domain match (e.g. "music.sony.com" contains "sony.com")
  for (const [knownDomain, client] of Object.entries(DOMAIN_CLIENT_MAP)) {
    if (domain.endsWith(knownDomain) || domain.includes(knownDomain.split(".")[0])) {
      return client;
    }
  }

  // 3. Check CLIENT_MAPPINGS space names against domain
  for (const mapping of CLIENT_MAPPINGS) {
    const spaceLower = mapping.clickupSpaceName.toLowerCase();
    if (spaceLower === "other customers") continue;
    if (domain.includes(spaceLower.replace(/\s+/g, ""))) {
      return mapping.clickupSpaceName;
    }
  }

  return null;
}

// ─── Main builder ───────────────────────────────────────────────────────────

/**
 * Build a CLIENT PROFILE prompt block for injection into LLM prompts.
 *
 * Returns an empty string if no profile data is available — safe to concatenate.
 * All operations are NON-BLOCKING: failures return empty string.
 */
export async function buildClientProfileBlock(
  options: ClientProfileOptions
): Promise<string> {
  try {
    // Resolve client name
    let clientName = options.clientName;
    if (!clientName && options.senderEmail) {
      clientName = resolveClientFromEmail(options.senderEmail) ?? undefined;
    }
    if (!clientName && options.emailDomain) {
      clientName = resolveClientFromEmail(`user@${options.emailDomain}`) ?? undefined;
    }

    if (!clientName) return "";

    // Get static config (CLIENT_MAPPINGS)
    const mapping = getMappingBySpaceName(clientName);

    // Get knowledge from DB (non-blocking)
    let knowledgeBlock = "";
    try {
      knowledgeBlock = await buildClientKnowledgePrompt(
        clientName,
        options.senderEmail
      );
    } catch {
      // Knowledge loader failed — continue without it
    }

    // Build the profile block
    const lines: string[] = ["", "CLIENT PROFILE:"];

    if (mapping) {
      lines.push(`- Client: ${mapping.clickupSpaceName}`);
      lines.push(`- ClickUp Space ID: ${mapping.clickupSpaceId}`);
      lines.push(`- SharePoint folder: ${mapping.sharepointCustomerFolder}`);
      lines.push(`- Excel tracker: ${mapping.excelTrackerFilename}`);
      if (mapping.subdivisions && mapping.subdivisions.length > 0) {
        lines.push(`- Divisions: ${mapping.subdivisions.map((s) => s.name).join(", ")}`);
        lines.push("  Route the project to the correct division based on the email context (sender, entity mentioned, language).");
      }
    } else {
      lines.push(`- Client: ${clientName}`);
      lines.push("- No integration mapping found — may be a new or unmapped client");
    }

    if (knowledgeBlock) {
      lines.push("");
      lines.push(knowledgeBlock);
    }

    // Add branding links if available
    const branding = CLIENT_BRANDING[clientName] ?? CLIENT_BRANDING[mapping?.clickupSpaceName ?? ""];
    if (branding) {
      lines.push("");
      lines.push("BRANDING & ASSETS:");
      lines.push(branding);
    }

    return lines.join("\n");
  } catch (error) {
    // Entire profile build failed — return empty (non-blocking)
    console.error("[Client Profile Builder] Failed:", error);
    return "";
  }
}
