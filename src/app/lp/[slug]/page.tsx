import React from "react";
import { db } from "@/lib/db";
import { landingPages, clients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { LandingPageSections } from "@/lib/db/schema";

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
    openGraph: {
      title: metaTitle,
      description: metaDescription,
      type: "website",
    },
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
      logoUrl: landingPages.logoUrl,
      paletteOverride: landingPages.paletteOverride,
      clientId: landingPages.clientId,
      clientName: clients.name,
      clientPrimaryColor: clients.primaryColor,
      clientFontName: clients.fontName,
    })
    .from(landingPages)
    .leftJoin(clients, eq(landingPages.clientId, clients.id))
    .where(eq(landingPages.slug, slug));

  if (!page) {
    notFound();
  }

  // Only published pages are viewable publicly
  if (page.status !== "published") {
    notFound();
  }

  const sections = page.sections as LandingPageSections | null;
  if (!sections) {
    notFound();
  }

  // Determine colors
  const primaryColor =
    page.paletteOverride?.primaryColor ??
    page.clientPrimaryColor ??
    "#da5126"; // Sarani Flame default
  const bgColor =
    page.paletteOverride?.backgroundColor ?? "#000000";

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: bgColor,
        color: "#ffffff",
        fontFamily: page.clientFontName
          ? `"${page.clientFontName}", system-ui, sans-serif`
          : '"Outfit", system-ui, sans-serif',
      }}
    >
      {/* Hero Section */}
      {sections.hero && (
        <section className="relative px-6 py-24 md:py-32 lg:py-40">
          <div className="max-w-4xl mx-auto text-center">
            {page.logoUrl && (
              <img
                src={page.logoUrl}
                alt={`${page.clientName ?? "Client"} logo`}
                className="h-10 mx-auto mb-8 object-contain"
              />
            )}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
              {sections.hero.headline}
            </h1>
            <p className="mt-6 text-lg md:text-xl text-white/80 max-w-2xl mx-auto leading-relaxed">
              {sections.hero.subheadline}
            </p>
            <div className="mt-10">
              <a
                href={sections.hero.ctaUrl || "#contact"}
                className="inline-flex items-center px-8 py-4 text-lg font-semibold rounded-full transition-all hover:scale-105"
                style={{
                  backgroundColor: primaryColor,
                  color: "#ffffff",
                }}
              >
                {sections.hero.ctaText}
              </a>
            </div>
          </div>
        </section>
      )}

      {/* Features Section */}
      {sections.features && sections.features.length > 0 && (
        <section className="px-6 py-20 bg-white/5">
          <div className="max-w-5xl mx-auto">
            <div
              className={`grid gap-8 ${
                sections.features.length <= 3
                  ? "md:grid-cols-3"
                  : "md:grid-cols-2 lg:grid-cols-4"
              }`}
            >
              {sections.features.map((feature, i) => (
                <div
                  key={i}
                  className="p-6 rounded-2xl bg-white/5 border border-white/10"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                    style={{ backgroundColor: `${primaryColor}20` }}
                  >
                    <FeatureIcon
                      name={feature.iconName}
                      color={primaryColor}
                    />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-white/70 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Social Proof Section */}
      {sections.socialProof && (
        <section className="px-6 py-20">
          <div className="max-w-3xl mx-auto text-center">
            <blockquote className="text-xl md:text-2xl italic text-white/90 leading-relaxed">
              &ldquo;{sections.socialProof.quote}&rdquo;
            </blockquote>
            <div className="mt-6">
              <p className="font-semibold">{sections.socialProof.author}</p>
              <p className="text-sm text-white/60">
                {sections.socialProof.company}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      {sections.cta && (
        <section className="px-6 py-20">
          <div
            className="max-w-3xl mx-auto text-center p-12 rounded-3xl"
            style={{ backgroundColor: `${primaryColor}15` }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {sections.cta.headline}
            </h2>
            <p className="text-lg text-white/80 mb-8">
              {sections.cta.subtext}
            </p>
            <a
              href={sections.cta.buttonUrl || "#contact"}
              className="inline-flex items-center px-8 py-4 text-lg font-semibold rounded-full transition-all hover:scale-105"
              style={{
                backgroundColor: primaryColor,
                color: "#ffffff",
              }}
            >
              {sections.cta.buttonText}
            </a>
          </div>
        </section>
      )}

      {/* Footer */}
      {sections.footer && (
        <footer className="px-6 py-12 border-t border-white/10">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-sm text-white/50">{sections.footer.tagline}</p>
            <p className="text-xs text-white/30 mt-2">
              Powered by Sarani Studio
            </p>
          </div>
        </footer>
      )}
    </div>
  );
}

// ─── Feature Icon Component ────────────────────────────────────────────────

function FeatureIcon({ name, color }: { name: string; color: string }) {
  const iconMap: Record<string, React.ReactNode> = {
    zap: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
    shield: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    globe: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
    clock: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    star: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
    check: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
    target: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    ),
    users: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  };

  return (
    iconMap[name] ?? (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    )
  );
}
