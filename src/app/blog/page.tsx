import type { Metadata } from "next";
import { Section } from "@/components/layout/section";
import { Button } from "@/components/ui/button";
import { blogPosts, getBlogCategories } from "@/data/blog-posts";
import { BlogCategoryFilter } from "@/components/blog/BlogCategoryFilter";

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
};

export default function BlogPage() {
  const categories = getBlogCategories();

  return (
    <div className="pt-[var(--header-height)]">
      <Section ariaLabel="Blog articles">
        <h1 className="mb-4 text-4xl font-bold text-brand-black sm:text-5xl">
          Insights from 5 Continents
        </h1>
        <p className="mb-10 max-w-2xl text-lg leading-relaxed text-neutral-600">
          How enterprise teams like TikTok, Sony, and GEODIS scale creative
          production. Operational insights, pricing analysis, and the standards
          we see shaping the industry.
        </p>

        {/* Category filter */}
        <BlogCategoryFilter categories={categories} posts={blogPosts} />
      </Section>

      {/* Footer CTA */}
      <Section ariaLabel="Start your project">
        <div className="text-center">
          <h2 className="mb-4 text-3xl font-bold text-brand-black sm:text-4xl">
            Your next campaign starts with a brief
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-neutral-500">
            D+1 delivery. Fixed prices. First project satisfaction or no invoice.
          </p>
          <Button variant="primary" href="/contact">
            Start a project
          </Button>
        </div>
      </Section>
    </div>
  );
}
