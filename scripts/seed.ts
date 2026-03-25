import { db } from "../src/lib/db/index";
import { clients, contractTemplates } from "../src/lib/db/schema";

/**
 * Seed script — populates the Sarani back-office DB with real clients
 * and default contract templates.
 *
 * Usage: npx tsx scripts/seed.ts
 */

const saraniClients = [
  {
    name: "TikTok",
    industry: "tech" as const,
    status: "active" as const,
    primaryLanguage: "EN",
    secondaryLanguages: ["FR", "DE", "ES", "IT", "PT", "AR", "JA", "KO", "ZH"],
    primaryContactName: null,
    primaryContactEmail: null,
    brandTone: "Young, energetic, bold, culturally fluent. Speaks to creators first, brands second.",
    brandGuidelinesNotes: "Always use TikTok wordmark (not 'Tik Tok'). Respect safe zone around logo. No static screenshots — always reference motion/video.",
    primaryColor: "#000000",
    secondaryColors: "#EE1D52, #69C9D0",
    fontName: "Proxima Nova",
  },
  {
    name: "Sony",
    industry: "entertainment" as const,
    status: "active" as const,
    primaryLanguage: "EN",
    secondaryLanguages: ["FR", "DE", "ES", "IT", "JA", "NL", "PL", "SV"],
    primaryContactName: null,
    primaryContactEmail: null,
    brandTone: "Premium, innovative, precise. Technology meets emotion. Product-led but human-centered.",
    brandGuidelinesNotes: "Sony wordmark must be used as provided. Respect product imagery guidelines (no distortion). ULT series has specific color palette. HQ Japan approval required on all assets.",
    primaryColor: "#000000",
    secondaryColors: "#1428A0",
    fontName: "SST",
  },
  {
    name: "GEODIS",
    industry: "logistics" as const,
    status: "active" as const,
    primaryLanguage: "FR",
    secondaryLanguages: ["EN", "DE", "ES", "IT", "NL", "PL", "PT"],
    primaryContactName: null,
    primaryContactEmail: null,
    brandTone: "Professional, reliable, global. B2B logistics — clarity over creativity. Emphasis on efficiency and trust.",
    brandGuidelinesNotes: "GEODIS logo in uppercase always. Brand blue is primary. Presentations must follow the rebranded template (2024 version). 350 presentations rebranded in 3 weeks.",
    primaryColor: "#003B71",
    secondaryColors: "#00A3E0, #FFFFFF",
    fontName: "Helvetica Neue",
  },
  {
    name: "Adidas",
    industry: "fmcg" as const,
    status: "active" as const,
    primaryLanguage: "EN",
    secondaryLanguages: ["FR", "DE", "ES"],
    primaryContactName: null,
    primaryContactEmail: null,
    brandTone: "Bold, athletic, cultural. Street meets sport. Inclusive, empowering, forward-looking.",
    brandGuidelinesNotes: "Three stripes and Trefoil logos — context-dependent. Adidas Arena Paris project: Superstar concept across all touchpoints. Never abbreviate to 'Adi'.",
    primaryColor: "#000000",
    secondaryColors: "#FFFFFF",
    fontName: "AdineuePRO",
  },
  {
    name: "PICO",
    industry: "entertainment" as const,
    status: "active" as const,
    primaryLanguage: "EN",
    secondaryLanguages: ["FR", "AR", "ZH"],
    primaryContactName: null,
    primaryContactEmail: null,
    brandTone: "Experiential, creative, large-scale. Global events expertise. Professional yet imaginative.",
    brandGuidelinesNotes: "PICO in uppercase. Event-focused communications. Always reference physical + digital integration.",
    primaryColor: "#E31937",
    secondaryColors: "#000000, #FFFFFF",
    fontName: "Gotham",
  },
  {
    name: "L'Oréal",
    industry: "luxe" as const,
    status: "active" as const,
    primaryLanguage: "FR",
    secondaryLanguages: ["EN", "ES", "IT", "DE", "PT", "ZH", "JA", "KO", "AR"],
    primaryContactName: null,
    primaryContactEmail: null,
    brandTone: "Luxurious yet accessible. Scientific authority meets beauty aspiration. 'Because you're worth it' energy.",
    brandGuidelinesNotes: "L'Oréal Group vs L'Oréal Paris — different brand guidelines. Accent on the é is mandatory. Multi-brand portfolio: respect each sub-brand's identity.",
    primaryColor: "#000000",
    secondaryColors: "#8B6914",
    fontName: "L'Oréal Sans",
  },
  {
    name: "Pernod Ricard",
    industry: "fmcg" as const,
    status: "active" as const,
    primaryLanguage: "FR",
    secondaryLanguages: ["EN", "ES", "IT", "DE", "PT", "ZH", "JA"],
    primaryContactName: null,
    primaryContactEmail: null,
    brandTone: "Convivial, premium, responsible. Spirits and wine — celebration and craftsmanship. Always include responsible drinking messaging.",
    brandGuidelinesNotes: "Multi-brand portfolio (Absolut, Jameson, Ricard, Mumm, etc.). Each brand has separate guidelines. Corporate communications use Pernod Ricard identity. Mandatory: responsible drinking mentions on all consumer-facing materials.",
    primaryColor: "#1E1E50",
    secondaryColors: "#C8A951, #FFFFFF",
    fontName: "Avenir",
  },
  {
    name: "Air Corsica",
    industry: "aviation" as const,
    status: "active" as const,
    primaryLanguage: "FR",
    secondaryLanguages: ["EN", "IT"],
    primaryContactName: null,
    primaryContactEmail: null,
    brandTone: "Warm, Mediterranean, authentic. Corsican pride meets modern airline. Destination-focused — sun, sea, mountains.",
    brandGuidelinesNotes: "Moor's head logo — sacred, no modifications. Corsican heritage is central. Seasonal campaigns aligned with tourism calendar.",
    primaryColor: "#003366",
    secondaryColors: "#E30613, #FFFFFF",
    fontName: "Futura",
  },
  {
    name: "France Chimie",
    industry: "other" as const,
    status: "active" as const,
    primaryLanguage: "FR",
    secondaryLanguages: ["EN"],
    primaryContactName: null,
    primaryContactEmail: null,
    brandTone: "Institutional, expert, forward-looking. French chemical industry federation — credibility and innovation.",
    brandGuidelinesNotes: "Federation identity guidelines. Formal tone for institutional communications. Sustainability messaging increasingly important.",
    primaryColor: "#0055A4",
    secondaryColors: "#00A859, #FFFFFF",
    fontName: "Marianne",
  },
  {
    name: "ProcessOut",
    industry: "tech" as const,
    status: "active" as const,
    primaryLanguage: "EN",
    secondaryLanguages: ["FR"],
    primaryContactName: null,
    primaryContactEmail: null,
    brandTone: "Technical, fintech, precise. Payment infrastructure — developer-friendly, data-driven. Clean and modern.",
    brandGuidelinesNotes: "ProcessOut as one word, capital P and O. Tech/fintech visual language. Dark mode preferred for developer content.",
    primaryColor: "#6366F1",
    secondaryColors: "#000000, #FFFFFF",
    fontName: "Inter",
  },
  {
    name: "Avenir Actifs",
    industry: "other" as const,
    status: "active" as const,
    primaryLanguage: "FR",
    secondaryLanguages: [],
    primaryContactName: null,
    primaryContactEmail: null,
    brandTone: "Trustworthy, professional, reassuring. Financial/asset management — stability and expertise.",
    brandGuidelinesNotes: "French market only. Conservative visual identity. Compliance-sensitive communications.",
    primaryColor: "#1B365D",
    secondaryColors: "#D4AF37, #FFFFFF",
    fontName: "Garamond",
  },
  {
    name: "GIE",
    industry: "other" as const,
    status: "active" as const,
    primaryLanguage: "FR",
    secondaryLanguages: ["EN"],
    primaryContactName: null,
    primaryContactEmail: null,
    brandTone: "Institutional, collaborative, professional. Economic interest group — partnership-focused.",
    brandGuidelinesNotes: "Institutional communications. Formal register. Multi-stakeholder audience.",
    primaryColor: "#003366",
    secondaryColors: "#FFFFFF",
    fontName: "Arial",
  },
];

const defaultContractTemplates = [
  {
    name: "SOW",
    templateContent: `STATEMENT OF WORK

Between: Sarani Studio ("Agency")
And: {{client_name}} ("Client"), represented by {{legal_entity_name}}, registered in {{legal_country}}, VAT {{vat_number}}

Project: {{project_description}}

1. SCOPE OF WORK
{{deliverables}}

2. TIMELINE
Start date: {{start_date}}
End date: {{end_date}}

3. FEES
Total amount: {{amount}} {{currency}}
Payment terms: 50% upon signature, 50% upon delivery.

4. REVISIONS
Unlimited revisions included during the project period.

5. SPECIAL CLAUSES
{{special_clauses}}

6. GOVERNING LAW
This agreement is governed by French law.

Signed on {{signature_date}}

For Sarani Studio: _______________
For {{client_name}}: _______________`,
    variables: [
      "client_name",
      "legal_entity_name",
      "legal_country",
      "vat_number",
      "project_description",
      "deliverables",
      "start_date",
      "end_date",
      "amount",
      "currency",
      "special_clauses",
      "signature_date",
    ],
  },
  {
    name: "NDA",
    templateContent: `NON-DISCLOSURE AGREEMENT

Between: Sarani Studio ("Disclosing Party")
And: {{client_name}} ("Receiving Party"), represented by {{legal_entity_name}}

1. PURPOSE
The parties wish to exchange confidential information related to: {{project_description}}

2. DEFINITION OF CONFIDENTIAL INFORMATION
All non-public information shared between the parties, including but not limited to business plans, creative concepts, pricing, client lists, and technical data.

3. OBLIGATIONS
The Receiving Party agrees to:
- Keep all Confidential Information strictly confidential
- Not disclose to third parties without prior written consent
- Use the information solely for the purpose stated above

4. DURATION
This NDA is effective from {{start_date}} and remains in force for 2 years.

5. GOVERNING LAW
This agreement is governed by French law.

Signed on {{signature_date}}

For Sarani Studio: _______________
For {{client_name}}: _______________`,
    variables: [
      "client_name",
      "legal_entity_name",
      "project_description",
      "start_date",
      "signature_date",
    ],
  },
  {
    name: "UGC",
    templateContent: `USER-GENERATED CONTENT AGREEMENT

Between: Sarani Studio ("Agency"), on behalf of {{client_name}} ("Brand")
And: {{creator_name}} ("Creator")

1. CONTENT DESCRIPTION
The Creator agrees to produce the following content: {{project_description}}

2. DELIVERABLES
{{deliverables}}

3. USAGE RIGHTS
The Brand is granted worldwide, perpetual rights to use the Content across:
- Social media (organic and paid)
- Website and digital platforms
- Email marketing
{{special_clauses}}

4. COMPENSATION
Total fee: {{amount}} {{currency}}
Payment terms: Within 30 days of content delivery and approval.

5. TIMELINE
Content delivery deadline: {{end_date}}

6. GOVERNING LAW
This agreement is governed by French law.

Signed on {{signature_date}}

For the Brand (via Sarani Studio): _______________
Creator: _______________`,
    variables: [
      "client_name",
      "creator_name",
      "project_description",
      "deliverables",
      "amount",
      "currency",
      "end_date",
      "special_clauses",
      "signature_date",
    ],
  },
  {
    name: "Freelance",
    templateContent: `FREELANCE SERVICE AGREEMENT

Between: Sarani Studio ("Company")
And: {{freelancer_name}} ("Freelancer"), {{legal_entity_name}}, registered in {{legal_country}}

1. SERVICES
The Freelancer agrees to provide the following services: {{project_description}}

2. DELIVERABLES
{{deliverables}}

3. TIMELINE
Start date: {{start_date}}
End date: {{end_date}}

4. COMPENSATION
Total fee: {{amount}} {{currency}}
Payment terms: Within 30 days of invoice receipt.

5. INTELLECTUAL PROPERTY
All work produced under this agreement is the exclusive property of Sarani Studio and/or its clients.

6. CONFIDENTIALITY
The Freelancer agrees to maintain strict confidentiality regarding all client information, project details, and internal processes.

7. SPECIAL TERMS
{{special_clauses}}

8. GOVERNING LAW
This agreement is governed by French law.

Signed on {{signature_date}}

For Sarani Studio: _______________
Freelancer: _______________`,
    variables: [
      "freelancer_name",
      "legal_entity_name",
      "legal_country",
      "project_description",
      "deliverables",
      "start_date",
      "end_date",
      "amount",
      "currency",
      "special_clauses",
      "signature_date",
    ],
  },
];

async function seed() {
  console.log("Seeding Sarani clients...");

  for (const client of saraniClients) {
    const now = new Date();
    await db.insert(clients).values({
      name: client.name,
      industry: client.industry,
      status: client.status,
      primaryLanguage: client.primaryLanguage,
      secondaryLanguages: client.secondaryLanguages,
      primaryContactName: client.primaryContactName,
      primaryContactEmail: client.primaryContactEmail,
      primaryColor: client.primaryColor,
      secondaryColors: client.secondaryColors,
      fontName: client.fontName,
      brandTone: client.brandTone,
      brandGuidelinesNotes: client.brandGuidelinesNotes,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`  + ${client.name}`);
  }

  console.log("\nSeeding contract templates...");

  for (const template of defaultContractTemplates) {
    const now = new Date();
    await db.insert(contractTemplates).values({
      name: template.name,
      templateContent: template.templateContent,
      variables: template.variables,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`  + ${template.name}`);
  }

  console.log(`\nDone! ${saraniClients.length} clients + ${defaultContractTemplates.length} contract templates seeded.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
