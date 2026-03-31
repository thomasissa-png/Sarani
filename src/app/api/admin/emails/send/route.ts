import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromSession } from "@/lib/auth";
import { sendEmail, isEmailConfigured } from "@/lib/integrations/email";
import { checkRateLimit, UUID_REGEX } from "@/lib/rate-limit";

// ─── Validation ────────────────────────────────────────────────────────────

const SendEmailSchema = z.object({
  to: z.string().email("Invalid recipient email address"),
  subject: z.string().min(1, "Subject is required").max(998, "Subject too long"),
  body: z.string().min(1, "Body is required"),
  replyToMessageId: z.string().optional(),
});

// ─── POST handler ──────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Auth guard
  const session = await getUserFromSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 10 requests per minute
  if (!checkRateLimit("email-send", 10, 60_000)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before sending another email." },
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
  let parsed: z.infer<typeof SendEmailSchema>;
  try {
    const rawBody = await request.json();
    parsed = SendEmailSchema.parse(rawBody);
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

  // UUID validation for replyToMessageId if provided
  if (parsed.replyToMessageId && !UUID_REGEX.test(parsed.replyToMessageId)) {
    // Graph API message IDs are not UUIDs — they're long base64-like strings
    // Only reject obviously invalid values (empty after trim)
    if (parsed.replyToMessageId.trim().length === 0) {
      return NextResponse.json(
        { error: "replyToMessageId cannot be empty" },
        { status: 400 }
      );
    }
  }

  try {
    const result = await sendEmail({
      to: parsed.to,
      subject: parsed.subject,
      body: parsed.body,
      replyToMessageId: parsed.replyToMessageId,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? "Failed to send email" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
    });
  } catch (error) {
    console.error("[Email Send] Error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to send email";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
