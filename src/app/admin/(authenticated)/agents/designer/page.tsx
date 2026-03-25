"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { Client } from "@/lib/db/schema";
import {
  ASSET_TYPES,
  ASSET_TYPE_LABELS,
  STYLES,
  STYLE_LABELS,
  PLATFORMS,
  PLATFORM_LABELS,
  DIMENSION_PRESETS,
  type AssetType,
  type DesignStyle,
  type DesignPlatform,
  type DesignerResponse,
  type ImagePrompt,
  type ColorEntry,
} from "@/lib/validations/designer";

// ─── Types ──────────────────────────────────────────────────────────────────

type DesignerApiResponse = {
  design: DesignerResponse;
  outputId: string;
  usage: { inputTokens: number; outputTokens: number };
};

type FormState = {
  clientId: string;
  assetType: AssetType;
  dimensions: string;
  customDimensions: string;
  quantity: number;
  briefDescription: string;
  style: DesignStyle;
  platform: DesignPlatform;
};

// ─── Page Component ─────────────────────────────────────────────────────────

export default function DesignerPage() {
  // Clients data
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);

  // Form state
  const [form, setForm] = useState<FormState>({
    clientId: "",
    assetType: "banner",
    dimensions: "1920x1080",
    customDimensions: "",
    quantity: 3,
    briefDescription: "",
    style: "modern",
    platform: "web",
  });

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<DesignerResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch clients ───────────────────────────────────────────────────────

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/clients?status=active");
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch (err) {
      console.error("Failed to fetch clients:", err);
    } finally {
      setLoadingClients(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // ── Selected client brand info ──────────────────────────────────────────

  const selectedClient = clients.find((c) => c.id === form.clientId);

  // ── Get effective dimensions ────────────────────────────────────────────

  function getEffectiveDimensions(): string {
    if (form.dimensions === "custom") {
      return form.customDimensions;
    }
    return form.dimensions;
  }

  // ── Handle generate ─────────────────────────────────────────────────────

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!form.clientId) {
      setError("Please select a client. Brand context is required for the designer.");
      return;
    }

    if (!form.briefDescription.trim()) {
      setError("Please describe the creative brief.");
      return;
    }

    const dims = getEffectiveDimensions();
    if (!dims || !/^\d{2,5}x\d{2,5}$/.test(dims)) {
      setError("Please enter valid dimensions in WxH format (e.g. 1920x1080).");
      return;
    }

    setGenerating(true);

    try {
      const res = await fetch("/api/admin/agents/designer/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: form.clientId,
          assetType: form.assetType,
          dimensions: dims,
          quantity: form.quantity,
          briefDescription: form.briefDescription,
          style: form.style,
          platform: form.platform,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Generation failed");
      }

      const data: DesignerApiResponse = await res.json();
      setResult(data.design);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate design brief"
      );
    } finally {
      setGenerating(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-black">
            Graphic Designer
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            Generate creative briefs and image prompts respecting brand
            guidelines
          </p>
        </div>
        <Link
          href="/admin/agents/designer/history"
          className="px-4 py-2 bg-white border border-neutral-300 text-sm font-semibold rounded-lg hover:bg-neutral-100 transition-colors text-brand-black"
        >
          History
        </Link>
      </div>

      {/* Generation Form */}
      <form
        onSubmit={handleGenerate}
        className="bg-white rounded-xl border border-neutral-300 p-6 space-y-5"
      >
        <h2 className="text-lg font-semibold text-brand-black">
          New Design Brief
        </h2>

        {/* Client select (required) */}
        <div>
          <label
            htmlFor="client"
            className="block text-sm font-medium text-neutral-700 mb-1.5"
          >
            Client{" "}
            <span className="text-red-500 font-normal">*</span>
            <span className="text-neutral-400 font-normal ml-1">
              (brand assets will be loaded)
            </span>
          </label>
          {loadingClients ? (
            <div className="text-sm text-neutral-400">Loading clients...</div>
          ) : (
            <select
              id="client"
              value={form.clientId}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, clientId: e.target.value }))
              }
              className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
            >
              <option value="">Select a client...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.industry})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Brand preview (shown when client selected) */}
        {selectedClient && (
          <BrandPreview client={selectedClient} />
        )}

        {/* Asset type + Style + Platform */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label
              htmlFor="assetType"
              className="block text-sm font-medium text-neutral-700 mb-1.5"
            >
              Asset Type
            </label>
            <select
              id="assetType"
              value={form.assetType}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  assetType: e.target.value as AssetType,
                }))
              }
              className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
            >
              {ASSET_TYPES.map((type) => (
                <option key={type} value={type}>
                  {ASSET_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="style"
              className="block text-sm font-medium text-neutral-700 mb-1.5"
            >
              Style
            </label>
            <select
              id="style"
              value={form.style}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  style: e.target.value as DesignStyle,
                }))
              }
              className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
            >
              {STYLES.map((s) => (
                <option key={s} value={s}>
                  {STYLE_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="platform"
              className="block text-sm font-medium text-neutral-700 mb-1.5"
            >
              Platform
            </label>
            <select
              id="platform"
              value={form.platform}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  platform: e.target.value as DesignPlatform,
                }))
              }
              className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
            >
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {PLATFORM_LABELS[p]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Dimensions + Quantity */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="dimensions"
              className="block text-sm font-medium text-neutral-700 mb-1.5"
            >
              Dimensions
            </label>
            <select
              id="dimensions"
              value={form.dimensions}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  dimensions: e.target.value,
                }))
              }
              className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
            >
              {DIMENSION_PRESETS.map((preset) => (
                <option key={preset.value} value={preset.value}>
                  {preset.label}
                </option>
              ))}
            </select>
            {form.dimensions === "custom" && (
              <input
                type="text"
                placeholder="e.g. 1200x800"
                value={form.customDimensions}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    customDimensions: e.target.value,
                  }))
                }
                className="w-full mt-2 px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
              />
            )}
          </div>
          <div>
            <label
              htmlFor="quantity"
              className="block text-sm font-medium text-neutral-700 mb-1.5"
            >
              Number of Variations
            </label>
            <input
              id="quantity"
              type="number"
              min={1}
              max={6}
              value={form.quantity}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  quantity: parseInt(e.target.value) || 1,
                }))
              }
              className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
            />
          </div>
        </div>

        {/* Brief description */}
        <div>
          <label
            htmlFor="briefDescription"
            className="block text-sm font-medium text-neutral-700 mb-1.5"
          >
            Creative Brief
          </label>
          <textarea
            id="briefDescription"
            value={form.briefDescription}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                briefDescription: e.target.value,
              }))
            }
            placeholder="Describe what you need: campaign theme, key message, visual direction, target audience, any specific elements to include..."
            rows={5}
            className="w-full px-4 py-3 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent resize-y"
          />
          <p className="text-xs text-neutral-400 mt-1">
            {form.briefDescription.length.toLocaleString()} characters
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={generating}
            className="px-6 py-2.5 bg-brand-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? "Generating..." : "Generate Brief"}
          </button>
        </div>
      </form>

      {/* Output */}
      {result && <DesignerOutput result={result} />}
    </div>
  );
}

// ─── Brand Preview Component ────────────────────────────────────────────────

function BrandPreview({ client }: { client: Client }) {
  const hasAnyBrand =
    client.primaryColor || client.fontName || client.brandTone;

  if (!hasAnyBrand) {
    return (
      <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
        This client has no brand assets defined. The designer will use
        professional defaults and flag the gaps.
      </div>
    );
  }

  return (
    <div className="bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-3 space-y-2">
      <h3 className="text-xs font-semibold text-neutral-500 uppercase">
        Brand Assets
      </h3>
      <div className="flex items-center gap-4 flex-wrap">
        {client.primaryColor && (
          <div className="flex items-center gap-2">
            <div
              className="w-5 h-5 rounded border border-neutral-300"
              style={{ backgroundColor: client.primaryColor }}
            />
            <span className="text-xs text-neutral-600 font-mono">
              {client.primaryColor}
            </span>
          </div>
        )}
        {client.secondaryColors && (
          <div className="flex items-center gap-1">
            {client.secondaryColors
              .split(",")
              .map((c) => c.trim())
              .filter(Boolean)
              .map((color) => (
                <div
                  key={color}
                  className="w-5 h-5 rounded border border-neutral-300"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
          </div>
        )}
        {client.fontName && (
          <span className="text-xs text-neutral-600">
            Font: {client.fontName}
          </span>
        )}
        {client.brandTone && (
          <span className="text-xs text-neutral-600">
            Tone: {client.brandTone}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Designer Output Component ──────────────────────────────────────────────

function DesignerOutput({ result }: { result: DesignerResponse }) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  async function handleCopyPrompt(prompt: ImagePrompt) {
    await navigator.clipboard.writeText(prompt.prompt);
    setCopiedIndex(prompt.promptIndex);
    setTimeout(() => setCopiedIndex(null), 2000);
  }

  return (
    <div className="space-y-5">
      {/* Creative Brief Card */}
      <div className="bg-white rounded-xl border border-neutral-300 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-brand-black">
          Creative Brief
        </h2>

        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-neutral-700">
              {result.creativeBrief.projectTitle}
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-neutral-500">Objective:</span>
              <p className="text-neutral-700 mt-0.5">
                {result.creativeBrief.objective}
              </p>
            </div>
            <div>
              <span className="font-medium text-neutral-500">
                Target Audience:
              </span>
              <p className="text-neutral-700 mt-0.5">
                {result.creativeBrief.targetAudience}
              </p>
            </div>
            <div>
              <span className="font-medium text-neutral-500">
                Key Message:
              </span>
              <p className="text-neutral-700 mt-0.5">
                {result.creativeBrief.keyMessage}
              </p>
            </div>
            <div>
              <span className="font-medium text-neutral-500">
                Tone & Mood:
              </span>
              <p className="text-neutral-700 mt-0.5">
                {result.creativeBrief.toneAndMood}
              </p>
            </div>
          </div>

          <div>
            <span className="font-medium text-neutral-500 text-sm">
              Composition Notes:
            </span>
            <p className="text-sm text-neutral-700 mt-0.5">
              {result.creativeBrief.compositionNotes}
            </p>
          </div>

          {/* Technical Specs */}
          <div className="bg-neutral-50 rounded-lg px-4 py-3">
            <h4 className="text-xs font-semibold text-neutral-500 uppercase mb-2">
              Technical Specs
            </h4>
            <div className="grid grid-cols-3 gap-3 text-xs text-neutral-600">
              <div>
                Dimensions:{" "}
                {result.creativeBrief.technicalSpecs.dimensions}
              </div>
              <div>
                Format: {result.creativeBrief.technicalSpecs.format}
              </div>
              <div>
                Resolution:{" "}
                {result.creativeBrief.technicalSpecs.resolution}
              </div>
              <div>
                Color Space:{" "}
                {result.creativeBrief.technicalSpecs.colorSpace}
              </div>
              <div>
                Safe Zone:{" "}
                {result.creativeBrief.technicalSpecs.safeZone}
              </div>
            </div>
          </div>

          {/* References */}
          {result.creativeBrief.references.length > 0 && (
            <div>
              <span className="font-medium text-neutral-500 text-sm">
                Visual References:
              </span>
              <ul className="mt-1 space-y-1">
                {result.creativeBrief.references.map((ref, i) => (
                  <li
                    key={i}
                    className="text-sm text-neutral-700 flex items-start gap-2"
                  >
                    <span className="text-neutral-400 shrink-0">--</span>
                    {ref}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Image Prompts */}
      <div className="bg-white rounded-xl border border-neutral-300 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-brand-black">
          Image Generation Prompts ({result.imagePrompts.length})
        </h2>

        <div className="space-y-4">
          {result.imagePrompts.map((prompt) => (
            <div
              key={prompt.promptIndex}
              className="border border-neutral-200 rounded-lg p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium bg-neutral-200 text-neutral-700 px-2 py-0.5 rounded">
                    #{prompt.promptIndex}
                  </span>
                  <span className="text-sm font-semibold text-brand-black">
                    {prompt.title}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-400">
                    {prompt.platform} | {prompt.aspectRatio}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyPrompt(prompt)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-neutral-300 text-brand-black hover:bg-neutral-100 transition-colors"
                  >
                    {copiedIndex === prompt.promptIndex
                      ? "Copied!"
                      : "Copy Prompt"}
                  </button>
                </div>
              </div>
              <p className="text-sm text-neutral-700 bg-neutral-50 rounded-lg p-3 font-mono leading-relaxed whitespace-pre-wrap">
                {prompt.prompt}
              </p>
              {prompt.negativePrompt && (
                <div>
                  <span className="text-xs font-medium text-neutral-500">
                    Negative prompt:
                  </span>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {prompt.negativePrompt}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Color Palette */}
      <div className="bg-white rounded-xl border border-neutral-300 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-brand-black">
          Color Palette
        </h2>
        <div className="grid grid-cols-5 gap-3">
          <ColorSwatch
            label="Primary"
            entry={result.colorPalette.primary}
          />
          {result.colorPalette.secondary.map((entry, i) => (
            <ColorSwatch
              key={i}
              label={`Secondary ${i + 1}`}
              entry={entry}
            />
          ))}
          <ColorSwatch
            label="Accent"
            entry={result.colorPalette.accent}
          />
          <ColorSwatch
            label="Background"
            entry={result.colorPalette.background}
          />
          <ColorSwatch
            label="Text"
            entry={result.colorPalette.text}
          />
        </div>
      </div>

      {/* Typography */}
      <div className="bg-white rounded-xl border border-neutral-300 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-brand-black">
          Typography
        </h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-neutral-500">
              Primary Font:
            </span>
            <p className="text-neutral-700 mt-0.5">
              {result.typographyRecommendations.primaryFont}
            </p>
          </div>
          <div>
            <span className="font-medium text-neutral-500">
              Secondary Font:
            </span>
            <p className="text-neutral-700 mt-0.5">
              {result.typographyRecommendations.secondaryFont}
            </p>
          </div>
        </div>
        <div className="bg-neutral-50 rounded-lg px-4 py-3">
          <h4 className="text-xs font-semibold text-neutral-500 uppercase mb-2">
            Hierarchy
          </h4>
          <div className="space-y-1.5">
            {result.typographyRecommendations.hierarchy.map(
              (level, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 text-xs text-neutral-600"
                >
                  <span className="font-medium w-24">{level.level}</span>
                  <span>{level.weight}</span>
                  <span className="text-neutral-400">
                    {level.sizeRange}
                  </span>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Designer Notes */}
      {result.notes.length > 0 && (
        <div className="bg-white rounded-xl border border-neutral-300 p-6 space-y-3">
          <h2 className="text-lg font-semibold text-brand-black">
            Designer Notes
          </h2>
          <ul className="text-sm text-neutral-600 space-y-1.5">
            {result.notes.map((note, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-neutral-400 shrink-0">--</span>
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Color Swatch Component ─────────────────────────────────────────────────

function ColorSwatch({
  label,
  entry,
}: {
  label: string;
  entry: ColorEntry;
}) {
  return (
    <div className="space-y-1.5">
      <div
        className="w-full h-14 rounded-lg border border-neutral-200"
        style={{ backgroundColor: entry.hex }}
      />
      <div>
        <p className="text-xs font-semibold text-neutral-700">{label}</p>
        <p className="text-xs text-neutral-500 font-mono">{entry.hex}</p>
        <p className="text-xs text-neutral-400">{entry.name}</p>
      </div>
    </div>
  );
}
