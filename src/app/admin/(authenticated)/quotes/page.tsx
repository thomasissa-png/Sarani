"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";

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
  quoteNumber: string;
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

interface PrefillLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface PrefillResponse {
  purpose: string;
  lineItems: PrefillLineItem[];
  applyVat: boolean;
  vatRate: number;
  sources: {
    purpose: "clickup" | "excel" | "none";
    lineItems: "excel" | "none";
    vatReason: string;
  };
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

export default function QuotesPageWrapper() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-neutral-400">Loading...</div>}>
      <QuotesPage />
    </Suspense>
  );
}

function QuotesPage() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [pastQuotes, setPastQuotes] = useState<QuoteRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state — select by ID, derive name
  const [selectedClientId, setSelectedClientId] = useState("");
  const [isNewClient, setIsNewClient] = useState(false);
  const [customClientName, setCustomClientName] = useState("");
  const clientName = isNewClient ? customClientName.trim() : (clients.find((c) => c.id === selectedClientId)?.name ?? "");
  const [contactName, setContactName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [scope, setScope] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [vatRate, setVatRate] = useState<number | null>(null); // null = no VAT by default, prefill may override
  const [items, setItems] = useState<LineItem[]>([createEmptyItem()]);
  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });

  // Prefill state
  const [prefilling, setPrefilling] = useState(false);
  const [prefillSource, setPrefillSource] = useState<PrefillResponse["sources"] | null>(null);

  // Preview state
  const [showPreview, setShowPreview] = useState(false);

  // Filter for past quotes
  const [quoteClientFilter, setQuoteClientFilter] = useState("");

  // Pre-fill from query params (e.g. from Tracker "Generate Quote" link)
  const searchParams = useSearchParams();
  useEffect(() => {
    const qClientId = searchParams.get("clientId");
    const qClient = searchParams.get("client");
    const qProject = searchParams.get("project");
    const qContact = searchParams.get("contact");
    const qAmount = searchParams.get("amount");
    const qCategory = searchParams.get("category");

    // Prefer clientId if available; fall back to matching by name
    if (qClientId) {
      setSelectedClientId(qClientId);
    } else if (qClient && clients.length > 0) {
      const matched = clients.find(
        (c) => c.name.toLowerCase() === qClient.toLowerCase()
      );
      if (matched) setSelectedClientId(matched.id);
    }

    if (qProject) setProjectName(qProject);
    if (qContact) setContactName(qContact);
    if (qCategory) setScope(qCategory);
    // Auto-create a line item from tracker data (fallback if prefill doesn't return items)
    if (qProject && qAmount && parseFloat(qAmount) > 0) {
      setItems([{
        id: generateId(),
        description: qProject,
        quantity: 1,
        unitPrice: parseFloat(qAmount),
        total: parseFloat(qAmount),
      }]);
    }

    // Call prefill API to get purpose, line items from Excel, and VAT auto-detection
    if (qClient && qProject) {
      setPrefilling(true);
      fetch(`/api/admin/quotes/prefill?client=${encodeURIComponent(qClient)}&project=${encodeURIComponent(qProject)}`)
        .then((res) => {
          if (!res.ok) throw new Error("Prefill failed");
          return res.json() as Promise<PrefillResponse>;
        })
        .then((prefill) => {
          setPrefillSource(prefill.sources);

          // Set purpose if we got one and user hasn't typed anything yet
          if (prefill.purpose) {
            setDescription((prev: string) => prev || prefill.purpose);
          }

          // Set line items from Excel assets (overrides the single amount-based item)
          if (prefill.lineItems.length > 0) {
            setItems(
              prefill.lineItems.map((li) => ({
                id: generateId(),
                description: li.description,
                quantity: li.quantity,
                unitPrice: li.unitPrice,
                total: li.total,
              }))
            );
          }

          // Auto-set VAT based on client/division detection
          setVatRate(prefill.applyVat ? prefill.vatRate : null);
        })
        .catch((err) => {
          console.error("[Quotes] Prefill error:", err);
          // Non-critical — form still works without prefill
        })
        .finally(() => setPrefilling(false));
    }
  }, [searchParams, clients]);

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

  // ─── Validation ────────────────────────────────────────────────────────

  const validateForm = (): boolean => {
    setError(null);
    setSuccess(null);

    const hasClient = isNewClient ? customClientName.trim().length > 0 : !!selectedClientId;
    if (!hasClient || !contactName || !projectName || !description || !scope) {
      setError("All fields are required.");
      return false;
    }

    const validItems = items.filter((i) => i.description.trim());
    if (validItems.length === 0) {
      setError("At least one line item with a description is required.");
      return false;
    }

    return true;
  };

  // ─── Preview ──────────────────────────────────────────────────────────

  const handlePreview = () => {
    if (validateForm()) {
      setShowPreview(true);
    }
  };

  const handleEditFromPreview = () => {
    setShowPreview(false);
  };

  // ─── Submit (from preview confirmation) ──────────────────────────────

  const handleConfirmGenerate = async () => {
    setError(null);
    setSuccess(null);

    const validItems = items.filter((i) => i.description.trim());

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
          vatRate,
          validUntil,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error ?? `Failed (${res.status})`);
      }

      // Download the PDF
      const quoteNum = res.headers.get("X-Quote-Number") ?? "quote";
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${quoteNum}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const spUrl = res.headers.get("X-SharePoint-Url");
      setSuccess(
        spUrl
          ? `Quote ${quoteNum} generated and uploaded to SharePoint.`
          : `Quote ${quoteNum} generated. SharePoint upload skipped (check logs).`
      );

      setShowPreview(false);

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

      {/* Prefill status banner */}
      {prefilling && (
        <div className="bg-info-light border border-info rounded-lg px-4 py-3 text-sm text-info flex items-center gap-2">
          <svg className="w-4 h-4 animate-spin shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading data from ClickUp and Excel tracker...
        </div>
      )}
      {prefillSource && !prefilling && (
        <div className="bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-3 text-xs text-neutral-500 flex flex-wrap gap-x-4 gap-y-1">
          <span>
            Purpose: <span className="font-medium text-neutral-700">{prefillSource.purpose === "none" ? "manual" : prefillSource.purpose}</span>
          </span>
          <span>
            Line items: <span className="font-medium text-neutral-700">{prefillSource.lineItems === "none" ? "manual" : prefillSource.lineItems}</span>
          </span>
          <span>
            VAT: <span className="font-medium text-neutral-700">{prefillSource.vatReason}</span>
          </span>
        </div>
      )}

      {/* Form */}
      <div className="bg-white rounded-xl border border-neutral-300 p-6 space-y-6">
        {/* Client + Contact row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-brand-black mb-1.5">
              Client <span className="text-error">*</span>
            </label>
            <select
              value={isNewClient ? "__new__" : selectedClientId}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "__new__") {
                  setIsNewClient(true);
                  setSelectedClientId("");
                  setCustomClientName("");
                } else {
                  setIsNewClient(false);
                  setSelectedClientId(val);
                  setCustomClientName("");
                }
              }}
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
            >
              <option value="">Select a client...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
              <option value="__new__">Other / New client</option>
            </select>
            {isNewClient && (
              <input
                type="text"
                value={customClientName}
                onChange={(e) => setCustomClientName(e.target.value)}
                placeholder="Enter new client name..."
                className="w-full mt-2 px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
              />
            )}
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

        {/* Project name + Currency + VAT */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
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
          <div>
            <label className="block text-sm font-medium text-brand-black mb-1.5">
              VAT
            </label>
            <select
              value={vatRate === null ? "none" : String(vatRate)}
              onChange={(e) => {
                const val = e.target.value;
                setVatRate(val === "none" ? null : parseFloat(val));
              }}
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
            >
              <option value="none">No VAT</option>
              <option value="20">20%</option>
              <option value="10">10%</option>
              <option value="5.5">5.5%</option>
            </select>
          </div>
        </div>

        {/* Valid until */}
        <div>
          <label className="block text-sm font-medium text-brand-black mb-1.5">
            Valid until
          </label>
          <input
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
          />
          <p className="text-xs text-neutral-400 mt-1">Default: 30 days from today</p>
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

        {/* Error (shown in form when not in preview mode) */}
        {error && !showPreview && (
          <div className="bg-error-light border border-error rounded-lg px-4 py-3 text-sm text-error">
            {error}
          </div>
        )}
        {success && !showPreview && (
          <div className="bg-success-light border border-success rounded-lg px-4 py-3 text-sm text-success">
            {success}
          </div>
        )}

        {/* Submit / Preview toggle */}
        {!showPreview && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handlePreview}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors"
            >
              Preview Quote
            </button>
          </div>
        )}
      </div>

      {/* Preview Card */}
      {showPreview && (
        <div className="bg-white rounded-xl border-2 border-brand-cerulean p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-brand-black">Quote Preview</h2>
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-info-light text-info">
              Draft
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-neutral-400 text-xs font-medium uppercase">Client</p>
              <p className="text-brand-black font-medium mt-0.5">{clientName}</p>
            </div>
            <div>
              <p className="text-neutral-400 text-xs font-medium uppercase">Contact</p>
              <p className="text-brand-black font-medium mt-0.5">{contactName}</p>
            </div>
            <div>
              <p className="text-neutral-400 text-xs font-medium uppercase">Currency</p>
              <p className="text-brand-black font-medium mt-0.5">{currency}</p>
            </div>
            <div>
              <p className="text-neutral-400 text-xs font-medium uppercase">VAT</p>
              <p className="text-brand-black font-medium mt-0.5">{vatRate !== null ? `${vatRate}%` : "None"}</p>
            </div>
          </div>

          <div>
            <p className="text-neutral-400 text-xs font-medium uppercase">Project</p>
            <p className="text-brand-black font-medium mt-0.5">{projectName}</p>
          </div>

          {/* Items summary */}
          <div className="border border-neutral-200 rounded-lg overflow-hidden">
            <div className="grid grid-cols-[1fr_80px_100px_100px] bg-neutral-100 px-3 py-2 text-xs font-semibold text-neutral-500 uppercase">
              <span>Item</span>
              <span>Qty</span>
              <span>Unit Price</span>
              <span>Total</span>
            </div>
            {items
              .filter((i) => i.description.trim())
              .map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[1fr_80px_100px_100px] px-3 py-2 border-t border-neutral-100 text-sm"
                >
                  <span className="text-brand-black truncate">{item.description}</span>
                  <span className="text-neutral-600">{item.quantity}</span>
                  <span className="text-neutral-600">{formatCurrency(item.unitPrice, currency)}</span>
                  <span className="font-medium text-brand-black">{formatCurrency(item.total, currency)}</span>
                </div>
              ))}
            {vatRate !== null && vatRate > 0 && (
              <>
                <div className="grid grid-cols-[1fr_100px] px-3 py-2 bg-neutral-50 border-t border-neutral-200">
                  <span className="text-sm text-neutral-600">Subtotal</span>
                  <span className="text-sm font-medium text-brand-black">{formatCurrency(grandTotal, currency)}</span>
                </div>
                <div className="grid grid-cols-[1fr_100px] px-3 py-2 bg-neutral-50 border-t border-neutral-100">
                  <span className="text-sm text-neutral-500">VAT ({vatRate}%)</span>
                  <span className="text-sm text-neutral-600">{formatCurrency(grandTotal * (vatRate / 100), currency)}</span>
                </div>
              </>
            )}
            <div className="grid grid-cols-[1fr_100px] px-3 py-2.5 bg-neutral-100 border-t border-neutral-200">
              <span className="text-sm font-bold text-brand-black">
                {vatRate !== null && vatRate > 0 ? "Total (incl. VAT)" : "Grand Total"}
              </span>
              <span className="text-sm font-bold text-brand-black">
                {formatCurrency(
                  vatRate !== null && vatRate > 0
                    ? grandTotal + grandTotal * (vatRate / 100)
                    : grandTotal,
                  currency
                )}
              </span>
            </div>
          </div>

          {/* Error / Success inside preview */}
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

          {/* Progress bar */}
          {generating && (
            <div className="h-1 w-full rounded-full bg-neutral-200 overflow-hidden">
              <div className="h-full w-1/3 rounded-full bg-brand-cerulean animate-[indeterminate_1.5s_ease-in-out_infinite]" />
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleEditFromPreview}
              disabled={generating}
              className="px-5 py-2.5 text-sm font-semibold text-brand-black border border-neutral-300 rounded-lg hover:bg-neutral-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={handleConfirmGenerate}
              disabled={generating}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating && (
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {generating ? "Generating..." : "Download PDF"}
            </button>
          </div>
        </div>
      )}

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
                        Quote #
                      </th>
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
                        <td className="px-5 py-3.5 text-sm font-mono text-neutral-600 whitespace-nowrap">
                          {q.quoteNumber}
                        </td>
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
                      <p className="text-xs font-mono text-neutral-500">{q.quoteNumber}</p>
                      <p className="text-xs text-neutral-400 mt-0.5">{formatDate(q.createdAt)}</p>
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
