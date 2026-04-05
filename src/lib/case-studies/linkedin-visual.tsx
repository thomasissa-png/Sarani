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
import { graphFetch } from "@/lib/integrations/sharepoint";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LinkedInVisualParams {
  clientName: string;
  projectTitle: string;
  /** 2-4 word poster-style title from LLM (visualTitle). Used as primary display. Falls back to projectTitle. */
  visualTitle?: string;
  /** Word to highlight in Flame #DA5126. Defaults to clientName. */
  accentWord?: string;
  /** Absolute URL to client logo PNG. Null = show Sarani logo only. */
  clientLogoUrl?: string | null;
  /** Override client logo with a proxy URL (e.g. from SharePoint). Takes priority over clientLogoUrl. */
  clientLogoOverride?: string;
  /** 1-3 image URLs (SharePoint direct URLs or data URIs). */
  projectImages: string[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const VISUAL_SIZE = { width: 1200, height: 1200 };
const FLAME = "#DA5126";
const BG_DARK = "#0d0d0d";
const BG_GRADIENT_START = "#1a1a1a";
const PHOTO_RADIUS = 16;
/** Pixel height reserved for images (canvas 1200 - top padding 60 - pill ~64 - gap 40 - title ~120 - gap 40 - bar 6 - bottom pad 40) */
const IMAGE_AREA_HEIGHT = 720;

// ─── Font loader ─────────────────────────────────────────────────────────────
// Loads Outfit Bold from public/fonts/ (already in the repo).

let fontBoldCache: ArrayBuffer | null = null;

/** Try multiple paths for font loading — standalone deploys may differ */
async function loadFont(filename: string): Promise<ArrayBuffer> {
  const candidates = [
    join(process.cwd(), "public", "fonts", filename),
    join(process.cwd(), ".next", "standalone", "public", "fonts", filename),
    join(process.cwd(), "fonts", filename),
    // Replit standalone: public/ is copied to the root
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

async function loadOutfitBold(): Promise<ArrayBuffer> {
  if (fontBoldCache) return fontBoldCache;
  fontBoldCache = await loadFont("Poppins-Bold.ttf");
  return fontBoldCache;
}

let fontRegularCache: ArrayBuffer | null = null;

async function loadOutfitRegular(): Promise<ArrayBuffer> {
  if (fontRegularCache) return fontRegularCache;
  fontRegularCache = await loadFont("Poppins-Regular.ttf");
  return fontRegularCache;
}

// ─── Image fetcher ───────────────────────────────────────────────────────────
// SharePoint URLs are auth-gated. Fetch server-side and convert to base64 data
// URIs so Satori can embed them without needing SharePoint auth.

async function fetchImageAsDataUri(url: string): Promise<string | null> {
  // Already a data URI — pass through
  if (url.startsWith("data:")) return url;

  // API proxy path (e.g. /api/project-assets/{itemId}?driveId={driveId})
  // Resolve directly via Graph API instead of self-HTTP — avoids deadlock on
  // single-worker Replit (server can't call itself during request processing).
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

      const res = await fetch(downloadUrl, {
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) return null;
      const arrayBuf = await res.arrayBuffer();
      const base64 = Buffer.from(arrayBuf).toString("base64");
      const contentType = res.headers.get("content-type") ?? "image/png";
      return `data:${contentType};base64,${base64}`;
    } catch {
      return null;
    }
  }

  // Local public path — try multiple locations (standalone deploy may differ)
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
        const mime =
          ext === "svg" ? "image/svg+xml" : ext === "jpg" ? "image/jpeg" : `image/${ext}`;
        return `data:${mime};base64,${base64}`;
      } catch {
        // Try next path
      }
    }
    return null;
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
    projectTitle,
    visualTitle,
    accentWord = clientName,
    clientLogoUrl,
    clientLogoOverride,
    projectImages,
  } = params;

  // Use visualTitle (2-4 words poster-style from LLM) as primary display.
  // Fall back to projectTitle (headline) if visualTitle is empty or missing.
  const rawTitle = visualTitle && visualTitle.trim().length > 0
    ? visualTitle.trim()
    : projectTitle;

  const hasImages = projectImages.length > 0;

  // Dynamic title sizing — scale UP for short titles (poster impact), DOWN for long ones.
  // When no images: title is the hero element, go even bigger.
  let titleFontSize: number;
  let displayTitle = rawTitle;
  if (!hasImages) {
    // Fallback mode: title is the visual centerpiece
    if (rawTitle.length <= 15) {
      titleFontSize = 96;
    } else if (rawTitle.length <= 30) {
      titleFontSize = 80;
    } else if (rawTitle.length <= 60) {
      titleFontSize = 64;
    } else {
      titleFontSize = 48;
      displayTitle = rawTitle.length > 100 ? rawTitle.slice(0, 97) + "..." : rawTitle;
    }
  } else {
    // With images: title shares space with photo grid
    if (rawTitle.length <= 15) {
      titleFontSize = 80;
    } else if (rawTitle.length <= 25) {
      titleFontSize = 64;
    } else if (rawTitle.length <= 60) {
      titleFontSize = 52;
    } else if (rawTitle.length > 120) {
      titleFontSize = 36;
      displayTitle = rawTitle.length > 150 ? rawTitle.slice(0, 147) + "..." : rawTitle;
    } else if (rawTitle.length > 80) {
      titleFontSize = 40;
    } else {
      titleFontSize = 48;
    }
  }

  // Load fonts
  const [poppinsBold, poppinsRegular] = await Promise.all([
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

  const hasResolvedImages = imageDataUris.length > 0;

  try {
    const imageResponse = new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: hasResolvedImages ? "center" : "center",
            justifyContent: hasResolvedImages ? "flex-start" : "center",
            background: `linear-gradient(180deg, ${BG_GRADIENT_START} 0%, ${BG_DARK} 100%)`,
            padding: hasResolvedImages ? "60px 60px 0 60px" : "80px 80px 0 80px",
            fontFamily: "Poppins",
            position: "relative",
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
              backgroundColor: "rgba(255,255,255,0.08)",
              padding: "12px 32px",
              marginBottom: hasResolvedImages ? 40 : 48,
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

          {/* ─── Title: Poppins Bold, white + client name in Flame ── */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              textAlign: "center",
              fontSize: titleFontSize,
              fontWeight: 700,
              lineHeight: 1.1,
              maxWidth: 1040,
              marginBottom: hasResolvedImages ? 40 : 0,
            }}
          >
            {renderTitle(displayTitle, accentWord)}
          </div>

          {/* ─── Project images — asymmetric layout ───────────────── */}
          {hasResolvedImages && (
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                width: "100%",
                flex: 1,
                marginBottom: 46,
              }}
            >
              {/* Left column: 1-2 small images stacked */}
              {imageDataUris.length >= 2 && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    width: "38%",
                    height: "100%",
                    marginRight: "2%",
                  }}
                >
                  <img
                    src={imageDataUris[1]}
                    style={{
                      width: "100%",
                      height: imageDataUris.length >= 3 ? "48%" : "100%",
                      objectFit: "cover",
                      borderRadius: PHOTO_RADIUS,
                    }}
                  />
                  {imageDataUris[2] && (
                    <img
                      src={imageDataUris[2]}
                      style={{
                        width: "100%",
                        height: "48%",
                        objectFit: "cover",
                        borderRadius: PHOTO_RADIUS,
                        marginTop: "4%",
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
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: PHOTO_RADIUS,
                }}
              />
            </div>
          )}

          {/* ─── Bottom accent bar — full width Flame (6px) ─────── */}
          <div
            style={{
              width: "100%",
              height: 6,
              backgroundColor: FLAME,
              borderRadius: 3,
              position: "absolute",
              bottom: 0,
              left: 0,
            }}
          />
        </div>
      ),
      {
        ...VISUAL_SIZE,
        fonts: [
          {
            name: "Poppins",
            data: poppinsBold,
            weight: 700,
            style: "normal" as const,
          },
          {
            name: "Poppins",
            data: poppinsRegular,
            weight: 400,
            style: "normal" as const,
          },
        ],
      }
    );

    // Convert ReadableStream response to Buffer
    const arrayBuffer = await imageResponse.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    console.error("[linkedin-visual] ImageResponse failed:", err instanceof Error ? err.message : err);
    console.error("[linkedin-visual] Params:", {
      clientName,
      titleLength: displayTitle.length,
      titleFontSize,
      hasLogo: !!clientLogoDataUri,
      hasSaraniLogo: !!saraniLogoDataUri,
      imageCount: imageDataUris.length,
    });
    throw err;
  }
}
