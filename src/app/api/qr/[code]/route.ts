export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const host = req.headers.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    `${protocol}://${host}`;

  try {
    const { code } = await params;
    const qr = await prisma.qRCode.findUnique({
      where: { code, isActive: true },
      include: { seat: { select: { label: true } } },
    });

    if (!qr) {
      return NextResponse.redirect(new URL("/order", appUrl));
    }

    const url = new URL("/order", appUrl);
    url.searchParams.set("t", qr.theaterId);
    url.searchParams.set("s", qr.screenId);
    url.searchParams.set("seat", qr.seatId);

    return NextResponse.redirect(url);
  } catch (error) {
    console.error("[GET /api/qr/[code]]", error);
    return NextResponse.redirect(new URL("/order", appUrl));
  }
}
