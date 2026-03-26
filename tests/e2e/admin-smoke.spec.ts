/**
 * P0 — Admin back-office smoke tests
 * WHY: The admin panel must not be accessible without authentication.
 * An open admin = data breach risk for enterprise clients.
 */

import { test, expect } from "@playwright/test";

test.describe("Admin — smoke tests", () => {
  test("/admin/login shows login form", async ({ page }) => {
    await page.goto("/admin/login");

    // Login form should be visible
    await expect(page.locator("form")).toBeVisible();

    // Email and password fields present
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(
      page.locator('input[type="password"]')
    ).toBeVisible();

    // Submit button present
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("/admin without auth redirects to login", async ({ page }) => {
    // Try accessing admin dashboard directly
    const response = await page.goto("/admin");

    // Should either redirect to login or show login page
    // Accept both: redirect (302 -> login) or middleware redirect (200 on login page)
    const url = page.url();
    const isOnLoginPage = url.includes("/admin/login");
    const isOnAdminPage = url.endsWith("/admin") || url.endsWith("/admin/");

    if (isOnAdminPage) {
      // If we're still on /admin, the page should show a login form
      // (some implementations render login inline instead of redirecting)
      const hasForm = await page.locator("form").isVisible().catch(() => false);
      const hasLoginButton = await page
        .locator('button[type="submit"]')
        .isVisible()
        .catch(() => false);
      expect(hasForm || hasLoginButton).toBeTruthy();
    } else {
      // Should have been redirected to login
      expect(isOnLoginPage).toBeTruthy();
    }
  });

  test("/admin/login shows error on invalid credentials", async ({
    page,
  }) => {
    await page.goto("/admin/login");

    await page.fill('input[type="email"]', "fake@example.com");
    await page.fill('input[type="password"]', "wrongpassword");
    await page.click('button[type="submit"]');

    // Should show error message (not crash)
    await expect(page.locator('[role="alert"]')).toBeVisible({
      timeout: 10_000,
    });
  });
});
