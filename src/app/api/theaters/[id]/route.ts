export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public endpoint — returns theater fee settings needed by the checkout preview.
// Tax rate and packaging fee are not sensitive; exposing them is intentional.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const theater = await prisma.theater.findUnique({
      where: { id, isActive: true },
      select: {
        id: true,
        name: true,
        settings: {
          select: { taxRate: true, packagingFee: true, deliveryEtaMin: true },
        },
      },
    });

    if (!theater) {
      return NextResponse.json({ error: "Theater not found" }, { status: 404 });
    }

    return NextResponse.json({ data: theater });
  } catch (error) {
    console.error("[GET /api/theaters/[id]]", error);
    return NextResponse.json({ error: "Failed to fetch theater" }, { status: 500 });
  }
}
