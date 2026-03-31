import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromSession } from "@/lib/auth";
import { createDraft, isEmailConfigured } from "@/lib/integrations/email";
import { checkRateLimit } from "@/lib/rate-limit";

// ─── Validation ────────────────────────────────────────────────────────────

const DraftEmailSchema = z.object({
  to: z.string().email("Invalid recipient email address"),
  subject: z.string().min(1, "Subject is required").max(998, "Subject too long"),
  body: z.string().min(1, "Body is required"),
  replyToMessageId: z.string().optional(),
});

// ─── POST handler ──────────────────────────────────────────────────────────

/**
 * Create a draft email in Outlook (NOT sent).
 * The PM reviews the draft and sends it manually.
 * Returns the draft ID and an Outlook web link for review.
 */
export async function POST(request: NextRequest) {
  // Auth guard
  const session = await getUserFromSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 10 drafts per minute
  if (!checkRateLimit("email-draft", 10, 60_000)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before creating another draft." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  // Email integration check
  if (!isEmailConfigured()) {
    return NextResponse.json(
      { error: "Email integration not configured" },
      { status: 503 }
    );
  }

  // Parse and validate body
  let parsed: z.infer<typeof DraftEmailSchema>;
  try {
    const rawBody = await request.json();
    parsed = DraftEmailSchema.parse(rawBody);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  // Validate replyToMessageId if provided
  if (parsed.replyToMessageId && parsed.replyToMessageId.trim().length === 0) {
    return NextResponse.json(
      { error: "replyToMessageId cannot be empty" },
      { status: 400 }
    );
  }

  try {
    const result = await createDraft({
      to: parsed.to,
      subject: parsed.subject,
      body: parsed.body,
      replyToMessageId: parsed.replyToMessageId,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? "Failed to create draft" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      draftId: result.draftId,
      webLink: result.webLink,
      message: "Draft created in Outlook. Review and send manually.",
    });
  } catch (error) {
    console.error("[Email Draft] Error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create draft";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
