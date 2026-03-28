export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { z } from "zod";

const UpdateSchema = z.object({
  name: z.string().min(2).optional(),
  address: z.string().min(5).optional(),
  city: z.string().min(2).optional(),
  state: z.string().min(2).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  isActive: z.boolean().optional(),
});

const SettingsSchema = z.object({
  taxRate: z.number().min(0).max(30).optional(),
  packagingFee: z.number().min(0).optional(),
  serviceCharge: z.number().min(0).optional(),
  deliveryEtaMin: z.number().int().min(1).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdminRole();
  if (error) return error;

  try {
    const { id } = await params;
    const body = await req.json();
    const { settings: settingsData, ...theaterData } = body;

    const parsedTheater = UpdateSchema.safeParse(theaterData);
    if (!parsedTheater.success) return NextResponse.json({ error: parsedTheater.error.flatten() }, { status: 400 });

    const theater = await prisma.$transaction(async (tx) => {
      const t = await tx.theater.update({ where: { id }, data: parsedTheater.data });
      if (settingsData) {
        const parsedSettings = SettingsSchema.safeParse(settingsData);
        if (parsedSettings.success) {
          await tx.theaterSettings.upsert({
            where: { theaterId: id },
            create: { theaterId: id, ...parsedSettings.data },
            update: parsedSettings.data,
          });
        }
      }
      return t;
    });

    return NextResponse.json({ data: theater });
  } catch (err) {
    console.error("[PATCH /api/admin/theaters/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdminRole();
  if (error) return error;

  try {
    const { id } = await params;
    await prisma.theater.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/admin/theaters/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
