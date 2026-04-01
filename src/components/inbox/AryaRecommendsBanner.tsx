"use client";

// ─── Arya Recommends Banner ────────────────────────────────────────────────
// Displays a summary block of Arya's recommendations at the top of modals.
// Shows available data only — gracefully hides missing fields.

interface RecommendationLine {
  label: string;
  value: string;
}

interface AryaRecommendsBannerProps {
  lines: RecommendationLine[];
}

export function AryaRecommendsBanner({ lines }: AryaRecommendsBannerProps) {
  // Filter out empty values
  const visibleLines = lines.filter((l) => l.value.trim());

  if (visibleLines.length === 0) return null;

  return (
    <div className="bg-brand-lemon/10 border border-brand-lemon/30 rounded-lg px-4 py-3 space-y-1">
      <p className="text-xs font-semibold text-brand-black flex items-center gap-1.5">
        <span aria-hidden="true">💡</span>
        Arya recommends
      </p>
      <div className="space-y-0.5">
        {visibleLines.map((line) => (
          <p key={line.label} className="text-sm text-neutral-700">
            <span className="font-medium text-neutral-500">{line.label}:</span>{" "}
            {line.value}
          </p>
        ))}
      </div>
    </div>
  );
}
