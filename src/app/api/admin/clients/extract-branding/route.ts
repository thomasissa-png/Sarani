import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { clients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getUserFromSession } from "@/lib/auth";
import {
  resolveSharePointUrl,
  getFileContent,
  graphFetch,
  type DriveItem,
} from "@/lib/integrations/sharepoint";

/**
 * POST /api/admin/clients/extract-branding
 *
 * Extracts brand identity elements (colors, fonts, tone) from client PDF brand
 * guidelines stored in SharePoint. Uses Claude multimodal (document vision) to
 * analyze the PDFs and extract structured branding data.
 *
 * Body: { clientId?: string }
 *   - If clientId provided: extract for that single client
 *   - If omitted: extract for all clients with a brandGuidelinesLink and no primaryColor
 *
 * Rendering strategy: SSR — admin-only mutation endpoint.
 */

// ─── Constants ──────────────────────────────────────────────────────────────

const MAX_PDF_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const CLAUDE_TIMEOUT_MS = 60_000;
const CLAUDE_MODEL = "claude-sonnet-4-6";
const MAX_CONCURRENT_EXTRACTIONS = 3;

// ─── Extraction prompt ──────────────────────────────────────────────────────

const EXTRACTION_SYSTEM_PROMPT = `You are a brand identity expert. Analyze this brand guidelines document and extract:

1. primaryColor: the main brand color as a hex code (e.g., "#DA5126"). Look for the dominant/primary color.
2. secondaryColors: other brand colors as comma-separated hex codes (e.g., "#0BABE8, #F1C217"). Max 5.
3. fontName: the primary font family name (e.g., "Helvetica Neue", "Montserrat"). Just the name, not the weight.
4. brandTone: 2-3 adjectives describing the brand's visual tone (e.g., "premium, minimalist, bold").

If a value is not clearly visible in the document, respond with null for that field.
Output ONLY valid JSON: { "primaryColor": "...", "secondaryColors": "...", "fontName": "...", "brandTone": "..." }`;

// ─── Types ──────────────────────────────────────────────────────────────────

interface BrandingExtraction {
  primaryColor: string | null;
  secondaryColors: string | null;
  fontName: string | null;
  brandTone: string | null;
}

interface ExtractionResult {
  client: string;
  clientId: string;
  status: "success" | "skipped" | "error";
  extracted?: BrandingExtraction;
  error?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "...") {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }
  return new Anthropic({ apiKey });
}

/**
 * Resolve a SharePoint sharing URL to a driveItem, then list children if it's a folder,
 * or return the item itself if it's a file (PDF).
 */
async function findPdfFilesFromLink(
  link: string,
): Promise<{ driveId: string; itemId: string; name: string; size: number }[]> {
  const item = await resolveSharePointUrl(link);
  if (!item?.id || !item.parentReference?.driveId) {
    throw new Error(`Could not resolve SharePoint URL: ${link.substring(0, 80)}...`);
  }

  const driveId = item.parentReference.driveId;

  // If the item itself is a PDF, return it directly
  if (item.file?.mimeType === "application/pdf") {
    return [{ driveId, itemId: item.id, name: item.name, size: item.size }];
  }

  // If it's a folder, list children and filter PDFs
  if (item.folder) {
    const children = await graphFetch<{ value: DriveItem[] }>(
      `/drives/${driveId}/items/${item.id}/children`,
    );

    const pdfs = children.value
      .filter(
        (child) =>
          child.file?.mimeType === "application/pdf" ||
          child.name.toLowerCase().endsWith(".pdf"),
      )
      .sort((a, b) => b.size - a.size) // largest first (usually the main guidelines)
      .slice(0, 3); // max 3 PDFs to avoid excessive API calls

    return pdfs.map((pdf) => ({
      driveId,
      itemId: pdf.id,
      name: pdf.name,
      size: pdf.size,
    }));
  }

  throw new Error(`SharePoint item is neither a PDF nor a folder: ${item.name}`);
}

/**
 * Download a PDF from SharePoint and convert to base64.
 * Skips files larger than MAX_PDF_SIZE_BYTES.
 */
async function downloadPdfAsBase64(
  driveId: string,
  itemId: string,
  fileSize: number,
): Promise<string | null> {
  if (fileSize > MAX_PDF_SIZE_BYTES) {
    console.warn(
      `[extract-branding] PDF too large (${(fileSize / 1024 / 1024).toFixed(1)}MB > 5MB limit), skipping`,
    );
    return null;
  }

  const arrayBuffer = await getFileContent(driveId, itemId);
  const buffer = Buffer.from(arrayBuffer);
  return buffer.toString("base64");
}

/**
 * Call Claude with a PDF document to extract branding data.
 */
async function extractBrandingFromPdf(
  client: Anthropic,
  pdfBase64: string,
  clientName: string,
): Promise<BrandingExtraction> {
  const response = await client.messages.create(
    {
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: pdfBase64,
              },
            },
            {
              type: "text",
              text: `Extract the brand identity elements from this brand guidelines document for "${clientName}". Output ONLY valid JSON.`,
            },
          ],
        },
      ],
    },
    { timeout: CLAUDE_TIMEOUT_MS },
  );

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text content in Claude response");
  }

  // Parse JSON from Claude's response (strip markdown fences if present)
  let jsonString = textBlock.text.trim();
  const fenceMatch = jsonString.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) {
    jsonString = fenceMatch[1].trim();
  }
  if (!jsonString.startsWith("{")) {
    const start = jsonString.indexOf("{");
    if (start >= 0) jsonString = jsonString.slice(start);
  }

  const parsed = JSON.parse(jsonString) as BrandingExtraction;

  // Validate hex color format
  if (parsed.primaryColor && !/^#[0-9A-Fa-f]{6}$/.test(parsed.primaryColor)) {
    parsed.primaryColor = null;
  }

  return parsed;
}

/**
 * Process a single client: find PDFs, download, extract branding, update DB.
 */
async function processClient(
  anthropicClient: Anthropic,
  clientRecord: { id: string; name: string; brandGuidelinesLink: string | null },
): Promise<ExtractionResult> {
  const { id, name, brandGuidelinesLink } = clientRecord;

  if (!brandGuidelinesLink) {
    return { client: name, clientId: id, status: "skipped", error: "No brandGuidelinesLink" };
  }

  try {
    // Step 1: Find PDF files in the SharePoint link
    const pdfs = await findPdfFilesFromLink(brandGuidelinesLink);
    if (pdfs.length === 0) {
      return {
        client: name,
        clientId: id,
        status: "skipped",
        error: "No PDF files found in the brand guidelines folder",
      };
    }

    // Step 2: Download the first usable PDF (within size limit)
    let pdfBase64: string | null = null;
    let usedPdfName = "";
    for (const pdf of pdfs) {
      pdfBase64 = await downloadPdfAsBase64(pdf.driveId, pdf.itemId, pdf.size);
      if (pdfBase64) {
        usedPdfName = pdf.name;
        break;
      }
    }

    if (!pdfBase64) {
      return {
        client: name,
        clientId: id,
        status: "skipped",
        error: `All PDFs exceed ${MAX_PDF_SIZE_BYTES / 1024 / 1024}MB limit`,
      };
    }

    console.log(`[extract-branding] Extracting branding for "${name}" from "${usedPdfName}"`);

    // Step 3: Call Claude to extract branding
    const extracted = await extractBrandingFromPdf(anthropicClient, pdfBase64, name);

    // Step 4: Update the DB (only non-null values)
    const updateFields: Record<string, string | null> = {};
    if (extracted.primaryColor) updateFields.primaryColor = extracted.primaryColor;
    if (extracted.secondaryColors) updateFields.secondaryColors = extracted.secondaryColors;
    if (extracted.fontName) updateFields.fontName = extracted.fontName;
    if (extracted.brandTone) updateFields.brandTone = extracted.brandTone;

    if (Object.keys(updateFields).length > 0) {
      await db.update(clients).set(updateFields).where(eq(clients.id, id));
    }

    return { client: name, clientId: id, status: "success", extracted };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[extract-branding] Error for "${name}":`, message);
    return { client: name, clientId: id, status: "error", error: message };
  }
}

// ─── Concurrency limiter ────────────────────────────────────────────────────

async function processWithConcurrency<T, R>(
  items: T[],
  maxConcurrent: number,
  processor: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  const executing = new Set<Promise<void>>();

  for (const item of items) {
    const promise = processor(item).then((result) => {
      results.push(result);
    });
    const wrapped = promise.then(() => {
      executing.delete(wrapped);
    });
    executing.add(wrapped);

    if (executing.size >= maxConcurrent) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
}

// ─── Route handler ──────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Auth check
  const session = await getUserFromSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse body
  let clientId: string | undefined;
  try {
    const body = (await request.json()) as { clientId?: string };
    clientId = body.clientId;
  } catch {
    // Empty body is fine — means process all clients
  }

  // Build client list
  let clientRecords: { id: string; name: string; brandGuidelinesLink: string | null }[];

  if (clientId) {
    // Single client mode
    const [record] = await db
      .select({
        id: clients.id,
        name: clients.name,
        brandGuidelinesLink: clients.brandGuidelinesLink,
      })
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1);

    if (!record) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }
    clientRecords = [record];
  } else {
    // All clients with brandGuidelinesLink and no primaryColor yet
    const allClients = await db
      .select({
        id: clients.id,
        name: clients.name,
        brandGuidelinesLink: clients.brandGuidelinesLink,
        primaryColor: clients.primaryColor,
      })
      .from(clients);

    clientRecords = allClients.filter(
      (c) => c.brandGuidelinesLink,
    );
  }

  if (clientRecords.length === 0) {
    return NextResponse.json({
      message: "No clients to process (all already have branding data or no guidelines link)",
      results: [],
    });
  }

  // Initialize Anthropic client
  const anthropicClient = getAnthropicClient();

  // Process clients with concurrency limit
  const results = await processWithConcurrency(
    clientRecords,
    MAX_CONCURRENT_EXTRACTIONS,
    (record) => processClient(anthropicClient, record),
  );

  const summary = {
    total: results.length,
    success: results.filter((r) => r.status === "success").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    errors: results.filter((r) => r.status === "error").length,
  };

  return NextResponse.json({ summary, results });
}
