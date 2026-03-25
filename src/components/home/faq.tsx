"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

/**
 * FAQ accordion — matches V2 Webflow 14-question FAQ section.
 * Animated: smooth height transition with framer-motion, + icon rotation.
 */

const FAQ_ITEMS = [
  {
    question: "What is your pricing model? Are there any hidden costs?",
    answer: "Our pricing is fully transparent with fixed rates published on our website. No hidden costs, no surprise invoices. You pay exactly what you see — whether it's a banner at 150\u20AC or a complete branding package.",
  },
  {
    question: "How do feedback and revisions work?",
    answer: "Every project includes unlimited revisions at no additional cost. Submit your feedback, and we'll refine the work until you're 100% satisfied. There's no limit on the number of rounds.",
  },
  {
    question: "How can you offer unlimited revisions without extra cost?",
    answer: "Because we have trust in our work. Our structured team of 35+ experts works in a relay model across 5 continents, making revisions efficient and scalable. It's built into our operating model, not an afterthought.",
  },
  {
    question: "How do you ensure quality assurance?",
    answer: "Every deliverable goes through an internal review by our Creative Director and senior leads before reaching you. This multi-step quality check ensures consistent, enterprise-grade output every time.",
  },
  {
    question: "Do you offer 24/7 support?",
    answer: "Yes. With teams across Paris, London, Dubai, Buenos Aires, and Manila, we operate around the clock. When your team in Europe signs off, our team in Asia picks up. Your brief never sleeps.",
  },
  {
    question: "Can you handle tight deadlines? What are your lead times?",
    answer: "Our standard delivery for graphic design is under 24 hours from brief to delivery. For more complex work (video, branding, web), we target 48h to 96h depending on scope. We thrive on tight deadlines.",
  },
  {
    question: "Can I see case studies or your portfolio?",
    answer: "Absolutely. Visit our Projects page to see work we've delivered for TikTok, Sony, Adidas, IKEA, LEGO, and many others. We also have a detailed Agency Deck available on request.",
  },
  {
    question: "What tools and software do you use?",
    answer: "Our team works with industry-standard tools: Adobe Illustrator, Photoshop, InDesign, After Effects for production, and Figma for collaborative design. We adapt to your existing workflows.",
  },
  {
    question: "What does the onboarding process look like?",
    answer: "It's simple: you submit a brief through our contact form, we assign the best-fit team, and work begins. No lengthy onboarding, no contracts to negotiate first. Your first project can start today.",
  },
  {
    question: "What guarantees do you offer?",
    answer: "First project satisfaction or no invoice. If you're not happy with the result of your first project after revisions, you don't pay. That's our commitment to earning your trust.",
  },
  {
    question: "How do you maintain quality with under 24h delivery?",
    answer: "Our relay model across 5 continents means work doesn't stop. While other agencies need 2 weeks because they work 8 hours a day, we work 24. Speed doesn't compromise quality \u2014 it enables it.",
  },
  {
    question: "You say you're present on 5 continents. How does that work?",
    answer: "We have 35+ in-house experts across Paris, London, Dubai, Buenos Aires, Manila, and more. This geographic spread creates a natural time-zone relay, ensuring 24/7 creative production without burnout.",
  },
  {
    question: "What tools do you use for communication and project management?",
    answer: "We adapt to your tools. Whether it's Slack, Teams, email, or your own PM platform, we integrate into your existing workflow. No forced adoption of new tools.",
  },
  {
    question: "How do you handle data privacy?",
    answer: "We take data privacy seriously. All client files are handled securely, and we're fully GDPR compliant. We can sign NDAs and DPAs for enterprise clients. Your data stays your data.",
  },
] as const;

function FaqItem({
  question,
  answer,
  isOpen,
  onToggle,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const prefersReduced = useReducedMotion();

  return (
    <div className="border-b border-neutral-300">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between py-5 text-left"
        aria-expanded={isOpen}
      >
        <span className="pr-4 text-base font-bold text-brand-black md:text-lg">
          {question}
        </span>
        <motion.span
          className="shrink-0 text-brand-black"
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
          aria-hidden="true"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={prefersReduced ? {} : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={prefersReduced ? {} : { height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-sm leading-relaxed text-neutral-700 md:text-base">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const handleToggle = useCallback((index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  }, []);

  return (
    <div className="border-t border-neutral-300">
      {FAQ_ITEMS.map((item, i) => (
        <FaqItem
          key={i}
          question={item.question}
          answer={item.answer}
          isOpen={openIndex === i}
          onToggle={() => handleToggle(i)}
        />
      ))}
    </div>
  );
}
