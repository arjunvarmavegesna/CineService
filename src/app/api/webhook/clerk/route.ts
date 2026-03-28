export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { syncClerkUser } from "@/lib/auth";

// Handles Clerk user.created and user.updated webhooks
// Set webhook URL in Clerk dashboard: /api/webhook/clerk
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, data } = body;

    if (type === "user.created" || type === "user.updated") {
      const { id, first_name, last_name, email_addresses, phone_numbers } = data;
      const name = [first_name, last_name].filter(Boolean).join(" ") || undefined;
      const email = email_addresses?.[0]?.email_address || undefined;
      const phone = phone_numbers?.[0]?.phone_number || undefined;

      await syncClerkUser(id, { name, email, phone });
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[POST /api/webhook/clerk]", err);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}
