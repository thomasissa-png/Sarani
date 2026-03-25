"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

/**
 * Testimonials carousel — matches V2 "With happiness comes trust" section.
 * 6 testimonials with prev/next navigation.
 * Animated: fade + slide transitions between quotes.
 */

const TESTIMONIALS = [
  {
    name: "Maureen Masson",
    role: "Channel Marketing Specialist",
    quote: "And unfailing reactivity and immense benevolence. The Sarani team is always available, responsive and creative. A real pleasure to work with!",
    service: "Graphic Design",
  },
  {
    name: "Aurelio de Miguel",
    role: "Performance Marketing Manager",
    quote: "Amazing, faster than a pizza! The turnaround time is incredible and the quality is consistently high. Sarani has become our go-to partner.",
    service: "Performance Marketing",
  },
  {
    name: "Sophie Dubost",
    role: "CEO",
    quote: "We were looking for a very specific identity that matched our vision. Sarani understood exactly what we needed and delivered beyond expectations.",
    service: "Brand Identity",
  },
  {
    name: "Carl Standertskjold",
    role: "Europe Marketing Manager",
    quote: "Sarani deliver fantastic work each time. Their ability to handle multiple markets simultaneously is unmatched in the industry.",
    service: "Socials",
  },
  {
    name: "Alexis Béranger",
    role: "Communication Senior Manager",
    quote: "Incredible is the only word. 60% faster and 60% cheaper than our previous agency. The quality speaks for itself.",
    service: "Marketing Assets",
  },
  {
    name: "Astrid Jean-Baptiste",
    role: "Trade Marketing Manager",
    quote: "You're my heroes. Every brief is handled with care and precision. The unlimited revisions policy means we always get exactly what we need.",
    service: "Product Launch",
  },
] as const;

export function Testimonials() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);
  const prefersReduced = useReducedMotion();

  const prev = useCallback(() => {
    setDirection(-1);
    setCurrent((c) => (c === 0 ? TESTIMONIALS.length - 1 : c - 1));
  }, []);

  const next = useCallback(() => {
    setDirection(1);
    setCurrent((c) => (c === TESTIMONIALS.length - 1 ? 0 : c + 1));
  }, []);

  const t = TESTIMONIALS[current];

  const slideVariants = {
    enter: (dir: number) => ({
      x: prefersReduced ? 0 : dir > 0 ? 60 : -60,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: prefersReduced ? 0 : dir > 0 ? -60 : 60,
      opacity: 0,
    }),
  };

  return (
    <div className="mx-auto max-w-2xl text-center">
      {/* Quote with AnimatePresence for smooth transitions */}
      <div className="relative min-h-[180px] md:min-h-[140px]">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.blockquote
            key={current}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
            className="mb-8"
          >
            <p className="text-xl leading-relaxed text-neutral-700 italic md:text-2xl">
              &ldquo;{t.quote}&rdquo;
            </p>
          </motion.blockquote>
        </AnimatePresence>
      </div>

      {/* Attribution — also animated */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={prefersReduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={prefersReduced ? {} : { opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <p className="text-base font-bold text-brand-black">{t.name}</p>
          <p className="text-sm text-neutral-500">{t.role}</p>
          <p className="mt-1 text-xs font-bold uppercase tracking-wider text-brand-flame-dark">
            {t.service}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="mt-8 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={prev}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-300 text-brand-black transition-colors hover:bg-brand-black hover:text-brand-white"
          aria-label="Previous testimonial"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        {/* Dots */}
        <div className="flex items-center gap-2">
          {TESTIMONIALS.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setDirection(i > current ? 1 : -1);
                setCurrent(i);
              }}
              className="relative h-2 w-2 rounded-full bg-neutral-300 transition-colors"
              aria-label={`Go to testimonial ${i + 1}`}
            >
              {i === current && (
                <motion.span
                  layoutId="testimonial-dot"
                  className="absolute inset-0 rounded-full bg-brand-flame"
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                />
              )}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={next}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-300 text-brand-black transition-colors hover:bg-brand-black hover:text-brand-white"
          aria-label="Next testimonial"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
