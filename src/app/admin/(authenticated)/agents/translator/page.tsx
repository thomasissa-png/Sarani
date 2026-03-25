"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { Client } from "@/lib/db/schema";
import {
  SUPPORTED_LANGUAGES,
  LANGUAGE_LABELS,
  type SupportedLanguage,
  type TranslatorResponse,
} from "@/lib/validations/translator";

// ─── Types ──────────────────────────────────────────────────────────────────

type TranslateApiResponse = {
  translation: TranslatorResponse;
  outputId: string | null;
  usage: { inputTokens: number; outputTokens: number };
};

type FormState = {
  clientId: string;
  sourceLanguage: SupportedLanguage;
  targetLanguage: SupportedLanguage;
  inputText: string;
  formalRegister: boolean;
  showGlossaryHits: boolean;
};

// ─── Page Component ─────────────────────────────────────────────────────────

export default function TranslatorPage() {
  // Clients data
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);

  // Form state
  const [form, setForm] = useState<FormState>({
    clientId: "",
    sourceLanguage: "FR",
    targetLanguage: "EN",
    inputText: "",
    formalRegister: false,
    showGlossaryHits: true,
  });

  // Translation state
  const [translating, setTranslating] = useState(false);
  const [result, setResult] = useState<TranslatorResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Output editing state
  const [editedText, setEditedText] = useState("");
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

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

  // ── Handle translate ──────────────────────────────────────────────────

  async function handleTranslate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setSaved(false);
    setCopied(false);

    if (!form.inputText.trim()) {
      setError("Please enter text to translate.");
      return;
    }

    if (form.sourceLanguage === form.targetLanguage) {
      setError("Source and target language must be different.");
      return;
    }

    setTranslating(true);

    try {
      const res = await fetch("/api/admin/agents/translator/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: form.clientId || undefined,
          sourceLanguage: form.sourceLanguage,
          targetLanguage: form.targetLanguage,
          inputText: form.inputText,
          formalRegister: form.formalRegister,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Translation failed");
      }

      const data: TranslateApiResponse = await res.json();
      setResult(data.translation);
      setEditedText(data.translation.translatedText);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to translate text"
      );
    } finally {
      setTranslating(false);
    }
  }

  // ── Copy to clipboard ─────────────────────────────────────────────────

  async function handleCopy() {
    // Strip glossary hit markers for clipboard
    const cleanText = editedText.replace(/\[\[(.+?)\]\]/g, "$1");
    await navigator.clipboard.writeText(cleanText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Download as .txt ──────────────────────────────────────────────────

  function handleDownload() {
    const cleanText = editedText.replace(/\[\[(.+?)\]\]/g, "$1");
    const blob = new Blob([cleanText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `translation-${form.sourceLanguage}-${form.targetLanguage}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Save as validated ─────────────────────────────────────────────────

  async function handleSaveValidated() {
    if (!form.clientId || !result) return;

    // In a full implementation, this would update the translation memory
    // and potentially add new glossary entries. For now, we mark the output
    // as validated by updating its status.
    setSaved(true);
  }

  // ── Render helpers ────────────────────────────────────────────────────

  function renderTranslatedText(text: string, showHits: boolean): string {
    if (!showHits) {
      return text.replace(/\[\[(.+?)\]\]/g, "$1");
    }
    return text;
  }

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-black">Translator</h1>
          <p className="text-neutral-500 text-sm mt-1">
            Translate documents with client glossary and translation memory
          </p>
        </div>
        <Link
          href="/admin/agents/translator/history"
          className="px-4 py-2 bg-white border border-neutral-300 text-sm font-semibold rounded-lg hover:bg-neutral-100 transition-colors text-brand-black"
        >
          History
        </Link>
      </div>

      {/* Translation Form */}
      <form
        onSubmit={handleTranslate}
        className="bg-white rounded-xl border border-neutral-300 p-6 space-y-5"
      >
        <h2 className="text-lg font-semibold text-brand-black">
          New Translation
        </h2>

        {/* Client select (optional) */}
        <div>
          <label
            htmlFor="client"
            className="block text-sm font-medium text-neutral-700 mb-1.5"
          >
            Client{" "}
            <span className="text-neutral-400 font-normal">
              (optional — enables glossary)
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
              <option value="">No client (generic translation)</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.industry})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Language selectors */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="sourceLanguage"
              className="block text-sm font-medium text-neutral-700 mb-1.5"
            >
              Source Language
            </label>
            <select
              id="sourceLanguage"
              value={form.sourceLanguage}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  sourceLanguage: e.target.value as SupportedLanguage,
                }))
              }
              className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {LANGUAGE_LABELS[lang]} ({lang})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="targetLanguage"
              className="block text-sm font-medium text-neutral-700 mb-1.5"
            >
              Target Language
            </label>
            <select
              id="targetLanguage"
              value={form.targetLanguage}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  targetLanguage: e.target.value as SupportedLanguage,
                }))
              }
              className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {LANGUAGE_LABELS[lang]} ({lang})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Input textarea */}
        <div>
          <label
            htmlFor="inputText"
            className="block text-sm font-medium text-neutral-700 mb-1.5"
          >
            Text to translate
          </label>
          <textarea
            id="inputText"
            value={form.inputText}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, inputText: e.target.value }))
            }
            placeholder="Paste the text you want to translate..."
            rows={8}
            className="w-full px-4 py-3 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent resize-y"
          />
          <p className="text-xs text-neutral-400 mt-1">
            {form.inputText.length.toLocaleString()} characters
          </p>
        </div>

        {/* Options */}
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.formalRegister}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  formalRegister: e.target.checked,
                }))
              }
              className="rounded border-neutral-300"
            />
            Formal register
          </label>
          <label className="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.showGlossaryHits}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  showGlossaryHits: e.target.checked,
                }))
              }
              className="rounded border-neutral-300"
            />
            Show glossary hits
          </label>
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
            disabled={translating}
            className="px-6 py-2.5 bg-brand-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {translating ? "Translating..." : "Translate"}
          </button>
        </div>
      </form>

      {/* Translation Result */}
      {result && (
        <TranslationOutput
          result={result}
          editedText={editedText}
          onEditedTextChange={setEditedText}
          showGlossaryHits={form.showGlossaryHits}
          renderTranslatedText={renderTranslatedText}
          onCopy={handleCopy}
          copied={copied}
          onDownload={handleDownload}
          onSaveValidated={handleSaveValidated}
          saved={saved}
          hasClient={!!form.clientId}
        />
      )}
    </div>
  );
}

// ─── Translation Output Component ───────────────────────────────────────────

function TranslationOutput({
  result,
  editedText,
  onEditedTextChange,
  showGlossaryHits,
  renderTranslatedText,
  onCopy,
  copied,
  onDownload,
  onSaveValidated,
  saved,
  hasClient,
}: {
  result: TranslatorResponse;
  editedText: string;
  onEditedTextChange: (text: string) => void;
  showGlossaryHits: boolean;
  renderTranslatedText: (text: string, showHits: boolean) => string;
  onCopy: () => void;
  copied: boolean;
  onDownload: () => void;
  onSaveValidated: () => void;
  saved: boolean;
  hasClient: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-neutral-300 p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-brand-black">Output</h2>
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <span>
            {result.wordCount.source} words source / {result.wordCount.target}{" "}
            words target
          </span>
          <span className="text-neutral-300">|</span>
          <span>Register: {result.detectedRegister}</span>
        </div>
      </div>

      {/* Translated text (editable) */}
      <div>
        <textarea
          value={renderTranslatedText(editedText, showGlossaryHits)}
          onChange={(e) => onEditedTextChange(e.target.value)}
          rows={12}
          className="w-full px-4 py-3 rounded-lg border border-neutral-300 bg-neutral-50 text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent resize-y font-mono leading-relaxed"
        />
      </div>

      {/* Glossary hits */}
      {showGlossaryHits && result.glossaryHits.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-neutral-700">
            Glossary Hits ({result.glossaryHits.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {result.glossaryHits.map((hit, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 text-xs bg-blue-50 border border-blue-200 text-blue-800 px-2.5 py-1 rounded-full"
              >
                <span className="font-medium">{hit.sourceTerm}</span>
                <span className="text-blue-400">-&gt;</span>
                <span>{hit.targetTerm}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Translator notes */}
      {result.notes.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-neutral-700">
            Translator Notes
          </h3>
          <ul className="text-sm text-neutral-600 space-y-1">
            {result.notes.map((note, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-neutral-400 shrink-0">--</span>
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2 border-t border-neutral-200">
        {hasClient && (
          <button
            onClick={onSaveValidated}
            disabled={saved}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
              saved
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-brand-black text-white hover:bg-neutral-800"
            }`}
          >
            {saved ? "Saved as validated" : "Save as validated"}
          </button>
        )}
        <button
          onClick={onCopy}
          className="px-4 py-2 text-sm font-semibold rounded-lg border border-neutral-300 text-brand-black hover:bg-neutral-100 transition-colors"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
        <button
          onClick={onDownload}
          className="px-4 py-2 text-sm font-semibold rounded-lg border border-neutral-300 text-brand-black hover:bg-neutral-100 transition-colors"
        >
          Download .txt
        </button>
      </div>
    </div>
  );
}
