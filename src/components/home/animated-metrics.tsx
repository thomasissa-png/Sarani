"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CountUp } from "@/components/ui/animated";

const METRICS = [
  {
    numericValue: 24,
    prefix: "<",
    suffix: "h",
    label: "Target timeframe",
    sublabel: "from brief to delivery*",
  },
  {
    numericValue: null,
    displayValue: "\u221E",
    label: "Unlimited revisions,",
    sublabel: "no additional cost*",
  },
  {
    numericValue: 100,
    prefix: "",
    suffix: "%",
    label: "Fixed prices only",
    sublabel: "",
  },
  {
    numericValue: 5,
    prefix: "",
    suffix: "",
    label: "Continents covered",
    sublabel: "",
  },
] as const;

export function AnimatedMetrics() {
  const prefersReduced = useReducedMotion();

  return (
    <div className="grid grid-cols-2 gap-8 text-center md:grid-cols-4">
      {METRICS.map((metric, i) => (
        <motion.div
          key={metric.label}
          initial={prefersReduced ? {} : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{
            duration: 0.5,
            delay: i * 0.15,
            ease: [0.25, 0.1, 0.25, 1],
          }}
        >
          <p className="text-5xl font-bold text-brand-white md:text-6xl">
            {metric.numericValue !== null ? (
              <CountUp
                value={metric.numericValue}
                prefix={metric.prefix}
                suffix={metric.suffix}
                duration={1.8}
              />
            ) : (
              /* Infinity symbol with subtle continuous rotation */
              <motion.span
                className="inline-block"
                animate={
                  prefersReduced
                    ? {}
                    : { rotate: [0, 5, -5, 0] }
                }
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                {metric.displayValue}
              </motion.span>
            )}
          </p>
          <motion.p
            className="mt-3 text-sm text-neutral-400"
            initial={prefersReduced ? {} : { opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.6 + i * 0.1 }}
          >
            {metric.label}
          </motion.p>
          {metric.sublabel && (
            <motion.p
              className="text-sm text-neutral-400"
              initial={prefersReduced ? {} : { opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.7 + i * 0.1 }}
            >
              {metric.sublabel}
            </motion.p>
          )}
        </motion.div>
      ))}
    </div>
  );
}
