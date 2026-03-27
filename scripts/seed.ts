import postgres from "postgres";
import { db } from "../src/lib/db/index";
import { clients, contractTemplates } from "../src/lib/db/schema";

/**
 * Seed script — populates the Sarani back-office DB with real clients
 * and default contract templates.
 *
 * Runs essential schema migrations via raw SQL before seeding
 * to ensure all columns exist regardless of Drizzle migrator state.
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
{{client_name}} — {{project_description}}

This Statement of Work ("SOW") is entered into between:

Client: {{client_name}}
Service Provider: SARANI SASU, a company incorporated in France, with company number FR76881687503, and registered address at 7 allee d'Orleans, 92200 Neuilly-sur-Seine, France ("Service Provider").

1. Scope of Services
The Service Provider will provide creative and production services for {{project_description}}. Services may include:
{{deliverables}}

2. Deliverables
{{deliverables_detail}}

Total Project Fee: {{amount}} {{currency}}
(Exclusive of any applicable taxes)

3. Term and Schedule
Start Date: {{start_date}}
The project will proceed according to mutually agreed timelines.
Revisions will be provided as part of the creative review process.

4. Payment Terms
Invoices will be issued upon delivery of the final assets.
Payment Terms: NET 30 days from date of invoice.

5. Confidentiality
Both parties agree to keep all non-public project details, materials, and communications confidential.

6. Ownership of Work
Upon full payment, all final deliverables will be assigned to {{client_name}} for use across paid, owned, and earned channels.
Service Provider may request permission to include non-confidential work in portfolio materials.

7. Termination
Either party may terminate this SOW with 30 days' written notice.

{{special_clauses}}

8. Signatures

SARANI SASU                              {{client_name}}

Name: Emmanuel Gomez                     Name: _______________
Title: Founder                           Title: _______________
Date: _______________                    Date: _______________


INFORMATIONS DE PAIEMENT
Nom du compte : SARANI | IBAN : FR76 1695 8000 0173 0920 6520 229 | BIC : QNTOFRP1XXX`,
    variables: [
      "client_name",
      "project_description",
      "deliverables",
      "deliverables_detail",
      "amount",
      "currency",
      "start_date",
      "special_clauses",
    ],
  },
  {
    name: "ServiceAgreement",
    templateContent: `SERVICE AGREEMENT

This Service Agreement ("Agreement") is dated {{signature_date}} and entered into by and between:

(1) {{legal_entity_name}}, a company registered in {{legal_country}} with its registered address at {{client_address}} (the "Client"); and

(2) SASU Sarani, registered in France under number 881687503, whose registered office is at 7 ALLEE D'ORLEANS 92200 NEUILLY-SUR-SEINE, France ("Service Provider").

The Client and Service Provider are severally referred to as "Party", and collectively as the "Parties".

1. Definitions
"Anti-Corruption Laws" means any laws of the countries in which we do business, including but not limited to the U.S. Foreign Corrupt Practices Act of 1977, the UK Bribery Act 2010, and any other applicable anti-corruption laws, regulations and rules.
"Confidential Information" means any information disclosed by Client to Service Provider, other than any such information required to be disclosed by law.
"Data Protection Legislation" means all privacy laws applicable to any Personal Data processed under or in connection with this Agreement.
"Government Authority" means a national government, political subdivision thereof, or local jurisdiction therein; an instrumentality, board, commission, court, or agency; a government-owned/controlled association, organization, or enterprise; or a public international organization (NGO).
"Personal Data" shall have the meaning ascribed to it under applicable Data Protection Legislation.
"Intellectual Property" shall mean all worldwide rights in and to intellectual property, including without limitation rights to inventions, trade secrets, know-how, technology, research tools, data, software, improvements and rights of authorship and attribution.

2. Supply of Services
2.1 Service Provider shall perform the following services (the "Services"), and provide the following deliverables (the "Deliverables"):

| Field | Details |
|---|---|
| The Services and Deliverables | {{project_description}} |
| Services | {{deliverables}} |
| Specifications | As per creative brief and industry best practices |
| Project Schedule | Start: {{start_date}} / End: {{end_date}} |
| Acceptance Criteria | Deliverables submitted 7 days in advance for approval. Client has unlimited rounds of amendments within 48 hours. |
| Project Managers | Client: {{client_contact}} / Sarani: Emmanuel Gomez |
| Fees and Payments | {{amount}} {{currency}} inclusive of all applicable taxes |
| Bank Details | Bank: Qonto / Branch: 16958 / Account Name: SARANI / Account Number: 73092065202 / IBAN: FR76 1695 8000 0173 0920 6520 229 / SWIFT: QNTOFRP1XXX / Tel: +33 6 64 85 06 31 |

2.2 Service Provider undertakes to provide sufficient qualified personnel to perform and complete the Services.
2.3 Service Provider may engage subcontractors, provided that all subcontractors are skilled and fully-qualified to perform and deliver the Services.

3. Compensation
3.1 Client shall pay Service Provider the fees as set out in the table above (the "Fees"). Service Provider must submit each invoice within 90 calendar days following completion of the relevant Services. Payment shall be made within thirty (30) days after Client's receipt of an undisputed invoice.
3.2 All amounts are exclusive of value added tax ("VAT"). Any other taxes, duties, or customs charges shall be the responsibility of the Service Provider.
3.3 Payment shall not be due until all Services and Deliverables have been accepted by and performed to the satisfaction of Client.

4. Relationship between the Parties
4.1 Service Provider's relationship with Client shall be as a non-exclusive independent contractor. Nothing in this Agreement shall be construed to create a partnership, joint venture, or employer-employee relationship.

5. Confidential Information
Service Provider agrees that it shall not disclose to any third parties or use in any way Client's Confidential Information.

6. Intellectual Property
6.1 Service Provider agrees that all work product, Intellectual Property, and derivative product created under the scope of this Agreement (collectively, the "Work Product"), shall be owned by and remain the sole and exclusive property of Client. Service Provider hereby irrevocably assigns and transfers all worldwide, irrevocable, exclusive, royalty-free, transferable, and perpetual right and license to the Work Product and all Intellectual Property therein.
6.2 If Service Provider has or subsequently acquires any rights to the Work Product that cannot be assigned to Client, including any moral rights, Service Provider hereby unconditionally and irrevocably waives any and all rights to assert and enforce such rights.

7. Representations, Warranties and Undertakings
7.1 Service Provider hereby represents, warrants and undertakes that:
(a) Service Provider has the capacity to execute and implement this Agreement;
(b) the provision of the Services and the Deliverables does not and will not infringe the Intellectual Property of any third party;
(c) the Deliverables are not subject to any adverse claims or restrictions;
(d) Service Provider has the requisite rights and licenses to comply with Section 6;
(e) Service Provider shall release the Client from any complaints, claims, legal claims;
(f) it will comply with all applicable local laws and regulations.

8. Insurance
8.1 Service Provider shall carry public liability insurance and professional indemnity insurance relevant to the Services.

9. Liability and Indemnification
9.1 Service Provider shall fully indemnify, defend and hold harmless Client from and against any and all claims, damages, liabilities, losses, and expenses incurred due to breach of this Agreement, negligent or wilful acts, or IP infringement.
9.2 In no event shall either party be liable for any indirect, consequential or special loss.

10. Term and Termination
10.1 This Agreement shall commence on the date hereof and continue until completion of the Services or one (1) year from the Effective Date ("Term").
10.2 Client may terminate this Agreement on thirty (30) days written notice, or immediately if Service Provider materially breaches any provision.
10.3 Upon termination, Service Provider shall deliver all Work Product, return all Client property, and submit a final invoice.

11. Data Protection
Each of the Service Provider and the Client agree that they will comply with the Data Protection Legislation.

12. Compliance, Anti-Bribery and Corruption
12.1 Service Provider represents and warrants that neither it, nor any of its officers, directors, or shareholders, is subject to any sanctions administered or enforced by the U.S. Department of Treasury's OFAC or the U.S. Department of State.
12.2-12.7 The Service Provider and its Associated Parties shall comply with all Anti-Corruption Laws and shall not request, accept, or offer any off-books commission, improper gift, or other financial benefit.

13. Governing Law and Arbitration
13.1 This Agreement shall be subject to, governed by and construed in accordance with the laws of {{governing_law}}.
13.2 Any dispute arising out of or in connection with the Agreement shall be referred to and finally resolved by arbitration.

13.4 Miscellaneous
13.4.1 This Agreement contains the full and complete understanding between the Parties. Any amendment shall be effective only if made in writing and signed by both Parties.
13.4.2 Notices shall be deemed duly given upon actual delivery, if delivery is by hand; or one (1) day after being sent by overnight courier.
13.4.3 This Agreement may not be assigned by Service Provider without the prior written consent of Client.
13.4.4 A person who is not a party to this Agreement shall not have any rights under it.
13.4.5 The failure of either Party to enforce any provision shall not be construed as a waiver.
13.4.6 If any provision is determined to be invalid or unenforceable, the remainder shall remain in full force and effect.
13.4.7 This Agreement may be executed in any number of counterparts.

This Agreement has been entered into as of the Effective Date.

SIGNED BY:                               SIGNED BY:
{{client_name}}                          SARANI

Signature: _______________               Signature: _______________
Name: _______________                    Name: Emmanuel Gomez
Date: _______________                    Date: _______________

{{special_clauses}}`,
    variables: [
      "legal_entity_name",
      "legal_country",
      "client_address",
      "client_name",
      "client_contact",
      "project_description",
      "deliverables",
      "amount",
      "currency",
      "start_date",
      "end_date",
      "governing_law",
      "special_clauses",
      "signature_date",
    ],
  },
  {
    name: "TalentAgreement",
    templateContent: `STATEMENT OF WORK

This SOW is entered into and made effective as of {{start_date}} ("SOW Effective Date") by and between:

(1) {{legal_entity_name}}, {{client_address}} ("Company" or "{{client_name}}"); and

(2) SASU Sarani, a company registered in France (company number FR76881687503) whose registered office is at 7 allee d'Orleans, 92200 Neuilly-sur-Seine, France ("Service Provider").

each referred to as a "Party", and collectively as the "Parties".

Company wishes to engage Service Provider to provide various creative, production and/or marketing-related services in respect of: {{project_description}}

1. TERM. The Term of this SOW will be from the SOW Effective Date through the later of (a) {{end_date}} or (b) completion of all Services and delivery and acceptance of all Deliverables.

2. SERVICES AND DELIVERABLES. Service Provider shall perform the following services ("Services") and deliver following deliverables ("Deliverables" or "Work Product"):

(a) Talent Engagement & Management. Service Provider shall be responsible for negotiating and entering into a written agreement with the Talent for their participation, with all terms subject to Company's prior written approval. Such services include:
    (i) Negotiating Talent fee, scope, content obligations, rights, and usage;
    (ii) Securing all necessary rights, releases, and permissions;
    (iii) Managing Talent logistics, briefings, rehearsals, on-site coordination, and post-event communication; and
    (iv) Serving as primary liaison with Talent and Talent's representatives.

(b) Creative Development & Programming. Service Provider shall ideate, develop, and submit to Company for approval:
    (i) Creative concept, audience engagement elements, and event flow;
    (ii) Script outlines, talking points, and interview flow;
    (iii) Creative/design plan including staging, lighting design, graphics, music; and
    (iv) Schedule, call sheets, production plan, and staffing plan.

(c) Production. Service Provider will provide all creative, crew, and technical services, including:
    (i) Managing production budgets;
    (ii) Scripting;
    (iii) Selection, appointment and casting of actors, voice artists and other Talent;
    (iv) Making all necessary arrangements for filming and production of the Deliverables;
    (v) Securing any required permits or permissions;
    (vi) Undertaking all post-production editing, scoring, dubbing, cutting and completion; and
    (vii) Any other incidental services reasonably required to fulfil the Creative Brief.

(d) Deliverables:
{{deliverables}}

3. APPROVALS. Service Provider shall submit all creative, technical, and production materials to Company for prior written approval.

4. COMPLIANCE / INSURANCE. Service Provider shall:
    (a) Maintain all legally required insurance;
    (b) Ensure safety and emergency protocols;
    (c) Comply with labor laws, venue regulations, and permit requirements.

5. PROJECT SCHEDULE AND ACCEPTANCE. Service Provider shall deliver each of the Deliverables in accordance with the agreed schedule.

6. FEES/EXPENSES.
    a. Fees. The fee payable to Service Provider shall be {{amount}} {{currency}} (the "Fee"). Any additional costs must be pre-approved in writing.
    b. Payment Terms. Payment shall be made no later than net 30 from the Company's receipt of a written, undisputed invoice.

7. AUTHORIZED REPRESENTATIVES.
    a. Company: {{client_contact}}
    b. Service Provider: Emmanuel Gomez, team@sarani.studio

8. PERMITTED SUBCONTRACTORS. N/A unless specified.

9. GOVERNING LAW / ARBITRATION. This SOW shall be governed by the laws of {{governing_law}}.

10. ANTI-CORRUPTION. Service Provider understands and agrees that it has complied and will continue to comply with Anti-Corruption Laws. Service Provider did not and will not engage in any conduct in violation of the Anti-Corruption Laws.

11. TRADE CONTROL. Service Provider agrees to comply with all applicable trade, economic, and financial laws, and regulations.

{{special_clauses}}

[Signature Page to Follow]

SIGNED BY:                               SIGNED BY:
{{client_name}}                          SARANI SASU

Signature: _______________               Signature: _______________
Name: _______________                    Name: Emmanuel Gomez
Title: _______________                   Title: Founder
Date: _______________                    Date: _______________`,
    variables: [
      "legal_entity_name",
      "client_address",
      "client_name",
      "client_contact",
      "project_description",
      "deliverables",
      "amount",
      "currency",
      "start_date",
      "end_date",
      "governing_law",
      "special_clauses",
    ],
  },
  {
    name: "NDA",
    templateContent: `NON-DISCLOSURE AGREEMENT

Between:
SARANI SASU, a company incorporated in France, with company number FR76881687503, registered at 7 allee d'Orleans, 92200 Neuilly-sur-Seine, France, represented by Emmanuel Gomez, Founder ("Disclosing Party")

And:
{{legal_entity_name}}, registered in {{legal_country}}, VAT {{vat_number}}, represented by {{client_contact}} ("Receiving Party")

1. PURPOSE
The parties wish to exchange confidential information related to: {{project_description}}

2. DEFINITION OF CONFIDENTIAL INFORMATION
"Confidential Information" means any information disclosed by either Party to the other, whether orally, in writing, or by any other means, including but not limited to business plans, creative concepts, pricing, client lists, technical data, trade secrets, know-how, and any other non-public information.

3. OBLIGATIONS
The Receiving Party agrees to:
- Keep all Confidential Information strictly confidential
- Not disclose to any third parties without prior written consent
- Use the information solely for the purpose stated above
- Take reasonable measures to protect the confidentiality of the information

4. EXCLUSIONS
Confidential Information does not include information that:
- Is or becomes publicly available through no fault of the Receiving Party
- Was already in the Receiving Party's possession before disclosure
- Is independently developed without use of the Confidential Information
- Is lawfully obtained from a third party without restriction

5. DURATION
This NDA is effective from {{start_date}} and remains in force for 2 years from the date of last disclosure.

6. RETURN OF INFORMATION
Upon termination or request, the Receiving Party shall return or destroy all Confidential Information and certify in writing that it has done so.

7. GOVERNING LAW
This agreement is governed by French law. Any disputes shall be submitted to the exclusive jurisdiction of the courts of Paris, France.

Signed on {{signature_date}}

SARANI SASU                              {{client_name}}

Name: Emmanuel Gomez                     Name: _______________
Title: Founder                           Title: _______________
Date: _______________                    Date: _______________

INFORMATIONS DE PAIEMENT
Nom du compte : SARANI | IBAN : FR76 1695 8000 0173 0920 6520 229 | BIC : QNTOFRP1XXX`,
    variables: [
      "client_name",
      "legal_entity_name",
      "legal_country",
      "vat_number",
      "client_contact",
      "project_description",
      "start_date",
      "signature_date",
    ],
  },
  {
    name: "Freelance",
    templateContent: `FREELANCE SERVICE AGREEMENT

Between:
SARANI SASU, a company incorporated in France, with company number FR76881687503, registered at 7 allee d'Orleans, 92200 Neuilly-sur-Seine, France, represented by Emmanuel Gomez, Founder ("Company")

And:
{{freelancer_name}}, {{legal_entity_name}}, registered in {{legal_country}} ("Freelancer")

1. SERVICES
The Freelancer agrees to provide the following services: {{project_description}}

2. DELIVERABLES
{{deliverables}}

3. TIMELINE
Start date: {{start_date}}
End date: {{end_date}}

4. COMPENSATION
Total fee: {{amount}} {{currency}} (exclusive of applicable taxes)
Payment terms: Invoices upon delivery. Payment within 30 days of receipt of undisputed invoice.

5. INTELLECTUAL PROPERTY
All work product, deliverables, and intellectual property created under this agreement (collectively, "Work Product") shall be the exclusive property of SARANI SASU and/or its clients. The Freelancer hereby irrevocably assigns all worldwide rights, title, and interest in the Work Product to the Company. The Freelancer retains no rights in the Work Product and agrees not to challenge the Company's ownership.

6. CONFIDENTIALITY
The Freelancer agrees to maintain strict confidentiality regarding all client information, project details, creative concepts, pricing, and internal processes. This obligation survives termination of this agreement for a period of 2 years.

7. INDEPENDENT CONTRACTOR
The Freelancer is an independent contractor and not an employee, partner, or agent of the Company. The Freelancer is responsible for their own taxes, insurance, and social contributions.

8. TERMINATION
Either party may terminate this agreement with 15 days' written notice. In case of material breach, the non-breaching party may terminate immediately upon written notice.

9. SPECIAL TERMS
{{special_clauses}}

10. GOVERNING LAW
This agreement is governed by French law. Any disputes shall be submitted to the exclusive jurisdiction of the courts of Paris, France.

Signed on {{signature_date}}

SARANI SASU                              {{freelancer_name}}

Name: Emmanuel Gomez                     Name: _______________
Title: Founder                           Title: _______________
Date: _______________                    Date: _______________

INFORMATIONS DE PAIEMENT
Nom du compte : SARANI | IBAN : FR76 1695 8000 0173 0920 6520 229 | BIC : QNTOFRP1XXX`,
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

async function ensureSchema() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required");
  }
  const sql = postgres(connectionString, { max: 1 });

  console.log("Ensuring database schema is up to date...");

  // Ensure all tables exist (idempotent — IF NOT EXISTS everywhere)
  await sql.unsafe(`
    -- Users table (migration 0002)
    CREATE TABLE IF NOT EXISTS "users" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "email" text NOT NULL UNIQUE,
      "password_hash" text NOT NULL,
      "name" text NOT NULL,
      "role" varchar(20) NOT NULL DEFAULT 'user',
      "created_at" timestamp NOT NULL DEFAULT now(),
      "updated_at" timestamp NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users" ("email");

    -- Sync cache (migration 0003)
    CREATE TABLE IF NOT EXISTS "sync_cache" (
      "key" TEXT PRIMARY KEY,
      "source" VARCHAR(20) NOT NULL,
      "data" JSONB NOT NULL,
      "fetched_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "ttl_seconds" INTEGER NOT NULL DEFAULT 300
    );
    CREATE INDEX IF NOT EXISTS "idx_sync_cache_source" ON "sync_cache" ("source");

    -- Sync logs (migration 0003)
    CREATE TABLE IF NOT EXISTS "sync_logs" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "source" VARCHAR(20) NOT NULL,
      "action" VARCHAR(50) NOT NULL,
      "entity_id" TEXT,
      "payload" JSONB,
      "status" VARCHAR(20) NOT NULL DEFAULT 'success',
      "error" TEXT,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS "idx_sync_logs_source" ON "sync_logs" ("source");
    CREATE INDEX IF NOT EXISTS "idx_sync_logs_created_at" ON "sync_logs" ("created_at");

    -- Quotes (migration 0003)
    CREATE TABLE IF NOT EXISTS "quotes" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "client_name" TEXT NOT NULL,
      "project_name" TEXT NOT NULL,
      "items" JSONB NOT NULL,
      "total" NUMERIC(12, 2) NOT NULL,
      "currency" VARCHAR(3) NOT NULL DEFAULT 'EUR',
      "pdf_url" TEXT,
      "created_by" TEXT NOT NULL,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS "idx_quotes_client_name" ON "quotes" ("client_name");
    CREATE INDEX IF NOT EXISTS "idx_quotes_created_by" ON "quotes" ("created_by");

    -- Project teams (migration 0006)
    CREATE TABLE IF NOT EXISTS project_teams (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      template_type VARCHAR(50),
      brief TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'draft',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_project_teams_client ON project_teams(client_id);
    CREATE INDEX IF NOT EXISTS idx_project_teams_status ON project_teams(status);

    CREATE TABLE IF NOT EXISTS team_steps (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      team_id UUID NOT NULL REFERENCES project_teams(id) ON DELETE CASCADE,
      step_order INTEGER NOT NULL,
      agent_type VARCHAR(50) NOT NULL,
      label TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      input JSONB,
      output TEXT,
      token_cost INTEGER,
      started_at TIMESTAMP,
      completed_at TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_team_steps_team ON team_steps(team_id);

    CREATE TABLE IF NOT EXISTS team_deliverables (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      step_id UUID NOT NULL REFERENCES team_steps(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      content TEXT NOT NULL,
      format VARCHAR(20) NOT NULL DEFAULT 'markdown',
      version INTEGER NOT NULL DEFAULT 1,
      rerun_comment TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_team_deliverables_step ON team_deliverables(step_id);
  `);

  // Add columns that may be missing (ALTER TABLE with DO block for safety)
  await sql.unsafe(`
    -- payment_terms_days on clients (migration 0005)
    DO $$ BEGIN
      ALTER TABLE "clients" ADD COLUMN "payment_terms_days" INTEGER DEFAULT 45;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $$;

    -- quote_number on quotes (migration 0004)
    DO $$ BEGIN
      ALTER TABLE "quotes" ADD COLUMN "quote_number" VARCHAR(20);
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $$;
  `);

  console.log("Schema up to date.\n");
  await sql.end();
}

async function seed() {
  await ensureSchema();
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
