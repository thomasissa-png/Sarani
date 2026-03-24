"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { track, getDevice } from "@/lib/analytics";

const NAV_LINKS = [
  { href: "/work", label: "Work" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
] as const;

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 60);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  function handleNavClick(label: string) {
    track("nav_click", {
      label: label.toLowerCase(),
      page: pathname,
      device: getDevice(),
    });
    setMobileOpen(false);
  }

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-[200] transition-all duration-250 ease-in-out",
        scrolled
          ? "bg-brand-black/90 backdrop-blur-[12px] border-b border-neutral-800"
          : "bg-transparent border-b border-transparent"
      )}
    >
      <nav
        className="mx-auto flex h-[72px] max-w-screen-xl items-center justify-between px-5 md:px-8"
        aria-label="Main navigation"
      >
        {/* Logo */}
        <Logo variant="white" width={120} />

        {/* Desktop nav links */}
        <ul className="hidden items-center gap-8 md:flex" role="list">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                onClick={() => handleNavClick(link.label)}
                className={cn(
                  "text-sm font-normal uppercase tracking-wider text-brand-white transition-all duration-150",
                  "hover:text-brand-flame hover:underline hover:decoration-brand-flame hover:decoration-2 hover:underline-offset-4",
                  pathname === link.href &&
                    "underline decoration-brand-flame decoration-2 underline-offset-4"
                )}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Desktop CTA + Mobile hamburger */}
        <div className="flex items-center gap-4">
          <Button
            variant="primary"
            href="/contact"
            className="hidden text-sm px-6 py-3 min-w-0 md:inline-flex"
            onClick={() => handleNavClick("start_a_project")}
          >
            Start a project
          </Button>

          {/* Hamburger button — mobile only */}
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            <span className="sr-only">{mobileOpen ? "Close menu" : "Open menu"}</span>
            {mobileOpen ? (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile overlay menu */}
      <div
        id="mobile-menu"
        className={cn(
          "fixed inset-0 top-0 z-[300] flex flex-col items-center justify-center bg-brand-black transition-opacity duration-250 md:hidden",
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        aria-hidden={!mobileOpen}
      >
        {/* Close button */}
        <button
          type="button"
          className="absolute top-5 right-5 flex h-10 w-10 items-center justify-center text-brand-white"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <ul className="flex flex-col items-center gap-8" role="list">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                onClick={() => handleNavClick(link.label)}
                className="text-2xl font-bold text-brand-white transition-colors duration-150 hover:text-brand-flame"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-10">
          <Button
            variant="primary"
            href="/contact"
            onClick={() => handleNavClick("start_a_project")}
          >
            Start a project
          </Button>
        </div>
      </div>
    </header>
  );
}
