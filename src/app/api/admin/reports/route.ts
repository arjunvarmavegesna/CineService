import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { error } = await requireAdminRole();
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const theaterId = searchParams.get("theaterId");
    const days = parseInt(searchParams.get("days") ?? "7");

    const since = new Date();
    since.setDate(since.getDate() - days);

    const where: Record<string, unknown> = { createdAt: { gte: since } };
    if (theaterId) where.theaterId = theaterId;

    const [totalOrders, totalRevenue, ordersByStatus, recentOrders, topItems] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.aggregate({
        where: { ...where, status: { notIn: ["CANCELLED", "REFUNDED"] } },
        _sum: { totalAmount: true },
      }),
      prisma.order.groupBy({ by: ["status"], where, _count: true }),
      prisma.order.findMany({
        where,
        select: {
          orderNumber: true,
          seatLabel: true,
          totalAmount: true,
          status: true,
          createdAt: true,
          theater: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.orderItem.groupBy({
        by: ["menuItemId", "name"],
        where: { order: { createdAt: { gte: since }, ...(theaterId ? { theaterId } : {}) } },
        _sum: { quantity: true, totalPrice: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 10,
      }),
    ]);

    return NextResponse.json({
      data: {
        totalOrders,
        totalRevenue: totalRevenue._sum.totalAmount ?? 0,
        ordersByStatus,
        recentOrders,
        topItems,
      },
    });
  } catch (err) {
    console.error("[GET /api/admin/reports]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
