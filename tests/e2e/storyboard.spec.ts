/**
 * P0 — Storyboard Generator smoke tests
 * WHY: Storyboards with AI-generated visuals (fal.ai) are a key differentiator
 * for Sarani's video production pipeline (1500+ TikTok videos/month).
 * If the storyboard admin page breaks, video briefs can't be shared with clients.
 *
 * Smoke tests only — no real fal.ai or Claude calls.
 */

import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@sarani.studio";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

test.describe("Storyboard — smoke tests", () => {
  test.skip(!ADMIN_PASSWORD, "ADMIN_PASSWORD not set — skipping auth-gated tests");

  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/login");
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD!);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin(?!\/login)/, { timeout: 15_000 });
  });

  test("storyboards page is accessible", async ({ page }) => {
    await page.goto("/admin/storyboards");
    await page.waitForLoadState("networkidle");

    const heading = page.locator("h1, h2").first();
    await expect(heading).toBeVisible({ timeout: 10_000 });
    const text = await heading.textContent();
    expect(text?.toLowerCase()).toMatch(/storyboard/i);
  });

  test("storyboards page shows status filters", async ({ page }) => {
    await page.goto("/admin/storyboards");
    await page.waitForLoadState("networkidle");

    // Status filters: All, Draft, Generating, Ready, Shared, Approved, Rejected
    const allButton = page.getByRole("button", { name: /^All$/i }).or(
      page.locator("button").filter({ hasText: "All" })
    );
    await expect(allButton.first()).toBeVisible({ timeout: 10_000 });
  });

  test("storyboards page shows list or empty state", async ({ page }) => {
    await page.goto("/admin/storyboards");
    await page.waitForLoadState("networkidle");

    const hasList = await page.locator("table, [role='table']").isVisible().catch(() => false);
    const hasEmptyState = await page.getByText(/no storyboard|create your first/i).isVisible().catch(() => false);
    const hasCards = await page.locator("[data-testid='storyboard-card']").first().isVisible().catch(() => false);

    expect(hasList || hasEmptyState || hasCards).toBeTruthy();
  });

  test("storyboards page has create button", async ({ page }) => {
    await page.goto("/admin/storyboards");
    await page.waitForLoadState("networkidle");

    const createButton = page.getByRole("button", { name: /new|create/i });
    await expect(createButton).toBeVisible({ timeout: 10_000 });
  });
});
