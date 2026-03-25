import type { Metadata } from "next";
import Link from "next/link";
import { Section } from "@/components/layout/section";
import { Button } from "@/components/ui/button";
import { blogPosts, formatBlogDate } from "@/data/blog-posts";

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
  return (
    <div className="pt-[var(--header-height)]">
      <Section ariaLabel="Blog articles">
        <h1 className="mb-6 text-4xl font-bold text-brand-black sm:text-5xl">
          Blog
        </h1>
        <p className="mb-12 max-w-2xl text-lg text-neutral-600">
          Insights on enterprise creative production. How global brands scale
          content, manage agencies, and deliver faster.
        </p>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {blogPosts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group flex flex-col rounded-2xl border border-neutral-200 bg-brand-white p-6 transition-all duration-200 hover:border-brand-flame hover:shadow-lg"
            >
              <span className="mb-3 inline-block self-start rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium uppercase tracking-wider text-neutral-600">
                {post.category}
              </span>
              <h2 className="mb-3 text-xl font-bold text-brand-black transition-colors duration-150 group-hover:text-brand-flame">
                {post.title}
              </h2>
              <p className="mb-6 flex-1 text-sm leading-relaxed text-neutral-600">
                {post.excerpt}
              </p>
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <time dateTime={post.publishedAt}>
                  {formatBlogDate(post.publishedAt)}
                </time>
                <span>{post.readTime}</span>
              </div>
            </Link>
          ))}
        </div>
      </Section>

      {/* Footer CTA */}
      <Section ariaLabel="Start your project">
        <div className="text-center">
          <h2 className="mb-4 text-3xl font-bold text-brand-black sm:text-4xl">
            Ready to scale your creative production?
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-neutral-500">
            First project satisfaction or no invoice.
          </p>
          <Button variant="primary" href="/contact">
            Start a project
          </Button>
        </div>
      </Section>
    </div>
  );
}
