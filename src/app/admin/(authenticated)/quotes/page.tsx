"use client";

import { useState, useEffect, useCallback } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface QuoteRecord {
  id: string;
  clientName: string;
  projectName: string;
  items: LineItem[];
  total: string;
  currency: string;
  pdfUrl: string | null;
  createdBy: string;
  createdAt: string;
}

interface ClientRecord {
  id: string;
  name: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function createEmptyItem(): LineItem {
  return { id: generateId(), description: "", quantity: 1, unitPrice: 0, total: 0 };
}

function formatCurrency(amount: number | string, currency: string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  const symbols: Record<string, string> = { EUR: "\u20AC", USD: "$", GBP: "\u00A3" };
  const symbol = symbols[currency] ?? currency;
  return `${symbol}${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ─── Page Component ─────────────────────────────────────────────────────────

export default function QuotesPage() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [pastQuotes, setPastQuotes] = useState<QuoteRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [clientName, setClientName] = useState("");
  const [contactName, setContactName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [scope, setScope] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [items, setItems] = useState<LineItem[]>([createEmptyItem()]);

  // Filter for past quotes
  const [quoteClientFilter, setQuoteClientFilter] = useState("");

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/clients");
      if (res.ok) {
        const data: ClientRecord[] = await res.json();
        setClients(data);
      }
    } catch {
      // Non-critical — client dropdown just stays empty
    }
  }, []);

  const fetchQuotes = useCallback(async () => {
    setLoading(true);
    try {
      const params = quoteClientFilter ? `?client=${encodeURIComponent(quoteClientFilter)}` : "";
      const res = await fetch(`/api/admin/quotes${params}`);
      if (res.ok) {
        const data: QuoteRecord[] = await res.json();
        setPastQuotes(data);
      }
    } catch {
      // Non-critical
    } finally {
      setLoading(false);
    }
  }, [quoteClientFilter]);

  useEffect(() => {
    fetchClients();
    fetchQuotes();
  }, [fetchClients, fetchQuotes]);

  // ─── Line item handlers ─────────────────────────────────────────────────

  const updateItem = (id: string, field: keyof LineItem, value: string | number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === "quantity" || field === "unitPrice") {
          updated.total = updated.quantity * updated.unitPrice;
        }
        return updated;
      })
    );
  };

  const addItem = () => setItems((prev) => [...prev, createEmptyItem()]);

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const grandTotal = items.reduce((sum, item) => sum + item.total, 0);

  // ─── Submit ─────────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    setError(null);
    setSuccess(null);

    if (!clientName || !contactName || !projectName || !description || !scope) {
      setError("All fields are required.");
      return;
    }

    const validItems = items.filter((i) => i.description.trim());
    if (validItems.length === 0) {
      setError("At least one line item with a description is required.");
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch("/api/admin/quotes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName,
          contactName,
          projectName,
          description,
          scope,
          items: validItems.map(({ description: desc, quantity, unitPrice, total }) => ({
            description: desc,
            quantity,
            unitPrice,
            total,
          })),
          currency,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error ?? `Failed (${res.status})`);
      }

      // Download the PDF
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `quote_${projectName.replace(/\s+/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const spUrl = res.headers.get("X-SharePoint-Url");
      setSuccess(
        spUrl
          ? "Quote generated and uploaded to SharePoint."
          : "Quote generated. SharePoint upload skipped (check logs)."
      );

      // Refresh quotes list
      fetchQuotes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate quote");
    } finally {
      setGenerating(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-brand-black">Quote Generator</h1>
        <p className="text-neutral-500 text-sm mt-1">
          Create professional PDF quotes and upload them to SharePoint
        </p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl border border-neutral-300 p-6 space-y-6">
        {/* Client + Contact row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-brand-black mb-1.5">
              Client <span className="text-error">*</span>
            </label>
            <select
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
            >
              <option value="">Select a client...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-black mb-1.5">
              Contact Name <span className="text-error">*</span>
            </label>
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="e.g. Sophie Martin"
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
            />
          </div>
        </div>

        {/* Project name + Currency */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-brand-black mb-1.5">
              Project Name <span className="text-error">*</span>
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g. TikTok Holiday Campaign 2026"
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-black mb-1.5">
              Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
            >
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
              <option value="GBP">GBP</option>
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-brand-black mb-1.5">
            Purpose of Work <span className="text-error">*</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Describe the purpose of the work..."
            className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent resize-y"
          />
        </div>

        {/* Scope */}
        <div>
          <label className="block text-sm font-medium text-brand-black mb-1.5">
            Scope and Deliverables <span className="text-error">*</span>
          </label>
          <textarea
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            rows={3}
            placeholder="List of deliverables..."
            className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent resize-y"
          />
        </div>

        {/* Line Items */}
        <div>
          <label className="block text-sm font-medium text-brand-black mb-3">
            Line Items
          </label>
          <div className="border border-neutral-300 rounded-lg overflow-hidden">
            {/* Desktop table layout */}
            <div className="hidden sm:block overflow-x-auto">
              {/* Table Header */}
              <div className="grid grid-cols-[1fr_100px_120px_120px_40px] gap-0 bg-neutral-100 border-b border-neutral-300">
                <div className="px-3 py-2 text-xs font-semibold text-neutral-500 uppercase">
                  Description
                </div>
                <div className="px-3 py-2 text-xs font-semibold text-neutral-500 uppercase">
                  Qty
                </div>
                <div className="px-3 py-2 text-xs font-semibold text-neutral-500 uppercase">
                  Unit Price
                </div>
                <div className="px-3 py-2 text-xs font-semibold text-neutral-500 uppercase">
                  Total
                </div>
                <div />
              </div>

              {/* Rows */}
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  className={`grid grid-cols-[1fr_100px_120px_120px_40px] gap-0 border-b border-neutral-200 ${
                    idx % 2 === 0 ? "bg-white" : "bg-neutral-50"
                  }`}
                >
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateItem(item.id, "description", e.target.value)}
                    placeholder="Item description"
                    aria-label="Item description"
                    className="px-3 py-2.5 text-sm text-brand-black bg-transparent border-none focus:outline-none focus:ring-0 placeholder:text-neutral-400"
                  />
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(item.id, "quantity", Math.max(0, parseFloat(e.target.value) || 0))
                    }
                    min={0}
                    aria-label="Quantity"
                    className="px-3 py-2.5 text-sm text-brand-black bg-transparent border-none focus:outline-none focus:ring-0"
                  />
                  <input
                    type="number"
                    value={item.unitPrice}
                    onChange={(e) =>
                      updateItem(item.id, "unitPrice", Math.max(0, parseFloat(e.target.value) || 0))
                    }
                    min={0}
                    step={0.01}
                    aria-label="Unit price"
                    className="px-3 py-2.5 text-sm text-brand-black bg-transparent border-none focus:outline-none focus:ring-0"
                  />
                  <div className="px-3 py-2.5 text-sm font-medium text-brand-black">
                    {formatCurrency(item.total, currency)}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    disabled={items.length <= 1}
                    className="flex items-center justify-center text-neutral-400 hover:text-error disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    aria-label="Remove item"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            {/* Mobile card layout */}
            <div className="sm:hidden divide-y divide-neutral-200">
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  className={`p-3 space-y-2 ${idx % 2 === 0 ? "bg-white" : "bg-neutral-50"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateItem(item.id, "description", e.target.value)}
                      placeholder="Item description"
                      aria-label="Item description"
                      className="flex-1 px-2 py-2 text-sm text-brand-black bg-transparent border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-cerulean placeholder:text-neutral-400"
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      disabled={items.length <= 1}
                      className="p-2 text-neutral-400 hover:text-error disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
                      aria-label="Remove item"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Qty</label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(item.id, "quantity", Math.max(0, parseFloat(e.target.value) || 0))
                        }
                        min={0}
                        aria-label="Quantity"
                        className="w-full px-2 py-1.5 text-sm text-brand-black border border-neutral-300 rounded-lg bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-cerulean"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Unit Price</label>
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) =>
                          updateItem(item.id, "unitPrice", Math.max(0, parseFloat(e.target.value) || 0))
                        }
                        min={0}
                        step={0.01}
                        aria-label="Unit price"
                        className="w-full px-2 py-1.5 text-sm text-brand-black border border-neutral-300 rounded-lg bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-cerulean"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Total</label>
                      <div className="px-2 py-1.5 text-sm font-medium text-brand-black">
                        {formatCurrency(item.total, currency)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add row + Total */}
            <div className="flex items-center justify-between px-3 py-3 bg-neutral-100">
              <button
                type="button"
                onClick={addItem}
                className="text-sm font-medium text-brand-cerulean hover:underline"
              >
                + Add line item
              </button>
              <div className="text-sm font-bold text-brand-black">
                Total: {formatCurrency(grandTotal, currency)}
              </div>
            </div>
          </div>
        </div>

        {/* Error / Success */}
        {error && (
          <div className="bg-error-light border border-error rounded-lg px-4 py-3 text-sm text-error">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-success-light border border-success rounded-lg px-4 py-3 text-sm text-success">
            {success}
          </div>
        )}

        {/* Indeterminate progress bar during generation */}
        {generating && (
          <div className="h-1 w-full rounded-full bg-neutral-200 overflow-hidden">
            <div className="h-full w-1/3 rounded-full bg-brand-cerulean animate-[indeterminate_1.5s_ease-in-out_infinite]" />
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating && (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {generating ? "Generating PDF..." : "Generate PDF"}
          </button>
        </div>
      </div>

      {/* Past Quotes */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-lg font-bold text-brand-black">Previous Quotes</h2>
          <select
            value={quoteClientFilter}
            onChange={(e) => setQuoteClientFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
          >
            <option value="">All Clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {loading && (
          <div className="bg-white rounded-xl border border-neutral-300 p-8 text-center">
            <p className="text-neutral-400 text-sm">Loading quotes...</p>
          </div>
        )}

        {!loading && pastQuotes.length === 0 && (
          <div className="bg-white rounded-xl border border-neutral-300 p-8 text-center">
            <p className="text-neutral-400 text-sm">No quotes found.</p>
          </div>
        )}

        {!loading && pastQuotes.length > 0 && (
          <>
            {/* Desktop table */}
            <div className="hidden md:block bg-white rounded-xl border border-neutral-300 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <caption className="sr-only">Previous quotes</caption>
                  <thead>
                    <tr className="border-b border-neutral-200 text-left">
                      <th className="px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                        Client
                      </th>
                      <th className="px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                        Project
                      </th>
                      <th className="px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pastQuotes.map((q) => (
                      <tr
                        key={q.id}
                        className="border-b border-neutral-100 hover:bg-neutral-200/50 transition-colors"
                      >
                        <td className="px-5 py-3.5 text-sm text-neutral-600 whitespace-nowrap">
                          {formatDate(q.createdAt)}
                        </td>
                        <td className="px-5 py-3.5 text-sm font-medium text-brand-black whitespace-nowrap">
                          {q.clientName}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-brand-black max-w-[280px] truncate">
                          {q.projectName}
                        </td>
                        <td className="px-5 py-3.5 text-sm font-medium text-brand-black whitespace-nowrap">
                          {formatCurrency(q.total, q.currency)}
                        </td>
                        <td className="px-5 py-3.5">
                          {q.pdfUrl ? (
                            <a
                              href={q.pdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-medium text-brand-cerulean hover:underline"
                            >
                              View on SharePoint
                            </a>
                          ) : (
                            <span className="text-neutral-400 text-xs">No link</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {pastQuotes.map((q) => (
                <div
                  key={q.id}
                  className="bg-white rounded-xl border border-neutral-300 p-4 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-neutral-400">{formatDate(q.createdAt)}</p>
                      <p className="text-sm font-medium text-brand-black mt-0.5">
                        {q.clientName}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-brand-black shrink-0">
                      {formatCurrency(q.total, q.currency)}
                    </p>
                  </div>
                  <p className="text-sm text-neutral-600 truncate">{q.projectName}</p>
                  {q.pdfUrl ? (
                    <a
                      href={q.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block text-sm font-medium text-brand-cerulean hover:underline"
                    >
                      View on SharePoint
                    </a>
                  ) : (
                    <span className="text-neutral-400 text-xs">No link</span>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
