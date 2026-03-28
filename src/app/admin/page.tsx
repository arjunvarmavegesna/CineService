"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface ReportData {
  totalOrders: number;
  totalRevenue: number;
  recentOrders: { orderNumber: string; seatLabel: string; totalAmount: number; status: string; createdAt: string; theater: { name: string } }[];
  ordersByStatus: { status: string; _count: number }[];
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-blue-500/15 text-blue-400",
  CONFIRMED: "bg-cyan-500/15 text-cyan-400",
  PREPARING: "bg-orange-500/15 text-orange-400",
  READY: "bg-yellow-500/15 text-yellow-400",
  OUT_FOR_DELIVERY: "bg-purple-500/15 text-purple-400",
  DELIVERED: "bg-green-500/15 text-green-400",
  CANCELLED: "bg-red-500/15 text-red-400",
  REFUNDED: "bg-white/10 text-white/40",
};

export default function AdminDashboard() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/reports?days=1")
      .then((r) => r.json())
      .then((d) => { setData(d.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const activeCount = data?.ordersByStatus
    .filter((s) => !["DELIVERED", "CANCELLED", "REFUNDED"].includes(s.status))
    .reduce((sum, s) => sum + s._count, 0) ?? 0;

  const avgValue = data && data.totalOrders > 0 ? data.totalRevenue / data.totalOrders : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-white/40 text-sm mt-1">Today's overview</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-[#24244A] border border-white/10 rounded-2xl p-5 animate-pulse">
              <div className="h-3 bg-white/10 rounded mb-3 w-24" />
              <div className="h-8 bg-white/10 rounded mb-2 w-16" />
              <div className="h-3 bg-white/5 rounded w-20" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Today's Orders", value: (data?.totalOrders ?? 0).toString(), sub: "Last 24 hours", color: "text-blue-400" },
            { label: "Active Orders", value: activeCount.toString(), sub: "In progress now", color: "text-[#E03455]" },
            { label: "Today's Revenue", value: formatCurrency(data?.totalRevenue ?? 0), sub: "Excl. cancelled", color: "text-green-400" },
            { label: "Avg Order Value", value: formatCurrency(avgValue), sub: "Per order today", color: "text-purple-400" },
          ].map((m) => (
            <div key={m.label} className="bg-[#24244A] border border-white/10 rounded-2xl p-5">
              <p className="text-xs text-white/40 mb-2 uppercase tracking-wide">{m.label}</p>
              <p className={`text-2xl font-black ${m.color}`}>{m.value}</p>
              <p className="text-xs text-white/40 mt-1">{m.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Live Orders", href: "/admin/orders", icon: "⚡", color: "border-[#E03455]/30 hover:border-[#E03455]/60" },
          { label: "Manage Menu", href: "/admin/menu", icon: "🍽", color: "border-white/10 hover:border-white/20" },
          { label: "Theaters & QR", href: "/admin/theaters", icon: "🏛", color: "border-white/10 hover:border-white/20" },
          { label: "View Reports", href: "/admin/reports", icon: "📊", color: "border-white/10 hover:border-white/20" },
        ].map((a) => (
          <Link key={a.href} href={a.href}
            className={`bg-[#24244A] border ${a.color} rounded-xl p-4 flex items-center gap-3 transition-all hover:bg-white/5`}>
            <span className="text-2xl">{a.icon}</span>
            <span className="text-sm font-medium">{a.label}</span>
          </Link>
        ))}
      </div>

      {/* Recent orders */}
      <div className="bg-[#24244A] border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="font-semibold">Recent Orders</h2>
          <Link href="/admin/orders" className="text-sm text-[#E03455] hover:underline">View live board →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-white/40 text-xs uppercase tracking-wide border-b border-white/10">
                <th className="text-left px-6 py-3">Order #</th>
                <th className="text-left px-6 py-3">Theater</th>
                <th className="text-left px-6 py-3">Seat</th>
                <th className="text-left px-6 py-3">Total</th>
                <th className="text-left px-6 py-3">Status</th>
                <th className="text-left px-6 py-3">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {(data?.recentOrders ?? []).map((order) => (
                <tr key={order.orderNumber} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-3.5 font-mono text-[#E03455] text-xs font-bold">{order.orderNumber}</td>
                  <td className="px-6 py-3.5 text-white/60 text-xs">{order.theater.name}</td>
                  <td className="px-6 py-3.5 font-black text-lg">{order.seatLabel}</td>
                  <td className="px-6 py-3.5 font-semibold">{formatCurrency(order.totalAmount)}</td>
                  <td className="px-6 py-3.5">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_COLORS[order.status]}`}>
                      {order.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-white/40 text-xs">{formatDate(order.createdAt)}</td>
                </tr>
              ))}
              {!loading && (data?.recentOrders ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-white/30">No orders yet. Seed the database to get started.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Seed button for dev */}
      {process.env.NODE_ENV !== "production" && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Seed Database</p>
            <p className="text-xs text-white/40">Populate with theaters, screens, seats, menu items, and QR codes</p>
          </div>
          <button
            onClick={async () => {
              const res = await fetch("/api/admin/seed", { method: "POST" });
              const d = await res.json();
              alert(d.message ?? d.error ?? "Done");
              window.location.reload();
            }}
            className="bg-white/10 hover:bg-white/20 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            Seed Data
          </button>
        </div>
      )}
    </div>
  );
}
