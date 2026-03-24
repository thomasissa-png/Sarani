import { cn } from "@/lib/utils";

interface SectionProps {
  children: React.ReactNode;
  className?: string;
  /** Tighter vertical padding for related content blocks */
  tight?: boolean;
  /** HTML id for anchor linking */
  id?: string;
  /** ARIA landmark label */
  ariaLabel?: string;
}

/**
 * Reusable section wrapper.
 * Full-width background with contained inner content column.
 * Desktop: max-w-screen-xl mx-auto px-8
 * Mobile: px-5
 * Vertical padding: 96px desktop / 64px mobile (standard) or 64px/48px (tight)
 */
export function Section({ children, className, tight = false, id, ariaLabel }: SectionProps) {
  return (
    <section
      id={id}
      aria-label={ariaLabel}
      className={cn(
        "w-full",
        tight ? "py-12 md:py-16" : "py-16 md:py-24",
        className
      )}
    >
      <div className="mx-auto max-w-screen-xl px-5 md:px-8">
        {children}
      </div>
    </section>
  );
}
