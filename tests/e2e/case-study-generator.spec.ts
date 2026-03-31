/**
 * P0 — Case Study Generator smoke tests
 * WHY: Case studies are the primary trust signal for enterprise prospects like Sophie.
 * The generator scans ClickUp projects and produces publishable case studies via Claude.
 * If this page is broken, Sarani's content pipeline stalls.
 *
 * These are smoke tests only — no real LLM calls.
 * Auth is handled by navigating through login first.
 */

import { test, expect } from "@playwright/test";

// Skip all tests if no admin credentials configured (CI without secrets)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@sarani.studio";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

test.describe("Case Study Generator — smoke tests", () => {
  test.skip(!ADMIN_PASSWORD, "ADMIN_PASSWORD not set — skipping auth-gated tests");

  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto("/admin/login");
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD!);
    await page.click('button[type="submit"]');
    // Wait for redirect to admin dashboard
    await page.waitForURL(/\/admin(?!\/login)/, { timeout: 15_000 });
  });

  test("case studies page is accessible and shows heading", async ({ page }) => {
    await page.goto("/admin/agents/case-studies");
    await page.waitForLoadState("networkidle");

    // Page should have a heading related to case studies
    const heading = page.locator("h1, h2").first();
    await expect(heading).toBeVisible({ timeout: 10_000 });
    const text = await heading.textContent();
    expect(text?.toLowerCase()).toMatch(/case stud/i);
  });

  test("case studies page shows filter controls", async ({ page }) => {
    await page.goto("/admin/agents/case-studies");
    await page.waitForLoadState("networkidle");

    // Should have status filter buttons or select
    const filterArea = page.locator('[role="tablist"], [data-testid="status-filter"], button:has-text("All")');
    // At minimum, an "All" filter should be visible
    const allButton = page.getByRole("button", { name: /^All$/i }).or(
      page.locator("button").filter({ hasText: "All" })
    );
    await expect(allButton.first()).toBeVisible({ timeout: 10_000 });
  });

  test("case studies page shows candidates list or empty state", async ({ page }) => {
    await page.goto("/admin/agents/case-studies");
    await page.waitForLoadState("networkidle");

    // Either a table/list of candidates OR an empty state message
    const hasCandidates = await page.locator("table, [role='table'], [data-testid='candidates-list']").isVisible().catch(() => false);
    const hasEmptyState = await page.getByText(/no candidate|no case stud|scan your project/i).isVisible().catch(() => false);

    expect(hasCandidates || hasEmptyState).toBeTruthy();
  });

  test("case studies page has scan button", async ({ page }) => {
    await page.goto("/admin/agents/case-studies");
    await page.waitForLoadState("networkidle");

    // Scan button to trigger ClickUp scan
    const scanButton = page.getByRole("button", { name: /scan/i });
    await expect(scanButton).toBeVisible({ timeout: 10_000 });
  });
});
