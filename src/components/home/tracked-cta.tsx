"use client";

import { useCallback } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { track, getDevice, getReferrer } from "@/lib/analytics";

interface TrackedCtaProps {
  href: string;
  variant?: "primary" | "secondary" | "ghost";
  /** Analytics: location on the page (e.g. "hero", "footer_cta") */
  trackingLocation: string;
  /** Analytics: label identifier (e.g. "start_a_project") */
  trackingLabel: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Button with built-in cta_click tracking.
 * Fires the event on click before navigation.
 */
export function TrackedCta({
  href,
  variant = "primary",
  trackingLocation,
  trackingLabel,
  className,
  children,
}: TrackedCtaProps) {
  const pathname = usePathname();

  const handleClick = useCallback(() => {
    track("cta_click", {
      location: trackingLocation,
      label: trackingLabel,
      page: pathname,
      device: getDevice(),
      referrer: getReferrer(),
    });
  }, [trackingLocation, trackingLabel, pathname]);

  return (
    <Button variant={variant} href={href} className={className} onClick={handleClick}>
      {children}
    </Button>
  );
}
