"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

/**
 * Auto-scrolling horizontal slider of project images.
 * Matches V2 Webflow hero carousel behavior.
 * Uses CSS animation (no JS scroll) — speed adjusts by breakpoint via globals.css.
 *
 * Accessibility:
 * - Pauses on hover (desktop)
 * - Pauses on touch (mobile)
 * - Respects prefers-reduced-motion: stops auto-scroll entirely
 * - Position indicator dots below
 */

const PROJECTS = [
  { client: "Adidas", title: "The Sound of Superstar(s)", category: "Event Campaign", image: "/images/hero-adidas-arena.png" },
  { client: "Lego", title: "Le Grand Tournoi Des Champs", category: "Marketing Assets", image: "/images/hero-lego.png" },
  { client: "Sony", title: "ULT Power Sound", category: "Campaign", image: "/images/hero-sony-ult.png" },
  { client: "TikTok", title: "Unlearn Beauty 3.0", category: "Marketing Assets", image: "/images/hero-tiktok-beauty.png" },
  { client: "Bose", title: "Smart Ultra Soundbar", category: "Graphic Design", image: "/images/hero-bose.png" },
  { client: "Air Corsica", title: "Route Launches", category: "Marketing Assets", image: "/images/hero-aircorsica.png" },
  { client: "Sony", title: "ZV-E10 II Camera", category: "Graphic Design", image: "/images/hero-sony-camera.png" },
  { client: "Adidas", title: "Superstar", category: "Campaign", image: "/images/hero-adidas-superstar.png" },
  { client: "TikTok", title: "Creator Content", category: "Video Production", image: "/images/hero-tiktok-creator.png" },
] as const;

function ProjectCard({ client, title, category, image }: (typeof PROJECTS)[number]) {
  return (
    <div className="group relative w-[320px] shrink-0 overflow-hidden rounded-2xl bg-surface-elevated sm:w-[400px]">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-200">
        <Image
          src={image}
          alt={`${client} — ${title}`}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 320px, 400px"
        />
      </div>
      <div className="p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-brand-flame">
          {client}
        </p>
        <p className="mt-1 text-sm font-bold text-brand-black">
          {title}
        </p>
        <p className="text-xs text-neutral-500">{category}</p>
      </div>
    </div>
  );
}

/** Hook: true when the user prefers reduced motion */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return reduced;
}

export function ProjectSlider() {
  const prefersReduced = usePrefersReducedMotion();
  const [paused, setPaused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  // Track the approximate active slide based on scroll position via animation
  useEffect(() => {
    if (prefersReduced || !trackRef.current) return;

    const interval = setInterval(() => {
      if (!trackRef.current) return;
      const el = trackRef.current;
      const style = window.getComputedStyle(el);
      const matrix = new DOMMatrix(style.transform);
      const translateX = Math.abs(matrix.m41);
      // Each card is ~320px + 24px gap = ~344px on mobile, ~424px on desktop
      const cardWidth = window.innerWidth >= 640 ? 424 : 344;
      const idx = Math.round(translateX / cardWidth) % PROJECTS.length;
      setActiveIndex(idx);
    }, 500);

    return () => clearInterval(interval);
  }, [prefersReduced]);

  const shouldAnimate = !prefersReduced && !paused;

  return (
    <div className="space-y-4">
      <div
        className="overflow-hidden"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
      >
        <div
          ref={trackRef}
          className={`flex gap-6 ${shouldAnimate ? "animate-slideshow" : ""}`}
          style={
            shouldAnimate
              ? undefined
              : { animationPlayState: "paused" }
          }
        >
          {PROJECTS.map((p) => (
            <ProjectCard key={`${p.client}-${p.title}`} {...p} />
          ))}
          {/* Duplicate for seamless loop */}
          {PROJECTS.map((p) => (
            <ProjectCard key={`dup-${p.client}-${p.title}`} {...p} />
          ))}
        </div>
      </div>

      {/* Position indicator dots */}
      <div className="flex items-center justify-center gap-1.5" aria-hidden="true">
        {PROJECTS.map((p, i) => (
          <span
            key={`dot-${p.client}-${p.title}`}
            className={`inline-block h-1.5 w-1.5 rounded-full transition-all duration-300 ${
              i === activeIndex
                ? "bg-brand-flame w-4"
                : "bg-neutral-300"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
