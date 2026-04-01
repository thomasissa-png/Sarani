import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { isAuthenticatedFromCookie, hashPassword } from "@/lib/auth";
import { CLICKUP_TEAM_MEMBERS } from "@/lib/integrations/config";

// ─── Auto-match ClickUp user by name or email ──────────────────────────────
// Uses the hardcoded CLICKUP_TEAM_MEMBERS as a fallback matching source.
// Matching strategy: exact email > fuzzy name (lowercase contains).

function autoMatchClickUp(name: string, _email: string): number | null {
  const nameLower = name.toLowerCase().trim();

  // Note: _email param reserved for future use when ClickUp API members
  // are fetched with emails. Currently CLICKUP_TEAM_MEMBERS has names only.

  // Try fuzzy name match against CLICKUP_TEAM_MEMBERS
  for (const member of CLICKUP_TEAM_MEMBERS) {
    const memberLower = member.name.toLowerCase().trim();
    // Exact name match
    if (memberLower === nameLower) return member.id;
    // Contains match (either direction)
    if (memberLower.includes(nameLower) || nameLower.includes(memberLower)) {
      return member.id;
    }
    // First + last name match (handle "Thomas I." matching "Thomas Issa")
    const nameParts = nameLower.split(/\s+/);
    const memberParts = memberLower.split(/\s+/);
    if (
      nameParts.length >= 2 &&
      memberParts.length >= 2 &&
      nameParts[0] === memberParts[0] &&
      (memberParts[1].startsWith(nameParts[1]) || nameParts[1].startsWith(memberParts[1]))
    ) {
      return member.id;
    }
  }

  return null;
}

async function requireAdmin(request: NextRequest): Promise<
  | { authorized: true }
  | { authorized: false; response: NextResponse }
> {
  const cookieHeader = request.headers.get("cookie");
  const auth = await isAuthenticatedFromCookie(cookieHeader);
  if (!auth.authenticated || auth.role !== "admin") {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { authorized: true };
}

export async function GET(request: NextRequest) {
  try {
    const check = await requireAdmin(request);
    if (!check.authorized) return check.response;

    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        clickupUserId: users.clickupUserId,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users);

    return NextResponse.json({ users: allUsers });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const check = await requireAdmin(request);
    if (!check.authorized) return check.response;

    const body = await request.json();
    const { email, password, name, role } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }
    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { error: "Password required (min 8 characters)" },
        { status: 400 }
      );
    }
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Name required" }, { status: 400 });
    }
    if (role && !["admin", "user"].includes(role)) {
      return NextResponse.json(
        { error: "Role must be 'admin' or 'user'" },
        { status: 400 }
      );
    }

    // Check for existing user with same email
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const now = new Date();

    // Auto-map: try to find a matching ClickUp member by name or email
    const clickupUserId = autoMatchClickUp(name, email.toLowerCase().trim());

    const [created] = await db
      .insert(users)
      .values({
        email: email.toLowerCase().trim(),
        passwordHash,
        name,
        role: role || "user",
        clickupUserId,
        createdAt: now,
        updatedAt: now,
      })
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        clickupUserId: users.clickupUserId,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      });

    if (clickupUserId) {
      console.log(
        `[users] Auto-mapped user "${name}" to ClickUp ID ${clickupUserId}`
      );
    }

    return NextResponse.json({ user: created }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
