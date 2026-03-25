import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  /** "dark" = black text (for light bg), "light" = white text (for dark bg) */
  variant?: "dark" | "light";
  /** Width class — maps to Tailwind width utilities */
  width?: number;
  className?: string;
}

/**
 * Sarani logo — HTML text with Outfit font + 3 colored dots (red, yellow, blue)
 * clustered in a triangle above the "i", matching the official logo.
 *
 * Uses HTML <span> instead of SVG <text> so the web font (Outfit) loads reliably.
 * The 3 dots are positioned absolutely above the "i" using a small inline SVG.
 */
export function Logo({ variant = "dark", width = 120, className }: LogoProps) {
  const textColor = variant === "dark" ? "text-brand-black" : "text-brand-white";

  // Scale factor relative to default 120px width
  const scale = width / 120;
  const fontSize = 28 * scale;
  const dotSize = 5 * scale;
  const dotsRight = 13 * scale;
  const dotsBottom = 2 * scale;

  return (
    <Link
      href="/"
      aria-label="Sarani — Back to homepage"
      className={cn("inline-flex items-center", className)}
    >
      <span
        className="relative inline-block select-none"
        style={{ width: `${width}px` }}
        aria-hidden="true"
      >
        {/* Text "sarani" in Outfit bold */}
        <span
          className={cn(
            "block font-heading font-bold leading-none tracking-tight",
            textColor
          )}
          style={{ fontSize: `${fontSize}px`, letterSpacing: "-0.02em" }}
        >
          sarani
        </span>

        {/* 3 colored dots clustered above the "i" — triangle arrangement */}
        <span
          className="absolute pointer-events-none"
          style={{
            bottom: `calc(100% - ${dotsBottom}px)`,
            right: `${dotsRight}px`,
          }}
        >
          <svg
            width={dotSize * 4}
            height={dotSize * 3.5}
            viewBox="0 0 20 17"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            {/* Red — top right */}
            <circle cx="15" cy="3" r="2.8" fill="#da5126" />
            {/* Yellow — bottom left */}
            <circle cx="8" cy="10" r="2.8" fill="#f1c217" />
            {/* Blue — bottom right */}
            <circle cx="16" cy="10" r="2.8" fill="#0babe8" />
          </svg>
        </span>
      </span>
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
