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

interface SearchResultItem {
  type: "client" | "project" | "inbox";
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
}

interface SearchApiResponse {
  results: {
    client: SearchResultItem[];
    project: SearchResultItem[];
    inbox: SearchResultItem[];
  };
  query: string;
}

const CATEGORY_LABELS: Record<SearchResultItem["type"], string> = {
  client: "Clients",
  project: "Projects",
  inbox: "Inbox",
};

const CATEGORY_ORDER: SearchResultItem["type"][] = ["client", "project", "inbox"];

const DEBOUNCE_MS = 300;

// ─── Global Search Component (server-side via /api/admin/search) ───────────

function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [grouped, setGrouped] = useState<Record<string, SearchResultItem[]>>({});
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Flatten grouped results for keyboard navigation
  const flatResults = useMemo(() => {
    const flat: SearchResultItem[] = [];
    for (const cat of CATEGORY_ORDER) {
      const items = grouped[cat];
      if (items?.length) flat.push(...items);
    }
    return flat;
  }, [grouped]);

  // Fetch from server-side search API with debounce
  const search = useCallback((q: string) => {
    // Clear previous debounce timer
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // Abort in-flight request
    if (abortRef.current) abortRef.current.abort();

    if (!q.trim()) {
      setGrouped({});
      setTotalCount(0);
      setLoading(false);
      setError(false);
      return;
    }

    setLoading(true);
    setError(false);

    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(
          `/api/admin/search?q=${encodeURIComponent(q.trim())}`,
          { signal: controller.signal },
        );

        if (!res.ok) {
          setError(true);
          setGrouped({});
          setTotalCount(0);
          return;
        }

        const data: SearchApiResponse = await res.json();
        const groups: Record<string, SearchResultItem[]> = {};
        let count = 0;

        for (const cat of CATEGORY_ORDER) {
          const items = data.results[cat];
          if (items?.length) {
            groups[cat] = items;
            count += items.length;
          }
        }

        setGrouped(groups);
        setTotalCount(count);
        setActiveIndex(-1);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(true);
        setGrouped({});
        setTotalCount(0);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
  }, []);

  // Trigger search on query change
  useEffect(() => {
    search(query);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search]);

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

  // Keyboard shortcut: Cmd/Ctrl+K to focus search, Escape to close
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
    [router],
  );

  // Keyboard navigation within dropdown (arrow keys + enter)
  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!open || flatResults.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => (prev < flatResults.length - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : flatResults.length - 1));
      } else if (e.key === "Enter" && activeIndex >= 0 && activeIndex < flatResults.length) {
        e.preventDefault();
        handleSelect(flatResults[activeIndex].href);
      }
    },
    [open, flatResults, activeIndex, handleSelect],
  );

  const showDropdown = open && query.trim().length > 0;

  // Compute a running flat index offset for each category group
  let flatIndex = 0;

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
          onFocus={() => setOpen(true)}
          onKeyDown={handleInputKeyDown}
          placeholder="Search projects, clients..."
          aria-label="Global search"
          role="combobox"
          aria-expanded={showDropdown}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-controls="global-search-listbox"
          className="w-56 lg:w-72 h-8 pl-8 pr-8 rounded-lg border border-neutral-300 bg-neutral-200/60 text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-brand-cerulean focus:bg-white transition-all"
        />
        {/* Keyboard shortcut hint */}
        <kbd className="absolute right-2 top-1/2 -translate-y-1/2 hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs font-medium text-neutral-400 bg-neutral-100 border border-neutral-200 rounded">
          <span className="text-[9px]">&#8984;</span>K
        </kbd>
      </div>

      {/* Dropdown results */}
      {showDropdown && (
        <div
          className="absolute top-full left-0 mt-1 w-80 bg-white border border-neutral-200 rounded-lg shadow-lg overflow-hidden z-50"
          role="listbox"
          id="global-search-listbox"
        >
          {loading ? (
            <div className="px-4 py-6 text-center">
              <div className="motion-safe:animate-spin w-5 h-5 mx-auto border-2 border-brand-cerulean border-t-transparent rounded-full" />
              <p className="text-xs text-neutral-400 mt-2">Searching...</p>
            </div>
          ) : error ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-neutral-500">Search failed</p>
              <p className="text-xs text-neutral-400 mt-1">Please try again</p>
            </div>
          ) : totalCount === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-neutral-500">No results for &ldquo;{query}&rdquo;</p>
              <p className="text-xs text-neutral-400 mt-1">Try a different search term</p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto py-1">
              {CATEGORY_ORDER.map((cat) => {
                const items = grouped[cat];
                if (!items?.length) return null;

                const groupStartIndex = flatIndex;

                return (
                  <div key={cat}>
                    <p className="px-3 pt-2 pb-1 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                      {CATEGORY_LABELS[cat]}
                    </p>
                    {items.map((item, idx) => {
                      const itemFlatIndex = groupStartIndex + idx;
                      // Update running counter after last item in group
                      if (idx === items.length - 1) {
                        flatIndex = groupStartIndex + items.length;
                      }
                      const isActive = itemFlatIndex === activeIndex;

                      return (
                        <button
                          key={`${cat}-${item.id}`}
                          role="option"
                          aria-selected={isActive}
                          onClick={() => handleSelect(item.href)}
                          onMouseEnter={() => setActiveIndex(itemFlatIndex)}
                          className={cn(
                            "w-full text-left px-3 py-2 transition-colors flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cerulean focus-visible:ring-inset",
                            isActive ? "bg-neutral-100" : "hover:bg-neutral-100",
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-brand-black truncate">
                              {item.title}
                            </p>
                            {item.subtitle && (
                              <p className="text-xs text-neutral-500 truncate">
                                {item.subtitle}
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
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Mobile Search Button ──────────────────────────────────────────────────
// On mobile, show a loupe icon that opens a full-width search overlay.

function MobileSearchButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [grouped, setGrouped] = useState<Record<string, SearchResultItem[]>>({});
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Focus input when overlay opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setError(false);
    if (abortRef.current) abortRef.current.abort();

    if (!q.trim()) {
      setGrouped({});
      setTotalCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);

    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(
          `/api/admin/search?q=${encodeURIComponent(q.trim())}`,
          { signal: controller.signal },
        );
        if (!res.ok) {
          setError(true);
          return;
        }

        const data: SearchApiResponse = await res.json();
        const groups: Record<string, SearchResultItem[]> = {};
        let count = 0;

        for (const cat of CATEGORY_ORDER) {
          const items = data.results[cat];
          if (items?.length) {
            groups[cat] = items;
            count += items.length;
          }
        }

        setGrouped(groups);
        setTotalCount(count);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(true);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    search(query);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search]);

  const handleSelect = useCallback(
    (href: string) => {
      setOpen(false);
      setQuery("");
      setGrouped({});
      setTotalCount(0);
      router.push(href);
    },
    [router],
  );

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="md:hidden flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:text-brand-black transition-colors"
        aria-label="Open search"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </button>
    );
  }

  return (
    <div className="md:hidden fixed inset-0 z-50 bg-white flex flex-col">
      {/* Search header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-200">
        <svg className="w-4 h-4 text-neutral-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search projects, clients..."
          aria-label="Global search"
          className="flex-1 h-8 text-sm text-brand-black placeholder:text-neutral-400 bg-transparent focus:outline-none"
        />
        <button
          onClick={() => {
            setOpen(false);
            setQuery("");
          }}
          className="text-sm text-neutral-500 hover:text-brand-black"
        >
          Cancel
        </button>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="px-4 py-8 text-center">
            <div className="motion-safe:animate-spin w-5 h-5 mx-auto border-2 border-brand-cerulean border-t-transparent rounded-full" />
            <p className="text-xs text-neutral-400 mt-2">Searching...</p>
          </div>
        ) : error ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-error">Search failed</p>
            <p className="text-xs text-neutral-500 mt-1">Try again in a moment</p>
          </div>
        ) : query.trim() && totalCount === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-neutral-500">No results for &ldquo;{query}&rdquo;</p>
          </div>
        ) : (
          CATEGORY_ORDER.map((cat) => {
            const items = grouped[cat];
            if (!items?.length) return null;
            return (
              <div key={cat}>
                <p className="px-4 pt-3 pb-1 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  {CATEGORY_LABELS[cat]}
                </p>
                {items.map((item) => (
                  <button
                    key={`${cat}-${item.id}`}
                    onClick={() => handleSelect(item.href)}
                    className="w-full text-left px-4 py-3 hover:bg-neutral-50 transition-colors flex items-center gap-2 border-b border-neutral-100"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-brand-black truncate">{item.title}</p>
                      {item.subtitle && (
                        <p className="text-xs text-neutral-500 truncate">{item.subtitle}</p>
                      )}
                    </div>
                    <svg className="w-3.5 h-3.5 text-neutral-300 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                ))}
              </div>
            );
          })
        )}
      </div>
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
        <MobileSearchButton />
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
