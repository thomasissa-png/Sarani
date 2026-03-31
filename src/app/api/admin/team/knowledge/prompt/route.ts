import { NextRequest, NextResponse } from "next/server";
import { isAuthenticatedFromCookie } from "@/lib/auth";
import { buildTeamKnowledgePrompt } from "@/lib/arya/team-knowledge-loader";

// ─── GET /api/admin/team/knowledge/prompt?member=email ────────────────────────
// Returns a plain-text block injectable into LLM prompts.

export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const auth = await isAuthenticatedFromCookie(cookieHeader);
    if (!auth.authenticated || auth.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(request.url);
    const memberEmail = url.searchParams.get("member");

    if (!memberEmail) {
      return NextResponse.json(
        { error: "Missing required query parameter: member (email)" },
        { status: 400 }
      );
    }

    const prompt = await buildTeamKnowledgePrompt(memberEmail);

    return NextResponse.json({ prompt });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
