import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clients } from "@/lib/db/schema";
import { clientFormSchema } from "@/lib/validations/client";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await db
      .select()
      .from(clients)
      .where(eq(clients.id, id))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Error fetching client:", error);
    return NextResponse.json(
      { error: "Failed to fetch client" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = clientFormSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const now = new Date().toISOString();

    await db
      .update(clients)
      .set({
        name: data.name,
        industry: data.industry,
        status: data.status,
        primaryLanguage: data.primaryLanguage,
        secondaryLanguages: JSON.stringify(data.secondaryLanguages),
        primaryContactName: data.primaryContactName || null,
        primaryContactEmail: data.primaryContactEmail || null,
        clickupProjectId: data.clickupProjectId || null,
        primaryColor: data.primaryColor || null,
        secondaryColors: data.secondaryColors || null,
        fontName: data.fontName || null,
        brandTone: data.brandTone || null,
        brandGuidelinesNotes: data.brandGuidelinesNotes || null,
        translationMemory: data.translationMemory || null,
        prohibitedTerms: data.prohibitedTerms || null,
        legalEntityName: data.legalEntityName || null,
        legalCountry: data.legalCountry || null,
        vatNumber: data.vatNumber || null,
        signedFrameworkAgreement: data.signedFrameworkAgreement,
        preferredContractTemplate:
          data.preferredContractTemplate || null,
        updatedAt: now,
      })
      .where(eq(clients.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating client:", error);
    return NextResponse.json(
      { error: "Failed to update client" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.delete(clients).where(eq(clients.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting client:", error);
    return NextResponse.json(
      { error: "Failed to delete client" },
      { status: 500 }
    );
  }
}
