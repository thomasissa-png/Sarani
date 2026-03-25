import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clients } from "@/lib/db/schema";
import { clientFormSchema } from "@/lib/validations/client";
import { eq, like, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    let query = db.select().from(clients);

    const conditions = [];
    if (status && status !== "all") {
      conditions.push(eq(clients.status, status));
    }
    if (search) {
      conditions.push(like(clients.name, `%${search}%`));
    }

    const result =
      conditions.length > 0
        ? await query.where(
            conditions.length === 1
              ? conditions[0]
              : sql`${conditions[0]} AND ${conditions[1]}`
          )
        : await query;

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching clients:", error);
    return NextResponse.json(
      { error: "Failed to fetch clients" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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
    const id = crypto.randomUUID();

    await db.insert(clients).values({
      id,
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
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    console.error("Error creating client:", error);
    return NextResponse.json(
      { error: "Failed to create client" },
      { status: 500 }
    );
  }
}
