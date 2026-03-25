import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { clients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const validateRequestSchema = z.object({
  clientId: z.string().uuid("Invalid client ID"),
  sourceLanguage: z.string().min(2).max(5),
  targetLanguage: z.string().min(2).max(5),
  sourceText: z.string().min(1, "Source text is required"),
  validatedTranslation: z.string().min(1, "Validated translation is required"),
});

/**
 * POST /api/admin/agents/translator/validate
 *
 * Appends a validated translation pair to the client's translationMemory field.
 * This builds up a per-client memory of approved translations that the translator
 * agent uses for consistency in future translations.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = validateRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const {
      clientId,
      sourceLanguage,
      targetLanguage,
      sourceText,
      validatedTranslation,
    } = parsed.data;

    // Fetch current client
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1);

    if (!client) {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      );
    }

    // Build new translation memory entry
    const timestamp = new Date().toISOString().slice(0, 10);
    const newEntry = `[${timestamp}] (${sourceLanguage}>${targetLanguage}) "${truncate(sourceText, 200)}" => "${truncate(validatedTranslation, 200)}"`;

    // Append to existing translation memory
    const existingMemory = client.translationMemory?.trim() ?? "";
    const updatedMemory = existingMemory
      ? `${existingMemory}\n${newEntry}`
      : newEntry;

    // Update client record
    await db
      .update(clients)
      .set({
        translationMemory: updatedMemory,
        updatedAt: new Date(),
      })
      .where(eq(clients.id, clientId));

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Translator validate error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to save validated translation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}
