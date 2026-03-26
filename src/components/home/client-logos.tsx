"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";

/* ------------------------------------------------------------------ */
/*  Client logos — real PNG files ONLY                                  */
/*  RULE: NEVER recreate or approximate a logo. Use the original file. */
/*  Clients: TikTok, Sony, Adidas, LEGO, Bose, IKEA                   */
/* ------------------------------------------------------------------ */

interface ClientLogo {
  name: string;
  src: string;
  width: number;
  height: number;
}

const CLIENTS: ClientLogo[] = [
  { name: "TikTok", src: "/client-logo-tiktok.png", width: 78, height: 32 },
  { name: "Sony", src: "/client-logo-sony.png", width: 50, height: 28 },
  { name: "Adidas", src: "/client-logo-adidas.png", width: 63, height: 38 },
  { name: "LEGO", src: "/client-logo-lego.png", width: 60, height: 34 },
  { name: "Bose", src: "/client-logo-bose.png", width: 48, height: 48 },
  { name: "IKEA", src: "/client-logo-ikea.png", width: 51, height: 34 },
];

function ClientItem({ client }: { client: ClientLogo }) {
  return (
    <span
      className="flex items-center justify-center select-none opacity-40 grayscale transition-all duration-300 hover:opacity-100 hover:grayscale-0"
      style={{ height: 52, minWidth: 60 }}
    >
      <Image
        src={client.src}
        alt={client.name}
        width={client.width}
        height={client.height}
        className="w-auto object-contain"
        style={{ height: client.height }}
      />
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

      {/* Fade edges on mobile (only when marquee is active) */}
      {!prefersReduced && (
        <>
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-brand-white to-transparent md:hidden" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-brand-white to-transparent md:hidden" />
        </>
      )}

      {/* Desktop: centered static grid */}
      <div className="hidden md:flex items-center justify-center gap-14">
        {CLIENTS.map((client) => (
          <ClientItem key={client.name} client={client} />
        ))}
      </div>

      {/* Mobile: marquee animation OR static flex when prefers-reduced-motion */}
      {prefersReduced ? (
        <div className="flex md:hidden flex-wrap items-center justify-center gap-8">
          {CLIENTS.map((client) => (
            <ClientItem key={client.name} client={client} />
          ))}
        </div>
      ) : (
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
      )}
    </motion.div>
  );
}
