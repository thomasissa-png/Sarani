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
 * DEPRECATED — body detection caused too many false positives.
 * Client email threads contain @sarani.studio in quoted replies below,
 * which filtered out legitimate client emails.
 * Now we only filter by FROM address (isSaraniEmail).
 * Kept for backward compat with tests — always returns false.
 */
export function isSaraniOutgoingReply(_bodyPreview: string): boolean {
  return false;
}
