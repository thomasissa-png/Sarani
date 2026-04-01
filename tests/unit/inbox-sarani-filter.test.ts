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

describe("isSaraniOutgoingReply — detects forwarded Sarani replies", () => {
  it('detects body with @sarani.studio + "De :" (French thread marker)', () => {
    const body = 'De : Fanny Calvet <fanny@sarani.studio>\nEnvoyé : lundi 31 mars 2026\nObjet : RE: Black Friday\n\nHi Marc, got it!';
    expect(isSaraniOutgoingReply(body)).toBe(true);
  });

  it('detects body with @sarani.studio + "From:" (English thread marker)', () => {
    const body = 'From: thomas@sarani.studio\nSent: Monday March 31\nSubject: RE: TikTok Campaign\n\nWe are on it.';
    expect(isSaraniOutgoingReply(body)).toBe(true);
  });

  it('detects body with @sarani.studio + "Envoyé :" marker', () => {
    const body = 'Envoyé : mardi 1 avril\narya@sarani.studio a écrit :\nVoici le brief.';
    expect(isSaraniOutgoingReply(body)).toBe(true);
  });

  it("does NOT flag body without @sarani.studio", () => {
    const body = 'De : Marc Dupont <marc@sony.com>\nEnvoyé : lundi 31 mars\n\nPlease adjust the banners.';
    expect(isSaraniOutgoingReply(body)).toBe(false);
  });

  it("does NOT flag body with @sarani.studio but no thread marker", () => {
    const body = 'Hi team, please forward this to fanny@sarani.studio for review. Thanks!';
    expect(isSaraniOutgoingReply(body)).toBe(false);
  });

  it("only checks the first 400 characters of the body", () => {
    // @sarani.studio appears AFTER the 400-char boundary — should NOT match
    const padding = "A".repeat(390);
    const body = `${padding} De : fanny@sarani.studio`;
    expect(isSaraniOutgoingReply(body)).toBe(false);
  });

  it("detects markers within the 400-char window", () => {
    const body = 'De : fanny@sarani.studio\n' + "A".repeat(500);
    expect(isSaraniOutgoingReply(body)).toBe(true);
  });

  it("handles empty body gracefully", () => {
    expect(isSaraniOutgoingReply("")).toBe(false);
  });

  it("is case-insensitive on markers", () => {
    const body = 'DE : FANNY@SARANI.STUDIO\nENVOYÉ : LUNDI';
    expect(isSaraniOutgoingReply(body)).toBe(true);
  });
});
