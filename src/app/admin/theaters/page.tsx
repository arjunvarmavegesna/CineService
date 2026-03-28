"use client";

import { useEffect, useState, useCallback } from "react";

interface Theater {
  id: string; name: string; city: string; state: string;
  address: string; phone?: string; isActive: boolean;
  _count: { screens: number; orders: number };
  settings?: { taxRate: number; packagingFee: number; deliveryEtaMin: number };
}

interface Screen {
  id: string; name: string; number: number; capacity: number; isActive: boolean;
  _count: { seats: number };
}

interface Seat {
  id: string; row: string; number: number; label: string; isActive: boolean;
  qrCode?: { code: string; isActive: boolean };
}

type Tab = "theaters" | "screens" | "seats";

export default function TheatersPage() {
  const [tab, setTab] = useState<Tab>("theaters");
  const [theaters, setTheaters] = useState<Theater[]>([]);
  const [screens, setScreens] = useState<Screen[]>([]);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedTheater, setSelectedTheater] = useState<Theater | null>(null);
  const [selectedScreen, setSelectedScreen] = useState<Screen | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"add-theater" | "add-screen" | "bulk-seats" | null>(null);
  const [saving, setSaving] = useState(false);

  const [theaterForm, setTheaterForm] = useState({ name: "", address: "", city: "", state: "", phone: "" });
  const [screenForm, setScreenForm] = useState({ name: "", number: "", capacity: "" });
  const [seatForm, setSeatForm] = useState({ rows: "A,B,C,D,E,F,G,H", seatsPerRow: "12" });

  const loadTheaters = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/theaters");
    const data = await res.json();
    setTheaters(data.data ?? []);
    setLoading(false);
  }, []);

  const loadScreens = useCallback(async (theaterId: string) => {
    setLoading(true);
    const res = await fetch(`/api/admin/screens?theaterId=${theaterId}`);
    const data = await res.json();
    setScreens(data.data ?? []);
    setLoading(false);
  }, []);

  const loadSeats = useCallback(async (screenId: string) => {
    setLoading(true);
    const res = await fetch(`/api/admin/seats?screenId=${screenId}`);
    const data = await res.json();
    setSeats(data.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadTheaters(); }, [loadTheaters]);

  const selectTheater = (t: Theater) => {
    setSelectedTheater(t);
    setSelectedScreen(null);
    setTab("screens");
    loadScreens(t.id);
  };

  const selectScreen = (s: Screen) => {
    setSelectedScreen(s);
    setTab("seats");
    loadSeats(s.id);
  };

  const addTheater = async () => {
    setSaving(true);
    const res = await fetch("/api/admin/theaters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(theaterForm),
    });
    if (res.ok) { setModal(null); loadTheaters(); setTheaterForm({ name: "", address: "", city: "", state: "", phone: "" }); }
    setSaving(false);
  };

  const addScreen = async () => {
    if (!selectedTheater) return;
    setSaving(true);
    const res = await fetch("/api/admin/screens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theaterId: selectedTheater.id, ...screenForm, number: parseInt(screenForm.number), capacity: parseInt(screenForm.capacity) }),
    });
    if (res.ok) { setModal(null); loadScreens(selectedTheater.id); setScreenForm({ name: "", number: "", capacity: "" }); }
    setSaving(false);
  };

  const generateBulkSeats = async () => {
    if (!selectedScreen) return;
    setSaving(true);
    const rows = seatForm.rows.split(",").map((r) => r.trim().toUpperCase()).filter((r) => r.length === 1);
    const res = await fetch("/api/admin/seats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ screenId: selectedScreen.id, rows, seatsPerRow: parseInt(seatForm.seatsPerRow) }),
    });
    if (res.ok) { setModal(null); loadSeats(selectedScreen.id); }
    setSaving(false);
  };

  const downloadQR = (seatId: string, seatLabel: string) => {
    const link = document.createElement("a");
    link.href = `/api/admin/qr/${seatId}`;
    link.download = `QR-${seatLabel}.png`;
    link.click();
  };

  const downloadAllQRs = () => {
    seats.forEach((seat, i) => {
      setTimeout(() => downloadQR(seat.id, seat.label), i * 200);
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Theaters & Seats</h1>
          <p className="text-sm text-white/40 mt-0.5">Manage theaters, screens, seats, and QR codes</p>
        </div>
        {tab === "theaters" && (
          <button onClick={() => setModal("add-theater")} className="bg-[#E03455] hover:bg-[#FF4060] text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors">
            + Add Theater
          </button>
        )}
        {tab === "screens" && selectedTheater && (
          <button onClick={() => setModal("add-screen")} className="bg-[#E03455] hover:bg-[#FF4060] text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors">
            + Add Screen
          </button>
        )}
        {tab === "seats" && selectedScreen && (
          <div className="flex gap-2">
            <button onClick={downloadAllQRs} className="border border-white/10 hover:border-[#E03455]/50 text-white/60 hover:text-[#E03455] px-3 py-2 rounded-xl text-sm transition-colors">
              ↓ Download All QRs
            </button>
            <button onClick={() => setModal("bulk-seats")} className="bg-[#E03455] hover:bg-[#FF4060] text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors">
              + Generate Seats
            </button>
          </div>
        )}
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-5">
        <button onClick={() => { setTab("theaters"); setSelectedTheater(null); setSelectedScreen(null); }}
          className={`transition-colors ${tab === "theaters" ? "text-white font-medium" : "text-white/40 hover:text-white"}`}>
          Theaters
        </button>
        {selectedTheater && (
          <>
            <span className="text-white/20">/</span>
            <button onClick={() => { setTab("screens"); setSelectedScreen(null); loadScreens(selectedTheater.id); }}
              className={`transition-colors ${tab === "screens" ? "text-white font-medium" : "text-white/40 hover:text-white"}`}>
              {selectedTheater.name}
            </button>
          </>
        )}
        {selectedScreen && (
          <>
            <span className="text-white/20">/</span>
            <span className="text-white font-medium">{selectedScreen.name}</span>
          </>
        )}
      </div>

      {loading ? (
        <div className="text-white/40 text-center py-16">Loading...</div>
      ) : (
        <>
          {/* Theaters List */}
          {tab === "theaters" && (
            <div className="grid gap-3">
              {theaters.map((t) => (
                <button key={t.id} onClick={() => selectTheater(t)}
                  className="w-full text-left bg-[#1C1C36] border border-white/[0.06] hover:border-[#E03455]/30 rounded-2xl p-5 transition-all group">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{t.name}</h3>
                        {!t.isActive && <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">Inactive</span>}
                      </div>
                      <p className="text-sm text-white/50">{t.city}, {t.state}</p>
                      <p className="text-xs text-white/30 mt-1">{t.address}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex gap-4 text-sm mb-2">
                        <div className="text-center">
                          <p className="font-bold text-[#E03455]">{t._count.screens}</p>
                          <p className="text-white/40 text-xs">Screens</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold">{t._count.orders}</p>
                          <p className="text-white/40 text-xs">Orders</p>
                        </div>
                      </div>
                      <span className="text-xs text-[#E03455] group-hover:text-[#FF4060]">Manage →</span>
                    </div>
                  </div>
                </button>
              ))}
              {theaters.length === 0 && (
                <div className="text-center py-16 text-white/30">No theaters yet. Add one to get started.</div>
              )}
            </div>
          )}

          {/* Screens List */}
          {tab === "screens" && (
            <div className="grid gap-3">
              {screens.map((s) => (
                <button key={s.id} onClick={() => selectScreen(s)}
                  className="w-full text-left bg-[#1C1C36] border border-white/[0.06] hover:border-[#E03455]/30 rounded-2xl p-5 transition-all group">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold mb-1">{s.name}</h3>
                      <p className="text-sm text-white/50">Screen #{s.number} · {s.capacity} seats</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[#E03455]">{s._count.seats}</p>
                      <p className="text-white/40 text-xs">Seats configured</p>
                      <span className="text-xs text-[#E03455] group-hover:text-[#FF4060] block mt-1">Manage seats →</span>
                    </div>
                  </div>
                </button>
              ))}
              {screens.length === 0 && (
                <div className="text-center py-16 text-white/30">No screens yet.</div>
              )}
            </div>
          )}

          {/* Seats Grid */}
          {tab === "seats" && (
            <div>
              <div className="text-center text-xs text-white/30 tracking-widest py-2 bg-white/5 rounded-lg mb-4">
                SCREEN ▲
              </div>
              {/* Group seats by row */}
              {Array.from(new Set(seats.map((s) => s.row))).map((row) => (
                <div key={row} className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-white/30 w-4">{row}</span>
                  <div className="flex gap-1.5 flex-wrap">
                    {seats.filter((s) => s.row === row).map((seat) => (
                      <div key={seat.id} className="relative group">
                        <button
                          onClick={() => downloadQR(seat.id, seat.label)}
                          className="w-8 h-7 rounded bg-white/10 hover:bg-[#E03455] hover:text-white text-white/60 text-[10px] font-bold transition-all"
                          title={`Download QR for ${seat.label}`}
                        >
                          {seat.number}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {seats.length === 0 && (
                <div className="text-center py-16 text-white/30">No seats yet. Generate seats to get started.</div>
              )}
              {seats.length > 0 && (
                <p className="text-xs text-white/30 mt-4 text-center">Click any seat to download its QR code</p>
              )}
            </div>
          )}
        </>
      )}

      {/* Add Theater Modal */}
      {modal === "add-theater" && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setModal(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-[#1C1C36] border border-white/10 rounded-2xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-lg">Add Theater</h2>
                <button onClick={() => setModal(null)} className="text-white/40 hover:text-white text-xl">✕</button>
              </div>
              <div className="space-y-3">
                {[
                  { label: "Theater Name *", key: "name", placeholder: "e.g. PVR Forum Mall" },
                  { label: "Address *", key: "address", placeholder: "Full address" },
                  { label: "City *", key: "city", placeholder: "City" },
                  { label: "State *", key: "state", placeholder: "State" },
                  { label: "Phone", key: "phone", placeholder: "+91 ..." },
                ].map(({ label, key, placeholder }) => (
                  <div key={key}>
                    <label className="text-xs text-white/50 block mb-1">{label}</label>
                    <input
                      value={theaterForm[key as keyof typeof theaterForm]}
                      onChange={(e) => setTheaterForm({ ...theaterForm, [key]: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#E03455]/50"
                      placeholder={placeholder}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setModal(null)} className="flex-1 border border-white/10 text-white/60 hover:text-white py-2.5 rounded-xl text-sm">Cancel</button>
                <button onClick={addTheater} disabled={saving || !theaterForm.name || !theaterForm.city}
                  className="flex-1 bg-[#E03455] hover:bg-[#FF4060] disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm">
                  {saving ? "Adding..." : "Add Theater"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add Screen Modal */}
      {modal === "add-screen" && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setModal(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-[#1C1C36] border border-white/10 rounded-2xl p-6 w-full max-w-sm">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-lg">Add Screen</h2>
                <button onClick={() => setModal(null)} className="text-white/40 hover:text-white text-xl">✕</button>
              </div>
              <div className="space-y-3">
                {[
                  { label: "Screen Name *", key: "name", placeholder: "e.g. Audi 1" },
                  { label: "Screen Number *", key: "number", placeholder: "1", type: "number" },
                  { label: "Capacity *", key: "capacity", placeholder: "120", type: "number" },
                ].map(({ label, key, placeholder, type }) => (
                  <div key={key}>
                    <label className="text-xs text-white/50 block mb-1">{label}</label>
                    <input
                      type={type ?? "text"}
                      value={screenForm[key as keyof typeof screenForm]}
                      onChange={(e) => setScreenForm({ ...screenForm, [key]: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#E03455]/50"
                      placeholder={placeholder}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setModal(null)} className="flex-1 border border-white/10 text-white/60 py-2.5 rounded-xl text-sm">Cancel</button>
                <button onClick={addScreen} disabled={saving || !screenForm.name || !screenForm.number}
                  className="flex-1 bg-[#E03455] hover:bg-[#FF4060] disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm">
                  {saving ? "Adding..." : "Add Screen"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Bulk Seats Modal */}
      {modal === "bulk-seats" && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setModal(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-[#1C1C36] border border-white/10 rounded-2xl p-6 w-full max-w-sm">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-lg">Generate Seats</h2>
                <button onClick={() => setModal(null)} className="text-white/40 hover:text-white text-xl">✕</button>
              </div>
              <p className="text-sm text-white/50 mb-4">This will create seats and QR codes for <strong className="text-white">{selectedScreen?.name}</strong>.</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-white/50 block mb-1">Rows (comma separated)</label>
                  <input
                    value={seatForm.rows}
                    onChange={(e) => setSeatForm({ ...seatForm, rows: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#E03455]/50"
                    placeholder="A,B,C,D,E,F,G,H"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/50 block mb-1">Seats per Row</label>
                  <input
                    type="number"
                    value={seatForm.seatsPerRow}
                    onChange={(e) => setSeatForm({ ...seatForm, seatsPerRow: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#E03455]/50"
                  />
                </div>
                <div className="bg-[#E03455]/10 border border-[#E03455]/20 rounded-xl p-3 text-xs text-[#FF4060]">
                  Will create {seatForm.rows.split(",").filter((r) => r.trim().length === 1).length} rows × {seatForm.seatsPerRow} seats = {seatForm.rows.split(",").filter((r) => r.trim().length === 1).length * parseInt(seatForm.seatsPerRow || "0")} seats with QR codes
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setModal(null)} className="flex-1 border border-white/10 text-white/60 py-2.5 rounded-xl text-sm">Cancel</button>
                <button onClick={generateBulkSeats} disabled={saving}
                  className="flex-1 bg-[#E03455] hover:bg-[#FF4060] disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm">
                  {saving ? "Generating..." : "Generate"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
