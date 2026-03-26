/**
 * P0 — WCAG 2.1 AA accessibility tests (axe-core)
 * WHY: Enterprise clients (Sophie/Marc persona) have accessibility
 * requirements. Failing WCAG may be a deal-breaker for procurement.
 * Linked AC: Cross-cutting WCAG requirement
 */

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/* ---------- Pages to scan ---------- */

const criticalPages = [
  { name: "Homepage", path: "/" },
  { name: "Contact", path: "/contact" },
  { name: "Pricing", path: "/pricing" },
  { name: "Legal", path: "/legal" },
  { name: "Work", path: "/work" },
  { name: "About", path: "/about" },
];

/* ---------- axe-core WCAG 2.1 AA scans ---------- */

test.describe("WCAG 2.1 AA — axe-core automated checks", () => {
  for (const { name, path } of criticalPages) {
    test(`${name} (${path}) passes axe-core WCAG AA scan`, async ({
      page,
    }) => {
      await page.goto(path, { waitUntil: "networkidle" });

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();

      // Log violations for debugging (useful in CI)
      if (results.violations.length > 0) {
        console.log(
          `Accessibility violations on ${name} (${path}):`,
          JSON.stringify(
            results.violations.map((v) => ({
              id: v.id,
              impact: v.impact,
              description: v.description,
              nodes: v.nodes.length,
            })),
            null,
            2
          )
        );
      }

      expect(results.violations).toEqual([]);
    });
  }
});

/* ---------- Specific accessibility checks ---------- */

test.describe("Accessibility — specific checks", () => {
  test("skip-to-content link exists on homepage", async ({ page }) => {
    await page.goto("/");
    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toBeAttached();
  });

  test("all form fields have associated labels on contact page", async ({
    page,
  }) => {
    await page.goto("/contact");

    // Check that key fields have labels
    const fieldsToCheck = [
      "contact-name",
      "contact-company",
      "contact-email",
      "contact-message",
      "contact-company-size",
      "contact-attribution",
    ];

    for (const fieldId of fieldsToCheck) {
      const label = page.locator(`label[for="${fieldId}"]`);
      await expect(label).toBeAttached();
    }
  });

  test("validation errors are linked via aria-describedby", async ({
    page,
  }) => {
    await page.goto("/contact");

    // Trigger validation errors
    await page.click('button[type="submit"]');

    // Name field should have aria-describedby pointing to error
    const nameField = page.locator("#contact-name");
    await expect(nameField).toHaveAttribute(
      "aria-describedby",
      "contact-name-error"
    );
    await expect(nameField).toHaveAttribute("aria-invalid", "true");
  });

  test("images on homepage have alt attributes", async ({ page }) => {
    await page.goto("/");

    const images = page.locator("img");
    const count = await images.count();

    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute("alt");
      const ariaHidden = await img.getAttribute("aria-hidden");

      // Images must have alt OR be aria-hidden
      if (ariaHidden !== "true") {
        expect(alt).toBeTruthy();
        // No generic alts
        expect(alt).not.toMatch(/^(image|photo|picture|img|untitled)$/i);
      }
    }
  });
});
