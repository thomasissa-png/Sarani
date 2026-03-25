import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  /** "dark" = dark logo (for light bg), "light" = white logo (for dark bg) */
  variant?: "dark" | "light";
  /** Width in px — height is auto-calculated from aspect ratio */
  width?: number;
  className?: string;
}

/**
 * Sarani logo — uses the real PNG logo files.
 * - "light" variant: white text + colored dots (for dark backgrounds)
 * - "dark" variant: same image with CSS invert (for light backgrounds)
 *   since no separate dark PNG is available.
 */
export function Logo({ variant = "dark", width = 120, className }: LogoProps) {
  // sarani-logo-white.png is white text on transparent bg (ratio ~2.6:1)
  const height = Math.round(width / 2.6);

  return (
    <Link
      href="/"
      aria-label="Sarani — Back to homepage"
      className={cn("inline-flex items-center shrink-0", className)}
    >
      {variant === "light" ? (
        <Image
          src="/sarani-logo-white.png"
          alt="Sarani"
          width={width}
          height={height}
          className="h-auto"
          priority
        />
      ) : (
        <Image
          src="/sarani-logo-white.png"
          alt="Sarani"
          width={width}
          height={height}
          className="h-auto dark-logo-invert"
          priority
        />
      )}
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
