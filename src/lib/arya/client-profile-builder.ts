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
    } else {
      lines.push(`- Client: ${clientName}`);
      lines.push("- No integration mapping found — may be a new or unmapped client");
    }

    if (knowledgeBlock) {
      lines.push("");
      lines.push(knowledgeBlock);
    }

    return lines.join("\n");
  } catch (error) {
    // Entire profile build failed — return empty (non-blocking)
    console.error("[Client Profile Builder] Failed:", error);
    return "";
  }
}
