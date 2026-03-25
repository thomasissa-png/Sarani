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
  "bg-brand-black/8 text-brand-black",
] as const;

/* ---------- Animated Hero Dots (larger, min 12-20px) ---------- */

export function AnimatedHeroDots() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      {/* Dots concentrated in the right half only */}
      <FloatingDot
        className="absolute top-[15%] right-[30%] h-4 w-4 rounded-full bg-brand-cerulean hidden lg:block"
        delay={0.5}
        distance={12}
      />
      <FloatingDot
        className="absolute top-[35%] right-[12%] h-5 w-5 rounded-full bg-brand-lemon hidden lg:block"
        delay={0}
        distance={14}
      />
      <FloatingDot
        className="absolute top-[50%] right-[25%] h-3.5 w-3.5 rounded-full bg-brand-flame hidden lg:block"
        delay={1}
        distance={10}
      />
      <FloatingDot
        className="absolute top-[25%] right-[18%] h-5 w-5 rounded-full bg-brand-cerulean/50 hidden lg:block"
        delay={1.8}
        distance={15}
      />
      <FloatingDot
        className="absolute top-[65%] right-[15%] h-6 w-6 rounded-full bg-brand-lemon/60 hidden lg:block"
        delay={0.3}
        distance={18}
      />
    </div>
  );
}

/* ---------- Pre-headline ---------- */

const PRE_HEADLINE = "TIKTOK. SONY. ADIDAS. GEODIS.";

/* ---------- Value props ---------- */

const SUBTITLE =
  "The agency enterprises call when every other agency says two weeks. Fixed prices. Unlimited revisions. First project satisfaction or no invoice.";

const VALUE_PROPS = [
  "24/7 availability",
  "D+1 deliveries",
  "Fixed prices",
  "Unlimited revisions",
] as const;

/* ---------- Hero stats ---------- */

const HERO_STATS = [
  { value: "35+", label: "experts" },
  { value: "5", label: "continents" },
  { value: "18", label: "languages" },
] as const;

/* ---------- Animated Hero Content — split layout ---------- */

export function AnimatedHeroContent() {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return (
      <div className="relative z-10 mx-auto w-full max-w-screen-xl px-5 md:px-8">
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
          <span className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-brand-cerulean-dark">
            {PRE_HEADLINE}
          </span>
          <h1 className="mb-4 text-6xl font-bold leading-[1.05] tracking-tight text-brand-black sm:text-7xl lg:text-8xl xl:text-[7rem]">
            Enterprise creative.
            <br />
            Delivered in 24 hours.
          </h1>
          <p className="mb-6 max-w-2xl text-lg text-neutral-600 md:text-xl">
            {SUBTITLE}
          </p>
          {/* Stats row */}
          <div className="mb-8 flex items-center gap-8">
            {HERO_STATS.map((stat) => (
              <div key={stat.label} className="flex flex-col items-center lg:items-start">
                <span className="text-2xl font-bold text-brand-black">{stat.value}</span>
                <span className="text-xs uppercase tracking-wide text-neutral-500">{stat.label}</span>
              </div>
            ))}
          </div>
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
              trackingLabel="start_a_project"
            >
              Start a project
            </TrackedCta>
            <TrackedCta
              href="/work"
              variant="secondary"
              trackingLocation="hero"
              trackingLabel="see_our_work"
            >
              See our work
            </TrackedCta>
          </div>
          <p className="mt-3 text-sm text-neutral-500">
            First project satisfaction or no invoice.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 mx-auto w-full max-w-screen-xl px-5 md:px-8">
      <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
        {/* Pre-headline tag */}
        <motion.span
          className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-brand-cerulean-dark"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
        >
          {PRE_HEADLINE}
        </motion.span>

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
              Enterprise creative.
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
              Delivered in 24 hours.
            </motion.span>
          </span>
        </h1>

        {/* Subtitle — persona-focused value proposition */}
        <motion.p
          className="mb-6 max-w-2xl text-lg text-neutral-600 md:text-xl"
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

        {/* Stats row — social proof */}
        <motion.div
          className="mb-8 flex items-center gap-8"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.5,
            delay: 0.7,
            ease: [0.25, 0.1, 0.25, 1],
          }}
        >
          {HERO_STATS.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center lg:items-start">
              <span className="text-2xl font-bold text-brand-black">{stat.value}</span>
              <span className="text-xs uppercase tracking-wide text-neutral-500">{stat.label}</span>
            </div>
          ))}
        </motion.div>

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
            trackingLabel="start_a_project"
          >
            Start a project
          </TrackedCta>
          <TrackedCta
            href="/work"
            variant="secondary"
            trackingLocation="hero"
            trackingLabel="see_our_work"
          >
            See our work
          </TrackedCta>
        </motion.div>
        <motion.p
          className="mt-3 text-sm text-neutral-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1.5, ease: [0.25, 0.1, 0.25, 1] }}
        >
          First project satisfaction or no invoice.
        </motion.p>
      </div>
    </div>
  );
}
