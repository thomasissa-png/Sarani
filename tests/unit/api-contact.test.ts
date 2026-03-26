// @vitest-environment node
/**
 * P0 — /api/contact route handler tests
 * WHY: The contact form is the ONLY digital conversion point for Sarani.
 * A broken API route = zero leads = zero revenue.
 * Linked AC: AC-103-1 to AC-103-6, EC-103-7, BR-103-3
 *
 * These tests run in Node environment (not jsdom) because they test
 * Next.js API route handlers directly.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/contact/route";

/* ---------- Helpers ---------- */

function validBody() {
  return {
    name: "Sophie Martin",
    company: "TikTok",
    email: "sophie@tiktok.com",
    message: "We need 50 banners in 3 languages by Friday.",
    companySize: "500M\u20AC+",
    attribution: "Referral",
    honeypot: "",
  };
}

function createRequest(body: Record<string, unknown>, ip = "127.0.0.1") {
  return new NextRequest("http://localhost:3000/api/contact", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

/* ---------- Reset rate limiter between tests ---------- */

// The rate limiter uses an in-memory Map. To isolate tests,
// we reimport the module fresh for rate limit tests.
// For non-rate-limit tests, we use different IPs.

let requestCounter = 0;
function uniqueIp() {
  requestCounter++;
  return `10.0.0.${requestCounter}`;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

/* ---------- Happy path ---------- */

describe("POST /api/contact — valid submissions", () => {
  it("returns 200 with success:true for valid payload", async () => {
    const req = createRequest(validBody(), uniqueIp());
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it("does not leak PII in response", async () => {
    const req = createRequest(validBody(), uniqueIp());
    const res = await POST(req);
    const data = await res.json();
    expect(data).not.toHaveProperty("name");
    expect(data).not.toHaveProperty("email");
    expect(data).not.toHaveProperty("company");
    expect(data).not.toHaveProperty("message");
  });
});

/* ---------- Server-side validation (AC-103-4, EC-103-7) ---------- */

describe("POST /api/contact — validation errors", () => {
  it("returns 400 for missing required fields", async () => {
    const req = createRequest({ name: "" }, uniqueIp());
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("validation_error");
  });

  it("returns 400 for invalid email", async () => {
    const body = { ...validBody(), email: "not-an-email" };
    const req = createRequest(body, uniqueIp());
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid companySize (injection)", async () => {
    const body = { ...validBody(), companySize: "INJECTED" };
    const req = createRequest(body, uniqueIp());
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("validation_error");
  });

  it("returns 400 for invalid attribution value", async () => {
    const body = { ...validBody(), attribution: "<script>xss</script>" };
    const req = createRequest(body, uniqueIp());
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for message too short", async () => {
    const body = { ...validBody(), message: "short" };
    const req = createRequest(body, uniqueIp());
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

/* ---------- Honeypot anti-spam ---------- */

describe("POST /api/contact — honeypot", () => {
  it("returns silent 200 when honeypot is filled (bot detected)", async () => {
    const body = { ...validBody(), honeypot: "i am a bot" };
    const req = createRequest(body, uniqueIp());
    const res = await POST(req);
    // Should return 200 silently to not tip off bots
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });
});

/* ---------- Rate limiting (BR-103-3) ---------- */

describe("POST /api/contact — rate limiting", () => {
  it("returns 429 after exceeding rate limit from same IP", async () => {
    // Use a unique IP for this test suite to avoid cross-test contamination
    const testIp = "192.168.100.1";

    // The rate limit is 5 per minute per IP.
    // Send 5 valid requests (should all succeed)
    for (let i = 0; i < 5; i++) {
      const req = createRequest(validBody(), testIp);
      const res = await POST(req);
      expect(res.status).toBe(200);
    }

    // 6th request should be rate limited
    const req = createRequest(validBody(), testIp);
    const res = await POST(req);
    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.error).toBe("rate_limited");
  });

  it("does not rate limit different IPs independently", async () => {
    const ipA = "192.168.200.1";
    const ipB = "192.168.200.2";

    // Exhaust IP A
    for (let i = 0; i < 5; i++) {
      const req = createRequest(validBody(), ipA);
      await POST(req);
    }

    // IP B should still work
    const req = createRequest(validBody(), ipB);
    const res = await POST(req);
    expect(res.status).toBe(200);
  });
});

/* ---------- Error handling ---------- */

describe("POST /api/contact — error handling", () => {
  it("returns 500 for malformed JSON body", async () => {
    const req = new NextRequest("http://localhost:3000/api/contact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": uniqueIp(),
      },
      body: "not json at all",
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("server_error");
  });
});
