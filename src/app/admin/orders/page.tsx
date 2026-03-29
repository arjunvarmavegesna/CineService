"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { timeAgo, formatCurrency } from "@/lib/utils";

interface OrderItem { name: string; quantity: number; totalPrice: number }
interface Payment {
  status: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  providerPaymentId: string | null;
  amount: number;
  paidAt: string | null;
}

interface Order {
  id: string; orderNumber: string; seatLabel: string; status: string;
  totalAmount: number; createdAt: string; updatedAt: string;
  items: OrderItem[];
  theater: { name: string };
  screen: { name: string };
  payment: Payment | null;
}

const COLUMNS = [
  { key: "PENDING", label: "New Orders", color: "text-blue-400", dot: "bg-blue-500" },
  { key: "CONFIRMED", label: "Confirmed", color: "text-cyan-400", dot: "bg-cyan-500" },
  { key: "PREPARING", label: "Preparing", color: "text-orange-400", dot: "bg-orange-500" },
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
  const [showDelivered, setShowDelivered] = useState(false);
  const colRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToCol = (key: string) => {
    const el = colRefs.current[key];
    const container = scrollRef.current;
    if (!el || !container) return;
    container.scrollTo({ left: el.offsetLeft - 16, behavior: "smooth" });
  };

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
            <span className="text-sm text-gray-400">{activeOrders.length} active · auto-refreshes every 10s</span>
          </div>
        </div>
        <button
          onClick={load}
          className="text-sm border border-gray-200 text-gray-500 hover:text-gray-900 px-4 py-2 rounded-lg transition-colors"
        >
          ↻ Refresh
        </button>
      </div>

      {/* Jump tabs */}
      {!loading && (
        <div className="flex gap-2 flex-wrap">
          {COLUMNS.filter((c) => showDelivered || c.key !== "DELIVERED").map((col) => {
            const count = orders.filter((o) => o.status === col.key).length;
            return (
              <button
                key={col.key}
                onClick={() => scrollToCol(col.key)}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors
                  ${count > 0 ? `border-gray-200 ${col.color} bg-gray-50 hover:bg-gray-100` : "border-gray-100 text-gray-300 bg-gray-50"}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${col.dot}`} />
                {col.label}
                {count > 0 && <span className="font-bold">{count}</span>}
              </button>
            );
          })}
          <button
            onClick={() => setShowDelivered((v) => !v)}
            className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-400 hover:text-gray-600 bg-gray-50 ml-auto"
          >
            {showDelivered ? "Hide Delivered" : "Show Delivered"}
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-gray-400 text-center py-16">Loading orders...</div>
      ) : (
        <div ref={scrollRef} className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {COLUMNS.filter((c) => showDelivered || c.key !== "DELIVERED").map((col) => {
              const colOrders = orders.filter((o) => o.status === col.key);
              return (
                <div key={col.key} ref={(el) => { colRefs.current[col.key] = el; }} className="w-64 bg-[#F0F0F8] border border-gray-200 rounded-2xl overflow-hidden flex flex-col">
                  <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${col.dot} ${col.key === "PENDING" && colOrders.length > 0 ? "animate-pulse" : ""}`} />
                      <span className={`text-sm font-semibold ${col.color}`}>{col.label}</span>
                    </div>
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-500">{colOrders.length}</span>
                  </div>

                  <div className="flex-1 p-3 space-y-3 min-h-24 overflow-y-auto max-h-[calc(100vh-220px)]">
                    {colOrders.length === 0 ? (
                      <div className="text-center py-8 text-gray-300 text-sm">Empty</div>
                    ) : (
                      colOrders.map((order) => {
                        const urgent = isUrgent(order);
                        return (
                          <div key={order.id} className={`bg-white border rounded-xl p-3 space-y-2 ${urgent ? "border-red-500/40" : "border-gray-200"}`}>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-mono text-[#E03455] font-bold">{order.orderNumber}</span>
                              {urgent && (
                                <span className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded">URGENT</span>
                              )}
                            </div>

                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-xl font-black">{order.seatLabel}</span>
                                <span className="text-xs text-gray-400 ml-2">{order.screen.name}</span>
                              </div>
                              <span className="text-xs text-gray-400">{timeAgo(order.createdAt)}</span>
                            </div>

                            <div className="space-y-0.5">
                              {order.items.map((item, i) => (
                                <p key={i} className="text-xs text-gray-500">• {item.name} × {item.quantity}</p>
                              ))}
                            </div>

                            <div className="flex items-center justify-between pt-1 border-t border-gray-200">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-bold">{formatCurrency(order.totalAmount)}</span>
                                {order.payment && (
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide
                                    ${order.payment.status === "PAID" ? "bg-green-500/15 text-green-500" :
                                      order.payment.status === "FAILED" ? "bg-red-500/15 text-red-400" :
                                      "bg-gray-500/15 text-gray-400"}`}>
                                    {order.payment.status}
                                  </span>
                                )}
                              </div>
                              <div className="flex gap-1">
                                {NEXT_STATUS[order.status] && (
                                  <button
                                    onClick={() => advanceStatus(order)}
                                    disabled={advancing === order.id}
                                    className="text-xs bg-[#E03455]/20 hover:bg-[#E03455] hover:text-white text-[#E03455] border border-[#E03455]/30 px-2 py-1.5 rounded-lg font-semibold transition-all disabled:opacity-50"
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
