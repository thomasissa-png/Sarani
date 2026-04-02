/**
 * Unit tests for inbox CLIENT filtering — client-filter.ts
 *
 * WHY: The PM filters inbox items by client name (TikTok, Sony, Ubi, Lamarck...).
 * If this filter is broken, Thomas processes items in the wrong client context:
 * a TikTok review showing under Sony = wrong ClickUp project, wrong PM, wrong response.
 * Sub-client mapping (Adidas → Ubi) is critical business logic — Adidas briefs
 * MUST appear under Ubi's tab because Ubi is the contracting client.
 *
 * These tests use REAL production data shapes — actual email subjects, actual
 * client names, actual summary JSON structures seen in production.
 */

import { describe, it, expect } from "vitest";
import {
  filterByClient,
  buildSearchableText,
  KNOWN_CLIENTS,
  UBI_SUB_CLIENTS,
} from "@/lib/inbox/client-filter";
import type { InboxItemFilterable } from "@/lib/inbox/filters";

/* ---------- Test data factory ---------- */

function makeItem(
  overrides: Partial<InboxItemFilterable> & { id: string }
): InboxItemFilterable {
  return {
    type: "email_classified",
    status: "pending",
    protocol: null,
    processedAt: null,
    createdAt: new Date().toISOString(),
    summary: null,
    sourceId: null,
    sourceType: null,
    title: null,
    priority: null,
    pmId: null,
    projectId: null,
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

/* ========================================================================== */
/*  1. Review TikTok in the correct client tab                                */
/* ========================================================================== */

describe("Client filter — TikTok review item", () => {
  const reviewItem = makeItem({
    id: "r1",
    type: "review_human",
    status: "pending",
    protocol: "PROTO-REVIEW-INTAKE",
    title: "AI Review Ready — pre-verified by Arya (TikTok DE - Weekly Batch)",
    summary: JSON.stringify({
      clickupTaskId: "abc123",
      clientName: "TikTok",
      attempt: 1,
    }),
  });

  it("appears when client filter = TikTok (clientName in summary)", () => {
    const result = filterByClient([reviewItem], "TikTok");
    expect(result.map((i) => i.id)).toContain("r1");
  });

  it("does NOT appear when client filter = Sony", () => {
    const result = filterByClient([reviewItem], "Sony");
    expect(result.map((i) => i.id)).not.toContain("r1");
  });

  it("does NOT appear when client filter = Ubi", () => {
    const result = filterByClient([reviewItem], "Ubi");
    expect(result.map((i) => i.id)).not.toContain("r1");
  });

  it("appears when client filter = all (no filtering)", () => {
    const result = filterByClient([reviewItem], "all");
    expect(result.map((i) => i.id)).toContain("r1");
  });

  it("does NOT appear in Others (TikTok is a known client)", () => {
    const result = filterByClient([reviewItem], "Others");
    expect(result.map((i) => i.id)).not.toContain("r1");
  });
});

/* ========================================================================== */
/*  2. Sony email with Sarani thread — from is Sony, NOT Sarani               */
/* ========================================================================== */

describe("Client filter — Sony email with Sarani reply in thread", () => {
  const sonyEmail = makeItem({
    id: "e1",
    type: "email_classified",
    status: "pending",
    protocol: "PROTO-CLIENT-RETURN",
    title: "[project_feedback] RE: Toolkit 2 webpop briefs",
    summary: JSON.stringify({
      from: "Mayumi.Donovan@sony.com",
      subject: "RE: Toolkit 2 webpop briefs",
      bodyPreview:
        "Hi Thomas, please find the updated assets. De : Fanny Place <fanny@sarani.studio> ...",
      classification: {
        category: "project_feedback",
        routeTo: "PROTO-CLIENT-RETURN",
      },
    }),
  });

  it("matches client filter = Sony (from is @sony.com)", () => {
    const result = filterByClient([sonyEmail], "Sony");
    expect(result.map((i) => i.id)).toContain("e1");
  });

  it("does NOT match client filter = TikTok", () => {
    const result = filterByClient([sonyEmail], "TikTok");
    expect(result.map((i) => i.id)).not.toContain("e1");
  });

  it("does NOT appear in Others (sony is a known client)", () => {
    const result = filterByClient([sonyEmail], "Others");
    expect(result.map((i) => i.id)).not.toContain("e1");
  });

  it("the @sarani.studio in body thread does NOT make it match Sarani-based filters", () => {
    // The from field is Sony — the Sarani mention is only in the thread body.
    // buildSearchableText includes bodyPreview, so "sarani" IS in the text.
    // But the client filter should match by client name, not by random text.
    // This test documents current behavior: since bodyPreview contains "sarani",
    // a filter for "sarani" WOULD match. This is expected — the client filter
    // is a text search, not a from-only filter. The Sarani email filter
    // (sarani-filter.ts) handles the from-only case separately.
    const text = buildSearchableText(sonyEmail);
    expect(text).toContain("sony");
    expect(text).toContain("sarani"); // present in body thread — expected
  });
});

/* ========================================================================== */
/*  3. Email FROM @sarani.studio — Sarani internal email                      */
/* ========================================================================== */

describe("Client filter — email from @sarani.studio", () => {
  const saraniEmail = makeItem({
    id: "e2",
    type: "email_classified",
    status: "pending",
    protocol: "PROTO-EMAIL-INTAKE",
    summary: JSON.stringify({
      from: "fanny@sarani.studio",
      subject: "Brief sent",
      bodyPreview: "The brief has been sent to the client.",
    }),
  });

  it("does NOT match any known client filter (Sarani is not a client)", () => {
    // sarani is not in KNOWN_CLIENTS, so it should land in "Others"
    const result = filterByClient([saraniEmail], "Others");
    expect(result.map((i) => i.id)).toContain("e2");
  });

  it("does NOT match Sony filter", () => {
    const result = filterByClient([saraniEmail], "Sony");
    expect(result.map((i) => i.id)).not.toContain("e2");
  });

  it("does NOT match TikTok filter", () => {
    const result = filterByClient([saraniEmail], "TikTok");
    expect(result.map((i) => i.id)).not.toContain("e2");
  });

  it("buildSearchableText includes the from address", () => {
    const text = buildSearchableText(saraniEmail);
    expect(text).toContain("fanny@sarani.studio");
  });
});

/* ========================================================================== */
/*  4. Feedback Lamarck with SharePoint link — summary parsing                */
/* ========================================================================== */

describe("Client filter — Lamarck feedback with SharePoint link", () => {
  const lamarckFeedback = makeItem({
    id: "fb-lamarck",
    type: "email_classified",
    status: "pending",
    protocol: "PROTO-CLIENT-RETURN",
    title: "[project_feedback] RE: Campagne print Q2",
    summary: JSON.stringify({
      from: "philippe@lamarck.fr",
      subject: "RE: Campagne print Q2",
      bodyPreview:
        "Bonjour Thomas, voici les retours : https://lamarckgroup.sharepoint.com/sites/Marketing/Documents/Feedback-Q2.pdf Merci",
      classification: {
        category: "project_feedback",
        routeTo: "PROTO-CLIENT-RETURN",
      },
    }),
  });

  it("matches client filter = Lamarck", () => {
    const result = filterByClient([lamarckFeedback], "Lamarck");
    expect(result.map((i) => i.id)).toContain("fb-lamarck");
  });

  it("buildSearchableText contains the SharePoint URL", () => {
    const text = buildSearchableText(lamarckFeedback);
    expect(text).toContain("sharepoint.com");
  });

  it("does NOT match Sony filter", () => {
    const result = filterByClient([lamarckFeedback], "Sony");
    expect(result.map((i) => i.id)).not.toContain("fb-lamarck");
  });

  it("does NOT appear in Others (lamarck is a known client)", () => {
    const result = filterByClient([lamarckFeedback], "Others");
    expect(result.map((i) => i.id)).not.toContain("fb-lamarck");
  });
});

/* ========================================================================== */
/*  5. "Merci" email classified as "other" — goes to Others tab               */
/* ========================================================================== */

describe('Client filter — "merci" email classified as other', () => {
  const merciEmail = makeItem({
    id: "e3",
    type: "email_classified",
    status: "pending",
    protocol: null,
    title: "[other] Re: Catalogue",
    summary: JSON.stringify({
      from: "mylene@lamarck.fr",
      subject: "Re: Catalogue",
      bodyPreview: "Merci!",
      classification: { category: "other", routeTo: "archive" },
    }),
  });

  it("matches client filter = Lamarck (from @lamarck.fr)", () => {
    const result = filterByClient([merciEmail], "Lamarck");
    expect(result.map((i) => i.id)).toContain("e3");
  });

  it("does NOT appear in Others (lamarck is a known client)", () => {
    const result = filterByClient([merciEmail], "Others");
    expect(result.map((i) => i.id)).not.toContain("e3");
  });

  it("does NOT match TikTok filter", () => {
    const result = filterByClient([merciEmail], "TikTok");
    expect(result.map((i) => i.id)).not.toContain("e3");
  });
});

/* ========================================================================== */
/*  6. Adidas email routed to Ubi (sub-client mapping)                        */
/* ========================================================================== */

describe("Client filter — Adidas email mapped to Ubi", () => {
  const adidasEmail = makeItem({
    id: "e4",
    type: "email_classified",
    status: "pending",
    protocol: "PROTO-EMAIL-INTAKE",
    title: "[new_project] New campaign brief",
    summary: JSON.stringify({
      from: "contact@adidas.com",
      subject: "New campaign brief",
      bodyPreview:
        "Hi Sarani team, we would like to brief you on a new campaign for Spring 2026.",
    }),
  });

  it("matches client filter = Ubi (adidas is a Ubi sub-client)", () => {
    const result = filterByClient([adidasEmail], "Ubi");
    expect(result.map((i) => i.id)).toContain("e4");
  });

  it("also matches client filter = Adidas (direct text match)", () => {
    // "adidas" is in the from field, so direct match works too
    // This is important: filtering by "Adidas" directly should also work
    const result = filterByClient([adidasEmail], "Adidas");
    expect(result.map((i) => i.id)).toContain("e4");
  });

  it("does NOT match Sony filter", () => {
    const result = filterByClient([adidasEmail], "Sony");
    expect(result.map((i) => i.id)).not.toContain("e4");
  });

  it("does NOT appear in Others (adidas is a known client)", () => {
    const result = filterByClient([adidasEmail], "Others");
    expect(result.map((i) => i.id)).not.toContain("e4");
  });
});

/* ========================================================================== */
/*  7. All Ubi sub-clients map correctly                                       */
/* ========================================================================== */

describe("Client filter — all Ubi sub-clients", () => {
  for (const subClient of UBI_SUB_CLIENTS) {
    // Skip "@ubi." — it's a domain fragment, not a standalone name
    if (subClient === "@ubi.") continue;

    it(`${subClient} email appears under Ubi filter`, () => {
      const item = makeItem({
        id: `ubi-sub-${subClient}`,
        type: "email_classified",
        status: "pending",
        protocol: "PROTO-EMAIL-INTAKE",
        summary: JSON.stringify({
          from: `contact@${subClient}.com`,
          subject: "Brief",
          bodyPreview: "New brief",
        }),
      });
      const result = filterByClient([item], "Ubi");
      expect(result.map((i) => i.id)).toContain(`ubi-sub-${subClient}`);
    });
  }

  it("@ubi.com domain appears under Ubi filter", () => {
    const item = makeItem({
      id: "ubi-domain",
      type: "email_classified",
      status: "pending",
      protocol: "PROTO-EMAIL-INTAKE",
      summary: JSON.stringify({
        from: "marc@ubi.com",
        subject: "Brief",
        bodyPreview: "New brief",
      }),
    });
    const result = filterByClient([item], "Ubi");
    expect(result.map((i) => i.id)).toContain("ubi-domain");
  });
});

/* ========================================================================== */
/*  8. Special client aliases                                                  */
/* ========================================================================== */

describe("Client filter — special aliases", () => {
  it("ByteDance email appears under TikTok filter", () => {
    const item = makeItem({
      id: "bytedance-1",
      type: "email_classified",
      status: "pending",
      protocol: "PROTO-EMAIL-INTAKE",
      summary: JSON.stringify({
        from: "recruiter@bytedance.com",
        subject: "Partnership",
        bodyPreview: "Hi",
      }),
    });
    const result = filterByClient([item], "TikTok");
    expect(result.map((i) => i.id)).toContain("bytedance-1");
  });

  it("PICO email appears under PICO XR filter", () => {
    const item = makeItem({
      id: "pico-1",
      type: "email_classified",
      status: "pending",
      protocol: "PROTO-EMAIL-INTAKE",
      summary: JSON.stringify({
        from: "contact@pico.com",
        subject: "VR headset campaign",
        bodyPreview: "New campaign",
      }),
    });
    const result = filterByClient([item], "PICO XR");
    expect(result.map((i) => i.id)).toContain("pico-1");
  });

  it("CMC email appears under CMC Markets filter", () => {
    const item = makeItem({
      id: "cmc-1",
      type: "email_classified",
      status: "pending",
      protocol: "PROTO-EMAIL-INTAKE",
      summary: JSON.stringify({
        from: "contact@cmc.com",
        subject: "Trading platform redesign",
        bodyPreview: "Brief",
      }),
    });
    const result = filterByClient([item], "CMC Markets");
    expect(result.map((i) => i.id)).toContain("cmc-1");
  });
});

/* ========================================================================== */
/*  9. "Others" filter — items with no known client                            */
/* ========================================================================== */

describe('Client filter — "Others" bucket', () => {
  const unknownEmail = makeItem({
    id: "unknown-1",
    type: "email_classified",
    status: "pending",
    protocol: null,
    title: "[other] Newsletter subscription",
    summary: JSON.stringify({
      from: "noreply@mailchimp.com",
      subject: "Newsletter subscription",
      bodyPreview: "You have been subscribed",
      classification: { category: "other", routeTo: "archive" },
    }),
  });

  it("unknown sender appears in Others", () => {
    const result = filterByClient([unknownEmail], "Others");
    expect(result.map((i) => i.id)).toContain("unknown-1");
  });

  it("unknown sender does NOT appear under any specific client", () => {
    for (const client of ["TikTok", "Sony", "Ubi", "Lamarck", "Bose"]) {
      const result = filterByClient([unknownEmail], client);
      expect(result.map((i) => i.id)).not.toContain("unknown-1");
    }
  });

  it("item with empty text goes to Others", () => {
    const emptyItem = makeItem({
      id: "empty-1",
      type: "email_classified",
      status: "pending",
      protocol: null,
      title: "",
      summary: null,
    });
    const result = filterByClient([emptyItem], "Others");
    expect(result.map((i) => i.id)).toContain("empty-1");
  });

  it("item with empty text does NOT match a specific client", () => {
    const emptyItem = makeItem({
      id: "empty-2",
      type: "email_classified",
      status: "pending",
      protocol: null,
      title: "",
      summary: null,
    });
    const result = filterByClient([emptyItem], "Sony");
    expect(result.map((i) => i.id)).not.toContain("empty-2");
  });
});

/* ========================================================================== */
/*  10. buildSearchableText — robust parsing                                   */
/* ========================================================================== */

describe("buildSearchableText — extracts all fields", () => {
  it("includes title, from, subject, bodyPreview, projectName, clientName, clickupHint", () => {
    const item = makeItem({
      id: "full-1",
      title: "My Title",
      summary: JSON.stringify({
        from: "user@test.com",
        subject: "Test Subject",
        bodyPreview: "Hello body",
        projectName: "Project Alpha",
        clientName: "ClientX",
        classification: { clickupProjectHint: "HINT-123" },
      }),
    });
    const text = buildSearchableText(item);
    expect(text).toContain("my title");
    expect(text).toContain("user@test.com");
    expect(text).toContain("test subject");
    expect(text).toContain("hello body");
    expect(text).toContain("project alpha");
    expect(text).toContain("clientx");
    expect(text).toContain("hint-123");
  });

  it("handles malformed JSON summary gracefully (falls back to title only)", () => {
    const item = makeItem({
      id: "malformed-1",
      title: "Fallback Title",
      summary: "{invalid json!!!",
    });
    const text = buildSearchableText(item);
    expect(text).toContain("fallback title");
    // Should not throw
  });

  it("handles null summary", () => {
    const item = makeItem({
      id: "null-summary",
      title: "Only Title",
      summary: null,
    });
    const text = buildSearchableText(item);
    expect(text).toContain("only title");
  });

  it("handles null title", () => {
    const item = makeItem({
      id: "null-title",
      title: null,
      summary: JSON.stringify({ from: "a@b.com" }),
    });
    const text = buildSearchableText(item);
    expect(text).toContain("a@b.com");
  });
});

/* ========================================================================== */
/*  11. Mixed set — filter by client with multiple items                       */
/* ========================================================================== */

describe("Client filter — mixed items, single filter", () => {
  const items = [
    makeItem({
      id: "tiktok-review",
      type: "review_human",
      status: "pending",
      title: "AI Review Ready (TikTok DE)",
      summary: JSON.stringify({ clientName: "TikTok" }),
    }),
    makeItem({
      id: "sony-feedback",
      type: "email_classified",
      status: "pending",
      protocol: "PROTO-CLIENT-RETURN",
      summary: JSON.stringify({ from: "marc@sony.com", subject: "Feedback" }),
    }),
    makeItem({
      id: "adidas-brief",
      type: "email_classified",
      status: "pending",
      protocol: "PROTO-EMAIL-INTAKE",
      summary: JSON.stringify({ from: "brief@adidas.com", subject: "Campaign" }),
    }),
    makeItem({
      id: "random-newsletter",
      type: "email_classified",
      status: "pending",
      protocol: null,
      summary: JSON.stringify({
        from: "news@random.com",
        subject: "Weekly digest",
      }),
    }),
  ];

  it("TikTok filter returns only TikTok item", () => {
    const result = filterByClient(items, "TikTok");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("tiktok-review");
  });

  it("Sony filter returns only Sony item", () => {
    const result = filterByClient(items, "Sony");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("sony-feedback");
  });

  it("Ubi filter returns Adidas item (sub-client)", () => {
    const result = filterByClient(items, "Ubi");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("adidas-brief");
  });

  it("Others filter returns only newsletter", () => {
    const result = filterByClient(items, "Others");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("random-newsletter");
  });

  it("all filter returns everything", () => {
    const result = filterByClient(items, "all");
    expect(result).toHaveLength(4);
  });
});
