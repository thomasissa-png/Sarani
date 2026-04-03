"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Comment {
  id: string;
  positionX: number | null;
  positionY: number | null;
  assetName: string | null;
  authorName: string;
  content: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ImageLightboxProps {
  src: string;
  alt: string;
  children: React.ReactNode;
  /** Preview ID for loading/posting comments. If undefined, comments are disabled. */
  previewId?: string;
  /** Asset name (file name) for linking comments to this specific image */
  assetName?: string;
  /** All images in the batch — enables prev/next navigation */
  allImages?: Array<{ src: string; alt: string; assetName: string }>;
  /** Current index in allImages */
  currentIndex?: number;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function ImageLightbox({
  src,
  alt,
  children,
  previewId,
  assetName,
  allImages,
  currentIndex,
}: ImageLightboxProps) {
  const [open, setOpen] = useState(false);
  const [navIndex, setNavIndex] = useState(currentIndex ?? 0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newPin, setNewPin] = useState<{ x: number; y: number } | null>(null);
  const [commentText, setCommentText] = useState("");
  const [authorName, setAuthorName] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("sarani-comment-name") ?? "";
    return "";
  });
  const [posting, setPosting] = useState(false);
  const [selectedPin, setSelectedPin] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const imgRef = useRef<HTMLImageElement>(null);

  // Current image (supports navigation)
  const currentImage = allImages && allImages[navIndex]
    ? allImages[navIndex]
    : { src, alt, assetName: assetName ?? alt };
  const canNav = allImages && allImages.length > 1;

  const close = useCallback(() => {
    setOpen(false);
    setNewPin(null);
    setSelectedPin(null);
  }, []);

  const goNext = useCallback(() => {
    if (!allImages) return;
    setNavIndex((i) => (i + 1) % allImages.length);
    setNewPin(null);
    setSelectedPin(null);
  }, [allImages]);

  const goPrev = useCallback(() => {
    if (!allImages) return;
    setNavIndex((i) => (i - 1 + allImages.length) % allImages.length);
    setNewPin(null);
    setSelectedPin(null);
  }, [allImages]);

  // Keyboard: Escape to close, arrows to navigate
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight" || e.key === "ArrowDown") goNext();
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") goPrev();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, close, goNext, goPrev]);

  // Prevent body scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Load comments when lightbox opens
  const fetchComments = useCallback(async () => {
    if (!previewId) return;
    try {
      const res = await fetch(`/api/project-comments/${previewId}`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments ?? []);
      }
    } catch { /* ignore */ }
  }, [previewId]);

  useEffect(() => {
    if (open && previewId) {
      fetchComments();
      // Poll every 5 seconds
      const interval = setInterval(fetchComments, 5000);
      return () => clearInterval(interval);
    }
  }, [open, previewId, fetchComments]);

  // Click on image to place a pin
  const handleImageClick = useCallback((e: React.MouseEvent<HTMLImageElement>) => {
    if (!previewId) return;
    const img = imgRef.current;
    if (!img) return;
    const rect = img.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setNewPin({ x, y });
    setSelectedPin(null);
    setCommentText("");
  }, [previewId]);

  // Post a new comment
  const postComment = useCallback(async () => {
    if (!previewId || !commentText.trim()) return;
    setPosting(true);
    try {
      // Remember name for next time
      if (authorName.trim()) {
        localStorage.setItem("sarani-comment-name", authorName.trim());
      }
      const res = await fetch(`/api/project-comments/${previewId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetName: currentImage.assetName,
          positionX: newPin?.x,
          positionY: newPin?.y,
          authorName: authorName.trim() || undefined,
          content: commentText.trim(),
        }),
      });
      if (res.ok) {
        setCommentText("");
        setNewPin(null);
        await fetchComments();
      }
    } catch { /* ignore */ }
    finally { setPosting(false); }
  }, [previewId, commentText, authorName, newPin, assetName, alt, fetchComments]);

  // Post a reply
  const postReply = useCallback(async (parentId: string) => {
    if (!previewId || !replyText.trim()) return;
    setPosting(true);
    try {
      if (authorName.trim()) {
        localStorage.setItem("sarani-comment-name", authorName.trim());
      }
      const res = await fetch(`/api/project-comments/${previewId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetName: currentImage.assetName,
          authorName: authorName.trim() || undefined,
          content: replyText.trim(),
          parentId,
        }),
      });
      if (res.ok) {
        setReplyText("");
        await fetchComments();
      }
    } catch { /* ignore */ }
    finally { setPosting(false); }
  }, [previewId, replyText, authorName, currentImage.assetName, fetchComments]);

  // Filter comments for this specific image
  const imageComments = comments.filter(
    (c) => c.assetName === currentImage.assetName && c.parentId === null && c.positionX !== null
  );
  const getReplies = (parentId: string) => comments.filter((c) => c.parentId === parentId);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full h-full text-left cursor-zoom-in"
        aria-label={`View ${alt} full screen`}
      >
        {children}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex"
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label={alt}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={close}
            className="absolute top-4 right-4 z-10 w-11 h-11 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
            aria-label="Close lightbox"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* Prev button */}
          {canNav && (
            <button
              onClick={(e) => { e.stopPropagation(); goPrev(); }}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
              aria-label="Previous image"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
          )}

          {/* Next button */}
          {canNav && (
            <button
              onClick={(e) => { e.stopPropagation(); goNext(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white sm:right-3"
              aria-label="Next image"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          )}

          {/* Image area */}
          <div
            className="flex-1 flex flex-col items-center justify-center p-4 min-w-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative inline-block max-w-full max-h-[80vh]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                src={currentImage.src}
                alt={currentImage.alt}
                className="max-w-full max-h-[80vh] object-contain rounded-lg cursor-crosshair"
                onClick={handleImageClick}
              />

              {/* Existing comment pins */}
              {imageComments.map((c, i) => (
                <button
                  key={c.id}
                  onClick={(e) => { e.stopPropagation(); setSelectedPin(c.id); setNewPin(null); }}
                  className={`absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                    selectedPin === c.id
                      ? "bg-brand-flame text-white scale-125"
                      : "bg-white text-brand-black hover:scale-110"
                  }`}
                  style={{ left: `${(c.positionX ?? 0) * 100}%`, top: `${(c.positionY ?? 0) * 100}%` }}
                  title={`${c.authorName}: ${c.content.slice(0, 50)}`}
                >
                  {i + 1}
                </button>
              ))}

              {/* New pin (not yet saved) */}
              {newPin && (
                <div
                  className="absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-flame text-white flex items-center justify-center text-[10px] font-bold animate-pulse"
                  style={{ left: `${newPin.x * 100}%`, top: `${newPin.y * 100}%` }}
                >
                  +
                </div>
              )}
            </div>

            {/* Caption + counter */}
            <div className="flex items-center gap-3 mt-3">
              <p className="text-sm text-white/50 text-center max-w-lg truncate">
                {currentImage.alt}
                {canNav && <span className="text-white/30 ml-2">{navIndex + 1}/{allImages!.length}</span>}
              </p>
              {previewId && (
                <span className="text-xs text-white/40">
                  Click on image to comment
                </span>
              )}
            </div>
          </div>

          {/* Comments panel — side on desktop, bottom sheet on mobile */}
          {previewId && (newPin || selectedPin || imageComments.length > 0) && (
            <div
              className="fixed sm:relative bottom-0 left-0 right-0 sm:bottom-auto sm:left-auto sm:right-auto w-full sm:w-80 max-h-[50vh] sm:max-h-none bg-neutral-900 border-t sm:border-t-0 sm:border-l border-white/10 flex flex-col overflow-hidden rounded-t-xl sm:rounded-none z-20"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-4 py-3 border-b border-white/10">
                <h3 className="text-sm font-semibold text-white">
                  Comments ({imageComments.length})
                </h3>
              </div>

              {/* Comment list */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
                {imageComments.map((c, i) => {
                  const replies = getReplies(c.id);
                  const isSelected = selectedPin === c.id;
                  return (
                    <div
                      key={c.id}
                      className={`rounded-lg p-3 transition-colors ${isSelected ? "bg-white/10" : "bg-white/5"}`}
                      onClick={() => setSelectedPin(c.id)}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold text-white">{i + 1}</span>
                        <span className="text-xs font-medium text-white/70">{c.authorName}</span>
                        <span className="text-[10px] text-white/30 ml-auto">
                          {new Date(c.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-sm text-white/80 leading-relaxed">{c.content}</p>

                      {/* Replies */}
                      {replies.length > 0 && (
                        <div className="mt-2 pl-3 border-l border-white/10 space-y-2">
                          {replies.map((r) => (
                            <div key={r.id}>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] font-medium text-white/50">{r.authorName}</span>
                                <span className="text-[10px] text-white/20">
                                  {new Date(r.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </div>
                              <p className="text-xs text-white/60">{r.content}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reply input */}
                      {isSelected && (
                        <div className="mt-2 flex gap-1">
                          <input
                            type="text"
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); postReply(c.id); } }}
                            placeholder="Reply..."
                            className="flex-1 px-2 py-1 text-xs bg-white/10 border border-white/10 rounded text-white placeholder:text-white/30 focus:outline-none focus:border-brand-flame/50"
                          />
                          <button
                            onClick={() => postReply(c.id)}
                            disabled={posting || !replyText.trim()}
                            className="px-2 py-1 text-xs font-medium bg-brand-flame text-white rounded hover:bg-brand-flame/80 disabled:opacity-50"
                          >
                            Reply
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* New comment form (when a new pin is placed) */}
              {newPin && (
                <div className="px-4 py-3 border-t border-white/10 space-y-2">
                  <input
                    type="text"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="Your name (optional)"
                    className="w-full px-3 py-1.5 text-xs bg-white/10 border border-white/10 rounded text-white placeholder:text-white/30 focus:outline-none focus:border-brand-flame/50"
                  />
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add your feedback..."
                    rows={3}
                    className="w-full px-3 py-2 text-sm bg-white/10 border border-white/10 rounded text-white placeholder:text-white/30 focus:outline-none focus:border-brand-flame/50 resize-none"
                    autoFocus
                  />
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setNewPin(null)}
                      className="text-xs text-white/40 hover:text-white/60"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={postComment}
                      disabled={posting || !commentText.trim()}
                      className="px-4 py-1.5 text-xs font-medium bg-brand-flame text-white rounded-lg hover:bg-brand-flame/80 disabled:opacity-50 transition-colors"
                    >
                      {posting ? "Posting..." : "Post comment"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
