import { db } from "../src/lib/db/index";
import { users } from "../src/lib/db/schema";
import { hashPassword } from "../src/lib/password";

/**
 * Seed script — creates a default admin user if no users exist.
 *
 * Usage: npx tsx scripts/seed-admin.ts
 *
 * Reads ADMIN_PASSWORD from environment to set the initial admin password.
 */

async function seedAdmin() {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    console.error("ERROR: ADMIN_PASSWORD env var is required to seed the admin user.");
    process.exit(1);
  }

  // Check if any users already exist
  const existingUsers = await db.select({ id: users.id }).from(users).limit(1);
  if (existingUsers.length > 0) {
    console.log("Users already exist in the database. Skipping admin seed.");
    process.exit(0);
  }

  const passwordHash = await hashPassword(adminPassword);
  const now = new Date();

  await db.insert(users).values({
    email: "admin@sarani.studio",
    passwordHash,
    name: "Admin",
    role: "admin",
    createdAt: now,
    updatedAt: now,
  });

  console.log("Admin user created:");
  console.log("  Email: admin@sarani.studio");
  console.log("  Role: admin");
  console.log("  Password: (from ADMIN_PASSWORD env var)");
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
