"use client";

/**
 * VideoPlayer — Plays SharePoint videos via our streaming proxy.
 *
 * HOW IT WORKS:
 * The <video src> points directly to our proxy with ?stream=1.
 * The proxy fetches the video from SharePoint server-side and pipes it
 * through to the browser. This solves ALL the issues with direct
 * SharePoint URLs (CORS, Content-Disposition: attachment, auth).
 *
 * The browser handles everything natively: play, pause, seek (via Range
 * requests that the proxy forwards to SharePoint), fullscreen, etc.
 *
 * WHY NOT resolve=1 + downloadUrl:
 * After 15+ iterations, the "resolve download URL and set it as src"
 * approach never worked reliably. SharePoint download URLs are cross-origin
 * with no CORS headers, and often have Content-Disposition: attachment.
 * The browser refuses to play them inline.
 *
 * WHY NOT 302 redirect:
 * Same CORS problem — the redirect target is SharePoint's domain, and
 * the browser applies CORS policy on the final URL after redirect.
 */

import { useState, useRef, useCallback } from "react";

interface VideoPlayerProps {
  proxyUrl: string;
  mimeType: string;
  name: string;
}

export function VideoPlayer({ proxyUrl, mimeType, name }: VideoPlayerProps) {
  const [error, setError] = useState(false);
  const retryCount = useRef(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Build the streaming URL — append ?stream=1
  const streamUrl = proxyUrl.includes("?")
    ? `${proxyUrl}&stream=1`
    : `${proxyUrl}?stream=1`;

  const handleError = useCallback(() => {
    if (retryCount.current >= 2) {
      setError(true);
      return;
    }
    retryCount.current++;
    // Force reload by resetting the src
    const video = videoRef.current;
    if (video) {
      video.load();
    }
  }, []);

  const handleRetry = useCallback(() => {
    retryCount.current = 0;
    setError(false);
    // Force reload
    const video = videoRef.current;
    if (video) {
      video.load();
    }
  }, []);

  if (error) {
    return (
      <div className="w-full aspect-video bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/50 text-sm">Video unavailable</p>
          <button
            type="button"
            onClick={handleRetry}
            className="mt-2 text-xs text-brand-cerulean hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      controls
      preload="metadata"
      className="w-full aspect-video bg-black"
      playsInline
      src={streamUrl}
      onError={handleError}
    >
      Your browser does not support video playback.
    </video>
  );
}
