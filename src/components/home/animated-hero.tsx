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

/* ---------- Animated Hero Dots — Premium orbital composition ---------- */
/* Sarani's three brand dots (Flame, Cerulean, Lemon) in a layered,       */
/* organic floating composition on the right side of the hero.             */
/* Multiple sizes, varied opacities, staggered orbit-like drift.          */

const DOTS: Array<{
  color: string;
  size: string;
  top: string;
  right: string;
  delay: number;
  distance: number;
  blur?: string;
}> = [
  // Primary constellation — large dots, full opacity
  { color: "bg-brand-flame", size: "w-14 h-14", top: "22%", right: "18%", delay: 0, distance: 20 },
  { color: "bg-brand-cerulean", size: "w-12 h-12", top: "42%", right: "8%", delay: 0.8, distance: 16 },
  { color: "bg-brand-lemon", size: "w-10 h-10", top: "62%", right: "22%", delay: 1.6, distance: 18 },

  // Secondary — medium dots, slightly transparent
  { color: "bg-brand-cerulean/70", size: "w-8 h-8", top: "15%", right: "8%", delay: 0.4, distance: 14 },
  { color: "bg-brand-flame/60", size: "w-7 h-7", top: "52%", right: "30%", delay: 1.2, distance: 12 },
  { color: "bg-brand-lemon/70", size: "w-9 h-9", top: "32%", right: "28%", delay: 2.0, distance: 22 },

  // Ambient — small dots, low opacity, background depth
  { color: "bg-brand-flame/30", size: "w-5 h-5", top: "75%", right: "12%", delay: 0.6, distance: 10, blur: "blur-[1px]" },
  { color: "bg-brand-cerulean/25", size: "w-4 h-4", top: "8%", right: "24%", delay: 1.4, distance: 8, blur: "blur-[1px]" },
  { color: "bg-brand-lemon/20", size: "w-6 h-6", top: "80%", right: "28%", delay: 2.4, distance: 12, blur: "blur-[2px]" },
  { color: "bg-brand-cerulean/15", size: "w-16 h-16", top: "35%", right: "2%", delay: 0.2, distance: 24, blur: "blur-[3px]" },
  { color: "bg-brand-flame/15", size: "w-20 h-20", top: "58%", right: "35%", delay: 1.0, distance: 28, blur: "blur-[4px]" },
  { color: "bg-brand-lemon/10", size: "w-24 h-24", top: "10%", right: "38%", delay: 1.8, distance: 30, blur: "blur-[5px]" },
];

export function AnimatedHeroDots() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      {DOTS.map((dot, i) => (
        <FloatingDot
          key={i}
          className={`absolute rounded-full hidden lg:block ${dot.color} ${dot.size} ${dot.blur ?? ""}`}
          style={{ top: dot.top, right: dot.right }}
          delay={dot.delay}
          distance={dot.distance}
        />
      ))}
    </div>
  );
}

/* ---------- Pre-headline ---------- */

const PRE_HEADLINE = "TIKTOK. SONY. ADIDAS. LEGO.";

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
          <p className="mb-6 max-w-2xl text-lg text-neutral-700 md:text-xl">
            {SUBTITLE}
          </p>
          {/* Stats row */}
          <div className="mb-8 flex flex-wrap items-center gap-4 sm:gap-8">
            {HERO_STATS.map((stat) => (
              <div key={stat.label} className="flex flex-col items-center lg:items-start">
                <span className="text-2xl font-bold text-brand-black">{stat.value}</span>
                <span className="text-xs uppercase tracking-wide text-neutral-600">{stat.label}</span>
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
          <p className="mt-3 text-sm text-neutral-600">
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
          className="mb-6 max-w-2xl text-lg text-neutral-700 md:text-xl"
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
          className="mb-8 flex flex-wrap items-center gap-4 sm:gap-8"
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
              <span className="text-xs uppercase tracking-wide text-neutral-600">{stat.label}</span>
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
            delay: 0.5,
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
          className="mt-3 text-sm text-neutral-600"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
        >
          First project satisfaction or no invoice.
        </motion.p>
      </div>
    </div>
  );
}
