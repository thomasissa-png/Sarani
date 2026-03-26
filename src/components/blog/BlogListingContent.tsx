"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { getSortedBlogPosts, formatBlogDate } from "@/data/blog-posts";

const blogPosts = getSortedBlogPosts();

const ALL_CATEGORY = "All";

function getUniqueCategories(): string[] {
  const categories = new Set(blogPosts.map((post) => post.category));
  return [ALL_CATEGORY, ...Array.from(categories).sort()];
}

export function BlogListingContent() {
  const categories = useMemo(getUniqueCategories, []);
  const [activeCategory, setActiveCategory] = useState(ALL_CATEGORY);

  const filteredPosts = useMemo(
    () =>
      activeCategory === ALL_CATEGORY
        ? blogPosts
        : blogPosts.filter((post) => post.category === activeCategory),
    [activeCategory],
  );

  return (
    <>
      {/* Category filter */}
      <div className="mb-10 flex flex-wrap gap-2" role="tablist" aria-label="Filter by category">
        {categories.map((category) => (
          <button
            key={category}
            role="tab"
            aria-selected={activeCategory === category}
            onClick={() => setActiveCategory(category)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors duration-150 ${
              activeCategory === category
                ? "bg-brand-black text-brand-white"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Articles grid */}
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {filteredPosts.map((post) => (
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

      {/* Empty state */}
      {filteredPosts.length === 0 && (
        <p className="py-12 text-center text-neutral-500">
          Nothing here yet for that filter.{" "}
          <button
            onClick={() => setActiveCategory(ALL_CATEGORY)}
            className="font-medium text-brand-flame underline underline-offset-2"
          >
            See all articles
          </button>
        </p>
      )}
    </>
  );
}
