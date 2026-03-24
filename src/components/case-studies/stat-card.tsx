interface StatCardProps {
  label: string;
  value: string;
}

/**
 * Stat card for case study results section — V2 light design.
 */
export function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="rounded-2xl bg-surface-elevated p-8 text-center">
      <p className="mb-2 text-4xl font-bold text-brand-flame sm:text-5xl">
        {value}
      </p>
      <p className="text-sm font-medium uppercase tracking-wider text-neutral-500">
        {label}
      </p>
    </div>
  );
}
