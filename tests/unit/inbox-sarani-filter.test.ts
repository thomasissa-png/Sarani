/**
 * Unit tests for Sarani internal email filter — sarani-filter.ts
 * WHY: Without this filter, every internal reply between Sarani team members
 * pollutes the inbox. The PM sees 50 internal emails mixed with 10 real client
 * emails. Missed filter = noise. Wrong filter = lost client email.
 */

import { describe, it, expect } from "vitest";
import {
  isSaraniEmail,
  isSaraniOutgoingReply,
  cleanEmailSubject,
} from "@/lib/inbox/sarani-filter";

/* ---------- isSaraniEmail ---------- */

describe("isSaraniEmail — detects Sarani team addresses", () => {
  it("detects fanny@sarani.studio as Sarani", () => {
    expect(isSaraniEmail("fanny@sarani.studio")).toBe(true);
  });

  it("detects thomas@sarani.studio as Sarani", () => {
    expect(isSaraniEmail("thomas@sarani.studio")).toBe(true);
  });

  it("detects arya@sarani.studio as Sarani", () => {
    expect(isSaraniEmail("arya@sarani.studio")).toBe(true);
  });

  it("does NOT flag client emails", () => {
    expect(isSaraniEmail("marc@sony.com")).toBe(false);
  });

  it("does NOT flag similar-looking domains", () => {
    expect(isSaraniEmail("user@sarani.com")).toBe(false);
  });

  it("does NOT flag subdomains", () => {
    expect(isSaraniEmail("user@mail.sarani.studio")).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(isSaraniEmail("Fanny@Sarani.Studio")).toBe(true);
  });

  it("is case-insensitive with all caps", () => {
    expect(isSaraniEmail("THOMAS@SARANI.STUDIO")).toBe(true);
  });

  it("does NOT flag emails containing sarani.studio in local part", () => {
    // "sarani.studio@gmail.com" should NOT match — domain is gmail.com
    expect(isSaraniEmail("sarani.studio@gmail.com")).toBe(false);
  });
});

/* ---------- isSaraniOutgoingReply ---------- */
// DEPRECATED: body detection removed — caused too many false positives.
// Now only filters by FROM address. Function always returns false.

describe("isSaraniOutgoingReply — DEPRECATED (always false)", () => {
  it("always returns false (body detection disabled)", () => {
    const body = 'De : Fanny Calvet <fanny@sarani.studio>\nEnvoyé : lundi 31 mars 2026';
    expect(isSaraniOutgoingReply(body)).toBe(false);
  });

  it("does not filter client emails with sarani in thread", () => {
    const body = 'Hi Thomas, here is my feedback.\n\nDe : fanny@sarani.studio\nSent: Monday';
    expect(isSaraniOutgoingReply(body)).toBe(false);
  });

  it("does not filter any body content (deprecated)", () => {
    expect(isSaraniOutgoingReply("De : fanny@sarani.studio\ntest")).toBe(false);
    expect(isSaraniOutgoingReply("From: thomas@sarani.studio\ntest")).toBe(false);
    expect(isSaraniOutgoingReply("")).toBe(false);
  });
});

/* ---------- cleanEmailSubject ---------- */

describe("cleanEmailSubject — strips Re:/Tr:/Fwd: prefixes from subjects", () => {
  it("strips single Re:", () => {
    expect(cleanEmailSubject("Re: TikTok Banners Q2")).toBe("TikTok Banners Q2");
  });

  it("strips repeated Re: Re: Re:", () => {
    expect(cleanEmailSubject("Re: Re: Re: TikTok Banners Q2")).toBe("TikTok Banners Q2");
  });

  it("strips French Tr: (transféré)", () => {
    expect(cleanEmailSubject("Tr: Boulanger Key Visuals")).toBe("Boulanger Key Visuals");
  });

  it("strips mixed Re: Tr: Re: Fwd:", () => {
    expect(cleanEmailSubject("Re: Tr: Re: Fwd: Project Delivery")).toBe("Project Delivery");
  });

  it("strips case-insensitive RE: and FW:", () => {
    expect(cleanEmailSubject("RE: FW: RE: Budget Approval")).toBe("Budget Approval");
  });

  it("strips Fwd:", () => {
    expect(cleanEmailSubject("Fwd: New Brief from Client")).toBe("New Brief from Client");
  });

  it("strips German AW: and WG:", () => {
    expect(cleanEmailSubject("AW: WG: Kampagne Herbst")).toBe("Kampagne Herbst");
  });

  it("strips French Rép:", () => {
    expect(cleanEmailSubject("Rép: Devis Création")).toBe("Devis Création");
  });

  it("handles extra whitespace", () => {
    expect(cleanEmailSubject("  Re:   Re:  Subject  ")).toBe("Subject");
  });

  it("returns clean subject unchanged", () => {
    expect(cleanEmailSubject("TikTok P&E SEA Campaign")).toBe("TikTok P&E SEA Campaign");
  });

  it("handles empty string", () => {
    expect(cleanEmailSubject("")).toBe("");
  });

  it("does not strip Re from middle of subject", () => {
    expect(cleanEmailSubject("Project Review Meeting")).toBe("Project Review Meeting");
  });

  it("preserves [EXT] tags in subject", () => {
    expect(cleanEmailSubject("Re: [EXT] Feedback on Visuals")).toBe("[EXT] Feedback on Visuals");
  });

  it("handles Re: with no space after colon", () => {
    expect(cleanEmailSubject("Re:Quick Question")).toBe("Quick Question");
  });
});
