import { db } from "@/lib/db";
import { landingPages, clients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  const [page] = await db
    .select({
      title: landingPages.title,
      sections: landingPages.sections,
      noIndex: landingPages.noIndex,
    })
    .from(landingPages)
    .where(eq(landingPages.slug, slug));

  if (!page) {
    return { title: "Not Found" };
  }

  const metaTitle = page.sections?.meta?.title || page.title;
  const metaDescription =
    page.sections?.meta?.description || `${page.title} - Landing Page`;

  return {
    title: metaTitle,
    description: metaDescription,
    robots: page.noIndex ? { index: false, follow: false } : undefined,
  };
}

export default async function LandingPagePublic({ params }: Props) {
  const { slug } = await params;

  const [page] = await db
    .select({
      id: landingPages.id,
      title: landingPages.title,
      slug: landingPages.slug,
      status: landingPages.status,
      sections: landingPages.sections,
      clientName: clients.name,
    })
    .from(landingPages)
    .leftJoin(clients, eq(landingPages.clientId, clients.id))
    .where(eq(landingPages.slug, slug));

  if (!page) {
    notFound();
  }

  // Only published pages are viewable publicly
  if (page.status !== "published") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center space-y-3">
          <h1 className="text-2xl font-bold text-neutral-800">
            {page.title}
          </h1>
          <p className="text-neutral-500">
            This landing page is not yet published.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="max-w-lg text-center space-y-4 p-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-neutral-200 rounded-full mb-2">
          <svg
            className="w-8 h-8 text-neutral-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-neutral-900">{page.title}</h1>
        {page.clientName && (
          <p className="text-sm text-neutral-500">by {page.clientName}</p>
        )}
        <p className="text-neutral-600">
          Landing page coming soon. Full rendering will be available once the
          template engine is integrated.
        </p>
      </div>
    </div>
  );
}
