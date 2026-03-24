"use client";

import { motion, useReducedMotion } from "framer-motion";
import { FloatingDot } from "@/components/ui/animated";
import { TrackedCta } from "@/components/home/tracked-cta";
import Link from "next/link";
import type { ReactNode } from "react";

/* ---------- Animated Hero Dots ---------- */

export function AnimatedHeroDots() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      <FloatingDot
        className="absolute top-[18%] left-[42%] h-3 w-3 rounded-full bg-brand-lemon"
        delay={0}
        distance={10}
      />
      <FloatingDot
        className="absolute top-[15%] right-[38%] h-2.5 w-2.5 rounded-full bg-brand-cerulean"
        delay={0.5}
        distance={8}
      />
      <FloatingDot
        className="absolute top-[55%] left-[48%] h-2 w-2 rounded-full bg-brand-flame"
        delay={1}
        distance={6}
      />
      <FloatingDot
        className="absolute top-[52%] right-[32%] h-2.5 w-2.5 rounded-full bg-brand-lemon"
        delay={1.5}
        distance={9}
      />
      <FloatingDot
        className="absolute top-[30%] left-[25%] h-1.5 w-1.5 rounded-full bg-brand-flame"
        delay={0.8}
        distance={7}
      />
      <FloatingDot
        className="absolute top-[40%] right-[22%] h-1.5 w-1.5 rounded-full bg-brand-cerulean"
        delay={1.2}
        distance={8}
      />
    </div>
  );
}

/* ---------- Animated Hero Content ---------- */

const VALUE_PROPS = [
  "24/7 availability",
  "D+1 deliveries",
  "Fixed prices",
  "Unlimited revisions",
] as const;

export function AnimatedHeroContent() {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return (
      <div className="relative z-10 mx-auto max-w-screen-xl px-5 text-center md:px-8">
        <h1 className="mb-10 text-6xl font-bold leading-[1.05] tracking-tight text-brand-black sm:text-7xl lg:text-8xl xl:text-[7rem]">
          Unlimited
          <br />
          Creativity
        </h1>
        <div className="mb-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 md:gap-x-12">
          {VALUE_PROPS.map((prop) => (
            <p
              key={prop}
              className="text-base font-bold text-brand-black md:text-lg"
            >
              {prop}
            </p>
          ))}
        </div>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <TrackedCta
            href="/contact"
            variant="primary"
            trackingLocation="hero"
            trackingLabel="lets_chat"
          >
            Let&apos;s chat
          </TrackedCta>
          <TrackedCta
            href="/pricing"
            variant="secondary"
            trackingLocation="hero"
            trackingLabel="discover_prices"
          >
            Discover our prices
          </TrackedCta>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 mx-auto max-w-screen-xl px-5 text-center md:px-8">
      {/* Title — staggered word slide-up */}
      <h1 className="mb-10 text-6xl font-bold leading-[1.05] tracking-tight text-brand-black sm:text-7xl lg:text-8xl xl:text-[7rem]">
        <span className="block overflow-hidden">
          <motion.span
            className="inline-block"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{
              duration: 0.8,
              delay: 0.2,
              ease: [0.25, 0.1, 0.25, 1],
            }}
          >
            Unlimited
          </motion.span>
        </span>
        <span className="block overflow-hidden">
          <motion.span
            className="inline-block"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{
              duration: 0.8,
              delay: 0.35,
              ease: [0.25, 0.1, 0.25, 1],
            }}
          >
            Creativity
          </motion.span>
        </span>
      </h1>

      {/* 4 value props — stagger fade-in */}
      <div className="mb-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 md:gap-x-12">
        {VALUE_PROPS.map((prop, i) => (
          <motion.p
            key={prop}
            className="text-base font-bold text-brand-black md:text-lg"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.5,
              delay: 0.8 + i * 0.1,
              ease: [0.25, 0.1, 0.25, 1],
            }}
          >
            {prop}
          </motion.p>
        ))}
      </div>

      {/* CTAs — fade-in after value props */}
      <motion.div
        className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.6,
          delay: 1.3,
          ease: [0.25, 0.1, 0.25, 1],
        }}
      >
        <TrackedCta
          href="/contact"
          variant="primary"
          trackingLocation="hero"
          trackingLabel="lets_chat"
        >
          Let&apos;s chat
        </TrackedCta>
        <TrackedCta
          href="/pricing"
          variant="secondary"
          trackingLocation="hero"
          trackingLabel="discover_prices"
        >
          Discover our prices
        </TrackedCta>
      </motion.div>
    </div>
  );
}
