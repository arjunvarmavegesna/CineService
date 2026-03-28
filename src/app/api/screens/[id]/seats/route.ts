import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const seats = await prisma.seat.findMany({
      where: { screenId: id, isActive: true },
      orderBy: [{ row: "asc" }, { number: "asc" }],
    });
    return NextResponse.json({ data: seats });
  } catch (error) {
    console.error("[GET /api/screens/[id]/seats]", error);
    return NextResponse.json({ error: "Failed to fetch seats" }, { status: 500 });
  }
}
