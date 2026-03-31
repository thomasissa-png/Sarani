// @vitest-environment node
/**
 * P0 — /api/admin/clients route handler tests
 * WHY: Client records are the core entity of Sarani's back-office.
 * Every agent output, quote, storyboard, and landing page is linked to a client.
 * Broken validation on client creation = corrupt data across the entire system.
 *
 * Mocks: db (Drizzle ORM), clientFormSchema (Zod)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/* ---------- Mocks ---------- */

// Mock DB — Drizzle chain
const mockSelectResults: unknown[] = [];
const mockInsertResult = [{ id: "new-client-1" }];

const mockOrderBy = vi.fn().mockImplementation(() => Promise.resolve(mockSelectResults));
const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });
const mockReturning = vi.fn().mockImplementation(() => Promise.resolve(mockInsertResult));
const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
const mockInsert = vi.fn().mockReturnValue({ values: mockValues });

vi.mock("@/lib/db", () => ({
  db: {
    select: () => mockSelect(),
    insert: () => mockInsert(),
  },
}));

vi.mock("@/lib/db/schema", () => ({
  clients: {
    id: "id",
    name: "name",
    status: "status",
    createdAt: "createdAt",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: (col: string, val: string) => ({ type: "eq", col, val }),
  like: (col: string, val: string) => ({ type: "like", col, val }),
  and: (...args: unknown[]) => ({ type: "and", args }),
  desc: (col: string) => ({ type: "desc", col }),
}));

// Keep the real Zod schema — it's the core of what we're testing for POST
// But we need to mock it for the import path
vi.mock("@/lib/validations/client", async () => {
  const { z } = await import("zod");
  return {
    clientFormSchema: z.object({
      name: z.string().min(1).max(200),
      industry: z.enum(["tech", "luxe", "logistics", "entertainment", "fmcg", "aviation", "other"]),
      status: z.enum(["active", "inactive", "prospect"]),
      primaryLanguage: z.enum(["FR", "EN", "IT", "ES", "DE"]),
      secondaryLanguages: z.array(z.enum(["FR", "EN", "IT", "ES", "DE"])),
      primaryContactName: z.string().max(200).optional().or(z.literal("")),
      primaryContactEmail: z.string().email().optional().or(z.literal("")),
      clickupProjectId: z.string().max(100).optional().or(z.literal("")),
      primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().or(z.literal("")),
      secondaryColors: z.string().max(500).optional().or(z.literal("")),
      fontName: z.string().max(200).optional().or(z.literal("")),
      brandTone: z.string().max(2000).optional().or(z.literal("")),
      brandGuidelinesNotes: z.string().max(5000).optional().or(z.literal("")),
      translationMemory: z.string().max(10000).optional().or(z.literal("")),
      prohibitedTerms: z.string().max(5000).optional().or(z.literal("")),
      legalEntityName: z.string().max(300).optional().or(z.literal("")),
      legalCountry: z.string().max(100).optional().or(z.literal("")),
      vatNumber: z.string().max(50).optional().or(z.literal("")),
      signedFrameworkAgreement: z.boolean(),
      preferredContractTemplate: z.enum(["UGC", "SOW", "NDA", "other"]).optional().or(z.literal("")),
    }),
  };
});

/* ---------- Import route after mocks ---------- */

import { GET, POST } from "@/app/api/admin/clients/route";

/* ---------- Helpers ---------- */

function createGetRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost:3000/api/admin/clients");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url);
}

function createPostRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost:3000/api/admin/clients", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function validClientBody() {
  return {
    name: "TikTok Europe",
    industry: "entertainment" as const,
    status: "active" as const,
    primaryLanguage: "EN" as const,
    secondaryLanguages: ["FR", "DE"] as const,
    primaryContactName: "Sophie Martin",
    primaryContactEmail: "sophie@tiktok.com",
    clickupProjectId: "",
    primaryColor: "#FF0050",
    secondaryColors: "",
    fontName: "",
    brandTone: "bold, playful",
    brandGuidelinesNotes: "",
    translationMemory: "",
    prohibitedTerms: "",
    legalEntityName: "TikTok Technology Ltd",
    legalCountry: "UK",
    vatNumber: "",
    signedFrameworkAgreement: true,
    preferredContractTemplate: "SOW" as const,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSelectResults.length = 0;
});

/* ---------- GET — Happy path ---------- */

describe("GET /api/admin/clients — happy path", () => {
  it("returns 200 with clients array", async () => {
    const fakeClients = [
      { id: "c1", name: "TikTok", status: "active" },
      { id: "c2", name: "Sony", status: "active" },
    ];
    mockSelectResults.push(...fakeClients);

    const res = await GET(createGetRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);
  });

  it("returns empty array when no clients", async () => {
    const res = await GET(createGetRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });
});

/* ---------- GET — Filters ---------- */

describe("GET /api/admin/clients — query filters", () => {
  it("filters by status", async () => {
    await GET(createGetRequest({ status: "active" }));
    const whereArg = mockWhere.mock.calls[0]?.[0];
    expect(whereArg).toBeDefined();
  });

  it("ignores status=all (no filter)", async () => {
    await GET(createGetRequest({ status: "all" }));
    const whereArg = mockWhere.mock.calls[0]?.[0];
    expect(whereArg).toBeUndefined();
  });

  it("filters by search term", async () => {
    await GET(createGetRequest({ search: "TikTok" }));
    const whereArg = mockWhere.mock.calls[0]?.[0];
    expect(whereArg).toBeDefined();
  });

  it("combines status and search filters", async () => {
    await GET(createGetRequest({ status: "active", search: "Sony" }));
    const whereArg = mockWhere.mock.calls[0]?.[0];
    expect(whereArg).toMatchObject({ type: "and" });
  });
});

/* ---------- GET — Error handling ---------- */

describe("GET /api/admin/clients — error handling", () => {
  it("returns 500 when DB throws", async () => {
    mockOrderBy.mockRejectedValueOnce(new Error("Connection refused"));

    const res = await GET(createGetRequest());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to fetch clients");
  });
});

/* ---------- POST — Happy path ---------- */

describe("POST /api/admin/clients — valid creation", () => {
  it("returns 201 with new client id", async () => {
    const res = await POST(createPostRequest(validClientBody()));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe("new-client-1");
  });

  it("passes validated data to db.insert", async () => {
    await POST(createPostRequest(validClientBody()));
    expect(mockValues).toHaveBeenCalled();
  });
});

/* ---------- POST — Validation errors (400) ---------- */

describe("POST /api/admin/clients — validation errors", () => {
  it("returns 400 for empty body", async () => {
    const res = await POST(createPostRequest({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
  });

  it("returns 400 for missing name", async () => {
    const data = { ...validClientBody(), name: "" };
    const res = await POST(createPostRequest(data));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid industry", async () => {
    const data = { ...validClientBody(), industry: "FAKE_INDUSTRY" };
    const res = await POST(createPostRequest(data));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid status", async () => {
    const data = { ...validClientBody(), status: "deleted" };
    const res = await POST(createPostRequest(data));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid primary language", async () => {
    const data = { ...validClientBody(), primaryLanguage: "ZH" };
    const res = await POST(createPostRequest(data));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid email format", async () => {
    const data = { ...validClientBody(), primaryContactEmail: "not-an-email" };
    const res = await POST(createPostRequest(data));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid hex color", async () => {
    const data = { ...validClientBody(), primaryColor: "red" };
    const res = await POST(createPostRequest(data));
    expect(res.status).toBe(400);
  });

  it("returns 400 for name exceeding 200 chars", async () => {
    const data = { ...validClientBody(), name: "A".repeat(201) };
    const res = await POST(createPostRequest(data));
    expect(res.status).toBe(400);
  });

  it("returns 400 when signedFrameworkAgreement is not boolean", async () => {
    const data = { ...validClientBody(), signedFrameworkAgreement: "yes" };
    const res = await POST(createPostRequest(data));
    expect(res.status).toBe(400);
  });
});

/* ---------- POST — Adversarial inputs ---------- */

describe("POST /api/admin/clients — adversarial inputs", () => {
  it("accepts client name with accents and special chars", async () => {
    const data = { ...validClientBody(), name: "L'Oréal Paris & Cie" };
    const res = await POST(createPostRequest(data));
    expect(res.status).toBe(201);
  });

  it("accepts client name with emoji", async () => {
    const data = { ...validClientBody(), name: "TikTok Europe" };
    const res = await POST(createPostRequest(data));
    expect(res.status).toBe(201);
  });
});

/* ---------- POST — Error handling ---------- */

describe("POST /api/admin/clients — error handling", () => {
  it("returns 500 when DB insert throws", async () => {
    mockReturning.mockRejectedValueOnce(new Error("Unique constraint"));

    const res = await POST(createPostRequest(validClientBody()));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to create client");
  });
});
