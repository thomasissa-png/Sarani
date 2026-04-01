import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { inboxItems } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// ─── Validation ───────────────────────────────────────────────────────────

const NotNoiseSchema = z.object({
  id: z.string().uuid(),
});

// ─── POST — Recover a noise item back to inbox ───────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getUserFromSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: z.infer<typeof NotNoiseSchema>;
  try {
    const rawBody: unknown = await request.json();
    body = NotNoiseSchema.parse(rawBody);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const [updated] = await db
      .update(inboxItems)
      .set({
        type: "email_classified",
        status: "pending",
        updatedAt: new Date(),
      })
      .where(eq(inboxItems.id, body.id))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Inbox item not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ item: updated });
  } catch (error) {
    console.error("[Inbox API] not-noise error:", error);
    return NextResponse.json(
      { error: "Failed to update inbox item" },
      { status: 500 }
    );
  }
}
