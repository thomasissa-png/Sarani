import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clientContacts, clients } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";

// ─── Validation ────────────────────────────────────────────────────────────

const createContactSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  email: z.string().email("Invalid email").max(255).optional().or(z.literal("")),
  division: z.string().max(255).optional().or(z.literal("")),
  role: z.string().max(255).optional().or(z.literal("")),
});

// ─── GET /api/admin/clients/[id]/contacts ──────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify client exists
    const client = await db
      .select({ id: clients.id })
      .from(clients)
      .where(eq(clients.id, id))
      .limit(1);

    if (client.length === 0) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const contacts = await db
      .select()
      .from(clientContacts)
      .where(eq(clientContacts.clientId, id))
      .orderBy(desc(clientContacts.lastSeenAt), desc(clientContacts.createdAt));

    return NextResponse.json(contacts);
  } catch (error) {
    console.error("Error fetching contacts:", error);
    return NextResponse.json(
      { error: "Failed to fetch contacts" },
      { status: 500 }
    );
  }
}

// ─── POST /api/admin/clients/[id]/contacts ─────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = createContactSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Verify client exists
    const client = await db
      .select({ id: clients.id })
      .from(clients)
      .where(eq(clients.id, id))
      .limit(1);

    if (client.length === 0) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const { name, email, division, role } = parsed.data;

    // Check for duplicate email if provided
    if (email) {
      const existing = await db
        .select({ id: clientContacts.id })
        .from(clientContacts)
        .where(
          and(
            eq(clientContacts.clientId, id),
            eq(clientContacts.email, email)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        return NextResponse.json(
          { error: "A contact with this email already exists for this client" },
          { status: 409 }
        );
      }
    }

    const [contact] = await db
      .insert(clientContacts)
      .values({
        clientId: id,
        name,
        email: email || null,
        division: division || null,
        role: role || null,
        source: "manual",
      })
      .returning();

    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    console.error("Error creating contact:", error);
    return NextResponse.json(
      { error: "Failed to create contact" },
      { status: 500 }
    );
  }
}
