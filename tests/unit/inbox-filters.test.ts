/**
 * Unit tests for inbox tab filtering — filters.ts
 * WHY: If filterItems is broken, the PM sees emails in the wrong tab.
 * A new project brief showing in "other" = lost client. A done item
 * reappearing in "all" = noise that buries real work.
 */

import { describe, it, expect } from "vitest";
import {
  filterItems,
  type InboxItemFilterable,
  type FilterTab,
} from "@/lib/inbox/filters";

/* ---------- Test data factory ---------- */

function makeItem(overrides: Partial<InboxItemFilterable> & { id: string }): InboxItemFilterable {
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

function testItems(): InboxItemFilterable[] {
  return [
    makeItem({ id: "new-1", protocol: "PROTO-EMAIL-INTAKE", status: "pending" }),
    makeItem({ id: "new-2", protocol: "PROTO-EMAIL-INTAKE", status: "in_progress" }),
    makeItem({ id: "fb-1", protocol: "PROTO-CLIENT-RETURN", status: "pending" }),
    makeItem({ id: "enq-1", protocol: "PROTO-ENQUIRY", status: "pending" }),
    makeItem({ id: "other-1", protocol: null, status: "pending" }),
    makeItem({ id: "other-2", protocol: "archive", status: "pending" }),
    makeItem({ id: "done-1", protocol: "PROTO-EMAIL-INTAKE", status: "done" }),
    makeItem({ id: "dismissed-1", protocol: "PROTO-ENQUIRY", status: "dismissed" }),
    makeItem({ id: "noise-1", type: "noise", protocol: null, status: "pending" }),
    makeItem({ id: "followup-1", type: "followup_alert", protocol: null, status: "pending" }),
    makeItem({ id: "review-1", type: "review_human", protocol: null, status: "pending" }),
    makeItem({ id: "review-2", type: "review_ai_ready", protocol: null, status: "pending_review" }),
    makeItem({ id: "review-3", type: "review_escalated", protocol: null, status: "in_progress" }),
    makeItem({ id: "review-done", type: "review_human", protocol: null, status: "done" }),
    // Legacy protocols
    makeItem({ id: "legacy-pitch", protocol: "PROTO-PITCH", status: "pending" }),
    makeItem({ id: "legacy-reply", protocol: "PROTO-CLIENT-REPLY", status: "pending" }),
    makeItem({ id: "legacy-lark", protocol: "PROTO-LARK-TRIAGE", status: "pending" }),
  ];
}

/* ---------- "all" tab ---------- */

describe('filterItems — "all" tab', () => {
  it("excludes done items", () => {
    const result = filterItems(testItems(), "all");
    const ids = result.map((i) => i.id);
    expect(ids).not.toContain("done-1");
  });

  it("excludes dismissed items", () => {
    const result = filterItems(testItems(), "all");
    const ids = result.map((i) => i.id);
    expect(ids).not.toContain("dismissed-1");
  });

  it("includes pending and in_progress items", () => {
    const result = filterItems(testItems(), "all");
    const ids = result.map((i) => i.id);
    expect(ids).toContain("new-1");
    expect(ids).toContain("new-2");
    expect(ids).toContain("fb-1");
    expect(ids).toContain("enq-1");
  });

  it("excludes review-done items", () => {
    const result = filterItems(testItems(), "all");
    const ids = result.map((i) => i.id);
    expect(ids).not.toContain("review-done");
  });
});

/* ---------- "done" tab ---------- */

describe('filterItems — "done" tab', () => {
  it("includes done items", () => {
    const result = filterItems(testItems(), "done");
    const ids = result.map((i) => i.id);
    expect(ids).toContain("done-1");
  });

  it("includes dismissed items", () => {
    const result = filterItems(testItems(), "done");
    const ids = result.map((i) => i.id);
    expect(ids).toContain("dismissed-1");
  });

  it("excludes pending items", () => {
    const result = filterItems(testItems(), "done");
    const ids = result.map((i) => i.id);
    expect(ids).not.toContain("new-1");
    expect(ids).not.toContain("enq-1");
  });
});

/* ---------- "new_project" tab ---------- */

describe('filterItems — "new_project" tab', () => {
  it("includes PROTO-EMAIL-INTAKE items", () => {
    const result = filterItems(testItems(), "new_project");
    const ids = result.map((i) => i.id);
    expect(ids).toContain("new-1");
    expect(ids).toContain("new-2");
  });

  it("excludes done PROTO-EMAIL-INTAKE items", () => {
    const result = filterItems(testItems(), "new_project");
    const ids = result.map((i) => i.id);
    expect(ids).not.toContain("done-1");
  });

  it("excludes items from other protocols", () => {
    const result = filterItems(testItems(), "new_project");
    const ids = result.map((i) => i.id);
    expect(ids).not.toContain("fb-1");
    expect(ids).not.toContain("enq-1");
  });
});

/* ---------- "project_feedback" tab ---------- */

describe('filterItems — "project_feedback" tab', () => {
  it("includes PROTO-CLIENT-RETURN items", () => {
    const result = filterItems(testItems(), "project_feedback");
    const ids = result.map((i) => i.id);
    expect(ids).toContain("fb-1");
  });

  it("excludes other protocols", () => {
    const result = filterItems(testItems(), "project_feedback");
    const ids = result.map((i) => i.id);
    expect(ids).not.toContain("new-1");
    expect(ids).not.toContain("enq-1");
  });
});

/* ---------- "enquiry" tab ---------- */

describe('filterItems — "enquiry" tab', () => {
  it("includes PROTO-ENQUIRY items", () => {
    const result = filterItems(testItems(), "enquiry");
    const ids = result.map((i) => i.id);
    expect(ids).toContain("enq-1");
  });

  it("includes legacy PROTO-PITCH items", () => {
    const result = filterItems(testItems(), "enquiry");
    const ids = result.map((i) => i.id);
    expect(ids).toContain("legacy-pitch");
  });

  it("includes legacy PROTO-CLIENT-REPLY items", () => {
    const result = filterItems(testItems(), "enquiry");
    const ids = result.map((i) => i.id);
    expect(ids).toContain("legacy-reply");
  });

  it("includes legacy PROTO-LARK-TRIAGE items", () => {
    const result = filterItems(testItems(), "enquiry");
    const ids = result.map((i) => i.id);
    expect(ids).toContain("legacy-lark");
  });

  it("excludes dismissed legacy items", () => {
    const items = [
      makeItem({ id: "legacy-dismissed", protocol: "PROTO-PITCH", status: "dismissed" }),
    ];
    const result = filterItems(items, "enquiry");
    expect(result).toHaveLength(0);
  });
});

/* ---------- "other" tab ---------- */

describe('filterItems — "other" tab', () => {
  it("includes items with null protocol that are not noise/followup/review", () => {
    const result = filterItems(testItems(), "other");
    const ids = result.map((i) => i.id);
    expect(ids).toContain("other-1");
  });

  it("includes items with archive protocol", () => {
    const result = filterItems(testItems(), "other");
    const ids = result.map((i) => i.id);
    expect(ids).toContain("other-2");
  });

  it("excludes noise items", () => {
    const result = filterItems(testItems(), "other");
    const ids = result.map((i) => i.id);
    expect(ids).not.toContain("noise-1");
  });

  it("excludes followup_alert items", () => {
    const result = filterItems(testItems(), "other");
    const ids = result.map((i) => i.id);
    expect(ids).not.toContain("followup-1");
  });

  it("excludes review_human items", () => {
    const result = filterItems(testItems(), "other");
    const ids = result.map((i) => i.id);
    expect(ids).not.toContain("review-1");
  });

  it("excludes review_ai_ready items", () => {
    const result = filterItems(testItems(), "other");
    const ids = result.map((i) => i.id);
    expect(ids).not.toContain("review-2");
  });

  it("excludes review_escalated items", () => {
    const result = filterItems(testItems(), "other");
    const ids = result.map((i) => i.id);
    expect(ids).not.toContain("review-3");
  });

  it("excludes items with actual protocols (PROTO-EMAIL-INTAKE)", () => {
    const result = filterItems(testItems(), "other");
    const ids = result.map((i) => i.id);
    expect(ids).not.toContain("new-1");
  });
});

/* ---------- "project_reviews" tab ---------- */

describe('filterItems — "project_reviews" tab', () => {
  it("includes review_human items", () => {
    const result = filterItems(testItems(), "project_reviews");
    const ids = result.map((i) => i.id);
    expect(ids).toContain("review-1");
  });

  it("includes review_ai_ready items", () => {
    const result = filterItems(testItems(), "project_reviews");
    const ids = result.map((i) => i.id);
    expect(ids).toContain("review-2");
  });

  it("includes review_escalated items", () => {
    const result = filterItems(testItems(), "project_reviews");
    const ids = result.map((i) => i.id);
    expect(ids).toContain("review-3");
  });

  it("excludes done review items", () => {
    const result = filterItems(testItems(), "project_reviews");
    const ids = result.map((i) => i.id);
    expect(ids).not.toContain("review-done");
  });

  it("excludes non-review items", () => {
    const result = filterItems(testItems(), "project_reviews");
    const ids = result.map((i) => i.id);
    expect(ids).not.toContain("new-1");
    expect(ids).not.toContain("enq-1");
    expect(ids).not.toContain("other-1");
  });
});

/* ---------- Empty list ---------- */

describe("filterItems — empty input", () => {
  const tabs: FilterTab[] = ["all", "done", "new_project", "project_feedback", "enquiry", "project_reviews", "other"];
  for (const tab of tabs) {
    it(`returns empty array for "${tab}" tab with empty input`, () => {
      expect(filterItems([], tab)).toEqual([]);
    });
  }
});
