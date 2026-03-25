"use client";

import { useEffect, useState, useCallback } from "react";
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

// ─── Page Component ─────────────────────────────────────────────────────────

export default function LegalAgentPage() {
  // Clients data
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Form state
  const [form, setForm] = useState<FormState>(INITIAL_FORM);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GenerateContractResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
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

  // Update selected client when clientId changes
  useEffect(() => {
    if (form.clientId) {
      const client = clients.find((c) => c.id === form.clientId) || null;
      setSelectedClient(client);
    } else {
      setSelectedClient(null);
    }
  }, [form.clientId, clients]);

  // ── Generate contract ─────────────────────────────────────────────────

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setCopied(false);

    if (!form.clientId) {
      setError("Please select a client.");
      return;
    }

    const amountNum = parseFloat(form.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Please enter a valid positive amount.");
      return;
    }

    if (form.projectDescription.length < 10) {
      setError("Project description must be at least 10 characters.");
      return;
    }

    if (form.deliverables.length < 5) {
      setError("Please describe the deliverables.");
      return;
    }

    setGenerating(true);

    try {
      const res = await fetch("/api/admin/agents/legal/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: form.clientId,
          contractType: form.contractType,
          projectDescription: form.projectDescription,
          amount: amountNum,
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
      // Fallback
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
      <form
        onSubmit={handleGenerate}
        className="bg-white rounded-xl border border-neutral-300 p-6 space-y-5"
      >
        <h2 className="text-lg font-semibold text-brand-black">
          New Contract
        </h2>

        {/* Client select */}
        <div>
          <label
            htmlFor="client"
            className="block text-sm font-medium text-neutral-700 mb-1.5"
          >
            Client
          </label>
          {loadingClients ? (
            <div className="text-sm text-neutral-400">Loading clients...</div>
          ) : (
            <div className="flex gap-2">
              <select
                id="client"
                value={form.clientId}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, clientId: e.target.value }))
                }
                className="flex-1 px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
              >
                <option value="">Select a client...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.industry})
                  </option>
                ))}
              </select>
              <Link
                href="/admin/clients/new"
                className="px-3 py-2.5 text-sm font-medium text-brand-cerulean border border-neutral-300 rounded-lg hover:bg-neutral-100 transition-colors whitespace-nowrap"
              >
                + New client
              </Link>
            </div>
          )}
        </div>

        {/* Client legal info banner */}
        {selectedClient && (
          <div className="bg-neutral-100 rounded-lg px-4 py-3 text-sm space-y-1">
            <p className="font-medium text-neutral-700">Client Legal Info</p>
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
                Legal entity name is missing. The contract will use the client
                name instead. Consider updating the client record.
              </p>
            )}
          </div>
        )}

        {/* Contract type */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">
            Contract Type
          </label>
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
        </div>

        {/* Project description */}
        <div>
          <label
            htmlFor="projectDescription"
            className="block text-sm font-medium text-neutral-700 mb-1.5"
          >
            Project Description / Scope
          </label>
          <textarea
            id="projectDescription"
            value={form.projectDescription}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                projectDescription: e.target.value,
              }))
            }
            placeholder="Describe the project scope, objectives, and context..."
            rows={3}
            className="w-full px-4 py-3 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent resize-y"
          />
        </div>

        {/* Amount + Currency + Language */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label
              htmlFor="amount"
              className="block text-sm font-medium text-neutral-700 mb-1.5"
            >
              Amount
            </label>
            <input
              id="amount"
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
          </div>
          <div>
            <label
              htmlFor="currency"
              className="block text-sm font-medium text-neutral-700 mb-1.5"
            >
              Currency
            </label>
            <select
              id="currency"
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
          </div>
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
                  language: e.target.value as "en" | "fr",
                }))
              }
              className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
            >
              <option value="en">English</option>
              <option value="fr">French</option>
            </select>
          </div>
        </div>

        {/* Deliverables */}
        <div>
          <label
            htmlFor="deliverables"
            className="block text-sm font-medium text-neutral-700 mb-1.5"
          >
            Deliverables
          </label>
          <textarea
            id="deliverables"
            value={form.deliverables}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, deliverables: e.target.value }))
            }
            placeholder="List the deliverables (e.g., 50 web banners in 5 formats, 10 social media posts...)"
            rows={3}
            className="w-full px-4 py-3 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent resize-y"
          />
        </div>

        {/* Start date + End date */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="startDate"
              className="block text-sm font-medium text-neutral-700 mb-1.5"
            >
              Start Date
            </label>
            <input
              id="startDate"
              type="date"
              value={form.startDate}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, startDate: e.target.value }))
              }
              className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
            />
          </div>
          <div>
            <label
              htmlFor="endDate"
              className="block text-sm font-medium text-neutral-700 mb-1.5"
            >
              End Date
            </label>
            <input
              id="endDate"
              type="date"
              value={form.endDate}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, endDate: e.target.value }))
              }
              className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
            />
          </div>
        </div>

        {/* Special clauses */}
        <div>
          <label
            htmlFor="specialClauses"
            className="block text-sm font-medium text-neutral-700 mb-1.5"
          >
            Special Clauses{" "}
            <span className="text-neutral-400 font-normal">(optional)</span>
          </label>
          <textarea
            id="specialClauses"
            value={form.specialClauses}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, specialClauses: e.target.value }))
            }
            placeholder="Any additional clauses, terms, or conditions to include..."
            rows={2}
            className="w-full px-4 py-3 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent resize-y"
          />
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
            {generating ? "Generating..." : "Generate Contract"}
          </button>
        </div>
      </form>

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
