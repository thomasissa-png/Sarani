// ─── LinkedIn Visual Generator — Hybrid OpenAI + Sharp ──────────────────────
// Generates a 1200x1200 PNG for LinkedIn case study posts.
// 1. OpenAI gpt-image-1 generates an artistic background
// 2. Satori renders the text/logo overlay with transparent background
// 3. Sharp composites everything together
//
// Fallback: if OPENAI_API_KEY is missing or generation fails, falls back
// to the original Satori-only generator.

import OpenAI from "openai";
import sharp from "sharp";
import { ImageResponse } from "next/og";
import type { LinkedInVisualParams } from "./linkedin-visual";

// Re-export for convenience
export type { LinkedInVisualParams };

// ─── Constants ───────────────────────────────────────────────────────────────

const VISUAL_SIZE = { width: 1200, height: 1200 };
const FLAME = "#DA5126";

// ─── Font loader (shared with linkedin-visual.tsx) ──────────────────────────

import { readFile } from "node:fs/promises";
import { join } from "node:path";

let fontBoldCache: ArrayBuffer | null = null;
let fontRegularCache: ArrayBuffer | null = null;

async function loadFont(filename: string): Promise<ArrayBuffer> {
  const candidates = [
    join(process.cwd(), "public", "fonts", filename),
    join(process.cwd(), ".next", "standalone", "public", "fonts", filename),
    join(process.cwd(), "fonts", filename),
    join("/home/runner", process.env.REPL_SLUG || "", "public", "fonts", filename),
  ];
  for (const fontPath of candidates) {
    try {
      const buffer = await readFile(fontPath);
      return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    } catch {
      // Try next path
    }
  }
  throw new Error(`Font ${filename} not found in any of: ${candidates.join(", ")}`);
}

async function loadPoppinsBold(): Promise<ArrayBuffer> {
  if (fontBoldCache) return fontBoldCache;
  fontBoldCache = await loadFont("Poppins-Bold.ttf");
  return fontBoldCache;
}

async function loadPoppinsRegular(): Promise<ArrayBuffer> {
  if (fontRegularCache) return fontRegularCache;
  fontRegularCache = await loadFont("Poppins-Regular.ttf");
  return fontRegularCache;
}

// ─── Image fetcher (same logic as linkedin-visual.tsx) ──────────────────────

import { graphFetch } from "@/lib/integrations/sharepoint";

async function fetchImageAsDataUri(url: string): Promise<string | null> {
  if (url.startsWith("data:")) return url;

  if (url.startsWith("/api/project-assets/")) {
    try {
      const urlObj = new URL(url, "http://localhost");
      const pathParts = urlObj.pathname.split("/");
      const itemId = pathParts[pathParts.length - 1];
      const driveId = urlObj.searchParams.get("driveId");
      if (!itemId || !driveId) return null;

      const item = await graphFetch<{
        "@microsoft.graph.downloadUrl"?: string;
      }>(`/drives/${driveId}/items/${itemId}`);

      const downloadUrl = item["@microsoft.graph.downloadUrl"];
      if (!downloadUrl) return null;

      const res = await fetch(downloadUrl, { signal: AbortSignal.timeout(15_000) });
      if (!res.ok) return null;
      const arrayBuf = await res.arrayBuffer();
      const base64 = Buffer.from(arrayBuf).toString("base64");
      const contentType = res.headers.get("content-type") ?? "image/png";
      return `data:${contentType};base64,${base64}`;
    } catch {
      return null;
    }
  }

  if (url.startsWith("/")) {
    const candidates = [
      join(process.cwd(), "public", url),
      join(process.cwd(), ".next", "standalone", "public", url),
      join("/home/runner", process.env.REPL_SLUG || "", "public", url),
    ];
    for (const filePath of candidates) {
      try {
        const buffer = await readFile(filePath);
        const base64 = buffer.toString("base64");
        const ext = url.split(".").pop()?.toLowerCase() ?? "png";
        const mime = ext === "svg" ? "image/svg+xml" : ext === "jpg" ? "image/jpeg" : `image/${ext}`;
        return `data:${mime};base64,${base64}`;
      } catch {
        // Try next path
      }
    }
    return null;
  }

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    const arrayBuf = await res.arrayBuffer();
    if (arrayBuf.byteLength > 2 * 1024 * 1024) return null;
    const base64 = Buffer.from(arrayBuf).toString("base64");
    const contentType = res.headers.get("content-type") ?? "image/png";
    if (contentType.includes("svg") && arrayBuf.byteLength > 500_000) return null;
    return `data:${contentType};base64,${base64}`;
  } catch {
    return null;
  }
}

// ─── Fetch image as Buffer (for sharp compositing) ──────────────────────────

async function fetchImageAsBuffer(url: string): Promise<Buffer | null> {
  const dataUri = await fetchImageAsDataUri(url);
  if (!dataUri) return null;
  const match = dataUri.match(/^data:[^;]+;base64,(.+)$/);
  if (!match) return null;
  return Buffer.from(match[1], "base64");
}

// ─── OpenAI Background Generator ───────────────────────────────────────────

export interface BackgroundContext {
  clientName: string;
  projectType?: string | null;
  industry?: string | null;
  brandTone?: string | null;
  primaryColor?: string | null;
}

/**
 * Generates an artistic 1200x1200 background with OpenAI gpt-image-1.
 * Returns a PNG Buffer, or null if generation fails.
 */
export async function generateAIBackground(
  ctx: BackgroundContext
): Promise<Buffer | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("[linkedin-visual-openai] No OPENAI_API_KEY — skipping AI background");
    return null;
  }

  const openai = new OpenAI({ apiKey });

  // Build a prompt that creates an artistic, abstract background
  const moodDescriptors = ctx.brandTone
    ? ctx.brandTone.split(",").map((s) => s.trim()).join(", ")
    : "premium, sophisticated, modern";

  const colorHint = ctx.primaryColor
    ? `Use ${ctx.primaryColor} as a subtle accent color in the composition.`
    : "Use warm dark tones with subtle orange (#DA5126) accents.";

  const industryHint = ctx.industry
    ? `The project is in the ${ctx.industry} industry.`
    : "";

  const prompt = `Create an abstract, artistic background for a professional LinkedIn post.
The image should be dark and moody (predominantly dark grays and blacks) with subtle artistic elements.
${colorHint}
${industryHint}
Style: ${moodDescriptors}. Premium creative agency portfolio piece. High-end design studio aesthetic.
The image must work as a BACKGROUND — leave space for white text overlay in the upper portion and photos in the lower portion.
The top 40% should be darker/simpler (for text readability). The bottom 60% can have more visual texture.
Abstract geometric shapes, subtle gradients, light grain texture, soft bokeh or lens flare accents.
NO text, NO logos, NO people, NO objects — purely abstract atmospheric background.
Square format 1200x1200 pixels.`;

  try {
    console.log("[linkedin-visual-openai] Generating AI background for", ctx.clientName);
    const startTime = Date.now();

    const response = await openai.images.generate({
      model: "gpt-image-1",
      prompt,
      n: 1,
      size: "1024x1024", // gpt-image-1 supported size, we'll upscale with sharp
      quality: "medium",
    });

    const elapsed = Date.now() - startTime;
    console.log(`[linkedin-visual-openai] AI background generated in ${elapsed}ms`);

    const imageData = response.data?.[0];
    if (!imageData) return null;

    // gpt-image-1 returns base64 by default
    let imageBuffer: Buffer;
    if (imageData.b64_json) {
      imageBuffer = Buffer.from(imageData.b64_json, "base64");
    } else if (imageData.url) {
      const res = await fetch(imageData.url, { signal: AbortSignal.timeout(30_000) });
      if (!res.ok) return null;
      imageBuffer = Buffer.from(await res.arrayBuffer());
    } else {
      return null;
    }

    // Resize to 1200x1200 (gpt-image-1 outputs 1024x1024)
    const resized = await sharp(imageBuffer)
      .resize(VISUAL_SIZE.width, VISUAL_SIZE.height, { fit: "cover" })
      .png()
      .toBuffer();

    return resized;
  } catch (err) {
    console.error("[linkedin-visual-openai] AI background generation failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

// ─── Text Overlay Renderer (Satori → transparent PNG) ───────────────────────

function renderTitle(title: string, accentWord: string): React.ReactNode[] {
  const segments: React.ReactNode[] = [];
  const lowerTitle = title.toLowerCase();
  const lowerAccent = accentWord.toLowerCase();
  const idx = lowerTitle.indexOf(lowerAccent);

  if (idx === -1) {
    segments.push(<span key="full" style={{ color: "#ffffff" }}>{title}</span>);
  } else {
    const before = title.slice(0, idx);
    const match = title.slice(idx, idx + accentWord.length);
    const after = title.slice(idx + accentWord.length);
    if (before) segments.push(<span key="before" style={{ color: "#ffffff" }}>{before}</span>);
    segments.push(<span key="accent" style={{ color: FLAME }}>{match}</span>);
    if (after) segments.push(<span key="after" style={{ color: "#ffffff" }}>{after}</span>);
  }
  return segments;
}

/**
 * Renders the text + logos overlay as a transparent PNG using Satori.
 */
async function renderTextOverlay(params: {
  displayTitle: string;
  accentWord: string;
  titleFontSize: number;
  saraniLogoDataUri: string | null;
  clientLogoDataUri: string | null;
  hasImages: boolean;
}): Promise<Buffer> {
  const { displayTitle, accentWord, titleFontSize, saraniLogoDataUri, clientLogoDataUri, hasImages } = params;

  const [poppinsBold, poppinsRegular] = await Promise.all([
    loadPoppinsBold(),
    loadPoppinsRegular(),
  ]);

  // Satori with transparent background — only renders text + logos
  const imageResponse = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "flex-start",
          padding: "50px",
          fontFamily: "Poppins",
        }}
      >
        {/* ─── Pill: Sarani logo + client logo ──────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.25)",
            backgroundColor: "rgba(0,0,0,0.5)",
            padding: "14px 32px",
            marginBottom: 32,
          }}
        >
          {saraniLogoDataUri ? (
            <img
              src={saraniLogoDataUri}
              width={115}
              height={38}
              style={{ objectFit: "contain" }}
            />
          ) : (
            <span style={{ color: "#ffffff", fontSize: 20, fontWeight: 700, letterSpacing: "0.05em" }}>
              sarani
            </span>
          )}
          {clientLogoDataUri && (
            <>
              <div
                style={{
                  width: 1,
                  height: 28,
                  backgroundColor: "rgba(255,255,255,0.35)",
                  marginLeft: 20,
                  marginRight: 20,
                }}
              />
              <img
                src={clientLogoDataUri}
                width={90}
                height={32}
                style={{ objectFit: "contain" }}
              />
            </>
          )}
        </div>

        {/* ─── Title ── */}
        <div
          style={{
            display: "flex",
            fontSize: titleFontSize,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            textTransform: "uppercase" as const,
            maxWidth: 1000,
            textShadow: "0 2px 20px rgba(0,0,0,0.8)",
          }}
        >
          {renderTitle(displayTitle, accentWord)}
        </div>

        {/* ─── Subtle "sarani" watermark bottom-right ── */}
        {!hasImages && (
          <div
            style={{
              display: "flex",
              position: "absolute",
              bottom: 50,
              right: 50,
              fontSize: 16,
              fontWeight: 400,
              color: "rgba(255,255,255,0.3)",
              letterSpacing: "0.1em",
            }}
          >
            sarani.studio
          </div>
        )}
      </div>
    ),
    {
      ...VISUAL_SIZE,
      fonts: [
        { name: "Poppins", data: poppinsBold, weight: 700, style: "normal" as const },
        { name: "Poppins", data: poppinsRegular, weight: 400, style: "normal" as const },
      ],
    }
  );

  const arrayBuffer = await imageResponse.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// ─── Photo Grid Renderer ────────────────────────────────────────────────────

const PHOTO_RADIUS = 20;
const PHOTO_BORDER = 3; // Subtle white border for photos on dark bg

/**
 * Composites 1-3 project photos into the bottom portion of the image using sharp.
 * Returns a transparent PNG with the photo grid positioned.
 */
async function renderPhotoGrid(
  imageBuffers: Buffer[],
  gridTop: number
): Promise<Buffer | null> {
  if (imageBuffers.length === 0) return null;

  const gridWidth = VISUAL_SIZE.width - 100; // 50px padding each side
  const gridHeight = VISUAL_SIZE.height - gridTop - 50; // Bottom padding
  const gap = 12;

  const composites: sharp.OverlayOptions[] = [];

  if (imageBuffers.length === 1) {
    const photo = await sharp(imageBuffers[0])
      .resize(gridWidth, gridHeight, { fit: "cover" })
      .composite([{
        input: Buffer.from(
          `<svg><rect x="0" y="0" width="${gridWidth}" height="${gridHeight}" rx="${PHOTO_RADIUS}" ry="${PHOTO_RADIUS}" fill="white"/></svg>`
        ),
        blend: "dest-in",
      }])
      .png()
      .toBuffer();
    composites.push({ input: photo, left: 50, top: gridTop });
  } else if (imageBuffers.length === 2) {
    const photoW = Math.floor((gridWidth - gap) / 2);
    for (let i = 0; i < 2; i++) {
      const photo = await sharp(imageBuffers[i])
        .resize(photoW, gridHeight, { fit: "cover" })
        .composite([{
          input: Buffer.from(
            `<svg><rect x="0" y="0" width="${photoW}" height="${gridHeight}" rx="${PHOTO_RADIUS}" ry="${PHOTO_RADIUS}" fill="white"/></svg>`
          ),
          blend: "dest-in",
        }])
        .png()
        .toBuffer();
      composites.push({ input: photo, left: 50 + i * (photoW + gap), top: gridTop });
    }
  } else {
    // 3 images: left column (2 stacked) + right column (1 large)
    const leftW = Math.floor(gridWidth * 0.42);
    const rightW = gridWidth - leftW - gap;
    const leftTopH = Math.floor((gridHeight - gap) * 0.45);
    const leftBottomH = gridHeight - leftTopH - gap;

    // Top-left
    const topLeft = await sharp(imageBuffers[0])
      .resize(leftW, leftTopH, { fit: "cover" })
      .composite([{
        input: Buffer.from(
          `<svg><rect x="0" y="0" width="${leftW}" height="${leftTopH}" rx="${PHOTO_RADIUS}" ry="${PHOTO_RADIUS}" fill="white"/></svg>`
        ),
        blend: "dest-in",
      }])
      .png()
      .toBuffer();
    composites.push({ input: topLeft, left: 50, top: gridTop });

    // Bottom-left
    const bottomLeft = await sharp(imageBuffers[2])
      .resize(leftW, leftBottomH, { fit: "cover" })
      .composite([{
        input: Buffer.from(
          `<svg><rect x="0" y="0" width="${leftW}" height="${leftBottomH}" rx="${PHOTO_RADIUS}" ry="${PHOTO_RADIUS}" fill="white"/></svg>`
        ),
        blend: "dest-in",
      }])
      .png()
      .toBuffer();
    composites.push({ input: bottomLeft, left: 50, top: gridTop + leftTopH + gap });

    // Right (large)
    const right = await sharp(imageBuffers[1])
      .resize(rightW, gridHeight, { fit: "cover" })
      .composite([{
        input: Buffer.from(
          `<svg><rect x="0" y="0" width="${rightW}" height="${gridHeight}" rx="${PHOTO_RADIUS}" ry="${PHOTO_RADIUS}" fill="white"/></svg>`
        ),
        blend: "dest-in",
      }])
      .png()
      .toBuffer();
    composites.push({ input: right, left: 50 + leftW + gap, top: gridTop });
  }

  // Create a transparent canvas and composite all photos
  const canvas = await sharp({
    create: {
      width: VISUAL_SIZE.width,
      height: VISUAL_SIZE.height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .png()
    .composite(composites)
    .toBuffer();

  return canvas;
}

// ─── Dark gradient overlay (for text readability on AI background) ───────────

async function createDarkGradientOverlay(): Promise<Buffer> {
  // SVG gradient: dark at top (for text), transparent at bottom (for photos)
  const svg = `
    <svg width="${VISUAL_SIZE.width}" height="${VISUAL_SIZE.height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="black" stop-opacity="0.75"/>
          <stop offset="35%" stop-color="black" stop-opacity="0.55"/>
          <stop offset="65%" stop-color="black" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="black" stop-opacity="0.2"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad)"/>
    </svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

// ─── Main Hybrid Generator ──────────────────────────────────────────────────

export interface HybridVisualParams extends LinkedInVisualParams {
  /** Extra context for the AI background prompt */
  projectType?: string | null;
  industry?: string | null;
  brandTone?: string | null;
  primaryColor?: string | null;
}

export async function generateLinkedInVisualHybrid(
  params: HybridVisualParams
): Promise<Buffer> {
  const {
    clientName,
    projectTitle,
    visualTitle,
    accentWord = clientName,
    clientLogoUrl,
    clientLogoOverride,
    projectImages,
    projectType,
    industry,
    brandTone,
    primaryColor,
  } = params;

  // 1. Compute title sizing (same logic as original)
  const rawTitle = visualTitle && visualTitle.trim().length > 0
    ? visualTitle.trim()
    : projectTitle;

  const hasImages = projectImages.length > 0;
  let titleFontSize: number;
  let displayTitle = rawTitle;

  if (!hasImages) {
    if (rawTitle.length <= 15) titleFontSize = 96;
    else if (rawTitle.length <= 30) titleFontSize = 80;
    else if (rawTitle.length <= 60) titleFontSize = 64;
    else {
      titleFontSize = 48;
      displayTitle = rawTitle.length > 100 ? rawTitle.slice(0, 97) + "..." : rawTitle;
    }
  } else {
    if (rawTitle.length <= 15) titleFontSize = 96;
    else if (rawTitle.length <= 25) titleFontSize = 64;
    else if (rawTitle.length <= 60) titleFontSize = 52;
    else if (rawTitle.length > 120) {
      titleFontSize = 36;
      displayTitle = rawTitle.length > 150 ? rawTitle.slice(0, 147) + "..." : rawTitle;
    } else if (rawTitle.length > 80) titleFontSize = 40;
    else titleFontSize = 48;
  }

  // 2. Fetch logos + images in parallel with AI background
  const [
    saraniLogoDataUri,
    clientLogoDataUri,
    aiBackground,
    ...imageResults
  ] = await Promise.all([
    fetchImageAsDataUri("/images/logo-sarani-white.png"),
    (clientLogoOverride ?? clientLogoUrl)
      ? fetchImageAsDataUri(clientLogoOverride ?? clientLogoUrl!)
      : Promise.resolve(null),
    generateAIBackground({ clientName, projectType, industry, brandTone, primaryColor }),
    ...projectImages.slice(0, 3).map(fetchImageAsBuffer),
  ]);

  const imageBuffers = (imageResults as (Buffer | null)[]).filter((b): b is Buffer => b !== null);

  // 3. If no AI background, fall back to Satori-only (import dynamically to avoid circular)
  if (!aiBackground) {
    console.log("[linkedin-visual-openai] No AI background — falling back to Satori-only");
    const { generateLinkedInVisual } = await import("./linkedin-visual");
    return generateLinkedInVisual(params);
  }

  // 4. Render the text overlay (transparent PNG via Satori)
  const textOverlay = await renderTextOverlay({
    displayTitle,
    accentWord,
    titleFontSize,
    saraniLogoDataUri,
    clientLogoDataUri,
    hasImages: imageBuffers.length > 0,
  });

  // 5. Create dark gradient overlay for text readability
  const gradientOverlay = await createDarkGradientOverlay();

  // 6. Render photo grid if we have images
  // Photos start below the title area — estimate based on title size
  const photoGridTop = hasImages ? Math.min(350 + titleFontSize * 1.2, 550) : 0;
  const photoGrid = imageBuffers.length > 0
    ? await renderPhotoGrid(imageBuffers, Math.round(photoGridTop))
    : null;

  // 7. Composite everything together with sharp
  const layers: sharp.OverlayOptions[] = [
    { input: gradientOverlay, blend: "over" },
    { input: textOverlay, blend: "over" },
  ];
  if (photoGrid) {
    // Insert photo grid BEFORE text overlay for proper z-ordering
    layers.splice(1, 0, { input: photoGrid, blend: "over" });
  }

  const final = await sharp(aiBackground)
    .composite(layers)
    .png()
    .toBuffer();

  return final;
}
