"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";

/* ------------------------------------------------------------------ */
/*  Client logos — real PNG files + TikTok SVG                         */
/*  Clients: TikTok, Sony, Adidas, LEGO, Bose, IKEA                   */
/* ------------------------------------------------------------------ */

interface ClientLogo {
  name: string;
  src?: string;
  svg?: true;
  width: number;
  height: number;
}

const CLIENTS: ClientLogo[] = [
  { name: "TikTok", src: "/client-logo-tiktok.png", width: 100, height: 28 },
  { name: "Sony", src: "/client-logo-sony.png", width: 90, height: 28 },
  { name: "Adidas", svg: true, width: 60, height: 40 },
  { name: "LEGO", src: "/client-logo-lego.png", width: 56, height: 28 },
  { name: "Bose", svg: true, width: 80, height: 20 },
  { name: "IKEA", src: "/client-logo-ikea.png", width: 56, height: 28 },
];

/** Inline SVG logos — guaranteed transparent background, crisp at any size */
function AdidasLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 80 55" fill="currentColor" aria-hidden="true">
      <path d="M40.1 55h15.6L30.3 12.5l-7.8 13.2L40.1 55zM56.8 55h18.5L47 12.5l-7.8 13.2L56.8 55zM14.6 36.4L6.8 49.6 0 55h23.3l-8.7-18.6z" />
    </svg>
  );
}

function BoseLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 42" fill="currentColor" aria-hidden="true">
      <path d="M0 38.5h12.1V3.6H0v34.9zm165.7-35L143 38.5h13.5l4.1-6.3h17.8l4.1 6.3h13.6L173.5 3.5h-7.8zm2 12.6l5.6 10.5h-11.3l5.7-10.5zM86.3 3.5H62.1v35h24.2c9.7 0 16.5-4 16.5-12.1 0-5-2.8-8.8-7.6-10.5 3.7-1.8 5.8-5 5.8-9 0-7.4-5.8-11.4-14.7-11.4h0zM75.4 11h10.4c3.5 0 5.3 1.6 5.3 4.5 0 2.8-1.8 4.5-5.3 4.5H75.4V11zm11.4 20.1H75.4v-9.8h11.4c4 0 6 1.9 6 4.9s-2 4.9-6 4.9zM129.6 8.8c-6-4-13.5-5.3-20.5-5.3-13.5 0-22.9 7-22.9 18s9.4 18 22.9 18c7.1 0 14.6-1.4 20.5-5.3v-14h-12.4v8.5c-2.3 1-5.2 1.6-8.1 1.6-6.6 0-10.5-3.5-10.5-8.8s3.9-8.8 10.5-8.8c2.9 0 5.8.6 8.1 1.6v-5.5h12.4z" />
    </svg>
  );
}

function ClientItem({ client }: { client: ClientLogo }) {
  return (
    <span
      className="flex items-center justify-center select-none opacity-40 grayscale transition-all duration-300 hover:opacity-100 hover:grayscale-0"
      style={{ height: 48, minWidth: 60 }}
    >
      {client.svg ? (
        client.name === "Adidas" ? (
          <AdidasLogo className="h-8 w-auto text-brand-black" />
        ) : (
          <BoseLogo className="h-5 w-auto text-brand-black" />
        )
      ) : (
        <Image
          src={client.src!}
          alt={client.name}
          width={client.width}
          height={client.height}
          className="h-7 w-auto object-contain"
        />
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
