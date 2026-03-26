"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { track, getDevice } from "@/lib/analytics";

const NAV_LINKS = [
  { href: "/work", label: "Work" },
  { href: "/services", label: "Services" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
] as const;

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const mobileMenuRef = useRef<HTMLDivElement>(null);

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

  // Focus trap: cycle Tab/Shift+Tab within mobile menu, Escape to close
  const handleMenuKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!mobileOpen || !mobileMenuRef.current) return;

      if (e.key === "Escape") {
        setMobileOpen(false);
        return;
      }

      if (e.key !== "Tab") return;

      const focusableEls = mobileMenuRef.current.querySelectorAll<HTMLElement>(
        'a[href], button, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableEls.length === 0) return;

      const first = focusableEls[0];
      const last = focusableEls[focusableEls.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [mobileOpen]
  );

  // Attach/detach focus trap listener and auto-focus first link on open
  useEffect(() => {
    if (mobileOpen) {
      document.addEventListener("keydown", handleMenuKeyDown);
      // Focus the first nav link after the animation starts
      const timer = setTimeout(() => {
        const firstLink = mobileMenuRef.current?.querySelector<HTMLElement>("a[href]");
        firstLink?.focus();
      }, 100);
      return () => {
        document.removeEventListener("keydown", handleMenuKeyDown);
        clearTimeout(timer);
      };
    } else {
      document.removeEventListener("keydown", handleMenuKeyDown);
    }
  }, [mobileOpen, handleMenuKeyDown]);

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
        "fixed top-0 left-0 right-0 z-[var(--z-header)] transition-all duration-250 ease-in-out",
        mobileOpen
          ? "bg-brand-white border-b border-transparent"
          : scrolled
            ? "bg-brand-white/90 backdrop-blur-[12px] border-b border-neutral-300"
            : "bg-transparent border-b border-transparent"
      )}
    >
      <nav
        className="mx-auto flex h-[var(--header-height)] max-w-screen-xl items-center justify-between px-5 md:px-8"
        aria-label="Main navigation"
      >
        {/* Logo — dark variant on white bg */}
        <Logo variant="dark" width={120} />

        {/* Desktop nav links — show Work, Pricing, About (not Contact — that is the CTA) */}
        <ul className="hidden items-center gap-8 md:flex" role="list">
          {NAV_LINKS.filter((l) => l.href !== "/contact").map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                onClick={() => handleNavClick(link.label)}
                className={cn(
                  "text-sm font-medium uppercase tracking-wider text-brand-black transition-all duration-150",
                  "hover:text-brand-flame",
                  pathname === link.href && "text-brand-flame"
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

          {/* Hamburger button — mobile only: blue circle like V2 */}
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-cerulean md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            <span className="sr-only">{mobileOpen ? "Close menu" : "Open menu"}</span>
            {mobileOpen ? (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="18" x2="20" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile overlay menu — full-screen with backdrop */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            ref={mobileMenuRef}
            id="mobile-menu"
            className="fixed inset-0 z-[var(--z-overlay)] flex flex-col bg-brand-white md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            aria-hidden={!mobileOpen}
          >
            {/* Top bar — logo + close */}
            <div className="flex h-[var(--header-height)] items-center justify-between px-5">
              <Logo variant="dark" width={100} />
              <button
                type="button"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-cerulean text-brand-white"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Nav links — left-aligned with active state */}
            <nav className="flex-1 flex flex-col justify-center px-8">
              <ul className="flex flex-col gap-6" role="list">
                {NAV_LINKS.filter((l) => l.href !== "/contact").map((link, i) => (
                  <motion.li
                    key={link.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 + i * 0.06, duration: 0.35 }}
                  >
                    <Link
                      href={link.href}
                      onClick={() => handleNavClick(link.label)}
                      className={cn(
                        "text-3xl font-bold transition-colors duration-150",
                        pathname === link.href
                          ? "text-brand-flame"
                          : "text-brand-black hover:text-brand-flame"
                      )}
                    >
                      {link.label}
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </nav>

            {/* Bottom CTA — pinned */}
            <motion.div
              className="px-8 pb-10 pt-4"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.35 }}
            >
              <Button
                variant="primary"
                href="/contact"
                className="w-full text-center"
                onClick={() => handleNavClick("start_a_project")}
              >
                Start a project
              </Button>
              <p className="mt-3 text-center text-sm text-neutral-500">
                First project satisfaction or no invoice.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
