"use client";

// ─── Auto Quote Card ───────────────────────────────────────────────────────
// Inline form for reviewing and editing auto-generated quote drafts.
// Displayed in the inbox when an item has type "auto_quote_ready".

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AutoQuotePayload {
  quoteId: string;
  quoteNumber: string;
  clientName: string;
  projectName: string;
  contactEmail: string;
  total: number;
  itemCount: number;
  estimationConfidence: "high" | "medium" | "low";
  lang: "FR" | "EN";
  clickupTaskId: string | null;
}

interface QuoteLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface QuoteDetail {
  id: string;
  quoteNumber: string;
  clientName: string;
  projectName: string;
  items: QuoteLineItem[];
  total: string;
  currency: string;
  status: string;
  purposeOfWork: string | null;
  lang: string;
  paymentTermsDays: number;
  estimationConfidence: string | null;
  unpricedItems: string[] | null;
  clickupTaskId: string | null;
}

interface AutoQuoteCardProps {
  itemId: string;
  payload: AutoQuotePayload;
  createdAt: string;
  onFinalized: () => void;
  onDismissed: () => void;
  showToast: (message: string, type: "success" | "error") => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function AutoQuoteCard({
  itemId,
  payload,
  createdAt,
  onFinalized,
  onDismissed,
  showToast,
}: AutoQuoteCardProps) {
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [items, setItems] = useState<QuoteLineItem[]>([]);
  const [purposeOfWork, setPurposeOfWork] = useState("");
  const [lang, setLang] = useState<"FR" | "EN">(payload.lang);
  const [paymentTermsDays, setPaymentTermsDays] = useState(30);
  const [currency, setCurrency] = useState("EUR");
  const [unpricedItems, setUnpricedItems] = useState<string[]>([]);
  const [confidence, setConfidence] = useState(payload.estimationConfidence);
  const [finalizing, setFinalizing] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [fetched, setFetched] = useState(false);

  // Fetch full quote details on first render
  const fetchQuote = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/admin/quotes/${payload.quoteId}`);
      if (!res.ok) {
        setFetchError(`Failed to load quote (${res.status})`);
        return;
      }
      const data = (await res.json()) as QuoteDetail;
      setItems(data.items ?? []);
      setPurposeOfWork(data.purposeOfWork ?? "");
      setLang((data.lang as "FR" | "EN") ?? "EN");
      setPaymentTermsDays(data.paymentTermsDays ?? 30);
      setCurrency(data.currency ?? "EUR");
      setUnpricedItems(data.unpricedItems ?? []);
      setConfidence(
        (data.estimationConfidence as "high" | "medium" | "low") ?? payload.estimationConfidence
      );
    } catch {
      setFetchError("Network error — could not load quote details");
    } finally {
      setLoading(false);
      setFetched(true);
    }
  }, [payload.quoteId, payload.estimationConfidence]);

  // Fetch on mount (only once)
  if (!fetched) {
    fetchQuote();
  }

  // ─── Line item handlers ──────────────────────────────────────────────────

  const updateItem = useCallback(
    (index: number, field: keyof QuoteLineItem, value: string | number) => {
      setItems((prev: QuoteLineItem[]) => {
        const updated = [...prev];
        const item = { ...updated[index] };

        if (field === "description") {
          item.description = value as string;
        } else if (field === "quantity") {
          item.quantity = Number(value) || 0;
          item.total = item.quantity * item.unitPrice;
        } else if (field === "unitPrice") {
          item.unitPrice = Number(value) || 0;
          item.total = item.quantity * item.unitPrice;
        }
        // total is always calculated

        updated[index] = item;
        return updated;
      });
    },
    []
  );

  const addItem = useCallback(() => {
    setItems((prev: QuoteLineItem[]) => [
      ...prev,
      { description: "", quantity: 1, unitPrice: 0, total: 0 },
    ]);
  }, []);

  const removeItem = useCallback((index: number) => {
    setItems((prev: QuoteLineItem[]) => prev.filter((_: QuoteLineItem, i: number) => i !== index));
  }, []);

  const grandTotal = items.reduce((sum: number, item: QuoteLineItem) => sum + item.total, 0);

  const hasNullPrices = items.some((item: QuoteLineItem) => item.unitPrice === 0);

  // ─── Finalize ────────────────────────────────────────────────────────────

  const handleFinalize = useCallback(async () => {
    if (items.length === 0) {
      showToast("Add at least one line item", "error");
      return;
    }
    if (hasNullPrices) {
      showToast("All line items must have a unit price", "error");
      return;
    }
    if (!purposeOfWork.trim()) {
      showToast("Purpose of Work is required", "error");
      return;
    }

    setFinalizing(true);
    try {
      const res = await fetch(`/api/admin/quotes/${payload.quoteId}/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          purposeOfWork: purposeOfWork.trim(),
          lang,
          paymentTermsDays,
          total: grandTotal,
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as Record<string, unknown>;
        const warnings = data.warnings as string[] | undefined;
        if (warnings && warnings.length > 0) {
          showToast(
            `Quote finalized with ${warnings.length} warning${warnings.length > 1 ? "s" : ""} — check console`,
            "success"
          );
          console.warn("[AutoQuoteCard] Warnings:", warnings);
        } else {
          showToast("Quote finalized — PDF uploaded and draft email created", "success");
        }
        onFinalized();
      } else {
        const errData = (await res.json().catch(() => ({ error: "Unknown error" }))) as Record<
          string,
          unknown
        >;
        showToast(`Failed: ${errData.error ?? "Unknown error"}`, "error");
      }
    } catch {
      showToast("Network error — please retry", "error");
    } finally {
      setFinalizing(false);
    }
  }, [items, hasNullPrices, purposeOfWork, lang, paymentTermsDays, grandTotal, payload.quoteId, onFinalized, showToast]);

  // ─── Dismiss ─────────────────────────────────────────────────────────────

  const handleDismiss = useCallback(async () => {
    setDismissing(true);
    try {
      const res = await fetch("/api/admin/inbox", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: itemId, status: "dismissed" }),
      });
      if (res.ok) {
        showToast("Quote dismissed", "success");
        onDismissed();
      } else {
        showToast("Failed to dismiss — please retry", "error");
      }
    } catch {
      showToast("Network error — please retry", "error");
    } finally {
      setDismissing(false);
    }
  }, [itemId, onDismissed, showToast]);

  const timeAgo = formatRelativeTime(createdAt);

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="bg-white rounded-xl border border-brand-flame/30 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-flame/10 text-brand-flame">
            Auto Quote
          </span>
          <span className="text-sm font-medium text-brand-black">
            {payload.clientName} / {payload.projectName}
          </span>
          {confidence === "low" && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-lemon/30 text-yellow-700">
              Low confidence
            </span>
          )}
          {confidence === "medium" && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-cerulean/15 text-brand-cerulean">
              Medium confidence
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500 uppercase font-medium">
            {lang}
          </span>
          <span className="text-xs text-neutral-400">{timeAgo}</span>
        </div>
      </div>

      {/* Low confidence banner */}
      {confidence === "low" && unpricedItems.length > 0 && (
        <div className="bg-brand-lemon/10 border border-brand-lemon/30 rounded-lg px-4 py-3 text-sm">
          <p className="font-semibold text-yellow-800 mb-1">
            Arya could not price the following items:
          </p>
          <ul className="list-disc list-inside text-yellow-700 text-xs space-y-0.5">
            {unpricedItems.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
          <p className="text-xs text-yellow-600 mt-1">
            Add unit prices manually before generating the PDF.
          </p>
        </div>
      )}

      {/* Loading / Error states */}
      {loading && (
        <div className="py-8 text-center text-sm text-neutral-400">
          Loading quote details...
        </div>
      )}

      {fetchError && (
        <div className="bg-brand-flame/10 border border-brand-flame/30 rounded-lg px-4 py-3 text-sm text-brand-flame">
          {fetchError}
          <button
            onClick={fetchQuote}
            className="ml-3 underline font-medium hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Form — visible after loading */}
      {!loading && !fetchError && (
        <>
          {/* Purpose of Work */}
          <div>
            <label
              htmlFor={`aq-pow-${payload.quoteId}`}
              className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1"
            >
              Purpose of Work
            </label>
            <textarea
              id={`aq-pow-${payload.quoteId}`}
              value={purposeOfWork}
              onChange={(e) => setPurposeOfWork(e.target.value)}
              rows={3}
              placeholder="2 sentences: what the client wants to achieve + how Sarani delivers"
              className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean/40 focus:border-brand-cerulean resize-y"
              aria-label="Purpose of Work for the quote"
            />
          </div>

          {/* Language toggle + Payment terms */}
          <div className="flex items-end gap-4 flex-wrap">
            <div>
              <label
                className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1"
              >
                Language
              </label>
              <div className="flex rounded-lg border border-neutral-300 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setLang("FR")}
                  className={cn(
                    "px-4 py-2 text-sm font-medium min-h-[44px] transition-colors",
                    lang === "FR"
                      ? "bg-brand-black text-white"
                      : "bg-neutral-50 text-neutral-600 hover:bg-neutral-100"
                  )}
                  aria-pressed={lang === "FR"}
                >
                  FR
                </button>
                <button
                  type="button"
                  onClick={() => setLang("EN")}
                  className={cn(
                    "px-4 py-2 text-sm font-medium min-h-[44px] transition-colors",
                    lang === "EN"
                      ? "bg-brand-black text-white"
                      : "bg-neutral-50 text-neutral-600 hover:bg-neutral-100"
                  )}
                  aria-pressed={lang === "EN"}
                >
                  EN
                </button>
              </div>
            </div>

            <div className="max-w-[160px]">
              <label
                htmlFor={`aq-terms-${payload.quoteId}`}
                className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1"
              >
                Payment terms (days)
              </label>
              <input
                id={`aq-terms-${payload.quoteId}`}
                type="number"
                min={0}
                max={365}
                value={paymentTermsDays}
                onChange={(e) => setPaymentTermsDays(Number(e.target.value) || 0)}
                className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean/40 focus:border-brand-cerulean"
              />
            </div>
          </div>

          {/* Line items table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="text-left py-2 px-2 text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                    Deliverable
                  </th>
                  <th className="text-center py-2 px-2 text-xs font-semibold text-neutral-500 uppercase tracking-wide w-20">
                    Qty
                  </th>
                  <th className="text-right py-2 px-2 text-xs font-semibold text-neutral-500 uppercase tracking-wide w-28">
                    Unit ({currency})
                  </th>
                  <th className="text-right py-2 px-2 text-xs font-semibold text-neutral-500 uppercase tracking-wide w-28">
                    Total ({currency})
                  </th>
                  <th className="w-10" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index} className="border-b border-neutral-100">
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateItem(index, "description", e.target.value)}
                        className="w-full rounded border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-sm text-brand-black focus:outline-none focus:ring-1 focus:ring-brand-cerulean/40"
                        aria-label={`Description for line ${index + 1}`}
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", e.target.value)}
                        className="w-full rounded border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-sm text-brand-black text-center focus:outline-none focus:ring-1 focus:ring-brand-cerulean/40"
                        aria-label={`Quantity for line ${index + 1}`}
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={item.unitPrice}
                        onChange={(e) => updateItem(index, "unitPrice", e.target.value)}
                        className={cn(
                          "w-full rounded border bg-neutral-50 px-2 py-1.5 text-sm text-brand-black text-right focus:outline-none focus:ring-1 focus:ring-brand-cerulean/40",
                          item.unitPrice === 0
                            ? "border-brand-flame/50"
                            : "border-neutral-200"
                        )}
                        aria-label={`Unit price for line ${index + 1}`}
                      />
                    </td>
                    <td className="py-2 px-2 text-right font-medium text-brand-black tabular-nums">
                      {formatCurrency(item.total, currency)}
                    </td>
                    <td className="py-2 px-1">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="p-1.5 min-h-[44px] min-w-[44px] rounded text-neutral-400 hover:text-brand-flame hover:bg-brand-flame/10 transition-colors flex items-center justify-center"
                        aria-label={`Remove line ${index + 1}`}
                      >
                        <svg
                          className="w-4 h-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Add line + Total */}
            <div className="flex items-center justify-between mt-3 px-2">
              <button
                type="button"
                onClick={addItem}
                className="text-sm font-medium text-brand-cerulean hover:text-brand-cerulean-dark transition-colors min-h-[44px] flex items-center gap-1"
                aria-label="Add a new line item"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add line
              </button>
              <div className="text-right">
                <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mr-3">
                  Total
                </span>
                <span className="text-lg font-bold text-brand-black tabular-nums">
                  {formatCurrency(grandTotal, currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200">
            <button
              onClick={handleDismiss}
              disabled={dismissing || finalizing}
              className="px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-medium bg-neutral-200 text-neutral-600 hover:bg-neutral-300 transition-colors disabled:opacity-50"
              aria-label="Dismiss this auto-quote"
            >
              {dismissing ? "Dismissing..." : "Dismiss"}
            </button>
            <button
              onClick={() => setShowConfirm(true)}
              disabled={finalizing || dismissing || items.length === 0 || hasNullPrices}
              className={cn(
                "px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50",
                items.length > 0 && !hasNullPrices
                  ? "bg-brand-flame hover:bg-brand-flame/90"
                  : "bg-neutral-300 cursor-not-allowed"
              )}
              aria-label="Generate PDF and send"
            >
              {finalizing ? "Generating..." : "Generate PDF & Send"}
            </button>
          </div>
        </>
      )}

      {/* Confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-brand-black mb-2">Confirm & Send</h3>
            <p className="text-sm text-neutral-600 mb-1">
              This will generate the PDF, upload to SharePoint, and create an email draft to <strong>{payload.contactEmail}</strong>.
            </p>
            <p className="text-sm text-neutral-600 mb-4">
              Total: <strong>{currency} {grandTotal.toFixed(2)}</strong> — {items.length} item{items.length > 1 ? "s" : ""}
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-neutral-600 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { setShowConfirm(false); handleFinalize(); }}
                className="px-4 py-2 text-sm font-medium text-white bg-brand-flame rounded-lg hover:bg-brand-flame/90 transition-colors"
              >
                Confirm & Generate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / 3_600_000;
  const diffDays = diffMs / 86_400_000;

  if (diffHours < 1) {
    const mins = Math.floor(diffMs / 60_000);
    return mins < 1 ? "Just now" : `${mins}m ago`;
  }
  if (diffHours < 24) {
    return `${Math.floor(diffHours)}h ago`;
  }
  if (diffDays < 7) {
    return `${Math.floor(diffDays)}d ago`;
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
