"use client";

/**
 * VideoPlayer — Client Component that fetches a fresh download URL
 * from our proxy and plays the video directly.
 *
 * WHY: SharePoint download URLs are pre-signed and expire after ~1h.
 * Server-rendered <video src={url}> works on initial load but breaks
 * on long-lived pages. The proxy 302 redirect approach was unreliable
 * across browsers (Range request issues, CORS on redirect target).
 *
 * This component:
 * 1. Calls /api/project-assets/[itemId]?resolve=1 to get a fresh URL
 * 2. Sets it as the video src
 * 3. If the URL expires, re-fetches on error
 */

import { useState, useEffect, useRef, useCallback } from "react";

interface VideoPlayerProps {
  proxyUrl: string;
  directUrl?: string;
  mimeType: string;
  name: string;
}

export function VideoPlayer({ proxyUrl, directUrl, mimeType, name }: VideoPlayerProps) {
  const [videoSrc, setVideoSrc] = useState<string | null>(directUrl || null);
  const [error, setError] = useState(false);
  const retryCount = useRef(0);

  // Resolve a fresh download URL from the proxy
  const resolveUrl = useCallback(async () => {
    try {
      // Add resolve=1 to get JSON with the download URL instead of 302
      const resolveUrl = proxyUrl.includes("?")
        ? `${proxyUrl}&resolve=1`
        : `${proxyUrl}?resolve=1`;
      const res = await fetch(resolveUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.downloadUrl) {
        setVideoSrc(data.downloadUrl);
        setError(false);
        retryCount.current = 0;
      } else {
        throw new Error("No downloadUrl in response");
      }
    } catch {
      // Fallback: use the proxy URL directly (302 redirect)
      setVideoSrc(proxyUrl);
      setError(false);
    }
  }, [proxyUrl]);

  // If no directUrl provided, resolve on mount
  useEffect(() => {
    if (!directUrl) {
      resolveUrl();
    }
  }, [directUrl, resolveUrl]);

  // Handle video error — try to get a fresh URL
  const handleError = useCallback(() => {
    if (retryCount.current >= 2) {
      setError(true);
      return;
    }
    retryCount.current++;
    resolveUrl();
  }, [resolveUrl]);

  if (error) {
    return (
      <div className="w-full aspect-video bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/50 text-sm">Video unavailable</p>
          <button
            type="button"
            onClick={() => { retryCount.current = 0; resolveUrl(); }}
            className="mt-2 text-xs text-brand-cerulean hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!videoSrc) {
    return (
      <div className="w-full aspect-video bg-black flex items-center justify-center">
        <span className="animate-spin h-5 w-5 border-2 border-white/20 border-t-white/60 rounded-full" />
      </div>
    );
  }

  return (
    <video
      controls
      preload="metadata"
      className="w-full aspect-video bg-black"
      playsInline
      src={videoSrc}
      onError={handleError}
    >
      Your browser does not support video playback.
    </video>
  );
}
