"use client";

import { motion, useReducedMotion } from "framer-motion";
import { FloatingDot } from "@/components/ui/animated";
import { TrackedCta } from "@/components/home/tracked-cta";
import Link from "next/link";
import type { ReactNode } from "react";

/* ---------- Pill badge accent colors ---------- */

const PILL_STYLES = [
  "bg-brand-lemon/10 text-brand-black",
  "bg-brand-cerulean/10 text-brand-black",
  "bg-brand-flame/10 text-brand-black",
  "bg-neutral-100 text-brand-black",
] as const;

/* ---------- Animated Hero Dots (larger, min 12-20px) ---------- */

export function AnimatedHeroDots() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      <FloatingDot
        className="absolute top-[18%] left-[42%] h-5 w-5 rounded-full bg-brand-lemon"
        delay={0}
        distance={14}
      />
      <FloatingDot
        className="absolute top-[12%] right-[35%] h-4 w-4 rounded-full bg-brand-cerulean"
        delay={0.5}
        distance={12}
      />
      <FloatingDot
        className="absolute top-[55%] left-[48%] h-3.5 w-3.5 rounded-full bg-brand-flame"
        delay={1}
        distance={10}
      />
      <FloatingDot
        className="absolute top-[50%] right-[28%] h-5 w-5 rounded-full bg-brand-lemon"
        delay={1.5}
        distance={16}
      />
      <FloatingDot
        className="absolute top-[30%] left-[22%] h-3 w-3 rounded-full bg-brand-flame"
        delay={0.8}
        distance={11}
      />
      <FloatingDot
        className="absolute top-[40%] right-[18%] h-4 w-4 rounded-full bg-brand-cerulean"
        delay={1.2}
        distance={13}
      />
      {/* Extra large decorative dots */}
      <FloatingDot
        className="absolute top-[65%] left-[30%] h-6 w-6 rounded-full bg-brand-lemon/60"
        delay={0.3}
        distance={18}
      />
      <FloatingDot
        className="absolute top-[25%] right-[12%] h-5 w-5 rounded-full bg-brand-cerulean/50"
        delay={1.8}
        distance={15}
      />
    </div>
  );
}

/* ---------- Value props ---------- */

const SUBTITLE =
  "Enterprise creative shouldn\u2019t mean enterprise delays. 24-hour delivery. Fixed prices. Unlimited revisions.";

const VALUE_PROPS = [
  "24/7 availability",
  "D+1 deliveries",
  "Fixed prices",
  "Unlimited revisions",
] as const;

/* ---------- Animated Hero Content — split layout ---------- */

export function AnimatedHeroContent() {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return (
      <div className="relative z-10 mx-auto w-full max-w-screen-xl px-5 md:px-8">
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
          <h1 className="mb-4 text-6xl font-bold leading-[1.05] tracking-tight text-brand-black sm:text-7xl lg:text-8xl xl:text-[7rem]">
            Unlimited
            <br />
            Creativity
          </h1>
          <p className="mb-8 max-w-2xl text-lg text-neutral-600 md:text-xl">
            {SUBTITLE}
          </p>
          <div className="mb-10 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            {VALUE_PROPS.map((prop, i) => (
              <span
                key={prop}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${PILL_STYLES[i]}`}
              >
                {prop}
              </span>
            ))}
          </div>
          <div className="flex flex-col items-center gap-4 sm:flex-row lg:items-start">
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
      </div>
    );
  }

  return (
    <div className="relative z-10 mx-auto w-full max-w-screen-xl px-5 md:px-8">
      <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
        {/* Title — staggered word slide-up */}
        <h1 className="mb-4 text-6xl font-bold leading-[1.05] tracking-tight text-brand-black sm:text-7xl lg:text-8xl xl:text-[7rem]">
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

        {/* Subtitle — persona-focused value proposition */}
        <motion.p
          className="mb-8 max-w-2xl text-lg text-neutral-600 md:text-xl"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.6,
            delay: 0.6,
            ease: [0.25, 0.1, 0.25, 1],
          }}
        >
          {SUBTITLE}
        </motion.p>

        {/* 4 value props — pill badges with stagger fade-in */}
        <div className="mb-10 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
          {VALUE_PROPS.map((prop, i) => (
            <motion.span
              key={prop}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${PILL_STYLES[i]}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: 0.8 + i * 0.1,
                ease: [0.25, 0.1, 0.25, 1],
              }}
            >
              {prop}
            </motion.span>
          ))}
        </div>

        {/* CTAs — fade-in after value props */}
        <motion.div
          className="flex flex-col items-center gap-4 sm:flex-row lg:items-start"
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
    </div>
  );
}
