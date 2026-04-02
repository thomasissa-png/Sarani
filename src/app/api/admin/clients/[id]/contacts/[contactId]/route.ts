import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clientContacts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

// ─── Validation ────────────────────────────────────────────────────────────

const updateContactSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().max(255).optional().or(z.literal("")),
  division: z.string().max(255).optional().or(z.literal("")),
  role: z.string().max(255).optional().or(z.literal("")),
});

// ─── PATCH /api/admin/clients/[id]/contacts/[contactId] ────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  try {
    const { id, contactId } = await params;
    const body = await request.json();
    const parsed = updateContactSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Verify contact exists and belongs to client
    const existing = await db
      .select({ id: clientContacts.id })
      .from(clientContacts)
      .where(
        and(
          eq(clientContacts.id, contactId),
          eq(clientContacts.clientId, id)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      );
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    if (parsed.data.email !== undefined) updates.email = parsed.data.email || null;
    if (parsed.data.division !== undefined) updates.division = parsed.data.division || null;
    if (parsed.data.role !== undefined) updates.role = parsed.data.role || null;

    const [updated] = await db
      .update(clientContacts)
      .set(updates)
      .where(eq(clientContacts.id, contactId))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating contact:", error);
    return NextResponse.json(
      { error: "Failed to update contact" },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/admin/clients/[id]/contacts/[contactId] ───────────────────

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  try {
    const { id, contactId } = await params;

    const existing = await db
      .select({ id: clientContacts.id })
      .from(clientContacts)
      .where(
        and(
          eq(clientContacts.id, contactId),
          eq(clientContacts.clientId, id)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      );
    }

    await db
      .delete(clientContacts)
      .where(eq(clientContacts.id, contactId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting contact:", error);
    return NextResponse.json(
      { error: "Failed to delete contact" },
      { status: 500 }
    );
  }
}
