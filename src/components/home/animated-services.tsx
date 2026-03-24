"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";

const SERVICES = [
  { label: "branding", href: "/work?category=branding" },
  { label: "graphic design", href: "/work?category=graphic-design" },
  { label: "marketing assets", href: "/work?category=marketing-assets" },
  { label: "presentations", href: "/work?category=presentations" },
  { label: "photos", href: "/work?category=photos" },
  { label: "social media", href: "/work?category=social-media" },
  { label: "videos", href: "/work?category=videos" },
  { label: "web design", href: "/work?category=web-design" },
] as const;

export function AnimatedServicesList() {
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      className="flex flex-wrap items-center justify-center gap-x-2 gap-y-2"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: prefersReduced ? 0 : 0.06 },
        },
      }}
    >
      {SERVICES.map((service, i) => (
        <motion.span
          key={service.label}
          className="flex items-center gap-2"
          variants={{
            hidden: prefersReduced ? {} : { opacity: 0, y: 16 },
            visible: {
              opacity: 1,
              y: 0,
              transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
            },
          }}
        >
          <Link
            href={service.href}
            className="text-lg font-bold text-brand-black transition-colors hover:text-brand-flame md:text-xl"
          >
            {service.label}
          </Link>
          {i < SERVICES.length - 1 && (
            <motion.span
              className="inline-block h-2 w-2 rounded-full bg-brand-flame"
              aria-hidden="true"
              variants={{
                hidden: prefersReduced ? {} : { scale: 0 },
                visible: {
                  scale: 1,
                  transition: {
                    type: "spring",
                    stiffness: 500,
                    damping: 15,
                    delay: 0.1,
                  },
                },
              }}
            />
          )}
        </motion.span>
      ))}
    </motion.div>
  );
}
