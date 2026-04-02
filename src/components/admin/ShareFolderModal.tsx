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

// ─── Component ──────────────────────────────────────────────────────────────

export function ShareFolderModal({ isOpen, onClose, clientName, projectName, clickupTaskUrl, sharepointLink }: ShareFolderModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<FoldersResponse | null>(null);
  // Breadcrumb: each entry has a name (display) and folderId (for navigation)
  const [breadcrumb, setBreadcrumb] = useState<Array<{ name: string; folderId: string }>>([]);
  const [sharing, setSharing] = useState<string | null>(null);
  const [sharedLink, setSharedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load folders");
    } finally {
      setLoading(false);
    }
  }, [clientName]);

  // Load folders on open — use SP link from ClickUp if available
  useEffect(() => {
    if (isOpen) {
      setBreadcrumb([]);
      setSharedLink(null);
      setCopied(false);
      if (sharepointLink) {
        fetchFolders({ url: sharepointLink });
      } else {
        fetchFolders({ clientRoot: true });
      }
    }
  }, [isOpen, fetchFolders, sharepointLink]);

  // Navigate into a subfolder by its ID
  const navigateInto = useCallback((folderName: string, folderId: string) => {
    setBreadcrumb((prev) => [...prev, { name: folderName, folderId }]);
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
  const shareFolder = useCallback(async (folderId: string, folderName: string) => {
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
          brief: `Deliverables for ${projectName} — ${folderName}`,
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.message || "Failed to generate presentation link");
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
      setError(err instanceof Error ? err.message : "Failed to generate presentation");
    } finally {
      setSharing(null);
    }
  }, [clientName, projectName]);

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
                    onClick={() => navigateInto(folder.name, folder.id)}
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
                    onClick={() => shareFolder(folder.id, folder.name)}
                    disabled={sharing === folder.id}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-md transition-all shrink-0",
                      "bg-brand-black text-white hover:bg-neutral-800",
                      "opacity-0 group-hover:opacity-100 focus:opacity-100",
                      sharing === folder.id && "opacity-100 cursor-wait"
                    )}
                  >
                    {sharing === folder.id ? "Generating..." : "Create presentation"}
                  </button>
                </div>
              ))}

              {/* Files (info only, not shareable individually) */}
              {data.files.length > 0 && data.folders.length > 0 && (
                <div className="border-t border-neutral-100 mt-2 pt-2">
                  <p className="text-xs text-neutral-400 uppercase tracking-wide mb-2">
                    Files ({data.files.length})
                  </p>
                </div>
              )}
              {data.files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg"
                >
                  <svg className="w-4 h-4 text-neutral-300 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <span className="text-sm text-neutral-500 truncate flex-1">{file.name}</span>
                  <span className="text-xs text-neutral-300 shrink-0">{formatSize(file.size)}</span>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer — share current folder */}
        {breadcrumb.length > 0 && !loading && (
          <div className="px-6 py-3 border-t border-neutral-200 flex items-center justify-between">
            <p className="text-xs text-neutral-400">
              Share the entire current folder with an anonymous link
            </p>
            <button
              onClick={() => {
                // Find the current folder in the parent's listing
                // Use the last navigated folder
                const currentFolderName = breadcrumb[breadcrumb.length - 1];
                // We need the folder ID — but we only have the name
                // Refetch parent to get the ID, or store it during navigation
                // For now, use the first folder that matches in the parent response
                // This is a fallback — the inline Share button is preferred
                if (data?.folders.length === 0 && data?.files.length === 0) return;
                // The user can use the inline Share buttons instead
              }}
              className="hidden" // Hidden for now — inline Share buttons handle this
            >
              Share this folder
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
