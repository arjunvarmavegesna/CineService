"use client";

import { useState } from "react";

const INITIAL_ORDERS = [
  {
    id: "1",
    num: "CS-241101",
    seat: "C6",
    screen: "Audi 1",
    items: ["Butter Popcorn × 2", "Coca-Cola × 1"],
    total: 570,
    status: "PENDING",
    time: "1m ago",
    urgent: false,
  },
  {
    id: "2",
    num: "CS-241102",
    seat: "A3",
    screen: "Audi 1",
    items: ["Loaded Nachos × 1", "Mango Smoothie × 2"],
    total: 640,
    status: "CONFIRMED",
    time: "4m ago",
    urgent: false,
  },
  {
    id: "3",
    num: "CS-241103",
    seat: "F9",
    screen: "Audi 2",
    items: ["Movie Night Combo × 1"],
    total: 499,
    status: "PREPARING",
    time: "8m ago",
    urgent: false,
  },
  {
    id: "4",
    num: "CS-241104",
    seat: "B12",
    screen: "Audi 1",
    items: ["Paneer Tikka Burger × 1", "Masala Fries × 1", "Coke × 1"],
    total: 648,
    status: "READY",
    time: "12m ago",
    urgent: true,
  },
  {
    id: "5",
    num: "CS-241105",
    seat: "D4",
    screen: "Audi 2",
    items: ["Solo Snack Box × 2"],
    total: 698,
    status: "OUT_FOR_DELIVERY",
    time: "18m ago",
    urgent: false,
  },
];

const COLUMNS = [
  { key: "PENDING", label: "New Orders", color: "text-blue-400", dot: "bg-blue-500" },
  { key: "CONFIRMED", label: "Confirmed", color: "text-cyan-400", dot: "bg-cyan-500" },
  { key: "PREPARING", label: "Preparing", color: "text-amber-400", dot: "bg-amber-500" },
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
  PENDING: "Confirm Order",
  CONFIRMED: "Start Preparing",
  PREPARING: "Mark Ready",
  READY: "Out for Delivery",
  OUT_FOR_DELIVERY: "Mark Delivered",
};

export default function LiveOrdersPage() {
  const [orders, setOrders] = useState(INITIAL_ORDERS);

  const advanceStatus = (id: string) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === id && NEXT_STATUS[o.status]
          ? { ...o, status: NEXT_STATUS[o.status] }
          : o
      )
    );
  };

  const ordersByStatus = (status: string) =>
    orders.filter((o) => o.status === status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Live Orders</h1>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm text-white/40">
              {orders.filter((o) => o.status !== "DELIVERED" && o.status !== "CANCELLED").length} active orders
            </span>
          </div>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="text-sm border border-white/10 text-white/50 hover:text-white px-4 py-2 rounded-lg transition-colors"
        >
          ↻ Refresh
        </button>
      </div>

      {/* Kanban board */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {COLUMNS.map((col) => {
            const colOrders = ordersByStatus(col.key);
            return (
              <div
                key={col.key}
                className="w-64 bg-[#1a1e2a] border border-white/10 rounded-2xl overflow-hidden flex flex-col"
              >
                {/* Column header */}
                <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${col.dot}`} />
                    <span className={`text-sm font-semibold ${col.color}`}>
                      {col.label}
                    </span>
                  </div>
                  <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-white/60">
                    {colOrders.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex-1 p-3 space-y-3 min-h-24">
                  {colOrders.length === 0 ? (
                    <div className="text-center py-8 text-white/20 text-sm">
                      Empty
                    </div>
                  ) : (
                    colOrders.map((order) => (
                      <div
                        key={order.id}
                        className={`bg-[#0f1117] border rounded-xl p-3 space-y-2
                          ${order.urgent
                            ? "border-red-500/40"
                            : "border-white/10"
                          }`}
                      >
                        {/* Order number */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono text-amber-400 font-bold">
                            {order.num}
                          </span>
                          {order.urgent && (
                            <span className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded">
                              URGENT
                            </span>
                          )}
                        </div>

                        {/* Seat */}
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xl font-black">{order.seat}</span>
                            <span className="text-xs text-white/40 ml-2">{order.screen}</span>
                          </div>
                          <span className="text-xs text-white/30">{order.time}</span>
                        </div>

                        {/* Items */}
                        <div className="space-y-0.5">
                          {order.items.map((item, i) => (
                            <p key={i} className="text-xs text-white/60">
                              • {item}
                            </p>
                          ))}
                        </div>

                        {/* Total */}
                        <div className="flex items-center justify-between pt-1 border-t border-white/10">
                          <span className="text-sm font-bold">₹{order.total}</span>
                          {NEXT_STATUS[order.status] && (
                            <button
                              onClick={() => advanceStatus(order.id)}
                              className="text-xs bg-amber-500/20 hover:bg-amber-500 hover:text-black text-amber-400 border border-amber-500/30 px-2.5 py-1.5 rounded-lg font-semibold transition-all"
                            >
                              {NEXT_LABEL[order.status]} →
                            </button>
                          )}
                          {order.status === "DELIVERED" && (
                            <span className="text-xs text-green-400">✓ Done</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}