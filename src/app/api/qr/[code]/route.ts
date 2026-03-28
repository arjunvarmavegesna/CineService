import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const qr = await prisma.qRCode.findUnique({
      where: { code, isActive: true },
      include: { seat: { select: { label: true } } },
    });

    if (!qr) {
      return NextResponse.redirect(new URL("/order", process.env.NEXT_PUBLIC_APP_URL!));
    }

    const url = new URL("/order", process.env.NEXT_PUBLIC_APP_URL!);
    url.searchParams.set("t", qr.theaterId);
    url.searchParams.set("s", qr.screenId);
    url.searchParams.set("seat", qr.seatId);

    return NextResponse.redirect(url);
  } catch (error) {
    console.error("[GET /api/qr/[code]]", error);
    return NextResponse.redirect(new URL("/order", process.env.NEXT_PUBLIC_APP_URL!));
  }
}
