/**
 * Unit tests for tracker status mapping and merge status logic.
 *
 * WHY: When ClickUp statuses like "Open" or "Closed" are displayed raw in the
 * tracker, Thomas sees ClickUp internals instead of Sarani business statuses.
 * mapClickUpStatus() converts these to meaningful values ("In progress", "Delivered").
 * If the mapping breaks, the tracker shows wrong project statuses — Thomas can't
 * tell which projects need attention.
 *
 * Tests use REAL ClickUp status values discovered via live API exploration
 * (Addendum A.2 of phase3-integrations-specs.md).
 */

import { describe, it, expect } from "vitest";
import {
  mapClickUpStatus,
  CLICKUP_STATUS_MAPPINGS,
} from "@/lib/integrations/config";
import { mergeData } from "@/lib/integrations/tracker-merge";
import type { ClickUpTask } from "@/lib/integrations/clickup";
import type { ExcelProject } from "@/lib/integrations/excel-parser";

/* ---------- Helpers ---------- */

function makeExcelProject(
  overrides: Partial<ExcelProject> & { client: string; project: string }
): ExcelProject {
  return {
    date: "2025-06-15",
    contact: "Thomas Issa",
    status: "In Progress",
    category: "Design",
    sharepointLink: "",
    totalValue: 5000,
    poNumber: "PO-2025-001",
    invoiceNumber: "",
    invoiceStatus: "",
    ...overrides,
  };
}

function makeClickUpTask(
  overrides: Partial<ClickUpTask> & { id: string; name: string; statusName: string }
): ClickUpTask {
  const { statusName, ...rest } = overrides;
  return {
    description: null,
    status: { status: statusName, type: "custom", color: "#1090e0" },
    date_created: "1718400000000",
    date_updated: "1718400000000",
    date_closed: null,
    due_date: null,
    start_date: null,
    assignees: [],
    custom_fields: [],
    url: `https://app.clickup.com/t/${rest.id}`,
    list: { id: "900303355039", name: "Sony France" },
    space: { id: "90100452675" },
    ...rest,
  } as ClickUpTask;
}

/* ========================================================================== */
/*  1. mapClickUpStatus — unit tests for each known status                     */
/* ========================================================================== */

describe("mapClickUpStatus — real ClickUp statuses from Addendum A.2", () => {
  it('"Open" → In progress (projectStatus), null (invoiceStatus)', () => {
    const result = mapClickUpStatus("Open");
    expect(result).toEqual({
      projectStatus: "In progress",
      invoiceStatus: null,
    });
  });

  it('"in progress" → In progress, null', () => {
    const result = mapClickUpStatus("in progress");
    expect(result).toEqual({
      projectStatus: "In progress",
      invoiceStatus: null,
    });
  });

  it('"review" → In progress, Open PO', () => {
    const result = mapClickUpStatus("review");
    expect(result).toEqual({
      projectStatus: "In progress",
      invoiceStatus: "Open PO",
    });
  });

  it('"Closed" → Delivered, null', () => {
    const result = mapClickUpStatus("Closed");
    expect(result).toEqual({
      projectStatus: "Delivered",
      invoiceStatus: null,
    });
  });

  it("unknown status returns null", () => {
    const result = mapClickUpStatus("unknown_status");
    expect(result).toBeNull();
  });

  it("case-insensitive: OPEN matches Open", () => {
    const result = mapClickUpStatus("OPEN");
    expect(result).toEqual({
      projectStatus: "In progress",
      invoiceStatus: null,
    });
  });

  it("case-insensitive: CLOSED matches Closed", () => {
    const result = mapClickUpStatus("CLOSED");
    expect(result).toEqual({
      projectStatus: "Delivered",
      invoiceStatus: null,
    });
  });

  it("case-insensitive: Review (capitalized) matches review", () => {
    const result = mapClickUpStatus("Review");
    expect(result).toEqual({
      projectStatus: "In progress",
      invoiceStatus: "Open PO",
    });
  });

  it("empty string returns null", () => {
    expect(mapClickUpStatus("")).toBeNull();
  });

  it("CLICKUP_STATUS_MAPPINGS has exactly 4 entries", () => {
    expect(CLICKUP_STATUS_MAPPINGS).toHaveLength(4);
  });
});

/* ========================================================================== */
/*  2. mergeData — Excel+ClickUp merged project gets mapped status             */
/* ========================================================================== */

describe("mergeData — status mapping on merged projects", () => {
  it('Excel+ClickUp project with ClickUp status "Open" → status "In progress" (not "Open")', () => {
    const excel: ExcelProject[] = [
      makeExcelProject({
        client: "Sony",
        project: "Toolkit 2 Webpop FR",
        status: "In Progress",
      }),
    ];
    const clickup: ClickUpTask[] = [
      makeClickUpTask({
        id: "task-001",
        name: "Toolkit 2 Webpop FR",
        statusName: "Open",
        list: { id: "900303355039", name: "Sony France" },
        space: { id: "90100452675" },
      }),
    ];

    const result = mergeData(excel, clickup, []);
    const project = result.find((p) => p.project === "Toolkit 2 Webpop FR");

    expect(project).toBeDefined();
    expect(project!.status).toBe("In progress");
    expect(project!.status).not.toBe("Open");
  });

  it('Excel+ClickUp project with ClickUp status "Closed" → status "Delivered"', () => {
    const excel: ExcelProject[] = [
      makeExcelProject({
        client: "Sony",
        project: "Cashback Q1 2025 FR",
        status: "Completed",
      }),
    ];
    const clickup: ClickUpTask[] = [
      makeClickUpTask({
        id: "task-002",
        name: "Cashback Q1 2025 FR",
        statusName: "Closed",
        list: { id: "900303355039", name: "Sony France" },
        space: { id: "90100452675" },
      }),
    ];

    const result = mergeData(excel, clickup, []);
    const project = result.find((p) => p.project === "Cashback Q1 2025 FR");

    expect(project).toBeDefined();
    expect(project!.status).toBe("Delivered");
    expect(project!.status).not.toBe("Closed");
  });

  it('Excel+ClickUp project with ClickUp status "review" → invoiceStatus "Open PO"', () => {
    const excel: ExcelProject[] = [
      makeExcelProject({
        client: "Sony",
        project: "Banner Set Spring 2025",
        status: "In Progress",
        invoiceStatus: "",
      }),
    ];
    const clickup: ClickUpTask[] = [
      makeClickUpTask({
        id: "task-003",
        name: "Banner Set Spring 2025",
        statusName: "review",
        list: { id: "900303355039", name: "Sony France" },
        space: { id: "90100452675" },
      }),
    ];

    const result = mergeData(excel, clickup, []);
    const project = result.find((p) => p.project === "Banner Set Spring 2025");

    expect(project).toBeDefined();
    expect(project!.status).toBe("In progress");
    expect(project!.invoiceStatus).toBe("Open PO");
  });
});

/* ========================================================================== */
/*  3. mergeData — ClickUp-only project gets mapped status                     */
/* ========================================================================== */

describe("mergeData — ClickUp-only projects (no Excel match)", () => {
  it('ClickUp-only task with status "Closed" → status "Delivered" (not "Closed")', () => {
    const clickup: ClickUpTask[] = [
      makeClickUpTask({
        id: "task-solo-001",
        name: "TikTok DE Weekly Batch 47",
        statusName: "Closed",
        list: { id: "900303355039", name: "TikTok" },
        space: { id: "90050434316" },
      }),
    ];

    const result = mergeData([], clickup, []);
    const project = result.find((p) => p.project === "TikTok DE Weekly Batch 47");

    expect(project).toBeDefined();
    expect(project!.status).toBe("Delivered");
    expect(project!.status).not.toBe("Closed");
  });

  it('ClickUp-only task with status "Open" → status "In progress"', () => {
    const clickup: ClickUpTask[] = [
      makeClickUpTask({
        id: "task-solo-002",
        name: "Aristocrat Slot Machine Promo",
        statusName: "Open",
        list: { id: "list-aristo", name: "Aristocrat" },
        space: { id: "90174878459" },
      }),
    ];

    const result = mergeData([], clickup, []);
    const project = result.find((p) => p.project === "Aristocrat Slot Machine Promo");

    expect(project).toBeDefined();
    expect(project!.status).toBe("In progress");
  });

  it('ClickUp-only task with status "in progress" → status "In progress"', () => {
    const clickup: ClickUpTask[] = [
      makeClickUpTask({
        id: "task-solo-003",
        name: "Bose QuietComfort Social Pack",
        statusName: "in progress",
        list: { id: "list-bose", name: "Bose" },
        space: { id: "90171343766" },
      }),
    ];

    const result = mergeData([], clickup, []);
    const project = result.find((p) => p.project === "Bose QuietComfort Social Pack");

    expect(project).toBeDefined();
    expect(project!.status).toBe("In progress");
  });

  it("ClickUp-only task with unknown status → raw status preserved", () => {
    const clickup: ClickUpTask[] = [
      makeClickUpTask({
        id: "task-solo-004",
        name: "CMC Trading Platform V2",
        statusName: "waiting",
        list: { id: "list-cmc", name: "CMC Markets" },
        space: { id: "90172572190" },
      }),
    ];

    const result = mergeData([], clickup, []);
    const project = result.find((p) => p.project === "CMC Trading Platform V2");

    expect(project).toBeDefined();
    // Unknown status → mapClickUpStatus returns null → fallback to raw status
    expect(project!.status).toBe("waiting");
  });
});
