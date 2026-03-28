import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { menuItem: { select: { imageUrl: true } } } },
        theater: { select: { name: true, city: true } },
        screen: { select: { name: true } },
        payment: true,
        statusLogs: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ data: order });
  } catch (error) {
    console.error("[GET /api/orders/[id]]", error);
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
  }
}
