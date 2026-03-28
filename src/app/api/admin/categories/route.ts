export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { slugify } from "@/lib/utils";
import { z } from "zod";

const CategorySchema = z.object({
  name: z.string().min(2),
  icon: z.string().optional(),
  sortOrder: z.number().int().default(0),
});

export async function GET() {
  const { error } = await requireAdminRole();
  if (error) return error;

  try {
    const categories = await prisma.category.findMany({
      include: { _count: { select: { menuItems: true } } },
      orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json({ data: categories });
  } catch (err) {
    console.error("[GET /api/admin/categories]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdminRole();
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = CategorySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const category = await prisma.category.create({
      data: { ...parsed.data, slug: slugify(parsed.data.name) },
    });
    return NextResponse.json({ data: category }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/admin/categories]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
