import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { z } from "zod";

const UpdateSchema = z.object({
  name: z.string().min(1).optional(),
  number: z.number().int().positive().optional(),
  capacity: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdminRole();
  if (error) return error;

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const screen = await prisma.screen.update({ where: { id }, data: parsed.data });
    return NextResponse.json({ data: screen });
  } catch (err) {
    console.error("[PATCH /api/admin/screens/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdminRole();
  if (error) return error;

  try {
    const { id } = await params;
    await prisma.screen.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/admin/screens/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
