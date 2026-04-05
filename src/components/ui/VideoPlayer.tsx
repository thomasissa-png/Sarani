"use client";

/**
 * VideoPlayer — Plays SharePoint videos via our proxy.
 *
 * HOW IT WORKS:
 * The <video src> points to our proxy with ?stream=1.
 * The proxy fetches the video from SharePoint server-side and serves it
 * to the browser with correct Content-Type and Range support.
 *
 * The proxy uses two strategies:
 * - Videos < 100MB: buffered (arrayBuffer) — most reliable on Node.js/Replit
 * - Videos >= 100MB: streamed via TransformStream piping
 *
 * The browser handles everything natively: play, pause, seek (via Range
 * requests that the proxy handles), fullscreen, etc.
 *
 * The proxy also handles HEAD requests (browsers send HEAD before playing).
 */

import { useState, useRef, useCallback, useEffect } from "react";

interface VideoPlayerProps {
  proxyUrl: string;
  mimeType: string;
  name: string;
}

export function VideoPlayer({ proxyUrl, mimeType, name }: VideoPlayerProps) {
  const [status, setStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const retryCount = useRef(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Build the streaming URL — append stream=1
  const streamUrl = proxyUrl.includes("?")
    ? `${proxyUrl}&stream=1`
    : `${proxyUrl}?stream=1`;

  // Probe the proxy before loading the full video.
  // A HEAD request checks that the proxy can reach SharePoint and
  // returns the right Content-Type. This catches errors early
  // (before the <video> element silently fails with no useful error).
  useEffect(() => {
    let cancelled = false;

    async function probe() {
      try {
        const res = await fetch(streamUrl, {
          method: "HEAD",
          signal: AbortSignal.timeout(15_000),
        });

        if (cancelled) return;

        if (!res.ok) {
          console.error(
            `[VideoPlayer] HEAD probe failed: ${res.status} for ${name}`
          );
          // Still attempt to load — some proxies don't implement HEAD
          setStatus("ready");
          return;
        }

        const ct = res.headers.get("Content-Type") ?? "";
        if (!ct.startsWith("video/") && ct !== "application/octet-stream") {
          console.warn(
            `[VideoPlayer] Unexpected Content-Type from probe: ${ct} for ${name}`
          );
        }

        setStatus("ready");
      } catch (err) {
        if (cancelled) return;
        console.error(`[VideoPlayer] HEAD probe error for ${name}:`, err);
        // Network error — still try to load the video
        setStatus("ready");
      }
    }

    probe();
    return () => {
      cancelled = true;
    };
  }, [streamUrl, name]);

  const handleCanPlay = useCallback(() => {
    setStatus("ready");
  }, []);

  const handleError = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      const mediaError = video.error;
      console.error(
        `[VideoPlayer] Playback error for ${name}:`,
        mediaError
          ? `code=${mediaError.code} message=${mediaError.message}`
          : "unknown"
      );
    }

    if (retryCount.current >= 2) {
      setStatus("error");
      return;
    }
    retryCount.current++;

    // Force reload by resetting the src with a cache-buster
    if (video) {
      const bustUrl = streamUrl.includes("&_r=")
        ? streamUrl.replace(/&_r=\d+/, `&_r=${Date.now()}`)
        : `${streamUrl}&_r=${Date.now()}`;
      video.src = bustUrl;
      video.load();
    }
  }, [streamUrl, name]);

  const handleRetry = useCallback(() => {
    retryCount.current = 0;
    setStatus("loading");

    const video = videoRef.current;
    if (video) {
      const bustUrl = `${streamUrl}&_r=${Date.now()}`;
      video.src = bustUrl;
      video.load();
    }

    // Re-run probe
    fetch(streamUrl, { method: "HEAD", signal: AbortSignal.timeout(15_000) })
      .then(() => setStatus("ready"))
      .catch(() => setStatus("ready"));
  }, [streamUrl]);

  if (status === "error") {
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
          <a
            href={proxyUrl}
            download={name}
            className="mt-1 block text-xs text-white/30 hover:text-white/50"
          >
            Download instead
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-video bg-black">
      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
        </div>
      )}
      <video
        ref={videoRef}
        controls
        preload="metadata"
        className="w-full h-full bg-black"
        playsInline
        src={streamUrl}
        onCanPlay={handleCanPlay}
        onError={handleError}
      >
        Your browser does not support video playback.
      </video>
    </div>
  );
}
