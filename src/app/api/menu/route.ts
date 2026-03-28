import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const theaterId = searchParams.get("theaterId");
    const categoryId = searchParams.get("categoryId");
    const search = searchParams.get("search");

    const items = await prisma.menuItem.findMany({
      where: {
        status: "AVAILABLE",
        OR: theaterId
          ? [{ theaterId }, { theaterId: null }]
          : [{ theaterId: null }],
        ...(categoryId ? { categoryId } : {}),
        ...(search
          ? { name: { contains: search, mode: "insensitive" } }
          : {}),
      },
      include: { category: { select: { id: true, name: true, icon: true } } },
      orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({ data: items });
  } catch (error) {
    console.error("[GET /api/menu]", error);
    return NextResponse.json({ error: "Failed to fetch menu" }, { status: 500 });
  }
}
