"use client";

import { useState, Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useCartStore, getCartTotal } from "@/stores/useCartStore";
import Link from "next/link";

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const theaterId = searchParams.get("theaterId") ?? "";
  const screenId = searchParams.get("screenId") ?? "";
  const seatId = searchParams.get("seatId") ?? "";
  const seatLabel = searchParams.get("seatLabel") ?? "";

  const { items, clearCart, seat } = useCartStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    useCartStore.persist.rehydrate();
    setHydrated(true);
  }, []);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [instructions, setInstructions] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState("");
  const [error, setError] = useState("");

  const displaySeat = seatLabel || seat?.seatLabel || "—";
  const displayTheaterId = theaterId || seat?.theaterId || "";
  const displayScreenId = screenId || seat?.screenId || "";
  const displaySeatId = seatId || seat?.seatId || "";

  const subtotal = hydrated ? getCartTotal(items) : 0;
  const tax = Math.round(subtotal * 0.05);
  const packaging = 10;
  const total = subtotal + tax + packaging;

  const placeOrder = async () => {
    if (!name.trim()) { setError("Please enter your name"); return; }
    if (!phone.trim() || phone.replace(/\D/g, "").length < 10) { setError("Please enter a valid phone number"); return; }
    if (items.length === 0) { setError("Your cart is empty"); return; }

    setError("");
    setLoading(true);

    const payload = {
      theaterId: displayTheaterId,
      screenId: displayScreenId,
      seatId: displaySeatId,
      seatLabel: displaySeat,
      customerName: name.trim(),
      customerPhone: phone.trim(),
      notes: instructions.trim() || undefined,
      couponCode: couponCode.trim() || undefined,
      items: items.map((item) => ({
        menuItemId: item.id,
        quantity: item.quantity,
        name: item.name,
        unitPrice: item.price,
      })),
    };

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Failed to place order. Please try again.");
      setLoading(false);
      return;
    }

    clearCart();
    setOrderId(data.data.id);
    setOrderNumber(data.data.orderNumber);
    setLoading(false);
  };

  // Order success screen
  if (orderId) {
    return (
      <div className="min-h-screen bg-[#F4F4F9] text-gray-900 flex flex-col items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="text-7xl mb-6">🎉</div>
          <h1 className="text-2xl font-black mb-2">Order Placed!</h1>
          <p className="text-gray-500 mb-6">
            Your food is being prepared and will be delivered to seat{" "}
            <span className="text-[#E03455] font-bold">{displaySeat}</span>
          </p>

          <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-6 text-left space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Order number</span>
              <span className="font-mono font-bold text-[#E03455]">{orderNumber}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Seat</span>
              <span className="font-bold">{displaySeat}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total paid</span>
              <span className="font-bold text-[#E03455]">₹{total}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Estimated time</span>
              <span className="font-bold text-green-400">~12 minutes</span>
            </div>
          </div>

          <Link
            href={`/order-status/${orderId}`}
            className="block w-full bg-[#E03455] hover:bg-[#C82040] text-white font-bold py-4 rounded-xl text-center transition-colors mb-3"
          >
            Track Order Status
          </Link>
          <Link href="/" className="block text-gray-500 hover:text-gray-900 text-sm py-2">Back to home</Link>
        </div>
      </div>
    );
  }

  if (!hydrated) {
    return <div className="min-h-screen bg-[#F4F4F9] flex items-center justify-center text-gray-500">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-[#F4F4F9] text-gray-900">
      <header className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-900 text-sm">← Back</button>
        <span className="font-semibold">Checkout</span>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Delivery info */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Delivering to</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#E03455]/20 rounded-xl flex items-center justify-center text-[#E03455] font-black text-lg">{displaySeat}</div>
            <div>
              <p className="font-bold">Seat {displaySeat}</p>
              <p className="text-sm text-gray-500">{seat?.screenName ?? "—"} · {seat?.theaterName ?? "—"}</p>
            </div>
          </div>
        </div>

        {/* Order summary */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Order summary</p>
          <div className="space-y-2 mb-4">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-700">{item.name} × {item.quantity}</span>
                <span>₹{item.price * item.quantity}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-200 pt-3 space-y-1.5">
            <div className="flex justify-between text-sm text-gray-500"><span>Subtotal</span><span>₹{subtotal}</span></div>
            <div className="flex justify-between text-sm text-gray-500"><span>GST (5%)</span><span>₹{tax}</span></div>
            <div className="flex justify-between text-sm text-gray-500"><span>Packaging</span><span>₹{packaging}</span></div>
            <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-200">
              <span>Total</span>
              <span className="text-[#E03455]">₹{total}</span>
            </div>
          </div>
        </div>

        {/* Coupon */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Have a coupon?</p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter coupon code"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#E03455]/50 placeholder-gray-400 uppercase"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1.5">Try: WELCOME20 for 20% off</p>
        </div>

        {/* Contact details */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Your details</p>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Name *</label>
            <input
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#E03455]/50 placeholder-gray-400"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Phone number *</label>
            <input
              type="tel"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#E03455]/50 placeholder-gray-400"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Special instructions (optional)</label>
            <textarea
              placeholder="e.g. extra ketchup, no ice..."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={2}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#E03455]/50 placeholder-gray-400 resize-none"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <button
          onClick={placeOrder}
          disabled={loading || items.length === 0}
          className="w-full bg-[#E03455] hover:bg-[#C82040] disabled:opacity-50 text-white font-bold py-4 rounded-2xl text-lg transition-colors"
        >
          {loading ? "Placing order..." : `Place Order · ₹${total}`}
        </button>

        <p className="text-center text-xs text-gray-400 pb-8">Payment collected at delivery · Order is final once placed</p>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F4F4F9] flex items-center justify-center text-gray-500">Loading...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
