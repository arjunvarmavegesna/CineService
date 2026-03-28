import { NextResponse } from "next/server";

// Bootstrap endpoint removed. Admin access is now controlled via ADMIN_EMAILS env var.
// See src/lib/auth.ts — approved users are auto-synced to DB as SUPER_ADMIN on first API call.
export async function POST() {
  return NextResponse.json({ error: "This endpoint has been removed." }, { status: 410 });
}
