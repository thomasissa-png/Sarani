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
  GuidanceMessage,
  RecommendedBadge,
  StepIndicator,
  PreSubmitSummary,
  TextareaWithCount,
} from "@/components/admin/guided-form";

// ─── Types ──────────────────────────────────────────────────────────────────

type FormState = {
  clientId: string;
  contractType: ContractType;
  scopeOfWork: string;
  totalAmount: string;
  currency: Currency;
  deliveryDate: string;
  // recommended
  paymentTerms: string;
  revisionsIncluded: string;
  projectName: string;
  governingLaw: string;
  // optional
  specialClauses: string;
  referencesFrameworkAgreement: boolean;
  secondPartyContact: string;
  language: "en" | "fr";
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function getDefaultDeliveryDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().split("T")[0];
}

const PAYMENT_TERMS = [
  { value: "", label: "-- Select payment terms --" },
  { value: "100_upfront", label: "100% upfront" },
  { value: "50_50", label: "50% upfront + 50% on delivery" },
  { value: "30_net", label: "30 days net" },
  { value: "60_net", label: "60 days net" },
];

const REVISIONS_OPTIONS = [
  { value: "", label: "-- Select revisions --" },
  { value: "unlimited", label: "Unlimited" },
  { value: "2_rounds", label: "2 rounds" },
  { value: "3_rounds", label: "3 rounds" },
  { value: "none", label: "None" },
];

const GOVERNING_LAW_OPTIONS = [
  { value: "", label: "-- Auto-detect from client --" },
  { value: "France", label: "France" },
  { value: "UK", label: "UK" },
  { value: "Ireland", label: "Ireland" },
  { value: "UAE", label: "UAE" },
  { value: "USA", label: "USA" },
  { value: "Other", label: "Other" },
];

const INITIAL_FORM: FormState = {
  clientId: "",
  contractType: "SOW",
  scopeOfWork: "",
  totalAmount: "",
  currency: "EUR",
  deliveryDate: getDefaultDeliveryDate(),
  paymentTerms: "",
  revisionsIncluded: "",
  projectName: "",
  governingLaw: "",
  specialClauses: "",
  referencesFrameworkAgreement: false,
  secondPartyContact: "",
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

  // Advanced options toggle
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GenerateContractResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // ── Legal info completeness check ─────────────────────────────────────────

  const clientLegalIncomplete =
    selectedClient &&
    (!selectedClient.legalEntityName || !selectedClient.vatNumber);

  // ── Smart defaults when client is loaded ─────────────────────────────────

  const handleClientLoaded = useCallback(
    (client: Client | null) => {
      setSelectedClient(client);
      if (client) {
        setForm((prev) => {
          const updates: Partial<FormState> = {};
          // Language smart default
          const lang = client.primaryLanguage?.toLowerCase();
          if (lang === "fr" || lang === "french") {
            updates.language = "fr";
          } else {
            updates.language = "en";
          }
          // Governing law smart default from client country
          if (client.legalCountry) {
            const country = client.legalCountry;
            const match = GOVERNING_LAW_OPTIONS.find(
              (o) => o.value.toLowerCase() === country.toLowerCase()
            );
            if (match) {
              updates.governingLaw = match.value;
            }
          }
          return { ...prev, ...updates };
        });
      }
    },
    []
  );

  // ── Step validation ─────────────────────────────────────────────────────

  function canProceedStep0(): boolean {
    // Client required + legal info must be complete
    return !!form.clientId && !clientLegalIncomplete;
  }

  function canProceedStep1(): boolean {
    const amountNum = parseFloat(form.totalAmount);
    return (
      form.scopeOfWork.length >= 20 &&
      !isNaN(amountNum) &&
      amountNum > 0 &&
      !!form.deliveryDate
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
          projectDescription: form.scopeOfWork,
          amount: parseFloat(form.totalAmount),
          currency: form.currency,
          deliverables: form.scopeOfWork,
          startDate: new Date().toISOString().split("T")[0],
          endDate: form.deliveryDate,
          specialClauses: form.specialClauses || undefined,
          language: form.language,
          // Pass new fields as additional context
          paymentTerms: form.paymentTerms || undefined,
          revisionsIncluded: form.revisionsIncluded || undefined,
          projectName: form.projectName || undefined,
          governingLaw: form.governingLaw || undefined,
          referencesFrameworkAgreement: form.referencesFrameworkAgreement || undefined,
          secondPartyContact: form.secondPartyContact || undefined,
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
      { label: "VAT Number", value: selectedClient?.vatNumber || "—" },
      { label: "Contract Type", value: CONTRACT_TYPE_LABELS[form.contractType] },
      {
        label: "Amount",
        value: form.totalAmount ? `${form.totalAmount} ${form.currency}` : "—",
      },
      { label: "Delivery Date", value: form.deliveryDate },
      { label: "Language", value: form.language === "en" ? "English" : "French" },
      ...(form.governingLaw
        ? [{ label: "Governing Law", value: form.governingLaw }]
        : []),
      ...(form.paymentTerms
        ? [{ label: "Payment Terms", value: PAYMENT_TERMS.find((p) => p.value === form.paymentTerms)?.label || form.paymentTerms }]
        : []),
      ...(form.projectName
        ? [{ label: "Project Name", value: form.projectName }]
        : []),
      {
        label: "Scope",
        value:
          form.scopeOfWork.length > 80
            ? form.scopeOfWork.slice(0, 80) + "..."
            : form.scopeOfWork,
      },
    ];
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-4xl">
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

        {/* Guidance message */}
        <GuidanceMessage>
          Contracts require precision. Before generating, verify that the client
          record contains the correct legal entity name and VAT number — these
          are auto-filled but should always be confirmed. Fill every variable
          before generating. A draft reviewed by human counsel before sending is
          mandatory — this agent produces the draft, not the signed contract.
        </GuidanceMessage>

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
                {/* Blocking warning if legal info is incomplete */}
                {clientLegalIncomplete && (
                  <div className="mt-2 bg-red-50 border border-red-300 rounded-lg px-4 py-3 text-sm text-red-800">
                    <span className="font-semibold">Warning:</span> This
                    client&apos;s legal information is incomplete
                    {!selectedClient.legalEntityName && !selectedClient.vatNumber
                      ? " (missing legal entity name and VAT number)"
                      : !selectedClient.legalEntityName
                        ? " (missing legal entity name)"
                        : " (missing VAT number)"}
                    . Please update their profile first before generating a
                    contract.
                  </div>
                )}
              </div>
            )}

            {/* Auto-detected fields display */}
            {selectedClient && !clientLegalIncomplete && (
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm space-y-1">
                <p className="font-medium text-green-800">
                  Auto-detected from client record
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs text-green-700">
                  <span>
                    Legal entity: {selectedClient.legalEntityName}
                  </span>
                  <span>VAT: {selectedClient.vatNumber}</span>
                  {selectedClient.legalCountry && (
                    <span>
                      Country: {selectedClient.legalCountry} (governing law
                      default)
                    </span>
                  )}
                </div>
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
            {/* Contract type — required */}
            <FormField
              label="Contract Type"
              required
              helperText="Determines which template is loaded. Different templates have entirely different clause structures, variable lists, and legal logic."
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

            {/* Scope of work — required */}
            <FormField
              label="Scope of Work"
              required
              helperText="The single most litigated clause in any SOW. Vague scope = scope creep = unpaid work. Describe deliverables with enough specificity to be enforceable."
            >
              <TextareaWithCount
                value={form.scopeOfWork}
                onChange={(val) =>
                  setForm((prev) => ({ ...prev, scopeOfWork: val }))
                }
                placeholder="Design and delivery of 50 web banners in 3 formats (728x90, 300x250, 160x600) in English and French, 2 revision rounds included."
                minLength={20}
                rows={3}
              />
            </FormField>

            {/* Total amount + Currency — required */}
            <div className="grid grid-cols-3 gap-4">
              <FormField
                label="Total Amount"
                required
                helperText="Total contract value before taxes (EUR)."
              >
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.totalAmount}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, totalAmount: e.target.value }))
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

            {/* Delivery date — required */}
            <FormField
              label="Delivery Date"
              required
              helperText="Contractual commitment. Without it, the SOW has no deadline clause."
            >
              <input
                type="date"
                value={form.deliveryDate}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, deliveryDate: e.target.value }))
                }
                className="w-full max-w-xs px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
              />
            </FormField>

            {/* ── Recommended fields ──────────────────────────────────────── */}
            <div className="border-t border-neutral-200 pt-5 space-y-5">
              <FormField
                label={
                  <>
                    Payment Terms
                    <RecommendedBadge />
                  </>
                }
                helperText="Payment terms are the second most disputed clause. Leaving this blank defaults to the template standard."
              >
                <select
                  value={form.paymentTerms}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      paymentTerms: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                >
                  {PAYMENT_TERMS.map((pt) => (
                    <option key={pt.value} value={pt.value}>
                      {pt.label}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField
                label={
                  <>
                    Revisions Included
                    <RecommendedBadge />
                  </>
                }
                helperText="Sarani's differentiator is unlimited revisions — but for fixed-price projects, this may need to be capped."
              >
                <select
                  value={form.revisionsIncluded}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      revisionsIncluded: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                >
                  {REVISIONS_OPTIONS.map((ro) => (
                    <option key={ro.value} value={ro.value}>
                      {ro.label}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField
                label={
                  <>
                    Project Name
                    <RecommendedBadge />
                  </>
                }
                helperText="Appears in the SOW header and in ClickUp. Prevents confusion when clients have multiple active SOWs."
              >
                <input
                  type="text"
                  value={form.projectName}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, projectName: e.target.value }))
                  }
                  placeholder="Black Friday Campaign 2026"
                  className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                />
              </FormField>

              <FormField
                label={
                  <>
                    Governing Law
                    <RecommendedBadge />
                  </>
                }
                helperText="Auto-filled from client country, but may need override. A French company contracting with a Dubai entity may prefer neutral jurisdiction."
              >
                <select
                  value={form.governingLaw}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      governingLaw: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                >
                  {GOVERNING_LAW_OPTIONS.map((gl) => (
                    <option key={gl.value} value={gl.value}>
                      {gl.label}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            {/* ── Advanced options (collapsible) ─────────────────────────── */}
            <div className="border-t border-neutral-200 pt-4">
              <button
                type="button"
                onClick={() => setAdvancedOpen(!advancedOpen)}
                className="flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-brand-black transition-colors"
              >
                <span
                  className="transition-transform"
                  style={{
                    display: "inline-block",
                    transform: advancedOpen ? "rotate(90deg)" : "rotate(0deg)",
                  }}
                >
                  &#9654;
                </span>
                Advanced options
              </button>
              {advancedOpen && (
                <div className="mt-4 space-y-5">
                  <FormField
                    label="Special Clauses"
                    helperText="Non-standard clauses to add or modify (e.g., confidentiality addendum, exclusivity window, specific IP transfer terms)."
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

                  <FormField
                    label="References Framework Agreement"
                    helperText="If a master services agreement exists for this client, the SOW should reference it."
                  >
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.referencesFrameworkAgreement}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            referencesFrameworkAgreement: e.target.checked,
                          }))
                        }
                        className="rounded border-neutral-300"
                      />
                      <span className="text-sm text-neutral-700">
                        This client has a signed master services agreement
                      </span>
                    </label>
                  </FormField>

                  <FormField
                    label="Second Party Contact"
                    helperText="Name and title of the signatory on the client side. Useful for the signature block."
                  >
                    <input
                      type="text"
                      value={form.secondPartyContact}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          secondPartyContact: e.target.value,
                        }))
                      }
                      placeholder="e.g. Sophie Martin, Head of Procurement"
                      className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                    />
                  </FormField>
                </div>
              )}
            </div>

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
