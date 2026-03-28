/**
 * BreadcrumbList JSON-LD generator for SEO.
 * Used in generateMetadata or injected via <script type="application/ld+json">.
 */

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function buildBreadcrumbJsonLd(items: readonly BreadcrumbItem[]): object {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

const BASE = "https://sarani.studio";

/** Pre-built breadcrumbs for static pages */
export const BREADCRUMBS = {
  about: [
    { name: "Home", url: BASE },
    { name: "About", url: `${BASE}/about` },
  ],
  services: [
    { name: "Home", url: BASE },
    { name: "Services", url: `${BASE}/services` },
  ],
  pricing: [
    { name: "Home", url: BASE },
    { name: "Pricing", url: `${BASE}/pricing` },
  ],
  contact: [
    { name: "Home", url: BASE },
    { name: "Contact", url: `${BASE}/contact` },
  ],
  work: [
    { name: "Home", url: BASE },
    { name: "Work", url: `${BASE}/work` },
  ],
  blog: [
    { name: "Home", url: BASE },
    { name: "Blog", url: `${BASE}/blog` },
  ],
  legal: [
    { name: "Home", url: BASE },
    { name: "Legal", url: `${BASE}/legal` },
  ],
} as const;

/** Build breadcrumb for a work detail page */
export function workDetailBreadcrumb(clientName: string, slug: string): BreadcrumbItem[] {
  return [
    { name: "Home", url: BASE },
    { name: "Work", url: `${BASE}/work` },
    { name: clientName, url: `${BASE}/work/${slug}` },
  ];
}

/** Build breadcrumb for a blog article page */
export function blogArticleBreadcrumb(title: string, slug: string): BreadcrumbItem[] {
  return [
    { name: "Home", url: BASE },
    { name: "Blog", url: `${BASE}/blog` },
    { name: title, url: `${BASE}/blog/${slug}` },
  ];
}
