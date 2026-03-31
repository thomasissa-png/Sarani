/**
 * P0 — Landing Page Generator smoke tests
 * WHY: Landing pages are client-facing deliverables generated via LLM.
 * If the admin page for managing/creating landing pages is broken,
 * the team can't produce client presentations — direct revenue impact.
 *
 * Smoke tests only — no real LLM calls. Mocks API responses where needed.
 */

import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@sarani.studio";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

test.describe("Landing Page Generator — smoke tests", () => {
  test.skip(!ADMIN_PASSWORD, "ADMIN_PASSWORD not set — skipping auth-gated tests");

  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/login");
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD!);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin(?!\/login)/, { timeout: 15_000 });
  });

  test("landing pages page is accessible", async ({ page }) => {
    await page.goto("/admin/landing-pages");
    await page.waitForLoadState("networkidle");

    const heading = page.locator("h1, h2").first();
    await expect(heading).toBeVisible({ timeout: 10_000 });
    const text = await heading.textContent();
    expect(text?.toLowerCase()).toMatch(/landing page/i);
  });

  test("landing pages page shows status filters", async ({ page }) => {
    await page.goto("/admin/landing-pages");
    await page.waitForLoadState("networkidle");

    // Status filters: All, Draft, Generating, Ready, Published, Archived
    const allButton = page.getByRole("button", { name: /^All$/i }).or(
      page.locator("button").filter({ hasText: "All" })
    );
    await expect(allButton.first()).toBeVisible({ timeout: 10_000 });
  });

  test("landing pages page has create button", async ({ page }) => {
    await page.goto("/admin/landing-pages");
    await page.waitForLoadState("networkidle");

    // Create / New button to start a new landing page
    const createButton = page.getByRole("button", { name: /new|create/i });
    await expect(createButton).toBeVisible({ timeout: 10_000 });
  });

  test("landing pages list or empty state renders", async ({ page }) => {
    await page.goto("/admin/landing-pages");
    await page.waitForLoadState("networkidle");

    const hasList = await page.locator("table, [role='table'], [data-testid='landing-pages-list']").isVisible().catch(() => false);
    const hasEmptyState = await page.getByText(/no landing page|create your first/i).isVisible().catch(() => false);
    const hasCards = await page.locator("[data-testid='landing-page-card']").first().isVisible().catch(() => false);

    expect(hasList || hasEmptyState || hasCards).toBeTruthy();
  });
});
