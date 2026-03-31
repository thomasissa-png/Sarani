// @vitest-environment node
/**
 * P0 — /api/admin/quotes route handler tests
 * WHY: Quotes are the revenue pipeline for Sarani. RBAC filtering ensures
 * non-admin users only see their own quotes — a broken filter = data leak
 * across team members handling different enterprise clients.
 *
 * Mocks: getUserFromSession (auth), db (Drizzle ORM)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/* ---------- Mocks ---------- */

// Mock auth module
const mockGetUserFromSession = vi.fn();
vi.mock("@/lib/auth", () => ({
  getUserFromSession: () => mockGetUserFromSession(),
}));

// Mock DB — Drizzle chain: db.select().from().where().orderBy()
const mockResults: unknown[] = [];
const mockOrderBy = vi.fn().mockImplementation(() => Promise.resolve(mockResults));
const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

vi.mock("@/lib/db", () => ({
  db: {
    select: () => mockSelect(),
  },
}));

vi.mock("@/lib/db/schema", () => ({
  quotes: {
    clientName: "clientName",
    createdBy: "createdBy",
    createdAt: "createdAt",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: (col: string, val: string) => ({ type: "eq", col, val }),
  desc: (col: string) => ({ type: "desc", col }),
  and: (...args: unknown[]) => ({ type: "and", args }),
}));

/* ---------- Import route after mocks ---------- */

import { GET } from "@/app/api/admin/quotes/route";

/* ---------- Helpers ---------- */

function createRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost:3000/api/admin/quotes");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockResults.length = 0;
});

/* ---------- Authentication ---------- */

describe("GET /api/admin/quotes — authentication", () => {
  it("returns 401 when no session exists", async () => {
    mockGetUserFromSession.mockResolvedValue(null);

    const res = await GET(createRequest());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });
});

/* ---------- Happy path — admin ---------- */

describe("GET /api/admin/quotes — admin user", () => {
  beforeEach(() => {
    mockGetUserFromSession.mockResolvedValue({
      userId: "admin-1",
      role: "admin",
    });
  });

  it("returns 200 with quotes array", async () => {
    const fakeQuotes = [
      { id: "q1", clientName: "TikTok", amount: 15000 },
      { id: "q2", clientName: "Sony", amount: 8500 },
    ];
    mockResults.push(...fakeQuotes);

    const res = await GET(createRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);
    expect(body[0].clientName).toBe("TikTok");
  });

  it("returns empty array when no quotes exist", async () => {
    const res = await GET(createRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it("filters by client query param", async () => {
    const res = await GET(createRequest({ client: "Sony" }));
    expect(res.status).toBe(200);
    // Verify the where clause was called with a client filter
    expect(mockWhere).toHaveBeenCalled();
  });

  it("admin sees all quotes (no createdBy filter)", async () => {
    await GET(createRequest());
    // The where clause should NOT include a createdBy condition for admin
    const whereArg = mockWhere.mock.calls[0]?.[0];
    // For admin without client filter, whereClause is undefined
    expect(whereArg).toBeUndefined();
  });
});

/* ---------- RBAC — non-admin user ---------- */

describe("GET /api/admin/quotes — non-admin user (RBAC)", () => {
  beforeEach(() => {
    mockGetUserFromSession.mockResolvedValue({
      userId: "user-42",
      role: "member",
    });
  });

  it("returns 200 (non-admin can read quotes)", async () => {
    const res = await GET(createRequest());
    expect(res.status).toBe(200);
  });

  it("non-admin query includes createdBy filter", async () => {
    await GET(createRequest());
    // The where clause should include a createdBy condition for non-admin
    const whereArg = mockWhere.mock.calls[0]?.[0];
    expect(whereArg).toBeDefined();
    // Should be an eq condition on createdBy
    expect(whereArg).toMatchObject({ type: "eq", col: "createdBy", val: "user-42" });
  });

  it("non-admin with client filter combines both conditions", async () => {
    await GET(createRequest({ client: "GEODIS" }));
    const whereArg = mockWhere.mock.calls[0]?.[0];
    // Should be an and() with two conditions
    expect(whereArg).toMatchObject({ type: "and" });
  });
});

/* ---------- Error handling ---------- */

describe("GET /api/admin/quotes — error handling", () => {
  it("returns 500 when DB throws", async () => {
    mockGetUserFromSession.mockResolvedValue({
      userId: "admin-1",
      role: "admin",
    });
    mockOrderBy.mockRejectedValueOnce(new Error("DB connection lost"));

    const res = await GET(createRequest());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to fetch quotes");
  });
});
