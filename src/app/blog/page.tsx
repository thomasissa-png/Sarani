import type { Metadata } from "next";
import { Section } from "@/components/layout/section";
import { Button } from "@/components/ui/button";
import { getSortedBlogPosts, getBlogCategories } from "@/data/blog-posts";
import { BlogCategoryFilter } from "@/components/blog/BlogCategoryFilter";
import { BreadcrumbSchema } from "@/components/seo/breadcrumb-schema";
import { BREADCRUMBS } from "@/lib/breadcrumb-jsonld";

export const metadata: Metadata = {
  title: "Blog — Creative Production Insights for Enterprise Teams",
  description:
    "Thought leadership, behind-the-scenes, and industry insights from Sarani. How enterprise teams like TikTok, Sony, and GEODIS approach creative production at scale.",
  openGraph: {
    title: "Blog — Sarani Creative Production Insights",
    description:
      "Thought leadership and industry insights on enterprise creative production at scale.",
    url: "/blog",
  },
  alternates: {
    canonical: "https://sarani.studio/blog",
  },
};

export default function BlogPage() {
  const categories = getBlogCategories();

  return (
    <div className="pt-[var(--header-height)]">
      <BreadcrumbSchema items={BREADCRUMBS.blog} />
      <Section ariaLabel="Blog articles">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand-flame mb-4">
          Insights
        </p>
        <h1 className="mb-4 text-4xl font-bold leading-tight tracking-tight text-brand-black sm:text-5xl lg:text-6xl">
          Enterprise Creative Production Blog
        </h1>
        <p className="mb-10 max-w-2xl text-lg leading-relaxed text-neutral-600">
          How enterprise teams like TikTok, Sony, and GEODIS scale creative
          production. Operational insights, pricing analysis, and the standards
          we see shaping the industry.
        </p>

        {/* Category filter */}
        <BlogCategoryFilter categories={categories} posts={getSortedBlogPosts()} />
      </Section>

      {/* Footer CTA */}
      <Section ariaLabel="Start your project" className="bg-brand-black">
        <div className="text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">Ready to start?</h2>
          <p className="text-lg text-neutral-400 max-w-xl mx-auto">First project satisfaction or no invoice.</p>
          <Button variant="primary" href="/contact">
            Start a project
          </Button>
        </div>
      </Section>
    </div>
  );
}
