import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateOrderNumber } from "@/lib/utils";
import { z } from "zod";

const OrderItemSchema = z.object({
  menuItemId: z.string(),
  quantity: z.number().int().min(1),
  name: z.string(),
  unitPrice: z.number().positive(),
  notes: z.string().optional(),
});

const CreateOrderSchema = z.object({
  theaterId: z.string(),
  screenId: z.string(),
  seatId: z.string(),
  seatLabel: z.string(),
  customerName: z.string().min(1),
  customerPhone: z.string().min(10),
  notes: z.string().optional(),
  items: z.array(OrderItemSchema).min(1),
  couponCode: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreateOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { theaterId, screenId, seatId, seatLabel, customerName, customerPhone, notes, items, couponCode } = parsed.data;

    // Get theater settings for tax/fees
    const settings = await prisma.theaterSettings.findUnique({ where: { theaterId } });
    const taxRate = settings?.taxRate ?? 5;
    const packagingFee = settings?.packagingFee ?? 10;
    const etaMin = settings?.deliveryEtaMin ?? 12;

    // Validate menu items and calculate total
    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: items.map((i) => i.menuItemId) }, status: "AVAILABLE" },
    });

    if (menuItems.length !== items.length) {
      return NextResponse.json({ error: "One or more items are unavailable" }, { status: 400 });
    }

    const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100;

    let discount = 0;
    let couponId: string | undefined;

    if (couponCode) {
      const coupon = await prisma.coupon.findFirst({
        where: {
          code: couponCode.toUpperCase(),
          isActive: true,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
      });
      const withinUsageLimit = !coupon?.usageLimit || coupon.usageCount < coupon.usageLimit;
      if (coupon && withinUsageLimit && subtotal >= coupon.minOrderAmt) {
        discount = coupon.type === "PERCENTAGE"
          ? Math.min(subtotal * (coupon.value / 100), coupon.maxDiscount ?? Infinity)
          : Math.min(coupon.value, subtotal);
        couponId = coupon.id;
      }
    }

    const totalAmount = subtotal + taxAmount + packagingFee - discount;

    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          theaterId,
          screenId,
          seatId,
          seatLabel,
          customerName,
          customerPhone,
          notes,
          subtotal,
          taxAmount,
          packagingFee,
          discount,
          totalAmount,
          couponId,
          estimatedAt: new Date(Date.now() + etaMin * 60 * 1000),
          items: {
            create: items.map((item) => ({
              menuItemId: item.menuItemId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.unitPrice * item.quantity,
              name: item.name,
              notes: item.notes,
            })),
          },
          statusLogs: {
            create: { status: "PENDING" },
          },
        },
        include: { items: true },
      });

      if (couponId) {
        await tx.coupon.update({
          where: { id: couponId },
          data: { usageCount: { increment: 1 } },
        });
      }

      return newOrder;
    });

    return NextResponse.json({ data: order }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/orders]", error);
    return NextResponse.json({ error: "Failed to place order" }, { status: 500 });
  }
}
