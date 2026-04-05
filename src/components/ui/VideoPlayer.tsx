"use client";

/**
 * VideoPlayer — Plays SharePoint videos via our streaming proxy.
 *
 * The <video src> points to our proxy with ?stream=1.
 * The proxy fetches the video from SharePoint server-side and streams it
 * to the browser with correct Content-Type, Range support, and CORS headers.
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

  // Build the streaming URL
  const streamUrl = proxyUrl.includes("?")
    ? `${proxyUrl}&stream=1`
    : `${proxyUrl}?stream=1`;

  const handleError = useCallback(() => {
    const video = videoRef.current;
    const mediaError = video?.error;
    console.error(
      `[VideoPlayer] Error for "${name}":`,
      mediaError ? `code=${mediaError.code} message="${mediaError.message}"` : "unknown",
      `\nProxy URL: ${streamUrl}`
    );

    if (retryCount.current >= 2) {
      setError(true);
      return;
    }
    retryCount.current++;

    // Retry with cache-buster
    if (video) {
      video.src = `${streamUrl}&_r=${Date.now()}`;
      video.load();
    }
  }, [streamUrl, name]);

  if (error) {
    return (
      <div className="w-full aspect-video bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/50 text-sm">Video unavailable</p>
          <button
            type="button"
            onClick={() => {
              retryCount.current = 0;
              setError(false);
              const video = videoRef.current;
              if (video) {
                video.src = `${streamUrl}&_r=${Date.now()}`;
                video.load();
              }
            }}
            className="mt-2 text-xs text-brand-cerulean hover:underline"
          >
            Try again
          </button>
          <a
            href={proxyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 block text-xs text-white/30 hover:text-white/50"
          >
            Download instead
          </a>
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
