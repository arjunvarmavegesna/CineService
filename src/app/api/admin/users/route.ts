export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth";
import { z } from "zod";
import { Role } from "@prisma/client";

export async function GET() {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  try {
    const users = await prisma.user.findMany({
      include: { _count: { select: { orders: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ data: users });
  } catch (err) {
    console.error("[GET /api/admin/users]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  try {
    const body = await req.json();
    const { id, role, isActive } = z.object({
      id: z.string(),
      role: z.nativeEnum(Role).optional(),
      isActive: z.boolean().optional(),
    }).parse(body);

    const user = await prisma.user.update({
      where: { id },
      data: { ...(role ? { role } : {}), ...(isActive !== undefined ? { isActive } : {}) },
    });
    return NextResponse.json({ data: user });
  } catch (err) {
    console.error("[PATCH /api/admin/users]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
