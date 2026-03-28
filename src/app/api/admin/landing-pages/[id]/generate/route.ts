import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { landingPages, landingPageVersions, clients } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";
import { callClaudeJSON } from "@/lib/ai/claude";
import { checkRateLimit, UUID_REGEX } from "@/lib/rate-limit";
import type { LandingPageSections } from "@/lib/db/schema";
import { z } from "zod";

// ─── Zod schema for LLM output validation ─────────────────────────────────

const TestimonialSchema = z.object({
  quote: z.string().min(10),
  author: z.string().min(1),
  company: z.string().min(1),
});

const LandingPageOutputSchema = z.object({
  hero: z.object({
    headline: z.string().min(3),
    subheadline: z.string().min(10),
    ctaText: z.string().min(1),
    ctaUrl: z.string().default("#contact"),
    backgroundType: z.enum(["color", "image"]).default("color"),
    imageUrl: z.string().url().optional(),
  }),
  features: z
    .array(
      z.object({
        iconName: z.string(),
        title: z.string().min(1),
        description: z.string().min(10),
      })
    )
    .min(2)
    .max(6),
  featuresHeadline: z.string().min(3).optional(),
  gallery: z
    .array(
      z.object({
        imageUrl: z.string().url(),
        caption: z.string().optional(),
      })
    )
    .optional(),
  socialProof: z
    .union([TestimonialSchema, z.array(TestimonialSchema).min(1).max(5)])
    .optional(),
  pricing: z
    .object({
      headline: z.string().min(3),
      items: z.array(
        z.object({
          name: z.string().min(1),
          price: z.string().min(1),
          description: z.string().optional(),
        })
      ).min(1),
      total: z.string().optional(),
      note: z.string().optional(),
    })
    .optional(),
  team: z
    .object({
      headline: z.string().min(3),
      members: z.array(
        z.object({
          name: z.string().min(1),
          role: z.string().min(1),
        })
      ).min(1),
    })
    .optional(),
  cta: z.object({
    headline: z.string().min(3),
    subtext: z.string().min(5),
    buttonText: z.string().min(1),
    buttonUrl: z.string().default("#contact"),
  }),
  footer: z.object({
    tagline: z.string().min(3),
  }),
  meta: z.object({
    title: z.string().min(5).max(70),
    description: z.string().min(50).max(160),
  }),
});

// ─── System prompt ─────────────────────────────────────────────────────────

function buildSystemPrompt(
  clientBrand: {
    name: string;
    brandTone: string | null;
    brandGuidelinesNotes: string | null;
  }
): string {
  let prompt = `You are a landing page copy generator for Sarani, an international creative agency. You produce compelling, conversion-focused landing page content.

You generate structured JSON for landing page sections. Available sections:

REQUIRED: hero, features, cta, footer, meta
OPTIONAL: featuresHeadline, gallery, socialProof, pricing, team

SECTION DETAILS:
- hero: { headline, subheadline, ctaText, ctaUrl, backgroundType ("color"|"image"), imageUrl? }
- featuresHeadline: string — a custom title for the features section. Choose something specific to the campaign, NOT generic like "Why choose us"
- features: array of { iconName, title, description }. Icon options: zap, shield, globe, clock, star, check, target, users, heart, award, briefcase, trending
- gallery: array of { imageUrl, caption? } — include if the brief mentions visual work, portfolio, or campaign assets
- socialProof: single object OR array of { quote, author, company } — include 2-3 testimonials when possible for credibility
- pricing: { headline, items: [{ name, price, description? }], total?, note? } — include ONLY if the brief mentions a proposal, quote, or pricing
- team: { headline, members: [{ name, role }] } — include ONLY if the brief mentions a team or key people
- cta: { headline, subtext, buttonText, buttonUrl }
- footer: { tagline }
- meta: { title (max 70 chars), description (50-160 chars) }

RULES:
- The copy must be compelling, specific, and action-oriented
- Lead with the value proposition, not the features
- Use evidence and specifics, never vague marketing language
- The hero headline should be maximum 10 words — punchy and memorable
- Features should highlight concrete benefits, not abstract promises
- CTA should create urgency without being pushy
- Adapt the structure to the brief: a campaign LP is different from a proposal LP
- Output ONLY valid JSON. No markdown, no explanation.

CLIENT: ${clientBrand.name}`;

  if (clientBrand.brandTone) {
    prompt += `\nBRAND TONE: ${clientBrand.brandTone}. Match this tone exactly in all copy.`;
  }
  if (clientBrand.brandGuidelinesNotes) {
    prompt += `\nBRAND GUIDELINES: ${clientBrand.brandGuidelinesNotes}. Respect these constraints.`;
  }

  return prompt;
}

// ─── POST /api/admin/landing-pages/[id]/generate ───────────────────────────

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }
    if (!checkRateLimit("llm-lp-generate", 10, 60_000)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Max 10 generations per minute." },
        { status: 429 }
      );
    }

    // 1. Fetch landing page + client
    const [page] = await db
      .select({
        id: landingPages.id,
        title: landingPages.title,
        brief: landingPages.brief,
        status: landingPages.status,
        language: landingPages.language,
        clientId: landingPages.clientId,
        manualOverrides: landingPages.manualOverrides,
        clientName: clients.name,
        clientPrimaryColor: clients.primaryColor,
        clientFontName: clients.fontName,
        clientBrandTone: clients.brandTone,
        clientBrandGuidelines: clients.brandGuidelinesNotes,
      })
      .from(landingPages)
      .leftJoin(clients, eq(landingPages.clientId, clients.id))
      .where(eq(landingPages.id, id));

    if (!page) {
      return NextResponse.json(
        { error: "Landing page not found" },
        { status: 404 }
      );
    }

    if (page.status !== "draft" && page.status !== "ready") {
      return NextResponse.json(
        { error: "Can only generate from draft or ready status" },
        { status: 400 }
      );
    }

    if (page.brief.length < 50) {
      return NextResponse.json(
        {
          error:
            "Brief too short — add more context about the campaign goal, target audience, and key message (minimum 50 characters)",
        },
        { status: 400 }
      );
    }

    // 2. Set status to generating
    await db
      .update(landingPages)
      .set({ status: "generating", updatedAt: new Date() })
      .where(eq(landingPages.id, id));

    // 3. Build prompts
    const systemPrompt = buildSystemPrompt({
      name: page.clientName ?? "Client",
      brandTone: page.clientBrandTone,
      brandGuidelinesNotes: page.clientBrandGuidelines,
    });

    const userMessage = `Generate a landing page for:

Title: ${page.title}
Client: ${page.clientName ?? "Unknown"}
Language: ${page.language || "EN"}

Brief:
${page.brief}

${page.clientPrimaryColor ? `Brand primary color: ${page.clientPrimaryColor}` : ""}
${page.clientFontName ? `Brand font: ${page.clientFontName}` : ""}

Output a single JSON object. Required keys: hero, features (3-4 items), cta, footer, meta.
Also include a "featuresHeadline" string — a custom section title specific to this campaign (never use generic titles like "Why choose us").
Optional keys based on the brief context:
- socialProof: include 2-3 credible testimonials as an array when possible
- pricing: include ONLY if the brief mentions a proposal, budget, or pricing
- team: include ONLY if the brief mentions team members or key contacts
- gallery: include ONLY if the brief mentions visual assets or portfolio work`;

    // 4. Call Claude
    let sections: LandingPageSections;
    try {
      const result = await callClaudeJSON<z.infer<typeof LandingPageOutputSchema>>({
        systemPrompt,
        userMessage,
        maxTokens: 3072,
        timeout: 30_000,
      });

      const parsed = LandingPageOutputSchema.safeParse(result.data);
      if (!parsed.success) {
        // Retry once
        console.warn("LP generation failed Zod validation, retrying:", parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", "));
        const retry = await callClaudeJSON<z.infer<typeof LandingPageOutputSchema>>({
          systemPrompt,
          userMessage: userMessage + "\n\nIMPORTANT: Previous response had validation errors. Ensure all required fields are present. Features must be an array of 2-6 items. Meta description must be 50-160 chars.",
          maxTokens: 3072,
          timeout: 30_000,
        });
        const retryParsed = LandingPageOutputSchema.safeParse(retry.data);
        if (!retryParsed.success) {
          throw new Error(`Validation failed after retry: ${retryParsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
        }
        sections = retryParsed.data as LandingPageSections;
      } else {
        sections = parsed.data as LandingPageSections;
      }
    } catch (err) {
      // Revert status
      await db
        .update(landingPages)
        .set({ status: "draft", updatedAt: new Date() })
        .where(eq(landingPages.id, id));

      return NextResponse.json(
        {
          error: `Generation failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        },
        { status: 500 }
      );
    }

    // 5. Create version record
    const [versionCount] = await db
      .select({ count: count() })
      .from(landingPageVersions)
      .where(eq(landingPageVersions.landingPageId, id));

    const nextVersion = (versionCount?.count ?? 0) + 1;

    const [version] = await db
      .insert(landingPageVersions)
      .values({
        landingPageId: id,
        version: nextVersion,
        sections,
        createdBy: "ai",
      })
      .returning();

    // 6. Update landing page
    const [updated] = await db
      .update(landingPages)
      .set({
        status: "ready",
        sections,
        updatedAt: new Date(),
      })
      .where(eq(landingPages.id, id))
      .returning();

    return NextResponse.json({
      landingPage: updated,
      version,
    });
  } catch (error) {
    console.error("Error generating landing page:", error);
    return NextResponse.json(
      { error: "Failed to generate landing page" },
      { status: 500 }
    );
  }
}
