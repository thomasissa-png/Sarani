// ─── LinkedIn Visual Generator (Satori / next/og) ───────────────────────────
// Generates a 1200x1200 PNG for LinkedIn case study posts.
// Layout: dark gradient background, pill with Sarani + client logo, title with
// accent word in Flame, 2-3 project photos in asymmetric grid.
//
// Decision: Satori via next/og — 0$ cost, <500ms, pixel-perfect, deterministic.
// DALL-E was considered and rejected (see case-study-visual-automation-specs.md).

import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LinkedInVisualParams {
  clientName: string;
  projectTitle: string;
  /** Word to highlight in Flame #DA5126. Defaults to clientName. */
  accentWord?: string;
  /** Absolute URL to client logo PNG. Null = show Sarani logo only. */
  clientLogoUrl?: string | null;
  /** Override client logo with a proxy URL (e.g. from SharePoint). Takes priority over clientLogoUrl. */
  clientLogoOverride?: string;
  /** 1-3 image URLs (SharePoint direct URLs or data URIs). */
  projectImages: string[];
  /** Optional secondary line: client name + key stat. Displayed below title. */
  secondaryText?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const VISUAL_SIZE = { width: 1200, height: 1200 };
const FLAME = "#DA5126";
const CERULEAN = "#2D7DD2";
const LEMON = "#F0C808";
const BG_DARK = "#000000"; // token: surface.dark
const BG_GRADIENT_START = "#1d1d1d"; // token: surface.dark-elevated
const PHOTO_RADIUS = 32; // token: 2xl — pronounced rounded corners per Thomas template
/** Pixel height reserved for images (canvas 1200 - padding 100 - pill ~64 - margins ~96 - title ~132 - subtitle ~36 - bar 6) */
const IMAGE_AREA_HEIGHT = 676;

// ─── Font loader ─────────────────────────────────────────────────────────────
// Loads Outfit Bold from public/fonts/ (already in the repo).

let fontBoldCache: ArrayBuffer | null = null;

async function loadOutfitBold(): Promise<ArrayBuffer> {
  if (fontBoldCache) return fontBoldCache;
  const fontPath = join(process.cwd(), "public", "fonts", "Outfit-Bold.ttf");
  const buffer = await readFile(fontPath);
  fontBoldCache = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  );
  return fontBoldCache;
}

let fontRegularCache: ArrayBuffer | null = null;

async function loadOutfitRegular(): Promise<ArrayBuffer> {
  if (fontRegularCache) return fontRegularCache;
  const fontPath = join(process.cwd(), "public", "fonts", "Outfit-Regular.ttf");
  const buffer = await readFile(fontPath);
  fontRegularCache = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  );
  return fontRegularCache;
}

// ─── Image fetcher ───────────────────────────────────────────────────────────
// SharePoint URLs are auth-gated. Fetch server-side and convert to base64 data
// URIs so Satori can embed them without needing SharePoint auth.

async function fetchImageAsDataUri(url: string): Promise<string | null> {
  // Already a data URI — pass through
  if (url.startsWith("data:")) return url;

  // Local public path — read from filesystem
  if (url.startsWith("/")) {
    try {
      const filePath = join(process.cwd(), "public", url);
      const buffer = await readFile(filePath);
      const base64 = buffer.toString("base64");
      const ext = url.split(".").pop()?.toLowerCase() ?? "png";
      const mime =
        ext === "svg" ? "image/svg+xml" : ext === "jpg" ? "image/jpeg" : `image/${ext}`;
      return `data:${mime};base64,${base64}`;
    } catch {
      return null;
    }
  }

  // Remote URL — fetch with timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) return null;
    const arrayBuf = await res.arrayBuffer();
    const base64 = Buffer.from(arrayBuf).toString("base64");
    const contentType = res.headers.get("content-type") ?? "image/png";
    return `data:${contentType};base64,${base64}`;
  } catch {
    return null;
  }
}

// ─── Title renderer ──────────────────────────────────────────────────────────
// Splits the title into segments, highlighting the accent word in Flame.

function renderTitle(title: string, accentWord: string): React.ReactNode[] {
  const segments: React.ReactNode[] = [];
  const lowerTitle = title.toLowerCase();
  const lowerAccent = accentWord.toLowerCase();
  const idx = lowerTitle.indexOf(lowerAccent);

  if (idx === -1) {
    // Accent word not found in title — render all white
    segments.push(
      <span key="full" style={{ color: "#ffffff" }}>
        {title}
      </span>
    );
  } else {
    const before = title.slice(0, idx);
    const match = title.slice(idx, idx + accentWord.length);
    const after = title.slice(idx + accentWord.length);
    if (before) {
      segments.push(
        <span key="before" style={{ color: "#ffffff" }}>
          {before}
        </span>
      );
    }
    segments.push(
      <span key="accent" style={{ color: FLAME }}>
        {match}
      </span>
    );
    if (after) {
      segments.push(
        <span key="after" style={{ color: "#ffffff" }}>
          {after}
        </span>
      );
    }
  }
  return segments;
}

// ─── Main generator ──────────────────────────────────────────────────────────

export async function generateLinkedInVisual(
  params: LinkedInVisualParams
): Promise<Buffer> {
  const {
    clientName,
    projectTitle: rawTitle,
    accentWord = clientName,
    clientLogoUrl,
    clientLogoOverride,
    projectImages,
    secondaryText,
  } = params;

  // Dynamic title sizing — scale UP for short titles (poster impact), DOWN for long ones
  let titleFontSize = 60; // token: 6xl — default
  let displayTitle = rawTitle;
  if (rawTitle.length <= 15) {
    titleFontSize = 96; // 2-3 word poster headline like "I RUN STORE"
  } else if (rawTitle.length <= 25) {
    titleFontSize = 80; // short title, still big impact
  } else if (rawTitle.length > 120) {
    titleFontSize = 36;
    displayTitle = rawTitle.length > 150 ? rawTitle.slice(0, 147) + "..." : rawTitle;
  } else if (rawTitle.length > 80) {
    titleFontSize = 44;
  }

  // Load fonts
  const [outfitBold, outfitRegular] = await Promise.all([
    loadOutfitBold(),
    loadOutfitRegular(),
  ]);

  // Fetch Sarani logo as data URI
  const saraniLogoDataUri = await fetchImageAsDataUri(
    "/images/logo-sarani-white.png"
  );

  // Fetch client logo as data URI — override takes priority
  let clientLogoDataUri: string | null = null;
  const logoSource = clientLogoOverride ?? clientLogoUrl;
  if (logoSource) {
    clientLogoDataUri = await fetchImageAsDataUri(logoSource);
  }

  // Fetch project images as data URIs (parallel, with fallback)
  const imageDataUris = (
    await Promise.all(projectImages.slice(0, 3).map(fetchImageAsDataUri))
  ).filter((uri): uri is string => uri !== null);

  // ─── Build the visual JSX ──────────────────────────────────────────────

  // Secondary line: only shown if explicitly provided (e.g. LLM-generated visualTitle).
  // No fallback to clientName — the model template is clean: pill + title + photos only.
  const secondaryLine = secondaryText || undefined;

  const imageResponse = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          background: `linear-gradient(180deg, ${BG_GRADIENT_START} 0%, ${BG_DARK} 100%)`,
          padding: "50px 50px 40px 50px",
          fontFamily: "Outfit",
        }}
      >
        {/* ─── Pill: Sarani logo + client logo ──────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.12)",
            backgroundColor: "rgba(255,255,255,0.15)",
            padding: "12px 32px",
            marginBottom: 48,
          }}
        >
          {saraniLogoDataUri ? (
            <img
              src={saraniLogoDataUri}
              width={120}
              height={40}
              style={{ objectFit: "contain" }}
            />
          ) : (
            <span
              style={{
                color: FLAME,
                fontSize: 24,
                fontWeight: 700,
                letterSpacing: "0.1em",
              }}
            >
              SARANI
            </span>
          )}
          {clientLogoDataUri && (
            <>
              <div
                style={{
                  width: 1,
                  height: 32,
                  backgroundColor: "rgba(255,255,255,0.2)",
                  marginLeft: 24,
                  marginRight: 24,
                }}
              />
              <img
                src={clientLogoDataUri}
                width={100}
                height={36}
                style={{ objectFit: "contain" }}
              />
            </>
          )}
        </div>

        {/* ─── Title ────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            textAlign: "center",
            fontSize: titleFontSize,
            fontWeight: 700,
            lineHeight: 1.1, // token: tight
            maxWidth: 1000,
            marginBottom: secondaryLine ? 16 : 48,
          }}
        >
          {renderTitle(displayTitle, accentWord)}
        </div>

        {/* ─── Secondary text (client + key stat) ──────────────── */}
        {secondaryLine && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              fontSize: 28,
              fontWeight: 400,
              color: "rgba(255,255,255,0.6)",
              marginBottom: 32,
              maxWidth: 900,
              textAlign: "center",
            }}
          >
            {secondaryLine}
          </div>
        )}

        {/* ─── Project images — asymmetric layout ───────────────── */}
        {imageDataUris.length > 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              width: "100%",
              height: IMAGE_AREA_HEIGHT,
            }}
          >
            {/* Left column: 1-2 small images stacked */}
            {imageDataUris.length >= 2 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  width: "38%",
                  height: IMAGE_AREA_HEIGHT,
                  marginRight: "2%",
                }}
              >
                <img
                  src={imageDataUris[1]}
                  style={{
                    width: "100%",
                    height: imageDataUris.length >= 3 ? Math.floor(IMAGE_AREA_HEIGHT * 0.33) : IMAGE_AREA_HEIGHT,
                    objectFit: "cover",
                    borderRadius: PHOTO_RADIUS,
                  }}
                />
                {imageDataUris[2] && (
                  <img
                    src={imageDataUris[2]}
                    style={{
                      width: "100%",
                      height: Math.floor(IMAGE_AREA_HEIGHT * 0.63),
                      objectFit: "cover",
                      borderRadius: PHOTO_RADIUS,
                      marginTop: Math.floor(IMAGE_AREA_HEIGHT * 0.04),
                    }}
                  />
                )}
              </div>
            )}

            {/* Right / main image (large) */}
            <img
              src={imageDataUris[0]}
              style={{
                width: imageDataUris.length >= 2 ? "60%" : "100%",
                height: IMAGE_AREA_HEIGHT,
                objectFit: "cover",
                borderRadius: PHOTO_RADIUS,
              }}
            />
          </div>
        ) : (
          /* ─── Fallback: 3 Sarani dots (Flame/Cerulean/Lemon) ── */
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: IMAGE_AREA_HEIGHT,
              gap: 60,
            }}
          >
            <div
              style={{
                width: 120,
                height: 120,
                borderRadius: 60,
                backgroundColor: FLAME,
                opacity: 0.85,
              }}
            />
            <div
              style={{
                width: 100,
                height: 100,
                borderRadius: 50,
                backgroundColor: CERULEAN,
                opacity: 0.75,
                marginTop: -40,
              }}
            />
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: LEMON,
                opacity: 0.65,
                marginTop: 30,
              }}
            />
          </div>
        )}

        {/* ─── Bottom accent line — full width Flame ────────────── */}
        <div
          style={{
            width: "100%",
            height: 6,
            backgroundColor: FLAME,
            borderRadius: 3,
            marginTop: 32,
          }}
        />
      </div>
    ),
    {
      ...VISUAL_SIZE,
      fonts: [
        {
          name: "Outfit",
          data: outfitBold,
          weight: 700,
          style: "normal",
        },
        {
          name: "Outfit",
          data: outfitRegular,
          weight: 400,
          style: "normal",
        },
      ],
    }
  );

  // Convert ReadableStream response to Buffer
  const arrayBuffer = await imageResponse.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
