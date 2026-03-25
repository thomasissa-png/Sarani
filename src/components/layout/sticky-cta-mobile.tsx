"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { track, getDevice } from "@/lib/analytics";

const SCROLL_THRESHOLD = 400;

/** Pages where the sticky CTA should be hidden (already has a form / CTA) */
const HIDDEN_PATHS = ["/contact"];

export function StickyCTAMobile() {
  const [visible, setVisible] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > SCROLL_THRESHOLD);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (HIDDEN_PATHS.includes(pathname)) return null;

  return (
    <div
      className={[
        "fixed bottom-0 left-0 right-0 z-[var(--z-header)] md:hidden",
        "bg-brand-white/95 backdrop-blur-sm border-t border-neutral-200",
        "px-5 py-3",
        "transition-transform duration-300 ease-in-out",
        visible ? "translate-y-0" : "translate-y-full",
      ].join(" ")}
    >
      <Link
        href="/contact"
        onClick={() =>
          track("cta_click", {
            location: "sticky_mobile_bar",
            label: "start_a_project",
            page: pathname,
            device: getDevice(),
          })
        }
        className="block w-full rounded-full bg-brand-flame py-3.5 text-center text-base font-bold text-brand-white transition-colors hover:bg-brand-flame-dark"
      >
        Start a project
      </Link>
    </div>
  );
}
