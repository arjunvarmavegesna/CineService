"use client";

import { useState, useEffect, useCallback } from "react";
import { timeAgo, formatCurrency } from "@/lib/utils";

interface OrderItem { name: string; quantity: number; totalPrice: number }
interface Order {
  id: string; orderNumber: string; seatLabel: string; status: string;
  totalAmount: number; createdAt: string; updatedAt: string;
  items: OrderItem[];
  theater: { name: string };
  screen: { name: string };
}

const COLUMNS = [
  { key: "PENDING", label: "New Orders", color: "text-blue-400", dot: "bg-blue-500" },
  { key: "CONFIRMED", label: "Confirmed", color: "text-cyan-400", dot: "bg-cyan-500" },
  { key: "PREPARING", label: "Preparing", color: "text-[#C9A84C]", dot: "bg-[#C9A84C]" },
  { key: "READY", label: "Ready", color: "text-yellow-400", dot: "bg-yellow-400" },
  { key: "OUT_FOR_DELIVERY", label: "On the Way", color: "text-purple-400", dot: "bg-purple-500" },
  { key: "DELIVERED", label: "Delivered", color: "text-green-400", dot: "bg-green-500" },
];

const NEXT_STATUS: Record<string, string> = {
  PENDING: "CONFIRMED",
  CONFIRMED: "PREPARING",
  PREPARING: "READY",
  READY: "OUT_FOR_DELIVERY",
  OUT_FOR_DELIVERY: "DELIVERED",
};

const NEXT_LABEL: Record<string, string> = {
  PENDING: "Confirm",
  CONFIRMED: "Start Prep",
  PREPARING: "Mark Ready",
  READY: "Out for Delivery",
  OUT_FOR_DELIVERY: "Delivered",
};

export default function LiveOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/orders?limit=100");
    const data = await res.json();
    setOrders(data.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, [load]);

  const advanceStatus = async (order: Order) => {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    setAdvancing(order.id);
    await fetch(`/api/admin/orders/${order.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    await load();
    setAdvancing(null);
  };

  const cancelOrder = async (order: Order) => {
    if (!confirm(`Cancel order ${order.orderNumber}?`)) return;
    await fetch(`/api/admin/orders/${order.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CANCELLED" }),
    });
    load();
  };

  const activeOrders = orders.filter((o) => !["DELIVERED", "CANCELLED", "REFUNDED"].includes(o.status));
  const isUrgent = (o: Order) => {
    const mins = (Date.now() - new Date(o.createdAt).getTime()) / 60000;
    return mins > 20 && o.status !== "DELIVERED";
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Live Orders</h1>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm text-white/40">{activeOrders.length} active · auto-refreshes every 10s</span>
          </div>
        </div>
        <button
          onClick={load}
          className="text-sm border border-white/10 text-white/50 hover:text-white px-4 py-2 rounded-lg transition-colors"
        >
          ↻ Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-white/40 text-center py-16">Loading orders...</div>
      ) : (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {COLUMNS.map((col) => {
              const colOrders = orders.filter((o) => o.status === col.key);
              return (
                <div key={col.key} className="w-64 bg-[#1C1C20] border border-white/10 rounded-2xl overflow-hidden flex flex-col">
                  <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${col.dot} ${col.key === "PENDING" && colOrders.length > 0 ? "animate-pulse" : ""}`} />
                      <span className={`text-sm font-semibold ${col.color}`}>{col.label}</span>
                    </div>
                    <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-white/60">{colOrders.length}</span>
                  </div>

                  <div className="flex-1 p-3 space-y-3 min-h-24 overflow-y-auto max-h-[calc(100vh-220px)]">
                    {colOrders.length === 0 ? (
                      <div className="text-center py-8 text-white/20 text-sm">Empty</div>
                    ) : (
                      colOrders.map((order) => {
                        const urgent = isUrgent(order);
                        return (
                          <div key={order.id} className={`bg-[#141417] border rounded-xl p-3 space-y-2 ${urgent ? "border-red-500/40" : "border-white/10"}`}>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-mono text-[#C9A84C] font-bold">{order.orderNumber}</span>
                              {urgent && (
                                <span className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded">URGENT</span>
                              )}
                            </div>

                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-xl font-black">{order.seatLabel}</span>
                                <span className="text-xs text-white/40 ml-2">{order.screen.name}</span>
                              </div>
                              <span className="text-xs text-white/30">{timeAgo(order.createdAt)}</span>
                            </div>

                            <div className="space-y-0.5">
                              {order.items.map((item, i) => (
                                <p key={i} className="text-xs text-white/60">• {item.name} × {item.quantity}</p>
                              ))}
                            </div>

                            <div className="flex items-center justify-between pt-1 border-t border-white/10">
                              <span className="text-sm font-bold">{formatCurrency(order.totalAmount)}</span>
                              <div className="flex gap-1">
                                {NEXT_STATUS[order.status] && (
                                  <button
                                    onClick={() => advanceStatus(order)}
                                    disabled={advancing === order.id}
                                    className="text-xs bg-[#C9A84C]/20 hover:bg-[#C9A84C] hover:text-black text-[#C9A84C] border border-[#C9A84C]/30 px-2 py-1.5 rounded-lg font-semibold transition-all disabled:opacity-50"
                                  >
                                    {advancing === order.id ? "..." : `${NEXT_LABEL[order.status]} →`}
                                  </button>
                                )}
                                {["PENDING", "CONFIRMED"].includes(order.status) && (
                                  <button
                                    onClick={() => cancelOrder(order)}
                                    className="text-xs text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 px-1.5 py-1.5 rounded-lg transition-all"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            </div>
                            {order.status === "DELIVERED" && (
                              <div className="flex justify-end">
                                <span className="text-xs text-green-400">✓ Done</span>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
