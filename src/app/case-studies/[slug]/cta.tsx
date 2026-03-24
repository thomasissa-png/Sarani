"use client";

import { Button } from "@/components/ui/button";
import { track, getDevice, getReferrer } from "@/lib/analytics";

interface CaseStudyCtaProps {
  client: string;
}

/**
 * Client component for the bottom CTA on case study pages.
 * Tracks cta_click with location "case_study_bottom" and client name.
 */
export function CaseStudyCta({ client }: CaseStudyCtaProps) {
  const handleClick = () => {
    track("cta_click", {
      location: "case_study_bottom",
      label: "start_a_project",
      client,
      page: typeof window !== "undefined" ? window.location.pathname : "/",
      device: getDevice(),
      referrer: getReferrer(),
    });
  };

  return (
    <Button variant="primary" href="/contact" onClick={handleClick}>
      Start a project
    </Button>
  );
}
