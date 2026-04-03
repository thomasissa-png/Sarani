// ─── Client Logo Mapping ─────────────────────────────────────────────────────
// Static map of client logos available in public/. Used by the LinkedIn visual
// generator to embed the client logo in the pill header.
//
// Rule: NEVER generate/approximate a logo (project-context.md absolute rule).
// If a client logo is not in this map, the visual shows only the Sarani logo.

const CLIENT_LOGOS: Record<string, string> = {
  Sony: "/client-logo-sony.png",
  IKEA: "/client-logo-ikea.png",
  Bose: "/client-logo-bose.png",
  adidas: "/client-logo-adidas.png",
  TikTok: "/client-logo-tiktok.png",
  LEGO: "/client-logo-lego.png",
};

/**
 * Returns the public path to the client logo PNG, or null if not available.
 * Tries exact match first, then case-insensitive lookup.
 */
export function getClientLogoUrl(clientName: string): string | null {
  // Exact match
  if (CLIENT_LOGOS[clientName]) {
    return CLIENT_LOGOS[clientName];
  }
  // Case-insensitive fallback
  const match = Object.entries(CLIENT_LOGOS).find(
    ([key]) => key.toLowerCase() === clientName.toLowerCase()
  );
  return match ? match[1] : null;
}
