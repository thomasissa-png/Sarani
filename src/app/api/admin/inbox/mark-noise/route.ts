import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { inboxItems } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const MarkNoiseSchema = z.object({
  id: z.string().uuid(),
});

// POST — Reclassify an inbox item as noise (Arya classification was wrong — PM says not relevant)
export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getUserFromSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: z.infer<typeof MarkNoiseSchema>;
  try {
    const rawBody: unknown = await request.json();
    body = MarkNoiseSchema.parse(rawBody);
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
        type: "noise",
        status: "dismissed",
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
    console.error("[Inbox API] mark-noise error:", error);
    return NextResponse.json(
      { error: "Failed to mark item as noise" },
      { status: 500 }
    );
  }
}
