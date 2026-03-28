"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";

const MENU_ITEMS = [
  { id: "p1", name: "Butter Popcorn", desc: "Rich buttery movie-style popcorn", price: 210, emoji: "🍿", category: "Popcorn", veg: true, popular: true },
  { id: "p2", name: "Caramel Popcorn", desc: "Sweet glazed caramel popcorn", price: 250, emoji: "🍿", category: "Popcorn", veg: true, popular: false },
  { id: "p3", name: "Cheese Popcorn", desc: "Sharp cheddar dusted popcorn", price: 230, emoji: "🍿", category: "Popcorn", veg: true, popular: false },
  { id: "b1", name: "Coca-Cola", desc: "Ice cold classic Coke", price: 150, emoji: "🥤", category: "Beverages", veg: true, popular: true },
  { id: "b2", name: "Mango Smoothie", desc: "Fresh Alphonso mango blend", price: 180, emoji: "🍹", category: "Beverages", veg: true, popular: false },
  { id: "b3", name: "Fresh Lime Soda", desc: "Sweet or salted, freshly squeezed", price: 120, emoji: "🍋", category: "Beverages", veg: true, popular: false },
  { id: "n1", name: "Loaded Nachos", desc: "With salsa, sour cream and jalapeños", price: 280, emoji: "🌽", category: "Snacks", veg: true, popular: true },
  { id: "n2", name: "Masala Fries", desc: "Crispy fries with signature masala", price: 199, emoji: "🍟", category: "Snacks", veg: true, popular: false },
  { id: "f1", name: "Paneer Tikka Burger", desc: "Grilled paneer in a brioche bun", price: 299, emoji: "🍔", category: "Meals", veg: true, popular: true },
  { id: "f2", name: "Margherita Pizza Slice", desc: "Classic tomato and mozzarella", price: 220, emoji: "🍕", category: "Meals", veg: true, popular: false },
  { id: "c1", name: "Movie Night Combo", desc: "Large popcorn + 2 drinks + nachos", price: 499, emoji: "🎉", category: "Combos", veg: true, popular: true },
  { id: "c2", name: "Solo Snack Box", desc: "Medium popcorn + drink + fries", price: 349, emoji: "📦", category: "Combos", veg: true, popular: false },
];

const CATEGORIES = ["All", "Popcorn", "Beverages", "Snacks", "Meals", "Combos"];

interface CartItem {
  id: string;
  name: string;
  price: number;
  emoji: string;
  quantity: number;
}

function MenuContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const seat = searchParams.get("seat");
  const screen = searchParams.get("screen");

  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  const filtered = MENU_ITEMS.filter((item) => {
    const matchCat = activeCategory === "All" || item.category === activeCategory;
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const addToCart = (item: typeof MENU_ITEMS[0]) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) {
        return prev.map((c) => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { id: item.id, name: item.name, price: item.price, emoji: item.emoji, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === id);
      if (existing && existing.quantity > 1) {
        return prev.map((c) => c.id === id ? { ...c, quantity: c.quantity - 1 } : c);
      }
      return prev.filter((c) => c.id !== id);
    });
  };

  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);
  const cartTotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);

  const goToCheckout = () => {
    const cartData = encodeURIComponent(JSON.stringify(cart));
    router.push(`/checkout?seat=${seat}&screen=${screen}&cart=${cartData}`);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#0a0a0f]/95 backdrop-blur border-b border-white/10">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center font-black text-black text-xs">C</div>
            <div>
              <p className="text-xs text-white/50">Delivering to</p>
              <p className="text-sm font-bold">Seat <span className="text-amber-400">{seat}</span></p>
            </div>
          </div>
          <button
            onClick={() => router.push("/order")}
            className="text-xs text-white/40 border border-white/10 rounded-lg px-2 py-1 hover:text-white"
          >
            Change seat
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <input
            type="text"
            placeholder="Search food and drinks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm placeholder-white/30 focus:outline-none focus:border-amber-500/50"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium border transition-all
                ${activeCategory === cat
                  ? "bg-amber-500/20 border-amber-500/60 text-amber-400"
                  : "border-white/10 text-white/50 hover:text-white"
                }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      {/* Menu items */}
      <main className="flex-1 px-4 py-4 pb-32">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-white/40">
            <p className="text-4xl mb-3">🔍</p>
            <p>No items found for "{search}"</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((item) => {
              const inCart = cart.find((c) => c.id === item.id);
              return (
                <div
                  key={item.id}
                  className="bg-[#141418] border border-white/10 rounded-2xl p-4 flex items-center gap-4"
                >
                  {/* Emoji */}
                  <div className="w-16 h-16 bg-white/5 rounded-xl flex items-center justify-center text-3xl flex-shrink-0">
                    {item.emoji}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${item.veg ? "border-green-500 bg-green-500" : "border-red-500 bg-red-500"}`} />
                      {item.popular && (
                        <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
                          ⭐ Popular
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-sm">{item.name}</p>
                    <p className="text-xs text-white/50 mt-0.5 line-clamp-1">{item.desc}</p>
                    <p className="font-bold text-amber-400 mt-1">₹{item.price}</p>
                  </div>

                  {/* Add/Remove */}
                  <div className="flex-shrink-0">
                    {!inCart ? (
                      <button
                        onClick={() => addToCart(item)}
                        className="border border-amber-500/60 text-amber-400 hover:bg-amber-500 hover:text-black font-bold px-4 py-2 rounded-xl text-sm transition-all"
                      >
                        + Add
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 font-bold flex items-center justify-center"
                        >
                          −
                        </button>
                        <span className="font-bold w-4 text-center">{inCart.quantity}</span>
                        <button
                          onClick={() => addToCart(item)}
                          className="w-8 h-8 rounded-full bg-amber-500/20 hover:bg-amber-500 hover:text-black text-amber-400 font-bold flex items-center justify-center transition-all"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Cart button */}
      {cartCount > 0 && (
        <div className="fixed bottom-6 inset-x-4 max-w-lg mx-auto z-40">
          <button
            onClick={() => setCartOpen(true)}
            className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-2xl py-4 flex items-center justify-between px-6 shadow-2xl transition-all"
          >
            <span className="bg-black/20 rounded-full w-7 h-7 flex items-center justify-center text-sm font-black">
              {cartCount}
            </span>
            <span>View Cart</span>
            <span>₹{cartTotal}</span>
          </button>
        </div>
      )}

      {/* Cart drawer */}
      {cartOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60" onClick={() => setCartOpen(false)} />
          <div className="fixed bottom-0 inset-x-0 z-50 bg-[#141418] border-t border-white/10 rounded-t-3xl p-6 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-lg">Your Cart</h2>
              <button onClick={() => setCartOpen(false)} className="text-white/50 hover:text-white">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 mb-4">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <span className="text-2xl">{item.emoji}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-amber-400 text-sm">₹{item.price * item.quantity}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => removeFromCart(item.id)} className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center font-bold">−</button>
                    <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                    <button onClick={() => addToCart({ ...MENU_ITEMS.find(m => m.id === item.id)! })} className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">+</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-white/10 pt-4 space-y-2 mb-4">
              <div className="flex justify-between text-sm text-white/60">
                <span>Subtotal</span><span>₹{cartTotal}</span>
              </div>
              <div className="flex justify-between text-sm text-white/60">
                <span>GST (5%)</span><span>₹{Math.round(cartTotal * 0.05)}</span>
              </div>
              <div className="flex justify-between font-bold text-base pt-1 border-t border-white/10">
                <span>Total</span>
                <span className="text-amber-400">₹{Math.round(cartTotal * 1.05)}</span>
              </div>
            </div>

            <button
              onClick={goToCheckout}
              className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-4 rounded-2xl transition-colors"
            >
              Proceed to Checkout · ₹{Math.round(cartTotal * 1.05)}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function MenuPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-white/50">Loading menu...</div>
      </div>
    }>
      <MenuContent />
    </Suspense>
  );
}