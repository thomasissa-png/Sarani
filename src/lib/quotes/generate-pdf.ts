// ─── Quote PDF Generator ─────────────────────────────────────────────────────
// Generates a professional-looking quote PDF using pdf-lib (no Puppeteer).
// Template based on real Sarani DOCX analysis (TikTok reference quote).

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
}

// ─── Translations ────────────────────────────────────────────────────────────

const TRANSLATIONS = {
  en: {
    serviceProposal: "Service Proposal",
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
    referencesText: "Sarani is a Paris-born creative agency uniting 35 experts across 5 continents and 18 languages. We operate 24/7 to deliver unlimited creativity with next-day turnaround. Our clients include Sony, TikTok, Adidas, GEODIS, Pernod Ricard, L'Oréal, Air Corsica, and PICO. We have been recognized for our work across multiple awards and industry benchmarks.",
    paymentTerms: [
      "Work commences once a PO is raised.",
      "Unlimited rounds of revisions are offered before filming and on post-production.",
      "Payment terms are 45 days.",
    ],
    bestRegards: "Best regards,",
    validUntil: "Valid until",
  },
  fr: {
    serviceProposal: "Proposition de service",
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
    referencesText: "Sarani est une agence créative internationale réunissant 35 experts sur 5 continents et 18 langues. Nous opérons 24h/24 pour livrer une créativité illimitée avec un délai de livraison J+1. Nos clients incluent Sony, TikTok, Adidas, GEODIS, Pernod Ricard, L'Oréal, Air Corsica et PICO. Nous avons été reconnus pour notre travail à travers de nombreux prix et benchmarks sectoriels.",
    paymentTerms: [
      "Les travaux démarrent à réception du bon de commande (PO).",
      "Nombre illimité de révisions inclus avant tournage et en post-production.",
      "Conditions de paiement : 45 jours.",
    ],
    bestRegards: "Cordialement,",
    validUntil: "Valable jusqu'au",
  },
} as const;

// ─── Constants ──────────────────────────────────────────────────────────────

const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89;
const MARGIN_LEFT = 60;
const MARGIN_RIGHT = 60;
const MARGIN_TOP = 50;
const MARGIN_BOTTOM = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

// Colors
const COLOR_BLACK = rgb(0.1, 0.1, 0.1);
const COLOR_GRAY = rgb(0.4, 0.4, 0.4);
const COLOR_LIGHT_GRAY = rgb(0.93, 0.93, 0.93); // #ededed — subtotal/total row bg
const COLOR_ROW_ALT = rgb(0.976, 0.976, 0.976); // #f9f9f9 — alternating rows
const COLOR_TABLE_BORDER = rgb(0.878, 0.878, 0.878); // #e0e0e0
const COLOR_TABLE_HEADER = rgb(0, 0, 0); // pure black header
const COLOR_WHITE = rgb(1, 1, 1);
const COLOR_SEPARATOR = rgb(0.82, 0.82, 0.82); // #d1d1d1

// Font sizes — unified hierarchy
const FONT_TITLE = 28;
const FONT_SUBTITLE = 12;
const FONT_SECTION_HEADING = 14;
const FONT_BODY = 10;
const FONT_TABLE_HEADER = 9;
const FONT_TABLE_CELL = 10;
const FONT_FOOTER = 8;
const FONT_INTRO = 10;

// Spacing
const SECTION_GAP = 30; // minimum gap between sections
const HEADING_TO_CONTENT = 15; // gap between heading and content
const TABLE_TOP_GAP = 40; // gap before pricing table

// REFERENCES_TEXT and PAYMENT_TERMS moved to TRANSLATIONS above

// ─── Logo Cache ─────────────────────────────────────────────────────────────

let cachedLogoPng: Uint8Array | null = null;

function getLogoPng(): Uint8Array | null {
  if (cachedLogoPng) return cachedLogoPng;
  try {
    const logoPath = path.join(process.cwd(), "public", "sarani-logo-black.png");
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
 * Draw wrapped text, returning the new Y position after drawing.
 * Adds a new page if needed.
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
  lineSpacing: number = 1.5
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
  // Use Helvetica (built-in, universally supported, no font file dependency)
  // Note: Outfit (brand font) is woff2-only and pdf-lib doesn't support woff2 natively.
  // To use Outfit in PDFs, .ttf files would need to be added to public/fonts/.
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const t = TRANSLATIONS[data.language ?? "en"];

  let currentPage = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const pageRef: PageRef = { current: currentPage, doc };
  let y = PAGE_HEIGHT - MARGIN_TOP;

  // ═══════════════════════════════════════════════════════════════════════════
  // HEADER: Logo (left) + Date & Quote Number (right)
  // ═══════════════════════════════════════════════════════════════════════════

  const logoPng = getLogoPng();
  let logoBottomY = y;

  if (logoPng) {
    try {
      const logoImage = await doc.embedPng(logoPng);
      const logoScale = 80 / logoImage.width;
      const logoWidth = logoImage.width * logoScale;
      const logoHeight = logoImage.height * logoScale;
      currentPage.drawImage(logoImage, {
        x: MARGIN_LEFT,
        y: y - logoHeight + 10,
        width: logoWidth,
        height: logoHeight,
      });
      logoBottomY = y - logoHeight;
    } catch {
      // Logo embed failed — continue without it
    }
  }

  // Date (right-aligned, top)
  const dateText = data.date;
  const dateWidth = fontRegular.widthOfTextAtSize(dateText, FONT_BODY);
  currentPage.drawText(dateText, {
    x: PAGE_WIDTH - MARGIN_RIGHT - dateWidth,
    y,
    size: FONT_BODY,
    font: fontRegular,
    color: COLOR_GRAY,
  });

  // Quote number (right-aligned, below date)
  const qnWidth = fontBold.widthOfTextAtSize(data.quoteNumber, FONT_BODY);
  currentPage.drawText(data.quoteNumber, {
    x: PAGE_WIDTH - MARGIN_RIGHT - qnWidth,
    y: y - 16,
    size: FONT_BODY,
    font: fontBold,
    color: COLOR_BLACK,
  });

  // Valid until (right-aligned, below quote number)
  let headerBottomOffset = 32;
  if (data.validUntil) {
    const validDate = new Date(data.validUntil + "T00:00:00");
    const locale = data.language === "fr" ? "fr-FR" : "en-US";
    const validText = `${t.validUntil} : ${validDate.toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" })}`;
    const validWidth = fontRegular.widthOfTextAtSize(validText, FONT_BODY);
    currentPage.drawText(validText, {
      x: PAGE_WIDTH - MARGIN_RIGHT - validWidth,
      y: y - 32,
      size: FONT_BODY,
      font: fontRegular,
      color: COLOR_GRAY,
    });
    headerBottomOffset = 48;
  }

  y = Math.min(logoBottomY, y - headerBottomOffset) - 15;

  // Separator between header and body
  drawSeparator(currentPage, y);
  y -= SECTION_GAP;

  // ═══════════════════════════════════════════════════════════════════════════
  // TITLE
  // ═══════════════════════════════════════════════════════════════════════════

  currentPage.drawText(t.serviceProposal, {
    x: MARGIN_LEFT,
    y,
    size: FONT_TITLE,
    font: fontBold,
    color: COLOR_BLACK,
  });
  y -= FONT_TITLE + 6;

  currentPage.drawText(data.projectName, {
    x: MARGIN_LEFT,
    y,
    size: FONT_SUBTITLE,
    font: fontRegular,
    color: COLOR_GRAY,
  });
  y -= SECTION_GAP;

  // ═══════════════════════════════════════════════════════════════════════════
  // INTRODUCTION
  // ═══════════════════════════════════════════════════════════════════════════

  const introText = `${t.proposalFor} ${data.contactName} ${t.at} ${data.clientName}.`;
  y = drawWrappedText(
    pageRef,
    introText,
    MARGIN_LEFT,
    y,
    fontRegular,
    FONT_INTRO,
    CONTENT_WIDTH,
    COLOR_BLACK
  );
  y -= SECTION_GAP;

  // ═══════════════════════════════════════════════════════════════════════════
  // PURPOSE OF WORK
  // ═══════════════════════════════════════════════════════════════════════════

  currentPage = pageRef.current;
  y = ensureSpace(pageRef, y, 60);
  currentPage = pageRef.current;

  currentPage.drawText(t.purposeOfWork, {
    x: MARGIN_LEFT,
    y,
    size: FONT_SECTION_HEADING,
    font: fontBold,
    color: COLOR_BLACK,
  });
  y -= HEADING_TO_CONTENT + FONT_SECTION_HEADING;

  y = drawWrappedText(
    pageRef,
    data.description,
    MARGIN_LEFT,
    y,
    fontRegular,
    FONT_BODY,
    CONTENT_WIDTH,
    COLOR_GRAY,
    1.5
  );
  y -= SECTION_GAP;

  // ═══════════════════════════════════════════════════════════════════════════
  // SCOPE AND DELIVERABLES
  // ═══════════════════════════════════════════════════════════════════════════

  currentPage = pageRef.current;
  y = ensureSpace(pageRef, y, 60);
  currentPage = pageRef.current;

  currentPage.drawText(t.scopeAndDeliverables, {
    x: MARGIN_LEFT,
    y,
    size: FONT_SECTION_HEADING,
    font: fontBold,
    color: COLOR_BLACK,
  });
  y -= HEADING_TO_CONTENT + FONT_SECTION_HEADING;

  y = drawWrappedText(
    pageRef,
    data.scope,
    MARGIN_LEFT,
    y,
    fontRegular,
    FONT_BODY,
    CONTENT_WIDTH,
    COLOR_GRAY,
    1.5
  );
  y -= SECTION_GAP;

  // ═══════════════════════════════════════════════════════════════════════════
  // PROJECT SCHEDULE
  // ═══════════════════════════════════════════════════════════════════════════

  currentPage = pageRef.current;
  y = ensureSpace(pageRef, y, 80);
  currentPage = pageRef.current;

  currentPage.drawText(t.projectSchedule, {
    x: MARGIN_LEFT,
    y,
    size: FONT_SECTION_HEADING,
    font: fontBold,
    color: COLOR_BLACK,
  });
  y -= HEADING_TO_CONTENT + FONT_SECTION_HEADING;

  const scheduleItems = t.scheduleItems.map((s) =>
    s.replace("{client}", data.clientName).replace("{date}", data.date)
  );

  for (const item of scheduleItems) {
    currentPage = pageRef.current;
    y = ensureSpace(pageRef, y, 20);
    currentPage = pageRef.current;

    // Bullet point with proper indentation
    currentPage.drawText("\u2022", {
      x: MARGIN_LEFT + 8,
      y,
      size: FONT_BODY,
      font: fontRegular,
      color: COLOR_GRAY,
    });

    // Wrap the bullet text with indentation
    const bulletTextX = MARGIN_LEFT + 22;
    const bulletMaxWidth = CONTENT_WIDTH - 22;
    y = drawWrappedText(
      pageRef,
      item,
      bulletTextX,
      y,
      fontRegular,
      FONT_BODY,
      bulletMaxWidth,
      COLOR_GRAY,
      1.5
    );
    y -= 4; // small gap between bullets
  }
  y -= TABLE_TOP_GAP;

  // ═══════════════════════════════════════════════════════════════════════════
  // PRICING TABLE
  // ═══════════════════════════════════════════════════════════════════════════

  currentPage = pageRef.current;

  currentPage = pageRef.current;
  y = ensureSpace(pageRef, y, 40);
  currentPage = pageRef.current;

  currentPage.drawText(t.pricing, {
    x: MARGIN_LEFT,
    y,
    size: FONT_SECTION_HEADING,
    font: fontBold,
    color: COLOR_BLACK,
  });
  y -= HEADING_TO_CONTENT + FONT_SECTION_HEADING + 10;

  // Calculate how many summary rows we need (subtotal + vat + total, or just total)
  const hasVat = data.vatRate !== null && data.vatRate > 0;
  const summaryRowCount = hasVat ? 3 : 1; // subtotal + vat + total, or just total
  const rowHeight = 32; // 12pt padding top + ~10pt text + 12pt padding bottom ≈ 32pt
  const headerHeight = 32;
  const tableHeight = headerHeight + (data.items.length + summaryRowCount) * rowHeight + 10;

  y = ensureSpace(pageRef, y, tableHeight);
  currentPage = pageRef.current;

  // Column layout: Item 50%, Fixed rate 20%, Qty 10%, Total 20%
  const colItem = CONTENT_WIDTH * 0.50;
  const colRate = CONTENT_WIDTH * 0.20;
  const colQty = CONTENT_WIDTH * 0.10;
  const colTotal = CONTENT_WIDTH * 0.20;

  const tableX = MARGIN_LEFT;
  const colRateX = tableX + colItem;
  const colQtyX = colRateX + colRate;
  const colTotalX = colQtyX + colQty;

  // ── Table header row ──

  currentPage.drawRectangle({
    x: tableX,
    y: y - headerHeight,
    width: CONTENT_WIDTH,
    height: headerHeight,
    color: COLOR_TABLE_HEADER, // pure black
  });

  const headerTextY = y - 20; // vertically centered in 32pt row

  currentPage.drawText(t.item.toUpperCase(), {
    x: tableX + 10,
    y: headerTextY,
    size: FONT_TABLE_HEADER,
    font: fontBold,
    color: COLOR_WHITE,
  });
  currentPage.drawText(t.fixedRate.toUpperCase(), {
    x: colRateX + 10,
    y: headerTextY,
    size: FONT_TABLE_HEADER,
    font: fontBold,
    color: COLOR_WHITE,
  });
  currentPage.drawText(t.qty.toUpperCase(), {
    x: colQtyX + 10,
    y: headerTextY,
    size: FONT_TABLE_HEADER,
    font: fontBold,
    color: COLOR_WHITE,
  });
  currentPage.drawText(t.total.toUpperCase(), {
    x: colTotalX + 10,
    y: headerTextY,
    size: FONT_TABLE_HEADER,
    font: fontBold,
    color: COLOR_WHITE,
  });

  y -= headerHeight;

  // ── Data rows ──

  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i];

    y = ensureSpace(pageRef, y, rowHeight);
    currentPage = pageRef.current;

    // Alternating row background: even = white (no fill), odd = #f9f9f9
    if (i % 2 === 1) {
      currentPage.drawRectangle({
        x: tableX,
        y: y - rowHeight,
        width: CONTENT_WIDTH,
        height: rowHeight,
        color: COLOR_ROW_ALT,
      });
    }

    // Bottom border
    currentPage.drawLine({
      start: { x: tableX, y: y - rowHeight },
      end: { x: tableX + CONTENT_WIDTH, y: y - rowHeight },
      thickness: 0.5,
      color: COLOR_TABLE_BORDER,
    });

    const cellTextY = y - 20; // vertically centered

    // Item description — truncate if too long
    let desc = item.description;
    const maxDescWidth = colItem - 20;
    while (fontRegular.widthOfTextAtSize(desc, FONT_TABLE_CELL) > maxDescWidth && desc.length > 3) {
      desc = desc.slice(0, -4) + "...";
    }

    currentPage.drawText(desc, {
      x: tableX + 10,
      y: cellTextY,
      size: FONT_TABLE_CELL,
      font: fontRegular,
      color: COLOR_BLACK,
    });

    currentPage.drawText(formatCurrency(item.unitPrice, data.currency), {
      x: colRateX + 10,
      y: cellTextY,
      size: FONT_TABLE_CELL,
      font: fontRegular,
      color: COLOR_BLACK,
    });

    currentPage.drawText(String(item.quantity), {
      x: colQtyX + 10,
      y: cellTextY,
      size: FONT_TABLE_CELL,
      font: fontRegular,
      color: COLOR_BLACK,
    });

    currentPage.drawText(formatCurrency(item.total, data.currency), {
      x: colTotalX + 10,
      y: cellTextY,
      size: FONT_TABLE_CELL,
      font: fontBold,
      color: COLOR_BLACK,
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
      color: COLOR_LIGHT_GRAY, // #f0f0f0
    });
    currentPage.drawLine({
      start: { x: tableX, y: y - rowHeight },
      end: { x: tableX + CONTENT_WIDTH, y: y - rowHeight },
      thickness: 0.5,
      color: COLOR_TABLE_BORDER,
    });

    const subtotalTextY = y - 20;
    currentPage.drawText(t.subtotal, {
      x: tableX + 10,
      y: subtotalTextY,
      size: FONT_TABLE_CELL,
      font: fontBold,
      color: COLOR_BLACK,
    });
    currentPage.drawText(formatCurrency(data.totalAmount, data.currency), {
      x: colTotalX + 10,
      y: subtotalTextY,
      size: FONT_TABLE_CELL,
      font: fontBold,
      color: COLOR_BLACK,
    });
    y -= rowHeight;

    // VAT row — white bg
    y = ensureSpace(pageRef, y, rowHeight);
    currentPage = pageRef.current;

    currentPage.drawLine({
      start: { x: tableX, y: y - rowHeight },
      end: { x: tableX + CONTENT_WIDTH, y: y - rowHeight },
      thickness: 0.5,
      color: COLOR_TABLE_BORDER,
    });

    const vatTextY = y - 20;
    currentPage.drawText(`${t.vat} (${data.vatRate}%)`, {
      x: tableX + 10,
      y: vatTextY,
      size: FONT_TABLE_CELL,
      font: fontRegular,
      color: COLOR_GRAY,
    });
    currentPage.drawText(formatCurrency(vatAmount, data.currency), {
      x: colTotalX + 10,
      y: vatTextY,
      size: FONT_TABLE_CELL,
      font: fontRegular,
      color: COLOR_GRAY,
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
      color: COLOR_TABLE_HEADER, // pure black
    });

    const totalTextY = y - 20;
    currentPage.drawText(t.total, {
      x: tableX + 10,
      y: totalTextY,
      size: FONT_TABLE_CELL,
      font: fontBold,
      color: COLOR_WHITE,
    });
    currentPage.drawText(formatCurrency(totalWithVat, data.currency), {
      x: colTotalX + 10,
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
      color: COLOR_TABLE_HEADER, // pure black
    });

    const totalTextY = y - 20;
    currentPage.drawText(t.total, {
      x: tableX + 10,
      y: totalTextY,
      size: FONT_TABLE_CELL,
      font: fontBold,
      color: COLOR_WHITE,
    });
    currentPage.drawText(formatCurrency(data.totalAmount, data.currency), {
      x: colTotalX + 10,
      y: totalTextY,
      size: FONT_TABLE_CELL,
      font: fontBold,
      color: COLOR_WHITE,
    });
    y -= rowHeight;
  }

  y -= SECTION_GAP;

  // ═══════════════════════════════════════════════════════════════════════════
  // REFERENCES
  // ═══════════════════════════════════════════════════════════════════════════

  y = ensureSpace(pageRef, y, 120);
  currentPage = pageRef.current;

  // Separator before references
  drawSeparator(currentPage, y);
  y -= SECTION_GAP;

  currentPage.drawText(t.references, {
    x: MARGIN_LEFT,
    y,
    size: FONT_SECTION_HEADING,
    font: fontBold,
    color: COLOR_BLACK,
  });
  y -= HEADING_TO_CONTENT + FONT_SECTION_HEADING;

  y = drawWrappedText(
    pageRef,
    t.referencesText,
    MARGIN_LEFT,
    y,
    fontRegular,
    FONT_FOOTER + 1, // 9pt
    CONTENT_WIDTH,
    COLOR_GRAY,
    1.5
  );
  y -= SECTION_GAP;

  // ═══════════════════════════════════════════════════════════════════════════
  // PAYMENT TERMS
  // ═══════════════════════════════════════════════════════════════════════════

  y = ensureSpace(pageRef, y, 80);
  currentPage = pageRef.current;

  for (const term of t.paymentTerms) {
    currentPage = pageRef.current;
    y = ensureSpace(pageRef, y, 16);
    currentPage = pageRef.current;

    currentPage.drawText(term, {
      x: MARGIN_LEFT,
      y,
      size: FONT_FOOTER,
      font: fontRegular,
      color: COLOR_GRAY,
    });
    y -= 14;
  }
  y -= SECTION_GAP;

  // ═══════════════════════════════════════════════════════════════════════════
  // SIGNATURE — right-aligned
  // ═══════════════════════════════════════════════════════════════════════════

  y = ensureSpace(pageRef, y, 60);
  currentPage = pageRef.current;

  const regardsText = t.bestRegards;
  const regardsWidth = fontRegular.widthOfTextAtSize(regardsText, FONT_BODY);
  currentPage.drawText(regardsText, {
    x: PAGE_WIDTH - MARGIN_RIGHT - regardsWidth,
    y,
    size: FONT_BODY,
    font: fontRegular,
    color: COLOR_BLACK,
  });
  y -= 18;

  const signatureName = "Emmanuel Gomez, CEO, Sarani";
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
