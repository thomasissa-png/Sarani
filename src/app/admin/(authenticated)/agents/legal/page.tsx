"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import type { Client } from "@/lib/db/schema";
import {
  CONTRACT_TYPES,
  CONTRACT_TYPE_LABELS,
  CURRENCIES,
  type ContractType,
  type Currency,
  type GenerateContractResponse,
} from "@/lib/validations/legal";
import {
  ClientSelector,
  FormField,
  StepIndicator,
  PreSubmitSummary,
  TextareaWithCount,
} from "@/components/admin/guided-form";

// ─── Types ──────────────────────────────────────────────────────────────────

type FormState = {
  clientId: string;
  contractType: ContractType;
  projectDescription: string;
  amount: string;
  currency: Currency;
  deliverables: string;
  startDate: string;
  endDate: string;
  specialClauses: string;
  language: "en" | "fr";
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function getDefaultStartDate(): string {
  return new Date().toISOString().split("T")[0];
}

function getDefaultEndDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().split("T")[0];
}

const INITIAL_FORM: FormState = {
  clientId: "",
  contractType: "SOW",
  projectDescription: "",
  amount: "",
  currency: "EUR",
  deliverables: "",
  startDate: getDefaultStartDate(),
  endDate: getDefaultEndDate(),
  specialClauses: "",
  language: "en",
};

const STEPS = ["Select Client", "Configure", "Review & Generate"];

// ─── Page Component ─────────────────────────────────────────────────────────

export default function LegalAgentPage() {
  // Step state
  const [step, setStep] = useState(0);

  // Client data
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Form state
  const [form, setForm] = useState<FormState>(INITIAL_FORM);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GenerateContractResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // ── Smart defaults when client is loaded ─────────────────────────────────

  const handleClientLoaded = useCallback(
    (client: Client | null) => {
      setSelectedClient(client);
      if (client?.primaryLanguage) {
        const lang = client.primaryLanguage.toLowerCase();
        if (lang === "fr" || lang === "french") {
          setForm((prev) => ({ ...prev, language: "fr" }));
        } else {
          setForm((prev) => ({ ...prev, language: "en" }));
        }
      }
    },
    []
  );

  // ── Step validation ─────────────────────────────────────────────────────

  function canProceedStep0(): boolean {
    return !!form.clientId;
  }

  function canProceedStep1(): boolean {
    const amountNum = parseFloat(form.amount);
    return (
      form.projectDescription.length >= 20 &&
      !isNaN(amountNum) &&
      amountNum > 0 &&
      form.deliverables.length >= 5 &&
      !!form.startDate &&
      !!form.endDate
    );
  }

  // ── Generate contract ─────────────────────────────────────────────────

  async function handleGenerate() {
    setError(null);
    setResult(null);
    setCopied(false);
    setGenerating(true);

    try {
      const res = await fetch("/api/admin/agents/legal/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: form.clientId,
          contractType: form.contractType,
          projectDescription: form.projectDescription,
          amount: parseFloat(form.amount),
          currency: form.currency,
          deliverables: form.deliverables,
          startDate: form.startDate,
          endDate: form.endDate,
          specialClauses: form.specialClauses || undefined,
          language: form.language,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Generation failed");
      }

      const data: GenerateContractResponse = await res.json();
      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate contract"
      );
    } finally {
      setGenerating(false);
    }
  }

  // ── Copy to clipboard ──────────────────────────────────────────────────

  async function handleCopy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.contractText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = result.contractText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  // ── Download as text file ──────────────────────────────────────────────

  function handleDownload() {
    if (!result) return;
    const blob = new Blob([result.contractText], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.contractType}-${result.clientName.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().split("T")[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ── Build summary items ────────────────────────────────────────────────

  function getSummaryItems() {
    return [
      { label: "Client", value: selectedClient?.name || "—" },
      {
        label: "Legal Entity",
        value: selectedClient?.legalEntityName || selectedClient?.name || "—",
      },
      { label: "Contract Type", value: CONTRACT_TYPE_LABELS[form.contractType] },
      {
        label: "Amount",
        value: form.amount ? `${form.amount} ${form.currency}` : "—",
      },
      { label: "Start Date", value: form.startDate },
      { label: "End Date", value: form.endDate },
      { label: "Language", value: form.language === "en" ? "English" : "French" },
      {
        label: "Description",
        value:
          form.projectDescription.length > 80
            ? form.projectDescription.slice(0, 80) + "..."
            : form.projectDescription,
      },
    ];
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-black">Legal IA</h1>
          <p className="text-neutral-500 text-sm mt-1">
            Generate pre-filled contracts from templates and client data
          </p>
        </div>
        <Link
          href="/admin/agents/legal/history"
          className="px-4 py-2 bg-white border border-neutral-300 text-sm font-semibold rounded-lg hover:bg-neutral-100 transition-colors text-brand-black"
        >
          History
        </Link>
      </div>

      {/* Contract Form */}
      <div className="bg-white rounded-xl border border-neutral-300 p-6 space-y-5">
        <h2 className="text-lg font-semibold text-brand-black">
          New Contract
        </h2>

        <StepIndicator steps={STEPS} currentStep={step} />

        {/* ── Step 0: Select Client ─────────────────────────────────────── */}
        {step === 0 && (
          <div className="space-y-4">
            <ClientSelector
              value={form.clientId}
              onChange={(clientId) =>
                setForm((prev) => ({ ...prev, clientId }))
              }
              required
              helperText="The contract will use the client's legal entity name and VAT number from their profile."
              onClientLoaded={handleClientLoaded}
            />

            {/* Client legal info banner */}
            {selectedClient && (
              <div className="bg-neutral-100 rounded-lg px-4 py-3 text-sm space-y-1">
                <p className="font-medium text-neutral-700">
                  Client Legal Info
                </p>
                <div className="grid grid-cols-3 gap-2 text-neutral-600">
                  <span>
                    Entity:{" "}
                    <span className="font-medium text-brand-black">
                      {selectedClient.legalEntityName || "Not set"}
                    </span>
                  </span>
                  <span>
                    Country:{" "}
                    <span className="font-medium text-brand-black">
                      {selectedClient.legalCountry || "Not set"}
                    </span>
                  </span>
                  <span>
                    VAT:{" "}
                    <span className="font-medium text-brand-black">
                      {selectedClient.vatNumber || "Not set"}
                    </span>
                  </span>
                </div>
                {!selectedClient.legalEntityName && (
                  <p className="text-amber-600 text-xs mt-1">
                    Legal entity name is missing. The contract will use the
                    client name instead. Consider updating the client record.
                  </p>
                )}
              </div>
            )}

            {/* Next button */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                disabled={!canProceedStep0()}
                onClick={() => setStep(1)}
                className="px-6 py-2.5 bg-brand-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next: Configure
              </button>
            </div>
          </div>
        )}

        {/* ── Step 1: Configure ─────────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-5">
            {/* Contract type */}
            <FormField
              label="Contract Type"
              required
              helperText="Choose the type of contract. SOW is for project-based work, NDA for confidentiality, UGC for content creation rights, Freelance for contractor agreements."
            >
              <div className="grid grid-cols-2 gap-2">
                {CONTRACT_TYPES.map((type) => (
                  <label
                    key={type}
                    className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                      form.contractType === type
                        ? "border-brand-cerulean bg-blue-50/50"
                        : "border-neutral-200 hover:border-neutral-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="contractType"
                      value={type}
                      checked={form.contractType === type}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          contractType: e.target.value as ContractType,
                        }))
                      }
                      className="shrink-0"
                    />
                    <div>
                      <span className="text-sm font-medium text-brand-black">
                        {type}
                      </span>
                      <span className="text-xs text-neutral-500 ml-1">
                        -- {CONTRACT_TYPE_LABELS[type]}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </FormField>

            {/* Project description */}
            <FormField
              label="Project Description / Scope"
              required
              helperText="Describe the project scope clearly. This becomes the main body of the contract's scope section."
            >
              <TextareaWithCount
                value={form.projectDescription}
                onChange={(val) =>
                  setForm((prev) => ({ ...prev, projectDescription: val }))
                }
                placeholder="e.g. Design and production of 50 Black Friday banners for Sony across 15 markets"
                minLength={20}
                rows={3}
              />
            </FormField>

            {/* Amount + Currency + Language */}
            <div className="grid grid-cols-3 gap-4">
              <FormField
                label="Amount"
                required
                helperText="Total contract value before taxes."
              >
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.amount}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, amount: e.target.value }))
                  }
                  placeholder="15000"
                  className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                />
              </FormField>
              <FormField label="Currency" required>
                <select
                  value={form.currency}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      currency: e.target.value as Currency,
                    }))
                  }
                  className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField
                label="Language"
                helperText="Auto-filled from client profile."
              >
                <select
                  value={form.language}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      language: e.target.value as "en" | "fr",
                    }))
                  }
                  className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                >
                  <option value="en">English</option>
                  <option value="fr">French</option>
                </select>
              </FormField>
            </div>

            {/* Deliverables */}
            <FormField
              label="Deliverables"
              required
              helperText="List all deliverables that will be included in the contract. Be specific about quantities and formats."
            >
              <TextareaWithCount
                value={form.deliverables}
                onChange={(val) =>
                  setForm((prev) => ({ ...prev, deliverables: val }))
                }
                placeholder="e.g. 50 web banners in 5 formats, 10 social media posts, 1 hero video (30s)"
                minLength={5}
                rows={3}
              />
            </FormField>

            {/* Start date + End date */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Start Date"
                required
                helperText="Contract effective date."
              >
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, startDate: e.target.value }))
                  }
                  className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                />
              </FormField>
              <FormField
                label="End Date"
                required
                helperText="Contract end date."
              >
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, endDate: e.target.value }))
                  }
                  className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                />
              </FormField>
            </div>

            {/* Special clauses */}
            <FormField
              label="Special Clauses"
              helperText="Any additional clauses, terms, or conditions to include. Leave empty if not needed."
            >
              <TextareaWithCount
                value={form.specialClauses}
                onChange={(val) =>
                  setForm((prev) => ({ ...prev, specialClauses: val }))
                }
                placeholder="e.g. Exclusivity clause for Black Friday campaign period, NDA extension to subcontractors"
                rows={2}
              />
            </FormField>

            {/* Error */}
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            {/* Navigation */}
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
                disabled={!canProceedStep1()}
                onClick={() => {
                  setError(null);
                  setStep(2);
                }}
                className="px-6 py-2.5 bg-brand-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next: Review
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Review & Generate ─────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-4">
            {/* Legal warning banner */}
            <div className="bg-amber-50 border border-amber-300 rounded-lg px-4 py-3 text-sm text-amber-800">
              <span className="font-semibold">Legal disclaimer:</span> The
              generated contract is a draft based on templates. It must be
              reviewed by legal counsel before being sent to the client.
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <PreSubmitSummary
              items={getSummaryItems()}
              onConfirm={handleGenerate}
              onBack={() => setStep(1)}
              loading={generating}
              buttonLabel="Generate Contract"
            />
          </div>
        )}
      </div>

      {/* Contract Output */}
      {result && (
        <ContractOutput
          result={result}
          copied={copied}
          onCopy={handleCopy}
          onDownload={handleDownload}
        />
      )}
    </div>
  );
}

// ─── Contract Output Component ─────────────────────────────────────────────

function ContractOutput({
  result,
  copied,
  onCopy,
  onDownload,
}: {
  result: GenerateContractResponse;
  copied: boolean;
  onCopy: () => void;
  onDownload: () => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-neutral-300 p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-brand-black">
          Generated Contract
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-400">
            {result.usage.inputTokens + result.usage.outputTokens} tokens
          </span>
          <button
            onClick={onCopy}
            className="px-3 py-1.5 text-sm font-medium border border-neutral-300 rounded-lg hover:bg-neutral-100 transition-colors text-brand-black"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
          <button
            onClick={onDownload}
            className="px-3 py-1.5 text-sm font-medium bg-brand-black text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            Download .md
          </button>
        </div>
      </div>

      {/* Contract type + client badge */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium bg-neutral-200 text-neutral-700 px-2 py-0.5 rounded">
          {result.contractType}
        </span>
        <span className="text-xs text-neutral-500">{result.clientName}</span>
      </div>

      {/* Legal warning */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
        This contract has not been reviewed by legal counsel. Review before
        sending to client.
      </div>

      {/* Contract preview */}
      <div className="border border-neutral-200 rounded-lg p-6 max-h-[600px] overflow-y-auto">
        <div className="prose prose-sm prose-neutral max-w-none whitespace-pre-wrap text-sm leading-relaxed">
          {result.contractText}
        </div>
      </div>
    </div>
  );
}
