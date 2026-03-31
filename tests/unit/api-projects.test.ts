// @vitest-environment node
/**
 * P0 — /api/admin/projects route handler tests
 * WHY: The projects endpoint aggregates agent outputs grouped by client+brief.
 * It's the main dashboard view — broken grouping = confused team, missed deliveries.
 * This also tests deriveOverallStatus logic which drives project status badges.
 *
 * Mocks: db (Drizzle ORM)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/* ---------- Mocks ---------- */

// Mock DB with two chained queries:
// 1. agentOutputs joined with clients
// 2. clients grouped for filter dropdown

const mockOutputResults: unknown[] = [];
const mockClientListResults: unknown[] = [];

// Chain 1: select -> from -> innerJoin -> where -> orderBy -> limit
const mockLimit = vi.fn().mockImplementation(() => Promise.resolve(mockOutputResults));
const mockOrderBy1 = vi.fn().mockReturnValue({ limit: mockLimit });
const mockWhere1 = vi.fn().mockReturnValue({ orderBy: mockOrderBy1 });
const mockInnerJoin = vi.fn().mockReturnValue({ where: mockWhere1 });
const mockFrom1 = vi.fn().mockReturnValue({ innerJoin: mockInnerJoin });

// Chain 2: select -> from -> innerJoin -> groupBy -> orderBy
const mockOrderBy2 = vi.fn().mockImplementation(() => Promise.resolve(mockClientListResults));
const mockGroupBy = vi.fn().mockReturnValue({ orderBy: mockOrderBy2 });
const mockInnerJoin2 = vi.fn().mockReturnValue({ groupBy: mockGroupBy });
const mockFrom2 = vi.fn().mockReturnValue({ innerJoin: mockInnerJoin2 });

let selectCallCount = 0;

vi.mock("@/lib/db", () => ({
  db: {
    select: (fields?: unknown) => {
      selectCallCount++;
      // First call = outputs query, second call = client list query
      if (selectCallCount % 2 === 1) {
        return { from: mockFrom1 };
      }
      return { from: mockFrom2 };
    },
  },
}));

vi.mock("@/lib/db/schema", () => ({
  agentOutputs: {
    id: "id",
    clientId: "clientId",
    agentType: "agentType",
    inputPayload: "inputPayload",
    status: "status",
    createdAt: "createdAt",
  },
  clients: {
    id: "clientsId",
    name: "clientsName",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: (col: string, val: string) => ({ type: "eq", col, val }),
  and: (...args: unknown[]) => ({ type: "and", args }),
  desc: (col: string) => ({ type: "desc", col }),
}));

/* ---------- Import route after mocks ---------- */

import { GET } from "@/app/api/admin/projects/route";

/* ---------- Helpers ---------- */

function createRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost:3000/api/admin/projects");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url);
}

function makeOutput(overrides: Record<string, unknown> = {}) {
  return {
    id: "out-1",
    clientId: "c1",
    clientName: "TikTok",
    agentType: "copywriter",
    inputPayload: { briefSummary: "50 banners for Black Friday" },
    status: "done",
    createdAt: new Date("2026-03-20"),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockOutputResults.length = 0;
  mockClientListResults.length = 0;
  selectCallCount = 0;
});

/* ---------- Happy path ---------- */

describe("GET /api/admin/projects — happy path", () => {
  it("returns 200 with projects and clients", async () => {
    mockOutputResults.push(
      makeOutput({ id: "out-1", agentType: "copywriter", status: "done" }),
      makeOutput({ id: "out-2", agentType: "designer", status: "processing" })
    );
    mockClientListResults.push({ id: "c1", name: "TikTok" });

    const res = await GET(createRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("projects");
    expect(body).toHaveProperty("clients");
    expect(body.projects.length).toBeGreaterThanOrEqual(1);
    expect(body.clients).toHaveLength(1);
  });

  it("returns empty projects when no outputs exist", async () => {
    const res = await GET(createRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.projects).toEqual([]);
  });
});

/* ---------- Grouping logic ---------- */

describe("GET /api/admin/projects — grouping logic", () => {
  it("groups outputs by clientId + briefSummary", async () => {
    mockOutputResults.push(
      makeOutput({ id: "out-1", clientId: "c1", inputPayload: { briefSummary: "Project Alpha" } }),
      makeOutput({ id: "out-2", clientId: "c1", inputPayload: { briefSummary: "Project Alpha" }, agentType: "designer" }),
      makeOutput({ id: "out-3", clientId: "c1", inputPayload: { briefSummary: "Project Beta" } })
    );

    const res = await GET(createRequest());
    const body = await res.json();
    // Two distinct projects: Alpha (2 outputs) and Beta (1 output)
    expect(body.projects).toHaveLength(2);

    const alpha = body.projects.find((p: { briefSummary: string }) => p.briefSummary === "Project Alpha");
    expect(alpha?.outputCount).toBe(2);
    expect(alpha?.agents).toContain("copywriter");
    expect(alpha?.agents).toContain("designer");
  });

  it("uses fallback 'Untitled project' when no briefSummary", async () => {
    mockOutputResults.push(
      makeOutput({ id: "out-1", inputPayload: {} })
    );

    const res = await GET(createRequest());
    const body = await res.json();
    expect(body.projects[0].briefSummary).toBe("Untitled project");
  });

  it("truncates briefSummary longer than 100 chars", async () => {
    mockOutputResults.push(
      makeOutput({ id: "out-1", inputPayload: { briefSummary: "A".repeat(150) } })
    );

    const res = await GET(createRequest());
    const body = await res.json();
    expect(body.projects[0].briefSummary.length).toBeLessThanOrEqual(103); // 100 + "..."
    expect(body.projects[0].briefSummary).toMatch(/\.\.\.$/);
  });
});

/* ---------- Overall status derivation ---------- */

describe("GET /api/admin/projects — deriveOverallStatus", () => {
  it("returns 'error' if any output has error", async () => {
    mockOutputResults.push(
      makeOutput({ id: "out-1", status: "done" }),
      makeOutput({ id: "out-2", status: "error" })
    );

    const res = await GET(createRequest());
    const body = await res.json();
    expect(body.projects[0].overallStatus).toBe("error");
  });

  it("returns 'done' if all outputs are done", async () => {
    mockOutputResults.push(
      makeOutput({ id: "out-1", status: "done" }),
      makeOutput({ id: "out-2", status: "done" })
    );

    const res = await GET(createRequest());
    const body = await res.json();
    expect(body.projects[0].overallStatus).toBe("done");
  });

  it("returns 'processing' if some are done and some processing", async () => {
    mockOutputResults.push(
      makeOutput({ id: "out-1", status: "done" }),
      makeOutput({ id: "out-2", status: "processing" })
    );

    const res = await GET(createRequest());
    const body = await res.json();
    expect(body.projects[0].overallStatus).toBe("processing");
  });

  it("returns 'pending' if all outputs are pending", async () => {
    mockOutputResults.push(
      makeOutput({ id: "out-1", status: "pending" }),
      makeOutput({ id: "out-2", status: "pending" })
    );

    const res = await GET(createRequest());
    const body = await res.json();
    expect(body.projects[0].overallStatus).toBe("pending");
  });
});

/* ---------- Query filters ---------- */

describe("GET /api/admin/projects — query filters", () => {
  it("filters by clientId", async () => {
    await GET(createRequest({ clientId: "c1" }));
    const whereArg = mockWhere1.mock.calls[0]?.[0];
    expect(whereArg).toBeDefined();
  });

  it("filters by status", async () => {
    await GET(createRequest({ status: "done" }));
    const whereArg = mockWhere1.mock.calls[0]?.[0];
    expect(whereArg).toBeDefined();
  });

  it("filters by agent type", async () => {
    await GET(createRequest({ agent: "copywriter" }));
    const whereArg = mockWhere1.mock.calls[0]?.[0];
    expect(whereArg).toBeDefined();
  });

  it("ignores status=all and agent=all", async () => {
    await GET(createRequest({ status: "all", agent: "all" }));
    const whereArg = mockWhere1.mock.calls[0]?.[0];
    expect(whereArg).toBeUndefined();
  });
});

/* ---------- Error handling ---------- */

describe("GET /api/admin/projects — error handling", () => {
  it("returns 500 when DB throws", async () => {
    mockLimit.mockRejectedValueOnce(new Error("Query timeout"));

    const res = await GET(createRequest());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to fetch projects");
  });
});
