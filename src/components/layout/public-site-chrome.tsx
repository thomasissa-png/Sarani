"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { StickyCTAMobile } from "@/components/layout/sticky-cta-mobile";

/**
 * Wraps the public site chrome (Header, Footer, StickyCTA).
 * Hidden on /admin pages which have their own layout.
 */
export function PublicSiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");
  const isProjectPreview = pathname.startsWith("/project/");

  // Admin pages and project presentation pages have their own layout
  if (isAdmin || isProjectPreview) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      {children}
      <Footer />
      <StickyCTAMobile />
    </>
  );
}
