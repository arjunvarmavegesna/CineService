"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const seat = searchParams.get("seat");
  const screen = searchParams.get("screen");

  const cartRaw = searchParams.get("cart");
  const cart = cartRaw ? JSON.parse(decodeURIComponent(cartRaw)) : [];

  const subtotal = cart.reduce((s: number, i: any) => s + i.price * i.quantity, 0);
  const tax = Math.round(subtotal * 0.05);
  const packaging = 10;
  const total = subtotal + tax + packaging;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [instructions, setInstructions] = useState("");
  const [loading, setLoading] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");

  const placeOrder = async () => {
    if (!name || !phone) {
      alert("Please enter your name and phone number");
      return;
    }
    setLoading(true);

    // Simulate order placement (we will connect real API later)
    await new Promise((r) => setTimeout(r, 1500));
    const num = "CS-" + Date.now().toString().slice(-6);
    setOrderNumber(num);
    setPlaced(true);
    setLoading(false);
  };

  // Order placed screen
  if (placed) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="text-7xl mb-6">🎉</div>
          <h1 className="text-2xl font-black mb-2">Order Placed!</h1>
          <p className="text-white/60 mb-6">
            Your food is being prepared and will be delivered to seat{" "}
            <span className="text-amber-400 font-bold">{seat}</span>
          </p>

          <div className="bg-[#141418] border border-white/10 rounded-2xl p-5 mb-6 text-left space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Order number</span>
              <span className="font-mono font-bold text-amber-400">{orderNumber}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Seat</span>
              <span className="font-bold">{seat}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Estimated time</span>
              <span className="font-bold text-green-400">~12 minutes</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Total paid</span>
              <span className="font-bold text-amber-400">₹{total}</span>
            </div>
          </div>

          {/* Order items */}
          <div className="bg-[#141418] border border-white/10 rounded-2xl p-5 mb-6 text-left">
            <p className="text-xs text-white/40 uppercase tracking-wide mb-3">Your order</p>
            <div className="space-y-2">
              {cart.map((item: any) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-white/80">
                    {item.emoji} {item.name} × {item.quantity}
                  </span>
                  <span className="text-white/60">₹{item.price * item.quantity}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Status timeline */}
          <div className="bg-[#141418] border border-white/10 rounded-2xl p-5 mb-6 text-left">
            <p className="text-xs text-white/40 uppercase tracking-wide mb-4">Order status</p>
            {[
              { label: "Order confirmed", done: true, active: false },
              { label: "Kitchen preparing", done: false, active: true },
              { label: "Ready for delivery", done: false, active: false },
              { label: "Delivered to your seat", done: false, active: false },
            ].map((step, i) => (
              <div key={i} className="flex gap-3 mb-3">
                <div className="flex flex-col items-center">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0
                    ${step.done ? "bg-green-500 text-black" : step.active ? "border-2 border-amber-500" : "border border-white/20"}
                  `}>
                    {step.done ? "✓" : ""}
                  </div>
                  {i < 3 && <div className="w-px h-4 bg-white/10 mt-1" />}
                </div>
                <p className={`text-sm pt-0.5 ${step.done ? "text-white/60" : step.active ? "text-white font-medium" : "text-white/30"}`}>
                  {step.label}
                  {step.active && <span className="ml-2 text-amber-400 text-xs">← Now</span>}
                </p>
              </div>
            ))}
          </div>

          <button
            onClick={() => router.push("/")}
            className="w-full border border-white/20 text-white/70 hover:text-white py-3 rounded-xl text-sm transition-colors"
          >
            Back to home
          </button>
        </div>
      </div>
    );
  }

  // Checkout form
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <header className="bg-[#141418] border-b border-white/10 px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-white/50 hover:text-white text-sm">
          ← Back
        </button>
        <span className="font-semibold">Checkout</span>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Delivery info */}
        <div className="bg-[#141418] border border-white/10 rounded-2xl p-4">
          <p className="text-xs text-white/40 uppercase tracking-wide mb-3">Delivering to</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center text-amber-400 font-black text-lg">
              {seat}
            </div>
            <div>
              <p className="font-bold">Seat {seat}</p>
              <p className="text-sm text-white/50">Screen {screen}</p>
            </div>
          </div>
        </div>

        {/* Order summary */}
        <div className="bg-[#141418] border border-white/10 rounded-2xl p-4">
          <p className="text-xs text-white/40 uppercase tracking-wide mb-3">Order summary</p>
          <div className="space-y-2 mb-4">
            {cart.map((item: any) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-white/80">
                  {item.emoji} {item.name} × {item.quantity}
                </span>
                <span>₹{item.price * item.quantity}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-white/10 pt-3 space-y-1.5">
            <div className="flex justify-between text-sm text-white/60">
              <span>Subtotal</span><span>₹{subtotal}</span>
            </div>
            <div className="flex justify-between text-sm text-white/60">
              <span>GST (5%)</span><span>₹{tax}</span>
            </div>
            <div className="flex justify-between text-sm text-white/60">
              <span>Packaging</span><span>₹{packaging}</span>
            </div>
            <div className="flex justify-between font-bold text-base pt-2 border-t border-white/10">
              <span>Total</span>
              <span className="text-amber-400">₹{total}</span>
            </div>
          </div>
        </div>

        {/* Contact details */}
        <div className="bg-[#141418] border border-white/10 rounded-2xl p-4 space-y-3">
          <p className="text-xs text-white/40 uppercase tracking-wide">Your details</p>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Name</label>
            <input
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500/50 placeholder-white/20"
            />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Phone number</label>
            <input
              type="tel"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500/50 placeholder-white/20"
            />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Special instructions (optional)</label>
            <textarea
              placeholder="E.g. extra ketchup, no ice..."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500/50 placeholder-white/20 resize-none"
            />
          </div>
        </div>

        {/* Place order button */}
        <button
          onClick={placeOrder}
          disabled={loading}
          className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold py-4 rounded-2xl text-lg transition-colors"
        >
          {loading ? "Placing order..." : `Place Order · ₹${total}`}
        </button>

        <p className="text-center text-xs text-white/30 pb-8">
          Payment will be collected at delivery for now
        </p>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-white/50">
        Loading...
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}