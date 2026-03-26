/**
 * P0 — Contact form E2E tests
 * WHY: The contact form is the ONLY digital conversion point.
 * Broken form = zero leads = zero revenue.
 * Linked AC: AC-103-1 to AC-103-6
 * Persona: Sophie, Head of Marketing, enterprise
 */

import { test, expect } from "@playwright/test";

/* ---------- Test data ---------- */

const validFormData = {
  name: "Sophie Martin",
  company: "TikTok",
  email: "sophie@tiktok.com",
  message: "We need 50 banners in 3 languages by Friday. Budget is 5000 EUR.",
  companySize: "500M\u20AC+",
  attribution: "Referral",
};

/* ---------- Helper: fill the form ---------- */

async function fillContactForm(
  page: import("@playwright/test").Page,
  data = validFormData
) {
  await page.fill("#contact-name", data.name);
  await page.fill("#contact-company", data.company);
  await page.fill("#contact-email", data.email);
  await page.fill("#contact-message", data.message);
  await page.selectOption("#contact-company-size", data.companySize);
  await page.selectOption("#contact-attribution", data.attribution);
}

/* ---------- Happy path: form submission ---------- */

test.describe("Contact form — happy path", () => {
  test("submits successfully and shows success message", async ({ page }) => {
    await page.goto("/contact");

    // Form is visible
    await expect(page.locator("form")).toBeVisible();
    await expect(page.locator("h1")).toContainText("Start a project");

    // Fill all required fields
    await fillContactForm(page);

    // Submit
    await page.click('button[type="submit"]');

    // Button shows "Sending..." while submitting
    // Then success message replaces the form
    await expect(page.getByText("Brief received.")).toBeVisible({
      timeout: 10_000,
    });

    // Form should no longer be visible (replaced by success state)
    await expect(page.locator("form")).not.toBeVisible();

    // URL should NOT change (AC-103-3)
    expect(page.url()).toContain("/contact");
  });

  test("submit button shows 'Sending...' during submission", async ({
    page,
  }) => {
    // Slow down the API response to catch the loading state
    await page.route("**/api/contact", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto("/contact");
    await fillContactForm(page);
    await page.click('button[type="submit"]');

    // Should show "Sending..." and be disabled
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toContainText("Sending...");
    await expect(submitBtn).toBeDisabled();
  });
});

/* ---------- Validation errors (AC-103-4) ---------- */

test.describe("Contact form — client-side validation", () => {
  test("shows inline errors for empty required fields", async ({ page }) => {
    await page.goto("/contact");

    // Click submit without filling anything
    await page.click('button[type="submit"]');

    // Inline error messages should appear (no modal)
    await expect(page.locator("#contact-name-error")).toBeVisible();
    await expect(page.locator("#contact-name-error")).toContainText(
      "This field is required"
    );

    // Form should still be visible (not submitted)
    await expect(page.locator("form")).toBeVisible();
  });

  test("shows error for invalid email format", async ({ page }) => {
    await page.goto("/contact");

    await page.fill("#contact-name", "Sophie");
    await page.fill("#contact-company", "TikTok");
    await page.fill("#contact-email", "not-an-email");
    await page.fill(
      "#contact-message",
      "We need banners for our campaign launch."
    );
    await page.selectOption("#contact-company-size", "500M\u20AC+");
    await page.selectOption("#contact-attribution", "Referral");

    await page.click('button[type="submit"]');

    await expect(page.locator("#contact-email-error")).toBeVisible();
    await expect(page.locator("#contact-email-error")).toContainText(
      "email address"
    );
  });

  test("focuses first error field on validation failure", async ({ page }) => {
    await page.goto("/contact");

    // Fill only email (skip name which comes first)
    await page.fill("#contact-email", "sophie@tiktok.com");

    await page.click('button[type="submit"]');

    // First error field (name) should be focused
    const focusedId = await page.evaluate(() => document.activeElement?.id);
    expect(focusedId).toBe("contact-name");
  });
});

/* ---------- Server error handling ---------- */

test.describe("Contact form — error states", () => {
  test("shows error banner on server error (500)", async ({ page }) => {
    // Intercept API to return 500
    await page.route("**/api/contact", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "server_error" }),
      })
    );

    await page.goto("/contact");
    await fillContactForm(page);
    await page.click('button[type="submit"]');

    // Error banner should appear
    await expect(
      page.getByText("That didn't go through", { exact: false })
    ).toBeVisible();

    // Form data should be preserved (not cleared)
    await expect(page.locator("#contact-name")).toHaveValue("Sophie Martin");

    // Submit button should re-enable
    await expect(page.locator('button[type="submit"]')).toBeEnabled();
  });

  test("shows rate limit message on 429", async ({ page }) => {
    // Intercept API to return 429
    await page.route("**/api/contact", (route) =>
      route.fulfill({
        status: 429,
        contentType: "application/json",
        body: JSON.stringify({ error: "rate_limited" }),
      })
    );

    await page.goto("/contact");
    await fillContactForm(page);
    await page.click('button[type="submit"]');

    // Rate limit message should appear
    await expect(
      page.getByText("Too many requests", { exact: false })
    ).toBeVisible();
  });
});

/* ---------- Honeypot anti-spam ---------- */

test.describe("Contact form — honeypot", () => {
  test("honeypot field is hidden from users", async ({ page }) => {
    await page.goto("/contact");

    // Honeypot field should exist but not be visible
    const honeypot = page.locator("#contact-honeypot");
    await expect(honeypot).toBeHidden();
  });
});

/* ---------- Mobile (AC-103-5) ---------- */

test.describe("Contact form — mobile usability", () => {
  test("form is usable at 320px viewport", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto("/contact");

    // No horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(320);

    // Form visible
    await expect(page.locator("form")).toBeVisible();

    // Submit button should be full-width (close to viewport width)
    const btnBox = await page
      .locator('button[type="submit"]')
      .boundingBox();
    expect(btnBox).toBeTruthy();
    if (btnBox) {
      // Button should span most of the viewport (>80% of 320px)
      expect(btnBox.width).toBeGreaterThan(250);
    }
  });
});

/* ---------- Form accessibility (2 clicks from any page) ---------- */

test.describe("Contact form — accessibility from homepage", () => {
  test("contact form is reachable in max 2 clicks from homepage (AC-103-1)", async ({
    page,
  }) => {
    await page.goto("/");

    // Find a link to /contact (CTA or nav link)
    const contactLink = page.locator('a[href="/contact"]').first();
    await expect(contactLink).toBeVisible();

    // Click it — 1 click
    await contactLink.click();
    await page.waitForURL("**/contact");

    // Form should be visible — no second click needed
    await expect(page.locator("form")).toBeVisible();
  });
});
