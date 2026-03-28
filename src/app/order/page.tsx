"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCartStore } from "@/stores/useCartStore";

interface Theater { id: string; name: string; city: string; _count: { screens: number } }
interface Screen { id: string; name: string; number: number; capacity: number; _count: { seats: number } }
interface Seat { id: string; row: string; number: number; label: string }

function SeatButton({ s, selected, onSelect }: { s: Seat; selected: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={`w-[26px] h-[26px] rounded-[3px] text-[9px] font-semibold border transition-all active:scale-95
        ${selected
          ? "bg-[#E03455] border-[#E03455] text-white shadow"
          : "bg-white border-gray-300 text-gray-500 hover:border-[#E03455] hover:text-[#E03455]"
        }`}
    >
      {String(s.number).padStart(2, "0")}
    </button>
  );
}

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

  useEffect(() => {
    const tId = searchParams.get("t");
    const sId = searchParams.get("s");
    const seatId = searchParams.get("seat");

    if (tId && sId && seatId) {
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
    setSeatState(null);
    setLoading(true);
    const res = await fetch(`/api/screens/${s.id}/seats`);
    const data = await res.json();
    setSeats(data.data ?? []);
    setLoading(false);
    setStep("seat");
  };

  const toggleSeat = (s: Seat) => {
    setSeatState((prev) => (prev?.id === s.id ? null : s));
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

  // Sorted unique rows; reversed so the last row (back of hall) shows at top — screen at top
  const sortedRows = Array.from(new Set(seats.map((s) => s.row))).sort();
  const reversedRows = [...sortedRows].reverse();

  /* ─── Step indicator ─────────────────────────────────────── */
  const STEPS = ["Theater", "Screen", "Seat"];
  const stepIdx = ["theater", "screen", "seat", "confirm"].indexOf(step);

  const isSeatStep = step === "seat";

  return (
    <div className="min-h-screen bg-[#F4F4F9] text-gray-900 flex flex-col">

      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 bg-[#E03455] rounded-lg flex items-center justify-center font-black text-white text-sm shrink-0">C</div>
        <div className="min-w-0">
          <p className="font-semibold text-sm leading-tight truncate">CineServe</p>
          {theater && <p className="text-xs text-gray-400 truncate">{theater.name}{screen ? ` · ${screen.name}` : ""}</p>}
        </div>
      </header>

      {/* ── Step breadcrumb (hidden during seat map for space) ── */}
      {!isSeatStep && (
        <div className="flex items-center gap-2 px-5 py-3 bg-white border-b border-gray-100 shrink-0">
          {STEPS.map((s, i) => {
            const done = i < stepIdx;
            const active = i === stepIdx;
            return (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border
                  ${done ? "bg-green-500 border-green-500 text-white" : active ? "border-[#E03455] text-[#E03455]" : "border-gray-300 text-gray-400"}`}>
                  {done ? "✓" : i + 1}
                </div>
                <span className={`text-xs ${active ? "font-semibold text-gray-900" : "text-gray-400"}`}>{s}</span>
                {i < 2 && <div className="w-6 h-px bg-gray-200" />}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Content ── */}
      {loading && (
        <div className="flex-1 flex items-center justify-center text-gray-400">Loading...</div>
      )}

      {/* Theater Selection */}
      {!loading && step === "theater" && (
        <div className="flex-1 max-w-lg mx-auto w-full px-4 py-5">
          <h2 className="text-xl font-bold mb-1">Select your theater</h2>
          <p className="text-gray-500 text-sm mb-5">Which theater are you in?</p>
          <div className="space-y-3">
            {theaters.map((t) => (
              <button key={t.id} onClick={() => selectTheater(t)}
                className="w-full text-left p-4 bg-white border border-gray-200 rounded-2xl hover:border-[#E03455]/50 hover:bg-[#E03455]/5 transition-all">
                <div className="font-semibold">{t.name}</div>
                <div className="text-sm text-gray-400 mt-0.5">{t.city} · {t._count.screens} screen{t._count.screens !== 1 ? "s" : ""}</div>
              </button>
            ))}
            {theaters.length === 0 && (
              <div className="text-center py-12 text-gray-400">No theaters available</div>
            )}
          </div>
        </div>
      )}

      {/* Screen Selection */}
      {!loading && step === "screen" && (
        <div className="flex-1 max-w-lg mx-auto w-full px-4 py-5">
          <button onClick={() => setStep("theater")} className="text-gray-400 text-sm mb-4 hover:text-gray-900 flex items-center gap-1">← Back</button>
          <h2 className="text-xl font-bold mb-1">Select your screen</h2>
          <p className="text-gray-500 text-sm mb-5">Inside {theater?.name}</p>
          <div className="space-y-3">
            {screens.map((s) => (
              <button key={s.id} onClick={() => selectScreen(s)}
                className="w-full text-left p-4 bg-white border border-gray-200 rounded-2xl hover:border-[#E03455]/50 hover:bg-[#E03455]/5 transition-all">
                <div className="font-semibold">{s.name}</div>
                <div className="text-sm text-gray-400 mt-0.5">{s.capacity} seats</div>
              </button>
            ))}
            {screens.length === 0 && (
              <div className="text-center py-12 text-gray-400">No screens found</div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          SEAT MAP — BMS-style cinema layout
          ═══════════════════════════════════════════════════════ */}
      {!loading && step === "seat" && (
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Sub-header */}
          <div className="bg-white border-b border-gray-100 px-4 py-2 flex items-center justify-between shrink-0">
            <button onClick={() => setStep("screen")} className="text-gray-400 text-sm hover:text-gray-900">← {screen?.name}</button>
            <span className="text-xs text-gray-400">{seats.length} seats · tap to select</span>
          </div>

          {/* Scrollable seat map */}
          <div className="flex-1 overflow-auto pb-28">
            <div className="min-w-max px-4 pt-8 pb-6 flex flex-col items-center">

              {/* ── Rows ── */}
              <div className="space-y-[5px]">
                {reversedRows.map((row) => {
                  const rowSeats = seats
                    .filter((s) => s.row === row)
                    .sort((a, b) => a.number - b.number);
                  const mid = Math.ceil(rowSeats.length / 2);
                  const leftSeats = rowSeats.slice(0, mid);
                  const rightSeats = rowSeats.slice(mid);

                  return (
                    <div key={row} className="flex items-center gap-2">
                      {/* Row label — left */}
                      <span className="text-[11px] font-semibold text-gray-400 w-5 text-right shrink-0 select-none">{row}</span>

                      {/* Left block */}
                      <div className="flex gap-[3px]">
                        {leftSeats.map((s) => (
                          <SeatButton key={s.id} s={s} selected={seat?.id === s.id} onSelect={() => toggleSeat(s)} />
                        ))}
                      </div>

                      {/* Aisle */}
                      {rightSeats.length > 0 && <div className="w-5 shrink-0" />}

                      {/* Right block */}
                      <div className="flex gap-[3px]">
                        {rightSeats.map((s) => (
                          <SeatButton key={s.id} s={s} selected={seat?.id === s.id} onSelect={() => toggleSeat(s)} />
                        ))}
                      </div>

                      {/* Row label — right */}
                      <span className="text-[11px] font-semibold text-gray-400 w-5 shrink-0 select-none">{row}</span>
                    </div>
                  );
                })}
              </div>

              {/* ── Screen ── */}
              <div className="mt-8 flex flex-col items-center w-full" style={{ maxWidth: 480 }}>
                <p className="text-[10px] tracking-[0.25em] uppercase text-gray-400 mb-2">
                  All eyes this way please!
                </p>
                <div
                  className="w-full h-[6px] rounded-full"
                  style={{
                    background: "linear-gradient(90deg, transparent 0%, #E03455 20%, #E03455 80%, transparent 100%)",
                    boxShadow: "0 2px 16px rgba(224,52,85,0.45)",
                  }}
                />
              </div>

              {/* ── Legend ── */}
              <div className="flex items-center gap-6 mt-8">
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="w-5 h-5 rounded-[3px] bg-white border border-gray-300 inline-block" />
                  Available
                </span>
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="w-5 h-5 rounded-[3px] bg-[#E03455] inline-block" />
                  Selected
                </span>
              </div>
            </div>
          </div>

          {/* ── Floating confirm bar ── */}
          <div
            className="fixed bottom-0 inset-x-0 z-30 transition-transform duration-300"
            style={{ transform: seat ? "translateY(0)" : "translateY(100%)" }}
          >
            <div className="bg-white border-t border-gray-200 shadow-2xl px-4 py-4">
              <div className="max-w-lg mx-auto flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Selected seat</p>
                  <p className="text-3xl font-black text-[#E03455] leading-none mt-0.5">{seat?.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{screen?.name}</p>
                </div>
                <button
                  onClick={() => { if (seat) setStep("confirm"); }}
                  className="bg-[#E03455] hover:bg-[#C82040] text-white font-bold px-7 py-3.5 rounded-2xl text-sm transition-colors shrink-0"
                >
                  Confirm →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm step ── */}
      {step === "confirm" && seat && (
        <div className="flex-1 max-w-lg mx-auto w-full px-4 py-5">
          <h2 className="text-xl font-bold mb-1">Confirm your seat</h2>
          <p className="text-gray-500 text-sm mb-6">Your food will be delivered to this seat.</p>

          <div className="bg-white border border-[#E03455]/30 rounded-2xl p-5 space-y-3 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Theater</span>
              <span className="font-medium">{theater?.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Screen</span>
              <span className="font-medium">{screen?.name}</span>
            </div>
            <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-100">
              <span className="text-gray-400">Your Seat</span>
              <span className="text-4xl font-black text-[#E03455]">{seat.label}</span>
            </div>
          </div>

          <button onClick={confirm}
            className="w-full bg-[#E03455] hover:bg-[#C82040] text-white font-bold py-4 rounded-2xl transition-colors">
            Yes, show me the menu 🍿
          </button>
          <button onClick={() => setStep("seat")}
            className="w-full mt-3 text-gray-400 hover:text-gray-900 text-sm py-2">
            ← Change seat
          </button>
        </div>
      )}
    </div>
  );
}

export default function OrderPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F4F4F9] flex items-center justify-center text-gray-400">Loading...</div>}>
      <OrderContent />
    </Suspense>
  );
}
