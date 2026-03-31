"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";

// ─── Mobile sidebar context ─────────────────────────────────────────────────
// Allows the header (hamburger button) and sidebar to share open/close state.

type SidebarContextValue = {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
};

const SidebarContext = createContext<SidebarContextValue>({
  mobileOpen: false,
  setMobileOpen: () => {},
});

export function useSidebar() {
  return useContext(SidebarContext);
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <SidebarContext.Provider value={{ mobileOpen, setMobileOpen }}>
      {children}
    </SidebarContext.Provider>
  );
}

type NavItem = {
  label: string;
  href: string;
  icon: string;
};

const CORE_NAV: NavItem[] = [
  { label: "Inbox", href: "/admin", icon: "mail" },
  { label: "Projects", href: "/admin/tracker", icon: "activity" },
  { label: "Clients", href: "/admin/clients", icon: "users" },
  { label: "Arya", href: "/admin/arya", icon: "zap" },
];

const SETTINGS_NAV: NavItem[] = [
  { label: "Settings", href: "/admin/users", icon: "user-check" },
];

// Agent sub-items shown inside collapsible Arya section
const ARYA_AGENTS: NavItem[] = [
  { label: "Agent Teams", href: "/admin/teams", icon: "team" },
  { label: "Storyboards", href: "/admin/storyboards", icon: "film" },
  { label: "Translator", href: "/admin/agents/translator", icon: "globe" },
  { label: "Art Direction", href: "/admin/agents/creative", icon: "palette" },
  { label: "Copywriter", href: "/admin/agents/copywriter", icon: "type" },
  { label: "Designer", href: "/admin/agents/designer", icon: "pen-tool" },
  { label: "Legal", href: "/admin/agents/legal", icon: "shield" },
  { label: "Video Script", href: "/admin/agents/video-script", icon: "video" },
  { label: "Proposals & Decks", href: "/admin/agents/proposal", icon: "file-text" },
  { label: "SEO", href: "/admin/agents/seo", icon: "search" },
  { label: "Social", href: "/admin/agents/social", icon: "share" },
  { label: "Case Studies", href: "/admin/agents/case-studies", icon: "briefcase" },
  { label: "Proofreader", href: "/admin/agents/proofreader", icon: "check-circle" },
];

function NavIcon({ name, className }: { name: string; className?: string }) {
  const icons: Record<string, React.ReactNode> = {
    grid: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
    users: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    briefcase: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </svg>
    ),
    globe: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
    palette: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="13.5" cy="6.5" r="0.5" fill="currentColor" /><circle cx="17.5" cy="10.5" r="0.5" fill="currentColor" /><circle cx="8.5" cy="7.5" r="0.5" fill="currentColor" /><circle cx="6.5" cy="12.5" r="0.5" fill="currentColor" /><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
      </svg>
    ),
    "pen-tool": (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="M2 2l7.586 7.586" /><circle cx="11" cy="11" r="2" />
      </svg>
    ),
    shield: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    "user-check": (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><polyline points="17 11 19 13 23 9" />
      </svg>
    ),
    share: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </svg>
    ),
    search: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
    type: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 7 4 4 20 4 20 7" /><line x1="9" y1="20" x2="15" y2="20" /><line x1="12" y1="4" x2="12" y2="20" />
      </svg>
    ),
    "file-text": (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    monitor: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
    mail: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
      </svg>
    ),
    video: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" />
      </svg>
    ),
    film: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" /><line x1="7" y1="2" x2="7" y2="22" /><line x1="17" y1="2" x2="17" y2="22" /><line x1="2" y1="12" x2="22" y2="12" /><line x1="2" y1="7" x2="7" y2="7" /><line x1="2" y1="17" x2="7" y2="17" /><line x1="17" y1="7" x2="22" y2="7" /><line x1="17" y1="17" x2="22" y2="17" />
      </svg>
    ),
    folder: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    ),
    zap: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
    "check-circle": (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
    receipt: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z" /><line x1="8" y1="7" x2="16" y2="7" /><line x1="8" y1="11" x2="16" y2="11" /><line x1="8" y1="15" x2="12" y2="15" />
      </svg>
    ),
    activity: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    team: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" /><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="19" cy="7" r="2.5" /><path d="M22 17.5a3 3 0 0 0-3-3h-.5" /><circle cx="5" cy="7" r="2.5" /><path d="M2 17.5a3 3 0 0 1 3-3h.5" />
      </svg>
    ),
  };

  const icon = icons[name];
  if (!icon) return null;

  // Wrap with aria-hidden since these are decorative icons (text label is present)
  return <span aria-hidden="true">{icon}</span>;
}

// ─── Badge context ──────────────────────────────────────────────────────────
// Shared badge counts fetched from /api/admin/badges every 60s.

type BadgeCounts = {
  errors: number;
  generating: number;
};

const BadgeContext = createContext<BadgeCounts>({ errors: 0, generating: 0 });

function BadgeProvider({ children }: { children: React.ReactNode }) {
  const [counts, setCounts] = useState<BadgeCounts>({ errors: 0, generating: 0 });

  useEffect(() => {
    let mounted = true;

    async function fetchBadges() {
      try {
        const res = await fetch("/api/admin/badges");
        if (res.ok && mounted) {
          const data = await res.json();
          setCounts({ errors: data.errors ?? 0, generating: data.generating ?? 0 });
        }
      } catch {
        // Silently ignore — badges are non-critical
      }
    }

    fetchBadges();
    const interval = setInterval(fetchBadges, 60_000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <BadgeContext.Provider value={counts}>{children}</BadgeContext.Provider>
  );
}

function NavLink({ item, onNavigate, badgeCount }: { item: NavItem; onNavigate?: () => void; badgeCount?: number }) {
  const pathname = usePathname();
  const isActive =
    item.href === "/admin"
      ? pathname === "/admin"
      : pathname.startsWith(item.href);

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
        isActive
          ? "bg-brand-black text-white"
          : "text-neutral-600 hover:bg-neutral-200 hover:text-brand-black"
      )}
    >
      <NavIcon name={item.icon} className="w-4 h-4 shrink-0" />
      {item.label}
      {badgeCount !== undefined && badgeCount > 0 && (
        <span className="ml-auto flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-bold text-white bg-brand-flame rounded-full">
          {badgeCount}
        </span>
      )}
    </Link>
  );
}

function AryaCollapsible({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const isAryaActive = pathname.startsWith("/admin/arya") || pathname.startsWith("/admin/agents") || pathname.startsWith("/admin/teams") || pathname.startsWith("/admin/storyboards");
  const [open, setOpen] = useState(isAryaActive);

  return (
    <div>
      {/* Arya parent link + toggle */}
      <div className="flex items-center">
        <Link
          href="/admin/arya"
          onClick={onNavigate}
          className={cn(
            "flex-1 flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            pathname === "/admin/arya"
              ? "bg-brand-black text-white"
              : "text-neutral-600 hover:bg-neutral-200 hover:text-brand-black"
          )}
        >
          <NavIcon name="zap" className="w-4 h-4 shrink-0" />
          Arya
        </Link>
        <button
          onClick={() => setOpen((prev) => !prev)}
          className="p-1.5 rounded-lg text-neutral-400 hover:text-brand-black hover:bg-neutral-200 transition-colors"
          aria-label={open ? "Collapse Arya agents" : "Expand Arya agents"}
        >
          <svg
            className={cn("w-4 h-4 transition-transform", open && "rotate-90")}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Collapsible agent list */}
      {open && (
        <div className="ml-4 mt-1 space-y-0.5 border-l border-neutral-200 pl-2">
          {ARYA_AGENTS.map((agent) => (
            <NavLink key={agent.href} item={agent} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  );
}

function SidebarContentInner({ onNavigate }: { onNavigate?: () => void }) {
  const badges = useContext(BadgeContext);

  return (
    <>
      <div className="p-4 border-b border-neutral-300" onClick={onNavigate}>
        <div className="inline-flex items-center gap-2">
          <Logo variant="dark" width={100} href="/admin" />
          <span className="text-xs font-medium text-neutral-500 bg-neutral-200 px-2 py-0.5 rounded-full">
            Admin
          </span>
        </div>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto flex flex-col">
        {/* Core navigation */}
        <div className="space-y-1">
          {CORE_NAV.filter((item) => item.label !== "Arya").map((item) => (
            <NavLink
              key={item.href}
              item={item}
              onNavigate={onNavigate}
              badgeCount={item.href === "/admin" ? badges.errors : undefined}
            />
          ))}
          <AryaCollapsible onNavigate={onNavigate} />
        </div>

        {/* Settings — pushed to bottom */}
        <div className="mt-auto pt-4 border-t border-neutral-200">
          <div className="space-y-1">
            {SETTINGS_NAV.map((item) => (
              <NavLink key={item.href} item={item} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      </nav>
    </>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <BadgeProvider>
      <SidebarContentInner onNavigate={onNavigate} />
    </BadgeProvider>
  );
}

export function Sidebar() {
  const { mobileOpen, setMobileOpen } = useSidebar();
  const pathname = usePathname();

  // Close mobile drawer on route change
  const closeMobile = useCallback(() => setMobileOpen(false), [setMobileOpen]);

  useEffect(() => {
    closeMobile();
  }, [pathname, closeMobile]);

  // Close on Escape key
  useEffect(() => {
    if (!mobileOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeMobile();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen, closeMobile]);

  return (
    <>
      {/* Desktop sidebar — hidden on mobile */}
      <aside className="hidden md:flex w-60 shrink-0 border-r border-neutral-300 bg-white h-screen sticky top-0 flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={closeMobile}
            aria-hidden="true"
          />
          {/* Drawer */}
          <aside className="absolute inset-y-0 left-0 w-72 bg-white flex flex-col shadow-xl animate-in slide-in-from-left duration-200">
            {/* Close button */}
            <div className="absolute top-4 right-4">
              <button
                onClick={closeMobile}
                className="p-1 rounded-lg text-neutral-400 hover:text-brand-black hover:bg-neutral-100 transition-colors"
                aria-label="Close navigation"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <SidebarContent onNavigate={closeMobile} />
          </aside>
        </div>
      )}
    </>
  );
}
