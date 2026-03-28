// ─── Microsoft Graph API Client (SharePoint / OneDrive) ─────────────────────
// Server-side only. Uses OAuth2 client_credentials flow.
// No npm dependencies — uses native fetch.

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DriveItem {
  id: string;
  name: string;
  size: number;
  lastModifiedDateTime: string;
  webUrl: string;
  /** Pre-authenticated temporary download URL (valid ~1 hour). Returned by Graph API for file items. */
  "@microsoft.graph.downloadUrl"?: string;
  folder?: { childCount: number };
  file?: { mimeType: string };
  parentReference?: {
    driveId: string;
    id: string;
    path: string;
  };
}

export interface ExcelRange {
  address: string;
  values: (string | number | boolean | null)[][];
}

export interface ExcelRow {
  rowIndex: number;
  values: (string | number | boolean | null)[];
}

// ─── Error types ────────────────────────────────────────────────────────────

export class SharePointApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly response: unknown
  ) {
    super(message);
    this.name = "SharePointApiError";
  }
}

// ─── Token Cache ────────────────────────────────────────────────────────────

interface CachedToken {
  accessToken: string;
  expiresAt: number; // timestamp ms
}

let tokenCache: CachedToken | null = null;

// ─── Configuration ──────────────────────────────────────────────────────────

function getConfig(): {
  tenantId: string;
  clientId: string;
  clientSecret: string;
} {
  const tenantId = process.env.MICROSOFT_TENANT_ID;
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

  if (!tenantId)
    throw new Error("MICROSOFT_TENANT_ID environment variable is not set");
  if (!clientId)
    throw new Error("MICROSOFT_CLIENT_ID environment variable is not set");
  if (!clientSecret)
    throw new Error("MICROSOFT_CLIENT_SECRET environment variable is not set");

  return { tenantId, clientId, clientSecret };
}

const GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0";
const RETRY_DELAY_MS = 1500;

// ─── Authentication ─────────────────────────────────────────────────────────

/**
 * Get an access token using OAuth2 client_credentials flow.
 * Tokens are cached in memory and refreshed proactively 5 minutes before expiry
 * (Graph tokens last ~60 minutes — see R-03 in specs).
 */
export async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 5-minute buffer)
  const BUFFER_MS = 5 * 60 * 1000;
  if (tokenCache && tokenCache.expiresAt - BUFFER_MS > Date.now()) {
    return tokenCache.accessToken;
  }

  const { tenantId, clientId, clientSecret } = getConfig();
  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    let errorBody: unknown;
    try {
      errorBody = await response.json();
    } catch {
      errorBody = await response.text().catch(() => null);
    }
    throw new SharePointApiError(
      `Failed to obtain access token: ${response.status} ${response.statusText}`,
      response.status,
      errorBody
    );
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };

  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return tokenCache.accessToken;
}

// ─── Internal fetch with retry ──────────────────────────────────────────────

export async function graphFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAccessToken();
  const url = path.startsWith("http") ? path : `${GRAPH_BASE_URL}${path}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };

  const fetchWithRetry = async (attempt: number): Promise<T> => {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Token expired mid-request — refresh and retry once
    if (response.status === 401 && attempt === 0) {
      tokenCache = null;
      const newToken = await getAccessToken();
      headers.Authorization = `Bearer ${newToken}`;
      return fetchWithRetry(1);
    }

    // Throttled — retry with backoff
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
      throw new SharePointApiError(
        `Graph API error: ${response.status} ${response.statusText} on ${path}`,
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

// ─── Drive Item Operations ──────────────────────────────────────────────────

/**
 * List children of a drive item at a given path.
 * Use for browsing folders in either the Trackers drive or the Assets drive.
 */
export async function listDriveItems(
  driveId: string,
  path: string
): Promise<DriveItem[]> {
  // Encode the path for URL — Graph API uses `:` path syntax
  const encodedPath = encodeURIComponent(path).replace(/%2F/g, "/");
  const data = await graphFetch<{ value: DriveItem[] }>(
    `/drives/${driveId}/root:${encodedPath}:/children`
  );
  return data.value;
}

/**
 * Get the content (raw bytes) of a file in a drive.
 * Returns the response as an ArrayBuffer.
 * B-04/E-02: Uses the same retry logic as graphFetch (401/429/5xx).
 */
export async function getFileContent(
  driveId: string,
  itemId: string
): Promise<ArrayBuffer> {
  const path = `/drives/${driveId}/items/${itemId}/content`;
  const url = `${GRAPH_BASE_URL}${path}`;

  const fetchWithRetry = async (attempt: number): Promise<ArrayBuffer> => {
    const token = await getAccessToken();
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      redirect: "follow",
    });

    // Token expired — refresh and retry once
    if (response.status === 401 && attempt === 0) {
      tokenCache = null;
      const newToken = await getAccessToken();
      // Retry immediately with new token
      const retryResponse = await fetch(url, {
        headers: { Authorization: `Bearer ${newToken}` },
        redirect: "follow",
      });
      if (!retryResponse.ok) {
        throw new SharePointApiError(
          `Failed to download file after token refresh: ${retryResponse.status}`,
          retryResponse.status,
          null
        );
      }
      return retryResponse.arrayBuffer();
    }

    // Throttled — retry with backoff
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
      throw new SharePointApiError(
        `Failed to download file: ${response.status}`,
        response.status,
        null
      );
    }

    return response.arrayBuffer();
  };

  return fetchWithRetry(0);
}

/**
 * Upload a file to a specific path in a drive.
 * For files up to 4MB — uses simple upload.
 */
export async function uploadFile(
  driveId: string,
  path: string,
  content: ArrayBuffer | Uint8Array | string
): Promise<DriveItem> {
  const token = await getAccessToken();
  const encodedPath = encodeURIComponent(path).replace(/%2F/g, "/");
  const url = `${GRAPH_BASE_URL}/drives/${driveId}/root:${encodedPath}:/content`;

  let bodyBuffer: ArrayBuffer;
  if (typeof content === "string") {
    bodyBuffer = new TextEncoder().encode(content).buffer as ArrayBuffer;
  } else if (content instanceof ArrayBuffer) {
    bodyBuffer = content;
  } else {
    bodyBuffer = content.buffer.slice(
      content.byteOffset,
      content.byteOffset + content.byteLength
    ) as ArrayBuffer;
  }
  const body = new Blob([bodyBuffer]);

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/octet-stream",
    },
    body,
  });

  if (!response.ok) {
    let errorBody: unknown;
    try {
      errorBody = await response.json();
    } catch {
      errorBody = null;
    }
    throw new SharePointApiError(
      `Failed to upload file: ${response.status}`,
      response.status,
      errorBody
    );
  }

  return response.json() as Promise<DriveItem>;
}

/**
 * Create a folder at a given parent path.
 */
export async function createFolder(
  driveId: string,
  parentPath: string,
  name: string
): Promise<DriveItem> {
  const encodedPath = encodeURIComponent(parentPath).replace(/%2F/g, "/");
  return graphFetch<DriveItem>(
    `/drives/${driveId}/root:${encodedPath}:/children`,
    {
      method: "POST",
      body: JSON.stringify({
        name,
        folder: {},
        "@microsoft.graph.conflictBehavior": "fail",
      }),
    }
  );
}

// ─── Worksheet Discovery ────────────────────────────────────────────────────

interface WorksheetInfo {
  id: string;
  name: string;
  position: number;
  visibility: string;
}

/**
 * List all worksheets in an Excel workbook.
 * Returns them sorted by position (first sheet first).
 */
export async function listWorksheets(
  driveId: string,
  itemId: string
): Promise<WorksheetInfo[]> {
  const data = await graphFetch<{
    value: WorksheetInfo[];
  }>(`/drives/${driveId}/items/${itemId}/workbook/worksheets`);
  return data.value.sort((a, b) => a.position - b.position);
}

/**
 * Resolve the best worksheet name for reading/writing.
 * Uses the Graph API worksheets endpoint to list actual sheets,
 * then picks the first one that matches a candidate list,
 * or falls back to the very first sheet.
 */
export async function resolveSheetName(
  driveId: string,
  itemId: string,
  candidates: readonly string[]
): Promise<string> {
  const sheets = await listWorksheets(driveId, itemId);
  if (sheets.length === 0) {
    throw new SharePointApiError(
      "No worksheets found in workbook",
      404,
      null
    );
  }

  // Try to match a candidate
  const lowerCandidates = candidates.map((c) => c.toLowerCase());
  for (const sheet of sheets) {
    if (lowerCandidates.includes(sheet.name.toLowerCase())) {
      return sheet.name;
    }
  }

  // Fallback: use the first sheet
  return sheets[0].name;
}

// ─── Excel Operations ───────────────────────────────────────────────────────

/**
 * Read a range from an Excel workbook stored in SharePoint.
 * Returns the computed values (not formulas).
 *
 * @param driveId - The drive containing the Excel file
 * @param itemId - The item ID of the Excel file
 * @param sheetName - The worksheet name (e.g. "Sheet1")
 * @param range - The cell range (e.g. "A1:Z200")
 */
export async function readExcelRange(
  driveId: string,
  itemId: string,
  sheetName: string,
  range: string
): Promise<ExcelRange> {
  const encodedSheet = encodeURIComponent(sheetName);
  const data = await graphFetch<{
    address: string;
    values: (string | number | boolean | null)[][];
  }>(
    `/drives/${driveId}/items/${itemId}/workbook/worksheets/${encodedSheet}/range(address='${range}')`
  );
  return {
    address: data.address,
    values: data.values,
  };
}

/**
 * Read the entire used range of a worksheet.
 * Useful when you don't know the exact range of data.
 */
export async function readExcelUsedRange(
  driveId: string,
  itemId: string,
  sheetName: string
): Promise<ExcelRange> {
  const encodedSheet = encodeURIComponent(sheetName);
  const data = await graphFetch<{
    address: string;
    values: (string | number | boolean | null)[][];
  }>(
    `/drives/${driveId}/items/${itemId}/workbook/worksheets/${encodedSheet}/usedRange`
  );
  return {
    address: data.address,
    values: data.values,
  };
}

/**
 * Write rows to an Excel worksheet starting at a specific cell.
 * Overwrites existing data in the target range.
 *
 * @param driveId - The drive containing the Excel file
 * @param itemId - The item ID of the Excel file
 * @param sheetName - The worksheet name
 * @param range - The target range (e.g. "A5:Z5" for a single row, or "A5:Z10" for multiple)
 * @param data - 2D array of values to write
 */
export async function writeExcelRows(
  driveId: string,
  itemId: string,
  sheetName: string,
  range: string,
  data: (string | number | boolean | null)[][]
): Promise<ExcelRange> {
  const encodedSheet = encodeURIComponent(sheetName);
  return graphFetch<ExcelRange>(
    `/drives/${driveId}/items/${itemId}/workbook/worksheets/${encodedSheet}/range(address='${range}')`,
    {
      method: "PATCH",
      body: JSON.stringify({ values: data }),
    }
  );
}

/**
 * Find a drive item by its path within a drive.
 * Useful for resolving a file path to an item ID (needed for Excel operations).
 */
export async function getDriveItemByPath(
  driveId: string,
  path: string
): Promise<DriveItem> {
  const encodedPath = encodeURIComponent(path).replace(/%2F/g, "/");
  return graphFetch<DriveItem>(`/drives/${driveId}/root:${encodedPath}`);
}

// ─── Sharing Links ─────────────────────────────────────────────────────────

/**
 * Resolve a SharePoint URL to a driveItem using the shares API.
 * Encodes the URL as a sharing token: "u!" + base64url(url).
 */
export async function resolveSharePointUrl(
  url: string
): Promise<DriveItem | null> {
  try {
    // Encode URL as sharing token per Microsoft docs
    const base64 = Buffer.from(url, "utf-8").toString("base64");
    const shareToken = "u!" + base64.replace(/=+$/, "").replace(/\//g, "_").replace(/\+/g, "-");
    return await graphFetch<DriveItem>(`/shares/${shareToken}/driveItem`);
  } catch {
    return null;
  }
}

/**
 * Create an anonymous "Anyone" sharing link for a drive item.
 * This generates a link that works without sign-in (like the SharePoint "Anyone" option).
 * If a sharing link already exists, the Graph API returns the existing one.
 */
export async function createAnonymousSharingLink(
  driveId: string,
  itemId: string
): Promise<string | null> {
  try {
    const result = await graphFetch<{ link: { webUrl: string } }>(
      `/drives/${driveId}/items/${itemId}/createLink`,
      {
        method: "POST",
        body: JSON.stringify({
          type: "view",
          scope: "anonymous",
        }),
      }
    );
    return result.link?.webUrl ?? null;
  } catch {
    return null;
  }
}

/**
 * Convert a direct SharePoint URL to an anonymous sharing link.
 * Combines resolveSharePointUrl + createAnonymousSharingLink.
 * Returns the original URL as fallback if conversion fails.
 */
export async function getPublicSharingLink(url: string): Promise<string> {
  if (!url) return url;

  // If it's already a sharing link (contains /:f:/ or /s/ or guestaccess), return as-is
  if (url.includes("/:f:/") || url.includes("/:r:/") || url.includes("/s/") || url.includes("guestaccess")) {
    return url;
  }

  const item = await resolveSharePointUrl(url);
  if (!item?.id || !item?.parentReference?.driveId) return url;

  const sharingLink = await createAnonymousSharingLink(
    item.parentReference.driveId,
    item.id
  );

  return sharingLink ?? url;
}

// ─── Health Check ───────────────────────────────────────────────────────────

/**
 * Check if the Microsoft Graph API is reachable and credentials are valid.
 * Returns "not_configured" if env vars are missing (not an error -- expected state).
 */
export async function checkHealth(): Promise<{
  status: "connected" | "not_configured" | "error";
  error?: string;
}> {
  // Check if env vars are present before attempting connection
  const tenantId = process.env.MICROSOFT_TENANT_ID;
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    return {
      status: "not_configured",
      error: "Microsoft Graph credentials not set. SharePoint integration is disabled.",
    };
  }

  try {
    await getAccessToken();
    return { status: "connected" };
  } catch (e) {
    return {
      status: "error",
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}
