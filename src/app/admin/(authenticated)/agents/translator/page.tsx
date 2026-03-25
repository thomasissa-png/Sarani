"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import type { Client } from "@/lib/db/schema";
import {
  SUPPORTED_LANGUAGES,
  LANGUAGE_LABELS,
  type SupportedLanguage,
  type TranslatorResponse,
} from "@/lib/validations/translator";
import {
  ClientSelector,
  FormField,
  FileUpload,
  GuidanceMessage,
  RecommendedBadge,
  StepIndicator,
  PreSubmitSummary,
  TextareaWithCount,
} from "@/components/admin/guided-form";

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
  contextNote: string;
  preserveFormatting: boolean;
  documentUpload: File | null;
};

const STEPS = ["Select Client", "Configure", "Review & Translate"];

// ─── Page Component ─────────────────────────────────────────────────────────

export default function TranslatorPage() {
  // Step state
  const [step, setStep] = useState(0);

  // Selected client object
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Advanced options toggle
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Form state
  const [form, setForm] = useState<FormState>({
    clientId: "",
    sourceLanguage: "FR",
    targetLanguage: "EN",
    inputText: "",
    formalRegister: false,
    showGlossaryHits: false,
    contextNote: "",
    preserveFormatting: true,
    documentUpload: null,
  });

  // Translation state
  const [translating, setTranslating] = useState(false);
  const [result, setResult] = useState<TranslatorResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Output editing state
  const [editedText, setEditedText] = useState("");
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  // ── Step validation ─────────────────────────────────────────────────────

  // Step 0 is always valid (client is optional for translator)
  function isStep1Valid(): boolean {
    return (
      form.inputText.length >= 10 &&
      form.sourceLanguage !== form.targetLanguage
    );
  }

  // ── Client loaded callback — auto-fill source language ────────────────

  const handleClientLoaded = useCallback(
    (client: Client | null) => {
      setSelectedClient(client);
      if (client?.primaryLanguage) {
        const lang = client.primaryLanguage as SupportedLanguage;
        if (SUPPORTED_LANGUAGES.includes(lang)) {
          setForm((prev) => ({ ...prev, sourceLanguage: lang }));
        }
      }
    },
    []
  );

  // ── Handle translate ──────────────────────────────────────────────────

  async function handleTranslate() {
    setError(null);
    setResult(null);
    setSaved(false);
    setCopied(false);

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

    try {
      const res = await fetch("/api/admin/agents/translator/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: form.clientId,
          sourceLanguage: form.sourceLanguage,
          targetLanguage: form.targetLanguage,
          sourceText: form.inputText,
          validatedTranslation: editedText.replace(/\[\[(.+?)\]\]/g, "$1"),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save validated translation");
      }

      setSaved(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save validated translation"
      );
    }
  }

  // ── Render helpers ────────────────────────────────────────────────────

  function renderTranslatedText(text: string, showHits: boolean): string {
    if (!showHits) {
      return text.replace(/\[\[(.+?)\]\]/g, "$1");
    }
    return text;
  }

  // ── Build summary items ───────────────────────────────────────────────

  function getSummaryItems(): { label: string; value: string }[] {
    const items = [
      {
        label: "Client",
        value: selectedClient?.name || "No client (generic mode)",
      },
      {
        label: "Source Language",
        value: `${LANGUAGE_LABELS[form.sourceLanguage]} (${form.sourceLanguage})`,
      },
      {
        label: "Target Language",
        value: `${LANGUAGE_LABELS[form.targetLanguage]} (${form.targetLanguage})`,
      },
      {
        label: "Text length",
        value: `${form.inputText.length.toLocaleString()} characters`,
      },
      {
        label: "Register",
        value: form.formalRegister ? "Formal" : "Standard",
      },
      {
        label: "Glossary hits",
        value: form.showGlossaryHits ? "Shown" : "Hidden",
      },
    ];
    return items;
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
      <div className="bg-white rounded-xl border border-neutral-300 p-6 space-y-5">
        <h2 className="text-lg font-semibold text-brand-black">
          New Translation
        </h2>

        {/* Guidance message */}
        <GuidanceMessage>
          Select the client to activate their glossary and translation memory — this is what makes the difference between a generic translation and one that sounds like it came from their team. If you&apos;re translating something sensitive or technical, paste the text directly rather than uploading a scanned PDF.
        </GuidanceMessage>

        <StepIndicator steps={STEPS} currentStep={step} />

        {/* Step 0: Select Client (optional) */}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <RecommendedBadge />
              </div>
              <ClientSelector
                value={form.clientId}
                onChange={(clientId) =>
                  setForm((prev) => ({ ...prev, clientId }))
                }
                required={false}
                onClientLoaded={handleClientLoaded}
                helperText="Activates the client glossary and translation memory. Without it, the translation is generic and may contradict validated formulations from previous deliveries."
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-6 py-2.5 bg-brand-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Step 1: Configure */}
        {step === 1 && (
          <div className="space-y-5">
            {/* Language selectors */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Source Language"
                required
                helperText="The language of the original text. Auto-filled from client profile when available."
              >
                <select
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
              </FormField>

              <FormField
                label="Target Language"
                required
                helperText="The language to translate into."
                error={
                  form.sourceLanguage === form.targetLanguage
                    ? "Source and target language must be different."
                    : undefined
                }
              >
                <select
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
              </FormField>
            </div>

            {/* Input textarea */}
            <FormField
              label="Text to translate"
              required
              helperText="Paste the full text. The translator preserves formatting, handles idioms, and applies client glossary terms."
            >
              <TextareaWithCount
                value={form.inputText}
                onChange={(inputText) =>
                  setForm((prev) => ({ ...prev, inputText }))
                }
                placeholder="Paste text or upload Sony_brief_FR.docx"
                minLength={10}
                rows={8}
              />
            </FormField>

            {/* Recommended: Register */}
            <FormField
              label={
                <>
                  Register
                  <RecommendedBadge />
                </>
              }
              helperText="Corporate clients (GEODIS, Sony, L'Oreal) expect formal register. Default is Standard."
            >
              <div className="flex gap-2">
                {(["Standard", "Formal"] as const).map((reg) => (
                  <button
                    key={reg}
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        formalRegister: reg === "Formal",
                      }))
                    }
                    className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                      (reg === "Formal") === form.formalRegister
                        ? "bg-brand-black text-white border-brand-black"
                        : "bg-white text-neutral-700 border-neutral-300 hover:border-neutral-400"
                    }`}
                  >
                    {reg}
                  </button>
                ))}
              </div>
            </FormField>

            {/* Advanced options (optional) */}
            <div className="border border-neutral-200 rounded-lg">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors rounded-lg"
              >
                <span>Advanced options</span>
                <span className="text-neutral-400">{showAdvanced ? "−" : "+"}</span>
              </button>
              {showAdvanced && (
                <div className="px-4 pb-4 space-y-4 border-t border-neutral-200 pt-4">
                  <FormField
                    label="Context Note"
                    helperText="What is this document for? (internal brief, client-facing presentation, legal contract, social post). Changes the register calibration."
                  >
                    <TextareaWithCount
                      value={form.contextNote}
                      onChange={(contextNote) =>
                        setForm((prev) => ({ ...prev, contextNote }))
                      }
                      placeholder="e.g. This is a client-facing presentation for the Q2 business review"
                      rows={2}
                    />
                  </FormField>

                  <div className="flex items-center gap-6">
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
                      Show glossary hits in output
                    </label>

                    <label className="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.preserveFormatting}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            preserveFormatting: e.target.checked,
                          }))
                        }
                        className="rounded border-neutral-300"
                      />
                      Preserve formatting (bold, italic, tables)
                    </label>
                  </div>

                  <FormField
                    label="Upload Document"
                    helperText="Upload a PDF or DOCX instead of pasting text. Useful for formatted documents where copy-paste would lose structure."
                  >
                    <FileUpload
                      value={form.documentUpload}
                      onChange={(file) =>
                        setForm((prev) => ({ ...prev, documentUpload: file }))
                      }
                      accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    />
                  </FormField>
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setStep(0)}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-neutral-300 text-neutral-600 hover:bg-neutral-100 transition-colors"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!isStep1Valid()}
                className="px-6 py-2.5 bg-brand-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Review & Translate */}
        {step === 2 && (
          <div className="space-y-4">
            <PreSubmitSummary
              items={getSummaryItems()}
              onBack={() => setStep(1)}
              onConfirm={handleTranslate}
              loading={translating}
              buttonLabel="Translate"
            />

            {/* Error */}
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                {error}
              </div>
            )}
          </div>
        )}
      </div>

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
