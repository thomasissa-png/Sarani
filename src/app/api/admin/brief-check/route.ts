import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromSession } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

// ─── Schema ──────────────────────────────────────────────────────────────────

const briefCheckSchema = z.object({
  brief: z.string().min(10, "Brief too short to analyze"),
  projectType: z.string().optional().default("generic"),
  clientName: z.string().optional().default(""),
  deadline: z.string().optional().default(""),
});

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BriefCheck {
  id: string;
  level: "warning" | "error";
  label: string;
  message: string;
}

export interface BriefCheckResponse {
  status: "ok" | "warning" | "error";
  checks: BriefCheck[];
  summary: string;
}

// ─── System Prompt ───────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a senior project manager at Sarani, an international creative agency (45 experts, 5 continents, 24/7).
Your role is to review a project brief submitted by an internal team member BEFORE it is sent to the creative team.

Sarani's operating constraints:
- Minimum delivery time: D+1 (24 hours). No same-day delivery unless flagged as ASAP.
- All deliverables require a format specification (dimensions, file type, aspect ratio).
- Multilingual projects always require explicit target language(s).
- Volume must be a specific number, not vague ("several", "some", "a few" are not acceptable).
- Brand guidelines or visual references should be mentioned or attached.

Analyze the brief and return a JSON response with this exact structure:
{
  "status": "ok" | "warning" | "error",
  "checks": [
    {
      "id": "C1",
      "level": "warning" | "error",
      "label": "Short issue title (max 8 words)",
      "message": "One actionable sentence explaining the problem and what to fix."
    }
  ],
  "summary": "One sentence recommendation for the PM."
}

Possible checks (only flag if actually missing):
- C1: Brief too short (< 50 words) → warning
- C2: No delivery format specified → error
- C3: No deadline mentioned → warning
- C4: Deadline < 24h or already passed → error
- C5: No target language for multilingual project → error
- C6: Volume not specified (no number of assets) → warning
- C7: No visual references or brand guidelines mentioned → warning
- C8: No usage context (web/print/social/etc) → warning
- C9: Contradiction between volume and deadline → error

CONDITIONAL CHECKS BY PROJECT TYPE:
Only evaluate these if the project type matches. Add them to the checks array alongside C1-C9.

If the project type is "design", also check:
- C10-DESIGN: Are exact dimensions specified for each deliverable? (e.g., 728x90px, 1080x1080px) → error
- C11-DESIGN: Is the output format specified? (PNG, SVG, PDF, JPG) → error
- C12-DESIGN: Is the number of variations/formats specified? → warning
- C13-DESIGN: Are brand guidelines referenced or provided? → warning

If the project type is "translation", also check:
- C10-TRANSLATION: Is the source language explicitly stated? → error
- C11-TRANSLATION: Are ALL target languages explicitly listed? → error
- C12-TRANSLATION: Is the register/tone specified? (formal, informal, technical) → warning
- C13-TRANSLATION: Is an existing client glossary or terminology guide mentioned? → warning

If the project type is "video", also check:
- C10-VIDEO: Is a target duration specified? (in seconds or minutes) → error
- C11-VIDEO: Is the aspect ratio specified? (16:9, 9:16, 1:1) → error
- C12-VIDEO: Is the distribution platform specified? (TikTok, YouTube, LinkedIn, website) → warning
- C13-VIDEO: Is it specified whether subtitles are required? → warning
- C14-VIDEO: Is it specified whether voiceover is required? → warning

If the project type is "social", also check:
- C10-SOCIAL: Are the target platforms listed? (LinkedIn, Instagram, TikTok, etc.) → error
- C11-SOCIAL: Is the number of posts/variants specified? → error
- C12-SOCIAL: Are publication dates or a calendar mentioned? → warning

Rules:
- Only flag REAL issues. If info is present, do not flag.
- Apply conditional checks ONLY when the project type matches. Do not flag conditional checks for unrelated project types.
- status = "error" if any check is "error". "warning" if only warnings. "ok" if no issues.
- Return VALID JSON only. No markdown, no extra text.`;

// ─── Route Handler ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const session = await getUserFromSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 15 requests per minute (1 Haiku call per request)
  if (!checkRateLimit("brief-check", 15, 60_000)) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  const body = await request.json();
  const parsed = briefCheckSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { brief, projectType, clientName, deadline } = parsed.data;

  // Build the full brief context for the AI
  const briefContext = [
    clientName ? `Client: ${clientName}` : "",
    projectType !== "generic" ? `Project type: ${projectType}` : "",
    deadline ? `Deadline: ${deadline}` : "",
    "",
    brief,
  ]
    .filter((l) => l !== "")
    .join("\n");

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI service not configured" },
        { status: 503 }
      );
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        temperature: 0,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Analyze this brief:\n\n"""${briefContext}"""`,
          },
        ],
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[BriefCheck] Anthropic API error:", errText);
      return NextResponse.json(
        { error: "AI analysis failed" },
        { status: 502 }
      );
    }

    const data = await response.json();
    const text =
      data.content?.[0]?.type === "text" ? data.content[0].text : "";

    // Parse the JSON response from Claude
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { status: "ok", checks: [], summary: "Analysis could not be parsed." } satisfies BriefCheckResponse
      );
    }

    const result: BriefCheckResponse = JSON.parse(jsonMatch[0]);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      return NextResponse.json(
        {
          status: "ok",
          checks: [],
          summary: "Analysis timed out. You can submit as-is.",
        } satisfies BriefCheckResponse
      );
    }
    console.error("[BriefCheck] Error:", err);
    return NextResponse.json(
      { error: "Brief check failed" },
      { status: 500 }
    );
  }
}
