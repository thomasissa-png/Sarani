"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSidebar } from "@/components/admin/sidebar";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";

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
    "/admin/tracker": "Project Tracker",
    "/admin/tracker/new": "New Project",
    "/admin/asset-review": "Asset Review",
    "/admin/quotes": "Quote Generator",
  };

  // Exact match
  if (titles[path]) return titles[path];

  // Dynamic routes: /admin/clients/[id]
  if (/^\/admin\/clients\/[^/]+$/.test(path)) return "Client Details";

  // Dynamic routes: /admin/projects/[compositeId]
  // The composite ID is "client::project" — decode and show as "Client — Project"
  if (/^\/admin\/projects\/[^/]+$/.test(path)) {
    const segments = path.split("/").filter(Boolean);
    const rawId = segments[segments.length - 1] ?? "";
    try {
      const decoded = decodeURIComponent(rawId);
      const parts = decoded.split("::");
      if (parts.length >= 2) {
        return `${parts[0]} — ${parts.slice(1).join("::")}`;
      }
      return decoded;
    } catch {
      return "Project Details";
    }
  }

  // Fallback: extract last segment and decode
  const segments = path.split("/").filter(Boolean);
  const last = segments[segments.length - 1] ?? "Admin";
  try {
    const decoded = decodeURIComponent(last);
    return decoded.charAt(0).toUpperCase() + decoded.slice(1).replace(/-/g, " ");
  } catch {
    return last.charAt(0).toUpperCase() + last.slice(1).replace(/-/g, " ");
  }
}

// ─── Global Search Types ────────────────────────────────────────────────────

interface SearchItem {
  type: "project" | "client" | "inbox";
  label: string;
  sublabel?: string;
  href: string;
}

const TYPE_LABELS: Record<SearchItem["type"], string> = {
  project: "Projects",
  client: "Clients",
  inbox: "Inbox",
};

// ─── Global Search Component ────────────────────────────────────────────────

function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch searchable data on first focus
  const fetchData = useCallback(async () => {
    if (fetched) return;
    setLoading(true);
    try {
      const [trackerRes, clientsRes] = await Promise.all([
        fetch("/api/admin/tracker").catch(() => null),
        fetch("/api/admin/clients").catch(() => null),
      ]);

      const searchItems: SearchItem[] = [];

      // Projects from tracker
      if (trackerRes?.ok) {
        const data = await trackerRes.json();
        const projects = data.projects ?? [];
        for (const p of projects) {
          const compositeId = encodeURIComponent(`${p.client}::${p.project}`);
          searchItems.push({
            type: "project",
            label: p.project,
            sublabel: p.client,
            href: `/admin/projects/${compositeId}`,
          });
        }
      }

      // Clients
      if (clientsRes?.ok) {
        const data = await clientsRes.json();
        const clients = data.clients ?? data ?? [];
        for (const c of clients) {
          const name = c.name ?? c.company ?? c.client ?? "";
          if (!name) continue;
          const id = c.id ?? c.slug ?? encodeURIComponent(name);
          searchItems.push({
            type: "client",
            label: name,
            sublabel: c.contact ?? c.email ?? undefined,
            href: `/admin/clients/${id}`,
          });
        }
      }

      setItems(searchItems);
      setFetched(true);
    } catch {
      // Silently fail — search is a convenience feature
    } finally {
      setLoading(false);
    }
  }, [fetched]);

  // Filter results based on query
  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return items
      .filter(
        (item) =>
          item.label.toLowerCase().includes(q) ||
          (item.sublabel?.toLowerCase().includes(q) ?? false)
      )
      .slice(0, 12);
  }, [query, items]);

  // Group results by type
  const grouped = useMemo(() => {
    const groups: Partial<Record<SearchItem["type"], SearchItem[]>> = {};
    for (const item of results) {
      if (!groups[item.type]) groups[item.type] = [];
      groups[item.type]!.push(item);
    }
    return groups;
  }, [results]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard shortcut: Cmd/Ctrl+K to focus search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSelect = useCallback(
    (href: string) => {
      setOpen(false);
      setQuery("");
      router.push(href);
    },
    [router]
  );

  const showDropdown = open && query.trim().length > 0;

  return (
    <div ref={containerRef} className="relative hidden md:block">
      <div className="relative">
        <svg
          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            setOpen(true);
            fetchData();
          }}
          placeholder="Search projects, clients..."
          aria-label="Global search"
          className="w-56 lg:w-72 h-8 pl-8 pr-8 rounded-lg border border-neutral-300 bg-neutral-200/60 text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-brand-cerulean focus:bg-white transition-all"
        />
        {/* Keyboard shortcut hint */}
        <kbd className="absolute right-2 top-1/2 -translate-y-1/2 hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-neutral-400 bg-neutral-100 border border-neutral-200 rounded">
          <span className="text-[9px]">&#8984;</span>K
        </kbd>
      </div>

      {/* Dropdown results */}
      {showDropdown && (
        <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-neutral-300 rounded-xl shadow-lg overflow-hidden z-50">
          {loading ? (
            <div className="px-4 py-6 text-center">
              <div className="animate-spin w-5 h-5 mx-auto border-2 border-brand-cerulean border-t-transparent rounded-full" />
              <p className="text-xs text-neutral-400 mt-2">Loading...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-neutral-500">No results for &ldquo;{query}&rdquo;</p>
              <p className="text-xs text-neutral-400 mt-1">Try a different search term</p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto py-1">
              {(Object.entries(grouped) as [SearchItem["type"], SearchItem[]][]).map(
                ([type, groupItems]) => (
                  <div key={type}>
                    <p className="px-3 pt-2 pb-1 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                      {TYPE_LABELS[type]}
                    </p>
                    {groupItems.map((item, idx) => (
                      <button
                        key={`${type}-${idx}`}
                        onClick={() => handleSelect(item.href)}
                        className="w-full text-left px-3 py-2 hover:bg-neutral-200/60 transition-colors flex items-center gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-brand-black truncate">
                            {item.label}
                          </p>
                          {item.sublabel && (
                            <p className="text-xs text-neutral-400 truncate">
                              {item.sublabel}
                            </p>
                          )}
                        </div>
                        <svg
                          className="w-3.5 h-3.5 text-neutral-300 shrink-0"
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
                    ))}
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Admin Header ───────────────────────────────────────────────────────────

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
        <div className="md:hidden shrink-0">
          <Logo variant="dark" width={80} href="/admin" />
        </div>
        {/* Page title — desktop always, mobile only if not dashboard */}
        <h1 className="text-sm font-semibold text-brand-black hidden md:block">{pageTitle}</h1>
        <h1 className="text-sm font-semibold text-brand-black md:hidden">{pageTitle !== "Dashboard" ? pageTitle : ""}</h1>
      </div>

      <div className="flex items-center gap-3">
        <GlobalSearch />
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="text-sm text-neutral-500 hover:text-brand-black transition-colors disabled:opacity-50"
        >
          {loggingOut ? "Signing out..." : "Sign out"}
        </button>
      </div>
    </header>
  );
}
