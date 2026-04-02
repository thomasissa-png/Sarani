import type { Metadata } from "next";
import localFont from "next/font/local";
import { PublicSiteChrome } from "@/components/layout/public-site-chrome";
import "./globals.css";

const outfit = localFont({
  src: [
    { path: "../../public/fonts/outfit-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/outfit-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../../public/fonts/outfit-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  variable: "--font-outfit",
});

/**
 * Default metadata — source: docs/seo/metadata-templates.md Section 1
 * Per-page overrides via generateMetadata in each page.
 */
export const metadata: Metadata = {
  title: {
    default: "Sarani — Enterprise Creative Agency. D+1 Delivery.",
    template: "%s | Sarani",
  },
  description:
    "45+ experts, 5 continents, 18 languages. Fixed pricing, unlimited revisions. Trusted by TikTok, Sony, Adidas, GEODIS. Brief today, assets tomorrow.",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  metadataBase: new URL("https://sarani.studio"),
  alternates: {
    canonical: "https://sarani.studio",
  },
  openGraph: {
    type: "website",
    url: "https://sarani.studio",
    siteName: "Sarani",
    locale: "en_US",
    images: [
      {
        url: "/images/og/homepage-og.jpg",
        width: 1200,
        height: 630,
        alt: "Sarani — Enterprise Creative Agency. D+1 Delivery.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@saranistudio",
    creator: "@saranistudio",
  },
  robots: {
    index: true,
    follow: true,
  },
};

/**
 * Organization JSON-LD — source: docs/seo/metadata-templates.md Section 2
 * Injected globally on all pages via root layout.
 */
const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Sarani",
  alternateName: "Sarani Studio",
  url: "https://sarani.studio",
  logo: {
    "@type": "ImageObject",
    url: "https://sarani.studio/sarani-logo.png",
    width: 400,
    height: 80,
  },
  description:
    "Enterprise creative agency delivering D+1 creative production with unlimited revisions and fixed pricing. 45+ experts across 5 continents, 18 languages, trusted by TikTok, Sony, Adidas, GEODIS, L'Oreal, and Pernod Ricard.",
  foundingDate: "2020",
  numberOfEmployees: {
    "@type": "QuantitativeValue",
    value: 45,
  },
  areaServed: {
    "@type": "Place",
    name: "International",
  },
  knowsLanguage: [
    "en", "fr", "de", "es", "pt", "it", "nl", "ar", "zh", "ja",
    "ko", "ru", "pl", "sv", "da", "fi", "tr", "id",
  ],
  slogan: "Unlimited Creativity",
  sameAs: [
    "https://www.instagram.com/sarani.studio",
    "https://www.linkedin.com/company/sarani-studio/",
  ],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer service",
    availableLanguage: ["English", "French"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={outfit.variable}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
      </head>
      <body className="min-h-screen bg-brand-white text-brand-black font-body antialiased">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <PublicSiteChrome>
          <main id="main-content">{children}</main>
        </PublicSiteChrome>
      </body>
    </html>
  );
}
