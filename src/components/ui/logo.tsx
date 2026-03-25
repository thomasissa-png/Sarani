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
 * - "dark" variant: black text + colored dots (for light backgrounds)
 */
export function Logo({ variant = "dark", width = 120, className }: LogoProps) {
  const height = Math.round(width / 2.6);
  const src = variant === "light" ? "/sarani-logo-white.png" : "/sarani-logo-black.png";

  return (
    <Link
      href="/"
      aria-label="Sarani — Back to homepage"
      className={cn("inline-flex items-center shrink-0", className)}
    >
      <Image
        src={src}
        alt="Sarani"
        width={width}
        height={height}
        className="h-auto"
        priority
      />
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
