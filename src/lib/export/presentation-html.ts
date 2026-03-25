import type { PresentationOutput } from "@/lib/validations/presentation";

// ─── Brand colors ────────────────────────────────────────────────────────────

const COLORS = {
  black: "#000000",
  flame: "#da5126",
  cerulean: "#0babe8",
  lemon: "#f1c217",
  white: "#ffffff",
} as const;

const DOT_COLORS = [COLORS.flame, COLORS.cerulean, COLORS.lemon];

function coloredDot(index: number): string {
  const color = DOT_COLORS[index % DOT_COLORS.length];
  return `<span style="color: ${color}">.</span>`;
}

// ─── Submark (3 circles) ─────────────────────────────────────────────────────

function submark(): string {
  return `<div style="position: absolute; top: 32px; right: 40px; display: flex; gap: 6px;">
    <div style="width: 12px; height: 12px; border-radius: 50%; background: ${COLORS.flame};"></div>
    <div style="width: 12px; height: 12px; border-radius: 50%; background: ${COLORS.cerulean};"></div>
    <div style="width: 12px; height: 12px; border-radius: 50%; background: ${COLORS.lemon};"></div>
  </div>`;
}

// ─── Slide wrapper ───────────────────────────────────────────────────────────

function slideWrapper(
  content: string,
  opts: { bg?: string; slideNumber?: number; totalSlides?: number }
): string {
  const bg = opts.bg || COLORS.white;
  const textColor = bg === COLORS.white ? COLORS.black : COLORS.white;
  const footer =
    opts.slideNumber != null && opts.totalSlides != null
      ? `<div style="position: absolute; bottom: 24px; right: 40px; font-size: 12px; color: ${textColor}; opacity: 0.5;">${opts.slideNumber} / ${opts.totalSlides}</div>`
      : "";

  return `<div style="position: relative; width: 100%; min-height: 700px; background: ${bg}; color: ${textColor}; padding: 60px 64px 48px; box-sizing: border-box; page-break-after: always; overflow: hidden;">
    ${submark()}
    ${content}
    ${footer}
  </div>`;
}

// ─── Cover slide ─────────────────────────────────────────────────────────────

function coverSlide(data: {
  title: string;
  subtitle?: string;
  clientName?: string;
  presentationType?: string;
}): string {
  const content = `
    <div style="display: flex; flex-direction: column; justify-content: center; height: 100%; min-height: 580px;">
      <div style="margin-bottom: 48px;">
        <div style="font-size: 28px; font-weight: 700; letter-spacing: -0.5px; color: ${COLORS.white};">sarani</div>
      </div>
      <h1 style="font-size: 48px; font-weight: 700; line-height: 1.15; margin: 0 0 20px 0; max-width: 80%;">${escapeHtml(data.title)}${coloredDot(0)}</h1>
      ${data.subtitle ? `<p style="font-size: 20px; font-weight: 400; opacity: 0.85; margin: 0 0 16px 0;">${escapeHtml(data.subtitle)}</p>` : ""}
      ${data.clientName ? `<p style="font-size: 16px; font-weight: 500; opacity: 0.7; margin: 0;">Prepared for ${escapeHtml(data.clientName)}</p>` : ""}
      ${data.presentationType ? `<p style="font-size: 14px; font-weight: 400; opacity: 0.5; margin: 8px 0 0 0; text-transform: uppercase; letter-spacing: 1px;">${escapeHtml(data.presentationType)}</p>` : ""}
    </div>`;
  return slideWrapper(content, { bg: COLORS.cerulean });
}

// ─── Section divider slide ───────────────────────────────────────────────────

function sectionDivider(
  sectionNumber: number,
  title: string,
  slideNumber: number,
  totalSlides: number
): string {
  const padded = String(sectionNumber).padStart(2, "0");
  const content = `
    <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%; min-height: 580px; text-align: center;">
      <div style="font-size: 120px; font-weight: 700; opacity: 0.15; margin-bottom: -20px;">${padded}</div>
      <div style="width: 180px; height: 180px; border-radius: 50%; background: ${COLORS.white}; display: flex; align-items: center; justify-content: center;">
        <span style="font-size: 22px; font-weight: 700; color: ${COLORS.cerulean}; text-align: center; padding: 20px; line-height: 1.3;">${escapeHtml(title)}${coloredDot(sectionNumber)}</span>
      </div>
    </div>`;
  return slideWrapper(content, {
    bg: COLORS.cerulean,
    slideNumber,
    totalSlides,
  });
}

// ─── Content slide ───────────────────────────────────────────────────────────

function contentSlide(
  slide: {
    slideNumber: number;
    title: string;
    bullets: string[];
    speakerNotes: string;
    visualSuggestion: string;
  },
  totalSlides: number
): string {
  const bulletsHtml = slide.bullets
    .map(
      (b) =>
        `<li style="margin-bottom: 12px; padding-left: 8px; font-size: 16px; line-height: 1.6; color: ${COLORS.black};">${escapeHtml(b)}</li>`
    )
    .join("");

  const content = `
    <div style="padding-top: 20px;">
      <h2 style="font-size: 32px; font-weight: 700; margin: 0 0 32px 0; color: ${COLORS.black}; line-height: 1.2;">
        ${escapeHtml(slide.title)}${coloredDot(slide.slideNumber)}
      </h2>
      <ul style="list-style: none; padding: 0; margin: 0 0 32px 0;">
        ${bulletsHtml}
      </ul>
      ${slide.visualSuggestion ? `<p style="font-size: 13px; font-style: italic; color: #999; margin: 0;"><strong>Visual:</strong> ${escapeHtml(slide.visualSuggestion)}</p>` : ""}
    </div>`;
  return slideWrapper(content, {
    bg: COLORS.white,
    slideNumber: slide.slideNumber,
    totalSlides,
  });
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function generatePresentationHTML(data: {
  presentation: PresentationOutput;
  clientName?: string;
  presentationType?: string;
}): string {
  const { presentation, clientName, presentationType } = data;
  const totalSlides = presentation.slides.length + 1; // +1 for cover

  // Determine which slides are "section dividers" vs content
  // Heuristic: slides with 0 bullets or whose title looks like a section title
  // For simplicity, we treat every slide as a content slide and insert dividers
  // only at the beginning if there are many slides (>10)
  const useDividers = presentation.slides.length > 10;
  let sectionCount = 0;

  let slidesHtml = coverSlide({
    title: presentation.title,
    subtitle: presentation.subtitle,
    clientName,
    presentationType,
  });

  for (let i = 0; i < presentation.slides.length; i++) {
    const slide = presentation.slides[i];

    // Insert a section divider every 5 slides if deck is large
    if (useDividers && i % 5 === 0) {
      sectionCount++;
      slidesHtml += sectionDivider(
        sectionCount,
        slide.title,
        slide.slideNumber,
        totalSlides
      );
    }

    slidesHtml += contentSlide(slide, totalSlides);
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(presentation.title)} — Sarani</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { font-family: 'Outfit', sans-serif; background: #f5f5f5; }
    @media print {
      body { background: white; }
      div[style*="page-break-after"] { page-break-after: always; }
      @page { margin: 0; size: landscape; }
    }
  </style>
</head>
<body>
  ${slidesHtml}
</body>
</html>`;
}
