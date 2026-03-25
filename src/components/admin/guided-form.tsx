"use client";

import { useState, useEffect, useCallback, useRef, type DragEvent } from "react";
import type { Client } from "@/lib/db/schema";

// ─── Client Context Panel ────────────────────────────────────────────────────
// Shows client details when selected — brand tone, languages, colors, etc.

export function ClientContextPanel({ client }: { client: Client | null }) {
  if (!client) return null;

  return (
    <div className="bg-info-light border border-info rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-info" />
        <span className="text-sm font-semibold text-info">
          Client context loaded — {client.name}
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
        <div>
          <span className="font-medium text-info">Industry</span>
          <p className="text-info capitalize">{client.industry}</p>
        </div>
        <div>
          <span className="font-medium text-info">Primary language</span>
          <p className="text-info">{client.primaryLanguage}</p>
        </div>
        {client.brandTone && (
          <div className="col-span-2 md:col-span-1">
            <span className="font-medium text-info">Brand tone</span>
            <p className="text-info line-clamp-2">{client.brandTone}</p>
          </div>
        )}
        {client.primaryColor && (
          <div className="flex items-center gap-2">
            <span className="font-medium text-info">Colors</span>
            <div className="flex gap-1">
              <div
                className="w-4 h-4 rounded border border-info"
                style={{ backgroundColor: client.primaryColor }}
              />
              {client.secondaryColors?.split(",").map((c, i) => (
                <div
                  key={i}
                  className="w-4 h-4 rounded border border-info"
                  style={{ backgroundColor: c.trim() }}
                />
              ))}
            </div>
          </div>
        )}
        {client.fontName && (
          <div>
            <span className="font-medium text-info">Font</span>
            <p className="text-info">{client.fontName}</p>
          </div>
        )}
      </div>
      {client.brandGuidelinesNotes && (
        <div className="text-xs">
          <span className="font-medium text-info">Guidelines</span>
          <p className="text-info line-clamp-2">
            {client.brandGuidelinesNotes}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Enhanced Client Selector ────────────────────────────────────────────────
// Fetches clients, shows dropdown, displays context panel when selected

export function ClientSelector({
  value,
  onChange,
  required = true,
  helperText,
  onClientLoaded,
}: {
  value: string;
  onChange: (clientId: string) => void;
  required?: boolean;
  helperText?: string;
  onClientLoaded?: (client: Client | null) => void;
}) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const selectedClient = clients.find((c) => c.id === value) ?? null;

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/clients?status=active");
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  useEffect(() => {
    onClientLoaded?.(selectedClient);
  }, [selectedClient, onClientLoaded]);

  return (
    <div className="space-y-3">
      <FormField
        label="Client"
        required={required}
        helperText={
          helperText ||
          "Select the client this work is for. Their brand guidelines, tone, and glossary will be automatically applied."
        }
      >
        {loading ? (
          <div className="text-sm text-neutral-400">Loading clients...</div>
        ) : (
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
          >
            <option value="">
              {required
                ? "— Select a client (required) —"
                : "— No client (generic mode) —"}
            </option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.industry} ({c.primaryLanguage})
              </option>
            ))}
          </select>
        )}
      </FormField>
      <ClientContextPanel client={selectedClient} />
    </div>
  );
}

// ─── Form Field with Helper Text ─────────────────────────────────────────────

export function FormField({
  label,
  required = false,
  helperText,
  children,
  error,
}: {
  label: React.ReactNode;
  required?: boolean;
  helperText?: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-neutral-700 mb-1">
        {label}
        {required && <span className="text-error ml-1">*</span>}
      </label>
      {helperText && (
        <p className="text-xs text-neutral-400 mb-1.5">{helperText}</p>
      )}
      {children}
      {error && <p className="text-xs text-error mt-1">{error}</p>}
    </div>
  );
}

// ─── Step Indicator ──────────────────────────────────────────────────────────

export function StepIndicator({
  steps,
  currentStep,
}: {
  steps: string[];
  currentStep: number;
}) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {steps.map((step, i) => (
        <div key={step} className="flex items-center gap-2">
          <div
            className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-colors ${
              i < currentStep
                ? "bg-green-500 text-white"
                : i === currentStep
                  ? "bg-brand-black text-white"
                  : "bg-neutral-200 text-neutral-400"
            }`}
          >
            {i < currentStep ? "✓" : i + 1}
          </div>
          <span
            className={`text-sm font-medium ${
              i <= currentStep ? "text-brand-black" : "text-neutral-400"
            }`}
          >
            {step}
          </span>
          {i < steps.length - 1 && (
            <div
              className={`w-8 h-0.5 ${
                i < currentStep ? "bg-green-500" : "bg-neutral-200"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Pre-Submit Summary ──────────────────────────────────────────────────────

export function PreSubmitSummary({
  items,
  onConfirm,
  onBack,
  loading,
  buttonLabel = "Generate",
}: {
  items: { label: string; value: string }[];
  onConfirm: () => void;
  onBack: () => void;
  loading: boolean;
  buttonLabel?: string;
}) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 space-y-4">
      <h3 className="text-sm font-bold text-amber-900">
        Review before generating
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => (
          <div key={item.label}>
            <span className="text-xs font-medium text-amber-700">
              {item.label}
            </span>
            <p className="text-sm text-amber-900 font-medium">{item.value}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium rounded-lg border border-neutral-300 text-neutral-600 hover:bg-neutral-100 transition-colors"
        >
          ← Back to edit
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className="flex-1 px-6 py-2.5 bg-brand-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Generating..." : buttonLabel}
        </button>
      </div>
    </div>
  );
}

// ─── Guidance Message ────────────────────────────────────────────────────────
// Shared blue info block used by all agent pages for the guidance message.

export function GuidanceMessage({
  text,
  children,
}: {
  text?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
      <p className="text-sm text-blue-800 leading-relaxed">
        {text ?? children}
      </p>
    </div>
  );
}

// ─── Recommended Badge ──────────────────────────────────────────────────────
// Shared orange badge used by agent pages to mark recommended fields.

export function RecommendedBadge() {
  return (
    <span className="text-xs font-medium bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full border border-orange-200">
      Recommended
    </span>
  );
}

// ─── Textarea with char count ────────────────────────────────────────────────

export function TextareaWithCount({
  value,
  onChange,
  placeholder,
  minLength = 0,
  maxLength,
  rows = 4,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minLength?: number;
  maxLength?: number;
  rows?: number;
  id?: string;
}) {
  const count = value.length;
  const isTooShort = minLength > 0 && count > 0 && count < minLength;

  return (
    <div>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        className={`w-full px-4 py-2.5 rounded-lg border ${
          isTooShort ? "border-amber-400" : "border-neutral-300"
        } bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent resize-none`}
      />
      <div className="flex justify-between mt-1">
        {isTooShort && (
          <span className="text-xs text-amber-600">
            Minimum {minLength} characters for best results
          </span>
        )}
        <span className="text-xs text-neutral-400 ml-auto">
          {count}
          {maxLength ? `/${maxLength}` : ""} chars
          {minLength > 0 && count === 0 && ` (min ${minLength})`}
        </span>
      </div>
    </div>
  );
}

// ─── File Upload ────────────────────────────────────────────────────────────
// Drag & drop zone + click to browse. Stores file in state (base64 for v1).

const DEFAULT_ACCEPT =
  ".pdf,.docx,.doc,.png,.jpg,.jpeg,.svg,.zip,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg,image/svg+xml,application/zip";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUpload({
  value,
  onChange,
  accept,
  helperText,
  maxSizeMB = 10,
}: {
  value: File | null;
  onChange: (file: File | null) => void;
  accept?: string;
  helperText?: string;
  maxSizeMB?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [sizeError, setSizeError] = useState<string | null>(null);

  function handleFile(file: File | undefined) {
    if (!file) return;
    if (file.size > maxSizeMB * 1024 * 1024) {
      setSizeError(`File exceeds ${maxSizeMB} MB limit.`);
      return;
    }
    setSizeError(null);
    onChange(file);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    handleFile(file);
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }

  function handleRemove() {
    onChange(null);
    setSizeError(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  const effectiveAccept = accept || DEFAULT_ACCEPT;

  // File selected state
  if (value) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-green-300 bg-green-50">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-600 text-sm font-bold shrink-0">
          &#10003;
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-green-900 truncate">
            {value.name}
          </p>
          <p className="text-xs text-green-600">{formatFileSize(value.size)}</p>
        </div>
        <button
          type="button"
          onClick={handleRemove}
          className="px-2.5 py-1 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
        >
          Remove
        </button>
      </div>
    );
  }

  // Drop zone state
  return (
    <div>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-2 px-6 py-6 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
          dragOver
            ? "border-brand-cerulean bg-blue-50"
            : "border-neutral-300 bg-neutral-50 hover:border-brand-cerulean hover:bg-blue-50/50"
        }`}
      >
        <div className="text-neutral-400 text-2xl">&#8593;</div>
        <p className="text-sm text-neutral-600">
          <span className="font-medium text-brand-cerulean">
            Click to browse
          </span>{" "}
          or drag and drop
        </p>
        <p className="text-xs text-neutral-400">
          PDF, DOCX, PNG, JPG, SVG, ZIP — max {maxSizeMB} MB
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={effectiveAccept}
        onChange={(e) => handleFile(e.target.files?.[0])}
        className="hidden"
      />
      {helperText && (
        <p className="text-xs text-neutral-400 mt-1">{helperText}</p>
      )}
      {sizeError && (
        <p className="text-xs text-red-500 mt-1">{sizeError}</p>
      )}
    </div>
  );
}
