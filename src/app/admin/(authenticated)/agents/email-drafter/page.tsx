"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import type { Client } from "@/lib/db/schema";
import {
  ClientSelector,
  ClientContextPanel,
  FormField,
  GuidanceMessage,
  RecommendedBadge,
  StepIndicator,
  PreSubmitSummary,
  TextareaWithCount,
} from "@/components/admin/guided-form";
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

const TONE_DESCRIPTIONS: Record<EmailTone, string> = {
  formal: "Official correspondence, contracts, sensitive negotiations",
  friendly: "Regular project updates, good news, warm professional",
  urgent: "Deadline reminders, critical issues, direct but diplomatic",
};

type FormState = {
  clientId: string;
  // Required
  emailType: EmailType;
  emailBodyAsk: string;
  // Recommended
  recipientName: string;
  context: string;
  language: SupportedLanguage;
  tone: EmailTone;
  // Optional
  attachmentDescription: string;
  deadlineMentioned: string;
  previousEmailThread: string;
  culturalContext: string;
  variantCount: number;
};

// ─── Constants ──────────────────────────────────────────────────────────────

const STEPS = ["Select Client", "Configure", "Review & Generate"];

const GUIDANCE_MESSAGE =
  "Tell me who you're writing to (name, role, relationship), what you want this email to accomplish, and the one key thing you need them to do or know. If there's a specific tone consideration (they're frustrated, this is a sensitive negotiation, they just approved a budget), tell me — it changes everything.";

// ─── Page Component ─────────────────────────────────────────────────────────

export default function EmailDrafterPage() {
  // Step state
  const [step, setStep] = useState(0);

  // Client ref for context panel
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Advanced options toggle
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Form state
  const [form, setForm] = useState<FormState>({
    clientId: "",
    emailType: "delivery",
    emailBodyAsk: "",
    recipientName: "",
    context: "",
    language: "EN",
    tone: "friendly",
    attachmentDescription: "",
    deadlineMentioned: "",
    previousEmailThread: "",
    culturalContext: "",
    variantCount: 1,
  });

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<EmailDrafterResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeVariant, setActiveVariant] = useState<number>(-1);

  // ── Client loaded callback ──────────────────────────────────────────────

  const handleClientLoaded = useCallback(
    (client: Client | null) => {
      setSelectedClient(client);
      if (client?.primaryLanguage) {
        const lang = client.primaryLanguage as SupportedLanguage;
        if (SUPPORTED_LANGUAGES.includes(lang)) {
          setForm((prev) => ({ ...prev, language: lang }));
        }
      }
    },
    []
  );

  // ── Step validation ─────────────────────────────────────────────────────

  function canAdvanceFromStep(s: number): boolean {
    if (s === 0) return !!form.clientId;
    if (s === 1)
      return !!form.emailType && form.emailBodyAsk.trim().length >= 10;
    return true;
  }

  function getStepError(s: number): string | null {
    if (s === 0 && !form.clientId) return "Please select a client to continue.";
    if (s === 1) {
      if (!form.emailType) return "Please select an email purpose.";
      if (form.emailBodyAsk.trim().length < 10)
        return "The email ask must be at least 10 characters. What should the recipient do or know?";
    }
    return null;
  }

  // ── Handle generate ─────────────────────────────────────────────────────

  async function handleGenerate() {
    setError(null);
    setResult(null);
    setCopied(false);
    setActiveVariant(-1);
    setGenerating(true);

    try {
      const res = await fetch("/api/admin/agents/email-drafter/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: form.clientId,
          emailType: form.emailType,
          context: form.context || form.emailBodyAsk,
          recipientName: form.recipientName || undefined,
          language: form.language,
          tone: form.tone,
          includeAttachmentMention: !!form.attachmentDescription.trim(),
          variantCount: form.variantCount,
          // Extended fields for prompt enrichment
          emailBodyAsk: form.emailBodyAsk,
          attachmentDescription: form.attachmentDescription || undefined,
          deadlineMentioned: form.deadlineMentioned || undefined,
          previousEmailThread: form.previousEmailThread || undefined,
          culturalContext: form.culturalContext || undefined,
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

  // ── Copy to clipboard ────────────────────────────────────────────────────

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

  // ── Build summary items ─────────────────────────────────────────────────

  function buildSummaryItems() {
    return [
      { label: "Client", value: selectedClient?.name || "---" },
      { label: "Email purpose", value: EMAIL_TYPE_LABELS[form.emailType] },
      {
        label: "What the email must accomplish",
        value:
          form.emailBodyAsk.length > 80
            ? form.emailBodyAsk.slice(0, 80) + "..."
            : form.emailBodyAsk,
      },
      { label: "Tone", value: EMAIL_TONE_LABELS[form.tone] },
      { label: "Language", value: LANGUAGE_LABELS[form.language] },
      {
        label: "Recipient",
        value: form.recipientName || "Not specified",
      },
      {
        label: "Context",
        value: form.context
          ? form.context.length > 60
            ? form.context.slice(0, 60) + "..."
            : form.context
          : "Not specified",
      },
      { label: "Variants", value: `${form.variantCount}` },
    ];
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
      <div className="bg-white rounded-xl border border-neutral-300 p-6 space-y-5">
        {/* Guidance message */}
        <GuidanceMessage text={GUIDANCE_MESSAGE} />

        <StepIndicator steps={STEPS} currentStep={step} />

        {/* ── Step 0: Select Client ──────────────────────────────────── */}
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-brand-black">
              Select Client
            </h2>
            <ClientSelector
              value={form.clientId}
              onChange={(id) => setForm((prev) => ({ ...prev, clientId: id }))}
              required
              helperText="Loads relationship history, contact name, preferred language, and client tone context."
              onClientLoaded={handleClientLoaded}
            />
            {/* Step navigation */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  if (canAdvanceFromStep(0)) {
                    setError(null);
                    setStep(1);
                  } else {
                    setError(getStepError(0));
                  }
                }}
                className="px-6 py-2.5 bg-brand-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors"
              >
                Next: Configure
              </button>
            </div>
          </div>
        )}

        {/* ── Step 1: Configure ──────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-brand-black">
              Configure Email
            </h2>

            {/* Client context reminder */}
            <ClientContextPanel client={selectedClient} />

            {/* ── Required Fields ── */}

            {/* Email purpose */}
            <FormField
              label="Email Purpose"
              required
              helperText="The purpose determines the entire structure: a delivery email leads with the attachment; a follow-up leads with a concise reference."
            >
              <select
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
            </FormField>

            {/* Email body ask */}
            <FormField
              label="What must this email accomplish?"
              required
              helperText="What is the single action or understanding this email must produce? 'Please find attached' is not a purpose — 'Please review by Friday and confirm approval' is."
            >
              <TextareaWithCount
                value={form.emailBodyAsk}
                onChange={(val) =>
                  setForm((prev) => ({ ...prev, emailBodyAsk: val }))
                }
                placeholder="Confirm you've received the 50 Black Friday banners and approve them for production by March 28."
                minLength={10}
                maxLength={2000}
                rows={4}
              />
            </FormField>

            {/* ── Recommended Fields ── */}
            <div className="border-t border-neutral-200 pt-4 space-y-5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Recommended
                </span>
                <RecommendedBadge />
              </div>

              {/* Recipient name */}
              <FormField
                label="Recipient Name"
                helperText="Personalizes the salutation. Auto-filled from client's primary contact if available."
              >
                <input
                  type="text"
                  value={form.recipientName}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      recipientName: e.target.value,
                    }))
                  }
                  placeholder="Sophie Tanaka, Senior Brand Manager"
                  className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                />
              </FormField>

              {/* Context */}
              <FormField
                label="Context (what just happened)"
                helperText="What makes this email necessary right now? Without context, the email feels disconnected."
              >
                <TextareaWithCount
                  value={form.context}
                  onChange={(val) =>
                    setForm((prev) => ({ ...prev, context: val }))
                  }
                  placeholder="Following Monday's call where you confirmed the banners are approved pending one copy change on the French version."
                  maxLength={5000}
                  rows={4}
                />
              </FormField>

              {/* Language + Tone */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="Language"
                  helperText={
                    selectedClient?.primaryLanguage
                      ? `Auto-filled from ${selectedClient.name}'s primary language. You can change it.`
                      : "The language the email will be written in."
                  }
                >
                  <select
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
                </FormField>

                <FormField
                  label="Tone Direction"
                  helperText="The relationship history and email purpose define the tone."
                >
                  <select
                    value={form.tone}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        tone: e.target.value as EmailTone,
                      }))
                    }
                    className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                  >
                    {EMAIL_TONES.map((t) => (
                      <option key={t} value={t}>
                        {EMAIL_TONE_LABELS[t]} — {TONE_DESCRIPTIONS[t]}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>
            </div>

            {/* ── Optional Fields (collapsible) ── */}
            <div className="border-t border-neutral-200 pt-4">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-brand-black transition-colors"
              >
                <span
                  className={`transition-transform ${showAdvanced ? "rotate-90" : ""}`}
                >
                  &#9654;
                </span>
                Advanced options
              </button>

              {showAdvanced && (
                <div className="mt-4 space-y-5">
                  {/* Attachment description */}
                  <FormField
                    label="Attachment Description"
                    helperText="If files are being sent with the email, describe what they are so the email text references them correctly."
                  >
                    <TextareaWithCount
                      value={form.attachmentDescription}
                      onChange={(val) =>
                        setForm((prev) => ({
                          ...prev,
                          attachmentDescription: val,
                        }))
                      }
                      placeholder="50 Black Friday banners in 728x90, 300x250, and 160x600 formats, EN and FR versions"
                      rows={2}
                    />
                  </FormField>

                  {/* Deadline mentioned */}
                  <FormField
                    label="Deadline"
                    helperText="If the email needs to set or reference a deadline, include it explicitly."
                  >
                    <input
                      type="date"
                      value={form.deadlineMentioned}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          deadlineMentioned: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                    />
                  </FormField>

                  {/* Previous email thread */}
                  <FormField
                    label="Previous Email Thread"
                    helperText="Paste the last message in the thread for the agent to understand the conversation history."
                  >
                    <TextareaWithCount
                      value={form.previousEmailThread}
                      onChange={(val) =>
                        setForm((prev) => ({
                          ...prev,
                          previousEmailThread: val,
                        }))
                      }
                      placeholder="Paste the last email in the thread..."
                      rows={4}
                    />
                  </FormField>

                  {/* Cultural context */}
                  <FormField
                    label="Cultural Context"
                    helperText="If the recipient is in a specific cultural context (Japanese business etiquette, formal French corporate, informal US startup), flag it."
                  >
                    <TextareaWithCount
                      value={form.culturalContext}
                      onChange={(val) =>
                        setForm((prev) => ({
                          ...prev,
                          culturalContext: val,
                        }))
                      }
                      placeholder="Japanese business etiquette — use formal register, address by surname"
                      rows={2}
                    />
                  </FormField>

                  {/* Variants */}
                  <FormField
                    label="Variants"
                    helperText="Generate alternative versions"
                  >
                    <select
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
                  </FormField>
                </div>
              )}
            </div>

            {/* Step navigation */}
            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(0)}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-neutral-300 text-neutral-600 hover:bg-neutral-100 transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => {
                  if (canAdvanceFromStep(1)) {
                    setError(null);
                    setStep(2);
                  } else {
                    setError(getStepError(1));
                  }
                }}
                className="px-6 py-2.5 bg-brand-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors"
              >
                Next: Review
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Review & Generate ──────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-brand-black">
              Review & Generate
            </h2>
            <PreSubmitSummary
              items={buildSummaryItems()}
              onConfirm={handleGenerate}
              onBack={() => setStep(1)}
              loading={generating}
              buttonLabel="Draft Email"
            />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {error}
          </div>
        )}
      </div>

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
