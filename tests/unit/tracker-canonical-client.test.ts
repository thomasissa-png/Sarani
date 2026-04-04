// @vitest-environment node
/**
 * Tests for canonical client name resolution in tracker-merge.
 *
 * WHY THIS FILE EXISTS:
 * The merge logic now uses the ClickUp space/list name as the canonical client
 * name instead of the Excel name. This is important because Excel can use legacy
 * names (e.g. "ByteDance") while ClickUp uses the current name ("TikTok").
 * Also, the regex for extracting divisions now escapes special characters in
 * client names to prevent regex injection.
 *
 * REGRESSION: Client name inconsistency (ByteDance vs TikTok) — fixed 2026-04-04
 */

import { describe, it, expect } from "vitest";
import { mergeData } from "@/lib/integrations/tracker-merge";
import type { ClickUpTask } from "@/lib/integrations/clickup";
import type { ExcelProject } from "@/lib/integrations/excel-parser";

// ─── Mock config module ───────────────────────────────────────────────────

import { vi } from "vitest";

vi.mock("@/lib/integrations/config", () => ({
  getMappingBySpaceId: (spaceId: string) => {
    const mappings: Record<string, { clickupSpaceName: string }> = {
      "space-tiktok": { clickupSpaceName: "TikTok" },
      "space-sony": { clickupSpaceName: "Sony" },
      "90050435651": null as unknown as { clickupSpaceName: string }, // Other customers — returns null
    };
    return mappings[spaceId] ?? null;
  },
  mapClickUpStatus: (status: string) => {
    if (status === "approved") return { projectStatus: "Approved", invoiceStatus: "To invoice" };
    if (status === "in progress") return { projectStatus: "In Progress", invoiceStatus: "" };
    return null;
  },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────

function makeExcelProject(overrides: Partial<ExcelProject>): ExcelProject {
  return {
    project: "Test Project",
    client: "TestClient",
    date: "2026-01-15",
    contact: "John",
    status: "Active",
    category: "",
    sharepointLink: "",
    totalValue: null,
    poNumber: "",
    invoiceStatus: "",
    invoiceNumber: "",
    excelTrackerFile: "test.xlsx",
    excelSheetName: "Sheet1",
    excelTrackerUrl: "",
    ...overrides,
  };
}

function makeClickUpTask(overrides: Partial<ClickUpTask>): ClickUpTask {
  return {
    id: "task-1",
    name: "Test Project",
    description: null,
    status: { id: "s1", status: "in progress", type: "custom", color: "#00f", orderindex: 0 },
    date_created: "1704067200000",
    date_updated: "1704067200000",
    date_closed: null,
    due_date: null,
    start_date: null,
    assignees: [],
    custom_fields: [],
    url: "https://clickup.com/t/task-1",
    list: { id: "list-1", name: "Projects" },
    space: { id: "space-tiktok" },
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe("Canonical client name — ClickUp takes priority over Excel", () => {
  it("uses ClickUp space name when task matches (ByteDance Excel -> TikTok canonical)", () => {
    const excelProjects: ExcelProject[] = [
      makeExcelProject({ project: "Summer Campaign", client: "ByteDance", excelSheetName: "TikTok France" }),
    ];
    const clickUpTasks: ClickUpTask[] = [
      makeClickUpTask({ name: "Summer Campaign", space: { id: "space-tiktok" }, list: { id: "l1", name: "TikTok France" } }),
    ];

    const result = mergeData(excelProjects, clickUpTasks, []);

    expect(result).toHaveLength(1);
    expect(result[0].client).toBe("TikTok"); // NOT "ByteDance"
  });

  it("keeps Excel client name when no ClickUp match", () => {
    const excelProjects: ExcelProject[] = [
      makeExcelProject({ project: "Internal Project", client: "LegacyCorp" }),
    ];

    const result = mergeData(excelProjects, [], []);

    expect(result).toHaveLength(1);
    expect(result[0].client).toBe("LegacyCorp");
  });

  it("uses list name for Other customers space", () => {
    const clickUpTasks: ClickUpTask[] = [
      makeClickUpTask({
        name: "Quick Banner",
        space: { id: "90050435651" }, // Other customers
        list: { id: "l-geodis", name: "Geodis" },
      }),
    ];

    const result = mergeData([], clickUpTasks, []);

    // ClickUp-only task from "Other customers" should use list name
    const geodisProject = result.find(p => p.project === "Quick Banner");
    expect(geodisProject).toBeDefined();
    expect(geodisProject!.client).toBe("Geodis");
  });
});

describe("Canonical client name — regex escape for division extraction", () => {
  it("handles client names with regex special characters (e.g. parentheses)", () => {
    // Client name like "PICO (XR)" contains parentheses that would break unescaped regex
    const excelProjects: ExcelProject[] = [
      makeExcelProject({
        project: "VR Headset Launch",
        client: "PICO (XR)",
        excelSheetName: "PICO (XR) Global",
      }),
    ];

    // Should not throw regex error
    expect(() => mergeData(excelProjects, [], [])).not.toThrow();

    const result = mergeData(excelProjects, [], []);
    expect(result).toHaveLength(1);
    // Division should be extracted (the part after the client name)
    expect(result[0].division).toBe("Global");
  });

  it("handles client names with dots and plus signs", () => {
    const excelProjects: ExcelProject[] = [
      makeExcelProject({
        project: "Some Project",
        client: "C++ Studio",
        excelSheetName: "C++ Studio UK",
      }),
    ];

    expect(() => mergeData(excelProjects, [], [])).not.toThrow();
  });
});

describe("Dedup uses canonical client name consistently", () => {
  it("deduplicates Excel-merged and ClickUp-only when same canonical name", () => {
    const excelProjects: ExcelProject[] = [
      makeExcelProject({
        project: "Brand Video",
        client: "TikTok",
        excelSheetName: "TikTok France",
        totalValue: 5000,
      }),
    ];
    const clickUpTasks: ClickUpTask[] = [
      makeClickUpTask({
        name: "Brand Video",
        space: { id: "space-tiktok" },
        list: { id: "l1", name: "TikTok France" },
      }),
    ];

    const result = mergeData(excelProjects, clickUpTasks, []);

    // Should be merged into 1 project, not 2
    const brandVideos = result.filter(p => p.project === "Brand Video");
    expect(brandVideos).toHaveLength(1);
    // Should have data from both sources
    expect(brandVideos[0].totalValue).toBe(5000); // from Excel
    expect(brandVideos[0].clickupTaskUrl).toBeTruthy(); // from ClickUp
  });
});
