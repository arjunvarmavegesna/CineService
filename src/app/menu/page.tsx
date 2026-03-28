"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useCartStore, getCartTotal, getCartCount } from "@/stores/useCartStore";

interface Category { id: string; name: string; icon?: string }
interface MenuItem {
  id: string; name: string; description?: string; basePrice: number;
  isVeg: boolean; isFeatured: boolean; status: string;
  category: { id: string; name: string; icon?: string };
}

function MenuContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const theaterId = searchParams.get("theaterId") ?? "";
  const screenId = searchParams.get("screenId") ?? "";
  const seatId = searchParams.get("seatId") ?? "";
  const seatLabel = searchParams.get("seatLabel") ?? "";

  const { items: cartItems, addItem, removeItem, seat } = useCartStore();

  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    useCartStore.persist.rehydrate();
    setHydrated(true);
  }, []);

  const loadMenu = useCallback(async () => {
    const params = new URLSearchParams();
    if (theaterId) params.set("theaterId", theaterId);
    if (search) params.set("search", search);
    if (activeCategory !== "all") params.set("categoryId", activeCategory);

    const res = await fetch(`/api/menu?${params}`);
    const data = await res.json();
    setMenuItems(data.data ?? []);
  }, [theaterId, search, activeCategory]);

  useEffect(() => {
    Promise.all([
      fetch("/api/categories").then((r) => r.json()),
      loadMenu(),
    ]).then(([catsData]) => {
      setCategories(catsData.data ?? []);
      setLoading(false);
    });
  }, [loadMenu]);

  const cartCount = hydrated ? getCartCount(cartItems) : 0;
  const cartTotal = hydrated ? getCartTotal(cartItems) : 0;

  const tax = Math.round(cartTotal * 0.05);
  const packaging = 10;

  const goToCheckout = () => {
    router.push(`/checkout?theaterId=${theaterId}&screenId=${screenId}&seatId=${seatId}&seatLabel=${seatLabel}`);
  };

  const displaySeatLabel = seatLabel || seat?.seatLabel || "—";

  return (
    <div className="min-h-screen bg-[#0D0D0F] text-white flex flex-col">
      {/* Sticky header */}
      <header className="sticky top-0 z-30 bg-[#0D0D0F]/95 backdrop-blur border-b border-white/10">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#C9A84C] rounded-lg flex items-center justify-center font-black text-black text-xs">C</div>
            <div>
              <p className="text-xs text-white/50">Delivering to</p>
              <p className="text-sm font-bold">Seat <span className="text-[#C9A84C]">{displaySeatLabel}</span></p>
            </div>
          </div>
          <button onClick={() => router.push("/order")}
            className="text-xs text-white/40 border border-white/10 rounded-lg px-2 py-1 hover:text-white transition-colors">
            Change seat
          </button>
        </div>

        <div className="px-4 pb-3">
          <input
            type="text"
            placeholder="Search food and drinks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm placeholder-white/30 focus:outline-none focus:border-[#C9A84C]/50"
          />
        </div>

        <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveCategory("all")}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium border transition-all
              ${activeCategory === "all" ? "bg-[#C9A84C]/20 border-[#C9A84C]/60 text-[#C9A84C]" : "border-white/10 text-white/50 hover:text-white"}`}>
            All
          </button>
          {categories.map((cat) => (
            <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium border transition-all
                ${activeCategory === cat.id ? "bg-[#C9A84C]/20 border-[#C9A84C]/60 text-[#C9A84C]" : "border-white/10 text-white/50 hover:text-white"}`}>
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>
      </header>

      {/* Menu items */}
      <main className="flex-1 px-4 py-4 pb-32">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-[#141417] border border-white/10 rounded-2xl p-4 flex items-center gap-4 animate-pulse">
                <div className="w-16 h-16 bg-white/5 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-white/10 rounded w-32" />
                  <div className="h-3 bg-white/5 rounded w-48" />
                  <div className="h-4 bg-white/10 rounded w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : menuItems.length === 0 ? (
          <div className="text-center py-16 text-white/40">
            <p className="text-4xl mb-3">🔍</p>
            <p>{search ? `No items found for "${search}"` : "No items available"}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {menuItems.map((item) => {
              const inCart = cartItems.find((c) => c.id === item.id);
              return (
                <div key={item.id} className="bg-[#141417] border border-white/10 rounded-2xl p-4 flex items-center gap-4">
                  <div className="w-16 h-16 bg-white/5 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                    {item.category.icon ?? "🍽"}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${item.isVeg ? "border-green-500 bg-green-500" : "border-red-500 bg-red-500"}`} />
                      {item.isFeatured && (
                        <span className="text-[10px] text-[#C9A84C] bg-[#C9A84C]/10 border border-[#C9A84C]/20 px-1.5 py-0.5 rounded">⭐ Popular</span>
                      )}
                    </div>
                    <p className="font-semibold text-sm">{item.name}</p>
                    {item.description && <p className="text-xs text-white/50 mt-0.5 line-clamp-1">{item.description}</p>}
                    <p className="font-bold text-[#C9A84C] mt-1">₹{item.basePrice}</p>
                  </div>

                  <div className="flex-shrink-0">
                    {!inCart ? (
                      <button
                        onClick={() => addItem({ id: item.id, name: item.name, price: item.basePrice, isVeg: item.isVeg, category: item.category.name })}
                        className="border border-[#C9A84C]/60 text-[#C9A84C] hover:bg-[#C9A84C] hover:text-black font-bold px-4 py-2 rounded-xl text-sm transition-all">
                        + Add
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button onClick={() => removeItem(item.id)}
                          className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 font-bold flex items-center justify-center">−</button>
                        <span className="font-bold w-4 text-center">{inCart.quantity}</span>
                        <button
                          onClick={() => addItem({ id: item.id, name: item.name, price: item.basePrice, isVeg: item.isVeg, category: item.category.name })}
                          className="w-8 h-8 rounded-full bg-[#C9A84C]/20 hover:bg-[#C9A84C] hover:text-black text-[#C9A84C] font-bold flex items-center justify-center transition-all">+</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Sticky cart bar */}
      {hydrated && cartCount > 0 && (
        <div className="fixed bottom-6 inset-x-4 max-w-lg mx-auto z-40">
          <button onClick={() => setCartOpen(true)}
            className="w-full bg-[#C9A84C] hover:bg-[#D4B863] text-black font-bold rounded-2xl py-4 flex items-center justify-between px-6 shadow-2xl transition-all">
            <span className="bg-black/20 rounded-full w-7 h-7 flex items-center justify-center text-sm font-black">{cartCount}</span>
            <span>View Cart</span>
            <span>₹{cartTotal}</span>
          </button>
        </div>
      )}

      {/* Cart Drawer */}
      {cartOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60" onClick={() => setCartOpen(false)} />
          <div className="fixed bottom-0 inset-x-0 z-50 bg-[#141417] border-t border-white/10 rounded-t-3xl p-6 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-lg">Your Cart</h2>
              <button onClick={() => setCartOpen(false)} className="text-white/50 hover:text-white">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 mb-4">
              {cartItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-[#C9A84C] text-sm">₹{item.price * item.quantity}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => removeItem(item.id)} className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center font-bold">−</button>
                    <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                    <button
                      onClick={() => addItem({ id: item.id, name: item.name, price: item.price, isVeg: item.isVeg })}
                      className="w-7 h-7 rounded-full bg-[#C9A84C]/20 text-[#C9A84C] flex items-center justify-center font-bold">+</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-white/10 pt-4 space-y-2 mb-4">
              <div className="flex justify-between text-sm text-white/60"><span>Subtotal</span><span>₹{cartTotal}</span></div>
              <div className="flex justify-between text-sm text-white/60"><span>GST (5%)</span><span>₹{tax}</span></div>
              <div className="flex justify-between text-sm text-white/60"><span>Packaging</span><span>₹{packaging}</span></div>
              <div className="flex justify-between font-bold text-base pt-1 border-t border-white/10">
                <span>Total</span>
                <span className="text-[#C9A84C]">₹{cartTotal + tax + packaging}</span>
              </div>
            </div>

            <button onClick={goToCheckout}
              className="w-full bg-[#C9A84C] hover:bg-[#D4B863] text-black font-bold py-4 rounded-2xl transition-colors">
              Proceed to Checkout · ₹{cartTotal + tax + packaging}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function MenuPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0D0D0F] flex items-center justify-center text-white/50">Loading menu...</div>}>
      <MenuContent />
    </Suspense>
  );
}
