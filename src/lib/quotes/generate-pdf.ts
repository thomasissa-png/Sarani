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
}

// ─── Constants ──────────────────────────────────────────────────────────────

const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89;
const MARGIN_LEFT = 60;
const MARGIN_RIGHT = 60;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

const COLOR_BLACK = rgb(0.1, 0.1, 0.1);
const COLOR_GRAY = rgb(0.4, 0.4, 0.4);
const COLOR_LIGHT_GRAY = rgb(0.95, 0.95, 0.95);
const COLOR_TABLE_HEADER = rgb(0.15, 0.15, 0.15);
const COLOR_WHITE = rgb(1, 1, 1);
const COLOR_ACCENT = rgb(0.06, 0.06, 0.06);

const REFERENCES_TEXT = `Sarani is a Paris-born creative agency uniting 35 experts across 5 continents and 18 languages. We operate 24/7 to deliver unlimited creativity with next-day turnaround. Our clients include Sony, TikTok, Adidas, GEODIS, Pernod Ricard, L'Oreal, Air Corsica, and PICO. We have been recognized for our work across multiple awards and industry benchmarks.`;

const PAYMENT_TERMS = [
  "Work commences once a PO is raised.",
  "Unlimited rounds of revisions are offered before filming and on post-production.",
  "Payment terms are 45 days.",
];

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

/**
 * Draw wrapped text, returning the new Y position after drawing.
 * Adds a new page if needed.
 */
function drawWrappedText(
  page: { current: PDFPage; doc: PDFDocument },
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  fontSize: number,
  maxWidth: number,
  color: typeof COLOR_BLACK,
  lineSpacing: number = 1.4
): number {
  const lines = wrapText(text, font, fontSize, maxWidth);
  let currentY = y;

  for (const line of lines) {
    if (currentY < 60) {
      page.current = page.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      currentY = PAGE_HEIGHT - 60;
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

// ─── Main Generator ─────────────────────────────────────────────────────────

export async function generateQuotePDF(
  data: QuotePDFData
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);

  let currentPage = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const pageRef = { current: currentPage, doc };
  let y = PAGE_HEIGHT - 60;

  // ─── Logo ────────────────────────────────────────────────────────────────

  const logoPng = getLogoPng();
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
      y -= logoHeight + 20;
    } catch {
      // Logo embed failed — continue without it
      y -= 10;
    }
  }

  // ─── Date ────────────────────────────────────────────────────────────────

  // Quote number (right-aligned)
  const qnWidth = helveticaBold.widthOfTextAtSize(data.quoteNumber, 10);
  currentPage.drawText(data.quoteNumber, {
    x: PAGE_WIDTH - MARGIN_RIGHT - qnWidth,
    y,
    size: 10,
    font: helveticaBold,
    color: COLOR_BLACK,
  });

  currentPage.drawText(data.date, {
    x: MARGIN_LEFT,
    y,
    size: 10,
    font: helvetica,
    color: COLOR_GRAY,
  });
  y -= 30;

  // ─── Title ───────────────────────────────────────────────────────────────

  currentPage.drawText("Service Proposal", {
    x: MARGIN_LEFT,
    y,
    size: 22,
    font: helveticaBold,
    color: COLOR_BLACK,
  });
  y -= 14;

  currentPage.drawText(data.projectName, {
    x: MARGIN_LEFT,
    y,
    size: 12,
    font: helvetica,
    color: COLOR_GRAY,
  });
  y -= 30;

  // ─── Introduction ────────────────────────────────────────────────────────

  const introText = `This proposal is for ${data.contactName} at ${data.clientName}.`;
  y = drawWrappedText(
    pageRef,
    introText,
    MARGIN_LEFT,
    y,
    helvetica,
    11,
    CONTENT_WIDTH,
    COLOR_BLACK
  );
  y -= 15;

  // ─── Purpose of work ─────────────────────────────────────────────────────

  currentPage = pageRef.current;
  currentPage.drawText("Purpose of work", {
    x: MARGIN_LEFT,
    y,
    size: 14,
    font: helveticaBold,
    color: COLOR_BLACK,
  });
  y -= 20;

  y = drawWrappedText(
    pageRef,
    data.description,
    MARGIN_LEFT,
    y,
    helvetica,
    10,
    CONTENT_WIDTH,
    COLOR_GRAY
  );
  y -= 15;

  // ─── Scope and deliverables ───────────────────────────────────────────────

  currentPage = pageRef.current;
  currentPage.drawText("Scope and deliverables", {
    x: MARGIN_LEFT,
    y,
    size: 14,
    font: helveticaBold,
    color: COLOR_BLACK,
  });
  y -= 20;

  y = drawWrappedText(
    pageRef,
    data.scope,
    MARGIN_LEFT,
    y,
    helvetica,
    10,
    CONTENT_WIDTH,
    COLOR_GRAY
  );
  y -= 15;

  // ─── Project schedule ──────────────────────────────────────────────────────

  currentPage = pageRef.current;
  currentPage.drawText("Project schedule", {
    x: MARGIN_LEFT,
    y,
    size: 14,
    font: helveticaBold,
    color: COLOR_BLACK,
  });
  y -= 20;

  const scheduleItems = [
    `Proposal delivered to ${data.clientName} \u2013 ${data.date}`,
    "Work commences once PO is raised",
    `Final work to be delivered to ${data.clientName} by specified deadline`,
  ];

  for (const item of scheduleItems) {
    currentPage = pageRef.current;
    if (y < 60) {
      currentPage = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      pageRef.current = currentPage;
      y = PAGE_HEIGHT - 60;
    }
    currentPage.drawText(`\u2022  ${item}`, {
      x: MARGIN_LEFT + 10,
      y,
      size: 10,
      font: helvetica,
      color: COLOR_GRAY,
    });
    y -= 16;
  }
  y -= 10;

  // ─── Pricing table ────────────────────────────────────────────────────────

  currentPage = pageRef.current;
  currentPage.drawText("Pricing, payment, terms and conditions", {
    x: MARGIN_LEFT,
    y,
    size: 14,
    font: helveticaBold,
    color: COLOR_BLACK,
  });
  y -= 25;

  // Check if we need a new page for the table
  const tableHeight = (data.items.length + 2) * 28 + 40;
  if (y - tableHeight < 60) {
    currentPage = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    pageRef.current = currentPage;
    y = PAGE_HEIGHT - 60;
  }

  // Column widths
  const colWidths = {
    description: CONTENT_WIDTH * 0.45,
    rate: CONTENT_WIDTH * 0.2,
    qty: CONTENT_WIDTH * 0.15,
    total: CONTENT_WIDTH * 0.2,
  };

  const tableX = MARGIN_LEFT;
  const rowHeight = 28;

  // Header row
  currentPage.drawRectangle({
    x: tableX,
    y: y - rowHeight,
    width: CONTENT_WIDTH,
    height: rowHeight,
    color: COLOR_TABLE_HEADER,
  });

  const headerY = y - 18;
  currentPage.drawText("Item", {
    x: tableX + 8,
    y: headerY,
    size: 9,
    font: helveticaBold,
    color: COLOR_WHITE,
  });
  currentPage.drawText("Fixed rate", {
    x: tableX + colWidths.description + 8,
    y: headerY,
    size: 9,
    font: helveticaBold,
    color: COLOR_WHITE,
  });
  currentPage.drawText("Qty", {
    x: tableX + colWidths.description + colWidths.rate + 8,
    y: headerY,
    size: 9,
    font: helveticaBold,
    color: COLOR_WHITE,
  });
  currentPage.drawText("Total", {
    x: tableX + colWidths.description + colWidths.rate + colWidths.qty + 8,
    y: headerY,
    size: 9,
    font: helveticaBold,
    color: COLOR_WHITE,
  });
  y -= rowHeight;

  // Data rows
  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i];

    if (y - rowHeight < 60) {
      currentPage = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      pageRef.current = currentPage;
      y = PAGE_HEIGHT - 60;
    }

    // Alternating row background
    if (i % 2 === 0) {
      currentPage.drawRectangle({
        x: tableX,
        y: y - rowHeight,
        width: CONTENT_WIDTH,
        height: rowHeight,
        color: COLOR_LIGHT_GRAY,
      });
    }

    const rowY = y - 18;

    // Truncate long descriptions
    let desc = item.description;
    const maxDescWidth = colWidths.description - 16;
    while (helvetica.widthOfTextAtSize(desc, 9) > maxDescWidth && desc.length > 3) {
      desc = desc.slice(0, -4) + "...";
    }

    currentPage.drawText(desc, {
      x: tableX + 8,
      y: rowY,
      size: 9,
      font: helvetica,
      color: COLOR_BLACK,
    });
    currentPage.drawText(formatCurrency(item.unitPrice, data.currency), {
      x: tableX + colWidths.description + 8,
      y: rowY,
      size: 9,
      font: helvetica,
      color: COLOR_BLACK,
    });
    currentPage.drawText(String(item.quantity), {
      x: tableX + colWidths.description + colWidths.rate + 8,
      y: rowY,
      size: 9,
      font: helvetica,
      color: COLOR_BLACK,
    });
    currentPage.drawText(formatCurrency(item.total, data.currency), {
      x: tableX + colWidths.description + colWidths.rate + colWidths.qty + 8,
      y: rowY,
      size: 9,
      font: helveticaBold,
      color: COLOR_BLACK,
    });

    y -= rowHeight;
  }

  // Total row
  currentPage = pageRef.current;
  if (y - rowHeight < 60) {
    currentPage = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    pageRef.current = currentPage;
    y = PAGE_HEIGHT - 60;
  }

  currentPage.drawRectangle({
    x: tableX,
    y: y - rowHeight,
    width: CONTENT_WIDTH,
    height: rowHeight,
    color: COLOR_ACCENT,
  });

  const totalY = y - 18;
  currentPage.drawText("Total", {
    x: tableX + 8,
    y: totalY,
    size: 10,
    font: helveticaBold,
    color: COLOR_WHITE,
  });
  currentPage.drawText(formatCurrency(data.totalAmount, data.currency), {
    x: tableX + colWidths.description + colWidths.rate + colWidths.qty + 8,
    y: totalY,
    size: 10,
    font: helveticaBold,
    color: COLOR_WHITE,
  });
  y -= rowHeight + 25;

  // ─── References ────────────────────────────────────────────────────────────

  currentPage = pageRef.current;
  if (y < 120) {
    currentPage = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    pageRef.current = currentPage;
    y = PAGE_HEIGHT - 60;
  }

  currentPage.drawText("References", {
    x: MARGIN_LEFT,
    y,
    size: 14,
    font: helveticaBold,
    color: COLOR_BLACK,
  });
  y -= 20;

  y = drawWrappedText(
    pageRef,
    REFERENCES_TEXT,
    MARGIN_LEFT,
    y,
    helvetica,
    9,
    CONTENT_WIDTH,
    COLOR_GRAY
  );
  y -= 20;

  // ─── Payment terms ─────────────────────────────────────────────────────────

  currentPage = pageRef.current;
  if (y < 100) {
    currentPage = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    pageRef.current = currentPage;
    y = PAGE_HEIGHT - 60;
  }

  for (const term of PAYMENT_TERMS) {
    currentPage = pageRef.current;
    if (y < 60) {
      currentPage = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      pageRef.current = currentPage;
      y = PAGE_HEIGHT - 60;
    }
    currentPage.drawText(term, {
      x: MARGIN_LEFT,
      y,
      size: 9,
      font: helvetica,
      color: COLOR_GRAY,
    });
    y -= 14;
  }
  y -= 25;

  // ─── Signature ─────────────────────────────────────────────────────────────

  currentPage = pageRef.current;
  if (y < 80) {
    currentPage = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    pageRef.current = currentPage;
    y = PAGE_HEIGHT - 60;
  }

  currentPage.drawText("Best regards,", {
    x: MARGIN_LEFT,
    y,
    size: 10,
    font: helvetica,
    color: COLOR_BLACK,
  });
  y -= 16;

  currentPage.drawText("Emmanuel Gomez, CEO, Sarani", {
    x: MARGIN_LEFT,
    y,
    size: 10,
    font: helveticaBold,
    color: COLOR_BLACK,
  });

  // ─── Serialize ─────────────────────────────────────────────────────────────

  const pdfBytes = await doc.save();
  return new Uint8Array(pdfBytes);
}
