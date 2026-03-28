"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const THEATERS = [
  { id: "theater1", name: "PVR Forum Mall", city: "Bengaluru", screens: 6 },
  { id: "theater2", name: "INOX Mantri Square", city: "Bengaluru", screens: 4 },
  { id: "theater3", name: "Cinepolis HSR", city: "Bengaluru", screens: 5 },
];

const SCREENS = [
  { id: "screen1", name: "Audi 1", capacity: 120 },
  { id: "screen2", name: "Audi 2", capacity: 90 },
  { id: "screen3", name: "Audi 3 — 4DX", capacity: 60 },
];

const ROWS = ["A", "B", "C", "D", "E", "F", "G", "H"];
const SEATS_PER_ROW = 12;
const TAKEN_SEATS = ["A3", "B7", "C2", "D5", "E8"];

export default function OrderPage() {
  const router = useRouter();
  const [step, setStep] = useState<"theater" | "screen" | "seat" | "confirm">("theater");
  const [theater, setTheater] = useState<{ id: string; name: string } | null>(null);
  const [screen, setScreen] = useState<{ id: string; name: string } | null>(null);
  const [seat, setSeat] = useState<string | null>(null);

  const selectTheater = (t: { id: string; name: string }) => {
    setTheater(t);
    setStep("screen");
  };

  const selectScreen = (s: { id: string; name: string }) => {
    setScreen(s);
    setStep("seat");
  };

  const selectSeat = (s: string) => {
    if (TAKEN_SEATS.includes(s)) return;
    setSeat(s);
    setStep("confirm");
  };

  const goToMenu = () => {
    router.push(
      `/menu?theater=${theater?.id}&screen=${screen?.id}&seat=${seat}`
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <header className="bg-[#141418] border-b border-white/10 px-4 py-4 flex items-center gap-3">
        <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center font-black text-black text-sm">
          C
        </div>
        <span className="font-semibold text-lg">CineServe</span>
      </header>

      {/* Steps indicator */}
      <div className="flex items-center px-6 py-4 gap-2">
        {["Theater", "Screen", "Seat"].map((s, i) => {
          const steps = ["theater", "screen", "seat", "confirm"];
          const currentIdx = steps.indexOf(step);
          const done = i < currentIdx;
          const active = i === currentIdx;
          return (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border
                ${done ? "bg-green-500 border-green-500 text-black" : ""}
                ${active ? "border-amber-500 text-amber-500" : ""}
                ${!done && !active ? "border-white/20 text-white/30" : ""}
              `}
              >
                {done ? "✓" : i + 1}
              </div>
              <span
                className={`text-sm ${active ? "text-white" : "text-white/40"}`}
              >
                {s}
              </span>
              {i < 2 && <div className="w-8 h-px bg-white/10 ml-1" />}
            </div>
          );
        })}
      </div>

      <div className="max-w-lg mx-auto px-4 py-4">
        {/* Theater Selection */}
        {step === "theater" && (
          <div>
            <h2 className="text-xl font-bold mb-2">Select your theater</h2>
            <p className="text-white/50 text-sm mb-6">
              Which theater are you currently in?
            </p>
            <div className="space-y-3">
              {THEATERS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => selectTheater(t)}
                  className="w-full text-left p-4 bg-[#141418] border border-white/10 rounded-xl hover:border-amber-500/50 hover:bg-amber-500/5 transition-all"
                >
                  <div className="font-semibold">{t.name}</div>
                  <div className="text-sm text-white/50 mt-1">
                    {t.city} · {t.screens} screens
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Screen Selection */}
        {step === "screen" && (
          <div>
            <button
              onClick={() => setStep("theater")}
              className="text-white/50 text-sm mb-4 hover:text-white"
            >
              ← Back
            </button>
            <h2 className="text-xl font-bold mb-2">Select your screen</h2>
            <p className="text-white/50 text-sm mb-6">
              Inside {theater?.name}
            </p>
            <div className="space-y-3">
              {SCREENS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => selectScreen(s)}
                  className="w-full text-left p-4 bg-[#141418] border border-white/10 rounded-xl hover:border-amber-500/50 hover:bg-amber-500/5 transition-all"
                >
                  <div className="font-semibold">{s.name}</div>
                  <div className="text-sm text-white/50 mt-1">
                    {s.capacity} seats
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Seat Selection */}
        {step === "seat" && (
          <div>
            <button
              onClick={() => setStep("screen")}
              className="text-white/50 text-sm mb-4 hover:text-white"
            >
              ← Back
            </button>
            <h2 className="text-xl font-bold mb-2">Select your seat</h2>
            <p className="text-white/50 text-sm mb-4">
              Tap your exact seat number
            </p>

            {/* Screen label */}
            <div className="text-center text-xs text-white/30 tracking-widest mb-4 py-2 bg-white/5 rounded-lg">
              SCREEN THIS WAY ▲
            </div>

            {/* Seat grid */}
            <div className="space-y-2 mb-6">
              {ROWS.map((row) => (
                <div key={row} className="flex items-center gap-2">
                  <span className="text-xs text-white/30 w-4">{row}</span>
                  <div className="flex gap-1.5">
                    {Array.from({ length: SEATS_PER_ROW }, (_, i) => {
                      const seatLabel = `${row}${i + 1}`;
                      const taken = TAKEN_SEATS.includes(seatLabel);
                      return (
                        <button
                          key={seatLabel}
                          onClick={() => selectSeat(seatLabel)}
                          disabled={taken}
                          className={`w-7 h-6 rounded text-[10px] font-bold transition-all
                            ${taken ? "bg-white/5 text-white/20 cursor-not-allowed" : "bg-white/10 hover:bg-amber-500 hover:text-black text-white/70 border border-white/10 hover:border-amber-500"}
                          `}
                        >
                          {i + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex gap-4 text-xs text-white/40">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-white/10 border border-white/10" />
                Available
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-500" />
                Selected
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-white/5" />
                Taken
              </span>
            </div>
          </div>
        )}

        {/* Confirm */}
        {step === "confirm" && (
          <div>
            <h2 className="text-xl font-bold mb-2">Confirm your seat</h2>
            <p className="text-white/50 text-sm mb-6">
              Is this correct? Your food will be delivered here.
            </p>

            <div className="bg-[#141418] border border-white/10 rounded-xl p-5 space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Theater</span>
                <span className="font-medium">{theater?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Screen</span>
                <span className="font-medium">{screen?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Seat</span>
                <span className="text-2xl font-black text-amber-400">
                  {seat}
                </span>
              </div>
            </div>

            <button
              onClick={goToMenu}
              className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-4 rounded-xl transition-colors"
            >
              Yes, show me the menu 🍿
            </button>
            <button
              onClick={() => setStep("seat")}
              className="w-full mt-3 text-white/50 hover:text-white text-sm py-2"
            >
              Change seat
            </button>
          </div>
        )}
      </div>
    </div>
  );
}