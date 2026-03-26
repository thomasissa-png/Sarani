// ─── Evoliz API Client ──────────────────────────────────────────────────────
// Server-side only. REST API with API key authentication.
// Graceful degradation: works even when EVOLIZ_API_KEY is not configured.

// ─── Types ──────────────────────────────────────────────────────────────────

export type EvolizPaymentStatus = "paid" | "unpaid" | "sent" | "overdue" | "draft";

export interface EvolizInvoice {
  id: number;
  invoiceNumber: string;
  reference: string | null;
  clientName: string;
  amount: number;
  currency: string;
  status: EvolizPaymentStatus;
  issueDate: string;
  dueDate: string | null;
  paidDate: string | null;
}

export interface EvolizInvoiceFilters {
  /** Filter by PO number / external reference */
  reference?: string;
  /** Filter by client name */
  clientName?: string;
  /** Filter by payment status */
  status?: EvolizPaymentStatus;
  /** Page number (1-indexed) */
  page?: number;
  /** Items per page */
  perPage?: number;
}

// ─── Error types ────────────────────────────────────────────────────────────

export class EvolizApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly response: unknown
  ) {
    super(message);
    this.name = "EvolizApiError";
  }
}

export class EvolizNotConfiguredError extends Error {
  constructor() {
    super(
      "Evoliz integration is not configured. Set EVOLIZ_API_KEY and EVOLIZ_COMPANY_ID environment variables."
    );
    this.name = "EvolizNotConfiguredError";
  }
}

// ─── Configuration ──────────────────────────────────────────────────────────

const EVOLIZ_BASE_URL = "https://www.evoliz.io/api/v1";
const RETRY_DELAY_MS = 1000;

interface EvolizConfig {
  apiKey: string;
  companyId: string;
}

/**
 * Check if Evoliz credentials are configured.
 * Returns null if not configured (graceful degradation).
 */
function getConfigOrNull(): EvolizConfig | null {
  const apiKey = process.env.EVOLIZ_API_KEY;
  const companyId = process.env.EVOLIZ_COMPANY_ID;

  if (!apiKey || !companyId) return null;

  return { apiKey, companyId };
}

/**
 * Check whether the Evoliz integration is configured at all.
 */
export function isConfigured(): boolean {
  return getConfigOrNull() !== null;
}

// ─── Internal fetch with retry ──────────────────────────────────────────────

async function evolizFetch<T>(
  path: string,
  config: EvolizConfig,
  options: RequestInit = {}
): Promise<T> {
  const url = `${EVOLIZ_BASE_URL}/${config.companyId}${path}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.apiKey}`,
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };

  const fetchWithRetry = async (attempt: number): Promise<T> => {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Rate limited — retry once
    if (response.status === 429 && attempt === 0) {
      const retryAfter = response.headers.get("Retry-After");
      const delayMs = retryAfter
        ? parseInt(retryAfter, 10) * 1000
        : RETRY_DELAY_MS;
      await sleep(delayMs);
      return fetchWithRetry(1);
    }

    // Server error — retry once
    if (response.status >= 500 && attempt === 0) {
      await sleep(RETRY_DELAY_MS);
      return fetchWithRetry(1);
    }

    if (!response.ok) {
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        body = await response.text().catch(() => null);
      }
      throw new EvolizApiError(
        `Evoliz API error: ${response.status} ${response.statusText} on ${path}`,
        response.status,
        body
      );
    }

    return response.json() as Promise<T>;
  };

  return fetchWithRetry(0);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Raw API Response Type ──────────────────────────────────────────────

/**
 * Q-02: Partial type for the raw Evoliz API invoice response.
 * Fields are snake_case as returned by the API.
 */
interface RawEvolizInvoiceResponse {
  invoiceid?: number;
  id?: number;
  document_number?: string;
  invoice_number?: string;
  external_reference?: string;
  reference?: string;
  client_name?: string;
  client?: { name?: string } | null;
  total_ttc?: number;
  total?: number;
  amount?: number;
  currency?: string;
  status?: string;
  payment_status?: string;
  documentdate?: string;
  issue_date?: string;
  date?: string;
  due_date?: string | null;
  paid_date?: string | null;
}

// ─── Response Normalization ─────────────────────────────────────────────────

/**
 * Normalize a raw Evoliz API invoice response to our internal type.
 * The Evoliz API returns snake_case fields — we normalize to camelCase.
 */
function normalizeInvoice(raw: RawEvolizInvoiceResponse): EvolizInvoice {
  const rawStatus = String(raw.status ?? raw.payment_status ?? "draft").toLowerCase();
  let status: EvolizPaymentStatus;

  if (rawStatus === "paid" || rawStatus === "complete") {
    status = "paid";
  } else if (rawStatus === "sent" || rawStatus === "pending") {
    status = "sent";
  } else if (rawStatus === "overdue" || rawStatus === "late") {
    status = "overdue";
  } else if (rawStatus === "draft") {
    status = "draft";
  } else {
    status = "unpaid";
  }

  return {
    id: Number(raw.invoiceid ?? raw.id ?? 0),
    invoiceNumber: String(raw.document_number ?? raw.invoice_number ?? ""),
    reference: raw.external_reference
      ? String(raw.external_reference)
      : raw.reference
        ? String(raw.reference)
        : null,
    clientName: String(
      raw.client_name ??
        (raw.client && typeof raw.client === "object"
          ? (raw.client as Record<string, unknown>).name
          : "") ??
        ""
    ),
    amount: Number(raw.total_ttc ?? raw.total ?? raw.amount ?? 0),
    currency: String(raw.currency ?? "EUR"),
    status,
    issueDate: String(raw.documentdate ?? raw.issue_date ?? raw.date ?? ""),
    dueDate: raw.due_date ? String(raw.due_date) : null,
    paidDate: raw.paid_date ? String(raw.paid_date) : null,
  };
}

// ─── Public API Functions ───────────────────────────────────────────────────

/**
 * Fetch invoices with optional filters.
 * Returns an empty array if Evoliz is not configured (graceful degradation).
 */
export async function getInvoices(
  filters?: EvolizInvoiceFilters
): Promise<EvolizInvoice[]> {
  const config = getConfigOrNull();
  if (!config) return [];

  const params = new URLSearchParams();
  if (filters?.reference) params.set("search", filters.reference);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.perPage) params.set("per_page", String(filters.perPage));

  const queryString = params.toString();
  const path = `/invoices${queryString ? `?${queryString}` : ""}`;

  const data = await evolizFetch<{
    data: RawEvolizInvoiceResponse[];
    meta?: { total: number };
  }>(path, config);

  return (data.data ?? []).map(normalizeInvoice);
}

/**
 * Fetch a single invoice by its Evoliz ID.
 * Returns null if Evoliz is not configured.
 */
export async function getInvoice(
  id: number
): Promise<EvolizInvoice | null> {
  const config = getConfigOrNull();
  if (!config) return null;

  const raw = await evolizFetch<RawEvolizInvoiceResponse>(
    `/invoices/${id}`,
    config
  );

  return normalizeInvoice(raw);
}

/**
 * Search for an invoice by PO number (external reference).
 * Normalizes the PO number before searching (trim, uppercase).
 * Returns the most recent matching invoice, or null if not found.
 */
export async function searchInvoiceByPO(
  poNumber: string
): Promise<EvolizInvoice | null> {
  const config = getConfigOrNull();
  if (!config) return null;

  // Normalize PO: trim whitespace, remove extra spaces
  const normalizedPO = poNumber.trim().replace(/\s+/g, " ");
  if (!normalizedPO) return null;

  const invoices = await getInvoices({ reference: normalizedPO });

  if (invoices.length === 0) return null;

  // Return the most recent invoice if multiple match
  return invoices.sort(
    (a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()
  )[0];
}

// ─── Health Check ───────────────────────────────────────────────────────────

/**
 * Check if the Evoliz API is reachable and credentials are valid.
 * Returns "not_configured" if env vars are missing (not an error — expected state).
 */
export async function checkHealth(): Promise<{
  status: "connected" | "not_configured" | "error";
  error?: string;
}> {
  const config = getConfigOrNull();
  if (!config) {
    return {
      status: "not_configured",
      error:
        "EVOLIZ_API_KEY and/or EVOLIZ_COMPANY_ID not set. Evoliz integration is disabled.",
    };
  }

  try {
    // Attempt a lightweight call to verify credentials
    await getInvoices({ page: 1, perPage: 1 });
    return { status: "connected" };
  } catch (e) {
    return {
      status: "error",
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}
