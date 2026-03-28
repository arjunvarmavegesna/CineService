import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const screens = await prisma.screen.findMany({
      where: { theaterId: id, isActive: true },
      include: { _count: { select: { seats: true } } },
      orderBy: { number: "asc" },
    });
    return NextResponse.json({ data: screens });
  } catch (error) {
    console.error("[GET /api/theaters/[id]/screens]", error);
    return NextResponse.json({ error: "Failed to fetch screens" }, { status: 500 });
  }
}
