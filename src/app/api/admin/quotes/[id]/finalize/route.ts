import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { quotes, inboxItems, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { generateQuotePDF, type QuotePDFData } from "@/lib/quotes/generate-pdf";
import { uploadFile, createAnonymousSharingLink } from "@/lib/integrations/sharepoint";
import { createDraft } from "@/lib/integrations/email";
import { graphFetch } from "@/lib/integrations/sharepoint";
import { addTaskComment } from "@/lib/integrations/clickup";
import { logSync } from "@/lib/integrations/cache";
import { SHAREPOINT_ASSETS_DRIVE_ID } from "@/lib/integrations/config";

// ─── Validation ─────────────────────────────────────────────────────────────

const FinalizeQuoteSchema = z.object({
  items: z
    .array(
      z.object({
        description: z.string().min(1),
        quantity: z.number().positive(),
        unitPrice: z.number().min(0),
        total: z.number().min(0),
      })
    )
    .min(1, "At least one line item is required"),
  purposeOfWork: z.string().min(1, "Purpose of Work is required"),
  lang: z.enum(["FR", "EN"]),
  paymentTermsDays: z.number().min(0).max(365),
  total: z.number().min(0),
});

// ─── POST /api/admin/quotes/[id]/finalize ───────────────────────────────────
// Step 6 of the auto-quote pipeline: generate PDF, upload to SharePoint,
// create Outlook draft, post ClickUp comment, dismiss inbox item.

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  // ─── Auth ────────────────────────────────────────────────────────────────
  const session = await getUserFromSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  // ─── Parse body ──────────────────────────────────────────────────────────
  let body: z.infer<typeof FinalizeQuoteSchema>;
  try {
    const rawBody: unknown = await request.json();
    body = FinalizeQuoteSchema.parse(rawBody);
  } catch (parseError: unknown) {
    if (parseError instanceof z.ZodError) {
      const zodError = parseError as z.ZodError;
      return NextResponse.json(
        { error: "Validation failed", details: zodError.issues },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // ─── Step 1: Validate quote exists and is draft ──────────────────────────

  const [existingQuote] = await db
    .select()
    .from(quotes)
    .where(eq(quotes.id, id))
    .limit(1);

  if (!existingQuote) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  if (existingQuote.status !== "draft") {
    return NextResponse.json(
      { error: "This quote has already been finalized" },
      { status: 409 }
    );
  }

  // Check for null unit prices in submitted items
  const hasUnpricedItems = body.items.some((item: { unitPrice: number }) => item.unitPrice === 0);
  if (hasUnpricedItems) {
    return NextResponse.json(
      { error: "All line items must have a unit price greater than 0" },
      { status: 400 }
    );
  }

  const warnings: string[] = [];

  // ─── Step 2: Generate PDF ────────────────────────────────────────────────

  // Fetch signatory info
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

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const pdfData: QuotePDFData = {
    quoteNumber: existingQuote.quoteNumber,
    date: dateStr,
    clientName: existingQuote.clientName,
    contactName: existingQuote.clientName, // Use client name as contact (auto-quote has no separate contact)
    projectName: existingQuote.projectName,
    description: body.purposeOfWork,
    scope: body.items.map((i: { quantity: number; description: string }) => `${i.quantity}x ${i.description}`).join("\n"),
    items: body.items,
    totalAmount: body.total,
    currency: existingQuote.currency,
    vatRate: null,
    validUntil: null,
    language: body.lang.toLowerCase() as "en" | "fr",
    paymentTermsDays: body.paymentTermsDays,
    signatoryName,
    signatoryTitle,
  };

  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await generateQuotePDF(pdfData);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Unknown error";
    console.error("[Finalize] PDF generation failed:", errMsg);
    return NextResponse.json(
      { error: "PDF generation failed — retry or contact support" },
      { status: 500 }
    );
  }

  // ─── Step 3: Upload PDF to SharePoint (HARD GATE) ───────────────────────

  const safeClientName = existingQuote.clientName
    .replace(/[^a-zA-Z0-9\s\-_]/g, "")
    .trim()
    .replace(/\s+/g, "_");
  const safeProjectName = existingQuote.projectName
    .replace(/[^a-zA-Z0-9\s\-_]/g, "")
    .trim()
    .replace(/\s+/g, "_");
  const timestamp = now.toISOString().slice(0, 10);
  const pdfFilename = `Quote_${timestamp}_${existingQuote.quoteNumber}.pdf`;
  const uploadPath = `/Documents/03. Customers/${safeClientName}/${safeProjectName}/${pdfFilename}`;

  let sharePointUrl: string;
  let driveItemId: string;
  try {
    const driveItem = await uploadFile(
      SHAREPOINT_ASSETS_DRIVE_ID,
      uploadPath,
      pdfBytes
    );
    sharePointUrl = driveItem.webUrl;
    driveItemId = driveItem.id;

    await logSync({
      source: "sharepoint",
      action: "upload_quote_pdf",
      entityId: driveItem.id,
      payload: { path: uploadPath, quoteNumber: existingQuote.quoteNumber },
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Upload failed";
    console.error("[Finalize] SharePoint upload failed:", errMsg);
    await logSync({
      source: "sharepoint",
      action: "upload_quote_pdf",
      status: "error",
      error: errMsg,
    });
    return NextResponse.json(
      { error: "SharePoint upload failed — PDF not stored. Retry later." },
      { status: 500 }
    );
  }

  // Generate anonymous sharing link (best-effort)
  let sharingUrl = sharePointUrl;
  try {
    const anonLink = await createAnonymousSharingLink(
      SHAREPOINT_ASSETS_DRIVE_ID,
      driveItemId
    );
    if (anonLink) {
      sharingUrl = anonLink;
    }
  } catch {
    warnings.push("Could not generate anonymous sharing link — using direct URL");
  }

  // ─── Step 4: Update quote in DB ──────────────────────────────────────────

  try {
    await db
      .update(quotes)
      .set({
        items: body.items,
        total: String(body.total),
        purposeOfWork: body.purposeOfWork,
        lang: body.lang,
        paymentTermsDays: body.paymentTermsDays,
        pdfUrl: sharingUrl,
        status: "sent",
      })
      .where(eq(quotes.id, id));
  } catch (err) {
    console.error("[Finalize] DB update failed:", err);
    return NextResponse.json(
      { error: "Failed to update quote status. PDF uploaded but quote remains draft. Contact support." },
      { status: 500 }
    );
  }

  // ─── Step 5: Create Outlook draft with PDF attachment (non-blocking) ─────

  try {
    // Use contactEmail stored directly on the quote row
    const contactEmail: string | null = existingQuote.contactEmail ?? null;

    if (contactEmail) {
      const subjectPrefix = body.lang === "FR" ? "Devis" : "Quote";
      const subject = `[${subjectPrefix}] ${existingQuote.projectName} — Sarani`;

      // Create draft first
      const draftResult = await createDraft({
        to: contactEmail,
        subject,
        body: buildEmailBody(body.purposeOfWork, body.lang, existingQuote.projectName),
      });

      if (draftResult.success && draftResult.draftId) {
        // Attach PDF to the draft using Graph API
        try {
          await addAttachmentToDraft(draftResult.draftId, pdfFilename, pdfBytes);
        } catch (attachErr) {
          console.error("[Finalize] Failed to attach PDF to draft:", attachErr);
          warnings.push("Draft created but PDF attachment failed — attach manually");
        }
      } else {
        warnings.push(`Outlook draft failed: ${draftResult.error ?? "Unknown error"}`);
      }
    } else {
      warnings.push("No contact email on file — send quote manually");
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Unknown error";
    console.error("[Finalize] Outlook draft failed:", errMsg);
    warnings.push(`Outlook draft failed: ${errMsg}`);
  }

  // ─── Step 6: ClickUp comment (non-blocking) ─────────────────────────────

  if (existingQuote.clickupTaskId) {
    try {
      const currencySymbol = existingQuote.currency === "EUR" ? "\u20AC" : existingQuote.currency;
      await addTaskComment(
        existingQuote.clickupTaskId,
        `Quote sent — ${body.total.toLocaleString("en-US")} ${currencySymbol}\nPDF: ${sharingUrl}`
      );
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Unknown error";
      console.error("[Finalize] ClickUp comment failed:", errMsg);
      warnings.push(`ClickUp comment failed: ${errMsg}`);
    }
  }

  // ─── Step 7: Tracker update (non-blocking) ──────────────────────────────
  // Note: No tracker row update helper exists yet. Log a warning.
  warnings.push("Tracker row update not yet implemented — update manually");

  // ─── Step 8: Dismiss inbox item ──────────────────────────────────────────

  try {
    // Find and dismiss all auto_quote_ready items for this quote
    const matchingItems = await db
      .select({ id: inboxItems.id, summary: inboxItems.summary })
      .from(inboxItems)
      .where(
        and(
          eq(inboxItems.type, "auto_quote_ready"),
          eq(inboxItems.status, "pending")
        )
      );

    for (const item of matchingItems) {
      try {
        const summaryData = JSON.parse(item.summary ?? "{}") as Record<string, unknown>;
        if (summaryData.quoteId === id) {
          await db
            .update(inboxItems)
            .set({ status: "dismissed", processedAt: new Date() })
            .where(eq(inboxItems.id, item.id));
        }
      } catch {
        // Non-critical
      }
    }
  } catch (err) {
    console.error("[Finalize] Inbox dismiss failed:", err);
    warnings.push("Inbox item not dismissed — dismiss manually");
  }

  // ─── Response ────────────────────────────────────────────────────────────

  await logSync({
    source: "sharepoint",
    action: "finalize_quote",
    entityId: id,
    payload: {
      quoteNumber: existingQuote.quoteNumber,
      total: body.total,
      pdfUrl: sharingUrl,
      warningCount: warnings.length,
    },
  });

  return NextResponse.json({
    success: true,
    quoteId: id,
    quoteNumber: existingQuote.quoteNumber,
    pdfUrl: sharingUrl,
    warnings: warnings.length > 0 ? warnings : undefined,
  });
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildEmailBody(purposeOfWork: string, lang: "FR" | "EN", projectName: string): string {
  if (lang === "FR") {
    return `<div style="font-family: 'Outfit', Arial, sans-serif; font-size: 14px; color: #333;">
<p>Bonjour,</p>
<p>Veuillez trouver ci-joint notre devis pour le projet <strong>${escapeHtml(projectName)}</strong>.</p>
<p>${escapeHtml(purposeOfWork)}</p>
<p>N'h\u00e9sitez pas \u00e0 revenir vers nous pour toute question.</p>
<p>Cordialement,<br/>L'\u00e9quipe Sarani</p>
</div>`;
  }

  return `<div style="font-family: 'Outfit', Arial, sans-serif; font-size: 14px; color: #333;">
<p>Hi there,</p>
<p>Please find attached our quote for <strong>${escapeHtml(projectName)}</strong>.</p>
<p>${escapeHtml(purposeOfWork)}</p>
<p>Feel free to reach out if you have any questions.</p>
<p>Best regards,<br/>The Sarani Team</p>
</div>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Add a file attachment to an existing Outlook draft message.
 * Uses Graph API: POST /users/{email}/messages/{messageId}/attachments
 */
async function addAttachmentToDraft(
  draftId: string,
  filename: string,
  content: Uint8Array
): Promise<void> {
  const emailAddress = process.env.MICROSOFT_EMAIL_ADDRESS || "team@sarani.studio";
  const base64Content = Buffer.from(content).toString("base64");

  await graphFetch<Record<string, unknown>>(
    `/users/${encodeURIComponent(emailAddress)}/messages/${encodeURIComponent(draftId)}/attachments`,
    {
      method: "POST",
      body: JSON.stringify({
        "@odata.type": "#microsoft.graph.fileAttachment",
        name: filename,
        contentType: "application/pdf",
        contentBytes: base64Content,
      }),
    }
  );
}
