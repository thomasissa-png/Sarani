"use client";

import { motion, useReducedMotion } from "framer-motion";

/* ------------------------------------------------------------------ */
/*  Client SVG logos                                                   */
/*  TikTok, Sony, Adidas: official paths from simple-icons             */
/*  L'Oréal: stylised wordmark with accent detail                     */
/*  GEODIS: geometric wordmark                                        */
/*  PICO: bold wordmark                                               */
/* ------------------------------------------------------------------ */

interface ClientLogo {
  name: string;
  svg: React.ReactNode;
}

const LOGO_HEIGHT = 28;

function TikTokLogo() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" height={LOGO_HEIGHT} aria-label="TikTok">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  );
}

function SonyLogo() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" height={LOGO_HEIGHT} width={Math.round(LOGO_HEIGHT * 3)} aria-label="Sony">
      <path d="M8.5505 9.8881c.921 0 1.6574.2303 2.2209.7423.3848.3485.5999.8454.5939 1.3665a1.9081 1.9081 0 0 1-.5939 1.3726c-.5272.4848-1.3483.7423-2.221.7423-.8725 0-1.6785-.2575-2.2148-.7423-.3908-.3485-.609-.8484-.603-1.3726 0-.518.2182-1.015.603-1.3665.5-.4545 1.3847-.7423 2.2149-.7423zm.003 3.6692c.4606 0 .8878-.1606 1.1878-.4575.2999-.2999.4332-.6605.4332-1.1029 0-.4242-.1484-.821-.4333-1.1029-.2938-.2908-.7332-.4545-1.1877-.4545s-.8938.1637-1.1907.4545c-.2848.2818-.4333.6787-.4333 1.103-.006.409.1485.806.4333 1.1029.2969.2939.7332.4575 1.1907.4575zm-4.8418-1.9665c.1605.0424.315.094.4666.1636a1.352 1.352 0 0 1 .3787.2576c.197.206.309.4817.306.7665a.9643.9643 0 0 1-.3787.7788 2.0662 2.0662 0 0 1-.709.3485 3.7231 3.7231 0 0 1-1.1938.1697c-.352 0-.5467-.0406-.8138-.0962l-.077-.016c-.294-.0666-.5817-.1575-.8575-.2787a.0695.0695 0 0 0-.0424-.0121c-.0454 0-.0818.0394-.0818.0848v.203H.1212v-1.4786h.5242a.7559.7559 0 0 0 .1363.418c.2121.2607.4394.3607.6575.4395.3666.1212.7514.1848 1.1362.1969.5526 0 .8756-.134.9455-.163l.009-.0037.0062-.0023c.0616-.0226.3119-.1143.3119-.3916 0-.2743-.2338-.334-.387-.373l-.022-.0058c-.1708-.046-.562-.0872-.9897-.1323l-.1526-.016c-.4848-.0515-.9696-.1273-1.1968-.1758-.4977-.1097-.6942-.2917-.816-.4045l-.0082-.0076A1.0192 1.0192 0 0 1 0 11.1608c0-.497.3394-.797.7575-.9817.4454-.2.9756-.288 1.4392-.288.8211.0031 1.4877.2697 1.727.394.097.0515.1455-.0121.1455-.0606v-.1484h.5272v1.2876h-.4727a.9056.9056 0 0 0-.2939-.4909 1.289 1.289 0 0 0-.297-.1787c-.3968-.1667-.821-.2515-1.2513-.2455-.4423 0-.8665.085-1.0786.2153-.1333.0818-.2.1848-.2.306 0 .1727.1454.2424.2182.2636.1967.0597.6328.103.972.1369.0736.0073.1426.0142.2036.0206.3272.0334 1.012.1243 1.315.2zm18.1673-.9966v-.4787H24v.4696h-.4757c-.1727 0-.2424.0334-.3727.1788l-1.4271 1.63a.098.098 0 0 0-.0182.0698v.7423a1.106 1.106 0 0 0 .0121.103.1496.1496 0 0 0 .1.0909.9368.9368 0 0 0 .1303.009h.4848v.4698h-2.5724v-.4697h.4606a.9343.9343 0 0 0 .1302-.0091.1627.1627 0 0 0 .1031-.091.5626.5626 0 0 0 .009-.1v-.7422c0-.0242 0-.0242-.0333-.0636a606.7592 606.7592 0 0 0-1.4119-1.6028c-.0758-.0788-.2061-.2061-.406-.2061h-.4576v-.4696h2.5876v.4696h-.3121c-.0697 0-.1182.0697-.0576.1455 0 0 .8696 1.0392.8787 1.0513.0091.0122.0152.0122.0273.003.0121-.009.8938-1.0453.8999-1.0543a.0912.0912 0 0 0-.0182-.1273.1095.1095 0 0 0-.0606-.0182zm-6.284-.0031h.4848c.2212 0 .2606.0848.2636.2909l.0273 1.5664-2.5815-2.324H11.944v.4697h.412c.297 0 .3182.1636.3182.309v2.2138c.0004.1285.0009.295-.1818.295h-.506v.4667h2.1634v-.4697h-.5273c-.212 0-.2211-.097-.2242-.303v-1.8816l2.9724 2.6511h.7575l-.0394-2.9966c.003-.218.0182-.2908.2424-.2908h.4726v-.4697H15.595Z" />
    </svg>
  );
}

function AdidasLogo() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" height={LOGO_HEIGHT} width={Math.round(LOGO_HEIGHT * 1.5)} aria-label="Adidas">
      <path d="m24 19.535-8.697-15.07-4.659 2.687 7.145 12.383Zm-8.287 0L9.969 9.59 5.31 12.277l4.192 7.258ZM4.658 14.723l2.776 4.812H1.223L0 17.41Z" />
    </svg>
  );
}

/* L'Oreal — stylised serif wordmark as SVG path */
function LOrealLogo() {
  return (
    <svg
      viewBox="0 0 200 40"
      height={LOGO_HEIGHT}
      width={Math.round(LOGO_HEIGHT * 5)}
      fill="currentColor"
      aria-label="L'Oreal"
    >
      {/* L */}
      <path d="M4 6h6v22h14v6H4V6z" />
      {/* apostrophe */}
      <path d="M28 6h5v8l-3 4h-3l2-4V6z" />
      {/* O */}
      <path d="M46 5c9.4 0 14 6 14 15s-4.6 15-14 15-14-6-14-15 4.6-15 14-15zm0 6c-4.5 0-7.5 3.5-7.5 9s3 9 7.5 9 7.5-3.5 7.5-9-3-9-7.5-9z" />
      {/* r */}
      <path d="M66 14h5.5v4.5h.2c1.5-3 4-5.2 7.5-5.2 1.2 0 2.2.2 2.8.4v6c-.8-.3-2-.5-3.2-.5-4 0-7 2.5-7 7v8h-5.8V14z" />
      {/* e-acute */}
      <path d="M84 25c0-7.2 4.5-12 11.2-12 7 0 10.8 5 10.8 13H89.5c.5 4 3.2 6.5 7.2 6.5 3 0 5-1.2 6.2-3.5l4.8 2.5c-2 3.8-6 6-11.2 6C89 37.5 84 32.5 84 25zm5.5-2.5h10.5c-.3-3.5-2.5-5.5-5.2-5.5-3 0-4.8 2-5.3 5.5z" />
      <path d="M96 2l-4 8h3.5l5-8H96z" />
      {/* a */}
      <path d="M112 25.5c0-7 4.5-12.2 10-12.2 3.5 0 6 1.5 7.5 4h.2V14h5.5v20h-5.5v-3.5h-.2c-1.5 2.5-4 4.2-7.5 4.2-5.5 0-10-5.2-10-9.2zm5.8 0c0 4 2.8 6.5 6 6.5s6-2.5 6-6.5-2.8-6.5-6-6.5-6 2.5-6 6.5z" />
      {/* l */}
      <path d="M141 6h5.8v28H141V6z" />
    </svg>
  );
}

/* GEODIS — bold geometric sans-serif wordmark */
function GEODISLogo() {
  return (
    <svg
      viewBox="0 0 220 40"
      height={LOGO_HEIGHT}
      width={Math.round(LOGO_HEIGHT * 5.5)}
      fill="currentColor"
      aria-label="GEODIS"
    >
      {/* G */}
      <path d="M4 20c0-10 7-17 17-17 6 0 11 2.5 14 7l-6 4c-2-3-4.5-4.5-8-4.5-6 0-10.5 4.5-10.5 10.5S15 30.5 21 30.5c4 0 7-1.5 8.5-4.5V23H21v-6h15v16h-6v-2.5c-2.5 3-6.5 4.5-11 4.5C10 35 4 29 4 20z" />
      {/* E */}
      <path d="M42 4h24v6.5H49v7h15v6H49v7h18V37H42V4z" />
      {/* O */}
      <path d="M86 3c10 0 17.5 7 17.5 17s-7.5 17-17.5 17-17.5-7-17.5-17S76 3 86 3zm0 7c-6 0-10.5 4.5-10.5 10S80 30 86 30s10.5-4.5 10.5-10S92 10 86 10z" />
      {/* D */}
      <path d="M110 4h13c11 0 18 6.5 18 16.5S134 37 123 37h-13V4zm7 6.5v20h5.5c6.5 0 11-4 11-10s-4.5-10-11-10H117z" />
      {/* I */}
      <path d="M148 4h7v33h-7V4z" />
      {/* S */}
      <path d="M175 10.5c-2-2-5-3.5-8.5-3.5-3 0-5.5 1.5-5.5 4 0 3 3.5 3.8 7.5 5 5.5 1.5 11 3.5 11 10.5 0 7.5-6 11-13.5 11-5.5 0-10.5-2-14-5.5l5-5c2.5 2.5 5.5 4 9.5 4 3.5 0 6-1.5 6-4.5s-3.5-4-8-5.5C160 19.5 155 17 155 11c0-7 6-11 13-11 5 0 9 2 12 5l-5 5.5z" />
    </svg>
  );
}

/* PICO — bold geometric wordmark */
function PICOLogo() {
  return (
    <svg
      viewBox="0 0 160 40"
      height={LOGO_HEIGHT}
      width={Math.round(LOGO_HEIGHT * 4)}
      fill="currentColor"
      aria-label="PICO"
    >
      {/* P */}
      <path d="M4 4h14c8 0 13 4.5 13 11.5S26 27 18 27h-7v10H4V4zm7 6.5v10h6c4 0 6.5-2 6.5-5s-2.5-5-6.5-5h-6z" />
      {/* I */}
      <path d="M38 4h7v33h-7V4z" />
      {/* C */}
      <path d="M72 3c6 0 10.5 2.5 13.5 7l-5.5 4c-2-3-4.5-4.5-8-4.5-6 0-10.5 4.5-10.5 10.5S66 30.5 72 30.5c3.5 0 6-1.5 8-4.5l5.5 4c-3 4.5-7.5 7-13.5 7-10 0-17.5-7-17.5-17S62 3 72 3z" />
      {/* O */}
      <path d="M107 3c10 0 17.5 7 17.5 17s-7.5 17-17.5 17-17.5-7-17.5-17S97 3 107 3zm0 7c-6 0-10.5 4.5-10.5 10S101 30 107 30s10.5-4.5 10.5-10S113 10 107 10z" />
    </svg>
  );
}

const CLIENTS: ClientLogo[] = [
  { name: "TikTok", svg: <TikTokLogo /> },
  { name: "Sony", svg: <SonyLogo /> },
  { name: "GEODIS", svg: <GEODISLogo /> },
  { name: "Adidas", svg: <AdidasLogo /> },
  { name: "L'Oreal", svg: <LOrealLogo /> },
  { name: "PICO", svg: <PICOLogo /> },
];

function ClientItem({ client }: { client: ClientLogo }) {
  return (
    <span
      className="flex items-center select-none opacity-40 grayscale transition-all duration-300 hover:opacity-100 hover:grayscale-0"
      style={{ height: 40 }}
    >
      {client.svg}
    </span>
  );
}

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
