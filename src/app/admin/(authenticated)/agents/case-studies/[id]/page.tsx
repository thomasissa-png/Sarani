"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

// ─── Types ──────────────────────────────────────────────────────────────────

interface CaseStudyOutput {
  id: string;
  outputType: string;
  content: Record<string, unknown>;
  currentVersion: number;
  publishedAt: string | null;
  caseStudySlug: string | null;
  generatedAt: string;
}

interface CandidateDetail {
  id: string;
  clientName: string;
  projectName: string | null;
  projectType: string | null;
  projectAmount: string | null;
  completedAt: string | null;
  sharePointAssetCount: number | null;
  sharePointFolderUrl: string | null;
  scoreTotal: number;
  scoreBreakdown: {
    clientName: number;
    amount: number;
    assets: number;
    projectType: number;
    recency: number;
    diversity: number;
  } | null;
  status: string;
  outputs: {
    caseStudy: CaseStudyOutput | null;
    linkedInPost: CaseStudyOutput | null;
    nurturingEmail: CaseStudyOutput | null;
  };
}

type TabKey = "case_study" | "linkedin_post" | "nurturing_email";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(date: string | null | undefined): string {
  if (!date) return "--";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "--";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getScoreColor(score: number): string {
  if (score >= 70) return "text-green-700";
  if (score >= 40) return "text-yellow-700";
  return "text-red-700";
}

// ─── Page Component ─────────────────────────────────────────────────────────

export default function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [candidate, setCandidate] = useState<CandidateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("case_study");
  const [generating, setGenerating] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [regenerateInstruction, setRegenerateInstruction] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [copied, setCopied] = useState(false);

  // ─── Fetch candidate ──────────────────────────────────────────────────

  const fetchCandidate = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/case-studies/candidates/${id}`);
      if (!res.ok) throw new Error(`Failed to fetch (${res.status})`);
      const data: CandidateDetail = await res.json();
      setCandidate(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCandidate();
  }, [fetchCandidate]);

  // ─── Actions ──────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (!candidate) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/case-studies/candidates/${id}/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ force: candidate.scoreTotal < 70 }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Generation failed (${res.status})`);
      }
      await fetchCandidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerate = async (outputId: string) => {
    if (!regenerateInstruction.trim()) return;
    setRegenerating(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/case-studies/outputs/${outputId}/regenerate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ instruction: regenerateInstruction }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Regeneration failed (${res.status})`);
      }
      setRegenerateInstruction("");
      await fetchCandidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Regeneration failed");
    } finally {
      setRegenerating(false);
    }
  };

  const handlePublish = async (outputId: string) => {
    setPublishing(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/case-studies/outputs/${outputId}/publish`,
        { method: "POST" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Publish failed (${res.status})`);
      }
      await fetchCandidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setPublishing(false);
    }
  };

  const handleUnpublish = async (outputId: string) => {
    setPublishing(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/case-studies/outputs/${outputId}/publish`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Unpublish failed (${res.status})`);
      }
      await fetchCandidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unpublish failed");
    } finally {
      setPublishing(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/case-studies/candidates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Status update failed");
      await fetchCandidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <svg className="w-6 h-6 animate-spin text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        <span className="ml-3 text-sm text-neutral-500">Loading candidate...</span>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-neutral-500">Candidate not found.</p>
        <button onClick={() => router.push("/admin/agents/case-studies")} className="mt-4 text-sm text-brand-black underline">
          Back to pipeline
        </button>
      </div>
    );
  }

  const currentOutput =
    activeTab === "case_study"
      ? candidate.outputs.caseStudy
      : activeTab === "linkedin_post"
        ? candidate.outputs.linkedInPost
        : candidate.outputs.nurturingEmail;

  const hasOutputs =
    candidate.outputs.caseStudy ||
    candidate.outputs.linkedInPost ||
    candidate.outputs.nurturingEmail;

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/admin/agents/case-studies")}
          className="p-2 rounded-lg hover:bg-neutral-100 transition-colors"
          aria-label="Back to pipeline"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-brand-black">
            {candidate.clientName} — {candidate.projectName ?? "Untitled"}
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            {candidate.projectType ?? "Unknown type"} · Score: {candidate.scoreTotal}/100 · Status: {candidate.status}
          </p>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Score breakdown */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl border border-neutral-300 p-5">
            <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-4">Score Breakdown</h2>
            {candidate.scoreBreakdown ? (
              <div className="space-y-3">
                {Object.entries(candidate.scoreBreakdown).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm text-neutral-700 capitalize">
                      {key.replace(/([A-Z])/g, " $1").trim()}
                    </span>
                    <span className={`text-sm font-semibold ${getScoreColor(value * 4)}`}>
                      {value}
                    </span>
                  </div>
                ))}
                <div className="border-t border-neutral-200 pt-3 flex items-center justify-between">
                  <span className="text-sm font-bold text-brand-black">Total</span>
                  <span className={`text-lg font-bold ${getScoreColor(candidate.scoreTotal)}`}>
                    {candidate.scoreTotal}/100
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-neutral-400">No breakdown available</p>
            )}
          </div>

          {/* Metadata */}
          <div className="bg-white rounded-xl border border-neutral-300 p-5">
            <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-4">Project Details</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-neutral-500">Amount</dt>
                <dd className="text-brand-black font-medium">{candidate.projectAmount ? `€${parseFloat(candidate.projectAmount).toLocaleString()}` : "--"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">Completed</dt>
                <dd className="text-brand-black">{formatDate(candidate.completedAt)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">Assets</dt>
                <dd className="text-brand-black">{candidate.sharePointAssetCount ?? 0} files</dd>
              </div>
              {candidate.sharePointFolderUrl && (
                <div className="flex justify-between">
                  <dt className="text-neutral-500">Folder</dt>
                  <dd>
                    <a href={candidate.sharePointFolderUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-xs">
                      Open in SharePoint
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Status actions */}
          <div className="bg-white rounded-xl border border-neutral-300 p-5 space-y-2">
            {!hasOutputs && (
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full px-4 py-2.5 bg-brand-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50"
              >
                {generating ? "Generating..." : "Generate All Outputs"}
              </button>
            )}
            {candidate.status === "generated" && (
              <button
                onClick={() => handleStatusChange("reviewed")}
                className="w-full px-4 py-2 border border-emerald-300 text-emerald-700 text-sm font-medium rounded-lg hover:bg-emerald-50 transition-colors"
              >
                Mark as Reviewed
              </button>
            )}
          </div>
        </div>

        {/* Right: Output tabs */}
        <div className="lg:col-span-2">
          {!hasOutputs ? (
            <div className="bg-white rounded-xl border border-neutral-300 flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm text-neutral-500 mb-4">
                No outputs generated yet. Click "Generate All Outputs" to start.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-neutral-300 overflow-hidden">
              {/* Tabs */}
              <div className="flex border-b border-neutral-200">
                {(
                  [
                    { key: "case_study", label: "Case Study" },
                    { key: "linkedin_post", label: "LinkedIn Post" },
                    { key: "nurturing_email", label: "Email" },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                      activeTab === tab.key
                        ? "text-brand-black border-b-2 border-brand-black"
                        : "text-neutral-500 hover:text-neutral-700"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="p-5">
                {!currentOutput ? (
                  <p className="text-sm text-neutral-400 text-center py-8">Not generated yet</p>
                ) : activeTab === "case_study" ? (
                  <CaseStudyPreview
                    output={currentOutput}
                    onPublish={() => handlePublish(currentOutput.id)}
                    onUnpublish={() => handleUnpublish(currentOutput.id)}
                    publishing={publishing}
                  />
                ) : activeTab === "linkedin_post" ? (
                  <LinkedInPreview
                    output={currentOutput}
                    onCopy={handleCopy}
                    copied={copied}
                  />
                ) : (
                  <EmailPreview
                    output={currentOutput}
                    onCopy={handleCopy}
                    copied={copied}
                  />
                )}

                {/* Regenerate section */}
                {currentOutput && (
                  <div className="mt-6 pt-4 border-t border-neutral-200">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={regenerateInstruction}
                        onChange={(e) => setRegenerateInstruction(e.target.value)}
                        placeholder="Instruction for regeneration (e.g., 'Make the headline more punchy')"
                        className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg text-sm bg-white text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-black/20"
                      />
                      <button
                        onClick={() => handleRegenerate(currentOutput.id)}
                        disabled={regenerating || !regenerateInstruction.trim()}
                        className="px-4 py-2 bg-neutral-800 text-white text-sm font-medium rounded-lg hover:bg-neutral-700 transition-colors disabled:opacity-50"
                      >
                        {regenerating ? "Regenerating..." : "Regenerate"}
                      </button>
                    </div>
                    <p className="text-xs text-neutral-400 mt-1">
                      Version {currentOutput.currentVersion}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function CaseStudyPreview({
  output,
  onPublish,
  onUnpublish,
  publishing,
}: {
  output: CaseStudyOutput;
  onPublish: () => void;
  onUnpublish: () => void;
  publishing: boolean;
}) {
  const cs = output.content as Record<string, unknown>;
  const stats = cs.stats as Array<{ label: string; value: string }> | undefined;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-neutral-400 uppercase tracking-wider">Headline</p>
        <p className="text-lg font-bold text-brand-black mt-1">{cs.headline as string}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-neutral-400 text-xs">Client</p>
          <p className="font-medium">{cs.client as string}</p>
        </div>
        <div>
          <p className="text-neutral-400 text-xs">Category</p>
          <p className="font-medium">{cs.category as string}</p>
        </div>
        <div>
          <p className="text-neutral-400 text-xs">Deliverable</p>
          <p>{cs.deliverable as string}</p>
        </div>
        <div>
          <p className="text-neutral-400 text-xs">Key Metric</p>
          <p className="font-semibold">{cs.keyMetric as string}</p>
        </div>
      </div>
      <div>
        <p className="text-neutral-400 text-xs">Brief</p>
        <p className="text-sm mt-1">{cs.brief as string}</p>
      </div>
      <div>
        <p className="text-neutral-400 text-xs">Result</p>
        <p className="text-sm mt-1">{cs.result as string}</p>
      </div>
      {stats && stats.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {stats.map((stat, i) => (
            <div key={i} className="bg-neutral-50 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-brand-black">{stat.value}</p>
              <p className="text-xs text-neutral-500">{stat.label}</p>
            </div>
          ))}
        </div>
      )}
      <div>
        <p className="text-neutral-400 text-xs">Meta Description</p>
        <p className="text-sm mt-1 text-neutral-600">{cs.metaDescription as string}</p>
      </div>
      <div>
        <p className="text-neutral-400 text-xs">Slug</p>
        <p className="text-sm mt-1 font-mono text-neutral-600">/work/{cs.slug as string}</p>
      </div>

      {/* Publish actions */}
      <div className="flex gap-2 pt-2">
        {output.publishedAt ? (
          <>
            <a
              href={`/work/${output.caseStudySlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-green-700 text-white text-sm font-medium rounded-lg"
            >
              View on Website
            </a>
            <button
              onClick={onUnpublish}
              disabled={publishing}
              className="px-4 py-2 border border-red-300 text-red-700 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {publishing ? "Unpublishing..." : "Unpublish"}
            </button>
          </>
        ) : (
          <button
            onClick={onPublish}
            disabled={publishing}
            className="px-4 py-2 bg-green-700 text-white text-sm font-medium rounded-lg hover:bg-green-800 transition-colors disabled:opacity-50"
          >
            {publishing ? "Publishing..." : "Publish to Website"}
          </button>
        )}
      </div>
    </div>
  );
}

function LinkedInPreview({
  output,
  onCopy,
  copied,
}: {
  output: CaseStudyOutput;
  onCopy: (text: string) => void;
  copied: boolean;
}) {
  const post = output.content as Record<string, unknown>;
  const fullText = `${post.hook}\n\n${post.body}\n\n${post.proofPoints}\n\n${post.hashtags}`;
  const charCount = (post.charCount as number) ?? fullText.length;

  return (
    <div className="space-y-4">
      <div className="bg-neutral-50 rounded-lg p-4 text-sm whitespace-pre-wrap font-sans leading-relaxed">
        <p className="font-bold">{post.hook as string}</p>
        <br />
        <p>{post.body as string}</p>
        <br />
        <p>{post.proofPoints as string}</p>
        <br />
        <p className="text-blue-600">{post.hashtags as string}</p>
      </div>
      <div className="flex items-center justify-between">
        <span className={`text-xs ${charCount > 1300 ? "text-red-600 font-bold" : "text-neutral-400"}`}>
          {charCount} / 1,300 characters
        </span>
        <button
          onClick={() => onCopy(fullText)}
          className="px-3 py-1.5 border border-neutral-300 text-sm rounded-lg hover:bg-neutral-100 transition-colors"
        >
          {copied ? "Copied!" : "Copy to Clipboard"}
        </button>
      </div>
    </div>
  );
}

function EmailPreview({
  output,
  onCopy,
  copied,
}: {
  output: CaseStudyOutput;
  onCopy: (text: string) => void;
  copied: boolean;
}) {
  const email = output.content as Record<string, unknown>;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-neutral-400 uppercase tracking-wider">Subject Line</p>
        <p className="text-sm font-bold mt-1">{email.subject as string}</p>
        <span className="text-xs text-neutral-400">{(email.subject as string).length} / 60 chars</span>
      </div>
      <div className="bg-neutral-50 rounded-lg p-4 text-sm whitespace-pre-wrap leading-relaxed">
        {email.body as string}
      </div>
      <div className="flex items-center gap-3">
        <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
          Segment: {email.suggestedSegment as string}
        </span>
        <span className="text-xs text-neutral-400">
          CTA: {email.ctaText as string}
        </span>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onCopy(`Subject: ${email.subject}\n\n${email.body}`)}
          className="px-3 py-1.5 border border-neutral-300 text-sm rounded-lg hover:bg-neutral-100 transition-colors"
        >
          {copied ? "Copied!" : "Copy Text"}
        </button>
      </div>
    </div>
  );
}
