"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";

/* ------------------------------------------------------------------ */
/*  Client logos — real PNG files + TikTok SVG                         */
/*  Clients: TikTok, Sony, Adidas, LEGO, Bose, IKEA                   */
/* ------------------------------------------------------------------ */

interface ClientLogo {
  name: string;
  /** PNG path in /public, or null for SVG-only (TikTok) */
  src: string | null;
  /** Width to display at (height auto-calculated from aspect ratio) */
  width: number;
  height: number;
}

const CLIENTS: ClientLogo[] = [
  { name: "TikTok", src: null, width: 28, height: 28 },
  { name: "Sony", src: "/client-logo-sony.png", width: 80, height: 28 },
  { name: "Adidas", src: "/client-logo-adidas.png", width: 40, height: 40 },
  { name: "LEGO", src: "/client-logo-lego.png", width: 44, height: 44 },
  { name: "Bose", src: "/client-logo-bose.png", width: 80, height: 28 },
  { name: "IKEA", src: "/client-logo-ikea.png", width: 44, height: 44 },
];

function TikTokSvg() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" height={28} aria-label="TikTok">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  );
}

function ClientItem({ client }: { client: ClientLogo }) {
  return (
    <span
      className="flex items-center justify-center select-none opacity-40 grayscale transition-all duration-300 hover:opacity-100 hover:grayscale-0"
      style={{ height: 48, minWidth: 48 }}
    >
      {client.src ? (
        <Image
          src={client.src}
          alt={client.name}
          width={client.width}
          height={client.height}
          className="h-auto object-contain"
          style={{ maxHeight: 40 }}
        />
      ) : (
        <TikTokSvg />
      )}
    </span>
  );
}

/**
 * Client logo strip — real brand logos.
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
      {/* "Trusted by" label */}
      <p className="mb-6 text-center text-xs font-medium uppercase tracking-widest text-neutral-400">
        Trusted by
      </p>

      {/* Fade edges on mobile */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-brand-white to-transparent md:hidden" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-brand-white to-transparent md:hidden" />

      {/* Desktop: centered static grid */}
      <div className="hidden md:flex items-center justify-center gap-14">
        {CLIENTS.map((client) => (
          <ClientItem key={client.name} client={client} />
        ))}
      </div>

      {/* Mobile: marquee animation */}
      <div className="flex md:hidden group hover:[animation-play-state:paused]">
        <div className="animate-marquee flex shrink-0 items-center gap-12">
          {CLIENTS.map((client) => (
            <ClientItem key={client.name} client={client} />
          ))}
        </div>
        {/* Duplicate for seamless loop */}
        <div className="animate-marquee flex shrink-0 items-center gap-12 pl-12" aria-hidden="true">
          {CLIENTS.map((client) => (
            <ClientItem key={`dup-${client.name}`} client={client} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
