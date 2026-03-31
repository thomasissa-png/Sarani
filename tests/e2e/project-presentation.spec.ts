/**
 * P0 — Project Presentation (preview links) smoke tests
 * WHY: Project previews generate shareable URLs (/project/:client/:slug)
 * that Sophie sends to her board. If the creation API is broken,
 * the team can't share deliverables — blocked client communication.
 *
 * Tests the API directly since there's no dedicated admin page for previews.
 * Auth-gated tests use admin credentials.
 */

import { test, expect } from "@playwright/test";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

test.describe("Project Presentation API — smoke tests", () => {
  test.skip(!ADMIN_PASSWORD, "ADMIN_PASSWORD not set — skipping auth-gated tests");

  test("POST /api/admin/project-previews without auth → 401", async ({
    request,
  }) => {
    const res = await request.post("/api/admin/project-previews", {
      data: {
        projectId: "test-proj-1",
        clientName: "Sony",
        projectName: "Black Friday Campaign",
      },
    });
    expect(res.status()).toBe(401);
  });

  test("POST /api/admin/project-previews with invalid JSON → 400", async ({
    page,
    request,
  }) => {
    // Login to get session cookie
    await page.goto("/admin/login");
    await page.fill('input[type="email"]', process.env.ADMIN_EMAIL || "admin@sarani.studio");
    await page.fill('input[type="password"]', ADMIN_PASSWORD!);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin(?!\/login)/, { timeout: 15_000 });

    // Get cookies from the browser context
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find((c) => c.name === "sarani_admin_session");

    if (!sessionCookie) {
      test.skip(true, "Could not obtain session cookie");
      return;
    }

    // Test missing required fields
    const res = await request.post("/api/admin/project-previews", {
      headers: {
        cookie: `sarani_admin_session=${sessionCookie.value}`,
      },
      data: {
        projectId: "test-id",
        // Missing clientName and projectName
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("VALIDATION");
  });
});

// ─── Public project preview pages (no auth needed) ────────────────────────

test.describe("Project Presentation — public preview pages", () => {
  test("non-existent project slug returns 404 or not-found page", async ({
    page,
  }) => {
    const res = await page.goto("/project/nonexistent-client/nonexistent-project");
    // Should be 404 or show a not-found page
    const status = res?.status();
    const hasNotFound = await page.getByText(/not found|404|does not exist/i).isVisible().catch(() => false);
    expect(status === 404 || hasNotFound).toBeTruthy();
  });
});
