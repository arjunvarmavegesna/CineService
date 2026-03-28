import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "./prisma";
import { Role } from "@prisma/client";

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

export async function requireAdminRole() {
  const { error, user } = await requireAuth();
  if (error || !user) {
    return { error: error ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 }), user: null };
  }
  const allowed: Role[] = [Role.SUPER_ADMIN, Role.THEATER_ADMIN, Role.OPERATIONS_STAFF, Role.KITCHEN_STAFF];
  if (!allowed.includes(user.role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), user: null };
  }
  return { error: null, user };
}

export async function requireSuperAdmin() {
  const { error, user } = await requireAuth();
  if (error || !user) {
    return { error: error ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 }), user: null };
  }
  if (user.role !== Role.SUPER_ADMIN) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), user: null };
  }
  return { error: null, user };
}

export async function syncClerkUser(clerkId: string, data: { name?: string; email?: string; phone?: string }) {
  return prisma.user.upsert({
    where: { clerkId },
    create: { clerkId, ...data, role: Role.CUSTOMER },
    update: { ...data },
  });
}
