export const dynamic = "force-dynamic";

/**
 * Razorpay Webhook Handler
 *
 * Purpose: Reconciliation safety net.
 * Handles cases where the browser was closed before /api/payment/verify was called
 * (e.g. user closed tab mid-payment, mobile data loss, etc.)
 *
 * Register this URL in your Razorpay dashboard:
 *   https://yourdomain.com/api/webhook/razorpay
 *
 * Active events to subscribe:
 *   - payment.captured
 *   - payment.failed
 *   - refund.processed
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhookSignature } from "@/lib/razorpay";

// Razorpay webhook payload shapes (minimal — only fields we use)
interface RazorpayPaymentEntity {
  id: string;
  order_id: string;
  status: string;
  error_description?: string;
  error_code?: string;
}

interface RazorpayRefundEntity {
  id: string;
  payment_id: string;
  amount: number;
}

interface WebhookEvent {
  event: string;
  payload: {
    payment?: { entity: RazorpayPaymentEntity };
    refund?: { entity: RazorpayRefundEntity };
  };
}

export async function POST(req: NextRequest) {
  // Must read raw body BEFORE parsing JSON — signature is over the raw bytes
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";

  if (!verifyWebhookSignature(rawBody, signature)) {
    console.warn("[webhook/razorpay] Invalid webhook signature — rejected");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: WebhookEvent;
  try {
    event = JSON.parse(rawBody) as WebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    switch (event.event) {
      // ── payment.captured ─────────────────────────────────────────────────
      // Fires when Razorpay captures a payment. This is our reconciliation path:
      // if the browser closed before /api/payment/verify ran, this confirms the order.
      case "payment.captured": {
        const { id: razorpayPaymentId, order_id: razorpayOrderId } =
          event.payload.payment!.entity;

        const payment = await prisma.payment.findFirst({
          where: { providerOrderId: razorpayOrderId },
          include: { order: true },
        });

        // Already handled by /api/payment/verify — nothing to do
        if (!payment || payment.status === "PAID") break;

        await prisma.$transaction(async (tx) => {
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: "PAID",
              providerPaymentId: razorpayPaymentId,
              paidAt: new Date(),
            },
          });

          if (payment.order.status === "PENDING") {
            await tx.order.update({
              where: { id: payment.orderId },
              data: { status: "CONFIRMED" },
            });
            await tx.orderStatusLog.create({
              data: {
                orderId: payment.orderId,
                status: "CONFIRMED",
                note: `Payment confirmed via webhook — ${razorpayPaymentId}`,
              },
            });
          }
        });

        console.log(
          `[webhook/razorpay] payment.captured — order ${payment.orderId} confirmed`
        );
        break;
      }

      // ── payment.failed ────────────────────────────────────────────────────
      // Fires when a payment attempt fails on Razorpay's side (card decline, etc.)
      // We mark the payment FAILED. The order stays PENDING — user can retry.
      case "payment.failed": {
        const { order_id: razorpayOrderId, error_description } =
          event.payload.payment!.entity;

        const payment = await prisma.payment.findFirst({
          where: { providerOrderId: razorpayOrderId },
        });

        // Don't touch if payment was already captured (race condition safety)
        if (!payment || payment.status === "PAID") break;

        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: "FAILED",
            failureReason: error_description ?? "Payment failed",
          },
        });

        console.log(
          `[webhook/razorpay] payment.failed — razorpay order ${razorpayOrderId}: ${error_description}`
        );
        break;
      }

      // ── refund.processed ─────────────────────────────────────────────────
      // Fires when a refund is successfully processed on Razorpay's side.
      // Update payment + order status to REFUNDED.
      case "refund.processed": {
        const { payment_id: razorpayPaymentId } =
          event.payload.refund!.entity;

        const payment = await prisma.payment.findFirst({
          where: { providerPaymentId: razorpayPaymentId },
          include: { order: true },
        });

        if (!payment) break;

        await prisma.$transaction(async (tx) => {
          await tx.payment.update({
            where: { id: payment.id },
            data: { status: "REFUNDED" },
          });

          if (!["REFUNDED", "CANCELLED"].includes(payment.order.status)) {
            await tx.order.update({
              where: { id: payment.orderId },
              data: { status: "REFUNDED" },
            });
            await tx.orderStatusLog.create({
              data: {
                orderId: payment.orderId,
                status: "REFUNDED",
                note: "Refund processed via Razorpay webhook",
              },
            });
          }
        });

        console.log(
          `[webhook/razorpay] refund.processed — order ${payment.orderId} marked REFUNDED`
        );
        break;
      }

      default:
        // Return 200 for all unhandled events so Razorpay stops retrying them
        console.log(`[webhook/razorpay] Unhandled event type: ${event.event}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error(
      `[webhook/razorpay] Error processing event '${event.event}':`,
      error
    );
    // Always return 200 — returning 5xx causes Razorpay to retry, which can cause
    // duplicate processing. Log the error and investigate manually.
    return NextResponse.json(
      { received: true, warning: "Internal error during event processing" },
      { status: 200 }
    );
  }
}
