export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getRazorpayInstance } from "@/lib/razorpay";
import { generateOrderNumber } from "@/lib/utils";

const ItemSchema = z.object({
  menuItemId: z.string().min(1),
  quantity: z.number().int().min(1).max(20),
  // name is used for order item display; price is intentionally NOT accepted from client
  name: z.string().min(1),
});

const Schema = z.object({
  theaterId: z.string().min(1),
  screenId: z.string().min(1),
  seatId: z.string().min(1),
  seatLabel: z.string().min(1),
  customerName: z.string().min(1).max(100),
  // Basic Indian mobile validation
  customerPhone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
  notes: z.string().max(300).optional(),
  couponCode: z.string().optional(),
  items: z.array(ItemSchema).min(1).max(30),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const {
      theaterId,
      screenId,
      seatId,
      seatLabel,
      customerName,
      customerPhone,
      notes,
      couponCode,
      items,
    } = parsed.data;

    // ── 1. Validate seat belongs to the given screen/theater and is active ──
    const seat = await prisma.seat.findFirst({
      where: {
        id: seatId,
        screenId,
        isActive: true,
        screen: { theaterId },
      },
      include: {
        screen: {
          include: { theater: true },
        },
      },
    });

    if (!seat) {
      return NextResponse.json({ error: "Invalid seat selection" }, { status: 400 });
    }
    if (!seat.screen.isActive) {
      return NextResponse.json({ error: "This screen is not currently active" }, { status: 400 });
    }
    if (!seat.screen.theater.isActive) {
      return NextResponse.json(
        { error: "This theater is not currently accepting orders" },
        { status: 400 }
      );
    }

    // ── 2. Fetch theater settings (tax / packaging / ETA) ──
    const settings = await prisma.theaterSettings.findUnique({ where: { theaterId } });
    const taxRate = settings?.taxRate ?? 5;
    const packagingFee = settings?.packagingFee ?? 10;
    const etaMin = settings?.deliveryEtaMin ?? 12;

    // ── 3. Validate items availability and re-price from DB (never trust client prices) ──
    const menuItemIds = items.map((i) => i.menuItemId);
    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuItemIds }, status: "AVAILABLE" },
    });

    if (menuItems.length !== menuItemIds.length) {
      const foundIds = new Set(menuItems.map((m) => m.id));
      const missing = menuItemIds.find((id) => !foundIds.has(id));
      return NextResponse.json(
        { error: "One or more items are currently unavailable", unavailableItemId: missing },
        { status: 400 }
      );
    }

    const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));

    // Calculate subtotal using DB prices — client-provided prices are ignored
    const subtotal = items.reduce((sum, item) => {
      return sum + menuItemMap.get(item.menuItemId)!.basePrice * item.quantity;
    }, 0);

    const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100;

    // ── 4. Validate and apply coupon ──
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

      const withinUsageLimit =
        coupon && (!coupon.usageLimit || coupon.usageCount < coupon.usageLimit);

      if (coupon && withinUsageLimit && subtotal >= coupon.minOrderAmt) {
        discount =
          coupon.type === "PERCENTAGE"
            ? Math.min(subtotal * (coupon.value / 100), coupon.maxDiscount ?? Infinity)
            : Math.min(coupon.value, subtotal);
        discount = Math.round(discount * 100) / 100;
        couponId = coupon.id;
      }
    }

    const totalAmount =
      Math.round((subtotal + taxAmount + packagingFee - discount) * 100) / 100;

    // ── 5. Create Razorpay order (amount must be in paise) ──
    const razorpay = getRazorpayInstance();
    const orderNumber = generateOrderNumber();
    const amountInPaise = Math.round(totalAmount * 100);

    const rzpOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: orderNumber, // max 40 chars — our CS-XXXXX format is ~16
      notes: {
        seatLabel,
        theater: seat.screen.theater.name,
      },
    });

    // ── 6. Persist Order + Payment atomically ──
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
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
          status: "PENDING",
          paymentMode: "ONLINE",
          estimatedAt: new Date(Date.now() + etaMin * 60 * 1000),
          items: {
            create: items.map((item) => ({
              menuItemId: item.menuItemId,
              quantity: item.quantity,
              // Use DB price — never the client-submitted price
              unitPrice: menuItemMap.get(item.menuItemId)!.basePrice,
              totalPrice:
                menuItemMap.get(item.menuItemId)!.basePrice * item.quantity,
              name: item.name,
            })),
          },
          statusLogs: {
            create: {
              status: "PENDING",
              note: "Order initiated — awaiting payment",
            },
          },
        },
      });

      await tx.payment.create({
        data: {
          orderId: newOrder.id,
          amount: totalAmount,
          currency: "INR",
          status: "PENDING",
          provider: "razorpay",
          providerOrderId: rzpOrder.id,
        },
      });

      return newOrder;
    });

    return NextResponse.json(
      {
        orderId: order.id,
        orderNumber: order.orderNumber,
        razorpayOrderId: rzpOrder.id,
        // amount in paise — this is what Razorpay checkout expects
        amount: amountInPaise,
        // totalAmount in INR — for display in the UI before checkout opens
        totalAmount,
        currency: "INR",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/payment/create-order]", error);

    if (
      error instanceof Error &&
      error.message.includes("credentials not configured")
    ) {
      return NextResponse.json(
        { error: "Payment gateway is not configured. Contact support." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Failed to initiate payment. Please try again." },
      { status: 500 }
    );
  }
}
