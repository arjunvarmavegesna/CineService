import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "./prisma";
import { Role } from "@prisma/client";

/**
 * Returns the list of emails allowed to access the admin panel.
 * Set ADMIN_EMAILS in your environment: comma-separated, e.g.
 *   ADMIN_EMAILS=you@example.com,colleague@example.com
 */
function getAllowedEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Core admin gate:
 * 1. Requires a valid Clerk session (401 if not logged in)
 * 2. Requires the user's primary email to be in ADMIN_EMAILS (403 if not)
 * 3. Auto-syncs the approved user to the DB as SUPER_ADMIN on every call
 *    (safe: idempotent upsert, never downgrades an existing record)
 */
async function requireApprovedAdmin() {
  const { userId } = await auth();
  if (!userId) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      user: null,
    };
  }

  const allowedEmails = getAllowedEmails();

  // currentUser() is request-scoped cached in Next.js App Router — no extra round-trip
  const clerkUser = await currentUser();
  const primaryEmail = clerkUser?.emailAddresses?.[0]?.emailAddress ?? "";

  if (allowedEmails.length === 0) {
    // ADMIN_EMAILS not configured — deny everyone to force explicit setup
    console.warn("[auth] ADMIN_EMAILS is not set. All admin API access is denied.");
    return {
      error: NextResponse.json(
        { error: "Admin access not configured. Set ADMIN_EMAILS environment variable." },
        { status: 403 }
      ),
      user: null,
    };
  }

  if (!allowedEmails.includes(primaryEmail.toLowerCase())) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      user: null,
    };
  }

  // Email is approved — upsert into DB as SUPER_ADMIN
  const name =
    [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") ||
    undefined;

  const user = await prisma.user.upsert({
    where: { clerkId: userId },
    create: { clerkId: userId, email: primaryEmail, name, role: Role.SUPER_ADMIN },
    update: { role: Role.SUPER_ADMIN, email: primaryEmail, name },
  });

  return { error: null, user };
}

export async function requireAdminRole() {
  return requireApprovedAdmin();
}

export async function requireSuperAdmin() {
  return requireApprovedAdmin();
}

export async function getDbUser() {
  const { userId } = await auth();
  if (!userId) return null;
  return prisma.user.findUnique({ where: { clerkId: userId } });
}

export async function requireAuth() {
  const user = await getDbUser();
  if (!user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      user: null,
    };
  }
  return { error: null, user };
}

export async function syncClerkUser(
  clerkId: string,
  data: { name?: string; email?: string; phone?: string }
) {
  return prisma.user.upsert({
    where: { clerkId },
    create: { clerkId, ...data, role: Role.CUSTOMER },
    update: { ...data },
  });
}
