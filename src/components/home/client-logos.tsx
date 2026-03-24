"use client";

import { motion, useReducedMotion } from "framer-motion";

const CLIENTS = ["TikTok", "Sony", "GEODIS", "Adidas", "L'Oreal", "PICO"] as const;

/**
 * Client logo strip — V2 light design.
 * Desktop: static row. Mobile: auto-scrolling marquee.
 * Animated: fade-in on scroll.
 */
export function ClientLogos() {
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      aria-label="Trusted by leading enterprises"
      className="relative overflow-hidden py-8"
      initial={prefersReduced ? {} : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {/* Fade edges on mobile */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-brand-white to-transparent md:hidden" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-brand-white to-transparent md:hidden" />

      {/* Desktop: centered static row */}
      <div className="hidden md:flex items-center justify-center gap-12">
        {CLIENTS.map((name) => (
          <span
            key={name}
            className="select-none text-lg font-bold uppercase tracking-widest text-neutral-400 transition-colors duration-200 hover:text-brand-black"
            style={{ height: 40, lineHeight: "40px" }}
          >
            {name}
          </span>
        ))}
      </div>

      {/* Mobile: marquee animation */}
      <div className="flex md:hidden group hover:[animation-play-state:paused]">
        <div className="animate-marquee flex shrink-0 items-center gap-12">
          {CLIENTS.map((name) => (
            <span
              key={name}
              className="select-none whitespace-nowrap text-lg font-bold uppercase tracking-widest text-neutral-400"
              style={{ height: 40, lineHeight: "40px" }}
            >
              {name}
            </span>
          ))}
        </div>
        {/* Duplicate for seamless loop */}
        <div className="animate-marquee flex shrink-0 items-center gap-12 pl-12" aria-hidden="true">
          {CLIENTS.map((name) => (
            <span
              key={`dup-${name}`}
              className="select-none whitespace-nowrap text-lg font-bold uppercase tracking-widest text-neutral-400"
              style={{ height: 40, lineHeight: "40px" }}
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
