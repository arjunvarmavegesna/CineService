import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { z } from "zod";

const UpdateSchema = z.object({
  categoryId: z.string().optional(),
  theaterId: z.string().optional().nullable(),
  name: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
  basePrice: z.number().positive().optional(),
  isVeg: z.boolean().optional(),
  status: z.enum(["AVAILABLE", "OUT_OF_STOCK", "HIDDEN"]).optional(),
  isFeatured: z.boolean().optional(),
  imageUrl: z.string().url().optional().nullable(),
  tags: z.array(z.string()).optional(),
  sortOrder: z.number().int().optional(),
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

    const item = await prisma.menuItem.update({ where: { id }, data: parsed.data });
    return NextResponse.json({ data: item });
  } catch (err) {
    console.error("[PATCH /api/admin/menu/[id]]", err);
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
    await prisma.menuItem.update({ where: { id }, data: { status: "HIDDEN" } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/admin/menu/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
