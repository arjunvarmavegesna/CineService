import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { z } from "zod";

const ScreenSchema = z.object({
  theaterId: z.string(),
  name: z.string().min(1),
  number: z.number().int().positive(),
  capacity: z.number().int().positive(),
});

export async function GET(req: NextRequest) {
  const { error } = await requireAdminRole();
  if (error) return error;

  try {
    const theaterId = new URL(req.url).searchParams.get("theaterId");
    const screens = await prisma.screen.findMany({
      where: theaterId ? { theaterId } : {},
      include: {
        theater: { select: { name: true } },
        _count: { select: { seats: true, orders: true } },
      },
      orderBy: [{ theaterId: "asc" }, { number: "asc" }],
    });
    return NextResponse.json({ data: screens });
  } catch (err) {
    console.error("[GET /api/admin/screens]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdminRole();
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = ScreenSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const screen = await prisma.screen.create({ data: parsed.data });
    return NextResponse.json({ data: screen }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/admin/screens]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
