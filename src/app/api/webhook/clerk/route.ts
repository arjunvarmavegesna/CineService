export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { syncClerkUser } from "@/lib/auth";

// Handles Clerk user.created and user.updated webhooks
// Set webhook URL in Clerk dashboard: /api/webhook/clerk
// Set CLERK_WEBHOOK_SECRET in your environment from the Clerk dashboard
export async function POST(req: NextRequest) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[webhook/clerk] CLERK_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  // Read raw body — svix verifies over the raw bytes
  const rawBody = await req.text();

  const svixId = req.headers.get("svix-id") ?? "";
  const svixTimestamp = req.headers.get("svix-timestamp") ?? "";
  const svixSignature = req.headers.get("svix-signature") ?? "";

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  // Verify webhook signature — rejects replayed or tampered requests
  let event: { type: string; data: Record<string, unknown> };
  try {
    const wh = new Webhook(secret);
    event = wh.verify(rawBody, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as typeof event;
  } catch (err) {
    console.warn("[webhook/clerk] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  try {
    const { type, data } = event;

    if (type === "user.created" || type === "user.updated") {
      const {
        id,
        first_name,
        last_name,
        email_addresses,
        phone_numbers,
      } = data as {
        id: string;
        first_name?: string;
        last_name?: string;
        email_addresses?: { email_address: string }[];
        phone_numbers?: { phone_number: string }[];
      };

      const name = [first_name, last_name].filter(Boolean).join(" ") || undefined;
      const email = email_addresses?.[0]?.email_address || undefined;
      const phone = phone_numbers?.[0]?.phone_number || undefined;

      await syncClerkUser(id, { name, email, phone });
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[webhook/clerk] Error processing event:", err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
