export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { z } from "zod";

const CategoryGroupSchema = z.object({
  rows: z.array(z.string().length(1)),
  seatsPerRow: z.number().int().min(1).max(50),
  category: z.enum(["STANDARD", "GOLD", "PREMIUM"]).default("STANDARD"),
  price: z.number().min(0).default(0),
});

const BulkSeatSchema = z.object({
  screenId: z.string(),
  groups: z.array(CategoryGroupSchema).min(1),
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
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { screenId, groups } = parsed.data;

    // 1. Verify screen exists
    const screen = await prisma.screen.findUnique({ where: { id: screenId } });
    if (!screen) return NextResponse.json({ error: "Screen not found" }, { status: 404 });

    // 2. Build all seat records
    const seatData = groups.flatMap(({ rows, seatsPerRow, category, price }) =>
      rows.flatMap((row) =>
        Array.from({ length: seatsPerRow }, (_, i) => ({
          screenId,
          row,
          number: i + 1,
          label: `${row}${i + 1}`,
          category,
          price,
        }))
      )
    );

    // 3. Bulk-insert seats (skip existing)
    await prisma.seat.createMany({
      data: seatData,
      skipDuplicates: true,
    });

    // 4. Fetch all seats for the specified rows
    const allRows = groups.flatMap((g) => g.rows);
    const allSeats = await prisma.seat.findMany({
      where: { screenId, row: { in: allRows } },
      select: { id: true, label: true },
    });

    // 5. Find which seats already have QR codes
    const existingQRs = await prisma.qRCode.findMany({
      where: { seatId: { in: allSeats.map((s) => s.id) } },
      select: { seatId: true },
    });
    const coveredSeatIds = new Set(existingQRs.map((q) => q.seatId));

    // 6. Bulk-insert missing QR codes
    const newQRData = allSeats
      .filter((s) => !coveredSeatIds.has(s.id))
      .map((s) => ({
        seatId: s.id,
        theaterId: screen.theaterId,
        screenId,
        metadata: { seatLabel: s.label, screenName: screen.name },
      }));

    if (newQRData.length > 0) {
      await prisma.qRCode.createMany({
        data: newQRData,
        skipDuplicates: true,
      });
    }

    return NextResponse.json({ data: allSeats, count: allSeats.length }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/admin/seats]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
