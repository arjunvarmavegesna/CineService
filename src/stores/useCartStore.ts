"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  isVeg: boolean;
  category?: string;
}

export interface SeatContext {
  theaterId: string;
  theaterName: string;
  screenId: string;
  screenName: string;
  seatId: string;
  seatLabel: string;
}

interface CartState {
  items: CartItem[];
  seat: SeatContext | null;
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  setSeat: (seat: SeatContext) => void;
  clearSeat: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      seat: null,
      addItem: (item) =>
        set((s) => {
          const existing = s.items.find((i) => i.id === item.id);
          if (existing) {
            return { items: s.items.map((i) => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i) };
          }
          return { items: [...s.items, { ...item, quantity: 1 }] };
        }),
      removeItem: (id) =>
        set((s) => {
          const existing = s.items.find((i) => i.id === id);
          if (existing && existing.quantity > 1) {
            return { items: s.items.map((i) => i.id === id ? { ...i, quantity: i.quantity - 1 } : i) };
          }
          return { items: s.items.filter((i) => i.id !== id) };
        }),
      clearCart: () => set({ items: [] }),
      setSeat: (seat) => set({ seat }),
      clearSeat: () => set({ seat: null }),
    }),
    { name: "cineserve-cart", skipHydration: true }
  )
);

export const getCartTotal = (items: CartItem[]) =>
  items.reduce((sum, i) => sum + i.price * i.quantity, 0);

export const getCartCount = (items: CartItem[]) =>
  items.reduce((sum, i) => sum + i.quantity, 0);
