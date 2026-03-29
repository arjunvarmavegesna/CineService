export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPaymentSignature } from "@/lib/razorpay";

const Schema = z.object({
  orderId: z.string().min(1),
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } =
      parsed.data;

    // ── 1. Fetch order with its payment record ──
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (!order.payment) {
      return NextResponse.json(
        { error: "No payment record found for this order" },
        { status: 400 }
      );
    }

    // ── 2. Idempotency: return success immediately if already verified ──
    if (order.payment.status === "PAID") {
      return NextResponse.json(
        { success: true, orderId, alreadyVerified: true },
        { status: 200 }
      );
    }

    // ── 3. Guard: Razorpay order ID must match what we stored ──
    if (order.payment.providerOrderId !== razorpayOrderId) {
      console.warn(
        `[verify] Razorpay order ID mismatch for order ${orderId}. ` +
          `Expected ${order.payment.providerOrderId}, got ${razorpayOrderId}`
      );
      return NextResponse.json(
        { error: "Payment reference mismatch" },
        { status: 400 }
      );
    }

    // ── 4. Cryptographic signature verification ──
    const isValid = verifyPaymentSignature({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    if (!isValid) {
      // Mark payment as failed to prevent retries with tampered data
      await prisma.payment.update({
        where: { orderId },
        data: {
          status: "FAILED",
          failureReason: "Signature verification failed — possible tampering",
        },
      });
      console.error(`[verify] Invalid signature for order ${orderId}`);
      return NextResponse.json(
        { error: "Payment verification failed — signature mismatch" },
        { status: 400 }
      );
    }

    // ── 5. Confirm payment + order in one transaction ──
    await prisma.$transaction(async (tx) => {
      // Mark payment as PAID
      await tx.payment.update({
        where: { orderId },
        data: {
          status: "PAID",
          providerPaymentId: razorpayPaymentId,
          providerSignature: razorpaySignature,
          paidAt: new Date(),
        },
      });

      // Advance order to CONFIRMED (kitchen can now start preparing)
      await tx.order.update({
        where: { id: orderId },
        data: { status: "CONFIRMED" },
      });

      // Append status log entry
      await tx.orderStatusLog.create({
        data: {
          orderId,
          status: "CONFIRMED",
          note: `Payment verified — ${razorpayPaymentId}`,
        },
      });

      // Increment coupon usage only after successful payment
      if (order.couponId) {
        await tx.coupon.update({
          where: { id: order.couponId },
          data: { usageCount: { increment: 1 } },
        });
      }
    });

    return NextResponse.json({ success: true, orderId }, { status: 200 });
  } catch (error) {
    console.error("[POST /api/payment/verify]", error);
    return NextResponse.json(
      { error: "Payment verification failed. If payment was deducted, contact support." },
      { status: 500 }
    );
  }
}
