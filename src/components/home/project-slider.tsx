"use client";

import { useEffect, useRef, useState } from "react";

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
  { client: "Adidas", title: "World Athlete Championships", category: "Marketing Assets" },
  { client: "IKEA", title: "Cooking Sessions", category: "Marketing Assets" },
  { client: "Lego", title: "Le Grand Tournoi Des Champs", category: "Marketing Assets" },
  { client: "IKEA", title: "Billythèque", category: "Marketing Assets" },
  { client: "Sony", title: "2023 BRAVIA Launch", category: "Graphic Design" },
  { client: "TikTok", title: "Ramadan 2023", category: "Marketing Assets" },
  { client: "PICO", title: "Spring 2023 Promotion", category: "Marketing Assets" },
  { client: "Air Corsica", title: "Route Launches", category: "Videos" },
] as const;

function ProjectCard({ client, title, category }: (typeof PROJECTS)[number]) {
  return (
    <div className="group relative w-[320px] shrink-0 overflow-hidden rounded-2xl bg-surface-elevated sm:w-[400px]">
      {/* Placeholder for project image */}
      <div className="aspect-[4/3] w-full bg-neutral-300 transition-transform duration-300 group-hover:scale-105" />
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
