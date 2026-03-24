"use client";

const CLIENTS = ["TikTok", "Sony", "GEODIS", "Adidas", "L'Oreal", "PICO"] as const;

/**
 * Client logo strip with CSS-only marquee animation on mobile.
 * Uses text-based placeholders until actual SVG logos are provided.
 * Desktop: static row with hover pause. Mobile: auto-scrolling marquee.
 */
export function ClientLogos() {
  return (
    <div
      aria-label="Trusted by leading enterprises"
      className="relative overflow-hidden py-8"
    >
      {/* Fade edges on mobile */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-brand-black to-transparent md:hidden" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-brand-black to-transparent md:hidden" />

      {/* Desktop: centered static row */}
      <div className="hidden md:flex items-center justify-center gap-12">
        {CLIENTS.map((name) => (
          <span
            key={name}
            className="select-none text-lg font-bold uppercase tracking-widest text-neutral-500 transition-colors duration-200 hover:text-neutral-300"
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
              className="select-none whitespace-nowrap text-lg font-bold uppercase tracking-widest text-neutral-500"
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
              className="select-none whitespace-nowrap text-lg font-bold uppercase tracking-widest text-neutral-500"
              style={{ height: 40, lineHeight: "40px" }}
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
