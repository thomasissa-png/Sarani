// @vitest-environment node
/**
 * Unit tests for the getStarId logic and star endpoint response format.
 *
 * WHY: When two projects match the same ClickUp task (e.g. "Sony France" and
 * "Sony Germany" both linked to task abc123), starring one was starring both
 * because the star ID was just the ClickUp task ID. Fix: star ID is now
 * `clickupId::projectName` to guarantee uniqueness per project row.
 *
 * REGRESSION: Star uniqueness — fixed 2026-04-03
 *
 * These tests extract the getStarId logic from the tracker page component
 * (which is a React client component) and test it as a pure function.
 */

import { describe, it, expect } from "vitest";
import type { TrackerProject } from "@/types/integrations";

// ─── Extract getStarId as a pure function (mirrors page.tsx logic) ──────────

/**
 * Computes a unique star ID for a tracker project row.
 * Extracted from src/app/admin/(authenticated)/tracker/page.tsx for testability.
 *
 * Format:
 *  - Project with ClickUp URL: `{clickupTaskId}::{projectName}`
 *  - Project without ClickUp URL: `{client}::{project}`
 */
function getStarId(p: Pick<TrackerProject, "clickupTaskUrl" | "client" | "project">): string {
  const taskIdMatch = p.clickupTaskUrl?.match(/\/t\/([a-z0-9]+)/i);
  const clickupId = taskIdMatch?.[1];
  return clickupId ? `${clickupId}::${p.project}` : `${p.client}::${p.project}`;
}

// ─── Build starId from backend candidates (mirrors star/route.ts GET logic) ──

function buildStarIdFromCandidate(c: {
  clickupTaskId: string;
  projectName: string | null;
}): string {
  if (c.clickupTaskId.includes("::")) {
    // Synthetic ID — already in client::project format
    return c.clickupTaskId;
  }
  // Real ClickUp ID — append project name
  return `${c.clickupTaskId}::${c.projectName ?? ""}`;
}

/* ========================================================================== */
/*  1. getStarId — frontend logic                                              */
/* ========================================================================== */

describe("getStarId — unique star ID per project row", () => {
  it("project with ClickUp URL returns clickupId::projectName", () => {
    const project: Pick<TrackerProject, "clickupTaskUrl" | "client" | "project"> = {
      clickupTaskUrl: "https://app.clickup.com/t/abc123def",
      client: "Sony",
      project: "Toolkit 2 Webpop FR",
    };
    expect(getStarId(project)).toBe("abc123def::Toolkit 2 Webpop FR");
  });

  it("project without ClickUp URL returns client::project", () => {
    const project: Pick<TrackerProject, "clickupTaskUrl" | "client" | "project"> = {
      clickupTaskUrl: "",
      client: "GEODIS",
      project: "Rebranding 350 slides",
    };
    expect(getStarId(project)).toBe("GEODIS::Rebranding 350 slides");
  });

  it("project with undefined clickupTaskUrl returns client::project", () => {
    const project = {
      clickupTaskUrl: undefined as unknown as string,
      client: "TikTok",
      project: "Weekly Batch 47",
    };
    expect(getStarId(project)).toBe("TikTok::Weekly Batch 47");
  });

  it("two projects with same ClickUp task but different names produce different IDs", () => {
    const projectA: Pick<TrackerProject, "clickupTaskUrl" | "client" | "project"> = {
      clickupTaskUrl: "https://app.clickup.com/t/86abc1234",
      client: "Sony",
      project: "Cashback Q1 2025 FR",
    };
    const projectB: Pick<TrackerProject, "clickupTaskUrl" | "client" | "project"> = {
      clickupTaskUrl: "https://app.clickup.com/t/86abc1234",
      client: "Sony",
      project: "Cashback Q1 2025 DE",
    };

    const idA = getStarId(projectA);
    const idB = getStarId(projectB);

    expect(idA).not.toBe(idB);
    expect(idA).toBe("86abc1234::Cashback Q1 2025 FR");
    expect(idB).toBe("86abc1234::Cashback Q1 2025 DE");
  });

  it("two projects from different clients without ClickUp URL produce different IDs", () => {
    const projectA = {
      clickupTaskUrl: "",
      client: "Adidas",
      project: "Summer Campaign",
    };
    const projectB = {
      clickupTaskUrl: "",
      client: "Pernod Ricard",
      project: "Summer Campaign",
    };

    expect(getStarId(projectA)).not.toBe(getStarId(projectB));
  });

  it("extracts ClickUp task ID correctly from various URL formats", () => {
    const cases = [
      { url: "https://app.clickup.com/t/abc123", expected: "abc123" },
      { url: "https://app.clickup.com/t/86h3k9abc", expected: "86h3k9abc" },
      { url: "https://app.clickup.com/t/ABC123", expected: "ABC123" },
    ];

    for (const { url, expected } of cases) {
      const project = { clickupTaskUrl: url, client: "Test", project: "Proj" };
      expect(getStarId(project)).toBe(`${expected}::Proj`);
    }
  });
});

/* ========================================================================== */
/*  2. buildStarIdFromCandidate — backend GET response format                  */
/* ========================================================================== */

describe("buildStarIdFromCandidate — backend star ID format", () => {
  it("real ClickUp ID returns clickupId::projectName", () => {
    const candidate = { clickupTaskId: "abc123def", projectName: "Toolkit FR" };
    expect(buildStarIdFromCandidate(candidate)).toBe("abc123def::Toolkit FR");
  });

  it("synthetic ID (already has ::) is returned as-is", () => {
    const candidate = { clickupTaskId: "Sony::Toolkit FR", projectName: "Toolkit FR" };
    expect(buildStarIdFromCandidate(candidate)).toBe("Sony::Toolkit FR");
  });

  it("real ClickUp ID with null projectName appends empty string", () => {
    const candidate = { clickupTaskId: "abc123", projectName: null };
    expect(buildStarIdFromCandidate(candidate)).toBe("abc123::");
  });

  it("frontend and backend produce the same ID for the same project", () => {
    // Frontend: getStarId with ClickUp URL
    const frontendProject = {
      clickupTaskUrl: "https://app.clickup.com/t/86h3k9abc",
      client: "Sony",
      project: "Cashback Q1 2025 FR",
    };
    const frontendId = getStarId(frontendProject);

    // Backend: buildStarIdFromCandidate with DB record
    const backendCandidate = {
      clickupTaskId: "86h3k9abc",
      projectName: "Cashback Q1 2025 FR",
    };
    const backendId = buildStarIdFromCandidate(backendCandidate);

    expect(frontendId).toBe(backendId);
    expect(frontendId).toBe("86h3k9abc::Cashback Q1 2025 FR");
  });

  it("frontend and backend produce same ID for non-ClickUp project", () => {
    const frontendProject = {
      clickupTaskUrl: "",
      client: "GEODIS",
      project: "Rebranding",
    };
    const frontendId = getStarId(frontendProject);

    // For non-ClickUp, the POST handler creates clickupTaskId = "client::project"
    const backendCandidate = {
      clickupTaskId: "GEODIS::Rebranding",
      projectName: "Rebranding",
    };
    const backendId = buildStarIdFromCandidate(backendCandidate);

    expect(frontendId).toBe(backendId);
    expect(frontendId).toBe("GEODIS::Rebranding");
  });
});
