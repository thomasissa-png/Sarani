"use client";

import { useState, useCallback } from "react";

/**
 * Testimonials carousel — matches V2 "With happiness comes trust" section.
 * 6 testimonials with prev/next navigation.
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

  const prev = useCallback(() => {
    setCurrent((c) => (c === 0 ? TESTIMONIALS.length - 1 : c - 1));
  }, []);

  const next = useCallback(() => {
    setCurrent((c) => (c === TESTIMONIALS.length - 1 ? 0 : c + 1));
  }, []);

  const t = TESTIMONIALS[current];

  return (
    <div className="mx-auto max-w-2xl text-center">
      {/* Quote */}
      <blockquote className="mb-8">
        <p className="text-xl leading-relaxed text-neutral-700 italic md:text-2xl">
          &ldquo;{t.quote}&rdquo;
        </p>
      </blockquote>

      {/* Attribution */}
      <p className="text-base font-bold text-brand-black">{t.name}</p>
      <p className="text-sm text-neutral-500">{t.role}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-wider text-brand-flame">
        {t.service}
      </p>

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
              onClick={() => setCurrent(i)}
              className={`h-2 w-2 rounded-full transition-colors ${
                i === current ? "bg-brand-flame" : "bg-neutral-300"
              }`}
              aria-label={`Go to testimonial ${i + 1}`}
            />
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
