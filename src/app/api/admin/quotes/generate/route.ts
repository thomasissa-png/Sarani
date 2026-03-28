import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { getUserFromSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { quotes, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateQuotePDF, type QuotePDFData } from "@/lib/quotes/generate-pdf";
import { uploadFile } from "@/lib/integrations/sharepoint";
import { logSync } from "@/lib/integrations/cache";
import { SHAREPOINT_TRACKERS_DRIVE_ID } from "@/lib/integrations/config";

// ─── Quote Number Generator ──────────────────────────────────────────────────

async function generateQuoteNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `SAR-${year}-`;

  const result = await db.execute(
    sql`SELECT "quote_number" FROM "quotes" WHERE "quote_number" LIKE ${prefix + "%"} ORDER BY "quote_number" DESC LIMIT 1`
  );

  const rows = result as unknown as Array<{ quote_number: string }>;
  let nextSeq = 1;
  if (rows.length > 0) {
    const lastNum = rows[0].quote_number;
    const seq = parseInt(lastNum.split("-").pop() ?? "0", 10);
    nextSeq = seq + 1;
  }

  return `${prefix}${String(nextSeq).padStart(4, "0")}`;
}

// ─── Validation ────────────────────────────────────────────────────────────

const lineItemSchema = z.object({
  description: z.string().min(1, "Item description is required"),
  quantity: z.number().positive("Quantity must be positive"),
  unitPrice: z.number().min(0, "Unit price must be non-negative"),
  total: z.number().min(0, "Total must be non-negative"),
});

const generateQuoteSchema = z.object({
  clientName: z.string().min(1, "Client name is required"),
  contactName: z.string().min(1, "Contact name is required"),
  projectName: z.string().min(1, "Project name is required"),
  description: z.string().min(1, "Description is required"),
  scope: z.string().min(1, "Scope is required"),
  items: z.array(lineItemSchema).min(1, "At least one line item is required"),
  currency: z.enum(["EUR", "USD", "GBP"]),
  vatRate: z.number().min(0).max(100).nullable().default(null),
  validUntil: z.string().optional(),
  language: z.enum(["en", "fr"]).default("en"),
  paymentTermsDays: z.number().min(0).max(365).default(45),
});

// ─── Route ─────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Auth check
  const session = await getUserFromSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = generateQuoteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const totalAmount = data.items.reduce((sum, item) => sum + item.total, 0);
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Generate quote number
    const quoteNumber = await generateQuoteNumber();

    // Fetch current user's name and role for the signatory block
    let signatoryName = "Sarani Team";
    let signatoryTitle = "";
    try {
      if (session.userId && session.userId !== "legacy-admin") {
        const [user] = await db
          .select({ name: users.name, role: users.role })
          .from(users)
          .where(eq(users.id, session.userId))
          .limit(1);
        if (user?.name) {
          signatoryName = user.name;
          signatoryTitle = user.role === "admin" ? "Account Director" : "Project Manager";
        }
      }
    } catch {
      // Non-critical — use defaults
    }

    // Generate PDF
    const pdfData: QuotePDFData = {
      quoteNumber,
      date: dateStr,
      clientName: data.clientName,
      contactName: data.contactName,
      projectName: data.projectName,
      description: data.description,
      scope: data.scope,
      items: data.items,
      totalAmount,
      currency: data.currency,
      vatRate: data.vatRate,
      validUntil: data.validUntil ?? null,
      language: data.language,
      paymentTermsDays: data.paymentTermsDays,
      signatoryName,
      signatoryTitle,
    };

    const pdfBytes = await generateQuotePDF(pdfData);

    // Try uploading to SharePoint (non-blocking — quote is still saved even if upload fails)
    let pdfUrl: string | null = null;
    try {
      const safeProjectName = data.projectName
        .replace(/[^a-zA-Z0-9\s\-_]/g, "")
        .trim()
        .replace(/\s+/g, "_");
      const safeClientName = data.clientName
        .replace(/[^a-zA-Z0-9\s\-_]/g, "")
        .trim()
        .replace(/\s+/g, "_");
      const timestamp = now.toISOString().slice(0, 10);
      const filename = `${safeClientName}_${safeProjectName}_${timestamp}.pdf`;
      const uploadPath = `/Documents/00. Administrative/01_Quotes/${filename}`;

      const driveItem = await uploadFile(
        SHAREPOINT_TRACKERS_DRIVE_ID,
        uploadPath,
        pdfBytes
      );
      pdfUrl = driveItem.webUrl;

      await logSync({
        source: "sharepoint",
        action: "upload_quote_pdf",
        entityId: driveItem.id,
        payload: { path: uploadPath, size: pdfBytes.length },
      });
    } catch (uploadError) {
      console.error("SharePoint upload failed (quote still saved):", uploadError);
      await logSync({
        source: "sharepoint",
        action: "upload_quote_pdf",
        status: "error",
        error: uploadError instanceof Error ? uploadError.message : "Upload failed",
      });
    }

    // Save to database
    const [savedQuote] = await db
      .insert(quotes)
      .values({
        quoteNumber,
        clientName: data.clientName,
        projectName: data.projectName,
        items: data.items,
        total: String(totalAmount),
        currency: data.currency,
        pdfUrl,
        createdBy: session.userId,
      })
      .returning();

    // Return PDF binary
    const response = new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${quoteNumber}.pdf"`,
        "X-Quote-Id": savedQuote.id,
        "X-Quote-Number": quoteNumber,
      },
    });

    if (pdfUrl) {
      response.headers.set("X-SharePoint-Url", pdfUrl);
    }

    return response;
  } catch (error) {
    console.error("Error generating quote:", error);
    return NextResponse.json(
      { error: "Failed to generate quote" },
      { status: 500 }
    );
  }
}
