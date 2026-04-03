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

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

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
  /** ClickUp list name — used to auto-navigate to the right SP subfolder */
  clickupListName?: string;
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

  // Strategy 1: exact match (case-insensitive)
  const exact = folders.find((f) => f.name.toLowerCase().trim() === listLower);
  if (exact) return exact;

  // Strategy 2: mutual includes (original logic)
  const byIncludes = folders.find((f) => {
    const folderLower = f.name.toLowerCase();
    return folderLower.includes(listLower) || listLower.includes(folderLower);
  });
  if (byIncludes) return byIncludes;

  // Strategy 3: strip client prefix from list name and try again
  // e.g. "TikTok P&E SEA" → "P&E SEA", then match against folder "P&E SEA"
  let stripped = listLower;
  if (stripped.startsWith(clientLower)) {
    stripped = stripped.slice(clientLower.length).trim();
  }
  // Also handle abbreviations: strip first word if it doesn't match client
  const words = listLower.split(/\s+/);
  const strippedFirstWord = words.length > 1 ? words.slice(1).join(" ") : "";

  for (const candidate of [stripped, strippedFirstWord]) {
    if (candidate.length < 2) continue;
    const match = folders.find((f) => {
      const folderLower = f.name.toLowerCase().trim();
      return folderLower.includes(candidate) || candidate.includes(folderLower);
    });
    if (match) return match;
  }

  // Strategy 4: tokenize and find best word-overlap match (min 2 shared tokens)
  const listTokens = new Set(listLower.replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((t) => t.length >= 2));
  let bestMatch: FolderItem | null = null;
  let bestScore = 0;
  for (const folder of folders) {
    const folderTokens = new Set(folder.name.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((t) => t.length >= 2));
    let overlap = 0;
    for (const t of listTokens) {
      if (folderTokens.has(t)) overlap++;
    }
    const score = overlap / Math.max(listTokens.size, folderTokens.size);
    if (overlap >= 2 && score > bestScore) {
      bestScore = score;
      bestMatch = folder;
    }
  }
  if (bestMatch && bestScore >= 0.3) return bestMatch;

  return null;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ShareFolderModal({ isOpen, onClose, clientName, projectName, clickupTaskUrl, sharepointLink, clickupListName }: ShareFolderModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<FoldersResponse | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<Array<{ name: string; folderId: string; webUrl?: string }>>([]);
  const [sharing, setSharing] = useState<string | null>(null);
  const [sharedLink, setSharedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  // Selected files for the presentation (by file ID)
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  // Toggle between list view and thumbnail grid view
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");

  // Fetch folder contents by ID, URL, or client mapping
  const fetchFolders = useCallback(async (opts: { folderId?: string; url?: string; clientRoot?: boolean }) => {
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

      const res = await fetch(`/api/admin/integrations/sharepoint/folders?${params}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to load folders (${res.status})`);
      }
      const result: FoldersResponse = await res.json();
      setData(result);
      // Auto-select all files in the new folder
      setSelectedFiles(new Set(result.files.map((f) => f.id)));
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load folders");
      return null;
    } finally {
      setLoading(false);
    }
  }, [clientName]);

  // Helper: try to resolve a SP link, with fallback to client root browsing
  const resolveSpLink = useCallback(async (spLink: string) => {
    const result = await fetchFolders({ url: spLink });
    if (result) return; // Success
    // Fallback to client root browsing
    setError(null);
    const fallbackResult = await fetchFolders({ clientRoot: true });
    if (!fallbackResult || !clickupListName) return;
    const match = findMatchingFolder(fallbackResult.folders, clickupListName, clientName);
    if (match) {
      setBreadcrumb([{ name: match.name, folderId: match.id, webUrl: match.webUrl }]);
      fetchFolders({ folderId: match.id });
    }
  }, [fetchFolders, clickupListName, clientName]);

  // Helper: navigate to client root and auto-find matching subfolder
  const loadClientRoot = useCallback(async () => {
    const result = await fetchFolders({ clientRoot: true });
    if (!result || !clickupListName) return;
    console.log(`[ShareFolderModal] Auto-matching ClickUp list "${clickupListName}" against ${result.folders.length} SP folders:`, result.folders.map((f) => f.name));
    const match = findMatchingFolder(result.folders, clickupListName, clientName);
    if (match) {
      console.log(`[ShareFolderModal] Matched: "${clickupListName}" → "${match.name}"`);
      setBreadcrumb([{ name: match.name, folderId: match.id, webUrl: match.webUrl }]);
      fetchFolders({ folderId: match.id });
    } else {
      console.warn(`[ShareFolderModal] No match found for ClickUp list "${clickupListName}" in SP folders`);
    }
  }, [fetchFolders, clickupListName, clientName]);

  // Load folders on open
  useEffect(() => {
    if (!isOpen) return;
    setBreadcrumb([]);
    setSharedLink(null);
    setCopied(false);

    // 1. If we already have a SharePoint link, use it directly
    if (sharepointLink) {
      resolveSpLink(sharepointLink);
      return;
    }

    // 2. No SP link cached — try to fetch it from ClickUp task's custom fields
    if (clickupTaskUrl) {
      const taskIdMatch = clickupTaskUrl.match(/\/t\/([a-zA-Z0-9]+)/);
      if (taskIdMatch) {
        fetch(`/api/admin/integrations/clickup/sharepoint-link?taskId=${taskIdMatch[1]}`)
          .then((r) => r.ok ? r.json() : null)
          .then((data) => {
            if (data?.url) {
              resolveSpLink(data.url);
            } else {
              // No SP URL in ClickUp either — fall back to client root
              loadClientRoot();
            }
          })
          .catch(() => loadClientRoot());
        return;
      }
    }

    // 3. No ClickUp task — load client root directly
    loadClientRoot();
  }, [isOpen, sharepointLink, clickupTaskUrl, resolveSpLink, loadClientRoot]);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate link");
    } finally {
      setSharing(null);
    }
  }, [clientName, projectName, data]);

  // Share folder with specific file selection — stores selected file names in DB
  const shareFolderWithSelection = useCallback(async (folderId: string, folderName: string, folderWebUrl?: string) => {
    setSharing(folderId);
    setError(null);
    try {
      // Build the list of selected file names from current data
      const selected = data?.files
        .filter((f) => selectedFiles.has(f.id))
        .map((f) => ({ id: f.id, name: f.name, mimeType: f.mimeType })) ?? [];

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate link");
    } finally {
      setSharing(null);
    }
  }, [clientName, projectName, data, selectedFiles]);

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
                      Files ({selectedFiles.size}/{data.files.length} selected)
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
                          if (selectedFiles.size === data.files.length) {
                            setSelectedFiles(new Set());
                          } else {
                            setSelectedFiles(new Set(data.files.map((f) => f.id)));
                          }
                        }}
                        className="text-xs text-brand-cerulean hover:underline"
                      >
                        {selectedFiles.size === data.files.length ? "Deselect all" : "Select all"}
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
                                setSelectedFiles((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(file.id)) next.delete(file.id);
                                  else next.add(file.id);
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
                            setSelectedFiles((prev) => {
                              const next = new Set(prev);
                              if (next.has(file.id)) next.delete(file.id);
                              else next.add(file.id);
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

        {/* Footer — Create link from selected files */}
        {!loading && data && (data.files.length > 0 || data.folders.length > 0) && (
          <div className="px-6 py-3 border-t border-neutral-200 flex items-center justify-between gap-3">
            <p className="text-xs text-neutral-400">
              {selectedFiles.size > 0
                ? `${selectedFiles.size} file${selectedFiles.size !== 1 ? "s" : ""} selected`
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
                {sharing ? "Generating..." : "Create Link"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
