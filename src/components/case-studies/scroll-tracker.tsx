"use client";

import { useEffect, useRef } from "react";
import { track, getDevice, getReferrer } from "@/lib/analytics";

interface CaseStudyScrollTrackerProps {
  /** Page path for analytics, e.g. "/case-studies/sony-banner-production" */
  page: string;
}

/**
 * Tracks scroll depth at 50% and 100% thresholds on case study pages.
 * Each threshold fires only once per page load (useRef deduplication).
 * Must be placed inside a relative-positioned container that spans the full page height.
 */
export function CaseStudyScrollTracker({ page }: CaseStudyScrollTrackerProps) {
  const fired50 = useRef(false);
  const fired100 = useRef(false);
  const sentinel50Ref = useRef<HTMLDivElement>(null);
  const sentinel100Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;

          const depth = entry.target.getAttribute("data-depth") as "50" | "100";
          if (depth === "50" && !fired50.current) {
            fired50.current = true;
            track("scroll_depth", {
              depth: "50",
              page,
              device: getDevice(),
              referrer: getReferrer(),
            });
          }
          if (depth === "100" && !fired100.current) {
            fired100.current = true;
            track("scroll_depth", {
              depth: "100",
              page,
              device: getDevice(),
              referrer: getReferrer(),
            });
          }
        }
      },
      { threshold: 0.1 }
    );

    if (sentinel50Ref.current) observer.observe(sentinel50Ref.current);
    if (sentinel100Ref.current) observer.observe(sentinel100Ref.current);

    return () => observer.disconnect();
  }, [page]);

  return (
    <>
      <div
        ref={sentinel50Ref}
        data-depth="50"
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-1/2 h-px w-px opacity-0"
      />
      <div
        ref={sentinel100Ref}
        data-depth="100"
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 h-px w-px opacity-0"
      />
    </>
  );
}
