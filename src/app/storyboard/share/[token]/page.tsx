import { Metadata } from "next";
import { db } from "@/lib/db";
import { storyboards, storyboardScenes, clients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Image from "next/image";
import StoryboardFeedbackBar from "@/components/ui/StoryboardFeedbackBar";

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

  // Validate token format (UUID)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(token)) {
    notFound();
  }

  // Look up storyboard by share token
  const [storyboard] = await db
    .select({
      id: storyboards.id,
      status: storyboards.status,
      title: storyboards.title,
      shareToken: storyboards.shareToken,
      shareExpiresAt: storyboards.shareExpiresAt,
      clientId: storyboards.clientId,
      clientName: clients.name,
      createdAt: storyboards.createdAt,
    })
    .from(storyboards)
    .leftJoin(clients, eq(storyboards.clientId, clients.id))
    .where(eq(storyboards.shareToken, token));

  if (!storyboard) {
    notFound();
  }

  // Check expiration
  if (storyboard.shareExpiresAt && new Date(storyboard.shareExpiresAt) < new Date()) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8">
        <div className="max-w-lg w-full text-center space-y-6">
          <Image src="/sarani-logo-white.png" alt="Sarani" width={120} height={32} className="mx-auto" />
          <h1 className="text-2xl font-bold text-white">Preview link expired</h1>
          <p className="text-white/60">
            This preview link has expired. Please contact your Sarani account manager for an updated link.
          </p>
          <a href="https://sarani.studio" className="inline-block text-sm text-brand-flame hover:underline">
            sarani.studio
          </a>
        </div>
      </div>
    );
  }

  // Fetch scenes
  const scenes = await db
    .select()
    .from(storyboardScenes)
    .where(eq(storyboardScenes.storyboardId, storyboard.id))
    .orderBy(storyboardScenes.sceneOrder);

  const hasScenes = scenes.length > 0;
  const readyScenes = scenes.filter((s) => s.status === "ready" && s.imageUrl);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <Image src="/sarani-logo-white.png" alt="Sarani" width={100} height={28} />
        <span className="text-xs text-white/40">Preview — Confidential</span>
      </header>

      {/* Project info */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        {storyboard.clientName && (
          <p className="text-sm font-bold uppercase tracking-widest text-brand-flame mb-2">
            {storyboard.clientName}
          </p>
        )}
        <h1 className="text-3xl sm:text-4xl font-bold mb-4">
          {storyboard.title || "Storyboard Preview"}
        </h1>
        <div className="flex items-center gap-4 text-sm text-white/50 mb-12">
          <span>{readyScenes.length} scene{readyScenes.length !== 1 ? "s" : ""}</span>
          <span className="w-1 h-1 rounded-full bg-white/30" />
          <span>
            {storyboard.status === "ready" ? "Ready for review" : storyboard.status}
          </span>
        </div>

        {/* Scenes */}
        {!hasScenes ? (
          <div className="text-center py-20">
            <p className="text-white/50">Scenes are being prepared. Check back shortly.</p>
          </div>
        ) : (
          <div className="space-y-12">
            {scenes.map((scene) => (
              <div
                key={scene.id}
                className="rounded-2xl border border-white/10 overflow-hidden bg-white/5"
              >
                {/* Scene image */}
                {scene.status === "ready" && scene.imageUrl ? (
                  <div className="relative aspect-video bg-neutral-900">
                    <img
                      src={scene.imageUrl}
                      alt={`Scene ${scene.sceneOrder}${scene.description ? ` — ${scene.description.slice(0, 80)}` : ""}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ) : scene.status === "generating" ? (
                  <div className="aspect-video bg-neutral-900 flex items-center justify-center">
                    <div className="text-center">
                      <svg className="w-8 h-8 animate-spin text-brand-flame mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                      <p className="text-sm text-white/40">Generating scene {scene.sceneOrder}...</p>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-video bg-neutral-900 flex items-center justify-center">
                    <p className="text-sm text-white/30">Scene {scene.sceneOrder} — pending</p>
                  </div>
                )}

                {/* Scene details */}
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-bold uppercase tracking-widest text-brand-flame">
                      Scene {scene.sceneOrder}
                    </span>
                    {scene.mood && (
                      <span className="text-xs text-white/40 px-2 py-0.5 rounded-full border border-white/10">
                        {scene.mood}
                      </span>
                    )}
                  </div>
                  {scene.description && (
                    <p className="text-sm text-white/70 leading-relaxed mb-2">{scene.description}</p>
                  )}
                  {scene.cameraDirection && (
                    <p className="text-xs text-white/40 italic">Camera: {scene.cameraDirection}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-white/10 mt-12 pb-24">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <a href="https://sarani.studio" className="text-xs text-white/20 hover:text-white/40 transition-colors">
            sarani.studio
          </a>
        </div>
      </footer>

      {/* Approval / Feedback Bar */}
      <StoryboardFeedbackBar storyboardId={storyboard.id} />
    </div>
  );
}
