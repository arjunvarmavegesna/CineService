"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

interface OrderItem { name: string; quantity: number; unitPrice: number; totalPrice: number }
interface StatusLog { status: string; createdAt: string }
interface Order {
  id: string; orderNumber: string; seatLabel: string; status: string;
  subtotal: number; taxAmount: number; packagingFee: number; totalAmount: number;
  customerName?: string; estimatedAt?: string; createdAt: string;
  items: OrderItem[];
  theater: { name: string; city: string };
  screen: { name: string };
  statusLogs: StatusLog[];
}

const STATUS_STEPS = [
  { key: "PENDING", label: "Order Received", icon: "📋", desc: "Your order has been received" },
  { key: "CONFIRMED", label: "Order Confirmed", icon: "✅", desc: "Order accepted by kitchen" },
  { key: "PREPARING", label: "Preparing", icon: "👨‍🍳", desc: "Your food is being prepared" },
  { key: "READY", label: "Ready", icon: "📦", desc: "Order is packed and ready" },
  { key: "OUT_FOR_DELIVERY", label: "On the Way", icon: "🏃", desc: "Staff is bringing it to you" },
  { key: "DELIVERED", label: "Delivered", icon: "🎉", desc: "Enjoy your food!" },
];

const STATUS_ORDER = ["PENDING", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "DELIVERED"];

export default function OrderStatusPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/orders/${id}`);
    if (res.status === 404) { setNotFound(true); setLoading(false); return; }
    const data = await res.json();
    setOrder(data.data);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
    // Auto-refresh every 15s until delivered/cancelled
    const interval = setInterval(() => {
      if (order && ["DELIVERED", "CANCELLED", "REFUNDED"].includes(order.status)) return;
      load();
    }, 15000);
    return () => clearInterval(interval);
  }, [load, order]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D0D0F] flex items-center justify-center text-white/50">
        Loading order...
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="min-h-screen bg-[#0D0D0F] flex items-center justify-center text-white">
        <div className="text-center">
          <p className="text-4xl mb-4">😔</p>
          <p className="text-white/60 mb-4">Order not found</p>
          <Link href="/" className="text-[#C9A84C] hover:underline">Go home</Link>
        </div>
      </div>
    );
  }

  const currentIdx = STATUS_ORDER.indexOf(order.status);
  const isCancelled = order.status === "CANCELLED" || order.status === "REFUNDED";

  const etaText = order.estimatedAt
    ? new Date(order.estimatedAt) > new Date()
      ? `~${Math.max(1, Math.ceil((new Date(order.estimatedAt).getTime() - Date.now()) / 60000))} min`
      : "Any moment now"
    : null;

  return (
    <div className="min-h-screen bg-[#0D0D0F] text-white">
      <header className="bg-[#141417] border-b border-white/10 px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.push("/")} className="text-white/50 hover:text-white text-sm">← Home</button>
        <span className="font-semibold">Order Status</span>
        <span className="ml-auto font-mono text-xs text-[#C9A84C] font-bold">{order.orderNumber}</span>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Seat info */}
        <div className={`rounded-2xl p-5 border ${isCancelled ? "bg-red-500/10 border-red-500/20" : "bg-[#C9A84C]/10 border-[#C9A84C]/30"}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/60">{order.theater.name}</p>
              <p className="text-white font-medium">{order.screen.name}</p>
              {order.customerName && <p className="text-xs text-white/50 mt-0.5">Hi, {order.customerName}!</p>}
            </div>
            <div className="text-right">
              <p className="text-xs text-white/50">Seat</p>
              <p className={`text-4xl font-black ${isCancelled ? "text-red-400" : "text-[#C9A84C]"}`}>{order.seatLabel}</p>
            </div>
          </div>
          {!isCancelled && etaText && (
            <div className="mt-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm text-green-400 font-medium">ETA: {etaText}</span>
            </div>
          )}
          {isCancelled && (
            <p className="mt-3 text-red-400 text-sm font-medium">This order was {order.status.toLowerCase()}</p>
          )}
        </div>

        {/* Status timeline */}
        {!isCancelled && (
          <div className="bg-[#141417] border border-white/10 rounded-2xl p-5">
            <p className="text-xs text-white/40 uppercase tracking-wide mb-4">Order Progress</p>
            <div className="space-y-4">
              {STATUS_STEPS.map((step, i) => {
                const done = i < currentIdx;
                const active = i === currentIdx;
                const pending = i > currentIdx;
                return (
                  <div key={step.key} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-base flex-shrink-0 border-2
                        ${done ? "bg-green-500 border-green-500" : active ? "border-[#C9A84C] bg-[#C9A84C]/10" : "border-white/10 bg-transparent"}`}>
                        {done ? "✓" : active ? <span className="animate-pulse">{step.icon}</span> : <span className="text-white/20">{step.icon}</span>}
                      </div>
                      {i < STATUS_STEPS.length - 1 && (
                        <div className={`w-0.5 h-6 mt-1 ${done ? "bg-green-500/50" : "bg-white/10"}`} />
                      )}
                    </div>
                    <div className="pt-1.5">
                      <p className={`text-sm font-medium ${done ? "text-white/60" : active ? "text-white" : "text-white/30"}`}>
                        {step.label}
                        {active && <span className="ml-2 text-[#C9A84C] text-xs">← Now</span>}
                      </p>
                      {(done || active) && (
                        <p className="text-xs text-white/40">{step.desc}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Order items */}
        <div className="bg-[#141417] border border-white/10 rounded-2xl p-5">
          <p className="text-xs text-white/40 uppercase tracking-wide mb-3">Your Order</p>
          <div className="space-y-2 mb-4">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-white/80">{item.name} × {item.quantity}</span>
                <span className="text-white/60">{formatCurrency(item.totalPrice)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-white/10 pt-3 space-y-1.5">
            <div className="flex justify-between text-sm text-white/50"><span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
            <div className="flex justify-between text-sm text-white/50"><span>GST</span><span>{formatCurrency(order.taxAmount)}</span></div>
            <div className="flex justify-between text-sm text-white/50"><span>Packaging</span><span>{formatCurrency(order.packagingFee)}</span></div>
            <div className="flex justify-between font-bold text-base pt-2 border-t border-white/10">
              <span>Total</span>
              <span className="text-[#C9A84C]">{formatCurrency(order.totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Auto-refresh note */}
        {!["DELIVERED", "CANCELLED", "REFUNDED"].includes(order.status) && (
          <p className="text-center text-xs text-white/30">
            Status updates automatically every 15 seconds
          </p>
        )}

        <div className="flex gap-3">
          <button onClick={load} className="flex-1 border border-white/10 text-white/50 hover:text-white py-3 rounded-xl text-sm transition-colors">
            ↻ Refresh
          </button>
          <Link href="/" className="flex-1 text-center border border-white/10 text-white/50 hover:text-white py-3 rounded-xl text-sm transition-colors">
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
