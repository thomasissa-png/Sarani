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
  // TODO: download logo from SP — PICO XR branding folder
  // "PICO XR": "/client-logo-pico-xr.png",
  // TODO: download logo from SP — Aristocrat branding folder
  // Aristocrat: "/client-logo-aristocrat.png",
  // TODO: download logo from SP — Aujan/Rani/Barbican assets folder
  // Aujan: "/client-logo-aujan.png",
  // TODO: download logo from SP — Ubi branding (or sub-client logos individually)
  // Ubi: "/client-logo-ubi.png",
  // TODO: download logo from SP — Lamarck logo folder
  // Lamarck: "/client-logo-lamarck.png",
  // TODO: download logo from SP — CMC Markets brand guidelines
  // "CMC Markets": "/client-logo-cmc-markets.png",
  // TODO: download logo from SP — GEODIS branding folder
  // GEODIS: "/client-logo-geodis.png",
  // TODO: download logo from SP — ProcessOut branding folder
  // ProcessOut: "/client-logo-processout.png",
  // TODO: download logo from SP — Air Corsica assets folder
  // "Air Corsica": "/client-logo-air-corsica.png",
  // TODO: Pernod Ricard — no branding data documented in arya-business-rules.md
  // "Pernod Ricard": "/client-logo-pernod-ricard.png",
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
