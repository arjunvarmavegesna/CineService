export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { z } from "zod";

const MenuItemSchema = z.object({
  categoryId: z.string(),
  theaterId: z.string().optional().nullable(),
  name: z.string().min(2),
  description: z.string().optional(),
  basePrice: z.number().positive(),
  isVeg: z.boolean().default(true),
  status: z.enum(["AVAILABLE", "OUT_OF_STOCK", "HIDDEN"]).default("AVAILABLE"),
  isFeatured: z.boolean().default(false),
  imageUrl: z.string().url().optional().nullable(),
  tags: z.array(z.string()).default([]),
  sortOrder: z.number().int().default(0),
});

export async function GET(req: NextRequest) {
  const { error } = await requireAdminRole();
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const theaterId = searchParams.get("theaterId");
    const categoryId = searchParams.get("categoryId");
    const search = searchParams.get("search");

    const items = await prisma.menuItem.findMany({
      where: {
        ...(theaterId ? { OR: [{ theaterId }, { theaterId: null }] } : {}),
        ...(categoryId ? { categoryId } : {}),
        ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
      },
      include: {
        category: { select: { id: true, name: true } },
        theater: { select: { id: true, name: true } },
        _count: { select: { orderItems: true } },
      },
      orderBy: [{ categoryId: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({ data: items });
  } catch (err) {
    console.error("[GET /api/admin/menu]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdminRole();
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = MenuItemSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const item = await prisma.menuItem.create({ data: parsed.data });
    return NextResponse.json({ data: item }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/admin/menu]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
