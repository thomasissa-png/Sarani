// ─── Quote PDF Generator ─────────────────────────────────────────────────────
// Generates a premium quote PDF using pdf-lib (no Puppeteer).
// Redesigned for Sarani's creative agency brand identity.
// Brand palette: Flame #da5126, Black #000000, Cerulean #0babe8, Lemon #f1c217

import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from "pdf-lib";
import fs from "fs";
import path from "path";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface QuoteLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface QuotePDFData {
  quoteNumber: string;
  date: string;
  clientName: string;
  contactName: string;
  projectName: string;
  description: string;
  scope: string;
  items: QuoteLineItem[];
  totalAmount: number;
  currency: string;
  vatRate: number | null; // null = no VAT, e.g. 20 for 20%
  validUntil: string | null; // ISO date string, e.g. "2026-04-26"
  language: "en" | "fr"; // Quote language — defaults to "en"
  paymentTermsDays: number; // Payment terms in days — defaults to 45
  signatoryName?: string; // Defaults to "Emmanuel Gomez"
  signatoryTitle?: string; // Defaults to "CEO"
}

// ─── Translations ────────────────────────────────────────────────────────────

const TRANSLATIONS = {
  en: {
    serviceProposal: "Service Proposal",
    preparedFor: "Prepared for",
    proposalFor: "This proposal is for",
    at: "at",
    purposeOfWork: "Purpose of work",
    scopeAndDeliverables: "Scope and deliverables",
    projectSchedule: "Project schedule",
    scheduleItems: [
      "Proposal delivered to {client} – {date}",
      "Work commences once PO is raised",
      "Final work to be delivered to {client} by specified deadline",
    ],
    pricing: "Pricing, payment, terms and conditions",
    item: "Item",
    fixedRate: "Fixed rate",
    qty: "Qty",
    total: "Total",
    subtotal: "Subtotal",
    vat: "VAT",
    references: "References",
    referencesText:
      "Trusted by TikTok (1,500+ monthly video edits), Sony (same-day delivery across 15 languages), GEODIS (5,700 slides rebranded in 3 weeks), and Adidas (arena-scale event production). References available upon request.",
    paymentTerms: [
      "Work commences once a PO is raised.",
      "Unlimited rounds of revisions are offered before filming and on post-production.",
      "Payment terms are {days} days.",
    ],
    bestRegards: "Best regards,",
    validUntil: "Valid until",
  },
  fr: {
    serviceProposal: "Proposition de service",
    preparedFor: "Préparé pour",
    proposalFor: "Cette proposition est destinée à",
    at: "chez",
    purposeOfWork: "Objet de la prestation",
    scopeAndDeliverables: "Périmètre et livrables",
    projectSchedule: "Calendrier du projet",
    scheduleItems: [
      "Proposition remise à {client} – {date}",
      "Les travaux démarrent à réception du bon de commande",
      "Livraison finale à {client} selon le délai convenu",
    ],
    pricing: "Tarification, paiement, termes et conditions",
    item: "Prestation",
    fixedRate: "Tarif unitaire",
    qty: "Qté",
    total: "Total",
    subtotal: "Sous-total",
    vat: "TVA",
    references: "Références",
    referencesText:
      "Sarani est une agence créative internationale réunissant 35 experts sur 5 continents et 18 langues. Nous opérons 24h/24 pour livrer une créativité illimitée avec un délai de livraison J+1. Nos clients incluent Sony, TikTok, Adidas, GEODIS, Pernod Ricard, L'Oréal, Air Corsica et PICO. Nous avons été reconnus pour notre travail à travers de nombreux prix et benchmarks sectoriels.",
    paymentTerms: [
      "Les travaux démarrent à réception du bon de commande (PO).",
      "Nombre illimité de révisions inclus avant tournage et en post-production.",
      "Conditions de paiement : {days} jours.",
    ],
    bestRegards: "Cordialement,",
    validUntil: "Valable jusqu'au",
  },
} as const;

// ─── Constants ──────────────────────────────────────────────────────────────

const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89;
const MARGIN_LEFT = 72;
const MARGIN_RIGHT = 72;
const MARGIN_TOP = 50;
const MARGIN_BOTTOM = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

// Brand Colors — Sarani palette (dark-first, minimal accents)
const COLOR_FLAME = rgb(0.855, 0.318, 0.149); // #da5126 — accent only
const COLOR_BLACK = rgb(0, 0, 0); // #000000 — primary
const COLOR_DARK_TEXT = rgb(0.13, 0.13, 0.13); // #222222 — body text
const COLOR_GRAY_TEXT = rgb(0.35, 0.35, 0.35); // #595959 — secondary
const COLOR_GRAY_LIGHT_TEXT = rgb(0.55, 0.55, 0.55); // #8c8c8c — subtle labels
const COLOR_SECTION_BG = rgb(0.98, 0.976, 0.961); // #faf9f5 — warm neutral-200 from design system
const COLOR_ROW_ALT = rgb(0.953, 0.949, 0.937); // #f3f2ef — visible alternation
const COLOR_TABLE_BORDER = rgb(0.9, 0.9, 0.9); // #e6e6e6
const COLOR_WHITE = rgb(1, 1, 1);
const COLOR_SEPARATOR = rgb(0.88, 0.88, 0.88); // #e0e0e0

// Font sizes — refined hierarchy (elegant, not loud)
const FONT_TITLE = 24;
const FONT_SUBTITLE = 11;
const FONT_SECTION_HEADING = 11;
const FONT_BODY = 9.5;
const FONT_TABLE_HEADER = 8.5;
const FONT_TABLE_CELL = 9.5;
const FONT_FOOTER = 7.5;
const FONT_LABEL = 7.5;
const FONT_CLIENT_NAME = 12;
const FONT_QUOTE_NUMBER = 9;

// Spacing — very generous for premium breathing room
const SECTION_GAP = 36;
const HEADING_TO_CONTENT = 16;
const TABLE_TOP_GAP = 28;
const ACCENT_BORDER_WIDTH = 2; // Subtle Flame accent
const ACCENT_BORDER_OFFSET = 10;

// ─── Logo Cache ─────────────────────────────────────────────────────────────

let cachedLogoPng: Uint8Array | null = null;

function getLogoPng(): Uint8Array | null {
  if (cachedLogoPng) return cachedLogoPng;
  try {
    // White logo for dark header background
    const logoPath = path.join(
      process.cwd(),
      "public",
      "sarani-logo-white.png"
    );
    cachedLogoPng = new Uint8Array(fs.readFileSync(logoPath));
    return cachedLogoPng;
  } catch {
    return null;
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCurrency(amount: number, currency: string): string {
  const symbols: Record<string, string> = {
    EUR: "\u20AC",
    USD: "$",
    GBP: "\u00A3",
  };
  const symbol = symbols[currency] ?? currency;
  const formatted = amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${symbol}${formatted}`;
}

/**
 * Split text into lines that fit within maxWidth using the given font and size.
 */
function wrapText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number
): string[] {
  const lines: string[] = [];
  const paragraphs = text.split("\n");

  for (const paragraph of paragraphs) {
    if (paragraph.trim() === "") {
      lines.push("");
      continue;
    }

    const words = paragraph.split(" ");
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = font.widthOfTextAtSize(testLine, fontSize);

      if (width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }
  }

  return lines;
}

/** Page wrapper that tracks current page and supports auto-pagination */
interface PageRef {
  current: PDFPage;
  doc: PDFDocument;
}

/**
 * Draw wrapped text with generous line spacing (1.6 default for readability).
 * Returns the new Y position after drawing. Adds a new page if needed.
 */
function drawWrappedText(
  page: PageRef,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  fontSize: number,
  maxWidth: number,
  color: typeof COLOR_BLACK,
  lineSpacing: number = 1.6
): number {
  const lines = wrapText(text, font, fontSize, maxWidth);
  let currentY = y;

  for (const line of lines) {
    if (currentY < MARGIN_BOTTOM + 20) {
      page.current = page.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      currentY = PAGE_HEIGHT - MARGIN_TOP;
    }

    if (line.trim()) {
      page.current.drawText(line, {
        x,
        y: currentY,
        size: fontSize,
        font,
        color,
      });
    }

    currentY -= fontSize * lineSpacing;
  }

  return currentY;
}

/**
 * Draw a horizontal separator line across the content width.
 */
function drawSeparator(page: PDFPage, y: number): void {
  page.drawLine({
    start: { x: MARGIN_LEFT, y },
    end: { x: PAGE_WIDTH - MARGIN_RIGHT, y },
    thickness: 0.5,
    color: COLOR_SEPARATOR,
  });
}

/**
 * Draw a section heading with a Flame accent bar on the left.
 * Returns the Y position after the heading (ready for content).
 */
function drawSectionHeading(
  page: PDFPage,
  text: string,
  y: number,
  font: PDFFont,
  accentColor: typeof COLOR_BLACK = COLOR_BLACK
): number {
  // Accent bar — 2pt wide, aligned with text height (Flame or Black)
  page.drawRectangle({
    x: MARGIN_LEFT,
    y: y - 2,
    width: ACCENT_BORDER_WIDTH,
    height: FONT_SECTION_HEADING + 4,
    color: accentColor,
  });

  page.drawText(text, {
    x: MARGIN_LEFT + ACCENT_BORDER_OFFSET + ACCENT_BORDER_WIDTH,
    y,
    size: FONT_SECTION_HEADING,
    font,
    color: COLOR_BLACK,
  });

  return y - HEADING_TO_CONTENT - FONT_SECTION_HEADING;
}

/**
 * Ensure enough vertical space; if not, add a new page and return fresh Y.
 */
function ensureSpace(page: PageRef, y: number, needed: number): number {
  if (y - needed < MARGIN_BOTTOM) {
    page.current = page.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    return PAGE_HEIGHT - MARGIN_TOP;
  }
  return y;
}

// ─── Main Generator ─────────────────────────────────────────────────────────

export async function generateQuotePDF(
  data: QuotePDFData
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  // Embed Outfit font (Sarani's brand typeface) with Helvetica fallback
  let fontRegular: PDFFont;
  let fontBold: PDFFont;
  try {
    const outfitRegularPath = path.join(process.cwd(), "public", "fonts", "Outfit-Regular.ttf");
    const outfitBoldPath = path.join(process.cwd(), "public", "fonts", "Outfit-Bold.ttf");
    const outfitRegularBytes = fs.readFileSync(outfitRegularPath);
    const outfitBoldBytes = fs.readFileSync(outfitBoldPath);
    fontRegular = await doc.embedFont(outfitRegularBytes);
    fontBold = await doc.embedFont(outfitBoldBytes);
  } catch (e) {
    console.error("[generate-pdf] Outfit font not found, falling back to Helvetica. Deploy fonts to public/fonts/.", e);
    fontRegular = await doc.embedFont(StandardFonts.Helvetica);
    fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  }

  const t = TRANSLATIONS[data.language ?? "en"];

  let currentPage = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const pageRef: PageRef = { current: currentPage, doc };
  let y = PAGE_HEIGHT - MARGIN_TOP;

  // ═══════════════════════════════════════════════════════════════════════════
  // HEADER: Black banner with logo + quote info (premium, like website hero)
  // ═══════════════════════════════════════════════════════════════════════════

  const headerHeight = 120;

  // Black header background — full width (bleeds to edges)
  currentPage.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - headerHeight,
    width: PAGE_WIDTH,
    height: headerHeight,
    color: COLOR_BLACK,
  });

  const logoPng = getLogoPng();

  if (logoPng) {
    try {
      const logoImage = await doc.embedPng(logoPng);
      const logoScale = 70 / logoImage.width;
      const logoWidth = logoImage.width * logoScale;
      const logoHeight = logoImage.height * logoScale;
      // White logo on black header
      currentPage.drawImage(logoImage, {
        x: MARGIN_LEFT,
        y: PAGE_HEIGHT - headerHeight / 2 - logoHeight / 2,
        width: logoWidth,
        height: logoHeight,
      });
    } catch {
      // Logo embed failed — show text fallback
      currentPage.drawText("SARANI", {
        x: MARGIN_LEFT,
        y: PAGE_HEIGHT - headerHeight / 2 - 8,
        size: 18,
        font: fontBold,
        color: COLOR_WHITE,
      });
    }
  } else {
    currentPage.drawText("SARANI", {
      x: MARGIN_LEFT,
      y: PAGE_HEIGHT - headerHeight / 2 - 8,
      size: 18,
      font: fontBold,
      color: COLOR_WHITE,
    });
  }

  // Quote number (right-aligned, white on black)
  const qnWidth = fontRegular.widthOfTextAtSize(
    data.quoteNumber,
    FONT_QUOTE_NUMBER
  );
  currentPage.drawText(data.quoteNumber, {
    x: PAGE_WIDTH - MARGIN_RIGHT - qnWidth,
    y: PAGE_HEIGHT - headerHeight / 2 + 15,
    size: FONT_QUOTE_NUMBER,
    font: fontRegular,
    color: COLOR_WHITE,
  });

  // Date (right-aligned, centered in header)
  const dateText = data.date;
  const dateWidth = fontRegular.widthOfTextAtSize(dateText, FONT_LABEL);
  currentPage.drawText(dateText, {
    x: PAGE_WIDTH - MARGIN_RIGHT - dateWidth,
    y: PAGE_HEIGHT - headerHeight / 2,
    size: FONT_LABEL,
    font: fontRegular,
    color: rgb(0.6, 0.6, 0.6),
  });

  // Valid until (right-aligned, subtle)
  if (data.validUntil) {
    const validDate = new Date(data.validUntil + "T00:00:00");
    const locale = data.language === "fr" ? "fr-FR" : "en-US";
    const validText = `${t.validUntil} : ${validDate.toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" })}`;
    const validWidth = fontRegular.widthOfTextAtSize(validText, FONT_LABEL);
    currentPage.drawText(validText, {
      x: PAGE_WIDTH - MARGIN_RIGHT - validWidth,
      y: PAGE_HEIGHT - headerHeight / 2 - 15,
      size: FONT_LABEL,
      font: fontRegular,
      color: rgb(0.45, 0.45, 0.45),
    });
  }

  // Small Flame accent dot in the header (subtle brand touch, fixed position)
  currentPage.drawCircle({
    x: PAGE_WIDTH - MARGIN_RIGHT - 120,
    y: PAGE_HEIGHT - headerHeight / 2,
    size: 2.5,
    color: COLOR_FLAME,
  });

  y = PAGE_HEIGHT - headerHeight - 48; // generous post-header gap

  // ═══════════════════════════════════════════════════════════════════════════
  // TITLE — "Service Proposal" (elegant, not loud)
  // ═══════════════════════════════════════════════════════════════════════════

  // Small Flame line above title (2px, 40px wide — subtle accent)
  currentPage.drawRectangle({
    x: MARGIN_LEFT,
    y: y + 14,
    width: 56,
    height: 2,
    color: COLOR_FLAME,
  });

  currentPage.drawText(t.serviceProposal, {
    x: MARGIN_LEFT,
    y,
    size: FONT_TITLE,
    font: fontBold,
    color: COLOR_BLACK,
  });
  y -= FONT_TITLE + 6;

  // Project name as subtitle
  currentPage.drawText(data.projectName, {
    x: MARGIN_LEFT,
    y,
    size: FONT_SUBTITLE,
    font: fontRegular,
    color: COLOR_GRAY_TEXT,
  });
  y -= SECTION_GAP;

  // ═══════════════════════════════════════════════════════════════════════════
  // CLIENT INFO BLOCK — gray background panel
  // ═══════════════════════════════════════════════════════════════════════════

  const clientBlockHeight = 60;
  const clientBlockPadding = 16;

  // Gray background rectangle
  currentPage.drawRectangle({
    x: MARGIN_LEFT,
    y: y - clientBlockHeight,
    width: CONTENT_WIDTH,
    height: clientBlockHeight,
    color: COLOR_SECTION_BG,
  });

  // "Prepared for" label
  currentPage.drawText(t.preparedFor, {
    x: MARGIN_LEFT + clientBlockPadding,
    y: y - 22,
    size: FONT_LABEL,
    font: fontRegular,
    color: COLOR_GRAY_LIGHT_TEXT,
  });

  // Contact name + company — bold and prominent
  const clientLine = `${data.contactName}  —  ${data.clientName}`;
  currentPage.drawText(clientLine, {
    x: MARGIN_LEFT + clientBlockPadding,
    y: y - 40,
    size: FONT_CLIENT_NAME,
    font: fontBold,
    color: COLOR_BLACK,
  });

  y -= clientBlockHeight + SECTION_GAP;

  // ═══════════════════════════════════════════════════════════════════════════
  // PURPOSE OF WORK — with Flame accent bar
  // ═══════════════════════════════════════════════════════════════════════════

  currentPage = pageRef.current;
  y = ensureSpace(pageRef, y, 60);
  currentPage = pageRef.current;

  y = drawSectionHeading(currentPage, t.purposeOfWork, y, fontBold);

  const bodyIndent = MARGIN_LEFT + ACCENT_BORDER_OFFSET + ACCENT_BORDER_WIDTH;
  const bodyWidth = CONTENT_WIDTH - ACCENT_BORDER_OFFSET - ACCENT_BORDER_WIDTH;

  y = drawWrappedText(
    pageRef,
    data.description,
    bodyIndent,
    y,
    fontRegular,
    FONT_BODY,
    bodyWidth,
    COLOR_GRAY_TEXT,
    1.6
  );
  y -= SECTION_GAP;

  // ═══════════════════════════════════════════════════════════════════════════
  // SCOPE AND DELIVERABLES — with Flame accent bar
  // ═══════════════════════════════════════════════════════════════════════════

  currentPage = pageRef.current;
  y = ensureSpace(pageRef, y, 60);
  currentPage = pageRef.current;

  y = drawSectionHeading(currentPage, t.scopeAndDeliverables, y, fontBold);

  y = drawWrappedText(
    pageRef,
    data.scope,
    bodyIndent,
    y,
    fontRegular,
    FONT_BODY,
    bodyWidth,
    COLOR_GRAY_TEXT,
    1.6
  );
  y -= SECTION_GAP;

  // ═══════════════════════════════════════════════════════════════════════════
  // PROJECT SCHEDULE — with Flame accent bar
  // ═══════════════════════════════════════════════════════════════════════════

  currentPage = pageRef.current;
  y = ensureSpace(pageRef, y, 80);
  currentPage = pageRef.current;

  y = drawSectionHeading(currentPage, t.projectSchedule, y, fontBold);

  const scheduleItems = t.scheduleItems.map((s) =>
    s.replace("{client}", data.clientName).replace("{date}", data.date)
  );

  for (const item of scheduleItems) {
    currentPage = pageRef.current;
    y = ensureSpace(pageRef, y, 20);
    currentPage = pageRef.current;

    // Bullet point
    currentPage.drawText("\u2022", {
      x: bodyIndent,
      y,
      size: FONT_BODY,
      font: fontRegular,
      color: COLOR_DARK_TEXT,
    });

    // Bullet text
    const bulletTextX = bodyIndent + 14;
    const bulletMaxWidth = bodyWidth - 18;
    y = drawWrappedText(
      pageRef,
      item,
      bulletTextX,
      y,
      fontRegular,
      FONT_BODY,
      bulletMaxWidth,
      COLOR_GRAY_TEXT,
      1.6
    );
    y -= 4;
  }
  y -= TABLE_TOP_GAP;

  // ═══════════════════════════════════════════════════════════════════════════
  // PRICING TABLE — Flame header, alternating rows, black total
  // ═══════════════════════════════════════════════════════════════════════════

  currentPage = pageRef.current;
  y = ensureSpace(pageRef, y, 40);
  currentPage = pageRef.current;

  y = drawSectionHeading(currentPage, t.pricing, y, fontBold, COLOR_FLAME);
  y -= 10;

  // Calculate table dimensions
  const hasVat = data.vatRate !== null && data.vatRate > 0;
  const summaryRowCount = hasVat ? 3 : 1;
  const rowHeight = 34; // slightly taller for breathing room
  const tableHeaderHeight = 34;
  const tableHeight =
    tableHeaderHeight + (data.items.length + summaryRowCount) * rowHeight + 10;

  y = ensureSpace(pageRef, y, tableHeight);
  currentPage = pageRef.current;

  // Column layout: Item 50%, Fixed rate 20%, Qty 10%, Total 20%
  const colItem = CONTENT_WIDTH * 0.5;
  const colRate = CONTENT_WIDTH * 0.2;
  const colQty = CONTENT_WIDTH * 0.1;
  const colTotal = CONTENT_WIDTH * 0.2;

  const tableX = MARGIN_LEFT;
  const colRateX = tableX + colItem;
  const colQtyX = colRateX + colRate;
  const colTotalX = colQtyX + colQty;

  // ── Table header row — Black background (premium, matches website) ──

  currentPage.drawRectangle({
    x: tableX,
    y: y - tableHeaderHeight,
    width: CONTENT_WIDTH,
    height: tableHeaderHeight,
    color: COLOR_BLACK,
  });

  const headerTextY = y - 21;

  currentPage.drawText(t.item.toUpperCase(), {
    x: tableX + 12,
    y: headerTextY,
    size: FONT_TABLE_HEADER,
    font: fontBold,
    color: COLOR_WHITE,
  });
  // Right-align numeric column headers
  const fixedRateLabel = t.fixedRate.toUpperCase();
  const fixedRateLabelW = fontBold.widthOfTextAtSize(fixedRateLabel, FONT_TABLE_HEADER);
  currentPage.drawText(fixedRateLabel, {
    x: colRateX + colRate - 12 - fixedRateLabelW,
    y: headerTextY,
    size: FONT_TABLE_HEADER,
    font: fontBold,
    color: COLOR_WHITE,
  });
  const qtyLabel = t.qty.toUpperCase();
  const qtyLabelW = fontBold.widthOfTextAtSize(qtyLabel, FONT_TABLE_HEADER);
  currentPage.drawText(qtyLabel, {
    x: colQtyX + colQty / 2 - qtyLabelW / 2,
    y: headerTextY,
    size: FONT_TABLE_HEADER,
    font: fontBold,
    color: COLOR_WHITE,
  });
  const totalLabel = t.total.toUpperCase();
  const totalLabelW = fontBold.widthOfTextAtSize(totalLabel, FONT_TABLE_HEADER);
  currentPage.drawText(totalLabel, {
    x: colTotalX + colTotal - 12 - totalLabelW,
    y: headerTextY,
    size: FONT_TABLE_HEADER,
    font: fontBold,
    color: COLOR_WHITE,
  });

  y -= tableHeaderHeight;

  // ── Data rows — alternating white / #f8f8f8 ──

  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i];

    y = ensureSpace(pageRef, y, rowHeight);
    currentPage = pageRef.current;

    // Alternating row background
    if (i % 2 === 1) {
      currentPage.drawRectangle({
        x: tableX,
        y: y - rowHeight,
        width: CONTENT_WIDTH,
        height: rowHeight,
        color: COLOR_SECTION_BG, // #f8f8f8
      });
    }

    // Bottom border
    currentPage.drawLine({
      start: { x: tableX, y: y - rowHeight },
      end: { x: tableX + CONTENT_WIDTH, y: y - rowHeight },
      thickness: 0.5,
      color: COLOR_TABLE_BORDER,
    });

    const cellTextY = y - 21;

    // Item description — truncate if too long
    let desc = item.description;
    const maxDescWidth = colItem - 24;
    while (
      fontRegular.widthOfTextAtSize(desc, FONT_TABLE_CELL) > maxDescWidth &&
      desc.length > 3
    ) {
      desc = desc.slice(0, -4) + "...";
    }

    currentPage.drawText(desc, {
      x: tableX + 12,
      y: cellTextY,
      size: FONT_TABLE_CELL,
      font: fontRegular,
      color: COLOR_DARK_TEXT,
    });

    // Right-aligned monetary columns
    const rateText = formatCurrency(item.unitPrice, data.currency);
    const rateW = fontRegular.widthOfTextAtSize(rateText, FONT_TABLE_CELL);
    currentPage.drawText(rateText, {
      x: colRateX + colRate - 12 - rateW,
      y: cellTextY,
      size: FONT_TABLE_CELL,
      font: fontRegular,
      color: COLOR_DARK_TEXT,
    });

    // Qty centered
    const qtyText = String(item.quantity);
    const qtyW = fontRegular.widthOfTextAtSize(qtyText, FONT_TABLE_CELL);
    currentPage.drawText(qtyText, {
      x: colQtyX + colQty / 2 - qtyW / 2,
      y: cellTextY,
      size: FONT_TABLE_CELL,
      font: fontRegular,
      color: COLOR_DARK_TEXT,
    });

    // Total column — bold, right-aligned
    const itemTotalText = formatCurrency(item.total, data.currency);
    const itemTotalW = fontBold.widthOfTextAtSize(itemTotalText, FONT_TABLE_CELL);
    currentPage.drawText(itemTotalText, {
      x: colTotalX + colTotal - 12 - itemTotalW,
      y: cellTextY,
      size: FONT_TABLE_CELL,
      font: fontBold,
      color: COLOR_DARK_TEXT,
    });

    y -= rowHeight;
  }

  // ── Summary rows (Subtotal / VAT / Total) ──

  if (hasVat) {
    const vatAmount = data.totalAmount * (data.vatRate! / 100);
    const totalWithVat = data.totalAmount + vatAmount;

    // Subtotal row — light gray bg
    y = ensureSpace(pageRef, y, rowHeight);
    currentPage = pageRef.current;

    currentPage.drawRectangle({
      x: tableX,
      y: y - rowHeight,
      width: CONTENT_WIDTH,
      height: rowHeight,
      color: COLOR_SECTION_BG,
    });
    currentPage.drawLine({
      start: { x: tableX, y: y - rowHeight },
      end: { x: tableX + CONTENT_WIDTH, y: y - rowHeight },
      thickness: 0.5,
      color: COLOR_TABLE_BORDER,
    });

    const subtotalTextY = y - 21;
    currentPage.drawText(t.subtotal, {
      x: tableX + 12,
      y: subtotalTextY,
      size: FONT_TABLE_CELL,
      font: fontBold,
      color: COLOR_DARK_TEXT,
    });
    const subtotalAmtText = formatCurrency(data.totalAmount, data.currency);
    const subtotalAmtW = fontBold.widthOfTextAtSize(subtotalAmtText, FONT_TABLE_CELL);
    currentPage.drawText(subtotalAmtText, {
      x: colTotalX + colTotal - 12 - subtotalAmtW,
      y: subtotalTextY,
      size: FONT_TABLE_CELL,
      font: fontBold,
      color: COLOR_DARK_TEXT,
    });
    y -= rowHeight;

    // VAT row — white bg, gray text
    y = ensureSpace(pageRef, y, rowHeight);
    currentPage = pageRef.current;

    currentPage.drawLine({
      start: { x: tableX, y: y - rowHeight },
      end: { x: tableX + CONTENT_WIDTH, y: y - rowHeight },
      thickness: 0.5,
      color: COLOR_TABLE_BORDER,
    });

    const vatTextY = y - 21;
    currentPage.drawText(`${t.vat} (${data.vatRate}%)`, {
      x: tableX + 12,
      y: vatTextY,
      size: FONT_TABLE_CELL,
      font: fontRegular,
      color: COLOR_GRAY_TEXT,
    });
    const vatAmtText = formatCurrency(vatAmount, data.currency);
    const vatAmtW = fontRegular.widthOfTextAtSize(vatAmtText, FONT_TABLE_CELL);
    currentPage.drawText(vatAmtText, {
      x: colTotalX + colTotal - 12 - vatAmtW,
      y: vatTextY,
      size: FONT_TABLE_CELL,
      font: fontRegular,
      color: COLOR_GRAY_TEXT,
    });
    y -= rowHeight;

    // Total row — black bg, white text
    y = ensureSpace(pageRef, y, rowHeight);
    currentPage = pageRef.current;

    currentPage.drawRectangle({
      x: tableX,
      y: y - rowHeight,
      width: CONTENT_WIDTH,
      height: rowHeight,
      color: COLOR_BLACK,
    });

    const totalTextY = y - 21;
    currentPage.drawText(t.total, {
      x: tableX + 12,
      y: totalTextY,
      size: FONT_TABLE_CELL,
      font: fontBold,
      color: COLOR_WHITE,
    });
    const totalWithVatText = formatCurrency(totalWithVat, data.currency);
    const totalWithVatW = fontBold.widthOfTextAtSize(totalWithVatText, FONT_TABLE_CELL);
    currentPage.drawText(totalWithVatText, {
      x: colTotalX + colTotal - 12 - totalWithVatW,
      y: totalTextY,
      size: FONT_TABLE_CELL,
      font: fontBold,
      color: COLOR_WHITE,
    });
    y -= rowHeight;
  } else {
    // No VAT — single total row with black bg
    y = ensureSpace(pageRef, y, rowHeight);
    currentPage = pageRef.current;

    currentPage.drawRectangle({
      x: tableX,
      y: y - rowHeight,
      width: CONTENT_WIDTH,
      height: rowHeight,
      color: COLOR_BLACK,
    });

    const totalTextY = y - 21;
    currentPage.drawText(t.total, {
      x: tableX + 12,
      y: totalTextY,
      size: FONT_TABLE_CELL,
      font: fontBold,
      color: COLOR_WHITE,
    });
    const noVatTotalText = formatCurrency(data.totalAmount, data.currency);
    const noVatTotalW = fontBold.widthOfTextAtSize(noVatTotalText, FONT_TABLE_CELL);
    currentPage.drawText(noVatTotalText, {
      x: colTotalX + colTotal - 12 - noVatTotalW,
      y: totalTextY,
      size: FONT_TABLE_CELL,
      font: fontBold,
      color: COLOR_WHITE,
    });
    y -= rowHeight;
  }

  y -= SECTION_GAP;

  // ═══════════════════════════════════════════════════════════════════════════
  // REFERENCES — gray background panel, more discrete
  // ═══════════════════════════════════════════════════════════════════════════

  y = ensureSpace(pageRef, y, 130);
  currentPage = pageRef.current;

  // Thin separator
  drawSeparator(currentPage, y);
  y -= SECTION_GAP;

  // Compute references text height for background block
  const refLines = wrapText(
    t.referencesText,
    fontRegular,
    FONT_FOOTER + 1,
    CONTENT_WIDTH - 28
  );
  const refBlockHeight = refLines.length * (FONT_FOOTER + 1) * 1.6 + 48;

  // Gray background for entire references section
  currentPage.drawRectangle({
    x: MARGIN_LEFT,
    y: y - refBlockHeight,
    width: CONTENT_WIDTH,
    height: refBlockHeight,
    color: COLOR_SECTION_BG,
  });

  // "References" heading inside the block
  const refHeadingY = y - 20;
  currentPage.drawText(t.references, {
    x: MARGIN_LEFT + 14,
    y: refHeadingY,
    size: FONT_SECTION_HEADING,
    font: fontBold,
    color: COLOR_DARK_TEXT,
  });

  // References body text
  const refTextStartY = refHeadingY - HEADING_TO_CONTENT - 6;
  const refEndY = drawWrappedText(
    pageRef,
    t.referencesText,
    MARGIN_LEFT + 14,
    refTextStartY,
    fontRegular,
    FONT_FOOTER + 1, // 9pt
    CONTENT_WIDTH - 28,
    COLOR_GRAY_TEXT,
    1.6
  );
  y = Math.min(y - refBlockHeight, refEndY) - 8;
  y -= SECTION_GAP;

  // ═══════════════════════════════════════════════════════════════════════════
  // PAYMENT TERMS — small print
  // ═══════════════════════════════════════════════════════════════════════════

  y = ensureSpace(pageRef, y, 80);
  currentPage = pageRef.current;

  for (const rawTerm of t.paymentTerms) {
    const term = rawTerm.replace(
      "{days}",
      String(data.paymentTermsDays ?? 45)
    );
    currentPage = pageRef.current;
    y = ensureSpace(pageRef, y, 16);
    currentPage = pageRef.current;

    currentPage.drawText(term, {
      x: MARGIN_LEFT,
      y,
      size: FONT_FOOTER,
      font: fontRegular,
      color: COLOR_GRAY_LIGHT_TEXT,
    });
    y -= 14;
  }
  y -= SECTION_GAP;

  // ═══════════════════════════════════════════════════════════════════════════
  // SIGNATURE — right-aligned, premium feel
  // ═══════════════════════════════════════════════════════════════════════════

  y = ensureSpace(pageRef, y, 60);
  currentPage = pageRef.current;

  // Small Flame accent line before signature
  const sigLineWidth = 40;
  currentPage.drawRectangle({
    x: PAGE_WIDTH - MARGIN_RIGHT - sigLineWidth,
    y: y + 8,
    width: sigLineWidth,
    height: 2,
    color: COLOR_FLAME,
  });

  const regardsText = t.bestRegards;
  const regardsWidth = fontRegular.widthOfTextAtSize(regardsText, FONT_BODY);
  currentPage.drawText(regardsText, {
    x: PAGE_WIDTH - MARGIN_RIGHT - regardsWidth,
    y,
    size: FONT_BODY,
    font: fontRegular,
    color: COLOR_DARK_TEXT,
  });
  y -= 20;

  const sigName = data.signatoryName ?? "Emmanuel Gomez";
  const sigTitle = data.signatoryTitle ?? "CEO";
  const signatureName = `${sigName}, ${sigTitle}, Sarani`;
  const signatureWidth = fontBold.widthOfTextAtSize(signatureName, FONT_BODY);
  currentPage.drawText(signatureName, {
    x: PAGE_WIDTH - MARGIN_RIGHT - signatureWidth,
    y,
    size: FONT_BODY,
    font: fontBold,
    color: COLOR_BLACK,
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SERIALIZE
  // ═══════════════════════════════════════════════════════════════════════════

  const pdfBytes = await doc.save();
  return new Uint8Array(pdfBytes);
}
