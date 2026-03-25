import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clients, contractTemplates, agentOutputs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { callClaude } from "@/lib/ai/claude";
import { LEGAL_SYSTEM_PROMPT } from "@/lib/ai/prompts/legal";
import {
  generateContractSchema,
  CONTRACT_TYPE_LABELS,
  type ContractType,
} from "@/lib/validations/legal";
import type { Client, ContractTemplate } from "@/lib/db/schema";

/**
 * Build the user message for Claude with client context, template, and contract variables.
 */
function buildUserMessage(
  client: Client,
  template: ContractTemplate | null,
  contractType: ContractType,
  projectDescription: string,
  amount: number,
  currency: string,
  deliverables: string,
  startDate: string,
  endDate: string,
  specialClauses: string | undefined,
  language: string
): string {
  const parts: string[] = [];

  parts.push(`CONTRACT GENERATION REQUEST`);
  parts.push(``);
  parts.push(`CONTRACT TYPE: ${contractType} (${CONTRACT_TYPE_LABELS[contractType]})`);
  parts.push(`LANGUAGE: ${language === "fr" ? "French" : "English"}`);
  parts.push(``);

  // Client legal context
  parts.push(`CLIENT LEGAL CONTEXT:`);
  parts.push(`- Client name: ${client.name}`);
  parts.push(`- Legal entity: ${client.legalEntityName || client.name}`);
  parts.push(`- Country: ${client.legalCountry || "Not specified"}`);
  parts.push(`- VAT number: ${client.vatNumber || "Not specified"}`);
  parts.push(`- Industry: ${client.industry}`);
  parts.push(`- Primary contact: ${client.primaryContactName || "Not specified"}`);
  parts.push(`- Contact email: ${client.primaryContactEmail || "Not specified"}`);
  parts.push(``);

  // Agency context (Sarani)
  parts.push(`AGENCY (SERVICE PROVIDER):`);
  parts.push(`- Name: Sarani`);
  parts.push(`- Type: International Creative Agency`);
  parts.push(``);

  // Contract variables
  parts.push(`CONTRACT VARIABLES:`);
  parts.push(`- Project description: ${projectDescription}`);
  parts.push(`- Total amount: ${amount} ${currency}`);
  parts.push(`- Deliverables: ${deliverables}`);
  parts.push(`- Start date: ${startDate}`);
  parts.push(`- End date: ${endDate}`);

  if (specialClauses && specialClauses.trim()) {
    parts.push(`- Special clauses to include: ${specialClauses}`);
  }

  parts.push(``);

  // Template if available
  if (template && template.templateContent) {
    parts.push(`CONTRACT TEMPLATE TO USE (fill in the {{variables}}):`);
    parts.push(`---`);
    parts.push(template.templateContent);
    parts.push(`---`);
  } else {
    parts.push(`NO TEMPLATE AVAILABLE for ${contractType}. Generate a standard professional ${CONTRACT_TYPE_LABELS[contractType]} contract structure.`);
  }

  parts.push(``);
  parts.push(`Generate the complete contract now. Replace all variables. Output the contract in markdown format.`);

  return parts.join("\n");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = generateContractSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const {
      clientId,
      contractType,
      projectDescription,
      amount,
      currency,
      deliverables,
      startDate,
      endDate,
      specialClauses,
      language,
    } = parsed.data;

    // Fetch client record
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

    // Fetch contract template for this type
    const [template] = await db
      .select()
      .from(contractTemplates)
      .where(eq(contractTemplates.name, contractType))
      .limit(1);

    // Build prompt and call Claude
    const userMessage = buildUserMessage(
      client,
      template || null,
      contractType,
      projectDescription,
      amount,
      currency,
      deliverables,
      startDate,
      endDate,
      specialClauses,
      language
    );

    const { content, usage } = await callClaude({
      systemPrompt: LEGAL_SYSTEM_PROMPT,
      userMessage,
      maxTokens: 8192,
    });

    // Save to agent_outputs
    const [output] = await db
      .insert(agentOutputs)
      .values({
        clientId,
        agentType: "legal",
        inputPayload: {
          contractType,
          projectDescription,
          amount,
          currency,
          deliverables,
          startDate,
          endDate,
          specialClauses,
          language,
        },
        outputContent: content,
        status: "done",
      })
      .returning({ id: agentOutputs.id });

    return NextResponse.json({
      contractText: content,
      contractType,
      clientName: client.name,
      usage,
      outputId: output.id,
    });
  } catch (error: unknown) {
    console.error("Legal generate error:", error);

    const message =
      error instanceof Error ? error.message : "Failed to generate contract";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
