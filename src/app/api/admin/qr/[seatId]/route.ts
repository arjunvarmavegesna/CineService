export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import QRCode from "qrcode";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ seatId: string }> }
) {
  const { error } = await requireAdminRole();
  if (error) return error;

  try {
    const { seatId } = await params;
    const format = new URL(req.url).searchParams.get("format") ?? "png";

    const qr = await prisma.qRCode.findUnique({
      where: { seatId },
      include: { seat: { include: { screen: { include: { theater: true } } } } },
    });

    if (!qr) return NextResponse.json({ error: "QR code not found" }, { status: 404 });

    // Fallback to request host if NEXT_PUBLIC_APP_URL is not set
    const host = req.headers.get("host") ?? "localhost:3000";
    const protocol = host.startsWith("localhost") ? "http" : "https";
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
      `${protocol}://${host}`;

    const qrUrl = `${appUrl}/api/qr/${qr.code}`;

    if (format === "svg") {
      const svg = await QRCode.toString(qrUrl, { type: "svg", width: 300 });
      return new NextResponse(svg, {
        headers: {
          "Content-Type": "image/svg+xml",
          "Content-Disposition": `inline; filename="seat-${qr.seat.label}.svg"`,
        },
      });
    }

    const buffer = await QRCode.toBuffer(qrUrl, {
      type: "png",
      width: 400,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
    });

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="seat-${qr.seat.label}.png"`,
      },
    });
  } catch (err) {
    console.error("[GET /api/admin/qr/[seatId]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
