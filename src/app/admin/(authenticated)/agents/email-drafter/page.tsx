"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { Client } from "@/lib/db/schema";
import {
  SUPPORTED_LANGUAGES,
  LANGUAGE_LABELS,
  EMAIL_TYPES,
  EMAIL_TYPE_LABELS,
  EMAIL_TONES,
  EMAIL_TONE_LABELS,
  type SupportedLanguage,
  type EmailType,
  type EmailTone,
  type EmailDrafterResponse,
} from "@/lib/validations/email-drafter";

// ─── Types ──────────────────────────────────────────────────────────────────

type GenerateApiResponse = {
  email: EmailDrafterResponse;
  outputId: string;
  usage: { inputTokens: number; outputTokens: number };
};

type FormState = {
  clientId: string;
  emailType: EmailType;
  context: string;
  recipientName: string;
  recipientRole: string;
  language: SupportedLanguage;
  tone: EmailTone;
  includeAttachmentMention: boolean;
  variantCount: number;
};

// ─── Page Component ─────────────────────────────────────────────────────────

export default function EmailDrafterPage() {
  // Clients data
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);

  // Form state
  const [form, setForm] = useState<FormState>({
    clientId: "",
    emailType: "status-update",
    context: "",
    recipientName: "",
    recipientRole: "",
    language: "EN",
    tone: "friendly",
    includeAttachmentMention: false,
    variantCount: 1,
  });

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<EmailDrafterResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeVariant, setActiveVariant] = useState<number>(-1); // -1 = main

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

  // ── Auto-fill language from client ─────────────────────────────────────

  useEffect(() => {
    if (!form.clientId) return;
    const client = clients.find((c) => c.id === form.clientId);
    if (client?.primaryLanguage) {
      const lang = client.primaryLanguage as SupportedLanguage;
      if (SUPPORTED_LANGUAGES.includes(lang)) {
        setForm((prev) => ({ ...prev, language: lang }));
      }
    }
  }, [form.clientId, clients]);

  // ── Handle generate ─────────────────────────────────────────────────────

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setCopied(false);
    setActiveVariant(-1);

    if (!form.clientId) {
      setError("Please select a client.");
      return;
    }

    if (!form.context.trim()) {
      setError("Please describe the situation / context.");
      return;
    }

    setGenerating(true);

    try {
      const res = await fetch("/api/admin/agents/email-drafter/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: form.clientId,
          emailType: form.emailType,
          context: form.context,
          recipientName: form.recipientName || undefined,
          recipientRole: form.recipientRole || undefined,
          language: form.language,
          tone: form.tone,
          includeAttachmentMention: form.includeAttachmentMention,
          variantCount: form.variantCount,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Email draft failed");
      }

      const data: GenerateApiResponse = await res.json();
      setResult(data.email);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to draft email"
      );
    } finally {
      setGenerating(false);
    }
  }

  // ── Get active email content ────────────────────────────────────────────

  function getActiveEmail() {
    if (!result) return null;
    if (activeVariant === -1) {
      return {
        subject: result.subject,
        greeting: result.greeting,
        body: result.body,
        callToAction: result.callToAction,
        closing: result.closing,
      };
    }
    const variant = result.variants[activeVariant];
    if (!variant) return null;
    return {
      subject: variant.subject,
      greeting: variant.greeting,
      body: variant.body,
      callToAction: variant.callToAction,
      closing: variant.closing,
    };
  }

  // ── Copy to clipboard ──────────────────────────────────────────────────

  async function handleCopy() {
    const email = getActiveEmail();
    if (!email) return;

    const plainText = [
      `Subject: ${email.subject}`,
      "",
      email.greeting,
      "",
      email.body,
      "",
      email.callToAction ? email.callToAction + "\n" : "",
      email.closing,
      result?.signature || "Sarani Creative Agency",
    ]
      .filter(Boolean)
      .join("\n");

    await navigator.clipboard.writeText(plainText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Render ──────────────────────────────────────────────────────────────

  const activeEmail = getActiveEmail();

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-black">Email Drafter</h1>
          <p className="text-neutral-500 text-sm mt-1">
            Draft professional client emails with Sarani tone and client context
          </p>
        </div>
        <Link
          href="/admin/agents/email-drafter/history"
          className="px-4 py-2 bg-white border border-neutral-300 text-sm font-semibold rounded-lg hover:bg-neutral-100 transition-colors text-brand-black"
        >
          History
        </Link>
      </div>

      {/* Form */}
      <form
        onSubmit={handleGenerate}
        className="bg-white rounded-xl border border-neutral-300 p-6 space-y-5"
      >
        <h2 className="text-lg font-semibold text-brand-black">
          New Email Draft
        </h2>

        {/* Client select (required) */}
        <div>
          <label
            htmlFor="client"
            className="block text-sm font-medium text-neutral-700 mb-1.5"
          >
            Client <span className="text-red-500">*</span>
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

        {/* Email type + Tone */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="emailType"
              className="block text-sm font-medium text-neutral-700 mb-1.5"
            >
              Email Type
            </label>
            <select
              id="emailType"
              value={form.emailType}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  emailType: e.target.value as EmailType,
                }))
              }
              className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
            >
              {EMAIL_TYPES.map((type) => (
                <option key={type} value={type}>
                  {EMAIL_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Tone
            </label>
            <div className="flex items-center gap-4 pt-1.5">
              {EMAIL_TONES.map((t) => (
                <label
                  key={t}
                  className="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="tone"
                    value={t}
                    checked={form.tone === t}
                    onChange={() =>
                      setForm((prev) => ({ ...prev, tone: t }))
                    }
                    className="border-neutral-300"
                  />
                  {EMAIL_TONE_LABELS[t]}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Context textarea */}
        <div>
          <label
            htmlFor="context"
            className="block text-sm font-medium text-neutral-700 mb-1.5"
          >
            Context <span className="text-red-500">*</span>
          </label>
          <textarea
            id="context"
            value={form.context}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, context: e.target.value }))
            }
            placeholder="Describe the situation -- what happened, what needs to happen next..."
            rows={5}
            className="w-full px-4 py-3 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent resize-y"
          />
          <p className="text-xs text-neutral-400 mt-1">
            {form.context.length.toLocaleString()} / 5,000 characters
          </p>
        </div>

        {/* Recipient name + role */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="recipientName"
              className="block text-sm font-medium text-neutral-700 mb-1.5"
            >
              Recipient Name{" "}
              <span className="text-neutral-400 font-normal">(optional)</span>
            </label>
            <input
              id="recipientName"
              type="text"
              value={form.recipientName}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  recipientName: e.target.value,
                }))
              }
              placeholder="e.g., Sarah Chen"
              className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
            />
          </div>
          <div>
            <label
              htmlFor="recipientRole"
              className="block text-sm font-medium text-neutral-700 mb-1.5"
            >
              Recipient Role{" "}
              <span className="text-neutral-400 font-normal">(optional)</span>
            </label>
            <input
              id="recipientRole"
              type="text"
              value={form.recipientRole}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  recipientRole: e.target.value,
                }))
              }
              placeholder="e.g., Marketing Director"
              className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
            />
          </div>
        </div>

        {/* Language + Variant count + Attachment */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label
              htmlFor="language"
              className="block text-sm font-medium text-neutral-700 mb-1.5"
            >
              Language
            </label>
            <select
              id="language"
              value={form.language}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  language: e.target.value as SupportedLanguage,
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
              htmlFor="variantCount"
              className="block text-sm font-medium text-neutral-700 mb-1.5"
            >
              Variants
            </label>
            <select
              id="variantCount"
              value={form.variantCount}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  variantCount: Number(e.target.value),
                }))
              }
              className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
            >
              <option value={1}>1 version</option>
              <option value={2}>2 versions</option>
              <option value={3}>3 versions</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Options
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer pt-1.5">
              <input
                type="checkbox"
                checked={form.includeAttachmentMention}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    includeAttachmentMention: e.target.checked,
                  }))
                }
                className="rounded border-neutral-300"
              />
              Mention attachment
            </label>
          </div>
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
            {generating ? "Drafting..." : "Draft Email"}
          </button>
        </div>
      </form>

      {/* Email Output */}
      {result && activeEmail && (
        <EmailOutput
          result={result}
          activeEmail={activeEmail}
          activeVariant={activeVariant}
          onVariantChange={setActiveVariant}
          onCopy={handleCopy}
          copied={copied}
        />
      )}
    </div>
  );
}

// ─── Email Output Component ─────────────────────────────────────────────────

function EmailOutput({
  result,
  activeEmail,
  activeVariant,
  onVariantChange,
  onCopy,
  copied,
}: {
  result: EmailDrafterResponse;
  activeEmail: {
    subject: string;
    greeting: string;
    body: string;
    callToAction: string;
    closing: string;
  };
  activeVariant: number;
  onVariantChange: (index: number) => void;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-neutral-300 p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-brand-black">
          Email Preview
        </h2>
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <span>{result.wordCount} words</span>
          <span className="text-neutral-300">|</span>
          <span>{result.language}</span>
        </div>
      </div>

      {/* Variant tabs */}
      {result.variants.length > 0 && (
        <div className="flex gap-1 border-b border-neutral-200 pb-0">
          <button
            type="button"
            onClick={() => onVariantChange(-1)}
            className={`px-3 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeVariant === -1
                ? "bg-neutral-100 text-brand-black border border-neutral-300 border-b-white -mb-px"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            Main
          </button>
          {result.variants.map((variant, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onVariantChange(i)}
              className={`px-3 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeVariant === i
                  ? "bg-neutral-100 text-brand-black border border-neutral-300 border-b-white -mb-px"
                  : "text-neutral-500 hover:text-neutral-700"
              }`}
            >
              {variant.label}
            </button>
          ))}
        </div>
      )}

      {/* Email preview - styled like an actual email */}
      <div className="border border-neutral-200 rounded-lg overflow-hidden">
        {/* Subject bar */}
        <div className="bg-neutral-50 px-5 py-3 border-b border-neutral-200">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-neutral-500 uppercase shrink-0">
              Subject
            </span>
            <span className="text-sm text-brand-black font-medium">
              {activeEmail.subject}
            </span>
          </div>
        </div>

        {/* Email body */}
        <div className="px-5 py-4 space-y-3 text-sm text-brand-black leading-relaxed">
          {/* Greeting */}
          <p>{activeEmail.greeting}</p>

          {/* Body paragraphs */}
          {activeEmail.body.split("\n\n").map((paragraph, i) => (
            <p key={i} className="whitespace-pre-wrap">
              {paragraph}
            </p>
          ))}

          {/* Call to action */}
          {activeEmail.callToAction && (
            <p className="font-medium">{activeEmail.callToAction}</p>
          )}

          {/* Closing */}
          <div className="pt-2">
            <p>{activeEmail.closing}</p>
            <p className="text-neutral-500">{result.signature}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2 border-t border-neutral-200">
        <button
          onClick={onCopy}
          className="px-4 py-2 text-sm font-semibold rounded-lg border border-neutral-300 text-brand-black hover:bg-neutral-100 transition-colors"
        >
          {copied ? "Copied!" : "Copy as plain text"}
        </button>
      </div>
    </div>
  );
}
