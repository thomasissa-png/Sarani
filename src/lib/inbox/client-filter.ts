// ─── Inbox client filter logic ─────────────────────────────────────────────
// Extracted from page.tsx (lines 651-686) for testability.
// Single source of truth for inbox client-based filtering.
//
// WHY THIS EXISTS: The PM filters inbox items by client (TikTok, Sony, Ubi...).
// If the filter is broken, items show under the wrong client — a TikTok review
// appearing under Sony means Thomas processes it in the wrong context.
// Sub-client mapping (Adidas → Ubi) is critical business logic.

import type { InboxItemFilterable } from "./filters";

// ─── Known clients list ────────────────────────────────────────────────────
// Used by "Others" filter to exclude items that belong to a known client.

export const KNOWN_CLIENTS = [
  "tiktok",
  "sony",
  "bose",
  "ubi",
  "ubisoft",
  "lamarck",
  "aristocrat",
  "aujan",
  "cmc",
  "pico",
  "geodis",
  "adidas",
  "lego",
  "bytedance",
] as const;

// ─── Sub-client mapping ────────────────────────────────────────────────────
// Some clients are sub-clients of a parent. When filtering by parent,
// sub-client items must also appear.

export const UBI_SUB_CLIENTS = [
  "ubisoft",
  "@ubi.",
  "adidas",
  "lego",
  "red bull",
  "ikea",
  "perrier",
  "barilla",
] as const;

// ─── Build searchable text from an inbox item ──────────────────────────────

export function buildSearchableText(item: InboxItemFilterable): string {
  let text = ((item.title as string) ?? "").toLowerCase();

  if (item.summary) {
    try {
      const parsed =
        typeof item.summary === "string"
          ? JSON.parse(item.summary)
          : item.summary;
      const from = ((parsed.from as string) ?? "").toLowerCase();
      const subject = ((parsed.subject as string) ?? "").toLowerCase();
      const body = ((parsed.bodyPreview as string) ?? "").toLowerCase();
      const projectName = ((parsed.projectName as string) ?? "").toLowerCase();
      const clientName = ((parsed.clientName as string) ?? "").toLowerCase();
      const clickupHint =
        ((parsed.classification?.clickupProjectHint as string) ?? "").toLowerCase();
      text += ` ${from} ${subject} ${body} ${projectName} ${clientName} ${clickupHint}`;
    } catch {
      /* keep title-only text */
    }
  }

  return text;
}

// ─── Client filter function ────────────────────────────────────────────────

export function filterByClient(
  items: InboxItemFilterable[],
  clientFilter: string
): InboxItemFilterable[] {
  if (clientFilter === "all") return items;

  return items.filter((item) => {
    const text = buildSearchableText(item);

    if (!text.trim()) return clientFilter === "Others";

    const clientLower = clientFilter.toLowerCase();

    // Direct match
    if (text.includes(clientLower)) return true;

    // Special cases — sub-client and alias mappings
    if (
      clientFilter === "TikTok" &&
      (text.includes("tiktok") || text.includes("bytedance"))
    )
      return true;

    if (clientFilter === "Ubi") {
      for (const sub of UBI_SUB_CLIENTS) {
        if (text.includes(sub)) return true;
      }
    }

    if (clientFilter === "PICO XR" && text.includes("pico")) return true;

    if (clientFilter === "CMC Markets" && text.includes("cmc")) return true;

    // "Others" — items that don't match any known client
    if (clientFilter === "Others") {
      return !KNOWN_CLIENTS.some((c) => text.includes(c));
    }

    return false;
  });
}
