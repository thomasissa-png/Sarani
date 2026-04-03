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

interface PipelineStep {
  step: number;
  agent: string;
  output: unknown;
  completedAt: string;
}

type PipelineStatus =
  | "idle"
  | "step_1_creative"
  | "step_2_copywriter"
  | "step_3_social"
  | "complete"
  | "failed";

interface VisualItem {
  id: string;
  name: string;
  thumbnailUrl: string;
  downloadUrl: string;
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
  pipelineStatus: PipelineStatus;
  pipelineSteps: PipelineStep[];
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
  const [visuals, setVisuals] = useState<VisualItem[]>([]);
  const [selectedVisuals, setSelectedVisuals] = useState<Set<string>>(new Set());
  const [visualsLoading, setVisualsLoading] = useState(false);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

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

  // ─── Fetch visuals from SharePoint ────────────────────────────────────

  const fetchVisuals = useCallback(async () => {
    setVisualsLoading(true);
    try {
      const res = await fetch(`/api/admin/case-studies/candidates/${id}/visuals`);
      if (!res.ok) return;
      const data = await res.json();
      setVisuals(data.visuals ?? []);
    } catch {
      // Silently fail — visuals are optional
    } finally {
      setVisualsLoading(false);
    }
  }, [id]);

  // Fetch visuals when pipeline is complete or candidate has outputs
  useEffect(() => {
    if (
      candidate?.pipelineStatus === "complete" ||
      candidate?.outputs.caseStudy
    ) {
      fetchVisuals();
    }
  }, [candidate?.pipelineStatus, candidate?.outputs.caseStudy, fetchVisuals]);

  const toggleVisualSelection = (visualId: string) => {
    setSelectedVisuals((prev) => {
      const next = new Set(prev);
      if (next.has(visualId)) {
        next.delete(visualId);
      } else {
        next.add(visualId);
      }
      return next;
    });
  };

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
    if (!window.confirm("This case study will be published on sarani.studio and visible to everyone. Continue?")) return;
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

  const [copyLabel, setCopyLabel] = useState("");

  const handleCopy = (text: string, label?: string) => {
    navigator.clipboard.writeText(text);
    setCopyLabel(label ?? "Copied!");
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      setCopyLabel("");
    }, 2500);
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
        <button onClick={() => router.push("/admin/agents/case-studies")} className="mt-4 text-sm text-brand-black underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-black focus-visible:ring-offset-2">
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
          className="p-2 rounded-lg hover:bg-neutral-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-black focus-visible:ring-offset-2"
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
          <button onClick={() => setError(null)} className="ml-2 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-black focus-visible:ring-offset-2">Dismiss</button>
        </div>
      )}

      {/* Pipeline Progress Bar */}
      <PipelineProgressBar
        status={candidate.pipelineStatus}
        steps={candidate.pipelineSteps}
        expandedStep={expandedStep}
        onToggleStep={(step) =>
          setExpandedStep(expandedStep === step ? null : step)
        }
      />
      {candidate.pipelineStatus === "failed" && (
        <p className="mt-2 text-sm text-red-600">
          Pipeline failed. You can try again by clicking &quot;Generate All Outputs&quot; above.
        </p>
      )}

      {/* Visual Suggestions Panel */}
      {(candidate.pipelineStatus === "complete" ||
        candidate.outputs.caseStudy) &&
        !visualsLoading &&
        visuals.length > 0 && (
          <VisualSuggestionsPanel
            visuals={visuals}
            selectedVisuals={selectedVisuals}
            onToggle={toggleVisualSelection}
            sharePointUrl={candidate.sharePointFolderUrl}
          />
        )}
      {visualsLoading && (
        <div className="flex items-center gap-2 px-4 py-3 bg-white rounded-xl border border-neutral-300">
          <svg className="w-4 h-4 animate-spin text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          <span className="text-sm text-neutral-500">Loading visual assets from SharePoint...</span>
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
                className="w-full px-4 py-2.5 bg-brand-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-black focus-visible:ring-offset-2"
              >
                {generating ? "Generating..." : "Generate All Outputs"}
              </button>
            )}
            {candidate.status === "generated" && (
              <button
                onClick={() => handleStatusChange("reviewed")}
                className="w-full px-4 py-2 border border-brand-cerulean/30 text-brand-cerulean text-sm font-medium rounded-lg hover:bg-brand-cerulean/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-black focus-visible:ring-offset-2"
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
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-black focus-visible:ring-offset-2 ${
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
                    copyLabel={copyLabel}
                  />
                ) : (
                  <EmailPreview
                    output={currentOutput}
                    onCopy={handleCopy}
                    copied={copied}
                    copyLabel={copyLabel}
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
                        className="px-4 py-2 bg-neutral-800 text-white text-sm font-medium rounded-lg hover:bg-neutral-700 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-black focus-visible:ring-offset-2"
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
        <p className="text-sm mt-1 font-mono text-neutral-600">/case-studies/{cs.slug as string}</p>
      </div>

      {/* Publish actions */}
      <div className="flex gap-2 pt-2">
        {output.publishedAt ? (
          <>
            <a
              href={`/case-studies/${output.caseStudySlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-green-700 text-white text-sm font-medium rounded-lg"
            >
              View on Website
            </a>
            <button
              onClick={onUnpublish}
              disabled={publishing}
              className="px-4 py-2 border border-red-300 text-red-700 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-black focus-visible:ring-offset-2"
            >
              {publishing ? "Unpublishing..." : "Unpublish"}
            </button>
          </>
        ) : (
          <button
            onClick={onPublish}
            disabled={publishing}
            className="px-4 py-2 bg-green-700 text-white text-sm font-medium rounded-lg hover:bg-green-800 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-black focus-visible:ring-offset-2"
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
  copyLabel,
}: {
  output: CaseStudyOutput;
  onCopy: (text: string, label?: string) => void;
  copied: boolean;
  copyLabel: string;
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
          onClick={() => onCopy(fullText, "Copied! Paste on LinkedIn.")}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0A66C2] text-white text-sm font-medium rounded-lg hover:bg-[#004182] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-black focus-visible:ring-offset-2"
        >
          {copied ? (
            copyLabel
          ) : (
            <>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              Copy LinkedIn Post
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function EmailPreview({
  output,
  onCopy,
  copied,
  copyLabel,
}: {
  output: CaseStudyOutput;
  onCopy: (text: string, label?: string) => void;
  copied: boolean;
  copyLabel: string;
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
          onClick={() => onCopy(`Subject: ${email.subject}\n\n${email.body}`, "Copied!")}
          className="px-3 py-1.5 border border-neutral-300 text-sm rounded-lg hover:bg-neutral-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-black focus-visible:ring-offset-2"
        >
          {copied ? (copyLabel || "Copied!") : "Copy Email"}
        </button>
      </div>
    </div>
  );
}

// ─── Pipeline Progress Bar ────────────────────────────────────────────────

const PIPELINE_STEPS_CONFIG = [
  { step: 1, key: "step_1_creative", label: "Creative Strategy", agent: "creative-strategy" },
  { step: 2, key: "step_2_copywriter", label: "Copywriter", agent: "copywriter" },
  { step: 3, key: "step_3_social", label: "Social", agent: "social" },
] as const;

function getStepState(
  stepKey: string,
  pipelineStatus: PipelineStatus,
  completedSteps: PipelineStep[]
): "pending" | "active" | "complete" | "failed" {
  const isComplete = completedSteps.some(
    (s) => s.agent === PIPELINE_STEPS_CONFIG.find((c) => c.key === stepKey)?.agent
  );
  if (isComplete) return "complete";
  if (pipelineStatus === "failed") {
    // If the current active step matches and status is failed
    if (pipelineStatus === "failed" && stepKey === getActiveStepKey(pipelineStatus)) {
      return "failed";
    }
  }
  if (stepKey === getActiveStepKey(pipelineStatus)) return "active";
  return "pending";
}

function getActiveStepKey(status: PipelineStatus): string | null {
  switch (status) {
    case "step_1_creative": return "step_1_creative";
    case "step_2_copywriter": return "step_2_copywriter";
    case "step_3_social": return "step_3_social";
    default: return null;
  }
}

function PipelineProgressBar({
  status,
  steps,
  expandedStep,
  onToggleStep,
}: {
  status: PipelineStatus;
  steps: PipelineStep[];
  expandedStep: number | null;
  onToggleStep: (step: number) => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-neutral-300 p-5">
      <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-4">
        Pipeline Progress
      </h2>
      <div className="flex items-center gap-2">
        {PIPELINE_STEPS_CONFIG.map((config, i) => {
          const state = getStepState(config.key, status, steps);
          const completedStep = steps.find((s) => s.agent === config.agent);

          return (
            <div key={config.key} className="flex items-center gap-2 flex-1">
              {/* Step pill */}
              <button
                onClick={() => {
                  if (state === "complete" && completedStep) {
                    onToggleStep(config.step);
                  }
                }}
                disabled={state !== "complete"}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-black focus-visible:ring-offset-2 ${
                  state === "complete"
                    ? "bg-brand-cerulean/10 text-brand-cerulean border border-brand-cerulean/30 cursor-pointer hover:bg-brand-cerulean/20"
                    : state === "active"
                      ? "bg-brand-lemon/10 text-brand-black border border-brand-lemon/40"
                      : state === "failed"
                        ? "bg-brand-flame/10 text-brand-flame border border-brand-flame/30"
                        : "bg-neutral-50 text-neutral-400 border border-neutral-200"
                }`}
              >
                {state === "complete" && (
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                {state === "active" && (
                  <svg className="w-3.5 h-3.5 animate-spin shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                )}
                {state === "failed" && (
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                )}
                {config.label}
              </button>

              {/* Arrow connector (not after last) */}
              {i < PIPELINE_STEPS_CONFIG.length - 1 && (
                <svg className="w-4 h-4 text-neutral-300 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              )}
            </div>
          );
        })}
      </div>

      {/* Expanded step output */}
      {expandedStep !== null && (
        <div className="mt-4 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">
              Step {expandedStep} Output
            </h3>
            <button
              onClick={() => onToggleStep(expandedStep)}
              className="text-neutral-400 hover:text-neutral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-black focus-visible:ring-offset-2"
              aria-label="Close step details"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          {(() => {
            const step = steps.find((s) => s.step === expandedStep);
            if (!step) return <p className="text-sm text-neutral-400">No output data available.</p>;
            const output = step.output as Record<string, unknown> | null;
            if (!output) return <p className="text-sm text-neutral-400">No output data available.</p>;
            // Show a summary: strategy for step 1, key fields for steps 2-3
            if (typeof output === "object") {
              return (
                <div className="space-y-2 text-sm text-neutral-700 max-h-48 overflow-y-auto">
                  {Object.entries(output).slice(0, 6).map(([key, val]) => (
                    <div key={key}>
                      <span className="font-medium text-neutral-500 capitalize">
                        {key.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim()}:
                      </span>{" "}
                      <span>{typeof val === "string" ? val : JSON.stringify(val)}</span>
                    </div>
                  ))}
                </div>
              );
            }
            return <pre className="text-xs text-neutral-600 overflow-auto">{JSON.stringify(output, null, 2)}</pre>;
          })()}
        </div>
      )}
    </div>
  );
}

// ─── Visual Suggestions Panel ─────────────────────────────────────────────

function VisualSuggestionsPanel({
  visuals,
  selectedVisuals,
  onToggle,
  sharePointUrl,
}: {
  visuals: VisualItem[];
  selectedVisuals: Set<string>;
  onToggle: (id: string) => void;
  sharePointUrl: string | null;
}) {
  return (
    <div className="bg-white rounded-xl border border-neutral-300 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
          Visual Assets ({visuals.length})
        </h2>
        {sharePointUrl && (
          <a
            href={sharePointUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
          >
            Browse more in SharePoint
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {visuals.map((v) => {
          const isSelected = selectedVisuals.has(v.id);
          return (
            <button
              key={v.id}
              onClick={() => onToggle(v.id)}
              className={`relative group aspect-video rounded-lg overflow-hidden border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-black focus-visible:ring-offset-2 ${
                isSelected
                  ? "border-brand-cerulean ring-2 ring-brand-cerulean/20"
                  : "border-transparent hover:border-neutral-300"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={v.thumbnailUrl}
                alt={v.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              {/* Checkbox overlay */}
              <div
                className={`absolute top-2 right-2 w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                  isSelected
                    ? "bg-brand-cerulean text-white"
                    : "bg-white/80 border border-neutral-300 group-hover:bg-white"
                }`}
              >
                {isSelected && (
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              {/* Name tooltip */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-[10px] text-white truncate">{v.name}</p>
              </div>
            </button>
          );
        })}
      </div>
      {selectedVisuals.size > 0 && (
        <p className="mt-3 text-xs text-brand-cerulean font-medium">
          {selectedVisuals.size} visual{selectedVisuals.size !== 1 ? "s" : ""} selected
        </p>
      )}
    </div>
  );
}
