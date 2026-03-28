"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";

const PROOF_POINTS = [
  {
    client: "TikTok",
    stat: "1,500+ edits/month",
    price: "$20/video",
    detail: "Ongoing UGC production at scale. Every week. Every month. 3 years running.",
    slug: "tiktok-video-production",
  },
  {
    client: "Sony",
    stat: "Same-day delivery",
    price: "150 \u20AC",
    detail: "Black Friday banners. Ordered in the morning. Delivered by evening.",
    slug: "sony-banner-production",
  },
  {
    client: "GEODIS",
    stat: "5,700 slides",
    price: "8,500 \u20AC",
    detail: "Full rebrand in 3 weeks. Previous agency quoted 80,000\u20AC.",
    slug: "geodis-presentation-rebranding",
  },
  {
    client: "TikTok",
    stat: "94M views",
    price: "3,800 \u20AC",
    detail: "#GimmeTheMic Germany. One video. 94 million views.",
    slug: "tiktok-gimmethemic-germany",
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
      className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
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
        <Link key={point.stat} href={`/work/${point.slug}`} className="block">
          <motion.div
            className="rounded-2xl border border-neutral-300 bg-brand-white p-8 transition-shadow duration-200 hover:shadow-md hover:-translate-y-1 hover:border-brand-flame/40"
            variants={prefersReduced ? {} : cardVariants}
            whileHover={prefersReduced ? {} : { y: -4 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <p className="mb-2 text-sm font-bold uppercase tracking-wider text-brand-cerulean-dark">
              {point.client}
            </p>
            <p className="mb-1 text-2xl font-bold text-brand-black">
              {point.stat}
            </p>
            <p className="mb-4 text-3xl font-bold text-brand-flame">
              {point.price}
            </p>
            <p className="text-sm font-medium text-neutral-500">{point.detail}</p>
            <p className="mt-3 text-xs font-semibold text-brand-flame opacity-0 transition-opacity group-hover:opacity-100">
              See case study →
            </p>
          </motion.div>
        </Link>
      ))}
    </motion.div>
  );
}
