export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { z } from "zod";

const BulkSeatSchema = z.object({
  screenId: z.string(),
  rows: z.array(z.string().length(1)),
  seatsPerRow: z.number().int().min(1).max(50),
});

export async function GET(req: NextRequest) {
  const { error } = await requireAdminRole();
  if (error) return error;

  try {
    const screenId = new URL(req.url).searchParams.get("screenId");
    if (!screenId) return NextResponse.json({ error: "screenId required" }, { status: 400 });

    const seats = await prisma.seat.findMany({
      where: { screenId },
      include: { qrCode: { select: { code: true, isActive: true } } },
      orderBy: [{ row: "asc" }, { number: "asc" }],
    });
    return NextResponse.json({ data: seats });
  } catch (err) {
    console.error("[GET /api/admin/seats]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdminRole();
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = BulkSeatSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const { screenId, rows, seatsPerRow } = parsed.data;

    // Get screen to find theaterId for QR codes
    const screen = await prisma.screen.findUnique({ where: { id: screenId } });
    if (!screen) return NextResponse.json({ error: "Screen not found" }, { status: 404 });

    const seats = await prisma.$transaction(async (tx) => {
      const created = [];
      for (const row of rows) {
        for (let num = 1; num <= seatsPerRow; num++) {
          const label = `${row}${num}`;
          const seat = await tx.seat.upsert({
            where: { screenId_row_number: { screenId, row, number: num } },
            create: { screenId, row, number: num, label },
            update: { isActive: true },
          });
          // Create QR code for seat if doesn't exist
          await tx.qRCode.upsert({
            where: { seatId: seat.id },
            create: {
              seatId: seat.id,
              theaterId: screen.theaterId,
              screenId,
              metadata: { seatLabel: label, screenName: screen.name },
            },
            update: {},
          });
          created.push(seat);
        }
      }
      return created;
    });

    return NextResponse.json({ data: seats, count: seats.length }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/admin/seats]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
