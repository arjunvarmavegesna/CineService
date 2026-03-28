export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { slugify } from "@/lib/utils";
import { z } from "zod";

const TheaterSchema = z.object({
  name: z.string().min(2),
  address: z.string().min(5),
  city: z.string().min(2),
  state: z.string().min(2),
  phone: z.string().optional(),
  email: z.string().email().optional(),
});

export async function GET() {
  const { error } = await requireAdminRole();
  if (error) return error;

  try {
    const theaters = await prisma.theater.findMany({
      include: {
        _count: { select: { screens: true, orders: true } },
        settings: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ data: theaters });
  } catch (err) {
    console.error("[GET /api/admin/theaters]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdminRole();
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = TheaterSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const { name, address, city, state, phone, email } = parsed.data;

    const theater = await prisma.$transaction(async (tx) => {
      const t = await tx.theater.create({
        data: { name, slug: slugify(name), address, city, state, phone, email },
      });
      await tx.theaterSettings.create({ data: { theaterId: t.id } });
      return t;
    });

    return NextResponse.json({ data: theater }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/admin/theaters]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
