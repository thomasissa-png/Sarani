"use client";

/**
 * ShareFolderModal — Browse SharePoint folders and generate an anonymous sharing link.
 * Used from the tracker to share project deliverables with clients.
 *
 * Flow:
 * 1. Opens with client name → lists project folders
 * 2. PM clicks a folder → drills down to show subfolders
 * 3. PM clicks "Share this folder" → generates an "Anyone" link
 * 4. Link is copied to clipboard + opened in new tab
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { getSubdivisionByListId, getSubdivisionByName, ASSETS_CUSTOMERS_BASE_PATH } from "@/lib/integrations/config";

// ─── Types ──────────────────────────────────────────────────────────────────

interface FolderItem {
  name: string;
  id: string;
  childCount: number;
  lastModified: string;
  webUrl: string;
}

interface FileItem {
  name: string;
  id: string;
  size: number;
  mimeType: string;
  lastModified: string;
  webUrl: string;
  thumbnailUrl?: string | null;
}

interface FoldersResponse {
  path: string;
  folders: FolderItem[];
  files: FileItem[];
  totalFolders: number;
  totalFiles: number;
  driveId?: string;
}

interface ShareFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientName: string;
  projectName: string;
  clickupTaskUrl?: string;
  sharepointLink?: string;
  /** ClickUp list name — used as FALLBACK to auto-navigate to the right SP subfolder */
  clickupListName?: string;
  /** ClickUp list ID — PRIMARY key to look up SP subfolder directly from config */
  clickupListId?: string;
  /** Called after a share link is successfully created — use to refresh the parent's link list */
  onLinkCreated?: () => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Smart folder matching: tries multiple strategies to match a ClickUp list name
 * to a SharePoint subfolder name.
 * e.g. ClickUp list "TikTok P&E SEA" should match SP folder "P&E SEA" or "TikTok P&E SEA"
 */
function findMatchingFolder(folders: FolderItem[], clickupList: string, clientName: string): FolderItem | null {
  const listLower = clickupList.toLowerCase().trim();
  const clientLower = clientName.toLowerCase().trim();

  // Helper: strip SharePoint numbered prefixes like "15. ", "03. ", "17. " from folder names
  const stripNumberPrefix = (name: string): string =>
    name.replace(/^\d+\.\s*/, "").trim();

  // Normalize for matching: remove all special chars, collapse spaces
  // This makes "P&E SEA" match "P&SEA" or "P & E SEA"
  const normalize = (s: string): string =>
    s.replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

  // Pre-compute normalized folder names (stripped of number prefixes)
  const normalizedFolders = folders.map((f) => ({
    folder: f,
    raw: f.name.toLowerCase().trim(),
    stripped: stripNumberPrefix(f.name.toLowerCase().trim()),
    normalized: normalize(stripNumberPrefix(f.name.toLowerCase().trim())),
  }));

  const listNormalized = normalize(listLower);

  // Strategy 1: exact match — try both raw name, stripped name, and normalized
  const exact = normalizedFolders.find((nf) =>
    nf.raw === listLower || nf.stripped === listLower || nf.normalized === listNormalized
  );
  if (exact) return exact.folder;

  // Strategy 2: mutual includes — try stripped AND normalized folder names
  const byIncludes = normalizedFolders.find((nf) => {
    return nf.stripped.includes(listLower) || listLower.includes(nf.stripped)
      || nf.normalized.includes(listNormalized) || listNormalized.includes(nf.normalized);
  });
  if (byIncludes) return byIncludes.folder;

  // Strategy 3: strip client prefix from ClickUp list name and retry
  // e.g. "TikTok P&E SEA" → "P&E SEA", then match against folder "P&E SEA"
  let stripped = listLower;
  // Remove client name at the start (with optional separator like " — ", " - ", etc.)
  if (stripped.startsWith(clientLower)) {
    stripped = stripped.slice(clientLower.length).replace(/^[\s\-—]+/, "").trim();
  }
  // Also handle abbreviations: strip first word if it doesn't match client
  const words = listLower.split(/\s+/);
  const strippedFirstWord = words.length > 1 ? words.slice(1).join(" ") : "";

  for (const candidate of [stripped, strippedFirstWord]) {
    if (candidate.length < 2) continue;
    const candidateNorm = normalize(candidate);
    const match = normalizedFolders.find((nf) => {
      return nf.stripped.includes(candidate) || candidate.includes(nf.stripped)
        || nf.normalized.includes(candidateNorm) || candidateNorm.includes(nf.normalized);
    });
    if (match) return match.folder;
  }

  // Strategy 4: tokenize and find best word-overlap match
  // Exclude generic client name tokens + "others" to prevent false matches
  const genericTokens = new Set([...clientLower.split(/\s+/), "others", "other", "tiktok"]);
  const listTokens = new Set(
    listNormalized.split(/\s+/).filter((t) => t.length >= 2 && !genericTokens.has(t))
  );
  if (listTokens.size === 0) return null; // No meaningful tokens to match

  let bestMatch: FolderItem | null = null;
  let bestScore = 0;
  for (const nf of normalizedFolders) {
    const folderTokens = new Set(
      nf.normalized.split(/\s+/).filter((t) => t.length >= 2 && !genericTokens.has(t))
    );
    // Skip if the folder has no meaningful tokens (e.g. "Others" → empty after filtering)
    if (folderTokens.size === 0) continue;
    let overlap = 0;
    for (const t of listTokens) {
      if (folderTokens.has(t)) overlap++;
    }
    // Score = max of:
    // - overlap/listTokens (what % of the ClickUp name matches the folder)
    // - overlap/folderTokens (what % of the folder name matches the ClickUp name)
    // The second metric is critical: if a folder is "TTS P&E SEA" (tokens: tts, sea)
    // and ALL its tokens are in the ClickUp name, it's a strong match even if the
    // ClickUp name has 8 other tokens.
    const listCoverage = listTokens.size > 0 ? overlap / listTokens.size : 0;
    const folderCoverage = folderTokens.size > 0 ? overlap / folderTokens.size : 0;
    const score = Math.max(listCoverage, folderCoverage);
    if (overlap >= 1 && score > bestScore) {
      bestScore = score;
      bestMatch = nf.folder;
    }
  }
  // Accept match if at least 50% of either side's tokens overlap
  if (bestMatch && bestScore >= 0.5) return bestMatch;

  return null;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ShareFolderModal({ isOpen, onClose, clientName, projectName, clickupTaskUrl, sharepointLink, clickupListName, clickupListId, onLinkCreated }: ShareFolderModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<FoldersResponse | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<Array<{ name: string; folderId: string; webUrl?: string }>>([]);
  const [sharing, setSharing] = useState<string | null>(null);
  const [sharedLink, setSharedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  // Selected files for the presentation — persists across folder navigation
  // Map of fileId → file metadata so we keep track even when in a different folder
  const [selectedFiles, setSelectedFiles] = useState<Map<string, { id: string; name: string; mimeType: string; folderPath: string }>>(new Map());
  // Toggle between list view and thumbnail grid view
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");

  // AbortController ref — cancels in-flight requests when a new one starts (race condition fix)
  const abortRef = useRef<AbortController | null>(null);

  // Fetch folder contents by ID, URL, or client mapping
  const fetchFolders = useCallback(async (opts: { folderId?: string; url?: string; clientRoot?: boolean }) => {
    // Abort previous in-flight request to prevent stale data overwriting current view
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    setSharedLink(null);
    setCopied(false);

    try {
      const params = new URLSearchParams();
      if (opts.folderId) {
        params.set("folderId", opts.folderId);
      } else if (opts.url) {
        params.set("url", opts.url);
        // Also pass client for folder-name resolution (sp-folder: prefix)
        if (clientName) params.set("client", clientName);
      } else {
        params.set("client", clientName);
      }

      const res = await fetch(`/api/admin/integrations/sharepoint/folders?${params}`, {
        signal: controller.signal,
      });
      if (controller.signal.aborted) return null; // navigated away
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to load folders (${res.status})`);
      }
      const result: FoldersResponse = await res.json();
      if (controller.signal.aborted) return null; // navigated away between res.ok and json parse
      setData(result);
      // Don't reset selection — files from other folders are preserved
      return result;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return null; // navigated away
      setError(err instanceof Error ? err.message : "Failed to load folders");
      return null;
    } finally {
      setLoading(false);
    }
  }, [clientName]);

  // Navigate to the correct SP subfolder using config mapping.
  // PRIMARY: clickupListId/clickupListName → config lookup → direct SP path navigation
  // FALLBACK: browse client root if no mapping found
  const loadClientRoot = useCallback(async () => {
    // ── PRIMARY: config-based lookup → direct SP path ──
    // We know the ClickUp list → we know the division → we know the exact SP path.
    // No scanning, no fuzzy matching. Just build the path and navigate.
    const configMatch = (clickupListId ? getSubdivisionByListId(clickupListId) : undefined)
      ?? (clickupListName ? getSubdivisionByName(clickupListName) : undefined);

    if (configMatch?.subdivision.sharepointSubfolder) {
      const { mapping, subdivision } = configMatch;
      const spSubfolder = subdivision.sharepointSubfolder!;
      // Use the "path" parameter of the folders API: ?client={client}&path={subPath}
      // This resolves to ASSETS_CUSTOMERS_BASE_PATH/{subPath} on the server
      const subPath = `${mapping.sharepointCustomerFolder}/03. Projects/${spSubfolder}`;
      console.log(`[ShareFolderModal] Direct path: listId=${clickupListId ?? "n/a"}, listName=${clickupListName ?? "n/a"} → "${subdivision.name}" → path="${subPath}"`);

      try {
        const params = new URLSearchParams();
        params.set("client", clientName);
        params.set("path", subPath);
        const res = await fetch(`/api/admin/integrations/sharepoint/folders?${params}`);
        if (res.ok) {
          const result: FoldersResponse = await res.json();
          setData(result);
          setBreadcrumb([{ name: spSubfolder, folderId: "", webUrl: "" }]);
          setLoading(false);
          return;
        }
        console.warn(`[ShareFolderModal] Direct path returned ${res.status}. Falling back to client root.`);
      } catch (err) {
        console.warn(`[ShareFolderModal] Direct path fetch failed:`, err);
      }
    }

    // ── FALLBACK: browse client root ──
    const result = await fetchFolders({ clientRoot: true });
    if (!result) return;
    console.log(`[ShareFolderModal] Browsing client root: ${result.folders.length} folders`);
  }, [fetchFolders, clickupListId, clickupListName, clientName]);

  // Helper: try to resolve a SP link, with fallback to client root browsing
  const resolveSpLink = useCallback(async (spLink: string) => {
    const result = await fetchFolders({ url: spLink });
    if (result) return; // Success
    // Fallback to client root browsing — delegates to loadClientRoot which handles Projects subfolder
    setError(null);
    await loadClientRoot();
  }, [fetchFolders, loadClientRoot]);

  // Try to resolve the SP subfolder from config, using list ID or list name.
  // Returns true if it navigated successfully.
  const tryConfigNavigation = useCallback(async (listId?: string, listName?: string): Promise<boolean> => {
    const configMatch = (listId ? getSubdivisionByListId(listId) : undefined)
      ?? (listName ? getSubdivisionByName(listName) : undefined);

    if (!configMatch?.subdivision.sharepointSubfolder) return false;

    const { mapping, subdivision } = configMatch;
    const spSubfolder = subdivision.sharepointSubfolder!;
    const subPath = `${mapping.sharepointCustomerFolder}/03. Projects/${spSubfolder}`;
    console.log(`[ShareFolderModal] Config navigation: listId=${listId ?? "n/a"}, listName=${listName ?? "n/a"} → "${subdivision.name}" → path="${subPath}"`);

    try {
      const params = new URLSearchParams();
      params.set("client", clientName);
      params.set("path", subPath);
      const res = await fetch(`/api/admin/integrations/sharepoint/folders?${params}`);
      if (res.ok) {
        const result: FoldersResponse = await res.json();
        setData(result);
        setBreadcrumb([{ name: spSubfolder, folderId: "", webUrl: "" }]);
        setLoading(false);
        return true;
      }
      console.warn(`[ShareFolderModal] Config path returned ${res.status}`);
    } catch (err) {
      console.warn(`[ShareFolderModal] Config path fetch failed:`, err);
    }
    return false;
  }, [clientName]);

  // Load folders on open
  useEffect(() => {
    if (!isOpen) return;
    setBreadcrumb([]);
    setSharedLink(null);
    setCopied(false);
    setSelectedFiles(new Map());

    const init = async () => {
      // 1. PRIORITY: if we have a clickupListId or clickupListName, try config lookup.
      // This is more reliable than SP links from ClickUp custom fields.
      if (clickupListId || clickupListName) {
        const ok = await tryConfigNavigation(clickupListId || undefined, clickupListName || undefined);
        if (ok) return;
      }

      // 2. If we have a clickupTaskUrl but no listId, fetch the task to get the list ID.
      // This covers the case where the tracker didn't propagate clickupListId.
      if (clickupTaskUrl && !clickupListId) {
        const taskIdMatch = clickupTaskUrl.match(/\/t\/([a-zA-Z0-9]+)/);
        if (taskIdMatch) {
          try {
            const res = await fetch(`/api/admin/integrations/clickup/task-list?taskId=${taskIdMatch[1]}`);
            if (res.ok) {
              const data = await res.json();
              if (data?.listId || data?.listName) {
                const ok = await tryConfigNavigation(data.listId, data.listName);
                if (ok) return;
              }
            }
          } catch { /* fall through */ }
        }
      }

      // 3. If we have a SharePoint link, use it directly
      if (sharepointLink) {
        resolveSpLink(sharepointLink);
        return;
      }

      // 4. Last resort: try ClickUp SP link custom field, then client root
      if (clickupTaskUrl) {
        const taskIdMatch = clickupTaskUrl.match(/\/t\/([a-zA-Z0-9]+)/);
        if (taskIdMatch) {
          try {
            const res = await fetch(`/api/admin/integrations/clickup/sharepoint-link?taskId=${taskIdMatch[1]}`);
            const data = res.ok ? await res.json() : null;
            if (data?.url) {
              resolveSpLink(data.url);
              return;
            }
          } catch { /* fall through */ }
        }
      }

      // 5. Fallback: browse client root
      await loadClientRoot();
    };

    init();
  }, [isOpen, sharepointLink, clickupTaskUrl, clickupListId, clickupListName, resolveSpLink, loadClientRoot, tryConfigNavigation]);

  // Navigate into a subfolder by its ID
  const navigateInto = useCallback((folderName: string, folderId: string, webUrl?: string) => {
    setBreadcrumb((prev) => [...prev, { name: folderName, folderId, webUrl }]);
    fetchFolders({ folderId });
  }, [fetchFolders]);

  // Navigate up via breadcrumb click
  const navigateTo = useCallback((index: number) => {
    if (index === 0) {
      // Back to root
      setBreadcrumb([]);
      if (sharepointLink) {
        fetchFolders({ url: sharepointLink });
      } else {
        fetchFolders({ clientRoot: true });
      }
    } else {
      const entry = breadcrumb[index - 1];
      setBreadcrumb((prev) => prev.slice(0, index));
      fetchFolders({ folderId: entry.folderId });
    }
  }, [breadcrumb, fetchFolders, sharepointLink]);

  // Share a folder — create a branded presentation page with assets from this folder
  const shareFolder = useCallback(async (folderId: string, folderName: string, folderWebUrl?: string) => {
    setSharing(folderId);
    setError(null);
    try {
      // Create/update project preview in DB with the selected SP folder
      const currentDriveId = data?.driveId ?? "";
      const res: Response = await fetch("/api/admin/project-previews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: `${clientName}::${projectName}`,
          clientName,
          projectName,
          spFolderId: folderId,
          spDriveId: currentDriveId,
          sharepointLink: folderWebUrl || null,
          brief: `Deliverables for ${projectName} — ${folderName}`,
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.message || "Failed to generate link");
      }

      const result = await res.json();
      const fullUrl = `${window.location.origin}${result.url}`;
      setSharedLink(fullUrl);

      // Copy to clipboard
      try {
        await navigator.clipboard.writeText(fullUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      } catch {
        // Clipboard may not be available
      }

      // Open in new tab
      window.open(fullUrl, "_blank");

      // Notify parent to refresh link list
      onLinkCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate link");
    } finally {
      setSharing(null);
    }
  }, [clientName, projectName, data, onLinkCreated]);

  // Share folder with specific file selection — stores selected file names in DB
  const shareFolderWithSelection = useCallback(async (folderId: string, folderName: string, folderWebUrl?: string) => {
    setSharing(folderId);
    setError(null);
    try {
      // Build the list of ALL selected files across all folders
      const selected = Array.from(selectedFiles.values()).map((f) => ({
        id: f.id,
        name: f.name,
        mimeType: f.mimeType,
      }));

      const currentDriveId = data?.driveId ?? "";
      const res: Response = await fetch("/api/admin/project-previews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: `${clientName}::${projectName}`,
          clientName,
          projectName,
          spFolderId: folderId,
          spDriveId: currentDriveId,
          sharepointLink: folderWebUrl || null,
          brief: `Deliverables for ${projectName} — ${folderName}`,
          selectedAssets: selected.length > 0 ? JSON.stringify(selected) : null,
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.message || "Failed to generate link");
      }

      const result = await res.json();
      const fullUrl = `${window.location.origin}${result.url}`;
      setSharedLink(fullUrl);

      try {
        await navigator.clipboard.writeText(fullUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      } catch { /* clipboard not available */ }

      window.open(fullUrl, "_blank");

      // Notify parent to refresh link list
      onLinkCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate link");
    } finally {
      setSharing(null);
    }
  }, [clientName, projectName, data, selectedFiles, onLinkCreated]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <div>
            <h2 className="text-lg font-bold text-brand-black">Share project files</h2>
            <p className="text-sm text-neutral-500 mt-0.5">
              {clientName} — {projectName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-neutral-100 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Breadcrumb */}
        <div className="px-6 py-2 border-b border-neutral-100 flex items-center gap-1 text-sm flex-wrap">
          <button
            onClick={() => navigateTo(0)}
            className="text-brand-cerulean hover:underline font-medium"
          >
            {clientName}
          </button>
          {breadcrumb.map((entry, i) => (
            <span key={i} className="flex items-center gap-1">
              <span className="text-neutral-300">/</span>
              {i === breadcrumb.length - 1 ? (
                <span className="text-brand-black font-medium">{entry.name}</span>
              ) : (
                <button
                  onClick={() => navigateTo(i + 1)}
                  className="text-brand-cerulean hover:underline"
                >
                  {entry.name}
                </button>
              )}
            </span>
          ))}
        </div>

        {/* Shared link success banner */}
        {sharedLink && (
          <div className="mx-6 mt-3 p-3 rounded-lg bg-success-light border border-success/20 flex items-center gap-3">
            <svg className="w-5 h-5 text-success shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-success">
                {copied ? "Link copied to clipboard!" : "Sharing link created"}
              </p>
              <p className="text-xs text-neutral-600 truncate mt-0.5">{sharedLink}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(sharedLink);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 3000);
                  } catch { /* ignore */ }
                }}
                className="px-3 py-1.5 text-xs font-medium rounded-md bg-white border border-neutral-200 hover:bg-neutral-50 text-brand-black transition-colors"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
              <a
                href={sharedLink}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 text-xs font-medium rounded-md bg-brand-cerulean text-white hover:bg-brand-cerulean/90 transition-colors"
              >
                Open
              </a>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-3">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-brand-cerulean border-t-transparent rounded-full animate-spin" />
              <span className="ml-3 text-sm text-neutral-500">Loading folders...</span>
            </div>
          )}

          {error && !loading && (
            <div className="py-8 text-center">
              <p className="text-sm text-red-600 mb-3">{error}</p>
              <button
                onClick={() => {
                  if (breadcrumb.length > 0) {
                    fetchFolders({ folderId: breadcrumb[breadcrumb.length - 1].folderId });
                  } else if (sharepointLink) {
                    fetchFolders({ url: sharepointLink });
                  } else {
                    fetchFolders({ clientRoot: true });
                  }
                }}
                className="text-sm text-brand-cerulean hover:underline"
              >
                Try again
              </button>
            </div>
          )}

          {!loading && !error && data && (
            <>
              {data.folders.length === 0 && data.files.length === 0 && (
                <p className="text-sm text-neutral-400 py-8 text-center">
                  This folder is empty.
                </p>
              )}

              {/* Folders */}
              {data.folders.map((folder) => (
                <div
                  key={folder.id}
                  className="flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-lg hover:bg-neutral-50 transition-colors group"
                >
                  <button
                    onClick={() => navigateInto(folder.name, folder.id, folder.webUrl)}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  >
                    <svg className="w-5 h-5 text-brand-cerulean shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-brand-black truncate">{folder.name}</p>
                      <p className="text-xs text-neutral-400">
                        {folder.childCount} item{folder.childCount !== 1 ? "s" : ""}
                        {folder.lastModified && ` · ${formatDate(folder.lastModified)}`}
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={() => shareFolder(folder.id, folder.name, folder.webUrl)}
                    disabled={sharing === folder.id}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-md transition-all shrink-0",
                      "bg-brand-black text-white hover:bg-neutral-800",
                      "opacity-0 group-hover:opacity-100 focus:opacity-100",
                      sharing === folder.id && "opacity-100 cursor-wait"
                    )}
                  >
                    {sharing === folder.id ? "Generating..." : "Create Link"}
                  </button>
                </div>
              ))}

              {/* Files — selectable with checkboxes + thumbnail/list toggle */}
              {data.files.length > 0 && (
                <div className={data.folders.length > 0 ? "border-t border-neutral-100 mt-2 pt-2" : ""}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-neutral-400 uppercase tracking-wide">
                      Files ({data.files.filter((f) => selectedFiles.has(f.id)).length}/{data.files.length} in folder{selectedFiles.size > 0 ? ` · ${selectedFiles.size} total` : ""})
                    </p>
                    <div className="flex items-center gap-3">
                      {/* View toggle */}
                      <div className="flex items-center border border-neutral-200 rounded-md overflow-hidden">
                        <button
                          onClick={() => setViewMode("grid")}
                          className={cn("p-1", viewMode === "grid" ? "bg-neutral-100" : "hover:bg-neutral-50")}
                          title="Thumbnail view"
                        >
                          <svg className="w-3.5 h-3.5 text-neutral-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
                        </button>
                        <button
                          onClick={() => setViewMode("list")}
                          className={cn("p-1", viewMode === "list" ? "bg-neutral-100" : "hover:bg-neutral-50")}
                          title="List view"
                        >
                          <svg className="w-3.5 h-3.5 text-neutral-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
                        </button>
                      </div>
                      <button
                        onClick={() => {
                          const currentPath = breadcrumb.map((b) => b.name).join("/") || clientName;
                          const allCurrentSelected = data.files.every((f) => selectedFiles.has(f.id));
                          setSelectedFiles((prev) => {
                            const next = new Map(prev);
                            if (allCurrentSelected) {
                              // Deselect only current folder's files
                              for (const f of data.files) next.delete(f.id);
                            } else {
                              // Select all in current folder (keep others)
                              for (const f of data.files) {
                                next.set(f.id, { id: f.id, name: f.name, mimeType: f.mimeType, folderPath: currentPath });
                              }
                            }
                            return next;
                          });
                        }}
                        className="text-xs text-brand-cerulean hover:underline"
                      >
                        {data.files.every((f) => selectedFiles.has(f.id)) ? "Deselect all" : "Select all"}
                      </button>
                    </div>
                  </div>

                  {/* Grid view (thumbnails) */}
                  {viewMode === "grid" && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {data.files.map((file) => {
                        const isSelected = selectedFiles.has(file.id);
                        const isImage = file.mimeType.startsWith("image/");
                        return (
                          <label
                            key={file.id}
                            className={cn(
                              "relative rounded-lg overflow-hidden cursor-pointer transition-all border-2",
                              isSelected ? "border-brand-cerulean ring-1 ring-brand-cerulean/30" : "border-transparent hover:border-neutral-200"
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                const currentPath = breadcrumb.map((b) => b.name).join("/") || clientName;
                                setSelectedFiles((prev) => {
                                  const next = new Map(prev);
                                  if (next.has(file.id)) next.delete(file.id);
                                  else next.set(file.id, { id: file.id, name: file.name, mimeType: file.mimeType, folderPath: currentPath });
                                  return next;
                                });
                              }}
                              className="sr-only"
                            />
                            {/* Thumbnail or placeholder */}
                            <div className="aspect-square bg-neutral-50 flex items-center justify-center overflow-hidden">
                              {isImage && file.thumbnailUrl ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img src={file.thumbnailUrl} alt={file.name} className="w-full h-full object-cover" loading="lazy" />
                              ) : isImage ? (
                                <svg className="w-8 h-8 text-neutral-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                              ) : (
                                <svg className="w-8 h-8 text-neutral-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                              )}
                            </div>
                            {/* Selection indicator */}
                            {isSelected && (
                              <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-brand-cerulean flex items-center justify-center">
                                <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                              </div>
                            )}
                            {/* File name */}
                            <p className="text-[10px] text-neutral-500 truncate px-1 py-0.5">{file.name}</p>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {/* List view */}
                  {viewMode === "list" && data.files.map((file) => {
                    const isSelected = selectedFiles.has(file.id);
                    const isImage = file.mimeType.startsWith("image/");
                    return (
                      <label
                        key={file.id}
                        className={cn(
                          "flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg cursor-pointer transition-colors",
                          isSelected ? "bg-brand-cerulean/5" : "hover:bg-neutral-50"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            const currentPath = breadcrumb.map((b) => b.name).join("/") || clientName;
                            setSelectedFiles((prev) => {
                              const next = new Map(prev);
                              if (next.has(file.id)) next.delete(file.id);
                              else next.set(file.id, { id: file.id, name: file.name, mimeType: file.mimeType, folderPath: currentPath });
                              return next;
                            });
                          }}
                          className="w-4 h-4 rounded border-neutral-300 text-brand-cerulean focus:ring-brand-cerulean/40 shrink-0"
                        />
                        {isImage && file.thumbnailUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={file.thumbnailUrl} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                        ) : isImage ? (
                          <svg className="w-4 h-4 text-brand-cerulean shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-neutral-300 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                          </svg>
                        )}
                        <span className={cn("text-sm truncate flex-1", isSelected ? "text-brand-black" : "text-neutral-500")}>{file.name}</span>
                        <span className="text-xs text-neutral-300 shrink-0">{formatSize(file.size)}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Selected files summary — shows files from other folders */}
        {selectedFiles.size > 0 && (() => {
          // Group selections by folder path
          const byFolder = new Map<string, Array<{ id: string; name: string }>>();
          for (const [, file] of selectedFiles) {
            const folder = file.folderPath;
            if (!byFolder.has(folder)) byFolder.set(folder, []);
            byFolder.get(folder)!.push(file);
          }
          const otherFolders = Array.from(byFolder.entries()).filter(
            ([path]) => path !== (breadcrumb.map((b) => b.name).join("/") || clientName)
          );
          if (otherFolders.length === 0) return null;
          return (
            <div className="px-6 py-2 border-t border-neutral-100 bg-brand-cerulean/5">
              <p className="text-xs font-medium text-brand-cerulean mb-1">
                + {otherFolders.reduce((n, [, files]) => n + files.length, 0)} file(s) from other folders:
              </p>
              <div className="flex flex-wrap gap-1">
                {otherFolders.map(([path, files]) => (
                  <span key={path} className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-neutral-200 rounded text-[10px] text-neutral-600">
                    {path.split("/").pop()} ({files.length})
                    <button
                      onClick={() => {
                        setSelectedFiles((prev) => {
                          const next = new Map(prev);
                          for (const f of files) next.delete(f.id);
                          return next;
                        });
                      }}
                      className="text-neutral-400 hover:text-red-500 ml-0.5"
                      title="Remove these files"
                    >
                      x
                    </button>
                  </span>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Footer — Create link from selected files */}
        {!loading && data && (data.files.length > 0 || data.folders.length > 0 || selectedFiles.size > 0) && (
          <div className="px-6 py-3 border-t border-neutral-200 flex items-center justify-between gap-3">
            <p className="text-xs text-neutral-400">
              {selectedFiles.size > 0
                ? `${selectedFiles.size} file${selectedFiles.size !== 1 ? "s" : ""} selected across folders`
                : "Select files or pick a folder above"}
            </p>
            {selectedFiles.size > 0 && breadcrumb.length > 0 && (
              <button
                onClick={() => {
                  const currentEntry = breadcrumb[breadcrumb.length - 1];
                  shareFolderWithSelection(currentEntry.folderId, currentEntry.name, currentEntry.webUrl);
                }}
                disabled={!!sharing}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-brand-black text-white hover:bg-neutral-800 transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {sharing ? "Generating..." : `Create Link (${selectedFiles.size})`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
