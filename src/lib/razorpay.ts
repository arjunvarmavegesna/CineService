import Razorpay from "razorpay";
import crypto from "crypto";

// Singleton — reused across requests in the same Node.js process
let _instance: Razorpay | null = null;

export function getRazorpayInstance(): Razorpay {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error(
      "Razorpay credentials not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET."
    );
  }
  if (!_instance) {
    _instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return _instance;
}

/**
 * Verifies a Razorpay payment signature.
 *
 * Razorpay generates the signature as:
 *   HMAC-SHA256( razorpay_order_id + "|" + razorpay_payment_id, RAZORPAY_KEY_SECRET )
 *
 * This MUST be called server-side before trusting any payment success from the frontend.
 */
export function verifyPaymentSignature({
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
}: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) throw new Error("RAZORPAY_KEY_SECRET is not configured");

  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  // Use timingSafeEqual to prevent timing-based attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(razorpaySignature, "hex")
    );
  } catch {
    // Buffers are different lengths — signature is malformed
    return false;
  }
}

/**
 * Verifies the signature on an inbound Razorpay webhook.
 * rawBody must be the raw request body string, NOT parsed JSON.
 */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.warn(
      "[razorpay] RAZORPAY_WEBHOOK_SECRET is not set — webhook signature verification skipped"
    );
    return false;
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(signature, "hex")
    );
  } catch {
    return false;
  }
}
