"use client";

import { motion, useReducedMotion } from "framer-motion";

const PROOF_POINTS = [
  {
    client: "Sony",
    stat: "Same-day banners",
    price: "155 \u20AC",
    detail: "Launch campaign assets delivered within hours, not weeks.",
  },
  {
    client: "GEODIS",
    stat: "5,700 slides in 3 weeks",
    price: "8,500 \u20AC",
    detail: "Complete corporate rebrand across 350 presentations.",
  },
  {
    client: "TikTok",
    stat: "1,500+ edits per month",
    price: "300\u2013500/week",
    detail: "Campaigns reaching 400M+ views. Ongoing video production at scale, every single month.",
  },
] as const;

const cardVariants = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};

/**
 * Proof points section — 3 cards showing real client results.
 * Animated: stagger fade-in-up on scroll, hover lift + shadow.
 */
export function ProofCards() {
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      className="grid gap-6 md:grid-cols-3"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: prefersReduced ? 0 : 0.2 },
        },
      }}
    >
      {PROOF_POINTS.map((point) => (
        <motion.div
          key={point.client}
          className="rounded-2xl border border-neutral-300 bg-brand-white p-8 transition-shadow duration-200 hover:shadow-md hover:-translate-y-1"
          variants={prefersReduced ? {} : cardVariants}
          whileHover={prefersReduced ? {} : { y: -4 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          <p className="mb-2 text-sm font-bold uppercase tracking-wider text-brand-cerulean">
            {point.client}
          </p>
          <p className="mb-1 text-2xl font-bold text-brand-black">
            {point.stat}
          </p>
          <p className="mb-4 text-3xl font-bold text-brand-flame">
            {point.price}
          </p>
          <p className="text-sm font-medium text-neutral-500">{point.detail}</p>
        </motion.div>
      ))}
    </motion.div>
  );
}
