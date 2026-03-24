const PROOF_POINTS = [
  {
    client: "Sony",
    stat: "Same-day banners",
    price: "155 \u20AC",
    detail: "Launch campaign assets delivered within hours, not weeks.",
  },
  {
    client: "GEODIS",
    stat: "5,700 slides in 3 weeks",
    price: "8,500 \u20AC",
    detail: "Complete corporate rebrand across 350 presentations.",
  },
  {
    client: "TikTok",
    stat: "1,500+ edits per month",
    price: "300\u2013500/week",
    detail: "Ongoing video production at scale, every single month.",
  },
] as const;

/**
 * Proof points section — 3 cards showing real client results.
 * V2 light design: white cards with subtle border.
 */
export function ProofCards() {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {PROOF_POINTS.map((point) => (
        <div
          key={point.client}
          className="rounded-2xl border border-neutral-300 bg-brand-white p-8"
        >
          <p className="mb-2 text-sm font-bold uppercase tracking-wider text-brand-cerulean">
            {point.client}
          </p>
          <p className="mb-1 text-2xl font-bold text-brand-black">
            {point.stat}
          </p>
          <p className="mb-4 text-3xl font-bold text-brand-flame">
            {point.price}
          </p>
          <p className="text-sm text-neutral-500">{point.detail}</p>
        </div>
      ))}
    </div>
  );
}
