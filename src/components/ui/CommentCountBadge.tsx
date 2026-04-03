"use client";

import { useState, useEffect, useCallback } from "react";

interface CommentCountBadgeProps {
  previewId: string;
  assetName: string;
  initialCount: number;
}

/**
 * Client component that shows a live comment count badge.
 * Listens to "comment-updated" events from ImageLightbox
 * and re-fetches counts from the API.
 */
export default function CommentCountBadge({
  previewId,
  assetName,
  initialCount,
}: CommentCountBadgeProps) {
  const [count, setCount] = useState(initialCount);

  const refreshCount = useCallback(async () => {
    try {
      const res = await fetch(`/api/project-comments/${previewId}`);
      if (!res.ok) return;
      const data = await res.json();
      const comments = data.comments as Array<{ assetName: string | null }>;
      const assetCount = comments.filter((c) => c.assetName === assetName).length;
      setCount(assetCount);
    } catch { /* ignore */ }
  }, [previewId, assetName]);

  useEffect(() => {
    const handler = () => {
      refreshCount();
    };
    window.addEventListener("comment-updated", handler);
    return () => window.removeEventListener("comment-updated", handler);
  }, [refreshCount]);

  if (count === 0) return null;

  return (
    <>
      {/* Corner badge */}
      <div className="absolute top-2 right-2 z-10 flex h-6 min-w-6 items-center justify-center rounded-full bg-brand-flame px-1.5 text-xs font-bold text-white shadow-sm">
        {count}
      </div>
    </>
  );
}

/**
 * Inline comment indicator for the filename bar.
 */
export function CommentCountInline({
  previewId,
  assetName,
  initialCount,
}: CommentCountBadgeProps) {
  const [count, setCount] = useState(initialCount);

  const refreshCount = useCallback(async () => {
    try {
      const res = await fetch(`/api/project-comments/${previewId}`);
      if (!res.ok) return;
      const data = await res.json();
      const comments = data.comments as Array<{ assetName: string | null }>;
      const assetCount = comments.filter((c) => c.assetName === assetName).length;
      setCount(assetCount);
    } catch { /* ignore */ }
  }, [previewId, assetName]);

  useEffect(() => {
    const handler = () => {
      refreshCount();
    };
    window.addEventListener("comment-updated", handler);
    return () => window.removeEventListener("comment-updated", handler);
  }, [refreshCount]);

  if (count === 0) return null;

  return (
    <span className="inline-flex items-center gap-0.5 text-white/35">
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
      <span className="text-[10px] tabular-nums">{count}</span>
    </span>
  );
}
