interface StatCardProps {
  label: string;
  value: string;
}

/**
 * Stat card for case study results section — V2 light design.
 */
export function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="rounded-2xl bg-brand-black p-6 text-center">
      <p className="text-3xl font-bold text-brand-lemon">{value}</p>
      <p className="mt-2 text-sm text-white/70 uppercase tracking-wider">{label}</p>
    </div>
  );
}
