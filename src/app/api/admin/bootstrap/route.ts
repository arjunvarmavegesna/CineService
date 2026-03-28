export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

/**
 * POST /api/admin/bootstrap
 * Creates the first SUPER_ADMIN from the currently logged-in Clerk user.
 * Only works when there are 0 SUPER_ADMIN users in the database.
 * Safe to expose: becomes a no-op once any admin exists.
 */
export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  try {
    // Safety check: only works when no super admins exist yet
    const adminCount = await prisma.user.count({
      where: { role: Role.SUPER_ADMIN },
    });
    if (adminCount > 0) {
      return NextResponse.json({ error: "Admin already exists. Contact your system administrator." }, { status: 403 });
    }

    // Fetch Clerk user details to populate the DB record
    const clerkUser = await currentUser();
    const name = [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") || undefined;
    const email = clerkUser?.emailAddresses?.[0]?.emailAddress || undefined;

    // Upsert: create if not exists, upgrade to SUPER_ADMIN if already CUSTOMER
    const user = await prisma.user.upsert({
      where: { clerkId: userId },
      create: { clerkId: userId, name, email, role: Role.SUPER_ADMIN },
      update: { role: Role.SUPER_ADMIN, name, email },
    });

    return NextResponse.json({ data: user, message: "Admin account created successfully. Refresh to continue." });
  } catch (err) {
    console.error("[POST /api/admin/bootstrap]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
