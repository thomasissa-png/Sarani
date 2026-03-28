import { buildBreadcrumbJsonLd, type BreadcrumbItem } from "@/lib/breadcrumb-jsonld";

/**
 * Injects BreadcrumbList JSON-LD into the page head.
 * Server component — renders a <script> tag with structured data.
 */
export function BreadcrumbSchema({ items }: { items: readonly BreadcrumbItem[] }) {
  const jsonLd = buildBreadcrumbJsonLd(items);
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
