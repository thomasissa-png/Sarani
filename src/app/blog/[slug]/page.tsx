import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Section } from "@/components/layout/section";
import { Button } from "@/components/ui/button";
import {
  blogPosts,
  getBlogPostBySlug,
  getAllBlogSlugs,
  getRelatedBlogPosts,
  formatBlogDate,
} from "@/data/blog-posts";

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllBlogSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);
  if (!post) return {};

  return {
    title: post.metaTitle,
    description: post.metaDescription,
    openGraph: {
      title: post.metaTitle,
      description: post.metaDescription,
      url: `/blog/${post.slug}`,
      type: "article",
      publishedTime: post.publishedAt,
      authors: [post.author],
    },
  };
}

/** Convert plain text content with **bold** markers to structured paragraphs */
function renderContent(content: string) {
  const blocks = content.split("\n\n");
  return blocks.map((block, i) => {
    const trimmed = block.trim();
    if (!trimmed) return null;

    // Headings: lines starting with **...**
    if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
      return (
        <h2
          key={i}
          className="mb-4 mt-10 text-2xl font-bold text-brand-black"
        >
          {trimmed.replace(/\*\*/g, "")}
        </h2>
      );
    }

    // Numbered or bulleted list items
    if (/^(\d+\.\s|\-\s)/.test(trimmed)) {
      const items = trimmed.split("\n").filter(Boolean);
      const isOrdered = /^\d+\./.test(items[0]);
      const ListTag = isOrdered ? "ol" : "ul";
      return (
        <ListTag
          key={i}
          className={`mb-6 space-y-2 ${isOrdered ? "list-decimal" : "list-disc"} pl-6 text-neutral-700 leading-relaxed`}
        >
          {items.map((item, j) => {
            const text = item.replace(/^(\d+\.\s|\-\s)/, "");
            return (
              <li key={j}>
                {renderInlineFormatting(text)}
              </li>
            );
          })}
        </ListTag>
      );
    }

    // Regular paragraph
    return (
      <p key={i} className="mb-6 text-neutral-700 leading-relaxed">
        {renderInlineFormatting(trimmed)}
      </p>
    );
  });
}

/** Handle inline **bold** text within a string */
function renderInlineFormatting(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-bold text-brand-black">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);
  if (!post) notFound();

  const relatedPosts = getRelatedBlogPosts(slug);

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.metaDescription,
    author: {
      "@type": "Organization",
      name: post.author,
      url: "https://sarani.studio",
    },
    publisher: {
      "@type": "Organization",
      name: "Sarani",
      url: "https://sarani.studio",
      logo: {
        "@type": "ImageObject",
        url: "https://sarani.studio/sarani-logo.png",
      },
    },
    datePublished: post.publishedAt,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://sarani.studio/blog/${post.slug}`,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      <div className="pt-[var(--header-height)]">
        {/* Article header */}
        <Section ariaLabel="Article header" tight>
          <div className="mx-auto max-w-3xl">
            <Link
              href="/blog"
              className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-neutral-500 transition-colors duration-150 hover:text-brand-flame"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M19 12H5" />
                <path d="M12 19l-7-7 7-7" />
              </svg>
              Back to Blog
            </Link>

            <span className="mb-4 inline-block rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium uppercase tracking-wider text-neutral-600">
              {post.category}
            </span>

            <h1 className="mb-4 text-3xl font-bold text-brand-black sm:text-4xl lg:text-5xl">
              {post.title}
            </h1>

            <div className="flex items-center gap-4 text-sm text-neutral-500">
              <span>{post.author}</span>
              <span aria-hidden="true">|</span>
              <time dateTime={post.publishedAt}>
                {formatBlogDate(post.publishedAt)}
              </time>
              <span aria-hidden="true">|</span>
              <span>{post.readTime}</span>
            </div>
          </div>
        </Section>

        {/* Article content */}
        <Section ariaLabel="Article content" tight>
          <article className="mx-auto max-w-3xl">
            {renderContent(post.content)}
          </article>
        </Section>

        {/* CTA */}
        <Section ariaLabel="Start your project" className="bg-neutral-50">
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

        {/* Related posts */}
        {relatedPosts.length > 0 && (
          <Section ariaLabel="Related articles">
            <h2 className="mb-8 text-2xl font-bold text-brand-black">
              More from the blog
            </h2>
            <div className="grid gap-8 sm:grid-cols-2">
              {relatedPosts.map((related) => (
                <Link
                  key={related.slug}
                  href={`/blog/${related.slug}`}
                  className="group flex flex-col rounded-2xl border border-neutral-200 bg-brand-white p-6 transition-all duration-200 hover:border-brand-flame hover:shadow-lg"
                >
                  <span className="mb-3 inline-block self-start rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium uppercase tracking-wider text-neutral-600">
                    {related.category}
                  </span>
                  <h3 className="mb-3 text-lg font-bold text-brand-black transition-colors duration-150 group-hover:text-brand-flame">
                    {related.title}
                  </h3>
                  <p className="mb-4 flex-1 text-sm leading-relaxed text-neutral-600">
                    {related.excerpt}
                  </p>
                  <div className="flex items-center justify-between text-xs text-neutral-400">
                    <time dateTime={related.publishedAt}>
                      {formatBlogDate(related.publishedAt)}
                    </time>
                    <span>{related.readTime}</span>
                  </div>
                </Link>
              ))}
            </div>
          </Section>
        )}
      </div>
    </>
  );
}
