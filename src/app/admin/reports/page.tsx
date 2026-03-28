"use client";

import { useEffect, useState, useCallback } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface ReportData {
  totalOrders: number;
  totalRevenue: number;
  ordersByStatus: { status: string; _count: number }[];
  recentOrders: {
    orderNumber: string; seatLabel: string; totalAmount: number;
    status: string; createdAt: string; theater: { name: string };
  }[];
  topItems: { name: string; menuItemId: string; _sum: { quantity: number; totalPrice: number } }[];
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-500/20 text-yellow-400",
  CONFIRMED: "bg-blue-500/20 text-blue-400",
  PREPARING: "bg-cyan-500/20 text-cyan-400",
  READY: "bg-purple-500/20 text-purple-400",
  OUT_FOR_DELIVERY: "bg-orange-500/20 text-orange-400",
  DELIVERED: "bg-green-500/20 text-green-400",
  CANCELLED: "bg-red-500/20 text-red-400",
  REFUNDED: "bg-gray-100 text-gray-400",
};

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState("7");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/reports?days=${days}`);
    const json = await res.json();
    setData(json.data);
    setLoading(false);
  }, [days]);

  useEffect(() => { load(); }, [load]);

  const avgOrderValue = data && data.totalOrders > 0 ? data.totalRevenue / data.totalOrders : 0;
  const deliveredCount = data?.ordersByStatus.find((s) => s.status === "DELIVERED")?._count ?? 0;
  const cancelledCount = data?.ordersByStatus.find((s) => s.status === "CANCELLED")?._count ?? 0;

  const maxItems = Math.max(...(data?.topItems.map((i) => i._sum.quantity ?? 0) ?? [1]));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Reports & Analytics</h1>
          <p className="text-sm text-gray-400 mt-0.5">Performance overview</p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(e.target.value)}
          className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#E03455]/50"
        >
          <option value="1">Today</option>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>

      {loading ? (
        <div className="text-gray-400 text-center py-16">Loading reports...</div>
      ) : !data ? (
        <div className="text-gray-400 text-center py-16">Failed to load data</div>
      ) : (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total Orders", value: data.totalOrders.toString(), sub: `Last ${days} days`, color: "text-gray-900" },
              { label: "Revenue", value: formatCurrency(data.totalRevenue), sub: "excl. cancelled", color: "text-[#E03455]" },
              { label: "Avg Order Value", value: formatCurrency(avgOrderValue), sub: "per order", color: "text-green-400" },
              { label: "Completion Rate", value: data.totalOrders > 0 ? `${Math.round((deliveredCount / data.totalOrders) * 100)}%` : "—", sub: `${cancelledCount} cancelled`, color: "text-blue-400" },
            ].map((card) => (
              <div key={card.label} className="bg-white border border-gray-100 rounded-2xl p-5">
                <p className="text-gray-400 text-xs mb-2">{card.label}</p>
                <p className={`text-2xl font-black ${card.color}`}>{card.value}</p>
                <p className="text-gray-400 text-xs mt-1">{card.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            {/* Orders by status */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5">
              <h2 className="font-semibold mb-4">Orders by Status</h2>
              <div className="space-y-3">
                {data.ordersByStatus
                  .sort((a, b) => b._count - a._count)
                  .map((s) => {
                    const pct = data.totalOrders > 0 ? (s._count / data.totalOrders) * 100 : 0;
                    return (
                      <div key={s.status}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[s.status]}`}>
                            {s.status.replace(/_/g, " ")}
                          </span>
                          <span className="text-gray-500">{s._count} ({pct.toFixed(0)}%)</span>
                        </div>
                        <div className="w-full bg-gray-50 rounded-full h-1.5">
                          <div className="bg-[#E03455] h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                {data.ordersByStatus.length === 0 && <p className="text-gray-400 text-sm">No orders yet</p>}
              </div>
            </div>

            {/* Top selling items */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5">
              <h2 className="font-semibold mb-4">Top Selling Items</h2>
              <div className="space-y-3">
                {data.topItems.map((item, i) => {
                  const pct = maxItems > 0 ? ((item._sum.quantity ?? 0) / maxItems) * 100 : 0;
                  return (
                    <div key={item.menuItemId}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700">
                          <span className="text-gray-400 mr-2">#{i + 1}</span>
                          {item.name}
                        </span>
                        <span className="text-gray-500">{item._sum.quantity ?? 0} sold</span>
                      </div>
                      <div className="w-full bg-gray-50 rounded-full h-1.5">
                        <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
                {data.topItems.length === 0 && <p className="text-gray-400 text-sm">No sales data yet</p>}
              </div>
            </div>
          </div>

          {/* Recent orders */}
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold">Recent Orders</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-gray-400 font-medium">Order</th>
                  <th className="text-left px-5 py-3 text-gray-400 font-medium">Theater</th>
                  <th className="text-left px-5 py-3 text-gray-400 font-medium">Seat</th>
                  <th className="text-left px-5 py-3 text-gray-400 font-medium">Amount</th>
                  <th className="text-left px-5 py-3 text-gray-400 font-medium">Status</th>
                  <th className="text-left px-5 py-3 text-gray-400 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {data.recentOrders.map((order, i) => (
                  <tr key={order.orderNumber} className={`border-b border-gray-100 ${i === data.recentOrders.length - 1 ? "border-b-0" : ""}`}>
                    <td className="px-5 py-3 font-mono font-bold text-[#E03455]">{order.orderNumber}</td>
                    <td className="px-5 py-3 text-gray-500">{order.theater.name}</td>
                    <td className="px-5 py-3 font-bold">{order.seatLabel}</td>
                    <td className="px-5 py-3 font-semibold">{formatCurrency(order.totalAmount)}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[order.status]}`}>
                        {order.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-400 text-xs">{formatDate(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.recentOrders.length === 0 && (
              <div className="text-center py-12 text-gray-400">No orders in this period</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
