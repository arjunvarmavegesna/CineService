"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useCartStore, getCartTotal } from "@/stores/useCartStore";
import Link from "next/link";

// ── Razorpay types (checkout.js is loaded at runtime, not bundled) ──
declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpaySuccessResponse) => void;
  prefill?: { name?: string; contact?: string };
  notes?: Record<string, string>;
  theme?: { color?: string };
  modal?: { ondismiss?: () => void };
}

interface RazorpayInstance {
  open(): void;
}

interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

// ── Load checkout.js from Razorpay CDN (idempotent — checks if already present) ──
function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && "Razorpay" in window) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

// ── Checkout ─────────────────────────────────────────────────────────────────

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

  // Form fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [instructions, setInstructions] = useState("");
  const [couponCode, setCouponCode] = useState("");

  // Payment flow state
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [error, setError] = useState("");

  // Set after create-order succeeds — used to show order ref in error fallback
  const pendingOrderRef = useRef<{ orderId: string; orderNumber: string } | null>(null);

  // Set after verify succeeds — triggers the success screen
  const [confirmedOrder, setConfirmedOrder] = useState<{
    orderId: string;
    orderNumber: string;
    totalAmount: number;
  } | null>(null);

  const displaySeat = seatLabel || seat?.seatLabel || "—";
  const displayTheaterId = theaterId || seat?.theaterId || "";
  const displayScreenId = screenId || seat?.screenId || "";
  const displaySeatId = seatId || seat?.seatId || "";

  // Preview totals (estimated; server recalculates for actual charge)
  const subtotal = hydrated ? getCartTotal(items) : 0;
  const tax = Math.round(subtotal * 0.05);
  const packaging = 10;
  const previewTotal = subtotal + tax + packaging;

  const initiatePayment = async () => {
    if (!name.trim()) { setError("Please enter your name"); return; }
    if (!/^[6-9]\d{9}$/.test(phone.replace(/\s+/g, ""))) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }
    if (items.length === 0) { setError("Your cart is empty"); return; }
    if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) {
      setError("Payment gateway is not configured. Please contact support.");
      return;
    }

    setError("");
    setLoading(true);
    setLoadingMessage("Loading payment gateway…");

    // ── Step 1: Load Razorpay checkout.js ──
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      setError(
        "Failed to load payment gateway. Please check your connection and try again."
      );
      setLoading(false);
      return;
    }

    setLoadingMessage("Initializing payment…");

    // ── Step 2: Create order + payment record on the backend ──
    type CreateOrderResponse = {
      orderId: string;
      orderNumber: string;
      razorpayOrderId: string;
      amount: number;
      totalAmount: number;
      currency: string;
      error?: string;
    };

    let createData: CreateOrderResponse;

    try {
      const res = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theaterId: displayTheaterId,
          screenId: displayScreenId,
          seatId: displaySeatId,
          seatLabel: displaySeat,
          customerName: name.trim(),
          customerPhone: phone.replace(/\s+/g, ""),
          notes: instructions.trim() || undefined,
          couponCode: couponCode.trim() || undefined,
          items: items.map((item) => ({
            menuItemId: item.id,
            quantity: item.quantity,
            name: item.name,
            // unitPrice intentionally omitted — server recalculates from DB
          })),
        }),
      });

      createData = (await res.json()) as CreateOrderResponse;

      if (!res.ok) {
        setError(
          typeof createData.error === "string"
            ? createData.error
            : "Failed to initiate payment. Please try again."
        );
        setLoading(false);
        return;
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
      setLoading(false);
      return;
    }

    // Store the order reference in case the user closes the page during payment
    pendingOrderRef.current = {
      orderId: createData.orderId,
      orderNumber: createData.orderNumber,
    };

    setLoadingMessage("Opening payment…");

    // ── Step 3: Open Razorpay checkout modal ──
    const options: RazorpayOptions = {
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount: createData.amount,   // paise
      currency: createData.currency,
      name: "CineServe",
      description: `Food order for Seat ${displaySeat}`,
      order_id: createData.razorpayOrderId,

      handler: async (response: RazorpaySuccessResponse) => {
        // ── Step 4: Verify payment signature on the backend ──
        setLoadingMessage("Verifying payment…");

        try {
          const verifyRes = await fetch("/api/payment/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId: createData.orderId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            }),
          });

          if (verifyRes.ok) {
            // ── Step 5: Success — clear cart and show confirmation ──
            clearCart();
            setConfirmedOrder({
              orderId: createData.orderId,
              orderNumber: createData.orderNumber,
              totalAmount: createData.totalAmount,
            });
          } else {
            const errData = await verifyRes.json().catch(() => ({}));
            const ref = pendingOrderRef.current;
            setError(
              errData.error ??
                `Payment received but verification failed. ` +
                  `Your order ${ref?.orderNumber ?? ""} will be confirmed automatically. ` +
                  `If not confirmed within 5 minutes, contact support.`
            );
          }
        } catch {
          const ref = pendingOrderRef.current;
          setError(
            `Network error during verification. ` +
              `If payment was deducted, your order ${ref?.orderNumber ?? ""} ` +
              `will be confirmed automatically. Contact support if needed.`
          );
        }

        setLoading(false);
      },

      prefill: {
        name: name.trim(),
        contact: phone.replace(/\s+/g, ""),
      },

      notes: {
        seatLabel: displaySeat,
        orderNumber: createData.orderNumber,
      },

      theme: { color: "#E03455" },

      modal: {
        ondismiss: () => {
          setError("Payment was cancelled. You can try again.");
          setLoading(false);
        },
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  // ── Order confirmed — success screen ──────────────────────────────────────
  if (confirmedOrder) {
    return (
      <div className="min-h-screen bg-[#F4F4F9] text-gray-900 flex flex-col items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="text-7xl mb-6">🎉</div>
          <h1 className="text-2xl font-black mb-2">Order Confirmed!</h1>
          <p className="text-gray-500 mb-1">Payment successful.</p>
          <p className="text-gray-500 mb-6">
            Your food is being prepared and will be delivered to seat{" "}
            <span className="text-[#E03455] font-bold">{displaySeat}</span>
          </p>

          <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-6 text-left space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Order number</span>
              <span className="font-mono font-bold text-[#E03455]">
                {confirmedOrder.orderNumber}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Seat</span>
              <span className="font-bold">{displaySeat}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Amount paid</span>
              <span className="font-bold text-[#E03455]">
                ₹{confirmedOrder.totalAmount}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Payment</span>
              <span className="font-bold text-green-500">✓ Online (Razorpay)</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Estimated time</span>
              <span className="font-bold text-green-400">~12 minutes</span>
            </div>
          </div>

          <Link
            href={`/order-status/${confirmedOrder.orderId}`}
            className="block w-full bg-[#E03455] hover:bg-[#C82040] text-white font-bold py-4 rounded-xl text-center transition-colors mb-3"
          >
            Track Order Status
          </Link>
          <Link
            href="/"
            className="block text-gray-500 hover:text-gray-900 text-sm py-2"
          >
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (!hydrated) {
    return (
      <div className="min-h-screen bg-[#F4F4F9] flex items-center justify-center text-gray-500">
        Loading…
      </div>
    );
  }

  // ── Checkout form ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F4F4F9] text-gray-900">
      <header className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="text-gray-500 hover:text-gray-900 text-sm"
        >
          ← Back
        </button>
        <span className="font-semibold">Checkout</span>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Delivering to */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">
            Delivering to
          </p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#E03455]/20 rounded-xl flex items-center justify-center text-[#E03455] font-black text-lg">
              {displaySeat}
            </div>
            <div>
              <p className="font-bold">Seat {displaySeat}</p>
              <p className="text-sm text-gray-500">
                {seat?.screenName ?? "—"} · {seat?.theaterName ?? "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Order summary */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">
            Order summary
          </p>
          <div className="space-y-2 mb-4">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-700">
                  {item.name} × {item.quantity}
                </span>
                <span>₹{item.price * item.quantity}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-200 pt-3 space-y-1.5">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span>
              <span>₹{subtotal}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>GST (5%)</span>
              <span>₹{tax}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>Packaging</span>
              <span>₹{packaging}</span>
            </div>
            <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-200">
              <span>Total (est.)</span>
              <span className="text-[#E03455]">₹{previewTotal}</span>
            </div>
          </div>
          <p className="text-[10px] text-gray-400 mt-2">
            Final amount is calculated at payment and shown in the Razorpay checkout.
          </p>
        </div>

        {/* Coupon */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
            Have a coupon?
          </p>
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
          <p className="text-xs text-gray-400 uppercase tracking-wide">
            Your details
          </p>
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
            <label className="text-xs text-gray-500 mb-1 block">
              Phone number *
            </label>
            <input
              type="tel"
              placeholder="98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#E03455]/50 placeholder-gray-400"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">
              Special instructions (optional)
            </label>
            <textarea
              placeholder="e.g. extra ketchup, no ice…"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={2}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#E03455]/50 placeholder-gray-400 resize-none"
            />
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        {/* Pay button */}
        <button
          onClick={initiatePayment}
          disabled={loading || items.length === 0}
          className="w-full bg-[#E03455] hover:bg-[#C82040] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl text-lg transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              {loadingMessage || "Processing…"}
            </>
          ) : (
            `Pay ₹${previewTotal} · Razorpay`
          )}
        </button>

        <p className="text-center text-xs text-gray-400 pb-8">
          Secured by Razorpay · UPI, cards, net banking & wallets accepted
        </p>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F4F4F9] flex items-center justify-center text-gray-500">
          Loading…
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
