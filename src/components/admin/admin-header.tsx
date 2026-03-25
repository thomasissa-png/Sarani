"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSidebar } from "@/components/admin/sidebar";

function getPageTitle(pathname: string): string {
  // Remove trailing slash
  const path = pathname.replace(/\/$/, "") || "/admin";

  const titles: Record<string, string> = {
    "/admin": "Dashboard",
    "/admin/quick-brief": "Quick Brief",
    "/admin/projects": "Projects",
    "/admin/clients": "Clients",
    "/admin/clients/new": "New Client",
    "/admin/agents/translator": "Translator",
    "/admin/agents/translator/history": "Translation History",
    "/admin/agents/pm": "Project Manager",
    "/admin/agents/copywriter": "Copywriter",
    "/admin/agents/seo": "SEO",
    "/admin/agents/social": "Social",
    "/admin/agents/creative": "Creative",
    "/admin/agents/video-script": "Video Script",
    "/admin/agents/proposal": "Proposal",
    "/admin/agents/presentation": "Presentation",
    "/admin/agents/designer": "Designer",
    "/admin/agents/legal": "Legal",
    "/admin/agents/email-drafter": "Email Drafter",
    "/admin/agents/proofreader": "Proofreader",
  };

  // Exact match
  if (titles[path]) return titles[path];

  // Dynamic routes: /admin/clients/[id]
  if (/^\/admin\/clients\/[^/]+$/.test(path)) return "Client Details";

  // Fallback: extract last segment
  const segments = path.split("/").filter(Boolean);
  const last = segments[segments.length - 1] ?? "Admin";
  return last.charAt(0).toUpperCase() + last.slice(1).replace(/-/g, " ");
}

export function AdminHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { setMobileOpen } = useSidebar();
  const [loggingOut, setLoggingOut] = useState(false);

  const pageTitle = getPageTitle(pathname);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/admin/auth", { method: "DELETE" });
      router.push("/admin/login");
    } catch {
      setLoggingOut(false);
    }
  }

  return (
    <header className="h-14 border-b border-neutral-300 bg-white flex items-center justify-between px-4 md:px-6 shrink-0">
      <div className="flex items-center gap-3">
        {/* Mobile hamburger — prominent cerulean circle */}
        <button
          onClick={() => setMobileOpen(true)}
          className="md:hidden flex h-9 w-9 items-center justify-center rounded-full bg-brand-cerulean text-white shrink-0"
          aria-label="Open navigation"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="18" x2="20" y2="18" />
          </svg>
        </button>
        {/* Mobile logo — visible only on small screens */}
        <Link href="/admin" className="md:hidden shrink-0">
          <Image
            src="/sarani-logo-black.png"
            alt="Sarani"
            width={80}
            height={31}
            className="h-auto"
          />
        </Link>
        {/* Page title — desktop always, mobile only if not dashboard */}
        <h1 className="text-sm font-semibold text-brand-black hidden md:block">{pageTitle}</h1>
        <h1 className="text-sm font-semibold text-brand-black md:hidden">{pageTitle !== "Dashboard" ? pageTitle : ""}</h1>
      </div>
      <button
        onClick={handleLogout}
        disabled={loggingOut}
        className="text-sm text-neutral-500 hover:text-brand-black transition-colors disabled:opacity-50"
      >
        {loggingOut ? "Signing out..." : "Sign out"}
      </button>
    </header>
  );
}
