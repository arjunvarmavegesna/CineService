"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

interface OrderItem { name: string; quantity: number; unitPrice: number; totalPrice: number }
interface StatusLog { status: string; createdAt: string }
interface Order {
  id: string; orderNumber: string; seatLabel: string; status: string;
  subtotal: number; taxAmount: number; packagingFee: number; discount: number; totalAmount: number;
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
      <div className="min-h-screen bg-[#F4F4F9] flex items-center justify-center text-gray-500">
        Loading order...
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="min-h-screen bg-[#F4F4F9] flex items-center justify-center text-gray-900">
        <div className="text-center">
          <p className="text-4xl mb-4">😔</p>
          <p className="text-gray-500 mb-4">Order not found</p>
          <Link href="/" className="text-[#E03455] hover:underline">Go home</Link>
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
    <div className="min-h-screen bg-[#F4F4F9] text-gray-900">
      <header className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.push("/")} className="text-gray-500 hover:text-gray-900 text-sm">← Home</button>
        <span className="font-semibold">Order Status</span>
        <span className="ml-auto font-mono text-xs text-[#E03455] font-bold">{order.orderNumber}</span>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Seat info */}
        <div className={`rounded-2xl p-5 border ${isCancelled ? "bg-red-500/10 border-red-500/20" : "bg-[#E03455]/10 border-[#E03455]/30"}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{order.theater.name}</p>
              <p className="text-gray-900 font-medium">{order.screen.name}</p>
              {order.customerName && <p className="text-xs text-gray-500 mt-0.5">Hi, {order.customerName}!</p>}
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Seat</p>
              <p className={`text-4xl font-black ${isCancelled ? "text-red-400" : "text-[#E03455]"}`}>{order.seatLabel}</p>
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
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-4">Order Progress</p>
            <div className="space-y-4">
              {STATUS_STEPS.map((step, i) => {
                const done = i < currentIdx;
                const active = i === currentIdx;
                const pending = i > currentIdx;
                return (
                  <div key={step.key} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-base flex-shrink-0 border-2
                        ${done ? "bg-green-500 border-green-500" : active ? "border-[#E03455] bg-[#E03455]/10" : "border-gray-200 bg-transparent"}`}>
                        {done ? "✓" : active ? <span className="animate-pulse">{step.icon}</span> : <span className="text-gray-300">{step.icon}</span>}
                      </div>
                      {i < STATUS_STEPS.length - 1 && (
                        <div className={`w-0.5 h-6 mt-1 ${done ? "bg-green-500/50" : "bg-gray-100"}`} />
                      )}
                    </div>
                    <div className="pt-1.5">
                      <p className={`text-sm font-medium ${done ? "text-gray-500" : active ? "text-gray-900" : "text-gray-400"}`}>
                        {step.label}
                        {active && <span className="ml-2 text-[#E03455] text-xs">← Now</span>}
                      </p>
                      {(done || active) && (
                        <p className="text-xs text-gray-400">{step.desc}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Order items */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Your Order</p>
          <div className="space-y-2 mb-4">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-gray-700">{item.name} × {item.quantity}</span>
                <span className="text-gray-500">{formatCurrency(item.totalPrice)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-200 pt-3 space-y-1.5">
            <div className="flex justify-between text-sm text-gray-500"><span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
            {order.taxAmount > 0 && (
              <div className="flex justify-between text-sm text-gray-500"><span>GST</span><span>{formatCurrency(order.taxAmount)}</span></div>
            )}
            {order.packagingFee > 0 && (
              <div className="flex justify-between text-sm text-gray-500"><span>Packaging</span><span>{formatCurrency(order.packagingFee)}</span></div>
            )}
            {order.discount > 0 && (
              <div className="flex justify-between text-sm text-green-500"><span>Discount</span><span>−{formatCurrency(order.discount)}</span></div>
            )}
            <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-200">
              <span>Total</span>
              <span className="text-[#E03455]">{formatCurrency(order.totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Auto-refresh note */}
        {!["DELIVERED", "CANCELLED", "REFUNDED"].includes(order.status) && (
          <p className="text-center text-xs text-gray-400">
            Status updates automatically every 15 seconds
          </p>
        )}

        <div className="flex gap-3">
          <button onClick={load} className="flex-1 border border-gray-200 text-gray-500 hover:text-gray-900 py-3 rounded-xl text-sm transition-colors">
            ↻ Refresh
          </button>
          <Link href="/" className="flex-1 text-center border border-gray-200 text-gray-500 hover:text-gray-900 py-3 rounded-xl text-sm transition-colors">
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
