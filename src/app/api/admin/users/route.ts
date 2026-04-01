import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { isAuthenticatedFromCookie, hashPassword } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { CLICKUP_TEAM_MEMBERS } from "@/lib/integrations/config";

const CreateUserSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
  role: z.enum(["admin", "user"]).optional().default("user"),
});

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

    if (!checkRateLimit("users-create", 10, 60_000)) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

    let body: z.infer<typeof CreateUserSchema>;
    try {
      const rawBody = await request.json();
      body = CreateUserSchema.parse(rawBody);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
      }
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { email, password, name, role } = body;

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
