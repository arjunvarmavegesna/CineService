"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCartStore } from "@/stores/useCartStore";

interface Theater { id: string; name: string; city: string; _count: { screens: number } }
interface Screen { id: string; name: string; number: number; capacity: number; _count: { seats: number } }
interface Seat { id: string; row: string; number: number; label: string }

function OrderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSeat = useCartStore((s) => s.setSeat);

  const [step, setStep] = useState<"theater" | "screen" | "seat" | "confirm">("theater");
  const [theater, setTheater] = useState<Theater | null>(null);
  const [screen, setScreen] = useState<Screen | null>(null);
  const [seat, setSeatState] = useState<Seat | null>(null);

  const [theaters, setTheaters] = useState<Theater[]>([]);
  const [screens, setScreens] = useState<Screen[]>([]);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [loading, setLoading] = useState(false);

  // Handle QR pre-fill
  useEffect(() => {
    const tId = searchParams.get("t");
    const sId = searchParams.get("s");
    const seatId = searchParams.get("seat");

    if (tId && sId && seatId) {
      // Pre-fill from QR code — fetch details and skip to confirm
      const prefill = async () => {
        setLoading(true);
        const [tRes, sRes] = await Promise.all([
          fetch("/api/theaters"),
          fetch(`/api/theaters/${tId}/screens`),
        ]);
        const [tData, sData] = await Promise.all([tRes.json(), sRes.json()]);
        const t = tData.data?.find((x: Theater) => x.id === tId);
        const s = sData.data?.find((x: Screen) => x.id === sId);
        if (t) setTheater(t);
        if (s) setScreen(s);
        if (s) {
          const seatsRes = await fetch(`/api/screens/${sId}/seats`);
          const seatsData = await seatsRes.json();
          const seatObj = seatsData.data?.find((x: Seat) => x.id === seatId);
          if (seatObj) { setSeatState(seatObj); setStep("confirm"); }
        }
        setLoading(false);
      };
      prefill();
    } else {
      // Load theaters for manual selection
      fetch("/api/theaters")
        .then((r) => r.json())
        .then((d) => setTheaters(d.data ?? []));
    }
  }, [searchParams]);

  const selectTheater = async (t: Theater) => {
    setTheater(t);
    setLoading(true);
    const res = await fetch(`/api/theaters/${t.id}/screens`);
    const data = await res.json();
    setScreens(data.data ?? []);
    setLoading(false);
    setStep("screen");
  };

  const selectScreen = async (s: Screen) => {
    setScreen(s);
    setLoading(true);
    const res = await fetch(`/api/screens/${s.id}/seats`);
    const data = await res.json();
    setSeats(data.data ?? []);
    setLoading(false);
    setStep("seat");
  };

  const selectSeat = (s: Seat) => {
    setSeatState(s);
    setStep("confirm");
  };

  const confirm = () => {
    if (!theater || !screen || !seat) return;
    setSeat({
      theaterId: theater.id,
      theaterName: theater.name,
      screenId: screen.id,
      screenName: screen.name,
      seatId: seat.id,
      seatLabel: seat.label,
    });
    router.push(`/menu?theaterId=${theater.id}&screenId=${screen.id}&seatId=${seat.id}&seatLabel=${seat.label}`);
  };

  const rows = Array.from(new Set(seats.map((s) => s.row)));

  return (
    <div className="min-h-screen bg-[#F4F4F9] text-gray-900">
      <header className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3">
        <div className="w-8 h-8 bg-[#E03455] rounded-lg flex items-center justify-center font-black text-white text-sm">C</div>
        <span className="font-semibold text-lg">CineServe</span>
      </header>

      {/* Steps */}
      <div className="flex items-center px-6 py-4 gap-2">
        {["Theater", "Screen", "Seat"].map((s, i) => {
          const steps = ["theater", "screen", "seat", "confirm"];
          const currentIdx = steps.indexOf(step);
          const done = i < currentIdx;
          const active = i === currentIdx;
          return (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border
                ${done ? "bg-green-500 border-green-500 text-white" : ""}
                ${active ? "border-[#E03455] text-[#E03455]" : ""}
                ${!done && !active ? "border-gray-300 text-gray-400" : ""}`}>
                {done ? "✓" : i + 1}
              </div>
              <span className={`text-sm ${active ? "text-gray-900" : "text-gray-400"}`}>{s}</span>
              {i < 2 && <div className="w-8 h-px bg-gray-100 ml-1" />}
            </div>
          );
        })}
      </div>

      <div className="max-w-lg mx-auto px-4 py-4">
        {loading && (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        )}

        {/* Theater Selection */}
        {!loading && step === "theater" && (
          <div>
            <h2 className="text-xl font-bold mb-2">Select your theater</h2>
            <p className="text-gray-500 text-sm mb-6">Which theater are you currently in?</p>
            <div className="space-y-3">
              {theaters.map((t) => (
                <button key={t.id} onClick={() => selectTheater(t)}
                  className="w-full text-left p-4 bg-white border border-gray-200 rounded-xl hover:border-[#E03455]/50 hover:bg-[#E03455]/5 transition-all">
                  <div className="font-semibold">{t.name}</div>
                  <div className="text-sm text-gray-500 mt-1">{t.city} · {t._count.screens} screens</div>
                </button>
              ))}
              {theaters.length === 0 && (
                <div className="text-center py-10 text-gray-400">No theaters available</div>
              )}
            </div>
          </div>
        )}

        {/* Screen Selection */}
        {!loading && step === "screen" && (
          <div>
            <button onClick={() => setStep("theater")} className="text-gray-500 text-sm mb-4 hover:text-gray-900">← Back</button>
            <h2 className="text-xl font-bold mb-2">Select your screen</h2>
            <p className="text-gray-500 text-sm mb-6">Inside {theater?.name}</p>
            <div className="space-y-3">
              {screens.map((s) => (
                <button key={s.id} onClick={() => selectScreen(s)}
                  className="w-full text-left p-4 bg-white border border-gray-200 rounded-xl hover:border-[#E03455]/50 hover:bg-[#E03455]/5 transition-all">
                  <div className="font-semibold">{s.name}</div>
                  <div className="text-sm text-gray-500 mt-1">{s.capacity} seats</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Seat Selection */}
        {!loading && step === "seat" && (
          <div>
            <button onClick={() => setStep("screen")} className="text-gray-500 text-sm mb-4 hover:text-gray-900">← Back</button>
            <h2 className="text-xl font-bold mb-2">Select your seat</h2>
            <p className="text-gray-500 text-sm mb-4">Tap your exact seat number</p>

            <div className="text-center text-xs text-gray-400 tracking-widest mb-4 py-2 bg-gray-50 rounded-lg">
              SCREEN THIS WAY ▲
            </div>

            <div className="space-y-2 mb-6 overflow-x-auto">
              {rows.map((row) => (
                <div key={row} className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-4 flex-shrink-0">{row}</span>
                  <div className="flex gap-1.5">
                    {seats.filter((s) => s.row === row).map((s) => (
                      <button key={s.id} onClick={() => selectSeat(s)}
                        className={`w-7 h-6 rounded text-[10px] font-bold transition-all
                          ${seat?.id === s.id ? "bg-[#E03455] text-white" : "bg-gray-100 hover:bg-[#E03455] hover:text-white text-gray-600 border border-gray-200 hover:border-[#E03455]"}`}>
                        {s.number}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-100 border border-gray-200" />Available</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#E03455]" />Selected</span>
            </div>
          </div>
        )}

        {/* Confirm */}
        {step === "confirm" && seat && (
          <div>
            <h2 className="text-xl font-bold mb-2">Confirm your seat</h2>
            <p className="text-gray-500 text-sm mb-6">Is this correct? Your food will be delivered here.</p>

            <div className="bg-white border border-[#E03455]/30 rounded-xl p-5 space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Theater</span>
                <span className="font-medium">{theater?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Screen</span>
                <span className="font-medium">{screen?.name}</span>
              </div>
              <div className="flex justify-between text-sm items-center">
                <span className="text-gray-500">Your Seat</span>
                <span className="text-3xl font-black text-[#E03455]">{seat.label}</span>
              </div>
            </div>

            <button onClick={confirm}
              className="w-full bg-[#E03455] hover:bg-[#C82040] text-white font-bold py-4 rounded-xl transition-colors">
              Yes, show me the menu 🍿
            </button>
            <button onClick={() => setStep("seat")}
              className="w-full mt-3 text-gray-500 hover:text-gray-900 text-sm py-2">
              Change seat
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OrderPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F4F4F9] flex items-center justify-center text-gray-500">Loading...</div>}>
      <OrderContent />
    </Suspense>
  );
}
