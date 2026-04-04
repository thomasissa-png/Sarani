"use client";

/**
 * VisualSelector — Browse SharePoint project assets and assign images
 * to case study visual roles (Hero, LinkedIn, Email Header).
 *
 * Flow:
 * 1. PM clicks "Select Visuals" -> panel opens
 * 2. Fetches images from the candidate's SharePoint folder
 * 3. PM clicks an image -> picks a role to assign it to
 * 4. PM confirms -> onSelected callback with the URLs
 */

import { useState, useCallback } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface SpFile {
  name: string;
  id: string;
  size: number;
  mimeType: string;
  lastModified: string;
  webUrl: string;
  thumbnailUrl?: string | null;
}

interface SpFolder {
  name: string;
  id: string;
  childCount: number;
  lastModified: string;
  webUrl: string;
}

interface FoldersResponse {
  path: string;
  folders: SpFolder[];
  files: SpFile[];
  totalFolders: number;
  totalFiles: number;
  driveId?: string;
}

type VisualRole = "heroImage" | "linkedInImage" | "emailHeader";

export interface SelectedVisuals {
  heroImage?: string;
  /** 1-3 images for the LinkedIn visual composition */
  linkedInImages?: string[];
  emailHeader?: string;
}

interface VisualSelectorProps {
  candidateId: string;
  spFolderUrl: string;
  initialVisuals?: SelectedVisuals;
  onSelected: (visuals: SelectedVisuals) => void;
}

const ROLE_LABELS: Record<VisualRole, string> = {
  heroImage: "Hero (Website)",
  linkedInImage: "LinkedIn (1-3)",
  emailHeader: "Email Header",
};

const ROLE_COLORS: Record<VisualRole, string> = {
  heroImage: "bg-purple-100 text-purple-700 border-purple-200",
  linkedInImage: "bg-blue-100 text-blue-700 border-blue-200",
  emailHeader: "bg-amber-100 text-amber-700 border-amber-200",

};

const MAX_LINKEDIN_IMAGES = 3;

// ─── Helpers ────────────────────────────────────────────────────────────────

function isImageMime(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function VisualSelector({
  candidateId,
  spFolderUrl,
  initialVisuals,
  onSelected,
}: VisualSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<SpFile[]>([]);
  const [folders, setFolders] = useState<SpFolder[]>([]);
  const [breadcrumb, setBreadcrumb] = useState<Array<{ label: string; folderId?: string }>>([]);
  const [visuals, setVisuals] = useState<SelectedVisuals>(initialVisuals ?? {});
  const [rolePickerFor, setRolePickerFor] = useState<SpFile | null>(null);
  const [saving, setSaving] = useState(false);

  // ─── Fetch folder contents ──────────────────────────────────────────────

  const fetchFolder = useCallback(async (params: { url?: string; folderId?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (params.url) qs.set("url", params.url);
      if (params.folderId) qs.set("folderId", params.folderId);
      const res = await fetch(`/api/admin/integrations/sharepoint/folders?${qs.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to load" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data: FoldersResponse = await res.json();
      setFolders(data.folders);
      setFiles(data.files.filter((f) => isImageMime(f.mimeType)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setFolders([]);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Open panel ─────────────────────────────────────────────────────────

  const openPanel = useCallback(() => {
    setIsOpen(true);
    setVisuals(initialVisuals ?? {});
    setBreadcrumb([{ label: "Root" }]);
    fetchFolder({ url: spFolderUrl });
  }, [spFolderUrl, initialVisuals, fetchFolder]);

  // ─── Navigate into subfolder ────────────────────────────────────────────

  const drillInto = useCallback((folder: SpFolder) => {
    setBreadcrumb((prev) => [...prev, { label: folder.name, folderId: folder.id }]);
    fetchFolder({ folderId: folder.id });
  }, [fetchFolder]);

  const navigateBreadcrumb = useCallback((index: number) => {
    setBreadcrumb((prev) => {
      const next = prev.slice(0, index + 1);
      const target = next[next.length - 1];
      if (target.folderId) {
        fetchFolder({ folderId: target.folderId });
      } else {
        fetchFolder({ url: spFolderUrl });
      }
      return next;
    });
  }, [fetchFolder, spFolderUrl]);

  // ─── Assign image to role ───────────────────────────────────────────────

  const assignRole = useCallback((file: SpFile, role: VisualRole) => {
    const imageUrl = file.thumbnailUrl || file.webUrl;
    if (role === "linkedInImage") {
      // LinkedIn: toggle in array (max 3)
      setVisuals((prev) => {
        const current = prev.linkedInImages ?? [];
        if (current.includes(imageUrl)) {
          return { ...prev, linkedInImages: current.filter((u) => u !== imageUrl) };
        }
        if (current.length >= MAX_LINKEDIN_IMAGES) return prev; // already at max
        return { ...prev, linkedInImages: [...current, imageUrl] };
      });
    } else {
      // Hero / Email: single image
      setVisuals((prev) => ({ ...prev, [role]: imageUrl }));
    }
    setRolePickerFor(null);
  }, []);

  const removeRole = useCallback((role: VisualRole, urlToRemove?: string) => {
    setVisuals((prev) => {
      if (role === "linkedInImage") {
        if (urlToRemove) {
          return { ...prev, linkedInImages: (prev.linkedInImages ?? []).filter((u) => u !== urlToRemove) };
        }
        return { ...prev, linkedInImages: [] };
      }
      const next = { ...prev };
      delete next[role];
      return next;
    });
  }, []);

  // ─── Confirm selection ──────────────────────────────────────────────────

  const confirmSelection = useCallback(async () => {
    setSaving(true);
    try {
      onSelected(visuals);
      setIsOpen(false);
    } finally {
      setSaving(false);
    }
  }, [visuals, onSelected]);

  // ─── Get which roles an image URL is assigned to ────────────────────────

  const getRolesForUrl = useCallback((url: string): VisualRole[] => {
    const roles: VisualRole[] = [];
    if (visuals.heroImage === url) roles.push("heroImage");
    if (visuals.emailHeader === url) roles.push("emailHeader");
    if (visuals.linkedInImages?.includes(url)) roles.push("linkedInImage");
    return roles;
  }, [visuals]);

  // ─── Count assigned visuals ─────────────────────────────────────────────

  const assignedCount =
    (visuals.heroImage ? 1 : 0) +
    (visuals.linkedInImages?.length ?? 0) +
    (visuals.emailHeader ? 1 : 0);

  // ─── Compact preview when closed ────────────────────────────────────────

  const currentVisuals = initialVisuals ?? {};
  const hasVisuals = !!(currentVisuals.heroImage || (currentVisuals.linkedInImages?.length ?? 0) > 0 || currentVisuals.emailHeader);

  return (
    <div className="mt-3">
      {/* Trigger button + mini preview */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={openPanel}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
          </svg>
          {hasVisuals ? "Edit Visuals" : "Select Visuals"}
        </button>
        {hasVisuals && (
          <div className="flex items-center gap-2 flex-wrap">
            {currentVisuals.heroImage && (
              <div className="flex items-center gap-1">
                <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded border ${ROLE_COLORS.heroImage}`}>Hero</span>
                <div className="w-6 h-6 rounded border border-neutral-200 overflow-hidden bg-neutral-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={currentVisuals.heroImage} alt="Hero" className="w-full h-full object-cover" />
                </div>
              </div>
            )}
            {(currentVisuals.linkedInImages ?? []).length > 0 && (
              <div className="flex items-center gap-1">
                <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded border ${ROLE_COLORS.linkedInImage}`}>LinkedIn ({currentVisuals.linkedInImages!.length})</span>
                {currentVisuals.linkedInImages!.map((url, i) => (
                  <div key={i} className="w-6 h-6 rounded border border-neutral-200 overflow-hidden bg-neutral-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`LinkedIn ${i + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
            {currentVisuals.emailHeader && (
              <div className="flex items-center gap-1">
                <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded border ${ROLE_COLORS.emailHeader}`}>Email</span>
                <div className="w-6 h-6 rounded border border-neutral-200 overflow-hidden bg-neutral-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={currentVisuals.emailHeader} alt="Email" className="w-full h-full object-cover" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Full-screen modal overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">Select Visuals</h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Choose images from SharePoint for this case study ({assignedCount}/3 assigned)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Selected roles summary */}
            <div className="px-6 py-3 bg-neutral-50 border-b border-neutral-200 flex flex-wrap gap-3">
              {/* Hero */}
              <div className="flex items-center gap-2">
                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded border ${ROLE_COLORS.heroImage}`}>
                  {ROLE_LABELS.heroImage}
                </span>
                {visuals.heroImage ? (
                  <div className="flex items-center gap-1">
                    <div className="w-8 h-8 rounded border border-neutral-200 overflow-hidden bg-neutral-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={visuals.heroImage} alt="Hero" className="w-full h-full object-cover" />
                    </div>
                    <button type="button" onClick={() => removeRole("heroImage")} className="p-0.5 text-neutral-400 hover:text-red-500 transition-colors" aria-label="Remove Hero">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-neutral-400">Not assigned</span>
                )}
              </div>
              {/* LinkedIn (1-3) */}
              <div className="flex items-center gap-2">
                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded border ${ROLE_COLORS.linkedInImage}`}>
                  {ROLE_LABELS.linkedInImage} ({visuals.linkedInImages?.length ?? 0}/{MAX_LINKEDIN_IMAGES})
                </span>
                {(visuals.linkedInImages ?? []).length > 0 ? (
                  <div className="flex items-center gap-1">
                    {(visuals.linkedInImages ?? []).map((url, i) => (
                      <div key={i} className="relative">
                        <div className="w-8 h-8 rounded border border-neutral-200 overflow-hidden bg-neutral-100">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt={`LinkedIn ${i + 1}`} className="w-full h-full object-cover" />
                        </div>
                        <button type="button" onClick={() => removeRole("linkedInImage", url)} className="absolute -top-1 -right-1 p-0.5 bg-white rounded-full shadow text-neutral-400 hover:text-red-500 transition-colors" aria-label={`Remove LinkedIn ${i + 1}`}>
                          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-neutral-400">Not assigned</span>
                )}
              </div>
              {/* Email Header */}
              <div className="flex items-center gap-2">
                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded border ${ROLE_COLORS.emailHeader}`}>
                  {ROLE_LABELS.emailHeader}
                </span>
                {visuals.emailHeader ? (
                  <div className="flex items-center gap-1">
                    <div className="w-8 h-8 rounded border border-neutral-200 overflow-hidden bg-neutral-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={visuals.emailHeader} alt="Email" className="w-full h-full object-cover" />
                    </div>
                    <button type="button" onClick={() => removeRole("emailHeader")} className="p-0.5 text-neutral-400 hover:text-red-500 transition-colors" aria-label="Remove Email">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-neutral-400">Not assigned</span>
                )}
              </div>
            </div>

            {/* Breadcrumb */}
            <div className="px-6 py-2 border-b border-neutral-100 flex items-center gap-1 text-xs text-neutral-500">
              {breadcrumb.map((crumb, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && <span className="text-neutral-300">/</span>}
                  <button
                    type="button"
                    onClick={() => navigateBreadcrumb(i)}
                    className={`hover:text-neutral-800 transition-colors ${i === breadcrumb.length - 1 ? "font-medium text-neutral-700" : ""}`}
                  >
                    {crumb.label}
                  </button>
                </span>
              ))}
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {loading && (
                <div className="flex items-center justify-center py-12">
                  <span className="animate-spin h-6 w-6 border-2 border-neutral-300 border-t-neutral-700 rounded-full" />
                  <span className="ml-3 text-sm text-neutral-500">Loading assets...</span>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
                  <p className="font-medium">Failed to load SharePoint folder</p>
                  <p className="mt-1 text-red-600">{error}</p>
                  <button
                    type="button"
                    onClick={() => {
                      const last = breadcrumb[breadcrumb.length - 1];
                      fetchFolder(last.folderId ? { folderId: last.folderId } : { url: spFolderUrl });
                    }}
                    className="mt-2 text-xs font-medium text-red-700 underline hover:no-underline"
                  >
                    Retry
                  </button>
                </div>
              )}

              {!loading && !error && (
                <>
                  {/* Subfolders */}
                  {folders.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">Folders</h3>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                        {folders.map((folder) => (
                          <button
                            key={folder.id}
                            type="button"
                            onClick={() => drillInto(folder)}
                            className="flex flex-col items-center gap-1 p-3 rounded-lg border border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300 transition-colors text-center"
                          >
                            <svg className="w-8 h-8 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z" />
                            </svg>
                            <span className="text-xs text-neutral-700 truncate w-full">{folder.name}</span>
                            <span className="text-[10px] text-neutral-400">{folder.childCount} items</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Images grid */}
                  {files.length > 0 && (
                    <div>
                      <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">
                        Images ({files.length})
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {files.map((file) => {
                          const assignedRoles = getRolesForUrl(file.thumbnailUrl || file.webUrl);
                          const isAssigned = assignedRoles.length > 0;
                          return (
                            <div key={file.id} className="relative group">
                              <button
                                type="button"
                                onClick={() => setRolePickerFor(file)}
                                className={`w-full aspect-square rounded-lg border-2 overflow-hidden bg-neutral-100 transition-all ${
                                  isAssigned
                                    ? "border-purple-400 ring-2 ring-purple-100"
                                    : "border-neutral-200 hover:border-neutral-400"
                                }`}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={file.thumbnailUrl || file.webUrl}
                                  alt={file.name}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              </button>
                              {/* Role badges on assigned images */}
                              {isAssigned && (
                                <div className="absolute top-1.5 right-1.5 flex flex-col gap-0.5">
                                  {assignedRoles.map((role) => (
                                    <span
                                      key={role}
                                      className={`inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded ${ROLE_COLORS[role]}`}
                                    >
                                      {ROLE_LABELS[role]}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {/* File info on hover */}
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity rounded-b-lg">
                                <p className="text-[10px] text-white truncate">{file.name}</p>
                                <p className="text-[9px] text-white/70">{formatFileSize(file.size)}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Empty state */}
                  {folders.length === 0 && files.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-neutral-400">
                      <svg className="w-12 h-12 mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                      </svg>
                      <p className="text-sm font-medium">No images found</p>
                      <p className="text-xs mt-1">This folder does not contain any image files.</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-200 bg-neutral-50">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-sm text-neutral-600 hover:text-neutral-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmSelection}
                disabled={saving || assignedCount === 0}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-neutral-900 rounded-lg hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? "Saving..." : `Confirm ${assignedCount} Visual${assignedCount !== 1 ? "s" : ""}`}
              </button>
            </div>
          </div>

          {/* Role picker popover */}
          {rolePickerFor && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20" onClick={() => setRolePickerFor(null)}>
              <div
                className="bg-white rounded-xl shadow-xl p-4 w-72"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="text-sm font-medium text-neutral-800 mb-1">Assign to role</p>
                <p className="text-xs text-neutral-500 mb-3 truncate">{rolePickerFor.name}</p>
                <div className="space-y-2">
                  {(Object.keys(ROLE_LABELS) as VisualRole[]).map((role) => {
                    const fileUrl = rolePickerFor.thumbnailUrl || rolePickerFor.webUrl;
                    const isLinkedIn = role === "linkedInImage";
                    const isCurrentlyAssigned = isLinkedIn
                      ? (visuals.linkedInImages ?? []).includes(fileUrl)
                      : visuals[role] === fileUrl;
                    const linkedInFull = isLinkedIn && !isCurrentlyAssigned && (visuals.linkedInImages?.length ?? 0) >= MAX_LINKEDIN_IMAGES;
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => assignRole(rolePickerFor, role)}
                        disabled={linkedInFull}
                        className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg border transition-colors ${
                          isCurrentlyAssigned
                            ? "bg-neutral-100 border-neutral-300 text-neutral-500"
                            : linkedInFull
                              ? "border-neutral-100 text-neutral-300 cursor-not-allowed"
                              : "border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300 text-neutral-700"
                        }`}
                      >
                        <span className={`font-medium ${ROLE_COLORS[role].split(" ")[1]}`}>
                          {ROLE_LABELS[role]}
                        </span>
                        {isCurrentlyAssigned && (
                          <span className="text-xs text-neutral-400">{isLinkedIn ? "Remove" : "Assigned"}</span>
                        )}
                        {!isCurrentlyAssigned && !isLinkedIn && visuals[role] && (
                          <span className="text-xs text-amber-600">Will replace</span>
                        )}
                        {linkedInFull && (
                          <span className="text-xs text-neutral-300">Full (3/3)</span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => setRolePickerFor(null)}
                  className="mt-3 w-full text-center text-xs text-neutral-500 hover:text-neutral-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
