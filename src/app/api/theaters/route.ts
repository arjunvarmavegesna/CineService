export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const theaters = await prisma.theater.findMany({
      where: { isActive: true },
      include: { _count: { select: { screens: true } } },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ data: theaters });
  } catch (error) {
    console.error("[GET /api/theaters]", error);
    return NextResponse.json({ error: "Failed to fetch theaters" }, { status: 500 });
  }
}
