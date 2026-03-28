// SSR — each LP is unique per slug, dynamic data from DB
import React from "react";
import { db } from "@/lib/db";
import { landingPages, clients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { LandingPageSections } from "@/lib/db/schema";
import ImageLightbox from "@/components/ui/ImageLightbox";

/** Validate URL to prevent javascript: XSS */
function safeHref(url: string | undefined): string {
  if (!url) return "#contact";
  if (
    url.startsWith("https://") ||
    url.startsWith("http://") ||
    url.startsWith("#") ||
    url.startsWith("/")
  ) {
    return url;
  }
  return "#contact";
}

/** Determine if a hex color is "light" (needs dark text) */
function isLightColor(hex: string): boolean {
  const clean = hex.replace("#", "");
  if (clean.length < 6) return false;
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return r + g + b > 380;
}

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
  const bgColor = page.paletteOverride?.backgroundColor ?? "#000000";
  const lightBg = isLightColor(bgColor);
  const textColor = lightBg ? "#1a1a1a" : "#ffffff";
  const mutedText = lightBg ? "rgba(26,26,26,0.6)" : "rgba(255,255,255,0.7)";
  const subtleText = lightBg ? "rgba(26,26,26,0.4)" : "rgba(255,255,255,0.5)";
  const borderColor = lightBg
    ? "rgba(0,0,0,0.08)"
    : "rgba(255,255,255,0.10)";
  const cardBg = lightBg
    ? "rgba(0,0,0,0.03)"
    : "rgba(255,255,255,0.05)";

  // Hero image URL: prefer imageUrl, fallback to backgroundImageUrl
  const heroImageUrl =
    sections.hero?.imageUrl ?? sections.hero?.backgroundImageUrl;
  const hasHeroImage =
    sections.hero?.backgroundType === "image" && !!heroImageUrl;

  // Normalize socialProof to always be an array (or undefined)
  const testimonials: Array<{
    quote: string;
    author: string;
    company: string;
  }> | null = sections.socialProof
    ? Array.isArray(sections.socialProof)
      ? sections.socialProof
      : [sections.socialProof]
    : null;

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: bgColor,
        color: textColor,
        fontFamily: page.clientFontName
          ? `"${page.clientFontName.replace(/[^a-zA-Z0-9\s-]/g, "")}", system-ui, sans-serif`
          : '"Outfit", system-ui, sans-serif',
      }}
    >
      {/* ── Hero Section ──────────────────────────────────────────────── */}
      {sections.hero && (
        <section
          className="relative px-6 py-24 md:py-32 lg:py-40 overflow-hidden"
          style={
            hasHeroImage
              ? {
                  backgroundImage: `url(${heroImageUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : undefined
          }
        >
          {/* Overlay gradient for image backgrounds */}
          {hasHeroImage && (
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(to bottom, ${bgColor}cc, ${bgColor}ee)`,
              }}
            />
          )}

          <div className="relative max-w-4xl mx-auto text-center">
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
            <p
              className="mt-6 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed"
              style={{ color: mutedText }}
            >
              {sections.hero.subheadline}
            </p>
            <div className="mt-10">
              <a
                href={safeHref(sections.hero.ctaUrl)}
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

      {/* ── Features Section ──────────────────────────────────────────── */}
      {sections.features && sections.features.length > 0 && (
        <section className="px-6 py-20" style={{ backgroundColor: cardBg }}>
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
              {sections.featuresHeadline || "What we deliver"}
            </h2>
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
                  className="p-6 rounded-2xl"
                  style={{
                    backgroundColor: cardBg,
                    border: `1px solid ${borderColor}`,
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                    style={{ backgroundColor: `${primaryColor}20` }}
                  >
                    <FeatureIcon name={feature.iconName} color={primaryColor} />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    {feature.title}
                  </h3>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: mutedText }}
                  >
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Gallery Section ───────────────────────────────────────────── */}
      {sections.gallery && sections.gallery.length > 0 && (
        <section className="px-6 py-20">
          <div className="max-w-6xl mx-auto">
            <GalleryGrid
              images={sections.gallery}
              borderColor={borderColor}
              mutedText={mutedText}
            />
          </div>
        </section>
      )}

      {/* ── Social Proof Section ──────────────────────────────────────── */}
      {testimonials && testimonials.length > 0 && (
        <section className="px-6 py-20">
          <div className="max-w-5xl mx-auto">
            {testimonials.length === 1 ? (
              /* Single testimonial — centered blockquote */
              <div className="max-w-3xl mx-auto text-center">
                <blockquote
                  className="text-xl md:text-2xl italic leading-relaxed"
                  style={{ color: mutedText }}
                >
                  &ldquo;{testimonials[0].quote}&rdquo;
                </blockquote>
                <div className="mt-6">
                  <p className="font-semibold">{testimonials[0].author}</p>
                  <p className="text-sm" style={{ color: subtleText }}>
                    {testimonials[0].company}
                  </p>
                </div>
              </div>
            ) : (
              /* Multiple testimonials — grid */
              <div
                className={`grid gap-8 ${
                  testimonials.length === 2
                    ? "md:grid-cols-2"
                    : "md:grid-cols-2 lg:grid-cols-3"
                }`}
              >
                {testimonials.map((t, i) => (
                  <div
                    key={i}
                    className="p-6 rounded-2xl"
                    style={{
                      backgroundColor: cardBg,
                      border: `1px solid ${borderColor}`,
                    }}
                  >
                    <blockquote
                      className="text-base italic leading-relaxed mb-4"
                      style={{ color: mutedText }}
                    >
                      &ldquo;{t.quote}&rdquo;
                    </blockquote>
                    <div>
                      <p className="font-semibold text-sm">{t.author}</p>
                      <p className="text-xs" style={{ color: subtleText }}>
                        {t.company}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Pricing Section ───────────────────────────────────────────── */}
      {sections.pricing && (
        <section className="px-6 py-20" style={{ backgroundColor: cardBg }}>
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">
              {sections.pricing.headline}
            </h2>
            <div
              className="rounded-2xl overflow-hidden"
              style={{ border: `1px solid ${borderColor}` }}
            >
              <table className="w-full text-left">
                <thead>
                  <tr style={{ backgroundColor: cardBg }}>
                    <th className="px-6 py-4 text-sm font-semibold">Item</th>
                    <th className="px-6 py-4 text-sm font-semibold text-right">
                      Price
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sections.pricing.items.map((item, i) => (
                    <tr
                      key={i}
                      style={{
                        borderTop: `1px solid ${borderColor}`,
                      }}
                    >
                      <td className="px-6 py-4">
                        <p className="font-medium">{item.name}</p>
                        {item.description && (
                          <p
                            className="text-sm mt-1"
                            style={{ color: mutedText }}
                          >
                            {item.description}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-mono whitespace-nowrap">
                        {item.price}
                      </td>
                    </tr>
                  ))}
                  {sections.pricing.total && (
                    <tr
                      style={{
                        borderTop: `2px solid ${borderColor}`,
                      }}
                    >
                      <td className="px-6 py-4 font-bold">Total</td>
                      <td
                        className="px-6 py-4 text-right font-bold font-mono"
                        style={{ color: primaryColor }}
                      >
                        {sections.pricing.total}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {sections.pricing.note && (
              <p
                className="text-sm mt-4 text-center"
                style={{ color: mutedText }}
              >
                {sections.pricing.note}
              </p>
            )}
          </div>
        </section>
      )}

      {/* ── Team Section ──────────────────────────────────────────────── */}
      {sections.team && sections.team.members.length > 0 && (
        <section className="px-6 py-20">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">
              {sections.team.headline}
            </h2>
            <div
              className={`grid gap-6 ${
                sections.team.members.length <= 3
                  ? "md:grid-cols-3"
                  : "md:grid-cols-2 lg:grid-cols-4"
              }`}
            >
              {sections.team.members.map((member, i) => (
                <div
                  key={i}
                  className="text-center p-6 rounded-2xl"
                  style={{
                    backgroundColor: cardBg,
                    border: `1px solid ${borderColor}`,
                  }}
                >
                  {/* Avatar placeholder */}
                  <div
                    className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-xl font-bold"
                    style={{
                      backgroundColor: `${primaryColor}20`,
                      color: primaryColor,
                    }}
                  >
                    {member.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <p className="font-semibold">{member.name}</p>
                  <p className="text-sm" style={{ color: mutedText }}>
                    {member.role}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA Section ───────────────────────────────────────────────── */}
      {sections.cta && (
        <section className="px-6 py-20">
          <div
            className="max-w-3xl mx-auto text-center p-12 rounded-3xl"
            style={{ backgroundColor: `${primaryColor}15` }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {sections.cta.headline}
            </h2>
            <p className="text-lg mb-8" style={{ color: mutedText }}>
              {sections.cta.subtext}
            </p>
            <a
              href={safeHref(sections.cta.buttonUrl)}
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

      {/* ── Footer ────────────────────────────────────────────────────── */}
      {sections.footer && (
        <footer
          className="px-6 py-12"
          style={{ borderTop: `1px solid ${borderColor}` }}
        >
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-sm" style={{ color: subtleText }}>
              {sections.footer.tagline}
            </p>
            <p className="text-xs mt-2" style={{ color: subtleText, opacity: 0.5 }}>
              sarani.studio
            </p>
          </div>
        </footer>
      )}
    </div>
  );
}

// ─── Gallery Grid (Client Component wrapper) ──────────────────────────────

function GalleryGrid({
  images,
  borderColor,
  mutedText,
}: {
  images: Array<{ imageUrl: string; caption?: string }>;
  borderColor: string;
  mutedText: string;
}) {
  const cols =
    images.length === 1
      ? "grid-cols-1"
      : images.length === 2
        ? "grid-cols-1 md:grid-cols-2"
        : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";

  return (
    <div className={`grid gap-4 ${cols}`}>
      {images.map((img, i) => (
        <figure
          key={i}
          className="overflow-hidden rounded-2xl"
          style={{ border: `1px solid ${borderColor}` }}
        >
          <ImageLightbox
            src={img.imageUrl}
            alt={img.caption || `Gallery image ${i + 1}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.imageUrl}
              alt={img.caption || `Gallery image ${i + 1}`}
              className="w-full h-64 object-cover"
            />
          </ImageLightbox>
          {img.caption && (
            <figcaption
              className="px-4 py-3 text-sm"
              style={{ color: mutedText }}
            >
              {img.caption}
            </figcaption>
          )}
        </figure>
      ))}
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
    heart: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
    award: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="7" />
        <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
      </svg>
    ),
    briefcase: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </svg>
    ),
    trending: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
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
