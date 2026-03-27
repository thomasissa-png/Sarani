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
      "Sarani is a Paris-born creative agency uniting 35 experts across 5 continents and 18 languages. We operate 24/7 to deliver unlimited creativity with next-day turnaround. Our clients include Sony, TikTok, Adidas, GEODIS, Pernod Ricard, L'Oréal, Air Corsica, and PICO. We have been recognized for our work across multiple awards and industry benchmarks.",
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
const MARGIN_LEFT = 60;
const MARGIN_RIGHT = 60;
const MARGIN_TOP = 50;
const MARGIN_BOTTOM = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

// Brand Colors — Sarani palette
const COLOR_FLAME = rgb(0.855, 0.318, 0.149); // #da5126
const COLOR_BLACK = rgb(0, 0, 0); // #000000
const COLOR_DARK_TEXT = rgb(0.1, 0.1, 0.1); // near-black for body text
const COLOR_GRAY_TEXT = rgb(0.4, 0.4, 0.4); // #666666 — secondary labels
const COLOR_GRAY_LIGHT_TEXT = rgb(0.55, 0.55, 0.55); // lighter gray for subtle info
const COLOR_SECTION_BG = rgb(0.973, 0.973, 0.973); // #f8f8f8 — section backgrounds
const COLOR_ROW_ALT = rgb(0.976, 0.976, 0.976); // #f9f9f9 — alternating rows
const COLOR_TABLE_BORDER = rgb(0.878, 0.878, 0.878); // #e0e0e0
const COLOR_WHITE = rgb(1, 1, 1);
const COLOR_SEPARATOR = rgb(0.85, 0.85, 0.85); // #d9d9d9

// Font sizes — strong typographic hierarchy
const FONT_TITLE = 28;
const FONT_SUBTITLE = 13;
const FONT_SECTION_HEADING = 13;
const FONT_BODY = 10;
const FONT_TABLE_HEADER = 9;
const FONT_TABLE_CELL = 10;
const FONT_FOOTER = 8;
const FONT_LABEL = 8;
const FONT_CLIENT_NAME = 14;
const FONT_QUOTE_NUMBER = 11;

// Spacing — generous for premium feel
const SECTION_GAP = 32;
const HEADING_TO_CONTENT = 14;
const TABLE_TOP_GAP = 40;
const ACCENT_BORDER_WIDTH = 3; // Flame accent bar for headings
const ACCENT_BORDER_OFFSET = 10; // Left offset from heading text

// ─── Logo Cache ─────────────────────────────────────────────────────────────

let cachedLogoPng: Uint8Array | null = null;

function getLogoPng(): Uint8Array | null {
  if (cachedLogoPng) return cachedLogoPng;
  try {
    const logoPath = path.join(
      process.cwd(),
      "public",
      "sarani-logo-black.png"
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
  font: PDFFont
): number {
  // Flame accent bar — 3pt wide, aligned with text height
  page.drawRectangle({
    x: MARGIN_LEFT,
    y: y - 2,
    width: ACCENT_BORDER_WIDTH,
    height: FONT_SECTION_HEADING + 4,
    color: COLOR_FLAME,
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
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const t = TRANSLATIONS[data.language ?? "en"];

  let currentPage = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const pageRef: PageRef = { current: currentPage, doc };
  let y = PAGE_HEIGHT - MARGIN_TOP;

  // ═══════════════════════════════════════════════════════════════════════════
  // HEADER: Logo (left) + Quote Number & Date (right)
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

  // Quote number (right-aligned, top — prominent)
  const qnWidth = fontBold.widthOfTextAtSize(
    data.quoteNumber,
    FONT_QUOTE_NUMBER
  );
  currentPage.drawText(data.quoteNumber, {
    x: PAGE_WIDTH - MARGIN_RIGHT - qnWidth,
    y,
    size: FONT_QUOTE_NUMBER,
    font: fontBold,
    color: COLOR_BLACK,
  });

  // Date (right-aligned, below quote number)
  const dateText = data.date;
  const dateWidth = fontRegular.widthOfTextAtSize(dateText, FONT_BODY);
  currentPage.drawText(dateText, {
    x: PAGE_WIDTH - MARGIN_RIGHT - dateWidth,
    y: y - 18,
    size: FONT_BODY,
    font: fontRegular,
    color: COLOR_GRAY_TEXT,
  });

  // Valid until (right-aligned, below date — subtle gray)
  let headerBottomOffset = 36;
  if (data.validUntil) {
    const validDate = new Date(data.validUntil + "T00:00:00");
    const locale = data.language === "fr" ? "fr-FR" : "en-US";
    const validText = `${t.validUntil} : ${validDate.toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" })}`;
    const validWidth = fontRegular.widthOfTextAtSize(validText, FONT_LABEL);
    currentPage.drawText(validText, {
      x: PAGE_WIDTH - MARGIN_RIGHT - validWidth,
      y: y - 34,
      size: FONT_LABEL,
      font: fontRegular,
      color: COLOR_GRAY_LIGHT_TEXT,
    });
    headerBottomOffset = 50;
  }

  y = Math.min(logoBottomY, y - headerBottomOffset) - 8;

  // ── Flame accent bar — full width, 2pt ──
  currentPage.drawRectangle({
    x: MARGIN_LEFT,
    y: y,
    width: CONTENT_WIDTH,
    height: 2,
    color: COLOR_FLAME,
  });
  y -= SECTION_GAP;

  // ═══════════════════════════════════════════════════════════════════════════
  // TITLE — "Service Proposal"
  // ═══════════════════════════════════════════════════════════════════════════

  currentPage.drawText(t.serviceProposal, {
    x: MARGIN_LEFT,
    y,
    size: FONT_TITLE,
    font: fontBold,
    color: COLOR_BLACK,
  });
  y -= FONT_TITLE + 8;

  // Project name as subtitle
  currentPage.drawText(data.projectName, {
    x: MARGIN_LEFT,
    y,
    size: FONT_SUBTITLE,
    font: fontRegular,
    color: COLOR_GRAY_TEXT,
  });
  y -= SECTION_GAP + 4;

  // ═══════════════════════════════════════════════════════════════════════════
  // CLIENT INFO BLOCK — gray background panel
  // ═══════════════════════════════════════════════════════════════════════════

  const clientBlockHeight = 52;
  const clientBlockPadding = 14;

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
    y: y - 18,
    size: FONT_LABEL,
    font: fontRegular,
    color: COLOR_GRAY_LIGHT_TEXT,
  });

  // Contact name + company — bold and prominent
  const clientLine = `${data.contactName}  —  ${data.clientName}`;
  currentPage.drawText(clientLine, {
    x: MARGIN_LEFT + clientBlockPadding,
    y: y - 36,
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
      x: bodyIndent + 4,
      y,
      size: FONT_BODY,
      font: fontRegular,
      color: COLOR_FLAME, // Flame-colored bullets for brand touch
    });

    // Bullet text
    const bulletTextX = bodyIndent + 18;
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

  y = drawSectionHeading(currentPage, t.pricing, y, fontBold);
  y -= 10;

  // Calculate table dimensions
  const hasVat = data.vatRate !== null && data.vatRate > 0;
  const summaryRowCount = hasVat ? 3 : 1;
  const rowHeight = 34; // slightly taller for breathing room
  const headerHeight = 34;
  const tableHeight =
    headerHeight + (data.items.length + summaryRowCount) * rowHeight + 10;

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

  // ── Table header row — Flame background ──

  currentPage.drawRectangle({
    x: tableX,
    y: y - headerHeight,
    width: CONTENT_WIDTH,
    height: headerHeight,
    color: COLOR_FLAME,
  });

  const headerTextY = y - 21;

  currentPage.drawText(t.item.toUpperCase(), {
    x: tableX + 12,
    y: headerTextY,
    size: FONT_TABLE_HEADER,
    font: fontBold,
    color: COLOR_WHITE,
  });
  currentPage.drawText(t.fixedRate.toUpperCase(), {
    x: colRateX + 12,
    y: headerTextY,
    size: FONT_TABLE_HEADER,
    font: fontBold,
    color: COLOR_WHITE,
  });
  currentPage.drawText(t.qty.toUpperCase(), {
    x: colQtyX + 12,
    y: headerTextY,
    size: FONT_TABLE_HEADER,
    font: fontBold,
    color: COLOR_WHITE,
  });
  currentPage.drawText(t.total.toUpperCase(), {
    x: colTotalX + 12,
    y: headerTextY,
    size: FONT_TABLE_HEADER,
    font: fontBold,
    color: COLOR_WHITE,
  });

  y -= headerHeight;

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

    currentPage.drawText(formatCurrency(item.unitPrice, data.currency), {
      x: colRateX + 12,
      y: cellTextY,
      size: FONT_TABLE_CELL,
      font: fontRegular,
      color: COLOR_DARK_TEXT,
    });

    currentPage.drawText(String(item.quantity), {
      x: colQtyX + 12,
      y: cellTextY,
      size: FONT_TABLE_CELL,
      font: fontRegular,
      color: COLOR_DARK_TEXT,
    });

    // Total column — bold
    currentPage.drawText(formatCurrency(item.total, data.currency), {
      x: colTotalX + 12,
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
    currentPage.drawText(formatCurrency(data.totalAmount, data.currency), {
      x: colTotalX + 12,
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
    currentPage.drawText(formatCurrency(vatAmount, data.currency), {
      x: colTotalX + 12,
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
    currentPage.drawText(formatCurrency(totalWithVat, data.currency), {
      x: colTotalX + 12,
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
    currentPage.drawText(formatCurrency(data.totalAmount, data.currency), {
      x: colTotalX + 12,
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
  const sigLineWidth = 60;
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
