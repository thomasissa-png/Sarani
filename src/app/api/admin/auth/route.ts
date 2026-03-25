import { NextRequest, NextResponse } from "next/server";
import { verifyPassword, createSession, destroySession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password || typeof password !== "string") {
      return NextResponse.json({ error: "Password required" }, { status: 400 });
    }

    const passwordResult = verifyPassword(password);
    if (!passwordResult.valid) {
      return NextResponse.json(
        { error: passwordResult.reason === "not_configured"
            ? "Admin password not configured. Set ADMIN_PASSWORD in environment variables."
            : "Invalid password" },
        { status: passwordResult.reason === "not_configured" ? 500 : 401 }
      );
    }

    await createSession();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await destroySession();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
