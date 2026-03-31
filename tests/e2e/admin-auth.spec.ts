/**
 * P0 — Admin RBAC & authentication E2E tests
 * WHY: Every /api/admin/* route is behind middleware auth.
 * A broken gate = unauthorized access to client data, LLM tools,
 * and billing — catastrophic for an agency serving TikTok, Sony, GEODIS.
 *
 * Tests middleware behavior (401/403/redirect) without needing a real DB.
 */

import { test, expect } from "@playwright/test";

// ─── Unauthenticated requests → 401 on API routes ────────────────────────

test.describe("Admin API — unauthenticated requests return 401", () => {
  const protectedApiRoutes = [
    "/api/admin/quotes",
    "/api/admin/clients",
    "/api/admin/projects",
    "/api/admin/users",
    "/api/admin/case-studies/candidates",
    "/api/admin/landing-pages",
    "/api/admin/storyboards",
    "/api/admin/project-previews",
    "/api/admin/badges",
    "/api/admin/integrations/status",
  ];

  for (const route of protectedApiRoutes) {
    test(`GET ${route} without session cookie → 401`, async ({ request }) => {
      const res = await request.get(route);
      expect(res.status()).toBe(401);
      const body = await res.json();
      expect(body.error).toBe("Unauthorized");
    });
  }

  test("POST /api/admin/clients without session cookie → 401", async ({
    request,
  }) => {
    const res = await request.post("/api/admin/clients", {
      data: { name: "Test Corp" },
    });
    expect(res.status()).toBe(401);
  });

  test("POST /api/admin/storyboards without session cookie → 401", async ({
    request,
  }) => {
    const res = await request.post("/api/admin/storyboards", {
      data: { title: "Test", clientId: "fake", scenes: [{ description: "x" }] },
    });
    expect(res.status()).toBe(401);
  });

  test("POST /api/admin/landing-pages without session cookie → 401", async ({
    request,
  }) => {
    const res = await request.post("/api/admin/landing-pages", {
      data: { clientId: "fake", title: "Test", brief: "test brief" },
    });
    expect(res.status()).toBe(401);
  });
});

// ─── Unauthenticated browser access → redirect to /admin/login ────────────

test.describe("Admin pages — unauthenticated browser access redirects to login", () => {
  const protectedPages = [
    "/admin",
    "/admin/agents/case-studies",
    "/admin/landing-pages",
    "/admin/storyboards",
    "/admin/projects",
    "/admin/users",
  ];

  for (const pagePath of protectedPages) {
    test(`${pagePath} without auth → redirects to /admin/login`, async ({
      page,
    }) => {
      await page.goto(pagePath);
      // Middleware should redirect to /admin/login
      await expect(page).toHaveURL(/\/admin\/login/);
    });
  }
});

// ─── Auth API allows login/logout without session ─────────────────────────

test.describe("Admin auth API — public endpoints", () => {
  test("POST /api/admin/auth with missing email → 400", async ({
    request,
  }) => {
    const res = await request.post("/api/admin/auth", {
      data: { password: "test" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Email required");
  });

  test("POST /api/admin/auth with missing password → 400", async ({
    request,
  }) => {
    const res = await request.post("/api/admin/auth", {
      data: { email: "test@sarani.studio" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Password required");
  });

  test("POST /api/admin/auth with invalid credentials → 401", async ({
    request,
  }) => {
    const res = await request.post("/api/admin/auth", {
      data: { email: "fake@example.com", password: "wrongpassword" },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Invalid credentials");
  });

  test("/admin/login page is accessible without auth", async ({ page }) => {
    const res = await page.goto("/admin/login");
    // Should NOT redirect — login page is public
    expect(res?.status()).toBe(200);
    await expect(page).toHaveURL(/\/admin\/login/);
    await expect(page.locator("form")).toBeVisible();
  });
});

// ─── Session expiry simulation ────────────────────────────────────────────

test.describe("Admin — expired/invalid session", () => {
  test("API request with forged session cookie → 401", async ({ request }) => {
    const res = await request.get("/api/admin/quotes", {
      headers: {
        cookie: "sarani_admin_session=fakeinvalidtoken.badsignature",
      },
    });
    expect(res.status()).toBe(401);
  });

  test("Browser with forged session cookie → redirects to login", async ({
    browser,
  }) => {
    const context = await browser.newContext();
    await context.addCookies([
      {
        name: "sarani_admin_session",
        value: "expired.invalidsignature",
        domain: "localhost",
        path: "/",
      },
    ]);
    const page = await context.newPage();
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
    await context.close();
  });
});
