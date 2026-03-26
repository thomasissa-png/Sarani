// ─── Evoliz API Client ──────────────────────────────────────────────────────
// Server-side only. REST API with OAuth2 authentication.
// Auth flow: POST /api/login with public_key + secret_key → Bearer token.
// Graceful degradation: works even when credentials are not configured.

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
      "Evoliz integration is not configured. Set EVOLIZ_PUBLIC_KEY and EVOLIZ_SECRET_KEY environment variables."
    );
    this.name = "EvolizNotConfiguredError";
  }
}

// ─── Configuration ──────────────────────────────────────────────────────────

const EVOLIZ_BASE_URL = "https://www.evoliz.io/api/v1";
const EVOLIZ_LOGIN_URL = "https://www.evoliz.io/api/login";
const RETRY_DELAY_MS = 1000;

interface EvolizCredentials {
  publicKey: string;
  secretKey: string;
}

// ─── Token Cache ────────────────────────────────────────────────────────────

interface CachedToken {
  accessToken: string;
  expiresAt: number; // timestamp ms
}

let tokenCache: CachedToken | null = null;

/**
 * Check if Evoliz credentials are configured.
 * Supports both new env vars (EVOLIZ_PUBLIC_KEY/EVOLIZ_SECRET_KEY)
 * and legacy (EVOLIZ_API_KEY used as public key).
 */
function getCredentialsOrNull(): EvolizCredentials | null {
  const publicKey =
    process.env.EVOLIZ_PUBLIC_KEY || process.env.EVOLIZ_API_KEY;
  const secretKey = process.env.EVOLIZ_SECRET_KEY;

  if (!publicKey || !secretKey) return null;

  return { publicKey, secretKey };
}

/**
 * Check whether the Evoliz integration is configured at all.
 */
export function isConfigured(): boolean {
  return getCredentialsOrNull() !== null;
}

/**
 * Authenticate with Evoliz and get an access token.
 * Caches the token until 60 seconds before expiry.
 */
async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (tokenCache && Date.now() < tokenCache.expiresAt - 60_000) {
    return tokenCache.accessToken;
  }

  const credentials = getCredentialsOrNull();
  if (!credentials) {
    throw new EvolizNotConfiguredError();
  }

  const response = await fetch(EVOLIZ_LOGIN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      public_key: credentials.publicKey,
      secret_key: credentials.secretKey,
    }),
  });

  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = await response.text().catch(() => null);
    }
    throw new EvolizApiError(
      `Evoliz login failed: ${response.status} ${response.statusText}`,
      response.status,
      body
    );
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_at: string;
  };

  tokenCache = {
    accessToken: data.access_token,
    expiresAt: new Date(data.expires_at).getTime(),
  };

  return tokenCache.accessToken;
}

// ─── Internal fetch with retry ──────────────────────────────────────────────

async function evolizFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  // No company ID in path — Evoliz v1 routes directly to the authenticated company
  const url = `${EVOLIZ_BASE_URL}${path}`;

  const fetchWithRetry = async (attempt: number): Promise<T> => {
    const token = await getAccessToken();

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string> | undefined),
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Token expired — clear cache and retry once
    if (response.status === 401 && attempt === 0) {
      tokenCache = null;
      return fetchWithRetry(1);
    }

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
 * Partial type for the raw Evoliz API invoice response.
 * Fields are snake_case as returned by the API.
 */
interface RawEvolizInvoiceResponse {
  invoiceid?: number;
  id?: number;
  document_number?: string;
  invoice_number?: string;
  object?: string;
  external_document_number?: string;
  external_reference?: string;
  reference?: string;
  client_name?: string;
  client?: { name?: string; clientid?: number } | null;
  total?: {
    vat_exclude?: number;
    vat_include?: number;
    net_to_pay?: number;
  };
  currency_total?: {
    vat_exclude?: number;
    vat_include?: number;
    net_to_pay?: number;
  };
  default_currency?: { code?: string };
  document_currency?: { code?: string };
  total_ttc?: number;
  amount?: number;
  currency?: string;
  status?: string;
  status_code?: number;
  payment_status?: string;
  status_dates?: {
    create?: string;
    sent?: string;
    paid?: string;
  };
  documentdate?: string;
  issue_date?: string;
  date?: string;
  duedate?: string | null;
  due_date?: string | null;
  paid_date?: string | null;
}

// ─── Response Normalization ─────────────────────────────────────────────────

/**
 * Map Evoliz status_code to our internal status.
 * status_code values: 1=draft, 2=created, 3=?, 4=sent, 5=inpayment, 6=paid
 */
function mapStatusCode(code: number | undefined): EvolizPaymentStatus {
  switch (code) {
    case 1:
      return "draft";
    case 6:
      return "paid";
    case 4:
    case 5:
      return "sent";
    default:
      return "unpaid";
  }
}

/**
 * Normalize a raw Evoliz API invoice response to our internal type.
 */
function normalizeInvoice(raw: RawEvolizInvoiceResponse): EvolizInvoice {
  // Prefer status_code (numeric, reliable) over status string
  const status = raw.status_code
    ? mapStatusCode(raw.status_code)
    : (() => {
        const rawStatus = String(
          raw.status ?? raw.payment_status ?? "draft"
        ).toLowerCase();
        if (rawStatus === "paid" || rawStatus === "complete") return "paid" as const;
        if (rawStatus === "sent" || rawStatus === "pending") return "sent" as const;
        if (rawStatus === "overdue" || rawStatus === "late") return "overdue" as const;
        if (rawStatus === "draft") return "draft" as const;
        return "unpaid" as const;
      })();

  // Check if payment is overdue based on due date
  const finalStatus =
    status === "sent" && raw.duedate
      ? new Date(raw.duedate) < new Date()
        ? "overdue"
        : status
      : status;

  // Amount: prefer currency_total (client currency) then total then legacy fields
  const amount =
    raw.currency_total?.net_to_pay ??
    raw.currency_total?.vat_include ??
    raw.total?.net_to_pay ??
    raw.total?.vat_include ??
    raw.total_ttc ??
    raw.amount ??
    0;

  // Currency: prefer document_currency (client-facing) then default_currency
  const currency =
    raw.document_currency?.code ??
    raw.default_currency?.code ??
    raw.currency ??
    "EUR";

  return {
    id: Number(raw.invoiceid ?? raw.id ?? 0),
    invoiceNumber: String(raw.document_number ?? raw.invoice_number ?? ""),
    reference: raw.object
      ? String(raw.object)
      : raw.external_document_number
        ? String(raw.external_document_number)
        : raw.external_reference
          ? String(raw.external_reference)
          : raw.reference
            ? String(raw.reference)
            : null,
    clientName: String(
      raw.client_name ??
        (raw.client && typeof raw.client === "object"
          ? raw.client.name
          : "") ??
        ""
    ),
    amount: Number(amount),
    currency: String(currency),
    status: finalStatus,
    issueDate: String(raw.documentdate ?? raw.issue_date ?? raw.date ?? ""),
    dueDate: raw.duedate
      ? String(raw.duedate)
      : raw.due_date
        ? String(raw.due_date)
        : null,
    paidDate: raw.status_dates?.paid
      ? String(raw.status_dates.paid)
      : raw.paid_date
        ? String(raw.paid_date)
        : null,
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
  if (!getCredentialsOrNull()) return [];

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
  }>(path);

  return (data.data ?? []).map(normalizeInvoice);
}

/**
 * Fetch a single invoice by its Evoliz ID.
 * Returns null if Evoliz is not configured.
 */
export async function getInvoice(
  id: number
): Promise<EvolizInvoice | null> {
  if (!getCredentialsOrNull()) return null;

  const raw = await evolizFetch<RawEvolizInvoiceResponse>(
    `/invoices/${id}`
  );

  return normalizeInvoice(raw);
}

/**
 * Search for an invoice by PO number (external reference / object field).
 * Normalizes the PO number before searching (trim, uppercase).
 * Returns the most recent matching invoice, or null if not found.
 */
export async function searchInvoiceByPO(
  poNumber: string
): Promise<EvolizInvoice | null> {
  if (!getCredentialsOrNull()) return null;

  // Normalize PO: trim whitespace, remove extra spaces
  const normalizedPO = poNumber.trim().replace(/\s+/g, " ");
  if (!normalizedPO) return null;

  const invoices = await getInvoices({ reference: normalizedPO });

  if (invoices.length === 0) return null;

  // Return the most recent invoice if multiple match
  return invoices.sort(
    (a, b) =>
      new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()
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
  const credentials = getCredentialsOrNull();
  if (!credentials) {
    return {
      status: "not_configured",
      error:
        "EVOLIZ_PUBLIC_KEY and EVOLIZ_SECRET_KEY not set. Evoliz integration is disabled.",
    };
  }

  try {
    // Attempt to get a token — validates credentials
    await getAccessToken();
    return { status: "connected" };
  } catch (e) {
    return {
      status: "error",
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}
