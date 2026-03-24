import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  /** "dark" = black text (for light bg), "light" = white text (for dark bg) */
  variant?: "dark" | "light";
  /** Width in px */
  width?: number;
  className?: string;
}

/**
 * Sarani logo — SVG text with colored dots above certain letters.
 * Matches the V2 sarani.studio design.
 */
export function Logo({ variant = "dark", width = 120, className }: LogoProps) {
  const textColor = variant === "dark" ? "#000000" : "#ffffff";
  const height = Math.round(width * 0.38);

  return (
    <Link href="/" aria-label="Sarani — Back to homepage" className={cn("block", className)}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 120 46"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Colored dots */}
        <circle cx="58" cy="5" r="3" fill="#f1c217" />
        <circle cx="72" cy="3" r="2.5" fill="#0babe8" />
        <circle cx="85" cy="7" r="2" fill="#da5126" />
        <circle cx="98" cy="4" r="2.5" fill="#f1c217" />
        {/* Text "sarani" */}
        <text
          x="2"
          y="38"
          fontFamily="var(--font-outfit), Outfit, sans-serif"
          fontSize="34"
          fontWeight="700"
          fill={textColor}
          letterSpacing="-0.5"
        >
          sarani
        </text>
      </svg>
    </Link>
  );
}

/**
 * Sarani submark — 3 colored dots (Flame, Cerulean, Lemon)
 * Used in footer decoration, favicon, loading indicator.
 */
export function Submark({ size = 8, className }: { size?: number; className?: string }) {
  return (
    <div className={cn("flex items-center", className)} style={{ gap: `${size * 0.5}px` }} aria-hidden="true">
      <span
        className="rounded-full bg-brand-flame"
        style={{ width: `${size}px`, height: `${size}px` }}
      />
      <span
        className="rounded-full bg-brand-cerulean"
        style={{ width: `${size}px`, height: `${size}px` }}
      />
      <span
        className="rounded-full bg-brand-lemon"
        style={{ width: `${size}px`, height: `${size}px` }}
      />
    </div>
  );
}
