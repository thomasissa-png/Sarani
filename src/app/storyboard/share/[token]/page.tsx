import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Storyboard Preview — Sarani",
  description: "Storyboard preview shared for client approval",
  robots: { index: false, follow: false },
};

export default async function StoryboardSharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-8">
      <div className="max-w-lg w-full bg-white rounded-2xl border border-neutral-200 shadow-sm p-8 text-center space-y-4">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-neutral-100 rounded-xl">
          <svg
            className="w-6 h-6 text-neutral-600"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
            <line x1="7" y1="2" x2="7" y2="22" />
            <line x1="17" y1="2" x2="17" y2="22" />
            <line x1="2" y1="12" x2="22" y2="12" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-neutral-900">
          Storyboard Preview
        </h1>
        <p className="text-sm text-neutral-500">
          This storyboard has been shared for your review. Full preview
          functionality is coming soon.
        </p>
        <p className="text-xs text-neutral-400 font-mono break-all">
          Token: {token}
        </p>
        <div className="pt-4 border-t border-neutral-100">
          <p className="text-xs text-neutral-400">
            Sarani Storyboard Preview — Confidential
          </p>
        </div>
      </div>
    </div>
  );
}
