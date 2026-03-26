/**
 * P0 — Navigation, sitemap, robots.txt, legal footer link
 * WHY:
 * - Sitemap missing = Google cannot index the site (AC-106-2)
 * - robots.txt misconfigured = entire site deindexed (AC-106-3)
 * - Legal link missing = Marc cannot complete due diligence (AC-105-4)
 * - Broken navigation = Sophie bounces
 */

import { test, expect } from "@playwright/test";

/* ---------- Pages that must return 200 ---------- */

const publicPages = [
  { name: "Homepage", path: "/" },
  { name: "Contact", path: "/contact" },
  { name: "Pricing", path: "/pricing" },
  { name: "Legal", path: "/legal" },
  { name: "Work", path: "/work" },
  { name: "About", path: "/about" },
  { name: "Services", path: "/services" },
];

/* ---------- All pages load without errors ---------- */

test.describe("Navigation — all public pages load", () => {
  for (const { name, path } of publicPages) {
    test(`${name} (${path}) returns HTTP 200`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
    });
  }
});

/* ---------- 404 page ---------- */

test.describe("Navigation — 404 handling", () => {
  test("non-existent route shows custom 404 page", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist-12345");
    expect(response?.status()).toBe(404);

    // Custom 404 page should render (not blank)
    const bodyText = await page.textContent("body");
    expect(bodyText).toBeTruthy();
    expect(bodyText!.length).toBeGreaterThan(50);
  });
});

/* ---------- Navigation links functional ---------- */

test.describe("Navigation — header links", () => {
  test("main nav links are present and functional", async ({ page }) => {
    await page.goto("/");

    // Key nav links should exist
    const navLinks = [
      { text: /pricing/i, href: "/pricing" },
      { text: /contact|start a project/i, href: "/contact" },
    ];

    for (const { text, href } of navLinks) {
      const link = page.locator(`a[href="${href}"]`).first();
      await expect(link).toBeAttached();
    }
  });
});

/* ---------- Footer "Legal & Privacy" on ALL pages (AC-105-4) ---------- */

test.describe("Legal footer link — present on all pages", () => {
  for (const { name, path } of publicPages) {
    test(`${name} (${path}) has Legal link in footer`, async ({ page }) => {
      await page.goto(path);

      // Look for a link to /legal in the footer area or anywhere on page
      const legalLink = page.locator('a[href="/legal"]');
      await expect(legalLink.first()).toBeAttached();
    });
  }
});

/* ---------- /sitemap.xml (AC-106-2) ---------- */

test.describe("SEO — sitemap.xml", () => {
  test("/sitemap.xml returns 200 with XML content", async ({ request }) => {
    const response = await request.get("/sitemap.xml");
    expect(response.status()).toBe(200);

    const contentType = response.headers()["content-type"] || "";
    // Accept both application/xml and text/xml
    expect(contentType).toMatch(/xml/);

    const body = await response.text();
    // Must be valid XML with urlset
    expect(body).toContain("<urlset");
    expect(body).toContain("<url>");
    expect(body).toContain("<loc>");
  });

  test("/sitemap.xml contains critical page URLs", async ({ request }) => {
    const response = await request.get("/sitemap.xml");
    const body = await response.text();

    // Critical pages must be in sitemap
    const requiredPaths = ["/", "/contact", "/pricing", "/work"];
    for (const path of requiredPaths) {
      expect(body).toContain(path);
    }
  });
});

/* ---------- /robots.txt (AC-106-3) ---------- */

test.describe("SEO — robots.txt", () => {
  test("/robots.txt returns 200 with correct directives", async ({
    request,
  }) => {
    const response = await request.get("/robots.txt");
    expect(response.status()).toBe(200);

    const body = await response.text();

    // Must allow crawling of public site
    expect(body).toMatch(/allow:\s*\//i);

    // Must disallow /api/ (security — no API endpoints in search)
    expect(body).toMatch(/disallow:\s*\/api/i);

    // Must reference sitemap
    expect(body.toLowerCase()).toContain("sitemap");
  });
});

/* ---------- Meta tags — unique per page (AC-106-1) ---------- */

test.describe("SEO — unique meta tags", () => {
  test("each page has a unique title", async ({ page }) => {
    const titles: string[] = [];

    for (const { path } of publicPages) {
      await page.goto(path);
      const title = await page.title();
      expect(title).toBeTruthy();
      expect(title.length).toBeGreaterThan(0);
      expect(title.length).toBeLessThanOrEqual(70);
      titles.push(title);
    }

    // All titles should be unique
    const uniqueTitles = new Set(titles);
    expect(uniqueTitles.size).toBe(titles.length);
  });

  test("each page has a meta description", async ({ page }) => {
    for (const { path } of publicPages) {
      await page.goto(path);
      const metaDesc = await page
        .locator('meta[name="description"]')
        .getAttribute("content");
      expect(metaDesc).toBeTruthy();
      expect(metaDesc!.length).toBeGreaterThan(50);
    }
  });
});
