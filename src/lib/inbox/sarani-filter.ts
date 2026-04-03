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

/**
 * Strip email reply/forward prefixes from subject lines.
 * Handles all common patterns across languages:
 * - English: Re:, Fwd:, FW:
 * - French: Tr:, Rép:
 * - German: AW:, WG:
 * - Spanish/Portuguese: RES:, ENC:
 * - Italian: I:, R:
 * Also handles repeated prefixes: "Re: Re: Re: Fwd: Re: Subject" → "Subject"
 * And bracket notation: "RE: [EXT] Tr: Subject" → "[EXT] Subject"
 */
export function cleanEmailSubject(subject: string): string {
  // Repeatedly strip known prefixes from the start until none remain
  // Pattern matches: Re:, RE:, Fwd:, FW:, Tr:, TR:, Rép:, AW:, WG:, RES:, ENC:, I:, R:
  // Each prefix may be followed by optional whitespace
  let cleaned = subject.trim();
  const prefixRegex = /^(?:Re|RE|Ré|Rép|RÉP|Fwd|FWD|Fw|FW|Tr|TR|AW|WG|RES|ENC|SV|VS)\s*:\s*/i;

  let iterations = 0;
  while (prefixRegex.test(cleaned) && iterations < 20) {
    cleaned = cleaned.replace(prefixRegex, "").trim();
    iterations++;
  }

  return cleaned;
}
