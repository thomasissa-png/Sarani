// ─── Sarani internal email filter ──────────────────────────────────────────
// Extracted from poll-emails/route.ts for testability.
// Filters out internal Sarani emails that should not appear in the inbox.

/**
 * Check if an email is from a Sarani team member by sender address.
 */
export function isSaraniEmail(from: string): boolean {
  return from.toLowerCase().endsWith("@sarani.studio");
}

/**
 * Detect if an email body is a Sarani outgoing reply forwarded back.
 * Checks if the beginning of the body contains @sarani.studio AND a thread marker
 * (De : / From: / Envoyé :), indicating this is a thread where Sarani already replied.
 */
export function isSaraniOutgoingReply(bodyPreview: string): boolean {
  const bodyStart = bodyPreview.slice(0, 400).toLowerCase();
  const hasSaraniInBody = bodyStart.includes("@sarani.studio");
  const hasThreadMarker =
    bodyStart.includes("de :") ||
    bodyStart.includes("from:") ||
    bodyStart.includes("envoyé :");
  return hasSaraniInBody && hasThreadMarker;
}
