import { NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";
import { getRecentEmails, isEmailConfigured } from "@/lib/integrations/email";

export async function GET() {
  const session = await getUserFromSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isEmailConfigured()) {
    return NextResponse.json(
      { error: "Email integration not configured" },
      { status: 503 }
    );
  }

  try {
    const emails = await getRecentEmails(20);
    return NextResponse.json({ emails });
  } catch (error) {
    console.error("[Emails API] Error fetching emails:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    // Surface the actual error to help diagnose permission issues
    return NextResponse.json(
      { error: `Failed to fetch emails: ${message}` },
      { status: 500 }
    );
  }
}
