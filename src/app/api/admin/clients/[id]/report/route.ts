// ─── Client Monthly Activity Report PDF ─────────────────────────────────────
// POST /api/admin/clients/[id]/report?month=2026-03
// Generates a branded PDF report of all agent outputs for the given month.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clients, agentOutputs } from "@/lib/db/schema";
import { eq, and, gte, lt, desc } from "drizzle-orm";
import { PDFDocument, rgb, PDFPage, PDFFont, StandardFonts } from "pdf-lib";
import fs from "fs";
import path from "path";

// ─── Constants (mirrored from generate-pdf.ts) ────────────────────────────

const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89;
const MARGIN_LEFT = 72;
const MARGIN_RIGHT = 72;
const MARGIN_TOP = 50;
const MARGIN_BOTTOM = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

// Brand Colors
const COLOR_FLAME = rgb(0.855, 0.318, 0.149); // #da5126
const COLOR_BLACK = rgb(0, 0, 0);
const COLOR_DARK_TEXT = rgb(0.13, 0.13, 0.13);
const COLOR_GRAY_TEXT = rgb(0.35, 0.35, 0.35);
const COLOR_GRAY_LIGHT_TEXT = rgb(0.55, 0.55, 0.55);
const COLOR_SECTION_BG = rgb(0.98, 0.976, 0.961);
const COLOR_ROW_ALT = rgb(0.953, 0.949, 0.937);
const COLOR_TABLE_BORDER = rgb(0.9, 0.9, 0.9);
const COLOR_WHITE = rgb(1, 1, 1);
const COLOR_SEPARATOR = rgb(0.88, 0.88, 0.88);

// Font sizes
const FONT_TITLE = 22;
const FONT_SUBTITLE = 11;
const FONT_SECTION_HEADING = 11;
const FONT_BODY = 9.5;
const FONT_TABLE_HEADER = 8.5;
const FONT_TABLE_CELL = 9.5;
const FONT_FOOTER = 7.5;
const FONT_STAT_VALUE = 28;
const FONT_STAT_LABEL = 8;

// Spacing
const SECTION_GAP = 32;
const HEADING_TO_CONTENT = 14;
const ACCENT_BORDER_WIDTH = 2;
const ACCENT_BORDER_OFFSET = 10;

// Agent type labels
const AGENT_TYPE_LABELS: Record<string, string> = {
  pm: "Project Manager",
  translator: "Translator",
  "email-drafter": "Email Drafter",
  "video-script": "Video Script",
  creative: "Creative",
  designer: "Designer",
  legal: "Legal",
  social: "Social",
  seo: "SEO",
  copywriter: "Copywriter",
  proposal: "Proposal",
  presentation: "Presentation",
  proofreader: "Proofreader",
};

// ─── Types ─────────────────────────────────────────────────────────────────

interface PageRef {
  current: PDFPage;
  doc: PDFDocument;
}

// ─── Logo Cache ────────────────────────────────────────────────────────────

let cachedLogoPng: Uint8Array | null = null;

function getLogoPng(): Uint8Array | null {
  if (cachedLogoPng) return cachedLogoPng;
  try {
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

// ─── Helpers ───────────────────────────────────────────────────────────────

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

function drawWrappedText(
  page: PageRef,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  fontSize: number,
  maxWidth: number,
  color: ReturnType<typeof rgb>,
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

function drawSectionHeading(
  page: PDFPage,
  text: string,
  y: number,
  font: PDFFont,
  accentColor: ReturnType<typeof rgb> = COLOR_FLAME
): number {
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

function ensureSpace(page: PageRef, y: number, needed: number): number {
  if (y - needed < MARGIN_BOTTOM) {
    page.current = page.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    return PAGE_HEIGHT - MARGIN_TOP;
  }
  return y;
}

function formatMonthLabel(month: string): string {
  const [yearStr, monthStr] = month.split("-");
  const date = new Date(Number(yearStr), Number(monthStr) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

// ─── PDF Generator ─────────────────────────────────────────────────────────

async function generateReportPDF(
  clientName: string,
  month: string,
  outputs: Array<{
    id: string;
    agentType: string;
    status: string;
    createdAt: Date;
    outputContent: string | null;
  }>
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();

  // Load fonts
  let fontRegular: PDFFont;
  let fontBold: PDFFont;
  try {
    const outfitRegularPath = path.join(
      process.cwd(),
      "public",
      "fonts",
      "Outfit-Regular.ttf"
    );
    const outfitBoldPath = path.join(
      process.cwd(),
      "public",
      "fonts",
      "Outfit-Bold.ttf"
    );
    const outfitRegularBytes = fs.readFileSync(outfitRegularPath);
    const outfitBoldBytes = fs.readFileSync(outfitBoldPath);
    fontRegular = await doc.embedFont(outfitRegularBytes);
    fontBold = await doc.embedFont(outfitBoldBytes);
  } catch {
    fontRegular = await doc.embedFont(StandardFonts.Helvetica);
    fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  }

  const monthLabel = formatMonthLabel(month);
  let currentPage = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const pageRef: PageRef = { current: currentPage, doc };
  let y = PAGE_HEIGHT - MARGIN_TOP;

  // ═══════════════════════════════════════════════════════════════════════════
  // HEADER: Black banner with logo + report info
  // ═══════════════════════════════════════════════════════════════════════════

  const headerHeight = 110;

  currentPage.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - headerHeight,
    width: PAGE_WIDTH,
    height: headerHeight,
    color: COLOR_BLACK,
  });

  // Logo
  const logoPng = getLogoPng();
  if (logoPng) {
    try {
      const logoImage = await doc.embedPng(logoPng);
      const logoScale = 28 / logoImage.height;
      currentPage.drawImage(logoImage, {
        x: MARGIN_LEFT,
        y: PAGE_HEIGHT - 42,
        width: logoImage.width * logoScale,
        height: 28,
      });
    } catch {
      // Logo unavailable — skip
    }
  }

  // Title
  currentPage.drawText("Monthly Activity Report", {
    x: MARGIN_LEFT,
    y: PAGE_HEIGHT - 70,
    size: FONT_TITLE,
    font: fontBold,
    color: COLOR_WHITE,
  });

  // Client name + month on right side
  const clientNameWidth = fontRegular.widthOfTextAtSize(
    clientName,
    FONT_SUBTITLE
  );
  currentPage.drawText(clientName, {
    x: PAGE_WIDTH - MARGIN_RIGHT - clientNameWidth,
    y: PAGE_HEIGHT - 55,
    size: FONT_SUBTITLE,
    font: fontRegular,
    color: COLOR_WHITE,
  });

  const monthWidth = fontRegular.widthOfTextAtSize(monthLabel, FONT_SUBTITLE);
  currentPage.drawText(monthLabel, {
    x: PAGE_WIDTH - MARGIN_RIGHT - monthWidth,
    y: PAGE_HEIGHT - 72,
    size: FONT_SUBTITLE,
    font: fontRegular,
    color: COLOR_GRAY_LIGHT_TEXT,
  });

  y = PAGE_HEIGHT - headerHeight - SECTION_GAP;

  // ═══════════════════════════════════════════════════════════════════════════
  // SUMMARY STATS
  // ═══════════════════════════════════════════════════════════════════════════

  y = drawSectionHeading(
    pageRef.current,
    "Summary",
    y,
    fontBold,
    COLOR_FLAME
  );
  y -= 8;

  // Compute stats
  const totalOutputs = outputs.length;
  const doneOutputs = outputs.filter((o) => o.status === "done").length;
  const errorOutputs = outputs.filter((o) => o.status === "error").length;
  const completionRate =
    totalOutputs > 0 ? Math.round((doneOutputs / totalOutputs) * 100) : 0;

  // Count by agent type
  const byAgentType: Record<string, number> = {};
  for (const output of outputs) {
    byAgentType[output.agentType] = (byAgentType[output.agentType] ?? 0) + 1;
  }
  const agentTypeSorted = Object.entries(byAgentType).sort(
    (a, b) => b[1] - a[1]
  );

  // Draw 3 stat cards
  const cardWidth = (CONTENT_WIDTH - 24) / 3;
  const cardHeight = 64;
  const stats = [
    { value: String(totalOutputs), label: "Total Outputs" },
    { value: `${completionRate}%`, label: "Completion Rate" },
    { value: String(errorOutputs), label: "Errors" },
  ];

  for (let i = 0; i < stats.length; i++) {
    const cardX = MARGIN_LEFT + i * (cardWidth + 12);

    // Card background
    pageRef.current.drawRectangle({
      x: cardX,
      y: y - cardHeight,
      width: cardWidth,
      height: cardHeight,
      color: COLOR_SECTION_BG,
    });

    // Value
    pageRef.current.drawText(stats[i].value, {
      x: cardX + 16,
      y: y - 28,
      size: FONT_STAT_VALUE,
      font: fontBold,
      color: COLOR_BLACK,
    });

    // Label
    pageRef.current.drawText(stats[i].label, {
      x: cardX + 16,
      y: y - 48,
      size: FONT_STAT_LABEL,
      font: fontRegular,
      color: COLOR_GRAY_TEXT,
    });
  }

  y -= cardHeight + SECTION_GAP;

  // ═══════════════════════════════════════════════════════════════════════════
  // BREAKDOWN BY AGENT TYPE
  // ═══════════════════════════════════════════════════════════════════════════

  if (agentTypeSorted.length > 0) {
    y = ensureSpace(pageRef, y, 80);
    y = drawSectionHeading(
      pageRef.current,
      "Breakdown by Agent",
      y,
      fontBold,
      COLOR_FLAME
    );
    y -= 4;

    // Table header
    const colAgent = MARGIN_LEFT;
    const colCount = MARGIN_LEFT + CONTENT_WIDTH - 80;
    const colPercent = MARGIN_LEFT + CONTENT_WIDTH - 40;

    pageRef.current.drawRectangle({
      x: MARGIN_LEFT,
      y: y - 14,
      width: CONTENT_WIDTH,
      height: 18,
      color: COLOR_BLACK,
    });

    pageRef.current.drawText("Agent", {
      x: colAgent + 8,
      y: y - 10,
      size: FONT_TABLE_HEADER,
      font: fontBold,
      color: COLOR_WHITE,
    });

    pageRef.current.drawText("Count", {
      x: colCount,
      y: y - 10,
      size: FONT_TABLE_HEADER,
      font: fontBold,
      color: COLOR_WHITE,
    });

    pageRef.current.drawText("%", {
      x: colPercent + 8,
      y: y - 10,
      size: FONT_TABLE_HEADER,
      font: fontBold,
      color: COLOR_WHITE,
    });

    y -= 18;

    for (let i = 0; i < agentTypeSorted.length; i++) {
      const [agentType, count] = agentTypeSorted[i];
      const pct =
        totalOutputs > 0 ? Math.round((count / totalOutputs) * 100) : 0;
      const rowY = y - 16;

      y = ensureSpace(pageRef, y, 20);

      // Alternating row background
      if (i % 2 === 0) {
        pageRef.current.drawRectangle({
          x: MARGIN_LEFT,
          y: rowY - 2,
          width: CONTENT_WIDTH,
          height: 18,
          color: COLOR_ROW_ALT,
        });
      }

      pageRef.current.drawText(
        AGENT_TYPE_LABELS[agentType] ?? agentType,
        {
          x: colAgent + 8,
          y: rowY + 2,
          size: FONT_TABLE_CELL,
          font: fontRegular,
          color: COLOR_DARK_TEXT,
        }
      );

      const countStr = String(count);
      const countWidth = fontRegular.widthOfTextAtSize(
        countStr,
        FONT_TABLE_CELL
      );
      pageRef.current.drawText(countStr, {
        x: colCount + 20 - countWidth,
        y: rowY + 2,
        size: FONT_TABLE_CELL,
        font: fontRegular,
        color: COLOR_DARK_TEXT,
      });

      pageRef.current.drawText(`${pct}%`, {
        x: colPercent + 8,
        y: rowY + 2,
        size: FONT_TABLE_CELL,
        font: fontRegular,
        color: COLOR_GRAY_TEXT,
      });

      y -= 18;
    }

    // Bottom border
    pageRef.current.drawLine({
      start: { x: MARGIN_LEFT, y },
      end: { x: PAGE_WIDTH - MARGIN_RIGHT, y },
      thickness: 0.5,
      color: COLOR_TABLE_BORDER,
    });

    y -= SECTION_GAP;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OUTPUT LIST
  // ═══════════════════════════════════════════════════════════════════════════

  y = ensureSpace(pageRef, y, 60);
  y = drawSectionHeading(
    pageRef.current,
    "Activity Log",
    y,
    fontBold,
    COLOR_FLAME
  );
  y -= 4;

  if (outputs.length === 0) {
    y = drawWrappedText(
      pageRef,
      "No activity recorded for this month.",
      MARGIN_LEFT + ACCENT_BORDER_OFFSET + ACCENT_BORDER_WIDTH,
      y,
      fontRegular,
      FONT_BODY,
      CONTENT_WIDTH - ACCENT_BORDER_OFFSET - ACCENT_BORDER_WIDTH,
      COLOR_GRAY_TEXT
    );
  } else {
    // Table header
    const colDate = MARGIN_LEFT;
    const colType = MARGIN_LEFT + 80;
    const colStatus = MARGIN_LEFT + 200;
    const colSnippet = MARGIN_LEFT + 260;
    const snippetWidth = CONTENT_WIDTH - 260 + MARGIN_LEFT;

    pageRef.current.drawRectangle({
      x: MARGIN_LEFT,
      y: y - 14,
      width: CONTENT_WIDTH,
      height: 18,
      color: COLOR_BLACK,
    });

    const headers = [
      { text: "Date", x: colDate + 8 },
      { text: "Agent", x: colType + 8 },
      { text: "Status", x: colStatus + 8 },
      { text: "Snippet", x: colSnippet + 8 },
    ];

    for (const header of headers) {
      pageRef.current.drawText(header.text, {
        x: header.x,
        y: y - 10,
        size: FONT_TABLE_HEADER,
        font: fontBold,
        color: COLOR_WHITE,
      });
    }

    y -= 18;

    for (let i = 0; i < outputs.length; i++) {
      const output = outputs[i];
      const rowHeight = 18;

      y = ensureSpace(pageRef, y, rowHeight + 4);
      const rowY = y - 14;

      // Alternating row
      if (i % 2 === 0) {
        pageRef.current.drawRectangle({
          x: MARGIN_LEFT,
          y: rowY - 2,
          width: CONTENT_WIDTH,
          height: rowHeight,
          color: COLOR_ROW_ALT,
        });
      }

      // Date
      const dateStr = output.createdAt.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      pageRef.current.drawText(dateStr, {
        x: colDate + 8,
        y: rowY + 2,
        size: FONT_TABLE_CELL,
        font: fontRegular,
        color: COLOR_DARK_TEXT,
      });

      // Agent type
      pageRef.current.drawText(
        AGENT_TYPE_LABELS[output.agentType] ?? output.agentType,
        {
          x: colType + 8,
          y: rowY + 2,
          size: FONT_TABLE_CELL,
          font: fontRegular,
          color: COLOR_DARK_TEXT,
        }
      );

      // Status
      pageRef.current.drawText(output.status, {
        x: colStatus + 8,
        y: rowY + 2,
        size: FONT_TABLE_CELL,
        font: fontRegular,
        color:
          output.status === "done"
            ? rgb(0.16, 0.65, 0.32)
            : output.status === "error"
              ? rgb(0.85, 0.18, 0.18)
              : COLOR_GRAY_TEXT,
      });

      // Snippet — truncated to fit
      if (output.outputContent) {
        const snippet = output.outputContent
          .replace(/[\n\r]+/g, " ")
          .trim()
          .slice(0, 80);
        const truncated =
          snippet.length < output.outputContent.trim().length
            ? `${snippet}...`
            : snippet;

        // Truncate visually to fit column width
        let displaySnippet = truncated;
        const maxSnippetWidth = snippetWidth - 16;
        while (
          displaySnippet.length > 0 &&
          fontRegular.widthOfTextAtSize(displaySnippet, FONT_TABLE_CELL) >
            maxSnippetWidth
        ) {
          displaySnippet = displaySnippet.slice(0, -4) + "...";
        }

        if (displaySnippet.length > 0) {
          pageRef.current.drawText(displaySnippet, {
            x: colSnippet + 8,
            y: rowY + 2,
            size: FONT_TABLE_CELL,
            font: fontRegular,
            color: COLOR_GRAY_LIGHT_TEXT,
          });
        }
      }

      y -= rowHeight;
    }

    // Bottom border
    pageRef.current.drawLine({
      start: { x: MARGIN_LEFT, y },
      end: { x: PAGE_WIDTH - MARGIN_RIGHT, y },
      thickness: 0.5,
      color: COLOR_TABLE_BORDER,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FOOTER on every page
  // ═══════════════════════════════════════════════════════════════════════════

  const pages = doc.getPages();
  const generationDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];

    // Separator line
    p.drawLine({
      start: { x: MARGIN_LEFT, y: MARGIN_BOTTOM - 5 },
      end: { x: PAGE_WIDTH - MARGIN_RIGHT, y: MARGIN_BOTTOM - 5 },
      thickness: 0.5,
      color: COLOR_SEPARATOR,
    });

    // Left: branding
    p.drawText("Generated by Sarani — sarani.studio", {
      x: MARGIN_LEFT,
      y: MARGIN_BOTTOM - 20,
      size: FONT_FOOTER,
      font: fontRegular,
      color: COLOR_GRAY_LIGHT_TEXT,
    });

    // Center: page number
    const pageLabel = `${i + 1} / ${pages.length}`;
    const pageLabelWidth = fontRegular.widthOfTextAtSize(
      pageLabel,
      FONT_FOOTER
    );
    p.drawText(pageLabel, {
      x: (PAGE_WIDTH - pageLabelWidth) / 2,
      y: MARGIN_BOTTOM - 20,
      size: FONT_FOOTER,
      font: fontRegular,
      color: COLOR_GRAY_LIGHT_TEXT,
    });

    // Right: generation date
    const dateWidth = fontRegular.widthOfTextAtSize(
      generationDate,
      FONT_FOOTER
    );
    p.drawText(generationDate, {
      x: PAGE_WIDTH - MARGIN_RIGHT - dateWidth,
      y: MARGIN_BOTTOM - 20,
      size: FONT_FOOTER,
      font: fontRegular,
      color: COLOR_GRAY_LIGHT_TEXT,
    });
  }

  return await doc.save();
}

// ─── Route Handler ─────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    // Default to current month
    const now = new Date();
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const month = searchParams.get("month") ?? defaultMonth;

    // Validate month format
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { error: "Invalid month format. Use YYYY-MM." },
        { status: 400 }
      );
    }

    // Fetch client
    const [client] = await db
      .select({ id: clients.id, name: clients.name })
      .from(clients)
      .where(eq(clients.id, id))
      .limit(1);

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Compute date range for the month
    const [yearStr, monthStr] = month.split("-");
    const year = Number(yearStr);
    const monthNum = Number(monthStr);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 1); // First day of next month

    // Fetch outputs for the month
    const outputs = await db
      .select({
        id: agentOutputs.id,
        agentType: agentOutputs.agentType,
        status: agentOutputs.status,
        createdAt: agentOutputs.createdAt,
        outputContent: agentOutputs.outputContent,
      })
      .from(agentOutputs)
      .where(
        and(
          eq(agentOutputs.clientId, id),
          gte(agentOutputs.createdAt, startDate),
          lt(agentOutputs.createdAt, endDate)
        )
      )
      .orderBy(desc(agentOutputs.createdAt));

    // Generate PDF
    const pdfBytes = await generateReportPDF(client.name, month, outputs);

    // Return as binary response
    const sanitizedName = client.name.replace(/[^a-zA-Z0-9-_ ]/g, "").replace(/\s+/g, "-");
    const filename = `Sarani-Report-${sanitizedName}-${month}.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(pdfBytes.length),
      },
    });
  } catch (error) {
    console.error("Error generating report:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}
