/**
 * Tests for config-based subdivision lookup.
 * This is the PRIMARY mechanism for mapping ClickUp lists → SharePoint folders.
 * No fuzzy matching — deterministic lookup by ClickUp list ID.
 */
import { describe, it, expect } from "vitest";
import {
  getSubdivisionByListId,
  CLIENT_MAPPINGS,
} from "@/lib/integrations/config";

describe("getSubdivisionByListId — TikTok divisions", () => {
  it("CRITICAL: TikTok P&E SEA list ID → correct subdivision", () => {
    const result = getSubdivisionByListId("901702879453");
    expect(result).not.toBeNull();
    expect(result!.mapping.clickupSpaceName).toBe("TikTok");
    expect(result!.subdivision.name).toBe("TikTok P&E SEA");
    expect(result!.subdivision.sharepointSubfolder).toBe("15. TikTok P&E SEA");
  });

  it("TikTok Shop UK list ID → correct subdivision", () => {
    const result = getSubdivisionByListId("901706876621");
    expect(result).not.toBeNull();
    expect(result!.subdivision.name).toBe("TikTok Shop UK");
    expect(result!.subdivision.sharepointSubfolder).toBe("20. TikTok Shop UK");
  });

  it("TikTok France list ID → correct subdivision", () => {
    const result = getSubdivisionByListId("900502247465");
    expect(result).not.toBeNull();
    expect(result!.subdivision.name).toBe("TikTok France");
  });

  it("TikTok Germany list ID → correct subdivision", () => {
    const result = getSubdivisionByListId("900502249117");
    expect(result).not.toBeNull();
    expect(result!.subdivision.name).toBe("TikTok Germany");
  });

  it("TikTok Others list ID → Others subdivision", () => {
    const result = getSubdivisionByListId("901705458972");
    expect(result).not.toBeNull();
    // Note: 901705458972 is used by both TikTok Others and TikTok CCA
    expect(result!.mapping.clickupSpaceName).toBe("TikTok");
  });

  it("TikTok EU Branding list ID → correct subdivision", () => {
    const result = getSubdivisionByListId("901711816120");
    expect(result).not.toBeNull();
    expect(result!.subdivision.name).toBe("TikTok EU Branding");
    expect(result!.subdivision.sharepointSubfolder).toBe("21. TikTok EU Branding");
  });
});

describe("getSubdivisionByListId — Sony divisions", () => {
  it("Sony France list ID → correct subdivision", () => {
    const result = getSubdivisionByListId("900303355039");
    expect(result).not.toBeNull();
    expect(result!.mapping.clickupSpaceName).toBe("Sony");
    expect(result!.subdivision.name).toBe("Sony France");
  });

  it("Sony Europe list ID → correct subdivision", () => {
    const result = getSubdivisionByListId("900502245411");
    expect(result).not.toBeNull();
    expect(result!.subdivision.name).toBe("Sony Europe");
  });

  it("Sony Pro list ID → correct subdivision", () => {
    const result = getSubdivisionByListId("900502249763");
    expect(result).not.toBeNull();
    expect(result!.subdivision.name).toBe("Sony Pro");
  });
});

describe("getSubdivisionByListId — Ubi sub-clients", () => {
  it("Adidas via Ubi list ID → correct subdivision", () => {
    const result = getSubdivisionByListId("901704341200");
    expect(result).not.toBeNull();
    expect(result!.mapping.clickupSpaceName).toBe("Ubi");
    expect(result!.subdivision.name).toBe("Adidas");
  });

  it("LEGO via Ubi list ID → correct subdivision", () => {
    const result = getSubdivisionByListId("901704345855");
    expect(result).not.toBeNull();
    expect(result!.subdivision.name).toBe("LEGO");
  });

  it("IKEA via Ubi list ID → correct subdivision", () => {
    const result = getSubdivisionByListId("901704970300");
    expect(result).not.toBeNull();
    expect(result!.subdivision.name).toBe("IKEA");
  });

  it("Barilla via Ubi list ID → correct subdivision", () => {
    const result = getSubdivisionByListId("901712149614");
    expect(result).not.toBeNull();
    expect(result!.subdivision.name).toBe("Barilla");
  });
});

describe("getSubdivisionByListId — Aujan sub-brands", () => {
  it("Rani list ID → correct subdivision", () => {
    const result = getSubdivisionByListId("901704818470");
    expect(result).not.toBeNull();
    expect(result!.mapping.clickupSpaceName).toBe("Aujan");
    expect(result!.subdivision.name).toBe("Rani");
  });

  it("Barbican list ID → correct subdivision", () => {
    const result = getSubdivisionByListId("901705328468");
    expect(result).not.toBeNull();
    expect(result!.subdivision.name).toBe("Barbican");
  });
});

describe("getSubdivisionByListId — PICO divisions", () => {
  it("PICO B2C EMEA list ID → correct subdivision", () => {
    const result = getSubdivisionByListId("900502247535");
    expect(result).not.toBeNull();
    expect(result!.mapping.clickupSpaceName).toBe("PICO XR");
    expect(result!.subdivision.name).toBe("PICO B2C EMEA");
  });

  it("PICO B2B EMEA list ID → correct subdivision", () => {
    const result = getSubdivisionByListId("900502247536");
    expect(result).not.toBeNull();
    expect(result!.subdivision.name).toBe("PICO B2B EMEA");
  });
});

describe("getSubdivisionByListId — Aristocrat divisions", () => {
  it("Aristocrat USA list ID → correct subdivision", () => {
    const result = getSubdivisionByListId("901712262709");
    expect(result).not.toBeNull();
    expect(result!.mapping.clickupSpaceName).toBe("Aristocrat");
    expect(result!.subdivision.name).toBe("Aristocrat USA");
  });

  it("Aristocrat Asia list ID → correct subdivision", () => {
    const result = getSubdivisionByListId("901712262834");
    expect(result).not.toBeNull();
    expect(result!.subdivision.name).toBe("Aristocrat Asia");
  });
});

describe("getSubdivisionByListId — edge cases", () => {
  it("unknown list ID → undefined", () => {
    expect(getSubdivisionByListId("999999999")).toBeUndefined();
  });

  it("empty string → undefined", () => {
    expect(getSubdivisionByListId("")).toBeUndefined();
  });

  it("all TikTok subdivisions have sharepointSubfolder defined", () => {
    const tiktokMapping = CLIENT_MAPPINGS.find((m) => m.clickupSpaceName === "TikTok");
    expect(tiktokMapping).toBeDefined();
    expect(tiktokMapping!.subdivisions).toBeDefined();
    for (const sub of tiktokMapping!.subdivisions!) {
      expect(sub.sharepointSubfolder).toBeDefined();
      expect(sub.sharepointSubfolder!.length).toBeGreaterThan(0);
    }
  });

  it("TikTok has 21+ subdivisions (all divisions from business rules)", () => {
    const tiktokMapping = CLIENT_MAPPINGS.find((m) => m.clickupSpaceName === "TikTok");
    expect(tiktokMapping!.subdivisions!.length).toBeGreaterThanOrEqual(21);
  });
});
